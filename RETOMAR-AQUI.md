# Dónde quedamos — 3 de agosto de 2026

Resumen corto para retomar en una conversación nueva sin arrastrar historial.
El detalle técnico completo está en `ESTADO_PROYECTO.md` (34 secciones).

## Estado

La app funciona y está en producción: https://app-incidencias-urbanas.web.app/licanten

Lo último que se hizo (todo desplegado y commiteado):
- Panel de control del Alcalde con indicadores de gestión — §30
- Cuenta Pública imprimible en un clic — §31
- Alerta de emergencias al WhatsApp del Alcalde — §32
- Vista por sectores del municipio — §33
- Comparación mes contra mes — §34

## Te toca a ti (bloqueado sin tu acción)

1. **Cambiar la contraseña del bot** (hoy es `123456`), desde Firebase Console → Authentication, y actualizar `whatsapp-bot/.env`. Esa cuenta escribe en producción.
2. **Pasarme el WhatsApp del alcalde** para activar las alertas de emergencia:
   `node scripts/configurar-whatsapp-alcalde.mjs licanten +569XXXXXXXX`
3. **Pasarme los sectores reales de Licantén** (villas, poblaciones, sectores rurales). Los que hay en `scripts/configurar-sectores.mjs` los inventé yo.
4. **Confirmar visualmente** que el PDF de la Cuenta Pública sale bien paginado — no tengo acceso al panel del Alcalde (requiere login).
5. **Tarea programada del respaldo diario** en Windows: nunca confirmaste si la creaste (§25).

## Pendiente para poder vender (§27 tiene la lista completa)

Por orden de importancia, y ninguno es programar más funciones:

1. **La tarjeta.** Sin ella no hay plan Blaze ni servidor para el bot. Hoy la infraestructura no aguanta clientes que paguen: cuota gratis compartida y el bot corriendo en tu PC.
2. **Política de privacidad y términos de servicio.** Ley 21.719. Ningún asesor jurídico municipal firma sin eso.
3. **Cómo facturas.** Un municipio necesita documento tributario; para cobro recurrente casi seguro necesitas una SpA.
4. **Propuesta comercial escrita** con alcance, precio y soporte.

## Cómo empezar la próxima conversación

Para que salga barata, apunta a secciones en vez de pedir que lea todo:

> "Lee RETOMAR-AQUI.md y la sección §32 de ESTADO_PROYECTO.md. Quiero cambiar X."

Evita "lee ESTADO_PROYECTO.md completo": son ~34 mil tokens, el equivalente a veinte mensajes.

## Entrega ya armada

`Escritorio/TuMuniAqui-Entrega/` tiene las dos carpetas (app general y versión Licantén) con su LEEME y los links. Sin credenciales adentro, a propósito.
