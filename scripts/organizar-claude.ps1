# Arma la carpeta unica "Claude" en el Escritorio, con una subcarpeta por
# proyecto y la misma estructura interna en todas. Version para Windows.
#
#   powershell -ExecutionPolicy Bypass -File scripts\organizar-claude.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\organizar-claude.ps1 -Mover
#   powershell -ExecutionPolicy Bypass -File scripts\organizar-claude.ps1 -Destino "D:\Trabajo"
#
# Nunca borra ni sobrescribe nada: si un archivo o una carpeta ya existe, la deja tal cual.

param(
    [switch]$Mover,
    [string]$Destino = ""
)

$ErrorActionPreference = "Stop"

# --- Donde va todo -----------------------------------------------------------

if ($Destino -ne "") {
    $Escritorio = $Destino
} else {
    $Escritorio = [Environment]::GetFolderPath("Desktop")
}

$Base = Join-Path $Escritorio "Claude"

# --- Proyectos ---------------------------------------------------------------

$Proyectos = @(
    @{ carpeta = "tumuniaqui-reporte-incidencias"; titulo = "TuMuniAqui (reporte de incidencias)"; descripcion = "Plataforma de reportes ciudadanos para municipalidades. Repo: luisogonzalez30-coder/luis1" },
    @{ carpeta = "mundogol-2026-album";            titulo = "MundoGol 2026 - album";               descripcion = "Diseno del album y la vigilancia del sitio" },
    @{ carpeta = "tienda-shopify-v3";              titulo = "Tienda Shopify v3";                   descripcion = "Tema, landing y paginas de la tienda" },
    @{ carpeta = "landing-porotos";                titulo = "Landing Porotos";                     descripcion = "Landing comercial" },
    @{ carpeta = "proyecto-parte3";                titulo = "proyectoPARTE3 (fork)";               descripcion = "Fork de trabajo" },
    @{ carpeta = "kpop";                           titulo = "kpop";                                descripcion = "Carpeta historica: de aqui salio el proyecto de incidencias" },
    @{ carpeta = "mercado-publico";                titulo = "Monitor Mercado Publico (LOG-in)";    descripcion = "Busqueda de oportunidades en ChileCompra" },
    @{ carpeta = "verificar-api-chatgpt";          titulo = "Verificar conexion API ChatGPT";      descripcion = "Pruebas de conexion" },
    @{ carpeta = "acceso-a-mi-pc";                 titulo = "Acceso a tu PC";                      descripcion = "Configuracion de acceso remoto" },
    @{ carpeta = "dominio-log-inspa";              titulo = "Verificacion dominio log-inspa.cl";   descripcion = "Tramites y verificacion del dominio" },
    @{ carpeta = "_plantilla-proyecto";            titulo = "Plantilla";                           descripcion = "Copia esta carpeta para empezar un proyecto nuevo" }
)

# Subcarpetas que lleva TODO proyecto, para que siempre sepas donde buscar
$Subcarpetas = @("codigo", "documentos", "recursos", "conversaciones", "respaldos")

# --- Estructura general ------------------------------------------------------

Write-Host "Carpeta base: $Base"
Write-Host ""

foreach ($d in @("01-Proyectos", "02-Rutinas", "03-Documentos", "04-Recursos", "05-Respaldos\exportaciones-claude", "99-Archivo")) {
    New-Item -ItemType Directory -Force -Path (Join-Path $Base $d) | Out-Null
}

foreach ($p in $Proyectos) {
    $destinoProyecto = Join-Path $Base "01-Proyectos\$($p.carpeta)"

    foreach ($sub in $Subcarpetas) {
        New-Item -ItemType Directory -Force -Path (Join-Path $destinoProyecto $sub) | Out-Null
    }

    $leeme = Join-Path $destinoProyecto "LEEME.md"
    if (-not (Test-Path $leeme)) {
        @"
# $($p.titulo)

$($p.descripcion)

## Estado

(escribe aqui en que quedaste la ultima vez)

## Enlaces

- Repositorio:
- Sitio en produccion:
- Proyecto en claude.ai:

## Que hay en cada carpeta

- ``codigo/`` — el proyecto en si (aqui va el ``git clone``)
- ``documentos/`` — propuestas, informes, PDFs, contratos
- ``recursos/`` — imagenes, logos, audios, videos
- ``conversaciones/`` — lo que exportes de Claude: chats, artefactos, resumenes
- ``respaldos/`` — copias con fecha, por si algo se rompe
"@ | Set-Content -Path $leeme -Encoding UTF8
        Write-Host "  + $($p.carpeta)\LEEME.md"
    }
}

