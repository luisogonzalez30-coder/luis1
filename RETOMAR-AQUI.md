# Dónde quedamos — 9 de agosto de 2026

Resumen corto para retomar en una conversación nueva sin arrastrar historial.
El detalle técnico completo está en `ESTADO_PROYECTO.md` (41 secciones).

La app funciona y está en producción: https://app-incidencias-urbanas.web.app/licanten

---

## Lo primero: tres cosas están rotas en producción ahora mismo

**0. Producción crea "reportes fantasma".** Cuando el envío es rechazado (típicamente el enfriamiento anti-spam de 60 s), quedaba escrito el ticket público **sin** la incidencia: el vecino ve el reporte en el mapa y en "Últimos reportes", se suma con "+1", y el municipio no lo recibió nunca. **5 de los 9 tickets de Licantén son fantasmas.** Ya está arreglado en el repo (§40) pero **el arreglo es código de `src/`, así que hace falta desplegar el frontend**:

```bash
npm.cmd run build
npx.cmd firebase deploy --only hosting
```

Ese despliegue publica también §36 y §37. Después hay que limpiar los 23 huérfanos que ya están: `node scripts/limpiar-tickets-huerfanos.mjs` (solo informa; borra con `--borrar`).


**1. Ningún reporte guarda la foto del vecino.** Está arreglado en el repo pero **sin desplegar**. Un comando:

```bash
npx firebase deploy --only firestore:rules
```

Es un despliegue solo de reglas: no arrastra el frontend, así que no publica nada más de lo que quieras. Detalle completo en **§38**. Después, la prueba real es mandar un reporte con foto desde el celular y abrirlo en el panel. Los reportes viejos **no** recuperan su foto (§38.5).

**2.** ~~Un vecino que pierde su número de ticket no puede recuperarlo~~ — ✅ **resuelto el 10-ago-2026 (§41)**: el bot ya responde. Y como escribir la frase exacta falla en la vida real (el corrector del teléfono la cambió en la primera prueba), **cualquier mensaje que no entienda muestra un menú de 3 botones tocables**: Mis reportes / Buscar ticket / Nuevo reporte. El vecino no tiene que adivinar ni escribir nada. Probado con el flujo completo simulado contra datos reales; falta probarlo con un mensaje de verdad desde un celular.

---

## Si vas a hablar de WhatsApp, lee §39 antes que §23 o §32

> ⏳ **Al 10-ago-2026 los avisos por WhatsApp NO están saliendo.** Las dos plantillas quedaron **"En revisión"** en Meta tras editarles el texto el 09-ago, y mientras están así Meta rechaza todos los envíos (con un error engañoso, `132001`, que habla de nombre e idioma cuando esos estaban bien — ver §39.5). **No hay nada que arreglar en el código.** Cuando Meta las apruebe (estado "Activa"), hay que **reiniciar el servicio en Render** para que los reportes pendientes reciban su aviso: al reconectarse el bot los vuelve a ver y reintenta solo.


El bot **ya no es** el no oficial (Baileys) que describen esas dos secciones: está migrado a la **Cloud API oficial de Meta** y corre en Render, no en tu PC. El riesgo de que Meta bloqueara el número **está cerrado**. Eso nunca se había documentado, y §21/§23/§27 más la propuesta comercial seguían describiendo el bot viejo — por eso se escribió §39, que es lo único verificado contra el código y contra producción.

**Funciona y está verificado**: aviso al vecino cuando entra su reporte (`alerta_nuevo_ticket`) y cuando se resuelve (`ticket_resuelto`). Todos los reportes desde el 1 de agosto tienen su aviso enviado.

**Se perdió en la migración y hay que decirlo**: la alerta de emergencia al Alcalde (§32), el aviso de "cuadrilla asignada", y "mis reportes". Los tres campos se siguen escribiendo en cada reporte, pero **ningún código los consume** — configurar `whatsapp_alcalde` no enciende nada.

Los textos aprobados de las dos plantillas quedaron guardados en §39.2 (el texto real vive en Meta, así que si lo editas allá, actualiza esa sección).

---

## Te toca a ti (bloqueado sin tu acción)

1. **Desplegar las reglas** — arriba. Es lo más urgente de la lista.
2. **Desplegar el frontend**, si quieres publicar §35 a §37 (páginas legales, panel nuevo, buscador de direcciones): `npm run build && npx firebase deploy --only hosting`. Nada de §35 en adelante está en línea.
3. **Confirmar las 16 coordenadas de sectores**: `node scripts/configurar-sectores.mjs licanten --revisar` da un link de Google Maps por sector, menos de un minuto cada uno. Hoy el documento de Licantén tiene **0 sectores cargados** — ni los 3 confirmados. Eso apaga la vista por sectores del panel del Alcalde (§33) y le quita al buscador de direcciones su fuente local, la que funciona sin internet (§37.3). Puedes cargar los 3 ya verificados con `--solo-confirmados`.
4. **Correo de datos personales del municipio**: `node scripts/configurar-contacto-datos.mjs licanten <correo@municipalidad>`. Está vacío, así que las páginas legales mandan al vecino a la Oficina de Partes.
5. **Revocar la cuenta `TERRENO` del bot viejo** si sigue en `usuarios_municipales`: nadie la usa y tiene permiso de escritura en producción. El bot actual usa cuenta de servicio.
6. **Confirmar visualmente** que el PDF de la Cuenta Pública sale bien paginado — requiere login al panel del Alcalde, no tengo acceso.
7. **Tarea programada del respaldo diario** en Windows: nunca confirmaste si la creaste (§25).
8. **WhatsApp del Alcalde**, si algún día se repone la alerta: `node scripts/configurar-whatsapp-alcalde.mjs licanten +569XXXXXXXX`. Hoy guardar el número no sirve de nada por sí solo (§39.3).

