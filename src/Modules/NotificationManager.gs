/**
 * @file NotificationManager.gs
 * @description Handles email notifications to users.
 */

var NotificationManager = (function() {

  /**
   * Sends a confirmation email to the user with the SOW link.
   * @param {string} userEmail
   * @param {Object} data { clientName, sowUrl, services }
   */
  function sendSOWGenerationConfirmation(userEmail, data) {
    if (!userEmail) return;
    
    var subject = "SOW Listo: " + data.clientName;
    
    // HTML Template Construction
    var primaryColor = "#5B0F8B"; // KIO Purple
    var bgColor = "#F4F4F4";
    var cardColor = "#FFFFFF";
    
    var serviceListItems = data.services.map(function(s) { 
        var quantity = "1"; // Default
        // Try to find quantity for display
        if (s.parameters && Object.keys(s.parameters).length > 0) {
           // Simple heuristic: take first numeric param or just verify params exist
        }
        return '<li style="margin-bottom: 5px;"><strong>' + (s.serviceName || s.serviceId) + '</strong> <span style="color: #666; font-size: 0.9em;">(' + (s.tier || "Standard") + ')</span></li>'; 
    }).join("");
    
    var htmlBody = 
      '<div style="font-family: Helvetica, Arial, sans-serif; background-color: ' + bgColor + '; padding: 40px 20px; margin: 0;">' +
        '<div style="max-width: 600px; margin: 0 auto; background-color: ' + cardColor + '; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">' +
            // Header
            '<div style="background-color: ' + primaryColor + '; padding: 20px; text-align: center;">' +
                '<h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">SOW Generator</h1>' +
            '</div>' +
            // Body
            '<div style="padding: 30px;">' +
                '<h2 style="color: #333333; margin-top: 0;">¡Documento Generado!</h2>' +
                '<p style="color: #555555; line-height: 1.6;">Hola,</p>' +
                '<p style="color: #555555; line-height: 1.6;">El Statement of Work para el cliente <strong>' + data.clientName + '</strong> ha sido creado exitosamente.</p>' +
                
                // Button
                '<div style="text-align: center; margin: 30px 0;">' +
                    '<a href="' + data.sowUrl + '" style="background-color: ' + primaryColor + '; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Abrir Documento</a>' +
                '</div>' +
                
                // Services List
                '<div style="background-color: #f9f9f9; padding: 20px; border-radius: 4px; margin-bottom: 20px;">' +
                    '<h3 style="color: ' + primaryColor + '; margin-top: 0; font-size: 16px;">Servicios Incluidos:</h3>' +
                    '<ul style="color: #555555; padding-left: 20px; margin-bottom: 0;">' +
                        serviceListItems +
                    '</ul>' +
                '</div>' +
                
                '<p style="color: #999999; font-size: 12px; margin-top: 30px; text-align: center;">Generado automáticamente por KIO IT Services SOW System</p>' +
            '</div>' +
        '</div>' +
      '</div>';
               
    try {
        MailApp.sendEmail({
            to: userEmail,
            subject: subject,
            htmlBody: htmlBody // Use htmlBody for HTML content
        });
        console.log("✅ HTML Email sent to: " + userEmail);
    } catch (e) {
        console.error("Failed to send email: " + e.message);
    }
  }

  /**
   * Sends an error alert to admins or the user.
   * @param {string} userEmail
   * @param {string} errorMsg
   */
  function sendErrorNotification(userEmail, errorMsg) {
      if (!userEmail) return;
      try {
          MailApp.sendEmail({
            to: userEmail,
            subject: "Error Generating SOW",
            body: "An error occurred while generating the SOW:\n\n" + errorMsg
          });
      } catch (e) {
          console.error("Failed to send error email");
      }
  }

  return {
    sendSOWGenerationConfirmation: sendSOWGenerationConfirmation,
    sendErrorNotification: sendErrorNotification
  };

})();
