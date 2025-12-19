/**
 * @file ServiceCatalogManager.gs
 * @description Manages retrieval of services and pricing from Google Sheets.
 */

var ServiceCatalogManager = (function() {
  
  // Cache keys
  var CACHE_KEY_SERVICES = "SOW_GEN_SERVICES_V5_CLEAN"; 
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
     var breakdown = [];
     
     for (var paramName in userParams) {
        var quantity = parseFloat(userParams[paramName]);
        if (isNaN(quantity)) continue;

        var pName = String(paramName).trim().toLowerCase();
        var keySpecific = serviceId + "|" + tier + "|" + pName;
        var keyUniversal = serviceId + "|" + "" + "|" + pName;
        
        var rule = _pricingIndex[keySpecific] || _pricingIndex[keyUniversal];

        if (rule) {
            var sub = (rule.unitPrice * quantity);
            total += sub;
            currency = rule.currency; 
            
            breakdown.push({
                concept: paramName, // Original name (e.g. "objectives")
                unitType: paramName, // Will be translated later
                quantity: quantity,
                unitPrice: rule.unitPrice,
                total: sub
            });
        }
     }
     
     return {
         unitPrice: total,
         subtotal: total,
         currency: currency,
         breakdown: breakdown // Return detailed components
     };
  }

  /**
   * Clears the service catalog cache.
   * Run this after adding new services to the Excel.
   */
  function clearCache() {
    var cache = CacheService.getScriptCache();
    cache.remove(CACHE_KEY_SERVICES);
    _pricingIndex = null; // Also clear runtime index
    console.log("✅ Service Catalog Cache cleared!");
    return true;
  }

  /**
   * Forces a refresh of the service catalog.
   * Clears cache and fetches fresh data.
   */
  function forceRefresh() {
    clearCache();
    var services = getAllActiveServices(true);
    console.log("✅ Service Catalog refreshed. " + services.length + " services loaded.");
    return services;
  }

  /**
   * Helper: Convert to Title Case
   */
  function _toTitleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, function(char) {
      return char.toUpperCase();
    });
  }

  /**
   * Check if template files already exist in the services folder
   * @param {Array} templateNames - Array of template filenames to check
   * @returns {Object} { existing: [...], missing: [...] }
   */
  function checkExistingTemplates(templateNames) {
    var folder = DriveApp.getFolderById(CONFIG.SERVICIOS_FOLDER_ID);
    var files = folder.getFiles();
    
    // Build index of existing files
    var existingFiles = {};
    while (files.hasNext()) {
      var file = files.next();
      var name = file.getName().toLowerCase().replace(/[^a-z0-9]/g, "");
      existingFiles[name] = { id: file.getId(), name: file.getName() };
    }
    
    var existing = [];
    var missing = [];
    
    templateNames.forEach(function(tplName) {
      var normalizedName = tplName.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (existingFiles[normalizedName]) {
        existing.push({
          name: tplName,
          fileId: existingFiles[normalizedName].id,
          url: "https://docs.google.com/document/d/" + existingFiles[normalizedName].id + "/edit"
        });
      } else {
        missing.push(tplName);
      }
    });
    
    return { existing: existing, missing: missing };
  }

  /**
   * Create new Google Doc templates in the services folder
   * @param {Array} templateNames - Array of template filenames to create
   * @param {string} serviceName - Service display name for doc content
   * @returns {Array} Array of created doc info { name, fileId, url }
   */
  function createServiceTemplates(templateNames, serviceName) {
    var folder = DriveApp.getFolderById(CONFIG.SERVICIOS_FOLDER_ID);
    var created = [];
    
    templateNames.forEach(function(tplName) {
      try {
        // Create new Google Doc
        var doc = DocumentApp.create(tplName);
        var body = doc.getBody();
        
        // Add placeholder content
        // Clean Template: No H1 title (Generator handles titles). Just instructional text.
        body.appendParagraph("[Pegar aquí la descripción técnica, alcance y metodología del servicio " + serviceName + "]")
            .setItalic(true)
            .setForegroundColor("#666666");
        
        doc.saveAndClose();
        
        // Move to services folder
        var file = DriveApp.getFileById(doc.getId());
        file.moveTo(folder);
        
        created.push({
          name: tplName,
          fileId: doc.getId(),
          url: "https://docs.google.com/document/d/" + doc.getId() + "/edit"
        });
        
        console.log("📄 Created template: " + tplName);
      } catch (e) {
        console.error("Error creating template " + tplName + ": " + e.message);
      }
    });
    
    return created;
  }

  /**
   * Send email notification with template URLs
   * @param {string} serviceName - Service name
   * @param {Array} templates - Array of { name, url }
   */
  function sendTemplateNotificationEmail(serviceName, templates) {
    try {
      var userEmail = Session.getActiveUser().getEmail();
      if (!userEmail) {
        console.warn("No user email available for notification");
        return false;
      }
      
      var templateList = templates.map(function(t) {
        return "• " + t.name + "\n  " + t.url;
      }).join("\n\n");
      
      var subject = "🆕 Nuevo servicio creado: " + serviceName;
      var body = "Se ha creado el servicio '" + serviceName + "' en el SOW Generator.\n\n" +
                 "Por favor, completa el contenido de los siguientes templates:\n\n" +
                 templateList + "\n\n" +
                 "Abre cada documento y agrega la descripción detallada del servicio.\n\n" +
                 "---\nSOW Generator - KIO IT Services";
      
      MailApp.sendEmail({
        to: userEmail,
        subject: subject,
        body: body
      });
      
      console.log("📧 Email sent to: " + userEmail);
      return true;
    } catch (e) {
      console.warn("Could not send email: " + e.message);
      return false;
    }
  }

  /**
   * Adds a new service to the catalog sheet.
   * Now also creates template documents and sends email notification.
   * @param {Object} serviceData - Service data object
   * @param {boolean} forceCreate - Force create new templates even if existing
   * @returns {Object} Result with success, message, templates info
   */
  function addNewService(serviceData, forceCreate) {
    try {
      // Validate required fields
      if (!serviceData.id || !serviceData.name) {
        return { success: false, message: "ID y Nombre son obligatorios" };
      }
      
      // Normalize ID (uppercase, no spaces)
      var normalizedId = String(serviceData.id).toUpperCase().replace(/\s+/g, "_");
      
      // Generate template names
      var templateNames = [];
      var hasTiers = serviceData.hasTiers;
      var tiers = serviceData.tiers ? String(serviceData.tiers).split(",") : [];
      
      if (hasTiers && tiers.length > 0) {
        tiers.forEach(function(tier) {
          templateNames.push(_toTitleCase(serviceData.id) + " " + _toTitleCase(tier.trim()));
        });
      } else {
        templateNames.push(_toTitleCase(serviceData.id));
      }
      
      // Check for existing templates
      var templateCheck = checkExistingTemplates(templateNames);
      
      // If templates exist and not forcing, return for user confirmation
      if (templateCheck.existing.length > 0 && !forceCreate) {
        return {
          success: false,
          existingTemplates: true,
          existing: templateCheck.existing,
          missing: templateCheck.missing,
          message: "Ya existen " + templateCheck.existing.length + " template(s). ¿Deseas usarlos o crear nuevos?"
        };
      }
      
      // Create missing templates (or all if forceCreate)
      var templatesToCreate = forceCreate ? templateNames : templateCheck.missing;
      var createdTemplates = createServiceTemplates(templatesToCreate, serviceData.name);
      
      // Combine existing + created
      var allTemplates = templateCheck.existing.concat(createdTemplates);
      
      // Open spreadsheet and catalog sheet
      var ss = SpreadsheetApp.openById(CONFIG.SHEET_SERVICES_ID);
      var sheet = ss.getSheetByName(CONFIG.sheets.CATALOG);
      
      if (!sheet) {
        return { success: false, message: "Hoja de catálogo no encontrada" };
      }
      
      // Format data for the row (columns A-K)
      var newRow = [
        normalizedId,                                              // A: id
        serviceData.name,                                          // B: name
        serviceData.category || "",                                // C: category
        serviceData.hasTiers || false,                             // D: hasTiers
        serviceData.tiers || "",                                   // E: tiers (comma-separated)
        serviceData.configParams ? JSON.stringify(serviceData.configParams) : "", // F: configParams JSON
        serviceData.optionalAddons ? JSON.stringify(serviceData.optionalAddons) : "", // G: optionalAddons JSON
        serviceData.templateId || "",                              // H: templateId
        serviceData.duration || "",                                // I: duration
        serviceData.description || "",                             // J: description
        true                                                       // K: activo
      ];
      
      // Append the new row
      sheet.appendRow(newRow);
      
      // Update template naming column
      updateTemplateNamingColumnForService(sheet, normalizedId, templateNames);
      
      // Refresh cache so new service appears immediately
      forceRefresh();
      
      // Send email notification
      var emailSent = sendTemplateNotificationEmail(serviceData.name, allTemplates);
      
      console.log("✅ New service added: " + normalizedId);
      return { 
        success: true, 
        message: "Servicio '" + serviceData.name + "' agregado exitosamente",
        serviceId: normalizedId,
        templates: allTemplates,
        emailSent: emailSent
      };
      
    } catch (e) {
      console.error("Error adding service: " + e);
      var errorMsg = (e.message) ? e.message : e.toString();
      return { success: false, message: "Error Interno: " + errorMsg };
    }
  }

  /**
   * Helper to update template naming column for a specific service
   */
  function updateTemplateNamingColumnForService(sheet, serviceId, templateNames) {
    try {
      var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var templateColIndex = headerRow.indexOf("TEMPLATE_FILENAME");
      
      if (templateColIndex === -1) {
        // Column doesn't exist, add it
        templateColIndex = sheet.getLastColumn();
        sheet.getRange(1, templateColIndex + 1).setValue("TEMPLATE_FILENAME");
      }
      
      // Write to the last row (the one we just added)
      var lastRow = sheet.getLastRow();
      sheet.getRange(lastRow, templateColIndex + 1).setValue(templateNames.join("\n"));
      
      console.log("✅ Template filename updated for row " + lastRow);
    } catch (e) {
      console.warn("Could not update template column: " + e.message);
    }
  }

  return {
    getAllActiveServices: getAllActiveServices,
    getPrice: getPrice,
    clearCache: clearCache,
    forceRefresh: forceRefresh,
    addNewService: addNewService
  };

})();

