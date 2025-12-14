/**
 * @file Config.gs
 * @description Central configuration for SOW Generator.
 * Accessible globally by all other script files.
 */

var CONFIG = {
  // ID of your Master Google Doc Template
  SOW_MASTER_TEMPLATE_ID: "1Fh-KYb--kGe17S5XKW5jwxxvY35PKeQZ4KVWHCb491I", 

  // Folder where SOWs will be saved (Clientes)
  CLIENTES_FOLDER_ID: "1JYcnLobiJhSjlUvyA-1apHn0Y4i9d8OT",     

  // Folder containing Service Descriptions (Servicios)
  SERVICIOS_FOLDER_ID: "1s5x3QPsTmrG6shoATalhq0IYTxAscA4b",  

  // Spreadsheet with Service Catalog & Pricing (SOW_DB)
  SHEET_SERVICES_ID: "1uGCr1JmmpSQeCQbiU_QYG4uZ5NfG-MLc7exVPDY5k6A",       

  // Set to true if you want PDF export
  GENERATE_PDF: false                       
};
