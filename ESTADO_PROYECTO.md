# Reporte de Incidencias Urbanas — Resumen técnico maestro

> Documento generado para continuar el trabajo en una nueva conversación. Refleja el estado real del código al 30-jul-2026 (actualizado tras implementar la consulta pública de ticket). Si algo acá no coincide con el código, **confía en el código** (esto es una foto, no la fuente de verdad).

## 1. Qué es esta app

PWA + Dashboard web para que municipalidades chilenas (multi-tenant: varias municipalidades en el mismo despliegue) gestionen reportes ciudadanos de incidencias urbanas (baches, luminarias, basurales, etc.), con:
- Clasificación automática de gravedad (triage) al momento del reporte.
- Adaptaciones para zonas rurales (referencias verbales de ubicación, contacto opcional, persistencia offline).
- Estadísticas rápidas para cuenta pública.

**Ubicación del proyecto**: `C:\Users\Administrador\Desktop\kpop\reporte-incidencias` (ojo: la carpeta padre `kpop` tiene contenido de Shopify/fútbol sin relación — el proyecto real está en la subcarpeta).

## 2. Stack técnico

- **Frontend**: React 18 + Vite 5, Tailwind CSS 3, `react-router-dom` v6.
- **Mapas**: Leaflet + `react-leaflet` (OpenStreetMap por defecto; toggle a satelital con **Esri World Imagery**, gratis y sin API key — se evitó Google Satellite/Street View a propósito: requieren facturación y tienen mala cobertura en zonas rurales de Chile).
- **Gráficos**: `recharts` (solo en el Dashboard, cargado con `React.lazy` para no pesarle al ciudadano).
- **Backend**: Firebase — Firestore (datos), Firebase Auth (funcionarios), Firebase Storage (fotos — **NO activo**, ver §7).
- **Iconos**: `lucide-react`.

## 3. Estructura de carpetas (src/)

```
src/
├── App.jsx                        # Rutas + AuthProvider + hook de sync offline montado a nivel raíz
├── main.jsx
├── firebase/firebase.js           # Init de Firebase, lee .env, expone db/auth/storage + COLECCIONES
├── context/AuthContext.jsx        # Login funcionarios, expone {usuario, perfil, iniciarSesion, cerrarSesion}
├── hooks/
│   ├── useGeolocation.js          # GPS del ciudadano
│   ├── useMunicipio.js            # Carga config de la municipalidad (tenant) + aplica tema
│   └── useSincronizacionOffline.js # Sincroniza cola offline al reconectar
├── services/
│   ├── incidenciasService.js      # CRUD de incidencias (ver §5)
│   ├── ticketsPublicosService.js  # Consulta pública de ticket, sin login (ver §12)
│   └── storageService.js         # Subida de fotos (no operativo hasta activar Blaze)
├── utils/
│   ├── categorias.js              # Catálogo de 58 categorías + agruparCategorias()
│   ├── gravedad.js                # Triage automático (ver §6)
│   ├── ticket.js                  # generarNumeroTicket()
│   ├── timeout.js                 # conTimeout() — ver §8
│   ├── colaOffline.js             # Cola de reportes pendientes en localStorage
│   ├── tema.js                    # Aplica colores del tenant vía CSS custom properties
│   └── leafletIconFix.js          # Fix de íconos Leaflet+Vite (compartido por los 2 mapas)
├── pages/
│   ├── LandingPage.jsx            # "/" — neutra, sin tenant
│   ├── CiudadanoPage.jsx          # "/:municipioSlug" — resuelve el tenant, muestra el formulario
│   ├── LoginPage.jsx              # "/login"
│   ├── DashboardPage.jsx          # "/dashboard" (ADMIN) — lazy-loaded
│   ├── CuadrillaPage.jsx          # "/cuadrilla" (TERRENO/ADMIN)
│   └── ConsultaTicketPage.jsx     # "/estado" — consulta pública sin login (ver §12)
└── components/
    ├── ciudadano/                 # Wizard de 3 pasos (ver §9)
    ├── dashboard/                 # Mapa, lista, panel de asignación, estadísticas
    ├── cuadrilla/                 # Lista de tareas + detalle
    └── common/                    # Badges, botones, EncabezadoMunicipio, EnlaceGoogleMaps, RutaProtegida
```

