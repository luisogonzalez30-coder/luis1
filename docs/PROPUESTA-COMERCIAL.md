# Propuesta de servicio — TuMuniAquí

**Para:** Ilustre Municipalidad de Licantén
**Atención:** Sr. Alcalde y Dirección de Administración y Finanzas
**De:** [Razón social] SpA — RUT [__.___.___-_]
**Contacto:** Luis González · [correo] · [teléfono]
**Fecha:** [__ de ______ de 2026]
**Validez de esta oferta:** 30 días corridos desde la fecha

---

## 1. En una frase

TuMuniAquí es la plataforma con la que los vecinos de Licantén reportan un bache, una
luminaria apagada o un basural desde el celular, y con la que el municipio los asigna,
resuelve y demuestra que los resolvió — con la Cuenta Pública anual generada sola a
partir de ese mismo trabajo.

**La plataforma ya está construida y funcionando.** No es un desarrollo a futuro: se puede
ver operando hoy en `https://app-incidencias-urbanas.web.app/licanten`. Lo que esta
propuesta contrata es la puesta en marcha con datos reales de la comuna, el
funcionamiento sostenido y el soporte.

---

## 2. El problema que resuelve

Hoy un reclamo vecinal llega por WhatsApp al concejal, por Facebook, por la oficina de
partes o directo al Alcalde en la calle. Eso produce tres costos concretos:

- **No hay registro.** Nadie sabe cuántos reclamos hay, ni cuáles se repiten, ni cuál
  lleva tres semanas sin tocarse.
- **El vecino no recibe respuesta.** Aunque el municipio resuelva, el vecino no se entera
  y queda con la sensación de que no se hizo nada. El trabajo se hace y no se ve.
- **La Cuenta Pública se arma a mano.** Cada dirección manda su planilla, alguien las
  junta a última hora, y las cifras salen de la memoria más que de un registro.

TuMuniAquí convierte cada reclamo en un ticket con número, responsable, plazo y evidencia
fotográfica de antes y después.

---

## 3. Alcance — qué recibe la Municipalidad

### 3.1 Para el vecino (sin descargar nada, sin registrarse)

| | |
|---|---|
| **Reporte en 3 pasos** | Ubicación (GPS o tocando el mapa), categoría y foto. Nada más. |
| **58 categorías** | Agrupadas por tipo de problema, para que el vecino no tenga que saber qué dirección municipal corresponde. |
| **Anónimo por defecto** | Dejar nombre, RUT o contacto es opcional y sirve solo para avisarle cuando se resuelva. |
| **Hasta 3 fotos** | Por reporte. |
| **Referencias rurales** | Campo de texto libre pensado para zonas sin dirección ("pasando el puente, frente a la escuela"). |
| **Funciona sin señal** | Si el vecino no tiene datos, el reporte queda guardado en el celular y se envía solo cuando vuelve la señal. |
| **Consulta de estado** | Por número de ticket o por RUT, sin login. |
| **Evita duplicados** | Si alguien ya reportó ese mismo bache, la app se lo muestra y le ofrece sumar un "+1" en vez de crear un reporte repetido. El municipio ve un problema con 20 vecinos detrás, no 20 problemas. |
| **Seguimiento y calificación** | El vecino puede agregar un comentario o una foto después, y calificar de 1 a 5 estrellas cuando se resuelve. |
| **Se instala como app** | Desde el navegador, sin pasar por Play Store ni App Store. |

### 3.2 Para las direcciones municipales

- **Derivación automática** a una de 7 direcciones según la categoría reportada. Nadie
  tiene que repartir a mano.
- **Clasificación automática de gravedad** (Alta / Media / Baja) al momento del reporte:
  una fuga de gas no espera detrás de un pastelón suelto.
- **Tres perfiles de acceso**, cada uno ve solo lo suyo:
  - *Alcalde / Administrador*: todo el municipio.
  - *Jefe de dirección*: solo los casos de su dirección — asigna cuadrilla y cierra.
  - *Cuadrilla en terreno*: solo lo que tiene asignado, marca resuelto con foto y gasto real.
- **Órdenes de trabajo con costeo**: presupuesto estimado al asignar, gasto real al
  cerrar, y gasto mensual acumulado.
- **Registro de trabajadores y asistencia** por dirección.
- **Alerta de atraso**: un caso grave que lleve más de 4 horas sin cuadrilla asignada se
  marca en rojo automáticamente.
