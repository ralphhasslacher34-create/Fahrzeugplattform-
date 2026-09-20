/* MOBIMORY 1.1.0.4h-dev – verifizierte/angelernte visuelle Dokumenttemplates
   Grundsatz: keine geschätzten Feldkoordinaten.
   Wenn kein belastbares visuelles Template vorhanden ist:
   - MobiMory meldet das ausdrücklich
   - Dokument einmal anlernen
   - Außenmaß festlegen (nur bekannte Maße vorbefüllt)
   - Dokumentbereich markieren
   - benötigte Felder nacheinander mit Finger/Stift markieren
   - Template je Dokumenttyp/Seite speichern
   - spätere Scans verwenden den daraus erzeugten passenden Rahmen + Feldzonen
*/
const FP1104H_VERSION='1.1.0.4h-dev';

const FP1104H={
  trainer:null,
  camera:null,
  templateCache:{},
  // Nur Maße, die wir als bekannt behandeln. Keine Feldpositionen.
  verifiedDimensions:{
    DE_FEV_FUEHRERSCHEIN_EU:{
      widthMm:85.60,heightMm:53.98,
      source:'ISO 7810 ID-1 / amtliches EU-Kartenformat',
      verified:true
    }
  }
};

(function(){
  if(document.getElementById('fp1104h-style'))return;
  const s=document.createElement('style');s.id='fp1104h-style';s.textContent=`
    .fp1104h-status{padding:11px 12px;border-radius:10px;margin:10px 0;background:rgba(220,150,20,.09);border:1px solid rgba(220,150,20,.22)}
    .fp1104h-status.ok{background:rgba(35,150,75,.09);border-color:rgba(35,150,75,.24)}
    .fp1104h-status b{display:block;margin-bottom:3px}
    .fp1104h-tools{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
    .fp1104h-modal{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.92);display:flex;flex-direction:column}
    .fp1104h-top{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 12px;background:#111;color:#fff}
    .fp1104h-body{flex:1;overflow:auto;padding:10px;background:#161616;color:#fff}
    .fp1104h-panel{max-width:1050px;margin:0 auto}
    .fp1104h-form{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:10px 0}
    .fp1104h-form label{display:block;font-size:.82rem;margin-bottom:3px}
    .fp1104h-form input{width:100%}
    .fp1104h-canvaswrap{position:relative;background:#222;border-radius:10px;overflow:hidden;touch-action:none;user-select:none}
    .fp1104h-canvaswrap canvas{display:block;width:100%;height:auto;touch-action:none}
    .fp1104h-instruction{padding:11px 12px;border-radius:9px;background:rgba(255,255,255,.10);margin:10px 0}
    .fp1104h-bottom{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;padding:10px 12px;background:#111}
    .fp1104h-guide-modal{position:fixed;inset:0;z-index:100001;background:#000;display:flex;flex-direction:column}
    .fp1104h-guide-view{position:relative;flex:1;overflow:hidden;background:#111}
    .fp1104h-guide-view video{width:100%;height:100%;object-fit:cover;display:block}
    .fp1104h-guide-box{position:absolute;left:50%;top:47%;transform:translate(-50%,-50%);border:3px solid #fff;border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,.42);pointer-events:none}
    .fp1104h-guide-hint{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);max-width:82%;background:rgba(0,0,0,.75);color:#fff;padding:8px 11px;border-radius:8px;text-align:center}
    .fp1104h-zone-summary{font-size:.85rem;opacity:.8;margin-top:5px}
    @media(max-width:700px){.fp1104h-form{grid-template-columns:1fr}}
  `;document.head.appendChild(s);
})();

function fp1104hSetVersion(){
  const f=document.querySelector('footer');
  if(f)f.textContent='Fahrzeugplattform · '+FP1104H_VERSION+' · © 2026 Entwicklungsstand';
  const sub=document.getElementById('sub');
  if(sub && /Smart Capture/i.test(sub.textContent||''))sub.textContent=(sub.textContent||'').replace(/1\.1\.0\.4[a-z]?/ig,'1.1.0.4h');
}
function fp1104hEsc(v){return typeof fp1104Esc==='function'?fp1104Esc(v):String(v??'')}
function fp1104hNorm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'')}

function fp1104hLocalTemplates(){
  try{return JSON.parse(localStorage.getItem('fp1104h-visual-templates')||'{}')||{}}catch{return{}}
}
function fp1104hSaveLocalTemplate(schemaKey,tpl){
  const all=fp1104hLocalTemplates();all[schemaKey]=tpl;
  localStorage.setItem('fp1104h-visual-templates',JSON.stringify(all));
  FP1104H.templateCache[schemaKey]=tpl;
}
function fp1104hLocalTemplate(schemaKey){return fp1104hLocalTemplates()[schemaKey]||null}

async function fp1104hLoadTemplate(schema){
  if(!schema?.key)return null;
  if(FP1104H.templateCache[schema.key])return FP1104H.templateCache[schema.key];
  const local=fp1104hLocalTemplate(schema.key);
  if(local){FP1104H.templateCache[schema.key]=local;return local}
  try{
    const api=await getCloud(),rows=await list(api,'DokumentSchemas1104');
    const row=rows.find(x=>x.fields.SchemaKey===schema.key);
    if(row?.fields?.SchemaJson){
      const j=JSON.parse(row.fields.SchemaJson);
      const t=j?.learnedVisualTemplate1104h||null;
      if(t){FP1104H.templateCache[schema.key]=t;return t}
    }
  }catch(e){console.warn('visual template load:',e)}
  return null;
}

