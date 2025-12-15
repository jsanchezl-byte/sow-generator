/**
 * @file TemplateAdmin.gs
 * @description Admin tools to analyze, clean, and standardize the Master Template.
 * Run these functions manually to maintain the "Health" of the Master Template.
 */

var TemplateAdmin = (function() {

  /**
   * Applies the Architectural Style Standard to the Master Template.
   * This modifies the NamedStyles of the document, ensuring that 
   * "Normal", "Heading 1", etc. are consistent by definition.
   */
  function standardizeMasterTemplate() {
      var templateId = CONFIG.SOW_MASTER_TEMPLATE_ID;
      console.log("Opening Master Template: " + templateId);
      var doc = DocumentApp.openById(templateId);
      var body = doc.getBody();
      var styles = CONFIG.styles;

      console.log("Standardizing Content (Direct Attribute Application)...");
      console.log("Protected Zones: Skipping Cover & Index (First 2 Page Breaks).");
      
      var numChildren = body.getNumChildren();
      var breakCount = 0;
      var PROTECTED_COUNT = 2; 
      
      for (var i = 0; i < numChildren; i++) {
          var child = body.getChild(i);
          var type = child.getType();
          
          // 1. Check for Page Breaks (siblings or inside paragraphs)
          if (type === DocumentApp.ElementType.PAGE_BREAK) {
              breakCount++;
              continue; // Don't style the break
          } 
          else if (type === DocumentApp.ElementType.PARAGRAPH) {
              // Word sometimes puts breaks inside paragraphs
              if (child.getNumChildren() > 0 && child.getChild(0).getType() === DocumentApp.ElementType.PAGE_BREAK) {
                  breakCount++;
                  continue;
              }
          }
          
          // 2. Skip Protected Pages
          if (breakCount < PROTECTED_COUNT) {
              continue;
          }
          
          // 3. Apply Styles to Paragraphs in Body
          if (type === DocumentApp.ElementType.PARAGRAPH) {
              var p = child.asParagraph();
              var h = p.getHeading();
              
              // Apply Base Font
              p.setFontFamily(styles.FONT_FAMILY);
              
              if (h === DocumentApp.ParagraphHeading.HEADING1) {
                  p.setForegroundColor(styles.COLOR_PRIMARY);
                  p.setFontSize(styles.SIZE_H1);
                  p.setBold(true);
              } else if (h === DocumentApp.ParagraphHeading.HEADING2) {
                  p.setForegroundColor(styles.COLOR_PRIMARY);
                  p.setFontSize(styles.SIZE_H2);
                  p.setBold(true);
              } else if (h === DocumentApp.ParagraphHeading.HEADING3) {
                  p.setForegroundColor(styles.COLOR_SECONDARY);
                  p.setFontSize(styles.SIZE_H3);
                  p.setBold(true);
                  // Headings usually have more space before
                  p.setSpacingBefore(12);
                  p.setSpacingAfter(6);
              } else if (h === DocumentApp.ParagraphHeading.NORMAL) {
                  p.setFontSize(styles.SIZE_NORMAL);
                  p.setForegroundColor(styles.COLOR_TEXT);
                  p.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
                  
                  // Standardize Body Spacing
                  p.setLineSpacing(1.15);
                  p.setSpacingBefore(0);
                  p.setSpacingAfter(8); // Breathable spacing
              }
          }
      }

      doc.saveAndClose();
      console.log("Master Template Content Standardized.");
  }

  return {
      standardizeMasterTemplate: standardizeMasterTemplate
  };

})();

/**
 * Global function/Entry point for Manual Run from IDE
 */
function RUN_TEMPLATE_STANDARDIZATION() {
    TemplateAdmin.standardizeMasterTemplate();
}
