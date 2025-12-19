/**
 * @file Main.gs
// ==========================================


// ==========================================
// FORM AUTOMATION
// ==========================================*/
/**
 * Creates a linked Google Form for testing AND installs the trigger automatically.
 * Run this function once manually.
 */
function setupTestForm() {
  var form = FormApp.create('SOW Generator - Test Request ' + new Date().toLocaleTimeString());
  
  // 1. Client Name (Text)
  form.addTextItem().setTitle('Client Name').setRequired(true);
  
  // 2. Client Email (Text)
  form.addTextItem().setTitle('Client Email').setRequired(true);
  
  // 3. Start Date (Date)
  form.addDateItem().setTitle('Start Date').setRequired(true);
  
  // 4. Service Selection (Dropdown)
  var serviceItem = form.addListItem().setTitle('Service Type').setRequired(true);
  serviceItem.setChoiceValues(['PENETRATION_TEST', 'SECURITY_AUDIT']);
  
  // 5. Tier (Dropdown)
  var tierItem = form.addListItem().setTitle('Tier').setRequired(false);
  tierItem.setChoiceValues(['Silver', 'Gold', 'Platinum']);

  // Link to Spreadsheet
  try {
    form.setDestination(FormApp.DestinationType.SPREADSHEET, CONFIG.SHEET_SERVICES_ID);
    console.log('Form linked to Spreadsheet ID: ' + CONFIG.SHEET_SERVICES_ID);
  } catch (e) {
    console.warn('Could not link to spreadsheet automatically: ' + e.message);
  }
  
  // Install Trigger Automatically
  try {
    ScriptApp.newTrigger('onFormSubmit')
      .forForm(form)
      .onFormSubmit()
      .create();
    console.log("Trigger instalado correctamente.");
  } catch (e) {
    console.warn("No se pudo instalar el trigger automáticamente: " + e.message);
  }
  
  console.log('NUEVO Formulario URL: ' + form.getPublishedUrl());
}

/**
 * Trigger handler for Google Forms.
 * @param {Object} e Event object from Form Submit
 */
function onFormSubmit(e) {
  if (!e) {
    console.error("Function called without event object. If testing manually, use 'testRapido'.");
    return;
  }
  try {
     // Get named values (requires the form to have been linked and headers present)
     // Or use item responses for index-based (safer if headers change)
     var responses = e.response.getItemResponses();
     var data = _mapFormResponsesToData(responses);
     
     _processRequest(data.clientData, data.serviceSelection, e.response.getRespondentEmail());
     
  } catch (error) {
     AuditLogger.logError({
        user: e.response ? e.response.getRespondentEmail() : "unknown",
        errorType: "FORM_SUBMIT_ERROR",
        message: error.message,
        stack: error.stack
     });
     
     // Notify admin
     try {
       NotificationManager.sendErrorNotification("admin@example.com", error.message);
     } catch(err) { console.error("Could not send email"); }
  }
}

// Webhook handler for Chatbot (HTTP POST) - REMOVED


/**
 * Core processing orchestration.
 */
/**
 * Core processing orchestration with Enhanced Diagnostics
 */
