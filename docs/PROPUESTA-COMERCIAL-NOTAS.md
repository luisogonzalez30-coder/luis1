# Notas internas de la propuesta — NO ENVIAR AL MUNICIPIO

Acompaña a `PROPUESTA-COMERCIAL.md`. Explica de dónde salió cada cifra y, sobre todo,
**qué promete ese documento que hoy todavía no es verdad**.

---

## 1. Antes de enviarla — cosas que hoy no puedes cumplir

La propuesta está escrita en presente y compromete cosas concretas. Estas cinco no están
resueltas al día de hoy. Enviarla sin resolverlas es vender algo que no puedes entregar.

| # | Lo que promete la propuesta | Estado real hoy | Qué hacer |
|---|---|---|---|
| 1 | *"Estamos inscritos como proveedor en Mercado Público"* (§9) | Sin verificar | Inscribir la SpA en mercadopublico.cl. Es gratis y online. **Si no está hecho, borra esa frase antes de enviar.** |
| 2 | Dominio propio institucional en la semana 2 (§5) | Hoy es `app-incidencias-urbanas.web.app` | Comprar `tumuniaqui.cl` en NIC Chile (~$10.000/año) y configurar `licanten.tumuniaqui.cl`. Requiere el plan Blaze de Firebase, que requiere tarjeta. |
| 3 | Alerta de emergencias al celular del Alcalde (§3.3) | **No existe.** (Corregido el 09-ago-2026: antes esta fila decía que funcionaba por un bot no oficial.) El bot ya está migrado a la **API oficial de Meta** y corre en Render, así que el riesgo de bloqueo del número está cerrado — pero **la alerta al Alcalde se perdió en esa migración**: el bot oficial solo avisa "reporte recibido" y "reporte resuelto". En producción: 7 emergencias, 0 alertas. | **Sigue siendo el problema más grave de la propuesta, por otro motivo.** Reponerla necesita un listener nuevo + una plantilla aprobada en Meta. Mientras no esté, sácala de §3.3 o márcala como próxima etapa. Detalle abajo, sección 3. |
| 4 | Respaldo diario automático (§7.3) | El script existe y funciona, pero nunca confirmaste haber creado la tarea programada de Windows, y respalda solo a tu disco local. | Confirmar la tarea (§25 de ESTADO_PROYECTO.md) y subir el respaldo a la nube. |
| 5 | Manual de uso escrito, entregado en la semana 3 (§5) | No existe | Escribirlo. Son unas 10 páginas con capturas: una para el jefe de dirección, otra para la cuadrilla. |

**También**, aunque no aparezca en la propuesta: hay ~89 incidencias de prueba en
`municipalidades/demo` y 1 en `licanten`. Si le muestras la plataforma al Alcalde con datos
inventados adentro, se nota. Limpiar antes de la demo.

---

## 2. De dónde salen las cifras

**Valores de referencia usados** (verificar el día que la envíes, la UF cambia a diario):

- UF al 2-ago-2026: **$40.844,79**
- UTM de agosto 2026: **$71.649**
- Tope de Compra Ágil: **100 UTM = $7.164.900** (Ley 21.634, vigente desde diciembre 2024)

**Plan Comuna (el de Licantén):**

```
Puesta en marcha   UF  20  = $  816.896
Mensual            UF   8  = $  326.758  ×12 = UF 96 = $3.921.100
Primer año         UF 116  = $4.738.000  →  66,1 UTM  ✅ bajo el tope
Renovación         UF  96  = $3.921.100  →  54,7 UTM  ✅
Con pago anual anticipado (11 meses): UF 108 = $4.411.240 → 61,6 UTM
```

**Por qué el precio está donde está.** El número no se eligió por lo que vale tu trabajo,
sino por dónde está la barrera de compra: **bajo 100 UTM, un municipio puede contratarte
por Compra Ágil, sin licitación**. Sobre ese monto necesita una licitación pública, que
son meses de proceso, bases técnicas y competencia con proveedores grandes. El plan Comuna
deja UF 116 con harto aire bajo el tope, y ese aire es a propósito: si la UF sube o el
municipio agrega algo, sigue cabiendo.

