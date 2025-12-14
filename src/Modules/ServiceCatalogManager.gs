/**
 * @file ServiceCatalogManager.gs
 * @description Manages retrieval of services and pricing from Google Sheets.
 */

var ServiceCatalogManager = (function() {
  
  // Configuration for Sheet Names
  var SHEET_SERVICES = "SERVICIOS";
  var SHEET_PARAMS = "SERVICIO_PARAMETROS";
  
  // Cache keys
  var CACHE_KEY_SERVICES = "SOW_GEN_SERVICES_CACHE";
  var CACHE_TTL = 21600; // 6 hours

  /**
   * Gets all active services from the catalog.
   * Uses CacheService to strictly minimize Sheet reads.
   * @returns {Array<Object>} List of service objects
   */
  function getAllActiveServices() {
    var cache = CacheService.getScriptCache();
    // var cached = cache.get(CACHE_KEY_SERVICES);
    
    // if (cached) {
    //   return JSON.parse(cached);
    // }
    
    // CACHE DISABLED FOR TESTING (Force Refresh)
    console.log("Fetching fresh services from Sheet...");
    var data = _fetchServicesFromSheet();
    // cache.put(CACHE_KEY_SERVICES, JSON.stringify(data), CACHE_TTL);
    return data;
  }

  /**
   * Internal helper to read from Sheets.
   * Assumes columns match the specified schema (Mock Data).
   */
  function _fetchServicesFromSheet() {
    // In a real deployment, we'd get ID from ScriptProperties
    // var sheetId = PropertiesService.getScriptProperties().getProperty("SERVICES_SHEET_ID");
    // var ss = SpreadsheetApp.openById(sheetId); 
    
    // For now, assume bound script or looking up by name in active spreadsheet
    // For standalone script, we must open by ID
    var ss = SpreadsheetApp.openById(CONFIG.SHEET_SERVICES_ID);
    if (!ss) throw new Error("Could not open spreadsheet with ID: " + CONFIG.SHEET_SERVICES_ID);

    var sheet = ss.getSheetByName(SHEET_SERVICES);
    if (!sheet) throw new Error("Sheet '" + SHEET_SERVICES + "' not found.");
    
    var rows = sheet.getDataRange().getValues();
    var headers = rows.shift(); // Remove buffer
    
    // Map array to object based on headers (naive mapping or strict index mapping)
    // Using strict index mapping based on Tech Spec for reliability
    // Column A=0 (ID), B=1 (Name), etc.
    
    var services = [];
    rows.forEach(function(row) {
      if (row[10] === true) { // Column K = Active
         services.push({
           id: row[0],
           name: row[1],
           category: row[2],
           hasTiers: row[3],
           tiers: row[4] ? row[4].split(",") : [],
           configParams: row[5] ? JSON.parse(row[5]) : {},
           optionalAddons: row[6] ? JSON.parse(row[6]) : {},
           templateId: row[7],
           duration: row[8],
           description: row[9]
         });
      }
    });
    
    return services;
  }
  
  /**
   * Calculates the price for a specific service configuration.
   * @param {string} serviceId
   * @param {string} tier
   * @param {Object} userParams (e.g., {objectives: 10})
   * @returns {Object} { unitPrice, subtotal, currency, details }
   */
  function getPrice(serviceId, tier, userParams) {
     var ss = SpreadsheetApp.openById(CONFIG.SHEET_SERVICES_ID);
     var sheet = ss.getSheetByName(SHEET_PARAMS);
     var rows = sheet.getDataRange().getValues();
     rows.shift(); // headers
     
     var basePrice = 0;
     var currency = "MXN"; // default
     
     // Very basic pricing engine logic:
     // Find matching rows for ServiceID + Tier + ParamName
     // Calculate: Value * Unit_Price
     
     // 1. Filter rows for this service/tier
     var relevantRows = rows.filter(function(r) {
        // Col A=ID, B=Tier
        return r[0] == serviceId && (r[1] == tier || r[1] == "");
     });
     
     if (relevantRows.length === 0) {
         // Fallback or error?
         return { unitPrice: 0, subtotal: 0, currency: currency, error: "No pricing found" };
     }
     
     var total = 0;
     
     // 2. Iterate params provided by user
     // userParams = { "objectives": 10 }
     for (var paramName in userParams) {
        var quantity = userParams[paramName];
        
        // Find price rule for this param
        var priceRule = relevantRows.find(function(r) { 
             return String(r[2]).toLowerCase() === String(paramName).toLowerCase(); 
        });
        // Col G = Unit Price
        if (priceRule) {
            total += (Number(priceRule[6]) * quantity);
            currency = priceRule[7];
        }
     }
     
     // Also Look for Base Price (where param name is empty or 'Base') - if architecture allows
     // For this prompt, pricing seems purely parametric or tiered.
     
     return {
         unitPrice: total, // Simplified
         subtotal: total,
         currency: currency
     };
  }

  return {
    getAllActiveServices: getAllActiveServices,
    getPrice: getPrice
  };

})();