## 4. Multi-tenant — cómo funciona

- Cada municipalidad es un documento en `municipalidades/{slug}` (el slug ES el ID del doc, ej. `demo`).
- **Ciudadano**: accede vía `/:municipioSlug` (ej. `/demo`). `CiudadanoPage` lee el slug de la URL, usa `useMunicipio(slug)` para cargar la config y aplicar tema, pasa `municipio` a `FormularioCiudadano`.
- **Funcionario**: `/login`, `/dashboard`, `/cuadrilla` **no llevan slug** — el tenant sale de `perfil.municipio_id` (el documento del funcionario en `usuarios_municipales`) después del login, nunca de la URL. Así un funcionario no puede cambiar de tenant editando la barra de direcciones.
- Slugs reservados que nunca deben usarse como ID de municipalidad: `login`, `dashboard`, `cuadrilla`, `estado`, `admin`, `api`, `assets`. No hay una lista enforced en código: alcanza con que React Router v6 prioriza rutas estáticas (`/login`, `/estado`, etc.) por sobre la dinámica `/:municipioSlug`, sin importar el orden de declaración en `App.jsx`.

### Esquema de `municipalidades/{slug}`
```js
{
  nombre: string,                  // "Municipalidad Demo"
  color_primario: string,          // hex, ej "#1D4ED8"
  color_primario_oscuro: string,   // hex
  logo_url: string,                // opcional
  centro_mapa: { lat: number, lng: number },
  cuadrillas: string[],            // ej ["Cuadrilla Norte", "Cuadrilla Sur", "Cuadrilla Centro"]
}
```

## 5. Esquema de `incidencias/{id}` (colección principal)

```js
{
  categoria: string,               // uno de los 58 valores de CATEGORIAS (utils/categorias.js)
  coordenadas: { lat: number, lng: number },
  direccion_texto: string,         // "Referencias de ubicación" — texto libre, opcional
  detalles_adicionales: string,    // opcional
  numero_ticket: string,           // "INC-YYYYMMDD-XXXX" — sí es único ahora (ver §12, tickets_publicos)
  municipio_id: string,            // FK a municipalidades/{slug}
  nivel_gravedad: 'Alta'|'Media'|'Baja',  // calculado automático (ver §6)
  color_pin: string,               // hex, deriva de nivel_gravedad
  nombre_ciudadano: string,        // opcional, '' si no se dejó
  contacto_ciudadano: string,      // opcional, '' si no se dejó
  es_anonimo: boolean,             // true por defecto
  foto_antes_url: string,          // '' hasta que suba (requiere Storage/Blaze)
  foto_despues_url: string,
  estado: 'Pendiente'|'Asignado'|'Resuelto',
  cuadrilla_asignada: string,      // '' hasta asignar
  fecha_creacion: Timestamp,       // serverTimestamp()
  fecha_cierre: Timestamp | null,
}
```

**Funciones en `src/services/incidenciasService.js`:**
- `generarIdIncidencia()` — genera un ID de documento sin escribir (para poder reusarlo en reintentos, ver §8).
- `crearIncidencia({categoria, coordenadas, direccionTexto, detallesAdicionales, fotoAntes, municipioId, nombreCiudadano, contactoCiudadano, esAnonimo, idDocumento, numeroTicketExistente})` — usa **`setDoc`** (no `addDoc`) con un ID generado por el cliente, para que sea **idempotente** (ver §8 sobre por qué esto importa). Si `idDocumento`/`numeroTicketExistente` no vienen, los genera. Antes de escribir la incidencia, registra el ticket en `tickets_publicos` (ver §12); si el número choca con el de otro reporte, regenera y reintenta hasta 5 veces. Sube la foto a Storage en segundo plano (sin `await`, no bloquea el ticket).
- `suscribirIncidencias(callback, estado, municipioId)` — listener en tiempo real, requiere `municipioId` siempre (si no viene, no corre la query — evita fugas entre tenants por bug de llamada).
- `asignarCuadrilla(incidencia, cuadrilla)` — ADMIN cambia estado a "Asignado" (recibe la incidencia completa, no solo el id, porque también sincroniza el ticket público).
- `marcarResuelto(incidencia, fotoDespues)` — Cuadrilla cierra la incidencia; la foto es opcional y sube en segundo plano (mismo motivo: recibe la incidencia completa para sincronizar el ticket público).

