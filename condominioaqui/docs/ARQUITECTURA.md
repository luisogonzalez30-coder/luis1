# CondominioAquí — arquitectura y plan

**Fecha:** 14 de septiembre de 2026
**Documento hermano:** `docs/ESTUDIO-MERCADO.md` (por qué se hace esto)

---

## 1. Qué es y qué no

Producto **independiente** para condominios y edificios chilenos. Comparte origen
con TuMuniAquí —el motor de reportes ciudadanos para municipalidades— pero es
otro código, otra base de datos y otro ciclo de vida.

El costo de esa separación es real y conviene tenerlo escrito: **un arreglo en el
flujo de reportes hay que hacerlo dos veces**. Se asumió a cambio de que cada
producto pueda moverse sin pedirle permiso al otro, y de que un error acá no
pueda tocar a un municipio que está en producción.

Lo que se ganó de inmediato al separar, y que en un motor compartido no se podía
hacer: **sacar los mapas**. En el producto municipal son el corazón; acá no
sirven, y quitarlos dejó la app ~200 kB más liviana y el panel más directo.

## 2. El dominio en tres archivos

Todo lo que define el producto vive en tres archivos. Si hay que entender el
sistema, se empieza por acá.

| Archivo | Qué define |
|---|---|
| `src/utils/categorias.js` | **El catálogo.** 84 categorías en 9 grupos. Cada una declara UNA sola vez su etiqueta, su grupo, su gravedad de triage y su área responsable; los mapas que consume el resto de la app se derivan de ahí |
| `src/utils/unidades.js` | **Dónde ocurre.** Torres, unidades y espacios comunes |
| `src/utils/mantenciones.js` | **Qué exige la ley.** Las 14 obligaciones de la Ley 21.442 |

El catálogo se declara una sola vez a propósito. La alternativa —catálogo,
triage y derivación en archivos separados— obliga a acordarse de tocar los tres
al agregar una categoría, y eso se olvida.

## 3. La ubicación: por qué no hay mapa

Un condominio entero cabe dentro del margen de error del GPS de un celular. El
pin no distingue el piso 3 del piso 12 ni el estacionamiento 40 del 41. Lo que el
conserje necesita saber es la torre y el número, y eso el residente lo tiene en
la cabeza: no hay que deducirlo de un mapa.

La estructura se declara en el documento del condominio:

```js
{
  torres: [
    { nombre: 'Torre A', pisos: 12, unidades_por_piso: 4 },   // genera 101 … 1204
    { nombre: 'Casas',  unidades: ['Casa 1', 'Casa 7B'] },    // lista explícita
  ],
  espacios_comunes: ['Hall de acceso', 'Piscina', 'Ascensor Torre A', ...],
  instalaciones: { tiene_ascensores: true, tiene_gas_comun: true, tiene_piscina: true },
}
```

Las dos formas de declarar unidades conviven porque los condominios chilenos son
las dos cosas: torres con numeración regular, y conjuntos de casas donde la
numeración no sigue ninguna regla y hay que escribirla a mano.

La solicitud guarda `ubicacion: { tipo, torre, unidad, espacio_comun, etiqueta }`.
No hay coordenadas en ninguna parte del modelo.

## 4. Privacidad: la unidad no sale

En un municipio la ubicación de un reporte no identifica a nadie. En un
condominio **la unidad identifica al hogar**.

- Torre y número **nunca** se copian a `tickets_condominio`, que es de lectura
  pública.
- Solo el espacio común viaja, en `ubicacion_publica`, porque ahí no hay a quién
  identificar.
- Por lo mismo, la agrupación de duplicados —el ascensor detenido que reportan 40
  personas en 10 minutos— **solo opera en espacios comunes**. Dentro de una
  unidad no se agrupa nunca. Es una decisión, no un pendiente.
- `detalles_adicionales` tampoco es público: es texto libre y puede nombrar
  personas.

## 5. Cumplimiento Ley 21.442

El diferenciador del producto. `src/utils/mantenciones.js` + `/panel/cumplimiento`.

14 obligaciones con periodicidad, responsable, evidencia exigida y referencia
legal, filtradas por lo que el condominio declara tener en `instalaciones`.
Estados: **vencida / sin registro / por vencer / al día**, con aviso 60 días
antes — tiempo real para cotizar, aprobar en comité y agendar al proveedor.

**Cómo está construido:**

- Cada registro vive en `condominios/{id}/mantenciones/{obligacionId}` — el ID
  del documento **es** el id de la obligación, así que no se puede duplicar el
  registro de la misma obligación por accidente.
- Guarda el último cumplimiento más el **historial** de los anteriores, en la
  misma escritura: ante el comité no se pregunta "¿está al día?" sino "muéstrame
  los certificados de los últimos años".
- La **periodicidad es editable por condominio** y solo se guarda si de verdad se
  cambió. Si se escribiera el default del catálogo, corregirlo en el código
  dejaría de propagarse a los condominios que nunca lo tocaron.
- Un registro **sin documento adjunto** se marca en la tarjeta: se ve "al día"
  pero no prueba nada ante una fiscalización ni ante la aseguradora.
- **El formulario exige solo la fecha.** Si exigiera el PDF, el administrador que
  tiene el certificado en papel sobre el escritorio no carga nada, y el sistema
  termina con menos información que el Excel que vino a reemplazar.
- El encabezado del panel lleva el **contador de obligaciones sin respaldo
  vigente**: una certificación vencida es lo único de esta app con multa
  asociada, no puede depender de que alguien se acuerde de entrar a mirarla.

