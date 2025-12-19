/**
 * @file DocumentGenerator.gs
 * @description Core logic for SOW generation, placeholder replacement, and table injection.
 */

var DocumentGenerator = (function() {

  /**
   * Main function to create the SOW.
   * @param {Object} context context object containing all necessary data
   * @returns {Object} result { fileId, url, version, pdfId }
   */
  function createSOW(context) {
    console.log("DocumentGenerator.createSOW: Iniciando...");
    // context: { clientData, services, pricing, config }
    
    var clientData = context.clientData; 
    var config = context.config;         
    var services = context.services;
    var pricing = context.pricing;
    
    // 1. Prepare Workspace
    try {
        var clientFolderId = FileManager.getOrCreateClientFolder(clientData.clientName, config.CLIENTES_FOLDER_ID);
    } catch (e) {
        throw new Error("Fallo al acceder/crear carpeta de Cliente: " + e.message);
    }
    
    // 2. Smart Naming & Versioning
    var newDocName = "";
    var version = 0;
    try {
        var namingResult = _generateSmartFileName(clientData, services, clientFolderId);
        newDocName = namingResult.name;
        version = namingResult.version;
        console.log("Nombre calculado: " + newDocName + " (v" + version + ")");
    } catch (e) {
        throw new Error("Error calculando nombre/versión: " + e.message);
    }

    var newDocId;
    try {
        console.log("Copiando plantilla maestra (ID: " + config.SOW_MASTER_TEMPLATE_ID + ")...");
        newDocId = FileManager.copyDocument(config.SOW_MASTER_TEMPLATE_ID, newDocName, clientFolderId);
    } catch (e) {
        throw new Error("Fallo al copiar la Plantilla Maestra. Verifica ID y permisos. Error: " + e.message);
    }
    
    var doc;
    var body;
    try {
        console.log("Abriendo nuevo documento (ID: " + newDocId + ")...");
        doc = DocumentApp.openById(newDocId);
        body = doc.getBody();
    } catch (e) {
        throw new Error("Fallo al abrir el documento recién creado. Error: " + e.message);
    }
    
    // 3. Replace Basic Placeholders
    try {
        _replacePlaceholders(body, clientData);
         
        // 3.1 Replace Service List Summary {{Servicios}}
        // Restaurado con deduplicación agresiva
        var serviceNames = services.map(function(s) { return s.serviceName || s.serviceId; });
        
        var uniqueNames = [];
        var seen = {};
        serviceNames.forEach(function(name) {
            if (!name) return;
            // Normalize for comparison: lowercase, trim, remove accents
            var key = name.toString().toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            
            if (!seen[key]) {
                uniqueNames.push(name.trim()); // Push original (trimmed)
                seen[key] = true;
            }
        });
        
        var serviceString = "";
        
        if (uniqueNames.length === 1) {
            serviceString = uniqueNames[0];
        } else if (uniqueNames.length > 1) {
            var last = uniqueNames.pop();
            serviceString = uniqueNames.join(", ") + " y " + last;
        }
        
        // 1. Fill the new explicit Summary Placeholder (for the Title)
        body.replaceText("{{RESUMEN_SERVICIOS}}", serviceString);
        
        // 2. NUKE the old placeholder to clean up ghost lists near the table
        body.replaceText("{{Servicios}}", "");
        
    } catch (e) {
        console.warn("Error reemplazando placeholders simples: " + e.message);
        // No crítico
    }
    
    // 4. Inject Dynamic Tables
    try {
        _injectServicesTable(body, services);
    } catch (e) {
        console.warn("Fallo al inyectar Tabla de Servicios: " + e.message);
    }
    
    try {
        _injectServiceDetails(body, services, config.SERVICIOS_FOLDER_ID);
    } catch (e) {
        console.warn("Fallo al inyectar Detalles de Servicios: " + e.message);
    }
    
    try {
        _injectPricingTable(body, pricing);
    } catch (e) {
        console.warn("Fallo al inyectar Tabla de Precios: " + e.message);
    }
    
    // 5. FINAL STANDARDIZATION - Apply consistent fonts to body content
    // Note: Whitespace cleanup is DISABLED inside to prevent removeChild errors
    try {
        _finalizeDocument(body);
    } catch (e) {
        console.warn("Warning: Fallo en la estandarización final: " + e.message);
    }
    
    try {
        doc.saveAndClose();
        console.log("Document saved successfully.");
    } catch (e) {
        console.error("Save failed: " + e.message);
        // Don't throw - document may still be accessible
        console.warn("Document may still be accessible despite save error.");
    }
    
    // 6. PERMISSIONS & SHARING
    try {
      var file = DriveApp.getFileById(newDocId);
      
      // A. Grant access to the user running the app (if valid email)
      if (context.userEmail && context.userEmail.indexOf('@') > 0 && context.userEmail !== 'anonymous') {
         try {
           file.addEditor(context.userEmail);
           console.log("Acceso de Editor otorgado a: " + context.userEmail);
         } catch (e) { console.warn("No se pudo agregar editor: " + e.message); }
      }
      
      // B. Ensure Organization can view (if required)
      // This is a failsafe. "ANYONE_WITH_LINK" is safer for "No se pudo abrir" errors.
      // But we prefer DOMAIN_WITH_LINK for security.
      try {
        file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
        console.log("Sharing set to DOMAIN_WITH_LINK (VIEW).");
      } catch (e) {
        // Fallback or ignore if not in a Workspace domain
        console.warn("Could not set Domain Sharing: " + e.message);
      }
      
    } catch (e) {
      console.warn("Error gestionando permisos finales: " + e.message);
    }

    console.log("Documento finalizado correctamente.");
    
    return {
        fileId: newDocId,
        url: doc.getUrl(),
        version: version,
        pdfId: null // PDF disabled for speed
    };
  }
  
  function _replacePlaceholders(body, data) {
      // data: { clientName: "Acme", ... }
      // placeholders: {{CLIENT_NAME}}, {{START_DATE}}
      
      // Mapping user friendly keys to placeholders
      var map = {
          "clientName": "{{NOMBRE_CLIENTE}}",
          "contactPerson": "{{CONTACTO_PRINCIPAL}}",
          "clientEmail": "{{EMAIL_CONTACTO}}",
          "startDate": "{{FECHA_INICIO}}"
      };
      
      for (var key in data) {
          var placeholder = map[key];
          if (placeholder) {
             body.replaceText(placeholder, data[key]);
          }
      }
      
      // Add 'Today'
      body.replaceText("{{FECHA_HOY}}", new Date().toLocaleDateString());

      // Handle Optional 'CONTACTO_PRINCIPAL'
      if (data.contactName && data.contactName.trim() !== "") {
          body.replaceText("{{CONTACTO_PRINCIPAL}}", data.contactName);
      } else {
         // If empty, we remove the placeholder.
         // Ideally, user template should handle the label, but we just clear the variable here.
         body.replaceText("{{CONTACTO_PRINCIPAL}}", "");
      }

      // Handle Optional 'Quote' {{QUOTE}}
      // If present, prefix with Q-. If empty, clear placeholder.
      if (data.quoteNumber && data.quoteNumber.toString().trim() !== "") {
          body.replaceText("{{QUOTE}}", "Q-" + data.quoteNumber);
      } else {
          // User didn't provide a quote number.
          // We must remove the placeholder so it doesn't look ugly.
          body.replaceText("{{QUOTE}}", "");
      }
  }
  
  function _injectServicesTable(body, services) {
      // Restore original placeholder name now that the ghost text bug is fixed
      var placeholder = "{{SERVICIOS_TABLE}}";
      var element = body.findText(placeholder);
      
      if (!element) {
          // Fallback to the debug tag if user still has it
          element = body.findText("{{TABLA_NUEVA}}");
          if (!element) {
              console.warn("Ni {{SERVICIOS_TABLE}} ni {{TABLA_NUEVA}} encontrados.");
              return;
          }
      }
      
      var textElement = element.getElement();
      var paragraph = textElement.getParent();
      
      // Get index of the PARAGRAPH within the BODY
      var container = paragraph.getParent(); 
      var index = container.getChildIndex(paragraph);
      
      try {
          // Remove the paragraph containing the placeholder
          container.removeChild(paragraph);
          

          
          // Insert Table at index
          // Headers: Servicio, Tier, Configuración, Duración
          var table = body.insertTable(index);
          
          var headerRow = table.appendTableRow();
          headerRow.appendTableCell("Servicio").setBackgroundColor("#D9D2E9").setBold(true).setForegroundColor("#000000");
          headerRow.appendTableCell("Tier").setBackgroundColor("#D9D2E9").setBold(true).setForegroundColor("#000000");
          headerRow.appendTableCell("Configuración").setBackgroundColor("#D9D2E9").setBold(true).setForegroundColor("#000000");

          
          services.forEach(function(svc) {
              var row = table.appendTableRow();
              
              // Use standard appendTableCell(text) but force String type to be safe
              // This prevents potential ghost text issues caused by implicit type coercion failures
              row.appendTableCell(String(svc.serviceName || svc.serviceId || "Unknown")).setBold(false);
              row.appendTableCell(String(svc.tier || "N/A")).setBold(false);
              
              // Config string formatting
              var configStr = "";
              var configStr = "";
              if (svc.parameters) {
                  // Helper function for Title Case (Clean underscores too)
                  var toTitleCase = function(str) {
                      if (!str) return "";
                      var clean = str.replace(/_/g, " "); // Auto-clean IDs like my_id -> my id
                      return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
                  };

                  var parts = [];
                  for (var key in svc.parameters) {
                       var cleanKey = key.toLowerCase().trim();
                       var label = CONFIG.LABELS[cleanKey] || toTitleCase(key);
                       
                       // Special case: if value is also a key-like string (e.g. tier), translate it too
                       var val = svc.parameters[key];
                       if (typeof val === 'string') {
                           val = CONFIG.LABELS[val.toLowerCase().trim()] || val;
                       }
                       
                       parts.push(label + ": " + val);
                  }
                  configStr = parts.join(", ");
              }
              if (configStr === "") configStr = "-";
              
              row.appendTableCell(String(configStr)).setBold(false);
              

          });
      } catch (e) {
          console.error("CRITICAL ERROR IN TABLE GENERATION: " + e.message);
          var errorP = body.insertParagraph(index, "⚠️ ERROR GENERANDO TABLA DE SERVICIOS: " + e.message);
          errorP.setForegroundColor("#FF0000").setBold(true);
      }
  }
  
  /* ====================================================================================================
   *  SEMANTIC INJECTION ENGINE (REWRITTEN - v2.0)
   *  Features: Sequential Cursor Tracking, Robust Element Factory, Polymorphic Dispatcher.
   * ==================================================================================================== */

  /**
   * Orchestrates the injection of service details.
   * Maintains a strict 'currentIndex' cursor to ensure elements are inserted IN ORDER.
   */
  /* ====================================================================================================
  /* ====================================================================================================
  /* ====================================================================================================
   *  SEMANTIC INJECTION ENGINE (V4 - "HYBRID & TRANSPARENT")
   *  
   *  Strategy:
   *  1. "Try High Fidelity": Attempt native element.copy(). Preserves everything.
   *  2. "Bitrot Fallback": If copy() crashes (common in GAS), fall back to Manual Reconstruction.
   *  3. "In-Doc Diagnostics": Write errors/tracing DIRECTLY to the SOW so the user sees them.
   * ==================================================================================================== */

  function _injectServiceDetails(body, services, servicesFolderId) {
      console.log(">>> STARTING INJECTION V4 (HYBRID) <<<");
      console.log("    Services count: " + (services ? services.length : "null"));
      console.log("    Services Folder ID: " + servicesFolderId);
      
      if (!services || services.length === 0) {
          console.warn("⚠️ NO SERVICES TO INJECT");
          body.appendParagraph("⚠️ [Sistema] No hay servicios para inyectar.");
          return;
      }
      
      var placeholder = "{{DETALLE_SERVICIOS}}";
      var element = body.findText(placeholder);
      var currentIndex = 0;

      if (!element) {
          console.warn("⚠️ Placeholder " + placeholder + " NOT FOUND.");
          body.appendParagraph("⚠️ ERROR: Placeholder " + placeholder + " no encontrado en el Template.");
          currentIndex = body.getNumChildren(); 
      } else {
          console.log("✅ Placeholder found!");
          var textElement = element.getElement();
          var parentP = textElement.getParent();
          currentIndex = body.getChildIndex(parentP);
          console.log("📍 Placeholder at index: " + currentIndex);
          
          // FIX: Don't remove the placeholder paragraph - Google Apps Script throws
          // "Can't remove the last paragraph in a document section" if it's the last one.
          // Instead, clear its text and we'll overwrite it with the first service title.
          try {
              // First, try to insert an empty paragraph AFTER the placeholder
              // This ensures the placeholder is no longer the "last" paragraph
              body.insertParagraph(currentIndex + 1, "");
              // Now we can safely remove the placeholder
              body.removeChild(parentP);
              console.log("   Placeholder removed safely (inserted buffer paragraph first)");
          } catch (e) {
              // If removal still fails, just clear the placeholder text and reuse the paragraph
              console.warn("   Could not remove placeholder, clearing text instead: " + e.message);
              parentP.clear();
              currentIndex++; // Move past the cleared paragraph
          }
      }

      services.forEach(function(svc, idx) {
          console.log("--- Processing Service #" + (idx+1) + ": " + JSON.stringify(svc));
          try {
              // 1. Title
              console.log("   Creating title paragraph...");
              var titleP = _safeCreateParagraph(body, currentIndex);
              var titleText = svc.serviceName;
              if (svc.tier) {
                  titleText += " " + svc.tier;
              }
              if (!titleText) {
                  // Fallback only if Name is missing
                  titleText = (svc.serviceId || svc.id || "Servicio Sin Nombre") + (svc.tier ? " " + svc.tier : "");
              }
              console.log("   Title text: " + titleText);
              titleP.setText(titleText);
              titleP.setHeading(DocumentApp.ParagraphHeading.HEADING2);
              titleP.setFontFamily(CONFIG.styles.FONT_FAMILY_HEADING).setFontSize(14).setForegroundColor(CONFIG.styles.COLOR_PRIMARY);
              currentIndex++; 
              console.log("   ✅ Title created at index " + (currentIndex-1));

              var serviceId = svc.serviceId || svc.id;
              console.log("   ServiceId for lookup: " + serviceId + ", Tier: " + svc.tier);
              
              // 2. Locate Doc
              var sourceId = ServiceContentExtractor.findServiceDocId(serviceId, svc.tier, servicesFolderId);
              console.log("   Source Doc ID: " + (sourceId || "NOT FOUND"));
              
              if (!sourceId) {
                  // DIAGNOSTIC IN SOW
                  console.warn("   ⚠️ Source not found, using fallback");
                  var pWarn = _safeCreateParagraph(body, currentIndex);
                  pWarn.setText("⚠️ [Sistema] No se encontró el documento plantilla para: " + serviceId);
                  pWarn.setForegroundColor("#E06666").setItalic(true);
                  currentIndex++;
                  
                  // Description fallback
                  var pDesc = _safeCreateParagraph(body, currentIndex);
                  pDesc.setText(svc.description || "Descripción no disponible.");
                  currentIndex++;
                  return;
              }

              // 3. Open Doc
              console.log("   Opening source document...");
              var sourceDoc = DocumentApp.openById(sourceId);
              var sourceBody = sourceDoc.getBody();
              var numChildren = sourceBody.getNumChildren();
              console.log("   Source doc has " + numChildren + " children");

              if (numChildren === 0) {
                   var pEmpty = _safeCreateParagraph(body, currentIndex);
                   pEmpty.setText("⚠️ [Sistema] El documento plantilla (" + sourceDoc.getName() + ") está vacío.");
                   pEmpty.setForegroundColor("#E06666");
                   currentIndex++;
                   return;
              }

              console.log("   Injecting " + numChildren + " elements from " + sourceDoc.getName());
              
              // 4. Inject Children
              for (var i = 0; i < numChildren; i++) {
                  var sourceChild = sourceBody.getChild(i);
                  var childType = sourceChild.getType().toString();
                  console.log("      Element " + i + ": " + childType);
                  // Dispatcher
                  var elementsAdded = _processSourceElementHybrid(body, currentIndex, sourceChild);
                  currentIndex += elementsAdded;
                  console.log("      -> Added " + elementsAdded + " elements, new index: " + currentIndex);
              }
              
              console.log("   ✅ Service injection complete!");
              
          } catch (e) {
              console.error("   ⛔ ERROR: " + e.message + " | Stack: " + e.stack);
              var pErr = _safeCreateParagraph(body, currentIndex);
              pErr.setText("⛔ [Error Inyección]: " + e.message);
              pErr.setForegroundColor("#FF0000").setBold(true);
              currentIndex++;
          }

          // REMOVED: Spacer paragraph was causing "Cannot insert an empty text element" error
          // The injected content already has proper spacing from the source document
      });
      
      console.log(">>> INJECTION V4 COMPLETE <<<");
  }

  /**
   * Hybrid Dispatcher
   */
  function _processSourceElementHybrid(body, index, sourceElement) {
      var type = sourceElement.getType();
      
      if (type === DocumentApp.ElementType.PARAGRAPH) {
          return _injectHybridParagraph(body, index, sourceElement.asParagraph());
      } else if (type === DocumentApp.ElementType.LIST_ITEM) {
          return _injectHybridListItem(body, index, sourceElement.asListItem());
      } else if (type === DocumentApp.ElementType.TABLE) {
          return _injectTable(body, index, sourceElement.asTable());
      }
      return 0;
  }

  /**
   * ENHANCED PARAGRAPH INJECTOR WITH SAFE IMAGE SUPPORT
   * Extracts text and images separately to avoid copy() corruption.
   * Images are inserted with try/catch to ensure stability.
   */
  function _injectHybridParagraph(body, index, sourceP) {
      try {
          var numChildren = sourceP.getNumChildren();
          var hasInlineImages = false;
          var hasPositionedImages = false;
          
          // Check for positioned (floating) images
          try {
              var posImages = sourceP.getPositionedImages();
              if (posImages && posImages.length > 0) {
                  hasPositionedImages = true;
                  console.log("      📷 Found " + posImages.length + " positioned images");
              }
          } catch (e) {}
          
          // Check if paragraph has inline images
          for (var c = 0; c < numChildren; c++) {
              var childType = sourceP.getChild(c).getType();
              if (childType === DocumentApp.ElementType.INLINE_IMAGE) {
                  hasInlineImages = true;
                  console.log("      📷 Found inline image at child " + c);
              }
          }
          
          // Simple case: text only, no images
          if (!hasInlineImages && !hasPositionedImages) {
              var text = sourceP.getText();
              
              // Skip completely empty paragraphs
              if (!text || text.trim() === '') {
                  body.insertParagraph(index, "");
                  return 1;
              }
              
              var newP = body.insertParagraph(index, text);
              
              // Copy heading style if present
              var heading = sourceP.getHeading();
              if (heading !== DocumentApp.ParagraphHeading.NORMAL) {
                  newP.setHeading(heading);
              }
              
              // Copy alignment
              newP.setAlignment(sourceP.getAlignment());
              
              return 1;
          }
          
          // Complex case: paragraph has images - use child-by-child insertion
          var newP = body.insertParagraph(index, "");
          newP.setHeading(sourceP.getHeading());
          newP.setAlignment(sourceP.getAlignment());
          
          // Clear the default empty text
          newP.clear();
          
          // Process inline content (text + inline images)
          for (var i = 0; i < numChildren; i++) {
              var child = sourceP.getChild(i);
              var type = child.getType();
              
              if (type === DocumentApp.ElementType.TEXT) {
                  var textContent = child.getText();
                  if (textContent && textContent.length > 0) {
                      try {
                          var textEl = newP.appendText(textContent);
                          // Try to copy text attributes (bold, italic, etc.)
                          try {
                              textEl.setAttributes(child.getAttributes());
                          } catch (attrErr) {}
                      } catch (textErr) {
                          console.warn("Text append failed: " + textErr.message);
                      }
                  }
              } else if (type === DocumentApp.ElementType.INLINE_IMAGE) {
                  try {
                      // Safe image extraction and insertion
                      var blob = child.getBlob();
                      if (blob) {
                          var img = newP.appendInlineImage(blob);
                          // Preserve original dimensions
                          var origWidth = child.getWidth();
                          var origHeight = child.getHeight();
                          if (origWidth && origHeight) {
                              img.setWidth(origWidth);
                              img.setHeight(origHeight);
                          }
                          console.log("      ✅ Inserted inline image");
                      }
                  } catch (imgErr) {
                      console.warn("Image insertion skipped: " + imgErr.message);
                      // Insert placeholder text instead of broken image
                      try {
                          newP.appendText(" [Imagen] ");
                      } catch (e) {}
                  }
              }
          }
          
          // Handle positioned (floating) images
          if (hasPositionedImages) {
              try {
                  var posImages = sourceP.getPositionedImages();
                  for (var p = 0; p < posImages.length; p++) {
                      try {
                          var posImg = posImages[p];
                          var blob = posImg.getBlob();
                          if (blob) {
                              // Insert as inline image (positioned images can't be recreated exactly)
                              var img = newP.appendInlineImage(blob);
                              img.setWidth(posImg.getWidth());
                              img.setHeight(posImg.getHeight());
                              console.log("      ✅ Converted positioned image to inline");
                          }
                      } catch (posImgErr) {
                          console.warn("Positioned image skipped: " + posImgErr.message);
                          newP.appendText(" [Imagen flotante] ");
                      }
                  }
              } catch (e) {
                  console.warn("Positioned images error: " + e.message);
              }
          }
          
          return 1;
      } catch (e) {
          console.warn("Paragraph injection failed: " + e.message);
          // Fallback: insert text only
          try {
              var fallbackText = sourceP.getText() || "";
              body.insertParagraph(index, fallbackText || "[Error de párrafo]");
          } catch (e2) {}
          return 1;
      }
  }

  function _injectHybridListItem(body, index, sourceLI) {
      try {
          var text = sourceLI.getText();
          
          // Create list item with text
          var newLI = body.insertListItem(index, text || " ");
          
          // Copy list properties
          try {
              newLI.setNestingLevel(sourceLI.getNestingLevel());
              newLI.setGlyphType(sourceLI.getGlyphType());
          } catch (e) {}
          
          return 1;
      } catch (e) {
          console.warn("List item injection failed: " + e.message);
          return 0;
      }
  }

  /**
   * FALLBACK: Manual Reconstruction (V3.1 Logic)
   * Used when native copy fails.
   */
  function _injectSemanticParagraphRecursive(body, index, sourceP) {
      var targetP = _safeCreateParagraph(body, index);
      targetP.setHeading(sourceP.getHeading());
      targetP.setAlignment(sourceP.getAlignment());
      
      var numChildren = sourceP.getNumChildren();
      for (var i = 0; i < numChildren; i++) {
          var child = sourceP.getChild(i);
          var type = child.getType();
          
          if (type === DocumentApp.ElementType.TEXT) {
              var text = child.getText();
              if (text && text.length > 0) {
                  var t = targetP.appendText(text);
                  t.setAttributes(child.getAttributes()); // Try copying all attributes
              }
          } else if (type === DocumentApp.ElementType.INLINE_IMAGE) {
              try {
                  var blob = child.getBlob();
                  var img = targetP.appendInlineImage(blob);
                  img.setWidth(child.getWidth()).setHeight(child.getHeight());
              } catch(e){}
          }
      }
      
      // Handle Positioned Images (Floating)
      try {
          var posImages = sourceP.getPositionedImages();
          if (posImages) {
              posImages.forEach(function(pi) {
                  try { targetP.appendInlineImage(pi.getBlob()).setWidth(pi.getWidth()).setHeight(pi.getHeight()); } catch(e){}
              });
          }
      } catch(e){}

      return 1;
  }

  function _injectSemanticListItemRecursive(body, index, sourceLI) {
      var targetLI = _safeCreateListItem(body, index);
      targetLI.setNestingLevel(sourceLI.getNestingLevel()).setGlyphType(sourceLI.getGlyphType());
      
      var numChildren = sourceLI.getNumChildren();
      for (var i = 0; i < numChildren; i++) {
          var child = sourceLI.getChild(i);
          if (child.getType() === DocumentApp.ElementType.TEXT) {
               var text = child.getText();
               if (text) {
                   var t = targetLI.appendText(text);
                   t.setAttributes(child.getAttributes());
               }
          }
      }
      return 1;
  }

  function _injectTable(body, index, sourceTable) {
      try {
          var newTable = body.insertTable(index, sourceTable.copy());
          _sanitizeTableStyles(newTable);
          return 1;
      } catch (e) {
          console.warn("Table Copy Error: " + e.message);
          return 0;
      }
  }

  function _safeCreateParagraph(body, index) {
      // FIXED: Don't use append-copy-remove pattern - it causes 
      // "Can't remove the last paragraph in a document section" errors.
      // Simply insert a paragraph directly with empty text.
      try {
          var p = body.insertParagraph(index, "");
          return p;
      } catch (e) {
          // Fallback: if insertParagraph fails, try appendParagraph
          console.warn("insertParagraph failed, using appendParagraph: " + e.message);
          return body.appendParagraph("");
      }
  }

  function _safeCreateListItem(body, index) {
      // FIXED: Same fix as _safeCreateParagraph
      try {
          var li = body.insertListItem(index, "");
          return li;
      } catch (e) {
          console.warn("insertListItem failed, using appendListItem: " + e.message);
          return body.appendListItem("");
      }
  }

  function _sanitizeTableStyles(table) {
      try {
        var rows = table.getNumRows();
        for (var r=0; r<rows; r++) {
            var row = table.getRow(r);
            var cells = row.getNumCells();
            for (var c=0; c<cells; c++) {
                var cell = row.getCell(c);
                var numChildren = cell.getNumChildren();
                for (var k=0; k<numChildren; k++) {
                    var child = cell.getChild(k);
                    if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
                        child.asParagraph().setFontFamily(CONFIG.styles.FONT_FAMILY);
                        child.asParagraph().setFontSize(CONFIG.styles.SIZE_NORMAL);
                    }
                }
            }
        }
      } catch(e) {}
  }
  function _injectPricingTable(body, fullPricingData) {
      var placeholder = "{{PRECIOS_TABLE}}";
      var element = body.findText(placeholder);
      
      if (!element) return;
      
      var textElement = element.getElement();
      var paragraph = textElement.getParent();
      
      var container = paragraph.getParent(); 
      var index = container.getChildIndex(paragraph);
      
      // Remove placeholder paragraph
      container.removeChild(paragraph);
// ... existing pricing table logic ...
      
      var table = body.insertTable(index);
      var headerRow = table.appendTableRow();
      headerRow.appendTableCell("Concepto").setBackgroundColor("#D9D2E9").setBold(true);
      headerRow.appendTableCell("Unidad de Medida").setBackgroundColor("#D9D2E9").setBold(true);
      headerRow.appendTableCell("Cantidad").setBackgroundColor("#D9D2E9").setBold(true);
      headerRow.appendTableCell("Precio Mensual MXN").setBackgroundColor("#D9D2E9").setBold(true);
      headerRow.appendTableCell("Precio Total MXN").setBackgroundColor("#D9D2E9").setBold(true);

      // fullPricingData is array of { serviceId, unitType, quantity... }
      var grandTotal = 0;
      
      fullPricingData.forEach(function(item) {
          var row = table.appendTableRow();
          // Use name if available, fallback to ID
          var displayName = item.serviceName || item.serviceId;
          
          // 1. Concepto
          row.appendTableCell(String(displayName + (item.tier ? " - " + item.tier : "")));
          
          // 2. Unidad
          var unitRaw = String(item.unitType || "Servicio");
          var unitLabel = CONFIG.LABELS[unitRaw.toLowerCase().trim()];
          
          if (!unitLabel) {
               // Fallback: Clean underscores and Title Case
               var clean = unitRaw.replace(/_/g, " ");
               unitLabel = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
          }
          row.appendTableCell(unitLabel);
          
          // 3. Cantidad
          row.appendTableCell(String(item.quantity || 1));
          
          // 4. Precio Mensual (Hardcoded 0.00)
          row.appendTableCell("$ 0.00"); 
          
          // 5. Precio Total (Hardcoded 0.00)
          row.appendTableCell("$ 0.00"); 
          
          // grandTotal += item.subtotal; // Disabled calculation
      });
      
      var totalRow = table.appendTableRow();
      totalRow.appendTableCell("TOTAL").setBold(true);
      totalRow.appendTableCell(""); // Empty Unit
      totalRow.appendTableCell(""); // Empty Qty
      totalRow.appendTableCell(""); // Empty Monthly
      totalRow.appendTableCell("$ 0.00").setBold(true);
  }

  /**
   * Generates the rigorous SOW filename.
   * Format: SOW_{{RESUMEN}}_{{VENDOR}}_{{CLIENT}}_{{YYMMDD}}_{{SoP}}_V{{VER}}
   */
  function _generateSmartFileName(clientData, services, folderId) {
      // 1. SERVICES SUMMARY (Use IDs)
      var unique = [];
      var seen = {};
      services.forEach(function(s) {
          var id = (s.serviceId || "Unknown").trim();
          var k = id.toLowerCase();
          if (!seen[k]) { unique.push(id); seen[k] = true; }
      });
      
      var resumen = unique.join("-");
      if (resumen === "") resumen = "General";
      
      // Sanitizers
      resumen = _sanitizeName(resumen).substring(0, 50);

      // 2. VENDOR
      var vendor = _sanitizeName(clientData.vendor || "KIO ITS").toUpperCase();

      // 3. CLIENT
      var client = _sanitizeName(clientData.clientName || "Unknown");

      // 4. DATE (yyyyMMdd)
      var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");

      // 5. SoP (Enforce SoP- prefix)
      var rawSop = String(clientData.sopNumber || "000000").trim();
      // Logic to ensure SoP- prefix exists
      if (!/^sop-/i.test(rawSop)) {
         // If numeric only, prepend. If mixed, check if it has dash.
         // Simplified: Just ensure it starts with SoP- if user didn't type it
         // But user might type "SOP 123". Let's clean it.
         if (/^\d+$/.test(rawSop)) {
             rawSop = "SoP-" + rawSop;
         } else if (rawSop.toLowerCase().indexOf("sop") === -1) {
             // Does not contain sop at all
             rawSop = "SoP-" + rawSop;
         }
      }
      var sopTag = _sanitizeName(rawSop);

      // 6. VERSIONING
      var folder = DriveApp.getFolderById(folderId);
      var version = _findNextVersion(folder, sopTag);

      // ASSEMBLE
      var fullName = "SOW_" + resumen + "_" + vendor + "_" + client + "_" + dateStr + "_" + sopTag + "_V" + version;
      
      return {
          name: fullName,
          version: version
      };
  }

  /**
   * Final Polish: Homogenize Fonts, Colors, and cleanup Whitespace.
   */
  function _finalizeDocument(body) {
      console.log("Running Final Standardization (Protecting Cover/Index)...");
      
      var children = body.getNumChildren();
      var pageBreaksFound = 0;
      
      // DYNAMIC INDEX PROTECTION:
      // Search for the start of the injected content (Resumen de Servicios or Detalle)
      // and protect everything before it (Cover, Index, TOC).
      var PROTECTED_INDEX = 20; // Fallback default (safe minimum)
      
      
      try {
          // STRATEGY 1: PAGE BREAK DETECTION (The Cover Page Shield)
          // Determine where the FIRST Page Break is. Everything before it is Cover Page -> PROTECTED.
          
          var foundPageBreak = false;
          for (var i = 0; i < Math.min(children, 100); i++) { // Check first 100 elements
             var child = body.getChild(i);
             if (child.getType() === DocumentApp.ElementType.PAGE_BREAK) {
                 // Found end of Page 1!
                 // Adjust protection to be AT LEAST i + 1 (start of Page 2)
                 if ((i + 1) > PROTECTED_INDEX) {
                     PROTECTED_INDEX = i + 1;
                     console.log("🛡️ Page Break Shield active! Protected Index raised to: " + PROTECTED_INDEX);
                 }
                 foundPageBreak = true;
                 break; // Only need the first one
             }
          }
          
          // STRATEGY 2: Content Search (For Index/TOC protection on Page 2)
          // Find the FIRST occurrence of any major section header to establish the safe zone.
          
          var possibleHeaders = [
              "Resumen de Servicios", 
              "Propuesta de servicios", 
              "Solicitud de servicios", 
              "Detalle de los servicios",
              "Propuesta Económica",
              "Pruebas de Penetración" // Often the service name itself is the header
          ];
          
          var foundValidHeader = false;
          
          for (var h = 0; h < possibleHeaders.length; h++) {
              var term = possibleHeaders[h];
              var searchResult = body.findText(term);
              
              while (searchResult) {
                  var element = searchResult.getElement();
                  var parent = element.getParent();
                  if (parent.getType() === DocumentApp.ElementType.PARAGRAPH) {
                      var p = parent.asParagraph();
                      var heading = p.getHeading();
                      
                      // We accept HEADING 1, 2 or 3 as a valid section start marker
                      if (heading === DocumentApp.ParagraphHeading.HEADING1 || 
                          heading === DocumentApp.ParagraphHeading.HEADING2 ||
                          heading === DocumentApp.ParagraphHeading.HEADING3) {
                          
                          var foundIndex = body.getChildIndex(p);
                          
                          // Only update if it makes protection STRONGER (higher index), 
                          // but logically we want the *first* valid content header to be the limit?
                          // Actually, we want to protect EVERYTHING BEFORE the *first* injected section.
                          // So finding the first one is key.
                          
                          if (foundIndex > PROTECTED_INDEX) { 
                              // If we found a valid header later in the doc, that's where content starts.
                              // But wait, if we find "Solicitud" at 50 and "Propuesta" at 60, content acts start at 50.
                              // So we want the MINIMUM index that is still > page break?
                              // Actually, the Page Break Shield gives us the absolute floor.
                              // If we find a header at 50, we protect up to 50.
                              
                              // Optimization: If we haven't found a header yet, or this one is earlier than previous found (but after shield)
                              // Set/Update foundValidHeader
                              if (!foundValidHeader) {
                                  PROTECTED_INDEX = foundIndex;
                                  foundValidHeader = true; 
                                  console.log("✅ Found Primary Content Marker (" + term + ") at index: " + foundIndex);
                              } else {
                                  // Already found a marker. Is this one earlier?
                                  if (foundIndex < PROTECTED_INDEX && foundIndex > 15) { // 15 is hard floor
                                       PROTECTED_INDEX = foundIndex;
                                       console.log("✅ Found Earlier Content Marker (" + term + ") at index: " + foundIndex);
                                  }
                              }
                          }
                      } 
                  }
                  searchResult = body.findText(term, searchResult);
              }
          }
          
          // Check: Is Protected Index dangerously low? (Cover pages are usually 10-15 elements)
          if (PROTECTED_INDEX < 15) {
              console.warn("⚠️ Warning: Protected Index very low (" + PROTECTED_INDEX + "). Adjusting to safe minimum of 15.");
              PROTECTED_INDEX = 15;
          }
          
      } catch (e) {
          console.warn("Dynamic index search failed, using safe fallback (15): " + e.message);
          PROTECTED_INDEX = 15;
      }
      
      console.log("Using DYNAMIC protected zone: first " + PROTECTED_INDEX + " elements protected.");

      // A. WHITESPACE CLEANUP - DISABLED (causes removeChild errors)
      // The whitespace cleanup was removing paragraphs which can fail when
      // trying to remove the last paragraph in a section.
      // Keeping styling logic only.
      /*
      var emptyCount = 0;
      for (var i = children - 1; i >= startIndex; i--) {
          var child = body.getChild(i);
          var type = child.getType();
          
          if (type === DocumentApp.ElementType.PARAGRAPH) {
              var text = child.getText();
              if (text.trim() === "" && child.getNumChildren() === 0) {
                  emptyCount++;
                  if (emptyCount > 1) {
                      body.removeChild(child);
                  }
              } else {
                  emptyCount = 0;
              }
          } else {
              emptyCount = 0;
          }
      }
      */
      // B. VISUAL POLISH (Branding Pass)
      console.log("🎨 Applying Visual Polish (Colors & Fonts)...");
      var kioPurple = "#5B0F8B";
      var lightPurple = "#D9D2E9";
      
      for (var i = PROTECTED_INDEX; i < children; i++) {
          var child = body.getChild(i);
          var type = child.getType();
          
          // 1. HEADERS & TEXT
          if (type === DocumentApp.ElementType.PARAGRAPH) {
              var p = child.asParagraph();
              var heading = p.getHeading();
              var text = p.getText();
              
              // Colorize Heading 1
              if (heading === DocumentApp.ParagraphHeading.HEADING1 && text.trim().length > 0) {
                  p.setForegroundColor(kioPurple);
                  p.setFontSize(14); // Standardize H1 size
              }
              
              // Standardize Font for Normal Text (if not skipping)
              if (heading === DocumentApp.ParagraphHeading.NORMAL && text.trim().length > 0) {
                  // Only touch if it looks like standard body text (black/gray)
                  // Avoid messing with stylized highlighted text unless intended
                  // For now, let's keep it safe and just ensure Helvetica
                  // p.setFontFamily("Helvetica Neue"); // Optional
              }
          }
          
          // 2. TABLES
          if (type === DocumentApp.ElementType.TABLE) {
              var table = child.asTable();
              table.setBorderColor(kioPurple); // Purple Borders
              table.setBorderWidth(1);
              
              // Header Row Background
              if (table.getNumRows() > 0) {
                  var headerRow = table.getRow(0);
                  for (var c = 0; c < headerRow.getNumCells(); c++) {
                      headerRow.getCell(c).setBackgroundColor(lightPurple);
                      // headerRow.getCell(c).getChild(0).asParagraph().setBold(true); // Ensure Bold
                  }
              }
          }
      }
      
      console.log("✅ Visual Polish Completed.");
      
      // B. STYLE HOMOGENIZATION
      // Now using FIXED INDEX protection instead of counting page breaks
      
      var freshChildren = body.getNumChildren();
      var styledParagraphs = 0;
      var styledListItems = 0;
      var styledTables = 0;
      
      console.log("_finalizeDocument: Processing " + freshChildren + " total elements");
      
      // Define Standard Styles (From Config)
      var STD_FONT = CONFIG.styles.FONT_FAMILY; 
      var STD_COLOR_H = CONFIG.styles.COLOR_PRIMARY;
      var STD_COLOR_TEXT = CONFIG.styles.COLOR_TEXT; 
      
      console.log("_finalizeDocument: Using font: " + STD_FONT);
      
      for (var k = 0; k < freshChildren; k++) {
          // FIXED INDEX PROTECTION: Skip first N elements (cover + index)
          if (k < PROTECTED_INDEX) {
              continue;
          }
          
          var el = body.getChild(k);
          var t = el.getType();
          
          // Skip page breaks (nothing to style)
          if (t === DocumentApp.ElementType.PAGE_BREAK) {
              continue;
          }

          // ... Apply Styles ...
          if (t === DocumentApp.ElementType.PARAGRAPH) {
              var h = el.getHeading();
              
              // Use editAsText() to force font on ALL text content (overrides individual runs)
              try {
                  var textEl = el.editAsText();
                  textEl.setFontFamily(STD_FONT);
                  
                  if (h === DocumentApp.ParagraphHeading.HEADING1) {
                       textEl.setForegroundColor(STD_COLOR_H);
                       textEl.setFontSize(CONFIG.styles.SIZE_H1);
                       textEl.setBold(true);
                  } else if (h === DocumentApp.ParagraphHeading.HEADING2) {
                       textEl.setForegroundColor(STD_COLOR_H);
                       textEl.setFontSize(CONFIG.styles.SIZE_H2);
                       textEl.setBold(true);
                   } else if (h === DocumentApp.ParagraphHeading.HEADING3) {
                        textEl.setForegroundColor(CONFIG.styles.COLOR_SECONDARY);
                        textEl.setFontSize(CONFIG.styles.SIZE_H3);
                        textEl.setBold(true);
                        textEl.setBackgroundColor(null);
                        // Convert to Normal so it doesn't appear in TOC (limit TOC to H1/H2)
                        el.setHeading(DocumentApp.ParagraphHeading.NORMAL);
                  } else if (h === DocumentApp.ParagraphHeading.NORMAL) {
                       textEl.setFontSize(CONFIG.styles.SIZE_NORMAL);
                       textEl.setFontSize(CONFIG.styles.SIZE_NORMAL);
                       textEl.setForegroundColor(STD_COLOR_TEXT);
                       textEl.setBold(false); // Explicit Unbold
                       textEl.setBackgroundColor(null);
                  }
                  styledParagraphs++;
              } catch (e) {}
              
              // Apply paragraph-level formatting
              if (h === DocumentApp.ParagraphHeading.HEADING3) {
                   el.setSpacingBefore(12);
                   el.setSpacingAfter(6);
              } else if (h === DocumentApp.ParagraphHeading.NORMAL) {
                   el.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
                   el.setLineSpacing(1.15);
                   el.setSpacingAfter(8);
              }
          }
          // Handle List Items
          else if (t === DocumentApp.ElementType.LIST_ITEM) {
               try {
                   // Force Standard Bullet Glyph
                   el.setGlyphType(DocumentApp.GlyphType.BULLET);
                   
                   var textEl = el.editAsText();
                   textEl.setFontFamily(STD_FONT);
                   textEl.setFontSize(CONFIG.styles.SIZE_NORMAL);
                   textEl.setForegroundColor(STD_COLOR_TEXT);
                   textEl.setBold(false); // Explicit Unbold
                   textEl.setBackgroundColor(null);
                   styledListItems++;
               } catch (e) {}
               el.setLineSpacing(1.15);
               el.setSpacingBefore(0);
               el.setSpacingAfter(4);
               el.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
          }
          else if (t === DocumentApp.ElementType.TABLE) {
              // Tables need special handling - iterate through cells and their paragraphs
              try {
                  var rows = el.getNumRows();
                  for (var r = 0; r < rows; r++) {
                      var row = el.getRow(r);
                      var cells = row.getNumCells();
                      for (var c = 0; c < cells; c++) {
                          var cell = row.getCell(c);
                          // Iterate through paragraphs in the cell
                          var cellChildren = cell.getNumChildren();
                          for (var p = 0; p < cellChildren; p++) {
                              var cellChild = cell.getChild(p);
                              if (cellChild.getType() === DocumentApp.ElementType.PARAGRAPH ||
                                  cellChild.getType() === DocumentApp.ElementType.LIST_ITEM) {
                                  try {
                                      var cellText = cellChild.editAsText();
                                      cellText.setFontFamily(STD_FONT);
                                      cellText.setFontSize(CONFIG.styles.SIZE_TABLE_TEXT);
                                      cellText.setBackgroundColor(null);
                                      cellText.setForegroundColor(STD_COLOR_TEXT); // Force Black
                                      if (r > 0) { // Skip Header Row
                                          cellText.setBold(false);
                                      }
                                  } catch (e) {}
                              }
                          }
                      }
                  }
                  styledTables++;
              } catch (e) {
                  console.warn("Table styling error: " + e.message);
              }
          }
      }
      
      console.log("_finalizeDocument: Styled " + styledParagraphs + " paragraphs, " + 
                  styledListItems + " list items, " + styledTables + " tables");

      // C. REFRESH TABLE OF CONTENTS (Index)
      // Since we modified headers (H3 -> Normal), we must refresh the TOC.
      // Apps Script doesn't have .update(), so we Find -> Remove -> Insert New.
      console.log("🔄 Refreshing Table of Contents...");
      try {
          var tocIndex = -1;
          // Search for existing TOC (usually in first 50 elements)
          for (var i = 0; i < Math.min(body.getNumChildren(), 50); i++) {
              if (body.getChild(i).getType() === DocumentApp.ElementType.TABLE_OF_CONTENTS) {
                  tocIndex = i;
                  body.getChild(i).removeFromParent();
                  console.log("✅ Old TOC removed from index: " + tocIndex);
                  break;
              }
          }
          
          if (tocIndex !== -1) {
              var newToc = body.insertTableOfContents(tocIndex);
              console.log("✅ New TOC inserted at index: " + tocIndex);
          } else {
              console.warn("⚠️ No TOC found to refresh.");
          }
      } catch (e) {
          console.error("Failed to refresh TOC: " + e.message);
      }
  }

  /**
   * Helper to sanitize strings for filenames.
   * Removes accents, spaces to hyphens, keeps alphanumeric.
   */
  function _sanitizeName(str) {
      if (!str) return "";
      return str.normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "") // Remove accents
                .trim()
                .replace(/\s+/g, "-") // Spaces to hyphens
                .replace(/[^a-zA-Z0-9\-_]/g, ""); // Remove invalid chars
  }

  /**
   * Scans a folder for files matching the SoP tag and determines the next version.
   */
  function _findNextVersion(folder, sopTag) {
      if (!folder) return 1;
      
      // We look for files containing the SoP Tag to link versions logic to that Opportunity
      // Pattern expected: ..._SoP-12345_V(\d+)
      // Note: files.next() is slow if folder has thousands of files. Usually Clients folders are small.
      var files = folder.getFiles();
      var maxVer = 0;
      var foundAny = false;
      
      // Escape SoP for RegEx
      var escapedSoP = sopTag.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      // Regex to capture version number at the end of filename (ignoring extension via Google Drive logic usually, but name string might have it?) 
      // DriveApp getName() usually does NOT include extension for Google Docs, but does for PDFs.
      // We look for "_V" followed by digits at end of string or before dot
      var versionRegex = new RegExp(escapedSoP + ".*_V(\\d+)", "i");

      while (files.hasNext()) {
          var file = files.next();
          var name = file.getName();
          
          if (name.indexOf(sopTag) !== -1) {
              foundAny = true;
              var match = name.match(versionRegex);
              if (match && match[1]) {
                  var v = parseInt(match[1], 10);
                  if (v > maxVer) maxVer = v;
              }
          }
      }

      // If it's a new SoP for this folder, start at 1. If exists, increment.
      return maxVer + 1;
  }

  return {
    createSOW: createSOW
  };

})();
