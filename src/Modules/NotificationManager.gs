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

    var subject = "SOW Generado: " + data.clientName + " | SoP-" + (data.sopNumber || "N/A") + " | Q-" + (data.quoteNumber || "N/A");

    // Generate Services HTML
    var servicesHtml = data.services.map(function(s) {
        // Build Parameters List (e.g., "objetivos: 10, ips: 5")
        var paramsList = "";
        if (s.parameters && typeof s.parameters === 'object') {
            paramsList = Object.keys(s.parameters).map(function(key) {
               return key + ": <strong>" + s.parameters[key] + "</strong>";
            }).join(', ');
        }
        
        return  '<div style="background:#f9f9f9; padding:12px; border-radius:8px; margin-bottom:8px; border:1px solid #eee;">' +
                  '<div style="font-weight:600; font-size:15px; color:#333;">' + s.serviceId + ' <span style="font-weight:400; font-size:13px; color:#5B0F8B;">(' + (s.tier || "Standard") + ')</span></div>' +
                  '<div style="font-size:13px; color:#666; margin-top:4px;">' + (paramsList || "Configuración estándar") + '</div>' +
                '</div>';
    }).join("");

    var htmlBody = 
      '<html><body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">' +
        '<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">' +
          
          // HEADER
          '<div style="background: linear-gradient(135deg, #5B0F8B, #8E24AA); padding: 30px; text-align: center; color: white;">' +
             '<h1 style="margin: 0; font-size: 24px;">SOW Generado</h1>' +
             '<p style="margin: 10px 0 0; opacity: 0.9;">Statement of Work listo para revisión</p>' +
          '</div>' +

          // CARD CONTENT
          '<div style="padding: 30px;">' +
             
             // RESUMEN ICON HEADER
             '<div style="display:flex; align-items:center; margin-bottom:15px;">' +
                 '<h2 style="color:#5B0F8B; margin:0; font-size:18px;">📄 Resumen de Configuración</h2>' +
             '</div>' +

             // CLIENT DETAILS
             '<div style="font-size:14px; color:#555; margin-bottom:20px; padding-bottom:15px; border-bottom:1px solid #eee; line-height:1.6;">' +
                 '<strong>Cliente:</strong> ' + data.clientName + '<br>' +
                 '<strong>Correo:</strong> ' + (data.clientEmail || "N/A") + '<br>' +
                 '<strong>SoP:</strong> ' + (data.sopNumber || "N/A") + ' | <strong>Cotización:</strong> ' + (data.quoteNumber || "N/A") +
             '</div>' +

             // SERVICES LIST
             '<div style="margin-bottom: 25px;">' +
                 servicesHtml +
             '</div>' +

             // ACTION BUTTON
             '<div style="text-align: center;">' +
                '<a href="' + data.sowUrl + '" style="display: inline-block; padding: 14px 28px; background-color: #5B0F8B; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Abrir Documento</a>' +
             '</div>' +

          '</div>' +

          // FOOTER
          '<div style="background-color: #f8f8f8; padding: 15px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee;">' +
             'Generado por KIO SOW Generator v1.3.3' +
          '</div>' +

        '</div>' +
      '</body></html>';

      try {
          MailApp.sendEmail({
              to: userEmail,
              subject: subject,
              htmlBody: htmlBody
          });
          console.log("Email enviado a: " + userEmail);
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