## 6. Sistema de triage automático (`src/utils/gravedad.js`)

Al enviar el formulario, `crearIncidencia` calcula `nivel_gravedad` y `color_pin` según la **categoría** (no hay input manual del ciudadano). Criterio:
- **Alta** (riesgo inminente a la seguridad): Bache, Semáforo, Semáforo peatonal, Socavón, Luminaria apagada, Poste dañado, Cableado expuesto, Árbol caído, Muro en riesgo, Estructura dañada, Fuga de gas, Alcantarillado, Quema ilegal, Juegos infantiles dañados, Foco de delincuencia, Robos/hurtos frecuentes, Anegamiento.
- **Media** (requiere atención, sin peligro inmediato): Señalética vial, Pavimento deteriorado, Vereda dañada, Rampa accesibilidad, Ciclovía, Luminaria parpadeando, Basural, Escombros, Falta recolección, Mal olor, Filtración agua, Corte agua, Construcción irregular, Animal abandonado, Plaga, Paradero dañado, Baranda dañada, Patente irregular, Vehículo abandonado, Otro (default).
- **Baja** (estético/ambiental): Estacionamiento irregular, Contenedor dañado, Punto limpio, Grafiti, Poda necesaria, Plaza mal estado, Riego deficiente, Ruido ambiental, Grifo dañado, Sitio eriazo, Falta vigilancia, Consumo vía pública, Comercio ambulante, Mobiliario dañado, Baño público, Feria desorden, Ruido local comercial, Publicidad ilegal, Falta basureros, Pasto alto, Excremento mascotas.

**Colores (paleta "status" validada con la skill `dataviz`, NO elegidos a ojo):**
```js
COLOR_POR_GRAVEDAD = { Alta: '#d03b3b', Media: '#fab219', Baja: '#0ca30c' }
```
El amarillo de "Media" tiene bajo contraste por diseño — por eso **nunca** se muestra sin texto/badge al lado (regla de la skill dataviz: status color nunca solo con color).

`ORDEN_GRAVEDAD = { Alta: 0, Media: 1, Baja: 2 }` — se usa para ordenar listas (Alta siempre primero).

## 7. Catálogo de categorías (`src/utils/categorias.js`)

58 categorías en 9 grupos (investigadas contra ordenanzas municipales reales de Chile y la plataforma oficial **Denuncia Segura**): Vialidad y Tránsito (12), Alumbrado Público (4), Aseo y Ornato (8), Áreas Verdes y Medio Ambiente (7), Agua y Servicios Básicos (5), Infraestructura y Edificación (5), Seguridad y Convivencia (9), Espacios Públicos (4), Otros (3).

**Importante — categorías de seguridad/delincuencia**: `Foco_delincuencia` y `Robo_hurto_frecuente` tienen `avisoSeguridad: true`. Cuando el ciudadano las selecciona, `PasoCategoria.jsx` muestra un aviso: *"Esto no es una denuncia policial. Si es una emergencia, llama al 133. Para denuncia anónima, usa Denuncia Segura (\*4242)."* — decisión deliberada de **no** agregar categorías para delitos en curso/emergencias (no reemplazar canales reales de ayuda urgente).

`agruparCategorias(categorias)` — helper compartido (usado en `PasoCategoria.jsx` y en los filtros de `DashboardPage.jsx`) que agrupa el catálogo plano en `[{nombre, items}]` preservando el orden, para renderizar `<optgroup>`.

## 8. Persistencia offline (`src/utils/colaOffline.js`, `src/hooks/useSincronizacionOffline.js`)

