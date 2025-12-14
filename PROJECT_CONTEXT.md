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

