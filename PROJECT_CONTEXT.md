# SOW Generator - Contexto y Estado del Proyecto
> **Última Actualización:** 13 de Diciembre, 2025 (22:55 HRS)
> **Estado:** PRODUCCIÓN (Listo para despliegue final)

## 1. Resumen Ejecutivo
El **SOW Generator** es una Web App alojada en Google Apps Script que automatiza la creación de documentos "Statement of Work" para servicios de Ciberseguridad. Reemplaza flujos manuales propensos a error por un asistente web robusto.

---

## 2. Arquitectura Final
*   **Frontend (`Index.html`)**: Formulario web reactivo.
    *   **Campos**: Cliente, Email, Fecha, **Vendor** (KIO ITS / Custom), **SoP** (Oportunidad), **Quote** (Opcional).
    *   **Lógica**: Validación dinámica de servicios (ej: PenTest requiere mín 5 objetivos).
*   **Backend (`Main.gs`, `WebApp.gs`)**: Controlador que recibe peticiones `doGet` y `processWebRequest`.
*   **Base de Datos (Google Sheets)**:
    *   `SERVICIOS`: Catálogo activo.
    *   `SERVICIO_PARAMETROS`: Precios unitarios.
    *   `AUDIT_LOG`: Registro histórico con columnas nuevas (Vendor, SoP, Quote).
    *   `INSTRUCCIONES_ADMIN`: Manual generado automáticamente.

---

## 3. Logros e Implementaciones Recientes (Sprint Diciembre 2025)

### A. Core Logic & Naming Convention
Implementamos una regla de nombrado de archivos **estricta y sanitizada**:

`SOW_{SERVICIOS}_{VENDOR}_{CLIENTE}_{YYYYMMDD}_{SoP}_V{N}`

*   **{SERVICIOS}**: Usa IDs técnicos (ej: `SOC-PenTest`) en lugar de nombres largos, unidos por guiones.
*   **{VENDOR}**: Selector inteligente. Si es "Otro", permite input libre. Normalizado a mayúsculas y sin espacios (`KIO-ITS`).
*   **{CLIENTE}**: Sanitizado. Se eliminan acentos (NFD: `ó` -> `o`) y espacios se vuelven guiones (`Acme-Corp`).
*   **{YYYYMMDD}**: Fecha formato año 4 dígitos.
*   **{SoP}**: Prefijo "SoP-" forzado visualmente y en código.
*   **V{N} (Versionado)**: Algoritmo de exploración de carpetas. Busca archivos con el mismo SoP en Drive y calcula la `MaxVersion + 1`.

### B. Placeholders y Plantillas
El sistema inyecta datos en Google Docs usando estas etiquetas:
*   `{{QUOTE}}`: Manejo condicional. Si el usuario no pone Quote, se borra la etiqueta. Si pone, agrega prefijo `Q-`.
*   `{{VENDOR}}`, `{{SoP}}`, `{{NOMBRE_CLIENTE}}`, `{{FECHA...}}`.
*   `{{SERVICIOS_TABLE}}`: Tabla dinámica de alcance.
*   `{{PRECIOS_TABLE}}`: Cotización calculada.
*   `{{DETALLE_SERVICIOS}}`: Inyección de bloques de texto masivos desde archivos externos en Drive.

### C. Sistema de Auto-Documentación
Se creó el módulo `HelpGuideGenerator.gs`.
*   **Función**: `generateAdminGuide`.
*   **Resultado**: Crea una pestaña `INSTRUCCIONES_ADMIN` en el Spreadsheet con diseño premium (colores corporativos, tablas limpias).
*   **Contenido**: Explica nomenclatura, diccionario de datos y troubleshooting. Es la "Fuente de la Verdad" viva.

### D. Base de Datos Autocurativa
*   El módulo `AuditLogger` y `SheetValidator` detectan si faltan columnas críticas (`Vendor`, `Quote`, `SoS Code`) en la hoja de auditoría y las crean automáticamente sin romper la ejecución.

### E. Limpieza Técnica
*   **Eliminación de Chatbot**: Se depuró todo el código legacy de Google Chat que causaba confusión.
*   **Clasp & Git**: Proyecto ordenado localmente y sincronizado con repositorio.

---

## 4. Mapa de Archivos Clave
| Archivo | Responsabilidad | Estado |
| :--- | :--- | :--- |
| `Index.html` | Interfaz de Usuario. Validaciones JS, Selectors y CSS. | **Finalizado** |
| `DocumentGenerator.gs` | Cerebro de la operación. Naming, Cloning, Replace Text, Versioning. | **Finalizado** |
| `HelpGuideGenerator.gs` | Motor de documentación interna (Manual en Excel). | **Finalizado** |
| `AuditLogger.gs` | Escritor de logs. Maneja nuevas columnas SoP/Quote. | **Finalizado** |
| `ServiceCatalogManager.gs` | Lector de precios y servicios desde Spreadsheet. | **Estable** |
| `Main.gs` | Punto de entrada. Menús y enrutador. | **Estable** |

---

# Project: Cybersecurity Architecture Suite (SOW Generator)