- **Búsqueda y exportación a Excel** de los casos filtrados.
- **El Alcalde y los jefes ven el contacto del vecino; la cuadrilla en terreno no.**
  Los datos personales solo llegan a quien los necesita.

### 3.3 Para el Alcalde

- **Panel de control con 9 indicadores** de gestión: emergencias activas, trabajos
  atrasados, por asignar, inconclusos, resueltos del mes, trabajadores presentes,
  cuadrillas en terreno, tiempo promedio de resolución y satisfacción vecinal. Cada
  indicador con una línea que explica qué significa.
- **Cuenta Pública en un clic** — el informe anual que exige la Ley 18.695, armado con
  los datos reales del período y listo para imprimir o guardar como PDF: problemas
  resueltos, tiempos de respuesta, desempeño por dirección, qué reportaron los vecinos,
  evolución mes a mes e inversión ejecutada.
- **Vista por sectores** de la comuna (villas, poblaciones y localidades rurales), para
  responder la pregunta que importa: *qué sector estoy desatendiendo*.
- **Comparación mes contra mes**: si el tiempo de respuesta bajó de 5 días a 2, queda
  escrito y respaldado.
- **Alerta de emergencias al celular del Alcalde**: cuando entra un caso grave (fuga de
  gas, cableado expuesto, socavón, árbol caído), le llega un mensaje con la categoría, la
  dirección de referencia, la foto y el enlace a Google Maps. El objetivo es que el
  Alcalde no se entere de una emergencia por un vecino enojado en redes sociales antes
  que por su propio municipio.

### 3.4 Para la ciudadanía en general

- **Página pública de transparencia** de la comuna, sin login y sin datos que
  identifiquen a nadie: total de reportes, porcentaje resuelto, tiempo promedio de
  resolución y las categorías más reportadas.

---

## 4. Qué NO incluye

Se declara explícitamente para que no haya sorpresas después:

- Equipos, celulares, computadores ni conectividad a internet del municipio.
- Digitalización o carga de reclamos históricos en papel.
- Integración con otros sistemas municipales (SIGFE, sistemas de permisos, etc.). Se
  puede cotizar aparte.
- Atención directa a los vecinos: el municipio atiende a sus vecinos, nosotros atendemos
  al municipio.
- Soporte 24/7. El detalle de horarios está en la sección 7.
- Desarrollo de funciones nuevas a medida más allá de las 4 horas mensuales de ajustes
  incluidas (sección 7.3).

---

## 5. Puesta en marcha

Cinco semanas desde la firma. El municipio no necesita destinar personal completo a esto:
lo que se pide son reuniones cortas y la información que solo el municipio tiene.

| Semana | Qué se hace | Qué necesitamos del municipio |
|---|---|---|
| 1 | Configuración de la comuna: nombre, colores, logo, cuadrillas, direcciones municipales. Carga de los sectores reales (villas, poblaciones, localidades rurales). | El listado de sectores y de direcciones municipales con su encargado. |
| 2 | Dominio propio institucional y certificado de seguridad. Creación de las cuentas de los funcionarios con sus perfiles. | Nombre de dominio deseado y la nómina de funcionarios con su rol. |
| 3 | Capacitación presencial o remota, en dos grupos: jefes de dirección y cuadrillas de terreno. Entrega del manual de uso. | Dos horas de cada grupo. |
| 4 | Marcha blanca con casos reales, acompañada. Ajustes de categorías y textos según lo que aparezca. | Uso normal y observaciones. |
| 5 | Lanzamiento a los vecinos: material de difusión (afiche con código QR y publicación para redes sociales), activación de la alerta al celular del Alcalde. | Decisión de la fecha de lanzamiento. |

**Entregables al cierre de la puesta en marcha:** plataforma operativa en dominio propio,
funcionarios capacitados con manual escrito, sectores cargados, respaldo diario
automático andando, y política de privacidad y términos de servicio publicados.

---

## 6. Precio

Valores en UF, para que el contrato no se desactualice con la inflación. **No incluyen IVA.**
*Referencia al [fecha]: UF = $[40.845]. UTM del mes = $[71.649].*

### 6.1 Plan que corresponde a Licantén

Licantén tiene aproximadamente 6.900 habitantes, por lo que le corresponde el **Plan Comuna**.

| Concepto | UF | Referencia en pesos |
|---|---:|---:|
| Puesta en marcha (pago único) | **20** | $817.000 |
| Suscripción mensual | **8** | $327.000 |
| **Total primer año** | **116** | **$4.738.000** |
| Renovación anual (años siguientes) | 96 | $3.921.000 |