# --- LEEME general -----------------------------------------------------------

$leemeBase = Join-Path $Base "00-LEEME.md"
if (-not (Test-Path $leemeBase)) {
    @"
# Claude — carpeta unica

Todo lo de los proyectos vive aqui. Si algo no esta en esta carpeta, no existe.

## Como esta ordenado

- ``01-Proyectos/`` — una carpeta por proyecto, todas con la misma estructura por dentro
- ``02-Rutinas/`` — rutinas y monitores automaticos (vigilancia, alertas)
- ``03-Documentos/`` — papeles que no son de un solo proyecto
- ``04-Recursos/`` — material reutilizable: logos, plantillas, fotos
- ``05-Respaldos/`` — copias de seguridad y las exportaciones de claude.ai
- ``99-Archivo/`` — lo terminado o descartado, que no quieres borrar

## Reglas para no perder nada

1. Un proyecto nuevo = copiar ``01-Proyectos/_plantilla-proyecto/`` y renombrarla.
2. El codigo siempre en ``codigo/``, y siempre con git y subido a GitHub.
3. Lo que hagas con Claude en el navegador, guardalo en ``conversaciones/`` del proyecto.
4. Antes de cerrar el dia, actualiza el ``LEEME.md`` del proyecto con donde quedaste.

## Nunca subir a la nube

Estos archivos dan acceso real a las cuentas. Si sincronizas esta carpeta con
Drive / OneDrive / iCloud, excluyelos:

- ``.env``, ``.env.local``
- ``serviceAccountKey.json``
- ``backups/`` y ``respaldos/`` con datos de personas
- ``node_modules/`` (no es secreto, pero pesa y se regenera solo con ``npm install``)
"@ | Set-Content -Path $leemeBase -Encoding UTF8
    Write-Host "  + 00-LEEME.md"
}

# --- Mover carpetas sueltas del Escritorio -----------------------------------

$Mudanzas = @(
    @{ origen = "kpop\reporte-incidencias"; destino = "01-Proyectos\tumuniaqui-reporte-incidencias\codigo" },
    @{ origen = "luis1";                    destino = "01-Proyectos\tumuniaqui-reporte-incidencias\codigo" },
    @{ origen = "kpop";                     destino = "01-Proyectos\kpop\codigo" },
    @{ origen = "mundogol";                 destino = "01-Proyectos\mundogol-2026-album\codigo" },
    @{ origen = "shopify";                  destino = "01-Proyectos\tienda-shopify-v3\codigo" },
    @{ origen = "porotos";                  destino = "01-Proyectos\landing-porotos\codigo" }
)

Write-Host ""
Write-Host "Carpetas sueltas en el Escritorio:"
$encontradas = $false

foreach ($m in $Mudanzas) {
    $rutaOrigen  = Join-Path $Escritorio $m.origen
    $rutaDestino = Join-Path $Base $m.destino

    if (-not (Test-Path $rutaOrigen -PathType Container)) { continue }
    if ($rutaOrigen.StartsWith($Base)) { continue }   # ya esta dentro
    $encontradas = $true

    # Solo si el destino esta vacio: no se pisa nada de lo que ya guardaste
    if ((Get-ChildItem -Force $rutaDestino -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0) {
        Write-Host "  - $($m.origen)  ->  ocupado, lo dejo donde esta"
        continue
    }

    if ($Mover) {
        Get-ChildItem -Force $rutaOrigen | Move-Item -Destination $rutaDestino
        Remove-Item $rutaOrigen -ErrorAction SilentlyContinue
        Write-Host "  - $($m.origen)  ->  movida a $($m.destino)"
    } else {
        Write-Host "  - $($m.origen)  ->  se moveria a $($m.destino)"
    }
}

if (-not $encontradas) { Write-Host "  (ninguna de las conocidas)" }

Write-Host ""
if ($Mover) {
    Write-Host "Listo. Revisa $Base"
} else {
    Write-Host "Estructura creada. Nada se movio todavia."
    Write-Host "Para mover de verdad: powershell -ExecutionPolicy Bypass -File scripts\organizar-claude.ps1 -Mover"
}