## 📌 Project Overview
A specialized internal tool for KIO ITS to automate the generation of "Statement of Work" (SOW) documents for Cybersecurity services (SOC, Pentest, Audits).
It features a **Web-based Conversational Interface** (Chatbot) that interviews the Service Architect, validates business rules, and generates a Google Doc based on a template.

---

## 🚀 Current System Status (As of Dec 2025)

### 1. Architecture
*   **Type:** Google Apps Script Web App (SPA - Single Page Application).
*   **Entry Point:** `WebApp.gs` (serves `Index.html`).
*   **Frontend:** `Index.html` contains the logic, CSS (KIO Purple/White Theme), and Chat Controller.
*   **Backend:** Modularized in `src/Modules/` (ServiceCatalog, DocumentGenerator, etc.).
*   **Config:** Centralized in `src/Config.gs`.

### 2. Frontend & UX (`Index.html`)
*   **Design:** Clean Corporate aesthetic. No Emojis (replaced with **Material Icons Round**).
*   **Flow:**
    1.  **Dashboard:** Welcome screen.
    2.  **Chat Session:**
        *   **Client Data:** Name (Req), Email (Regex), SoP (Numeric), Quote (Optional/Numeric), Contact (Optional).
        *   **Service Selection:** Dynamic list from backend.
        *   **Tier Selection:** If applicable (Standard, Premium, etc.).
        *   **Parameter Config:** Iterative questions (e.g., "How many IPs?").
    3.  **Confirmation:** Visual "Summary Card" (Receipt style) before generation.
    4.  **Generation:** Calls backend -> Returns URL.
    5.  **Loop:** "Create Another SOW" option to restart immediately.

### 3. Business Logic & Validations
*   **Strict Inputs:**
    *   SoP/Quote: Numeric digits only.
    *   Email: Strict Regex format.
*   **Service Rules (Hard-Coded Enforcers):**
    *   **SOC:**
        *   *Check:* Always asks for `tickets`.
        *   *Validation:* Minimum **50 Tickets**.
        *   *Cleanup:* Explicitly removes 'ips' (SOC doesn't need IPs).
    *   **Penetration Test:**
        *   *Check:* Always asks for `objectives`.
        *   *Validation:* Minimum **5 Objectives**.
        *   *Cleanup:* Removes 'ips'/'tickets' to prevent data dirtying.
    *   **Security Audit:**
        *   *Validation:* Minimum **20 Hours**.
    *   **Skip Logic:** Enter key skips optional fields (Quote, Contact).

### 4. Backend Capabilities
*   **Parameter Auto-Discovery:** Scans Pricing Sheet to find params not listed in Services Sheet.
*   **Document Generation (`DocumentGenerator.gs`):**
    *   **Smart Naming:** `SOW - {Client} - {Services} - {Date}`.
    *   **Placeholder Injection:**
        *   `{{CONTACTO_PRINCIPAL}}`: Fills name or clears if empty.
        *   `{{QUOTE}}`: Prefixes "Q-" or clears if empty.
    *   **Dynamic Tables:** Injects "Services Scope" and "Pricing" tables into the Doc.

### 5. Repository & Sync
*   **GitHub:** Synced via CLASP.
*   **Branch:** `main` (Production-ready).

---

## 📋 Recent Changelog
*   **Feature:** Added `ASKING_CONTACT` step (Primary Contact Name).
*   **UX:** Replaced all Emojis with Material Design Icons for professional look.
*   **Fix:** Restored `selectService` functions after accidental deletion.
*   **Fix:** Strict numeric validation for SoP and Quote.
*   **Logic:** Implemented "Hard-Coded Fallback" to guarantee SOC/Pentest parameter questions appear regardless of Excel metadata.

---

## 🔮 Roadmap / Next Steps
*   [ ] **PDF Export:** Option to generate PDF directly.
*   [ ] **Email Delivery:** Automatically email the SOW to the user.
*   [ ] **Advanced Error Handling:** Retry logic for Google API timeouts.

---

## 5. Instrucciones para Retomar el Proyecto
Si regresas a este proyecto en el futuro, sigue estos pasos:

1.  **Estado Local**: Asegúrate de estar en `~/.../sow_generator`. Ejecuta `clasp pull` para bajar cambios si alguien editó en la nube.
2.  **Despliegue**: Recuerda que para ver cambios en la Web App, **SIEMPRE** debes hacer:
    *   `clasp push`
    *   Web Browser: Editor Apps Script -> Deploy -> **New Version**.
3.  **Manual**: Si cambias reglas de negocio, actualiza `HelpGuideGenerator.gs` y ejecuta `generateGuideWrapper` para regenerar la pestaña de ayuda.

---

**Nota Final**: El proyecto es ahora autónomo, resiliente a errores de usuario (validaciones fuertes) y se explica a sí mismo a través del manual integrado.

---

## 6. Control de Versiones (GitHub)
El código fuente está respaldado y versionado en el siguiente repositorio:
*   **URL**: [https://github.com/jsanchezl-byte/sow-generator](https://github.com/jsanchezl-byte/sow-generator)
*   **Rama Principal**: `main`
*   **Credenciales**: Configured locally via PAT (Personal Access Token).