> **Límite que no se cruza:** las periodicidades son valores por defecto
> editables. El sistema lleva el calendario que el administrador configura y
> avisa antes del vencimiento. **No es asesoría legal** y no se vende como tal.
> Está escrito así en el código y en la pantalla, no solo en el contrato.

> ⚠️ **Requisito de configuración para adjuntar PDF:** el preset "unsigned" de
> Cloudinary tiene que permitir `resource_type: auto` (o raw). Si no está
> habilitado, Cloudinary rechaza el PDF y `subirDocumento()` devuelve su mensaje
> tal cual — a propósito, porque es el dato que hace falta para ir a arreglarlo.
> Las fotos funcionan sin tocar nada.

## 6. Roles y permisos

Tres roles, y la diferencia entre dos de ellos es el corazón del producto:

| Rol | Quién es | Solicitudes | Cumplimiento 21.442 |
|---|---|---|---|
| `ADMINISTRADOR` | El administrador | Todo | Lee y **registra** |
| `COMITE` | El Comité de Administración | Su área | **Solo lee** |
| `CONSERJERIA` | Conserjes y maestro | Lo asignado | — |

El comité no registra a propósito. Su rol bajo la Ley 21.442 es fiscalizar al
administrador —puede reclamar contra él, y esa reclamación prescribe en dos
años—. Si pudiera registrar cumplimientos, el panel dejaría de servir como
control cruzado. La restricción está en `firestore.rules`, no solo en la
pantalla.

El residente **no tiene cuenta**. Reporta y consulta con su número de ticket.

## 7. Qué falta — en orden

### Antes del primer condominio real

1. **Puesta en marcha completa: `DESPLEGAR.md`.** Crear el proyecto de Firebase,
   encender Firestore/Auth/Hosting, copiar la configuración, crear la clave de
   servicio, cargar los secretos en GitHub, desplegar las reglas, sembrar el demo
   y crear el usuario administrador. Es todo clics en la consola: no se puede
   hacer desde una sesión de Claude.
2. **Habilitar PDF en el preset de Cloudinary** (ver §5).
3. **Verificar `condominioaqui.cl`** en NIC Chile y la marca en INAPI.

### Para que sea vendible

6. **WhatsApp.** El aviso al residente cuando entra su solicitud y cuando se
   resuelve es lo que hace que la gente vuelva a usarlo. La integración con la
   Cloud API oficial de Meta existe en el producto municipal y hay que portarla:
   es trabajo de verdad, no un copiar y pegar, porque las plantillas de Meta se
   aprueban por texto y las de allá nombran a una municipalidad.
7. **Aviso de obligación por vencer** a los 60 días, por WhatsApp o correo. Hoy
   el aviso existe en pantalla y hay que entrar a verlo; el valor completo es que
   llegue solo.
8. **Informe de cumplimiento en PDF** para la rendición mensual al comité. El
   panel ya muestra todo lo que lleva; falta el documento imprimible.

### Después

9. Libro de novedades digital de conserjería (turnos, entrega de turno,
   encomiendas).
10. Portal del copropietario: ver el estado de lo suyo y las actas, sin cuenta.
11. Votaciones y asambleas.
12. Landing comercial.

## 8. Publicación automática

`.github/workflows/desplegar-condominioaqui.yml`. Es gemelo del de TuMuniAquí
pero apunta a otro producto y a otro proyecto de Firebase; conviven en el mismo
repositorio sin pisarse porque cada uno filtra por carpeta:

| Evento | Qué pasa |
|---|---|
| PR que toca `condominioaqui/**` | Vista previa en URL temporal, comentada en el PR (7 días) |
| Merge a `main` | Publica el sitio real |
| Cambio en TuMuniAquí | Este workflow **no corre** |
| Cambio solo en un `.md` de esta carpeta | Tampoco corre |

Tres decisiones del workflow que conviene no deshacer:

- **Comprueba los 8 secretos `VITE_*` ANTES de compilar** y falla nombrando el
  que falta. Vite no falla cuando falta uno: lo reemplaza por `undefined` y
  compila igual, el sitio se publica, y `firebase.js` revienta con
  `auth/invalid-api-key` al cargar. Build verde, app muerta — ya pasó en el otro
  producto.
- **Los secretos llevan sufijo `_CONDOMINIO`.** Si se llamaran igual que los de
  TuMuniAquí, un workflow compilaría con la configuración del otro y publicaría
  una app que escribe en la base de datos equivocada.
- **En un PR, la falta de credencial o de secretos avisa y termina en VERDE; en
  `main`, falla.** Que el proyecto de Firebase todavía no exista no es un error
  del código, y un rojo que miente entrena a ignorar la CI. En `main` sí importa:
  ahí significa que el sitio no se publicó.

Las reglas de Firestore **no** se despliegan solas, a propósito: una regla mal
escrita abre la base entera, y eso no debe salir sin que alguien lo mire. Van a
mano con `npm run desplegar:reglas`.

## 9. Lo que no se ha verificado

`npm run build` queda verde y el dominio está probado (catálogo, triage,
derivación, plan de cumplimiento y modelo de unidades), pero **nada de esto se ha
visto funcionando en un navegador**: no hay proyecto de Firebase creado todavía,
así que la app no ha hablado con una base de datos real ni una sola vez.

Lo primero que se descubra al conectarla probablemente sea un campo que falta en
las reglas o un índice de Firestore que Firebase pide crear. Es lo normal, pero
hay que decirlo: esto está compilado, no probado.
