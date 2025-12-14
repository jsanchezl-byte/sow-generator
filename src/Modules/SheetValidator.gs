/**
 * @file SheetValidator.gs
 * @description Audits the SOW Database Spreadsheet effectively.
 * Checks for extra sheets, missing columns, and data integrity.
 * Usage: Run 'auditSpreadsheetStructure' manually.
 */

var SheetValidator = (function() {

  var EXPECTED_SHEETS = ["SERVICIOS", "SERVICIO_PARAMETROS"];
  
  // Minimal expected headers count or specific names could be added here
  var SCHEMA = {
    "SERVICIOS": {
       minColumns: 11,
       description: "Esta hoja define el Catálogo. Columnas requeridas: ID, Nombre, Categoría... hasta 'Activo' (Col K)."
    },
    "SERVICIO_PARAMETROS": {
       minColumns: 8,
       description: "Esta hoja define Precios. Columnas requeridas: Service_ID, Tier, Param... hasta 'Currency'."
    }
  };

  /**
   * Main function to audit the spreadsheet structure.
   * Dynamically uses SchemaConfig to validate.
   */
  function auditSpreadsheetStructure() {
    console.log("Iniciando Auditoría Dinámica basada en SchemaConfig...");
    
    var ss = SpreadsheetApp.openById(CONFIG.SHEET_SERVICES_ID);
    var sheets = ss.getSheets();
    var sheetNames = sheets.map(function(s) { return s.getName(); });
    
    var report = [];
    var hasErrors = false;
    
    report.push(["AUDITORÍA DE ESTRUCTURA SOW", "FECHA: " + new Date()]);
    report.push(["--------------------------------------------------", ""]);
    
    // ------------------------------------------------
    // 1. SHEET EXISTENCE CHECK
    // ------------------------------------------------
    report.push(["1. REVISIÓN DE PESTAÑAS (Basado en SchemaConfig)", ""]);
    
    var requiredSheets = [SchemaConfig.SHEETS.CATALOG, SchemaConfig.SHEETS.PRICING];
    
    requiredSheets.forEach(function(expected) {
      if (sheetNames.indexOf(expected) === -1) {
        report.push(["❌ FALTANTE", "La hoja crítica '" + expected + "' no existe."]);
        hasErrors = true;
      } else {
        report.push(["✅ CORRECTO", "Hoja '" + expected + "' encontrada."]);
      }
    });

    // Check Extras
    var ignored = ["⚠️_AUDITORIA_DEL_SISTEMA"]; 
    sheetNames.forEach(function(name) {
      if (requiredSheets.indexOf(name) === -1 && ignored.indexOf(name) === -1) {
         report.push(["ℹ️ EXTRA", "Se detectó una hoja adicional: '" + name + "'."]);
      }
    });
    
    report.push(["", ""]);
    report.push(["2. REVISIÓN DE COLUMNAS", ""]);

    // ------------------------------------------------
    // 2. COLUMN VALIDATION LOOP
    // ------------------------------------------------
    
    var validations = [
        { sheet: SchemaConfig.SHEETS.CATALOG, columns: SchemaConfig.CATALOG_COLUMNS },
        { sheet: SchemaConfig.SHEETS.PRICING, columns: SchemaConfig.PRICING_COLUMNS }
    ];
    
    validations.forEach(function(val) {
        var sheetName = val.sheet;
        var schemaCols = val.columns;
        var sheet = ss.getSheetByName(sheetName);
        
        if (!sheet) return; // Already reported as missing
        
        // Check Column Count
        var minCols = schemaCols.length;
        var actualCols = sheet.getLastColumn();
        
        if (actualCols < minCols) {
             report.push(["⚠️ ALERTA EN '" + sheetName + "'", "Faltan columnas. Se encontraron " + actualCols + ", se requieren " + minCols + "."]);
        } else {
             report.push(["✅ ESTRUCTURA OK EN '" + sheetName + "'", "Cantidad de columnas correcta (" + actualCols + ")."]);
        }
        
        // Header Name Check (Row 1)
        var headers = sheet.getRange(1, 1, 1, Math.min(actualCols, 20)).getValues()[0];
        
        schemaCols.forEach(function(colDef) {
            // Index is 0-based, spreadsheet is 1-based, array is 0-based
            var actualHeader = headers[colDef.index] || "";
            
            // Loose check (case insensitive trim)
            if (actualHeader.trim().toLowerCase() !== colDef.header.trim().toLowerCase()) {
                report.push(["⚠️ HEADER DIFERENTE", "Hoja: " + sheetName + " | Col: " + (colDef.index+1) + ". Esperado: '" + colDef.header + "' - Encontrado: '" + actualHeader + "'"]);
            }
        });
    });
    
    // ------------------------------------------------
    // 3. WRITE REPORT
    // ------------------------------------------------
    var reportSheetName = "⚠️_AUDITORIA_DEL_SISTEMA";
    var reportSheet = ss.getSheetByName(reportSheetName);
    
    if (reportSheet) {
      reportSheet.clear();
    } else {
      reportSheet = ss.insertSheet(reportSheetName, 0); 
      reportSheet.setTabColor("red");
    }
    
    if (report.length > 0) {
      reportSheet.getRange(1, 1, report.length, 2).setValues(report);
      reportSheet.setColumnWidth(1, 200);
      reportSheet.setColumnWidth(2, 600);
      reportSheet.getRange(1, 1, report.length, 1).setFontWeight("bold");
    }
    
    console.log("Auditoría Dinámica completada.");
  }

  return {
    auditSpreadsheetStructure: auditSpreadsheetStructure
  };

})();


// End of Module
