# CondominioAquí — crear el proyecto y publicarlo

Este producto **todavía no tiene proyecto de Firebase**. Sin él no hay base de
datos, no hay login y no hay sitio: la app compila pero no puede hacer nada.

Los pasos 1 a 5 se hacen **una sola vez** y son clics en el navegador — no se
pueden hacer desde una sesión de Claude, porque requieren tu cuenta de Google.
Del paso 6 en adelante todo es automático: al abrir un PR sale una vista previa,
y al fusionar a `main` se publica el sitio real.

> ⚠️ **Tiene que ser un proyecto NUEVO, distinto del de TuMuniAquí.**
> Las reglas de Firestore se despliegan **completas**, no como parche: publicar
> las de acá sobre el proyecto del municipio **borraría las suyas** y dejaría los
> datos de Licantén sin protección. No es un riesgo teórico, es lo que hace
> `firebase deploy --only firestore:rules`.

---

## 1. Crear el proyecto

1. Entra a <https://console.firebase.google.com> y toca **Agregar proyecto**.
2. Nombre: **CondominioAquí**.
3. Firebase propone un ID abajo del nombre. Intenta dejarlo en **`condominioaqui`**.
   - Si está tomado, Firebase le pega un sufijo (`condominioaqui-a1b2c`). **Anótalo
     tal cual**: es el que hay que usar en el paso 6.
4. Google Analytics: **no hace falta**. Puedes desactivarlo.

## 2. Encender las tres piezas

Dentro del proyecto recién creado:

| Pieza | Dónde | Qué elegir |
|---|---|---|
| **Firestore Database** | Compilación → Firestore Database → Crear base de datos | Modo **producción**. Ubicación: `southamerica-east1` (São Paulo) — es la más cercana a Chile |
| **Authentication** | Compilación → Authentication → Comenzar | Habilitar **Correo electrónico/contraseña**. Nada más: los residentes no tienen cuenta |
| **Hosting** | Compilación → Hosting → Comenzar | Solo llegar a la pantalla; el resto lo hace el workflow |

El **plan Spark (gratis) alcanza**. No hace falta tarjeta: las fotos van a
Cloudinary, no a Firebase Storage, justamente por eso.

## 3. Copiar la configuración web

1. Engranaje (⚙️) → **Configuración del proyecto**.
2. Abajo, en "Tus apps", toca el ícono **`</>`** (web).
3. Apodo: `CondominioAquí web`. **No** marques Hosting acá.
4. Firebase muestra un bloque `firebaseConfig` con seis valores. Son los que van
   al `.env` y a los secretos de GitHub:

```
apiKey             → VITE_FIREBASE_API_KEY
authDomain         → VITE_FIREBASE_AUTH_DOMAIN
projectId          → VITE_FIREBASE_PROJECT_ID
storageBucket      → VITE_FIREBASE_STORAGE_BUCKET
messagingSenderId  → VITE_FIREBASE_MESSAGING_SENDER_ID
appId              → VITE_FIREBASE_APP_ID
```

> Estos valores **no son secretos**: viajan en el JavaScript que recibe cualquier
> visitante. Lo que protege los datos son las reglas de Firestore, no esconder
> estas claves. Van como secretos de GitHub solo para no tener que subir el
> `.env` al repositorio.

Copia `.env.ejemplo` como `.env` y pégalos ahí para trabajar en tu PC.

## 4. La cuenta que publica (clave de servicio)

1. Engranaje (⚙️) → Configuración del proyecto → pestaña **Cuentas de servicio**.
2. Botón **Generar nueva clave privada** → se descarga un `.json`.
3. Ese archivo **no se sube al repositorio nunca**. Guárdalo aparte.

El mismo archivo sirve para dos cosas: como secreto de GitHub (paso 5) y, si lo
dejas en esta carpeta con el nombre `serviceAccountKey.json`, para sembrar el
condominio de demostración con `npm run demo -- --aplicar`.

## 5. Los secretos en GitHub

En el repositorio: **Settings → Secrets and variables → Actions → New repository secret**.

