/* ========== CONFIGURACIÓN (edita aquí) ========== */
const PAGE_ID = '@@PAGE@@';          // hub | pen | drip | key
const PAGE_MODE = '@@MODE@@';        // preview | shopify
const VIDEO_URL = '@@VIDEO@@';
const CONFIG = {
  freeShipFrom: 49,                  // USD
  payLinks: {   // Links de pago de PayPal (USD). Vacío = el botón muestra "Próximamente".
    'pen-white':'https://www.paypal.com/ncp/payment/NL8T3HS2HEGNA', 'pen-red':'https://www.paypal.com/ncp/payment/NL8T3HS2HEGNA', 'pen-yellow':'https://www.paypal.com/ncp/payment/NL8T3HS2HEGNA', 'pen-pink':'https://www.paypal.com/ncp/payment/NL8T3HS2HEGNA',   // mismo link por ahora: PayPal no recibe el color
    drip:'https://www.paypal.com/ncp/payment/2TR9R6JV3SKUU',
    'key-cafe':'https://www.paypal.com/ncp/payment/YTAR8N83UWPGU',
    'key-verde':'https://www.paypal.com/ncp/payment/MLT6HDJVKTXEA',
    'key-rosa':'https://www.paypal.com/ncp/payment/KC9TY6SXHVRP2',
    'key-cup':'', 'key-tzc':'', 'key-tzh':'', 'key-tzm':'',
    trio:'https://www.paypal.com/ncp/payment/8QFPWMXRB8G54' },
  cart: false,                       // el pago es directo por PayPal, un producto por pago
  stock: {},                         // solo cifras reales, ej. { pen: 12 }; vacío = sin barra de stock
  shopify: { enabled: PAGE_MODE === 'shopify', variants: {
    pen:'68244271071469', drip:'68244271104237',
    'key-cafe':'68244271169773', 'key-verde':'68244271202541', 'key-rosa':'68244271235309', 'key-cup':'68244271268077',
    'key-tzc':'68244272578797', 'key-tzh':'68244272611565', 'key-tzm':'68244272644333' } }
};
const PAGES = { hub:'cafe-atelier', pen:'atelier-pen', drip:'atelier-dripper', key:'atelier-llavero', trio:'atelier-trio' };
const FILES = { hub:'index.html', pen:'pen.html', drip:'drip.html', key:'key.html', trio:'trio.html' };
const P = {
  pen:  { price: 22.99, img: ['pen-flower','pen-heart','pen-feather'] },
  drip: { price: 23.00, img: ['drip-kit','drip-drop','drip-balcony','drip-flat','filt-hands'] },
  key:  { price: 14.99, v: { cafe:['mach-cafe','mach-hand'], verde:['mach-verde'], rosa:['mach-rosa'], tzc:['tz-heart'], tzh:['tz-leaf'], tzm:['tz-marsh'], cup:['cup-palm','cup-hand'] } },
  trio: { price: 29.99, was: 44.97, img: ['trio','mach-cafe','mach-verde','mach-rosa'] }
};
const VARS = { key:['cafe','verde','rosa','tzc','tzh','tzm','cup'], pen:['white','red','yellow','pink'] };
const SW = { cafe:'#8a5a3b', verde:'#8fae85', rosa:'#efb8c0', white:'#f2efe9', red:'#c8312b', yellow:'#f0c63a', pink:'#c2457f' };
const THUMB = { trio:'trio', pen:'pen-flower', drip:'drip-drop', 'key:cafe':'mach-cafe', 'key:verde':'mach-verde', 'key:rosa':'mach-rosa', 'key:cup':'cup-palm', 'key:tzc':'tz-heart', 'key:tzh':'tz-leaf', 'key:tzm':'tz-marsh' };

/* ========== TRADUCCIONES ========== */
@@I18N@@
const LOCALE = {es:'es',en:'en-US',pt:'pt-BR',fr:'fr-FR',de:'de-DE',it:'it-IT'};
const CC_LANG = (()=>{ const m={};
  'ES MX AR CL CO PE VE EC GT CU BO DO HN PY SV NI CR PA UY PR GQ'.split(' ').forEach(c=>m[c]='es');
  'BR PT AO MZ CV'.split(' ').forEach(c=>m[c]='pt');
  'FR BE LU MC SN CI CM HT'.split(' ').forEach(c=>m[c]='fr');
  'DE AT LI CH'.split(' ').forEach(c=>m[c]='de');
  'IT SM VA'.split(' ').forEach(c=>m[c]='it'); return m })();