**Problema real descubierto**: Firestore JS SDK **nunca rechaza** una escritura cuando no hay conexión real — la encola indefinidamente en segundo plano sin resolver ni rechazar la promesa. Por eso existe `conTimeout()` (`src/utils/timeout.js`, `Promise.race` con un timeout que marca `error.esTimeout = true`).

**Bug encontrado y corregido durante el diseño**: como `Promise.race` no cancela la promesa perdedora, el intento original abandonado por el timeout **sigue vivo** y puede completarse solo minutos después. Si en paralelo la cola offline reintenta el mismo reporte, se crean **2 documentos duplicados**. Solución: `crearIncidencia` genera el ID de documento **del lado del cliente** (`doc(incidenciasRef)`, sin escribir) y usa `setDoc` en vez de `addDoc` — la escritura es **idempotente**: si el intento original Y el reintento ambos llegan a Firestore, el segundo simplemente sobrescribe el mismo documento.

**Flujo en `FormularioCiudadano.manejarEnvio`:**
1. Genera `idDocumento` con `generarIdIncidencia()`.
2. Si `!navigator.onLine` → encola directo (sin intentar red).
3. Si no, intenta `crearIncidencia(...)` con `conTimeout` de 15s.
4. Si el error tiene `.esTimeout` → encola en `localStorage` (`guardarReportePendiente`) con el mismo `idDocumento` y un ticket generado localmente; muestra `TicketConfirmacion` con `pendienteSincronizar=true` (mensaje ámbar, no verde).
5. Otros errores (permission-denied, validación) → muestra error real, no encola.
6. La **foto no se persiste offline** (un `File` no cabe en localStorage) — se avisa al ciudadano si adjuntó una.

`useSincronizacionOffline()` — montado UNA vez en `App.jsx` (nivel raíz, no depende de la ruta). Escucha `online` y `visibilitychange`; procesa la cola secuencialmente (no `Promise.all`) con guard `sincronizandoRef` para no duplicar pasadas concurrentes en la misma pestaña. **Verificado funcionando end-to-end** (con `navigator.onLine` inyectado vía JS — el caso de señal intermitente real requiere DevTools → Network → Offline, no se pudo simular con las herramientas de este entorno).

## 9. Vista Ciudadano — wizard de 3 pasos (`src/components/ciudadano/`)

1. **PasoUbicacion.jsx** — botón GPS automático **+ mapa interactivo** (`MapaSeleccionUbicacion.jsx`) donde el ciudadano puede tocar/arrastrar para fijar la ubicación a mano. Toggle "Ver satelital" (Esri World Imagery) / "Ver calles" (OSM) abajo a la derecha del mapa.
2. **PasoCategoria.jsx** — select agrupado de 58 categorías, aviso de seguridad condicional, "Referencias de ubicación (opcional)" (placeholder rural: *"Ej: Pasando el puente, frente a la escuela"*), "Detalles adicionales (opcional)".
3. **PasoFoto.jsx** — foto opcional + checkbox **"Quiero dejar mis datos de contacto (opcional)"** (framing positivo — la app siempre fue 100% anónima por defecto) que revela "Tu nombre" / "Teléfono o correo" si se marca.

`FormularioCiudadano.jsx` orquesta los 3 pasos, mantiene `coordenadas` como estado editable (sincronizado desde el hook GPS pero también sobreescribible por clicks en el mapa), y maneja el envío (ver §8).

**Decisión de privacidad**: `nombre_ciudadano`/`contacto_ciudadano` se muestran **solo en `PanelAsignacion.jsx`** (Dashboard ADMIN) — nunca en `DetalleTarea.jsx`/`TarjetaTarea.jsx` (Cuadrilla Terreno), porque la cuadrilla no necesita el contacto para el trabajo físico. Firestore Rules no puede ocultar campos por rol dentro de un mismo doc, así que esto es una decisión de UI, no de seguridad.

## 10. Dashboard DOM (`src/pages/DashboardPage.jsx`) — solo ADMIN

