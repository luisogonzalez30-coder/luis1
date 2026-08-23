#!/usr/bin/env bash
# Arma la carpeta unica "Claude" en el Escritorio, con una subcarpeta por
# proyecto y la misma estructura interna en todas.
#
#   bash scripts/organizar-claude.sh                 # crea la estructura
#   bash scripts/organizar-claude.sh --mover         # ademas mueve carpetas sueltas del Escritorio
#   bash scripts/organizar-claude.sh --destino RUTA  # usa otra ubicacion en vez del Escritorio
#
# Nunca borra ni sobrescribe nada: si un archivo o una carpeta ya existe, la deja tal cual.

set -euo pipefail

MOVER=0
DESTINO=""

while [ $# -gt 0 ]; do
  case "$1" in
    --mover)   MOVER=1; shift ;;
    --destino) DESTINO="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Opcion desconocida: $1"; exit 1 ;;
  esac
done

# --- Donde va todo -----------------------------------------------------------

if [ -n "$DESTINO" ]; then
  ESCRITORIO="$DESTINO"
elif [ -d "$HOME/Escritorio" ]; then
  ESCRITORIO="$HOME/Escritorio"
elif [ -d "$HOME/Desktop" ]; then
  ESCRITORIO="$HOME/Desktop"
else
  ESCRITORIO="$HOME/Escritorio"
fi

BASE="$ESCRITORIO/Claude"

# --- Proyectos: carpeta|titulo|de que se trata --------------------------------

PROYECTOS=(
  "tumuniaqui-reporte-incidencias|TuMuniAqui (reporte de incidencias)|Plataforma de reportes ciudadanos para municipalidades. Repo: luisogonzalez30-coder/luis1"
  "mundogol-2026-album|MundoGol 2026 - album|Diseno del album y la vigilancia del sitio"
  "tienda-shopify-v3|Tienda Shopify v3|Tema, landing y paginas de la tienda"
  "landing-porotos|Landing Porotos|Landing comercial"
  "proyecto-parte3|proyectoPARTE3 (fork)|Fork de trabajo"
  "kpop|kpop|Carpeta historica: de aqui salio el proyecto de incidencias"
  "mercado-publico|Monitor Mercado Publico (LOG-in)|Busqueda de oportunidades en ChileCompra"
  "verificar-api-chatgpt|Verificar conexion API ChatGPT|Pruebas de conexion"
  "acceso-a-mi-pc|Acceso a tu PC|Configuracion de acceso remoto"
  "dominio-log-inspa|Verificacion dominio log-inspa.cl|Tramites y verificacion del dominio"
  "_plantilla-proyecto|Plantilla|Copia esta carpeta para empezar un proyecto nuevo"
)

# Subcarpetas que lleva TODO proyecto, para que siempre sepas donde buscar
SUBCARPETAS=(codigo documentos recursos conversaciones respaldos)

# --- Estructura general -------------------------------------------------------

echo "Carpeta base: $BASE"
echo

mkdir -p "$BASE"/{01-Proyectos,02-Rutinas,03-Documentos,04-Recursos,05-Respaldos/exportaciones-claude,99-Archivo}

for entrada in "${PROYECTOS[@]}"; do
  IFS='|' read -r carpeta titulo descripcion <<< "$entrada"
  destino="$BASE/01-Proyectos/$carpeta"

  for sub in "${SUBCARPETAS[@]}"; do
    mkdir -p "$destino/$sub"
  done

  leeme="$destino/LEEME.md"
  if [ ! -f "$leeme" ]; then
    cat > "$leeme" <<EOF
# $titulo

$descripcion

## Estado

(escribe aqui en que quedaste la ultima vez)

## Enlaces

- Repositorio:
- Sitio en produccion:
- Proyecto en claude.ai:

## Que hay en cada carpeta

