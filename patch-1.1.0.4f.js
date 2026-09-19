/* MOBIMORY 1.1.0.4f-dev – visueller Template-Scanner DE EU-Kartenführerschein
   Referenztest:
   - geführter Kamerarahmen im ISO-ID-1-Seitenverhältnis
   - Vorder- und Rückseite getrennt
   - Aufnahme wird auf ein normiertes Kartenrechteck gebracht
   - OCR liest bei der Vorderseite nur feste Zonen für Feld 1, 2 und 3
   - allgemeine Vollseiten-OCR bleibt für andere Dokumenttypen unverändert
*/
const FP1104F_VERSION='1.1.0.4f-dev';

const FP1104F={
  activeCamera:null,
  stream:null,
  context:'',
  pageKey:'',
  pageLabel:'',
  normalizedWidth:1280,
  normalizedHeight:807,
  // Erstes Testtemplate nach dem amtlichen EU-/DE-Kartenmuster.
  // Koordinaten sind relativ zum normierten Kartenrechteck.
  template:{
    key:'DE_FEV_FUEHRERSCHEIN_EU',
    card:{standard:'ISO 7810 ID-1',widthMm:85.60,heightMm:53.98,aspect:85.60/53.98},
    front:{
      zones:{
        lastName:{label:'1 · Nachname',x:.37,y:.205,w:.59,h:.105,psm:7},
        firstName:{label:'2 · Vorname',x:.37,y:.300,w:.59,h:.105,psm:7},
        birth:{label:'3 · Geburtsdatum/-ort',x:.37,y:.392,w:.59,h:.110,psm:7}
      }
    }
  },
  lastZoneDebug:[]
};

(function(){
  if(document.getElementById('fp1104f-style'))return;
  const s=document.createElement('style');s.id='fp1104f-style';s.textContent=`
    .fp1104f-page{border:1px solid rgba(120,120,120,.25);border-radius:11px;padding:12px;margin:10px 0}
    .fp1104f-page.done{border-width:2px}
    .fp1104f-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}
    .fp1104f-filebtn{display:inline-flex;align-items:center;gap:6px;padding:10px 13px;border:1px solid rgba(120,120,120,.3);border-radius:9px;cursor:pointer}
    .fp1104f-filebtn input{display:none}
    .fp1104f-modal{position:fixed;inset:0;background:#000;z-index:99999;display:flex;flex-direction:column}
    .fp1104f-camtop{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;color:#fff;background:rgba(0,0,0,.72)}
    .fp1104f-view{position:relative;flex:1;overflow:hidden;background:#111}
    .fp1104f-view video{width:100%;height:100%;object-fit:cover;display:block}
    .fp1104f-guide{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(88vw,920px);aspect-ratio:1.5857725;border:3px solid #fff;border-radius:14px;box-shadow:0 0 0 9999px rgba(0,0,0,.42);pointer-events:none}
    .fp1104f-guide:before,.fp1104f-guide:after{content:"";position:absolute;inset:7px;border:1px dashed rgba(255,255,255,.55);border-radius:10px}
    .fp1104f-camhint{position:absolute;left:50%;bottom:15px;transform:translateX(-50%);background:rgba(0,0,0,.70);color:#fff;padding:8px 12px;border-radius:9px;max-width:88%;text-align:center}
    .fp1104f-cambottom{display:flex;gap:10px;justify-content:center;padding:12px;background:#000}
    .fp1104f-cambottom button{min-width:150px}
    .fp1104f-debuggrid{display:grid;grid-template-columns:repeat(3,minmax(160px,1fr));gap:10px}
    .fp1104f-zone{border:1px solid rgba(120,120,120,.22);border-radius:9px;padding:8px}
    .fp1104f-zone img{width:100%;height:auto;border-radius:5px;background:#fff}
    .fp1104f-zone b{display:block;margin:5px 0 2px}
    @media(max-width:720px){.fp1104f-debuggrid{grid-template-columns:1fr}.fp1104f-guide{width:92vw}}
  `;document.head.appendChild(s);
})();

function fp1104fSetVersion(){
  const f=document.querySelector('footer');
  if(f)f.textContent='Fahrzeugplattform · '+FP1104F_VERSION+' · © 2026 Entwicklungsstand';
}

/* Dokumentbibliothek zur Laufzeit um das visuelle Template ergänzen. */
if(typeof fp1104LoadCatalog==='function'){
  const fp1104fLoadCatalogBase=fp1104LoadCatalog;
  fp1104LoadCatalog=async function(){
    const c=await fp1104fLoadCatalogBase();
    const s=c?.schemas?.find(x=>x.key===FP1104F.template.key);
    if(s){
      s.visualTemplate={
        status:'template-test',
        card:FP1104F.template.card,
        pages:{
          front:{orientation:'landscape',zones:FP1104F.template.front.zones},
          back:{orientation:'landscape',zones:{}}
        }
      };
    }
    return c;
  };
}

