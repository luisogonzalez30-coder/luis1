# TuCondoAquí — arquitectura y plan de implementación

**Fecha:** 14 de septiembre de 2026
**Documento hermano:** `docs/ESTUDIO-MERCADO-CONDOMINIOS.md` (por qué se hace esto)

---

## 1. La decisión de arquitectura

**Un solo repositorio, un solo despliegue, un solo motor, dos productos.**

La alternativa era copiar el proyecto y adaptarlo. Se descartó: habría duplicado también los
bugs, las mejoras y el trabajo de mantención, con una persona sosteniendo los dos. Y hay un
municipio real en producción — cada arreglo que se hace para Licantén tendría que hacerse dos
veces, y la segunda se olvidaría.

Lo que de verdad cambia entre una comuna y un condominio no es el motor, es el **dominio**:

| | TuMuniAquí | TuCondoAquí |
|---|---|---|
| Quién reporta | Vecino | Residente |
| Qué se reporta | 58 categorías urbanas | 84 categorías de condominio |
| Dónde ocurre | Coordenada GPS en la vía pública | Torre · unidad, o espacio común |
| Quién resuelve | 7 departamentos municipales | 7 áreas del condominio |
| Plazos (SLA) | 4 h / 24 h / 72 h | 2 h / 12 h / 48 h |
| Quién manda | Alcalde | Comité de Administración |
| Qué exige la ley | Ley 18.695 | **Ley 21.442** (certificaciones, plan de emergencia, rendición) |

El motor —reporte con foto → triage automático → derivación → orden de trabajo con presupuesto
y gasto real → aviso por WhatsApp → calificación → panel— es el mismo.

## 2. Cómo se elige la vertical

El documento del tenant (`municipalidades/{slug}`) trae un campo nuevo:

```js
{ vertical: 'municipio' | 'condominio' }
```

**Si no lo trae, es `'municipio'`.** Esa sola decisión es la que hace que todo este cambio sea
aditivo: no hubo que migrar ni un documento de Licantén, ni tocar el RBAC, ni renombrar
campos en Firestore.

La colección del tenant se sigue llamando `municipalidades` y el campo del área responsable
dentro de cada incidencia se sigue llamando `departamento`. Los dos nombres quedaron cortos,
y renombrarlos habría exigido migrar datos de producción, reescribir `firestore.rules` y
volver a desplegar reglas, a cambio de dos palabras. No se hizo, y está dicho en el código
para que nadie lo "arregle" después sin saber el costo.

## 3. Qué se construyó

```
src/verticales/
├── index.js         Registro, verticalDe(tenant), el paquete de condominio
├── municipio.js     Paquete municipal, armado con los datos que ya vivían en src/utils/
└── condominio.js    Paquete de condominio, con su catálogo completo

src/utils/
├── unidades.js      Torre/piso/unidad y espacios comunes (reemplaza al mapa)
└── mantenciones.js  Calendario de cumplimiento de la Ley 21.442

src/components/condominio/
└── PasoUbicacionUnidad.jsx   Paso 1 de la vertical: elegir unidad o espacio común
```

Cada vertical expone la misma interfaz: `lexico`, `categorias`, `areas`, `ubicacion.modo`,
`rolesUI`, `sla`, `calcularGravedad()`, `calcularArea()`. Quien la consume no sabe cuál es.

### 3.1 Una sola fuente de verdad por categoría

En la vertical municipal, el catálogo, el triage y la derivación viven en tres archivos
separados (`categorias.js`, `gravedad.js`, `departamento.js`) y hay que acordarse de tocar los
tres al agregar una categoría — se olvidó más de una vez.

En `condominio.js` cada categoría se declara **una vez**, con su etiqueta, su grupo, su
gravedad y su área responsable, y los tres mapas se derivan. Es la misma información con una
sola fuente de verdad. Cuando haya que tocar la vertical municipal por otro motivo, conviene
migrarla al mismo formato.

### 3.2 La ubicación

Un condominio entero cabe dentro del margen de error del GPS de un celular: el pin no
distingue el piso 3 del piso 12 ni el estacionamiento 40 del 41. Por eso el Paso 1 de esta
vertical no es un mapa.

La estructura se declara en el tenant:

```js
{
  torres: [
    { nombre: 'Torre A', pisos: 12, unidades_por_piso: 4 },   // genera 101 … 1204
    { nombre: 'Casas',  unidades: ['Casa 1', 'Casa 2'] },     // lista explícita
  ],
  espacios_comunes: ['Hall de acceso', 'Piscina', 'Ascensor Torre A', ...],
  instalaciones: { tiene_ascensores: true, tiene_gas_comun: true, tiene_piscina: true },
}
```

Las dos formas de declarar unidades conviven porque los condominios chilenos son las dos
cosas: torres con numeración regular, y conjuntos de casas donde la numeración no sigue
ninguna regla.

La incidencia guarda igual una `coordenadas` (el centro del condominio). No es redundante: el
mapa de calor, el mapa del panel y la regla de Firestore que exige `coordenadas.lat/lng is
number` siguen funcionando sin ninguna excepción por vertical. El lugar real vive en
`ubicacion_condominio`.

### 3.3 Privacidad: la unidad no es pública

En un municipio la ubicación de un reporte no identifica a nadie. En un condominio, **la
unidad identifica al hogar**.

