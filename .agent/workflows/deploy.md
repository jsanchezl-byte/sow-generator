---
description: How to deploy and update the SOW Generator
---

# SOW Generator Deployment Workflow

## Prerequisites
- clasp installed and logged in
- Access to the Google Apps Script project

## Development Flow

### 1. Make changes locally
Edit files in `/Users/antonio/.gemini/antigravity/scratch/sow_generator/src/`

### 2. Test changes
```bash
# Push to Apps Script
clasp push -f
```
Then run `runDemoSimulation()` from the Apps Script editor.

### 3. Deploy to Production

**Option A: Update existing deployment (keeps same URL)**
```bash
// turbo
clasp push -f
clasp deploy -i AKfycbzki7GFKlWFCRytVWL3pNLU-Y5jBjWAdYranFuBLfMGwGiYxjdNeiwXqD62CxuZoiwE --description "Brief description"
```

**Option B: From Apps Script UI (more reliable for Web App)**
1. Open script.google.com
2. Find project "SOW Generator"
3. Implementar → Gestionar implementaciones
4. Edit the active deployment or create new
5. Set access to "Cualquier persona"
6. Deploy

## Adding New Services

1. Create Google Doc in Services folder
2. Name format: `{ServiceId} {Tier}` (e.g., "SOC Gold")
3. Add to Service Catalog sheet
4. Test with `runDemoSimulation()`

## Troubleshooting

- **Error 500**: Check Apps Script logs
- **"No se puede abrir"**: Redeploy from Apps Script UI
- **Images not appearing**: Check blob extraction in logs