---

## Pendiente para poder vender (§27 tiene la lista completa)

Por orden de importancia. Los puntos 2 y 3 sí son programar, pero no son funciones nuevas: son funciones que la propuesta **ya promete** y que se perdieron en la migración de WhatsApp.

1. **La tarjeta.** Sin ella no hay plan Blaze ni dominio propio. El bot ya está en Render pero en el **plan Free**, sin SLA — y la propuesta compromete un descuento por indisponibilidad (§7.2). La cuota de Firebase sigue siendo la gratis compartida.
2. **Reponer "mis reportes"** — ver arriba. Barato y le devuelve al vecino su única puerta.
3. **Reponer la alerta de emergencias al Alcalde.** Es la función más vendedora de la propuesta (§3.3) y hoy **no existe**: 7 emergencias en producción, 0 alertas. Necesita un listener nuevo **y** una plantilla aprobada en Meta (con la API oficial no se puede mandar texto libre fuera de la ventana de 24 h). Hasta que esté: sácala del documento o márcala como próxima etapa.
4. **El costo por mensaje de Meta.** Cada reporte genera al menos dos mensajes de plantilla. Verifica la tarifa vigente de mensajes de utilidad en Chile y métela en tus números: la propuesta dice "no hay cobro por cantidad de reportes", cierto para lo que le cobras al municipio, falso para lo que te cuesta a ti.
5. ~~**Política de privacidad y términos**~~ — ✅ escritas y publicadas (§35.2). Falta que **las revise un abogado** y el acuerdo de tratamiento de datos que la propuesta menciona.
6. **Cómo facturas.** Ya tienes SpA. Falta inscribirte como proveedor en Mercado Público (gratis y online) — la propuesta afirma que ya lo estás.
7. **Datos de prueba en producción**: ~89 incidencias sembradas en `municipalidades/demo` y algunas en `licanten`. Limpiar antes de mostrarle la plataforma a un Alcalde.

**Antes de enviar la propuesta**, lee `docs/PROPUESTA-COMERCIAL-NOTAS.md` sección 1: es la tabla de lo que el documento promete y hoy no puedes cumplir. Se actualizó el 09-ago: la fila de la alerta al Alcalde ahora dice "no existe", que es la verdad.

---

## Dar de alta una municipalidad nueva

Los datos que hay que pedirle están en la conversación del 09-ago pero **no quedaron escritos como documento**. Resumen: nombre institucional, coordenadas del centro, dos colores hex, logo PNG, nombres de las cuadrillas (sin esto no se puede asignar nada), listado de sectores con un punto de referencia cada uno, y por cada funcionario nombre + correo + rol + departamento. Más el correo del encargado de datos personales y el WhatsApp del Alcalde. **No** hay que pedir categorías ni departamentos (vienen fijos) ni precios de materiales (se construyen solos con el historial).

Si conviene, pedir en la próxima conversación que lo deje como `docs/ALTA-MUNICIPALIDAD.md`, en formato de formulario para enviar por correo, con el comando que corresponde a cada dato.

---

## Cómo empezar la próxima conversación

Para que salga barata, apunta a secciones en vez de pedir que lea todo:

> "Lee RETOMAR-AQUI.md y la sección §39 de ESTADO_PROYECTO.md. Quiero reponer 'mis reportes' en el WhatsApp."

Evita "lee ESTADO_PROYECTO.md completo": son ~40 mil tokens, el equivalente a veinte mensajes.

**Dos gotchas de esta máquina que van a aparecer** (§20 y §38.4): el **emulador de Firestore no arranca** acá (falla Netty al abrir un selector, con y sin sandbox), así que las reglas no se pueden probar localmente — lo que sí funciona es `npx firebase deploy --only firestore:rules --dry-run`, que las compila contra el proyecto real sin publicarlas. Y la API `firebaserules:test` de Google devuelve **403** con la cuenta de servicio del repo, que no tiene el permiso `firebaserules.rulesets.test`.

**Un método que valió la pena y conviene repetir**: cuando algo "no funciona en producción", comparar el ruleset **realmente desplegado** (se baja con la Rules API usando `serviceAccountKey.json`) contra `firestore.rules`, y leer las banderas reales de `incidencias` con el Admin SDK. Así se encontró el bug de las fotos y así se comprobó que las notificaciones sí salen. Está escrito en §38.2.

---

## Entrega ya armada

`Escritorio/TuMuniAqui-Entrega/` tiene las dos carpetas (app general y versión Licantén) con su LEEME y los links. Sin credenciales adentro, a propósito.
