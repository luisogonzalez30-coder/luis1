# Cómo publicar los cambios en el sitio

Guía para **tu PC con Windows**, donde están tus credenciales de Firebase.

> **Por qué esto no es automático.** El código vive en GitHub, pero el sitio lo
> sirve Firebase Hosting desde la carpeta `dist/`. Nada conecta las dos cosas
> todavía: subir a GitHub **no** actualiza el sitio. Alguien tiene que publicar
> desde un equipo con sesión de Firebase iniciada — y tus llaves (`.env`,
> `serviceAccountKey.json`) están fuera del repositorio a propósito, para que no
> queden publicadas. Por eso este paso solo se puede hacer desde tu PC.

---

## Una sola vez: traer los cambios nuevos

Abre PowerShell y ve a la carpeta del proyecto:

```powershell
cd C:\Users\Administrador\Desktop\kpop\reporte-incidencias
```

**1. Confirma que la carpeta está conectada al repositorio.**

```powershell
git remote -v
```

- Si responde algo con `luisogonzalez30-coder/luis1`, sigue al paso 2.
- Si **no responde nada**, la carpeta no está conectada todavía:

  ```powershell
  git init
  git remote add origin https://github.com/luisogonzalez30-coder/luis1.git
  ```

- Si responde **otra** dirección, conéctala a la correcta:

  ```powershell
  git remote set-url origin https://github.com/luisogonzalez30-coder/luis1.git
  ```

**2. Guarda cualquier cambio tuyo sin subir**, para no perderlo:

```powershell
git status
```

Si aparecen archivos modificados que quieres conservar:

```powershell
git stash
```

**3. Trae la rama con los cambios nuevos:**

```powershell
git fetch origin
git checkout claude/retomar-aqui-md-9f2ccr
git pull origin claude/retomar-aqui-md-9f2ccr
```

**4. Verifica que llegaron.** Estos archivos tienen que existir:

```powershell
dir docs\PROPUESTA-COMERCIAL.md
dir src\components\dashboard\CapaMapaCalor.jsx
dir src\components\ciudadano\BarraNavegacion.jsx
```

Si los tres aparecen, ya tienes todo el código nuevo.

---

## Antes de publicar: míralo en tu PC

```powershell
npm install
npm run dev
```

Abre `http://localhost:5173/licanten`. Ahí ves la barra inferior nueva con el
botón Reportar, y en `http://localhost:5173/dashboard/general` (con tu login) el
panel rediseñado, el mapa de calor y el botón de reporte en PDF.

**`npm install` no es opcional esta vez**: hay tres dependencias nuevas
(`browser-image-compression`, `leaflet.heat`, `jspdf`). Sin eso el build falla.

Para cortar el servidor: `Ctrl + C`.

---

## Publicar

```powershell
npm run desplegar
```

Ese comando hace las tres cosas seguidas: instalar, compilar y publicar.

Si te pide iniciar sesión:

```powershell
npx firebase login
```

Cuando termine imprime `Hosting URL: https://app-incidencias-urbanas.web.app`.
**Recién ahí cambia el sitio.**

### Comprobar que llegó de verdad

Firebase cachea `index.html` por una hora, así que un refresco normal puede
seguir mostrando lo viejo. Para descartarlo, abre la URL con algo pegado al
final:

```
https://app-incidencias-urbanas.web.app/licanten?v=123
```

Páginas que solo existen después de publicar:

- `https://app-incidencias-urbanas.web.app/licanten/privacidad`
- `https://app-incidencias-urbanas.web.app/licanten/terminos`
- `https://app-incidencias-urbanas.web.app/licanten/estado`

Si esas tres cargan, el despliegue funcionó.

---

## Si algo sale mal