- Torre y número **nunca** se copian a `tickets_publicos` (colección de lectura pública).
- Solo el espacio común viaja, porque ahí no hay a quién identificar.
- Por lo mismo, la agrupación de duplicados estilo Waze **solo opera en espacios comunes**.
  Dentro de una unidad no se agrupa nunca. Es una decisión, no un pendiente.

### 3.4 Cumplimiento Ley 21.442

`src/utils/mantenciones.js`: 14 obligaciones con periodicidad, responsable, evidencia exigida
y referencia legal; se filtran según lo que el condominio declara tener. Estados: **vencida /
sin registro / por vencer / al día**, con aviso 60 días antes — tiempo real para cotizar,
aprobar en comité y agendar al proveedor.

> Las periodicidades son valores **por defecto, editables**. El sistema lleva el calendario que
> el administrador configura; **no es asesoría legal** y no se vende como tal. Escrito así en
> el código a propósito.

## 4. Qué se tocó del código que ya existía

Todos los cambios son aditivos y los valores por defecto reproducen exactamente el
comportamiento municipal anterior.

| Archivo | Cambio | Riesgo para Licantén |
|---|---|---|
| `services/incidenciasService.js` | `crearIncidencia` recibe `verticalId` (string, para que sobreviva a la cola offline) y `ubicacionCondominio`; el triage y la derivación los hace la vertical | Ninguno: sin `verticalId` cae a municipio |
| `services/ticketsPublicosService.js` | Campo `ubicacion_publica`, solo espacios comunes | Ninguno: no se escribe si no viene |
| `components/ciudadano/FormularioCiudadano.jsx` | Paso 1 conmuta entre mapa y unidad; duplicados por espacio común; desactiva la geocodificación inversa en condominios | Ninguno en el camino municipal |
| `components/ciudadano/SelectorCategoria.jsx` | `categorias` por prop (antes leía el catálogo global) | Ninguno: por defecto es el municipal |
| `components/ciudadano/PasoCategoria.jsx` | Recibe `vertical`; textos y aviso de seguridad según corresponda | Ninguno |
| `utils/categorias.js` | `etiquetaCategoria()` resuelve etiquetas de **ambas** verticales | Ninguno. `CATEGORIAS` (lo elegible) sigue siendo solo el municipal |
| `utils/coloresGrupo.js` | 8 grupos de condominio + 1 neutro, con la paleta en su orden fijo validado | Ninguno |
| `pages/DashboardGeneralPage.jsx`, `CuentaPublicaPage.jsx`, `GestionFuncionariosPage.jsx` | Las áreas salen de la vertical del tenant, no de `DEPARTAMENTOS` | Ninguno: la vertical de Licantén devuelve `DEPARTAMENTOS` |
| `components/dashboard/MetricasPorDepartamento.jsx`, `ResumenGastoMensual.jsx` | `areas` por prop, con `DEPARTAMENTOS` por defecto | Ninguno |
| `firestore.rules` | `areaResponsableValida()` acepta las áreas de ambas verticales | **Requiere desplegar reglas.** Sin eso, un reporte de condominio es rechazado |

## 5. Qué falta — en orden

### Antes del primer condominio real

1. **Desplegar `firestore.rules`.** `npm run desplegar:reglas`. Sin esto la vertical no
   escribe nada.
2. **Crear el tenant de demostración.** `npm run condo:demo -- --aplicar` (requiere
   `serviceAccountKey.json`). Deja `condominio-demo` con 3 torres, 144 unidades, 14 espacios
   comunes, 18 reportes sembrados y el calendario de mantenciones a medio cumplir — abre en
   rojo a propósito: un demo donde todo está al día no muestra para qué sirve el módulo.
3. **Panel de Cumplimiento 21.442 en la UI.** La lógica está y está probada; falta la
   pantalla que la muestra y el formulario para cargar fecha, proveedor y documento. **Es el
   diferenciador principal del producto: sin pantalla, no existe comercialmente.**
4. **Parametrizar WhatsApp.** Hoy las plantillas de Meta dicen "Municipalidad de Licantén"
   adentro y los links van fijos a `/licanten` (ver §44). Hay que resolverlo antes del segundo
   tenant de cualquier vertical — no es exclusivo de condominios, pero acá se vuelve
   bloqueante.
5. **Léxico en las pantallas de funcionario.** Los paneles ya usan las áreas correctas, pero
   varios textos siguen diciendo "cuadrilla", "municipalidad" y "vecino". El `lexico` ya está
   en la vertical; falta pasarlo por los componentes.
6. **Verificar `tucondoaqui.cl` en NIC Chile y la marca en INAPI.** No se pudo desde la sesión.

### Después

7. Libro de novedades digital de conserjería (turnos, entrega de turno, encomiendas).
8. Informe mensual automático para la rendición al comité — el PDF ya existe para la Cuenta
   Pública municipal (`utils/reporteGerencial.js`), hay que adaptarlo.
9. Panel del Comité de Administración, análogo al panel del Alcalde.
10. Votaciones y asambleas.
11. Landing comercial de TuCondoAquí, siguiendo `landing/`.

## 6. Cómo probarlo localmente

```bash
npm install
npm run build          # tiene que quedar verde
npm run dev            # abre /condominio-demo una vez sembrado el tenant
npm run condo:demo     # simulación, no escribe nada
```

`npm run condo:demo` sin `--aplicar` corre **sin credenciales** a propósito: la simulación
tiene que poder revisarse antes de tocar la base, en cualquier máquina.