function _processRequest(clientData, serviceSelection, userEmail) {
    console.log("Iniciando _processRequest para: " + userEmail);
    var startTime = new Date().getTime();

    // DIAGNOSTIC STEP 0: Verify Config Access
    if (!CONFIG || !CONFIG.SOW_MASTER_TEMPLATE_ID) {
      throw new Error("CRITICO: La configuración no se cargó correctamente.");
    }

    // 1. Validation
    var clientValid = DataValidator.validateClientData(clientData);
    if (!clientValid.valid) throw new Error("Datos del Cliente Inválidos: " + clientValid.errors.join(", "));
    
    var servicesValid = DataValidator.validateServiceSelection(serviceSelection);
    if (!servicesValid.valid) throw new Error("Selección de Servicios Inválida: " + servicesValid.errors.join(", "));
    
    // 2. Data Preparation
    var enrichedServices = [];
    var fullPricing = [];
    
    try {
        // DIAGNOSTIC STEP 1: Fetch Catalog
        console.log("Intentando leer Catálogo de Servicios...");
        var allServices = ServiceCatalogManager.getAllActiveServices();
        var serviceMap = {};
        allServices.forEach(function(s) { serviceMap[s.id] = s.name; });
        console.log("Catálogo leído exitosamente. " + allServices.length + " servicios activos.");
    } catch (e) {
        throw new Error("Error leyendo la Hoja de Cálculo (Catálogo): " + e.message);
    }
    
    // Process each service
    serviceSelection.forEach(function(reqSvc) {
        
        // A. Try get Description
        var desc = "Descripción no disponible (Verificar carpeta de Servicios)";
        try {
            console.log("Buscando descripción para: " + reqSvc.id);
            desc = ServiceContentExtractor.getServiceDescription(reqSvc.id, reqSvc.tier, CONFIG.SERVICIOS_FOLDER_ID);
        } catch (e) {
            console.warn("No se pudo leer descripción para " + reqSvc.id + ": " + e.message);
            // Continue with default desc
        }
        
        // B. Try get Price
        var priceInfo = { unitPrice: 0, subtotal: 0, currency: "MXN" };
        try {
            priceInfo = ServiceCatalogManager.getPrice(reqSvc.id, reqSvc.tier, reqSvc.parameters);
        } catch (e) {
             console.warn("No se pudo calcular precio para " + reqSvc.id + ": " + e.message);
             // Continue with default price
        }
            
        enrichedServices.push({
            serviceId: reqSvc.id,
            serviceName: serviceMap[reqSvc.id] || reqSvc.id, 
            tier: reqSvc.tier,
            parameters: reqSvc.parameters,
            description: desc,
            duration: "Ver Detalles"
        });
        
        // 3. Add to Pricing Table (Split by Unit of Measure if available)
        if (priceInfo.breakdown && priceInfo.breakdown.length > 0) {
            // Case A: Granular Breakdown (e.g. 5 Objectives, 10 IPs)
            priceInfo.breakdown.forEach(function(item) {
                fullPricing.push({
                    serviceId: reqSvc.id,
                    serviceName: serviceMap[reqSvc.id] || reqSvc.id,
                    tier: reqSvc.tier,
                    unitPrice: item.unitPrice, 
                    subtotal: item.total,
                    unitType: item.unitType, // Will be translated by DocumentGenerator
                    quantity: item.quantity
                });
            });
        } else {
             // Case B: Simple Service (Flat Fee or No Params)
             // Determine Quantity
             var quantity = 1;
             var unitType = "Servicio";
             
             // Try to infer quantity from params if strict breakdown wasn't found
             if (reqSvc.parameters && Object.keys(reqSvc.parameters).length > 0) {
                 var firstKey = Object.keys(reqSvc.parameters)[0];
                 var val = parseFloat(reqSvc.parameters[firstKey]);
                 if (!isNaN(val)) {
                     quantity = val;
                     unitType = firstKey;
                 }
             }

             fullPricing.push({
                serviceId: reqSvc.id,
                serviceName: serviceMap[reqSvc.id] || reqSvc.id,
                tier: reqSvc.tier,
                unitPrice: priceInfo.unitPrice,
                subtotal: priceInfo.subtotal,
                unitType: unitType,
                quantity: quantity
            });
        }
    });
    
    // 3. Document Generation
    var context = {
        clientData: clientData,
        services: enrichedServices,
        pricing: fullPricing,
        config: CONFIG,
        userEmail: userEmail // Pass email for permissions
    };
    
    var docResult;
    try {
        console.log("Generando documento...");
        docResult = DocumentGenerator.createSOW(context); // { fileId, url, version }
        console.log("Documento generado: " + docResult.url);
    } catch (e) {
        throw new Error("Error crítico generando el Documento (Google Docs): " + e.message + ". Verifica permisos de la Plantilla o Carpeta.");
    }
    
    var duration = new Date().getTime() - startTime;
    
    // 4. Audit & Notification (Fail-safe)
    try {
        AuditLogger.logSuccess({
            user: userEmail,
            clientName: clientData.clientName,
            services: enrichedServices, // Use enriched data for better logging names
            fileId: docResult.fileId,
            sowUrl: docResult.url,
            version: docResult.version,
            durationMs: duration,
            pdfGenerated: !!docResult.pdfId
        });
        
        NotificationManager.sendSOWGenerationConfirmation(userEmail, {
            clientName: clientData.clientName,
            sowUrl: docResult.url,
            services: enrichedServices
        });
    } catch (e) {
        console.warn("Error en Auditoría/Notificación (No crítico): " + e.message);
    }
    
    return docResult;
}

