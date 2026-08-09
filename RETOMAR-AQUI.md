# Dónde quedamos — 4 de agosto de 2026

Resumen corto para retomar en una conversación nueva sin arrastrar historial.
El detalle técnico completo está en `ESTADO_PROYECTO.md` (37 secciones).

## Estado

La app funciona y está en producción: https://app-incidencias-urbanas.web.app/licanten

Lo último que se hizo (**nada de §35 en adelante está desplegado todavía**):
- Panel de control del Alcalde con indicadores de gestión — §30
- Cuenta Pública imprimible en un clic — §31
- Alerta de emergencias al WhatsApp del Alcalde — §32
- Vista por sectores del municipio — §33
- Comparación mes contra mes — §34
- **Propuesta comercial, políticas legales y sectores reales — §35**
- Rediseño del panel del Alcalde y capa visual tipo app nativa — §36
- **Buscador de direcciones escritas en el Paso 1 del vecino — §37** (09-ago-2026)

## Lo último (§35), en tres líneas

1. **Propuesta comercial** lista en `docs/PROPUESTA-COMERCIAL.md`, con precios en UF calibrados para caber bajo las 100 UTM de Compra Ágil (así el municipio contrata sin licitación). **No la envíes todavía**: `docs/PROPUESTA-COMERCIAL-NOTAS.md` lista cinco cosas que promete y que hoy no puedes cumplir.
2. **Política de privacidad y términos** publicados como páginas de la app (`/licanten/privacidad` y `/licanten/terminos`), enlazados justo donde el vecino entrega su nombre y su WhatsApp. Cierra el bloqueante legal de §27.
3. **Sectores de Licantén**: los 5 inventados se reemplazaron por las 19 localidades reales del Plan Regulador. Solo 3 coordenadas pudieron verificarse; las otras 16 quedaron en blanco a propósito y el script se niega a cargarlas hasta que las confirmes.

## Te toca a ti (bloqueado sin tu acción)

1. **Desplegar §35**: `npm run build && npx firebase deploy --only hosting`. Las páginas legales no están en línea todavía.
2. **Confirmar 16 coordenadas** de sectores: `node scripts/configurar-sectores.mjs licanten --revisar` te da un link de Google Maps por sector. Menos de un minuto cada uno. Mientras tanto puedes cargar los 3 verificados con `--solo-confirmados`.
3. **Correo de datos personales del municipio**: `node scripts/configurar-contacto-datos.mjs licanten <correo@municipalidad>`. Sin él, las páginas legales mandan al vecino a la Oficina de Partes.
4. **Cambiar la contraseña del bot** (hoy es `123456`), desde Firebase Console → Authentication, y actualizar `whatsapp-bot/.env`. Esa cuenta escribe en producción.
5. **Pasarme el WhatsApp del alcalde** para activar las alertas de emergencia:
   `node scripts/configurar-whatsapp-alcalde.mjs licanten +569XXXXXXXX`
6. **Confirmar visualmente** que el PDF de la Cuenta Pública sale bien paginado — no tengo acceso al panel del Alcalde (requiere login).
7. **Tarea programada del respaldo diario** en Windows: nunca confirmaste si la creaste (§25).

## Pendiente para poder vender (§27 tiene la lista completa)

Por orden de importancia, y ninguno es programar más funciones:

1. **La tarjeta.** Sin ella no hay plan Blaze, ni dominio propio, ni servidor para el bot. Hoy la infraestructura no aguanta clientes que paguen: cuota gratis compartida y el bot corriendo en tu PC.
2. **Decidir qué hacer con el bot de WhatsApp.** Es lo más grave de la propuesta: compromete una alerta de emergencias que corre sobre automatización **no oficial**, que Meta puede bloquear sin aviso. Las tres salidas están en la sección 3 de las notas de la propuesta.
3. ~~**Política de privacidad y términos de servicio**~~ — ✅ escritas y publicadas en la app (§35.2). Falta que **las revise un abogado** y redactar el acuerdo de tratamiento de datos que la propuesta menciona.
4. **Cómo facturas.** Ya tienes SpA, así que puedes emitir factura. Falta inscribirte como proveedor en Mercado Público (gratis y online) — la propuesta afirma que ya lo estás.
5. ~~**Propuesta comercial escrita**~~ — ✅ hecha (§35.1). Falta poder cumplir las cinco promesas de la tabla de las notas antes de enviarla.

## Cómo empezar la próxima conversación

Para que salga barata, apunta a secciones en vez de pedir que lea todo:

> "Lee RETOMAR-AQUI.md y la sección §32 de ESTADO_PROYECTO.md. Quiero cambiar X."

Evita "lee ESTADO_PROYECTO.md completo": son ~36 mil tokens, el equivalente a veinte mensajes.

## Entrega ya armada

`Escritorio/TuMuniAqui-Entrega/` tiene las dos carpetas (app general y versión Licantén) con su LEEME y los links. Sin credenciales adentro, a propósito.
