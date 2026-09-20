/* MOBIMORY 1.1.0.4i-dev
   Generische Dokument-Engine:
   - keine geschätzten Feldkoordinaten
   - Feldtypen und variable Textkorridore
   - Zoom + nachjustierbare Markierung
   - mehrere Bildaufbereitungen gegen Muster/Hologramme/Wasserzeichen
   - Feldanker aus Dokumentkennungen (1, 4c, D.1, P.2 ...)
   - Anker nur bei eindeutiger Erkennung, sonst Geometrie-Fallback
   - Seitenrollen Pflicht / optional / Detailseite
   - gilt für alle Dokumenttypen
*/
const FP1104I_VERSION='1.1.0.4i-dev';
const FP1104I={
  anchorMinConfidence:55,
  pageRolesKey:'fp1104i-page-roles'
};

(function(){
  if(document.getElementById('fp1104i-style'))return;
  const s=document.createElement('style');s.id='fp1104i-style';s.textContent=`
    .fp1104i-fieldcontrols{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:9px 10px;border-radius:9px;background:rgba(255,255,255,.07);margin:8px 0}
    .fp1104i-fieldcontrols label{display:block;font-size:.78rem;margin-bottom:3px;opacity:.82}
    .fp1104i-fieldcontrols select{width:100%}
    .fp1104i-anchorstate{grid-column:1/-1;font-size:.82rem;opacity:.86}
    .fp1104i-zoom{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:7px 0}
    .fp1104i-canvaswrap{display:flex;justify-content:center;align-items:flex-start;overflow:auto;max-height:58vh;background:#222;border-radius:10px;padding:4px}
    .fp1104i-canvaswrap canvas{display:block;width:auto;max-width:100%;max-height:52vh;touch-action:none;user-select:none}
    .fp1104i-page-role{margin-top:7px;display:flex;gap:7px;align-items:center;flex-wrap:wrap;font-size:.82rem}
    .fp1104i-page-role select{max-width:230px}
    .fp1104i-method{font-size:.76rem;opacity:.74;margin-top:3px}
    @media(max-width:700px){.fp1104i-fieldcontrols{grid-template-columns:1fr}}
  `;document.head.appendChild(s);
})();

function fp1104iSetVersion(){
  const f=document.querySelector('footer');
  if(f)f.textContent='Fahrzeugplattform · '+FP1104I_VERSION+' · © 2026 Entwicklungsstand';
  const sub=document.getElementById('sub');
  if(sub && /Smart Capture/i.test(sub.textContent||'')){
    sub.textContent=(sub.textContent||'').replace(/1\.1\.0\.4[a-z]?/ig,'1.1.0.4i');
  }
}
function fp1104iEsc(v){return typeof fp1104Esc==='function'?fp1104Esc(v):String(v??'')}
function fp1104iNorm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'')}