/**
 * Standalone function to clear service cache.
 * Can be run directly from Apps Script menu.
 */
function clearServiceCache() {
  ServiceCatalogManager.clearCache();
}

/**
 * Standalone function to refresh service catalog.
 * Can be run directly from Apps Script menu.
 */
function refreshServiceCatalog() {
  var services = ServiceCatalogManager.forceRefresh();
  console.log("Services: " + JSON.stringify(services.map(function(s) { return s.displayName; })));
}

/**
 * Generates a naming guide for service templates.
 * Shows recommended filenames and folder path for each service.
 * Run this from Apps Script to see the guide in logs.
 */
function generateTemplateNamingGuide() {
  var services = ServiceCatalogManager.getAllActiveServices(true);
  var folderUrl = "https://drive.google.com/drive/folders/" + CONFIG.SERVICIOS_FOLDER_ID;
  
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║           GUÍA DE NAMING PARA TEMPLATES DE SERVICIOS         ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log("║ 📁 Carpeta destino: " + folderUrl);
  console.log("╠══════════════════════════════════════════════════════════════╣");
  
  services.forEach(function(svc) {
    console.log("║");
    console.log("║ 📋 Servicio: " + svc.name + " (ID: " + svc.id + ")");
    
    if (svc.hasTiers && svc.tiers && svc.tiers.length > 0) {
      console.log("║    ↳ Tiene tiers: " + svc.tiers.join(", "));
      console.log("║    📄 Archivos necesarios:");
      svc.tiers.forEach(function(tier) {
        var filename = svc.id + "_" + tier.trim();
        console.log("║       • " + filename + " (Google Doc)");
      });
    } else {
      console.log("║    📄 Archivo necesario:");
      console.log("║       • " + svc.id + " (Google Doc)");
    }
  });
  
  console.log("║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log("║ 💡 NOTAS:");
  console.log("║    • Los nombres son case-insensitive y se normalizan.");
  console.log("║    • Puedes usar espacios o guiones: SOC_Gold = SOC Gold = SOC-Gold");
  console.log("║    • Los archivos DEBEN ser Google Docs (no Word, PDF, etc.)");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  
  return services.length + " servicios procesados";
}

/**
 * Writes the template naming guide to a new column in the Excel.
 * Adds a "TEMPLATE_FILENAME" column showing recommended names.
 */
function updateTemplateNamingColumn() {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_SERVICES_ID);
  var sheet = ss.getSheetByName(CONFIG.sheets.CATALOG);
  var data = sheet.getDataRange().getValues();
  
  // Helper: Convert to Title Case (first letter uppercase, rest lowercase)
  function toTitleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, function(char) {
      return char.toUpperCase();
    });
  }
  
  // Find or create TEMPLATE_FILENAME column (column L = index 11)
  var headerRow = data[0];
  var templateColIndex = headerRow.indexOf("TEMPLATE_FILENAME");
  
  if (templateColIndex === -1) {
    // Column doesn't exist, add it
    templateColIndex = headerRow.length;
    sheet.getRange(1, templateColIndex + 1).setValue("TEMPLATE_FILENAME");
  }
  
  // Update each row with suggested filename
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var serviceId = String(row[0] || "").trim();
    var hasTiers = row[3];
    var tiers = row[4] ? String(row[4]).split(",") : [];
    
    if (!serviceId) continue;
    
    var suggestion = "";
    if (hasTiers && tiers.length > 0) {
      suggestion = tiers.map(function(t) { 
        return toTitleCase(serviceId) + " " + toTitleCase(t.trim()); 
      }).join("\n");
    } else {
      suggestion = toTitleCase(serviceId);
    }
    
    sheet.getRange(i + 1, templateColIndex + 1).setValue(suggestion);
  }
  
  console.log("✅ Columna TEMPLATE_FILENAME actualizada");
  return "Columna actualizada para " + (data.length - 1) + " servicios";
}

