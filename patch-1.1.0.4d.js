/* MOBIMORY 1.1.0.4d-dev – geführte Mehrseiten-Erfassung + Datei/PDF + Bildaufbereitung
   - Dokumentbibliothek bestimmt Anzahl/Reihenfolge der Seiten/Ansichten
   - Kamera und Dateiimport sind getrennt
   - PDF kann als komplettes Dokument importiert und auf Seiten verteilt werden
   - Bildaufbereitung vor OCR
   - gilt für Fahrzeug- und Personendokumente
*/
const FP1104D_VERSION='1.1.0.4d-dev';
const FP1104D={captures:{},pdfLoading:false};

(function(){
  if(document.getElementById('fp1104d-style'))return;
  const s=document.createElement('style');s.id='fp1104d-style';s.textContent=`
    .fp1104d-pages{display:grid;gap:10px;margin:10px 0}
    .fp1104d-page{border:1px solid rgba(120,120,120,.24);border-radius:11px;padding:11px}
    .fp1104d-page.done{border-width:2px}
    .fp1104d-page h4{margin:0 0 4px}
    .fp1104d-pick{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
    .fp1104d-filebtn{display:inline-flex;align-items:center;gap:6px;padding:9px 12px;border:1px solid rgba(120,120,120,.3);border-radius:9px;cursor:pointer}
    .fp1104d-filebtn input{display:none}
    .fp1104d-pagestatus{font-size:.82rem;opacity:.75;margin-top:6px;word-break:break-word}
    .fp1104d-unknown{padding:9px 10px;border-radius:9px;background:rgba(220,150,20,.09);margin:8px 0}
    .fp1104d-quality{padding:8px 10px;border-radius:9px;margin:8px 0;background:rgba(80,120,180,.06)}
    .fp1104d-schema-grid{display:grid;grid-template-columns:minmax(220px,1fr) minmax(220px,1fr);gap:10px}
    @media(max-width:700px){.fp1104d-schema-grid{grid-template-columns:1fr}}
  `;document.head.appendChild(s);
})();