/* ---------- Generische Zielfelder aus Dokumentbibliothek ---------- */
function fp1104iMapLibraryField(code,label,domain){
  const n=fp1104iNorm(label);
  const mk=(key,l=label)=>({key,label:l,anchorCode:code||''});
  if(domain==='person'){
    if(/NACHNAME|SURNAME/.test(n))return[mk('person.lastName')];
    if(/VORNAME|FIRSTNAME|GIVENNAME/.test(n))return[mk('person.firstName')];
    if(/GEBURTSDATUMUNDGEBURTSORT/.test(n))return[mk('person.birthDate','Geburtsdatum'),mk('person.birthPlace','Geburtsort')];
    if(/GEBURTSDATUM|DATEOFBIRTH/.test(n))return[mk('person.birthDate')];
    if(/GEBURTSORT|PLACEOFBIRTH/.test(n))return[mk('person.birthPlace')];
    if(/AUSSTELLUNGSDATUM|ISSUEDATE/.test(n))return[mk('document.issueDate')];
    if(/ABLAUFDATUM|GULTIGBIS|EXPIR/.test(n))return[mk('document.expiryDate')];
    if(/AUSSTELLUNGSBEHORDE|BEHORDE|ISSUER|AUTHORITY/.test(n))return[mk('document.issuer')];
    if(/FUHRERSCHEINNUMMER|DOKUMENTNUMMER|DOCUMENTNUMBER|NUMBER/.test(n))return[mk('document.number')];
    if(/FAHRERLAUBNISKLASSEN|KLASSEN|CLASSES/.test(n))return[mk('qualification.classes')];
    if(/ERTEILUNGSDATUMJEKLASSE/.test(n))return[mk('qualification.validFrom')];
    if(/GULTIGBISJEKLASSE/.test(n))return[mk('qualification.validTo')];
    if(/BESCHRANKUNGEN|ZUSATZANGABEN|RESTRICTIONS/.test(n))return[mk('qualification.restrictions')];
    if(/GELTUNGSBEREICH|BEFAHIGUNG|QUALIFICATION|SCOPE/.test(n))return[mk('qualification.kind')];
    if(/INHABER|IDENTITY/.test(n))return[];
  }else{
    if(/KENNZEICHEN|REGISTRIER|REGISTRATION/.test(n))return[mk('vehicle.registration')];
    if(/ERSTZULASSUNG|FIRSTREGISTRATION/.test(n))return[mk('vehicle.firstRegistration')];
    if(/^MARKE$|HERSTELLER|MANUFACTURER|WERFT/.test(n))return[mk('vehicle.manufacturer')];
    if(/HANDELSBEZEICHNUNG|MODELL|MODEL/.test(n))return[mk('vehicle.model')];
    if(/TYPVARIANTEVERSION|FAHRZEUGTYP|TYPE/.test(n))return[mk('vehicle.type')];
    if(/^FIN$|CIN|HIN|IDENTIFIZIERUNGSNUMMER|RUMPFNUMMER/.test(n))return[mk('vehicle.identifier')];
    if(/BAUJAHR|YEAR/.test(n))return[mk('vehicle.year')];
    if(/^LANGE$|LENGTH/.test(n))return[mk('dimensions.length')];
    if(/^BREITE$|WIDTH|BEAM/.test(n))return[mk('dimensions.width')];
    if(/^HOHE$|HEIGHT/.test(n))return[mk('dimensions.height')];
    if(/TIEFGANG|DRAFT|DRAUGHT/.test(n))return[mk('dimensions.draft')];
    if(/VERDRANGUNG|DISPLACEMENT/.test(n))return[mk('dimensions.displacement')];
    if(/NENNLEISTUNG|LEISTUNG|POWER/.test(n))return[mk('vehicle.powerKw')];
    if(/BOOTSNAME|FAHRZEUGNAME|VESSELNAME/.test(n))return[mk('vehicle.name')];
  }
  return[];
}
function fp1104iGenericTrainingFields(schema,pageKey){
  const out=[],seen=new Set();
  for(const [code,label] of Object.entries(schema?.fields||{})){
    for(const f of fp1104iMapLibraryField(code,label,schema?.domain)){
      if(!seen.has(f.key)){seen.add(f.key);out.push(f)}
    }
  }
  if(out.length)return out;
  if(schema?.domain==='person'){
    return [
      {key:'person.lastName',label:'Nachname',anchorCode:''},
      {key:'person.firstName',label:'Vorname',anchorCode:''},
      {key:'person.birthDate',label:'Geburtsdatum',anchorCode:''},
      {key:'person.birthPlace',label:'Geburtsort',anchorCode:''},
      {key:'document.number',label:'Dokumentnummer',anchorCode:''},
      {key:'document.issueDate',label:'Ausstellungsdatum',anchorCode:''},
      {key:'document.expiryDate',label:'Gültig bis',anchorCode:''},
      {key:'document.issuer',label:'Ausstellende Behörde',anchorCode:''},
      {key:'qualification.kind',label:'Befähigung / Geltungsbereich',anchorCode:''}
    ];
  }
  return [
    {key:'vehicle.name',label:'Fahrzeug- / Bootsname',anchorCode:''},
    {key:'vehicle.registration',label:'Kennzeichen / Registrierung',anchorCode:''},
    {key:'vehicle.manufacturer',label:'Hersteller / Werft',anchorCode:''},
    {key:'vehicle.model',label:'Modell / Typ',anchorCode:''},
    {key:'vehicle.year',label:'Baujahr',anchorCode:''},
    {key:'vehicle.identifier',label:'FIN / CIN / HIN / Rumpfnummer',anchorCode:''},
    {key:'dimensions.length',label:'Länge',anchorCode:''},
    {key:'dimensions.width',label:'Breite',anchorCode:''},
    {key:'dimensions.height',label:'Höhe',anchorCode:''},
    {key:'dimensions.draft',label:'Tiefgang',anchorCode:''},
    {key:'dimensions.displacement',label:'Verdrängung',anchorCode:''},
    {key:'vehicle.powerKw',label:'Motorleistung kW',anchorCode:''}
  ];
}
fp1104hTrainingFields=function(schema,pageKey){return fp1104iGenericTrainingFields(schema,pageKey)};

/* ---------- Feldtypen ---------- */
function fp1104iFieldType(field){
  const k=String(field?.key||'').toLowerCase(),l=String(field?.label||'').toLowerCase(),s=k+' '+l;
  if(/date|datum|gültig|gueltig|expiry|issue/.test(s))return'date';
  if(/classes|klasse|qualification|restriction|beschränkung|beschraenkung/.test(s))return'tokenList';
  if(/number|identifier|registration|kennzeichen|nummer|fin|cin|hin/.test(s))return'id';
  if(/dimensions|power|year|baujahr|länge|laenge|breite|höhe|hoehe|tiefgang|verdrängung|leistung/.test(s))return'number';
  if(/address|adresse|bemerk|description/.test(s))return'multiLineText';
  return'singleLineText';
}
function fp1104iFieldTypeLabel(t){
  return {singleLineText:'Textzeile',multiLineText:'mehrzeiliger Text',date:'Datum',id:'Kennung / Nummer',number:'Zahl / Maß',tokenList:'Liste / Klassen'}[t]||t;
}
function fp1104iFieldTypeOptions(selected){
  return ['singleLineText','multiLineText','date','id','number','tokenList']
    .map(v=>`<option value="${v}" ${v===selected?'selected':''}>${fp1104iFieldTypeLabel(v)}</option>`).join('');
}
function fp1104iSchemaAnchors(schema){return Object.entries(schema?.fields||{}).map(([code,label])=>({code,label:String(label||'')}))}

