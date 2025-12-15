# Changelog - SOW Generator

## [v1.0.0] - MVP Release - 2025-12-14
**Status:** ✅ Production Ready (MVP)

This release marks the first fully functional version of the Automated SOW Generator.

### 🚀 Core Features
- **Conversational UI (Chatbot):** Interactive web interface for gathering client and service details.
- **Dynamic Service Catalog:** Services are loaded from Google Sheets with support for:
    - **Categories:** Dropdown selection with "Add New" capability.
    - **Tiers:** Dynamic tiers (e.g., Silver, Gold) configurable per service.
    - **Units of Measure:** Customizable units (e.g., "Objectives", "Servers") with optional **Minimum Value** validation.
- **Automated SOW Generation:**
    - Generates Google Docs based on a Master Template.
    - Replaces placeholders (`{{NOMBRE_CLIENTE}}`, `{{FECHA}}`, etc.) automatically.
    - **Dynamic Tables:** Injects a "Services Summary" table and a "Pricing" table.
    - **Service Content Injection:** Pulls detailed descriptions from separate Service Template documents stored in Drive.
- **Smart Template Management:**
    - Auto-creates blank service templates if they don't exist.
    - Naming convention enforcement: `SERVICE_ID TIER_NAME`.
    - Duplicate detection and management.
- **User Experience:**
    - Real-time validation for inputs (email, numbers).
    - "New Service" form built into the app for easy catalog expansion.
    - Confetti animation on success! 🎉
- **Security & Permissions:**
    - Auto-shares generated SOWs with the creator and the organization domain to prevent access errors.

### 🛠 Technical Details
- **Backend:** Google Apps Script (`.gs`).
- **Frontend:** HTML5/CSS3/Vanilla JS (Single Page Application).
- **Architecture:** Module-based (`ServiceCatalogManager`, `DocumentGenerator`, `FileManager`).
- **Deployment:** Web App (`clasp` managed).

### 🐛 Fixed in this version
- Resolved duplicate parameter prompting (legacy vs. dynamic config conflict).
- Fixed "Undefined" error messages during service creation.
- Fixed file permission errors preventing users from opening generated SOWs.
- Improved form layout responsiveness and scrolling.

---
*Developed by Google Deepmind & Antonio (User)*
