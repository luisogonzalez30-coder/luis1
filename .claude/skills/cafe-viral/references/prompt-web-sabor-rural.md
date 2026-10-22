# Prompt: web de máxima conversión para Sabor Rural

Prompt para usar tal cual en una sesión nueva (o con la skill `cafe-viral`). Pega el bloque
completo. Los datos marcados **[PENDIENTE]** hay que pedírselos al dueño antes de publicar.

---

## Rol

Actúa como Director de Producto Digital, diseñador de conversión y desarrollador front-end
senior. Construyes la web oficial de **Sabor Rural**, una cafetería familiar de Licantén,
Región del Maule, Chile. Entregas código limpio, modular, accesible y rápido. Respuestas
directas, sin introducciones, en español de Chile.

## Objetivo del negocio

La web **no es un folleto**: es un motor de pedidos y reservas. Orden de prioridad de las
conversiones:

| # | Conversión | Valor |
|---|---|---|
| 1 | Pedido de **torta por encargo** | Producto de mayor ticket. Hoy son ~20 tortas al mes y hay capacidad para producir hasta 10 al día |
| 2 | **Cotización de evento** (tablas, coffee break, celebraciones) | Ticket alto. Se reserva con 2 semanas de anticipación |
| 3 | **Cupo en taller** presencial (tartas, galletas, torta decorada) | Margen alto, refuerza la marca |
| 4 | **Gift card** | Cobro anticipado, atrae gente de afuera |
| 5 | **Cómo llegar** (visita al local) | Tráfico de paso y turismo |

Métrica norte: pedidos y cotizaciones recibidos por la web por mes. No medir likes ni visitas
sueltas.

## Hechos confirmados (no inventar nada fuera de esta lista)

- Nombre: Sabor Rural. Instagram `@sabor_rural` (5.424 seguidores). Facebook: "Sabor Rural".
- Ubicación: Licantén, Región del Maule. A ~100 km de Curicó y ~80 km de Talca.
- 9 años de operación, negocio familiar.
- Oferta: café de especialidad (grano tostado fuera, no se vende café en bolsa), pastelería
  artesanal (tortas, tartas, galletas, otros), sándwiches, tablas.
- Pet friendly.
- Google Maps: 4,6 estrellas, 85 reseñas, rango $5.000 a $10.000 por persona. Resumen de
  Google: "excelente lugar para descansar durante el viaje" y "precios accesibles".
- Abre a las 8:30 (el horario completo es **[PENDIENTE]**).
- Letrero de la fachada: "Todos bienvenidos. Aquí pueden comer los golosos, los celíacos, los
  a dieta, los alérgicos, los sanitos y los no tanto, los que aman el café, los que toman
  agüitas, los que beben solo té y los comegalletas." Es la voz de marca. **No prometer
  opciones sin gluten ni libres de alérgenos** por el solo hecho de que el letrero lo diga.
- Tiene inicio de actividades en el SII, boleta electrónica y resolución sanitaria.
- Hace talleres y tiene tiempo y espacio para ellos.

**[PENDIENTE] pedir al dueño:** dirección exacta y referencia de ruta, horario por día,
número de WhatsApp, precios y tamaños reales de tortas, plazo mínimo para tortas, sabores
reales, lista de tablas y su precio por persona, fotos propias de tortas/tablas/equipo,
historia de por qué abrió, política de abono, zonas de despacho (Curicó, Talca) y costo,
temas y fechas de talleres, montos de gift card.

## Público

| Segmento | Qué busca | Qué página lo atiende |
|---|---|---|
| Locales de Licantén, Curicó y Talca | Torta para una ocasión, evento | Encargos, Eventos |
| Gente de paso o en escapada | Parada para descansar, sándwich, café, algo dulce | Hero, Cómo llegar |
| Turistas y aficionados a la pastelería | Experiencia, taller | Talleres |
| Quien regala | Una gift card fácil | Regala |

## Estructura de la página (orden y por qué)

1. **Cinta de contexto** (solo en la vista previa).
2. **Cabecera** fija: marca, ancla a Tortas, Eventos, Talleres, Regala, Carta, Cómo llegar y
   botón "Encargar torta".
3. **Hero**: titular "Todos bienvenidos." sobre fondo negro tipo letrero, foto real de la
   fachada, CTA primario "Encargar una torta", CTA secundario "Cómo llegar".
4. **Franja de confianza**: 4,6 en Google, 85 reseñas, 9 años, pet friendly, hora de apertura.
5. **En tu ruta / Cómo llegar**: citas del resumen de Google Maps con su fuente, dirección con
   botón copiar, botón a Google Maps, horario.
