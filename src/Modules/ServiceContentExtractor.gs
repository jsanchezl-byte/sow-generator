/**
 * @file ServiceContentExtractor.gs
 * @description Extracts content from Service Template Docs to inject into SOW.
 */

var ServiceContentExtractor = (function() {

  /**
   * Reads a service template document and returns its text content (body).
   * @param {string} docId 
   * @returns {string} Text content
   */
  function extractTextFromGoogleDoc(docId) {
    if (!docId) return "";
    
    try {
      var doc = DocumentApp.openById(docId);
      var body = doc.getBody();
      return body.getText(); 
      // Note: getText() returns raw text. maintainFormatting would require 
      // complex element copying (Element.copy()). 
      // For MVP, text extraction or simple paragraph copying is standard.
      // If rich formatting is needed, we would iterate body.getNumChildren().
    } catch (e) {
      console.warn("Failed to extract text from doc " + docId + ": " + e.message);
      return "[Content Lookup Failed]";
    }
  }

  /**
   * Retrieves specific service description document based on ID/Tier convention.
   * Path convention: /Servicios/{SERVICE_ID}_{TIER}.docx (simulated look up)
   * Real implementation: Look up ID from Catalog or search Drive.
   * @param {string} serviceId
   * @param {string} tier
   * @param {string} servicesFolderId
   * @returns {string} Text content
   */
  function getServiceDescription(serviceId, tier, servicesFolderId) {
     if (!servicesFolderId) {
         // Fallback or error
         return "";
     }
     
     // Name pattern: "PENETRATION_TEST_Gold"
     var searchName = serviceId + (tier ? "_" + tier : "");
     
     // Search in folder
     // Robust Search: Title contains ServiceID and (if applicable) Tier
     var query = "title contains '" + serviceId + "'";
     if (tier && tier !== "Standard" && tier !== "") {
        query += " and title contains '" + tier + "'";
     }
     
     var folder = DriveApp.getFolderById(servicesFolderId);
     
     // Note: "trashed = false" is implied but good practice
     var files = folder.searchFiles(query);
     
     if (files.hasNext()) {
         var file = files.next();
         // Ensure we grabbed a Google Doc
         if (file.getMimeType() === MimeType.GOOGLE_DOCS) {
            return extractTextFromGoogleDoc(file.getId());
         }
     }
     
     // If not found, return generic message or empty
     return "Descripción no encontrada para " + serviceId;
  }

  return {
    getServiceDescription: getServiceDescription,
    extractTextFromGoogleDoc: extractTextFromGoogleDoc
  };

})();