/* ---------- Seitenrollen ---------- */
function fp1104iRolesAll(){try{return JSON.parse(localStorage.getItem(FP1104I.pageRolesKey)||'{}')||{}}catch{return{}}}
function fp1104iRole(schemaKey,pageKey,fallbackRequired){
  const a=fp1104iRolesAll(),v=a?.[schemaKey]?.[pageKey];
  if(v)return v;
  const tpl=typeof fp1104hLocalTemplate==='function'?fp1104hLocalTemplate(schemaKey):null;
  return tpl?.pages?.[pageKey]?.role || (fallbackRequired?'required':'optional');
}
function fp1104iWriteRole(schemaKey,pageKey,role){
  const a=fp1104iRolesAll();a[schemaKey]=a[schemaKey]||{};a[schemaKey][pageKey]=role;
  localStorage.setItem(FP1104I.pageRolesKey,JSON.stringify(a));
}
if(typeof fp1104dPages==='function'){
  const basePages=fp1104dPages;
  fp1104dPages=function(context){
    const st=FP1104D?.captures?.[context],schemaKey=st?.schema?.key||st?.schemaKey||'';
    return basePages(context).map(p=>{const role=fp1104iRole(schemaKey,p.key,!!p.required);return {...p,role,required:role==='required'}});
  };
}
async function fp1104iSetPageRole(context,pageKey,schemaKey,role){
  fp1104iWriteRole(schemaKey,pageKey,role);
  const schema=fp1104dSchemaByKey(schemaKey),tpl=await fp1104hLoadTemplate(schema);
  if(tpl){
    tpl.pages=tpl.pages||{};tpl.pages[pageKey]=tpl.pages[pageKey]||{zones:{}};
    tpl.pages[pageKey].role=role;fp1104hSaveLocalTemplate(schemaKey,tpl);await fp1104hSaveCloudTemplate(schema,tpl);
  }
  const st=FP1104D?.captures?.[context],host=document.getElementById('fp1104d-capture-'+context)?.parentElement;
  if(host&&st?.schema){fp1104dRenderCapture(context,host,st.schema);setTimeout(()=>fp1104hDecorateCapture(context,st.schema),0)}
}

/* ---------- Bildaufbereitung ---------- */
function fp1104iCloneCanvas(src){const c=document.createElement('canvas');c.width=src.width;c.height=src.height;c.getContext('2d').drawImage(src,0,0);return c}
function fp1104iGray(src){
  const c=fp1104iCloneCanvas(src),ctx=c.getContext('2d',{willReadFrequently:true}),im=ctx.getImageData(0,0,c.width,c.height),d=im.data;
  for(let i=0;i<d.length;i+=4){const y=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);d[i]=d[i+1]=d[i+2]=y}
  ctx.putImageData(im,0,0);return c;
}
function fp1104iChannel(src,idx){
  const c=fp1104iCloneCanvas(src),ctx=c.getContext('2d',{willReadFrequently:true}),im=ctx.getImageData(0,0,c.width,c.height),d=im.data;
  for(let i=0;i<d.length;i+=4){const v=d[i+idx];d[i]=d[i+1]=d[i+2]=v}
  ctx.putImageData(im,0,0);return typeof fp1104dEnhanceCanvas==='function'?fp1104dEnhanceCanvas(c):c;
}
function fp1104iAdaptive(src){
  const c=fp1104iGray(src),w=c.width,h=c.height,ctx=c.getContext('2d',{willReadFrequently:true}),im=ctx.getImageData(0,0,w,h),d=im.data;
  const integ=new Float64Array((w+1)*(h+1));
  for(let y=1;y<=h;y++){let row=0;for(let x=1;x<=w;x++){row+=d[((y-1)*w+x-1)*4];integ[y*(w+1)+x]=integ[(y-1)*(w+1)+x]+row}}
  const r=Math.max(8,Math.min(28,Math.round(Math.min(w,h)/18))),bias=10;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const x1=Math.max(0,x-r),x2=Math.min(w-1,x+r),y1=Math.max(0,y-r),y2=Math.min(h-1,y+r);
    const A=integ[y1*(w+1)+x1],B=integ[y1*(w+1)+x2+1],C=integ[(y2+1)*(w+1)+x1],D=integ[(y2+1)*(w+1)+x2+1];
    const mean=(D-B-C+A)/((x2-x1+1)*(y2-y1+1)),i=(y*w+x)*4,v=d[i]<mean-bias?0:255;
    d[i]=d[i+1]=d[i+2]=v;
  }
  ctx.putImageData(im,0,0);return c;
}
async function fp1104iRawZone(blob,z){
  const bmp=await createImageBitmap(blob),sx=Math.round(bmp.width*z.x),sy=Math.round(bmp.height*z.y),sw=Math.max(1,Math.round(bmp.width*z.w)),sh=Math.max(1,Math.round(bmp.height*z.h));
  const sc=Math.max(2,Math.min(5,1500/sw)),c=document.createElement('canvas');c.width=Math.round(sw*sc);c.height=Math.round(sh*sc);
  const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(bmp,sx,sy,sw,sh,0,0,c.width,c.height);bmp.close?.();return c;
}
function fp1104iPlausibility(text,type){
  const s=String(text||'').trim();if(!s)return 0;
  if(type==='date'){
    const m=s.match(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\b/);if(!m)return .05;
    const d=+m[1],mo=+m[2],y=+(m[3].length===2?'20'+m[3]:m[3]);return d>=1&&d<=31&&mo>=1&&mo<=12&&y>=1900&&y<=2200?1:.3;
  }
  if(type==='number')return /-?\d+(?:[.,]\d+)?/.test(s)?.95:.1;
  if(type==='id'){const q=s.replace(/\s/g,''),ok=(q.match(/[A-Za-z0-9]/g)||[]).length/Math.max(1,q.length);return Math.min(1,ok)*(q.length>=2?.95:.4)}
  if(type==='tokenList'){const tok=s.split(/[\s,;|/]+/).filter(Boolean),ok=tok.filter(x=>/^[A-Za-z0-9.+-]{1,12}$/.test(x)).length;return tok.length?ok/tok.length:.1}
  const q=s.replace(/\s/g,''),letters=(q.match(/[A-Za-zÄÖÜäöüßÀ-ÿ]/g)||[]).length;return Math.min(1,letters/Math.max(1,q.length)+.18);
}
async function fp1104iOcrCanvas(canvas,type){
  const r=await Tesseract.recognize(canvas,'deu+eng',{tessedit_pageseg_mode:type==='multiLineText'?'6':'7'});
  const text=String(r.data?.text||'').replace(/\r?\n/g,type==='multiLineText'?'\n':' ').replace(/[ \t]+/g,' ').trim();
  const confidence=Math.max(0,Math.min(100,Number(r.data?.confidence||0))),pl=fp1104iPlausibility(text,type);
  return {text,confidence,plausibility:pl,score:(confidence/100)*.55+pl*.45};
}
async function fp1104iBestOcr(blob,z,meta){
  await fp1104EnsureOCR();
  const raw=await fp1104iRawZone(blob,z),enh=typeof fp1104dEnhanceCanvas==='function'?fp1104dEnhanceCanvas(raw):fp1104iGray(raw);
  const variants=[['Kontrast/Graustufe',enh],['Hintergrund reduziert',fp1104iAdaptive(raw)]],runs=[];
  for(const [name,c] of variants){const x=await fp1104iOcrCanvas(c,meta.fieldType);runs.push({...x,name,canvas:c})}
  let best=[...runs].sort((a,b)=>b.score-a.score)[0];
  if(!best||best.score<.76){
    for(const [name,c] of [['Rotkanal',fp1104iChannel(raw,0)],['Blaukanal',fp1104iChannel(raw,2)]]){
      const x=await fp1104iOcrCanvas(c,meta.fieldType);runs.push({...x,name,canvas:c});
    }
    best=[...runs].sort((a,b)=>b.score-a.score)[0];
  }
  return {text:best?.text||'',confidence:best?.confidence||0,score:best?.score||0,variant:best?.name||'',image:best?.canvas?.toDataURL('image/jpeg',.82)};
}

