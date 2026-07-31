# TuMuniAquí — Resumen técnico maestro

> Documento generado para continuar el trabajo en una nueva conversación. Refleja el estado real del código al 31-jul-2026 (actualizado tras implementar consulta pública de ticket, despliegue a Hosting, PWA, derivación automática por departamento, RBAC de 3 roles, agrupación de reportes estilo Waze con upvotes/detección de duplicados, autoservicio de creación de funcionarios, migración de subida de fotos de Firebase Storage a Cloudinary por falta de tarjeta para Blaze, el módulo de Órdenes de Trabajo y Costeo, roster de trabajadores/asistencia por departamento, un arreglo de responsividad mobile en ambos Dashboards, hasta 3 fotos por reporte, RUT opcional del ciudadano con consulta de tickets por RUT, y un bot de WhatsApp no oficial (`whatsapp-bot/`) que notifica al ciudadano cuando su reporte queda Resuelto — implementado y verificado end-to-end el 31-jul-2026, ver §23). Si algo acá no coincide con el código, **confía en el código** (esto es una foto, no la fuente de verdad).

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
│   └── storageService.js         # Subida de fotos a Cloudinary (no Firebase Storage), ver §19
├── utils/
│   ├── categorias.js              # Catálogo de 58 categorías + agruparCategorias()
│   ├── gravedad.js                # Triage automático (ver §7)
│   ├── departamento.js            # Derivación automática por departamento (ver §8)
│   ├── ticket.js                  # generarNumeroTicket()
│   ├── timeout.js                 # conTimeout() — ver §10
│   ├── tiempo.js                  # formatearFecha/Duracion, esDelMesActual (ver §17)
│   ├── costeo.js                  # calcularCostoManoObra (ver §17)
│   ├── rut.js                     # Validación RUT chileno (ver §11)
│   ├── colaOffline.js             # Cola de reportes pendientes en localStorage
│   ├── dispositivo.js             # ID de dispositivo + votos + índice de tickets por RUT (ver §11, §16)
│   ├── distancia.js               # distanciaMetros() — Haversine, para el chequeo de duplicados (ver §16)
│   ├── iconoPin.js                # crearIconoPin() — ícono Leaflet compartido por los mapas
│   ├── tema.js                    # Aplica colores del tenant vía CSS custom properties
│   └── leafletIconFix.js          # Fix de íconos Leaflet+Vite (compartido por los 2 mapas)
├── pages/
│   ├── LandingPage.jsx            # "/" — neutra, sin tenant
│   ├── CiudadanoPage.jsx          # "/:municipioSlug" — resuelve el tenant, muestra el formulario
│   ├── LoginPage.jsx              # "/login"
│   ├── DashboardGeneralPage.jsx   # "/dashboard/general" (ALCALDE_ADMIN) — lazy-loaded, ver §12
│   ├── DashboardDepartamentoPage.jsx # "/dashboard/departamento" (JEFE_DEPARTAMENTO) — lazy-loaded, ver §13
│   ├── GestionFuncionariosPage.jsx # "/dashboard/funcionarios" (ALCALDE_ADMIN) — lazy-loaded, ver §5
│   ├── CuadrillaPage.jsx          # "/cuadrilla" (TERRENO/ALCALDE_ADMIN)
│   └── ConsultaTicketPage.jsx     # "/estado" — consulta pública sin login (ver §15)
└── components/
    ├── ciudadano/                 # Wizard de 3 pasos (ver §11) + PopupVotoIncidencia.jsx,
    │                               # AvisoPosibleDuplicado.jsx (ver §16)
    ├── dashboard/                 # Mapa, lista, PanelAsignacion, PanelGestionDepartamento,
    │                               # MetricasPorDepartamento, ResumenGastoMensual, ModalDetalleGasto, ModalPresupuesto,
    │                               # ModalTrabajadoresDepartamento (ver §12, §13, §17), estadísticas
    ├── cuadrilla/                 # Lista de tareas + detalle
    └── common/                    # Badges, botones, EncabezadoMunicipio, EnlaceGoogleMaps,
                                    # RutaProtegida, Modal (ver §17), GaleriaFotos (ver §11)
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
  fecha_creacion: Timestamp,       // serverTimestamp()
  fecha_asignacion: Timestamp | null,  // null hasta que se asigna cuadrilla — usado para "tiempo de reacción" (ver §17)
  fecha_cierre: Timestamp | null,
}
```

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

1. **PasoUbicacion.jsx** — botón GPS automático **+ mapa interactivo** (`MapaSeleccionUbicacion.jsx`) donde el ciudadano puede tocar/arrastrar para fijar la ubicación a mano. Toggle "Ver satelital" (Esri World Imagery) / "Ver calles" (OSM) abajo a la derecha del mapa.
2. **PasoCategoria.jsx** — select agrupado de 58 categorías, aviso de seguridad condicional, "Referencias de ubicación (opcional)" (placeholder rural: *"Ej: Pasando el puente, frente a la escuela"*), "Detalles adicionales (opcional)".
3. **PasoFoto.jsx** — hasta **3 fotos opcionales** (`fotos_antes_urls: string[]`, antes era una sola `foto_antes_url: string` — ver migración de esquema más abajo) + checkbox **"Quiero que me avisen cuando resuelvan mi reporte"** (31-jul-2026, antes decía "Quiero dejar mis datos de contacto (opcional)" — se reformuló para que quede explícito el motivo de dejar los datos) con una advertencia visible en ámbar: *"sin tu RUT y un WhatsApp o correo, no vamos a poder avisarte cuando se resuelva tu problema"*. Al marcarlo, revela "Tu nombre" / **"Tu RUT"** (nuevo) / "WhatsApp o correo". **La app sigue siendo 100% anónima por defecto** — nada de esto es obligatorio, es una decisión explícita del usuario tras pedir en un principio que el RUT fuera obligatorio y decidir después no hacerlo así.

`FormularioCiudadano.jsx` orquesta los 3 pasos, mantiene `coordenadas` como estado editable (sincronizado desde el hook GPS pero también sobreescribible por clicks en el mapa), y maneja el envío (ver §10).

**`src/utils/rut.js`** (nuevo): `esRutValido(rut)` (módulo 11, dígito verificador), `formatearRut(rut)`, `limpiarRut(rut)`. El campo RUT es opcional, pero si el ciudadano escribe algo, se valida — el botón "Enviar reporte" queda deshabilitado con un RUT inválido (a diferencia del resto de los campos de este paso, que nunca bloquean el envío).

**Migración de esquema — fotos múltiples (31-jul-2026)**: `incidencias.foto_antes_url: string` pasó a ser `incidencias.fotos_antes_urls: string[]` (0 a 3), mismo cambio en `tickets_publicos`. `crearIncidencia` ahora sube cada foto por separado en segundo plano y las agrega con `arrayUnion` (pueden terminar en cualquier orden). Se creó `src/components/common/GaleriaFotos.jsx` (fila de miniaturas con scroll horizontal) para no repetir el render en cada panel — se actualizaron `TarjetaIncidencia.jsx`, `PanelGestionDepartamento.jsx`, `PanelAsignacion.jsx`, `DetalleTarea.jsx`, `PopupVotoIncidencia.jsx` y `AvisoPosibleDuplicado.jsx` (estos dos últimos y `TarjetaIncidencia.jsx` muestran solo la primera foto + "+N" por espacio, los paneles de gestión muestran la galería completa). La foto "después" (`foto_despues_url`, la que sube la cuadrilla al resolver) **sigue siendo una sola** — no se pidió cambiarla.

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

**Chequeo de proximidad al reportar** (`src/utils/distancia.js`, fórmula de Haversine — `distanciaMetros(a, b)`): `FormularioCiudadano.jsx` se suscribe a `tickets_publicos` del municipio (`suscribirTicketsPublicos`) y, al pasar del paso de ubicación, busca entre los tickets activos (`estado` Pendiente o En Proceso) uno de la **misma categoría** a **menos de 50 metros** (`RADIO_DUPLICADO_METROS`). Si encuentra uno, no avanza al paso siguiente — muestra `AvisoPosibleDuplicado.jsx` con la tarjeta del ticket existente y dos opciones: "Sumarme a este reporte" o "Crear uno nuevo de todas formas" (el ciudadano siempre puede decidir que es un problema distinto).

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
      allow update: if puedeGestionarIncidencia(resource.data) || esVotoValidoIncidencia(resource.data, request.resource.data);
      allow delete: if esAlcalde() && esDelMismoMunicipio(resource.data.municipio_id);
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
      // ciudadano sin login puede votar "+1", pero solo puede tocar upvotes.
      allow update: if esDelMismoMunicipio(resource.data.municipio_id) ||
                      (request.auth == null &&
                        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['upvotes']) &&
                        request.resource.data.upvotes == resource.data.get('upvotes', 1) + 1);
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
- **Firestore**: habilitado, con datos reales de prueba. Índices compuestos creados y habilitados: `(municipio_id ASC, fecha_creacion DESC)` y `(municipio_id ASC, estado ASC, fecha_creacion DESC)` sobre `incidencias`.
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

Para build de producción: `npm run build` (verificar que `recharts` quede en chunks separados — `DashboardGeneralPage-*.js` y `DashboardDepartamentoPage-*.js` —, no en el `index-*.js` principal — code-splitting ya configurado en `App.jsx` con `React.lazy`).

## 23. Bot de WhatsApp — notificación al resolver (implementado 31-jul-2026)

**Ubicación**: `whatsapp-bot/` en la raíz del proyecto (junto a `src/`, no dentro) — proyecto Node **independiente**, con su propio `package.json`/`node_modules`, no se bundlea con Vite ni forma parte del build del front. Decisiones de diseño (vía no oficial, número, hosting manual) documentadas en §21 — acá va el cómo quedó construido.

**Cómo funciona (`whatsapp-bot/index.js`)**:
1. Inicia sesión con Firebase Auth (`signInWithEmailAndPassword`, client SDK — no Admin SDK) usando una cuenta de funcionario **`TERRENO` dedicada exclusivamente al bot** (creada desde `/dashboard/funcionarios`, ver §5). TERRENO alcanza porque lee/escribe incidencias de todo el municipio sin restricción de departamento (`puedeGestionarIncidencia` en `firestore.rules` solo restringe por departamento a `JEFE_DEPARTAMENTO`).
2. Lee `usuarios_municipales/{uid}` para saber `municipio_id`, y `municipalidades/{municipio_id}` para el nombre real (usado en el mensaje) — ambos leídos una sola vez al arrancar, no en cada mensaje.
3. Se conecta a WhatsApp con Baileys (sesión persistida en `whatsapp-bot/auth_info/`, gitignored — solo hace falta escanear el QR una vez; reconecta solo si se corta).
4. Escucha `incidencias` con `onSnapshot` filtrando `municipio_id`, `estado=='Resuelto'`, `notificado_whatsapp==false` (3 igualdades, sin `orderBy` — no requiere índice compuesto). Usa `snapshot.docChanges()` y solo procesa tipo `'added'` (evita reprocesar lo ya notificado en cada evento del listener).
5. Si `contacto_ciudadano` no tiene forma de teléfono (vacío o con `@`) marca `notificado_whatsapp: true` igual (nada que enviar) y lo loguea. Si parece teléfono, normaliza anteponiendo `56` si hace falta, confirma con `sock.onWhatsApp()` que el número existe en WhatsApp, y envía foto (`foto_despues_url` o, si no hay, la primera de `fotos_antes_urls`; si no hay ninguna, manda solo texto) + mensaje personalizado.
6. **Mensaje**: saludo con `nombre_ciudadano` si el ciudadano lo dejó, categoría con su etiqueta legible (reusa `CATEGORIAS` de `src/utils/categorias.js` vía import relativo — **no se duplicó el catálogo**, así que si se agregan categorías nuevas el bot las toma solas), nombre real de la municipalidad, número de ticket, y link a `/estado`.
7. Si el envío falla (ej. WhatsApp desconectado en ese instante), **no** se marca `notificado_whatsapp` — la incidencia vuelve a aparecer como `'added'` la próxima vez que el bot arranque y se reintenta sola, sin acción manual.

**Dependencia crítica — versión de Baileys fijada, no usar `^`**: `package.json` fija `"@whiskeysockets/baileys": "6.7.24"` **exacto, sin caret**. La versión `6.17.16` (numéricamente mayor, y la que un rango `^6.x` resolvería) tiene una **vulnerabilidad de día cero que permite falsificar mensajes** ([GHSA-qvv5-jq5g-4cgg](https://github.com/WhiskeySockets/Baileys/security/advisories/GHSA-qvv5-jq5g-4cgg)) — confirmado con `npm view ... deprecated` al instalar. `6.7.24` y `7.0.0-rc12+` están limpias. Si en el futuro se actualiza esta dependencia, revisar `npm view @whiskeysockets/baileys@<version> deprecated` antes de fijar una versión nueva.

**Bug real encontrado y corregido durante la verificación — build de producción desactualizado**: el campo `notificado_whatsapp: false` ya estaba en `incidenciasService.js` (agregado antes de esta sesión), pero el **build desplegado en Firebase Hosting era anterior a ese cambio** — cada incidencia nueva creada en producción se guardaba sin ese campo, así que la consulta del bot (`notificado_whatsapp == false`) nunca las encontraba, sin ningún error visible (un campo ausente no matchea `== false` en Firestore). Se detectó descargando el bundle JS real servido en `https://app-incidencias-urbanas.web.app` y comparando contra el bundle local (`grep -c "notificado_whatsapp"` daba 0 en el desplegado). Se corrigió con `npm run build && npx firebase deploy --only hosting`. **Lección para el futuro**: cualquier cambio a `incidenciasService.js` (o cualquier archivo de `src/`) necesita un deploy explícito — que el código esté commiteado no significa que esté en producción.