| Secreto | Valor |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_CONDOMINIOAQUI` | El **contenido completo** del `.json` del paso 4 |
| `VITE_FIREBASE_API_KEY_CONDOMINIO` | Del paso 3 |
| `VITE_FIREBASE_AUTH_DOMAIN_CONDOMINIO` | Del paso 3 |
| `VITE_FIREBASE_PROJECT_ID_CONDOMINIO` | Del paso 3 |
| `VITE_FIREBASE_STORAGE_BUCKET_CONDOMINIO` | Del paso 3 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID_CONDOMINIO` | Del paso 3 |
| `VITE_FIREBASE_APP_ID_CONDOMINIO` | Del paso 3 |
| `VITE_CLOUDINARY_CLOUD_NAME_CONDOMINIO` | El mismo de siempre, o uno nuevo |
| `VITE_CLOUDINARY_UPLOAD_PRESET_CONDOMINIO` | Ídem |

> Los nombres llevan `_CONDOMINIO` al final a propósito: los de TuMuniAquí ya
> existen sin sufijo, y si se llamaran igual el workflow de un producto
> compilaría con la configuración del otro. Ese error publica una app que
> escribe en la base de datos equivocada, y no se nota hasta que es tarde.

## 6. Si el ID del proyecto NO quedó en `condominioaqui`

Solo si en el paso 1 Firebase le puso un sufijo. Dos archivos, un valor cada uno:

- **`.firebaserc`** (en esta carpeta): cambia `"default": "condominioaqui"`.
- **GitHub**: Settings → Secrets and variables → Actions → pestaña **Variables** →
  New repository variable → nombre `FIREBASE_PROJECT_ID_CONDOMINIO`, valor el ID
  real. El workflow la prefiere por sobre el valor por defecto, así que con eso
  basta y no hay que tocar el `.yml`.

## 7. Publicar las reglas de Firestore

Sin esto, la app no puede escribir nada: Firestore rechaza todo por defecto.

Desde esta carpeta, en tu PC:

```bash
npx firebase login          # una sola vez
npm run desplegar:reglas
```

Comprueba antes que estás apuntando al proyecto correcto:

```bash
npx firebase use
```

Tiene que responder el ID de **CondominioAquí**, no el del municipio.

## 8. Sembrar el condominio de demostración

```bash
npm run demo                 # simula, no escribe nada — revisa la salida
npm run demo -- --aplicar    # escribe de verdad
```

Deja el condominio `demo` con 3 torres, 144 unidades, 14 espacios comunes, 18
solicitudes y el calendario de mantenciones a medio cumplir. Abre en 31% de
cumplimiento con 3 obligaciones vencidas, a propósito.

## 9. Crear el usuario administrador

El script no crea cuentas de acceso. A mano, una sola vez:

1. **Authentication → Users → Agregar usuario**: correo y contraseña. Copia el
   **UID** que queda a la derecha.
2. **Firestore → Iniciar colección** → `usuarios_condominio` → ID del documento:
   ese **UID**. Campos:

```
email        (string)  el mismo correo
nombre       (string)  el nombre de la persona
rol          (string)  ADMINISTRADOR
condominio_id (string) demo
area         (string)  Administración
```

Desde el panel de ese administrador se pueden crear los demás usuarios (Comité y
Conserjería) sin volver a la consola. Crear **otro** `ADMINISTRADOR` sí es
manual, a propósito: las reglas no permiten que un administrador se clone.

## 10. De ahí en adelante, automático

`.github/workflows/desplegar-condominioaqui.yml` se encarga:

| Cuándo | Qué hace |
|---|---|
| Abres o actualizas un PR que toca `condominioaqui/**` | Publica una vista previa en una URL temporal y la deja como comentario en el PR. Se borra sola a los 7 días |
| Fusionas a `main` | Publica el sitio real en `https://<id-del-proyecto>.web.app` |

El workflow **solo corre cuando cambian archivos de esta carpeta**. Un cambio en
TuMuniAquí no republica CondominioAquí, y al revés tampoco.

Si falta algún secreto, el workflow **falla nombrando cuál** en vez de publicar
un sitio que compila pero no arranca. Ese error —build verde, app muerta con
`auth/invalid-api-key`— ya costó una tarde en el otro producto; por eso se
comprueba antes de compilar.