const ls = { get(k){ try{return localStorage.getItem(k)}catch(e){return null} }, set(k,v){ try{localStorage.setItem(k,v)}catch(e){} } };
function browserLang(){ const l=(navigator.languages&&navigator.languages[0])||navigator.language||'en'; const b=l.slice(0,2).toLowerCase(); return I18N[b]?b:'en' }
async function ipCountry(){
  for(const [u,k] of [['https://ipapi.co/json/','country_code'],['https://ipwho.is/','country_code']]){
    try{ const c=new AbortController(); const tm=setTimeout(()=>c.abort(),2500);
      const r=await fetch(u,{signal:c.signal}); clearTimeout(tm); const j=await r.json(); if(j&&j[k]) return String(j[k]).toUpperCase() }catch(e){}
  } return null;
}

/* ========== ESTADO Y UTILIDADES ========== */
let lang='en';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const fmt=n=>new Intl.NumberFormat(LOCALE[lang],{style:'currency',currency:'USD'}).format(n);
const t=(k,v={})=>{ let s=(I18N[lang]&&I18N[lang][k])??I18N.en[k]??k; for(const x in v) s=s.split('{'+x+'}').join(v[x]); return s };
const varSel={ key:'cafe', pen:'white' };
let cart=[]; try{ cart=JSON.parse(ls.get('ac_cart2')||'[]').filter(i=>P[i.id]&&(i.id==='pen'||i.id==='drip'||(VARS[i.id]||[]).includes(i.v))) }catch(e){ cart=[] }
const origin=()=>{ try{ return parent.location.origin }catch(e){ return location.origin } };
const hrefOf=k=>PAGE_MODE==='shopify' ? '/pages/'+PAGES[k] : FILES[k];
const tgt=PAGE_MODE==='shopify' ? ' data-nl target="_top"' : '';
function navTo(href){
  let url=href;
  try{ const base=parent.location, u=new URL(href,base.href); if(base.search&&!u.search) u.search=base.search; url=u.href }catch(e){}
  try{ parent.location.assign(url) }catch(e){ try{ window.open(url,'_top') }catch(e2){ location.href=url } }
}
const payKey=(id,v)=>VARS[id]?id+'-'+v:id;
const payUrl=(id,v)=>(CONFIG.payLinks&&CONFIG.payLinks[payKey(id,v)])||'';
const pct=p=>p.was?Math.round((1-p.price/p.was)*100):0;
const names={pen:'pen_n',drip:'drip_n',key:'key_n',trio:'trio_n'};
const pName=id=>t(names[id]);
const pTag=id=>({pen:t('pen_t'),drip:t('drip_t'),key:t('key_t'),trio:t('trio_t')})[id];
const pDesc=id=>({pen:t('pen_d'),drip:t('drip_d'),key:t('key_d'),trio:t('trio_d')})[id];
const vLabel=(id,v)=>t('v_'+v);
function mainImg(id){ return id==='pen'?P.pen.img[0]:id==='drip'?'drip-drop':id==='key'?P.key.v[varSel.key][0]:'trio' }
function gallery(id){
  let a;
  if(id==='pen') a=P.pen.img; else if(id==='drip') a=P.drip.img;
  else if(id==='trio') a=['trio','mach-cafe','mach-verde','mach-rosa'];
  else a=[...P.key.v[varSel.key],'mach-market','mach-hand'];
  a=[...new Set(a)];
  if((id==='key'&&varSel.key==='rosa')||id==='trio') a.push('@video');
  return a;
}
function stockHtml(id){ const n=CONFIG.stock[id]; if(n==null) return ''; return `<span>${t('left',{n})}</span><div class="bar"><i style="width:${Math.min(100,Math.round(n/60*100))}%"></i></div>` }
const cdHtml=()=>`<div class="cd" data-cd><div class="cdb"><b data-h>00</b><span>${t('cd_h')}</span></div><div class="cdb"><b data-m>00</b><span>${t('cd_m')}</span></div><div class="cdb"><b data-s>00</b><span>${t('cd_s')}</span></div></div>`;
function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('on'),2200) }
function tick(){
  const n=new Date(), end=new Date(n); end.setHours(24,0,0,0); const s=Math.max(0,Math.floor((end-n)/1000));
  const h=String(Math.floor(s/3600)).padStart(2,'0'), m=String(Math.floor(s%3600/60)).padStart(2,'0'), x=String(s%60).padStart(2,'0');
  $$('[data-cd]').forEach(c=>{ $('[data-h]',c).textContent=h; $('[data-m]',c).textContent=m; $('[data-s]',c).textContent=x });
}
setInterval(tick,1000);

