/**
 * @file Main.gs
 * @description Entry point for SOW Generator. Handles Form triggers and webhooks.
 */

/* 
 * GLOBAL// CONFIGURATION
// ==========================================
// Replace these with your actual IDs
// CONFIG MOVED TO Config.gs


// ==========================================
// WEB APP LOGIC MOVED TO WebApp.gs


// ==========================================
// GOOGLE CHAT ENTRY POINTS REMOVED
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
        
        // Determine Unit and Quantity for Pricing Table
        var unitType = "Servicio";
        var quantity = 1;
        
        if (reqSvc.parameters) {
            if (reqSvc.parameters.tickets) {
                unitType = "Ticket";
                quantity = reqSvc.parameters.tickets;
            } else if (reqSvc.parameters.objectives) {
                unitType = "Objetivo";
                quantity = reqSvc.parameters.objectives;
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
    });
    
    // 3. Document Generation
    var context = {
        clientData: clientData,
        services: enrichedServices,
        pricing: fullPricing,
        config: CONFIG
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

