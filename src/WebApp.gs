/**
 * Web App Entry Point and Logic
 * Separated to ensure visibility to Apps Script Runtime.
 */

function doGet(e) {
  try {
    // Use 'Index' because we moved the file to src/Index.html
    return HtmlService.createTemplateFromFile('Index')
        .evaluate()
        .setTitle('SOW Generator')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    // Return error details for debugging
    return HtmlService.createHtmlOutput(
      '<h1>Error cargando la aplicación</h1>' +
      '<p><strong>Error:</strong> ' + error.message + '</p>' +
      '<p><strong>Stack:</strong> <pre>' + error.stack + '</pre></p>'
    );
  }
}

function getServiceCatalogForWeb() {
  return ServiceCatalogManager.getAllActiveServices();
}

function processWebRequest(clientData, selectedServices) {
  try {
    // Forward to internal processor in Main.gs
    // Ensure _processRequest is globally available or redefine logic here if needed.
    // Assuming _processRequest is in Main.gs and accessible.
    // Capture User Identity
    var userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) userEmail = "anonymous_web_user"; // Fallback if execution context hides email

    return _processRequest(clientData, selectedServices, userEmail);
  } catch (e) {
    throw new Error("Error generating SOW: " + e.message);
  }
}
