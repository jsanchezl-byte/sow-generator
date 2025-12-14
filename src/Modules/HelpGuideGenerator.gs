/**
 * @file HelpGuideGenerator.gs
 * @description Generates a Premium Documentation Dashboard within Google Sheets.
 * Serves as the single source of truth for Project Administration.
 */

function generateAdminGuide() {
    var ss = SpreadsheetApp.openById(CONFIG.SHEET_SERVICES_ID);
    var sheetName = "INSTRUCCIONES_ADMIN";

    // 1. Setup Sheet
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
        sheet = ss.insertSheet(sheetName, 0);
    } else {
        sheet.clear();
    }
    
    // Remove gridlines for a cleaner "Doc" look
    sheet.setHiddenGridlines(true);

    // ==========================================
    // ESTILOS Y COLORES (PALETA PREMIUM)
    // ==========================================
    var COLOR_PRIMARY = "#0c343d"; // Deep Teal/Blue
    var COLOR_ACCENT = "#134f5c";  // Lighter Teal
    var COLOR_HEADER_BG = "#f3f3f3";
    var COLOR_TEXT_MAIN = "#212121";
    var COLOR_BORDER = "#d9d9d9";
    var COLOR_INFO_BOX = "#e8f0fe"; // Light Blue format
    var COLOR_CODE_BOX = "#fce8b2"; // Yellow for code/tags

    var row = 2; // Start with some margin

    // ==========================================
    // 1. HEADER PRINCIPAL
    // ==========================================
    var titleRange = sheet.getRange(row, 2, 2, 8); // B2:I3
    titleRange.merge()
        .setValue("🚀 SOW GENERATOR: PANEL DE ADMINISTRACIÓN")
        .setBackground(COLOR_PRIMARY)
        .setFontColor("white")
        .setFontSize(24)
        .setFontWeight("bold")
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle");
    
    row += 3;

    sheet.getRange(row, 2, 1, 8).merge()
        .setValue("Esta hoja es la FUENTE DE VERDAD para la operación del sistema. Sigue estas reglas para garantizar la estabilidad.")
        .setFontStyle("italic")
        .setHorizontalAlignment("center")
        .setFontColor("#666666");
    
    row += 2;

    // ==========================================
    // 2. NOMENCLATURA & WORKFLOW (NÚCLEO)
    // ==========================================
    _writeSectionTitle(sheet, row, "1. NOMENCLATURA DE ARCHIVOS DE SALIDA", COLOR_ACCENT);
    row += 2;

    var namingBox = sheet.getRange(row, 2, 1, 8);
    namingBox.merge()
        .setValue("SOW_{RESUMEN}_{VENDOR}_{CLIENTE}_{YYYYMMDD}_{SoP}_V{N}")
        .setBackground(COLOR_CODE_BOX)
        .setFontFamily("Consolas")
        .setFontSize(14)
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle")
        .setBorder(true, true, true, true, true, true, "black", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    
    row += 2;

    var namingRules = [
        ["Elemento", "Origen del Dato", "Ejemplo Real", "Reglas de Limpieza"],
        ["{RESUMEN}", "IDs de los servicios seleccionados", "SOC-PenTest", "Espacios reemplazados por guiones. Se unen con '-'."],
        ["{VENDOR}", "Selector 'Vendor' en Web (KIO ITS / Otro)", "KIO-ITS", "Mayúsculas obligatorias. Caracteres especiales eliminados."],
        ["{CLIENTE}", "Campo 'Nombre Cliente'", "Acme-Corp", "Acentos normalizados (ó->o). Espacios -> guiones."],
        ["{YYYYMMDD}", "Fecha de generación (Automática)", "20251231", "Formato Año(4)-Mes(2)-Día(2)."],
        ["{SoP}", "Campo 'SoP' (Obligatorio)", "SoP-12345", "Siempre lleva prefijo 'SoP-'. Solo permite letras y números."],
        ["V{N}", "Cálculo automático de versión", "V3", "El sistema escanea la carpeta buscando el SoP y suma +1."]
    ];
    _writePrettyTable(sheet, row, namingRules);
    row += namingRules.length + 2;


    // ==========================================
    // 3. ETIQUETAS Y PLANTILLAS (DOCS)
    // ==========================================
    _writeSectionTitle(sheet, row, "2. DICCIONARIO DE ETIQUETAS (PLACEHOLDERS)", COLOR_ACCENT);
    row += 2;

    sheet.getRange(row, 2, 1, 8).merge().setValue("Usa estas etiquetas exactas dentro de tu documento maestro en Google Docs (Templates).")
         .setBackground(COLOR_INFO_BOX).setFontColor("#444");
    row += 1;

    var tagsData = [
        ["Etiqueta (Copiar y Pegar)", "Descripción Funcional", "Dónde usarla normalmente"],
        ["{{NOMBRE_CLIENTE}}", "Nombre legal del cliente", "Portada, Encabezados"],
        ["{{FECHA_INICIO}}", "Fecha arranque proy.", "Sección 'Tiempos'"],
        ["{{FECHA_HOY}}", "Fecha de creación del doc", "Pie de página"],
        ["{{VENDOR}}", "Nombre del Vendor (ej: KIO ITS)", "Portada, Introducción"],
        ["{{SoP}}", "Número de oportunidad completo", "Encabezados (Referencia interna)"],
        ["{{QUOTE}}", "Número de cotización (Q-xxx)", "Sección financiera (Si no hay quote, se borra)"],
        ["{{SERVICIOS_TABLE}}", "TABLA DINÁMICA: Genera filas por cada servicio elegido", "Sección 'Alcance General'"],
        ["{{DETALLE_SERVICIOS}}", "LIBRO DE TEXTO: Inserta descripciones largas desde Drive", "Sección 'Especificaciones Técnicas'"],
        ["{{PRECIOS_TABLE}}", "TABLA DE PRECIOS: Calcula totales según parámetros", "Sección 'Propuesta Económica'"]
    ];
    _writePrettyTable(sheet, row, tagsData);
    row += tagsData.length + 3;

    // ==========================================
    // 4. GUÍA DE MANTENIMIENTO BD
    // ==========================================
    _writeSectionTitle(sheet, row, "3. CÓMO AGREGAR SERVICIOS (BD)", COLOR_ACCENT);
    row += 2;

    var steps = [
        ["Paso", "Acción Crítica", "Detalle Técnico"],
        ["1", "Definir ID", "Inventa un ID corto y sin espacios (ej: 'Cloud-Sec'). Este ID será parte del nombre de archivo."],
        ["2", "Hoja SERVICIOS", "Llena la fila. 'Active' debe ser TRUE. 'Name' es lo que ve el cliente."],
        ["3", "Hoja PRECIOS", "En 'SERVICIO_PARAMETROS', define cuánto cuesta. Puedes cobrar por 'tickets', 'ips', etc."],
        ["4", "Contenido (Drive)", "En la carpeta 'Servicios', crea un Doc con el nombre del ID. Escribe ahí el alcance técnico."]
    ];
    _writePrettyTable(sheet, row, steps);
    row += steps.length + 2;

    // ==========================================
    // FAQ & TROUBLESHOOTING
    // ==========================================
    _writeSectionTitle(sheet, row, "4. RESOLUCIÓN DE PROBLEMAS FRECUENTES", "#cc0000"); // Red for Alert
    row += 2;

    var faq = [
        ["Problema", "Solución"],
        ["Error: 'Version is not defined'", "El código fue actualizado. Haz Reload de la página."],
        ["No aparece un servicio en la Web", "Revisa la columna 'Active' en la hoja SERVICIOS. Debe ser TRUE."],
        ["El precio sale en $0", "Revisa que el ID en SERVICIOS coincida EXACTAMENTE con el ID en SERVICIO_PARAMETROS."],
        ["El documento sale incompleto", "Falta el archivo de descripción en Drive o la etiqueta {{DETALLE_SERVICIOS}} fue borrada del template."]
    ];
    _writePrettyTable(sheet, row, faq);

    // ==========================================
    // FINAL FORMATTING
    // ==========================================
    sheet.setColumnWidth(1, 20); // Margin Left
    sheet.setColumnWidth(2, 200); // Col A width
    sheet.setColumnWidth(3, 300); // Col B width
    sheet.setColumnWidth(4, 300); // Col C width
    
    // Auto resize rest
    
    console.log("Guía Premium Generada.");
}