/* ========== CARRITO ========== */
function lineInfo(i){
  if(i.id==='key') return { name:t('key_n'), sub:(['cafe','verde','rosa'].includes(i.v)?t('v_mach')+' · ':'')+t('v_'+i.v), img:THUMB['key:'+i.v] };
  return { name:t(names[i.id]), sub:'', img:THUMB[i.id] };
}
const totals=()=>{ const sub=cart.reduce((a,i)=>a+P[i.id].price*i.qty,0); return {sub,tot:sub} };
function renderCart(){
  const n=cart.reduce((a,i)=>a+i.qty,0); $('#cartN').textContent=n;
  $('#dbody').innerHTML = cart.length ? cart.map((i,ix)=>{ const L=lineInfo(i); return `<div class="line"><img src="${IM('th-'+L.img)}" alt=""><div><h4>${L.name}</h4><small>${L.sub}</small><div class="qty"><button type="button" data-q="${ix}" data-d="-1" aria-label="-">−</button><span>${i.qty}</span><button type="button" data-q="${ix}" data-d="1" aria-label="+">+</button></div></div><div class="lp">${fmt(P[i.id].price*i.qty)}${payUrl(i.id,i.v)?`<a class="pl" href="${payUrl(i.id,i.v)}" target="_blank" rel="noopener">${t('pay')} →</a>`:''}</div></div>` }).join('') : `<div class="empty">${t('c_empty')}</div>`;
  const T=totals(), left=Math.max(0,CONFIG.freeShipFrom-T.sub), free=cart.length&&T.sub>=CONFIG.freeShipFrom;
  $('#cSub').textContent=fmt(T.sub); $('#cTot').textContent=fmt(T.tot);
  $('#cShip').textContent=cart.length?(free?t('c_free'):t('c_calc')):'—';
  $('#goalTxt').textContent=free?t('c_goal_ok'):t('c_goal',{x:fmt(left)});
  $('#goalBar').style.width=Math.min(100,T.sub/CONFIG.freeShipFrom*100)+'%';
  const go=$('#go'), note=$('#goNote'); let url='';
  const single=cart.length===1?payUrl(cart[0].id,cart[0].v):'';
  if(CONFIG.shopify.enabled) url='#shopify'; else if(single) url=single;
  go.dataset.url=url; go.setAttribute('href',url||'#');
  go.style.opacity=cart.length?1:.45; go.style.pointerEvents=cart.length?'auto':'none';
  const anyLink=cart.some(i=>payUrl(i.id,i.v)); note.hidden=!!url||!cart.length; note.textContent=t(anyLink?'c_multi':'c_cfg');
  ls.set('ac_cart2',JSON.stringify(cart));
}
function add(id,v){
  const vv=VARS[id]?(v||varSel[id]):null;
  const ex=cart.find(i=>i.id===id&&i.v===vv);
  if(ex) ex.qty++; else cart.push(vv?{id,v:vv,qty:1}:{id,qty:1});
  renderCart(); toast(t('t_add'));
}
const shopVar=i=>CONFIG.shopify.variants[i.id==='key'?'key-'+i.v:i.id];
async function shopifyCheckout(items,btn){
  if(btn) btn.style.opacity=.6;
  try{
    const o=origin();
    const r=await fetch(o+'/cart/add.js',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:items.map(i=>({id:Number(shopVar(i)),quantity:i.qty}))})});
    if(!r.ok) throw new Error('cart');
    navTo('/checkout')
  }catch(e){ if(btn) btn.style.opacity=1; toast(t('c_err')) }
}
function buyNow(id,btn){
  const v=VARS[id]?varSel[id]:undefined;
  if(CONFIG.shopify.enabled) shopifyCheckout([{id,v,qty:1}],btn);
  else { add(id,v); openCart() }
}
function openCart(){ $('#drawer').classList.add('on'); $('#veil').classList.add('on') }
function closeCart(){ $('#drawer').classList.remove('on'); $('#veil').classList.remove('on') }

