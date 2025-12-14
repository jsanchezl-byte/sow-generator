# SOW Generator - Project Context

## Overview
This project is a **Google Apps Script Web App** designed to automate the creation of Statement of Work (SOW) documents for security services (Pentesting, SOC, etc.).

## Critical Context for AI Agents
**Last Updated:** 2025-12-13
**Status:** Live / Active Development

### Architecture
- **Type:** Google Apps Script (Standalone/Bound).
- **Frontend:** `src/Index.html` (HTML5 + Vanilla JS). Served via `doGet` in `src/WebApp.gs`.
- **Backend:** `src/Main.gs` acts as the orchestrator.
- **Modules:** located in `src/Modules/`. Include `ServiceCatalogManager`, `DocumentGenerator`, `DataValidator`.
- **Database:** Google Spreadsheet (`SOW_DB`) stores Services, Logs, and Config.
- **Output:** Generates Google Docs based on a Master Template.

### Recent Major Changes
- **Chatbot Removal:** The project previously included a Google Chat implementation. **This has been completely removed** (Dec 2025) to focus solely on the Web App. Do not re-implement chatbot logic unless explicitly requested.

### Deployment Workflow
- **Tooling:** Uses `clasp` for local development.
- **Script ID:** `1WNon9YRBuSBDniAibueizU-fAYeJTbdpYnhpWaA2-aL-KNe0oGqqdlHI`
- **Commands:**
    - `clasp push`: Uploads local changes (auto-converts `.gs` to remote).
    - **Note:** Always ensure local `.js` files in `src/` are cleaned up before pushing if they conflict with `.gs` files.

### Key Files
- `src/Main.gs`: Central logic for processing requests (`_processRequest`).
- `src/WebApp.gs`: Web App entry point (`doGet`).
- `src/Index.html`: User Interface.
- `src/appsscript.json`: Manifest (Cleaned of Chat API dependencies).

### User Preferences
- **Focus:** Stability and functionality of the Web App.
- **Aesthetics:** Clean, professional UI (already implemented in `Index.html`).
