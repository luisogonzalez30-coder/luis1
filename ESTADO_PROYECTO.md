# TuMuniAquí — Resumen técnico maestro

> Documento generado para continuar el trabajo en una nueva conversación. Refleja el estado real del código al 31-jul-2026 (actualizado tras implementar consulta pública de ticket, despliegue a Hosting, PWA, derivación automática por departamento, RBAC de 3 roles, agrupación de reportes estilo Waze con upvotes/detección de duplicados, autoservicio de creación de funcionarios, migración de subida de fotos de Firebase Storage a Cloudinary por falta de tarjeta para Blaze, el módulo de Órdenes de Trabajo y Costeo, roster de trabajadores/asistencia por departamento, un arreglo de responsividad mobile en ambos Dashboards, hasta 3 fotos por reporte, RUT opcional del ciudadano con consulta de tickets por RUT, y un bot de WhatsApp no oficial (`whatsapp-bot/`) que notifica al ciudadano en 3 momentos del ciclo de vida y responde consultas de estado — ver §23; más, en la misma sesión, búsqueda/exportar CSV/alertas de SLA en los Dashboards, calificación y seguimiento ciudadano post-reporte, una página pública de transparencia por comuna, y un script de respaldo diario de Firestore — ver §24 y §25). Si algo acá no coincide con el código, **confía en el código** (esto es una foto, no la fuente de verdad).
>
> ⚠️ **Sobre WhatsApp, este encabezado y §21/§23/§32 están desactualizados**: el bot no oficial (`whatsapp-bot/`, Baileys) se retiró y hoy corre la **Cloud API oficial de Meta** (`whatsapp-api-oficial/`). Empieza por **§39**, que es lo único verificado contra el código y contra producción — incluye las tres funciones que se perdieron en esa migración.

## 1. Qué es esta app

PWA + Dashboard web para que municipalidades chilenas (multi-tenant: varias municipalidades en el mismo despliegue) gestionen reportes ciudadanos de incidencias urbanas (baches, luminarias, basurales, etc.), con:
- Clasificación automática de gravedad (triage) al momento del reporte.
- Derivación automática a uno de 7 departamentos municipales según categoría, con RBAC de 3 roles (§5) para dashboards acotados por departamento.
- Agrupación de reportes duplicados estilo Waze: detección por proximidad + categoría, y voto "+1" en vez de crear un reporte repetido (§16).
- Órdenes de Trabajo y Costeo: presupuesto estimado al asignar cuadrilla y gasto real al cerrar, con KPI de gasto mensual para el Alcalde, y roster de trabajadores/asistencia por departamento (§17).
- Consulta pública de ticket sin login, por número de ticket o por RUT (solo desde el mismo celular, ver §15).
- Adaptaciones para zonas rurales (referencias verbales de ubicación, contacto opcional, persistencia offline).
- Estadísticas rápidas para cuenta pública.

**Ubicación del proyecto**: `C:\Users\Administrador\Desktop\kpop\reporte-incidencias` (ojo: la carpeta padre `kpop` tiene contenido de Shopify/fútbol sin relación — el proyecto real está en la subcarpeta).

## 2. Stack técnico

- **Frontend**: React 18 + Vite 5, Tailwind CSS 3, `react-router-dom` v6.
- **Mapas**: Leaflet + `react-leaflet` (OpenStreetMap por defecto; toggle a satelital con **Esri World Imagery**, gratis y sin API key — se evitó Google Satellite/Street View a propósito: requieren facturación y tienen mala cobertura en zonas rurales de Chile).
- **Gráficos**: `recharts` (solo en el Dashboard, cargado con `React.lazy` para no pesarle al ciudadano).
- **Backend**: Firebase — Firestore (datos), Firebase Auth (funcionarios). Las fotos NO usan Firebase Storage — usan **Cloudinary** (plan gratis, sin tarjeta), ver §19.
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
│   ├── incidenciasService.js      # CRUD de incidencias (ver §6)
│   ├── ticketsPublicosService.js  # Consulta pública de ticket, sin login (ver §15)
│   ├── funcionariosService.js     # Alta/baja de funcionarios, solo Alcalde (ver §5)
│   ├── trabajadoresService.js     # Roster de asistencia por departamento (ver §17)
│   ├── ubicacionesCuadrillaService.js # Ubicación manual de cuadrillas (ver §17)
│   ├── seguimientosService.js     # Comentario/foto ciudadano a un reporte existente (ver §24)
│   └── storageService.js         # Subida de fotos a Cloudinary (no Firebase Storage), ver §19
├── utils/
│   ├── categorias.js              # Catálogo de 58 categorías + agruparCategorias()
│   ├── gravedad.js                # Triage automático (ver §7)
│   ├── departamento.js            # Derivación automática por departamento (ver §8)
│   ├── ticket.js                  # generarNumeroTicket()
│   ├── timeout.js                 # conTimeout() — ver §10
│   ├── tiempo.js                  # formatearFecha/Duracion, esDelMesActual, horasDesde (ver §17, §24)
│   ├── costeo.js                  # calcularCostoManoObra (ver §17)
│   ├── rut.js                     # Validación RUT chileno (ver §11)
│   ├── colaOffline.js             # Cola de reportes pendientes en localStorage
│   ├── dispositivo.js             # ID de dispositivo + votos + índice de tickets por RUT (ver §11, §16)
│   ├── distancia.js               # distanciaMetros() — Haversine, para el chequeo de duplicados (ver §16)
│   ├── iconoPin.js                # crearIconoPin() — ícono Leaflet compartido por los mapas
│   ├── tema.js                    # Aplica colores del tenant vía CSS custom properties
│   ├── busqueda.js                # coincideTexto() — búsqueda libre en los Dashboards (ver §24)
│   ├── exportarCsv.js             # exportarIncidenciasCsv() (ver §24)
│   └── leafletIconFix.js          # Fix de íconos Leaflet+Vite (compartido por los 2 mapas)
├── pages/
│   ├── LandingPage.jsx            # "/" — neutra, sin tenant
│   ├── CiudadanoPage.jsx          # "/:municipioSlug" — resuelve el tenant, muestra el formulario
│   ├── LoginPage.jsx              # "/login"
│   ├── DashboardGeneralPage.jsx   # "/dashboard/general" (ALCALDE_ADMIN) — lazy-loaded, ver §12
│   ├── DashboardDepartamentoPage.jsx # "/dashboard/departamento" (JEFE_DEPARTAMENTO) — lazy-loaded, ver §13
│   ├── GestionFuncionariosPage.jsx # "/dashboard/funcionarios" (ALCALDE_ADMIN) — lazy-loaded, ver §5
│   ├── CuadrillaPage.jsx          # "/cuadrilla" (TERRENO/ALCALDE_ADMIN)
│   ├── ConsultaTicketPage.jsx     # "/estado" — consulta pública sin login (ver §15), + calificación y seguimiento (§24)
│   └── TransparenciaPage.jsx      # "/:municipioSlug/transparencia" — pública, lazy-loaded (ver §24)
└── components/
    ├── ciudadano/                 # Wizard de 3 pasos (ver §11) + PopupVotoIncidencia.jsx,
    │                               # AvisoPosibleDuplicado.jsx (ver §16)
    ├── dashboard/                 # Mapa, lista, PanelAsignacion, PanelGestionDepartamento,
    │                               # MetricasPorDepartamento, ResumenGastoMensual, ModalDetalleGasto, ModalPresupuesto,
    │                               # ModalTrabajadoresDepartamento (ver §12, §13, §17), estadísticas
    ├── cuadrilla/                 # Lista de tareas + detalle
    └── common/                    # Badges, botones, EncabezadoMunicipio, EnlaceGoogleMaps,
                                    # RutaProtegida, Modal (ver §17), GaleriaFotos (ver §11),
                                    # EstrellasCalificacion, ListaSeguimientos (ver §24)
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

## 5. Control de acceso basado en roles (RBAC)

**Implementado el 30-jul-2026.** 3 roles de funcionario, todos con perfil en `usuarios_municipales/{uid}`:

```js
// usuarios_municipales/{uid}
{
  email: string,
  nombre: string,
  rol: 'ALCALDE_ADMIN' | 'JEFE_DEPARTAMENTO' | 'TERRENO',
  municipio_id: string,       // FK a municipalidades/{slug} — SIGUE siendo obligatorio para los 3 roles,
                               // es lo que hace que la app sea multi-tenant (ver §4). Sin esto un Jefe
                               // o Alcalde vería incidencias de OTRAS municipalidades.
  departamento: string,       // uno de DEPARTAMENTOS (ver §8) si rol es JEFE_DEPARTAMENTO,
                               // 'Todos' si rol es ALCALDE_ADMIN, no se usa si rol es TERRENO.
}
```

- **`ALCALDE_ADMIN`** — antes se llamaba `ADMIN` (mismo nivel, mismo `/dashboard`, ahora con más funciones). Ve y gestiona **todas** las incidencias del municipio, de todos los departamentos. Dashboard: `/dashboard/general` (§12), incluye panel de métricas por departamento.
- **`JEFE_DEPARTAMENTO`** — rol nuevo. Ve y gestiona **solo** las incidencias de `perfil.departamento`: asigna cuadrilla (Pendiente → En Proceso, con presupuesto obligatorio, ver §17) Y marca resuelto (En Proceso → Resuelto), a diferencia del Alcalde (solo asigna, sin presupuesto) y Terreno (solo resuelve) — el Jefe cubre todo el ciclo dentro de su departamento. Dashboard: `/dashboard/departamento` (§13).
- **`TERRENO`** — sin cambios de este trabajo. Ve incidencias "En Proceso" del municipio (no acotado por departamento, se acota por cuadrilla a nivel de UI, igual que siempre), marca resuelto (con gasto real obligatorio, ver §17). Vista: `/cuadrilla` (§14).

**Redirección tras login**: `LoginPage.jsx` no cambió — sigue navegando a `/dashboard` (o a `location.state.desde`). La ruta `/dashboard` a secas ahora es un redirector (`RedirectorDashboard` en `App.jsx`) que, una vez que `RutaProtegida` garantiza que hay `perfil` cargado, lee `perfil.rol` y manda a cada quien a su dashboard: `ALCALDE_ADMIN` → `/dashboard/general`, `JEFE_DEPARTAMENTO` → `/dashboard/departamento`, `TERRENO` → `/cuadrilla`. Si el rol no matchea ninguno (ej. quedó un `'ADMIN'` viejo sin migrar) muestra un mensaje claro en vez de un loop de redirección.

**`RutaProtegida.jsx` no cambió** — sigue siendo genérico (`rolesPermitidos` array, compara contra `perfil.rol`), ya soportaba cualquier lista de roles sin modificación.

**`firestore.rules`** (ver §18 para el archivo completo): `esAdmin()` se renombró a `esAlcalde()` (chequea `rol == 'ALCALDE_ADMIN'`). Nueva función `puedeGestionarIncidencia(incidenciaData)`: exige mismo municipio SIEMPRE, y además — solo si el rol del funcionario es `JEFE_DEPARTAMENTO` — exige que `perfilFuncionario().departamento == incidenciaData.departamento`. Así el Jefe de Departamento no puede escribir incidencias fuera de su departamento ni siquiera saltándose la UI (con Postman, DevTools, etc.) — no es solo un filtro visual.

✅ **Migrado, desplegado y verificado end-to-end en producción (30-jul-2026)**:
- Luis González migró su documento en `usuarios_municipales` a `rol: "ALCALDE_ADMIN"`, `departamento: "todos"` (minúscula — no importa, ese campo no se usa en ninguna lógica de autorización para este rol, solo es informativo).
- Reglas y frontend desplegados con `firestore:rules` + `hosting`.
- Se creó una cuenta de prueba real con `rol: "JEFE_DEPARTAMENTO"`, `departamento: "Aseo y Ornato"` (Auth + doc en `usuarios_municipales`, a mano vía consola — en ese momento no existía UI para esto, ver más abajo). Login redirige correctamente a `/dashboard/departamento`, muestra únicamente el reporte de Grafiti (`INC-20260730-791B`, departamento Aseo y Ornato) que ya existía, y el flujo de asignar cuadrilla + marcar resuelto en `PanelGestionDepartamento.jsx` funciona confirmado por el usuario.

### Gestión de funcionarios desde el Dashboard (autoservicio, `/dashboard/funcionarios`)

**Implementado y verificado end-to-end en producción (30-jul-2026)**: cierra el pendiente de §21 — ya no hace falta crear funcionarios a mano en la consola de Firebase, salvo para crear otro `ALCALDE_ADMIN`.

- **Solo `ALCALDE_ADMIN`** puede acceder (ruta protegida en `App.jsx` + regla del lado servidor, ver abajo). Enlace "Funcionarios" en el header de `DashboardGeneralPage.jsx`.
- **Problema técnico resuelto**: `createUserWithEmailAndPassword` inicia sesión automáticamente como el usuario recién creado — sin nada más, eso desloguearía al Alcalde de su propia sesión cada vez que crea a alguien. Solución: una **segunda instancia de Firebase App** solo para esto (`authSecundario` en `firebase.js`, `initializeApp(firebaseConfig, 'secundaria')`), completamente independiente de la sesión principal; tras crear el usuario y su perfil, se hace `signOut(authSecundario)` (no afecta al Alcalde logueado en la app principal).
- **`src/services/funcionariosService.js`**: `crearFuncionario({nombre, correo, contrasena, rol, departamento, municipioId})` (crea el usuario en la app secundaria + el doc en `usuarios_municipales`), `suscribirFuncionarios(callback, municipioId)` (lista funcionarios del mismo municipio), `eliminarFuncionario(uid)` (borra SOLO el doc de Firestore — revoca el acceso al Dashboard, pero **no borra la cuenta de Firebase Auth**, eso requiere Admin SDK/consola, no disponible desde el cliente).
- **`src/pages/GestionFuncionariosPage.jsx`**: formulario (nombre, correo, contraseña temporal, rol, departamento si `JEFE_DEPARTAMENTO`) + lista de funcionarios del municipio con botón para quitar acceso (no se puede quitar el acceso a uno mismo).
- **`firestore.rules`**: la regla `create` de `usuarios_municipales` ahora exige además `request.resource.data.rol in ['JEFE_DEPARTAMENTO', 'TERRENO']` — un Alcalde no puede crear otro `ALCALDE_ADMIN` desde esta UI (evita que la función de autoservicio sirva para autoescalar privilegios); crear otro Alcalde sigue siendo manual desde la consola, a propósito.
- **Riesgo aceptado y documentado**: si el `setDoc` del perfil falla después de crear la cuenta de Auth (caso raro), queda un usuario de Auth "huérfano" sin perfil — `AuthContext.jsx` ya maneja ese caso (le niega acceso con mensaje claro); se resuelve a mano desde la consola si llega a pasar.

## 6. Esquema de `incidencias/{id}` (colección principal)

```js
{
  categoria: string,               // uno de los 58 valores de CATEGORIAS (utils/categorias.js)
  coordenadas: { lat: number, lng: number },
  direccion_texto: string,         // "Referencias de ubicación" — texto libre, opcional
  detalles_adicionales: string,    // opcional
  numero_ticket: string,           // "INC-YYYYMMDD-XXXX" — sí es único ahora (ver §15, tickets_publicos)
  municipio_id: string,            // FK a municipalidades/{slug}
  nivel_gravedad: 'Alta'|'Media'|'Baja',  // calculado automático (ver §7)
  color_pin: string,               // hex, deriva de nivel_gravedad
  departamento: string,            // calculado automático (ver §8), uno de DEPARTAMENTOS
  nombre_ciudadano: string,        // opcional, '' si no se dejó
  contacto_ciudadano: string,      // opcional (WhatsApp o correo), '' si no se dejó
  rut_ciudadano: string,           // opcional (nunca obligatorio — ver §11), '' si no se dejó. NUNCA se copia a tickets_publicos
  es_anonimo: boolean,             // true por defecto
  fotos_antes_urls: string[],      // 0 a 3, se van agregando con arrayUnion a medida que Cloudinary confirma cada subida (ver §11)
  foto_despues_url: string,
  estado: 'Pendiente'|'En Proceso'|'Resuelto',  // "En Proceso" se llamaba "Asignado" antes del módulo de Costeo (ver §17)
  cuadrilla_asignada: string,      // '' hasta asignar
  upvotes: number,                 // 1 al crear, +1 por cada voto "+1" (ver §16)
  usuarios_afectados: string[],    // IDs de dispositivo que ya votaron (ver §16), [] al crear
  presupuesto_estimado: {          // null hasta que el Jefe de Departamento asigna cuadrilla (ver §17)
    personal_requerido: number,    // = trabajadores_asignados.length, no se escribe a mano
    trabajadores_asignados: {      // snapshot de trabajadores/{id} al momento de asignar — ver §17
      id: string, nombre: string, tarifa_hora: number
    }[],
    horas_estimadas: number,
    materiales: string,            // descripción libre, sin monto propio (decisión de diseño, ver §17)
    costo_aprox: number,           // total a ojo del Jefe; el costo de mano de obra se CALCULA aparte (tarifa × horas), no se resta de acá
  } | null,
  gasto_real: {                    // null hasta que se marca Resuelto (ver §17)
    horas_reales: number,
    costo_final: number,           // mismo criterio que costo_aprox: total a ojo, mano de obra se calcula aparte
  } | null,
  calificacion_ciudadano: number | null,  // 1-5, la pone el ciudadano desde /estado una vez Resuelto (ver §24), solo una vez
  notificado_whatsapp_creacion: boolean,   // banderas del bot de WhatsApp (§23), independientes entre sí
  notificado_whatsapp_asignacion: boolean, // — cada una se pone en true cuando el bot avisa ESE momento del ciclo
  notificado_whatsapp: boolean,            // (esta última es específicamente la de "Resuelto", nombre sin sufijo por compatibilidad histórica)
  fecha_creacion: Timestamp,       // serverTimestamp()
  fecha_asignacion: Timestamp | null,  // null hasta que se asigna cuadrilla — usado para "tiempo de reacción" (ver §17)
  fecha_cierre: Timestamp | null,
}
```

**Subcolección `incidencias/{id}/seguimientos/{id}`** (nueva, ver §24): `{texto: string, foto_url: string, autor: 'ciudadano', fecha: Timestamp}` — comentarios/fotos que el ciudadano agrega a un reporte ya creado, sin login, desde `/estado`.

**Funciones en `src/services/incidenciasService.js`:**
- `generarIdIncidencia()` — genera un ID de documento sin escribir (para poder reusarlo en reintentos, ver §10).
- `crearIncidencia({categoria, coordenadas, direccionTexto, detallesAdicionales, fotoAntes, municipioId, nombreCiudadano, contactoCiudadano, esAnonimo, idDocumento, numeroTicketExistente})` — usa **`setDoc`** (no `addDoc`) con un ID generado por el cliente, para que sea **idempotente** (ver §10 sobre por qué esto importa). Si `idDocumento`/`numeroTicketExistente` no vienen, los genera. Calcula `nivel_gravedad` (ver §7) y `departamento` (ver §8) según la categoría. Antes de escribir la incidencia, registra el ticket en `tickets_publicos` (ver §15); si el número choca con el de otro reporte, regenera y reintenta hasta 5 veces. Sube la foto a Cloudinary en segundo plano (sin `await`, no bloquea el ticket). `presupuesto_estimado`/`gasto_real` quedan en `null`.
- `suscribirIncidencias(callback, estado, municipioId)` — listener en tiempo real, requiere `municipioId` siempre (si no viene, no corre la query — evita fugas entre tenants por bug de llamada).
- `asignarCuadrilla(incidencia, cuadrilla, presupuestoEstimado?)` — Alcalde o Jefe de Departamento cambian estado a "En Proceso" y guardan `fecha_asignacion` (`serverTimestamp()`, siempre, la asigne quien la asigne — ver §17) (recibe la incidencia completa, no solo el id, porque también sincroniza el ticket público). `presupuestoEstimado` es opcional — solo lo manda el Jefe de Departamento (ver §17); si se omite (caso Alcalde), `presupuesto_estimado` queda en `null`.
- `marcarResuelto(incidencia, fotoDespues, gastoReal)` — Terreno o Jefe de Departamento cierran la incidencia; la foto es opcional y sube en segundo plano, pero `gastoReal` (`{horas_reales, costo_final}`) es obligatorio — ambas vistas de cierre bloquean el botón hasta llenarlo (ver §17).

## 7. Sistema de triage automático (`src/utils/gravedad.js`)

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

## 8. Derivación automática por departamento (`src/utils/departamento.js`)

Al enviar el formulario, `crearIncidencia` también calcula `departamento` según la **categoría** (mismo mecanismo que el triage de gravedad, sin input manual del ciudadano). `DEPARTAMENTOS` (7 valores, corresponden a direcciones habituales de una municipalidad chilena bajo la Ley 18.695):
- **Dirección de Obras (DOM)** — vialidad/infraestructura física: Bache, Pavimento deteriorado, Socavón, Vereda dañada, Rampa accesibilidad, Ciclovía, Baranda dañada, Sitio eriazo, Construcción irregular, Muro en riesgo, Estructura dañada, Mobiliario dañado.
- **Tránsito** — señalización y circulación: Semáforo, Semáforo peatonal, Señalética vial, Estacionamiento irregular, Vehículo abandonado, Paradero dañado.
- **Operaciones** — alumbrado público y servicios básicos: Luminaria (apagada/parpadeando), Poste dañado, Cableado expuesto, Anegamiento, Filtración agua, Alcantarillado, Fuga de gas, Corte agua, Grifo dañado.
- **Aseo y Ornato** — limpieza y recolección: Basural, Escombros, Contenedor dañado, Falta recolección, Punto limpio, Grafiti, Mal olor, Falta basureros, Excremento mascotas, Baño público.
- **Medio Ambiente** — áreas verdes y fauna: Árbol caído, Poda necesaria, Plaza mal estado, Juegos infantiles, Riego deficiente, Ruido ambiental, Quema ilegal, Pasto alto, Animal abandonado, Plaga.
- **Seguridad Ciudadana** — convivencia y fiscalización: Patente irregular, Falta vigilancia, Foco de delincuencia, Robos/hurtos frecuentes, Consumo vía pública, Comercio ambulante, Feria desorden, Ruido local comercial, Publicidad ilegal.
- **Oficina de Partes** — bandeja genérica: solo `Otro` (y fallback por defecto si alguna categoría nueva se agrega sin clasificar).

Validado en `firestore.rules` igual que `nivel_gravedad` (si el cliente manda `departamento`, debe ser uno de los 7 valores) — y desde el RBAC (§5), también gobierna QUIÉN puede escribir cada incidencia: el Jefe de Departamento solo puede gestionar las que coincidan con su propio `departamento`.

**Dashboards**: `DashboardGeneralPage.jsx` (Alcalde, §12) tiene un select "Todos los departamentos" para drillear dentro de la vista completa, más una fila de métricas comparativas entre TODOS los departamentos. `DashboardDepartamentoPage.jsx` (Jefe de Departamento, §13) no tiene ese select — ya viene pre-acotado a `perfil.departamento`, nunca ve los demás.

## 9. Catálogo de categorías (`src/utils/categorias.js`)

58 categorías en 9 grupos (investigadas contra ordenanzas municipales reales de Chile y la plataforma oficial **Denuncia Segura**): Vialidad y Tránsito (12), Alumbrado Público (4), Aseo y Ornato (8), Áreas Verdes y Medio Ambiente (7), Agua y Servicios Básicos (5), Infraestructura y Edificación (5), Seguridad y Convivencia (9), Espacios Públicos (4), Otros (3).

**Importante — categorías de seguridad/delincuencia**: `Foco_delincuencia` y `Robo_hurto_frecuente` tienen `avisoSeguridad: true`. Cuando el ciudadano las selecciona, `PasoCategoria.jsx` muestra un aviso: *"Esto no es una denuncia policial. Si es una emergencia, llama al 133. Para denuncia anónima, usa Denuncia Segura (\*4242)."* — decisión deliberada de **no** agregar categorías para delitos en curso/emergencias (no reemplazar canales reales de ayuda urgente).

`agruparCategorias(categorias)` — helper compartido (usado en `PasoCategoria.jsx` y en los filtros de los dashboards de funcionario) que agrupa el catálogo plano en `[{nombre, items}]` preservando el orden, para renderizar `<optgroup>`.

## 10. Persistencia offline (`src/utils/colaOffline.js`, `src/hooks/useSincronizacionOffline.js`)

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

## 11. Vista Ciudadano — wizard de 3 pasos (`src/components/ciudadano/`)

1. **PasoUbicacion.jsx** — **tres formas de fijar la ubicación** (ver §37): botón GPS automático, **buscador de direcciones escritas** (`BuscadorDireccion.jsx`, 09-ago-2026) y **mapa interactivo** (`MapaSeleccionUbicacion.jsx`) donde el ciudadano puede tocar/arrastrar para fijar la ubicación a mano. Toggle "Ver satelital" (Esri World Imagery) / "Ver calles" (OSM) abajo a la derecha del mapa.
2. **PasoCategoria.jsx** — select agrupado de 58 categorías, aviso de seguridad condicional, "¿Dónde exactamente?" (placeholder rural: *"Ej: Pasando el puente, frente a la escuela"*; llega prellenado con la dirección del punto marcado, ver §37.5), "Cuéntanos qué pasa". Los dos campos de texto son obligatorios desde §29.
3. **PasoFoto.jsx** — hasta **3 fotos opcionales** (`fotos_antes_urls: string[]`, antes era una sola `foto_antes_url: string` — ver migración de esquema más abajo) + checkbox **"Quiero que me avisen cuando resuelvan mi reporte"** (31-jul-2026, antes decía "Quiero dejar mis datos de contacto (opcional)" — se reformuló para que quede explícito el motivo de dejar los datos) con una advertencia visible en ámbar: *"sin tu RUT y un WhatsApp o correo, no vamos a poder avisarte cuando se resuelva tu problema"*. Al marcarlo, revela "Tu nombre" / **"Tu RUT"** (nuevo) / "WhatsApp o correo". **La app sigue siendo 100% anónima por defecto** — nada de esto es obligatorio, es una decisión explícita del usuario tras pedir en un principio que el RUT fuera obligatorio y decidir después no hacerlo así.

`FormularioCiudadano.jsx` orquesta los 3 pasos, mantiene `coordenadas` como estado editable (sincronizado desde el hook GPS pero también sobreescribible por clicks en el mapa), y maneja el envío (ver §10).

**`src/utils/rut.js`** (nuevo): `esRutValido(rut)` (módulo 11, dígito verificador), `formatearRut(rut)`, `limpiarRut(rut)`. El campo RUT es opcional, pero si el ciudadano escribe algo, se valida — el botón "Enviar reporte" queda deshabilitado con un RUT inválido (a diferencia del resto de los campos de este paso, que nunca bloquean el envío).

**Migración de esquema — fotos múltiples (31-jul-2026)**: `incidencias.foto_antes_url: string` pasó a ser `incidencias.fotos_antes_urls: string[]` (0 a 3), mismo cambio en `tickets_publicos`. ⚠️ **Esta migración vino con un bug que dejó a los funcionarios sin ver ninguna foto hasta el 09-ago-2026 — ver §38.** `crearIncidencia` ahora sube cada foto por separado en segundo plano y las agrega con `arrayUnion` (pueden terminar en cualquier orden). Se creó `src/components/common/GaleriaFotos.jsx` (fila de miniaturas con scroll horizontal) para no repetir el render en cada panel — se actualizaron `TarjetaIncidencia.jsx`, `PanelGestionDepartamento.jsx`, `PanelAsignacion.jsx`, `DetalleTarea.jsx`, `PopupVotoIncidencia.jsx` y `AvisoPosibleDuplicado.jsx` (estos dos últimos y `TarjetaIncidencia.jsx` muestran solo la primera foto + "+N" por espacio, los paneles de gestión muestran la galería completa). La foto "después" (`foto_despues_url`, la que sube la cuadrilla al resolver) **sigue siendo una sola** — no se pidió cambiarla.

**Decisión de privacidad**: `nombre_ciudadano`/`contacto_ciudadano`/`rut_ciudadano` se muestran en `PanelAsignacion.jsx` (Dashboard Alcalde) y en `PanelGestionDepartamento.jsx` (Dashboard Jefe de Departamento) — **nunca** en `DetalleTarea.jsx`/`TarjetaTarea.jsx` (Cuadrilla Terreno), porque la cuadrilla no necesita el contacto para el trabajo físico. Firestore Rules no puede ocultar campos por rol dentro de un mismo doc, así que esto es una decisión de UI, no de seguridad. **`rut_ciudadano` NUNCA se escribe en `tickets_publicos`** (colección de lectura pública) — ver "Consulta de tickets por RUT" en §15 para el motivo.

## 12. Dashboard General (`src/pages/DashboardGeneralPage.jsx`) — solo ALCALDE_ADMIN

