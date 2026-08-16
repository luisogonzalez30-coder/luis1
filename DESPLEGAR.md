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

# Despliegue automático (configúralo una vez)

Todo lo de arriba deja de ser necesario cuando esto esté andando. El repositorio
ya trae el flujo de trabajo listo en `.github/workflows/desplegar.yml`:

- **Al abrir un Pull Request** → publica una **vista previa** en una URL temporal
  y la deja como comentario en el propio PR. Puedes mirar los cambios antes de
  que los vea ningún vecino. Se borra sola a los 7 días.
- **Al aprobar y hacer merge a `main`** → publica en el sitio real.

Falta un paso que **solo puedes hacer tú**, porque requiere tu sesión de Google:
darle permiso a GitHub para publicar.

## Paso 1 — Crear la credencial

Es una cuenta de servicio: un "usuario robot" que solo puede publicar el sitio.

1. Entra a <https://console.cloud.google.com/iam-admin/serviceaccounts?project=app-incidencias-urbanas>
   (con la misma cuenta de Google del proyecto).
2. **Crear cuenta de servicio**.
   - Nombre: `github-desplegador`
   - Continuar.
3. En **Roles**, agrega estos dos y nada más:
   - `Firebase Hosting Admin`
   - `Cloud Run Viewer`

   > Solo esos dos, a propósito. Esta credencial va a vivir en GitHub, así que
   > tiene que poder publicar el sitio y nada más. **No uses aquí el
   > `serviceAccountKey.json` que usas para los respaldos**: ese tiene acceso
   > total a la base de datos y se salta todas las reglas de seguridad.
4. Listo → entra a la cuenta recién creada → pestaña **Claves** → **Agregar
   clave** → **Crear clave nueva** → **JSON** → Crear.
5. Se descarga un archivo `.json`. Ábrelo con el Bloc de notas y **copia todo el
   contenido**, desde la primera `{` hasta la última `}`.

## Paso 2 — Guardar los secretos en GitHub

Entra a <https://github.com/luisogonzalez30-coder/luis1/settings/secrets/actions>
y crea cada uno con **New repository secret**:

| Nombre del secreto | Qué pegar |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Todo el contenido del `.json` del paso 1 |
| `VITE_FIREBASE_API_KEY` | El valor de tu archivo `.env` local |
| `VITE_FIREBASE_AUTH_DOMAIN` | idem |
| `VITE_FIREBASE_PROJECT_ID` | idem |
| `VITE_FIREBASE_STORAGE_BUCKET` | idem |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | idem |
| `VITE_FIREBASE_APP_ID` | idem |
| `VITE_CLOUDINARY_CLOUD_NAME` | idem (`ugiblcuk`) |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | idem (`reporte_incidencias`) |

Los valores están en tu `.env`, en la carpeta del proyecto. Ábrelo con el Bloc
de notas y copia cada uno **sin comillas y sin espacios al final**.

> Sobre los `VITE_*`: esa configuración web de Firebase **no es secreta** —viaja
> dentro del JavaScript que recibe cualquier visitante del sitio, y lo que
> protege tus datos son las reglas de Firestore, no ocultar estas claves. Van
> como secretos igual para no tener que subir el `.env` al repositorio.
>
> El que **sí es sensible de verdad** es `FIREBASE_SERVICE_ACCOUNT`. GitHub lo
> guarda cifrado y nunca lo muestra de vuelta, ni siquiera a ti.

## Paso 3 — Probarlo

En el Pull Request que ya está abierto, haz cualquier cambio mínimo (o cierra y
vuelve a abrir el PR). En un par de minutos:

1. Aparece una marca de verificación en el PR.
2. Un comentario automático con una URL tipo
   `https://app-incidencias-urbanas--pr1-xxxx.web.app`.
3. Abres esa URL y ves los cambios funcionando, sin haber tocado nada del sitio
   real.

Cuando estés conforme, aprietas **Merge** y el sitio real se actualiza solo.

## Si algo falla

Entra a <https://github.com/luisogonzalez30-coder/luis1/actions>, abre la
ejecución en rojo y mira en qué paso se cortó:

| Paso donde falla | Causa habitual |
|---|---|
| `Instalar dependencias` | `package-lock.json` desactualizado → corre `npm install` en tu PC y sube el cambio |
| `Compilar` | Falta algún secreto `VITE_*` o quedó con espacios |
| `Comprobar que el build no salió vacío` | Un secreto `VITE_*` quedó vacío |
| `Publicar…` con error de permisos | Faltó un rol en la cuenta de servicio, o se pegó mal el JSON |

## Qué NO despliega esto

Solo el sitio (`hosting`). **Las reglas e índices de Firestore siguen siendo
manuales**, a propósito: una regla mal desplegada puede dejar la app inaccesible
o abrir datos de los vecinos, y eso no debería pasar sin que alguien lo mire.
Cuando cambien, desde tu PC:

```powershell
npm run desplegar:reglas
```
