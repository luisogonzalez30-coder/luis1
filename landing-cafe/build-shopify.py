import re,base64,glob,os,json
def datauri(f): return 'data:image/jpeg;base64,'+base64.b64encode(open(f,'rb').read()).decode()
def build(src,imgdir,out,patches):
    s=open(src).read()
    names=sorted(os.path.basename(f)[:-4] for f in glob.glob(imgdir+'/*.jpg'))
    # dynamic refs first
    s=re.sub(r"img/\$\{([^}]+)\}\.jpg",r"${IM(\1)}",s)
    s=s.replace("'img/'+n+'.jpg'","IM(n)")
    # static refs
    s=re.sub(r'src="img/([a-z0-9-]+)\.jpg"',lambda m: 'src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" data-im="'+m.group(1)+'"',s)
    data='const IMGDATA='+json.dumps({n:datauri(f'{imgdir}/{n}.jpg') for n in names})+';\nconst IM=n=>IMGDATA[n]||"";\ndocument.querySelectorAll("[data-im]").forEach(e=>{e.src=IM(e.dataset.im)});\n'
    s=s.replace('<script>\n/* ========== CONFIG','<script>\n'+data+'/* ========== CONFIG',1) if '/* ========== CONFIG' in s else s.replace('<script>\n/* ===== CONFIG','<script>\n'+data+'/* ===== CONFIG',1)
    for a,b in patches:
        assert a in s,a; s=s.replace(a,b,1)
    # srcdoc needs a full document
    doc='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'+s+'</body></html>'
    open(out,'w').write(doc)
    open(out+'.b64.txt','w').write(base64.b64encode(doc.encode()).decode())
    print(out,len(doc)//1024,'KB html',os.path.getsize(out+'.b64.txt')//1024,'KB b64')
build('site/index.html','site/img','dist/landing.html',[
 ("shopify: { enabled: false,","shopify: { enabled: true,"),
 ("popup: true,","popup: false,")])
build('thanks/index.html','thanks/img','dist/thanks.html',[
 ("storeUrl: '',","storeUrl: 'https://www.maulestore.com/pages/cafe-atelier',")])
