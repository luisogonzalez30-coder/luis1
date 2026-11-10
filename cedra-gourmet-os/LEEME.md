# Cedra Gourmet OS

App web para pastelería gourmet: costea tortas al gramo, escala moldes por volumen, calcula
precios con margen real y emite cotizaciones formales con el logo de la empresa.

> **Producto aparte.** Esta carpeta vive dentro del repositorio de TuMuniAquí solo porque la
> sesión que la creó estaba atada a ese repositorio. No comparte código, dependencias ni
> datos con nada de afuera. Para llevarla a su propio repositorio conservando el historial:
> `git subtree split --prefix=cedra-gourmet-os -b cedra-solo` y empujar esa rama al repo nuevo.

## Correr

```bash
cd cedra-gourmet-os
npm install
npm run dev        # http://localhost:3000
npm test           # 13 pruebas del motor financiero
npm run typecheck
npm run build
```

Funciona completa sin ninguna variable de entorno. `.env.example` lista las dos opcionales.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript estricto · Tailwind 3 · Lucide.
Tipografías autoalojadas (Fraunces para títulos, JetBrains Mono para cifras): no dependen de
Google Fonts en tiempo de compilación.

TypeScript está fijado en la 5.x a propósito: Next 15 no carga la API de TypeScript 7 y, sin
ella, no resuelve el alias `@/` (el build falla con "Module not found").

## Dónde está cada cosa

| Ruta | Qué hace |
|---|---|
| `src/lib/domain/` | Motor financiero puro, sin React. Todo lo que es fórmula está aquí y tiene prueba. |
| `src/lib/store/` | Store reactivo (`useSyncExternalStore`) + datos de ejemplo. |
| `src/lib/db/` | Contrato `Repository`, adaptador `localStorage` (activo) y adaptador Supabase (preparado). |
| `src/lib/ia/` | Contrato de IA, analizador local de respaldo y cliente. |
| `src/app/api/ia/` | Ruta de servidor que llama a Claude si hay `ANTHROPIC_API_KEY`. |
| `src/app/` | Pantallas: Inicio, Cotizaciones, Recetas, Insumos, Compras, Ajustes. |
| `supabase/schema.sql` | Tabla y políticas RLS para cuando se active la nube. |

## Reglas de negocio (y dónde se cumplen)

| Regla | Implementación |
|---|---|
| Unidades base g / ml / unit | `units.ts` → `normalize()` |
| Merma solo en `ingredient` | `costing.ts` → `grossQty()`: bruto = neto / (1 − merma) |
| Doble tarifa de mano de obra | `costing.ts` → `laborProduction`, `laborDecoration` |
| Horno = (min / 60) × costo hora | `costing.ts` → `oven` |
| Frío fijo o por hora | `costing.ts` → `coolingCost()` |
| Overhead % sobre operación base | `costing.ts` → `baseOperation × overheadPct` |
| Neto = Costo / (1 − margen) | `pricing.ts` → `netPriceFromMargin()` |
| 3 niveles: 30% / configurable / 55% | `pricing.ts` → `priceTiers()` |
| IVA 19% y redondeo a $500 / $900 | `pricing.ts` → `priceFor()`, `commercialRound()` |
| Sueldo vs. utilidad | `quote.ts` → `laborSalary`, `companyUtility` |

Decisiones que la especificación dejaba abiertas:

- **"Operación base" del overhead** = materiales + mano de obra + horno + frío.
- **Redondeo**: siempre hacia arriba, sobre el precio que ve el cliente (con IVA si está
  activo). Después se separa el IVA y se recalcula la utilidad, por eso el margen real que
  muestra la pantalla es igual o mayor al nominal.
- **Escalado**: solo los comestibles escalan por volumen de molde. Empaque, decoración y los
  tiempos de trabajo no: se ajustan a mano en cada pedido.
- **Despacho**: se cobra tal cual, sin margen. **Garantía por arriendo**: no es venta, no
  lleva IVA y no entra al total; se muestra aparte como monto reembolsable.
- **Pilares sugeridos**: 1 cada ~5 cm de diámetro del piso que se apoya encima, mínimo 4.
  Es regla de taller, no cálculo estructural.

## Las 7 funciones del rubro

1. **Sellos de alérgenos** — se derivan de los insumos; las etiquetas Sin Gluten / Vegano /
   Sin Azúcar Refinada se marcan en la receta y la app avisa si contradicen un alérgeno.
2. **Cláusula de transporte y cadena de frío** — editable en Ajustes, impresa en cada cotización.
3. **Despacho propio** — por km (solo ida o ida y vuelta, con mínimo) o tarifa fija.
4. **Alerta de estructura** — sobre 14 cm o más de 1 piso; un botón agrega discos, pilares y
   caja alta al costo si existen en Insumos.
5. **Garantía reembolsable** — pieza, material, monto y plazo de devolución.
6. **Mesón de cocina** — `/cotizaciones/[id]/taller` y `/recetas/[id]/taller`: gramos, moldes
   y pasos, sin un solo precio.
7. **Lista de compras** — suma las cotizaciones aprobadas de la semana, descuenta el stock y
   propone cuántos formatos comprar.

## IA

Dos tareas: estructurar una receta pegada en texto libre y redactar la descripción comercial
de una cotización. Con `ANTHROPIC_API_KEY` responde Claude; sin clave, o si la llamada falla,
responde un analizador local y la pantalla lo dice. El analizador local no convierte tazas ni
cucharadas a gramos: las reporta como no reconocidas.

## PDF

La cotización formal se guarda como PDF desde el botón **Imprimir / Guardar PDF** (hoja A4,
estilos de impresión propios). No hay generación de PDF en servidor.

## Lo que NO está hecho

- **Sincronización con Supabase.** El adaptador y el esquema existen, pero falta el inicio de
  sesión; hoy los datos viven solo en el navegador. El respaldo es Exportar JSON en Ajustes.
- **Multiempresa (SaaS).** El white-label es por instalación: una marca por navegador.
- **Descuento automático de stock** al producir. Compras permite sumar lo comprado; restar lo
  usado es manual en Insumos.
- **Precios de los insumos de ejemplo**: son referenciales, hay que reemplazarlos por los reales.
- **Cláusula legal**: es un texto base y conviene que la revise un abogado.
- **Despliegue.** No está publicado en ningún hosting.
