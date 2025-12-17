# Guía de Despliegue de SOW Generator

Esta guía detalla los pasos y recursos necesarios para implementar el **SOW Generator** desde cero en un nuevo entorno de Google Workspace.

## 1. Requisitos Previos
- Una cuenta de Google Workspace o Gmail.
- Acceso a **Google Drive**, **Google Docs** y **Google Sheets**.
- Acceso habilitado a **Google Apps Script**.

## 2. Estructura de Carpetas en Google Drive
Crea la siguiente estructura en tu unidad de Drive. Los nombres son sugeridos, pero los IDs generados serán importantes.

1.  📁 **SOW Generator Root** (Carpeta Raíz del Proyecto)
    *   📁 **Clientes** (Aquí se guardarán los SOWs generados)
    *   📁 **Servicios** (Aquí se guardan las descripciones de los servicios - "Templates hijos")
    *   📁 **Sistema** (Opcional: Para guardar la Plantilla Maestra y la Database)

**⚠️ Nota Importante:** Anota el **ID** de:
*   La carpeta `Clientes` (URL: `.../folders/{ID_CLIENTES}`)
*   La carpeta `Servicios` (URL: `.../folders/{ID_SERVICIOS}`)

## 3. Archivos Base (Plantillas y Database)

### A. Base de Datos (Google Sheets)
Crea una Hoja de Cálculo nueva y nómbrala `SOW_DB_MASTER`.
Anota su **ID** (URL: `.../d/{ID_SPREADSHEET}/edit`).

Crea 4 pestañas exactamente con estos nombres:

#### 1. Pestaña `SERVICIOS` (Catálogo)
Define los servicios que aparecerán en la Web App.

| Col | Encabezado Sugerido | Descripción |
| :-- | :--- | :--- |
| **A** | `ID` | Identificador único sin espacios (ej. `SOC`, `PENTEST`). |
| **B** | `Nombre` | Nombre visible para el usuario (ej. `SOC Monitoring`). |
| **C** | `Categoría` | Agrupador (ej. `Ciberdefensa`). |
| **D** | `Tiene Tiers` | `TRUE` o `FALSE`. |
| **E** | `Tiers` | Lista separada por comas (ej. `Standard,Premium`). |
| **F** | `Config Params` | JSON de inputs extra (ej. `{"ips":"number"}`). Puede dejarse vacío si se usa `SERVICIO_PARAMETROS`. |
| **G** | `Addons` | JSON de opcionales (Opcional). |
| **H** | `Template ID` | **DEPRECATED**. Dejar vacío. |
| **I** | `Duración` | Texto libre (ej. `4 semanas`). |
| **J** | `Descripción` | Texto corto para UI. |
| **K** | `Activo` | `TRUE` para mostrar en la app. |
| **L** | `TEMPLATE_FILENAME` | Nombre del archivo en la carpeta Servicios (ej. `SOC Standard`). |

#### 2. Pestaña `SERVICIO_PARAMETROS` (Precios)
Calculadora de costos.

| Col | Encabezado Sugerido | Descripción |
| :-- | :--- | :--- |
| **A** | `Service ID` | Debe coincidir con Col A de `SERVICIOS`. |
| **B** | `Tier` | Nombre del tier o vacío si es precio base. |
| **C** | `Param Name` | Variable (ej. `tickets`, `ips`, `horas`). |
| **D-F**| *(Opcionales)* | Descripciones o Unidades. No usados por código. |
| **G** | `Precio Unitario` | Número (ej. `150.00`). |
| **H** | `Moneda` | `MXN` o `USD`. |

#### 3. Pestaña `SOW_LOGS` (Auditoría)
Esta hoja se crea automáticamente si no existe, pero puedes crearla vacía con este nombre.

#### 4. Pestaña `INSTRUCCIONES_ADMIN` (Manual)
Esta hoja se genera automáticamente corriendo el script `generateAdminGuide`.

---

### B. Plantilla Maestra (Google Doc)
Crea un Google Doc que servirá como esqueleto del SOW.
Nómbralo: `SOW_MASTER_TEMPLATE`.
Anota su **ID**.

**Contenido Obligatorio:**
Debe contener los siguientes placeholders (texto tal cual) que el sistema reemplazará:
*   `{{NOMBRE_CLIENTE}}`
*   `{{FECHA_INICIO}}` (o fecha actual)
*   `{{QUOTE}}` (Número de cotización)
*   `{{SERVICIOS_TABLE}}` (Donde se insertará la tabla resumen de alcance)
*   `{{DETALLE_SERVICIOS}}` (Donde se inyectará todo el contenido técnico)
*   `{{PRECIOS_TABLE}}` (Donde se insertará la cotización)

---

## 4. Configuración del Script (Config.gs)

Abre el archivo `src/Config.gs` en el Editor de Apps Script y reemplaza los IDs con los de tu nueva infraestructura:

```javascript
var CONFIG = {
  // Pegar aquí el ID de tu Google Doc "SOW_MASTER_TEMPLATE"
  SOW_MASTER_TEMPLATE_ID: "TU_TEMPLATE_ID_AQUI",
  
  // Pegar aquí el ID de tu Google Sheet "SOW_DB_MASTER"
  SHEET_SERVICES_ID: "TU_SPREADSHEET_ID_AQUI",
  
  // Pegar aquí los IDs de las carpetas creadas
  CLIENTES_FOLDER_ID: "ID_CARPETA_CLIENTES",
  SERVICIOS_FOLDER_ID: "ID_CARPETA_SERVICIOS",
  
  // ... resto de la configuración igual
};
```

## 5. Carga de Contenido de Servicios

Para que el sistema funcione, debe encontrar documentos que describan cada servicio en la carpeta **Servicios**.

1.  Ve a tu hoja de cálculo, pestaña `SERVICIOS`.
2.  Crea un servicio (ej. ID: `PENTEST`).
3.  Crea un Google Doc en la carpeta `Servicios` llamado **exactamente** igual al ID (o ID + Tier).
    *   Ejemplo: `PENTEST` (documento de Google).
    *   Si tiene tiers: `PENTEST Standard`, `PENTEST Premium`.
4.  Escribe dentro de ese doc toda la descripción técnica, metodología y entregables de ese servicio.

## 6. Publicación (Deploy)

1.  En Apps Script, haz clic en **Deploy** > **New Deployment**.
2.  Select type: **Web app**.
3.  Execute as: **Me**.
4.  Who has access: **Anyone within [Your Domain]** (o Anyone si es público).
5.  Haz clic en **Deploy**.
6.  ¡Listo! Abrir la URL generada para usar el sistema.
