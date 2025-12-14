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
    
    var subject = "SOW Generated: " + data.clientName;
    
    var serviceListInfo = data.services.map(function(s) { 
        return "- " + s.serviceId + " (" + (s.tier || "Standard") + ")"; 
    }).join("\n");
    
    var body = "Hello,\n\n" +
               "The Statement of Work for **" + data.clientName + "** has been successfully generated.\n\n" +
               "Link: " + data.sowUrl + "\n\n" +
               "Services Included:\n" + serviceListInfo + "\n\n" +
               "Regards,\nAutomated SOW System";
               
    try {
        MailApp.sendEmail({
            to: userEmail,
            subject: subject,
            body: body
        });
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