function fp1104dSetVersion(){
  const f=document.querySelector('footer');
  if(f)f.textContent='Fahrzeugplattform · '+FP1104D_VERSION+' · © 2026 Entwicklungsstand';
}
function fp1104dPersonSchemas(){
  const c=FP1104.config||fp1104LoadLocalConfig();
  const countries=new Set([...(c.personCountries||[]),'EU']);
  const tags=new Set();
  if(c.vehicleTypes?.road)tags.add('road_user');
  if(c.vehicleTypes?.water)tags.add('water_user');
  const enabled=new Set(c.enabledSchemas||[]);
  return (FP1104.catalog?.schemas||[]).filter(s=>s.domain==='person'&&countries.has(s.country)&&s.appliesTo?.some(t=>tags.has(t)))
    .sort((a,b)=>(enabled.has(b.key)?1:0)-(enabled.has(a.key)?1:0)||String(a.documentType).localeCompare(String(b.documentType),'de'));
}
function fp1104dSchemaByKey(key){return (FP1104.catalog?.schemas||[]).find(s=>s.key===key)||null}
function fp1104dDefaultPages(schema){
  const p=schema?.capture?.pages;
  if(Array.isArray(p)&&p.length)return p.map(x=>({...x}));
  return [{key:'page1',label:'Dokumentseite 1',required:true,purpose:'Seite vollständig erfassen',fallback:true}];
}
function fp1104dCaptureState(context,schema){
  const old=FP1104D.captures[context];
  if(old?.schemaKey===schema?.key)return old;
  const state={schemaKey:schema?.key||'',schema,slots:{},texts:{},manualExtra:0};
  FP1104D.captures[context]=state;return state;
}
function fp1104dPages(context){
  const st=FP1104D.captures[context];if(!st)return[];
  const base=fp1104dDefaultPages(st.schema);
  for(let i=1;i<=st.manualExtra;i++)base.push({key:'extra'+i,label:'Weitere Seite '+i,required:false,purpose:'zusätzliche Dokumentseite',fallback:true});
  return base;
}
function fp1104dAddExtraPage(context){
  const st=FP1104D.captures[context];if(!st)return;
  st.manualExtra++;
  fp1104dRenderCapture(context,document.getElementById('fp1104d-capture-'+context)?.parentElement);
}
function fp1104dCaptureHtml(context,schema){
  fp1104dCaptureState(context,schema);
  const st=FP1104D.captures[context],pages=fp1104dPages(context);
  const pending=schema?.capture?.structureStatus!=='official';
  return `<div id="fp1104d-capture-${context}">
    ${pending?`<div class="fp1104d-unknown"><b>Seitenaufbau noch nicht vollständig vorbereitet.</b> Für diesen Dokumenttyp kennt die Bibliothek die offizielle Seitenstruktur noch nicht vollständig. Zum Test ist eine erste Seite angelegt; weitere Seiten können ergänzt werden.</div>`:''}
    <div class="field"><label>Komplettes Dokument importieren</label>
      <input type="file" accept="image/*,application/pdf" multiple onchange="fp1104dImportWhole('${context}',this)">
      <div class="muted">PDF oder mehrere Bilder auswählen. Seiten werden der Reihe nach zugeordnet.</div>
    </div>
    <div class="fp1104d-pages">
      ${pages.map((p,i)=>`<div class="fp1104d-page ${st.slots[p.key]?'done':''}" id="fp1104d-page-${context}-${p.key}">
        <h4>${i+1} · ${fp1104Esc(p.label)}</h4>
        <div class="muted">${fp1104Esc(p.purpose||'')}</div>
        <div class="fp1104d-pick">
          <label class="fp1104d-filebtn">📷 Foto aufnehmen
            <input type="file" accept="image/*" capture="environment" onchange="fp1104dPickPage('${context}','${p.key}',this)">
          </label>
          <label class="fp1104d-filebtn">📄 Datei auswählen
            <input type="file" accept="image/*,application/pdf" onchange="fp1104dPickPage('${context}','${p.key}',this)">
          </label>
        </div>
        <div class="fp1104d-pagestatus" id="fp1104d-status-${context}-${p.key}">${st.slots[p.key]?.name?fp1104Esc(st.slots[p.key].name):p.required?'noch nicht erfasst':'optional'}</div>
      </div>`).join('')}
    </div>
    ${pending?`<button type="button" onclick="fp1104dAddExtraPage('${context}')">+ weitere Seite ergänzen</button>`:''}
  </div>`;
}
function fp1104dRenderCapture(context,host,schema=null){
  const st=FP1104D.captures[context];
  schema=schema||st?.schema;if(!host||!schema)return;
  host.innerHTML=fp1104dCaptureHtml(context,schema);
}
async function fp1104dPickPage(context,key,input){
  const f=input.files?.[0];if(!f)return;
  const st=FP1104D.captures[context];if(!st)return;
  if(f.type==='application/pdf'){
    const pages=await fp1104dPdfPages(f);
    if(!pages.length)return alert('PDF enthält keine lesbare Seite.');
    st.slots[key]={blob:pages[0],name:`${f.name} · PDF-Seite 1`};
  }else st.slots[key]={blob:f,name:f.name||'Foto'};
  fp1104dRefreshPage(context,key);
}
function fp1104dRefreshPage(context,key){
  const st=FP1104D.captures[context],slot=st?.slots?.[key];
  const box=document.getElementById(`fp1104d-page-${context}-${key}`),status=document.getElementById(`fp1104d-status-${context}-${key}`);
  if(box)box.classList.toggle('done',!!slot);if(status)status.textContent=slot?.name||'noch nicht erfasst';
}
async function fp1104dImportWhole(context,input){
  const st=FP1104D.captures[context];if(!st)return;
  const imported=[];
  for(const f of [...(input.files||[])]){
    if(f.type==='application/pdf'){
      const pages=await fp1104dPdfPages(f);
      pages.forEach((b,i)=>imported.push({blob:b,name:`${f.name} · PDF-Seite ${i+1}`}));
    }else imported.push({blob:f,name:f.name||'Bild'});
  }
  if(!imported.length)return;
  const defs=fp1104dPages(context);
  while(imported.length>defs.length){
    st.manualExtra++;
    defs.push({key:'extra'+st.manualExtra,label:'Weitere Seite '+st.manualExtra,required:false,purpose:'zusätzliche Dokumentseite',fallback:true});
  }
  imported.forEach((x,i)=>{if(defs[i])st.slots[defs[i].key]=x});
  const host=document.getElementById('fp1104d-capture-'+context)?.parentElement;
  if(host)fp1104dRenderCapture(context,host,st.schema);
}
async function fp1104dEnsurePdf(){
  if(window.pdfjsLib)return;
  if(FP1104D.pdfLoading){while(FP1104D.pdfLoading)await new Promise(r=>setTimeout(r,80));return}
  FP1104D.pdfLoading=true;
  try{
    await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';s.onload=res;s.onerror=()=>rej(new Error('PDF-Modul konnte nicht geladen werden.'));document.head.appendChild(s)});
    if(window.pdfjsLib)pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }finally{FP1104D.pdfLoading=false}
}
async function fp1104dPdfPages(file){
  await fp1104dEnsurePdf();
  const data=await file.arrayBuffer(),pdf=await pdfjsLib.getDocument({data}).promise,out=[];
  for(let n=1;n<=pdf.numPages;n++){
    const page=await pdf.getPage(n),vp=page.getViewport({scale:2.0}),c=document.createElement('canvas');
    c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);
    await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
    const blob=await new Promise(res=>c.toBlob(res,'image/png',1));if(blob)out.push(blob);
  }
  return out;
}
async function fp1104dImageCanvas(blob){
  const bmp=await createImageBitmap(blob);
  const maxDim=Math.max(bmp.width,bmp.height),target=maxDim<1700?2200:Math.min(2800,maxDim),scale=target/maxDim;
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(bmp.width*scale));c.height=Math.max(1,Math.round(bmp.height*scale));
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(bmp,0,0,c.width,c.height);
  bmp.close?.();
  return c;
}
function fp1104dEnhanceCanvas(c){
  const out=document.createElement('canvas');out.width=c.width;out.height=c.height;const ctx=out.getContext('2d',{willReadFrequently:true});ctx.drawImage(c,0,0);
  const img=ctx.getImageData(0,0,out.width,out.height),d=img.data,h=new Uint32Array(256);
  for(let i=0;i<d.length;i+=4){const y=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);h[y]++}
  const total=out.width*out.height,lowN=total*.01,highN=total*.99;let acc=0,lo=0,hi=255;
  for(let i=0;i<256;i++){acc+=h[i];if(acc>=lowN){lo=i;break}}
  acc=0;for(let i=0;i<256;i++){acc+=h[i];if(acc>=highN){hi=i;break}}
  const span=Math.max(30,hi-lo);
  for(let i=0;i<d.length;i+=4){let y=.299*d[i]+.587*d[i+1]+.114*d[i+2];y=Math.max(0,Math.min(255,(y-lo)*255/span));const v=Math.round(y);d[i]=d[i+1]=d[i+2]=v}
  ctx.putImageData(img,0,0);return out;
}
function fp1104dQuality(text){
  const s=String(text||'');if(!s)return 0;
  const useful=(s.match(/[A-Za-zÄÖÜäöüß0-9]/g)||[]).length,weird=(s.match(/[©®|{}\[\]<>~]/g)||[]).length;
  return Math.max(0,Math.min(1,useful/Math.max(1,s.length)-weird/Math.max(1,s.length)*1.5));
}
async function fp1104dOcrBlob(blob,statusId,label){
  await fp1104EnsureOCR();const status=document.getElementById(statusId);
  if(status)status.textContent=`${label} wird aufbereitet …`;
  const raw=await fp1104dImageCanvas(blob),enh=fp1104dEnhanceCanvas(raw);
  if(status)status.textContent=`${label} wird gelesen …`;
  const r=await Tesseract.recognize(enh,'deu+eng',{logger:m=>{const b=document.getElementById('fp1104-ocrbar');if(b&&m.status==='recognizing text')b.style.width=Math.round((m.progress||0)*100)+'%'}});
  return r.data?.text||'';
}
async function fp1104dCollect(context,statusId){
  const st=FP1104D.captures[context];if(!st)throw new Error('Dokumenttyp fehlt.');
  const defs=fp1104dPages(context);
  for(const p of defs)if(p.required&&!st.slots[p.key])throw new Error(`${p.label} fehlt.`);
  const texts={},parts=[];let idx=0;
  for(const p of defs){
    const slot=st.slots[p.key];if(!slot)continue;idx++;
    const t=await fp1104dOcrBlob(slot.blob,statusId,`${p.label} (${idx}/${Object.keys(st.slots).length})`);
    texts[p.key]=t;parts.push(`--- ${p.label.toUpperCase()} ---\n${t}`);
  }
  st.texts=texts;return {texts,combined:parts.join('\n\n'),quality:fp1104dQuality(parts.join('\n'))};
}
function fp1104dStrictLicenceClasses(text){
  const known=['AM','A1','A2','A','B','BE','C1','C1E','C','CE','D1','D1E','D','DE','L','T'],out=[];
  const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  for(const c of known){
    const rx=new RegExp('^'+c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s+(?:\\d{1,2}[.\\/-]\\d{1,2}[.\\/-]\\d{2,4}|[-*—])','i');
    if(lines.some(l=>rx.test(l)))out.push(c);
  }
  return out;
}
function fp1104dParsePerson(schema,texts,combined){
  if(schema?.key==='DE_FEV_FUEHRERSCHEIN_EU'){
    const p=fp1104ParseDrivingLicence(texts.front||combined);p.classes=fp1104dStrictLicenceClasses(texts.back||'');p.qualifications=p.classes;return p;
  }
  return fp1104ParseQualification(combined,schema);
}

/* VEHICLE FLOW */
fp1104bSelectFamily=function(family){
  FP1104.scan.vehicleFamily=family;FP1104.scan.schema=null;FP1104.scan.parsed=null;
  const rows=fp1104bConfiguredVehicleSchemas(family);
  document.querySelectorAll('[data-fp1104b-family]').forEach(b=>b.classList.toggle('active',b.dataset.fp1104bFamily===family));
  const area=document.getElementById('fp1104bDocArea');if(!area)return;
  area.innerHTML=`<div class="section">2 · Dokument auswählen</div>
    <p class="muted">Die genaue Dokumentart wird vor dem Scan gewählt. Dadurch kennt MobiMory auch den erwarteten Seitenaufbau.</p>
    <div class="field"><label>Dokumentart</label><select id="fp1104dVehicleSchema" onchange="fp1104dVehicleSchemaChanged()"><option value="">– auswählen –</option>${rows.map(s=>`<option value="${fp1104Esc(s.key)}">${fp1104Esc(s.documentType)}</option>`).join('')}</select></div>
    <div id="fp1104dVehicleCapture"></div>
    <div class="fp1104-progress"><div id="fp1104-ocrbar"></div></div>
    <div id="fp1104VehicleStatus" class="fp1104-status">Dokumentart auswählen.</div>
    <button class="primary" onclick="fp1104RunVehicleScan()">Dokument auslesen</button>`;
  const review=document.getElementById('fp1104VehicleReview');if(review)review.innerHTML='';
}
function fp1104dVehicleSchemaChanged(){
  const schema=fp1104dSchemaByKey(document.getElementById('fp1104dVehicleSchema')?.value||'');if(!schema)return;
  FP1104.scan.schema=schema;const host=document.getElementById('fp1104dVehicleCapture');if(host)fp1104dRenderCapture('vehicle',host,schema);
}
fp1104RunVehicleScan=async function(){
  const status=document.getElementById('fp1104VehicleStatus');
  try{
    const schema=fp1104dSchemaByKey(document.getElementById('fp1104dVehicleSchema')?.value||'')||FP1104.scan.schema;
    if(!schema)throw new Error('Bitte Dokumentart auswählen.');
    const r=await fp1104dCollect('vehicle','fp1104VehicleStatus');FP1104.scan.text=r.combined;FP1104.scan.schema=schema;
    const isRoad=schema.extractor==='de-zb1'||schema.extractor==='de-zb2'||schema.appliesTo?.includes('road_vehicle');
    const p=isRoad?fp1104ParseZB(r.combined):fp1104ParseWatercraft(r.combined);FP1104.scan.parsed=p;
    if(status)status.innerHTML=`<b>${fp1104Esc(schema.documentType)}</b> gelesen · OCR-Qualität grob ${Math.round(r.quality*100)} %`;
    fp1104RenderVehicleReview(p,schema);setTimeout(()=>{if(typeof fp1104cRenderOcrDebug==='function')fp1104cRenderOcrDebug()},0);
  }catch(e){if(status)status.textContent='Fehler: '+(e?.message||e)}
};

/* PERSON FLOW */
function fp1104dPersonSchemaSelect(id,onchange,filter='all'){
  const rows=fp1104dPersonSchemas();
  return `<div class="field"><label>Dokumentart</label><select id="${id}" onchange="${onchange}"><option value="">– auswählen –</option>${rows.map(s=>`<option value="${fp1104Esc(s.key)}">${fp1104Esc(s.documentType)}</option>`).join('')}</select></div>`;
}
fp1104PersonView=async function(){
  head(FP1104.scan.personId?'Nachweis aus Dokument':'Person aus Dokument','Smart Capture · geführt · 1.1.0.4d');
  await fp1104TryCloudConfig();await fp1104LoadCatalog();
  const pid=FP1104.scan.personId||String(S.personDetailId||'');
  FP1104.scan={mode:'person',personId:pid,phase:pid?'identity':'newperson',text:'',schema:null,parsed:null,files:[],identityOk:false,identityParsed:null};
  if(pid){
    let p=null;try{const api=await getCloud();p=await api.getItemByName('Personen',pid)}catch(e){failBox(e,'persons');return}
    const f=p.fields||{},anchor=fp1104ParseJson(f.IdentityAnchorJson1104,null);
    app.innerHTML=`<div class="card fp1104-lock"><div class="section first">1 · Identität bestätigen</div><p><b>${fp1104Esc(f.Anzeigename||f.Title)}</b></p>
      <p class="muted">Referenzdokument auswählen. MobiMory fordert anschließend genau die dafür hinterlegten Seiten an.</p>
      ${anchor?'<div class="fp1104-status">Identitätsanker vorhanden.</div>':'<div class="fp1104-status">Noch kein Identitätsanker vorhanden.</div>'}
      ${fp1104dPersonSchemaSelect('fp1104dIdentitySchema',"fp1104dIdentitySchemaChanged()")}
      <div id="fp1104dIdentityCapture"></div><div class="fp1104-progress"><div id="fp1104-ocrbar"></div></div>
      <div id="fp1104PersonStatus" class="fp1104-status">Dokumentart auswählen.</div><button class="primary" onclick="fp1104RunIdentityCheck()">Identität prüfen</button></div>
      <div id="fp1104PersonNext"></div>`;
  }else{
    app.innerHTML=`<div class="card"><div class="section first">Person aus Dokument anlegen</div>
      <p class="muted">Dokumentart auswählen. Vorder-/Rückseiten bzw. weitere Pflichtseiten werden danach einzeln geführt.</p>
      ${fp1104dPersonSchemaSelect('fp1104dNewPersonSchema',"fp1104dNewPersonSchemaChanged()")}
      <div id="fp1104dNewPersonCapture"></div><div class="fp1104-progress"><div id="fp1104-ocrbar"></div></div>
      <div id="fp1104PersonStatus" class="fp1104-status">Dokumentart auswählen.</div><button class="primary" onclick="fp1104RunNewPersonScan()">Dokument auslesen</button></div>
      <div id="fp1104PersonNext"></div>`;
  }
}
function fp1104dNewPersonSchemaChanged(){
  const s=fp1104dSchemaByKey(document.getElementById('fp1104dNewPersonSchema')?.value||'');if(!s)return;FP1104.scan.schema=s;
  const h=document.getElementById('fp1104dNewPersonCapture');if(h)fp1104dRenderCapture('newperson',h,s);
}
function fp1104dIdentitySchemaChanged(){
  const s=fp1104dSchemaByKey(document.getElementById('fp1104dIdentitySchema')?.value||'');if(!s)return;FP1104.scan.schema=s;
  const h=document.getElementById('fp1104dIdentityCapture');if(h)fp1104dRenderCapture('identity',h,s);
}
fp1104RunNewPersonScan=async function(){
  const status=document.getElementById('fp1104PersonStatus');
  try{
    const s=fp1104dSchemaByKey(document.getElementById('fp1104dNewPersonSchema')?.value||'');if(!s)throw new Error('Bitte Dokumentart auswählen.');
    const r=await fp1104dCollect('newperson','fp1104PersonStatus');FP1104.scan.text=r.combined;FP1104.scan.schema=s;
    const p=fp1104dParsePerson(s,r.texts,r.combined);FP1104.scan.parsed=p;
    if(status)status.innerHTML=`<b>${fp1104Esc(s.documentType)}</b> gelesen · OCR-Qualität grob ${Math.round(r.quality*100)} %`;
    fp1104RenderNewPersonReview(p,s);
  }catch(e){if(status)status.textContent='Fehler: '+(e?.message||e)}
}
fp1104RunIdentityCheck=async function(){
  const status=document.getElementById('fp1104PersonStatus');
  try{
    const s=fp1104dSchemaByKey(document.getElementById('fp1104dIdentitySchema')?.value||'');if(!s)throw new Error('Bitte Referenzdokument auswählen.');
    const r=await fp1104dCollect('identity','fp1104PersonStatus');FP1104.scan.text=r.combined;FP1104.scan.schema=s;
    const p=fp1104dParsePerson(s,r.texts,r.combined);FP1104.scan.identityParsed=p;fp1104RenderIdentityReview(p);
    if(status)status.innerHTML=`Referenzdokument gelesen · OCR-Qualität grob ${Math.round(r.quality*100)} %`;
  }catch(e){if(status)status.textContent='Fehler: '+(e?.message||e)}
}
fp1104RenderQualificationScan=function(){
  const box=document.getElementById('fp1104PersonNext');if(!box)return;
  box.innerHTML=`<div class="card"><div class="section first">2 · Neuen Befähigungsnachweis erfassen</div>
    ${fp1104dPersonSchemaSelect('fp1104dQualSchema',"fp1104dQualSchemaChanged()")}
    <div id="fp1104dQualCapture"></div><div class="fp1104-progress"><div id="fp1104-ocrbar"></div></div>
    <div id="fp1104QualStatus" class="fp1104-status">Identität bestätigt. Dokumentart auswählen.</div>
    <button class="primary" onclick="fp1104RunQualificationScan()">Nachweis auslesen</button></div><div id="fp1104QualReview"></div>`;
}
function fp1104dQualSchemaChanged(){
  const s=fp1104dSchemaByKey(document.getElementById('fp1104dQualSchema')?.value||'');if(!s)return;
  const h=document.getElementById('fp1104dQualCapture');if(h)fp1104dRenderCapture('qualification',h,s);
}
fp1104RunQualificationScan=async function(){
  const status=document.getElementById('fp1104QualStatus');
  try{
    const s=fp1104dSchemaByKey(document.getElementById('fp1104dQualSchema')?.value||'');if(!s)throw new Error('Bitte Dokumentart auswählen.');
    const r=await fp1104dCollect('qualification','fp1104QualStatus');FP1104.scan.text=r.combined;FP1104.scan.schema=s;
    const p=fp1104dParsePerson(s,r.texts,r.combined);FP1104.scan.parsed=p;
    if(status)status.innerHTML=`<b>${fp1104Esc(s.documentType)}</b> gelesen · OCR-Qualität grob ${Math.round(r.quality*100)} %`;
    const b=document.getElementById('fp1104QualReview');b.innerHTML=`<div class="card"><div class="section first">Nachweis prüfen</div>
      <div class="field"><label>Erkannte Befähigungen (kommagetrennt, korrigierbar)</label><input id="scqQuals" value="${fp1104Esc((p.qualifications||[]).join(', '))}"></div>
      ${FP1104.config.personal.documentNumber?fp1104Input('scqDocNo','Dokumentnummer',p.documentNumber||''):''}
      ${FP1104.config.personal.expiryDate?fp1104Input('scqExpiry','Gültig bis',p.expiryDate||'','date'):''}
      <label class="checkrow"><input id="scqStoreCopy" type="checkbox" ${FP1104.config.personal.documentCopy?'checked':''}> Dokumentkopie lokal auf diesem Gerät speichern</label>
      <button class="primary" onclick="fp1104SaveQualificationScan()">Nachweis hinzufügen</button></div>`;
  }catch(e){if(status)status.textContent='Fehler: '+(e?.message||e)}
}

/* document-copy compatibility: collect page blobs instead of old single input */
const fp1104dStoreCopyBase=fp1104StoreCopy;
fp1104StoreCopy=async function(files){
  if(files?.length)return fp1104dStoreCopyBase(files);
  const contexts=['vehicle','newperson','identity','qualification'];
  for(const c of contexts){
    const st=FP1104D.captures[c];if(!st)continue;
    const blobs=Object.values(st.slots).map(x=>x.blob).filter(Boolean);
    if(blobs.length)return fp1104dStoreCopyBase(blobs);
  }
  return'';
}

/* version survives later renders */
if(typeof render==='function'){
  const fp1104dRenderBase=render;
  render=function(){const r=fp1104dRenderBase();setTimeout(fp1104dSetVersion,0);return r}
}
fp1104dSetVersion();
