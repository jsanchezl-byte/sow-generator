/**
 * DIAGNOSTIC TOOL: TEMPLATE INSPECTOR
 * Run 'diagnoseTemplate' to see what is really inside the doc.
 */
function diagnoseTemplate() {
  var templateId = "1Fh-KYb--kGe17S5XKW5jwxxvY35PKeQZ4KVWHCb491I"; // ID de tu plantilla
  console.log("🔍 Analizando Plantilla: " + templateId);
  
  try {
    var doc = DocumentApp.openById(templateId);
    var body = doc.getBody();
    var text = body.getText();
    
    console.log("--- BÚSQUEDA GENERAL ---");
    if (text.includes("{{Servicios}}")) console.log("⚠️ ALERTA: Se encontró '{{Servicios}}' en el texto del documento.");
    else console.log("✅ '{{Servicios}}' NO encontrado en texto plano.");
    
    if (text.includes("{{RESUMEN_SERVICIOS}}")) console.log("ℹ️ '{{RESUMEN_SERVICIOS}}' encontrado (Correcto para título).");

    console.log("--- ANÁLISIS DE VECINOS DE LA TABLA ---");
    // Buscar el placeholder de la tabla
    var element = body.findText("{{SERVICIOS_TABLE}}");
    
    if (!element) {
      console.error("❌ ERROR CRÍTICO: No se encontró '{{SERVICIOS_TABLE}}' en el documento.");
      return;
    }
    
    var textElement = element.getElement();
    var paragraph = textElement.getParent();
    var index = body.getChildIndex(paragraph);
    
    console.log("📍 Placeholder encontrado en índice: " + index);
    
    // Mirar los 5 elementos ANTERIORES
    for (var i = 1; i <= 5; i++) {
       if (index - i >= 0) {
         var prev = body.getChild(index - i);
         var type = prev.getType();
         var content = "";
         if (type === DocumentApp.ElementType.PARAGRAPH) content = prev.asParagraph().getText();
         else if (type === DocumentApp.ElementType.TABLE) content = "[TABLA]";
         else if (type === DocumentApp.ElementType.LIST_ITEM) content = "[LISTA]: " + prev.asListItem().getText();
         
         console.log("   ⬆️ Elemento -" + i + " (" + type + "): '" + content + "'");
       }
    }
    
  } catch (e) {
    console.error("❌ ERROR LECTURA: " + e.message);
  }
}

/**
 * PERFORMANCE TEST RUNNER
 * Executes a heavy SOW generation to measure the speed of the new O(1) engine.
 */
function testPerformance() {
  console.log("🚀 INICIANDO TEST DE RENDIMIENTO (Prodigy Engine)...");
  var start = new Date().getTime();
  
  // 1. Mock Request Data (simulando un cliente real)
  var mockClient = {
      clientName: "PerfTest Corp",
      clientEmail: "admin@perftest.com",
      startDate: "2025-01-01",
      vendor: "KIO ITS", // Testing Index normalization
      sopNumber: "999999",
      quoteNumber: "5000"
  };
  
  // 2. Mock Selection (Heavy Load: 3 Services to force multiple lookups)
  // These IDs must exist in your Sheet
  var mockServices = [
      { id: "SOC", tier: "Gold", parameters: { tickets: 50, ips: 10 } },
      { id: "PENETRATION_TEST", tier: "Platinum", parameters: { objectives: 20 } },
      { id: "SECURITY_AUDIT", tier: "", parameters: { hours: 100 } }
  ];
  
  // 3. Execute
  try {
      // Force cache clear if needed (optional)
      // CacheService.getScriptCache().remove("SOW_GEN_SERVICES_V3");
      
      var result = _processRequest(mockClient, mockServices, "tester@localhost");
      
      var end = new Date().getTime();
      var duration = (end - start) / 1000;
      
      console.log("✅ TEST COMPLETADO");
      console.log("⏱️ Tiempo Total: " + duration + " segundos");
      console.log("📄 Documento: " + result.url);
      console.log("📊 Versión: " + result.version);
      
      if (duration < 5) {
          console.log("🏆 RENDIMIENTO EXCELENTE (< 5s)");
      } else {
          console.log("⚠️ RENDIMIENTO NORMAL (Revisar caché)");
      }
      
  } catch (e) {
      console.error("❌ FALLO EL TEST: " + e.message);
      console.error(e.stack);
  }
}