/* ---------- Ankererkennung ---------- */
async function fp1104iAnchorOcr(blob,adaptive=false){
  await fp1104EnsureOCR();
  const base=await fp1104dImageCanvas(blob),c=adaptive?fp1104iAdaptive(base):(typeof fp1104dEnhanceCanvas==='function'?fp1104dEnhanceCanvas(base):fp1104iGray(base));
  const r=await Tesseract.recognize(c,'deu+eng',{tessedit_pageseg_mode:'11'});
  return {words:Array.isArray(r.data?.words)?r.data.words:[],width:c.width,height:c.height};
}
function fp1104iMatchAnchors(ocr,schema){
  const result={},ambiguous={};
  for(const a of fp1104iSchemaAnchors(schema)){
    const target=fp1104iNorm(a.code);if(!target)continue;
    const cand=(ocr.words||[]).filter(w=>fp1104iNorm(w.text)===target&&Number(w.confidence||0)>=FP1104I.anchorMinConfidence);
    if(cand.length===1){
      const w=cand[0],b=w.bbox||{};result[a.code]={x:(b.x0||0)/ocr.width,y:(b.y0||0)/ocr.height,w:((b.x1||0)-(b.x0||0))/ocr.width,h:((b.y1||0)-(b.y0||0))/ocr.height,confidence:Number(w.confidence||0)};
    }else if(cand.length>1)ambiguous[a.code]=cand.length;
  }
  return {result,ambiguous};
}
async function fp1104iDetectAnchors(blob,schema){
  let m=fp1104iMatchAnchors(await fp1104iAnchorOcr(blob,false),schema);
  if(Object.keys(m.result).length<3){
    const m2=fp1104iMatchAnchors(await fp1104iAnchorOcr(blob,true),schema);
    for(const [k,v] of Object.entries(m2.result))if(!m.result[k]&&!m.ambiguous[k]&&!m2.ambiguous[k])m.result[k]=v;
    m.ambiguous={...m.ambiguous,...m2.ambiguous};
  }
  return m;
}