**Segundo hallazgo durante la verificación — caché del navegador**: incluso después del deploy, una pestaña ya abierta desde antes siguió corriendo el bundle viejo en memoria. Hubo que probar en una **ventana de incógnito nueva** para garantizar que cargara la versión recién desplegada (mismo gotcha ya documentado en §20.6, confirmado de nuevo acá).

**Verificado end-to-end en producción (31-jul-2026)**: reporte de prueba creado en `/demo` (con foto, nombre, y número de WhatsApp real) → asignado desde el Dashboard → marcado Resuelto → el bot lo detectó al instante, mandó la foto + mensaje personalizado (`Hola {nombre}, tu reporte de "{categoría legible}" (ticket {N}) fue resuelto por {nombre municipio}...`), y quedó recibido en el WhatsApp real del ciudadano de prueba.

**Cómo correrlo día a día** (decisión del usuario: manual, no PM2):
```bash
cd whatsapp-bot
node index.js
```
Deja esa ventana abierta — mientras esté corriendo, notifica en tiempo real; si se cierra, no notifica hasta que se vuelva a abrir (lo pendiente se notifica retroactivo al reabrir, no se pierde). Si algún día se quiere correr desatendido (sin ventana), la alternativa es PM2 — no implementada, el usuario prefirió el modo manual por simplicidad.

**Archivos**: `whatsapp-bot/package.json`, `whatsapp-bot/index.js`, `whatsapp-bot/.env.example` (plantilla) y `whatsapp-bot/.env` (real, gitignored — tiene la config de Firebase del proyecto, no sensible, más `BOT_FUNCIONARIO_EMAIL`/`BOT_FUNCIONARIO_PASSWORD` de la cuenta dedicada, sensible). `whatsapp-bot/auth_info/` (sesión de WhatsApp) también gitignored — si se borra, hay que volver a escanear el QR.

**Riesgo aceptado, sin resolver**: la cuenta `TERRENO` del bot se creó con una contraseña simple durante la prueba inicial — recomendado cambiarla por una robusta desde Firebase Console (Authentication) y actualizar `whatsapp-bot/.env` a la par, ya que esa cuenta tiene permiso de escritura sobre incidencias en producción.
