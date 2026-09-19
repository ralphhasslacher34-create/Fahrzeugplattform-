/* MOBIMORY 1.1.0.4-dev – Smart Capture / Dokumentenbibliothek / Identity Check
   Additiver Versuch auf 1.1.0.3d. Bestehende Fahrzeug-, Personen- und Reisechecklogik bleibt erhalten.
*/
const FP1104_VERSION='1.1.0.4-dev';
const FP1104={
  config:null,catalog:null,discovered:[],scan:{mode:'',personId:'',phase:'',text:'',schema:null,parsed:null,files:[],identityOk:false,identityParsed:null},
  ocrLoading:false
};

(function(){
  if(document.getElementById('fp1104-style'))return;
  const s=document.createElement('style');s.id='fp1104-style';s.textContent=`
    .fp1104-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
    .fp1104-docrow{border:1px solid rgba(120,120,120,.24);border-radius:10px;padding:10px;margin:8px 0}
    .fp1104-docrow .top{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}
    .fp1104-badge{display:inline-block;padding:2px 7px;border-radius:999px;border:1px solid rgba(120,120,120,.3);font-size:.78rem;margin-left:6px}
    .fp1104-ok{background:rgba(35,150,75,.08)}.fp1104-warn{background:rgba(220,150,20,.09)}
    .fp1104-progress{height:8px;border-radius:999px;background:rgba(120,120,120,.15);overflow:hidden;margin:8px 0}.fp1104-progress>div{height:100%;background:currentColor;width:0}
    .fp1104-review{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:9px;margin:10px 0}
    .fp1104-status{padding:9px 10px;border-radius:9px;background:rgba(80,120,180,.08);margin:8px 0}
    .fp1104-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:720px){.fp1104-two{grid-template-columns:1fr}}
    .fp1104-lock{border-left:4px solid currentColor;padding-left:10px}
    .fp1104-source{font-size:.8rem;opacity:.72;word-break:break-word}
  `;document.head.appendChild(s);
})();

function fp1104Esc(v){return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fp1104S(v){return String(v??'').trim()}
function fp1104Norm(v){return fp1104S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'')}
function fp1104DateIso(v){
  const s=fp1104S(v);if(!s)return'';
  let m=s.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);if(m){let y=m[3];if(y.length===2)y=(Number(y)>40?'19':'20')+y;return`${y.padStart(4,'0')}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`}
  m=s.match(/(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})/);return m?`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`:'';
}
function fp1104Input(id,label,value='',type='text',extra=''){return `<div class="field"><label>${fp1104Esc(label)}</label><input id="${id}" type="${type}" value="${fp1104Esc(value)}" ${extra}></div>`}
function fp1104Select(id,label,value,opts){return `<div class="field"><label>${fp1104Esc(label)}</label><select id="${id}">${opts.map(x=>`<option value="${fp1104Esc(x[0])}" ${String(x[0])===String(value)?'selected':''}>${fp1104Esc(x[1])}</option>`).join('')}</select></div>`}
function fp1104DefaultConfig(){return {
  orgCountry:'DE',vehicleCountries:['DE'],personCountries:['DE'],
  vehicleTypes:{road:true,water:true,rowboat:false,motorboat:true,sailboat:true},
  personal:{firstName:true,lastName:true,birthDate:true,residence:true,birthPlace:false,documentNumber:false,issuer:false,issueDate:false,expiryDate:true,rawOcr:false,documentCopy:false},
  enabledSchemas:[],prepareNow:[]
}}
function fp1104LoadLocalConfig(){try{return {...fp1104DefaultConfig(),...JSON.parse(localStorage.getItem('fp1104-config')||'{}')}}catch{return fp1104DefaultConfig()}}
function fp1104StoreLocalConfig(c){FP1104.config=c;localStorage.setItem('fp1104-config',JSON.stringify(c))}
async function fp1104LoadCatalog(){if(FP1104.catalog)return FP1104.catalog;const r=await fetch('smart-capture-catalog-1.1.0.4.json?v=1104',{cache:'no-store'});if(!r.ok)throw new Error('Dokumentenbibliothek 1.1.0.4 konnte nicht geladen werden.');FP1104.catalog=await r.json();return FP1104.catalog}

