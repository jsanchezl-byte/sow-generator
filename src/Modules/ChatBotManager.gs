/**
 * @file ChatBotManager.gs
 * @description Maneja la interacción con Google Chat (Cards y Mensajes)
 */

var ChatBotManager = (function() {

  /**
   * Responde cuando el usuario envía un mensaje de texto.
   */
  function processMessage(event) {
    var message = "";
    if (event.message && event.message.text) {
      message = event.message.text;
    }
    
    var sender = "Usuario";
    if (event.user && event.user.displayName) {
      sender = event.user.displayName;
    }
    
    // BACK TO BASICS: Standard Synchronous Response
    return {
      "text": "Hola " + sender + ", conexión exitosa. Mensaje recibido: " + message
    };
  }

  /**
   * Responde cuando el bot es añadido a un espacio o chat directo.
   */
  function processAddToSpace(event) {
    return {
      "text": "¡Gracias por agregarme! Soy el Generador de SOWs. Escribe 'Hola' para empezar."
    };
  }

  return {
    processMessage: processMessage,
    processAddToSpace: processAddToSpace
  };

})();

/**
 * ENTRY POINTS REQUERIDOS POR GOOGLE CHAT API
 * Estas funciones deben estar en el ámbito global.
 */

function onMessage(event) {
  console.log("Chat Message Received", JSON.stringify(event));
  return ChatBotManager.processMessage(event);
}

function onAddToSpace(event) {
  console.log("Added to Space", JSON.stringify(event));
  return ChatBotManager.processAddToSpace(event);
}

function onRemoveFromSpace(event) {
  console.info("Bot removed from space: " + (event.space ? event.space.name : "unknown"));
}