async function fp1104hSaveCloudTemplate(schema,tpl){
  try{
    const api=await getCloud(),rows=await list(api,'DokumentSchemas1104');
    const row=rows.find(x=>x.fields.SchemaKey===schema.key);
    let j={...schema};
    if(row?.fields?.SchemaJson){try{j={...j,...JSON.parse(row.fields.SchemaJson)}}catch{}}
    j.learnedVisualTemplate1104h=tpl;
    j.visualTemplateStatus='learned';
    j.visualTemplateUpdatedAt=new Date().toISOString();
    const f={
      Title:schema.documentType||schema.key,
      SchemaKey:schema.key,Dokumentart:schema.documentType||'',Land:schema.country||'',
      Bereich:schema.domain||'',Status:String(schema.status||''),
      SchemaJson:JSON.stringify(j),QuelleUrl:schema.sourceUrl||'',
      QuelleTitel:schema.sourceTitle||'',AktualisiertAm:new Date().toISOString(),Aktiv:true
    };
    if(row)await api.updateItemByName('DokumentSchemas1104',row.id,f);
    else await api.createItemByName('DokumentSchemas1104',f);
  }catch(e){console.warn('visual template cloud save:',e)}
}

/* Felder, die MobiMory beim manuellen Anlernen abfragt.
   Das sind MobiMory-Zielfelder, keine geschätzten Positionen. */
function fp1104hTrainingFields(schema,pageKey){
  if(schema?.domain==='person'){
    if(schema.key==='DE_FEV_FUEHRERSCHEIN_EU'){
      if(pageKey==='back')return [
        {key:'qualification.classes',label:'Fahrerlaubnisklassen'},
        {key:'qualification.validFrom',label:'Erteilungsdatum je Klasse'},
        {key:'qualification.validTo',label:'Gültig bis je Klasse'},
        {key:'qualification.restrictions',label:'Beschränkungen / Zusatzangaben'}
      ];
      return [
        {key:'person.lastName',label:'Nachname'},
        {key:'person.firstName',label:'Vorname'},
        {key:'person.birthDate',label:'Geburtsdatum'},
        {key:'person.birthPlace',label:'Geburtsort'},
        {key:'document.issueDate',label:'Ausstellungsdatum'},
        {key:'document.expiryDate',label:'Ablaufdatum'},
        {key:'document.issuer',label:'Ausstellungsbehörde'},
        {key:'document.number',label:'Dokumentnummer'}
      ];
    }
    return [
      {key:'person.lastName',label:'Nachname'},
      {key:'person.firstName',label:'Vorname'},
      {key:'person.birthDate',label:'Geburtsdatum'},
      {key:'person.birthPlace',label:'Geburtsort'},
      {key:'document.number',label:'Dokumentnummer'},
      {key:'document.issueDate',label:'Ausstellungsdatum'},
      {key:'document.expiryDate',label:'Gültig bis'},
      {key:'qualification.kind',label:'Befähigung / Klasse / Geltungsbereich'}
    ];
  }
  return [
    {key:'vehicle.name',label:'Fahrzeug- / Bootsname'},
    {key:'vehicle.registration',label:'Kennzeichen / Registrierung'},
    {key:'vehicle.manufacturer',label:'Hersteller / Werft'},
    {key:'vehicle.model',label:'Modell / Typ'},
    {key:'vehicle.year',label:'Baujahr'},
    {key:'vehicle.identifier',label:'FIN / CIN / HIN / Rumpfnummer'},
    {key:'dimensions.length',label:'Länge'},
    {key:'dimensions.width',label:'Breite'},
    {key:'dimensions.height',label:'Höhe'},
    {key:'dimensions.draft',label:'Tiefgang'},
    {key:'dimensions.displacement',label:'Verdrängung'},
    {key:'vehicle.powerKw',label:'Motorleistung kW'}
  ];
}

function fp1104hSchemaStatusHtml(schema,tpl){
  const dim=FP1104H.verifiedDimensions[schema?.key]||null;
  if(tpl){
    const zoneCount=Object.values(tpl.pages||{}).reduce((n,p)=>n+Object.keys(p.zones||{}).length,0);
    return `<div class="fp1104h-status ok"><b>✓ Angelerntes visuelles Template vorhanden</b>
      <div>${fp1104hEsc(tpl.widthMm)} × ${fp1104hEsc(tpl.heightMm)} mm · ${zoneCount} Lesebereiche gespeichert.</div></div>`;
  }
  if(dim){
    return `<div class="fp1104h-status"><b>Visuelles Feldlayout nicht verifiziert</b>
      <div>Außenmaß ist bekannt: ${dim.widthMm} × ${dim.heightMm} mm. Feldpositionen werden nicht geschätzt. Dokument einmal anlernen oder später ein verifiziertes offizielles Template hinterlegen.</div></div>`;
  }
  return `<div class="fp1104h-status"><b>Kein verifiziertes visuelles Template vorhanden</b>
    <div>MobiMory schätzt weder Außenmaß noch Feldpositionen. Zum Anlernen Dokument einmal erfassen, reale Breite/Höhe angeben und die Felder markieren.</div></div>`;
}