6. **Tortas por encargo**: formulario corto (ocasión, tamaño, fecha, entrega, idea, nombre) con
   vista previa del mensaje y botón que abre WhatsApp con el pedido ya escrito. Pasos reales:
   idea, propuesta y valor, abono para reservar fecha, retiro.
7. **Eventos**: formulario (tipo, personas, fecha mínima = hoy + 14 días, nombre) con el mismo
   mecanismo.
8. **Talleres**: tarjetas con cupos limitados y botón "Quiero un cupo".
9. **Regala**: gift cards por monto, pedidas por WhatsApp.
10. **Carta**: pizarra visual (café, pastelería, sándwiches, tablas) y enlace a Instagram.
11. **Nosotros**: foto del interior y la historia en palabras del dueño.
12. **Preguntas frecuentes**.
13. **Pie**: dirección, horario, WhatsApp, redes.
14. **Barra fija en móvil**: "Cómo llegar" y "Encargar torta".

## Reglas de conversión

- Un solo CTA primario por pantalla; el secundario no compite con él.
- El formulario pide lo mínimo y **termina en WhatsApp con el mensaje armado**, porque es
  donde ya conversa el negocio. Mostrar el mensaje antes de enviar.
- Prueba social solo con datos reales y con su fuente. Nada de testimonios inventados.
- Mostrar las condiciones sin que haya que preguntarlas: plazo de eventos, abono, retiro,
  despacho.
- El móvil es la pantalla principal: botones de 48 px o más, barra fija inferior, formularios
  con teclado correcto (`inputmode`, `type="date"`).
- Sin ventanas emergentes ni carruseles automáticos.
- Marcar con un resaltado visible todo dato **[PENDIENTE]** hasta que se complete.

## Dirección de diseño

- Concepto: el **letrero negro** de la fachada abre la página; la **pizarra** de la carta la
  cierra. Madera, ámbar y verde eucalipto.
- Tipografía: Bricolage Grotesque (títulos), Hanken Grotesk (texto), Caveat solo para la
  pizarra.
- Fotos propias de Sabor Rural en lugar de imágenes de banco. Si no hay foto de un producto,
  no poner un espacio vacío: ocultar el bloque.
- Modo claro y oscuro con tokens de color. Contraste AA como mínimo.
- Evitar el estilo genérico de plantilla: sin degradados morado-azul, sin tarjetas con borde
  redondeado en todo, sin emojis como viñetas.

## Requisitos técnicos

- **Fase 1** (1 semana): landing estática, un solo archivo o carpeta mínima, hospedaje
  gratuito o barato, formularios que terminan en WhatsApp. Sin pasarela de pago todavía.
- **Fase 2**: pagos de abonos y gift cards con una pasarela chilena (Webpay, Flow o Mercado
  Pago; verificar compatibilidad y comisiones) y boleta electrónica. Evaluar Shopify frente a
  una solución propia con los datos reales de volumen.
- Rendimiento: LCP bajo 2,5 s en 4G, imágenes en WebP/AVIF con `srcset`, fuentes con
  `font-display: swap`.
- Accesibilidad: foco visible, etiquetas en todos los campos, `alt` descriptivo, navegación
  por teclado.
- SEO local: título y descripción con "cafetería en Licantén", "tortas por encargo
  Licantén / Curicó / Talca"; datos estructurados JSON-LD (`CafeOrCoffeeShop` con dirección,
  horario, `servesCuisine`, `sameAs` con Instagram y Facebook); mismo nombre, dirección y
  teléfono que en Google Maps.
- Analítica con eventos: `click_whatsapp_torta`, `click_whatsapp_evento`, `click_taller`,
  `click_gift`, `click_como_llegar`, `copy_direccion`. Sin cookies de terceros innecesarias.
- Privacidad: informar el uso de los datos del formulario; no guardar datos sensibles.

## Entregables en este orden

1. **Vista previa navegable** con datos reales confirmados y los pendientes resaltados.
2. Lista de lo que falta pedir al dueño.
3. Código listo para publicar (Fase 1) con instrucciones de despliegue.
4. Textos de Google Business Profile e Instagram alineados con la web.
5. Plan de contenido que lleve tráfico a Encargos y Eventos (usar la skill `cafe-viral`).
6. Plan de medición: pedidos por semana, conversión por formulario, origen de cada pedido.

## Criterios de aceptación

- [ ] Un visitante en móvil puede enviar un pedido de torta en menos de un minuto.
- [ ] Ninguna cifra, reseña ni promesa que no esté en los hechos confirmados.
- [ ] Cada CTA lleva a una acción concreta (WhatsApp, Maps o ancla) y se ve sin desplazarse.
- [ ] Funciona en claro y oscuro, a 400 px y a escritorio, sin desplazamiento horizontal.
- [ ] Los **[PENDIENTE]** están visibles y listados.
