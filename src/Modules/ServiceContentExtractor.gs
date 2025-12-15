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
      console.log("📂 Indexing Services Folder: " + folderId);
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
                   console.log("   found: [" + cleanName + "] -> " + rawName);
                   index[cleanName] = file.getId();
              } else {
                   console.log("   ignored (wrong type): " + rawName);
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
   * Locates the File ID for a given service/tier.
   */
  function findServiceDocId(serviceId, tier, folderId) {
     if (!folderId) return null;
     
     // 1. Ensure Index exists
     _buildFileIndex(folderId);
     
     // 2. Compute Target Keys
     var targetKeyWithTier = _normalizeKey(serviceId + (tier || ""));
     var targetKeyGeneric = _normalizeKey(serviceId);
     
     console.log("🔎 Looking up: " + serviceId + " (" + tier + ")");
     console.log("   Keys: [Tier=" + targetKeyWithTier + "] or [Generic=" + targetKeyGeneric + "]");
     
     // 3. Look up
     var docId = _fileIndex[targetKeyWithTier];
     
     if (docId) {
         console.log("   ✅ MATCH FOUND (Tier): " + docId);
     } else {
         docId = _fileIndex[targetKeyGeneric];
         if (docId) {
             console.log("   ✅ MATCH FOUND (Generic): " + docId);
         } else {
             console.warn("   ❌ NO MATCH FOUND in " + Object.keys(_fileIndex).length + " files.");
         }
     }
     
     return docId || null;
  }

  /**
   * Retrieves specific service description as Text (Legacy).
   */
  function getServiceDescription(serviceId, tier, servicesFolderId) {
     var docId = findServiceDocId(serviceId, tier, servicesFolderId);
     if (docId) {
         return extractTextFromGoogleDoc(docId);
     }
     return "Descripción no encontrada (Check filename matches ID '" + serviceId + "')";
  }

  return {
    getServiceDescription: getServiceDescription,
    extractTextFromGoogleDoc: extractTextFromGoogleDoc,
    findServiceDocId: findServiceDocId
  };

})();