function fp1104fLicenceCaptureHtml(context,schema){
  fp1104dCaptureState(context,schema);
  const st=FP1104D.captures[context];
  const pages=fp1104dPages(context);
  return `<div id="fp1104d-capture-${context}">
    <div class="fp1104-status"><b>Geführter Karten-Scan.</b> Karte jeweils vollständig in den weißen Rahmen legen. Vorder- und Rückseite werden getrennt aufgenommen.</div>
    ${pages.map((p,i)=>{
      const slot=st.slots[p.key];
      return `<div class="fp1104f-page ${slot?'done':''}" id="fp1104f-page-${context}-${p.key}">
        <b>${i+1} · ${fp1104Esc(p.label)}</b>
        <div class="muted">${p.key==='front'?'Felder 1, 2 und 3 werden anschließend aus festen Positionen gelesen.':'Rückseite wird für diesen ersten Template-Test geführt aufgenommen; Klassen folgen in einem späteren Schritt.'}</div>
        <div class="fp1104f-actions">
          <button type="button" onclick="fp1104fOpenCamera('${context}','${p.key}','${fp1104Esc(p.label)}')">📷 Geführt aufnehmen</button>
          <label class="fp1104f-filebtn">📄 Datei auswählen
            <input type="file" accept="image/*,application/pdf" onchange="fp1104fPickFile('${context}','${p.key}',this)">
          </label>
        </div>
        <div class="fp1104d-pagestatus" id="fp1104d-status-${context}-${p.key}">${slot?fp1104Esc(slot.name):'noch nicht erfasst'}</div>
      </div>`;
    }).join('')}
  </div>`;
}

if(typeof fp1104dCaptureHtml==='function'){
  const fp1104fCaptureHtmlBase=fp1104dCaptureHtml;
  fp1104dCaptureHtml=function(context,schema){
    if(schema?.key===FP1104F.template.key)return fp1104fLicenceCaptureHtml(context,schema);
    return fp1104fCaptureHtmlBase(context,schema);
  };
}

async function fp1104fOpenCamera(context,pageKey,pageLabel){
  FP1104F.context=context;FP1104F.pageKey=pageKey;FP1104F.pageLabel=pageLabel;
  fp1104fCloseCamera();
  const modal=document.createElement('div');modal.className='fp1104f-modal';modal.id='fp1104fModal';
  modal.innerHTML=`<div class="fp1104f-camtop"><b>${fp1104Esc(pageLabel)} · Führerschein</b><button onclick="fp1104fCloseCamera()">✕</button></div>
    <div class="fp1104f-view" id="fp1104fView">
      <video id="fp1104fVideo" autoplay playsinline muted></video>
      <div class="fp1104f-guide" id="fp1104fGuide"></div>
      <div class="fp1104f-camhint">Karte gerade halten und alle vier Außenkanten möglichst genau an den weißen Rahmen legen.</div>
    </div>
    <div class="fp1104f-cambottom"><button onclick="fp1104fCloseCamera()">Abbrechen</button><button class="primary" id="fp1104fShoot" onclick="fp1104fShoot()">Aufnehmen</button></div>`;
  document.body.appendChild(modal);
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:2560},height:{ideal:1440}},audio:false});
    FP1104F.stream=stream;
    const v=document.getElementById('fp1104fVideo');v.srcObject=stream;await v.play();
  }catch(e){
    fp1104fCloseCamera();
    alert('Kamera konnte nicht geöffnet werden: '+(e?.message||e));
  }
}
function fp1104fCloseCamera(){
  if(FP1104F.stream){for(const t of FP1104F.stream.getTracks())t.stop();FP1104F.stream=null}
  document.getElementById('fp1104fModal')?.remove();
}
function fp1104fCanvasBlob(c,type='image/jpeg',quality=.94){
  return new Promise(res=>c.toBlob(res,type,quality));
}
async function fp1104fShoot(){
  const v=document.getElementById('fp1104fVideo'),view=document.getElementById('fp1104fView'),g=document.getElementById('fp1104fGuide');
  if(!v||!view||!g||!v.videoWidth)return;
  const vr=view.getBoundingClientRect(),gr=g.getBoundingClientRect();
  const scale=Math.max(vr.width/v.videoWidth,vr.height/v.videoHeight);
  const shownW=v.videoWidth*scale,shownH=v.videoHeight*scale;
  const offsetX=(shownW-vr.width)/2,offsetY=(shownH-vr.height)/2;
  const rx=gr.left-vr.left,ry=gr.top-vr.top;
  const sx=Math.max(0,(rx+offsetX)/scale),sy=Math.max(0,(ry+offsetY)/scale);
  const sw=Math.min(v.videoWidth-sx,gr.width/scale),sh=Math.min(v.videoHeight-sy,gr.height/scale);

  const c=document.createElement('canvas');c.width=FP1104F.normalizedWidth;c.height=FP1104F.normalizedHeight;
  const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
  ctx.drawImage(v,sx,sy,sw,sh,0,0,c.width,c.height);
  const blob=await fp1104fCanvasBlob(c);
  const st=FP1104D.captures[FP1104F.context];
  if(st){
    st.slots[FP1104F.pageKey]={blob,name:`${FP1104F.pageLabel} · geführt aufgenommen`,normalized:true};
    fp1104dRefreshPage(FP1104F.context,FP1104F.pageKey);
  }
  fp1104fCloseCamera();
}

