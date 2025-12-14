/**
 * @file DocumentGenerator.gs
 * @description Core logic for SOW generation, placeholder replacement, and table injection.
 */

var DocumentGenerator = (function() {

  /**
   * Main function to create the SOW.
   * @param {Object} context context object containing all necessary data
   * @returns {Object} result { fileId, url, version, pdfId }
   */
  function createSOW(context) {
    console.log("DocumentGenerator.createSOW: Iniciando...");
    // context: { clientData, services, pricing, config }
    
    var clientData = context.clientData; 
    var config = context.config;         
    var services = context.services;
    var pricing = context.pricing;
    
    // 1. Prepare Workspace
    try {
        var clientFolderId = FileManager.getOrCreateClientFolder(clientData.clientName, config.CLIENTES_FOLDER_ID);
    } catch (e) {
        throw new Error("Fallo al acceder/crear carpeta de Cliente: " + e.message);
    }
    
    // 2. Smart Naming & Versioning
    var newDocName = "";
    var version = 0;
    try {
        var namingResult = _generateSmartFileName(clientData, services, clientFolderId);
        newDocName = namingResult.name;
        version = namingResult.version;
        console.log("Nombre calculado: " + newDocName + " (v" + version + ")");
    } catch (e) {
        throw new Error("Error calculando nombre/versión: " + e.message);
    }

    var newDocId;
    try {
        console.log("Copiando plantilla maestra (ID: " + config.SOW_MASTER_TEMPLATE_ID + ")...");
        newDocId = FileManager.copyDocument(config.SOW_MASTER_TEMPLATE_ID, newDocName, clientFolderId);
    } catch (e) {
        throw new Error("Fallo al copiar la Plantilla Maestra. Verifica ID y permisos. Error: " + e.message);
    }
    
    var doc;
    var body;
    try {
        console.log("Abriendo nuevo documento (ID: " + newDocId + ")...");
        doc = DocumentApp.openById(newDocId);
        body = doc.getBody();
    } catch (e) {
        throw new Error("Fallo al abrir el documento recién creado. Error: " + e.message);
    }
    
    // 3. Replace Basic Placeholders
    try {
        _replacePlaceholders(body, clientData);
         
        // 3.1 Replace Service List Summary {{Servicios}}
        // Restaurado con deduplicación agresiva
        var serviceNames = services.map(function(s) { return s.serviceName || s.serviceId; });
        
        var uniqueNames = [];
        var seen = {};
        serviceNames.forEach(function(name) {
            if (!name) return;
            // Normalize for comparison: lowercase, trim, remove accents
            var key = name.toString().toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            
            if (!seen[key]) {
                uniqueNames.push(name.trim()); // Push original (trimmed)
                seen[key] = true;
            }
        });
        
        var serviceString = "";
        
        if (uniqueNames.length === 1) {
            serviceString = uniqueNames[0];
        } else if (uniqueNames.length > 1) {
            var last = uniqueNames.pop();
            serviceString = uniqueNames.join(", ") + " y " + last;
        }
        
        // 1. Fill the new explicit Summary Placeholder (for the Title)
        body.replaceText("{{RESUMEN_SERVICIOS}}", serviceString);
        
        // 2. NUKE the old placeholder to clean up ghost lists near the table
        body.replaceText("{{Servicios}}", "");
        
    } catch (e) {
        console.warn("Error reemplazando placeholders simples: " + e.message);
        // No crítico
    }
    
    // 4. Inject Dynamic Tables
    try {
        _injectServicesTable(body, services);
    } catch (e) {
        console.warn("Fallo al inyectar Tabla de Servicios: " + e.message);
    }
    
    try {
        _injectServiceDetails(body, services);
    } catch (e) {
        console.warn("Fallo al inyectar Detalles de Servicios: " + e.message);
    }
    
    try {
        _injectPricingTable(body, pricing);
    } catch (e) {
        console.warn("Fallo al inyectar Tabla de Precios: " + e.message);
    }
    
    try {
        doc.saveAndClose();
    } catch (e) {
        throw new Error("Fallo al guardar y cerrar el documento: " + e.message);
    }
    
    console.log("Documento finalizado correctamente.");
    
    return {
        fileId: newDocId,
        url: doc.getUrl(),
        version: version,
        pdfId: null // PDF disabled for speed
    };
  }
  
  function _replacePlaceholders(body, data) {
      // data: { clientName: "Acme", ... }
      // placeholders: {{CLIENT_NAME}}, {{START_DATE}}
      
      // Mapping user friendly keys to placeholders
      var map = {
          "clientName": "{{NOMBRE_CLIENTE}}",
          "contactPerson": "{{CONTACTO_PRINCIPAL}}",
          "clientEmail": "{{EMAIL_CONTACTO}}",
          "startDate": "{{FECHA_INICIO}}"
      };
      
      for (var key in data) {
          var placeholder = map[key];
          if (placeholder) {
             body.replaceText(placeholder, data[key]);
          }
      }
      
      // Add 'Today'
      body.replaceText("{{FECHA_HOY}}", new Date().toLocaleDateString());

      // Handle Optional 'Quote' {{QUOTE}}
      // If present, prefix with Q-. If empty, clear placeholder.
      if (data.quoteNumber && data.quoteNumber.toString().trim() !== "") {
          body.replaceText("{{QUOTE}}", "Q-" + data.quoteNumber);
      } else {
          // User didn't provide a quote number.
          // We must remove the placeholder so it doesn't look ugly.
          body.replaceText("{{QUOTE}}", "");
      }
  }
  
  function _injectServicesTable(body, services) {
      // Restore original placeholder name now that the ghost text bug is fixed
      var placeholder = "{{SERVICIOS_TABLE}}";
      var element = body.findText(placeholder);
      
      if (!element) {
          // Fallback to the debug tag if user still has it
          element = body.findText("{{TABLA_NUEVA}}");
          if (!element) {
              console.warn("Ni {{SERVICIOS_TABLE}} ni {{TABLA_NUEVA}} encontrados.");
              return;
          }
      }
      
      var textElement = element.getElement();
      var paragraph = textElement.getParent();
      
      // Get index of the PARAGRAPH within the BODY
      var container = paragraph.getParent(); 
      var index = container.getChildIndex(paragraph);
      
      try {
          // Remove the paragraph containing the placeholder
          container.removeChild(paragraph);
          

          
          // Insert Table at index
          // Headers: Servicio, Tier, Configuración, Duración
          var table = body.insertTable(index);
          
          var headerRow = table.appendTableRow();
          headerRow.appendTableCell("Servicio").setBackgroundColor("#D9D2E9").setBold(true).setForegroundColor("#000000");
          headerRow.appendTableCell("Tier").setBackgroundColor("#D9D2E9").setBold(true).setForegroundColor("#000000");
          headerRow.appendTableCell("Configuración").setBackgroundColor("#D9D2E9").setBold(true).setForegroundColor("#000000");

          
          services.forEach(function(svc) {
              var row = table.appendTableRow();
              
              // Use standard appendTableCell(text) but force String type to be safe
              // This prevents potential ghost text issues caused by implicit type coercion failures
              row.appendTableCell(String(svc.serviceName || svc.serviceId || "Unknown"));
              row.appendTableCell(String(svc.tier || "N/A"));
              
              // Config string formatting
              var configStr = "";
              if (svc.parameters) {
                  if (svc.parameters.objectives) {
                      configStr += svc.parameters.objectives + " Objetivos";
                  }
                  if (svc.parameters.tickets) {
                      if (configStr !== "") configStr += ", ";
                      configStr += svc.parameters.tickets + " Tickets";
                  }
                  
                  for (var key in svc.parameters) {
                      if (key !== 'objectives' && key !== 'tickets') {
                           if (configStr !== "") configStr += ", ";
                           configStr += key + ": " + svc.parameters[key];
                      }
                  }
              }
              if (configStr === "") configStr = "-";
              
              row.appendTableCell(String(configStr));
              

          });
      } catch (e) {
          console.error("CRITICAL ERROR IN TABLE GENERATION: " + e.message);
          var errorP = body.insertParagraph(index, "⚠️ ERROR GENERANDO TABLA DE SERVICIOS: " + e.message);
          errorP.setForegroundColor("#FF0000").setBold(true);
      }
  }
  
  function _injectServiceDetails(body, services) {
      var placeholder = "{{DETALLE_SERVICIOS}}";
      var element = body.findText(placeholder);
      
      if (!element) return;
      
      var textElement = element.getElement();
      var paragraph = textElement.getParent();
      
      var container = paragraph.getParent(); 
      var index = container.getChildIndex(paragraph);
      
      // Remove placeholder paragraph
      container.removeChild(paragraph);
      
      // Iterate services and append content
      services.forEach(function(svc) {
          // NO DEDUPLICATION HERE: We want distinct sections for distinct Tiers
          
          // 1. Title: "Service Name - Tier"
          var titleText = (svc.serviceName || svc.serviceId) + (svc.tier ? " - " + svc.tier : "");
          
          var title = body.insertParagraph(index, titleText);
          title.setHeading(DocumentApp.ParagraphHeading.HEADING3);
          title.setFontFamily("Helvetica Neue"); 
          index++;
          
          // 2. Description Text
          var descText = svc.description || "Sin descripción disponible.";
          var p = body.insertParagraph(index, descText);
          p.setHeading(DocumentApp.ParagraphHeading.NORMAL);
          p.setFontFamily("Helvetica Neue");
          p.setFontSize(11);
          index++;
          
          // 3. Spacing
          body.insertParagraph(index, "");
          index++;
      });
  }

  function _injectPricingTable(body, fullPricingData) {
      var placeholder = "{{PRECIOS_TABLE}}";
      var element = body.findText(placeholder);
      
      if (!element) return;
      
      var textElement = element.getElement();
      var paragraph = textElement.getParent();
      
      var container = paragraph.getParent(); 
      var index = container.getChildIndex(paragraph);
      
      // Remove placeholder paragraph
      container.removeChild(paragraph);
// ... existing pricing table logic ...
      
      var table = body.insertTable(index);
      var headerRow = table.appendTableRow();
      headerRow.appendTableCell("Concepto").setBackgroundColor("#D9D2E9").setBold(true);
      headerRow.appendTableCell("Unidad de Medida").setBackgroundColor("#D9D2E9").setBold(true);
      headerRow.appendTableCell("Cantidad").setBackgroundColor("#D9D2E9").setBold(true);
      headerRow.appendTableCell("Precio Mensual MXN").setBackgroundColor("#D9D2E9").setBold(true);
      headerRow.appendTableCell("Precio Total MXN").setBackgroundColor("#D9D2E9").setBold(true);

      // fullPricingData is array of { serviceId, unitType, quantity... }
      var grandTotal = 0;
      
      fullPricingData.forEach(function(item) {
          var row = table.appendTableRow();
          // Use name if available, fallback to ID
          var displayName = item.serviceName || item.serviceId;
          
          // 1. Concepto
          row.appendTableCell(String(displayName + (item.tier ? " - " + item.tier : "")));
          
          // 2. Unidad
          row.appendTableCell(String(item.unitType || "Servicio"));
          
          // 3. Cantidad
          row.appendTableCell(String(item.quantity || 1));
          
          // 4. Precio Mensual (Hardcoded 0.00)
          row.appendTableCell("$ 0.00"); 
          
          // 5. Precio Total (Hardcoded 0.00)
          row.appendTableCell("$ 0.00"); 
          
          // grandTotal += item.subtotal; // Disabled calculation
      });
      
      var totalRow = table.appendTableRow();
      totalRow.appendTableCell("TOTAL").setBold(true);
      totalRow.appendTableCell(""); // Empty Unit
      totalRow.appendTableCell(""); // Empty Qty
      totalRow.appendTableCell(""); // Empty Monthly
      totalRow.appendTableCell("$ 0.00").setBold(true);
  }

  /**
   * Generates the rigorous SOW filename.
   * Format: SOW_{{RESUMEN}}_{{VENDOR}}_{{CLIENT}}_{{YYMMDD}}_{{SoP}}_V{{VER}}
   */
  function _generateSmartFileName(clientData, services, folderId) {
      // 1. SERVICES SUMMARY (Use IDs)
      var unique = [];
      var seen = {};
      services.forEach(function(s) {
          var id = (s.serviceId || "Unknown").trim();
          var k = id.toLowerCase();
          if (!seen[k]) { unique.push(id); seen[k] = true; }
      });
      
      var resumen = unique.join("-");
      if (resumen === "") resumen = "General";
      
      // Sanitizers
      resumen = _sanitizeName(resumen).substring(0, 50);

      // 2. VENDOR
      var vendor = _sanitizeName(clientData.vendor || "KIO ITS").toUpperCase();

      // 3. CLIENT
      var client = _sanitizeName(clientData.clientName || "Unknown");

      // 4. DATE (yyyyMMdd)
      var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");

      // 5. SoP (Enforce SoP- prefix)
      var rawSop = String(clientData.sopNumber || "000000").trim();
      // Logic to ensure SoP- prefix exists
      if (!/^sop-/i.test(rawSop)) {
         // If numeric only, prepend. If mixed, check if it has dash.
         // Simplified: Just ensure it starts with SoP- if user didn't type it
         // But user might type "SOP 123". Let's clean it.
         if (/^\d+$/.test(rawSop)) {
             rawSop = "SoP-" + rawSop;
         } else if (rawSop.toLowerCase().indexOf("sop") === -1) {
             // Does not contain sop at all
             rawSop = "SoP-" + rawSop;
         }
      }
      var sopTag = _sanitizeName(rawSop);

      // 6. VERSIONING
      var folder = DriveApp.getFolderById(folderId);
      var version = _findNextVersion(folder, sopTag);

      // ASSEMBLE
      var fullName = "SOW_" + resumen + "_" + vendor + "_" + client + "_" + dateStr + "_" + sopTag + "_V" + version;
      
      return {
          name: fullName,
          version: version
      };
  }

  /**
   * Helper to sanitize strings for filenames.
   * Removes accents, spaces to hyphens, keeps alphanumeric.
   */
  function _sanitizeName(str) {
      if (!str) return "";
      return str.normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "") // Remove accents
                .trim()
                .replace(/\s+/g, "-") // Spaces to hyphens
                .replace(/[^a-zA-Z0-9\-_]/g, ""); // Remove invalid chars
  }

  /**
   * Scans a folder for files matching the SoP tag and determines the next version.
   */
  function _findNextVersion(folder, sopTag) {
      if (!folder) return 1;
      
      // We look for files containing the SoP Tag to link versions logic to that Opportunity
      // Pattern expected: ..._SoP-12345_V(\d+)
      // Note: files.next() is slow if folder has thousands of files. Usually Clients folders are small.
      var files = folder.getFiles();
      var maxVer = 0;
      var foundAny = false;
      
      // Escape SoP for RegEx
      var escapedSoP = sopTag.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      // Regex to capture version number at the end of filename (ignoring extension via Google Drive logic usually, but name string might have it?) 
      // DriveApp getName() usually does NOT include extension for Google Docs, but does for PDFs.
      // We look for "_V" followed by digits at end of string or before dot
      var versionRegex = new RegExp(escapedSoP + ".*_V(\\d+)", "i");

      while (files.hasNext()) {
          var file = files.next();
          var name = file.getName();
          
          if (name.indexOf(sopTag) !== -1) {
              foundAny = true;
              var match = name.match(versionRegex);
              if (match && match[1]) {
                  var v = parseInt(match[1], 10);
                  if (v > maxVer) maxVer = v;
              }
          }
      }

      // If it's a new SoP for this folder, start at 1. If exists, increment.
      return maxVer + 1;
  }

  return {
    createSOW: createSOW
  };

})();