/* ========== COMPONENTES ========== */
function swatch(v){ return SW[v]?`<i class="sw" style="background:${SW[v]}"></i>`:'' }
function buybox(id){
  const p=P[id], gal=gallery(id), main=gi.main>=gal.length?0:gi.main;
  const vars=VARS[id]?`<div class="opt"><span class="lbl">${t(id==='pen'?'pick_c':'pick')}</span><div class="vars" role="group">${VARS[id].map(v=>`<button type="button" data-pv="${v}" aria-pressed="${varSel[id]===v}">${swatch(v)}${t('v_'+v)}</button>`).join('')}</div></div>`:'';
  const link=payUrl(id,varSel[id]);
  const penNote=(id==='pen'&&varSel.pen!=='white')?`<p class="hint">${t('pen_note')}</p>`:'';
  const buyBtn=link?`<a class="btn block pulse" id="buyBtn" data-buy="${id}" href="${link}" target="_blank" rel="noopener">${t('buy')} →</a>`:`<button class="btn block soon" type="button" disabled>${t('soon')}</button>`;
  const trioNote=id==='trio'?`<p class="save">${t('trio_save',{x:fmt(p.was-p.price),p:pct(p)})}</p>`:'';
  const upsell=(id==='key'&&['cafe','verde','rosa'].includes(varSel.key))?`<a class="upsell" href="${hrefOf('trio')}"${tgt}><img src="${IM('th-trio')}" alt=""><div><b>${t('up_t')}</b><span>${t('up_p',{a:fmt(P.trio.price),b:fmt(P.trio.was)})}</span></div><i>${t('up_cta')} →</i></a>`:'';
  const incl=id==='trio'?`<div class="inc">${['cafe','verde','rosa'].map(v=>`<span>${swatch(v)}${t('v_mach')} ${t('v_'+v)}</span>`).join('')}</div>`:id==='drip'?`<div class="inc">${['d_inc1','d_inc2','d_inc3'].map(k=>`<span>${t(k)}</span>`).join('')}</div>`:'';
  return `<a class="back top" href="${hrefOf('hub')}"${tgt}>← ${t('all')}</a><div class="bb">
    <div class="bb-gal"><div class="bb-main">${p.was?`<span class="badge">-${pct(p)}%</span>`:''}${gal[main]==='@video'?`<video id="bbVid" src="${VIDEO_URL}" poster="${IM('rosa-poster')}" autoplay muted loop playsinline></video>`:`<img id="bbMain" src="${IM(gal[main])}" alt="${pName(id)}">`}</div>
      <div class="bb-th">${gal.map((g,i)=>`<button type="button" data-th="${i}" aria-pressed="${i===main}" aria-label="${i+1}"><img src="${IM(g==='@video'?'th-rosa-poster':g)}" alt="">${g==='@video'?'<span class="play" aria-hidden="true"></span>':''}</button>`).join('')}</div></div>
    <div class="bb-info">
      <span class="eyebrow">${pTag(id)}</span>
      <h1>${pName(id)}</h1>
      <p class="lead">${pDesc(id)}</p>
      <div class="price"><b>${fmt(p.price)}</b>${p.was?`<s>${fmt(p.was)}</s>`:''}<em>USD</em></div>${trioNote}
      ${incl}${vars}${penNote}
      <div class="ends"><small>${t('h_ends')}</small>${cdHtml()}</div>
      <div class="stock">${stockHtml(id)}</div>
      ${upsell}
      ${buyBtn}
      <div class="trust"><span>${t('tr1')}</span><span>${t('tr2')}</span><span>${t('tr3')}</span></div>
    </div></div>`;
}
const gi={ main:0 };
function syncSticky(){
  const sb=$('#stickyBuy'); if(!sb||PAGE_ID==='hub') return;
  const l=payUrl(PAGE_ID,varSel[PAGE_ID]), sp=sb.querySelector('span');
  if(l){ sb.href=l; sb.target='_blank'; sb.rel='noopener'; sb.classList.remove('soon'); if(sp) sp.textContent=t('buy') }
  else { sb.removeAttribute('href'); sb.removeAttribute('target'); sb.classList.add('soon'); if(sp) sp.textContent=t('soon') }
}
function openLink(u){ const a=document.createElement('a'); a.href=u; a.target='_blank'; a.rel='noopener'; document.body.appendChild(a); a.click(); a.remove() }
function renderBuybox(){ const el=$('#buybox'); if(el){ el.innerHTML=buybox(PAGE_ID); tick(); const sn=$('#stickyN'); if(sn) sn.textContent=pName(PAGE_ID); const sp=$('#stickyP'); if(sp) sp.textContent=fmt(P[PAGE_ID].price); syncSticky() } }
const ticks=(a)=>`<ul class="ticks">${a.map(k=>`<li>${t(k)}</li>`).join('')}</ul>`;
const story=(img,e,ti,p,tk,flip)=>`<div class="story${flip?' flip':''}"><div class="story-img"><img src="${IM(img)}" alt="" loading="lazy"></div><div><span class="eyebrow">${t(e)}</span><h2>${t(ti)}</h2><p>${t(p)}</p>${ticks(tk)}</div></div>`;
const banner=(img,cap)=>`<figure class="pack"><img src="${IM(img)}" alt="" loading="lazy">${cap?`<figcaption>${t(cap)}</figcaption>`:''}</figure>`;
const head=(e,ti,p)=>`<div class="sec-head">${e?`<span class="eyebrow">${t(e)}</span>`:''}<h2>${t(ti)}</h2>${p?`<p>${t(p)}</p>`:''}</div>`;
function variantCards(list,id){ const pp=P.key; return `<div class="grid3">${list.map(v=>`<article class="ccard"><img src="${IM(P.key.v[v][0])}" alt="${t('v_'+v)}" loading="lazy"><div class="cinfo"><h3>${swatch(v)}${t('v_'+v)}</h3><div class="price"><b>${fmt(pp.price)}</b>${pp.was?`<s>${fmt(pp.was)}</s>`:''}</div><button class="btn block" type="button" data-addvar="${id}:${v}">${t('col_btn')}</button></div></article>`).join('')}</div>` }
const videoBlock=(cta)=>`<div class="story"><div class="vwrap"><div class="vframe"><video id="vid360" muted loop playsinline preload="metadata" poster="${IM('rosa-poster')}" src="${VIDEO_URL}" aria-label="360"></video><button class="vsnd" id="vsnd" type="button" aria-pressed="false" aria-label="${t('snd')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path class="w" d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12"/><path class="x" d="M16 9l5 6M21 9l-5 6"/></svg></button></div></div><div><span class="eyebrow">${t('vid_e')}</span><h2>${t('vid_t')}</h2><p>${t('vid_p')}</p>${ticks(['vid_1','vid_2','vid_3'])}<div style="margin-top:28px">${cta}</div></div></div>`;
const ctaTrio=()=>`<a class="btn pulse" data-buy="trio" href="${payUrl('trio')}" target="_blank" rel="noopener">${t('buy')} →</a>`;
const ctaKey=()=>`<button class="btn pulse" type="button" data-addvar="key:rosa"><span>${t('vid_cta')}</span> →</button>`;
const ctaHub=()=>`<a class="btn pulse" href="${hrefOf('key')}"${tgt}>${t('view')} →</a>`;
const steps=()=>`${head(null,'st_t')}<div class="steps">${[1,2,3].map(n=>`<div class="step"><b>${n}</b><h3>${t('st'+n+'_t')}</h3><p>${t('st'+n+'_p')}</p></div>`).join('')}</div>`;
const guar=()=>`<div class="guar">${[1,2,3].map(n=>`<div class="gbox"><h3>${t('g'+n+'_t')}</h3><p>${t('g'+n+'_p')}</p></div>`).join('')}</div>`;
const faq=(n)=>`<div class="faq">${Array.from({length:n},(_,i)=>i+1).map(i=>`<details${i===1?' open':''}><summary>${t('q'+i)}</summary><p>${t('a'+i)}</p></details>`).join('')}</div>`;
const marquee=(a)=>`<div class="m-track" aria-hidden="true">${[...a,...a,...a].map(n=>`<img src="${IM(n)}" alt="" loading="lazy">`).join('')}</div>`;
function cross(except){
  const ids=['trio','pen','drip','key'].filter(x=>x!==except);
  return `<div class="grid3">${ids.map(id=>`<a class="xcard" href="${hrefOf(id)}"${tgt}><img src="${IM(mainImg(id))}" alt="" loading="lazy"><div><h3>${pName(id)}</h3><span class="eyebrow">${pTag(id)}</span><div class="price"><b>${fmt(P[id].price)}</b>${P[id].was?`<s>${fmt(P[id].was)}</s>`:''}</div><span class="more">${t('view')} →</span></div></a>`).join('')}</div>`;
}
const finalCta=(img)=>{ const l=payUrl(PAGE_ID,varSel[PAGE_ID]); return `<section class="final"><img src="${IM(img)}" alt=""><div class="wrap"><h2>${t('f_t')}</h2><p>${t('f_p')}</p><div class="ends" style="margin:0 auto 32px"><small>${t('h_ends')}</small>${cdHtml()}</div>${l?`<a class="btn pulse" data-buy="${PAGE_ID}" href="${l}" target="_blank" rel="noopener">${t('buy')} →</a>`:`<button class="btn soon" type="button" disabled>${t('soon')}</button>`}</div></section>` };