**"Modo Dios"**: ve y gestiona todas las incidencias del municipio, de todos los departamentos. Antes se llamaba `DashboardPage.jsx` y el rol era `ADMIN` — ver RBAC en §5.

Layout: **`ResumenGastoMensual.jsx`** (KPI financiero, ver §17) + fila de **`MetricasPorDepartamento.jsx`** arriba (nueva, 30-jul-2026) + mapa/lista (`MapaIncidencias.jsx` / `ListaIncidencias.jsx` → `TarjetaIncidencia.jsx`, con badges de estado y gravedad) — **60%/40% lado a lado en desktop, apilados en columna (mapa arriba con altura fija `45vh`, lista abajo con scroll) en mobile** (`md:flex-row`, breakpoint Tailwind por defecto). Arreglado el 31-jul-2026: antes el layout era fijo 60/40 sin importar el ancho de pantalla, y el header no envolvía — ambos se cortaban horizontalmente en celular (reportado por el usuario con capturas). El header ahora usa `flex-wrap`.

### Métricas por departamento (`src/components/dashboard/MetricasPorDepartamento.jsx`)
Tarjetas horizontales, una por cada uno de los 7 `DEPARTAMENTOS` (§8), ordenadas de más a menos atraso: cuenta de tickets sin resolver (Pendiente + En Proceso), desglose Pendientes/En proceso, y un aviso en rojo si hay incidencias de gravedad Alta sin resolver. Calculado sobre el mismo array de `incidencias` que ya suscribe la página (sin queries nuevas) y **a propósito independiente de los filtros de abajo** — es la vista comparativa para que el Alcalde fiscalice qué departamento está atrasado, no debe cambiar si está mirando un departamento en particular en el mapa. **Cada tarjeta es clicable** (31-jul-2026): abre `ModalTrabajadoresDepartamento.jsx` en modo solo lectura — ver el roster de trabajadores de ese departamento en §17.

**Filtros** (aplican a mapa Y lista juntos, no a las métricas de arriba): gravedad (pills Todas/Alta/Media/Baja), categoría (select agrupado), cuadrilla (select con `municipio.cuadrillas`), **departamento** (select con `DEPARTAMENTOS`, ver §8). La lista además siempre se acota a `estado==='Pendiente'` (es la cola de trabajo), ordenada por gravedad (Alta primero).

Al hacer clic en un pin o tarjeta: el mapa **vuela automáticamente** hasta esa ubicación (`CentradorMapa` interno en `MapaIncidencias.jsx`, usa `useMap().flyTo`), y se abre `PanelAsignacion.jsx` con: categoría, badges, `EnlaceGoogleMaps.jsx` (link a `https://www.google.com/maps?q=lat,lng`), detalles, contacto del ciudadano (si no es anónimo), foto, y el selector de cuadrilla + botón "Asignar cuadrilla". El Alcalde **solo asigna** (no marca resuelto — eso es del Jefe de Departamento o Terreno) — mismo comportamiento que antes de RBAC, sin cambios.

**Tabs** en el header: "Mapa" / "Estadísticas Rápidas" (mismo `/dashboard/general`, sin cambiar de ruta).

### Estadísticas Rápidas (`src/components/dashboard/EstadisticasRapidas.jsx`)
Recibe el mismo array de `incidencias` que ya suscribe `DashboardGeneralPage` (sin queries nuevas). Selector de período (Este mes / Mes pasado / Últimos 3 meses / Todo el tiempo). Muestra: tarjetas Total / Pendientes / En proceso / Resueltas (con %), y gráfico de barras (Recharts) del desglose por gravedad usando `COLOR_POR_GRAVEDAD`. Guard obligatorio para `fecha_creacion` transitoriamente `null`.

`DashboardGeneralPage` está cargado con `React.lazy` en `App.jsx` — `recharts` no se descarga en el flujo del ciudadano.

## 13. Dashboard Departamento (`src/pages/DashboardDepartamentoPage.jsx`) — solo JEFE_DEPARTAMENTO

**Nuevo (30-jul-2026), parte del RBAC (§5).** Mismo layout responsive que el Dashboard General (§12: 60%/40% lado a lado en desktop, apilado en mobile) pero **sin la fila de métricas ni el filtro de departamento** — porque ya viene acotado a `perfil.departamento` desde el vamos: `incidencias.filter((inc) => inc.departamento === perfil.departamento)` se aplica ANTES que cualquier otro filtro, así que este dashboard físicamente nunca puede mostrar incidencias de otro departamento (y `firestore.rules` refuerza lo mismo del lado servidor para las escrituras — ver §18). Botón **"Mi equipo"** en el header (31-jul-2026): abre `ModalTrabajadoresDepartamento.jsx` en modo edición para `perfil.departamento` — ver roster de trabajadores en §17.

A diferencia del Dashboard General, la cola "Por hacer" acá incluye tanto `Pendiente` como `En Proceso` (todo lo que no esté `Resuelto`), porque el Jefe de Departamento cubre el ciclo completo, no solo la asignación.

### `src/components/dashboard/PanelGestionDepartamento.jsx`
Combina lo que en los otros roles está separado en dos paneles (`PanelAsignacion.jsx` del Alcalde y `DetalleTarea.jsx` de Terreno):
- Si `estado === 'Pendiente'`: selector de cuadrilla + botón "Asignar cuadrilla" — abre `ModalPresupuesto.jsx` (ver §17), no asigna directo.
- Si `estado === 'En Proceso'`: muestra el presupuesto guardado + foto de término opcional + inputs obligatorios de horas reales/costo final + botón "Marcar como Resuelto" (llama `marcarResuelto`).
- Si `estado === 'Resuelto'`: mensaje de confirmación, sin acciones.

**Verificado end-to-end en producción** con una cuenta de prueba real `JEFE_DEPARTAMENTO` / `Aseo y Ornato` — ver §5.

## 14. Vista Cuadrilla Terreno (`src/pages/CuadrillaPage.jsx`) — TERRENO o ALCALDE_ADMIN

Lista de incidencias en estado "En Proceso" del tenant. `DetalleTarea.jsx`: muestra categoría, badges, `EnlaceGoogleMaps`, detalles, foto reportada, foto de término opcional (no bloquea el cierre si Cloudinary falla), inputs obligatorios de horas reales/costo final (ver §17), y botón "Marcar como Resuelto".

## 15. Consulta pública de ticket (`/estado`, sin login)

**Implementado y verificado end-to-end en producción** (creación → `/estado` → asignar cuadrilla → marcar resuelto, cada paso confirmado leyendo `/estado` después).

