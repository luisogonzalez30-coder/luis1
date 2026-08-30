# Estructura de carpetas

Next.js 15 (App Router) + TypeScript + TailwindCSS + Supabase.

La decisión que ordena todo el árbol: **el ticket de ChileCompra y la
`SERVICE_ROLE_KEY` nunca cruzan al navegador**. Por eso la ingesta vive fuera
de `app/`, en su propio proceso, y el frontend solo habla con Supabase usando
la clave `anon` — con RLS decidiendo qué puede leer.

```
SAAS/
│
├── app/                              # App Router. Todo lo que ve el usuario.
│   ├── layout.tsx                    # <html>, fuentes, providers
│   ├── page.tsx                      # landing pública
│   ├── globals.css                   # directivas de Tailwind
│   │
│   ├── (auth)/                       # grupo de rutas: sin sidebar, sin sesión
│   │   ├── layout.tsx
│   │   ├── entrar/page.tsx
│   │   ├── registro/page.tsx
│   │   └── recuperar/page.tsx
│   │
│   ├── (panel)/                      # grupo de rutas: exige sesión
│   │   ├── layout.tsx                # verifica sesión y suscripción; sidebar
│   │   ├── tablero/
│   │   │   ├── page.tsx              # Server Component: lee `coincidencias`
│   │   │   ├── loading.tsx
│   │   │   └── filtros.tsx           # 'use client' — solo el trozo interactivo
│   │   ├── oportunidad/[codigo]/
│   │   │   └── page.tsx              # la ficha completa, sin PDFs
│   │   ├── alertas/                  # CRUD de preferencias_alerta
│   │   │   ├── page.tsx
│   │   │   ├── nueva/page.tsx
│   │   │   └── [id]/editar/page.tsx
│   │   ├── compradores/
│   │   │   └── [codigo]/page.tsx     # semáforo y su fundamento
│   │   └── cuenta/
│   │       ├── page.tsx
│   │       └── plan/page.tsx
│   │
│   └── api/
│       ├── cron/
│       │   ├── ingestar/route.ts     # dispara la fase 1 (protegido por secreto)
│       │   └── despachar/route.ts    # materializa y manda los correos
│       └── webhooks/
│           └── pagos/route.ts        # actualiza usuarios.plan con service_role
│
├── componentes/                      # sin lógica de datos, solo presentación
│   ├── ui/                           # botón, tarjeta, badge, tabla…
│   ├── SemaforoBadge.tsx
│   ├── TarjetaOportunidad.tsx
│   ├── CuentaRegresiva.tsx           # "cierra en 2 días 4 h"
│   └── EditorPreferencia.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── servidor.ts               # createServerClient con cookies (SSR)
│   │   ├── navegador.ts              # createBrowserClient (clave anon)
│   │   └── middleware.ts             # refresco de sesión
│   ├── formato.ts                    # CLP/UF/UTM, fechas en hora de Chile
│   └── tipos.ts                      # tipos generados desde el esquema
│
├── ingesta/                          # ← NO se importa desde app/. Proceso aparte.
│   ├── ingestar-dia.ts               # fase 1: listado diario (1 petición/día)
│   ├── enriquecer-fichas.ts          # fase 2: fichas de lo que interesa
│   ├── despachar-alertas.ts          # materializa coincidencias y notifica
│   └── lib/
│       ├── chilecompra.ts            # cliente con cuota, pausa y backoff
│       ├── fechas.ts                 # DDMMAAAA + zona horaria de Chile
│       ├── mapear.ts                 # respuesta de la API → filas
│       └── supabase.ts               # cliente con SERVICE_ROLE_KEY
│
├── supabase/
│   ├── migrations/
│   │   ├── 0001_esquema_inicial.sql
│   │   ├── 0002_coincidencias.sql
│   │   └── 0003_cola_de_enriquecimiento.sql
│   └── config.toml                   # supabase init
│
├── pruebas/
│   ├── fechas.test.ts
│   └── mapear.test.ts
│
├── middleware.ts                     # refresca la sesión en cada request
├── .env.example                      # las variables, sin un solo valor real
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
└── package.json
```

## Las cuatro decisiones que explican el árbol

**`ingesta/` fuera de `app/`.** Next.js empaqueta lo que se importa desde
`app/`. Un import descuidado desde un Server Component a un archivo que lee
`CHILECOMPRA_TICKET` no rompe el build — y ese es el problema: puede terminar
en el bundle del cliente sin error visible. Manteniéndolo en otro árbol, el
riesgo desaparece por construcción. La ingesta corre con `tsx` desde un cron
(GitHub Actions, Railway, Render) y habla con Supabase por HTTP.

**Grupos de rutas `(auth)` y `(panel)`.** Los paréntesis no aparecen en la
URL: sirven para darle a cada grupo su propio `layout.tsx`. La verificación de
sesión vive en `(panel)/layout.tsx`, una sola vez, y no repetida en cada
página — que es donde siempre se olvida en alguna.

**Server Components por omisión, `'use client'` en la hoja.** El tablero lee
de Supabase en el servidor: el HTML llega con los datos y no hay parpadeo. Solo
los trozos que necesitan estado del navegador —filtros, formularios— se marcan
como cliente. Marcar la página entera obliga a traer los datos por `useEffect`
y devuelve el parpadeo.

**`api/cron/` protegido por secreto compartido.** Son rutas públicas de
internet; sin un `Authorization: Bearer` verificado contra una variable de
entorno, cualquiera puede dispararlas y quemar la cuota diaria de la API. Es un
`if` de tres líneas que se olvida siempre.
