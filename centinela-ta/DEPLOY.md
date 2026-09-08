# Desplegar Centinela TA en Render (gratis)

Esto deja la app en internet, con URL propia, para probarla desde el celular
o compartirla. Todo el paso a paso funciona desde el navegador del celular
— no hace falta una computadora.

## 1. Crear cuenta en Render

Andá a [render.com](https://render.com) → **Get Started** → **Sign up with GitHub**
(usá la misma cuenta de GitHub donde está este repo). Es gratis, no pide
tarjeta para el plan free.

## 2. Crear el Blueprint

1. En el dashboard de Render, tocá **New +** → **Blueprint**.
2. Elegí el repo `luisogonzalez30-coder/luis1`.
3. Seleccioná la rama `claude/nueva-skill-instalada-rlmxjb` (o `main` si ya
   se mergeó el PR).
4. Render encuentra `render.yaml` en la raíz del repo y te muestra los
   recursos a crear: una base de datos Postgres, un Redis (Render lo llama
   "Key Value"), y dos servicios web (`centinela-ta-api` y
   `centinela-ta-web`). El worker de verificación no es un servicio aparte
   — corre embebido dentro de `centinela-ta-api`, porque el plan free de
   Render no ofrece el tipo "Background Worker" (ver "Si algo falla" más
   abajo si ya lo intentaste antes y te lo rechazó por eso).
5. Te va a pedir 2 valores porque los dejé marcados como "hay que
   completarlos a mano" (son secretos, nunca van commiteados al repo).
   Pegá exactamente estos dos:

   ```
   JWT_SECRET=db68d1c9abbc73f5a6f72971e6e152c0ae4624bf385603a5c4e7888a8564adb1
   FIELD_ENCRYPTION_KEY=db07f5f740333491db7c27c106cd818048fed12be8b3927438a04713b23f8fbd
   ```

6. Tocá **Apply** (o **Create New Resources**, según la versión de la UI).

## 3. Esperar el primer build

Render va a instalar dependencias, compilar los 3 servicios, correr las
migraciones de base de datos, y levantar todo. El primer build tarda entre
5 y 10 minutos (los siguientes son más rápidos). Podés ver el progreso en
la pestaña **Logs** de cada servicio.

**Nota sobre el plan gratis**: los servicios web se "duermen" después de
~15 minutos sin tráfico y tardan ~30-50 segundos en despertar en el primer
request — no te preocupes si la primera carga se siente lenta.

## 4. Verificar las URLs (paso importante)

Una vez que terminó el build, andá a cada servicio y copiá su URL real
(arriba a la izquierda de la página del servicio, algo como
`https://centinela-ta-api-xxxx.onrender.com`). `render.yaml` asume que van
a quedar exactamente como `centinela-ta-api.onrender.com` y
`centinela-ta-web.onrender.com` — si Render les agregó un sufijo (pasa si
ese nombre ya lo usa otra cuenta), corregí esto:

- En **centinela-ta-api** → pestaña **Environment** → editá `WEB_ORIGIN` con
  la URL real de **centinela-ta-web**.
- En **centinela-ta-web** → pestaña **Environment** → editá
  `NEXT_PUBLIC_API_URL` con la URL real de **centinela-ta-api**.
- Después de cada cambio, tocá **Manual Deploy** → **Deploy latest commit**
  en ese servicio para que tome el cambio (las variables `NEXT_PUBLIC_*` de
  Next.js necesitan un rebuild, no alcanza con solo guardarlas).

## 5. Los datos de ejemplo ya quedan cargados solos

El paso de pre-deploy de `centinela-ta-api` corre el seed automáticamente
después de las migraciones — no hay que hacer nada a mano. Crea el
municipio piloto (Retiro) y los 3 usuarios demo. Es seguro que corra en
cada deploy: no duplica nada si ya existen.

## 6. Probarla

Abrí la URL de **centinela-ta-web** en el navegador del celular. Login demo:

| Email | Contraseña | Rol |
|---|---|---|
| `admin@retiro.cl` | `Cambiar123!` | Administrador Municipal |
| `transparencia@retiro.cl` | `Cambiar123!` | Encargado de Transparencia |
| `control.interno@retiro.cl` | `Cambiar123!` | Auditor de Control Interno |

## Si algo falla

- **El Blueprint no reconoce `type: redis`**: Render renombró el producto a
  "Key Value" — abrí `render.yaml`, cambiá `type: redis` por
  `type: keyvalue` en el servicio `centinela-ta-redis`, commiteá, y volvé a
  intentar el Blueprint.
- **"service type is not available for this plan" en un background
  worker**: ya no debería pasar — el worker quedó embebido en
  `centinela-ta-api` (variable `EMBED_WORKER=true`) desde que Render avisó
  que el plan free no ofrece ese tipo de servicio. Si estás viendo esto es
  porque el Blueprint quedó con una versión vieja de `render.yaml`: borrá el
  Blueprint desde cero y volvé a crearlo apuntando a la rama actual.
- **La migración `auth_tenant_resolver` falla al correr**: no debería — a
  diferencia de la versión original, esta no necesita privilegios de
  superusuario. Si igual falla, pegame el log y lo reviso.
- **Login da error de CORS en la consola del navegador**: `WEB_ORIGIN` en la
  API no coincide con la URL real del sitio — ver paso 4.
- **Cualquier otro error de build**: copiá el log de Render (pestaña
  **Logs** → **Deploy**) y pegámelo, lo arreglo desde acá.