| Síntoma | Qué pasa | Solución |
|---|---|---|
| `vite: not found` o `Cannot find module` | Faltan las dependencias nuevas | `npm install` |
| `Failed to get Firebase project` | Sin sesión | `npx firebase login` |
| `error: Your local changes would be overwritten` | Tienes cambios propios sin guardar | `git stash`, luego repite el `checkout` |
| El sitio sigue igual tras publicar | Caché del navegador | Agrega `?v=123` a la URL |
| `npm run build` falla con error de Tailwind | Caché vieja de node_modules | Borra `node_modules` y repite `npm install` |

---

## Reglas de Firestore

Los cambios de esta tanda **no tocaron** `firestore.rules` ni los índices, así
que no hace falta desplegarlas. Si alguna vez sí las cambias:

```powershell
npm run desplegar:reglas
```

Y siempre **los índices antes que el hosting** (ver §26): si se despliega al
revés, la app queda rota para los vecinos mientras los índices se construyen.

---

# Despliegue automático (configúralo una vez, sin terminal)

Esto es lo que hace que **nunca más tengas que escribir un comando** para
publicar. Se configura una sola vez, todo desde el navegador, y desde ahí:

- **Al abrir un Pull Request** → publica una **vista previa** en una URL temporal
  y la deja como comentario en el propio PR. Miras los cambios antes de que los
  vea ningún vecino.
- **Al apretar "Merge"** → publica en el sitio real, solo.

El repositorio ya trae el flujo de trabajo escrito
(`.github/workflows/desplegar.yml`). Falta darle permiso a GitHub para publicar,
y eso solo puedes hacerlo tú porque requiere tu cuenta de Google.

**No necesitas PowerShell ni la consola para nada de lo que sigue.**

---

## Paso 1 — Crear el permiso (navegador)

1. Abre <https://console.cloud.google.com/iam-admin/serviceaccounts?project=app-incidencias-urbanas>
   e inicia sesión con la **misma cuenta de Google** con la que creaste Firebase.
2. Arriba, botón **"+ CREAR CUENTA DE SERVICIO"**.
3. **Nombre**: escribe `github-desplegador` → botón **CREAR Y CONTINUAR**.
4. Aparece **"Otorgar a esta cuenta de servicio acceso al proyecto"**. Ahí, en el
   desplegable **Rol**, busca y agrega estos dos, uno por uno con
   **"+ AGREGAR OTRO ROL"**:
   - `Firebase Hosting Admin`
   - `Cloud Run Viewer`

   Solo esos dos. Botón **CONTINUAR** → **LISTO**.

   > **Importante**: no reutilices aquí el archivo `serviceAccountKey.json` que
   > usas para los respaldos. Ese tiene acceso total a la base de datos y se
   > salta todas las reglas de seguridad — y ahora hay un municipio real con
   > datos de vecinos adentro. Esta cuenta nueva solo puede publicar el sitio.

5. En la lista, haz clic sobre `github-desplegador` que acabas de crear.
6. Pestaña **CLAVES** → **AGREGAR CLAVE** → **Crear clave nueva** → elige
   **JSON** → **CREAR**.
7. Se descarga un archivo `.json` a tu carpeta de Descargas.
8. Ábrelo con el **Bloc de notas** (clic derecho → Abrir con → Bloc de notas) y
   selecciona todo el contenido (`Ctrl+E`, o `Ctrl+A`) y cópialo (`Ctrl+C`).
   Es desde la primera `{` hasta la última `}`.

## Paso 2 — Pegarlo en GitHub (navegador)

1. Abre <https://github.com/luisogonzalez30-coder/luis1/settings/secrets/actions>
2. Botón verde **"New repository secret"**.
3. **Name**: `FIREBASE_SERVICE_ACCOUNT`
   **Secret**: pega (`Ctrl+V`) lo que copiaste del `.json`.
4. **Add secret**.

## Paso 3 — Los seis valores de configuración

Estos se incrustan cuando se compila el sitio. Están en tu archivo `.env`.