Layout: mapa 60% (`MapaIncidencias.jsx`, pines coloreados por `color_pin` = gravedad, opacidad reducida si `estado==='Resuelto'`) + lista 40% (`ListaIncidencias.jsx` → `TarjetaIncidencia.jsx`, con badges de estado y gravedad).

**Filtros** (aplican a mapa Y lista juntos): gravedad (pills Todas/Alta/Media/Baja), categoría (select agrupado), cuadrilla (select con `municipio.cuadrillas`). La lista además siempre se acota a `estado==='Pendiente'` (es la cola de trabajo), ordenada por gravedad (Alta primero).

Al hacer clic en un pin o tarjeta: el mapa **vuela automáticamente** hasta esa ubicación (`CentradorMapa` interno en `MapaIncidencias.jsx`, usa `useMap().flyTo`), y se abre `PanelAsignacion.jsx` con: categoría, badges, `EnlaceGoogleMaps.jsx` (link a `https://www.google.com/maps?q=lat,lng`), detalles, contacto del ciudadano (si no es anónimo), foto, y el selector de cuadrilla + botón "Asignar cuadrilla".

**Tabs** en el header: "Mapa" / "Estadísticas Rápidas" (mismo `/dashboard`, sin cambiar de ruta).

### Estadísticas Rápidas (`src/components/dashboard/EstadisticasRapidas.jsx`)
Recibe el mismo array de `incidencias` que ya suscribe `DashboardPage` (sin queries nuevas). Selector de período (Este mes / Mes pasado / Últimos 3 meses / Todo el tiempo). Muestra: tarjetas Total / Pendientes / Asignadas / Resueltas (con %), y gráfico de barras (Recharts) del desglose por gravedad usando `COLOR_POR_GRAVEDAD`. Guard obligatorio para `fecha_creacion` transitoriamente `null`.

`DashboardPage` está cargado con `React.lazy` en `App.jsx` — `recharts` no se descarga en el flujo del ciudadano.

## 11. Vista Cuadrilla Terreno (`src/pages/CuadrillaPage.jsx`) — TERRENO o ADMIN

Lista de incidencias en estado "Asignado" del tenant. `DetalleTarea.jsx`: muestra categoría, badges, `EnlaceGoogleMaps`, detalles, foto reportada, y botón "Marcar como Resuelto" que habilita subir foto de término (opcional — no bloquea el cierre si Storage no está disponible).

## 12. Consulta pública de ticket (`/estado`, sin login)

**Implementado y verificado end-to-end en producción** (creación → `/estado` → asignar cuadrilla → marcar resuelto, cada paso confirmado leyendo `/estado` después).

Colección nueva `tickets_publicos/{numero_ticket}` — el **ID de documento es el propio `numero_ticket`**, con solo campos no sensibles:
```js
{
  incidencia_id: string,     // referencia interna, no sensible
  municipio_id: string,
  categoria: string,
  nivel_gravedad: 'Alta'|'Media'|'Baja'|null,
  estado: 'Pendiente'|'Asignado'|'Resuelto',
  fecha_creacion: Timestamp,
  fecha_cierre: Timestamp|null,
}
```
Excluidos a propósito: coordenadas, direccion_texto, detalles_adicionales, nombre/contacto ciudadano, fotos, cuadrilla_asignada.

**Mecanismo de unicidad real** (`generarNumeroTicket()` solo tiene ~65536 combinaciones/día): Firestore clasifica un `setDoc` sobre un doc que ya existe como `update`, no `create`, sin importar el método usado en el cliente. Como no hay `allow update` para anónimos en `tickets_publicos`, un intento de crear un ticket con un número ya usado por OTRO reporte es rechazado con `permission-denied` — ese rechazo es el mecanismo de unicidad, no hace falta transacción.