/* ---------- Präziser Trainer ---------- */
function fp1104iHandleHit(r,p,tol=16){
  if(!r)return'';const q={nw:[r.x,r.y],ne:[r.x+r.w,r.y],sw:[r.x,r.y+r.h],se:[r.x+r.w,r.y+r.h]};
  for(const [k,[x,y]] of Object.entries(q))if(Math.hypot(p.x-x,p.y-y)<=tol)return k;return'';
}
function fp1104iResizeRect(start,handle,p,w,h){
  let x1=start.x,y1=start.y,x2=start.x+start.w,y2=start.y+start.h;
  if(handle.includes('w'))x1=p.x;if(handle.includes('e'))x2=p.x;if(handle.includes('n'))y1=p.y;if(handle.includes('s'))y2=p.y;
  return fp1104hClampRect({x:x1,y:y1,w:x2-x1,h:y2-y1},w,h);
}
function fp1104iDrawHandles(ctx,r,cw){
  if(!r)return;ctx.fillStyle='#ffe600';const sz=Math.max(7,cw/160);
  for(const [x,y] of [[r.x,r.y],[r.x+r.w,r.y],[r.x,r.y+r.h],[r.x+r.w,r.y+r.h]]){ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill()}
}
fp1104hDrawTrainer=function(){
  const t=FP1104H.trainer,c=document.getElementById('fp1104hCanvas');if(!t||!c)return;
  const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(t.image,0,0,c.width,c.height);ctx.lineWidth=Math.max(2,c.width/450);
  if(t.outer){ctx.strokeStyle='#00ff88';ctx.strokeRect(t.outer.x,t.outer.y,t.outer.w,t.outer.h)}
  for(let i=0;i<t.fields.length;i++){const r=t.zones[t.fields[i].key];if(!r)continue;ctx.strokeStyle=i===t.fieldIndex?'#ffe600':'#00b7ff';ctx.strokeRect(r.x,r.y,r.w,r.h);ctx.font=`${Math.max(14,c.width/55)}px sans-serif`;ctx.fillStyle=ctx.strokeStyle;ctx.fillText(t.fields[i].label,r.x+3,Math.max(18,r.y-4))}
  for(const [code,r] of Object.entries(t.manualAnchors||{})){ctx.strokeStyle='#ff9f1a';ctx.strokeRect(r.x,r.y,r.w,r.h);ctx.fillStyle='#ff9f1a';ctx.fillText('Anker '+code,r.x+3,Math.max(18,r.y-4))}
  if(t.drag){ctx.strokeStyle='#ffe600';ctx.setLineDash([8,6]);ctx.strokeRect(t.drag.x,t.drag.y,t.drag.w,t.drag.h);ctx.setLineDash([]);fp1104iDrawHandles(ctx,t.drag,c.width)}
};
function fp1104iCurrentField(){return FP1104H.trainer?.fields?.[FP1104H.trainer?.fieldIndex]}
function fp1104iCurrentMeta(){
  const t=FP1104H.trainer,f=fp1104iCurrentField();if(!t||!f)return null;
  t.fieldMeta=t.fieldMeta||{};const old=t.fieldMeta[f.key]||{};
  return {...old,fieldType:old.fieldType||fp1104iFieldType(f),anchorCode:old.anchorCode||f.anchorCode||''};
}
function fp1104iRenderFieldControls(){
  const t=FP1104H.trainer,f=fp1104iCurrentField(),host=document.getElementById('fp1104iFieldControls');if(!host)return;
  if(!t||!f){host.innerHTML='';return}
  const meta=fp1104iCurrentMeta(),anchors=fp1104iSchemaAnchors(t.schema),det=t.detectedAnchors?.result||{},amb=t.detectedAnchors?.ambiguous||{};
  host.innerHTML=`<div><label>Feldtyp</label><select id="fp1104iFieldType">${fp1104iFieldTypeOptions(meta.fieldType)}</select></div>
    <div><label>Feldkennung / Anker (optional)</label><select id="fp1104iAnchor"><option value="">– kein Anker / Geometrie –</option>${anchors.map(a=>`<option value="${fp1104iEsc(a.code)}" ${meta.anchorCode===a.code?'selected':''}>${fp1104iEsc(a.code)} · ${fp1104iEsc(a.label)}${det[a.code]?' ✓':amb[a.code]?' · mehrdeutig':''}</option>`).join('')}</select></div>
    <div class="fp1104i-anchorstate">${meta.anchorCode&&det[meta.anchorCode]?`Anker <b>${fp1104iEsc(meta.anchorCode)}</b> eindeutig erkannt.`:meta.anchorCode&&amb[meta.anchorCode]?`Anker <b>${fp1104iEsc(meta.anchorCode)}</b> ist mehrdeutig und wird nicht automatisch benutzt.`:meta.anchorCode?`Anker <b>${fp1104iEsc(meta.anchorCode)}</b> noch nicht eindeutig erkannt.`:'Ohne Anker arbeitet MobiMory mit der angelernten Geometrie.'}<div class="fp1104h-tools"><button type="button" onclick="fp1104iMarkAnchor()">Ankerposition manuell markieren</button></div></div>`;
}
fp1104hTrainerInstruction=function(){
  const t=FP1104H.trainer,box=document.getElementById('fp1104hInstruction');if(!t||!box)return;
  if(!t.outer){box.innerHTML='<b>Schritt 1 · Dokumentbegrenzung</b><br>Dokument vollständig sichtbar lassen und exakt die Außenkante markieren. Zum Feinjustieren kann anschließend gezoomt werden.';fp1104iRenderFieldControls();return}
  if(t.markingAnchor){box.innerHTML=`<b>Anker markieren: ${fp1104iEsc(t.anchorBeingMarked)}</b><br>Nur die gedruckte Feldkennung markieren, z. B. „4c“ oder „D.1“.`;fp1104iRenderFieldControls();return}
  const f=fp1104iCurrentField();if(!f){box.innerHTML='<b>Alle gewünschten Felder markiert.</b><br>Template kann gespeichert werden.';fp1104iRenderFieldControls();return}
  const type=fp1104iFieldType(f),tip=['singleLineText','multiLineText','tokenList'].includes(type)?'<br><b>Variable Texte:</b> die ganze mögliche Zeile / den Korridor markieren, nicht nur den aktuell kurzen Text.':'';
  box.innerHTML=`<b>Markiere jetzt: ${fp1104iEsc(f.label)}</b><br>Bereich ziehen; gelbe Eckpunkte lassen sich danach nachjustieren.${tip}`;fp1104iRenderFieldControls();
}
fp1104hTrainerButtons=function(){
  const t=FP1104H.trainer,host=document.getElementById('fp1104hTrainerButtons');if(!t||!host)return;
  if(t.markingAnchor){host.innerHTML='<button onclick="fp1104iCancelAnchorMark()">Zurück</button><button class="primary" onclick="fp1104iAcceptAnchorMark()">Anker übernehmen</button>';return}
  if(!t.outer){host.innerHTML='<button onclick="fp1104hCancelTrainer()">Abbrechen</button><button class="primary" onclick="fp1104hAcceptOuter()">Außenkante übernehmen</button>';return}
  if(fp1104iCurrentField())host.innerHTML='<button onclick="fp1104hCancelTrainer()">Abbrechen</button><button onclick="fp1104hSkipField()">Feld überspringen</button><button class="primary" onclick="fp1104hAcceptField()">Bereich übernehmen</button>';
  else host.innerHTML='<button onclick="fp1104hCancelTrainer()">Abbrechen</button><button class="primary" onclick="fp1104hSaveTrainer()">Template speichern</button>';
}
function fp1104iSetZoom(v){
  const t=FP1104H.trainer,c=document.getElementById('fp1104hCanvas');if(!t||!c)return;
  t.zoom=Math.max(1,Math.min(3,v));if(!t.fitCssWidth)t.fitCssWidth=c.getBoundingClientRect().width;
  c.style.maxWidth='none';c.style.maxHeight='none';c.style.width=Math.round(t.fitCssWidth*t.zoom)+'px';c.style.height='auto';
  const z=document.getElementById('fp1104iZoomLabel');if(z)z.textContent=Math.round(t.zoom*100)+' %';
}
function fp1104iMarkAnchor(){
  const t=FP1104H.trainer,f=fp1104iCurrentField(),sel=document.getElementById('fp1104iAnchor')?.value||'';if(!t||!f)return;
  if(!sel)return alert('Bitte zuerst eine Feldkennung auswählen.');
  t.fieldMeta=t.fieldMeta||{};t.fieldMeta[f.key]={...(t.fieldMeta[f.key]||{}),fieldType:document.getElementById('fp1104iFieldType')?.value||fp1104iFieldType(f),anchorCode:sel};
  t.markingAnchor=true;t.anchorBeingMarked=sel;t.drag=null;fp1104hTrainerInstruction();fp1104hTrainerButtons();fp1104hDrawTrainer();
}
function fp1104iCancelAnchorMark(){const t=FP1104H.trainer;if(!t)return;t.markingAnchor=false;t.anchorBeingMarked='';t.drag=null;fp1104hTrainerInstruction();fp1104hTrainerButtons();fp1104hDrawTrainer()}
function fp1104iAcceptAnchorMark(){
  const t=FP1104H.trainer;if(!t?.drag||t.drag.w<6||t.drag.h<6)return alert('Bitte die Feldkennung markieren.');
  t.manualAnchors=t.manualAnchors||{};t.manualAnchors[t.anchorBeingMarked]=t.drag;t.drag=null;t.markingAnchor=false;t.anchorBeingMarked='';fp1104hTrainerInstruction();fp1104hTrainerButtons();fp1104hDrawTrainer();
}
fp1104hAcceptField=function(){
  const t=FP1104H.trainer,f=fp1104iCurrentField();if(!t||!f)return;
  if(!t.drag||t.drag.w<8||t.drag.h<8)return alert('Bitte den Bereich markieren.');
  const r=t.drag,o=t.outer;if(r.x<o.x||r.y<o.y||r.x+r.w>o.x+o.w||r.y+r.h>o.y+o.h)return alert('Der Feldbereich muss innerhalb der Dokumentkante liegen.');
  t.zones[f.key]=r;t.fieldMeta=t.fieldMeta||{};t.fieldMeta[f.key]={...(t.fieldMeta[f.key]||{}),fieldType:document.getElementById('fp1104iFieldType')?.value||fp1104iFieldType(f),anchorCode:document.getElementById('fp1104iAnchor')?.value||f.anchorCode||''};
  t.drag=null;t.fieldIndex++;fp1104hTrainerInstruction();fp1104hTrainerButtons();fp1104hDrawTrainer();
};

