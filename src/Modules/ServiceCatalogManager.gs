/**
 * @file ServiceCatalogManager.gs
 * @description Manages retrieval of services and pricing from Google Sheets.
 */

var ServiceCatalogManager = (function() {
  
  // Cache keys
  var CACHE_KEY_SERVICES = "SOW_GEN_SERVICES_V4_AUTODISCOVERY"; 
  var CACHE_TTL = 21600; // 6 hours

  // Runtime Indexes
  var _pricingIndex = null; 

  /**
   * Gets all active services from the catalog.
   */
  function getAllActiveServices(forceRefresh) {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(CACHE_KEY_SERVICES);
    
    if (cached && !forceRefresh) {
      console.log("ServiceCatalogManager: Using Cached Data.");
      return JSON.parse(cached);
    }
    
    console.log("ServiceCatalogManager: Cache miss. Fetching & Enriching...");
    
    // 1. Fetch Basic Catalog
    var services = _fetchServicesFromSheet();
    
    // 2. Auto-Discover Params from Pricing
    _buildPricingIndex(); // Ensure index exists
    _enrichServicesWithPricingParams(services);
    
    try {
        cache.put(CACHE_KEY_SERVICES, JSON.stringify(services), CACHE_TTL);
    } catch(e) {
        console.warn("Cache limit exceeded.");
    }
    return services;
  }

  function _fetchServicesFromSheet() {
    var ss = SpreadsheetApp.openById(CONFIG.SHEET_SERVICES_ID);
    var sheet = ss.getSheetByName(CONFIG.sheets.CATALOG);
    var rows = sheet.getDataRange().getValues();
    rows.shift(); 
    
    var services = [];
    rows.forEach(function(row) {
      if (row[10] === true) { 
         services.push({
           id: String(row[0]).trim(),
           name: row[1],
           category: row[2],
           hasTiers: row[3],
           tiers: row[4] ? row[4].toString().split(",") : [],
           configParams: row[5] ? _safeJsonParse(row[5]) : {}, 
           optionalAddons: row[6] ? _safeJsonParse(row[6]) : {},
           templateId: row[7],
           duration: row[8],
           description: row[9]
         });
      }
    });
    return services;
  }
  
  function _safeJsonParse(jsonString) {
      try { return JSON.parse(jsonString); } catch(e) { return {}; }
  }

  function _buildPricingIndex() {
      if (_pricingIndex) return; 
      console.time("BuildPricingIndex");
      var ss = SpreadsheetApp.openById(CONFIG.SHEET_SERVICES_ID);
      var sheet = ss.getSheetByName(CONFIG.sheets.PRICING);
      if (!sheet) throw new Error("Pricing sheet not found");

      var rows = sheet.getDataRange().getValues();
      rows.shift(); 

      var index = {};
      for (var i = 0; i < rows.length; i++) {
          var r = rows[i];
          var svcId = String(r[0]).trim();
          var tier = String(r[1]).trim();
          var param = String(r[2]).trim(); // Keep original case for display if needed, normalize for key
          
          if(!svcId || !param) continue;

          var key = svcId + "|" + tier + "|" + param.toLowerCase();
          
          index[key] = {
              unitPrice: Number(r[6]) || 0,
              currency: r[7] || "MXN",
              active: true 
          };
      }
      _pricingIndex = index;
      console.timeEnd("BuildPricingIndex");
  }
  
  /**
   * cross-references Pricing Sheet to find parameters that might be missing in Catalog JSON.
   */
  function _enrichServicesWithPricingParams(services) {
      if(!_pricingIndex) return;
      
      // Iterate all keys in pricing index to gather params per service
      // Key format: "SERVICE_ID|TIER|param_name"
      var discoveredParams = {}; // Map<ServiceID, Set<ParamName>>
      
      Object.keys(_pricingIndex).forEach(function(key) {
          var parts = key.split("|");
          if(parts.length < 3) return;
          
          var sId = parts[0];
          var pName = parts[2];
          
          if(!discoveredParams[sId]) discoveredParams[sId] = {};
          discoveredParams[sId][pName] = true; // Use object as Set
      });
      
      // Merge into Services
      services.forEach(function(svc) {
          var found = discoveredParams[svc.id];
          if(found) {
              // Iterate found params
              for(var p in found) {
                  // If not already in configParams, add it (default type 'number')
                  if(!svc.configParams.hasOwnProperty(p)) {
                      svc.configParams[p] = "number"; // Auto-discovered
                      console.log("Auto-Discovered param '" + p + "' for service '" + svc.id + "'");
                  }
              }
          }
      });
  }

  function getPrice(serviceId, tier, userParams) {
     _buildPricingIndex(); 
     var total = 0;
     var currency = "MXN";
     
     for (var paramName in userParams) {
        var quantity = parseFloat(userParams[paramName]);
        if (isNaN(quantity)) continue;

        var pName = String(paramName).trim().toLowerCase();
        var keySpecific = serviceId + "|" + tier + "|" + pName;
        var keyUniversal = serviceId + "|" + "" + "|" + pName;
        
        var rule = _pricingIndex[keySpecific] || _pricingIndex[keyUniversal];

        if (rule) {
            total += (rule.unitPrice * quantity);
            currency = rule.currency; 
        }
     }
     
     return {
         unitPrice: total,
         subtotal: total,
         currency: currency
     };
  }

  return {
    getAllActiveServices: getAllActiveServices,
    getPrice: getPrice
  };

})();