/**
 * Helper to map Form Responses (Array) to structured object.
 * Logic matches the 'setupTestForm' structure.
 * Q1: Name, Q2: Email, Q3: StartDate, Q4: Service, Q5: Tier
 */
function _mapFormResponsesToData(responses) {
    var clientName = responses[0].getResponse();
    var clientEmail = responses[1].getResponse();
    var startDate = responses[2].getResponse();
    
    var serviceResponse = responses[3].getResponse(); // Can be String or Array of Strings
    var tier = responses[4] ? responses[4].getResponse() : ""; // Silver
    
    var selectedServices = [];
    
    if (Array.isArray(serviceResponse)) {
       // Multi-select (Checkbox)
       serviceResponse.forEach(function(svcId) {
           selectedServices.push({
             id: svcId,
             tier: tier,
             parameters: {}
           });
       });
    } else {
       // Single-select (Dropdown)
       selectedServices.push({
         id: serviceResponse,
         tier: tier,
         parameters: {}
       });
    }
    
    return {
        clientData: {
            clientName: clientName,
            clientEmail: clientEmail,
            startDate: startDate
        },
        serviceSelection: selectedServices
    };
}

/**
 * Quick code-only test function.
 */
function testRapido() {
  var mockData = {
    clientData: {
      clientName: "Test Client Quick",
      clientEmail: "test@example.com",
      startDate: new Date()
    },
    serviceSelection: [
       { id: "PENETRATION_TEST", tier: "Gold", parameters: { objectives: 5 } },
       { id: "SOC", tier: "Silver", parameters: { tickets: 100 } }
    ],
    userEmail: "testrunner@example.com"
  };
  
  _processRequest(mockData.clientData, mockData.serviceSelection, mockData.userEmail);
}

/**
 * ENTRY POINT for Spreadsheet Button
 */
function runSheetAudit() {
  SheetValidator.auditSpreadsheetStructure();
}

/**
 * Wrapper to call the HelpGuideGenerator module
 */
function generateGuideWrapper() {
  generateAdminGuide();
}

/**
 * UI TRIGGER
 * Adds a custom menu to the spreadsheet when opened.
 * (Only works if this script is bound to the Spreadsheet)
 */
function onOpen() {
  try {
    // Only attempt if we are in a spreadsheet context
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('🚀 SOW Generator')
      .addItem('🔍 Auditar Hojas y Columnas', 'runSheetAudit')
      .addSeparator()
      .addItem('📘 Generar Guía de Instrucciones', 'generateGuideWrapper')
      .addToUi();
  } catch (e) {
    // Silent fail if run from standalone script or non-spreadsheet context
    console.warn("Menu creation skipped: " + e.message);
  }
}

/**
 * ==========================================
 * TOOLS
 * ==========================================
 */

/**
 * SIMULACIÓN DEMO (Solicitada por Usuario)
 * Ejecuta una generación de SOW con datos aleatorios para pruebas rápidas.
 * Configuración: Pentest Silver, 5 Objetivos.
 */