/* additive SharePoint schema */
(function(){
  if(typeof fp105MergedSchema==='function'&&typeof fp105MergeSchemas==='function'){
    const prior=fp105MergedSchema;
    fp105MergedSchema=async function(){const [a,b]=await Promise.all([prior(),fetch('phase1-sharepoint-schema-1.1.0.4.json?v=1104',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Schema 1.1.0.4 fehlt.');return r.json()})]);return fp105MergeSchemas(a,b)};
  }
  if(typeof m365setup==='function'){
    const priorSetup=m365setup;
    m365setup=function(){priorSetup();setTimeout(()=>{const card=[...app.querySelectorAll('.card')].find(c=>(c.textContent||'').includes('SharePoint-Site-URL'));if(card&&!card.querySelector('.fp1104-setup-note')){const p=document.createElement('p');p.className='muted fp1104-setup-note';p.textContent='1.1.0.4 ergänzt Smart-Capture-Konfiguration, Dokument-Schemata und Identity-Check-Felder additiv.';card.appendChild(p)}},0)};
  }
})();

/* Views in existing router */
const fp1104RenderBase=render;
render=function(){
  const v={smartcaptureconfig:fp1104ConfigView,smartcapturevehicle:fp1104VehicleView,smartcaptureperson:fp1104PersonView,smartcapturelibrary:fp1104LibraryView}[S.view];
  return v?v():fp1104RenderBase();
};
const fp1104ConfigurationBase=configuration;
configuration=function(){fp1104ConfigurationBase();const g=app.querySelector('.grid');if(g&&!document.getElementById('fp1104-config-tile'))g.insertAdjacentHTML('beforeend',`<button id="fp1104-config-tile" class="menu" onclick="go('smartcaptureconfig')"><b>Dokumente & Smart Capture</b><span class="muted">Länder, Dokumentbibliothek, Datenspeicherung, automatische Erfassung</span></button>`)};

if(typeof vehiclesconfig==='function'){
  const base=vehiclesconfig;vehiclesconfig=async function(){await base();if(S.view!=='vehiclesconfig')return;const card=app.querySelector('.card');if(card&&!document.getElementById('fp1104-vehicle-btn'))card.insertAdjacentHTML('beforeend',` <button id="fp1104-vehicle-btn" onclick="go('smartcapturevehicle')">Fahrzeug aus Dokument anlegen</button>`)};
}
if(typeof persons==='function'){
  const base=persons;persons=async function(){await base();if(S.view!=='persons')return;const card=app.querySelector('.card');if(card&&!document.getElementById('fp1104-person-btn'))card.insertAdjacentHTML('beforeend',` <button id="fp1104-person-btn" onclick="S.personDetailId=null;FP1104.scan.personId='';go('smartcaptureperson')">Person aus Dokument anlegen</button>`)};
}
if(typeof persondetail==='function'){
  const base=persondetail;persondetail=async function(){await base();if(S.view!=='persondetail')return;const q=[...app.querySelectorAll('.card')].find(c=>(c.textContent||'').includes('Lizenzen / Patente / Nachweise'));if(q&&!document.getElementById('fp1104-persondoc-btn'))q.insertAdjacentHTML('afterbegin',`<div class="actions"><button id="fp1104-persondoc-btn" onclick="FP1104.scan.personId=String(S.personDetailId);go('smartcaptureperson')">Nachweis aus Dokument hinzufügen</button></div>`)};
}

async function fp1104TryCloudConfig(){
  try{const api=await getCloud(),rows=await list(api,'SmartCaptureConfig1104'),x=rows.find(r=>r.fields.ConfigKey==='default'&&r.fields.Aktiv!==false);if(x?.fields?.ConfigJson){const c=JSON.parse(x.fields.ConfigJson);fp1104StoreLocalConfig({...fp1104DefaultConfig(),...c});return FP1104.config}}catch{}
  FP1104.config=fp1104LoadLocalConfig();return FP1104.config;
}
function fp1104CountryOptions(v){const a=[['DE','Deutschland'],['AT','Österreich'],['CH','Schweiz'],['FR','Frankreich'],['NL','Niederlande'],['BE','Belgien'],['CA','Kanada'],['US','USA'],['GB','Vereinigtes Königreich'],['OTHER','anderes Land']];return a.map(x=>`<option value="${x[0]}" ${x[0]===v?'selected':''}>${x[1]}</option>`).join('')}
function fp1104MultiCountry(id,label,values){return `<div class="field"><label>${label}</label><select id="${id}" multiple size="6">${[['DE','Deutschland'],['AT','Österreich'],['CH','Schweiz'],['FR','Frankreich'],['NL','Niederlande'],['BE','Belgien'],['CA','Kanada'],['US','USA'],['GB','Vereinigtes Königreich']].map(x=>`<option value="${x[0]}" ${values.includes(x[0])?'selected':''}>${x[1]}</option>`).join('')}</select></div>`}
function fp1104Selected(id){return [...(document.getElementById(id)?.selectedOptions||[])].map(x=>x.value)}

async function fp1104ConfigView(){
  head('Dokumente & Smart Capture','Vorbereitung der automatischen Datenerfassung');app.innerHTML='<div class="card">Konfiguration wird geladen …</div>';
  const c=await fp1104TryCloudConfig();
  app.innerHTML=`
  <div class="card"><div class="section first">1 · Einsatzbereich</div>
    <div class="fp1104-grid"><div class="field"><label>Land der Installation / Organisation</label><select id="scOrgCountry">${fp1104CountryOptions(c.orgCountry)}</select></div>${fp1104MultiCountry('scVehicleCountries','Länder der Fahrzeugdokumente',c.vehicleCountries)}${fp1104MultiCountry('scPersonCountries','Länder der Personendokumente',c.personCountries)}</div>
    <div class="section">Fahrzeugwelten</div>
    <label class="checkrow"><input id="scRoad" type="checkbox" ${c.vehicleTypes.road?'checked':''}> Straßenfahrzeuge</label>
    <label class="checkrow"><input id="scWater" type="checkbox" ${c.vehicleTypes.water?'checked':''}> Wasserfahrzeuge</label>
    <div style="padding-left:22px"><label class="checkrow"><input id="scRowboat" type="checkbox" ${c.vehicleTypes.rowboat?'checked':''}> Ruderboote</label><label class="checkrow"><input id="scMotorboat" type="checkbox" ${c.vehicleTypes.motorboat?'checked':''}> Motorboote</label><label class="checkrow"><input id="scSailboat" type="checkbox" ${c.vehicleTypes.sailboat?'checked':''}> Segelboote</label></div>
  </div>
  <div class="card"><div class="section first">2 · Persönliche Daten</div><p class="muted">Name und Geburtsdatum bilden den Identitätsanker. Weitere erkannte Angaben können getrennt gespeichert oder verworfen werden.</p>
    <label class="checkrow"><input type="checkbox" checked disabled> Vorname speichern · Identitätsanker</label><label class="checkrow"><input type="checkbox" checked disabled> Nachname speichern · Identitätsanker</label><label class="checkrow"><input type="checkbox" checked disabled> Geburtsdatum speichern · Identitätsanker</label>
    ${[['residence','Wohnort speichern, wenn Dokument ihn enthält'],['birthPlace','Geburtsort speichern'],['documentNumber','Dokumentnummer speichern'],['issuer','Aussteller speichern'],['issueDate','Ausstellungsdatum speichern'],['expiryDate','Ablauf-/Gültigkeitsdatum speichern'],['rawOcr','OCR-Rohtext dauerhaft speichern'],['documentCopy','Dokumentkopie speichern (Versuch: lokal auf diesem Gerät)']].map(x=>`<label class="checkrow"><input id="scP_${x[0]}" type="checkbox" ${c.personal[x[0]]?'checked':''}> ${x[1]}</label>`).join('')}
  </div>
  <div class="card"><div class="actions"><button class="primary" onclick="fp1104SaveConfigAndDiscover()">Speichern und relevante Dokumente ermitteln</button><button onclick="go('smartcapturelibrary')">Dokumentenbibliothek ansehen</button></div></div>
  <div id="fp1104-discovered"></div>`;
  if(c.enabledSchemas?.length)await fp1104RenderDiscovered(c);
}
function fp1104ReadConfigForm(){
  const old=FP1104.config||fp1104DefaultConfig();
  const ck=id=>!!document.getElementById(id)?.checked;return {...old,orgCountry:document.getElementById('scOrgCountry').value,vehicleCountries:fp1104Selected('scVehicleCountries'),personCountries:fp1104Selected('scPersonCountries'),vehicleTypes:{road:ck('scRoad'),water:ck('scWater'),rowboat:ck('scRowboat'),motorboat:ck('scMotorboat'),sailboat:ck('scSailboat')},personal:{firstName:true,lastName:true,birthDate:true,residence:ck('scP_residence'),birthPlace:ck('scP_birthPlace'),documentNumber:ck('scP_documentNumber'),issuer:ck('scP_issuer'),issueDate:ck('scP_issueDate'),expiryDate:ck('scP_expiryDate'),rawOcr:ck('scP_rawOcr'),documentCopy:ck('scP_documentCopy')}}
}
async function fp1104SaveConfigAndDiscover(){
  const c=fp1104ReadConfigForm();fp1104StoreLocalConfig(c);
  try{const api=await getCloud(),rows=await list(api,'SmartCaptureConfig1104'),x=rows.find(r=>r.fields.ConfigKey==='default');const f={Title:'default',ConfigKey:'default',ConfigJson:JSON.stringify(c),AktualisiertAm:new Date().toISOString(),Aktiv:true};if(x)await api.updateItemByName('SmartCaptureConfig1104',x.id,f);else await api.createItemByName('SmartCaptureConfig1104',f)}catch(e){console.warn('SmartCapture config cloud:',e)}
  await fp1104RenderDiscovered(c,true);
}
function fp1104RelevantSchemas(c,schemas){
  const tags=new Set();if(c.vehicleTypes.road)tags.add('road_vehicle');if(c.vehicleTypes.water)tags.add('water_vehicle');if(c.vehicleTypes.road)tags.add('road_user');if(c.vehicleTypes.water)tags.add('water_user');
  const countries=new Set([...(c.vehicleCountries||[]),...(c.personCountries||[]),'EU']);
  return schemas.filter(s=>countries.has(s.country)&&s.appliesTo?.some(t=>tags.has(t)));
}
async function fp1104RenderDiscovered(c,scroll=false){
  const cat=await fp1104LoadCatalog(),rows=fp1104RelevantSchemas(c,cat.schemas);FP1104.discovered=rows;const box=document.getElementById('fp1104-discovered');if(!box)return;
  box.innerHTML=`<div class="card"><div class="section first">3 · Gefundene Dokumentarten</div><p class="muted">Haken links: für diese Umgebung verwenden. „Details jetzt“: Schema jetzt in der lokalen/SharePoint-Bibliothek vorbereiten.</p>${rows.map((s,i)=>`<div class="fp1104-docrow"><div class="top"><label><input data-sc-enable="${i}" type="checkbox" ${(c.enabledSchemas||[]).includes(s.key)?'checked':''}> <b>${fp1104Esc(s.documentType)}</b></label><span class="fp1104-badge ${String(s.status).startsWith('ready')?'fp1104-ok':'fp1104-warn'}">${String(s.status).startsWith('ready')?'Details verfügbar':'Details noch offen'}</span></div><div class="muted">${fp1104Esc(s.country)} · ${s.domain==='vehicle'?'Fahrzeug':'Person/Nachweis'}</div><label class="checkrow"><input data-sc-prepare="${i}" type="checkbox" ${(c.prepareNow||[]).includes(s.key)?'checked':''}> Details jetzt vorbereiten</label>${s.sourceTitle?`<div class="fp1104-source">Quelle: ${fp1104Esc(s.sourceTitle)}</div>`:''}</div>`).join('')}<div class="actions"><button class="primary" onclick="fp1104PrepareSelection()">Auswahl übernehmen / vorbereiten</button></div></div>`;
  if(scroll)box.scrollIntoView({behavior:'smooth',block:'start'});
}
async function fp1104PrepareSelection(){
  const c=FP1104.config||fp1104LoadLocalConfig(),enabled=[],prep=[];document.querySelectorAll('[data-sc-enable]').forEach(x=>{if(x.checked)enabled.push(FP1104.discovered[Number(x.dataset.scEnable)].key)});document.querySelectorAll('[data-sc-prepare]').forEach(x=>{if(x.checked)prep.push(FP1104.discovered[Number(x.dataset.scPrepare)].key)});c.enabledSchemas=enabled;c.prepareNow=prep;fp1104StoreLocalConfig(c);
  let cloud='';try{const api=await getCloud(),existing=await list(api,'DokumentSchemas1104');for(const s of FP1104.discovered.filter(x=>prep.includes(x.key))){const hit=existing.find(x=>x.fields.SchemaKey===s.key),f={Title:s.documentType,SchemaKey:s.key,Dokumentart:s.documentType,Land:s.country,Bereich:s.domain,Status:String(s.status).startsWith('ready')?'Einsatzbereit':'Vorgemerkt',SchemaJson:JSON.stringify(s),QuelleUrl:s.sourceUrl||'',QuelleTitel:s.sourceTitle||'',AktualisiertAm:new Date().toISOString(),Aktiv:enabled.includes(s.key)};if(hit)await api.updateItemByName('DokumentSchemas1104',hit.id,f);else await api.createItemByName('DokumentSchemas1104',f)}cloud=' · SharePoint aktualisiert'}catch(e){cloud=' · lokal gespeichert (M365-Setup für SharePoint-Speicherung ausführen)'}
  alert(`Dokumentauswahl gespeichert${cloud}.`);
}

async function fp1104LibraryView(){
  head('Dokumentenbibliothek','Erkannte und vorbereitete Dokumenttypen');app.innerHTML='<div class="card">Bibliothek wird geladen …</div>';const c=await fp1104TryCloudConfig(),cat=await fp1104LoadCatalog();let cloud=[];try{const api=await getCloud();cloud=await list(api,'DokumentSchemas1104')}catch{}
  const cmap=Object.fromEntries(cloud.map(x=>[x.fields.SchemaKey,x.fields]));app.innerHTML=`<div class="card"><b>Katalog ${fp1104Esc(cat.version)}</b><p class="muted">Nur aktivierte und vorbereitete Schemata werden beim Scan bevorzugt verwendet.</p></div>${cat.schemas.map(s=>{const x=cmap[s.key],on=(c.enabledSchemas||[]).includes(s.key);return `<div class="fp1104-docrow"><div><b>${fp1104Esc(s.documentType)}</b>${on?' <span class="fp1104-badge fp1104-ok">aktiv</span>':''}</div><div class="muted">${fp1104Esc(s.country)} · ${fp1104Esc(s.domain)} · ${x?.Status||s.status}</div>${s.sourceTitle?`<div class="fp1104-source">${fp1104Esc(s.sourceTitle)}</div>`:''}</div>`}).join('')}`;
}

/* OCR */
async function fp1104EnsureOCR(){
  if(window.Tesseract)return;if(FP1104.ocrLoading){while(FP1104.ocrLoading)await new Promise(r=>setTimeout(r,100));if(window.Tesseract)return}
  FP1104.ocrLoading=true;try{await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.onload=res;s.onerror=()=>rej(new Error('OCR-Modul konnte nicht geladen werden.'));document.head.appendChild(s)})}finally{FP1104.ocrLoading=false}
}
async function fp1104OcrFiles(files,statusId){
  if(!files.length)throw new Error('Bitte mindestens ein Foto auswählen.');await fp1104EnsureOCR();let text='';for(let i=0;i<files.length;i++){const el=document.getElementById(statusId);if(el)el.textContent=`OCR ${i+1}/${files.length} wird gelesen …`;const r=await Tesseract.recognize(files[i],'deu+eng',{logger:m=>{const b=document.getElementById('fp1104-ocrbar');if(b&&m.status==='recognizing text')b.style.width=Math.round((m.progress||0)*100)+'%'}});text+='\n--- SEITE '+(i+1)+' ---\n'+(r.data?.text||'')}
  return text;
}
function fp1104DetectSchema(text,domain){
  const u=String(text||'').toUpperCase(),c=FP1104.config||fp1104LoadLocalConfig(),enabled=new Set(c.enabledSchemas||[]),rows=(FP1104.catalog?.schemas||[]).filter(s=>s.domain===domain);let best=null,score=-1;for(const s of rows){let n=0;for(const k of s.detect||[])if(u.includes(String(k).toUpperCase()))n++;if(enabled.has(s.key))n+=.5;if(n>score){best=s;score=n}}return score>0?best:null;
}
function fp1104LineValue(text,labelRx){const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);for(let i=0;i<lines.length;i++){const m=lines[i].match(labelRx);if(m){if(m[1]&&fp1104S(m[1]))return fp1104S(m[1]);if(lines[i+1])return fp1104S(lines[i+1])}}return''}
function fp1104FindVin(text){const hits=String(text).toUpperCase().match(/\b[A-HJ-NPR-Z0-9]{17}\b/g)||[];return hits.find(x=>/[A-Z]/.test(x)&&/\d/.test(x))||''}
function fp1104FindDateNear(text,label){const u=String(text);const rx=new RegExp(label+'[^\\n]{0,28}?(\\d{1,2}[.\\/-]\\d{1,2}[.\\/-]\\d{2,4})','i');return fp1104DateIso(u.match(rx)?.[1]||'')}
function fp1104CodeValue(text,code){
  const lines=String(text).split(/\r?\n/).map(x=>x.trim()).filter(Boolean),safe=code.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const rx=new RegExp('(?:^|\\s|\\()'+safe+'(?:\\)|\\.|:|\\s)+(.*)$','i');for(const l of lines){const m=l.match(rx);if(m&&fp1104S(m[1]))return fp1104S(m[1]).replace(/^[.:\-\s]+/,'')}
  return'';
}
function fp1104ParseDrivingLicence(text){
  const t=String(text),classes=['AM','A1','A2','BE','C1E','C1','CE','D1E','D1','DE','A','B','C','D','L','T'],found=[],lines=t.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  for(const c of classes){
    const safe=c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const rx=c.length>1?new RegExp('(?:^|\\s)'+safe+'(?=\\s|$|[0-9./-])','i'):new RegExp('^'+safe+'(?=\\s|[0-9./-])','i');
    if(lines.some(l=>rx.test(l)))found.push(c);
  }
  let last=fp1104CodeValue(t,'1'),first=fp1104CodeValue(t,'2'),three=fp1104CodeValue(t,'3');
  if(/FÜHRERSCHEIN|DRIVING LICENCE/i.test(t)){
    last=last.replace(/DOKTORGRAD.*/i,'').trim();first=first.replace(/GEBURT.*/i,'').trim();
  }
  const dob=fp1104DateIso(three)||fp1104FindDateNear(t,'(?:^|\\s)3[.:\\s]');
  let birthPlace='';if(three&&dob){birthPlace=three.replace(/\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}/,'').replace(/^[,\s-]+/,'').trim()}
  const docNo=fp1104CodeValue(t,'5');
  return {firstName:first,lastName:last,birthDate:dob,birthPlace,documentNumber:docNo,issueDate:fp1104FindDateNear(t,'4a'),expiryDate:fp1104FindDateNear(t,'4b'),issuer:fp1104CodeValue(t,'4c'),classes:[...new Set(found)]};
}
function fp1104ParseZB(text){
  const t=String(text),num=v=>{const m=fp1104S(v).replace(/\./g,'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):''},mm=v=>{const n=num(v);return n!==''?(n/1000).toFixed(3).replace(/0+$/,'').replace(/\.$/,''):''};
  const d1=fp1104CodeValue(t,'D.1')||fp1104CodeValue(t,'D1'),d2=fp1104CodeValue(t,'D.2')||fp1104CodeValue(t,'D2'),d3=fp1104CodeValue(t,'D.3')||fp1104CodeValue(t,'D3');
  const cls=fp1104CodeValue(t,'J'),remarks=fp1104CodeValue(t,'22');let profile='PKW';if(/WOHNMOBIL|SO\.KFZ.*WOHN|MOTOR CARAVAN/i.test(t))profile='Wohnmobil';else if(/^L|MOTORRAD|KRAFTRAD/i.test(cls+' '+t))profile='Motorrad';else if(/^N[123]/i.test(cls))profile='Sonstiges';
  return {registration:fp1104CodeValue(t,'A'),firstRegistration:fp1104DateIso(fp1104CodeValue(t,'B')),manufacturer:d1,type:d2,model:d3,vin:fp1104FindVin(t)||fp1104CodeValue(t,'E'),vehicleClass:cls,profile,engineCc:num(fp1104CodeValue(t,'P.1')),powerKw:num(fp1104CodeValue(t,'P.2')||fp1104CodeValue(t,'P2')),fuel:fp1104CodeValue(t,'P.3'),grossKg:num(fp1104CodeValue(t,'F.1')),emptyKg:num(fp1104CodeValue(t,'G')),trailerBrakedKg:num(fp1104CodeValue(t,'O.1')),trailerUnbrakedKg:num(fp1104CodeValue(t,'O.2')),seats:num(fp1104CodeValue(t,'S.1')),maxSpeedKmh:num(fp1104CodeValue(t,'T')),lengthM:mm(fp1104CodeValue(t,'18')),widthM:mm(fp1104CodeValue(t,'19')),heightM:mm(fp1104CodeValue(t,'20')),remarks};
}
function fp1104ParseWatercraft(text){
  const t=String(text),val=(rx)=>fp1104S(t.match(rx)?.[1]||'');return {manufacturer:val(/(?:HERSTELLER|MANUFACTURER)\s*[:\-]?\s*([^\n]+)/i),model:val(/(?:MODELL|MODEL|TYPE)\s*[:\-]?\s*([^\n]+)/i),cin:val(/(?:CIN|HIN)\s*[:\-]?\s*([A-Z0-9\-]+)/i),registration:val(/(?:KENNZEICHEN|REGISTRATION|REGISTRIER(?:UNG|NUMMER))\s*[:\-]?\s*([^\n]+)/i),lengthM:val(/(?:LÄNGE|LENGTH)\s*[:\-]?\s*([0-9]+[,.]?[0-9]*)/i).replace(',','.'),widthM:val(/(?:BREITE|BEAM|WIDTH)\s*[:\-]?\s*([0-9]+[,.]?[0-9]*)/i).replace(',','.'),draftM:val(/(?:TIEFGANG|DRAFT)\s*[:\-]?\s*([0-9]+[,.]?[0-9]*)/i).replace(',','.')};
}
function fp1104ParseQualification(text,schema){const dl=fp1104ParseDrivingLicence(text),u=String(text).toUpperCase(),q=[];if(schema?.key==='DE_SPFV_SBF'||/SPORTBOOTFÜHRERSCHEIN/.test(u)){if(/BINNEN/.test(u))q.push('SBF Binnen');if(/SEE/.test(u))q.push('SBF See');if(!q.length)q.push('Sportbootführerschein')}if(schema?.key==='DE_UBI'||/\bUBI\b/.test(u))q.push('UBI');if(schema?.key==='DE_SRC'||/\bSRC\b|SHORT RANGE CERTIFICATE/.test(u))q.push('SRC');if(schema?.key==='DE_LRC'||/\bLRC\b|LONG RANGE CERTIFICATE/.test(u))q.push('LRC');return {...dl,qualifications:[...new Set(q.length?q:dl.classes)]}}

/* IndexedDB: optional local document copy for prototype */
function fp1104Db(){return new Promise((res,rej)=>{const q=indexedDB.open('mobimory-smart-capture',1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('docs'))q.result.createObjectStore('docs')};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function fp1104StoreCopy(files){if(!files?.length)return'';const db=await fp1104Db(),key='doc-'+Date.now()+'-'+Math.random().toString(36).slice(2);await new Promise((res,rej)=>{const tx=db.transaction('docs','readwrite');tx.objectStore('docs').put(files,key);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close();return'idb:'+key}
async function fp1104HashIdentity(x){const s=[fp1104Norm(x.firstName),fp1104Norm(x.lastName),x.birthDate||''].join('|'),buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}

/* Vehicle scan */
async function fp1104VehicleView(){
  head('Fahrzeug aus Dokument','Smart Capture · Versuch 1.1.0.4');await fp1104TryCloudConfig();await fp1104LoadCatalog();FP1104.scan={mode:'vehicle',personId:'',phase:'scan',text:'',schema:null,parsed:null,files:[],identityOk:false};
  const rows=fp1104RelevantSchemas(FP1104.config,FP1104.catalog.schemas).filter(x=>x.domain==='vehicle');app.innerHTML=`<div class="card"><p>Foto/Scan des Fahrzeugdokuments auswählen. Die Dokumentart wird aus dem Inhalt erkannt; vorbereitete Schemata werden bevorzugt.</p><div class="field"><label>Dokumentfotos</label><input id="fp1104VehicleFiles" type="file" accept="image/*" capture="environment" multiple></div><div class="muted">Vorbereitet/gefunden: ${rows.map(x=>fp1104Esc(x.documentType)).join(' · ')||'noch keine Auswahl'}</div><div class="fp1104-progress"><div id="fp1104-ocrbar"></div></div><div id="fp1104VehicleStatus" class="fp1104-status">Bereit.</div><button class="primary" onclick="fp1104RunVehicleScan()">Scannen und Fahrzeug erkennen</button></div><div id="fp1104VehicleReview"></div>`;
}
async function fp1104RunVehicleScan(){
  try{const files=[...(document.getElementById('fp1104VehicleFiles')?.files||[])];FP1104.scan.files=files;const text=await fp1104OcrFiles(files,'fp1104VehicleStatus');FP1104.scan.text=text;const s=fp1104DetectSchema(text,'vehicle');FP1104.scan.schema=s;let p=s?.extractor==='de-zb1'||s?.extractor==='de-zb2'?fp1104ParseZB(text):fp1104ParseWatercraft(text);FP1104.scan.parsed=p;fp1104RenderVehicleReview(p,s)}catch(e){document.getElementById('fp1104VehicleStatus').textContent='Fehler: '+e.message}
}
function fp1104RenderVehicleReview(p,s){const box=document.getElementById('fp1104VehicleReview');if(!box)return;const boat=s?.extractor==='generic-watercraft'||/BOOT|WATERCRAFT|SCHIFF/i.test(s?.documentType||'');const name=[p.manufacturer,p.model,p.registration].filter(Boolean).join(' ')||'Neues Fahrzeug';box.innerHTML=`<div class="card"><div class="section first">Ergebnis prüfen</div><div class="fp1104-status"><b>Dokument:</b> ${fp1104Esc(s?.documentType||'nicht sicher erkannt')} ${s?`<span class="fp1104-badge">${fp1104Esc(s.status)}</span>`:''}</div><div class="fp1104-review">${fp1104Input('scvName','Fahrzeugname',name)}${fp1104Select('scvProfile','Profil',boat?'Motorboot':p.profile||'PKW',[['Motorboot','Motorboot'],['Segelboot','Segelboot'],['Wohnmobil','Wohnmobil'],['PKW','PKW'],['Motorrad','Motorrad'],['Sonstiges','Sonstiges']])}${fp1104Input('scvType','Fahrzeugtyp',p.vehicleClass||'')}${fp1104Input('scvManufacturer','Hersteller',p.manufacturer||'')}${fp1104Input('scvModel','Modell',p.model||'')}${fp1104Input('scvId','FIN / CIN / HIN',p.vin||p.cin||'')}${fp1104Input('scvReg','Kennzeichen / Registrierung',p.registration||'')}${fp1104Input('scvFirst','Erstzulassung',p.firstRegistration||'','date')}${fp1104Input('scvPower','Leistung kW',p.powerKw??'','number','step="0.1"')}${fp1104Input('scvLength','Länge m',p.lengthM||'','number','step="0.001"')}${fp1104Input('scvWidth','Breite m',p.widthM||'','number','step="0.001"')}${fp1104Input('scvHeight','Höhe m',p.heightM||'','number','step="0.001"')}${fp1104Input('scvDraft','Tiefgang m',p.draftM||'','number','step="0.001"')}</div><label class="checkrow"><input id="scvStoreCopy" type="checkbox" ${FP1104.config.personal.documentCopy?'checked':''}> Dokumentkopie lokal auf diesem Gerät speichern</label><div class="actions"><button class="primary" onclick="fp1104SaveVehicleFromScan()">Fahrzeug anlegen</button></div></div>`}
async function fp1104SaveVehicleFromScan(){
  const gv=id=>document.getElementById(id)?.value||'';if(!fp1104S(gv('scvName')))return alert('Fahrzeugname prüfen.');try{const api=await getCloud(),profile=gv('scvProfile'),base=typeof fp1100Defaults==='function'?fp1100Defaults({Fahrzeugname:gv('scvName'),Profil:profile,Hersteller:gv('scvManufacturer'),Modell:gv('scvModel'),KennzeichenRegistrierung:gv('scvReg')}):null;if(base){base.identity.name=gv('scvName');base.identity.profile=profile;base.identity.subtype=gv('scvType');base.identity.manufacturer=gv('scvManufacturer');base.identity.model=gv('scvModel');base.identity.identifier=gv('scvId');base.dimensions.length=gv('scvLength');base.dimensions.width=gv('scvWidth');base.dimensions.heightNormal=gv('scvHeight');base.dimensions.draft=gv('scvDraft')}
    const fields={Title:gv('scvName').trim(),DatenraumId:'default',Fahrzeugname:gv('scvName').trim(),Fahrzeugtyp:gv('scvType').trim()||profile,Profil:profile,Hersteller:gv('scvManufacturer').trim(),Modell:gv('scvModel').trim(),KennzeichenRegistrierung:gv('scvReg').trim(),Aktiv:true,SmartCaptureQuelle1104:FP1104.scan.schema?.key||'OCR',SmartCaptureStand1104:new Date().toISOString()};if(base){fields.StammdatenJson1100=JSON.stringify(base);fields.StammdatenStand1100=new Date().toISOString()}
    const v=await api.createItemByName('Fahrzeuge',fields);let copy='';if(document.getElementById('scvStoreCopy')?.checked)copy=await fp1104StoreCopy(FP1104.scan.files);await fp1104SaveDocumentRecord(api,'Fahrzeug',String(v.id),FP1104.scan.schema,FP1104.scan.parsed,'',copy);S.editVehicleId=String(v.id);S.stack=[];S.view='vehiclesconfig';render();alert('Fahrzeug aus Dokument angelegt.');
  }catch(e){alert('Anlegen nicht möglich: '+e.message)}
}

/* Person / qualification scan with identity gate */
async function fp1104PersonView(){
  head(FP1104.scan.personId?'Nachweis aus Dokument':'Person aus Dokument','Smart Capture · Identity Check');await fp1104TryCloudConfig();await fp1104LoadCatalog();const pid=FP1104.scan.personId||String(S.personDetailId||'');FP1104.scan={mode:'person',personId:pid,phase:pid?'identity':'newperson',text:'',schema:null,parsed:null,files:[],identityOk:false,identityParsed:null};
  if(pid){let p=null;try{const api=await getCloud();p=await api.getItemByName('Personen',pid)}catch(e){failBox(e,'persons');return}const f=p.fields||{},anchor=fp1104ParseJson(f.IdentityAnchorJson1104,null);app.innerHTML=`<div class="card fp1104-lock"><div class="section first">1 · Identität bestätigen</div><p><b>${fp1104Esc(f.Anzeigename||f.Title)}</b></p><p class="muted">Vor einem neuen Befähigungsnachweis wird zuerst ein aktueller Identitätsnachweis der bereits angelegten Person geprüft.</p>${anchor?'<div class="fp1104-status">Identitätsanker vorhanden.</div>':'<div class="fp1104-status">Noch kein Identitätsanker vorhanden. Der erste bestätigte Scan legt ihn an.</div>'}<div class="field"><label>Aktuellen Führerschein / Referenzdokument fotografieren</label><input id="fp1104IdentityFiles" type="file" accept="image/*" capture="environment" multiple></div><div class="fp1104-progress"><div id="fp1104-ocrbar"></div></div><div id="fp1104PersonStatus" class="fp1104-status">Identitätsprüfung erforderlich.</div><button class="primary" onclick="fp1104RunIdentityCheck()">Identität prüfen</button></div><div id="fp1104PersonNext"></div>`}else{app.innerHTML=`<div class="card"><div class="section first">Person aus Dokument anlegen</div><div class="field"><label>Führerschein / Personendokument Vorder- und Rückseite</label><input id="fp1104NewPersonFiles" type="file" accept="image/*" capture="environment" multiple></div><div class="fp1104-progress"><div id="fp1104-ocrbar"></div></div><div id="fp1104PersonStatus" class="fp1104-status">Bereit.</div><button class="primary" onclick="fp1104RunNewPersonScan()">Scannen und Person erkennen</button></div><div id="fp1104PersonNext"></div>`}
}
function fp1104ParseJson(v,f=null){try{return v?JSON.parse(v):f}catch{return f}}
async function fp1104RunNewPersonScan(){try{const files=[...(document.getElementById('fp1104NewPersonFiles')?.files||[])];FP1104.scan.files=files;const text=await fp1104OcrFiles(files,'fp1104PersonStatus');FP1104.scan.text=text;const s=fp1104DetectSchema(text,'person');FP1104.scan.schema=s;const p=fp1104ParseQualification(text,s);FP1104.scan.parsed=p;fp1104RenderNewPersonReview(p,s)}catch(e){document.getElementById('fp1104PersonStatus').textContent='Fehler: '+e.message}}
function fp1104RenderNewPersonReview(p,s){const box=document.getElementById('fp1104PersonNext');box.innerHTML=`<div class="card"><div class="section first">Ergebnis prüfen</div><div class="fp1104-status"><b>Dokument:</b> ${fp1104Esc(s?.documentType||'nicht sicher erkannt')}</div><div class="fp1104-review">${fp1104Input('scpFirst','Vorname',p.firstName||'')}${fp1104Input('scpLast','Nachname',p.lastName||'')}${fp1104Input('scpDob','Geburtsdatum',p.birthDate||'','date')}${fp1104Input('scpResidence','Wohnort','')}${FP1104.config.personal.birthPlace?fp1104Input('scpBirthPlace','Geburtsort',p.birthPlace||''):''}${FP1104.config.personal.documentNumber?fp1104Input('scpDocNo','Dokumentnummer',p.documentNumber||''):''}${FP1104.config.personal.expiryDate?fp1104Input('scpExpiry','Dokument gültig bis',p.expiryDate||'','date'):''}</div><div><b>Erkannte Befähigungen:</b> ${p.qualifications?.length?p.qualifications.map(fp1104Esc).join(', '):'keine sicher erkannt'}</div><label class="checkrow"><input id="scpStoreCopy" type="checkbox" ${FP1104.config.personal.documentCopy?'checked':''}> Dokumentkopie lokal auf diesem Gerät speichern</label><button class="primary" onclick="fp1104SaveNewPerson()">Person und erkannte Befähigungen anlegen</button></div>`}
async function fp1104IdentityFromReview(prefix,p){return {firstName:fp1104S(document.getElementById(prefix+'First')?.value??p.firstName),lastName:fp1104S(document.getElementById(prefix+'Last')?.value??p.lastName),birthDate:document.getElementById(prefix+'Dob')?.value||p.birthDate||''}}
async function fp1104SaveNewPerson(){
  const id=await fp1104IdentityFromReview('scp',FP1104.scan.parsed||{});if(!id.firstName||!id.lastName||!id.birthDate)return alert('Vorname, Nachname und Geburtsdatum müssen für den Identitätsanker geprüft sein.');try{const api=await getCloud(),hash=await fp1104HashIdentity(id),name=(id.firstName+' '+id.lastName).trim(),additional={};if(FP1104.config.personal.residence)additional.residence=fp1104S(document.getElementById('scpResidence')?.value);if(FP1104.config.personal.birthPlace)additional.birthPlace=fp1104S(document.getElementById('scpBirthPlace')?.value);if(FP1104.config.personal.documentNumber)additional.documentNumber=fp1104S(document.getElementById('scpDocNo')?.value);if(FP1104.config.personal.expiryDate)additional.expiryDate=document.getElementById('scpExpiry')?.value||'';
    const p=await api.createItemByName('Personen',{Title:name,DatenraumId:'default',Anzeigename:name,Rolle:'Benutzer',Aktiv:true,Vorname1104:id.firstName,Nachname1104:id.lastName,Geburtsdatum1104:new Date(id.birthDate+'T12:00:00').toISOString(),Wohnort1104:additional.residence||'',IdentityAnchorJson1104:JSON.stringify(id),IdentityAnchorHash1104:hash,IdentityGeprueftAm1104:new Date().toISOString(),PersonZusatzdatenJson1104:JSON.stringify(additional)});for(const q of FP1104.scan.parsed.qualifications||[])await fp1104UpsertQualification(api,String(p.id),q,FP1104.scan.parsed);let copy='';if(document.getElementById('scpStoreCopy')?.checked)copy=await fp1104StoreCopy(FP1104.scan.files);await fp1104SaveDocumentRecord(api,'Person',String(p.id),FP1104.scan.schema,FP1104.scan.parsed,hash,copy);S.personDetailId=String(p.id);S.stack=[];S.view='persondetail';render();alert('Person aus Dokument angelegt und Identitätsanker gesetzt.');
  }catch(e){alert('Person konnte nicht angelegt werden: '+e.message)}
}
async function fp1104RunIdentityCheck(){
  try{const files=[...(document.getElementById('fp1104IdentityFiles')?.files||[])];if(!files.length)throw new Error('Bitte Referenzdokument fotografieren.');FP1104.scan.files=files;const text=await fp1104OcrFiles(files,'fp1104PersonStatus'),s=fp1104DetectSchema(text,'person'),p=fp1104ParseQualification(text,s);FP1104.scan.identityParsed=p;FP1104.scan.schema=s;fp1104RenderIdentityReview(p)}catch(e){document.getElementById('fp1104PersonStatus').textContent='Fehler: '+e.message}
}
function fp1104RenderIdentityReview(p){const box=document.getElementById('fp1104PersonNext');box.innerHTML=`<div class="card"><div class="section first">Erkannte Identität prüfen</div><div class="fp1104-review">${fp1104Input('sciFirst','Vorname',p.firstName||'')}${fp1104Input('sciLast','Nachname',p.lastName||'')}${fp1104Input('sciDob','Geburtsdatum',p.birthDate||'','date')}</div><button class="primary" onclick="fp1104ConfirmIdentity()">Mit Personendatensatz vergleichen</button></div>`}
async function fp1104ConfirmIdentity(){
  try{const api=await getCloud(),person=await api.getItemByName('Personen',FP1104.scan.personId),f=person.fields||{},scanned={firstName:fp1104S(document.getElementById('sciFirst')?.value),lastName:fp1104S(document.getElementById('sciLast')?.value),birthDate:document.getElementById('sciDob')?.value||''};if(!scanned.firstName||!scanned.lastName||!scanned.birthDate)return alert('Vorname, Nachname und Geburtsdatum prüfen.');let anchor=fp1104ParseJson(f.IdentityAnchorJson1104,null);const hash=await fp1104HashIdentity(scanned);if(!anchor){anchor=scanned;await api.updateItemByName('Personen',FP1104.scan.personId,{Vorname1104:scanned.firstName,Nachname1104:scanned.lastName,Geburtsdatum1104:new Date(scanned.birthDate+'T12:00:00').toISOString(),IdentityAnchorJson1104:JSON.stringify(scanned),IdentityAnchorHash1104:hash,IdentityGeprueftAm1104:new Date().toISOString()})}
    const ok=fp1104Norm(anchor.firstName)===fp1104Norm(scanned.firstName)&&fp1104Norm(anchor.lastName)===fp1104Norm(scanned.lastName)&&String(anchor.birthDate)===String(scanned.birthDate);if(!ok){const st=document.getElementById('fp1104PersonStatus');if(st)st.innerHTML='<b>Identität stimmt nicht mit dem hinterlegten Personendatensatz überein.</b> Neuer Nachweis bleibt gesperrt.';return}
    FP1104.scan.identityOk=true;FP1104.scan.identityParsed=scanned;{const st=document.getElementById('fp1104PersonStatus');if(st)st.innerHTML='<b>Identität bestätigt.</b> Neuer Nachweis ist freigegeben.';}fp1104RenderQualificationScan();
  }catch(e){alert(e.message)}
}
function fp1104RenderQualificationScan(){const box=document.getElementById('fp1104PersonNext');box.innerHTML=`<div class="card"><div class="section first">2 · Neuen Befähigungsnachweis erfassen</div><div class="field"><label>Dokumentfoto(s)</label><input id="fp1104QualFiles" type="file" accept="image/*" capture="environment" multiple></div><div class="fp1104-progress"><div id="fp1104-ocrbar"></div></div><div id="fp1104QualStatus" class="fp1104-status">Identität ist freigegeben.</div><button class="primary" onclick="fp1104RunQualificationScan()">Nachweis scannen</button></div><div id="fp1104QualReview"></div>`}
async function fp1104RunQualificationScan(){try{const files=[...(document.getElementById('fp1104QualFiles')?.files||[])];FP1104.scan.files=files;const text=await fp1104OcrFiles(files,'fp1104QualStatus'),s=fp1104DetectSchema(text,'person'),p=fp1104ParseQualification(text,s);FP1104.scan.text=text;FP1104.scan.schema=s;FP1104.scan.parsed=p;const b=document.getElementById('fp1104QualReview');b.innerHTML=`<div class="card"><div class="section first">Nachweis prüfen</div><div class="fp1104-status">${fp1104Esc(s?.documentType||'Dokumenttyp nicht sicher erkannt')}</div><div class="field"><label>Erkannte Befähigungen (kommagetrennt, korrigierbar)</label><input id="scqQuals" value="${fp1104Esc((p.qualifications||[]).join(', '))}"></div>${FP1104.config.personal.documentNumber?fp1104Input('scqDocNo','Dokumentnummer',p.documentNumber||''):''}${FP1104.config.personal.expiryDate?fp1104Input('scqExpiry','Gültig bis',p.expiryDate||'','date'):''}<label class="checkrow"><input id="scqStoreCopy" type="checkbox" ${FP1104.config.personal.documentCopy?'checked':''}> Dokumentkopie lokal auf diesem Gerät speichern</label><button class="primary" onclick="fp1104SaveQualificationScan()">Nachweis hinzufügen</button></div>`}catch(e){document.getElementById('fp1104QualStatus').textContent='Fehler: '+e.message}}
async function fp1104SaveQualificationScan(){if(!FP1104.scan.identityOk)return alert('Identitätsprüfung fehlt.');const qs=fp1104S(document.getElementById('scqQuals')?.value).split(',').map(x=>x.trim()).filter(Boolean);if(!qs.length)return alert('Mindestens eine Befähigung angeben.');try{const api=await getCloud();const p={...FP1104.scan.parsed,documentNumber:document.getElementById('scqDocNo')?.value||FP1104.scan.parsed?.documentNumber||'',expiryDate:document.getElementById('scqExpiry')?.value||FP1104.scan.parsed?.expiryDate||''};for(const q of qs)await fp1104UpsertQualification(api,FP1104.scan.personId,q,p);const h=await fp1104HashIdentity(FP1104.scan.identityParsed),copy=document.getElementById('scqStoreCopy')?.checked?await fp1104StoreCopy(FP1104.scan.files):'';await fp1104SaveDocumentRecord(api,'Person',FP1104.scan.personId,FP1104.scan.schema,p,h,copy);S.personDetailId=FP1104.scan.personId;S.stack=[];S.view='persondetail';render();alert('Nachweis nach Identitätsprüfung hinzugefügt.')}catch(e){alert(e.message)}}
async function fp1104UpsertQualification(api,pid,name,p){const all=await list(api,'Befaehigungen'),hit=all.find(x=>String(x.fields.PersonId)===String(pid)&&fp1104Norm(x.fields.Art)===fp1104Norm(name)),f={PersonId:String(pid),Art:name,Vorhanden:true,Aktiv:true};if(FP1104.config.personal.documentNumber&&p.documentNumber)f.Nummer=p.documentNumber;if(FP1104.config.personal.issuer&&p.issuer)f.Aussteller=p.issuer;if(FP1104.config.personal.issueDate&&p.issueDate)f.GueltigVon=new Date(p.issueDate+'T12:00:00').toISOString();if(FP1104.config.personal.expiryDate&&p.expiryDate)f.GueltigBis=new Date(p.expiryDate+'T12:00:00').toISOString();if(hit)await api.updateItemByName('Befaehigungen',hit.id,f);else await api.createItemByName('Befaehigungen',f)}
async function fp1104SaveDocumentRecord(api,type,id,s,p,identityHash,copy){const c=FP1104.config||fp1104LoadLocalConfig(),x={...p};if(!c.personal.documentNumber)delete x.documentNumber;if(!c.personal.birthPlace)delete x.birthPlace;if(!c.personal.issuer)delete x.issuer;if(!c.personal.issueDate)delete x.issueDate;if(!c.personal.expiryDate)delete x.expiryDate;const f={Title:`${type} · ${s?.documentType||'Dokument'}`,BezugTyp:type,BezugId:String(id),SchemaKey:s?.key||'',Dokumentart:s?.documentType||'',Land:s?.country||'',Dokumentnummer:c.personal.documentNumber?(p.documentNumber||''):'',IdentityHash:identityHash||'',ExtrahiertJson:JSON.stringify(x),OcrText:c.personal.rawOcr?(FP1104.scan.text||''):'',KopieRef:copy||'',ErkanntAm:new Date().toISOString(),GeprueftAm:new Date().toISOString(),Aktiv:true};if(c.personal.issueDate&&p.issueDate)f.GueltigVon=new Date(p.issueDate+'T12:00:00').toISOString();if(c.personal.expiryDate&&p.expiryDate)f.GueltigBis=new Date(p.expiryDate+'T12:00:00').toISOString();await api.createItemByName('SmartCaptureDokumente1104',f)}

/* version marker */
(function(){const f=document.querySelector('footer');if(f)f.textContent='Fahrzeugplattform · '+FP1104_VERSION+' · © 2026 Entwicklungsstand'})();
