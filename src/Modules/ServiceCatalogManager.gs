/**
 * @file ServiceCatalogManager.gs
 * @description Manages retrieval of services and pricing from Google Sheets.
 */

var ServiceCatalogManager = (function() {
  
  // Cache keys
  var CACHE_KEY_SERVICES = "SOW_GEN_SERVICES_V2"; // V2 to bust old cache
  var CACHE_TTL = 21600; // 6 hours

  // Memoization variables (Alive only during script execution)
  var _pricingRowsCache = null;

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
   * Ensures pricing rows are loaded in memory for this execution.
   */
  function _ensurePricingLoaded() {
      if (_pricingRowsCache) return; // Already loaded
      
      console.log("ServiceCatalogManager: Loading Pricing Table into Memory...");
      var ss = SpreadsheetApp.openById(CONFIG.SHEET_SERVICES_ID);
      var sheet = ss.getSheetByName(CONFIG.sheets.PRICING);
      if (!sheet) throw new Error("Pricing sheet not found");
      
      var rows = sheet.getDataRange().getValues();
      rows.shift(); // headers
      _pricingRowsCache = rows;
  }
  
  /**
   * Calculates the price for a specific service configuration.
   * Optimized to read sheet only ONCE per execution via _ensurePricingLoaded.
   */
  function getPrice(serviceId, tier, userParams) {
     _ensurePricingLoaded(); // Efficient check
     
     var rows = _pricingRowsCache;
     var basePrice = 0;
     var currency = "MXN"; // default
     
     // 1. Filter rows for this service/tier
     var relevantRows = rows.filter(function(r) {
        // Col A=ID, B=Tier. If Tier matches OR rule applies to all tiers (empty)
        return String(r[0]) === String(serviceId) && (String(r[1]) === String(tier) || r[1] === "");
     });
     
     if (relevantRows.length === 0) {
         return { unitPrice: 0, subtotal: 0, currency: currency, error: "No pricing logic found" };
     }
     
     var total = 0;
     
     // 2. Iterate params provided by user
     // userParams = { "objectives": 10 }
     for (var paramName in userParams) {
        var quantity = parseFloat(userParams[paramName]);
        if (isNaN(quantity)) continue;

        // Find price rule for this param (Col C = Param Name)
        var priceRule = relevantRows.find(function(r) { 
             return String(r[2]).toLowerCase() === String(paramName).toLowerCase(); 
        });
        
        // Col G = Unit Price
        if (priceRule) {
            total += (Number(priceRule[6]) * quantity);
            currency = priceRule[7] || "MXN";
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
