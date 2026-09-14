# TuCondoAquí

Plataforma de gestión de solicitudes y cumplimiento legal para condominios y
edificios chilenos.

**Es un producto independiente.** Comparte origen con TuMuniAquí (la plataforma de
reportes para municipalidades que está en la carpeta de arriba), pero desde el
14-sep-2026 tiene su propio código, su propia base de datos y su propio ciclo de
vida. Un cambio acá no toca aquello, y al revés tampoco. Esta carpeta es
autocontenida: si algún día se mueve a su propio repositorio, es `git init` y
nada más.

## Qué resuelve, y por qué existe

El software de administración de condominios que hay en Chile —ComunidadFeliz,
Edifito, Kastor y compañía— está construido alrededor del **dinero**: gasto
común, recaudación, conciliación bancaria. Lo hacen bien y no vale la pena
competir de frente ahí.

El hueco está en la **operación y el cumplimiento**: qué se rompió, quién lo está
arreglando, cuándo se resolvió, y qué certificación obligatoria está por vencer.
La Ley 21.442 hace al administrador responsable de las inspecciones y
certificaciones de ascensores, gas, electricidad y equipos contra incendio — y
hoy eso vive en una planilla Excel o en su memoria.

El estudio completo, con la competencia real y sus falencias verificadas, está en
**`docs/ESTUDIO-MERCADO.md`**. La arquitectura, en **`docs/ARQUITECTURA.md`**.

## Cómo arrancar

```bash
npm install
cp .env.ejemplo .env     # y rellenar
npm run dev
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila a `dist/` |
| `npm run demo` | **Simula** la creación del condominio de demostración, sin escribir |
| `npm run demo -- --aplicar` | Lo crea de verdad (necesita `serviceAccountKey.json`) |
| `npm run desplegar` | Compila y publica en Firebase Hosting |
| `npm run desplegar:reglas` | Publica `firestore.rules` y los índices |

## Firebase: un proyecto propio

> ⚠️ **Usa un proyecto de Firebase distinto del de TuMuniAquí.**
>
> Los dos proyectos tienen su propio `firestore.rules`, y las reglas de Firestore
> se despliegan **completas**: publicar las de acá sobre el proyecto del otro
> producto **borraría sus reglas** y dejaría su base abierta o inaccesible. No es
> un riesgo teórico, es lo que hace `firebase deploy --only firestore:rules`.
>
> Las colecciones igual se llaman distinto (`condominios`, `solicitudes`,
> `tickets_condominio`, `usuarios_condominio`, `personal`), así que si aun así se
> comparte proyecto los datos no se mezclan — pero el problema de las reglas
> sigue en pie y hay que resolverlo pegando ambos archivos en uno solo.

## Qué hay en cada carpeta

| Carpeta | Qué es |
|---|---|
| `src/utils/categorias.js` | **El catálogo**: 84 categorías en 9 grupos, cada una con su gravedad y su área responsable. Es la fuente de verdad del dominio |
| `src/utils/mantenciones.js` | Las 14 obligaciones de la Ley 21.442, con periodicidad, evidencia exigida y estado |
| `src/utils/unidades.js` | Torres, unidades y espacios comunes: cómo se ubica una solicitud |
| `src/components/residente/` | El flujo del residente: dónde → qué → foto y contacto |
| `src/components/panel/` | Los paneles de administración y del comité |
| `src/components/cumplimiento/` | El panel de Ley 21.442 |
| `src/components/conserjeria/` | La vista de quien ejecuta |
| `scripts/crear-demo.mjs` | Siembra el condominio de demostración |
| `docs/` | Estudio de mercado y arquitectura |

## Las tres decisiones que conviene no revertir sin leer primero

**1. No hay mapas.** Un condominio entero cabe dentro del margen de error del GPS
de un celular: el pin no distingue el piso 3 del 12 ni el estacionamiento 40 del
41. La ubicación es torre + unidad, o un espacio común. Eso además sacó Leaflet
del paquete, y la app pesa ~200 kB menos que su origen municipal.

**2. La unidad nunca es pública.** En un condominio la unidad identifica al
hogar. La torre y el número **no** se copian a `tickets_condominio`, que es de
lectura pública: "Torre B · 402 reportó ruidos molestos" a la vista de todos es
publicar quién acusó a quién entre vecinos que comparten el ascensor. Solo viaja
el espacio común. Por eso la agrupación de reportes duplicados opera únicamente
en espacios comunes.

**3. El comité no registra cumplimientos, solo los mira.** Registrar es de la
administración, que es quien responde ante la ley. Si el comité pudiera
registrar, el panel dejaría de servir como control cruzado — que es de lo poco
que hoy tiene para fiscalizar. Está en `firestore.rules`, no solo en la pantalla.

## Roles

| Rol interno | Quién es | Qué hace |
|---|---|---|
| `ADMINISTRADOR` | El administrador del condominio | Todo: solicitudes, costos, usuarios, cumplimiento |
| `COMITE` | El Comité de Administración | Gestiona su área; lee el cumplimiento sin poder registrarlo |
| `CONSERJERIA` | Conserjes y maestro de mantención | Ve y cierra lo que tiene asignado |

El residente **no tiene cuenta**: reporta y consulta con el número de ticket,
sin instalar ni registrarse. Es deliberado — pedirle a 144 hogares que instalen
una app que usarán dos veces al año es cómo se pierde la adopción.

## Lo que falta

En `docs/ARQUITECTURA.md`, sección "Qué falta — en orden". Lo primero:

1. Crear el proyecto de Firebase y desplegar `firestore.rules`.
2. `npm run demo -- --aplicar` y crear a mano el usuario `ADMINISTRADOR`.
3. Habilitar PDF en el preset de Cloudinary (`resource_type: auto`).
4. WhatsApp: el bot todavía no está portado a este producto.