function runDemoSimulation() {
    var id = Math.floor(Math.random() * 9000) + 1000;
    var clientName = "Empresa Demo " + id + " S.A. de C.V.";
    var contactName = "Director de TI " + id;
    
    var clientData = {
        clientName: clientName,
        clientEmail: "demo_user_" + id + "@empresa.com",
        contactName: contactName,
        clientIndustry: "Fintech",
        startDate: new Date()
    };
    
    // Configuración Solicitada: Pentest Silver, 5 Objetivos
    var serviceSelection = [{
        id: "PENETRATION_TEST", // Correct property expected by _processRequest
        serviceName: "Servicio Demo (Pentest)", 
        tier: "Silver",
        parameters: {
            objectives: 5
        },
        quantity: 5,
        unitType: "Objetivos",
        unitPrice: 0,
        subtotal: 0
    }];
    
    console.log("🚀 Iniciando Simulación Demo: " + clientName);
    try {
        var result = _processRequest(clientData, serviceSelection, "admin@kiocyber.com");
        console.log("✅ Simulación Exitosa. URL: " + result.url);
        return result.url;
    } catch (e) {
        console.error("❌ Error en Simulación: " + e.message);
        throw e;
    }
}

/**
 * DIAGNOSTIC FUNCTION
 * Creates a test document with detailed debug output to trace injection issues.
 * Run this to see exactly what's happening.
 */