> **Esto se puede comprar por Compra Ágil.** El total del primer año equivale a
> aproximadamente **66 UTM**, cómodamente bajo el tope de 100 UTM que la Ley 21.634 fijó
> para ese mecanismo. Es decir: **no requiere licitación pública**. Ver sección 9.

### 6.2 Tabla completa de planes

| Plan | Población | Puesta en marcha | Mensual | Total primer año |
|---|---|---:|---:|---:|
| **Comuna** | hasta 10.000 hab. | UF 20 | UF 8 | UF 116 (≈66 UTM) |
| **Comuna Mayor** | 10.001 a 50.000 hab. | UF 24 | UF 12 | UF 168 (≈96 UTM) |
| **Ciudad** | más de 50.000 hab. | UF 45 | UF 20 | UF 285 (≈162 UTM) |

Los planes Comuna y Comuna Mayor caben bajo el tope de Compra Ágil. El plan Ciudad lo
supera y requiere licitación pública o trato directo fundado.

### 6.3 Descuento por pago anual anticipado

Si la suscripción del año se paga por adelantado en una sola orden de compra, se cobran
**11 meses en lugar de 12**. Para Licantén eso deja el primer año en **UF 108
(≈$4.411.000)**.

### 6.4 Sin costos ocultos

El precio incluye el alojamiento, las bases de datos, los respaldos, las actualizaciones y
todas las funciones nuevas que se publiquen durante la vigencia del contrato. **No hay
cobro por cantidad de reportes, ni por cantidad de vecinos, ni por cantidad de
funcionarios.** Un municipio que usa mucho la plataforma no paga más que uno que la usa
poco — sería absurdo cobrarle más al que mejor trabaja.

---

## 7. Soporte y compromisos de servicio

### 7.1 Canales y horario

Un solo punto de contacto por correo y WhatsApp, de **lunes a viernes de 9:00 a 18:00**,
días hábiles. Fuera de ese horario se reciben mensajes y se responden al siguiente día
hábil, salvo las emergencias de severidad crítica.

### 7.2 Tiempos de respuesta comprometidos

| Severidad | Qué es | Primera respuesta | Solución o rodeo |
|---|---|---|---|
| **Crítica** | La app no carga para los vecinos, o el Dashboard no permite gestionar casos. | 4 horas hábiles | Trabajo continuo hasta mitigar; informe escrito en 48 h |
| **Alta** | Una función importante falla, pero hay forma de seguir trabajando. | 1 día hábil | 3 días hábiles |
| **Media** | Falla menor o un dato que se muestra mal. | 2 días hábiles | En la siguiente actualización |
| **Consulta** | Dudas de uso, capacitación de un funcionario nuevo. | 2 días hábiles | — |

**Disponibilidad objetivo: 99,5% mensual** sobre la app del vecino y el Dashboard, medida
sobre el mes calendario. Se excluyen las mantenciones avisadas con 48 horas de
anticipación (siempre fuera del horario de oficina) y las caídas de la infraestructura de
Google Cloud, que están fuera de nuestro control.

**Si no se cumple la disponibilidad comprometida**, se descuenta un 10% de la mensualidad
del mes siguiente por cada punto porcentual bajo el 99,5%, con un tope de una mensualidad
completa.

### 7.3 Qué más está incluido

- **4 horas mensuales de ajustes** sin costo: agregar o renombrar categorías, cambiar
  sectores, crear o quitar funcionarios, ajustar textos, corregir datos. No se acumulan
  de un mes a otro.
- **Capacitación de funcionarios nuevos** que se incorporen durante el año, en remoto.
- **Respaldo diario automático** de toda la información del municipio.
- **Actualizaciones y funciones nuevas** sin costo adicional.

Desarrollo de funciones nuevas más allá de esas 4 horas: **UF 2 por hora**, siempre
cotizado y aprobado por escrito antes de empezar.

---

## 8. Datos, privacidad y cumplimiento legal

Este punto es el que revisa el asesor jurídico municipal, así que va explícito.

- **Los datos son del municipio, no nuestros.** La Municipalidad es la **responsable del
  tratamiento** de los datos personales de sus vecinos; el proveedor actúa como
  **encargado del tratamiento**, y solo trata esos datos siguiendo las instrucciones del
  municipio. Se firma un **acuerdo de tratamiento de datos** como anexo del contrato.
- **Ley 21.719 de protección de datos personales.** La plataforma se entrega con su
  **política de privacidad y términos de servicio publicados y accesibles** desde el
  mismo formulario donde el vecino entrega sus datos, con el detalle de qué se recoge,
  para qué, por cuánto tiempo, y cómo el vecino ejerce sus derechos de acceso,
  rectificación, cancelación y oposición.