/* ========== PÁGINAS ========== */
const SECTIONS = {
  hub(){
    const slides=[['pen','pen-heart'],['trio','trio'],['key','mach-pack'],['drip','drip-drop']];
    const tiles=[['trio','trio','mach-rosa'],['pen','pen-flower','pen-heart'],['drip','drip-drop','drip-balcony'],['key','mach-rosa','mach-hand']];
    return `<section class="hub-ban" id="top">
      <div class="slides">${slides.map(([id,img],i)=>`<a class="slide${i===0?' on':''}" href="${hrefOf(id)}"${tgt} data-slide="${i}"><img src="${IM(img)}" alt=""><span class="cap"><small>${t('view')}</small>${pName(id)} →</span></a>`).join('')}</div>
      <div class="wrap hub-txt"><span class="pill">${t('h_eye')}</span><h1>${t('h_title')}</h1><p class="lead">${t('h_sub')}</p>
        <div class="cta-row"><a class="btn pulse" href="#productos">${t('h_cta2')} →</a></div>
        <div class="ends"><small>${t('h_ends')}</small>${cdHtml()}</div>
        <div class="dots">${slides.map((_,i)=>`<button type="button" data-dot="${i}" aria-label="${i+1}" aria-pressed="${i===0}"></button>`).join('')}</div></div></section>
    <a class="promo" href="${hrefOf('trio')}"${tgt}><img src="${IM('th-trio')}" alt=""><span>${t('trio_n')} · ${t('trio_t')} · <b>${fmt(P.trio.price)}</b></span><i>${t('up_cta')} →</i></a>
    <section id="productos"><div class="wrap">${head(null,'hub_t','hub_p')}
      <div class="tiles">${tiles.map(([id,a,b])=>`<a class="tile" href="${hrefOf(id)}"${tgt}><div class="timg">${P[id].was?`<span class="badge">-${pct(P[id])}%</span>`:''}<img src="${IM(a)}" alt="${pName(id)}" loading="lazy"><img src="${IM(b)}" alt="" loading="lazy"></div>
        <div class="tbody"><span class="eyebrow">${pTag(id)}</span><h3>${pName(id)}</h3><p>${pDesc(id)}</p>
        <div class="price"><small>${id==='trio'?'':t('from')}</small><b>${fmt(P[id].price)}</b>${P[id].was?`<s>${fmt(P[id].was)}</s>`:''}</div><span class="btn block">${t('view')} →</span></div></a>`).join('')}</div></div></section>
    <section class="alt"><div class="wrap">${videoBlock(ctaHub())}</div></section>
    <section><div class="wrap">${guar()}</div></section>`;
  },
  trio(){ return `<section class="pp"><div class="wrap" id="buybox"></div></section>
    <section style="padding-top:0"><div class="wrap"><div class="story"><div class="story-img"><img src="${IM('mach-pack')}" alt="" loading="lazy"></div><div><span class="eyebrow">${t('trio_e')}</span><h2>${t('trio_h')}</h2><p>${t('trio_p')}</p><ul class="ticks"><li>${t('trio_1')}</li><li>${t('trio_2')}</li><li>${t('trio_3',{a:fmt(P.trio.price/3),b:fmt(P.key.price)})}</li></ul></div></div></div></section>
    <section style="padding-top:0"><div class="wrap">${videoBlock(ctaTrio())}</div></section>
    <section class="moments" style="padding-top:0">${marquee(['mach-cafe','mach-verde','mach-rosa','mach-hand','mach-market','mach-pack'])}</section>
    <section><div class="wrap">${guar()}</div></section>
    <section id="faq" style="padding-top:0"><div class="wrap">${head(null,'q_t')}${faq(5)}</div></section>
    <section><div class="wrap">${head(null,'cross_t')}${cross('trio')}</div></section>${finalCta('mach-rosa')}`; },
  pen(){ return `<section class="pp"><div class="wrap" id="buybox"></div></section>
    <section style="padding-top:0"><div class="wrap">${story('pen-feather','s1_e','s1_t','s1_p',['s1_1','s1_2','s1_3'])}</div></section>
    <section class="alt"><div class="wrap">${steps()}</div></section>
    <section><div class="wrap">${banner('pen-heart')}</div></section>
    <section class="moments" style="padding-top:0">${marquee(['pen-flower','pen-heart','pen-feather','pen-flower','pen-heart'])}</section>
    <section style="padding-top:0"><div class="wrap">${guar()}</div></section>
    <section id="faq" style="padding-top:0"><div class="wrap">${head(null,'q_t')}${faq(4)}</div></section>
    <section><div class="wrap">${head(null,'cross_t')}${cross('pen')}</div></section>${finalCta('pen-heart')}`; },
  drip(){ return `<section class="pp"><div class="wrap" id="buybox"></div></section>
    <section style="padding-top:0"><div class="wrap">${story('drip-drop','s2_e','s2_t','s2_p',['s2_1','s2_2','s2_3'])}</div></section>
    <section style="padding-top:0"><div class="wrap">${story('filt-hands','fil_e','fil_t','fil_p',['d_inc1','d_inc2','d_inc3'],true)}</div></section>
    <section><div class="wrap">${banner('drip-balcony')}</div></section>
    <section class="moments" style="padding-top:0">${marquee(['drip-drop','drip-balcony','drip-flat','drip-drop','drip-balcony'])}</section>
    <section style="padding-top:0"><div class="wrap">${guar()}</div></section>
    <section id="faq" style="padding-top:0"><div class="wrap">${head(null,'q_t')}${faq(4)}</div></section>
    <section><div class="wrap">${head(null,'cross_t')}${cross('drip')}</div></section>${finalCta('drip-balcony')}`; },
  key(){ return `<section class="pp"><div class="wrap" id="buybox"></div></section>
    <section style="padding-top:0"><div class="wrap">${story('mach-pack','s3_e','s3_t','s3_p',['s3_1','s3_2','s3_3'])}</div></section>
    <section style="padding-top:0"><div class="wrap">${videoBlock(ctaKey())}</div></section>
    <section class="alt"><div class="wrap">${head('col_e','col_t','col_p')}${variantCards(['cafe','verde','rosa'],'key')}</div></section>
    <section><div class="wrap">${head('cup_e','cup_t','cup_p')}${variantCards(['tzc','tzh','tzm'],'key')}</div></section>
    <section class="moments" style="padding-top:0">${marquee(['tz-heart','tz-leaf','tz-marsh','mach-cafe','mach-verde','mach-rosa','mach-hand','cup-hand','cup-finger'])}</section>
    <section style="padding-top:0"><div class="wrap">${guar()}</div></section>
    <section id="faq" style="padding-top:0"><div class="wrap">${head(null,'q_t')}${faq(5)}</div></section>
    <section><div class="wrap">${head(null,'cross_t')}${cross('key')}</div></section>${finalCta('mach-pack')}`; }
};
function renderPage(){
  $('#app').innerHTML=SECTIONS[PAGE_ID]();
  if(PAGE_ID!=='hub') renderBuybox();
  tick(); bindMedia(); bindSlides();
}
function bindMedia(){
  const v=$('#vid360'); if(!v) return;
  if('IntersectionObserver' in window) new IntersectionObserver(es=>es.forEach(en=>{ if(en.isIntersecting) v.play().catch(()=>{}); else v.pause() }),{threshold:.35}).observe(v); else v.play().catch(()=>{});
  const b=$('#vsnd'); if(b) b.onclick=()=>{ v.muted=!v.muted; b.setAttribute('aria-pressed',String(!v.muted)) };
}
let slideIx=0, slideTm=0;
function showSlide(i){ slideIx=i; $$('.slide').forEach((s,k)=>s.classList.toggle('on',k===i)); $$('[data-dot]').forEach((d,k)=>d.setAttribute('aria-pressed',k===i)) }
function bindSlides(){ clearInterval(slideTm); if(PAGE_ID!=='hub') return; slideTm=setInterval(()=>showSlide((slideIx+1)%$$('.slide').length),4800) }

