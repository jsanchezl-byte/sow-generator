/**
 * @file AuditLogger.gs
 * @description Logs success and error events to a dedicated 'SOW_LOGS' sheet in the master spreadsheet.
 */

var AuditLogger = (function() {

  /**
   * Logs a successful generation event to the Spreadsheet.
   * @param {Object} data 
   */
  function logSuccess(data) {
    console.log("AuditLogger: Logging Success...", data);
    _logToSheet("SUCCESS", data);
  }

  /**
   * Logs an error event to the Spreadsheet.
   * @param {Object} data 
   */
  function logError(data) {
    console.error("AuditLogger: Logging Error...", data);
    _logToSheet("ERROR", data);
  }

  /**
   * Internal helper to write to the 'SOW_LOGS' sheet.
   * Creates the sheet if it doesn't exist.
   */
  function _logToSheet(status, data) {
    try {
        // Usa CONFIG si está disponible, sino intenta abrir activo (para scripts enlazados)
        var ss;
        if (typeof CONFIG !== 'undefined' && CONFIG.SHEET_SERVICES_ID) {
           ss = SpreadsheetApp.openById(CONFIG.SHEET_SERVICES_ID);
        } else {
           ss = SpreadsheetApp.getActiveSpreadsheet();
        }
        
        if (!ss) {
           console.warn("AuditLogger: No spreadsheet accessible.");
           return;
        }

        var sheetName = "SOW_LOGS";
        var sheet = ss.getSheetByName(sheetName);
        
        // If sheet doesn't exist, create it and add headers
        if (!sheet) {
            sheet = ss.insertSheet(sheetName);
            sheet.appendRow([
                "Timestamp", 
                "Status", 
                "User Email", 
                "Client Name", 
                "Services Summary", 
                "Configuration Details", 
                "Document URL", 
                "File ID", 
                "Duration (ms)",
                "Error Message"
            ]);
            // Format Header
            sheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#E0E0E0");
            sheet.setFrozenRows(1);
        }
        
        var servicesSummary = "";
        var configDetails = "";
        
        // Extract interesting info from services array if present
        var svcs = data.services || [];
        // Support both old array format and structured object
        if (Array.isArray(svcs)) {
            // Generar resumen legible (Nombre + Tier)
            servicesSummary = svcs.map(function(s) { 
                var name = s.serviceName || s.id || "Unknown";
                return name + (s.tier ? " (" + s.tier + ")" : ""); 
            }).join(", ");
            
            // Generar detalles de configuración (tickets, objetivos)
            configDetails = svcs.map(function(s) {
                var details = [];
                if (s.parameters) {
                     for (var key in s.parameters) {
                         details.push(key + ": " + s.parameters[key]);
                     }
                }
                return details.length > 0 ? (s.serviceName || s.id) + ": [" + details.join(", ") + "]" : "";
            }).filter(Boolean).join("; ");
        }
        
        // Handle URL vs Link
        var link = data.sowUrl || (data.fileId ? "https://docs.google.com/document/d/" + data.fileId : "") || "";
        
        sheet.appendRow([
            new Date(),
            status,
            data.user || "unknown",
            data.clientName || "N/A",
            servicesSummary,
            configDetails,
            link,
            data.fileId || "",
            data.durationMs || 0,
            data.message || "" // For errors
        ]);
        
    } catch (e) {
        console.warn("AuditLogger: Failed to write to Spreadsheet. " + e.message);
    }
  }

  return {
    logSuccess: logSuccess,
    logError: logError
  };

})();