**`src/services/ticketsPublicosService.js`:**
- `registrarTicketPublico({numeroTicket, incidenciaId, municipioId, categoria, nivelGravedad, esRetry})` — `setDoc` create-only. Si falla con `permission-denied` y `esRetry` es `true` (reintento de la cola offline con el mismo `numeroTicketExistente`), asume que el doc ya lo creó el intento original y no relanza el error; si `esRetry` es `false`, relanza para que `crearIncidencia` regenere el número.
- `buscarTicketPublico(numeroTicket)` — `getDoc`, normaliza el input (`trim().toUpperCase()`), devuelve `null` si no existe.
- `actualizarEstadoTicketPublico(numeroTicket, cambios)` — `updateDoc` best-effort (no bloquea si falla), llamado desde `asignarCuadrilla` y `marcarResuelto`.

**`src/pages/ConsultaTicketPage.jsx`** (ruta `/estado`) — buscador de ticket + tarjeta de resultado (categoría, `BadgeEstado`, `BadgeGravedad`, fecha de creación/cierre). Sin tenant en la URL: el ticket público ya trae su propio `municipio_id`, así que sirve para cualquier municipalidad. Enlaces de entrada desde `LandingPage.jsx` y `TicketConfirmacion.jsx`.

## 13. Reglas de seguridad (`firestore.rules`) — contenido actual completo

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function perfilFuncionario() { return get(/databases/$(database)/documents/usuarios_municipales/$(request.auth.uid)).data; }
    function esFuncionarioAutenticado() { return request.auth != null && exists(/databases/$(database)/documents/usuarios_municipales/$(request.auth.uid)); }
    function esAdmin() { return esFuncionarioAutenticado() && perfilFuncionario().rol == 'ADMIN'; }
    function esDelMismoMunicipio(municipioId) { return esFuncionarioAutenticado() && perfilFuncionario().municipio_id == municipioId; }

    match /municipalidades/{municipioId} {
      allow read: if true;
      allow write: if false;   // gestión manual vía consola, no hay UI de creación
    }

    match /incidencias/{incidenciaId} {
      allow read: if esDelMismoMunicipio(resource.data.municipio_id);
      allow create: if request.resource.data.keys().hasAll(['categoria','coordenadas','estado','fecha_creacion','municipio_id'])
                      && request.resource.data.estado == 'Pendiente'
                      && request.resource.data.categoria is string
                      && request.resource.data.municipio_id is string && request.resource.data.municipio_id.size() > 0
                      && exists(/databases/$(database)/documents/municipalidades/$(request.resource.data.municipio_id))
                      && request.resource.data.coordenadas.lat is number && request.resource.data.coordenadas.lng is number
                      && (!('nivel_gravedad' in request.resource.data) || request.resource.data.nivel_gravedad in ['Alta','Media','Baja']);
      allow update: if esDelMismoMunicipio(resource.data.municipio_id);
      allow delete: if esAdmin() && esDelMismoMunicipio(resource.data.municipio_id);
    }

    match /tickets_publicos/{ticketId} {
      allow get: if true;
      allow list: if false;
      allow create: if request.resource.data.keys().hasAll(['incidencia_id','municipio_id','categoria','estado','fecha_creacion'])
                      && request.resource.data.estado == 'Pendiente'
                      && request.resource.data.categoria is string
                      && request.resource.data.municipio_id is string && request.resource.data.municipio_id.size() > 0
                      && exists(/databases/$(database)/documents/municipalidades/$(request.resource.data.municipio_id))
                      && (!('nivel_gravedad' in request.resource.data) || request.resource.data.nivel_gravedad in ['Alta','Media','Baja']);
      allow update: if esDelMismoMunicipio(resource.data.municipio_id);
      allow delete: if false;
    }

    match /usuarios_municipales/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow read: if esAdmin() && esDelMismoMunicipio(resource.data.municipio_id);
      allow create: if esAdmin() && request.resource.data.municipio_id == perfilFuncionario().municipio_id;
      allow update, delete: if esAdmin() && esDelMismoMunicipio(resource.data.municipio_id);
    }
  }
}
```

✅ **Resuelto**: estas reglas (incluyendo `nivel_gravedad` y el bloque nuevo de `tickets_publicos`) **sí están publicadas** en `https://console.firebase.google.com/project/app-incidencias-urbanas/firestore/rules` — confirmado end-to-end el 30-jul-2026 creando una incidencia real y viéndola reflejarse correctamente en `/estado`.

