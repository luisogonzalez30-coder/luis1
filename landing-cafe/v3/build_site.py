import base64, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
CDN_VIDEO = 'https://cdn.shopify.com/s/files/1/0844/1371/0573/files/atelier-rosa-360.mp4?v=1794237367'
TITLES = {'hub': 'Atelier Crema', 'pen': 'Latte Art Pen', 'drip': 'Dripper Plegable', 'key': 'Llavero Barista', 'trio': 'Trío Atelier'}
THUMBS = ['trio', 'rosa-poster', 'pen-flower', 'drip-drop', 'mach-cafe', 'mach-verde', 'mach-rosa', 'cup-palm', 'tz-heart', 'tz-leaf', 'tz-marsh']
IMGS = {
    'hub': ['trio', 'pen-heart', 'mach-pack', 'drip-drop', 'pen-flower', 'drip-balcony', 'mach-rosa', 'mach-hand', 'mach-cafe', 'rosa-poster'],
    'pen': ['trio', 'pen-flower', 'pen-heart', 'pen-feather', 'drip-drop', 'mach-cafe'],
    'drip': ['trio', 'drip-kit', 'filt-hands', 'drip-drop', 'drip-balcony', 'drip-flat', 'pen-flower', 'mach-cafe'],
    'trio': ['trio', 'mach-cafe', 'mach-verde', 'mach-rosa', 'mach-hand', 'mach-market', 'mach-pack', 'rosa-poster', 'pen-flower', 'drip-drop'],
    'key': ['trio', 'th-rosa-poster', 'mach-cafe', 'mach-hand', 'mach-market', 'mach-verde', 'mach-rosa', 'tz-heart', 'tz-leaf', 'tz-marsh',
            'cup-palm', 'cup-hand', 'cup-finger', 'mach-pack', 'pen-flower', 'drip-drop', 'rosa-poster'],
}

css = open('common.base.css').read() + '\n' + open('extra.css').read()
i18n = open('i18n.base.js').read() + '\n' + open('i18n.extra.js').read()
app = open('app.js').read()

CHROME = '''<canvas id="fx" aria-hidden="true"></canvas>
<div class="ticker" aria-label="Info"><div class="ticker-track" id="ticker"></div></div>
<header class="nav"><div class="wrap">
  <a class="logo" id="logo" href="#">Atelier <b>Crema</b></a>
  <nav class="nav-links"><a data-nav="productos" data-i18n="nav_prod" href="#"></a></nav>
  <div class="nav-r">
    <select class="lang" id="lang" aria-label="Language"><option value="es">Español</option><option value="en">English</option><option value="pt">Português</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="it">Italiano</option></select>
    <button class="cartbtn" id="openCart" type="button"><span data-i18n="cart"></span><i id="cartN">0</i></button>
  </div></div></header>
<main id="app"></main>
<footer><div class="wrap"><span class="logo">Atelier <b>Crema</b></span><span data-i18n="ft_cur"></span><span>© 2026 Atelier Crema</span></div></footer>
<div class="sticky" id="sticky"><div><small id="stickyN"></small><b id="stickyP"></b></div><a class="btn" id="stickyBuy" href="#"><span data-i18n="buy"></span> →</a></div>
<div class="veil" id="veil"></div>
<aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="cartT">
  <div class="d-head"><h3 id="cartT" data-i18n="c_t"></h3><button class="x" type="button" id="closeCart" aria-label="Close">✕</button></div>
  <div class="goal"><span id="goalTxt"></span><div class="bar"><i id="goalBar" style="width:0"></i></div></div>
  <div class="d-body" id="dbody"></div>
  <div class="d-foot">
    <div class="row"><span data-i18n="c_sub"></span><span id="cSub">$0</span></div>
    <div class="row"><span data-i18n="c_ship"></span><span id="cShip"></span></div>
    <div class="row tot"><span data-i18n="c_tot"></span><span id="cTot">$0</span></div>
    <a class="btn block" id="go" href="#" target="_blank" rel="noopener"><span data-i18n="c_go"></span> →</a>
    <p class="note" id="goNote" hidden></p>
  </div>
</aside>
<div class="toast" id="toast" role="status"></div>
'''

HEAD = '''<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..800;1,6..96,400..800&family=Jost:wght@300..700&display=swap">'''


def datauri(path):
    return 'data:image/jpeg;base64,' + base64.b64encode(open(path, 'rb').read()).decode()


def page_js(page, mode):
    js = app.replace('@@PAGE@@', page).replace('@@MODE@@', mode)
    js = js.replace('@@VIDEO@@', CDN_VIDEO if mode == 'shopify' else 'vid/rosa-360.mp4')
    js = js.replace('@@I18N@@', i18n)
    if mode == 'shopify':
        names = IMGS[page] + ['th-' + n for n in THUMBS] + ['rosa-poster']
        data = {n: datauri('img/%s.jpg' % n) for n in sorted(set(names))}
        pre = 'const IMGDATA=' + json.dumps(data) + ';\nconst IM=n=>IMGDATA[n]||"";\n'
    else:
        pre = 'const IM=n=>"img/"+n+".jpg";\n'
    return pre + js


def body(page, mode):
    return '<style>' + css + '</style>\n' + CHROME + '<script>\n' + page_js(page, mode) + '\n</script>'


def full_doc(page, mode):
    return ('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<title>%s</title>%s</head><body>%s</body></html>' % (TITLES[page], HEAD, body(page, mode)))


def main():
    os.makedirs('out/preview', exist_ok=True)
    os.makedirs('out/shopify', exist_ok=True)
    # Vista previa: el hub es fragmento (el publicador lo envuelve); el resto, documentos completos
    open('out/preview/index.html', 'w').write('<title>Atelier Crema</title>\n' + HEAD + '\n' + body('hub', 'preview'))
    for p in ['pen', 'drip', 'key', 'trio']:
        open('out/preview/%s.html' % p, 'w').write(full_doc(p, 'preview'))
    th = open('../thanks/index.html').read().replace("storeUrl: ''", "storeUrl: 'index.html'")
    open('out/preview/gracias.html', 'w').write('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + th + '</body></html>')
    # Shopify: documentos completos con imágenes embebidas, en base64
    for p in ['hub', 'pen', 'drip', 'key', 'trio']:
        doc = full_doc(p, 'shopify')
        open('out/shopify/%s.html' % p, 'w').write(doc)
        open('out/shopify/%s.b64.txt' % p, 'w').write(base64.b64encode(doc.encode()).decode())
        print(p, len(doc) // 1024, 'KB html', os.path.getsize('out/shopify/%s.b64.txt' % p) // 1024, 'KB b64')


main()
