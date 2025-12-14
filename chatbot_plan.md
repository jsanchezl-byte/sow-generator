# Plan de Implementación: SOW Generator Chatbot (Google Chat)

## Objetivo
Transformar la interacción basada en formularios a una interfaz conversacional (Chatbot) dentro de Google Chat. El bot guiará al usuario paso a paso, validará respuestas y generará el SOW final.

## Arquitectura
1.  **Google Cloud Platform (GCP):**
    *   El script debe vincularse a un proyecto Standard de GCP.
    *   Habilitar "Google Chat API".
    *   Configurar el bot (Nombre, Avatar, visibilidad).

2.  **Gestión de Estado (State Machine):**
    *   Usaremos `UserProperties` o `CacheService` para recordar en qué paso está el usuario (ej: "¿Ya me dijo el cliente?").
    *   **Estados:**
        *   `START`: Saludo y pedir nombre del cliente.
        *   `ASK_EMAIL`: Pedir correo.
        *   `ASK_DATE`: Pedir fecha de inicio.
        *   `ASK_SERVICE`: Mostrar menú de servicios (Cards).
        *   `ASK_TIER`: Pedir nivel del servicio seleccionado.
        *   `ASK_MORE`: "¿Algo más?" (Loop para agregar otro servicio).
        *   `CONFIRM`: Mostrar resumen y botón "Generar".

3.  **Interfaz (Cards JSON):**
    *   Usaremos "Interactive Cards" de Google Chat para mostrar botones, listas desplegables y confirmaciones visuales. Mucho más elegante que solo texto.

## Pasos de Implementación

### Fase 1: Configuración (Infraestructura)
- [ ] Vincular Proyecto de Apps Script a GCP.
- [ ] Habilitar Google Chat API en GCP.
- [ ] Configurar manifiesto `appsscript.json` ('chat' add-on).

### Fase 2: Motor de Conversación (Backend)
- [ ] Crear módulo `ChatBotManager.gs`.
- [ ] Implementar `onMessage(event)` (entrada de texto).
- [ ] Implementar `onCardClick(event)` (interacción con botones).
- [ ] Crear sistema de almacenamiento de sesión (`SessionManager`).

### Fase 3: Diseño de Flujos (Lógica)
- [ ] Flujo: Recolección de Datos Cliente.
- [ ] Flujo: Selección Dinámica de Servicios (leyendo del Excel).
- [ ] Flujo: Multi-servicio (Agregar al "carrito").
- [ ] Flujo: Generación (Llamar a `Main.gs`).

### Fase 4: Pruebas
- [ ] Validar flujo completo en Google Chat.
- [ ] Verificar generación de documento final.

---
**Nota:** Este enfoque requiere permisos para crear proyectos en Google Cloud Console.
