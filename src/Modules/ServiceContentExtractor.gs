/**
 * @file ServiceContentExtractor.gs
 * @description Extracts content from Service Template Docs to inject into SOW.
 */

var ServiceContentExtractor = (function() {
  
  // Runtime Index for O(1) File Lookup
  // Key: "SERVICE_ID" or "SERVICE_ID_TIER" -> Value: FileID
  var _fileIndex = null;

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
   * Indexes the Servicios Folder ONCE per execution.
   * Maps "Filename" -> "FileID".
   */
  function _buildFileIndex(folderId) {
      if (_fileIndex) return; // Already indexed
      
      console.time("BuildDriveIndex");
      var index = {};
      
      try {
          var folder = DriveApp.getFolderById(folderId);
          var files = folder.getFiles();
          
          while (files.hasNext()) {
              var file = files.next();
              // Store by Name (Normalized Upper) -> ID
              // Example: "PENETRATION_TEST_GOLD" -> "12345..."
              // We strip extension for easier matching
              var name = file.getName().toUpperCase().replace(/\.[^/.]+$/, "");
              index[name] = file.getId();
          }
      } catch (e) {
          console.warn("Drive Indexing Failed: " + e.message);
      }
      
      _fileIndex = index;
      console.timeEnd("BuildDriveIndex");
      console.log("Drive Index Built. Files indexed: " + Object.keys(index).length);
  }

  /**
   * Retrieves specific service description document based on ID/Tier convention.
   * Uses O(1) Index Lookup instead of iterative search.
   */
  function getServiceDescription(serviceId, tier, servicesFolderId) {
     if (!servicesFolderId) return "";
     
     // 1. Ensure Index exists
     _buildFileIndex(servicesFolderId);
     
     // 2. Compute Target Name
     // Convention: "SERVICEID_TIER" or just "SERVICEID"
     var targetName = serviceId.toUpperCase();
     if (tier && tier !== "" && tier !== "Standard") {
         targetName += "_" + tier.toUpperCase();
     }
     
     // 3. Look up
     var docId = _fileIndex[targetName];
     
     // Fallback: If Tier specific not found, try generic ServiceID
     if (!docId && tier) {
         docId = _fileIndex[serviceId.toUpperCase()];
     }
     
     if (docId) {
         return extractTextFromGoogleDoc(docId);
     }
     
     return "Descripción no encontrada para " + serviceId;
  }

  return {
    getServiceDescription: getServiceDescription,
    extractTextFromGoogleDoc: extractTextFromGoogleDoc
  };

})();