function runInjectionDiagnostic() {
    var doc = DocumentApp.create("🔬 DIAGNOSTIC: Injection Test " + new Date().toLocaleString());
    var body = doc.getBody();
    
    body.appendParagraph("=== DIAGNOSTIC REPORT ===").setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph("Generated: " + new Date().toLocaleString());
    body.appendParagraph("");
    
    // 1. Check CONFIG
    body.appendParagraph("1. CONFIG CHECK").setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph("SERVICIOS_FOLDER_ID: " + (CONFIG.SERVICIOS_FOLDER_ID || "❌ MISSING"));
    body.appendParagraph("SOW_MASTER_TEMPLATE_ID: " + (CONFIG.SOW_MASTER_TEMPLATE_ID || "❌ MISSING"));
    body.appendParagraph("FONT_FAMILY_HEADING: " + (CONFIG.styles.FONT_FAMILY_HEADING || "❌ MISSING"));
    body.appendParagraph("");
    
    // 2. List Files in Services Folder
    body.appendParagraph("2. FILES IN SERVICES FOLDER").setHeading(DocumentApp.ParagraphHeading.HEADING2);
    try {
        var folder = DriveApp.getFolderById(CONFIG.SERVICIOS_FOLDER_ID);
        body.appendParagraph("Folder Name: " + folder.getName());
        var files = folder.getFiles();
        var fileCount = 0;
        while (files.hasNext()) {
            var file = files.next();
            var rawName = file.getName();
            var normalizedName = rawName.toUpperCase().replace(/[^A-Z0-9]/g, "");
            body.appendParagraph("   • [" + normalizedName + "] ← \"" + rawName + "\" (ID: " + file.getId() + ")");
            fileCount++;
        }
        body.appendParagraph("Total Files Found: " + fileCount);
    } catch (e) {
        body.appendParagraph("❌ ERROR reading folder: " + e.message);
    }
    body.appendParagraph("");
    
    // 3. Test Lookup
    body.appendParagraph("3. LOOKUP TEST").setHeading(DocumentApp.ParagraphHeading.HEADING2);
    var testCases = [
        {id: "PENETRATION_TEST", tier: "Silver"},
        {id: "PenetrationTest", tier: "Silver"},
        {id: "PENTEST", tier: "Silver"}
    ];
    
    testCases.forEach(function(tc) {
        var normalizedKey = (tc.id + tc.tier).toUpperCase().replace(/[^A-Z0-9]/g, "");
        body.appendParagraph("Looking for: " + tc.id + " + " + tc.tier + " → Key: [" + normalizedKey + "]");
        
        var docId = ServiceContentExtractor.findServiceDocId(tc.id, tc.tier, CONFIG.SERVICIOS_FOLDER_ID);
        if (docId) {
            body.appendParagraph("   ✅ FOUND: " + docId);
            // Try to read content
            try {
                var sourceDoc = DocumentApp.openById(docId);
                var sourceBody = sourceDoc.getBody();
                var numChildren = sourceBody.getNumChildren();
                body.appendParagraph("   📄 Document has " + numChildren + " elements");
                body.appendParagraph("   📝 First 200 chars: " + sourceBody.getText().substring(0, 200));
            } catch (e) {
                body.appendParagraph("   ❌ Could not open doc: " + e.message);
            }
        } else {
            body.appendParagraph("   ❌ NOT FOUND");
        }
    });
    body.appendParagraph("");
    
    // 4. Test Injection
    body.appendParagraph("4. INJECTION TEST").setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph("{{DETALLE_SERVICIOS}}");
    
    var testServices = [{
        serviceId: "PENETRATION_TEST",
        serviceName: "Servicio Demo",
        tier: "Silver",
        description: "Fallback description if doc not found"
    }];
    
    try {
        // We need to call the injection function
        // But it's inside DocumentGenerator module, let's inline it here for testing
        body.appendParagraph("Attempting injection with services: " + JSON.stringify(testServices));
        
        var placeholder = "{{DETALLE_SERVICIOS}}";
        var element = body.findText(placeholder);
        
        if (element) {
            body.appendParagraph("   ✅ Placeholder found!");
            var textElement = element.getElement();
            var parentP = textElement.getParent();
            var currentIndex = body.getChildIndex(parentP);
            body.appendParagraph("   📍 At index: " + currentIndex);
            body.removeChild(parentP);
            
            testServices.forEach(function(svc) {
                // Title
                var titleP = body.insertParagraph(currentIndex, svc.serviceName);
                titleP.setHeading(DocumentApp.ParagraphHeading.HEADING2);
                currentIndex++;
                
                // Find source doc
                var sourceId = ServiceContentExtractor.findServiceDocId(svc.serviceId, svc.tier, CONFIG.SERVICIOS_FOLDER_ID);
                
                if (sourceId) {
                    body.insertParagraph(currentIndex, "   ✅ Source found: " + sourceId);
                    currentIndex++;
                    
                    try {
                        var sourceDoc = DocumentApp.openById(sourceId);
                        var sourceBody = sourceDoc.getBody();
                        var numChildren = sourceBody.getNumChildren();
                        
                        body.insertParagraph(currentIndex, "   📄 Injecting " + numChildren + " elements...");
                        currentIndex++;
                        
                        for (var i = 0; i < numChildren; i++) {
                            var child = sourceBody.getChild(i);
                            var type = child.getType();
                            
                            if (type === DocumentApp.ElementType.PARAGRAPH) {
                                var copy = child.copy();
                                body.insertParagraph(currentIndex, copy);
                                currentIndex++;
                            } else if (type === DocumentApp.ElementType.TABLE) {
                                body.insertTable(currentIndex, child.copy());
                                currentIndex++;
                            } else if (type === DocumentApp.ElementType.LIST_ITEM) {
                                body.insertListItem(currentIndex, child.copy());
                                currentIndex++;
                            }
                        }
                        
                        body.insertParagraph(currentIndex, "   ✅ Injection complete!");
                        currentIndex++;
                        
                    } catch (e) {
                        body.insertParagraph(currentIndex, "   ❌ Injection error: " + e.message);
                        currentIndex++;
                    }
                } else {
                    body.insertParagraph(currentIndex, "   ❌ Source NOT found for: " + svc.serviceId);
                    currentIndex++;
                }
            });
        } else {
            body.appendParagraph("   ❌ Placeholder NOT found!");
        }
        
    } catch (e) {
        body.appendParagraph("❌ INJECTION TEST FAILED: " + e.message);
    }
    
    doc.saveAndClose();
    console.log("📋 Diagnostic document created: " + doc.getUrl());
    return doc.getUrl();
}