**Para abrirlo sin terminal**: entra a la carpeta
`C:\Users\Administrador\Escritorio\kpop\reporte-incidencias`, busca el
archivo llamado **`.env`** (así, empezando con punto), clic derecho → **Abrir
con** → **Bloc de notas**.

> Si no ves el archivo: en el Explorador, pestaña **Vista** → marca
> **"Elementos ocultos"**.

Adentro vas a ver líneas como `VITE_FIREBASE_API_KEY=AIza...`. De cada una copia
**solo lo que va después del signo `=`**, sin comillas ni espacios.

Vuelve a <https://github.com/luisogonzalez30-coder/luis1/settings/secrets/actions>
y crea uno por uno, con **New repository secret**:

| Name | Secret |
|---|---|
| `VITE_FIREBASE_API_KEY` | del `.env` |
| `VITE_FIREBASE_AUTH_DOMAIN` | del `.env` |
| `VITE_FIREBASE_PROJECT_ID` | `app-incidencias-urbanas` |
| `VITE_FIREBASE_STORAGE_BUCKET` | del `.env` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | del `.env` |
| `VITE_FIREBASE_APP_ID` | del `.env` |
| `VITE_CLOUDINARY_CLOUD_NAME` | `ugiblcuk` |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | `reporte_incidencias` |

Dos ya están escritos acá y uno lo sabemos, así que son **cinco** que copiar.

> Esta configuración de Firebase **no es secreta**: viaja dentro del JavaScript
> que recibe cualquier visitante del sitio, y lo que protege tus datos son las
> reglas de Firestore. Van como secretos solo para no subir el `.env` al
> repositorio.

## Paso 4 — Publicar, sin escribir un comando

Entra al Pull Request: <https://github.com/luisogonzalez30-coder/luis1/pull/1>

- En un par de minutos aparece un comentario automático con una **URL de vista
  previa**. Ábrela y revisa que todo esté bien.
- Cuando estés conforme, aprieta el botón verde **"Merge pull request"**.
- El sitio real se actualiza solo en unos minutos.

Y de ahí en adelante, cada cambio funciona igual: se abre un PR, miras la vista
previa, aprietas Merge.

## Si algo sale mal

Entra a <https://github.com/luisogonzalez30-coder/luis1/actions> y abre la
ejecución marcada en rojo. El nombre del paso que falló dice qué pasó:

| Paso que falla | Qué revisar |
|---|---|
| `Compilar` | Falta algún secreto `VITE_*`, o quedó con espacios/comillas de más |
| `Comprobar que el build no salió vacío` | Algún secreto `VITE_*` quedó vacío |
| `Publicar…` con error de permisos | Faltó un rol en el paso 1, o el JSON se pegó incompleto |
| `Instalar dependencias` | Avísame y lo reviso |

## Alternativa con terminal, si prefieres

Un comando hace los pasos 1 y 2 solo:

```powershell
npx firebase init hosting:github
```

Crea la cuenta de servicio y guarda el secreto en GitHub por ti (con el nombre
`FIREBASE_SERVICE_ACCOUNT_APP_INCIDENCIAS_URBANAS`, que el flujo de trabajo
también acepta). Cuando pregunte si quiere crear sus propios archivos de flujo,
responde que **no**. Igual quedan pendientes los secretos del paso 3.

**Cómo abrir PowerShell en la carpeta correcta**: entra a
`C:\Users\Administrador\Escritorio\kpop\reporte-incidencias` en el
Explorador, haz clic en la **barra de direcciones** de arriba (donde dice la
ruta), borra lo que hay, escribe `powershell` y presiona **Enter**. Se abre ya
parado en esa carpeta.

## Qué NO despliega esto

Solo el sitio. **Las reglas e índices de Firestore siguen siendo manuales**, a
propósito: una regla mal desplegada puede dejar la app inaccesible o abrir datos
de los vecinos, y eso no debería pasar sin que alguien lo mire.
