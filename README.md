# SOW Generator - Deployment Guide

This guide explains how to deploy the Statement of Work (SOW) Generator to your Google Workspace environment.

## 1. Prerequisites
- A Google Enterprise or Business account.
- Permissions to create Scripts, Sheets, Forms, and Docs.

## 2. Setup Google Drive
1. Create a root folder named `SOW_GENERATOR`.
2. Inside it, create the following subfolders:
   - `Templates`
   - `Servicios`
   - `Clientes`

## 3. Setup Google Sheets (Database)
1. Create a new Google Sheet inside `SOW_GENERATOR` named `SOW_DB`.
2. Create the following tabs (sheets) with the exact names:
   - `SERVICIOS`
   - `SERVICIO_PARAMETROS`
   - `CLIENTES` (Optional)
   - `AUDIT_LOG`
   - `ERROR_LOG`
   - `CONFIGURACION`
3. Copy the column headers from the Technical Specification or the JSON files in `mock_data/` of this project.

## 4. Setup Google Apps Script
1. Create a new Google App Script project (script.google.com) or bind it to the `SOW_DB` sheet.
2. Copy the contents of the `.gs` files from the `src/` folder into the script editor:
   - Create a file `Main.gs` and paste the content.
   - Create a folder provided by GAS or just files named `DataValidator.gs`, `ServiceCatalogManager.gs`, etc.
   - **Note on Namespaces**: In GAS, all files share the global scope. You don't strictly need folders, just ensure the files are present.

## 5. Configuration
1. Open the `Main.gs` file in the script editor.
2. Update the `CONFIG` object or Script Properties with your actual IDs:
   - `SOW_MASTER_TEMPLATE_ID`: ID of your Master Doc in `Templates`.
   - `CLIENTES_FOLDER_ID`: ID of the `Clientes` folder.
   - `SERVICIOS_FOLDER_ID`: ID of the `Servicios` folder.
   - `SHEET_SERVICES_ID`: ID of your `SOW_DB` spreadsheet.

## 6. Triggers
1. **Forms**: If using Google Forms, link the Form to a Sheet, then add an "On Form Submit" installable trigger in the Apps Script project pointing to `onFormSubmit`.

## 7. Testing
1. Fill out your form or send a test payload.
2. Check `AUDIT_LOG` in the Sheet.
3. Check the `Clientes` folder for the generated Doc.

## Troubleshooting
- **Permission Denied**: Ensure you have authorized the script scopes.
- **File Not Found**: Double check Folder IDs in `CONFIG`.
