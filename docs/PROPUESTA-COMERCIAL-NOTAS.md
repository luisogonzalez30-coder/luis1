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
| 3 | Alerta de emergencias al celular del Alcalde (§3.3) | Funciona, pero por un bot **no oficial** que corre en tu PC. Solo envía con la PC prendida, y el número puede ser bloqueado por WhatsApp sin aviso ni apelación. | **Este es el riesgo más grande de todos.** Detalle abajo, sección 3. |
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

## 3. El bot de WhatsApp — decide esto antes de firmar nada

La propuesta compromete la alerta de emergencias al celular del Alcalde. Hoy eso funciona
con `@whiskeysockets/baileys` sobre el número +56977701624, que es automatización **no
oficial** de WhatsApp. Dos problemas distintos:

1. **Viola los términos de servicio de WhatsApp.** El número puede quedar bloqueado en
   cualquier momento, sin aviso, sin soporte y sin apelación. Asumir ese riesgo para ti
   es una cosa; asumirlo en un contrato firmado con un municipio es otra. Si se cae el
   día que hay una emergencia real, es un incumplimiento contractual.
2. **Corre en tu PC.** Si la apagas, el Alcalde no recibe la alerta.

Tres salidas, en orden de lo que yo recomendaría:

- **A. Migrar a la API oficial de Meta (Cloud API) antes de firmar.** Es la correcta para
  un municipio. Requiere plan Blaze (tarjeta) y verificación de negocio en Meta, que con
  la SpA ya constituida es un trámite viable. Es cambiar el backend del bot, no el resto
  del flujo.
- **B. Firmar sin la alerta de WhatsApp**, sacarla de la sección 3.3, y ofrecerla después
  como mejora una vez migrada. Pierdes tu función más vendedora.
- **C. Firmar con el bot no oficial** y que el contrato diga explícitamente que las
  notificaciones por WhatsApp se prestan en la medida de lo posible, sin compromiso de
  disponibilidad. Es honesto, pero un asesor jurídico municipal va a preguntar por qué.

Lo mismo aplica a las notificaciones de estado al vecino, que usan el mismo bot.

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
