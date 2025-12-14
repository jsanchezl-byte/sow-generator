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
   * Helper to normalize filenames for fuzzy matching.
   * "SOC_Gold" -> "SOCGOLD"
   * "PenetrationTest Silver" -> "PENETRATIONTESTSILVER"
   */
  function _normalizeKey(str) {
      if (!str) return "";
      return str.toString()
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, ""); // Remove ALL non-alphanumeric (spaces, _, -)
  }

  /**
   * Indexes the Servicios Folder ONCE per execution.
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
              // Store by Ultra-Normalized Name
              var rawName = file.getName();
              var cleanName = _normalizeKey(rawName);
              
              // Only index Google Docs to avoid junk
              if (file.getMimeType() === MimeType.GOOGLE_DOCS) {
                   index[cleanName] = file.getId();
              }
          }
      } catch (e) {
          console.warn("Drive Indexing Failed: " + e.message);
      }
      
      _fileIndex = index;
      console.timeEnd("BuildDriveIndex");
      console.log("Drive Index Built. Files indexed: " + Object.keys(index).length);
  }

  /**
   * Retrieves specific service description.
   * Uses Fuzzy O(1) Lookup.
   */
  function getServiceDescription(serviceId, tier, servicesFolderId) {
     if (!servicesFolderId) return "";
     
     // 1. Ensure Index exists
     _buildFileIndex(servicesFolderId);
     
     // 2. Compute Target Keys (Try precise tier first, then generic)
     var targetKeyWithTier = _normalizeKey(serviceId + tier);
     var targetKeyGeneric = _normalizeKey(serviceId);
     
     // 3. Look up
     var docId = _fileIndex[targetKeyWithTier];
     
     if (!docId && tier) {
         // Fallback to generic if tier-specific file doesn't exist
         docId = _fileIndex[targetKeyGeneric];
     }
     
     if (docId) {
         return extractTextFromGoogleDoc(docId);
     }
     
     return "Descripción no encontrada (Check filename matches ID '" + serviceId + "')";
  }

  return {
    getServiceDescription: getServiceDescription,
    extractTextFromGoogleDoc: extractTextFromGoogleDoc
  };

})();