fp1104hStartTrainer=async function(context,pageKey,schemaKey){
  const st=FP1104D?.captures?.[context],slot=st?.slots?.[pageKey],schema=fp1104dSchemaByKey(schemaKey);
  if(!slot?.blob)return alert('Bitte zuerst diese Dokumentseite aufnehmen oder importieren.');
  if(!schema)return alert('Dokumenttyp nicht gefunden.');
  const image=await fp1104hImageFromBlob(slot.blob),dim=FP1104H.verifiedDimensions[schemaKey]||null,existing=await fp1104hLoadTemplate(schema),pageExisting=existing?.pages?.[pageKey]||null;
  FP1104H.trainer={context,pageKey,schema,slot,image,fields:fp1104hTrainingFields(schema,pageKey),fieldIndex:0,zones:{},fieldMeta:{...(pageExisting?.fieldMeta||{})},manualAnchors:{},drag:null,start:null,resizeHandle:'',outer:slot.normalized?{x:0,y:0,w:image.naturalWidth,h:image.naturalHeight}:null,widthMm:existing?.widthMm||dim?.widthMm||'',heightMm:existing?.heightMm||dim?.heightMm||'',dimensionsVerified:!!dim,existingTemplate:existing,zoom:1,detectedAnchors:null};

  const m=document.createElement('div');m.id='fp1104hTrainer';m.className='fp1104h-modal';
  m.innerHTML=`<div class="fp1104h-top"><b>Dokument anlernen · ${fp1104iEsc(schema.documentType)} · ${fp1104iEsc(pageKey)}</b><button onclick="fp1104hCancelTrainer()">✕</button></div>
    <div class="fp1104h-body"><div class="fp1104h-panel">
      <div class="fp1104h-form"><div><label>Reale Breite (mm)</label><input id="fp1104hWidth" type="number" step="0.01" value="${FP1104H.trainer.widthMm}"></div><div><label>Reale Höhe (mm)</label><input id="fp1104hHeight" type="number" step="0.01" value="${FP1104H.trainer.heightMm}"></div></div>
      <div class="muted">${dim?`Außenmaß aus bekannter Quelle vorbelegt: ${fp1104iEsc(dim.source)}.`:'Kein verifiziertes Außenmaß vorhanden. Reale Maße eingeben; MobiMory schätzt sie nicht.'}</div>
      <div class="fp1104i-zoom"><button type="button" onclick="fp1104iSetZoom((FP1104H.trainer?.zoom||1)-.25)">−</button><b id="fp1104iZoomLabel">100 %</b><button type="button" onclick="fp1104iSetZoom((FP1104H.trainer?.zoom||1)+.25)">+</button><span class="muted">Gesamtbild zuerst vollständig sichtbar.</span></div>
      <div id="fp1104hInstruction" class="fp1104h-instruction"></div><div id="fp1104iFieldControls" class="fp1104i-fieldcontrols"></div>
      <div class="fp1104i-canvaswrap"><canvas id="fp1104hCanvas"></canvas></div><div id="fp1104iAnchorScanState" class="muted" style="margin-top:7px">Feldkennungen werden geprüft …</div>
    </div></div><div id="fp1104hTrainerButtons" class="fp1104h-bottom"></div>`;
  document.body.appendChild(m);

  const c=document.getElementById('fp1104hCanvas'),max=1800,sc=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
  c.width=Math.max(1,Math.round(image.naturalWidth*sc));c.height=Math.max(1,Math.round(image.naturalHeight*sc));FP1104H.trainer.imageCanvasScale=sc;
  if(FP1104H.trainer.outer)FP1104H.trainer.outer={x:0,y:0,w:c.width,h:c.height};
  if(pageExisting?.zones){
    const o=FP1104H.trainer.outer||{x:0,y:0,w:c.width,h:c.height};
    for(const [k,z] of Object.entries(pageExisting.zones))FP1104H.trainer.zones[k]={x:o.x+z.x*o.w,y:o.y+z.y*o.h,w:z.w*o.w,h:z.h*o.h};
  }
  const pt=e=>{const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height}};
  c.addEventListener('pointerdown',e=>{e.preventDefault();c.setPointerCapture?.(e.pointerId);const p=pt(e),hit=fp1104iHandleHit(FP1104H.trainer.drag,p,Math.max(10,c.width/90));FP1104H.trainer.start=p;if(hit){FP1104H.trainer.resizeHandle=hit;FP1104H.trainer.resizeStart={...FP1104H.trainer.drag}}else{FP1104H.trainer.resizeHandle='';FP1104H.trainer.drag={x:p.x,y:p.y,w:0,h:0}}fp1104hDrawTrainer()});
  c.addEventListener('pointermove',e=>{const t=FP1104H.trainer;if(!t?.start)return;e.preventDefault();const p=pt(e);t.drag=t.resizeHandle?fp1104iResizeRect(t.resizeStart,t.resizeHandle,p,c.width,c.height):fp1104hClampRect({x:t.start.x,y:t.start.y,w:p.x-t.start.x,h:p.y-t.start.y},c.width,c.height);fp1104hDrawTrainer()});
  const up=e=>{const t=FP1104H.trainer;if(!t?.start)return;e.preventDefault();t.start=null;t.resizeHandle='';fp1104hDrawTrainer()};
  c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
  fp1104hTrainerInstruction();fp1104hTrainerButtons();fp1104hDrawTrainer();requestAnimationFrame(()=>{FP1104H.trainer.fitCssWidth=c.getBoundingClientRect().width});

  setTimeout(async()=>{try{const det=await fp1104iDetectAnchors(slot.blob,schema);if(!FP1104H.trainer)return;FP1104H.trainer.detectedAnchors=det;const el=document.getElementById('fp1104iAnchorScanState'),n=Object.keys(det.result).length,a=Object.keys(det.ambiguous).length;if(el)el.innerHTML=`Feldkennungen: <b>${n}</b> eindeutig erkannt${a?` · ${a} mehrdeutig, daher nicht automatisch benutzt`:''}.`;fp1104iRenderFieldControls()}catch{const el=document.getElementById('fp1104iAnchorScanState');if(el)el.textContent='Feldkennungen konnten in diesem Scan nicht sicher automatisch erkannt werden.'}},30);
};