async function fp1104hDecorateCapture(context,schema){
  if(!schema)return;
  const tpl=await fp1104hLoadTemplate(schema);
  const root=document.getElementById('fp1104d-capture-'+context);
  if(!root)return;
  root.querySelectorAll('.fp1104h-status,.fp1104h-template-tools').forEach(x=>x.remove());
  root.insertAdjacentHTML('afterbegin',fp1104hSchemaStatusHtml(schema,tpl));

  const pages=typeof fp1104dPages==='function'?fp1104dPages(context):[];
  const st=FP1104D?.captures?.[context];

  for(const p of pages){
    const old=document.getElementById(`fp1104h-tools-${context}-${p.key}`);old?.remove();
    const host=document.getElementById(`fp1104f-page-${context}-${p.key}`) || document.getElementById(`fp1104d-page-${context}-${p.key}`);
    if(!host)continue;
    const has=!!st?.slots?.[p.key],pageTpl=tpl?.pages?.[p.key];
    const tools=document.createElement('div');tools.className='fp1104h-template-tools fp1104h-tools';tools.id=`fp1104h-tools-${context}-${p.key}`;
    if(tpl){
      tools.innerHTML=`<button type="button" onclick="fp1104hOpenGuidedCamera('${context}','${p.key}','${fp1104hEsc(p.label)}','${schema.key}')">📐 Mit angelerntem Rahmen aufnehmen</button>
        ${has?`<button type="button" onclick="fp1104hStartTrainer('${context}','${p.key}','${schema.key}')">Template dieser Seite nachbearbeiten</button>`:''}`;
      if(pageTpl)tools.insertAdjacentHTML('beforeend',`<span class="fp1104h-zone-summary">${Object.keys(pageTpl.zones||{}).length} Felder</span>`);
    }else{
      tools.innerHTML=has
        ? `<button type="button" class="primary" onclick="fp1104hStartTrainer('${context}','${p.key}','${schema.key}')">Dokumentseite einmal anlernen</button>`
        : `<span class="muted">Nach der Aufnahme kann diese Seite einmal angelernt werden.</span>`;
    }
    host.appendChild(tools);
  }
}

async function fp1104hAfterSchemaChange(context,schema){
  setTimeout(()=>fp1104hDecorateCapture(context,schema),0);
}

/* Schema-Wechsel dekorieren. */
if(typeof fp1104dVehicleSchemaChanged==='function'){
  const b=fp1104dVehicleSchemaChanged;
  fp1104dVehicleSchemaChanged=function(){const r=b();const s=fp1104dSchemaByKey(document.getElementById('fp1104dVehicleSchema')?.value||'');fp1104hAfterSchemaChange('vehicle',s);return r}
}
if(typeof fp1104dNewPersonSchemaChanged==='function'){
  const b=fp1104dNewPersonSchemaChanged;
  fp1104dNewPersonSchemaChanged=function(){const r=b();const s=fp1104dSchemaByKey(document.getElementById('fp1104dNewPersonSchema')?.value||'');fp1104hAfterSchemaChange('newperson',s);return r}
}
if(typeof fp1104dIdentitySchemaChanged==='function'){
  const b=fp1104dIdentitySchemaChanged;
  fp1104dIdentitySchemaChanged=function(){const r=b();const s=fp1104dSchemaByKey(document.getElementById('fp1104dIdentitySchema')?.value||'');fp1104hAfterSchemaChange('identity',s);return r}
}
if(typeof fp1104dQualSchemaChanged==='function'){
  const b=fp1104dQualSchemaChanged;
  fp1104dQualSchemaChanged=function(){const r=b();const s=fp1104dSchemaByKey(document.getElementById('fp1104dQualSchema')?.value||'');fp1104hAfterSchemaChange('qualification',s);return r}
}

/* Nach Foto/Datei wird das Anlernen sofort angeboten. */
if(typeof fp1104dRefreshPage==='function'){
  const b=fp1104dRefreshPage;
  fp1104dRefreshPage=function(context,key){
    const r=b(context,key);
    const st=FP1104D?.captures?.[context],schema=st?.schema;
    setTimeout(()=>fp1104hDecorateCapture(context,schema),0);
    return r;
  };
}