function _writeSectionTitle(sheet, row, text, color) {
    var range = sheet.getRange(row, 2, 1, 8);
    range.merge()
         .setValue(text)
         .setBackground(color)
         .setFontColor("white")
         .setFontWeight("bold")
         .setFontSize(14)
         .setVerticalAlignment("middle")
         .setHorizontalAlignment("left");
}

function _writePrettyTable(sheet, startRow, data) {
    if (data.length === 0) return;
    
    var numRows = data.length;
    var numCols = data[0].length;
    
    var range = sheet.getRange(startRow, 2, numRows, numCols);
    range.setValues(data);
    
    // Header Style
    var headerRange = sheet.getRange(startRow, 2, 1, numCols);
    headerRange.setBackground("#e0e0e0")
               .setFontWeight("bold")
               .setBorder(false, false, true, false, false, false); // Bottom border only
               
    // Body Style
    range.setVerticalAlignment("top")
         .setWrap(true)
         .setBorder(true, true, true, true, true, true, "#d9d9d9", SpreadsheetApp.BorderStyle.SOLID);
         
    // Alternating Colors (Simulated)
    for (var i = 1; i < numRows; i+=2) {
       // sheet.getRange(startRow + i, 2, 1, numCols).setBackground("#f9f9f9");
    }
}