## 14. Estado real en Firebase (producción)

- **Proyecto**: `app-incidencias-urbanas` (plan **Spark**, gratis).
- **Authentication**: habilitado (Correo/contraseña). Un usuario ADMIN real creado (Luis González) con `municipio_id: "demo"`.
- **Firestore**: habilitado, con datos reales de prueba. Índices compuestos creados y habilitados: `(municipio_id ASC, fecha_creacion DESC)` y `(municipio_id ASC, estado ASC, fecha_creacion DESC)` sobre `incidencias`.
- **Storage**: **NO activo** — Firebase ahora exige plan **Blaze** (pago por uso, con capa gratuita) para usar Storage en absoluto, no solo para las reglas cross-service. El usuario decidió NO activarlo por ahora; por eso las fotos nunca se guardan (se intenta subir en segundo plano, falla silenciosamente, no bloquea nada — ver `foto_antes_url`/`foto_despues_url` siempre quedan en `''`).
- **`municipalidades/demo`**: creado con nombre "Municipalidad Demo", colores azul, centro en Santiago, 3 cuadrillas (Norte/Sur/Centro).
- **`.env`** tiene las credenciales reales del proyecto (`VITE_FIREBASE_*`) y `VITE_USE_FIREBASE_EMULATORS=false`.

### Credenciales de prueba conocidas
- ADMIN real: el correo/contraseña que el usuario creó él mismo (no está en este documento).
- Emulador local (si algún día se arregla): `admin@incidencias.cl` / `Admin123!`, `terreno@incidencias.cl` / `Terreno123!` (ver `scripts/seed.js`).

## 15. Limitaciones conocidas / gotchas de esta máquina

1. **El emulador local de Firestore/Storage está roto en esta máquina** (confirmado, no arreglable): Java 21 no puede abrir un selector NIO por un fallo de loopback socket (`AF_UNIX`), probablemente antivirus/firewall interceptando. Se probaron 3 JDKs distintos, mismo error exacto en `java.base`. El emulador de **Auth** (Node puro) sí funciona.
2. **La consola web de Firebase tuvo un bug real**: mostraba documentos como "guardados" en la UI que **nunca llegaban al servidor real** (confirmado con 3 métodos independientes: REST API, la app misma, y Admin SDK con una clave de servicio). Se resolvió escribiendo los datos directo con Admin SDK. Si vuelve a pasar, no asumir que lo que se ve en la consola = lo que hay en el servidor; verificar con Admin SDK o la app real.
3. **`npm run dev` corre en `localhost:5173`** — sin desplegar a un dominio real todavía (Firebase Hosting nunca se configuró/desplegó pese a que `firebase.json` ya tiene el bloque `hosting` listo).
4. **PWA real (manifest.json + service worker) nunca se implementó** — se mencionó como opción para Android/iOS pero no se construyó.

## 16. Cosas explícitamente diseñadas pero NO implementadas (pendientes)

- **Notificación por WhatsApp**: evaluado, requiere WhatsApp Business API (pago, aprobación de Meta) + Cloud Functions (requiere Blaze). Se descartó por ahora a favor de la consulta pública de ticket, ya implementada (ver §12) — es gratis y sin cuentas externas.
- **Activar Storage/Blaze**: pendiente, decisión del usuario (requiere tarjeta de crédito).
- **Desplegar a Firebase Hosting**: pendiente (requiere `npx firebase login` una vez).
- **Capacitor** (empaquetar como app nativa Android/iOS real): mencionado como opción futura, no iniciado.

## 17. Cómo correr el proyecto

```bash
cd reporte-incidencias
npm install
npm run dev
```
Luego: `http://localhost:5173/demo` (ciudadano), `http://localhost:5173/login` (funcionario), `http://localhost:5173/estado` (consulta pública de ticket, sin login).

Para build de producción: `npm run build` (verificar que `recharts` quede en un chunk separado de `DashboardPage-*.js`, no en el `index-*.js` principal — code-splitting ya configurado en `App.jsx` con `React.lazy`).