/* ---------- TRAINER ---------- */
function fp1104hImageFromBlob(blob){
  return new Promise((res,rej)=>{const u=URL.createObjectURL(blob),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);res(im)};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('Bild konnte nicht geöffnet werden.'))};im.src=u});
}
function fp1104hClampRect(r,w,h){
  const x=Math.max(0,Math.min(w,r.x)),y=Math.max(0,Math.min(h,r.y));
  const x2=Math.max(0,Math.min(w,r.x+r.w)),y2=Math.max(0,Math.min(h,r.y+r.h));
  return {x:Math.min(x,x2),y:Math.min(y,y2),w:Math.abs(x2-x),h:Math.abs(y2-y)};
}
function fp1104hRectRelative(r,outer){
  return {
    x:(r.x-outer.x)/outer.w,
    y:(r.y-outer.y)/outer.h,
    w:r.w/outer.w,
    h:r.h/outer.h
  };
}
function fp1104hDrawTrainer(){
  const t=FP1104H.trainer;if(!t)return;
  const c=document.getElementById('fp1104hCanvas');if(!c)return;
  const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(t.image,0,0,c.width,c.height);
  ctx.lineWidth=Math.max(2,c.width/450);

  if(t.outer){
    ctx.strokeStyle='#00ff88';ctx.strokeRect(t.outer.x,t.outer.y,t.outer.w,t.outer.h);
  }
  for(let i=0;i<t.fields.length;i++){
    const r=t.zones[t.fields[i].key];if(!r)continue;
    ctx.strokeStyle=i===t.fieldIndex?'#ffe600':'#00b7ff';
    ctx.strokeRect(r.x,r.y,r.w,r.h);
    ctx.font=`${Math.max(14,c.width/55)}px sans-serif`;ctx.fillStyle=ctx.strokeStyle;
    ctx.fillText(t.fields[i].label,r.x+3,Math.max(18,r.y-4));
  }
  if(t.drag){
    ctx.strokeStyle='#ffe600';ctx.setLineDash([8,6]);
    ctx.strokeRect(t.drag.x,t.drag.y,t.drag.w,t.drag.h);ctx.setLineDash([]);
  }
}
function fp1104hTrainerInstruction(){
  const t=FP1104H.trainer,box=document.getElementById('fp1104hInstruction');if(!t||!box)return;
  if(!t.outer){
    box.innerHTML='<b>Schritt 1 · Dokumentbegrenzung</b><br>Ziehe mit Finger oder Stift ein Rechteck exakt um die Außenkante des Dokuments. Danach „Außenkante übernehmen“.';
    return;
  }
  const f=t.fields[t.fieldIndex];
  if(!f){
    box.innerHTML='<b>Alle gewünschten Felder markiert.</b><br>Template kann jetzt gespeichert werden.';
    return;
  }
  box.innerHTML=`<b>Markiere jetzt: ${fp1104hEsc(f.label)}</b><br>Mit Finger/Stift ein Rechteck nur um den Bereich ziehen, in dem der Inhalt dieses Feldes steht.`;
}
function fp1104hTrainerButtons(){
  const t=FP1104H.trainer,host=document.getElementById('fp1104hTrainerButtons');if(!t||!host)return;
  if(!t.outer){
    host.innerHTML='<button onclick="fp1104hCancelTrainer()">Abbrechen</button><button class="primary" onclick="fp1104hAcceptOuter()">Außenkante übernehmen</button>';
    return;
  }
  const f=t.fields[t.fieldIndex];
  if(f){
    host.innerHTML=`<button onclick="fp1104hCancelTrainer()">Abbrechen</button><button onclick="fp1104hSkipField()">Feld überspringen</button><button class="primary" onclick="fp1104hAcceptField()">Bereich übernehmen</button>`;
  }else{
    host.innerHTML='<button onclick="fp1104hCancelTrainer()">Abbrechen</button><button class="primary" onclick="fp1104hSaveTrainer()">Template speichern</button>';
  }
}
async function fp1104hStartTrainer(context,pageKey,schemaKey){
  const st=FP1104D?.captures?.[context],slot=st?.slots?.[pageKey],schema=fp1104dSchemaByKey(schemaKey);
  if(!slot?.blob)return alert('Bitte zuerst diese Dokumentseite aufnehmen oder importieren.');
  if(!schema)return alert('Dokumenttyp nicht gefunden.');

  const image=await fp1104hImageFromBlob(slot.blob),dim=FP1104H.verifiedDimensions[schemaKey]||null,existing=await fp1104hLoadTemplate(schema);
  const pageExisting=existing?.pages?.[pageKey]||null;

  FP1104H.trainer={
    context,pageKey,schema,slot,image,
    fields:fp1104hTrainingFields(schema,pageKey),
    fieldIndex:0,zones:{},drag:null,start:null,
    outer:slot.normalized?{x:0,y:0,w:image.naturalWidth,h:image.naturalHeight}:null,
    widthMm:existing?.widthMm||dim?.widthMm||'',
    heightMm:existing?.heightMm||dim?.heightMm||'',
    dimensionsVerified:!!dim,
    existingTemplate:existing
  };

  if(pageExisting?.zones){
    const outer=FP1104H.trainer.outer||{x:0,y:0,w:image.naturalWidth,h:image.naturalHeight};
    for(const [k,z] of Object.entries(pageExisting.zones)){
      FP1104H.trainer.zones[k]={x:outer.x+z.x*outer.w,y:outer.y+z.y*outer.h,w:z.w*outer.w,h:z.h*outer.h};
    }
  }

  const m=document.createElement('div');m.id='fp1104hTrainer';m.className='fp1104h-modal';
  m.innerHTML=`<div class="fp1104h-top"><b>Dokument anlernen · ${fp1104hEsc(schema.documentType)} · ${fp1104hEsc(pageKey)}</b><button onclick="fp1104hCancelTrainer()">✕</button></div>
    <div class="fp1104h-body"><div class="fp1104h-panel">
      <div class="fp1104h-form">
        <div><label>Reale Breite des Dokuments (mm)</label><input id="fp1104hWidth" type="number" step="0.01" value="${FP1104H.trainer.widthMm}"></div>
        <div><label>Reale Höhe des Dokuments (mm)</label><input id="fp1104hHeight" type="number" step="0.01" value="${FP1104H.trainer.heightMm}"></div>
      </div>
      <div class="muted">${dim?`Außenmaß aus bekannter Norm/Quelle vorbelegt: ${fp1104hEsc(dim.source)}.`:'Für diesen Dokumenttyp liegt kein verifiziertes Außenmaß vor. Bitte reale Maße messen und eintragen; MobiMory schätzt sie nicht.'}</div>
      <div id="fp1104hInstruction" class="fp1104h-instruction"></div>
      <div class="fp1104h-canvaswrap"><canvas id="fp1104hCanvas"></canvas></div>
    </div></div>
    <div id="fp1104hTrainerButtons" class="fp1104h-bottom"></div>`;
  document.body.appendChild(m);

  const c=document.getElementById('fp1104hCanvas');
  const max=1800,scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
  c.width=Math.max(1,Math.round(image.naturalWidth*scale));c.height=Math.max(1,Math.round(image.naturalHeight*scale));
  // Trainer coordinates are canvas coordinates; redraw outer if normalized image sizes differ.
  if(FP1104H.trainer.outer)FP1104H.trainer.outer={x:0,y:0,w:c.width,h:c.height};
  FP1104H.trainer.imageCanvasScale=scale;

  const pt=e=>{const r=c.getBoundingClientRect(),p=e.touches?.[0]||e;return {x:(p.clientX-r.left)*c.width/r.width,y:(p.clientY-r.top)*c.height/r.height}};
  const down=e=>{e.preventDefault();const p=pt(e);FP1104H.trainer.start=p;FP1104H.trainer.drag={x:p.x,y:p.y,w:0,h:0};fp1104hDrawTrainer()};
  const move=e=>{if(!FP1104H.trainer?.start)return;e.preventDefault();const p=pt(e),s=FP1104H.trainer.start;FP1104H.trainer.drag=fp1104hClampRect({x:s.x,y:s.y,w:p.x-s.x,h:p.y-s.y},c.width,c.height);fp1104hDrawTrainer()};
  const up=e=>{if(!FP1104H.trainer?.start)return;e.preventDefault();move(e);FP1104H.trainer.start=null};
  c.addEventListener('pointerdown',down);c.addEventListener('pointermove',move);c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);

  fp1104hTrainerInstruction();fp1104hTrainerButtons();fp1104hDrawTrainer();
}
function fp1104hAcceptOuter(){
  const t=FP1104H.trainer;if(!t?.drag||t.drag.w<20||t.drag.h<20)return alert('Bitte zuerst die Außenkante des Dokuments markieren.');
  t.outer=t.drag;t.drag=null;fp1104hTrainerInstruction();fp1104hTrainerButtons();fp1104hDrawTrainer();
}
function fp1104hAcceptField(){
  const t=FP1104H.trainer,f=t?.fields?.[t.fieldIndex];
  if(!t||!f)return;
  if(!t.drag||t.drag.w<8||t.drag.h<8)return alert('Bitte den Bereich dieses Feldes markieren.');
  // Feld muss innerhalb der Dokumentbegrenzung liegen.
  const r=t.drag,o=t.outer;
  if(r.x<o.x||r.y<o.y||r.x+r.w>o.x+o.w||r.y+r.h>o.y+o.h)return alert('Der Feldbereich muss innerhalb der markierten Dokumentkante liegen.');
  t.zones[f.key]=r;t.drag=null;t.fieldIndex++;fp1104hTrainerInstruction();fp1104hTrainerButtons();fp1104hDrawTrainer();
}
function fp1104hSkipField(){
  const t=FP1104H.trainer;if(!t)return;t.drag=null;t.fieldIndex++;fp1104hTrainerInstruction();fp1104hTrainerButtons();fp1104hDrawTrainer();
}
function fp1104hCancelTrainer(){document.getElementById('fp1104hTrainer')?.remove();FP1104H.trainer=null}
async function fp1104hCropDocumentBlob(t,widthMm,heightMm){
  const image=t.image,c=document.createElement('canvas'),ratio=widthMm/heightMm;
  const outW=1600,outH=Math.max(1,Math.round(outW/ratio));c.width=outW;c.height=outH;
  const scale=t.imageCanvasScale||1,o=t.outer;
  const sx=o.x/scale,sy=o.y/scale,sw=o.w/scale,sh=o.h/scale;
  c.getContext('2d').drawImage(image,sx,sy,sw,sh,0,0,outW,outH);
  return new Promise(res=>c.toBlob(res,'image/jpeg',.95));
}
async function fp1104hSaveTrainer(){
  const t=FP1104H.trainer;if(!t)return;
  const widthMm=Number(document.getElementById('fp1104hWidth')?.value),heightMm=Number(document.getElementById('fp1104hHeight')?.value);
  if(!(widthMm>0&&heightMm>0))return alert('Breite und Höhe müssen bekannt sein. MobiMory schätzt diese Werte nicht.');
  if(!t.outer)return alert('Dokumentbegrenzung fehlt.');

  const relZones={};
  for(const [k,r] of Object.entries(t.zones))relZones[k]=fp1104hRectRelative(r,t.outer);

  const old=t.existingTemplate||{};
  const tpl={
    version:'1.1.0.4h',
    source:'user-trained',
    schemaKey:t.schema.key,
    documentType:t.schema.documentType,
    widthMm,heightMm,aspect:widthMm/heightMm,
    dimensionsSource:t.dimensionsVerified?'verified-source':'user-measured',
    trainedAt:new Date().toISOString(),
    pages:{...(old.pages||{})}
  };
  tpl.pages[t.pageKey]={zones:relZones,trainedAt:new Date().toISOString(),fieldCount:Object.keys(relZones).length};

  fp1104hSaveLocalTemplate(t.schema.key,tpl);
  await fp1104hSaveCloudTemplate(t.schema,tpl);

  // Aktuelle Trainingsaufnahme zugleich sauber auf das Dokumentrechteck normalisieren.
  const blob=await fp1104hCropDocumentBlob(t,widthMm,heightMm);
  const st=FP1104D?.captures?.[t.context];
  if(st?.slots?.[t.pageKey])st.slots[t.pageKey]={blob,name:`${t.pageKey} · nach angelerntem Dokumentrahmen normalisiert`,normalized:true};

  document.getElementById('fp1104hTrainer')?.remove();
  FP1104H.trainer=null;
  await fp1104hDecorateCapture(t.context,t.schema);
  alert(`Template gespeichert: ${Object.keys(relZones).length} Feldbereiche für diese Seite. Beim nächsten Scan verwendet MobiMory den angelernten Rahmen.`);
}