/* ---------- Template speichern ---------- */
fp1104hSaveTrainer=async function(){
  const t=FP1104H.trainer;if(!t)return;
  const widthMm=Number(document.getElementById('fp1104hWidth')?.value),heightMm=Number(document.getElementById('fp1104hHeight')?.value);
  if(!(widthMm>0&&heightMm>0))return alert('Breite und Höhe müssen bekannt sein. MobiMory schätzt sie nicht.');
  if(!t.outer)return alert('Dokumentbegrenzung fehlt.');
  const relZones={};for(const [k,r] of Object.entries(t.zones))relZones[k]=fp1104hRectRelative(r,t.outer);
  const blob=await fp1104hCropDocumentBlob(t,widthMm,heightMm);
  let detected={result:{},ambiguous:{}};try{detected=await fp1104iDetectAnchors(blob,t.schema)}catch{}
  const meta={};
  for(const f of t.fields){
    if(!relZones[f.key])continue;
    const m={...(t.fieldMeta?.[f.key]||{}),fieldType:t.fieldMeta?.[f.key]?.fieldType||fp1104iFieldType(f),anchorCode:t.fieldMeta?.[f.key]?.anchorCode||f.anchorCode||''};
    const code=m.anchorCode;let ref=code?detected.result?.[code]:null;
    if(!ref&&code&&t.manualAnchors?.[code])ref=fp1104hRectRelative(t.manualAnchors[code],t.outer);
    if(code&&ref){m.anchorRef=ref;m.anchorStatus=detected.result?.[code]?'auto':'manual'}
    else if(code)m.anchorStatus=detected.ambiguous?.[code]?'ambiguous-fallback':'not-found-fallback';
    meta[f.key]=m;
  }
  const old=t.existingTemplate||{},role=fp1104iRole(t.schema.key,t.pageKey,true),tpl={version:'1.1.0.4i',source:'user-trained',schemaKey:t.schema.key,documentType:t.schema.documentType,widthMm,heightMm,aspect:widthMm/heightMm,dimensionsSource:t.dimensionsVerified?'verified-source':'user-measured',trainedAt:new Date().toISOString(),pages:{...(old.pages||{})}};
  tpl.pages[t.pageKey]={zones:relZones,fieldMeta:meta,role,trainedAt:new Date().toISOString(),fieldCount:Object.keys(relZones).length,anchorCount:Object.values(meta).filter(x=>x.anchorRef).length};
  fp1104hSaveLocalTemplate(t.schema.key,tpl);await fp1104hSaveCloudTemplate(t.schema,tpl);
  const st=FP1104D?.captures?.[t.context];if(st?.slots?.[t.pageKey])st.slots[t.pageKey]={blob,name:`${t.pageKey} · nach Dokumentrahmen normalisiert`,normalized:true};
  document.getElementById('fp1104hTrainer')?.remove();FP1104H.trainer=null;await fp1104hDecorateCapture(t.context,t.schema);
  alert(`Template gespeichert: ${Object.keys(relZones).length} Felder · ${tpl.pages[t.pageKey].anchorCount} eindeutige Anker.`);
};

