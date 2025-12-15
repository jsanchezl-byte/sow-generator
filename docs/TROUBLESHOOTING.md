# Solución de Problemas (Troubleshooting)

Este documento detalla soluciones a problemas comunes encontrados durante el uso u operación del Generador de SOW.

## 🔴 Problemas de Acceso y Permisos

### "No se pudo abrir el archivo en este momento" (Google Drive)
**Causa:** El documento fue creado por la cuenta de servicio/sistema, y tu usuario no tiene permisos explícitos sobre él.
**Solución:**
1. El sistema ha sido actualizado (v1.0+) para otorgar permisos de **Editor** automáticamente a quien ejecuta la app.
2. Si el error persiste, verifica que estés logueado en el navegador con la cuenta corporativa correcta.
3. Busca el archivo manualmente en la carpeta `SOW_GENERATOR / Clientes / [Nombre Cliente]` en Google Drive.

### "No tienes permiso para ejecutar esta aplicación"
**Causa:** La Web App no está compartida con tu usuario.
**Solución:** Solicita al administrador que añada tu email a la lista de usuarios autorizados en la implementación de Apps Script.

---

## 🟠 Problemas de Generación

### El bot me pregunta dos veces lo mismo (ej. "Objetivos")
**Causa:** Un conflicto entre la configuración antigua (legacy) y la configuración dinámica del nuevo servicio.
**Solución:** Este error fue corregido en la versión **MVP 1.0 @186**. Asegúrate de estar usando la última versión de la Web App. Si persiste, recarga la página (Ctrl+R / F5) para limpiar la caché del navegador.

### "Error: undefined" o mensajes en rojo al crear servicio
**Causa:** Fallo en la comunicación con el servidor (backend).
**Solución:**
1. Verifica que no haya campos vacíos en el formulario.
2. Revisa si tu conexión a internet es estable.
3. Si el error dice "Error Interno: ...", toma captura de pantalla y envíala a soporte.

---

## 🟡 Problemas de Formato en el Doc

### Aparecen códigos como `{{NOMBRE_CLIENTE}}` en el documento final
**Causa:** El sistema no encontró el dato correspondiente para reemplazar el marcador.
**Solución:**
1. Asegúrate de haber proporcionado toda la información en el chat.
2. Verifica que la plantilla maestra (`Master Template`) tenga los marcadores escritos correctamente (sin espacios extra, ej. `{{ NOMBRE }}` vs `{{NOMBRE}}`).

### La tabla de precios sale en $0
**Causa:** No hay precios configurados en la hoja `SERVICIOS` para la combinación Servicio/Tier seleccionada.
**Solución:** El administrador debe actualizar la hoja de cálculo `SOW_DB` pestaña `SERVICIOS` con los precios unitarios correctos.

---

## 🛠 Mantenimiento (Para Administradores)

### ¿Cómo actualizar el Catálogo?
No edites la hoja de cálculo manualmente si puedes evitarlo. Usa la opción **"Nuevo Servicio"** de la Web App para asegurar integridad.
Si debes editar precios, hazlo directamente en la hoja `SOW_DB` > `SERVICIOS`, columna `Precio Unitario`.

### Logs de Auditoría
El sistema registra todas las generaciones exitosas en la hoja `AUDIT_LOG`. Revisa esta hoja para métricas de uso.