/* ---------- GEFÜHRTER RAHMEN AUS ANGELERNTEM AUSSENMASS ---------- */
async function fp1104hOpenGuidedCamera(context,pageKey,pageLabel,schemaKey){
  const schema=fp1104dSchemaByKey(schemaKey),tpl=await fp1104hLoadTemplate(schema);
  if(!tpl)return alert('Für dieses Dokument existiert noch kein angelerntes Template.');
  fp1104hCloseGuidedCamera();
  FP1104H.camera={context,pageKey,pageLabel,schema,tpl,stream:null};

  const ratio=tpl.aspect||tpl.widthMm/tpl.heightMm;
  const m=document.createElement('div');m.id='fp1104hGuideModal';m.className='fp1104h-guide-modal';
  m.innerHTML=`<div class="fp1104h-top"><b>${fp1104hEsc(pageLabel)} · ${fp1104hEsc(schema.documentType)}</b><button onclick="fp1104hCloseGuidedCamera()">✕</button></div>
    <div class="fp1104h-guide-view" id="fp1104hGuideView"><video id="fp1104hGuideVideo" autoplay playsinline muted></video>
      <div id="fp1104hGuideBox" class="fp1104h-guide-box"></div>
      <div class="fp1104h-guide-hint">Dokument vollständig und gerade in den Rahmen legen. Alle vier Ecken müssen sichtbar sein.</div>
    </div>
    <div class="fp1104h-bottom"><button onclick="fp1104hCloseGuidedCamera()">Abbrechen</button><button class="primary" onclick="fp1104hShootGuided()">Aufnehmen</button></div>`;
  document.body.appendChild(m);
  const box=document.getElementById('fp1104hGuideBox');
  const vw=Math.min(window.innerWidth*.72,760),vh=Math.min(window.innerHeight*.53,vw/ratio);
  let w=vw,h=vw/ratio;if(h>vh){h=vh;w=h*ratio}
  box.style.width=Math.max(180,w)+'px';box.style.height=Math.max(100,h)+'px';

  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:2560},height:{ideal:1440}},audio:false});
    FP1104H.camera.stream=stream;const v=document.getElementById('fp1104hGuideVideo');v.srcObject=stream;await v.play();
  }catch(e){fp1104hCloseGuidedCamera();alert('Kamera konnte nicht geöffnet werden: '+(e?.message||e))}
}
function fp1104hCloseGuidedCamera(){
  const c=FP1104H.camera;if(c?.stream)for(const t of c.stream.getTracks())t.stop();
  document.getElementById('fp1104hGuideModal')?.remove();FP1104H.camera=null;
}
async function fp1104hShootGuided(){
  const c=FP1104H.camera,v=document.getElementById('fp1104hGuideVideo'),view=document.getElementById('fp1104hGuideView'),g=document.getElementById('fp1104hGuideBox');
  if(!c||!v||!view||!g||!v.videoWidth)return;
  const vr=view.getBoundingClientRect(),gr=g.getBoundingClientRect(),scale=Math.max(vr.width/v.videoWidth,vr.height/v.videoHeight);
  const shownW=v.videoWidth*scale,shownH=v.videoHeight*scale,offX=(shownW-vr.width)/2,offY=(shownH-vr.height)/2;
  const sx=Math.max(0,(gr.left-vr.left+offX)/scale),sy=Math.max(0,(gr.top-vr.top+offY)/scale);
  const sw=Math.min(v.videoWidth-sx,gr.width/scale),sh=Math.min(v.videoHeight-sy,gr.height/scale);
  const out=document.createElement('canvas'),ratio=c.tpl.aspect||1.5;out.width=1600;out.height=Math.max(1,Math.round(out.width/ratio));
  out.getContext('2d').drawImage(v,sx,sy,sw,sh,0,0,out.width,out.height);
  const blob=await new Promise(res=>out.toBlob(res,'image/jpeg',.95));
  const st=FP1104D?.captures?.[c.context];
  if(st){st.slots[c.pageKey]={blob,name:`${c.pageLabel} · mit angelerntem Rahmen aufgenommen`,normalized:true};fp1104dRefreshPage(c.context,c.pageKey)}
  const context=c.context;fp1104hCloseGuidedCamera();setTimeout(()=>{if(typeof fp1104gUpdateFlow==='function')fp1104gUpdateFlow(context)},0);
}