async function fp1104fNormalizeBlob(blob){
  const bmp=await createImageBitmap(blob),ratio=FP1104F.template.card.aspect;
  let sx=0,sy=0,sw=bmp.width,sh=bmp.height;
  const srcRatio=bmp.width/bmp.height;
  if(srcRatio>ratio){sw=bmp.height*ratio;sx=(bmp.width-sw)/2}
  else {sh=bmp.width/ratio;sy=(bmp.height-sh)/2}
  const c=document.createElement('canvas');c.width=FP1104F.normalizedWidth;c.height=FP1104F.normalizedHeight;
  c.getContext('2d').drawImage(bmp,sx,sy,sw,sh,0,0,c.width,c.height);bmp.close?.();
  return fp1104fCanvasBlob(c);
}
async function fp1104fPickFile(context,pageKey,input){
  const f=input.files?.[0];if(!f)return;
  try{
    let blob=f;
    if(f.type==='application/pdf'){
      const pages=await fp1104dPdfPages(f);if(!pages.length)throw new Error('PDF enthält keine lesbare Seite.');
      blob=pages[0];
    }
    blob=await fp1104fNormalizeBlob(blob);
    const st=FP1104D.captures[context];
    if(st){st.slots[pageKey]={blob,name:`${f.name} · auf Kartenformat normalisiert`,normalized:true};fp1104dRefreshPage(context,pageKey)}
  }catch(e){alert('Datei konnte nicht vorbereitet werden: '+(e?.message||e))}
}

async function fp1104fZoneCanvas(blob,z){
  const bmp=await createImageBitmap(blob);
  const sx=Math.round(bmp.width*z.x),sy=Math.round(bmp.height*z.y),sw=Math.round(bmp.width*z.w),sh=Math.round(bmp.height*z.h);
  const scale=Math.max(2,Math.min(4,1300/Math.max(1,sw)));
  const c=document.createElement('canvas');c.width=Math.round(sw*scale);c.height=Math.round(sh*scale);
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
  ctx.drawImage(bmp,sx,sy,sw,sh,0,0,c.width,c.height);bmp.close?.();
  return typeof fp1104dEnhanceCanvas==='function'?fp1104dEnhanceCanvas(c):c;
}
function fp1104fCleanLine(v,fieldNo){
  let s=String(v||'').replace(/\r?\n/g,' ').replace(/\s+/g,' ').trim();
  s=s.replace(new RegExp('^\\s*'+fieldNo.replace('.','\\.')+'\\s*[.:;\\-]?\\s*','i'),'');
  return s.trim();
}
function fp1104fFindDate(v){
  const m=String(v||'').match(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\b/);
  return m?fp1104DateIso(m[0]):'';
}
async function fp1104fOcrZone(blob,key,z,statusId){
  await fp1104EnsureOCR();
  const status=document.getElementById(statusId);if(status)status.textContent=`Template liest ${z.label} …`;
  const c=await fp1104fZoneCanvas(blob,z);
  const r=await Tesseract.recognize(c,'deu+eng',{tessedit_pageseg_mode:String(z.psm||7),logger:m=>{const b=document.getElementById('fp1104-ocrbar');if(b&&m.status==='recognizing text')b.style.width=Math.round((m.progress||0)*100)+'%'}});
  const raw=r.data?.text||'';
  FP1104F.lastZoneDebug.push({key,label:z.label,raw,image:c.toDataURL('image/jpeg',.82)});
  return raw;
}
async function fp1104fExtractIdentity(context,statusId){
  const st=FP1104D.captures[context];if(!st)throw new Error('Scan fehlt.');
  const front=st.slots.front?.blob,back=st.slots.back?.blob;
  if(!front)throw new Error('Vorderseite fehlt.');
  if(!back)throw new Error('Rückseite fehlt.');
  FP1104F.lastZoneDebug=[];
  const z=FP1104F.template.front.zones;
  const lastRaw=await fp1104fOcrZone(front,'lastName',z.lastName,statusId);
  const firstRaw=await fp1104fOcrZone(front,'firstName',z.firstName,statusId);
  const birthRaw=await fp1104fOcrZone(front,'birth',z.birth,statusId);
  return {
    lastName:fp1104fCleanLine(lastRaw,'1'),
    firstName:fp1104fCleanLine(firstRaw,'2'),
    birthDate:fp1104fFindDate(birthRaw),
    birthPlace:'',
    documentNumber:'',
    expiryDate:'',
    classes:[],
    qualifications:[],
    _birthRaw:fp1104fCleanLine(birthRaw,'3')
  };
}
function fp1104fRenderDebug(host){
  if(!host||!FP1104F.lastZoneDebug.length)return;
  host.querySelector('#fp1104fTemplateDebug')?.remove();
  const d=document.createElement('div');d.id='fp1104fTemplateDebug';d.className='card';
  d.innerHTML=`<div class="section first">Template-Diagnose · feste Lesebereiche</div>
    <p class="muted">Damit prüfen wir, ob die drei Bereiche geometrisch richtig sitzen. Noch keine endgültige Produktansicht.</p>
    <div class="fp1104f-debuggrid">${FP1104F.lastZoneDebug.map(x=>`<div class="fp1104f-zone"><img src="${x.image}"><b>${fp1104Esc(x.label)}</b><div>${fp1104Esc(String(x.raw||'').replace(/\s+/g,' ').trim()||'– nichts gelesen –')}</div></div>`).join('')}</div>`;
  host.appendChild(d);
}

