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