/* ---------- Hybrid-Lesung ---------- */
function fp1104iEffectiveZone(zone,meta,currentAnchors){
  const z={...zone},code=meta?.anchorCode,ref=meta?.anchorRef,cur=code?currentAnchors?.[code]:null;
  if(code&&ref&&cur){z.x=Math.max(0,Math.min(1-z.w,z.x+(cur.x-ref.x)));z.y=Math.max(0,Math.min(1-z.h,z.y+(cur.y-ref.y)));return{zone:z,method:`Anker ${code}`}}
  return{zone:z,method:code?`Geometrie · Anker ${code} nicht eindeutig`:'Geometrie'};
}
fp1104hOcrTemplate=async function(context,schema,statusId){
  const tpl=await fp1104hLoadTemplate(schema);if(!tpl)return null;
  const st=FP1104D?.captures?.[context];if(!st)return null;
  const values={},debug=[];
  for(const [pageKey,pageTpl] of Object.entries(tpl.pages||{})){
    const slot=st.slots?.[pageKey];if(!slot?.blob)continue;
    let anchors={};if(Object.values(pageTpl.fieldMeta||{}).some(m=>m.anchorCode&&m.anchorRef)){try{anchors=(await fp1104iDetectAnchors(slot.blob,schema)).result}catch{}}
    for(const [fieldKey,z] of Object.entries(pageTpl.zones||{})){
      const meta={fieldType:'singleLineText',...(pageTpl.fieldMeta?.[fieldKey]||{})},eff=fp1104iEffectiveZone(z,meta,anchors),status=document.getElementById(statusId);
      if(status)status.textContent=`Lese ${fieldKey} · ${eff.method} …`;
      const best=await fp1104iBestOcr(slot.blob,eff.zone,meta);values[fieldKey]=best.text;debug.push({fieldKey,text:best.text,image:best.image,method:eff.method,variant:best.variant,confidence:best.confidence,fieldType:meta.fieldType});
    }
  }
  return{values,debug,tpl};
};
fp1104hRenderTemplateDebug=function(host,res){
  if(!host||!res?.debug?.length)return;
  host.querySelector('#fp1104hTemplateDebug')?.remove();const d=document.createElement('div');d.id='fp1104hTemplateDebug';d.className='card';
  d.innerHTML=`<div class="section first">Dokument-Engine · gelesene Bereiche</div><p class="muted">Anker nur bei eindeutiger Erkennung; sonst Geometrie. Pro Feld wird die beste Bildaufbereitung gewählt.</p><div class="fp1104f-debuggrid">${res.debug.map(x=>`<div class="fp1104f-zone"><img src="${x.image||''}"><b>${fp1104iEsc(x.fieldKey)}</b><div>${fp1104iEsc(x.text||'– nichts gelesen –')}</div><div class="fp1104i-method">${fp1104iEsc(x.method)} · ${fp1104iEsc(fp1104iFieldTypeLabel(x.fieldType))} · ${fp1104iEsc(x.variant)} · OCR ${Math.round(x.confidence||0)} %</div></div>`).join('')}</div>`;
  host.appendChild(d);
};

/* ---------- Seitenrollen in jeder Dokumentansicht ---------- */
if(typeof fp1104hDecorateCapture==='function'){
  const decorateBase=fp1104hDecorateCapture;
  fp1104hDecorateCapture=async function(context,schema){
    await decorateBase(context,schema);if(!schema)return;
    for(const p of fp1104dPages(context)){
      const host=document.getElementById(`fp1104f-page-${context}-${p.key}`)||document.getElementById(`fp1104d-page-${context}-${p.key}`);
      if(!host||host.querySelector('.fp1104i-page-role'))continue;
      const role=fp1104iRole(schema.key,p.key,!!p.required);
      host.insertAdjacentHTML('beforeend',`<div class="fp1104i-page-role"><span>Seitenrolle:</span><select onchange="fp1104iSetPageRole('${context}','${p.key}','${schema.key}',this.value)"><option value="required" ${role==='required'?'selected':''}>Pflichtseite</option><option value="optional" ${role==='optional'?'selected':''}>optional</option><option value="details" ${role==='details'?'selected':''}>Detailseite / Zusatzdaten</option></select></div>`);
    }
  };
}

if(typeof render==='function'){
  const baseRender=render;render=function(){const r=baseRender();setTimeout(fp1104iSetVersion,0);return r};
}
fp1104iSetVersion();
