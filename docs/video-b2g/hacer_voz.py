#!/usr/bin/env python3
"""Genera la locución del video y calcula los tiempos exactos de cada escena."""
import json, os, subprocess, sys, urllib.parse

AQUI = os.path.dirname(os.path.abspath(__file__))
TMP = os.path.join(AQUI, 'voz_partes')
os.makedirs(TMP, exist_ok=True)

# Un bloque por escena del video.
BLOQUES = [
    ("s1", "Hoy, cuando un vecino quiere reportar un bache o una luminaria apagada, "
           "tiene que llamar por teléfono o ir hasta el municipio. "
           "Y ese reclamo, muchas veces, se pierde."),
    ("s2", "Tu Muni Aquí cambia eso."),
    ("s3", "El vecino marca el lugar en el mapa, describe el problema y toma una foto. "
           "Treinta segundos, desde su celular, sin instalar ninguna aplicación "
           "y sin crear una cuenta."),
    ("s4", "Y si no hay señal, el reporte queda guardado y se envía solo "
           "cuando vuelve la conexión."),
    ("s5", "Al instante recibe un aviso por WhatsApp con el número de su reporte. "
           "Y otro cuando queda resuelto, sin que nadie en la municipalidad "
           "tenga que hacer nada."),
    ("s6", "Mientras tanto, el sistema calcula la gravedad del reporte y lo deriva "
           "automáticamente al departamento que corresponde."),
    ("s7", "Y esto es lo que ve el alcalde. Cuántos reportes hay pendientes. "
           "Qué sectores concentran los problemas. Y cuánto se está gastando de verdad."),
    ("s8", "No es una aplicación para vecinos. Es su panel de control."),
    ("s9", "Tu Muni Aquí. Un producto de Log In Soluciones Integrales."),
]

SILENCIO_INICIAL = 1.0   # respiro antes de que empiece a hablar
PAUSA_ENTRE_BLOQUES = 0.9
PAUSA_INTERNA = 0.25     # entre trozos de un mismo bloque
LIMITE = 190             # el endpoint corta cerca de los 200 caracteres


def trocear(texto, limite=LIMITE):
    """Parte en trozos cortos respetando el final de frase, y si no, la coma."""
    frases, buf = [], ""
    for parte in texto.replace("! ", "!|").replace("? ", "?|").replace(". ", ".|").split("|"):
        if len(buf) + len(parte) + 1 <= limite:
            buf = (buf + " " + parte).strip()
        else:
            if buf:
                frases.append(buf)
            buf = parte.strip()
    if buf:
        frases.append(buf)

    salida = []
    for f in frases:
        while len(f) > limite:
            corte = f.rfind(",", 0, limite)
            if corte < limite // 2:
                corte = f.rfind(" ", 0, limite)
            salida.append(f[:corte + 1].strip())
            f = f[corte + 1:].strip()
        if f:
            salida.append(f)
    return salida


def bajar(texto, destino):
    url = ("https://translate.googleapis.com/translate_tts?"
           + urllib.parse.urlencode({
               "ie": "UTF-8", "q": texto, "tl": "es",
               "client": "tw-ob", "total": "1", "idx": "0",
               "textlen": str(len(texto)),
           }))
    r = subprocess.run(
        ["curl", "-sS", "--fail", "--max-time", "30", "-A", "Mozilla/5.0", url, "-o", destino],
        capture_output=True, text=True)
    if r.returncode != 0 or not os.path.exists(destino) or os.path.getsize(destino) < 500:
        raise RuntimeError(f"falló la descarga: {texto[:60]!r} :: {r.stderr[:200]}")


def duracion(ruta):
    r = subprocess.run(["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
                        "-of", "csv=p=0", ruta], capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def a_wav(origen, destino):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", origen,
                    "-ar", "24000", "-ac", "1", destino], check=True)


def silencio(seg, destino):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi",
                    "-i", "anullsrc=r=24000:cl=mono", "-t", f"{seg:.3f}", destino], check=True)


def main():
    piezas = []          # rutas wav en orden
    tiempos = {}         # escena -> segundo en que empieza a hablar
    reloj = 0.0

    sil_ini = os.path.join(TMP, "sil_ini.wav"); silencio(SILENCIO_INICIAL, sil_ini)
    piezas.append(sil_ini); reloj += SILENCIO_INICIAL

    sil_int = os.path.join(TMP, "sil_int.wav"); silencio(PAUSA_INTERNA, sil_int)
    sil_blo = os.path.join(TMP, "sil_blo.wav"); silencio(PAUSA_ENTRE_BLOQUES, sil_blo)

    for bi, (escena, texto) in enumerate(BLOQUES):
        if bi > 0:
            piezas.append(sil_blo); reloj += PAUSA_ENTRE_BLOQUES
        tiempos[escena] = round(reloj, 3)

        for ti, trozo in enumerate(trocear(texto)):
            if ti > 0:
                piezas.append(sil_int); reloj += PAUSA_INTERNA
            mp3 = os.path.join(TMP, f"{escena}_{ti}.mp3")
            wav = os.path.join(TMP, f"{escena}_{ti}.wav")
            if not os.path.exists(wav):
                bajar(trozo, mp3)
                a_wav(mp3, wav)
            d = duracion(wav)
            piezas.append(wav); reloj += d
            print(f"  {escena}[{ti}] {d:5.2f}s  {trozo[:58]}")

    reloj += 2.2  # cola final para que el cierre respire
    sil_fin = os.path.join(TMP, "sil_fin.wav"); silencio(2.2, sil_fin)
    piezas.append(sil_fin)

    lista = os.path.join(TMP, "lista.txt")
    with open(lista, "w") as fh:
        for p in piezas:
            fh.write(f"file '{p}'\n")

    salida = os.path.join(AQUI, "voz.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
                    "-i", lista, "-c", "copy", salida], check=True)

    total = duracion(salida)
    tiempos["total"] = round(total, 3)
    with open(os.path.join(AQUI, "tiempos.json"), "w") as fh:
        json.dump(tiempos, fh, indent=2, ensure_ascii=False)

    print("\n--- tiempos por escena (segundos) ---")
    for k, v in tiempos.items():
        print(f"  {k}: {v}")
    print(f"\nvoz.wav listo: {total:.2f}s")


if __name__ == "__main__":
    main()
