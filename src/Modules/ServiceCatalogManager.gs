/**
 * @file ServiceCatalogManager.gs
 * @description Manages retrieval of services and pricing from Google Sheets.
 */

var ServiceCatalogManager = (function() {
  
  // Cache keys
  var CACHE_KEY_SERVICES = "SOW_GEN_SERVICES_V3"; 
  var CACHE_TTL = 21600; // 6 hours

  // Runtime Indexes (Memoization for O(1) access)
  var _pricingIndex = null; // Map: "ServiceID|Tier|Param" -> PriceRule

  /**
   * Gets all active services from the catalog.
   * Uses CacheService to strictly minimize Sheet reads.
   * @returns {Array<Object>} List of service objects
   */
  function getAllActiveServices(forceRefresh) {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(CACHE_KEY_SERVICES);
    
    // Only use cache if not forcing refresh
    if (cached && !forceRefresh) {
      console.log("ServiceCatalogManager: Using Cached Data.");
      return JSON.parse(cached);
    }
    
    console.log("ServiceCatalogManager: Cache miss or refresh. Fetching from Sheet...");
    var data = _fetchServicesFromSheet();
    
    try {
        cache.put(CACHE_KEY_SERVICES, JSON.stringify(data), CACHE_TTL);
    } catch(e) {
        console.warn("Cache limit exceeded, skipping cache put.");
    }
    return data;
  }

  /**
   * Internal helper to read from Sheets.
   */
  function _fetchServicesFromSheet() {
    var ss = SpreadsheetApp.openById(CONFIG.SHEET_SERVICES_ID);
    if (!ss) throw new Error("Could not open spreadsheet with ID: " + CONFIG.SHEET_SERVICES_ID);

    var sheet = ss.getSheetByName(CONFIG.sheets.CATALOG);
    if (!sheet) throw new Error("Sheet '" + CONFIG.sheets.CATALOG + "' not found.");
    
    var rows = sheet.getDataRange().getValues();
    rows.shift(); // Remove buffer header
    
    var services = [];
    rows.forEach(function(row) {
      // Column K = Active (Index 10)
      if (row[10] === true) { 
         services.push({
           id: row[0],
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

  /**
   * Builds the O(1) Pricing Index from the sheet.
   * Only runs ONCE per execution.
   */
  function _buildPricingIndex() {
      if (_pricingIndex) return; // Already indexed

      console.time("BuildPricingIndex");
      var ss = SpreadsheetApp.openById(CONFIG.SHEET_SERVICES_ID);
      var sheet = ss.getSheetByName(CONFIG.sheets.PRICING);
      if (!sheet) throw new Error("Pricing sheet not found");

      var rows = sheet.getDataRange().getValues();
      rows.shift(); // Remove buffer/header

      // Build Hash Map
      // Key format: "SERVICE_ID|TIER|PARAM_NAME" (Normalized)
      // "SERVICE_ID||PARAM_NAME" for universal rules
      var index = {};

      for (var i = 0; i < rows.length; i++) {
          var r = rows[i];
          var svcId = String(r[0]).trim();
          var tier = String(r[1]).trim();
          var param = String(r[2]).trim().toLowerCase();
          
          // Index Key
          var key = svcId + "|" + tier + "|" + param;
          
          index[key] = {
              unitPrice: Number(r[6]) || 0,
              currency: r[7] || "MXN"
          };
      }
      
      _pricingIndex = index;
      console.timeEnd("BuildPricingIndex");
      console.log("Pricing Index Built. size=" + Object.keys(index).length);
  }
  
  /**
   * Calculates price using O(1) Lookups.
   */
  function getPrice(serviceId, tier, userParams) {
     _buildPricingIndex(); // Lazy Load Index
     
     var total = 0;
     var currency = "MXN";
     
     // Iterate provided params and lookup
     for (var paramName in userParams) {
        var quantity = parseFloat(userParams[paramName]);
        if (isNaN(quantity)) continue;

        var pName = String(paramName).trim().toLowerCase();
        
        // Strategy: 1. Specific Tier Match -> 2. Universal Match (Empty Tier)
        var keySpecific = serviceId + "|" + tier + "|" + pName;
        var keyUniversal = serviceId + "|" + "" + "|" + pName;
        
        var rule = _pricingIndex[keySpecific] || _pricingIndex[keyUniversal];

        if (rule) {
            total += (rule.unitPrice * quantity);
            currency = rule.currency; // Last valid currency wins (assuming single currency per SOW)
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
