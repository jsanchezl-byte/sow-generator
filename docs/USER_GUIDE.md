# Guía de Usuario - Generador de SOW (MVP 1.0)

Bienvenido al Generador Automático de Statements of Work (SOW). Esta herramienta te permite crear propuestas técnicas estandarizadas en segundos mediante un asistente virtual.

## 🚀 Acceso a la Herramienta
1. Ingresa a la URL proporcionada por el administrador (Web App).
2. Debes iniciar sesión con tu cuenta corporativa de Google (KIO Networks).
3. Verás el **Panel de Control** con las opciones principales.

---

## 🤖 Cómo Generar un SOW
El módulo **Generador** utiliza un chat interactivo para armar tu propuesta.

1. **Inicia el Chat:** Ve a la pestaña "Generador" (icono de robot 🤖).
2. **Identifica al Cliente:**
   - Escribe el nombre del cliente (ej. "Banco Azteca").
   - Ingresa el nombre del contacto y correo electrónico cuando se te pida.
3. **Selecciona Servicios:**
   - El bot te mostrará botones con las categorías disponibles.
   - Selecciona un servicio (ej. "Penetration Test").
   - Elige el nivel o "Tier" (Silver, Gold, Platinum) si aplica.
4. **Configura Parámetros:**
   - Responde a las preguntas específicas (ej. "¿Cuántas IPs?", "¿Cuántos Objetivos?").
   - **Nota:** El sistema valida mínimos. Si intentas ingresar menos del mínimo permitido, te pedirá corregirlo.
5. **Confirma y Genera:**
   - Al finalizar, verás un resumen. Escribe "SI" para confirmar.
   - El sistema generará el documento en Google Docs y te dará un enlace directo.
   - **¡Listo!** Puedes abrir el link para editar o descargar el SOW.

---

## ➕ Cómo Agregar un Nuevo Servicio
Si el servicio que necesitas no está en el catálogo, puedes crearlo tú mismo sin programar.

1. Ve a la pestaña **Nuevo Servicio** (icono `+`).
2. **Información Básica:**
   - **Nombre:** Nombre comercial del servicio.
   - **Categoría:** Selecciona una existente o elige "Agregar nueva..." para crear una.
3. **Niveles (Tiers):**
   - Activa "¿Tiene Tiers?" si el servicio tiene variantes (Basic, Pro, etc.).
   - Agrega los nombres de los tiers uno por uno.
4. **Unidades de Medida:**
   - Define qué se le debe preguntar al usuario (ej. "Servidores", "Horas").
   - **ID:** Identificador interno (ej. `cantidad_servers`).
   - **Label:** La pregunta que hará el bot (ej. "Número de Servidores").
   - **Min:** (Opcional) Valor mínimo aceptado.
5. **Guardar:**
   - Haz clic en "Agregar Servicio".
   - El sistema creará automáticamente una **Plantilla en Blanco** en Google Drive y actualizará el catálogo.
   - Recibirás un correo con el link a la plantilla para que pegues el contenido técnico base.

---

## 📄 Formato del Documento Final
El SOW generado incluirá automáticamente:
- Portada con datos del cliente.
- Tabla de Resumen de Servicios y Configuración.
- Tabla de Precios Estimados (si la lista de precios está configurada).
- Secciones técnicas traídas desde la plantilla maestra.

---
**Soporte:** Contacta al equipo de Automatización si encuentras errores bloqueantes.
