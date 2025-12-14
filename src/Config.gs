/**
 * @file Config.gs
 * @description Central configuration for SOW Generator.
 * Accessible globally by all other script files.
 */

var CONFIG = {
  // IDs de la Infraestructura (Production IDs)
  SOW_MASTER_TEMPLATE_ID: "1Fh-KYb--kGe17S5XKW5jwxxvY35PKeQZ4KVWHCb491I",
  SHEET_SERVICES_ID: "1uGCr1JmmpSQeCQbiU_QYG4uZ5NfG-MLc7exVPDY5k6A",
  
  // Estructura de Carpetas directas (Legacy support + New structure)
  CLIENTES_FOLDER_ID: "1JYcnLobiJhSjlUvyA-1apHn0Y4i9d8OT",
  SERVICIOS_FOLDER_ID: "1s5x3QPsTmrG6shoATalhq0IYTxAscA4b",

  // Nombres de Hojas (Fuente de Verdad Única)
  sheets: {
      CATALOG: "SERVICIOS",
      PRICING: "SERVICIO_PARAMETROS",
      AUDIT: "SOW_LOGS",
      ADMIN_GUIDE: "INSTRUCCIONES_ADMIN",
      CONFIG: "CONFIGURACION"
  },

  // Configuración de Negocio
  rules: {
      MIN_OBJECTIVES: 5,
      MIN_TICKETS: 50
  }
};