/* ---------- OCR AUS ANGELERNTEN FELDBEREICHEN ---------- */
async function fp1104hCropZone(blob,z){
  const bmp=await createImageBitmap(blob),sx=Math.round(bmp.width*z.x),sy=Math.round(bmp.height*z.y),sw=Math.max(1,Math.round(bmp.width*z.w)),sh=Math.max(1,Math.round(bmp.height*z.h));
  const scale=Math.max(2,Math.min(5,1500/sw)),c=document.createElement('canvas');c.width=Math.round(sw*scale);c.height=Math.round(sh*scale);
  c.getContext('2d').drawImage(bmp,sx,sy,sw,sh,0,0,c.width,c.height);bmp.close?.();
  return typeof fp1104dEnhanceCanvas==='function'?fp1104dEnhanceCanvas(c):c;
}
async function fp1104hOcrTemplate(context,schema,statusId){
  const tpl=await fp1104hLoadTemplate(schema);if(!tpl)return null;
  await fp1104EnsureOCR();
  const st=FP1104D?.captures?.[context];if(!st)return null;
  const values={},debug=[];
  for(const [pageKey,pageTpl] of Object.entries(tpl.pages||{})){
    const slot=st.slots?.[pageKey];if(!slot?.blob)continue;
    for(const [fieldKey,z] of Object.entries(pageTpl.zones||{})){
      const status=document.getElementById(statusId);if(status)status.textContent=`Lese ${fieldKey} …`;
      const c=await fp1104hCropZone(slot.blob,z);
      const r=await Tesseract.recognize(c,'deu+eng',{tessedit_pageseg_mode:'7'});
      const text=String(r.data?.text||'').replace(/\r?\n/g,' ').replace(/\s+/g,' ').trim();
      values[fieldKey]=text;debug.push({fieldKey,text,image:c.toDataURL('image/jpeg',.82)});
    }
  }
  return {values,debug,tpl};
}
function fp1104hDate(v){
  const m=String(v||'').match(/\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/);return m?fp1104DateIso(m[0]):'';
}
function fp1104hNumber(v){
  const m=String(v||'').replace(/\./g,'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):'';
}
function fp1104hPersonParsed(values){
  return {
    lastName:values['person.lastName']||'',
    firstName:values['person.firstName']||'',
    birthDate:fp1104hDate(values['person.birthDate']),
    birthPlace:values['person.birthPlace']||'',
    documentNumber:values['document.number']||'',
    issueDate:fp1104hDate(values['document.issueDate']),
    expiryDate:fp1104hDate(values['document.expiryDate']),
    issuer:values['document.issuer']||'',
    qualifications:values['qualification.kind']?[values['qualification.kind']]:[],
    classes:values['qualification.classes']?String(values['qualification.classes']).split(/[,\s;|]+/).filter(Boolean):[]
  };
}
function fp1104hVehicleParsed(values){
  return {
    manufacturer:values['vehicle.manufacturer']||'',
    model:values['vehicle.model']||'',
    vehicleClass:'',
    profile:'Motorboot',
    vin:values['vehicle.identifier']||'',
    registration:values['vehicle.registration']||'',
    firstRegistration:fp1104hDate(values['vehicle.firstRegistration']),
    powerKw:fp1104hNumber(values['vehicle.powerKw']),
    lengthM:fp1104hNumber(values['dimensions.length']),
    widthM:fp1104hNumber(values['dimensions.width']),
    heightM:fp1104hNumber(values['dimensions.height']),
    draftM:fp1104hNumber(values['dimensions.draft']),
    displacement:fp1104hNumber(values['dimensions.displacement']),
    year:fp1104hNumber(values['vehicle.year']),
    name:values['vehicle.name']||''
  };
}
function fp1104hRenderTemplateDebug(host,res){
  if(!host||!res?.debug?.length)return;
  host.querySelector('#fp1104hTemplateDebug')?.remove();
  const d=document.createElement('div');d.id='fp1104hTemplateDebug';d.className='card';
  d.innerHTML=`<div class="section first">Angelerntes Template · gelesene Bereiche</div>
    <div class="fp1104f-debuggrid">${res.debug.map(x=>`<div class="fp1104f-zone"><img src="${x.image}"><b>${fp1104hEsc(x.fieldKey)}</b><div>${fp1104hEsc(x.text||'– nichts gelesen –')}</div></div>`).join('')}</div>`;
  host.appendChild(d);
}

/* Geschätzte Führerscheinzonen aus 1.1.0.4f/g werden ab hier NICHT mehr verwendet. */
if(typeof fp1104RunNewPersonScan==='function'){
  const base=fp1104RunNewPersonScan;
  fp1104RunNewPersonScan=async function(){
    const schema=fp1104dSchemaByKey(document.getElementById('fp1104dNewPersonSchema')?.value||'');
    const tpl=await fp1104hLoadTemplate(schema);
    if(schema?.key==='DE_FEV_FUEHRERSCHEIN_EU' && !tpl){
      const status=document.getElementById('fp1104PersonStatus');
      if(status)status.innerHTML='<b>Kein verifiziertes/angelerntes Feldtemplate vorhanden.</b> MobiMory verwendet keine geschätzten Koordinaten. Bitte Vorderseite aufnehmen und „Dokumentseite einmal anlernen“ wählen.';
      return;
    }
    if(!tpl)return base();
    const statusId='fp1104PersonStatus',res=await fp1104hOcrTemplate('newperson',schema,statusId);
    const p=fp1104hPersonParsed(res.values);FP1104.scan.schema=schema;FP1104.scan.parsed=p;FP1104.scan.text=Object.entries(res.values).map(([k,v])=>`${k}: ${v}`).join('\n');
    fp1104RenderNewPersonReview(p,schema);fp1104hRenderTemplateDebug(document.getElementById('fp1104PersonNext'),res);
    const status=document.getElementById(statusId);if(status)status.innerHTML='<b>Angelerntes Template ausgewertet.</b> Bitte Ergebnis prüfen.';
  };
}
if(typeof fp1104RunIdentityCheck==='function'){
  const base=fp1104RunIdentityCheck;
  fp1104RunIdentityCheck=async function(){
    const schema=fp1104dSchemaByKey(document.getElementById('fp1104dIdentitySchema')?.value||'');
    const tpl=await fp1104hLoadTemplate(schema);
    if(schema?.key==='DE_FEV_FUEHRERSCHEIN_EU' && !tpl){
      const status=document.getElementById('fp1104PersonStatus');
      if(status)status.innerHTML='<b>Kein verifiziertes/angelerntes Feldtemplate vorhanden.</b> Bitte Referenzdokument aufnehmen und einmal anlernen.';
      return;
    }
    if(!tpl)return base();
    const res=await fp1104hOcrTemplate('identity',schema,'fp1104PersonStatus'),p=fp1104hPersonParsed(res.values);
    FP1104.scan.schema=schema;FP1104.scan.identityParsed=p;fp1104RenderIdentityReview(p);
    fp1104hRenderTemplateDebug(document.getElementById('fp1104PersonNext'),res);
    const status=document.getElementById('fp1104PersonStatus');if(status)status.innerHTML='<b>Angelerntes Referenztemplate ausgewertet.</b>';
  };
}
if(typeof fp1104RunVehicleScan==='function'){
  const base=fp1104RunVehicleScan;
  fp1104RunVehicleScan=async function(){
    const schema=fp1104dSchemaByKey(document.getElementById('fp1104dVehicleSchema')?.value||'')||FP1104.scan?.schema;
    const tpl=await fp1104hLoadTemplate(schema);
    if(!tpl)return base();
    const res=await fp1104hOcrTemplate('vehicle',schema,'fp1104VehicleStatus'),p=fp1104hVehicleParsed(res.values);
    FP1104.scan.schema=schema;FP1104.scan.parsed=p;FP1104.scan.text=Object.entries(res.values).map(([k,v])=>`${k}: ${v}`).join('\n');
    fp1104RenderVehicleReview(p,schema);
    // Zusatzfelder aus dem Template sichtbar machen.
    const name=document.getElementById('scvName');if(name&&p.name)name.value=p.name;
    if(typeof fp1104eEnsureExtraVehicleFields==='function')fp1104eEnsureExtraVehicleFields();
    if(document.getElementById('scvYear')&&p.year)document.getElementById('scvYear').value=p.year;
    if(document.getElementById('scvDisplacement')&&p.displacement!=='')document.getElementById('scvDisplacement').value=p.displacement;
    fp1104hRenderTemplateDebug(document.getElementById('fp1104VehicleReview'),res);
    const status=document.getElementById('fp1104VehicleStatus');if(status)status.innerHTML='<b>Angelerntes Dokumenttemplate ausgewertet.</b> Bitte Ergebnis prüfen.';
  };
}

/* 1.1.0.4g wollte auf window.FP1104F zugreifen. Das war wirkungslos, weil FP1104F als const
   im globalen lexical scope liegt. Wir setzen hier bewusst keine Ersatzkoordinaten. */
try{
  if(typeof FP1104F!=='undefined' && FP1104F?.template?.front){
    FP1104F.template.front.zones={}; // keine geschätzten Feldpositionen mehr
  }
}catch{}

if(typeof render==='function'){
  const baseRender=render;
  render=function(){
    const r=baseRender();
    setTimeout(()=>{
      fp1104hSetVersion();
      const candidates=[
        ['vehicle',document.getElementById('fp1104dVehicleSchema')?.value],
        ['newperson',document.getElementById('fp1104dNewPersonSchema')?.value],
        ['identity',document.getElementById('fp1104dIdentitySchema')?.value],
        ['qualification',document.getElementById('fp1104dQualSchema')?.value]
      ];
      for(const [ctx,key] of candidates)if(key)fp1104hDecorateCapture(ctx,fp1104dSchemaByKey(key));
    },0);
    return r;
  };
}
fp1104hSetVersion();
