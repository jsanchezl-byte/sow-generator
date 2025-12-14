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