Colección nueva `tickets_publicos/{numero_ticket}` — el **ID de documento es el propio `numero_ticket`**, con solo campos no sensibles:
```js
{
  incidencia_id: string,     // referencia interna, no sensible
  municipio_id: string,
  categoria: string,
  nivel_gravedad: 'Alta'|'Media'|'Baja'|null,
  estado: 'Pendiente'|'En Proceso'|'Resuelto',
  coordenadas: {lat: number, lng: number} | null,  // agregado para el mapa de reportes activos (ver §16)
  upvotes: number,           // agregado para agrupación estilo Waze (ver §16)
  fotos_antes_urls: string[], // hasta 3, se sincroniza vía arrayUnion cuando incidenciasService.js termina de subir cada foto (ver §11)
  fecha_creacion: Timestamp,
  fecha_cierre: Timestamp|null,
}
```
Excluidos a propósito: direccion_texto, detalles_adicionales, nombre/contacto/**RUT** del ciudadano, cuadrilla_asignada. `coordenadas` sí se expone (a diferencia del diseño original) porque el mapa de reportes activos (§16) necesita ubicarlos — sigue sin exponer datos que identifiquen a la persona.

**Consulta de tickets por RUT (31-jul-2026)** — `ConsultaTicketPage.jsx` ahora tiene dos modos (tabs "Por número de ticket" / "Por mi RUT"):
- **Por número de ticket**: como siempre, consulta directa a `tickets_publicos` — funciona desde cualquier dispositivo.
- **Por mi RUT**: **el RUT nunca se manda al servidor.** `/estado` es de lectura pública sin login — si guardáramos el RUT en `tickets_publicos` para poder buscarlo, cualquiera podría probar RUTs al azar (el espacio de RUTs chilenos válidos es lo bastante chico para ser adivinable con paciencia) y ver qué vecino reportó qué. En su lugar, `src/utils/dispositivo.js` guarda un índice `{rut → [números de ticket]}` **en el `localStorage` del mismo celular** que se usó para reportar (`registrarTicketPorRut`/`buscarTicketsPorRutLocal`) — al buscar, se lee ese índice local para saber qué números de ticket corresponden a ese RUT, y **recién ahí** se consulta el estado real de esos tickets contra `tickets_publicos` (dato público, sin problema). Limitación aceptada y comunicada en la UI: si el vecino cambia de celular o borra los datos del navegador, no lo va a encontrar por RUT — solo por el número de ticket que ya se le mostró al crear el reporte.

**Mecanismo de unicidad real** (`generarNumeroTicket()` solo tiene ~65536 combinaciones/día): Firestore clasifica un `setDoc` sobre un doc que ya existe como `update`, no `create`, sin importar el método usado en el cliente. Como no hay `allow update` para anónimos en `tickets_publicos`, un intento de crear un ticket con un número ya usado por OTRO reporte es rechazado con `permission-denied` — ese rechazo es el mecanismo de unicidad, no hace falta transacción.

**`src/services/ticketsPublicosService.js`:**
- `registrarTicketPublico({numeroTicket, incidenciaId, municipioId, categoria, nivelGravedad, esRetry})` — `setDoc` create-only. Si falla con `permission-denied` y `esRetry` es `true` (reintento de la cola offline con el mismo `numeroTicketExistente`), asume que el doc ya lo creó el intento original y no relanza el error; si `esRetry` es `false`, relanza para que `crearIncidencia` regenere el número.
- `buscarTicketPublico(numeroTicket)` — `getDoc`, normaliza el input (`trim().toUpperCase()`), devuelve `null` si no existe.
- `actualizarEstadoTicketPublico(numeroTicket, cambios)` — `updateDoc` best-effort (no bloquea si falla), llamado desde `asignarCuadrilla` y `marcarResuelto`.

**`src/pages/ConsultaTicketPage.jsx`** (ruta `/estado`) — buscador de ticket + tarjeta de resultado (categoría, `BadgeEstado`, `BadgeGravedad`, fecha de creación/cierre). Sin tenant en la URL: el ticket público ya trae su propio `municipio_id`, así que sirve para cualquier municipalidad. Enlaces de entrada desde `LandingPage.jsx` y `TicketConfirmacion.jsx`.

## 16. Agrupación de reportes estilo Waze (upvotes + detección de duplicados)

**Implementado y verificado end-to-end en producción** (crear reporte cerca de uno existente → aviso de duplicado → "Sumarme" → voto reflejado; también voto directo desde el popup del mapa; bug de doble voto encontrado y corregido durante la prueba).

**Objetivo**: evitar reportes duplicados de un mismo problema físico (ej. 5 vecinos reportando el mismo bache) fusionándolos en un solo ticket con contador de apoyo, en vez de crear incidencias separadas.

**Identidad de dispositivo sin login** (`src/utils/dispositivo.js`): como el ciudadano nunca se autentica, se genera un UUID y se guarda en `localStorage` (`obtenerIdDispositivo()`, get-or-create) para saber qué reportes ya votó este dispositivo (`yaVotoPorIncidencia(incidenciaId)` / `registrarVotoLocal(incidenciaId)`, contra una lista `incidencias_votadas` también en `localStorage`). Es solo una ayuda de UX (evita mostrar "votar" dos veces en el mismo navegador) — la verdad de quién votó vive en `incidencias.usuarios_afectados` en Firestore.

**Chequeo de proximidad al reportar** (`src/utils/distancia.js`, fórmula de Haversine — `distanciaMetros(a, b)`): `FormularioCiudadano.jsx` se suscribe a los tickets activos del municipio (`suscribirTicketsActivos`, acotada — ver §26) y, al pasar del paso de ubicación, busca uno de la **misma categoría** a **menos de 50 metros** (`RADIO_DUPLICADO_METROS`). Si encuentra uno, no avanza al paso siguiente — muestra `AvisoPosibleDuplicado.jsx` con la tarjeta del ticket existente y dos opciones: "Sumarme a este reporte" o "Crear uno nuevo de todas formas" (el ciudadano siempre puede decidir que es un problema distinto).

**Mapa de reportes activos**: `MapaSeleccionUbicacion.jsx` ahora recibe los tickets cercanos y dibuja un pin por cada uno (coloreado por `nivel_gravedad`, mismo esquema que el resto de la app) mientras el ciudadano elige su ubicación, con `PopupVotoIncidencia.jsx` como contenido del popup: categoría, `BadgeEstado`, `BadgeGravedad`, foto si existe, contador de apoyos, y un botón "+1" para votar directo desde el mapa sin pasar por el flujo de creación.

**Votar / sumarse a un reporte existente** — `votarIncidencia({incidenciaId, numeroTicket, dispositivoId})` en `incidenciasService.js`: incrementa `incidencias.upvotes` (`increment(1)`) y agrega el `dispositivoId` a `incidencias.usuarios_afectados` (`arrayUnion`), y en paralelo actualiza `tickets_publicos.{numeroTicket}.upvotes` (fire-and-forget, vía `incrementarUpvotesTicketPublico` en `ticketsPublicosService.js`). Tras votar, `TicketConfirmacion.jsx` muestra una variante "¡Te sumaste al reporte!" (ícono pulgar arriba) en vez de la confirmación de ticket nuevo.

**Reglas (`firestore.rules`, ver §18)** — `esVotoValidoIncidencia(antes, despues)`: permite `update` anónimo (`request.auth == null`) sobre `incidencias` **solo si** el diff toca exclusivamente `['upvotes', 'usuarios_afectados']`, `upvotes` sube en exactamente 1, y `usuarios_afectados` crece en exactamente 1 elemento — así un ciudadano sin sesión puede votar pero no puede tocar `estado`, `departamento`, ni ningún otro campo. `tickets_publicos` tiene la regla espejo (solo `upvotes +1`).

**Bug real encontrado y corregido durante la prueba — doble voto**: si el mismo dispositivo ya había votado por una incidencia (ej. desde el popup del mapa) y luego intentaba "Sumarme" de nuevo desde el flujo de duplicado, `arrayUnion` con un ID ya presente es un no-op en Firestore — `usuarios_afectados.size()` no crecía en 1, así que `esVotoValidoIncidencia` rechazaba la escritura con `permission-denied`. **Corregido** agregando un guard `yaVotoPorIncidencia(...)` en `manejarSumarseAExistente` (`FormularioCiudadano.jsx`) que, si el dispositivo ya votó, salta directo a la pantalla de confirmación sin volver a escribir en Firestore.

## 17. Órdenes de Trabajo y Costeo (presupuesto estimado + gasto real)

**Implementado el 31-jul-2026.** Permite presupuestar antes de asignar cuadrilla y registrar el gasto real al cerrar, para que el Alcalde tenga control financiero de las incidencias resueltas.

**Renombre de estado**: lo que antes era `'Asignado'` ahora es **`'En Proceso'`** — mismo paso del flujo de siempre (`Pendiente → En Proceso → Resuelto`), no se agregó un estado nuevo. Se renombró (no solo internamente: también el string que ve el ciudadano en `/estado` y en `BadgeEstado`) porque describe mejor el momento en que ya hay presupuesto y cuadrilla, pero el trabajo todavía no termina.

**Esquema** (ver también §6): `incidencias.presupuesto_estimado` (`personal_requerido`, `trabajadores_asignados`, `horas_estimadas`, `materiales`, `costo_aprox`) y `incidencias.gasto_real` (`horas_reales`, `costo_final`) — ambos `null` hasta que corresponde llenarlos, mismo patrón que `fecha_cierre`. `fecha_asignacion` (nuevo) se guarda siempre que se asigna cuadrilla (Alcalde o Jefe), para poder calcular el "tiempo de reacción".

**Quién presupuesta — decisión de diseño**: solo el **Jefe de Departamento**. Cuando el Alcalde asigna cuadrilla desde el Dashboard General (`PanelAsignacion.jsx`), sigue funcionando exactamente igual que antes, sin presupuesto — `presupuesto_estimado` queda en `null` en ese caso. El control de costos vive a nivel de departamento, no a nivel municipal completo.

**`src/components/common/Modal.jsx`** (nuevo): overlay + tarjeta centrada, genérico — primer modal de la app, reutilizable para lo que venga después.

**`src/components/dashboard/ModalPresupuesto.jsx`**: formulario de presupuesto, validado antes de habilitar "Guardar y asignar cuadrilla". Se abre desde `PanelGestionDepartamento.jsx` al hacer clic en "Asignar cuadrilla" — **ya no asigna directo**: el ticket solo pasa a "En Proceso" cuando se guarda el modal (llama a `asignarCuadrilla` con el presupuesto incluido). Si se cierra el modal sin guardar, la incidencia sigue en "Pendiente". **Actualizado el 31-jul-2026** para elegir personal específico en vez de solo un número:
- Se suscribe al roster del propio departamento (`suscribirTrabajadores`, reutiliza el servicio de §17) y muestra checkboxes con nombre, cargo y tarifa/hora de cada trabajador.
- `personal_requerido` ya no se escribe a mano: es `trabajadores_asignados.length`.
- El costo de mano de obra se **calcula automático** (suma de `tarifa_hora` de los seleccionados × horas estimadas) y se muestra como referencia — no reemplaza el campo `costo_aprox` (que el Jefe sigue estimando a ojo como total), son dos números mostrados por separado a propósito (decisión del usuario: "materiales" sigue siendo descripción libre sin monto propio, así que separar totalmente costo_aprox en mano de obra + materiales habría exigido inventar un monto de materiales que no se pidió).

**`asignarCuadrilla(incidencia, cuadrilla, presupuestoEstimado?)`** (`incidenciasService.js`, firma actualizada): el tercer parámetro es opcional — lo manda `PanelGestionDepartamento.jsx` (Jefe), no lo manda `PanelAsignacion.jsx` (Alcalde).

**Gasto real al cerrar — decisión de diseño**: queda **fijo** una vez guardado (no hay pantalla para corregirlo después). Tanto `DetalleTarea.jsx` (Terreno) como la sección "En Proceso" de `PanelGestionDepartamento.jsx` (Jefe, cuando resuelve directo) agregan dos inputs **obligatorios** — "Horas reales trabajadas" y "Costo final de materiales usados" — que bloquean el botón "Marcar como Resuelto" hasta llenarse. `marcarResuelto(incidencia, fotoDespues, gastoReal)` (firma actualizada) ahora exige el tercer parámetro. El equipo asignado NO se vuelve a elegir al cerrar — se asume que sigue siendo el mismo grupo que quedó guardado en `presupuesto_estimado.trabajadores_asignados` al momento de asignar (no hay forma de reflejar cambios de personal a mitad de trabajo; se dejó fuera a propósito).

**`src/utils/tiempo.js`** (nuevo): `formatearFecha(timestamp)` y `formatearDuracion(desde, hasta)` (ej. "2h 15min", "1d 4h"), compartidas entre `PanelGestionDepartamento.jsx` y `DetalleTarea.jsx` para mostrar "Ingresado: ..." y "Tiempo de reacción: ..." (`fecha_creacion` → `fecha_asignacion`).

**Qué se ve en el panel de una incidencia** (`PanelGestionDepartamento.jsx`, y una versión reducida en `DetalleTarea.jsx`): tiempo de ingreso de la solicitud, tiempo de reacción (una vez asignada), nombres del personal asignado (`trabajadores_asignados`), horas estimadas/reales, costo de mano de obra **calculado** (tarifa de cada persona asignada × horas, mostrado por separado tanto en la etapa "En Proceso" como en "Resuelto"), descripción de materiales, y el costo total a ojo (`costo_aprox`/`costo_final`).

**`src/components/dashboard/ResumenGastoMensual.jsx`** (en `DashboardGeneralPage.jsx`, solo Alcalde): KPI que suma `gasto_real.costo_final` de todas las incidencias `Resuelto` cuya `fecha_cierre` cae en el mes calendario actual, formateado en CLP (`Intl.NumberFormat('es-CL')`). Se calcula sobre el mismo array de `incidencias` que ya suscribe el Dashboard — sin queries nuevas, mismo patrón que `MetricasPorDepartamento`. **Filtro de departamento agregado el 31-jul-2026**: un `<select>` propio de esta tarjeta ("Todos los departamentos" o uno específico) que acota la suma — a propósito **independiente** del filtro de departamento del mapa/lista de abajo, mismo criterio de aislamiento que ya tenía `MetricasPorDepartamento` frente a esos filtros.

**Gasto por departamento en las tarjetas (31-jul-2026)**: cada tarjeta de `MetricasPorDepartamento.jsx` ahora también muestra "Gasto este mes: $X" — mismo cálculo que `ResumenGastoMensual` (`gasto_real.costo_final` de `Resuelto` del mes actual) pero acotado a ESE departamento, sin necesidad de abrir el modal ni tocar el filtro de la tarjeta de arriba. `esDelMesActual(timestamp)` se extrajo a `src/utils/tiempo.js` (antes vivía duplicada solo en `ResumenGastoMensual.jsx`) para que ambos componentes usen el mismo criterio de "mes actual".

**`src/utils/costeo.js`** (nuevo): `calcularCostoManoObra(trabajadoresAsignados, horas)` — la misma fórmula que antes vivía solo dentro de `PanelGestionDepartamento.jsx`, extraída para reutilizarla también en `ModalDetalleGasto.jsx` (ver abajo).

**`src/components/dashboard/ModalDetalleGasto.jsx`** (nuevo, 31-jul-2026): detalle línea por línea de "en qué se gastó", no solo el total. Se abre con el link **"Ver detalle"** al lado del monto en `ResumenGastoMensual.jsx`, y respeta el mismo filtro de departamento de esa tarjeta. Por cada incidencia `Resuelto` del mes (en el filtro activo) muestra: categoría, fecha de cierre, **horas hombre utilizadas** (`gasto_real.horas_reales`), personal que trabajó en ella (nombres, de `trabajadores_asignados`), **costo de mano de obra calculado** (`calcularCostoManoObra`), descripción de materiales, y el costo final total — más una fila de totales (horas hombre, mano de obra, gasto total) arriba de la lista.

**Riesgo aceptado, sin resolver todavía**: el `costo_final` que alimenta el KPI del Alcalde lo escribe el Terreno (o el Jefe) en un input libre, sin revisión posterior — es una decisión consciente de mantener la v1 simple, no un descuido. Si en algún momento se necesita más confianza en el dato, la mejora natural es una pantalla donde el Jefe de Departamento pueda corregir `gasto_real` después del cierre.

**`firestore.rules`**: sin cambios — las reglas ya vigentes (`puedeGestionarIncidencia`, ver §18) permiten que cualquier funcionario autorizado escriba cualquier campo de la incidencia; no se agregó validación de forma para `presupuesto_estimado`/`gasto_real` (mismo nivel de validación que `cuadrilla_asignada`, que tampoco se valida en las reglas).

### Roster de trabajadores y asistencia (`trabajadores/{id}`)

**Implementado el 31-jul-2026**, a partir de un pedido del usuario para que las tarjetas de `MetricasPorDepartamento.jsx` fueran clicables y mostraran cuántos trabajadores tiene cada departamento, quién asistió (verde/rojo) y quién está disponible vs. designado. Antes de implementar se preguntó y el usuario decidió explícitamente:
- **Modelo simple, sin cuenta de acceso por trabajador** (en vez de vincularlo a cuentas reales de rol `TERRENO`) — mismo espíritu que `cuadrillas` (array de strings en `municipalidades/{slug}`), pero como colección propia porque cada trabajador necesita más campos y estado mutable día a día.
- **El Jefe de Departamento pasa lista** (en vez de que cada trabajador se marque a sí mismo desde su celular — eso habría requerido darle cuenta y login a cada uno).

**Esquema `trabajadores/{id}`:**
```js
{
  nombre: string,
  cargo: string,               // texto libre, ej "Operario", "Chofer", "Supervisor"
  tarifa_hora: number,         // CLP por hora — decisión del usuario: cada trabajador tiene SU PROPIA tarifa
                                // (no una tarifa única por ticket), usada para calcular costo de mano de obra
                                // al asignarlo a una incidencia (ver ModalPresupuesto.jsx más abajo)
  departamento: string,        // uno de DEPARTAMENTOS (§8)
  municipio_id: string,
  presente_hoy: boolean | null,  // null = todavía no se pasó lista hoy
  fecha_asistencia: string,      // "YYYY-MM-DD" del último marcado
  disponible: boolean,
  asignado_a: string,          // texto libre, solo relevante si disponible == false
  fecha_creacion: Timestamp,
}
```
**Reseteo diario sin cron**: no hay Cloud Functions (Blaze no activo, ver §19), así que no se puede "resetear" `presente_hoy` a medianoche con un job. En su lugar, `fecha_asistencia` guarda la fecha del último marcado, y la UI (`ModalTrabajadoresDepartamento.jsx`) compara contra la fecha de hoy al renderizar: si no coincide, se muestra "Sin marcar hoy" sin importar qué diga `presente_hoy` de un día anterior — el dato viejo nunca se borra, solo se ignora visualmente hasta que se vuelve a marcar.

**`src/services/trabajadoresService.js`**: `suscribirTrabajadores(callback, municipioId, departamento)`, `suscribirTrabajadoresMunicipio(callback, municipioId)` (nuevo, sin acotar por departamento — una sola suscripción para las 7 tarjetas de `MetricasPorDepartamento.jsx` en vez de 7 separadas, agrupado en memoria), `crearTrabajador(...)`, `marcarAsistencia(id, presente)`, `actualizarDisponibilidad(id, disponible, asignadoA?)`, `eliminarTrabajador(id)`.

**`src/components/dashboard/ModalTrabajadoresDepartamento.jsx`** (nuevo): un solo componente, dos modos vía prop `soloLectura`:
- **Alcalde** (`soloLectura=true`): se abre al hacer clic en cualquier tarjeta de `MetricasPorDepartamento.jsx` (ahora son `<button>`, antes eran `<div>` no interactivos). Ve conteo total/presentes/ausentes y badges de estado por persona, sin controles de edición.
- **Jefe de Departamento** (`soloLectura=false`, por defecto): se abre con el botón **"Mi equipo"** nuevo en el header de `DashboardDepartamentoPage.jsx`. Puede agregar/quitar trabajadores, marcar presente/ausente con un clic (llama `marcarAsistencia` de inmediato, sin botón "guardar" — pensado para pasar lista rápido cada mañana), y marcar disponible/designado (si "Designado", pide un texto libre opcional de a qué).

**Tarjetas rediseñadas (31-jul-2026)**: cada tarjeta de `MetricasPorDepartamento.jsx` ahora también muestra, sin abrir el modal: ícono del departamento (`lucide-react`, ej. `HardHat` para DOM, `Shield` para Seguridad Ciudadana), `N/M presentes` (trabajadores presentes hoy / total del equipo), y `X en terreno` (cuadrillas distintas con al menos un ticket "En Proceso" en ese departamento, contadas por `cuadrilla_asignada` únicos). Todo calculado sobre datos ya suscritos (incidencias + la nueva suscripción de trabajadores del municipio completo), sin queries nuevas por tarjeta.

**Ubicación de cuadrillas — manual, no GPS real (implementado el 31-jul-2026)**: el usuario pidió ver dónde está cada cuadrilla, con un botón para la ubicación exacta. Se implementó la opción manual (no GPS en vivo — chocaría con la decisión de §17 de que los trabajadores no tienen cuenta ni dispositivo propio reportando posición):
- Nueva colección `ubicaciones_cuadrilla/{municipioId}__{cuadrilla}` (ID determinístico: actualizar sobrescribe, no acumula histórico) — `{municipio_id, cuadrilla, coordenadas, actualizado_en}`.
- **`src/services/ubicacionesCuadrillaService.js`** (nuevo): `suscribirUbicacionesCuadrilla(callback, municipioId)`, `actualizarUbicacionCuadrilla({municipioId, cuadrilla, coordenadas})`.
- **El Jefe de Departamento la marca** desde `PanelGestionDepartamento.jsx`, en la sección "En Proceso" de un ticket: botón "Marcar/Actualizar ubicación de la cuadrilla" que despliega inline el mismo mapa "tocar para marcar" que ya usa el ciudadano (`MapaSeleccionUbicacion.jsx`, reutilizado tal cual, sin cambios) — cada toque guarda de inmediato (mismo patrón sin botón "guardar" separado que la asistencia en §17).
- **El Alcalde la ve** (solo lectura) en `ModalTrabajadoresDepartamento.jsx`, en una sección nueva "Cuadrillas en terreno" — lista las cuadrillas con algún ticket "En Proceso" en ese departamento (prop `cuadrillasActivas`, calculada en `MetricasPorDepartamento.jsx` a partir de `cuadrilla_asignada` únicos) y, si hay ubicación marcada, el link clicable **"Ver ubicación exacta en Google Maps"** (`EnlaceGoogleMaps.jsx`, el mismo componente que ya se usa para la ubicación de cada incidencia — reutilizado sin cambios).
- **`firestore.rules`** (colección `ubicaciones_cuadrilla`, ver §18): lee cualquier funcionario del municipio; escribe solo `JEFE_DEPARTAMENTO` (de cualquier departamento — las cuadrillas no están acotadas a uno solo en el modelo actual).

**`firestore.rules`** (colección `trabajadores`, ver §18): a diferencia de incidencias, **solo el Jefe de Departamento de ESE departamento** puede crear/editar/eliminar (`puedeGestionarTrabajador`) — ni el Alcalde ni el Jefe de otro departamento pueden escribir, aunque cualquier funcionario del mismo municipio puede leer (`allow read: if esDelMismoMunicipio(...)`, sin acotar por departamento — así el Alcalde ve cualquier tarjeta).

**Vínculo con incidencias específicas (agregado el 31-jul-2026)**: a diferencia de la v1 (donde "disponible/designado" era un estado suelto que el Jefe marcaba a mano, sin relación con ningún ticket), ahora `ModalPresupuesto.jsx` sí permite elegir personas concretas del roster al asignar cuadrilla, guardadas como snapshot en `incidencias.presupuesto_estimado.trabajadores_asignados` (ver más arriba en esta sección). Sigue **sin ser automático**: marcar a alguien "disponible" o "designado" en `ModalTrabajadoresDepartamento.jsx` ("Mi equipo") es independiente de si esa persona está en `trabajadores_asignados` de algún ticket — el Jefe tiene que actualizar ambos lugares a mano si quiere que coincidan. Automatizar eso (que asignar a alguien a un ticket lo marque "designado" solo) queda como mejora futura.

## 18. Reglas de seguridad (`firestore.rules`) — contenido actual completo

Regenerado desde el archivo real el 01-ago-2026 (agrega `esCalificacionValida` y la subcolección `seguimientos` respecto de la versión anterior — ver §24):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function perfilFuncionario() { return get(/databases/$(database)/documents/usuarios_municipales/$(request.auth.uid)).data; }
    function esFuncionarioAutenticado() { return request.auth != null && exists(/databases/$(database)/documents/usuarios_municipales/$(request.auth.uid)); }
    function esAlcalde() { return esFuncionarioAutenticado() && perfilFuncionario().rol == 'ALCALDE_ADMIN'; }
    function esDelMismoMunicipio(municipioId) { return esFuncionarioAutenticado() && perfilFuncionario().municipio_id == municipioId; }
    function puedeGestionarIncidencia(incidenciaData) {
      return esDelMismoMunicipio(incidenciaData.municipio_id) &&
        (perfilFuncionario().rol != 'JEFE_DEPARTAMENTO' || perfilFuncionario().departamento == incidenciaData.departamento);
    }
    // Roster de trabajadores: a diferencia de incidencias, SOLO el Jefe de
    // Departamento de ESE departamento puede escribir (ni el Alcalde ni otro Jefe).
    function puedeGestionarTrabajador(trabajadorData) {
      return esDelMismoMunicipio(trabajadorData.municipio_id) &&
        perfilFuncionario().rol == 'JEFE_DEPARTAMENTO' &&
        perfilFuncionario().departamento == trabajadorData.departamento;
    }
    // Voto ciudadano ("+1", sin login): el update SOLO puede tocar upvotes y
    // usuarios_afectados, y ambos deben avanzar en exactamente 1.
    function esVotoValidoIncidencia(antes, despues) {
      return request.auth == null &&
        despues.diff(antes).affectedKeys().hasOnly(['upvotes', 'usuarios_afectados']) &&
        despues.upvotes == antes.get('upvotes', 1) + 1 &&
        despues.usuarios_afectados.size() == antes.get('usuarios_afectados', []).size() + 1;
    }
    // Foto del vecino que llega DESPUÉS de crear el reporte (sin login, ver §38):
    // SOLO fotos_antes_urls, agregando UNA URL de Cloudinary al final, hasta 3.
    // El concat() impide reordenar, pisar o borrar las fotos ya cargadas.
    function esFotoCiudadanoValida(antes, despues) {
      let previas = antes.get('fotos_antes_urls', []);
      let nuevas = despues.fotos_antes_urls;
      let agregada = nuevas.size() > 0 ? nuevas[nuevas.size() - 1] : '';
      return request.auth == null &&
        despues.diff(antes).affectedKeys().hasOnly(['fotos_antes_urls']) &&
        previas.size() < 3 && nuevas.size() == previas.size() + 1 &&
        nuevas == previas.concat([agregada]) &&
        agregada is string && agregada.size() <= 500 &&
        agregada.matches('https://res[.]cloudinary[.]com/.+');
    }
    // Calificación ciudadana (1-5, sin login, ver §24): SOLO calificacion_ciudadano,
    // solo si Resuelto, solo una vez (no se puede pisar una calificación ya puesta).
    function esCalificacionValida(antes, despues) {
      return request.auth == null &&
        despues.diff(antes).affectedKeys().hasOnly(['calificacion_ciudadano']) &&
        antes.estado == 'Resuelto' &&
        antes.get('calificacion_ciudadano', null) == null &&
        despues.calificacion_ciudadano is int &&
        despues.calificacion_ciudadano >= 1 && despues.calificacion_ciudadano <= 5;
    }

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
                      && (!('nivel_gravedad' in request.resource.data) || request.resource.data.nivel_gravedad in ['Alta','Media','Baja'])
                      && (!('departamento' in request.resource.data) || request.resource.data.departamento in [
                            'Dirección de Obras (DOM)', 'Tránsito', 'Operaciones',
                            'Aseo y Ornato', 'Medio Ambiente', 'Seguridad Ciudadana', 'Oficina de Partes'
                          ]);
      allow update: if puedeGestionarIncidencia(resource.data) || esVotoValidoIncidencia(resource.data, request.resource.data)
                      || esCalificacionValida(resource.data, request.resource.data)
                      || esFotoCiudadanoValida(resource.data, request.resource.data);
      allow delete: if esAlcalde() && esDelMismoMunicipio(resource.data.municipio_id);
    }

    // Seguimientos (ver §24): comentario/foto que el ciudadano agrega a un
    // reporte YA creado, sin login — acceso "a ciegas" igual que la calificación
    // (conoce incidenciaId porque tickets_publicos lo expone), solo escribe
    // (create), no puede leer lo que mandó ni lo de nadie más.
    match /incidencias/{incidenciaId}/seguimientos/{seguimientoId} {
      allow read: if esDelMismoMunicipio(get(/databases/$(database)/documents/incidencias/$(incidenciaId)).data.municipio_id);
      allow create: if request.auth == null
                      && request.resource.data.keys().hasOnly(['texto', 'foto_url', 'autor', 'fecha'])
                      && request.resource.data.autor == 'ciudadano'
                      && request.resource.data.texto is string && request.resource.data.texto.size() <= 1000
                      && request.resource.data.foto_url is string
                      && request.resource.data.fecha == request.time;
      allow update, delete: if false;
    }

    // tickets_publicos: alimenta /estado Y el mapa tipo Waze (pines + chequeo de
    // proximidad), por eso incluye coordenadas/foto (no identifican a nadie) pero
    // sigue sin nombre/contacto del ciudadano. El ID de documento es numero_ticket,
    // lo que hace que un create sobre un ticket ya existente sea clasificado como
    // "update" por Firestore — como no hay allow update para anónimos fuera del
    // voto, eso rechaza colisiones con permission-denied (mecanismo de unicidad).
    match /tickets_publicos/{ticketId} {
      allow get: if true;
      allow list: if true;   // antes "if false"; se necesita listar para el mapa ciudadano
      allow create: if request.resource.data.keys().hasAll(['incidencia_id','municipio_id','categoria','estado','fecha_creacion'])
                      && request.resource.data.estado == 'Pendiente'
                      && request.resource.data.categoria is string
                      && request.resource.data.municipio_id is string && request.resource.data.municipio_id.size() > 0
                      && exists(/databases/$(database)/documents/municipalidades/$(request.resource.data.municipio_id))
                      && (!('nivel_gravedad' in request.resource.data) || request.resource.data.nivel_gravedad in ['Alta','Media','Baja'])
                      && (!('coordenadas' in request.resource.data) || (request.resource.data.coordenadas.lat is number && request.resource.data.coordenadas.lng is number));
      // Funcionario del mismo municipio refleja cambios de estado; cualquier
      // ciudadano sin login puede votar "+1" (solo upvotes), reflejar su
      // calificación ya puesta en incidencias/{id} (solo una vez), o agregar la
      // URL de su foto cuando termina de subir (misma función que en incidencias).
      allow update: if esDelMismoMunicipio(resource.data.municipio_id) ||
                      esFotoCiudadanoValida(resource.data, request.resource.data) ||
                      (request.auth == null &&
                        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['upvotes']) &&
                        request.resource.data.upvotes == resource.data.get('upvotes', 1) + 1) ||
                      (request.auth == null &&
                        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['calificacion_ciudadano']) &&
                        resource.data.get('calificacion_ciudadano', null) == null &&
                        request.resource.data.calificacion_ciudadano is int &&
                        request.resource.data.calificacion_ciudadano >= 1 && request.resource.data.calificacion_ciudadano <= 5);
      allow delete: if false;
    }

    match /usuarios_municipales/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow read: if esAlcalde() && esDelMismoMunicipio(resource.data.municipio_id);
      allow create: if esAlcalde() && request.resource.data.municipio_id == perfilFuncionario().municipio_id
                      && request.resource.data.rol in ['JEFE_DEPARTAMENTO', 'TERRENO'];
      allow update, delete: if esAlcalde() && esDelMismoMunicipio(resource.data.municipio_id);
    }

    // trabajadores: lista simple sin cuenta de acceso propia (ver §17).
    match /trabajadores/{trabajadorId} {
      allow read: if esDelMismoMunicipio(resource.data.municipio_id);
      allow create: if esFuncionarioAutenticado()
                      && request.resource.data.municipio_id == perfilFuncionario().municipio_id
                      && perfilFuncionario().rol == 'JEFE_DEPARTAMENTO'
                      && perfilFuncionario().departamento == request.resource.data.departamento;
      allow update, delete: if puedeGestionarTrabajador(resource.data);
    }

    // ubicaciones_cuadrilla: ubicación manual, no GPS real (ver §17).
    match /ubicaciones_cuadrilla/{ubicacionId} {
      allow read: if esDelMismoMunicipio(resource.data.municipio_id);
      allow write: if esFuncionarioAutenticado()
                      && request.resource.data.municipio_id == perfilFuncionario().municipio_id
                      && perfilFuncionario().rol == 'JEFE_DEPARTAMENTO';
    }
  }
}
```

✅ **Desplegado y verificado end-to-end en producción (30-jul-2026)**: estas reglas (con el RBAC completo: `esAlcalde`, `puedeGestionarIncidencia` acotando por departamento) están publicadas en `https://console.firebase.google.com/project/app-incidencias-urbanas/firestore/rules`.

## 19. Estado real en Firebase (producción)

- **Proyecto**: `app-incidencias-urbanas`. El plan Blaze se intentó activar el 30-jul-2026 pero el municipio no cuenta con una tarjeta (ni débito ni crédito) — sin eso, Google no deja crear ni vincular una cuenta de Facturación de Cloud, así que **el proyecto sigue efectivamente en Spark (gratis)**. Firestore, Auth y Hosting no requieren Blaze, así que esto no afecta al resto de la app. Corrige una nota anterior de este documento que decía que Blaze ya estaba activo — no llegó a completarse.
- **Authentication**: habilitado (Correo/contraseña). Usuario real de Luis González, `municipio_id: "demo"`, `rol: "ALCALDE_ADMIN"` (migrado desde `"ADMIN"` el 30-jul-2026). Además hay una cuenta de prueba con `rol: "JEFE_DEPARTAMENTO"` / `departamento: "Aseo y Ornato"`, y al menos una cuenta creada vía la UI de autoservicio (`/dashboard/funcionarios`, ver §5) el 30-jul-2026 durante la verificación.
- **Firestore**: habilitado, con datos reales de prueba. Índices compuestos creados y habilitados: `(municipio_id ASC, fecha_creacion DESC)` y `(municipio_id ASC, estado ASC, fecha_creacion DESC)` sobre `incidencias`, y **los dos equivalentes sobre `tickets_publicos`** (agregados el 02-ago-2026 para las consultas acotadas, ver §26).
- **Storage (fotos): NO se usa Firebase Storage — se usa Cloudinary.** Firebase ahora exige Blaze (con tarjeta) incluso para crear el bucket gratuito, así que tras varios intentos fallidos de activar Blaze sin tarjeta (30-jul-2026), se migró la subida de fotos a **Cloudinary** (plan gratis, 25GB, no pide tarjeta para registrarse):
  - Cuenta Cloudinary del municipio: cloud name **`ugiblcuk`**, upload preset **`reporte_incidencias`** (modo **Unsigned** — permite que el ciudadano suba la foto "antes" sin login, sin exponer ninguna clave secreta, mismo patrón de acceso público que tenía Storage).
  - `src/services/storageService.js` se reescribió para subir a `https://api.cloudinary.com/v1_1/{cloud_name}/image/upload` vía `fetch` + `FormData`, con la misma firma `subirImagen(archivo, rutaCarpeta)` de antes — ningún otro archivo tuvo que cambiar (`incidenciasService.js` sigue igual).
  - Nuevas variables en `.env` / `.env.example`: `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`.
  - `firebase.js` conserva el export `storage` (Firebase Storage SDK) sin usar, por si algún día se activa Blaze y se quiere volver a Storage — `storage.rules` sigue en el repo pero **no está desplegado ni en uso**.
  - Verificado con una subida de prueba directa al endpoint de Cloudinary (Node, fuera del navegador) — respondió 200 con `secure_url` válida antes de darlo por bueno y desplegar.
- **Hosting**: ✅ **desplegado y en producción** — `https://app-incidencias-urbanas.web.app` (ver §22), con el build de RBAC (`/dashboard/general`, `/dashboard/departamento`) y la subida de fotos vía Cloudinary ya en línea. PWA básica activa: `manifest.json` + ícono propio (pin blanco sobre azul, generado por canvas, en `public/icons/`), `display: standalone`. Sin service worker (no se implementó — no era necesario para el manifest+ícono, solo para offline-caching del app shell, que es una mejora futura separada de la cola offline de reportes que ya existe).
- **`municipalidades/demo`**: creado con nombre "Municipalidad Demo", colores azul, centro en Santiago, 3 cuadrillas (Norte/Sur/Centro).
- **`.env`** tiene las credenciales reales del proyecto (`VITE_FIREBASE_*`, `VITE_CLOUDINARY_*`) y `VITE_USE_FIREBASE_EMULATORS=false`.
- **Datos de demo sembrados (31-jul-2026)**: los 7 departamentos tienen personal (6 trabajadores cada uno: 5 "Operario" a $3.500/hora + 1 "Jefe de Cuadrilla" a $4.300/hora, nombres genéricos, sin relación con personas reales) e incidencias variadas (2 Pendiente, 2 En Proceso con presupuesto/cuadrilla/personal asignado, 2 Resuelto con gasto real), para que el Dashboard se vea con datos realistas en vez de vacío. Sembrado con un script puntual (`_seed_temp.cjs`, no versionado, ya borrado) que requirió **aflojar temporalmente** `allow create` de `trabajadores` y `allow update` de `incidencias`/`tickets_publicos` a `if true` — desplegado, corrido el script, y **revertido a las reglas originales de inmediato** (mismo contenido documentado en §18). Si en el futuro hace falta sembrar más datos de demo, repetir el mismo patrón: aflojar → sembrar → revertir → verificar que `firestore.rules` quedó igual al de §18 antes de dar por terminado.

### Credenciales de prueba conocidas
- ALCALDE_ADMIN real (Luis González): el correo/contraseña que el usuario creó él mismo (no está en este documento).
- JEFE_DEPARTAMENTO de prueba (`departamento: "Aseo y Ornato"`): creada el 30-jul-2026 a mano vía consola, credenciales no están en este documento.
- Emulador local (si algún día se arregla): `admin@incidencias.cl` / `Admin123!`, `terreno@incidencias.cl` / `Terreno123!` (ver `scripts/seed.js` — usa roles viejos, pre-RBAC, no actualizado).

## 20. Limitaciones conocidas / gotchas de esta máquina

1. **El emulador local de Firestore/Storage está roto en esta máquina** (confirmado, no arreglable): Java 21 no puede abrir un selector NIO por un fallo de loopback socket (`AF_UNIX`), probablemente antivirus/firewall interceptando. Se probaron 3 JDKs distintos, mismo error exacto en `java.base`. El emulador de **Auth** (Node puro) sí funciona. Por esto, toda la verificación de código nueva se hace contra el proyecto real (`app-incidencias-urbanas`), no contra emuladores.
2. **La consola web de Firebase tuvo un bug real**: mostraba documentos como "guardados" en la UI que **nunca llegaban al servidor real** (confirmado con 3 métodos independientes: REST API, la app misma, y Admin SDK con una clave de servicio). Se resolvió escribiendo los datos directo con Admin SDK. Si vuelve a pasar, no asumir que lo que se ve en la consola = lo que hay en el servidor; verificar con Admin SDK o la app real.
3. **`npm run dev` corre en `localhost:5173`** para desarrollo local — la app real vive en `https://app-incidencias-urbanas.web.app` (Hosting, ver §19/§22).
4. **PWA sin service worker**: hay manifest + ícono (instalable, `display: standalone`), pero no hay caching de app shell ni soporte offline real de la carga inicial — la cola offline de reportes (§10) es independiente de esto y ya funciona.
5. **Verificación del Dashboard/Cuadrilla requiere login real**: el agente que trabaja en este proyecto no tiene credenciales de funcionario ni acceso a Admin SDK de producción, así que los flujos que requieren sesión (asignar cuadrilla, marcar resuelto, filtros de los dashboards) los verifica el usuario manualmente cuando se le pide.
6. **Firebase Hosting cachea `index.html` por 1 hora** (`Cache-Control: max-age=3600`), lo que puede hacer que el navegador siga sirviendo el bundle JS viejo justo después de un deploy nuevo (confirmado: `document.scripts[0].src` mostraba un hash de bundle distinto al que efectivamente estaba en `dist/`). Al verificar un fix recién desplegado, forzar carga fresca con un query string de cache-busting (`?v=algo`) en la URL en vez de confiar en refresh normal.

## 21. Cosas explícitamente diseñadas pero NO implementadas (pendientes)

- ~~**Notificación por WhatsApp al resolver un caso**~~ — ✅ implementado y verificado end-to-end el 31-jul-2026, ver §23 para el detalle técnico completo. Se mantienen acá las decisiones de diseño originales (siguen vigentes, no cambiaron):
  - **Vía elegida: NO oficial** (igual que la tienda del usuario) — automatización tipo "WhatsApp Web" (librería `@whiskeysockets/baileys`) sobre el número **+56977701624**, en vez de la API oficial de Meta (Cloud API). Se le explicó el riesgo real: esto viola los términos de servicio de WhatsApp y el número podría quedar bloqueado sin aviso y sin soporte de Meta — el usuario decidió asumir ese riesgo conscientemente.
  - **Hosting elegido: esta misma computadora**, corrida manual (el usuario eligió esto en vez de PM2/segundo plano) — solo envía mientras `node index.js` esté corriendo, la PC prendida y con internet. Lo resuelto mientras está apagado se notifica retroactivamente apenas se vuelve a arrancar (ver §23).
  - Se descartó la vía oficial (Meta Cloud API + Cloud Function) por el mismo motivo que bloqueó Storage: exige Blaze (tarjeta). Si el usuario consigue tarjeta y hace la verificación de negocio en Meta más adelante, esa vía sigue siendo la recomendada para un municipio (sin riesgo de bloqueo) — sería cuestión de cambiar el backend, no el resto del flujo.
  - ✅ **Esta decisión se revirtió: la migración a la Cloud API oficial YA SE HIZO** (`whatsapp-api-oficial/`, corriendo en Render, no en la PC). El riesgo de bloqueo del número está cerrado. Ver **§39** para lo que quedó implementado, lo que se perdió en el camino, y los riesgos que sí siguen vigentes.
- ~~**Terminar de activar Storage**~~ — descartado el 30-jul-2026: Firebase exige Blaze (con tarjeta) para el bucket y el municipio no tiene tarjeta. Se resolvió usando **Cloudinary** en su lugar (ver §19) — las fotos ya funcionan en producción, no hace falta Blaze. Si algún día el municipio consigue una tarjeta, `storage.rules` sigue listo en el repo por si se quiere migrar de vuelta.
- **Capacitor** (empaquetar como app nativa Android/iOS real): mencionado como opción futura, no iniciado.
- **Service worker / caching de app shell**: para que la carga inicial también funcione offline (hoy solo la cola de reportes ya creados es offline-first).
- ~~**UI para crear funcionarios**~~ — ✅ implementado el 30-jul-2026, ver "Gestión de funcionarios desde el Dashboard" en §5. Sigue siendo manual desde la consola solo para crear otro `ALCALDE_ADMIN`, y para borrar por completo una cuenta de Auth (la UI solo revoca el acceso vía Firestore).

## 22. Cómo correr el proyecto

```bash
cd reporte-incidencias
npm install
npm run dev
```
Luego: `http://localhost:5173/demo` (ciudadano), `http://localhost:5173/login` (funcionario), `http://localhost:5173/estado` (consulta pública de ticket, sin login).

**Producción (desplegada, con RBAC)**: `https://app-incidencias-urbanas.web.app/demo` (ciudadano), `.../login` (funcionario — redirige según rol, ver §5), `.../estado` (consulta ticket).

**Desplegar cambios**: `npm run build && npx firebase deploy --only hosting` (frontend), `npx firebase deploy --only firestore:rules` (reglas Firestore). `firebase deploy --only storage` no aplica mientras no se use Firebase Storage (ver §19) — las fotos se configuran directo en el dashboard de Cloudinary, no vía deploy.

**Importante para cambios futuros que toquen roles**: si alguna vez se agrega o renombra un rol de nuevo, migrar primero cualquier usuario real con el rol viejo (editar su doc en `usuarios_municipales` desde la consola) ANTES de desplegar reglas/frontend — si no, ese usuario queda momentáneamente sin acceso a su dashboard hasta migrar. Así se hizo con la migración `ADMIN` → `ALCALDE_ADMIN` del 30-jul-2026 (ver §5, §19).

**Otros procesos que corren aparte del frontend** (ninguno se despliega con `firebase deploy`, corren localmente en esta PC):
- Bot de WhatsApp: `cd whatsapp-bot && node index.js` — ver §23.
- Respaldo de Firestore: `npm run backup` (o la tarea programada diaria, si ya se creó) — ver §25.

**Verificar que un deploy de `hosting` realmente llegó** (lección aprendida en §23 — el código commiteado no es lo mismo que lo desplegado): `curl -s "https://app-incidencias-urbanas.web.app/demo?v=$(date +%s)" | grep -oE 'src="[^"]*\.js"'` da el nombre del bundle realmente servido; compararlo contra `ls dist/assets/index-*.js` después de un `npm run build` reciente. Si no coinciden, faltó desplegar o el navegador está probando con caché vieja (usar ventana de incógnito para descartar esto último).

Para build de producción: `npm run build` (verificar que `recharts` quede en chunks separados — `DashboardGeneralPage-*.js` y `DashboardDepartamentoPage-*.js` —, no en el `index-*.js` principal — code-splitting ya configurado en `App.jsx` con `React.lazy`).

## 23. Bot de WhatsApp — notificaciones + consulta conversacional (implementado 31-jul/01-ago-2026)

> ⚠️ **SECCIÓN HISTÓRICA — este bot ya no existe.** Todo lo de abajo describe el bot no oficial (Baileys) que se retiró: la carpeta `whatsapp-bot/` **no está en el repo**. Lo que corre hoy es la **Cloud API oficial de Meta** en `whatsapp-api-oficial/` — **ver §39**, que además detalla las dos funciones que se perdieron en la migración. Esta sección se conserva porque explica decisiones que siguen vigentes (las banderas por momento del ciclo de vida, el reintento al reconectar, el gotcha del build desplegado), no como descripción del sistema actual.

**Ubicación**: `whatsapp-bot/` en la raíz del proyecto (junto a `src/`, no dentro) — proyecto Node **independiente**, con su propio `package.json`/`node_modules`, no se bundlea con Vite ni forma parte del build del front. Decisiones de diseño (vía no oficial, número, hosting manual) documentadas en §21 — acá va el cómo quedó construido.

**Cómo funciona (`whatsapp-bot/index.js`)**:
1. Inicia sesión con Firebase Auth (`signInWithEmailAndPassword`, client SDK — no Admin SDK) usando una cuenta de funcionario **`TERRENO` dedicada exclusivamente al bot** (creada desde `/dashboard/funcionarios`, ver §5). TERRENO alcanza porque lee/escribe incidencias de todo el municipio sin restricción de departamento (`puedeGestionarIncidencia` en `firestore.rules` solo restringe por departamento a `JEFE_DEPARTAMENTO`).
2. Lee `usuarios_municipales/{uid}` para saber `municipio_id`, y `municipalidades/{municipio_id}` para el nombre real (usado en el mensaje) — ambos leídos una sola vez al arrancar, no en cada mensaje.
3. Se conecta a WhatsApp con Baileys (sesión persistida en `whatsapp-bot/auth_info/`, gitignored — solo hace falta escanear el QR una vez; reconecta solo si se corta).
4. **3 momentos del ciclo de vida notificados, cada uno con su propia bandera** (ver `TIPOS_NOTIFICACION` en el código — agregado 01-ago-2026, antes solo notificaba "Resuelto"): al **crear** (`notificado_whatsapp_creacion`, sin filtro de estado — confirma el ticket con la foto "antes"), al **asignar cuadrilla** (`notificado_whatsapp_asignacion`, filtra `estado=='En Proceso'`), y al **resolver** (`notificado_whatsapp`, filtra `estado=='Resuelto'`, con la foto "después"). Cada tipo tiene su propio `onSnapshot` filtrando `municipio_id` + (opcionalmente `estado`) + su bandera `==false` (igualdades sin `orderBy` — no requiere índice compuesto). Usa `snapshot.docChanges()` y solo procesa tipo `'added'` (evita reprocesar lo ya notificado en cada evento del listener).
5. Si `contacto_ciudadano` no tiene forma de teléfono (vacío o con `@`) marca la bandera correspondiente en `true` igual (nada que enviar) y lo loguea. Si parece teléfono, normaliza anteponiendo `56` si hace falta, confirma con `sock.onWhatsApp()` que el número existe en WhatsApp, y envía el mensaje de ese tipo (+ foto si corresponde).
6. **Mensaje**: saludo con `nombre_ciudadano` si el ciudadano lo dejó, categoría con su etiqueta legible (reusa `CATEGORIAS` de `src/utils/categorias.js` vía import relativo — **no se duplicó el catálogo**, así que si se agregan categorías nuevas el bot las toma solas), nombre real de la municipalidad, número de ticket, y link a `/estado`.
7. Si el envío falla (ej. WhatsApp desconectado en ese instante), **no** se marca la bandera — la incidencia vuelve a aparecer como `'added'` la próxima vez que el bot arranque y se reintenta sola, sin acción manual.
8. **Consulta conversacional (nuevo, 01-ago-2026)**: el bot también escucha `messages.upsert` (mensajes ENTRANTES, no solo enviar). Si un ciudadano le escribe directo al número `+56977701624` un texto que contenga algo con forma de ticket (`INC-YYYYMMDD-XXXX`, regex insensible a mayúsculas), el bot busca ese número en `tickets_publicos` (lectura pública, sin necesitar sesión) y responde categoría/estado/fechas — sin pasar por `/estado`. Ignora grupos/difusión (solo chats 1 a 1) y cualquier mensaje sin forma de ticket (no contesta ruido).

**Dependencia crítica — versión de Baileys fijada, no usar `^`**: `package.json` fija `"@whiskeysockets/baileys": "6.7.24"` **exacto, sin caret**. La versión `6.17.16` (numéricamente mayor, y la que un rango `^6.x` resolvería) tiene una **vulnerabilidad de día cero que permite falsificar mensajes** ([GHSA-qvv5-jq5g-4cgg](https://github.com/WhiskeySockets/Baileys/security/advisories/GHSA-qvv5-jq5g-4cgg)) — confirmado con `npm view ... deprecated` al instalar. `6.7.24` y `7.0.0-rc12+` están limpias. Si en el futuro se actualiza esta dependencia, revisar `npm view @whiskeysockets/baileys@<version> deprecated` antes de fijar una versión nueva.

**Bug real encontrado y corregido durante la verificación — build de producción desactualizado**: el campo `notificado_whatsapp: false` ya estaba en `incidenciasService.js` (agregado antes de esta sesión), pero el **build desplegado en Firebase Hosting era anterior a ese cambio** — cada incidencia nueva creada en producción se guardaba sin ese campo, así que la consulta del bot (`notificado_whatsapp == false`) nunca las encontraba, sin ningún error visible (un campo ausente no matchea `== false` en Firestore). Se detectó descargando el bundle JS real servido en `https://app-incidencias-urbanas.web.app` y comparando contra el bundle local (`grep -c "notificado_whatsapp"` daba 0 en el desplegado). Se corrigió con `npm run build && npx firebase deploy --only hosting`. **Lección para el futuro**: cualquier cambio a `incidenciasService.js` (o cualquier archivo de `src/`) necesita un deploy explícito — que el código esté commiteado no significa que esté en producción.

**Segundo hallazgo durante la verificación — caché del navegador**: incluso después del deploy, una pestaña ya abierta desde antes siguió corriendo el bundle viejo en memoria. Hubo que probar en una **ventana de incógnito nueva** para garantizar que cargara la versión recién desplegada (mismo gotcha ya documentado en §20.6, confirmado de nuevo acá).

**Verificado end-to-end en producción (31-jul-2026, notificación de Resuelto)**: reporte de prueba creado en `/demo` (con foto, nombre, y número de WhatsApp real) → asignado desde el Dashboard → marcado Resuelto → el bot lo detectó al instante, mandó la foto + mensaje personalizado (`Hola {nombre}, tu reporte de "{categoría legible}" (ticket {N}) fue resuelto por {nombre municipio}...`), y quedó recibido en el WhatsApp real del ciudadano de prueba. Las notificaciones de creación/asignación y la consulta conversacional (01-ago-2026) se desplegaron y el bot se reinició para tomarlas, pero no se verificó cada una end-to-end por separado con captura — si algo no llega, revisar primero que el bot esté corriendo la versión desplegada más reciente y que el navegador no esté sirviendo un build viejo en caché (mismo patrón de bug que ya pasó una vez, ver arriba).

**Cómo correrlo día a día** (decisión del usuario: manual, no PM2):
```bash
cd whatsapp-bot
node index.js
```
Deja esa ventana abierta — mientras esté corriendo, notifica en tiempo real; si se cierra, no notifica hasta que se vuelva a abrir (lo pendiente se notifica retroactivo al reabrir, no se pierde). Si algún día se quiere correr desatendido (sin ventana), la alternativa es PM2 — no implementada, el usuario prefirió el modo manual por simplicidad.

**Archivos**: `whatsapp-bot/package.json`, `whatsapp-bot/index.js`, `whatsapp-bot/.env.example` (plantilla) y `whatsapp-bot/.env` (real, gitignored — tiene la config de Firebase del proyecto, no sensible, más `BOT_FUNCIONARIO_EMAIL`/`BOT_FUNCIONARIO_PASSWORD` de la cuenta dedicada, sensible). `whatsapp-bot/auth_info/` (sesión de WhatsApp) también gitignored — si se borra, hay que volver a escanear el QR.

**Riesgo aceptado, sin resolver**: la cuenta `TERRENO` del bot se creó con una contraseña simple durante la prueba inicial — recomendado cambiarla por una robusta desde Firebase Console (Authentication) y actualizar `whatsapp-bot/.env` a la par, ya que esa cuenta tiene permiso de escritura sobre incidencias en producción. Sigue sin cambiarse al momento de escribir esto.

## 24. Mejoras de gestión y participación ciudadana (01-ago-2026)

Tanda grande implementada de una sola vez a pedido del usuario ("realiza todas las sugerencias que me dijiste", sobre una lista de ideas propuestas en el chat). Todo desplegado a producción (`firestore:rules` + `hosting`) y compilado sin errores; lo que requería sesión de funcionario lo verificó el usuario manualmente (mismo criterio que siempre, ver §20.5).

**Dashboards (Alcalde y Jefe de Departamento) — `src/pages/DashboardGeneralPage.jsx` y `DashboardDepartamentoPage.jsx`:**
- **Búsqueda de texto libre** (`src/utils/busqueda.js`, `coincideTexto`): filtra por ticket, dirección, categoría (etiqueta legible) y cuadrilla — no por datos del ciudadano. Se combina con los filtros existentes (gravedad/categoría/cuadrilla/departamento).
- **Exportar a CSV** (`src/utils/exportarCsv.js`, sin librerías nuevas): botón junto al encabezado de la lista, exporta las incidencias **ya filtradas** (respeta búsqueda + filtros activos). Incluye BOM UTF-8 para que Excel en Windows no rompa tildes/ñ.
- **Alertas de SLA** (`src/components/dashboard/MetricasPorDepartamento.jsx`, solo Dashboard del Alcalde): `SLA_HORAS_ALTA_SIN_ASIGNAR = 4` — una incidencia de gravedad Alta que lleva más de 4h en "Pendiente" sin cuadrilla asignada se marca en rojo, tanto en un banner resumen arriba de las tarjetas como en la tarjeta del departamento afectado (`horasDesde(timestamp)`, nuevo en `src/utils/tiempo.js`). Umbral ajustable en el código, no en UI.

**Calificación ciudadana (1-5 estrellas) — post-resolución, desde `/estado`:**
- Campo nuevo `incidencias.calificacion_ciudadano: number | null` (1-5), y mirror en `tickets_publicos.{numero}.calificacion_ciudadano` (best-effort, igual criterio que `upvotes`).
- **Mecanismo de acceso "a ciegas"**: el ciudadano en `/estado` nunca tuvo permiso de LEER `incidencias/{id}` — pero `calificarIncidencia()` (`incidenciasService.js`) puede escribir directo a ese id porque lo conoce vía `tickets_publicos.{numero}.incidencia_id` (campo ya público). Mismo patrón exacto que `votarIncidencia()` (el voto "+1" ya funcionaba así desde §16).
- `firestore.rules`: `esCalificacionValida()` — solo anónimo, solo si `estado=='Resuelto'`, solo si no había calificación previa (no se puede pisar), valor entero 1-5. Regla espejo en el `allow update` de `tickets_publicos` para el mirror.
- UI: `src/components/common/EstrellasCalificacion.jsx` (widget reusable, un clic = envío inmediato, sin botón "guardar" — mismo criterio de un-clic que la asistencia de trabajadores). Se muestra en `ConsultaTicketPage.jsx` cuando el ticket está Resuelto; si ya se calificó, muestra el puntaje en modo solo lectura.

**Seguimiento ciudadano — agregar comentario/foto a un reporte ya creado, sin login:**
- Subcolección nueva `incidencias/{id}/seguimientos/{id}`: `{texto, foto_url, autor: 'ciudadano', fecha}`. Mismo mecanismo de acceso "a ciegas" que la calificación — el ciudadano solo puede `create`, nunca `read` (ni siquiera lo que él mismo mandó: la confirmación en `/estado` es optimista del lado del cliente, no una relectura).
- `src/services/seguimientosService.js`: `agregarSeguimiento(incidenciaId, {texto, fotoUrl})` (ciudadano) y `suscribirSeguimientos(incidenciaId, callback)` (funcionario, orden cronológico).
- UI ciudadano: formulario colapsable dentro de `TarjetaResultado` en `ConsultaTicketPage.jsx` — texto (hasta 1000 caracteres) + foto opcional (reusa `subirImagen` de `storageService.js`, mismo Cloudinary que el resto de la app). Disponible en cualquier estado del ticket, no solo Resuelto.
- UI funcionario: `src/components/common/ListaSeguimientos.jsx` (solo lectura), insertado en los 3 paneles de gestión — `PanelAsignacion.jsx` (Alcalde), `PanelGestionDepartamento.jsx` (Jefe de Departamento), `DetalleTarea.jsx` (Terreno). A diferencia del contacto del ciudadano (oculto para Terreno por privacidad, ver §11), los seguimientos SÍ se muestran en los 3 — es información operativa sobre el problema, no un dato de contacto.
- `firestore.rules`: `match /incidencias/{incidenciaId}/seguimientos/{seguimientoId}` — `create` anónimo validado por forma (autor obligatorio `'ciudadano'`, texto ≤1000 chars, `fecha` debe ser el `serverTimestamp()` real, no uno inventado por el cliente); `read` solo funcionario del mismo municipio (usa `get()` sobre el documento padre para conocer `municipio_id`, ya que la subcolección no lo tiene directamente); `update`/`delete` siempre `false`.
- **Riesgo aceptado, mismo nivel que el voto ciudadano**: como `tickets_publicos` es listable (`allow list: if true`), cualquiera puede enumerar `incidencia_id`s y mandar seguimientos a incidencias ajenas sin ser quien reportó — no hay forma de probar "sos el mismo ciudadano" sin login. Se aceptó este riesgo porque es el mismo nivel de exposición que ya tenía el voto "+1" desde §16 (documentado ahí como "no es una garantía a prueba de abuso"), no una categoría de riesgo nueva.

**Página pública de transparencia — `src/pages/TransparenciaPage.jsx`, ruta `/:municipioSlug/transparencia`:**
- Sin login, calculada sobre `tickets_publicos` (colección ya pública, sin datos que identifiquen a nadie) — mismo criterio de privacidad que `/estado`.
- Ruta de 2 segmentos (`/demo/transparencia`) — no choca con `/:municipioSlug` (1 segmento) ni con los slugs reservados de §4, React Router los distingue por profundidad de ruta.
- Muestra: total de reportes, % resueltos, tiempo promedio de resolución (`fecha_cierre - fecha_creacion` de los Resueltos), desglose por gravedad y las 8 categorías más reportadas — con barras en CSS puro, **sin `recharts`** a propósito (página pública, mismo criterio de "liviano para celulares de gama baja/zonas rurales" que el resto del flujo ciudadano). Cargada con `React.lazy`, igual que los Dashboards.
- **Pendiente**: no hay ningún link de entrada a esta página todavía desde `CiudadanoPage.jsx`/`LandingPage.jsx` — solo se llega escribiendo la URL a mano (`/<slug>/transparencia`). Agregar un enlace visible queda como mejora menor futura.

## 25. Respaldo de Firestore (implementado 01-ago-2026)

**`scripts/backup.js`** (agregado al `package.json` raíz como `npm run backup`): usa **Admin SDK** (`firebase-admin`, ya era devDependency) con una cuenta de servicio — a diferencia de todo lo demás en este proyecto, esto bypassa `firestore.rules` por completo (acceso total de lectura). Exporta `incidencias`, `usuarios_municipales`, `municipalidades`, `tickets_publicos`, `trabajadores`, `ubicaciones_cuadrilla`, y la subcolección `seguimientos` (vía `collectionGroup`, una sola consulta para todas las incidencias) a un único JSON con Timestamps convertidos a texto ISO legible. Guarda en `backups/backup-YYYY-MM-DD_HHmm.json` y conserva como máximo los últimos 14 archivos (borra los más viejos solo).

**Credencial**: `serviceAccountKey.json` en la raíz del proyecto (descargada por el usuario desde Firebase Console > Configuración del proyecto > Cuentas de servicio > Generar nueva clave privada — el agente no puede generarla, requiere su sesión). **Da acceso total a la base de datos sin pasar por ninguna regla** — gitignored (`serviceAccountKey.json` y `backups/` agregados a `.gitignore`), nunca debe compartirse ni commitearse.

**Probado manualmente el 01-ago-2026**: `npm run backup` corrió sin errores contra el proyecto real, exportó 89 incidencias / 5 usuarios_municipales / 1 municipalidad / 73 tickets_publicos / 47 trabajadores / 1 ubicación_cuadrilla / 0 seguimientos, archivo de 146 KB.

**Automatización — tarea programada de Windows**: el usuario pidió que corriera solo todos los días. **El agente NO pudo crear la tarea** (`Register-ScheduledTask` y `schtasks /create` fallan con "Acceso denegado" en el entorno sandboxeado donde corre — limitación del entorno del agente, no de la PC del usuario). Se le dieron instrucciones paso a paso para crearla a mano desde el Programador de tareas de Windows (GUI): programa `C:\Program Files\nodejs\node.exe`, argumento `scripts\backup.js`, "Iniciar en" `C:\Users\Administrador\Desktop\kpop\reporte-incidencias`, diaria a las 3:00 a.m. **No confirmado si el usuario efectivamente la creó** — verificar en una próxima sesión (`Get-ScheduledTask -TaskName "RespaldoTuMuniAqui"` debería listarla si existe, ese fue el nombre sugerido) o preguntarle directamente.

**Riesgo/limitación aceptada**: igual que el bot de WhatsApp, el respaldo solo corre si la PC está prendida a esa hora — si está apagada, ese día no hay respaldo nuevo (no hay reintento automático). Sin respaldo en la nube (fuera de esta PC); si el disco falla, se pierden también los backups locales junto con todo lo demás. Mejora futura posible: subir el JSON resultante a algún storage externo (Google Drive, etc.) — no implementado.

## 26. Consultas acotadas a `tickets_publicos` — arreglo de escalabilidad (02-ago-2026)

**El bug (latente, nunca llegó a manifestarse en producción)**: existía una sola suscripción `suscribirTicketsPublicos(callback, municipioId)` **sin `limit()` ni `orderBy`**, que traía TODOS los tickets del municipio. La usaban `FormularioCiudadano.jsx` (pines del mapa + chequeo de duplicados + listado de últimos 10) y `TransparenciaPage.jsx` (estadísticas agregadas). Con los ~73 tickets de prueba no se notaba nada, pero `tickets_publicos` **crece sin techo**: cada ciudadano que abría el formulario descargaba la colección completa. Dos consecuencias, ambas peores mientras más éxito tenga la app:
- Le quema los datos móviles al vecino — justo el público rural con celulares de gama baja que el resto de la app cuida a propósito (§2, §11, §24).
- Agota la cuota gratis de lecturas de Firestore (plan Spark, 50.000 lecturas/día — ver §19): ~20 vecinos × unos miles de tickets deja la app caída hasta el día siguiente.

**El arreglo** (`src/services/ticketsPublicosService.js`): se **eliminó** `suscribirTicketsPublicos` (a propósito, para que el patrón sin límite no se reintroduzca por costumbre) y se reemplazó por dos suscripciones acotadas, ambas pasando por un helper interno `suscribir()` que siempre aplica `orderBy('fecha_creacion','desc')` + `limit()`:
- **`suscribirTicketsActivos(callback, municipioId)`** — `estado in ['Pendiente','En Proceso']`, tope `MAX_TICKETS_ACTIVOS = 200`. Alimenta los pines del mapa y el chequeo de duplicados. Clave del diseño: **los resueltos ahora se excluyen en el servidor** (antes se filtraban en memoria, o sea ya se habían descargado) — son justamente los que se acumulan para siempre, mientras que los activos se mantienen acotados solos a medida que el municipio cierra casos.
- **`suscribirUltimosTickets(callback, municipioId, cuantos = 10)`** — cualquier estado, tope duro `MAX_TICKETS_RECIENTES = 500`. La usa el listado "Últimos reportes de la comuna" del Paso 1 (con 10) y `TransparenciaPage.jsx` (con 500).

Como ambas vienen ordenadas desde Firestore, se eliminaron los `useMemo` que filtraban/ordenaban en memoria en `FormularioCiudadano.jsx`.

**Índices nuevos (obligatorios)** en `firestore.indexes.json`, sobre `tickets_publicos`: `(municipio_id ASC, fecha_creacion DESC)` y `(municipio_id ASC, estado ASC, fecha_creacion DESC)`. Sin ellos las dos consultas fallan con `failed-precondition: The query requires an index`.

**Orden de despliegue — importante**: `firebase deploy --only firestore:indexes` **primero**, esperar a que los índices terminen de construirse, y **recién después** `--only hosting`. Al revés, la app queda rota para los ciudadanos durante el rato que tardan en construirse (se verificó en local que efectivamente fallan mientras tanto, antes de subir nada).

**Limitación aceptada y documentada**: si un municipio llegara a acumular más de 200 reportes sin resolver al mismo tiempo, la detección de duplicados no vería los más antiguos de esa cola. Es un trade-off consciente: preferible a que la app entera se caiga por cuota. Lo mismo en transparencia — cuando la ventana de 500 se llena, la UI deja de decir "Reportes totales" y pasa a "Reportes considerados", aclarando desde qué fecha son los datos (no se presentan cifras parciales como si fueran el histórico completo).

**Pendiente relacionado, NO resuelto**: `tickets_publicos` sigue con `allow list: if true` (§18), así que cualquiera puede listar tickets sin pasar por la app. Los límites de arriba acotan lo que consume la *app*, no lo que podría consumir alguien golpeando Firestore directo. Mitigarlo de verdad requeriría repensar el acceso público de esa colección — ver también la falta de rate limiting / anti-spam en §27.

## 27. Qué falta para uso real con ciudadanos reales (evaluación al 02-ago-2026)

La app **funciona** end-to-end y está en producción; esta sección es sobre qué falta para que aguante uso real sostenido de una municipalidad con vecinos reales. Ordenado por riesgo, tal como se le presentó al usuario.

**Bloqueantes antes de abrirla a vecinos reales:**
1. ~~Consulta sin límite a `tickets_publicos`~~ — ✅ **resuelto**, ver §26.
2. ~~**Contraseña débil de la cuenta del bot**~~ — ✅ **dejó de aplicar**: el bot actual usa el **Admin SDK** con una cuenta de servicio, no una cuenta `TERRENO` con correo y contraseña (ver §39.1). Esa cuenta de funcionario ya no la necesita nadie; conviene revocarla si sigue existiendo en `usuarios_municipales`. Lo que sí hay que cuidar ahora es el `FIREBASE_SERVICE_ACCOUNT` y el `WHATSAPP_TOKEN` en las variables de entorno de Render.
3. **Sin política de privacidad ni términos de servicio**: la app pide RUT (§11). La Ley 21.719 de protección de datos personales lo exige, y ningún municipio debería firmar sin eso.
4. ~~Sin anti-spam / rate limiting~~ — ✅ **parcialmente resuelto**, ver §28. Queda pendiente App Check para frenar a un atacante decidido (el enfriamiento por dispositivo se evade rotando el `localStorage`).
5. **Datos de prueba mezclados en producción**: ~89 incidencias sembradas en `municipalidades/demo` (§19) más 1 de prueba en `licanten`. Limpiar antes de entregar a un municipio real.

**Importantes antes de cobrarle a un municipio:**
6. ~~**Bot de WhatsApp no oficial y dependiente de esta PC**~~ — ✅ **resuelto**: migrado a la Cloud API oficial de Meta y movido a Render (ver §39). Ya no hay riesgo de bloqueo del número ni dependencia de la PC. **Lo que quedó abierto en su lugar**, y hay que resolver antes de cobrarle a un municipio: (a) **la alerta de emergencias al Alcalde se perdió en la migración y no funciona** (§39.3) — es la función más vendedora de la propuesta; (b) el bot corre en el **plan Free de Render**, sin SLA; (c) **Meta cobra por mensaje de plantilla**, costo que no está en los números de la propuesta.
7. **Sin dominio propio**: `app-incidencias-urbanas.web.app` no proyecta seriedad institucional. Algo tipo `licanten.tumuniaqui.cl`.
8. **Cero tests automatizados** (verificado: no hay `test`/`spec` en el repo ni script de test en `package.json`). Toda la verificación es manual contra producción, agravado porque el emulador está roto en esta máquina (§20.1).
9. **Respaldo**: la tarea programada de Windows nunca se confirmó creada (§25), y solo respalda local.
10. **Sin manual de uso / capacitación** para los funcionarios municipales.

**Menores:**
11. La página de transparencia no tiene ningún link de entrada (§24) — solo se llega escribiendo la URL.
12. Sin service worker: la carga inicial no funciona offline (§20.4).
13. Sin UI para crear/editar municipalidades — todo a mano vía script con Admin SDK (§4).
14. `gasto_real` no se puede corregir después de cerrar un caso (§17).
15. La **consulta conversacional** del bot (el vecino escribe su ticket por WhatsApp) no se verificó end-to-end con un mensaje real. Las notificaciones de creación y de resuelto **sí están verificadas** contra las banderas de producción (§39.4). El aviso de "cuadrilla asignada" ya no existe (§39.3).

## 28. Anti-spam de reportes ciudadanos (02-ago-2026)

**El problema**: `allow create` de `incidencias` era anónimo y sin ningún tope (la app no tiene login, ver §11). Cualquiera podía inyectar cientos de reportes falsos, a mano o con un script, y llenar el Dashboard del municipio.

**Mecanismo elegido — enfriamiento por dispositivo, forzado en el servidor.** Sin backend propio ni servicios pagados (no hay Cloud Functions, ver §19), la única identidad disponible es el ID de dispositivo de `utils/dispositivo.js` (un UUID aleatorio en `localStorage`, el mismo que ya se usaba para los votos "+1" de §16).

Cómo se hace inevadible, que es la parte importante:
- `crearIncidencia` escribe la incidencia **y** `dispositivos/{id}.ultimo_reporte` en **un solo `writeBatch` atómico**.
- `firestore.rules` usa **`getAfter()`** para exigir que ese `dispositivos/{id}` se esté sellando con `request.time` en ESE MISMO lote. Sin esto, el cliente simplemente no escribiría nunca la marca y el límite sería decorativo.
- Además exige que el `ultimo_reporte` **anterior** sea más viejo que el enfriamiento (`ENFRIAMIENTO`, hoy 60s).
- `dispositivos/{id}` no se puede borrar (`allow delete: if false`) ni listar — borrarlo sería justamente la forma de resetear el contador.

**Otros topes agregados en la misma regla** (`textosDeTamanoRazonable`): límites de tamaño a `direccion_texto` (500), `detalles_adicionales` (2000), `nombre_ciudadano`/`contacto_ciudadano` (150) y `rut_ciudadano` (20), para que nadie infle la base con textos gigantes.

**Campo nuevo**: `incidencias.dispositivo_id` (string). Es un UUID aleatorio del navegador, **no un dato personal**, y el mismo valor ya viajaba en `usuarios_afectados` al votar — la app sigue siendo anónima salvo que el vecino decida dejar sus datos.

**Capa de UX (no es la defensa)**: `segundosParaPoderReportar()` / `registrarReporteLocal()` en `utils/dispositivo.js` guardan la última hora de envío en `localStorage` para mostrar *"Acabas de enviar un reporte. Espera N segundos antes de enviar otro."* en vez de un `permission-denied` crudo. `ENFRIAMIENTO_REPORTE_SEGUNDOS` (cliente) debe mantenerse igual al valor de `firestore.rules` (servidor). El cliente puede equivocarse (reloj malo, `localStorage` borrado) y no pasa nada: el límite real lo aplica el servidor.

**Orden de despliegue usado (3 pasos, sin caída)** — importante si se repite algo así:
1. `firestore:rules` con la colección `dispositivos` **sin** el candado en `incidencias` (nada cambia para la app en vivo, pero ya hay dónde escribir).
2. `hosting` con el código del lote atómico.
3. `firestore:rules` otra vez, ahora **con** el candado en `incidencias`.
   Al revés se rompe: el candado antes del código deja a los ciudadanos sin poder reportar, y el código antes de las reglas de `dispositivos` falla al escribir el sello.

**Verificado contra producción (02-ago-2026)** con un script temporal que usa el SDK cliente anónimo, igual que el navegador — 5 casos, todos con el resultado esperado:
| Caso | Resultado |
|---|---|
| Primer reporte de un dispositivo nuevo | PERMITIDO |
| Segundo reporte inmediato, mismo dispositivo | BLOQUEADO (enfriamiento) |
| Lote que **no** sella `dispositivos/{id}` | BLOQUEADO (esto valida `getAfter`) |
| Sin campo `dispositivo_id` | BLOQUEADO |
| `detalles_adicionales` de 5.000 caracteres | BLOQUEADO (tope de tamaño) |

Además se verificó por la interfaz real en producción que un vecino **sí** puede reportar normalmente (el camino feliz no se rompió), que el mensaje de enfriamiento aparece, y que la detección de duplicados sigue funcionando. Las incidencias de prueba creadas durante la verificación se borraron.

**Limitación conocida y aceptada**: quien borre su `localStorage`, use incógnito o rote el UUID a mano obtiene un dispositivo nuevo y vuelve a cero. Esto frena el spam accidental, el doble-envío y los scripts ingenuos — **no a un atacante decidido**. La defensa real contra eso es **Firebase App Check** (gratis con reCAPTCHA v3), que verifica que la petición venga de la app de verdad y no de un script. No se implementó todavía porque obliga a resolver primero el bot de WhatsApp (§23), que usa el SDK cliente desde Node y quedaría bloqueado — lo natural sería migrarlo a Admin SDK (ya hay una llave de cuenta de servicio, ver §25), que además simplificaría el bot. Queda como el siguiente paso natural de esta línea.

## 29. Rediseño del flujo ciudadano (02-ago-2026)

Tanda pedida por el usuario a partir de capturas de la app corriendo en su celular. Cambia decisiones de producto de fondo, no solo estética.

**Cambio de principio — la app ya NO es anónima por defecto.** Hasta ahora dejar datos era opcional (§11) y `es_anonimo` era `true` salvo que el vecino marcara una casilla. Ahora **nombre y WhatsApp son obligatorios** y `es_anonimo` se escribe siempre en `false`. El motivo del usuario: la municipalidad necesita poder llamar al vecino para coordinar la visita. Si alguna vez se quiere volver atrás, el punto de cambio es `puedeAvanzar` en `FormularioCiudadano.jsx`.

**Se dejó de pedir el RUT.** Decisión del usuario para no manejar datos personales sensibles sin necesidad (y evitar la exposición legal que eso implica). Se eliminó `src/utils/rut.js`, el campo del formulario, el índice local por RUT en `utils/dispositivo.js` y la pestaña "Por mi RUT" de `/estado`. `incidencias.rut_ciudadano` **ya no se escribe**; los reportes antiguos que lo tienen lo conservan.

**Recuperación de ticket sin datos personales**: el vecino le escribe **"mis reportes"** al WhatsApp municipal y el bot le responde con sus reportes y estados (`responderMisReportes` en `whatsapp-bot/index.js`). La identidad es el propio número desde el que escribe, y la respuesta llega solo a ese teléfono — nadie puede pedir los de otro. Reemplaza a la búsqueda por RUT de §15.

> 🔴 **ESTO YA NO EXISTE (detectado el 09-ago-2026, ver §39.3).** `responderMisReportes` vivía en el bot no oficial, que se retiró: el webhook actual solo reconoce números de ticket, no la frase "mis reportes". Y como acá arriba se eliminó también la pestaña "Por mi RUT" de `/estado`, **hoy un vecino que pierde su número de 6 dígitos no tiene NINGUNA forma de recuperar su reporte**: `/estado` solo acepta el número. Es la consecuencia más grave de la migración no documentada — el reemplazo que justificó quitar la búsqueda por RUT desapareció después, y nadie lo notó.

**Número de ticket corto**: pasó de `INC-YYYYMMDD-XXXX` (17 caracteres con letras) a **6 dígitos** (`482173`, mostrado `482 173`). Es un dato que el vecino anota a mano y dicta por teléfono. `utils/ticket.js` expone `generarNumeroTicket`, `formatearNumeroTicket` y `normalizarNumeroTicket` — esta última acepta espacios/puntos/guiones y **sigue reconociendo los tickets del formato viejo**, que ya están en manos de gente. El bot también reconoce ambos formatos. Un millón de combinaciones con el reintento por colisión que ya existía (§15) alcanza de sobra.

**Campos ahora obligatorios** (`puedeAvanzar` en `FormularioCiudadano.jsx`):
| Paso | Exige |
|---|---|
| 1 | ubicación marcada |
| 2 | categoría + "¿Dónde exactamente?" (≥3) + "Cuéntanos qué pasa" (≥5) |
| 3 | al menos 1 foto + nombre (≥2) + WhatsApp chileno válido |

**Foto obligatoria, con una excepción deliberada**: si `navigator.onLine` es `false`, la foto **no** se exige y se le avisa al vecino que su reporte se enviará sin ella. Motivo: las fotos no se pueden guardar en la cola offline (un `File` no cabe en `localStorage`, §10), así que exigirla siempre dejaría sin poder reportar a quien esté en zona sin cobertura — justo el público rural que el resto de la app cuida. Se le planteó el conflicto al usuario y eligió esta opción.

**Validación de WhatsApp** (`src/utils/telefono.js`, nuevo): acepta 9 dígitos que parten con 9, con o sin `+56`. Se **guarda siempre normalizado** como `+569XXXXXXXX`, para que el bot pueda mandar mensajes y buscar por ese campo sin volver a normalizar. Ojo: se valida el **formato**, no que el número sea realmente del vecino — verificarlo exigiría mandarle un código, que se descartó por fricción.

**Selector de categorías propio** (`SelectorCategoria.jsx`, nuevo): reemplaza al `<select>` nativo, que en Android se dibujaba como una lista negra ajena a la app y obligaba a leer las 58 categorías de corrido. Ahora es un panel tipo hoja inferior con **buscador** (insensible a tildes: "arbol" encuentra "Árbol caído") y los 9 grupos separados por color.

**Colores por grupo** (`src/utils/coloresGrupo.js`, nuevo): paleta categórica de la skill `dataviz`, **en su orden fijo** — el orden es el mecanismo de seguridad para daltonismo, no algo cosmético. Validado con `scripts/validate_palette.js --mode light --surface #ffffff`: todos los chequeos PASS (peor par adyacente ΔE 9.1 protan / 19.6 visión normal). El WARN de contraste está cubierto porque el nombre del grupo siempre se muestra escrito al lado del color. Son 8 slots categóricos y 9 grupos: "Otros" lleva el neutro, siguiendo la regla de la skill de que el noveno cae en "Other".

**Ficha de reporte** (`DetalleReporte.jsx`, nuevo): cada fila de "Últimos reportes de la comuna" ahora abre una ficha con referencia de ubicación, link a Google Maps, **fecha y hora completas**, estado, gravedad, fotos, cuántos vecinos se sumaron y el botón "A mí también me afecta". Para eso se agregó `direccion_texto` a `tickets_publicos` — no aumenta la exposición real (las coordenadas exactas ya eran públicas ahí desde el mapa tipo Waze), y `detalles_adicionales` se mantuvo **fuera** a propósito: ese campo es texto libre y puede mencionar a personas.

**Estilo**: se eligió "moderno y limpio" por sobre un futurismo más marcado, a propósito, porque la usan adultos mayores y muchas veces con sol directo en la pantalla. Bordes más redondeados (`rounded-2xl`/`3xl`), degradados sutiles en el color del municipio, sombras suaves, y un leve hundimiento al tocar los botones (`active:scale-[0.98]`).

**Verificado en local antes de desplegar**: ficha de reporte con fecha y hora reales, buscador sin tildes, los 9 grupos con su color, y la validación paso a paso (sin foto → bloqueado con aviso; teléfono mal formado → bloqueado; con foto + nombre + WhatsApp válido → habilitado). Sin errores de consola.

**Pendiente de esta tanda**: no se verificó end-to-end en producción el envío real de un reporte con el formulario nuevo ni la respuesta del bot a "mis reportes" — el bot hay que **reiniciarlo** para que tome los cambios.

## 30. Panel de control del Alcalde (02-ago-2026)

Pedido del usuario sobre capturas del Dashboard General: el mapa se veía cortado, los paneles quedaban bloqueados y la pantalla no se movía con fluidez; además quería información de gestión de alto valor, no solo el mapa.

**El bug de layout — la página estaba fijada al alto de la pantalla.** El contenedor raíz era `h-screen` + `overflow-hidden`, así que la página **no hacía scroll**: todo tenía que caber en el viewport. Con el KPI de gasto y las métricas por departamento arriba, al mapa y a la lista les quedaban unos pocos cientos de píxeles, y el `PanelAsignacion` (`absolute inset-y-0`) se cortaba sin poder llegar al botón de asignar. Arreglado:
- Raíz a `min-h-screen` (crece y hace scroll natural) y header `sticky top-0` para que no se pierda al bajar.
- El bloque mapa+lista tiene **altura propia** (`md:h-[calc(100vh-4rem)] md:min-h-[520px]`) en vez de "lo que sobre".
- `PanelAsignacion` y `PanelGestionDepartamento` pasaron de `absolute` a **`fixed`**: siempre ocupan el alto completo de la pantalla con scroll propio, así no se cortan aunque el contenedor sea bajo.
- El mismo arreglo se aplicó al Dashboard del Jefe de Departamento, que tenía el problema idéntico.

**`src/components/dashboard/PanelIndicadores.jsx`** (nuevo): 9 indicadores del estado del municipio, calculados sobre el array de incidencias que la página ya suscribe (sin consultas nuevas) más el roster de trabajadores, igual patrón que `MetricasPorDepartamento`:

| Indicador | Qué cuenta |
|---|---|
| Emergencias activas | gravedad Alta sin resolver (cualquier estado ≠ Resuelto) |
| Trabajos atrasados | Pendiente con más de 4h sin cuadrilla, **todas las gravedades** |
| Por asignar | Pendiente |
| Trabajos inconclusos | En Proceso |
| Resueltos este mes | Resuelto con `fecha_cierre` del mes, más el total histórico |
| Trabajadores presentes | presentes/total de hoy, con ausentes y "sin pasar lista" aparte |
| Cuadrillas en terreno | `cuadrilla_asignada` únicas con algo En Proceso |
| Tiempo promedio | `fecha_cierre - fecha_creacion` de lo cerrado este mes |
| Satisfacción vecinal | promedio de `calificacion_ciudadano` (§24) |

Cada tarjeta lleva una **línea de apoyo que explica el número** — es lo que la hace didáctica y no un dato suelto. Los colores son la paleta de estado fija de la skill `dataviz` (`critico`/`serio`/`bueno`), y siempre acompañados de ícono + etiqueta escrita: la regla de esa skill es que un color de estado nunca carga solo con el significado.

**Trampa de lectura que se evitó a propósito**: "Trabajos atrasados" cuenta todas las gravedades, pero el aviso rojo de `MetricasPorDepartamento` (que sigue abajo) cuenta **solo las de gravedad Alta** — en los datos reales daban 39 vs 13. Dos números distintos para algo que se llama parecido parece un error; por eso el texto de apoyo de la tarjeta dice explícitamente "de cualquier gravedad" y el aviso dice "de gravedad Alta".

**"Gasto del mes" quedó fuera del panel** a propósito, para no mostrar el mismo número dos veces: ya lo cubre `ResumenGastoMensual`, que además tiene filtro por departamento y el detalle línea por línea (§24).

**Verificación**: el agente **no puede entrar al Dashboard** (requiere login de funcionario, §20.5), así que en vez de verificar visualmente se replicaron los cálculos exactos del componente contra los datos reales de producción con un script temporal. Resultado en `demo` (92 incidencias, 47 trabajadores): 27 emergencias activas, 39 atrasados, 39 por asignar, 17 inconclusos, 0 resueltos este mes (36 históricos), 0/47 presentes (47 sin pasar lista), 3 cuadrillas en terreno. Cuadra: 39 + 17 + 36 = 92 = total. **Falta que el usuario confirme visualmente** el scroll y que el panel lateral ya no se corte.

## 31. Cuenta Pública en un clic (02-ago-2026)

Pedido del usuario tras preguntar qué haría la sección del Alcalde "irresistible". Esta es la que convierte: todo alcalde en Chile debe rendir una **cuenta pública anual** (Ley 18.695) y hoy la arma a mano juntando planillas de cada departamento. La app ya tiene los datos.

**`src/pages/CuentaPublicaPage.jsx`** — ruta `/dashboard/cuenta-publica`, solo `ALCALDE_ADMIN`, lazy-loaded (13 kB, no pesa en el flujo del ciudadano). Enlace "Cuenta pública" en el header del Dashboard General.

Secciones: resumen del período (con la cifra grande de problemas resueltos), cómo respondimos (tiempo de reacción, de resolución, satisfacción, horas hombre), desempeño por dirección municipal (tabla), qué reportaron los vecinos (top categorías + gravedad), evolución mes a mes, e inversión ejecutada. Períodos: año actual, año anterior, últimos 12 meses.

**Decisiones técnicas:**
- **Sin librería de PDF.** Se imprime con el diálogo del navegador ("Guardar como PDF"). Cero peso extra y funciona en cualquier equipo.
- **Gráficos en CSS puro, no recharts.** Los gráficos dibujados en canvas/SVG suelen salir cortados o en blanco al imprimir; con CSS el navegador imprime lo que se ve. Reglas `@media print` en `index.css`: `print-color-adjust: exact` (que los colores no salgan en blanco), `break-inside: avoid` en secciones y `break-after: avoid` en encabezados.
- **`obtenerIncidenciasPorPeriodo`** (`incidenciasService.js`) usa `getDocs`, no `onSnapshot`: un informe es una foto de un momento, no algo que deba cambiar mientras se imprime. Acotada por rango de fechas; usa el índice `(municipio_id, fecha_creacion DESC)` que ya existía.

**Bug encontrado al verificar contra datos reales**: el tiempo de reacción salía **"-7 horas"**, porque hay incidencias con `fecha_asignacion` anterior a `fecha_creacion` (datos sembrados/migrados). Un negativo en el documento público del Alcalde destruye la credibilidad del resto del informe. Se agregó **`horasEntre()` y `promedioHoras()`** en `utils/tiempo.js`, que descartan los intervalos incoherentes en vez de deformar el promedio, y se aplicaron también a `PanelIndicadores` y `TransparenciaPage`, que tenían el mismo riesgo latente.

También se cambió `html, body, #root` de `height: 100%` a `min-height: 100%`: con altura fija el contenido se desbordaba de la caja en vez de alargar la página.

**Verificado** replicando los cálculos contra producción (92 reportes de `demo`): la consulta corre con los índices existentes y los números cuadran. **Falta que el usuario confirme visualmente** cómo sale el PDF impreso.

## 32. Alerta de emergencias al WhatsApp del Alcalde (02-ago-2026)

> 🔴 **NO ESTÁ ACTIVA — se perdió en la migración a la API oficial (ver §39.3).** Esta función la implementaba el bot no oficial, que se retiró. El bot actual (`whatsapp-api-oficial/`) tiene solo dos listeners (nuevo ticket y resuelto): **ningún código lee `whatsapp_alcalde` ni consume `alertado_alcalde`**, así que configurar el número del Alcalde **no la enciende**. Comprobado en producción el 09-ago-2026: 7 reportes de gravedad Alta, 0 alertas. Para revivirla hacen falta un listener nuevo **y** una plantilla aprobada en Meta (con la Cloud API no se puede mandar texto libre fuera de la ventana de 24 h). **No prometerla en la propuesta comercial mientras siga así.** Lo de abajo es el diseño original, que sigue siendo válido como especificación.

Cuando entra una incidencia de **gravedad Alta** (fuga de gas, cableado expuesto, socavón, árbol caído), el bot le escribe al celular del Alcalde con: categoría, número de reporte, departamento, dirección de referencia, detalles del vecino, **link a Google Maps con la ubicación exacta**, la foto y la hora de ingreso. El escenario que esto evita es que el Alcalde se entere de algo grave por un vecino enojado en redes sociales antes que por su propio municipio.

- El número se configura por municipalidad en **`municipalidades/{id}.whatsapp_alcalde`**. Si no está configurado, la alerta simplemente no corre (es opcional).
- Script: **`scripts/configurar-whatsapp-alcalde.mjs <municipio> <numero|quitar>`**, que normaliza el número a `+56XXXXXXXXX` y valida el largo.
- Campo nuevo en `incidencias`: **`alertado_alcalde`** (bandera aparte de las `notificado_whatsapp_*` porque el destinatario es otro).

**Dos decisiones de diseño que importan:**
1. **Sin alertas retroactivas.** El campo solo se escribe en los reportes nuevos, así que al activar esto por primera vez el Alcalde **no** recibe de golpe las 36 emergencias históricas — solo las que entren de ahí en adelante. Verificado: la consulta devuelve 0 sobre los datos actuales.
2. Si el bot estuvo apagado y el caso ya se resolvió, se marca como alertado **sin enviar**: avisar de una emergencia ya cerrada es ruido que desgasta la confianza en la alerta.

Consulta verificada contra producción: las 3 igualdades (`municipio_id` + `nivel_gravedad` + `alertado_alcalde`) corren sin índice compuesto nuevo.

## 33. Vista por sectores del municipio (02-ago-2026)

Los alcaldes piensan el territorio por villas, poblaciones y sectores rurales, y la pregunta política que se hacen es *qué sector estoy desatendiendo* — porque desatender un sector se paga en votos. El mapa de pines sueltos no responde eso.

- **`src/utils/sectores.js`**: `sectorDeCoordenada()` y `agruparPorSector()`, sobre el `distanciaMetros()` (Haversine) que ya existía para el chequeo de duplicados.
- **`src/components/dashboard/PanelSectores.jsx`**: tabla por sector con sin resolver / total / urgentes y una barra de cumplimiento (relleno con severidad, riel un paso más claro del mismo tono — regla de "meter" de la skill dataviz) con el porcentaje **escrito al lado**, nunca solo color. Al hacer clic en un sector, el mapa lo encuadra.
- **`MapaIncidencias.jsx`**: dibuja los sectores como círculos tenues **debajo** de los pines (van antes en el árbol), para dar contexto territorial sin competir con el dato principal. `EncuadradorSector` usa `fitBounds` sobre el círculo, no un zoom fijo, para que un sector grande no quede a medias.
- **`scripts/configurar-sectores.mjs`**: carga los sectores, validando que las coordenadas caigan dentro de Chile y que el radio sea positivo — un sector mal escrito no se nota a simple vista en el dashboard (simplemente no le caen incidencias), así que conviene que falle al cargarlo.

**Por qué centro + radio y no polígonos**: un municipio chico puede sacar las coordenadas de Google Maps (clic derecho, copiar) y cargarlo en minutos, sin editor de mapas ni archivos GeoJSON. La contrapartida es que los sectores son circulares y pueden solaparse; si dos alcanzan un mismo punto, **gana el más cercano al centro**. Lo que no cae en ningún sector se agrupa en "Fuera de los sectores definidos" y se explica al pie, para que se note si faltan sectores o si los radios quedaron chicos.

Lógica verificada con casos límite: sin coordenadas, sin sectores definidos, latitud indefinida y zona de solape — ninguno rompe.

**Pendiente**: `municipalidades/licanten` todavía no tiene sectores cargados; el panel muestra un mensaje explicando cómo hacerlo en vez de quedar vacío sin razón.

## 34. Comparación mes contra mes (02-ago-2026)

*Bajamos el tiempo de respuesta de 5 días a 2* es una frase de campaña. El resto del panel muestra el ahora; **`src/components/dashboard/PanelEvolucion.jsx`** muestra si vamos mejor o peor que el mes pasado: trabajos terminados, tiempo en asignar, tiempo en resolver y reportes recibidos.

- **La dirección de "bueno" depende del indicador**, no del signo: en los tiempos, bajar es mejorar (`mejorEsMenos`), y el color e ícono siguen esa lectura. Verde no significa "subió", significa "mejoró".
- **División por cero controlada**: si el mes anterior fue 0 o no hay dato, se muestra "Sin datos del mes anterior para comparar" en vez de un porcentaje infinito. Verificado con los casos `5 vs 0`, `0 vs 5`, `x vs null`.
- "Reportes recibidos" lleva una nota aclarando que **más reportes no es malo**: significa que los vecinos están usando el canal. Sin esa nota, un alcalde podría leer el aumento como un empeoramiento y desincentivar el uso de la app.

## 35. Propuesta comercial, textos legales y sectores reales (03-ago-2026)

Tanda de trabajo **no técnico** pedida explícitamente: los tres pendientes de venta que bloqueaban cobrarle a un municipio (§27), en este orden — propuesta, políticas, sectores.

### 35.1 Propuesta comercial (`docs/PROPUESTA-COMERCIAL.md`)

Documento listo para enviar a la Municipalidad de Licantén, escrito para ser reutilizable cambiando comuna y cifras. Acompañado de **`docs/PROPUESTA-COMERCIAL-NOTAS.md`**, que es interno y **no se envía**.

**La decisión que ordena todo el pricing es el tope de Compra Ágil.** La Ley 21.634 lo subió a **100 UTM** (dic-2024). Bajo ese monto un municipio contrata directo por Mercado Público, sin licitación; sobre él necesita una licitación pública, que son meses de proceso y competencia con proveedores grandes. Por eso el plan base se calibró para caber con holgura:

| Plan | Población | Puesta en marcha | Mensual | Primer año |
|---|---|---|---|---|
| Comuna | ≤ 10.000 | UF 20 | UF 8 | UF 116 ≈ **66 UTM** ✅ |
| Comuna Mayor | 10.001–50.000 | UF 24 | UF 12 | UF 168 ≈ **96 UTM** ⚠️ justo |
| Ciudad | > 50.000 | UF 45 | UF 20 | UF 285 ≈ 162 UTM → licitación |

Licantén (≈6.900 hab.) cae en el plan Comuna. Precios en **UF** para que el contrato no se desactualice. Referencias usadas: UF $40.844,79 (2-ago-2026), UTM $71.649 (ago-2026). **El plan Comuna Mayor hay que recalcularlo antes de cada cotización** — 96 UTM deja poco margen si la UF sube.

Compromisos que el documento asume y que hay que poder cumplir: SLA por severidad (crítica: 4 h hábiles de respuesta), disponibilidad 99,5% mensual con descuento topeado en una mensualidad, 4 horas mensuales de ajustes incluidas, UF 2/hora para desarrollo adicional, y garantía de devolución íntegra en los primeros 60 días.

**Cinco promesas del documento que hoy NO se pueden cumplir** — están en la tabla de la sección 1 de las notas, y son la razón de que la propuesta no se pueda enviar todavía. **Al 30-ago-2026 quedan cuatro**: la inscripción en Mercado Público está hecha (§49). Las otras cuatro: dominio propio (hoy es `.web.app`, requiere Blaze), alerta de WhatsApp (bot no oficial en la PC del usuario), respaldo diario (tarea programada nunca confirmada, §25) y manual de uso (no existe). La más grave es la tercera: comprometer contractualmente una alerta de emergencias que corre sobre automatización no oficial de WhatsApp es exponerse a un incumplimiento el día que Meta bloquee el número.

### 35.2 Política de privacidad y términos de servicio (Ley 21.719)

Cierra el bloqueante §27.3. **La Ley 21.719 entra en plena vigencia el 1-dic-2026** (publicada 13-dic-2024, vacancia de 24 meses); hasta entonces rige la 19.628. Los textos aplican desde ya el estándar más exigente.

- **`src/pages/PrivacidadPage.jsx`** y **`src/pages/TerminosPage.jsx`**, rutas públicas `/:municipioSlug/privacidad` y `/:municipioSlug/terminos`, sin login y lazy-loaded (10,9 kB y 7,3 kB — no pesan en el bundle del ciudadano).
- **`src/components/common/PaginaLegal.jsx`**: envoltorio común (tenant, encabezado, pie, `ULTIMA_ACTUALIZACION`) más el helper `<ContactoDatos>`.
- **Reparto de roles legales**: la **municipalidad es la responsable** del tratamiento y **TuMuniAquí el encargado**. Por eso el contacto para ejercer derechos es del municipio, no nuestro — campo nuevo `municipalidades/{id}.contacto_datos`, que se carga con **`scripts/configurar-contacto-datos.mjs`**. Si no está configurado, la página dirige a la Oficina de Partes en vez de mostrar un correo inventado.
- **El texto describe lo que la app guarda hoy, no una plantilla.** Se escribió leyendo `crearIncidencia` y `registrarTicketPublico`. Dato importante: **§27 y §11 estaban desactualizados** — decían que la app pide RUT, pero el RUT se eliminó el 02-ago-2026 (§29). Hoy los datos personales obligatorios son **nombre y WhatsApp**, lo que hace estos textos *más* necesarios, no menos.
- **Sección "Qué es público y qué no"**, que es la que importa: público = categoría, gravedad, coordenadas, `direccion_texto`, fotos, estado y calificación. Nunca público = nombre, contacto y `detalles_adicionales`. Se advierte explícitamente que las fotos son públicas (no fotografiar personas ni patentes).
- **Punto de recolección**: el aviso con los dos enlaces va dentro de `PasoFoto.jsx`, justo bajo los campos de nombre y WhatsApp — no en un pie de página. El vecino tiene que poder leerlo *antes* de entregar el dato. Los enlaces abren en pestaña nueva porque el formulario no persiste el borrador entre navegaciones.
- De paso se agregó un **pie de navegación** en `FormularioCiudadano.jsx` con enlaces a transparencia, consulta de reporte, privacidad y términos — esto cierra además el pendiente menor §27.11 (a `/transparencia` solo se llegaba escribiendo la URL).

**Lo que estos textos NO son**: no los revisó un abogado. Son un borrador sólido y específico, pero antes de firmar con un municipio hay que hacerlos revisar, y hay que redactar el **acuerdo de tratamiento de datos** (anexo del contrato) que la propuesta menciona en su sección 8.

### 35.3 Sectores reales de Licantén (`scripts/configurar-sectores.mjs`)

Los 5 sectores anteriores eran inventados. Se reemplazaron por las **19 localidades reales** que enumera el Plan Regulador Comunal de Licantén, de este a oeste: La Higuera, Idahue, Placilla, La Leonera, Idahue Chico, Licantén, La Empalizada, Los Cristales, Villa Angosta, Quelmén, Lora, El Huapi, Naicura, Los Cuervos, Las Puertas, El Médano, La Pesca, Iloca y Duao.

**Error real encontrado**: la lista inventada incluía **Lipimávida, que pertenece a la comuna de Vichuquén**, no a Licantén. Si le hubieran caído incidencias, el Alcalde habría estado midiendo territorio ajeno. Eliminada, con una nota en el archivo para que no vuelva.

**Solo 3 coordenadas pudieron verificarse** contra una fuente: Licantén centro (-34.9743, -72.0604), Iloca (-34.9167, -72.1833) y Lora (-35.017, -72.067). Las otras 16 quedaron en `null`. **No se rellenaron a ojo a propósito**: un sector con la coordenada equivocada no falla de forma visible — simplemente no le caen incidencias, o le caen las del vecino. Habría sido el mismo problema que se estaba arreglando, con nombres más creíbles.

Limitación del entorno que lo causó: la geocodificación automática no fue posible — Nominatim, Photon, Overpass, GeoNames y Wikipedia devuelven **403 desde el proxy** de este entorno; solo `WebSearch` pasa, y sus resultados le asignaban a Duao las coordenadas de Iloca. Si en el futuro hay acceso a un geocodificador, esto se resuelve en minutos.

El script se reestructuró para que esa incertidumbre sea explícita en vez de silenciosa:
- Cada sector lleva `confirmado: true|false` más `fuente` o `nota`. Esos tres campos son **metadata del archivo y se eliminan antes de escribir a Firestore** — a `municipalidades/{id}.sectores` solo van los 4 campos que `utils/sectores.js` usa.
- **Sin flags, el script se niega a cargar** si hay sectores sin confirmar, y lista cuáles son con las dos salidas posibles. El chequeo va **antes** de la validación de forma, si no el error visible sería "lat/lng deben ser números" — cierto pero inútil.
- **`--revisar`** no toca Firestore ni pide credenciales: imprime un link de Google Maps por sector (a las coordenadas si están, a la búsqueda del nombre si no) para confirmar cada punto en pantalla.
- **`--solo-confirmados`** carga los 3 verificados y avisa qué localidades quedan fuera y que sus incidencias van a caer en "Fuera de los sectores definidos".

Probado los tres caminos: `--revisar` lista los 19, sin flags bloquea con exit 1 y el mensaje correcto, y `--solo-confirmados` pasa la validación y llega al paso de credenciales.

**Pendiente para el usuario**: confirmar las 16 coordenadas con `--revisar` (menos de un minuto cada una) y, de paso, validar la lista con alguien del municipio — el PRC es de 2011 y puede haber villas o poblaciones urbanas nuevas dentro de Licantén que convenga separar del sector "Licantén (centro)".

## 36. Rediseño del panel del Alcalde y capa visual tipo app nativa (04-ago-2026)

Pedido en tres tandas sobre capturas del Dashboard General: el mapa se veía cortado al bajar, el panel tenía "demasiada información y desordenada", las tarjetas no hacían nada, y faltaba información de equipo. Después se sumó un brief de diseño (marca blanca, mobile-first, modales de alto contraste) y otro de cinco *features* de producto.

### 36.1 Jerarquía: el problema real era que todo pesaba lo mismo

Había ~20 cifras del mismo tamaño apiladas encima del mapa. Con todo al mismo peso no se lee nada — es el anti-patrón de "ocho colores cuando la historia es un número" de la skill `dataviz`. Ahora:

- **Una sola cifra protagonista** (regla de la skill: exactamente una por vista): reportes sin resolver, con un medidor de porcentaje resuelto.
- **Tres tarjetas de acción** clicables: emergencias, atrasados, por asignar.
- **Fila secundaria** más callada para el contexto (en ejecución, resueltos del mes, asistencia, cuadrillas, tiempo, satisfacción).

**Error encontrado al verificar con capturas, no al escribir el código**: la primera versión repetía cada número del bloque protagonista en las tarjetas de abajo (31, 68, 12) — exactamente el problema que se estaba arreglando. Se corrigió para que el bloque protagonista aporte lo único que no está en ninguna otra parte: la proporción resuelta. **La lección es que este panel hay que mirarlo renderizado; leyendo el JSX no se ve.**

- **`ModalDetalleIndicador.jsx`** (nuevo): al tocar una tarjeta, lista los reportes que hay detrás del número, ordenados por urgencia (Alta primero, y dentro de cada nivel el más antiguo), con el reparto por departamento arriba. Tocar uno lo abre en el mapa. Tope de 40 filas, avisando cuántas quedan fuera.
- **Los filtros pasaron a una sola fila** arriba de todo lo que acotan (antes vivían dentro del panel de la lista y no se veía que también afectaban al mapa).

### 36.2 Scroll y final de página

El bloque mapa+lista era el último elemento con `md:h-[calc(100vh-4rem)]`: al llegar ahí ocupaba el viewport completo y la página terminaba sin señal de cierre. Ahora tiene altura acotada, **en móvil la lista fluye con la página** (se quitó el scroll anidado, que era lo que producía la sensación de "cortado") y debajo va un **pie real** con enlaces.

### 36.3 Equipo: ficha, designación y contacto directo

- **`FichaTrabajador.jsx`** (nuevo) + **`utils/equipo.js`** (nuevo): al hacer clic en el nombre de un trabajador se despliega su ficha — departamento, jefatura directa (jefe de cuadrilla del roster + Jefe de Departamento de `usuarios_municipales`, con contacto), trabajos en curso con dirección exacta y enlace "cómo llegar", y horas comprometidas / del mes / históricas.
- El estado **"Designado" es clicable** y abre esa misma ficha, que es donde está la ubicación.
- **Contacto directo del jefe** (WhatsApp + correo) en cada tarjeta de departamento. Campo nuevo y opcional `usuarios_municipales.telefono`, con input en el alta de funcionarios.
- **`jefaturaDe()`** detecta la jefatura de cuadrilla por el texto del cargo (jefe/jefatura/supervisor/capataz), porque el roster no tiene un campo booleano — los cargos son texto libre. Nunca se reporta a sí mismo como su propio jefe.
- **No hay "horas trabajadas hoy" a propósito**: la asistencia solo guarda `fecha_asistencia` ("YYYY-MM-DD"), no hora de entrada, así que cualquier cifra diaria sería inventada. Está escrito en la propia ficha.
- **Límite de reglas que condicionó el diseño**: `usuarios_municipales` solo lo puede listar el `ALCALDE_ADMIN` (y cada uno su propio doc), **no** un `JEFE_DEPARTAMENTO`. Por eso `funcionarios` se pasa como prop desde el lado del Alcalde en vez de suscribirse dentro del modal; cuando no llega, la ficha degrada sola y muestra solo la jefatura de cuadrilla.

Lógica de `equipo.js` verificada con casos límite: incidencia sin presupuesto, trabajador inexistente, trabajador que ES el jefe de cuadrilla, y normalización de teléfonos.

### 36.4 Capa visual

- **Tokens** de superficie, tinta y estado centralizados en `index.css`. **Van como tripleta RGB** con el patrón `rgb(var(--x) / <alpha-value>)`, igual que `primary`. **Bug real encontrado al mirar una captura**: definidos como `var()` de hex plano, Tailwind 3 **no genera las clases con modificador de opacidad** (`bg-tinta-fuerte/5`, `ring-estado-critico/20`) — no da error de build, simplemente el estilo desaparece. Se detectó porque una cifra que debía ser roja salía gris.
- **El acento por municipalidad ya estaba centralizado** (`--color-primary-rgb`, escrito por `utils/tema.js` desde `color_primario` del tenant). No se tocó: cambiar el color de una comuna sigue siendo cambiar un campo en Firestore.
- **Sin webfont, a propósito.** En iOS y Android la fuente *nativa* (SF Pro / Roboto) es lo que hace que algo se vea nativo; cargar Inter desde un CDN se vería menos nativo y costaría ~100 kB a celulares de gama baja con señal rural. Se usa Inter solo si está instalada localmente.
- **Modales**: desenfoque de fondo, velo más oscuro, entrada tipo hoja desde abajo en móvil con agarradera, cierre con Escape, alto acotado con scroll interno. Mismo tratamiento en `SelectorCategoria`, que el vecino usa de pie en la calle.
- **Áreas táctiles de 44 px** mínimo (clase `.toque`), `prefers-reduced-motion` respetado, zona segura del iPhone.
- **Se quitó `user-scalable=no`** del viewport: bloquear el zoom es una barrera de accesibilidad real (WCAG 1.4.4) para vecinos mayores o con baja visión.

### 36.5 Barra inferior del vecino

**`BarraNavegacion.jsx`** (nuevo): tres destinos —Mis reportes, Reportar (FAB elevado al centro, en el color del tenant), Cómo vamos—. Requirió la ruta nueva **`/:municipioSlug/estado`** para que las tres pestañas vivan dentro de la misma comuna; `/estado` a secas se mantiene intacto para los links y QR ya repartidos. De paso cierra el pendiente §27.11 (a `/transparencia` solo se llegaba escribiendo la URL).

### 36.6 Compresión de fotos y prevención de doble envío

- **`utils/comprimirImagen.js`** (nuevo, `browser-image-compression`): 800 px / 500 kB antes de subir. Va dentro de `storageService.subirImagen`, **el único punto por el que pasan todas las subidas** (vecino, foto "después" de la cuadrilla, seguimiento), así ninguna puede saltárselo. **Import dinámico**: son 53 kB que solo hacen falta cuando alguien adjunta una foto. Si falla, sube el original — es una optimización, no un requisito. El tope previo de 8 MB subió a 32 MB porque rechazaba fotos legítimas de cualquier celular actual.
- **`hooks/useAccionUnica.js`** (nuevo) + `Boton` rehecho: el candado es un **`useRef`, no un `useState`**. `setState` no actualiza la variable en el acto, así que entre el primer clic y el re-render hay milisegundos en los que un segundo clic pasa el chequeo. En el alta de funcionarios eso creaba **dos cuentas de Firebase Auth**, que no se pueden borrar desde la app (requiere consola). `Boton` se bloquea solo cuando su `onClick` devuelve una promesa; los `<form onSubmit>` usan el hook.
- **Ya existía y no se tocó**: la cola offline (`colaOffline.js` + `useSincronizacionOffline.js`, §10) ya guarda reportes sin señal y los sincroniza al volver la conexión.

### 36.7 Mapa de calor y reporte gerencial en PDF

- **`CapaMapaCalor.jsx`** (nuevo, `leaflet.heat`): alternador Pines / Mapa de calor sobre el mapa del Alcalde. **El mapa es Leaflet + OpenStreetMap, no Google Maps ni Mapbox.** Los reportes pesan por gravedad (Alta 1 / Media 0,55 / Baja 0,3) y los resueltos pesan un 40% — sin eso, veinte grafitis en el centro tapan tres emergencias en un sector rural. En modo calor **no se dibujan los pines**: superponerlos anula la lectura de densidad. Degradado semántico amarillo→rojo, que es la excepción declarada a la regla de "una sola tonalidad", **siempre con leyenda de escala**.
- **`utils/reporteGerencial.js`** (nuevo, `jspdf` + `jspdf-autotable`): botón "Reporte de gestión" en el header del Dashboard, solo escritorio. Encabezado en el color del tenant, cuatro indicadores de los últimos 7 días, estado actual del municipio y tabla de los 30 últimos reportes, con pie y paginación. **Import dinámico** (~350 kB, solo el día que alguien aprieta el botón). Se arma sobre TODAS las incidencias, no las filtradas: es un informe del municipio, no de lo que haya en pantalla.
- **Por qué jsPDF acá y no imprimir como la Cuenta Pública (§31)**: son documentos distintos. La Cuenta Pública lleva gráficos, y ahí imprimir gana porque los gráficos en canvas salen cortados o en blanco al pasar por una librería de PDF. Esto es texto y tabla, sin un solo gráfico, así que jsPDF da un archivo idéntico en cualquier computador.

**Verificación**: el panel y la barra inferior se revisaron **renderizados** (capturas a 390 px y 1440 px) con datos de prueba, no solo compilados — así se encontraron el bug de los tokens y la duplicación de cifras. El PDF se generó de verdad en el navegador y se revisó página por página (2 páginas, tildes y ñ correctas). La capa de calor se verificó con tres racimos sembrados a propósito. Lo que **falta que confirme el usuario** es todo lo que requiere sesión real: el panel con datos de producción y la ficha de trabajador con roster real.

## 37. Buscador de direcciones en el Paso 1 (09-ago-2026)

Pedido del usuario sobre una captura del Paso 1: poder **escribir la dirección a mano y que la app la encuentre**, sin quitar el GPS que ya estaba. El Paso 1 pasó de dos formas de fijar la ubicación a **tres, a propósito redundantes**, porque ninguna sirve para todo el mundo: el GPS falla justo donde más se reporta (adentro de la casa, celular viejo con 200 m de error), tocar el mapa exige saber leerlo, y escribir "Los Aromos 320" es como ubica un lugar un adulto mayor.

### 37.1 Piezas nuevas

- **`services/geocodificacionService.js`** — `buscarDirecciones()` (dirección → coordenadas) y `obtenerDireccionAproximada()` (coordenadas → dirección). Único punto de contacto con el proveedor de geocodificación.
- **`hooks/useBusquedaDirecciones.js`** — busca mientras el vecino escribe, con rebote de 700 ms y `AbortController` (cada tecla cancela la búsqueda anterior).
- **`hooks/useDireccionInversa.js`** — averigua qué dirección es el punto marcado, con rebote de 900 ms para no consultar en cada milímetro de arrastre del pin.
- **`components/ciudadano/BuscadorDireccion.jsx`** — el campo con lista de resultados, navegable con teclado (flechas/Enter/Escape) y `role="combobox"`/`listbox`.
- **`utils/sectores.js` → `buscarSectoresPorNombre()`** y **`utils/busqueda.js` → `normalizarTexto()`** (quita tildes; el vecino escribe "licanten" desde el teclado del celular).

### 37.2 Por qué Nominatim (OpenStreetMap) y no Google Places

Es el mismo proyecto que ya provee los tiles del mapa, es gratis, y **no pide API key ni cuenta con facturación** — el mismo criterio por el que la capa satelital es Esri (§11). Sin tarjeta (el bloqueante #1 de §27) Google Places no es una opción. La contrapartida es su política de uso justo: **1 petición por segundo y sin autocompletado agresivo**, respetada con tres cosas que hay que mantener si alguien toca este código:

1. **Espaciado forzado** entre peticiones (`esperarTurno`, 1100 ms), que además serializa búsqueda e inversa.
2. **Caché en memoria** de la pestaña (40 entradas por tipo): corregir una letra y borrarla no gasta peticiones.
3. **Rebote** en los dos hooks.

Medido en el navegador con el flujo completo (5 búsquedas + 2 puntos marcados): **8 peticiones, separación mínima 1986 ms**. Si algún día el volumen deja de caber en esa política, `geocodificacionService.js` es el único archivo a cambiar (instancia propia o proveedor pago).

### 37.3 Dos fuentes de resultados, y por qué la segunda importa en comuna rural

- **Sectores del municipio** (`municipalidades/{id}.sectores`, §33): resuelven **al instante y sin red**, porque vienen con el documento del tenant que ya está en memoria. Van **primero** en la lista: son los nombres que el vecino de la comuna realmente usa.
- **Nominatim** para calles y números.

En Licantén, OSM sí conoce calles ("Agustín Besoaín"), rutas ("Ruta J-60") y localidades ("Iloca", "Duao", "La Pesca", "Punta Duao"), pero **no las villas**. Ahí es donde entran los sectores — y hoy no aportan nada todavía, porque el documento de `licanten` no tiene sectores con coordenadas cargados (es el pendiente #2 de `RETOMAR-AQUI.md`: 16 de 19 sin confirmar). El código ya está y se enciende solo al correr `scripts/configurar-sectores.mjs`.

### 37.4 Acotado a la comuna, con reintento

La consulta sale con el nombre de la comuna pegado al final (`"los aromos 123, Licantén, Chile"`), `countrycodes=cl` y un `viewbox` de ±0,25° alrededor de `centro_mapa`. Además se **filtran los resultados a 30 km del centro**: sin ese filtro, escribir "Los Aromos" devuelve calles de Santiago, que en esta app no son un resultado válido.

**Solo si la primera pasada viene vacía** se reintenta con el texto tal cual: en zona rural el camino existe en OSM pero no está asociado a la comuna, y pegarle el nombre hace que no encuentre nada. `nombreComuna()` limpia el "Municipalidad de" del nombre institucional del tenant, que como consulta arrastra los resultados al edificio municipal.

### 37.5 La dirección del punto se copia al Paso 2

El campo "¿Dónde exactamente?" del Paso 2 (obligatorio desde §29) **llega escrito** con la dirección del punto marcado, con un aviso en el color del tenant de que la completó la app. Es la misma información que el vecino ya dio en el Paso 1; volver a pedírsela a mano es la fricción que hace que abandone el formulario.

- **En cuanto el vecino toca ese campo, su texto no se sobreescribe nunca más** (`direccionEditadaAMano`, un `useRef` y no estado: lo lee el efecto de la sugerencia, que no debe volver a correr cuando el vecino escribe). Verificado: se escribió "Agustín Besoaín 45, frente a la escuela", se volvió al Paso 1, se movió el pin, y el texto siguió intacto.
- **La dirección elegida en el buscador le gana a la inversa**, y cuando existe **la inversa no se consulta** (0 peticiones medidas): ya sabemos cómo se llama el punto.
- Si el punto cae en campo abierto y Nominatim contesta solo "Región del Maule", **no se muestra nada**: es un extra, y una región no es una dirección que le sirva a la cuadrilla.

### 37.6 Detalles que salieron de probarlo, no de escribirlo

- **`CentradorMapa`** (nuevo, dentro de `MapaSeleccionUbicacion.jsx`): el mapa solo se centraba solo la primera vez (la `key` que fuerza un remount), así que **buscar una dirección dejaba el pin fuera de la vista** y el vecino no tenía señal de que la búsqueda funcionó. Depende de `enfoque.id` —un id nuevo por pedido— y no de las coordenadas, para que un toque en el mapa no arrastre la vista debajo del dedo. Los resultados aproximados (sector o localidad) abren con **zoom 15 y no 17**: el punto exacto está en algún lugar alrededor de ese centro.
- **Aviso de "dirección aproximada"**: un sector o una localidad resuelven a su centro, que puede quedar a cientos de metros. Se le pide explícitamente arrastrar el pin, para que no llegue una cuadrilla al lugar equivocado.
- **Sin conexión el buscador no desaparece**: se apaga solo la parte de red (0 peticiones al aire), los sectores siguen buscándose y el mensaje dice qué hacer ("usa el GPS o toca el mapa").
- **`z-[1100]`** en la lista de resultados: el contenedor y los controles de Leaflet llegan hasta `z-1000`.

**Verificado en el navegador contra Firestore de producción** (`/licanten/reportar`, viewport 375×812): búsqueda con y sin tildes, calle → pin + mapa centrado + Paso 2 prellenado, localidad → aviso de aproximada, geocodificación inversa al tocar el mapa ("Paseo Borde Costero de Iloca, Iloca"), texto editado a mano que sobrevive a mover el pin, modo sin conexión, y `buscarSectoresPorNombre` con casos límite (sector sin coordenadas, una sola letra, lista vacía). Sin errores de consola. **`npm run build` pasa. NO está desplegado** — sigue pendiente el despliegue de §35 en adelante.

## 38. Las fotos del vecino no llegaban al funcionario (09-ago-2026)

**Bug de producción reportado por el usuario**: ni el Alcalde ni ningún funcionario veían la foto que manda el vecino. Estuvo roto desde la migración a fotos múltiples (§11) hasta hoy.

### 38.1 La causa

`crearIncidencia` sube cada foto a Cloudinary **en segundo plano** (a propósito: el vecino recibe su ticket al instante, sin esperar una subida que en zona rural puede tardar mucho) y después escribe la URL con `updateDoc(... arrayUnion(url))`. Ese update lo hace el **vecino, sin login** — y `firestore.rules` no tenía ninguna cláusula que lo permitiera:

- `puedeGestionarIncidencia` exige funcionario autenticado.
- `esVotoValidoIncidencia` exige `hasOnly(['upvotes','usuarios_afectados'])`.
- `esCalificacionValida` exige `hasOnly(['calificacion_ciudadano'])`.

Resultado: `permission-denied`. La imagen quedaba subida en Cloudinary y el campo `fotos_antes_urls` del reporte en `[]`, así que `GaleriaFotos` (que devuelve `null` con arreglo vacío) no dibujaba nada. Lo mismo en `tickets_publicos`, o sea que el vecino tampoco veía su propia foto en el pin del mapa.

**Por qué nadie lo notó antes**: ese `updateDoc` era el único de todo el archivo **sin `.catch()`**, así que el rechazo quedaba como promesa rechazada sin manejar; y el de `tickets_publicos` tenía `.catch(() => {})`, que se lo tragaba entero. Dos silencios encadenados.

### 38.2 Cómo se diagnosticó (sin adivinar)

1. **Datos reales**: los 30 tickets más recientes de `tickets_publicos` en producción, por REST (lectura pública), todos con `fotos_antes_urls` vacío — incluidos los de hoy, con la foto ya obligatoria desde §29.
2. **Descartar Cloudinary**: el bundle desplegado sí trae el `cloud_name` configurado, y una subida de prueba real desde el navegador devolvió `https://res.cloudinary.com/.../pruebas/diagnostico-fotos/...`. La subida nunca fue el problema.
3. **Descartar deriva de reglas**: se bajó el ruleset **realmente desplegado** con la Rules API (`firebaserules.googleapis.com/v1/.../releases` + el ruleset del release) y se comparó con el repo: **idénticos**. Lo que estaba enforced era exactamente `firestore.rules`.

Vale la pena conservar el método: `diff` entre el ruleset desplegado y el archivo local es la única forma de saber qué se está aplicando de verdad.

### 38.3 El arreglo

**`firestore.rules` → `esFotoCiudadanoValida(antes, despues)`**, agregada al `allow update` de `incidencias` y de `tickets_publicos`. Permite el update anónimo **solo** si:

- toca únicamente `fotos_antes_urls`;
- el arreglo crece en exactamente 1 y había menos de 3;
- el arreglo nuevo es **exactamente** `previas.concat([agregada])` — esta comparación es la que impide reordenar, pisar o borrar fotos ya cargadas (sin ella, colar una URL al principio dejaba pasar cualquier host);
- la URL agregada es un string de ≤500 caracteres bajo `https://res.cloudinary.com/`.

**Límite conocido y aceptado** (mismo criterio que §28): quien conozca un `incidencia_id` —que es público vía `tickets_publicos`— puede colgarle hasta 3 imágenes de Cloudinary. No se restringe a *nuestra* cuenta porque el preset de subida es "unsigned" y público por diseño: cualquiera puede obtener una URL bajo nuestro cloud de todos modos. Lo que sí queda cerrado es apuntar a otro host (un pixel de rastreo, un dominio propio).

**`incidenciasService.js`**: los dos `updateDoc` de la foto ahora tienen `.catch()` que registra el error con el número de foto y el id del documento. El de `tickets_publicos` sigue siendo best-effort, pero **loguea** en vez de tragar.

### 38.4 Verificación

- **Las reglas compilan** contra el proyecto real: `firebase deploy --only firestore:rules --dry-run` → *"rules file firestore.rules compiled successfully"*. Eso valida el `let`, el `concat()`, la comparación de listas y el `matches()`.
- **La subida a Cloudinary funciona** (prueba real desde el navegador, ver 38.2). Queda un archivo de prueba en `pruebas/diagnostico-fotos/` de Cloudinary que se puede borrar.
- **El comportamiento de las reglas NO se pudo probar automáticamente en esta máquina**, y hay que ser honesto al respecto: el emulador de Firestore **no arranca acá** (Netty falla con *"failed to create a child event loop"* / `SocketException: Invalid argument`, con y sin sandbox), y la API `firebaserules:test` devuelve **403** porque la cuenta de servicio del repo no tiene el permiso `firebaserules.rulesets.test`. Las dos vías para cerrar esto: darle a esa cuenta el rol *Firebase Rules Admin*, o probar en el emulador desde otra máquina. El set de casos ya está escrito y listo para correr (12 casos: agregar 1ª/2ª/3ª foto, 4ª rechazada, host ajeno, dos URLs de una vez, pisar, borrar, colar al principio, foto+estado, y las regresiones de voto y calificación).
- **Pendiente de despliegue**: sin `firebase deploy --only firestore:rules` el arreglo no tiene efecto. Es un despliegue independiente del frontend — no arrastra §35/§36/§37.

### 38.5 Los reportes viejos siguen sin foto

Las URLs nunca se guardaron y el `File` del navegador ya no existe, así que el arreglo **no recupera nada hacia atrás**: aplica desde el próximo reporte. Las imágenes en sí muy probablemente siguen en Cloudinary, en carpetas `incidencias/{incidenciaId}/antes/`, o sea que se pueden volver a vincular con un script que las liste y escriba las URLs con el Admin SDK. Eso **requiere las credenciales de la Admin API de Cloudinary** (`api_key` / `api_secret`, que hoy no están en `.env` — solo el cloud name y el preset unsigned).

## 39. WhatsApp: la migración a la Cloud API oficial (estado real al 09-ago-2026)

**Lo más importante de acá: la migración se hizo bien, pero se perdieron tres funciones en el camino y ninguna estaba anotada — la peor deja a un vecino sin forma de recuperar su ticket (39.3).**

**Esta sección existe porque la migración no estaba documentada en ninguna parte.** El usuario reemplazó el bot no oficial por la API oficial de Meta, pero §21, §23, §27 y `docs/PROPUESTA-COMERCIAL-NOTAS.md` seguían describiendo el bot viejo — o sea que cualquier conversación nueva (y la propuesta comercial) partía de una foto equivocada del sistema. Lo de acá está leído del código y verificado contra producción, no de memoria.

### 39.1 Lo que hay hoy

`whatsapp-bot/` (Baileys, §23) **ya no existe en el repo**. Lo reemplazó **`whatsapp-api-oficial/`**, proyecto Node independiente que habla con la **Cloud API oficial de Meta** (`https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages`). Dependencias: `axios`, `express`, `firebase-admin`. Nada de `whatsapp-web.js`, Baileys ni Venom.

Diferencias que importan respecto del bot viejo:

| | Bot viejo (§23) | Bot actual |
|---|---|---|
| Transporte | Baileys (no oficial, viola los TOS) | Cloud API oficial de Meta |
| Riesgo de bloqueo del número | Real, sin aviso ni apelación | Ninguno |
| Autenticación con Firebase | Client SDK con cuenta `TERRENO` dedicada | **Admin SDK** (`FIREBASE_SERVICE_ACCOUNT`), sin cuenta de funcionario |
| Dónde corre | La PC del usuario, ventana abierta | **Render** (Web Service), con auto-ping cada 10 min |
| Texto de los mensajes | Libre, armado en código | **Plantillas aprobadas por Meta** (el texto vive en Meta, no en el repo) |

**Archivos**: `server.js` (los listeners de Firestore y el envío), `whatsapp.js` (cliente de la Graph API + traducción de códigos de error de Meta), `webhook.js` (consultas entrantes del vecino), `categorias.js` (copia de las etiquetas), `ver-plantillas.js` y `probar*.js` (utilidades de diagnóstico).

**Variables de entorno** (viven en Render, no en el repo): `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`, `WHATSAPP_TEMPLATE_LANG` (por defecto `es_CL`), `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `FIREBASE_SERVICE_ACCOUNT`, `PORTAL_URL_ESTADO`.

**Verificado el 10-ago-2026 contra la Graph API**: el `WHATSAPP_TOKEN` es de **usuario del sistema** (`TuMuniAqui-bot`) y **no expira** — la advertencia del `.env.example` sobre los tokens de 24 h ya no aplica a este servicio. El número es **+56 9 6540 0932** ("TumuniAqui"), con calidad **GREEN**. **Pero `WHATSAPP_WABA_ID` en Render está mal**: tiene el ID del *número de teléfono*, no el de la cuenta de WhatsApp Business. No rompe los envíos (`server.js` no lo usa; solo `ver-plantillas.js`), pero deja el diagnóstico ciego justo cuando se necesita. El valor correcto está en Meta for Developers → app → WhatsApp → Configuración de la API, como "Identificador de la cuenta de WhatsApp Business". Y el usuario del sistema **no tiene ninguna WABA asignada** (`me/assigned_whatsapp_business_accounts` devuelve vacío), así que hoy ese token puede enviar pero no puede listar plantillas.

### 39.2 Qué se sigue notificando, y con qué plantilla

Solo **dos** eventos, cada uno con su plantilla aprobada en Meta y su bandera en `incidencias`:

1. **Nuevo ticket** → plantilla `alerta_nuevo_ticket`, bandera `notificado_whatsapp_creacion`. Dos variables **en este orden**: `{{1}}` categoría legible, `{{2}}` número de ticket.
2. **Ticket resuelto** → plantilla `ticket_resuelto`, bandera `notificado_whatsapp`. **Una sola** variable: `{{1}}` número de ticket; el link al portal va escrito fijo dentro del texto aprobado.

**La cantidad de variables tiene que calzar exacto** o Meta rechaza el envío entero. Igual el nombre de la plantilla y el idioma: `es_CL` es "Spanish (CHL)" en el editor de Meta, y `es` a secas es otro idioma distinto (error 132001).

**Texto aprobado de las plantillas, para tenerlo versionado acá** (el texto real vive en Meta, no en el repo: si alguien lo edita allá, esto queda desactualizado). Redactado con el usuario el 09-ago-2026, en trato de **usted** y con **un solo asterisco** para la negrita — WhatsApp no entiende el `**` de Markdown, y con `**texto**` al vecino le llegan asteriscos literales:

```
[alerta_nuevo_ticket]
Estimado/a vecino/a:

Hemos recibido correctamente su reporte correspondiente a *{{1}}*.

Su número de ticket es *{{2}}*. Le recomendamos conservarlo, ya que será necesario para
realizar el seguimiento de su solicitud.

Nuestro equipo municipal ha sido informado y se coordinarán las acciones necesarias para
atender y solucionar el problema reportado a la brevedad posible.

Agradecemos su colaboración y compromiso con nuestra comunidad. Sus reportes nos permiten
identificar necesidades y seguir trabajando por una mejor comuna de *Licantén*.

Revise aquí el estado de su reporte:
https://app-incidencias-urbanas.web.app/licanten/estado

*Municipalidad de Licantén*
```

```
[ticket_resuelto]
Estimado/a vecino/a:

Le informamos que su reporte con ticket *{{1}}* ha sido *resuelto*.

Puede revisar el detalle del trabajo realizado aquí:
https://app-incidencias-urbanas.web.app/licanten/estado

En esa misma página puede calificar la atención recibida. Su evaluación nos ayuda a
mejorar el servicio.

Agradecemos su colaboración y compromiso con la comuna: con la información que nos
entregan los vecinos seguimos mejorando Licantén.

*Municipalidad de Licantén*
```

Detalles que costaron y conviene no volver a descubrir: el **campo "Título"/header no acepta formato** (ahí los asteriscos salen literales, por eso ese campo no tiene el botón `B`); el enlace va en su **propia línea y sin punto final**, porque un punto pegado a la URL puede quedar dentro del link y romperlo; y la muestra de `{{2}}`/`{{1}}` del número de ticket va **sin espacio** (`482173`), porque el bot manda los 6 dígitos crudos — el `482 173` con espacio es solo cómo se muestra en pantalla.

**Consulta conversacional** (`webhook.js`): el código sobrevivió y quedó mejor que el del bot viejo — reconoce el ticket de 6 dígitos (§15) dentro de una frase cualquiera, responde estado/categoría/fechas/lugar y el link para calificar si ya está resuelto.

> 🔴 **PERO NO ESTÁ ENCENDIDO EN PRODUCCIÓN (comprobado el 10-ago-2026).** `GET https://proyectomuni.onrender.com/` responde `200 Status: OK`, pero `GET .../webhook` responde **404**: el router no está montado. `server.js` solo lo monta si están **las dos** variables `WHATSAPP_VERIFY_TOKEN` y `WHATSAPP_APP_SECRET`, y en Render faltan (sin el secret no se puede verificar que la petición venga de Meta, y una URL pública sin firma sirve para hacernos responderle a números arbitrarios). Consecuencia: **hoy el vecino que le escribe al número no recibe ninguna respuesta**, ni siquiera consultando su ticket. Encenderlo es configuración, no código: las dos variables en Render + la Callback URL y el campo `messages` en Meta.

### 39.3 Tres funciones se perdieron en la migración y hay que decir que NO existen

Esto es lo más importante de esta sección. Los campos siguen escribiéndose en cada incidencia nueva (`incidenciasService.js`), pero **no hay una línea de código en ninguna parte que los consuma**:

- **`alertado_alcalde` — la alerta de emergencias al Alcalde (§32) NO está implementada.** El bot oficial tiene exactamente dos listeners (nuevo ticket y resuelto); no hay ninguno para gravedad Alta, y `whatsapp_alcalde` no se lee desde ningún archivo del proyecto (solo lo *escribe* `scripts/configurar-whatsapp-alcalde.mjs`). **Configurar el número no la activa.** Evidencia en producción: 7 reportes de gravedad Alta, `alertado_alcalde: false` en todos, 0 alertas enviadas.
- **`notificado_whatsapp_asignacion` — el aviso al vecino cuando le asignan cuadrilla tampoco existe.** Era uno de los 3 momentos del bot viejo; el oficial solo cubre 2.
- **La consulta "mis reportes" tampoco existe, y esta es la peor.** El webhook actual solo reconoce números de ticket (`extraerNumeroTicket`: 6 dígitos o el formato antiguo `INC-...`); no hay nada que responda a la frase "mis reportes" usando el número del remitente como identidad. **El problema es que §29 eliminó la búsqueda por RUT de `/estado` justificándose precisamente en que esa consulta la reemplazaba** — y `/estado` hoy solo acepta el número de ticket. Resultado: **un vecino que pierde sus 6 dígitos no tiene ninguna forma de recuperar su reporte.** Reponerlo es barato y no necesita plantilla nueva: la respuesta cae dentro de la ventana de 24 h porque la dispara el propio mensaje del vecino. Es una consulta a `incidencias` por `contacto_ciudadano` (el Admin SDK del bot ya puede leerla).

Para revivir cualquiera de las dos hace falta, además del listener: **una plantilla nueva aprobada en Meta**, porque con la Cloud API el texto libre solo se puede enviar dentro de la ventana de 24 h desde que el vecino escribió — y una alerta de emergencia no puede depender de eso.

### 39.4 Verificado contra producción (09-ago-2026)

Banderas de los últimos 25 reportes, leídas con el Admin SDK (solo banderas y fechas, sin datos personales):

- **Todos los reportes desde el 01-ago tienen su aviso de creación enviado**, y los resueltos del 06 y del 09-ago tienen también su aviso de resolución. La cadena funciona.
- Los del 31-jul aparecen sin avisar: son **anteriores** al bot, no una falla actual.
- **0 de 7 emergencias alertadas al Alcalde** (ver 39.3).
- En el documento de `licanten` están vacíos **`whatsapp_alcalde`**, **`contacto_datos`** (las páginas legales siguen mandando a la Oficina de Partes, §35) y **`sectores`** (0 cargados, ni los 3 confirmados de §33).

### 39.5 Lo que sigue siendo frágil para prometerle a un municipio

Ya **no** es el riesgo de bloqueo del número — eso quedó cerrado. Los riesgos reales que quedan:

1. **Editar una plantilla corta las notificaciones hasta que Meta la vuelva a aprobar. CONFIRMADO EN PRODUCCIÓN el 10-ago-2026.** *(Cerrado el 11-ago: Meta aprobó las dos plantillas durante la noche y los 4 avisos pendientes salieron solos al reintentar, sin intervención. El corte duró ~19 horas.)* Se editaron `alerta_nuevo_ticket` y `ticket_resuelto` el 09-ago (mejoras de redacción, ver 39.2) y las dos quedaron **"En revisión"**. Desde ese momento **falló el 100% de los envíos** durante ~13 horas, sin que nadie se enterara: el último WhatsApp que salió bien fue el 09-ago 22:39, y los 4 reportes siguientes —incluido uno de un vecino real— se quedaron sin aviso.

   **Ojo con el error que devuelve Meta**, porque manda por el camino equivocado: `[132001] Template name does not exist in the translation / template name (alerta_nuevo_ticket) does not exist in es_CL`. Suena a que el nombre o el idioma están mal, y **los dos estaban correctos** (nombre exacto, idioma "Spanish (CHL)" = `es_CL`). Lo que Meta quiere decir es que **no hay versión aprobada disponible para enviar**. Antes de tocar `WHATSAPP_TEMPLATE_LANG` o el nombre en `server.js`, revisar el ESTADO de la plantilla en el Administrador de WhatsApp.

   Consecuencias prácticas: (a) no editar plantillas si se necesita que las notificaciones sigan saliendo, y menos un viernes; (b) **tras la aprobación hay que reiniciar el servicio en Render** para que los pendientes se reintenten (el listener solo reacciona a documentos que *entran* a la consulta, y en un reinicio entran todos los que quedaron en `false`); (c) Meta limita cuántas veces se puede editar una plantilla aprobada.
2. **El bot corre en el plan Free de Render**, que apaga el proceso a los ~15 min sin tráfico. Hay un auto-ping cada 10 min que lo evita y funciona, pero un plan gratuito no tiene SLA: si Render lo apaga, no sale ninguna notificación y nadie se entera hasta que reclama un vecino. Para un municipio que paga, esto tiene que estar en un plan pagado.
3. **Meta cobra por mensaje de plantilla.** Es un costo por reporte que hoy no está en los números de la propuesta. Hay que verificar la tarifa vigente de mensajes de utilidad en Chile antes de comprometer volumen.
4. **Si el envío falla, la bandera no se marca** y el reporte se reintenta en cada reconexión del proceso. Es bueno (reintento gratis), pero significa que un envío que falla *siempre* (número que no existe en WhatsApp) se reintenta indefinidamente sin que nadie lo vea, porque el único registro es el log de Render.

## 40. Reportes fantasma: el ticket se creaba sin la incidencia (10-ago-2026)

**Bug de producción reportado por el usuario**, con una descripción que resultó exacta: *"cuando me tira el error `Missing or insufficient permissions` no se envía el reporte, pero al querer enviar otro me aparece que se ingresó la incidencia igual, y nunca agregó número de ticket ni se envió al vecino"*.

### 40.1 La causa

`crearIncidencia` escribía el ticket público **primero y por separado**, y solo después la incidencia (en su propio lote con la marca anti-spam). Cuando la segunda escritura era rechazada, la primera ya estaba hecha: quedaba un **ticket público huérfano**.

El rechazo es real y esperable: `respetaEnfriamiento` en `firestore.rules` (§28) responde `permission-denied` si el mismo dispositivo ya reportó hace menos de 60 s. Se reprodujo exactamente así —dos `crearIncidencia` seguidos con el mismo `dispositivoId`— y el segundo devolvió `permission-denied / Missing or insufficient permissions.`, dejando el huérfano `224018` en `demo`.

Un huérfano hace daño de tres formas, todas visibles para el vecino y ninguna para el municipio:

1. **Aparece en el mapa y en "Últimos reportes de la comuna"** — el vecino ve un reporte que el municipio jamás recibió.
2. **Dispara el aviso de "posible duplicado"** (§16) al vecino siguiente, que se suma con un "+1" a un reporte inexistente. Eso explica el *"me aparece que se ingresó la incidencia igual"*: la detección de duplicados lee `tickets_publicos`, no `incidencias`.
3. **Quema el número de ticket**, que ya no se puede reutilizar.

**Cuántos había**: 23 huérfanos de 110 tickets. **5 de los 9 tickets de Licantén** — o sea que más de la mitad de lo que veía un vecino de la comuna era humo. El más viejo es del 04-ago, así que el bug llevaba días y **es anterior a los cambios de §37/§38** (se comprobó: el despliegue de reglas fue a las 14:31 y el reporte de las 14:41 se creó bien).

**Por qué nadie lo notó**: el vecino veía `Missing or insufficient permissions.` —en inglés, sin motivo— y el funcionario no veía nada de nada. No hay log de servidor en el camino del ciudadano.

**Honestidad sobre el caso puntual del usuario**: el enfriamiento reproduce el síntoma idéntico, pero **no se pudo confirmar que fuera la causa de su envío de las 14:36**: ningún reporte exitoso de ese dispositivo cae dentro de los 60 s previos. La causa exacta de ESE intento quedó sin determinar, y es justamente el motivo por el que el arreglo incluye traducir y registrar el error: hoy la información necesaria no existía en ninguna parte.

### 40.2 El arreglo

- **Un solo lote atómico.** `crearIncidencia` ahora escribe **ticket público + incidencia + marca del dispositivo en un único `writeBatch`**: o quedan los tres, o no queda ninguno. Se verificó repitiendo el escenario del enfriamiento: el segundo intento se rechaza y **no deja ticket**. `registrarTicketPublico` se reemplazó por `agregarTicketPublicoAlLote(lote, {...})`.
- **La colisión de número de ticket se detecta leyendo, no adivinando.** Todos los rechazos llegan como `permission-denied` sin motivo, así que antes se reintentaba con otro número ante cualquiera. Ahora, tras un rechazo, se consulta `tickets_publicos/{numero}` (lectura pública): si existe, fue colisión y se genera otro número; si no existe, el rechazo vino de otra parte y **sube tal cual** en vez de esconderse detrás de 5 reintentos.
- **Reintento de la cola offline, agujero cerrado.** Si el intento original sí alcanzó a escribir (el `conTimeout` de 15 s se rindió pero Firestore terminó), el ticket ya existe y apunta a ese mismo `idDocumento`: ahora se detecta y se devuelve éxito, para que la cola lo dé por sincronizado. Antes ese ítem se reintentaba **para siempre**, porque la afirmación de idempotencia del comentario original era falsa: `setDoc` sobre una incidencia ya creada es un *update*, y las reglas no permiten que un anónimo actualice una incidencia (solo votar, calificar y agregar foto).
- **El vecino ya no ve el error crudo.** `permission-denied` se traduce a *"No pudimos registrar tu reporte. Si acabas de enviar otro, espera un minuto e intenta de nuevo"*, y el error técnico queda en `console.error`.

### 40.3 Verificación

Reproducido y contrastado antes/después con datos reales (municipio `demo`, para no ensuciar Licantén):

| | Antes | Después |
|---|---|---|
| 2º reporte dentro de los 60 s | rechazado **+ ticket huérfano** (`224018`) | rechazado, **sin ticket** |
| Mensaje al vecino | `Missing or insufficient permissions.` | mensaje en español, con qué hacer |

El flujo completo se probó además **por la interfaz** (los 3 pasos, con foto, nombre y WhatsApp) contra `/demo/reportar`, forzando el enfriamiento en el servidor y borrando la marca local para que el aviso amable del cliente no interviniera: el formulario muestra el mensaje nuevo y no se crea ningún ticket. `npm run build` pasa.

### 40.4 Falta hacer dos cosas

1. **Desplegar el frontend**: este arreglo es código de `src/`, así que **producción sigue creando huérfanos hasta que se haga `npm run build && npx firebase deploy --only hosting`**. Ese despliegue arrastra también §36 y §37 (panel nuevo y buscador de direcciones), que no estaban publicados.
2. **Limpiar los 23 huérfanos** con el script nuevo **`scripts/limpiar-tickets-huerfanos.mjs`**, que por defecto **solo informa** y borra únicamente con `--borrar`. Acepta `--municipio licanten` para acotar. Avisa aparte si un huérfano tiene votos de vecinos, porque ahí se está borrando también participación real.

## 41. "Mis reportes" por WhatsApp — la promesa cumplida (10-ago-2026)

Cierra el agujero más grave que dejó la migración a la API oficial (§39.3): **el vecino que perdía su número de ticket no tenía ninguna forma de recuperarlo.** `/estado` solo acepta el número, la búsqueda por RUT se eliminó en §29 justificándose en que esta consulta la reemplazaba, y la consulta se perdió después sin que nadie lo anotara — mientras `TicketConfirmacion.jsx` se la seguía prometiendo textualmente a cada vecino.

### 41.1 Cómo funciona

En `whatsapp-api-oficial/webhook.js`, dentro de `responderConsulta`: si el mensaje **no** trae número de ticket y calza con `RE_MIS_REPORTES`, se le responde su lista.

- **La identidad es el teléfono desde el que escribe.** No hay que pedirle nada más, y nadie puede consultar los reportes de otro: WhatsApp garantiza el remitente y la respuesta va solo a ese número.
- **El ticket manda sobre la frase**: si escribió un número, quiere ESE reporte.
- **Se reconoce escrito de varias formas**, porque nadie copia la frase exacta: con o sin tildes, en singular, y con las palabras que la gente usa de verdad (`reportes`, `tickets`, `solicitudes`, `denuncias`, `reclamos`). Verificado que "hola", "quiero reportar un bache" y "mi perro se llama reporte" **no** la activan.
- **No cuesta plata**: la respuesta va como texto libre dentro de la ventana de 24 h que abre el propio mensaje del vecino, así que no necesita plantilla aprobada ni paga por mensaje. Por eso esto se pudo entregar hoy mismo, con las plantillas todavía en revisión.

### 41.2 Dos decisiones técnicas

**Se ordena en memoria, no en Firestore.** `where('contacto_ciudadano','in', variantes)` combinado con `orderBy('fecha_creacion')` exigiría un **índice compuesto** nuevo, o sea otro despliegue. Un vecino tiene un puñado de reportes, no miles: se leen hasta 12, se ordenan en el proceso y se muestran los 5 más recientes.

**Se buscan varias formas del mismo teléfono.** Meta entrega el número como puros dígitos (`56998803719`); desde §29 la app guarda siempre `+56998803719`, pero los reportes anteriores guardaban lo que el vecino escribió. `variantesDeContacto()` cubre `+56…`, `56…`, `+9…` y `9…`. No cubre formatos con espacios o guiones de registros muy viejos — límite conocido y aceptado.

**Si la lectura llega al tope de 12 no se inventa un total.** La primera versión decía "tienes 7 más", que era mentira cuando había más de 12; ahora en ese caso dice "tienes más reportes además de estos" y solo da la cifra exacta cuando la consulta vino por debajo del tope.

### 41.3 Verificado contra producción, sin mandar mensajes

Se probó llamando directamente a la consulta y al armado del texto con el teléfono real del usuario (`scratchpad/probar-mis-reportes.mjs`, exportando `pideSusReportes`, `buscarReportesDelNumero` y `armarListaDeReportes` desde el webhook para poder probarlas sin levantar el servidor):

- 6 formas de escribir la frase reconocidas, 4 mensajes que no deben activarla ignorados.
- Con el número real: 12 reportes encontrados, los 5 más recientes formateados con emoji de estado, categoría legible, fecha, lugar y el aviso de que hay más. 643 caracteres, cómodo para WhatsApp.
- Con un número inventado: 0 resultados, responde el texto que explica **por qué** puede no encontrar nada (reportó desde otro celular, o sin dejar su WhatsApp) en vez de un "no encontré" seco.

**El mensaje de ayuda ahora anuncia la función** (`escríbeme *mis reportes* y te mando la lista`), que era la única forma de que el vecino se enterara de que existe.

### 41.4 Lo que falta para que un vecino real la use

El webhook quedó **montado y verificado** el 10-ago-2026 (`GET /webhook` responde 403 en vez de 404, o sea que la ruta existe y rechaza sin token). Falta que Meta entregue los mensajes: la app estaba **sin publicar**, y Meta advierte que una app sin publicar solo recibe webhooks de prueba. Se completó la publicación ese mismo día; queda **probar con un mensaje real** al +56 9 6540 0932 y confirmar en los logs de Render.

### 41.5 Menú de botones: el vecino no tiene que adivinar qué escribir (10-ago-2026)

**La primera prueba real fue la que definió esto.** El usuario le escribió al número la frase que la app promete, y el corrector del teléfono la convirtió en **"Mía reportes"**: el reconocimiento estricto no la aceptó y le contestó la ayuda. Si falla quien sabe exactamente qué escribir, un adulto mayor no tiene ninguna posibilidad. Su observación fue directa: *"¿cómo sabrá el vecino qué preguntarle? ¿no sería mejor dejar una serie de preguntas que lo dirijan?"*. Tenía razón.

**Ahora cualquier mensaje que el bot no entienda muestra un menú de 3 botones tocables**:

```
¡Hola! 👋 Soy el asistente de la municipalidad.
¿Qué necesitas? Toca una opción:
   ( 📋 Mis reportes )  ( 🔍 Buscar ticket )  ( ➕ Nuevo reporte )
```

- **`enviarBotones()`** nuevo en `whatsapp.js` (tipo `interactive` de la Graph API). **Gratis y sin aprobación de Meta**: es texto libre, así que corre bajo la misma regla que `enviarTexto` —solo dentro de las 24 h que abre el mensaje del vecino—, y el bot **nunca inicia** una conversación. Por eso esto se pudo entregar el mismo día, con las dos plantillas todavía en revisión.
- **El título de un botón no puede pasar de 20 caracteres**: si se pasa, Meta rechaza el mensaje completo con error 100 y el vecino no recibe nada. Se recorta en `enviarBotones` en vez de confiar en que alguien cuente los caracteres (los tres actuales miden 15, 16 y 15).
- **Los botones tocados llegan como `type: 'interactive'`**, no como texto. Antes ese tipo caía en la rama de "no es texto" y se respondía la ayuda: o sea que tocar un botón no habría hecho nada.
- **Audio, foto o sticker también muestran el menú.** No hay nada que leer, pero dejar al vecino sin respuesta es peor.
- **Se quitó el tope de "una ayuda por hora"**: el menú *es* la respuesta a "no te entendí", y callarse deja al vecino creyendo que el bot está muerto. La protección sigue siendo `excedeLimite` (10 mensajes por minuto y por número), que ya cubría el resto.
- **`PORTAL_URL_REPORTAR`** (variable de entorno nueva, por defecto `/licanten/reportar`) es a dónde manda el botón de reportar. Va configurable porque el formulario es por comuna y este servicio atiende el número de una municipalidad.

**El reconocimiento de texto igual se hizo tolerante**, porque la gente va a escribir de todas formas: en vez de exigir una frase exacta, pide que aparezca un posesivo Y una palabra de reporte en cualquier orden (`mi|mis|mia|mias|mio|mios` + `reportes|tickets|solicitudes|denuncias|reclamos`), más el caso pegado sin espacio. **Pero ya no es la defensa principal**: cualquier cosa no reconocida termina en el menú, así que un error de tipeo dejó de ser un callejón sin salida.

**Verificado con el flujo completo simulado** (`scratchpad/probar-menu.mjs`: reemplaza los envíos de `whatsapp.js` por funciones que solo registran, y llama a `procesarCuerpo` con cuerpos de webhook armados a mano, contra los datos reales de producción):

| Entrada | Respuesta |
|---|---|
| "hola", "buenas tardes", "gracias" | menú de 3 botones |
| un audio | menú de 3 botones |
| **"Mía reportes"** (el caso que falló) | su lista de reportes ✅ |
| "mis reportes", "mias reportes", "mi reporte", "misreportes", "quiero ver mis solicitudes", "estado de mis tickets", "MIS DENUNCIAS" | su lista de reportes |
| "quiero reportar un bache" | menú (no confunde "reportar" con "mis reportes") |
| botón 📋 | su lista (12 reportes encontrados) |
| botón 🔍 | le pide el número de 6 dígitos |
| botón ➕ | el link al formulario de la comuna |
| "992675" | el detalle de ese reporte |

**Lo que NO se hizo, a propósito**: no se le pusieron botones a las plantillas de aviso. Se puede, pero obliga a mandarlas de nuevo a revisión de Meta — y ya se sabe lo que eso cuesta (13 horas sin notificaciones, ver §39.5). Cuando las dos estén aprobadas y estables, se puede evaluar.

## 42. Aviso de "cuadrilla asignada", listo pero apagado (10-ago-2026)

Repone el segundo de los tres momentos que se perdieron en la migración a la API oficial (§39.3): el aviso al vecino cuando su reporte pasa a "En Proceso", o sea cuando el Alcalde o el Jefe de Departamento le asigna una cuadrilla. Es el mensaje que dice "esto se movió", que es donde un municipio gana o pierde credibilidad.

**`EVENTO 3` en `whatsapp-api-oficial/server.js`**: escucha `estado == 'En Proceso' AND notificado_whatsapp_asignacion == false` y manda la plantilla con `{{1}}` número de ticket y `{{2}}` cuadrilla. Usa la bandera que ya se escribía en cada incidencia sin que nadie la consumiera.

**Está apagado a propósito y no es un bug.** Este aviso lo inicia el municipio, así que cae fuera de la ventana de 24 h y **exige una plantilla aprobada por Meta**. El listener solo se monta si existe la variable `WHATSAPP_TEMPLATE_ASIGNACION`; si falta, el arranque lo dice en el log de forma explícita. La alternativa —dejarlo encendido— sería reintentar para siempre contra una plantilla inexistente y llenar el log de errores `132001`, que es justo el ruido que hizo difícil diagnosticar §39.5.

**Para encenderlo**: crear en Meta la plantilla `ticket_asignado`, idioma Spanish (CHL), categoría Utilidad, con el texto guardado abajo; cuando quede "Activa", agregar `WHATSAPP_TEMPLATE_ASIGNACION=ticket_asignado` en Render. Se enciende sola al reiniciar.

```
[ticket_asignado]
Estimado/a vecino/a:

Le informamos que su reporte con ticket *{{1}}* ya fue asignado a *{{2}}*, que se
hará cargo del trabajo.

Le avisaremos por este mismo medio cuando quede resuelto.

Revise el estado de su reporte aquí:
https://app-incidencias-urbanas.web.app/licanten/estado

*Municipalidad de Licantén*
```

Muestras para la revisión: `{{1}}` = `482173`, `{{2}}` = `Cuadrilla Municipal`.

**Crearla es independiente de las dos que están en revisión** (§39.5): agregar una plantilla nueva no las afecta. Pero conviene no hacerlo justo antes de una presentación, porque la aprobación tarda horas y no se puede mostrar.

Queda pendiente el tercero de los avisos perdidos: la **alerta de emergencia al Alcalde** (§32), que necesita lo mismo —listener nuevo más plantilla— y es la función más vendedora de la propuesta comercial.

## 43. Tenant de demostración presentable (10-ago-2026)

Para mostrarle la plataforma a una municipalidad hacía falta un panel con volumen: con los 5 reportes reales de Licantén, el mapa de calor, la comparación mes contra mes y los indicadores se ven vacíos. **La opción descartada fue sembrar reportes falsos en Licantén**: contamina para siempre las estadísticas del Alcalde, la Cuenta Pública y los costos, y obliga a responder "los inventamos" si pregunta de dónde salió uno.

Lo que se hizo en cambio: **`scripts/preparar-demo.mjs`** deja presentable el tenant `demo`, que ya existía con ~100 reportes sembrados y es de pruebas por definición. Informa por defecto y solo escribe con `--aplicar`.

**Hallazgo que cambió el plan**: no hacía falta crear ningún tenant nuevo ni cuenta nueva. El correo personal del usuario (`luis.ogonzalez.30@gmail.com`) es el **ALCALDE_ADMIN del tenant `demo`**, no de Licantén — el panel lleno ya existía y ya tenía la llave. El Alcalde de Licantén es `contacto@alcaldelicanten.com`. Conviene tenerlo claro: entrar con el correo personal esperando ver Licantén muestra el demo.

Qué corrige el script, todo dentro de `demo`:

- **Geografía coherente**: 77 de los 100 reportes estaban en Santiago (del seed original) mientras el resto estaba en la zona de Licantén. Se reubicaron dentro de las **3 localidades con coordenadas verificadas** (centro 48, Iloca 23, Lora 27; 2 quedaron fuera de radio, que es un estado legítimo). El azar es **determinista a partir del id del documento**, así el informe del ensayo coincide exactamente con lo que se escribe y volver a correrlo no mueve todo de nuevo.
- **Sectores cargados** (los mismos 3), que estaban en 0: sin eso la vista por sectores del panel del Alcalde (§33) se ve vacía.
- **33 calificaciones ciudadanas** en reportes resueltos, repartidas 5/4/3 con más peso en 5: el indicador de satisfacción estaba en 0.
- **Tema y nombre**: logo y colores de Licantén, con el nombre **"Municipalidad de Licantén (demostración)"**. El "(demostración)" es deliberado y no se saca — es lo que evita que alguien confunda esa pantalla con datos reales.
- **89 notificaciones pendientes cerradas.** Esto no es cosmético: entre los reportes de prueba había números de WhatsApp **reales**, y cuando las plantillas de §39.5 queden aprobadas el bot habría intentado escribirles. Verificado después: **0 reportes de demo con contacto real y aviso pendiente**.

**Licantén no se tocó** (verificado por separado tras aplicar).

### 43.1 La coordenada del centro estaba mala, y se notó en el mapa (11-ago-2026)

Detectado horas antes de la presentación al Alcalde, mirando el panel: el círculo de "Licantén (centro)" caía sobre potreros, **6,5 km al oeste del pueblo**, con todos sus pines adentro; el pueblo real aparecía al costado, casi vacío.

**La coordenada de `configurar-sectores.mjs` era `-34.9743,-72.0604` y estaba marcada `confirmado: true`.** No coincidía ni con los `34°59′S 72°00′W` que ella misma citaba como fuente (`-34.983,-72.000`): fue un error de transcripción que pasó la revisión porque nadie contrastó el número contra un mapa. Es exactamente el error silencioso que advierte el encabezado del script — el sector no falla, simplemente nunca le llegan incidencias.

Cómo se comprobó, sin depender del ojo: **los tres reportes reales del casco urbano se agrupan en `-34.980,-71.987`** (941158, 992675, 021048), geocodificados por separado desde direcciones distintas. El centroide de esos tres es el valor que quedó. Antes de corregir, **5 de los 6 reportes de Licantén caían "fuera de los sectores definidos"**.

Lo que se arregló, y dónde vive cada cosa:

| Qué | Dónde estaba | Ahora |
|---|---|---|
| Coordenada del sector | `configurar-sectores.mjs` | `-34.9802,-71.9873`, radio 1800 m |
| **Copia** de la coordenada | `preparar-demo.mjs` (lista propia) | sincronizada |
| Reportes ya sembrados | 48 del demo, sobre potreros | trasladados en bloque |
| `centro_mapa` del demo | `-34.9743,-72.0604` | corregido |
| `centro_mapa` de Licantén | `-34.9928,-72.0044` (2,1 km al SO) | corregido |

**Las tres cosas eran independientes**: corregir el sector no mueve los reportes ya sembrados, y no toca `centro_mapa`, que es el campo que decide dónde abre el mapa. Iloca y Lora estaban bien y no se tocaron.

El traslado de los 48 fue **en bloque, el mismo delta para todos**, no un reparto al azar nuevo: así el grupo conserva su forma —dónde se apelmaza, qué tan disperso está— que es lo que hace que un mapa sembrado no parezca sembrado.

**`preparar-demo.mjs` tenía su propia copia de las coordenadas.** Por eso sembró sobre potreros aunque el otro script fuera la fuente declarada. Quedó una advertencia en las dos listas; si alguna vez se unifican, mejor.

Verificado después: Licantén 3 en el centro / 1 en Lora / 2 fuera (uno es de **Linares**, otra ciudad, y el otro está a 18 km en la Ruta J-60 — los dos legítimamente fuera). Demo: 51 / 23 / 27 y **0 fuera**.

**El primer traslado no funcionó, y el chequeo dijo que sí.** Vale la pena dejarlo escrito porque el modo de fallar se repite. El campo `coordenadas` de esta base es `{ lat, lng }` — es lo que lee `MapaIncidencias.jsx`. El script escribió `{ latitude, longitude }` creyendo "conservar el formato original", y como no borraba nada, los 48 documentos quedaron con **los dos pares**: el viejo (sobre los potreros, que es el que dibuja el mapa) y uno nuevo que nadie lee. En pantalla no se movió nada.

Lo detectó el usuario mirando el mapa, no el chequeo. El chequeo leía `latitude ?? lat`, o sea prefería justamente la clave recién escrita, así que confirmó en verde un cambio que no existía. **Un verificador que acepta más formatos que la aplicación no verifica nada**: hay que leer por donde lee el programa, aunque sea más frágil. `verificar-presentacion.mjs` ahora exige `lat`/`lng` y falla si no están.

Reparado con `scripts/reparar-coordenadas.mjs` (copia el par bueno a `lat`/`lng` y borra el sobrante; no recalcula el desplazamiento). Los 101 reportes del demo quedaron en un solo formato, comprobado.

### 43.2 Datos personales reales en el tenant demo (11-ago-2026)

Los reportes del demo no son inventados: se arrastraron de reportes verdaderos, y traían **13 RUT y 25 celulares de personas reales**. Al hacer clic en cualquiera, ese dato quedaba en pantalla — y el guion de la reunión (`docs/PAUTA-REUNION-ALCALDE.md`) plantea a propósito la objeción *"¿esto me expone?"*, así que el momento era el peor posible.

Se borraron los 38 campos con `FieldValue.delete()`. **No se reemplazaron por datos falsos**: un RUT inventado se ve igual de real en pantalla y el problema vuelve con el siguiente que mire. El nombre de pila se dejó — sin RUT ni teléfono no identifica a nadie y el panel necesita mostrar algo en esa columna.

Ambas correcciones están en **`scripts/corregir-demo.mjs`**, que informa por defecto y solo escribe con `--aplicar`. Respaldo previo de los 106 documentos en `backups/incidencias-antes-de-corregir-2026-08-11.json`.

## 44. WhatsApp multi-municipio: lo que se rompe con el segundo cliente (11-ago-2026)

Detectado al preguntar el usuario qué pasa cuando tenga 5 municipalidades, porque Meta solo le dejaba agregar 2 números. **El límite de números no es el problema real.**

### 44.1 El límite de 2 números se levanta con un trámite

Es el tope de un negocio **sin verificar** en Meta. Con la **verificación de negocio** (RUT de la SpA, dirección, documentos de la sociedad) sube a **hasta 20 números por WABA**, y se puede tener más de una WABA. Para 5 municipalidades no hay problema técnico: hay que hacer el trámite, que además ya estaba pendiente en la propuesta comercial. Conviene hacerlo con tiempo porque Meta tarda días y a veces vuelve a pedir documentos.

### 44.2 Lo que sí se rompe: los mensajes son de un solo municipio

Verificado en el código:

- **Los listeners YA son multi-municipio**: `server.js` escucha `incidencias` sin ningún filtro por `municipio_id`, así que atiende a todos los tenants sin cambios.
- **Pero los textos no**: las dos plantillas aprobadas dicen *"Municipalidad de Licantén"* dentro del cuerpo y llevan el link `/licanten/estado` fijo (ver §39.2), y `PORTAL_URL_REPORTAR` del webhook apunta por defecto a `/licanten/reportar`.

O sea que **con el segundo municipio, sus vecinos recibirían mensajes firmados "Municipalidad de Licantén"**. Eso es lo que hay que arreglar antes del cliente 2, y no tiene relación con la cantidad de números.

### 44.3 La decisión: número compartido o número por municipio

| | Un número por municipalidad | Un número compartido de la plataforma |
|---|---|---|
| Lo que ve el vecino | el WhatsApp de *su* municipio | el de "TuMuniAquí" |
| Operación | una línea y un `PHONE_NUMBER_ID` por cliente | una sola |
| Requiere | verificación de negocio + un chip por municipio | nada extra |

**Recomendación: el número compartido como estándar, y el número propio como servicio premium** que se cobra aparte. Simplifica la operación y da algo más que vender.

### 44.4 Lo que hay que hacer en cualquiera de los dos casos

**Parametrizar las plantillas**: el nombre del municipio y el link tienen que ser variables, no texto fijo. Con eso **un solo juego de plantillas sirve para 5 municipios o para 50**; la alternativa es esperar una aprobación de Meta cada vez que se firma un cliente.

Detalle que ahorra trabajo: **las plantillas viven en la WABA, no en el número**, así que un juego parametrizado sirve para todos los números que cuelguen de esa cuenta, en las dos opciones.

Del lado del código el cambio es chico: el nombre y los links salen del documento del tenant (`municipalidades/{id}.nombre`, que ya existe) en vez de estar escritos fijos. La arquitectura ya está bien; lo que no es multi-municipio son los textos.

**Momento correcto para hacerlo**: cuando se firme el segundo cliente, no antes — y nunca mientras haya plantillas en revisión, porque tocarlas reinicia la aprobación (§39.5).

## 45. Las 23 localidades cargadas como sectores (12-ago-2026)

El usuario entregó una lista de las 23 localidades de Licantén con coordenadas y pidió cargarlas todas, con autorización explícita para hacer los cambios necesarios. Se cargaron. **Pero 18 de las 23 no están verificadas**, y eso hay que tenerlo escrito porque no se ve en pantalla.

### 45.1 Qué se verificó antes de cargarlas

Dos comprobaciones independientes contra OpenStreetMap:

- **Geocodificación inversa** (¿qué hay en esta coordenada?): los 23 puntos caen dentro de la comuna, ninguno a más de 25 km del centro, y 21 de 23 devuelven "Licantén · Provincia de Curicó". Hasta ahí, plausibles.
- **Geocodificación directa** (¿dónde está esta localidad?): **acá se cayó la lista**. La Higuera queda a 22 km de donde dice la lista, Quelmén a 15 km, Los Junquillos a 11,8 km, Idahue a 6,1 km. Y los nombres aparecen **corridos entre sí**: el punto de "Naicura" cae en Huapi, el de "Coquimbo" en Naicura, el de "El Huapi" en Lora Sur. Un desplazamiento sistemático, no errores sueltos.

Las coordenadas de la lista además están espaciadas de forma regular (34°57'05", 34°57'30", 34°57'45"…), lo que sugiere que se interpolaron a lo largo del valle en vez de consultarse en un mapa. Y `Villa Angosta` cae en **Curepto, Provincia de Talca** — otra comuna.

### 45.2 Qué se cargó y con qué marca

| | Sectores |
|---|---|
| **Confirmados** (5) | Licantén (centro), Iloca, Lora, **La Pesca** y **Duao** |
| **Aproximados sin confirmar** (18) | el resto |

La Pesca y Duao subieron a confirmados porque la lista del usuario y el nodo de OpenStreetMap coinciden en **178 m y 18 m** respectivamente: dos fuentes independientes que concuerdan.

Los 18 quedan con `confirmado: false` en `configurar-sectores.mjs` y solo se escriben pasando la opción nueva **`--incluir-aproximados`**. Así el candado del script sigue funcionando —nada sin confirmar llega a producción por descuido— y al mismo tiempo se pudo cumplir lo que el usuario pidió. El comentario del archivo explica cada hallazgo.

### 45.3 Dos cambios que se hicieron con la autorización dada

**No se sobrescribió el centro de Licantén.** La lista traía 72°00'00" (el valor redondeado), que cae en Curepto según OSM. Se mantuvo el `-34.9802,-71.9873` corregido el 11-ago: reemplazarlo habría revivido el bug de §43.1, el que puso 48 reportes sobre potreros.

**Todos los radios bajaron.** Estaban en 1800-2000 m, dimensionados para 3 sectores. Con 23 en una comuna de este tamaño el vecino más cercano queda a 1,3-2,8 km, así que se usó el **45% de la distancia al vecino más próximo**: entre 600 y 1250 m. Con 2000 m los círculos se solapaban y `sectorDeCoordenada` (que resuelve el empate por cercanía al centro) repartía los reportes de forma arbitraria.

### 45.4 Verificado después de cargar

Los 4 reportes reales de Licantén: tres caen en "Licantén (centro)" a 120, 276 y 763 m del centro, y el de la Ruta J-60 cae **fuera de todo sector**, que es correcto — está en la ruta, entre localidades.

**Pendiente y anotado**: que el **Director de Obras** valide los 18 aproximados contra el Plan Regulador. `node scripts/configurar-sectores.mjs licanten --revisar` imprime un link de Google Maps por sector; para él son 15 minutos y deja la fuente real. Mientras no pase, los reportes de esas 18 localidades pueden agruparse en el sector vecino, y **eso es invisible en pantalla**: el sector no falla, simplemente le caen las incidencias del otro.

### 45.5 La ruta J-60 corrigió seis de esos 18 (12-ago-2026)

El usuario vio el mapa del panel y avisó: *"este mapa las ubicaciones están erróneas, tiene que ir por la ruta J-60"*. Tenía razón, y el error era grande: los seis sectores del valle (Quelmén, La Higuera, Los Cristales, Idahue, Placilla, La Leonera) estaban entre **2,8 y 3,7 km al norte** de la ruta, sobre los cerros — esas localidades son caseríos a la orilla del camino.

Se bajó la geometría real de la Ruta J-60 desde OpenStreetMap (49 tramos, 2.059 vértices, `way["ref"="J-60"]` vía Overpass) y se movió cada punto **hasta la ruta manteniendo su longitud** (no al vértice más cercano: donde el camino se curva eso encimaba Placilla y La Leonera a 400 m del centro de Licantén, perdiendo el orden este-oeste de la lista original, que sí venía bien). Verificado después: los seis quedan a 0-1 m de la ruta, y ningún círculo se solapa con otro.

`Los Junquillos` y `Las Puertas` se dejaron **fuera de esta corrección a propósito**: están a 5,9 y 6,4 km de la J-60, pero la propia descripción del usuario los ubica en los cerros de la cordillera costera ("sector aislado en los cerros", "zona alta y boscosa de difícil acceso") — pegarlos a la ruta habría metido un error nuevo. Siguen entre los 18 aproximados sin confirmar.

## 46. El panel del Alcalde, todo clicable (12-ago-2026)

Pedido del usuario sobre capturas del panel, con una frase que sirve como criterio de diseño: *"esos botones tienen que ser todos interactivos… si yo pincho ahí, me tiene que dar la información de valor de ese recuadro… no puede tener información estática"*. Y uno específico: poder pinchar los **reportes cerrados** y ver qué se resolvió, cuándo, cuánto demoró.

Antes solo 3 de las 14 tarjetas abrían algo (emergencias, atrasados, por asignar, de §36.1). Las otras 11 eran números muertos: para saber qué había detrás había que ir a buscarlo a mano al listado, que es justo lo que el panel debía evitar.

### 46.1 Qué abre cada tarjeta

| Tarjeta | Detalle |
|---|---|
| Reportes sin resolver (la cifra protagonista) | pendientes + en ejecución, con estado y cuadrilla |
| En ejecución | agrupado por cuadrilla, con **cuánto lleva cada trabajo en obra** |
| **Resueltos este mes** | cuadrilla, fecha de cierre, **costo real**, calificación, y la demora a la derecha |
| Trabajadores presentes | asistencia del día, **primero los que faltan por marcar** (la acción pendiente del jefe) |
| Cuadrillas en terreno | qué está haciendo cada cuadrilla ahora |
| Tiempo promedio | reportes **de mayor a menor demora** — lo que explica el promedio |
| Satisfacción vecinal | calificaciones **de peor a mejor** |
| Trabajos terminados / Tiempo en asignar / Tiempo en resolver / Reportes recibidos (comparación mensual) | los reportes del mes en curso que producen cada cifra, con su dato propio |

En todos, tocar un reporte lo abre en el mapa.

### 46.2 Las tres decisiones que hacen que esto sirva

**Cada indicador ordena distinto, y es deliberado.** `ModalDetalleIndicador` recibió cuatro órdenes (`urgencia`, `cierre`, `demora`, `peorCalificacion`): en "atrasados" arriba va lo más urgente, en "resueltos" lo último cerrado, en "tiempo promedio" lo que más demoró, en "satisfacción" lo peor calificado. Con un orden único, en la mitad de los casos el primer elemento de la lista no significaría nada.

**Cada indicador decide qué dato va a la derecha** (`datoDerecha`) y qué dice la línea de apoyo (`lineaApoyo`). Antes el modal mostraba siempre la antigüedad; en "resueltos este mes" ese número no dice nada — ahí lo que importa es cuánto demoró y cuánto costó. También se agregó `agruparPor`, para repartir por cuadrilla en vez de por departamento cuando el indicador es de cuadrillas.

**Si una tarjeta no tiene nada detrás, no es clicable** (`hayDetalle`): ni cambia de color al pasar el mouse ni responde. Prometer un detalle que abre vacío se siente roto — el mismo problema del botón de asignación de §47.

`ModalAsistencia` es nuevo y vive en `PanelIndicadores.jsx`: ahí no hay incidencias que listar sino personas, y lo que importa de cada una es si está, no está, o nadie pasó lista.

## 47. El botón de asignación mentía, y la vista satelital que faltaba (12-ago-2026)

### 47.1 "Ese botón no tiene ninguna función" — sí la tenía, y hacía daño

El usuario reportó que *"Actualizar asignación"* no hacía nada. Estaba en lo cierto en el síntoma: con la incidencia ya **En Proceso** y una sola cuadrilla en la comuna, apretarlo no cambiaba nada visible y no daba ninguna confirmación.

Pero por dentro sí escribía, y lo que escribía era un problema: **reseteaba `fecha_asignacion`**. Ese campo mide el tiempo de reacción del municipio y alimenta la tarjeta de **"Trabajos atrasados"**, así que apretar el botón en un caso de hace dos semanas lo dejaba pareciendo recién tomado y lo sacaba de los atrasados. **El indicador mejoraba solo por hacer clic**, sin que nadie lo notara. Eso es peor que un botón inerte.

- `asignarCuadrilla` ahora escribe `fecha_asignacion` **solo la primera vez**; una reasignación posterior queda en `fecha_reasignacion` y no toca el reloj.
- El botón se **apaga** cuando no hay nada que cambiar y lo dice: *"Ya está con Cuadrilla Municipal"*. Si se elige otra cuadrilla, se activa como *"Reasignar a X"*.
- Al guardar aparece una **confirmación visible**. El panel no se cierra solo (el funcionario suele seguir mirando la foto), así que antes no había forma de saber si la acción se había guardado.

### 47.2 El uso práctico que le faltaba al panel

Con el caso ya asignado, lo único útil que quedaba por hacer ahí era **hablar con quien reportó** — cerrar el caso es tarea del Jefe o de Terreno por diseño (§5). El teléfono estaba a la vista pero como texto, para copiar a mano.

Ahora hay un botón **"Escribirle a {nombre}"** que abre WhatsApp con el mensaje ya redactado: número de ticket y de qué se trata, así el funcionario no tiene que explicar quién es ni buscar el caso. Es un link `wa.me`, **sin backend y sin costo de plantilla**: lo abre la app del propio funcionario.

### 47.3 Vista satelital en el mapa del panel

Pedido del usuario, con un motivo concreto: en zona rural la vista de calles no muestra nada —caminos sin nombre, potreros, sin veredas— y el funcionario necesita reconocer el lugar antes de mandar una cuadrilla. Se agregó el toggle **"Ver satelital / Ver calles"** abajo a la derecha, en la **misma posición** que en el mapa del vecino para que quien use las dos vistas no tenga que buscarlo. Es la misma capa Esri World Imagery ya usada en `MapaSeleccionUbicacion.jsx`, gratis y sin API key. Las dos definiciones de capas quedaron con una advertencia cruzada: si se cambia una, cambiar la otra.

## 48. Las cinco funciones de IA (25-ago-2026)

Se implementaron las cinco funciones de IA que se discutieron: sugerencia de categoría
mirando la foto, desempate semántico de duplicados, bot conversacional, transcripción de
notas de voz y resumen narrado de la Cuenta Pública.

**Todo viene apagado.** Sin `ANTHROPIC_API_KEY` el sistema se comporta exactamente como
antes. Esto no es una precaución de estilo: es la propiedad que hace que se pueda desplegar
sobre un municipio con vecinos reales sin arriesgar nada. El costo está calculado aparte, en
**`docs/COSTOS-IA.md`**.

### 48.1 Dónde vive la IA, y por qué ahí

Todo corre en **el servicio de Render** (`whatsapp-api-oficial/`), no en la app.

La razón es que la clave de API no puede viajar al navegador: el bundle lo descarga
cualquiera que abra el sitio. Es el mismo razonamiento que dejó las credenciales de Meta en
Render. Entonces el formulario del vecino le pide la clasificación al servicio por HTTP, y el
servicio es el único que tiene la clave.

Efecto secundario que conviene saber: **la IA no necesita Blaze**. Firebase sigue en Spark; lo
que se agregó no toca esa restricción.

| Archivo | Qué hace |
|---|---|
| `whatsapp-api-oficial/ia.js` | Cliente de Claude: las cuatro funciones, la contabilidad de gasto y el tope |
| `whatsapp-api-oficial/rutas-ia.js` | Los endpoints `/ia/*` que consume la app, con CORS y límite por IP |
| `whatsapp-api-oficial/transcripcion.js` | Notas de voz. **Otro proveedor** — ver §48.6 |
| `whatsapp-api-oficial/probar-ia.js` | 25 pruebas con un modelo simulado, sin gastar |
| `src/services/iaService.js` | Cliente del frontend. Nunca lanza: si algo falla, devuelve null |
| `src/components/ciudadano/SugerenciaCategoria.jsx` | El aviso que propone corregir la categoría |
| `src/components/dashboard/ResumenNarrado.jsx` | El botón de resumen en la Cuenta Pública |

### 48.2 La regla que ordena todo: la IA propone, las tablas deciden

`calcularGravedad` y `calcularDepartamento` (§7 y §8) derivan la gravedad, el color del pin y
el departamento **a partir de la categoría**. La IA nunca devuelve ninguna de esas tres cosas:
solo la categoría, y el resto sigue saliendo de las tablas fijas de siempre.

Eso importa por una razón que no es técnica. Un municipio puede defender una tabla —"los
socavones son gravedad alta, siempre"— ante un concejo o ante un vecino que reclama. No puede
defender "el modelo decidió". Las tablas siguen siendo la autoridad; la IA solo ayuda a entrar
por la puerta correcta.

Y hay una segunda defensa, en código: **lo que devuelve el modelo se valida contra el catálogo
real**. Una categoría que no existe entre las 58 se descarta y no llega a Firestore. Está
probado en `probar-ia.js` con un modelo que devuelve `Ovni_aterrizado`.

### 48.3 La sugerencia de categoría va en el Paso 3, no en el 2

El wizard es ubicación → categoría → foto (§11), así que la foto llega **después** de que el
vecino ya eligió. En vez de reordenar el formulario, la sugerencia se puso donde llega la foto
y **revisa una decisión ya tomada**.

Resultó mejor que la idea original: la IA no adivina en el vacío, y **solo habla cuando
discrepa**. Si coincide con lo que el vecino eligió no se muestra nada — un aviso que aparece
siempre se vuelve invisible.

Tres cosas que hacen que un error del modelo no cueste nada:

- **La categoría no cambia sola nunca.** Si el vecino no toca el botón, se manda lo que él
  eligió. Un error de la IA cuesta un aviso ignorado, no un reporte mal ruteado.
- **Con confianza baja no se muestra.** El modelo mismo está diciendo que no está seguro.
- **Una foto se revisa una sola vez.** Navegar entre pasos no vuelve a pagar la llamada.

El caso real que esto arregla está en la lista de pendientes de `RETOMAR-AQUI.md`: uno de los
reportes de prueba de Licantén dice *"Reja rota"* y quedó categorizado como **Árbol caído**,
que lo manda al departamento equivocado.

### 48.4 Duplicados: lo que la comparación por categoría dejaba pasar

§16 compara **misma categoría** dentro de 50 m. O sea que "Bache" y "Pavimento deteriorado"
sobre el mismo hoyo son dos tickets, y la cuadrilla va dos veces.

Ahora, cuando la búsqueda por categoría no encuentra nada, se buscan los cercanos de **otra**
categoría y se le pregunta a la IA si es el mismo problema físico. Como Haversine ya filtró,
al modelo le llegan uno o dos finalistas: por eso cuesta centavos y no corre en la mayoría de
los reportes.

**Ante la duda, no fusiona** — está escrito en el prompt y probado. Juntar dos problemas
reales en un solo ticket hace que uno de los dos no se arregle nunca, y ese error es mucho más
caro que un duplicado.

### 48.5 El bot: la IA solo cubre el hueco que antes caía al menú

El orden de resolución del webhook **no cambió**. Los caminos deterministas siguen primero:

1. ¿escribió un número de ticket? → la respuesta directa de siempre
2. ¿pidió "mis reportes"? → su lista, como siempre
3. cualquier otra cosa → **antes**: el menú de botones. **Ahora**: la IA, y si falla, el menú.

Dos consecuencias buenas: el comportamiento ya probado en producción no se toca, y el costo es
mucho menor que si cada mensaje pasara por el modelo.

Las herramientas (`buscar_ticket`, `listar_mis_reportes`, `enlace_para_reportar`) las **ejecuta
el webhook**, no `ia.js`, y por dentro llaman a las mismas funciones de siempre. La IA no abre
ningún camino nuevo a los datos: solo decide cuándo usar los que ya existían.

El historial vive **en memoria y con vencimiento de 30 minutos**. Nunca se guarda en Firestore:
son conversaciones de vecinos y no hay ninguna razón para conservarlas.

Lo que el prompt le prohíbe explícitamente: inventar el estado de un reporte, dar una fecha de
reparación, o prometer cuándo se arregla algo. Si alguien describe una emergencia en curso, lo
primero de la respuesta es el 133.

### 48.6 La transcripción de audio es la única pieza con otro proveedor

La API de Claude acepta imágenes y documentos, **no audio**. Así que esta función —y solo
esta— necesita un servicio de transcripción aparte.

Eso tiene una consecuencia que no es técnica: **un tercero más recibiendo datos de vecinos**.
Por eso viene apagada por su propia variable (`OPENAI_API_KEY`), separada de la de Claude:
encender el resto de la IA no enciende esto. Antes de usarla con gente real hay que agregar ese
proveedor a la política de privacidad (§35.2), que además sigue esperando revisión de abogado.

Para qué vale la pena igual: en un pueblo la gente manda audios, no textos. Un adulto mayor que
no escribe bien puede describir un problema hablando, y hasta ahora ese mensaje se perdía —
un audio solo mostraba el menú.

### 48.6.b Qué datos salen del sistema, exactamente

Esto hay que tenerlo escrito porque es lo que un abogado va a preguntar, y porque la política
de privacidad (§35.2) tiene que decirlo antes de encender nada con vecinos reales.

**Lo que sale hacia Anthropic:**

- La **foto** del reporte y el texto que el vecino escribió en "cuéntanos qué pasa", al pedir
  la sugerencia de categoría. El prompt le pide explícitamente que no describa personas ni
  patentes, pero la foto va entera: la advertencia de no fotografiar personas que ya está en
  `PasoFoto.jsx` se vuelve más importante, no menos.
- Para el duplicado: **solo campos públicos** — categoría, `direccion_texto` y la distancia.
  `detalles_adicionales` del reporte existente **no** se manda, y no por descuido: ese campo
  está deliberadamente fuera de `tickets_publicos` porque puede mencionar personas.
- Del bot: lo que el vecino escribe, y de sus reportes solo lo que ya le mostraríamos por
  WhatsApp de todos modos (número, estado, categoría, fecha, lugar).
- **Nunca**: nombre, RUT ni teléfono. El número desde el que escribe el vecino se usa para
  buscar sus reportes dentro de Firestore, pero no viaja al modelo.
- De la Cuenta Pública: solo cifras agregadas. Ningún dato de una persona.

**Lo que sale hacia el proveedor de transcripción**, si se enciende: el audio completo, tal
como lo mandó el vecino. Es el más sensible de todos —una nota de voz puede contener
cualquier cosa, incluida la voz misma, que es un dato biométrico— y por eso esa función tiene
su propia variable y viene apagada.

### 48.7 El costo tiene techo, y el techo está en código

El bot conversacional es la partida que peor escala: su costo depende de **conversaciones**, no
de reportes, y alguien puede escribir diez veces sin generar ningún reporte. Tres topes, todos
puestos desde el día uno:

- **`IA_MAX_TURNOS`** (6): pasado ese punto la conversación vuelve al menú, que es gratis.
- **`IA_TOPE_USD_MES`**: al alcanzarlo, `iaDisponible()` empieza a decir que no y **todo
  degrada solo**, sin caerse. El gasto se guarda en `configuracion/ia_gasto` en Firestore, no
  solo en memoria: Render reinicia seguido, y un contador que se reinicia con el proceso no es
  un tope, es un adorno.
- **Límite por IP** en `/ia/*` (20 por minuto), más CORS cerrado a los dominios de la app. Un
  endpoint público que gasta dinero es un blanco, y este no tiene login porque el vecino nunca
  se autentica (§16).

La estimación de gasto usa la tarifa del modelo configurado; si se cambia por uno que no esté
en la tabla, se asume la de Opus 5 — **sobreestimar es el error seguro**, hace que el tope
corte antes y no después.

### 48.8 Cómo se probó, sin gastar un peso

`whatsapp-api-oficial/probar-ia.js` reemplaza el cliente de Anthropic por uno que devuelve
respuestas armadas a mano con la misma forma que la API real (bloques `tool_use`,
`stop_reason`, `usage`). Con eso se prueba el ciclo completo, incluido el de herramientas, sin
red y sin clave. **25 pruebas, todas pasando.**

Lo que más importaba comprobar no es que la IA acierte, sino que **cuando no está, todo siga
igual**: las cinco funciones devuelven null sin lanzar, y el formulario y el bot no cambian.

De paso se arregló una prueba de `probar-webhook.js` que **llevaba fallando desde §41.5**:
afirmaba que el bot NO debía repetir la ayuda dos veces seguidas, que es justamente el tope de
"una ayuda por hora" que esa sección quitó a propósito. La prueba se quedó afirmando la regla
vieja. Ahora comprueba lo que el código de verdad hace y `probar-webhook.js` pasa 31 de 31.

### 48.9 Lo que falta para que esto se encienda

**El código ya está en producción** (fusionado y publicado el 25-ago-2026), pero **la IA sigue
apagada**: falta la clave. Mientras no exista `ANTHROPIC_API_KEY` en Render, el sitio publicado
se comporta exactamente igual que antes.

Lo que falta, entonces, es un solo paso: crear esa variable en Render → Settings →
Environment, junto con `IA_TOPE_USD_MES`. Al guardarla Render reinicia solo y el log dice
`[ia] Activa con modelo claude-opus-5`.

La transcripción de audios queda aparte y no conviene encenderla todavía: suma un proveedor
que recibe voz de vecinos, y eso hay que declararlo antes en la política de privacidad
(§48.6 y §48.6.b).

Verificación del despliegue, hecha el mismo día: el sitio sirve el bundle nuevo, el chunk de
`App` trae la `apiKey` con formato real (no `void 0`) y el bucket correcto
(`firebasestorage.app`, no `appspot.com`), y el código de IA está adentro. Es la comprobación
por contraste que describe §39 — la que distingue un sitio publicado de un sitio publicado y
muerto.

---

## 49. Mercado Público: la red se abrió y la integración llegó a main (30-ago-2026)

Dos cosas que llevaban semanas trabadas se destrabaron el mismo día.

**La red ya no bloquea la API.** Lo que `CLAUDE.md` describe como "un muro conocido" —el
proxy respondiendo 403 a los dominios externos— ya no aplica en las sesiones nuevas: el
proxy reporta `"selective": false`, sin lista blanca. `api.mercadopublico.cl` y
`www.mercadopublico.cl` responden. Ojo con el diagnóstico: la API contesta
`{"Codigo":203,"Mensaje":"Ticket no válido."}` a un ticket falso, que es HTTP 200 con error
en el cuerpo. Un 203 en el JSON es la API funcionando, no la red caída.

**El ticket vive en el entorno de la sesión.** `MERCADOPUBLICO_TICKET` está definido como
variable de entorno del contenedor, así que los scripts corren sin `.env` local y sin que el
ticket se pegue en un chat. `leerTicket()` lo busca en `--ticket=`, en el entorno y en el
`.env`, en ese orden.

**La integración se fusionó a main.** Las 1.416 líneas estaban desde el 22-ago en
`claude/mercado-publico-verification-vrgedr`, sin fusionar, y por eso ninguna otra sesión
las veía —exactamente el error que `CLAUDE.md` marca como el más caro de este flujo. Esa
rama contiene a `claude/chile-compras-api-integration-b4zcip` como ancestro, así que
fusionar una sola bastó. Único conflicto: `.env.example`, donde main había borrado
`VITE_GOOGLE_MAPS_API_KEY` el 25-ago y la rama todavía la traía; se conservó el borrado.

Lo que quedó en el árbol:

| Archivo | Qué hace |
|---|---|
| `scripts/mercado-publico.mjs` | Comandos `verificar`, `activas`, `historico` |
| `scripts/mp-directas.mjs` | Tratos directos y compras ágiles |
| `scripts/lib/mercadoPublico.mjs` | Cliente de la API, reintentos, el ticket nunca se imprime |
| `scripts/lib/cazador.mjs` | Puntuación y ranking de oportunidades |
| `scripts/lib/perfilProveedor.mjs` | El criterio comercial: rubros, tramos, mecanismos |
| `docs/MERCADO-PUBLICO.md` | Cómo se usa y qué NO puede hacer |

**Verificado contra la API real, no en seco.** `npm run mp:verificar` conectó en 1,4 s y leyó
4.718 licitaciones activas y 1.356 órdenes de compra. `mp:activas` devolvió 24 oportunidades
gastando 73 peticiones de las 10.000 diarias. La mejor puntuada (21) fue el **Convenio Marco
de Desarrollo de Software** de ChileCompra, que cierra el 25-sep-2026: es catálogo sin
licitar, dura 2-3 años y es el canal de menor competencia para un proveedor chico. Después,
licitaciones LE municipales de tramo chico (Los Álamos $70M, Hualpén $32,5M, Lo Prado).

**La inscripción como proveedor ya está hecha** (confirmada por el usuario ese día). Era la
promesa #1 de `docs/PROPUESTA-COMERCIAL-NOTAS.md`, de modo que la frase "Estamos inscritos
como proveedor en Mercado Público" de §9 de la propuesta pasó a ser cierta y se queda. No se
pudo verificar contra la API porque el RUT de la SpA no está en el repositorio —si algún día
se quiere automatizar, ese es el dato que falta.

**Cuidado con confundir dos cosas distintas.** Estar inscrito no es lo mismo que estar
**hábil en ChileProveedores con los rubros actualizados**, y es lo segundo lo que exigen
Compra Ágil y Convenio Marco. Rubro desactualizado = invisible para esos dos canales por
mucho que el cazador encuentre la oportunidad. Es el requisito que hoy separa de poder
postular al Convenio Marco, que es justamente la mejor oportunidad detectada.

## 50. El bot lleva 81 horas suspendido en Render (14-sep-2026)

**Detectado el 14-sep a las 15:52 UTC revisando el estado general. Empezó el 11-sep a las
06:15 UTC.** `proyectomuni.onrender.com/salud` devuelve HTTP 503 con la página de suspensión
de Render (`This service has been suspended`), no un error del bot. El servicio está apagado
por Render, no caído por código.

**No es el plan Free durmiendo.** Render está en plan **Starter pagado** desde el 26-ago
(§ `docs/PLATAFORMAS.md`), así que una suspensión apunta a cobro rechazado, no a horas
agotadas. Un servicio dormido de plan Free responde lento; uno suspendido responde esta
página. Distinguirlo importa porque manda a dos lugares distintos: el panel de facturación,
no los registros.

**Qué dejó de funcionar durante la caída:**

- El aviso de WhatsApp al vecino que reporta.
- El bot conversacional: el webhook de Meta apunta a ese servicio, así que quien escribe no
  recibe respuesta.
- Las cinco funciones de IA (§48), que corren en el mismo proceso.

**Qué NO se perdió.** Los avisos atrasados salen solos al levantar el servicio: el listener
de `escucharNuevosTickets()` (`whatsapp-api-oficial/server.js:108`) consulta por
`notificado_whatsapp_creacion == false` y procesa los `added`, que incluyen los documentos que
estaban pendientes de antes cuando el proceso se reconecta. Es el mismo reintento gratis que se
diseñó para los deploys. No hay nada que reenviar a mano.

**Riesgo al reactivar:** Meta puede desuscribir un webhook que falla de forma sostenida. Hay
que confirmar la suscripción a `messages` en el panel de Meta después de que el servicio
vuelva, no darla por hecha.

### Los dos fallos de proceso que destapó

**1. Nadie se enteró en tres días.** `vigilar.yml` existe por el corte del 9-ago (§39.5), donde
19 horas de envíos fallidos pasaron desapercibidas. El mecanismo funcionó —el issue #17 se
abrió a los minutos, con la etiqueta `servicio-caido`— pero el aviso no llegó a la persona.
El correo de GitHub por issue abierto no se está mirando. Esta caída duró 81 horas, cuatro
veces la que motivó construir la vigilancia.

**2. La vigilancia no corre cada 30 minutos.** El cron dice `*/30 * * * *`, pero las corridas
reales del 13 y 14-sep fueron 21:31, 23:47, 02:30, 08:20 y 15:07 UTC: huecos de 2 h 16 a
6 h 47. GitHub retrasa los `schedule` según la carga de la plataforma y no garantiza la
frecuencia. La promesa de "avisa de una caída inmediata" que está escrita en `CLAUDE.md` no es
cierta tal como está: el peor caso medido es de casi siete horas.

### Nota de método

Desde esta sesión los tres dominios devolvieron `000` con `connect_rejected` del proxy: el muro
de red que `CLAUDE.md` daba por levantado el 30-ago **está puesto otra vez** en este entorno.
Se define por entorno y por sesión, así que conviene comprobarlo cada vez en lugar de confiar
en lo que diga el documento. El diagnóstico de esta sección no sale de `npm run revisar` —que
solo pudo verificar los certificados— sino de los registros de `vigilar.yml` en GitHub Actions,
que corre fuera de esa red.