/* ========== IDIOMA ========== */
function applyI18n(){
  document.documentElement.lang=lang; $('#lang').value=lang;
  $$('[data-i18n]').forEach(e=>e.textContent=t(e.dataset.i18n));
  const tk=['tb1','tb2','tb3','tb4'].map(k=>`<span>${t(k)}</span>`).join(''); $('#ticker').innerHTML=tk+tk+tk+tk;
  const sp=$('#stickyP'); if(sp&&P[PAGE_ID]) sp.textContent=fmt(P[PAGE_ID].price);
  renderPage(); renderCart();
}

/* ========== EVENTOS ========== */
$('#lang').onchange=e=>{ lang=e.target.value; ls.set('ac_lang',lang); applyI18n() };
$('#openCart').onclick=openCart; $('#closeCart').onclick=closeCart; $('#veil').onclick=closeCart;
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeCart() });
$('#go').addEventListener('click',e=>{ if(CONFIG.shopify.enabled){ e.preventDefault(); if(cart.length) shopifyCheckout(cart,$('#go')); return } if(!$('#go').dataset.url){ e.preventDefault(); $('#goNote').hidden=false } });
document.addEventListener('click',e=>{
  const nl=e.target.closest('a[data-nl]'); if(nl&&PAGE_MODE==='shopify'){ e.preventDefault(); navTo(nl.getAttribute('href')); return }
  const by=e.target.closest('[data-buy]'); if(by){ const u=payUrl(by.dataset.buy,varSel[by.dataset.buy]); if(!u){ e.preventDefault(); return } burst(e.clientX,e.clientY); return }
  const ad=e.target.closest('[data-add]'); if(ad){ add(ad.dataset.add); burst(e.clientX,e.clientY); setTimeout(openCart,450); return }
  const av=e.target.closest('[data-addvar]'); if(av){ const [id,v]=av.dataset.addvar.split(':'); const u=payUrl(id,v); burst(e.clientX,e.clientY); if(u){ openLink(u) } else { varSel[id]=v; gi.main=0; renderBuybox(); scrollTo({top:0,behavior:'smooth'}) } return }
  const pv=e.target.closest('[data-pv]'); if(pv){ varSel[PAGE_ID]=pv.dataset.pv; gi.main=0; renderBuybox(); return }
  const th=e.target.closest('[data-th]'); if(th){ gi.main=+th.dataset.th; renderBuybox(); return }
  const dt=e.target.closest('[data-dot]'); if(dt){ showSlide(+dt.dataset.dot); bindSlides(); return }
  const q=e.target.closest('[data-q]'); if(q){ const i=cart[+q.dataset.q]; i.qty+=+q.dataset.d; if(i.qty<1) cart.splice(+q.dataset.q,1); renderCart() }
});
const stk=$('#sticky');
function onScroll(){ if(PAGE_ID==='hub'){ stk.classList.remove('on'); return } const bb=$('#buybox'); stk.classList.toggle('on', bb && bb.getBoundingClientRect().bottom<0) }
addEventListener('scroll',()=>requestAnimationFrame(onScroll),{passive:true});