**Cuidado con el plan Comuna Mayor:** UF 168 ≈ 96 UTM. Cabe, pero por poco. Si la UF sube
o la UTM baja, se pasa del tope y arruinas la vía de compra. Recalcula siempre antes de
cotizar una comuna de ese tamaño.

**El plan Ciudad (≈162 UTM) no cabe** y va a licitación. Está en la tabla para anclar el
precio: hace que el plan Comuna se lea barato en comparación.

---

## 3. El bot de WhatsApp — reescrito el 09-ago-2026

**La salida A ya se tomó: el bot está migrado a la Cloud API oficial de Meta** (carpeta
`whatsapp-api-oficial/`, corriendo en Render, no en tu PC). El riesgo que dominaba esta
sección —que Meta bloqueara el número sin aviso por usar automatización no oficial—
**está cerrado**. Ver §39 de `ESTADO_PROYECTO.md`.

Verificado contra producción el 09-ago-2026: todos los reportes desde el 1 de agosto
tienen su aviso de recepción enviado, y los resueltos tienen su aviso de resolución.
La cadena funciona de verdad, no en teoría.

Pero quedan cuatro cosas que sí afectan lo que puedes prometer por escrito:

1. **La alerta de emergencias al Alcalde NO existe hoy.** Se perdió en la migración: el
   bot oficial solo notifica dos momentos (reporte recibido y reporte resuelto). No hay
   código que lea `whatsapp_alcalde` ni que reaccione a la gravedad Alta — configurar el
   número del Alcalde **no la activa**. En producción hay 7 emergencias registradas y 0
   alertas enviadas. **Es la función más vendedora de la propuesta (sección 3.3) y
   ahora mismo no se puede cumplir.** Reponerla requiere un listener nuevo *y* una
   plantilla aprobada por Meta (con la API oficial no se puede mandar texto libre fuera
   de la ventana de 24 h desde que el vecino escribe). Hasta que eso pase: sácala de la
   propuesta o márcala explícitamente como "próxima etapa".
2. **El bot corre en el plan Free de Render**, que apaga el proceso a los ~15 minutos sin
   tráfico. Hay un auto-ping cada 10 min que lo mantiene despierto y funciona, pero un
   plan gratuito no tiene SLA. Si el municipio te va a exigir disponibilidad —y la
   sección 7.2 de la propuesta compromete un descuento por indisponibilidad— esto tiene
   que estar en un plan pagado antes de firmar. Es barato; no firmes sin ello.
3. **Meta cobra por mensaje de plantilla.** Cada reporte genera al menos dos mensajes
   (recepción y resolución). Verifica la tarifa vigente de mensajes de *utilidad* en
   Chile y métela en tus números: hoy la propuesta afirma que "no hay cobro por cantidad
   de reportes", lo que es cierto para lo que le cobras al municipio pero no para lo que
   te cuesta a ti. Un municipio con mucho volumen te puede dejar el margen en cero.
4. **Un fallo de plantilla es parcial y silencioso.** Editar una plantilla ya aprobada la
   manda de vuelta a revisión (y Meta limita cuántas veces se puede editar). Si te
   rechazan una, ese aviso deja de salir mientras el otro sigue funcionando, y el único
   registro es el log de Render. Antes de vender soporte, define cómo te vas a enterar.

---

## 4. Decisiones de redacción, por si quieres cambiarlas

- **La garantía de 60 días con devolución íntegra (§10)** es agresiva. La puse porque tu
  problema real no es el precio: es que nadie te conoce y nadie quiere ser el primero. La
  garantía traslada ese riesgo a ti, que es donde tiene que estar para cerrar el primer
  cliente. Si te incomoda, bájala a devolver la puesta en marcha.
- **El descuento de disponibilidad (§7.2)** con tope de una mensualidad acota tu
  exposición. Nunca aceptes una penalización sin tope.
