/**
 * @file FileManager.gs
 * @description Handles file operations: copy, specific folder management, PDF export.
 */

var FileManager = (function() {

  /**
   * Copies a file to a destination folder.
   * @param {string} fileId Source file ID
   * @param {string} newName Name for the copy
   * @param {string} parentFolderId Destination folder ID
   * @returns {string} New File ID
   */
  function copyDocument(fileId, newName, parentFolderId) {
    if (!fileId || !parentFolderId) throw new Error("Missing fileId or parentFolderId");
    
    var file = DriveApp.getFileById(fileId);
    var folder = DriveApp.getFolderById(parentFolderId);
    
    var copy = file.makeCopy(newName, folder);
    return copy.getId();
  }
  
  /**
   * Gets or creates a folder for a client under the root clients folder.
   * @param {string} clientName
   * @param {string} rootFolderId
   * @returns {string} Folder ID
   */
  function getOrCreateClientFolder(clientName, rootFolderId) {
    if (!rootFolderId) throw new Error("rootFolderId is undefined/null");
    
    // Clean ID just in case
    var cleanId = rootFolderId.trim();
    console.log("FileManager: Accessing Root Folder ID: [" + cleanId + "]");
    
    var root;
    try {
      root = DriveApp.getFolderById(cleanId);
    } catch (e) {
      throw new Error("FileManager: Could not access Root Folder (ID: " + cleanId + "). Error: " + e.message);
    }
    
    console.log("FileManager: Searching for subfolder: " + clientName);
    var folders = root.getFoldersByName(clientName);
    
    if (folders.hasNext()) {
      var existing = folders.next();
      console.log("FileManager: Found existing folder: " + existing.getId());
      return existing.getId();
    } else {
      console.log("FileManager: Creating new folder '" + clientName + "'...");
      var newFolder = root.createFolder(clientName);
      console.log("FileManager: Created folder: " + newFolder.getId());
      return newFolder.getId();
    }
  }

  /**
   * Exports a Google Doc to PDF.
   * @param {string} docId Source Google Doc ID
   * @param {string} pdfName Name of the PDF file
   * @param {string} parentFolderId Targeted folder ID
   * @returns {string|null} PDF File ID or null on failure
   */
  function exportToPDF(docId, pdfName, parentFolderId) {
    try {
      var docFile = DriveApp.getFileById(docId);
      var blob = docFile.getAs('application/pdf');
      blob.setName(pdfName);
      
      var folder = DriveApp.getFolderById(parentFolderId);
      var pdfFile = folder.createFile(blob);
      
      return pdfFile.getId();
    } catch (e) {
      console.error("PDF Export failed: " + e.message);
      return null;
    }
  }

  return {
    copyDocument: copyDocument,
    getOrCreateClientFolder: getOrCreateClientFolder,
    exportToPDF: exportToPDF
  };

})();