/* ========== GRANOS DE CAFÉ ========== */
const cv=$('#fx'), cx=cv.getContext('2d'); let beans=[], raf=0;
function fit(){ cv.width=innerWidth*devicePixelRatio; cv.height=innerHeight*devicePixelRatio; cx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0) }
fit(); addEventListener('resize',fit);
function burst(x,y){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  for(let i=0;i<30;i++){ const a=Math.random()*Math.PI*2, s=4+Math.random()*7; beans.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-5,r:Math.random()*6,vr:(Math.random()-.5)*.4,l:1,c:['#5a3520','#7a4a2a','#d8b26e','#3b2214'][i%4]}) }
  if(!raf) raf=requestAnimationFrame(loop);
}
function loop(){
  cx.clearRect(0,0,innerWidth,innerHeight); beans=beans.filter(b=>b.l>0);
  beans.forEach(b=>{ b.x+=b.vx; b.y+=b.vy; b.vy+=.38; b.vx*=.985; b.r+=b.vr; b.l-=.014; cx.save(); cx.globalAlpha=Math.max(0,b.l); cx.translate(b.x,b.y); cx.rotate(b.r); cx.fillStyle=b.c; cx.beginPath(); cx.ellipse(0,0,8,5,0,0,7); cx.fill(); cx.strokeStyle='rgba(0,0,0,.45)'; cx.lineWidth=1.2; cx.beginPath(); cx.moveTo(-6,0); cx.quadraticCurveTo(0,-2.5,6,0); cx.stroke(); cx.restore() });
  raf=beans.length?requestAnimationFrame(loop):0;
}

/* ========== ARRANQUE ========== */
(function(){
  const saved=ls.get('ac_lang');
  lang=(saved&&I18N[saved])?saved:browserLang();
  if(!CONFIG.cart){ const oc=$('#openCart'); if(oc) oc.style.display='none' }
  const hl=$('#logo'); hl.href=hrefOf('hub'); if(PAGE_MODE==='shopify'){ hl.target='_top'; hl.setAttribute('data-nl','') }
  $$('[data-nav]').forEach(a=>{ a.href=hrefOf('hub')+(a.dataset.nav?'#'+a.dataset.nav:''); if(PAGE_MODE==='shopify'){ a.target='_top'; a.setAttribute('data-nl','') } });
  const sb=$('#stickyBuy'); if(sb) sb.dataset.buy=PAGE_ID;
  applyI18n();
  if(!saved) ipCountry().then(cc=>{ if(!cc) return; const l=CC_LANG[cc]||'en'; if(l!==lang){ lang=l; applyI18n(); toast(t('t_lang')) } });
})();