- **Minimización real, no declarada.** Reportar es anónimo por defecto: el nombre, el RUT
  y el contacto son opcionales y se piden solo si el vecino quiere que le avisen. La
  página pública de transparencia y la consulta de tickets no exponen ningún dato que
  identifique a una persona, y **el RUT nunca se escribe en la base de consulta pública**.
- **Portabilidad y salida.** El municipio puede pedir una exportación completa de su
  información cuando quiera, en formato abierto. Al terminar el contrato se entrega esa
  exportación dentro de 30 días corridos y se eliminan los datos de nuestros sistemas
  dentro de 90.
- **Alojamiento** en infraestructura de Google Cloud Platform. Se informará al municipio
  la región de almacenamiento para efectos de la declaración de transferencia
  internacional de datos.
- **Ley 20.285 de transparencia.** La página pública de la comuna y la Cuenta Pública
  generada por la plataforma apoyan el cumplimiento de las obligaciones de transparencia
  activa; no la reemplazan.
- **Ley 18.695.** El informe de Cuenta Pública se genera con datos del propio municipio y
  es un insumo para la cuenta anual del Alcalde; la responsabilidad del contenido final
  es del municipio.

---

## 9. Cómo se compra

Tres vías posibles, en orden de conveniencia para el municipio:

1. **Compra Ágil (recomendada).** El monto del primer año está bajo las 100 UTM que la
   Ley 21.634 fijó como tope para este mecanismo, así que la Municipalidad puede
   contratar directamente a través de Mercado Público, sin licitación. Es el camino más
   rápido: se publica la solicitud de cotización, se reciben ofertas y se emite la orden
   de compra.
2. **Trato directo fundado**, conforme al artículo 8 de la Ley 19.886 y su reglamento, si
   el municipio estima que corresponde por las características del servicio.
3. **Licitación pública**, si el municipio prefiere ese camino o si el contrato es
   plurianual y supera el tope.

Estamos inscritos como proveedor en Mercado Público y podemos cotizar por cualquiera de
las tres vías.

---

## 10. Condiciones comerciales

| | |
|---|---|
| **Duración** | 12 meses, renovable automáticamente por períodos iguales. |
| **Término anticipado** | Cualquiera de las partes, con aviso escrito de 60 días corridos. Sin multa. |
| **Facturación** | Mensual, o anual anticipada con el descuento de la sección 6.3. Factura electrónica. |
| **Pago** | 30 días desde la recepción conforme de la factura. |
| **Reajuste** | Ninguno durante la vigencia: el precio está en UF y ya se reajusta solo. |
| **Propiedad del software** | La Municipalidad recibe una licencia de uso por la vigencia del contrato. El código fuente y la propiedad intelectual son del proveedor. |
| **Propiedad de los datos** | De la Municipalidad, siempre y sin excepción. Ver sección 8. |
| **Confidencialidad** | Recíproca, vigente durante el contrato y por 3 años después. |
| **Garantía** | Si dentro de los primeros 60 días de operación la plataforma no está funcionando conforme a lo descrito en la sección 3, se devuelve íntegro lo pagado. |

---

## 11. Por qué nosotros

- **Está construido y funcionando.** No se está comprando una promesa ni un piloto: se
  puede probar hoy, desde cualquier celular, antes de firmar nada.
- **Hecho para una comuna chilena chica, no adaptado desde otra cosa.** Zonas rurales sin
  dirección, celulares de gama baja, señal intermitente, cuadrillas que trabajan en
  terreno con el teléfono en la mano. Eso está en el diseño desde el primer día, no
  agregado después.
- **Un solo interlocutor.** No hay mesa de ayuda que derive el ticket tres veces.
- **Precio de comuna chica.** Los sistemas de gestión municipal del mercado se cotizan en
  decenas de millones y se licitan. Este entra por Compra Ágil.

---

## 12. Próximo paso

Una reunión de 30 minutos con el Alcalde y el encargado de informática, con la plataforma
en pantalla y datos de Licantén cargados. De ahí sale, o no, la solicitud de cotización en
Mercado Público.

**Luis González** — [correo] · [teléfono]

---

*Documento preparado para la Ilustre Municipalidad de Licantén. Los valores en pesos son
referenciales, calculados con la UF y la UTM vigentes a la fecha indicada en la sección 6;
prevalecen los valores en UF.*
