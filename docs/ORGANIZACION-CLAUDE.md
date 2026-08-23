# Una sola carpeta para todo

Guía para dejar todos los proyectos en una carpeta única en el Escritorio, y para
que lo que está en la nube, en el navegador y en el computador termine siempre en
esas mismas carpetas.

---

## 1. La estructura

```
Escritorio/Claude/
├── 00-LEEME.md                  ← el mapa: qué hay y dónde
├── 01-Proyectos/
│   ├── tumuniaqui-reporte-incidencias/
│   │   ├── LEEME.md             ← qué es, enlaces y en qué quedaste
│   │   ├── codigo/              ← el proyecto (aquí va el git clone)
│   │   ├── documentos/          ← propuestas, informes, PDFs
│   │   ├── recursos/            ← imágenes, logos, audios
│   │   ├── conversaciones/      ← lo que exportes de Claude
│   │   └── respaldos/           ← copias con fecha
│   ├── mundogol-2026-album/     ← todas con las mismas 5 subcarpetas
│   ├── tienda-shopify-v3/
│   ├── landing-porotos/
│   ├── proyecto-parte3/
│   ├── kpop/
│   ├── mercado-publico/
│   ├── verificar-api-chatgpt/
│   ├── acceso-a-mi-pc/
│   ├── dominio-log-inspa/
│   └── _plantilla-proyecto/     ← cópiala para un proyecto nuevo
├── 02-Rutinas/                  ← vigilancia mundogol, monitor mercado público
├── 03-Documentos/               ← papeles que no son de un solo proyecto
├── 04-Recursos/                 ← logos y plantillas que se reutilizan
├── 05-Respaldos/
│   └── exportaciones-claude/    ← el .zip que te manda claude.ai
└── 99-Archivo/                  ← terminado o descartado, pero no borrado
```

Lo importante no es la lista de proyectos, es que **las cinco subcarpetas son
siempre las mismas**. Da igual el proyecto: los PDFs están en `documentos/`, el
código en `codigo/`, y en el `LEEME.md` dice en qué quedaste.

---

## 2. Crearla

En macOS o Linux:

```bash
bash scripts/organizar-claude.sh
```

En Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\organizar-claude.ps1
```

Eso crea la estructura y **te muestra** qué carpetas sueltas del Escritorio se
podrían mover, sin tocar nada. Cuando estés de acuerdo con la lista, repite el
comando agregando `--mover` (o `-Mover` en Windows) y ahí sí se mueven.

El script no borra ni sobrescribe: si una carpeta de destino ya tiene algo
adentro, la deja como está y te lo avisa.

Los proyectos que no aparecen en la lista los mueves a mano a
`01-Proyectos/<nombre>/codigo/`.

---

## 3. Traer lo que está en cada lugar

### Lo que está en tu computador

Ya lo hace el script (paso 2). Lo que quede suelto, arrástralo a la subcarpeta
que corresponda del proyecto.

### Lo que está en el navegador (claude.ai)

Los chats y los proyectos de claude.ai **viven en la cuenta, no en tu disco**.
Para tener una copia local:

1. En claude.ai, entra a Ajustes → Privacidad → **Exportar datos** (el nombre
   exacto puede cambiar con el tiempo). Llega un `.zip` por correo.
2. Descomprímelo en `05-Respaldos/exportaciones-claude/AAAA-MM-DD/`, con la
   fecha en el nombre.
3. Si algo del export pertenece a un proyecto concreto, copia esa parte a
   `01-Proyectos/<proyecto>/conversaciones/`.

Hazlo una vez al mes. Es la única forma de que una conversación importante no
dependa de que la cuenta siga ahí.

### Los artefactos

Están en `claude.ai/code/artifacts` (y en la terminal, con `/artifacts`). No se
descargan solos: entra a cada uno, guárdalo y déjalo en `conversaciones/` o en
`documentos/` del proyecto al que pertenece. Los que valen la pena guardar son
los informes y las propuestas, no los borradores.

### Lo que está en la nube (sesiones de Claude Code en la web)

Aquí hay una trampa que conviene tener clara: **cada sesión en la web corre en un
contenedor temporal que se borra al terminar.** Lo único que sobrevive es lo que
se subió a GitHub. Por eso:

- El código vive en GitHub, y la copia del Escritorio se trae con
  `git clone <repo>` dentro de `codigo/`.
- Después de cada sesión en la web, en tu computador: `git pull`.
- Nada de "lo dejo en la sesión y mañana sigo".

Este proyecto, por ejemplo, se trae así:

```bash
cd ~/Escritorio/Claude/01-Proyectos/tumuniaqui-reporte-incidencias/codigo
git clone https://github.com/luisogonzalez30-coder/luis1.git .
```

### Las rutinas (Vigilancia mundogol, Monitor Mercado Público)

No son archivos, son tareas programadas que corren en la nube. Lo que sí guardas
es la explicación: crea `02-Rutinas/<nombre>/LEEME.md` con qué hace, cada cuánto
corre y a dónde avisa. Así, si un día deja de funcionar, sabes qué era.

---

## 4. Que no se pierda ni se filtre

Si quieres respaldo automático, mete `Escritorio/Claude/` dentro de Google Drive,
OneDrive o iCloud. **Pero excluye esto antes**, o subes credenciales reales a la
nube:

| No subir | Por qué |
|---|---|
| `.env`, `.env.local` | Claves de Firebase y Cloudinary de la cuenta real |
| `serviceAccountKey.json` | Acceso total a la base de datos, sin restricciones |
| `backups/`, `respaldos/` con datos reales | Datos personales de vecinos |
| `node_modules/` | No es secreto, pero pesa muchísimo y se regenera con `npm install` |

En Drive y OneDrive se excluye marcando la carpeta como "no sincronizar". Si tu
cliente de sincronización no permite excluir carpetas sueltas, entonces no metas
`codigo/` en la nube: para el código ya tienes GitHub, que es mejor respaldo.

---

## 5. Rutina para que siga ordenado

Cada vez que termines de trabajar en algo:

1. `git push` del código.
2. Actualiza el `LEEME.md` del proyecto con en qué quedaste.
3. Lo que hayas producido (PDF, imagen, informe), déjalo en la subcarpeta que le
   toca — no en el Escritorio.

Una vez al mes:

4. Exporta los datos de claude.ai a `05-Respaldos/exportaciones-claude/`.
5. Lo que ya no está vivo, muévelo a `99-Archivo/`.