/* Neuer Personendatensatz: beim deutschen Kartenführerschein keine Vollseiten-OCR mehr. */
if(typeof fp1104RunNewPersonScan==='function'){
  const fp1104fNewPersonBase=fp1104RunNewPersonScan;
  fp1104RunNewPersonScan=async function(){
    const s=fp1104dSchemaByKey(document.getElementById('fp1104dNewPersonSchema')?.value||'');
    if(s?.key!==FP1104F.template.key)return fp1104fNewPersonBase();
    const status=document.getElementById('fp1104PersonStatus');
    try{
      const p=await fp1104fExtractIdentity('newperson','fp1104PersonStatus');
      FP1104.scan.schema=s;FP1104.scan.parsed=p;
      FP1104.scan.text=`TEMPLATE FELD 1: ${p.lastName}\nTEMPLATE FELD 2: ${p.firstName}\nTEMPLATE FELD 3: ${p._birthRaw}`;
      if(status)status.innerHTML='<b>Visuelles Führerschein-Template ausgewertet.</b> Testfelder: Nachname, Vorname, Geburtsdatum.';
      fp1104RenderNewPersonReview(p,s);
      fp1104fRenderDebug(document.getElementById('fp1104PersonNext'));
    }catch(e){if(status)status.textContent='Fehler: '+(e?.message||e)}
  };
}

/* Identity Check nutzt dieselben festen Zonen. */
if(typeof fp1104RunIdentityCheck==='function'){
  const fp1104fIdentityBase=fp1104RunIdentityCheck;
  fp1104RunIdentityCheck=async function(){
    const s=fp1104dSchemaByKey(document.getElementById('fp1104dIdentitySchema')?.value||'');
    if(s?.key!==FP1104F.template.key)return fp1104fIdentityBase();
    const status=document.getElementById('fp1104PersonStatus');
    try{
      const p=await fp1104fExtractIdentity('identity','fp1104PersonStatus');
      FP1104.scan.schema=s;FP1104.scan.identityParsed=p;
      FP1104.scan.text=`TEMPLATE FELD 1: ${p.lastName}\nTEMPLATE FELD 2: ${p.firstName}\nTEMPLATE FELD 3: ${p._birthRaw}`;
      fp1104RenderIdentityReview(p);
      if(status)status.innerHTML='<b>Referenzdokument über feste Führerschein-Zonen gelesen.</b>';
      fp1104fRenderDebug(document.getElementById('fp1104PersonNext'));
    }catch(e){if(status)status.textContent='Fehler: '+(e?.message||e)}
  };
}

if(typeof render==='function'){
  const fp1104fRenderBase=render;
  render=function(){const r=fp1104fRenderBase();setTimeout(fp1104fSetVersion,0);return r};
}
fp1104fSetVersion();
