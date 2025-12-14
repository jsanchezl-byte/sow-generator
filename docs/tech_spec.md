# SOW Generator - Technical Specification & Architecture

**Version**: 1.0
**Date**: December 2024

## 1. System Overview
The SOW Generator is a Google Apps Script (GAS) application designed to automate the creation of Statement of Work documents. It bridges Google Forms/Chat inputs, Google Sheets data, and Google Docs templates.

## 2. Architecture

### 2.1 Technology Stack
- **Runtime**: Google Apps Script (V8 Engine)
- **Database**: Google Sheets (Relational data simulation)
- **File Storage**: Google Drive
- **Templating**: Google Docs (Mustache-style placeholders `{{VAL}}`)
- **Frontend**: Google Forms / Google Chat

### 2.2 Data Flow
1. **Input**: User submits Form or Chat request.
2. **Trigger**: `onFormSubmit` or `doPost` fires `Main.gs`.
3. **Data Access**: `ServiceCatalogManager` reads Services & Pricing from Sheets.
4. **Validation**: `DataValidator` ensures data integrity.
5. **Generation**: `DocumentGenerator`:
    - Clones Master Template.
    - Fetches Service Descriptions (Docs).
    - Replaces placeholders.
    - Generates dynamic Tables (Services, Pricing).
6. **Output**: URL sent via Email (`NotificationManager`). Audit log written (`AuditLogger`).

## 3. Module Specifications

### 3.1 DataValidator (`DataValidator.gs`)
- **Responsibility**: Pure functions to validate inputs.
- **Key Methods**:
  - `validateClientData(clientData)`
  - `validateServiceSelection(services)`

### 3.2 ServiceCatalogManager (`ServiceCatalogManager.gs`)
- **Responsibility**: Interface with "SERVICIOS", "SERVICIO_PARAMETROS", "PRECIOS" sheets.
- **Caching**: Implements `CacheService` to minimize Sheet reads (time-to-live: 6h).

### 3.3 DocumentGenerator (`DocumentGenerator.gs`)
- **Responsibility**: Document manipulation.
- **Key Logic**:
  - `body.replaceText("{{KEY}}", value)`
  - Table generation: Uses `body.insertTable(index)` for dynamic content.

### 3.4 AuditLogger (`AuditLogger.gs`)
- **Responsibility**: Appends rows to "AUDIT_LOG" and "ERROR_LOG".
- **Format**: JSON-stringified details in columns for complex objects.

## 4. Security & Quotas
- **Scopes Required**:
  - `https://www.googleapis.com/auth/forms`
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/documents`
  - `https://www.googleapis.com/auth/drive`
  - `https://www.googleapis.com/auth/script.send_mail`
- **Quotas**: Watch out for 6 min execution limit. Logic must be efficient.

## 5. Deployment
- Code is pushed via `clasp`.
- Properties `SCRIPT_PROPERTIES` store configuration IDs (Folder IDs, Sheet IDs).