- \`codigo/\` — el proyecto en si (aqui va el \`git clone\`)
- \`documentos/\` — propuestas, informes, PDFs, contratos
- \`recursos/\` — imagenes, logos, audios, videos
- \`conversaciones/\` — lo que exportes de Claude: chats, artefactos, resumenes
- \`respaldos/\` — copias con fecha, por si algo se rompe
EOF
    echo "  + $carpeta/LEEME.md"
  fi
done

# --- LEEME general ------------------------------------------------------------

if [ ! -f "$BASE/00-LEEME.md" ]; then
  cat > "$BASE/00-LEEME.md" <<'EOF'
# Claude — carpeta unica

Todo lo de los proyectos vive aqui. Si algo no esta en esta carpeta, no existe.

## Como esta ordenado

- `01-Proyectos/` — una carpeta por proyecto, todas con la misma estructura por dentro
- `02-Rutinas/` — rutinas y monitores automaticos (vigilancia, alertas)
- `03-Documentos/` — papeles que no son de un solo proyecto
- `04-Recursos/` — material reutilizable: logos, plantillas, fotos
- `05-Respaldos/` — copias de seguridad y las exportaciones de claude.ai
- `99-Archivo/` — lo terminado o descartado, que no quieres borrar

## Reglas para no perder nada

1. Un proyecto nuevo = copiar `01-Proyectos/_plantilla-proyecto/` y renombrarla.
2. El codigo siempre en `codigo/`, y siempre con git y subido a GitHub.
3. Lo que hagas con Claude en el navegador, guardalo en `conversaciones/` del proyecto.
4. Antes de cerrar el dia, actualiza el `LEEME.md` del proyecto con donde quedaste.

## Nunca subir a la nube

Estos archivos dan acceso real a las cuentas. Si sincronizas esta carpeta con
Drive / OneDrive / iCloud, excluyelos:

- `.env`, `.env.local`
- `serviceAccountKey.json`
- `backups/` y `respaldos/` con datos de personas
- `node_modules/` (no es secreto, pero pesa y se regenera solo con `npm install`)
EOF
  echo "  + 00-LEEME.md"
fi

# --- Mover carpetas sueltas del Escritorio -------------------------------------

# origen relativo al Escritorio | destino relativo a la base
MUDANZAS=(
  "kpop/reporte-incidencias|01-Proyectos/tumuniaqui-reporte-incidencias/codigo"
  "luis1|01-Proyectos/tumuniaqui-reporte-incidencias/codigo"
  "kpop|01-Proyectos/kpop/codigo"
  "mundogol|01-Proyectos/mundogol-2026-album/codigo"
  "shopify|01-Proyectos/tienda-shopify-v3/codigo"
  "porotos|01-Proyectos/landing-porotos/codigo"
)

echo
echo "Carpetas sueltas en el Escritorio:"
encontradas=0

for entrada in "${MUDANZAS[@]}"; do
  IFS='|' read -r origen destino <<< "$entrada"
  ruta_origen="$ESCRITORIO/$origen"
  ruta_destino="$BASE/$destino"

  [ -d "$ruta_origen" ] || continue
  case "$ruta_origen" in "$BASE"/*) continue ;; esac   # ya esta dentro
  encontradas=1

  # Solo si el destino esta vacio: no se pisa nada de lo que ya guardaste
  if [ -n "$(ls -A "$ruta_destino" 2>/dev/null || true)" ]; then
    echo "  - $origen  ->  ocupado, lo dejo donde esta"
    continue
  fi

  if [ "$MOVER" -eq 1 ]; then
    mv "$ruta_origen"/* "$ruta_origen"/.[!.]* "$ruta_destino"/ 2>/dev/null || true
    rmdir "$ruta_origen" 2>/dev/null || true
    echo "  - $origen  ->  movida a $destino"
  else
    echo "  - $origen  ->  se moveria a $destino"
  fi
done

[ "$encontradas" -eq 0 ] && echo "  (ninguna de las conocidas)"

echo
if [ "$MOVER" -eq 1 ]; then
  echo "Listo. Revisa $BASE"
else
  echo "Estructura creada. Nada se movio todavia."
  echo "Para mover de verdad: bash scripts/organizar-claude.sh --mover"
fi