- **Las 4 horas mensuales de ajustes (§7.3)** existen para que los pedidos chicos tengan
  un lugar y no se conviertan en trabajo infinito gratis. Cuando se acaben, el municipio
  ya sabe que lo siguiente se cotiza.
- **"No hay cobro por cantidad de reportes" (§6.4)** es un argumento de venta real: los
  sistemas por transacción castigan al municipio que más trabaja. Dilo en la reunión.
- **No prometí tiempos de resolución de bugs menores** en días fijos, solo "en la
  siguiente actualización". Trabajas solo; no te encierres.
- **La palabra "piloto" no aparece.** Un piloto es gratis en la cabeza de un alcalde.

---

## 5. Para reutilizarla con otro municipio

Cambiar solo esto:

1. Nombre de la comuna (encabezado, §1, §6.1, §12).
2. Población → determina el plan de la tabla de §6.2.
3. La URL de demostración de §1.
4. Recalcular el equivalente en pesos y en UTM con la UF y la UTM del día.
5. En §5, la semana 1 menciona los sectores: cambiar por los de esa comuna.

El resto del documento es genérico a propósito.

---

## 6. El tope de Compra Ágil se mide CON IVA (19-ago-2026)

Esto invalida los cálculos de la sección 2 y de cualquier versión anterior de la propuesta,
que comparaban el **valor neto** contra las 100 UTM. Está mal.

**El criterio real.** El material oficial de ChileCompra dice que las 100 UTM incluyen el IVA
y todos los costos asociados a la adquisición, y le indica al proveedor que el valor cotizado
es el total, con impuestos y despacho incluidos. La norma vigente son los **artículos 97 y 98
del DS 661/2024 de Hacienda** (el reglamento nuevo), no el antiguo artículo 10 bis del DS 250
ni "la Ley 21.634" a secas. Citar el DS 661 frente a un asesor jurídico municipal.

Fuente: `Masterclass-Compra-Agil-Proveedor.pdf`, ChileCompra, agosto 2025.

**Lo que se rompía con los precios anteriores** (activación 44 UF + mensual 13 UF):

| Concepto | UF | Neto | UTM neto | Con IVA | UTM c/IVA |
|---|---|---|---|---|---|
| Pack promocional | 171 | $6.986.261 | 97,5 ✅ | $8.313.651 | **116,0 ❌** |
| Suscripción anual sola | 156 | $6.373.431 | 88,9 | $7.584.383 | **105,9 ❌** |
| Primer año a lista | 200 | $8.171.066 | 114,0 | $9.723.569 | **135,7 ❌** |

No solo se pasaba el primer año: **la renovación del año 2 tampoco cabía**. Ese era el error
más caro, porque obligaba a cambiar de procedimiento al año siguiente.

**Los topes reales, con IVA:**

- Máximo absoluto para caber en Compra Ágil: **147,4 UF**
- Mensualidad máxima para que 12 meses quepan: **12,28 UF**

**Precios adoptados (19-ago-2026):** mensual 13 → **12 UF**, anual **144 UF**, pack del primer
año **144 UF** con la activación incluida sin costo. 144 UF = **97,7 UTM con IVA**, con 2,3 UTM
de holgura. El mismo número sirve para cada renovación, así que el municipio nunca tiene que
cambiar de vía de compra.

Costo de la corrección: 27 UF el primer año, 12 UF al año de forma recurrente.

**Otro dato del mismo documento:** en servicios de ejecución diferida en el tiempo se mide el
**monto total del contrato**, no la cuota mensual. Eso cierra definitivamente la idea de
facturar mes a mes para bajar del tope — además de lo que ya dice el reglamento sobre
fraccionamiento.

**Al reutilizar la propuesta con otro municipio:** el punto 4 de la sección 5 de este documento
dice "recalcular el equivalente en pesos y en UTM". Recalcularlo **con IVA**. Un plan que en
neto se ve holgado puede estar 16 UTM sobre el tope.
