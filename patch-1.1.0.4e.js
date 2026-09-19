/* MOBIMORY 1.1.0.4e-dev – lernender Feld-Mapping-Editor */
const FP1104E_VERSION='1.1.0.4e-dev';
const FP1104E={pairs:[],maps:{},schemaKey:''};

(function(){
  if(document.getElementById('fp1104e-style'))return;
  const s=document.createElement('style');s.id='fp1104e-style';s.textContent=`
    .fp1104e-card{margin-top:10px}
    .fp1104e-maprow{display:grid;grid-template-columns:minmax(180px,1fr) minmax(180px,1.4fr) minmax(210px,1fr);gap:8px;align-items:end;padding:9px 0;border-bottom:1px solid rgba(120,120,120,.16)}
    .fp1104e-maprow:last-child{border-bottom:0}
    .fp1104e-maprow label{font-size:.76rem;opacity:.72;display:block;margin-bottom:3px}
    .fp1104e-maprow input,.fp1104e-maprow select{width:100%}
    .fp1104e-summary{padding:9px 10px;border-radius:9px;background:rgba(80,120,180,.07);margin:8px 0}
    .fp1104e-known{font-size:.8rem;opacity:.75}
    @media(max-width:760px){.fp1104e-maprow{grid-template-columns:1fr}}
  `;document.head.appendChild(s);
})();

function fp1104eSetVersion(){
  const f=document.querySelector('footer');
  if(f)f.textContent='Fahrzeugplattform · '+FP1104E_VERSION+' · © 2026 Entwicklungsstand';
}
function fp1104eNorm(v){
  return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
}
function fp1104eLocalAll(){
  try{return JSON.parse(localStorage.getItem('fp1104e-fieldmaps')||'{}')||{}}catch{return{}}
}
function fp1104eLocalFor(key){return fp1104eLocalAll()[key]||{}}
function fp1104eSaveLocal(key,maps){
  const all=fp1104eLocalAll();all[key]={...(all[key]||{}),...maps};
  localStorage.setItem('fp1104e-fieldmaps',JSON.stringify(all));FP1104E.maps=all[key];
}
function fp1104eTargets(){
  return [
    ['','– nicht zuordnen / ignorieren –'],
    ['vehicle.name','Fahrzeug · Name'],
    ['vehicle.type','Fahrzeug · Typ'],
    ['vehicle.manufacturer','Fahrzeug · Hersteller'],
    ['vehicle.model','Fahrzeug · Modell'],
    ['vehicle.year','Fahrzeug · Baujahr'],
    ['vehicle.identifier','Fahrzeug · FIN / CIN / HIN'],
    ['vehicle.registration','Fahrzeug · Kennzeichen / Registrierung'],
    ['vehicle.firstRegistration','Fahrzeug · Erstzulassung'],
    ['vehicle.powerKw','Fahrzeug · Leistung kW'],
    ['dimensions.length','Abmessungen · Länge'],
    ['dimensions.width','Abmessungen · Breite'],
    ['dimensions.height','Abmessungen · Höhe'],
    ['dimensions.draft','Abmessungen · Tiefgang'],
    ['dimensions.displacement','Abmessungen · Verdrängung']
  ];
}
function fp1104eSuggestedTarget(label){
  const n=fp1104eNorm(label);
  if(/BOOTSNAME|VESSELNAME|NOMDUBATEAU/.test(n))return'vehicle.name';
  if(/HERSTELLER|MANUFACTURER|CONSTRUCTEUR|WERFT/.test(n))return'vehicle.manufacturer';
  if(/BAUJAHR|YEAR|JAHR|ANNEE/.test(n))return'vehicle.year';
  if(/FAHRZEUGTYP|CRAFTTYPE|TYPEOFCRAFT|BOOTSTYP/.test(n))return'vehicle.model';
  if(/MODELL|MODEL/.test(n))return'vehicle.model';
  if(/HIN|CIN|RUMPFNUMMER|HULLIDENTIFICATION/.test(n))return'vehicle.identifier';
  if(/KENNZEICHEN|REGISTRATIONNUMBER|OFFICIALREGISTRATION|REGISTRIER/.test(n))return'vehicle.registration';
  if(/ERSTZULASSUNG|FIRSTREGISTRATION/.test(n))return'vehicle.firstRegistration';
  if(/LEISTUNG|POWERKW|MOTORLEISTUNG/.test(n))return'vehicle.powerKw';
  if(/LANGEGA|LENGTHOVERALL|LONGUEURHORS|LENGTH/.test(n))return'dimensions.length';
  if(/BREITE|BEAM|WIDTH|LARGEUR/.test(n))return'dimensions.width';
  if(/HOHE|HEIGHT|TIRANTDAIR/.test(n))return'dimensions.height';
  if(/TIEFGANG|DRAUGHT|DRAFT|TIRANTDEAU/.test(n))return'dimensions.draft';
  if(/VERDRANGUNG|DISPLACEMENT|DEPLACEMENT/.test(n))return'dimensions.displacement';
  return'';
}
function fp1104eExtractPairs(text){
  const out=[],seen=new Set(),lines=String(text||'').split(/\r?\n/);
  for(const raw of lines){
    const line=String(raw||'').trim();
    if(!line||/^---/.test(line)||line.length>220)continue;
    const rx=/([A-Za-zÄÖÜäöüßÀ-ÿ][A-Za-zÄÖÜäöüßÀ-ÿ0-9 .()\/'’\-]{1,48})\s*:\s*/g;
    const hits=[];let m;
    while((m=rx.exec(line))!==null)hits.push({label:m[1].replace(/\s+/g,' ').trim(),start:m.index,end:rx.lastIndex});
    if(hits.length){
      for(let i=0;i<hits.length;i++){
        const h=hits[i],next=hits[i+1],value=line.slice(h.end,next?next.start:line.length).replace(/^[\s:;|=-]+/,'').replace(/\s+/g,' ').trim();
        if(!h.label||!value||h.label.length>55)continue;
        const key=fp1104eNorm(h.label)+'|'+fp1104eNorm(value);if(seen.has(key))continue;
        seen.add(key);out.push({label:h.label,value});
      }
      continue;
    }
    const cols=line.split(/\s{3,}/).map(x=>x.trim()).filter(Boolean);
    if(cols.length===2&&cols[0].length>=2&&cols[0].length<=45&&cols[1].length<=90){
      const key=fp1104eNorm(cols[0])+'|'+fp1104eNorm(cols[1]);
      if(!seen.has(key)){seen.add(key);out.push({label:cols[0],value:cols[1]})}
    }
  }
  return out.slice(0,60);
}
async function fp1104eLoadCloudMaps(schema){
  if(!schema?.key)return{};
  try{
    const api=await getCloud(),rows=await list(api,'DokumentSchemas1104');
    const row=rows.find(x=>x.fields.SchemaKey===schema.key);
    if(!row?.fields?.SchemaJson)return{};
    return JSON.parse(row.fields.SchemaJson)?.learnedMappings||{};
  }catch{return{}}
}
async function fp1104eSaveCloudMaps(schema,maps){
  if(!schema?.key)return;
  try{
    const api=await getCloud(),rows=await list(api,'DokumentSchemas1104'),row=rows.find(x=>x.fields.SchemaKey===schema.key);
    let j={...schema};if(row?.fields?.SchemaJson){try{j={...j,...JSON.parse(row.fields.SchemaJson)}}catch{}}
    j.learnedMappings={...(j.learnedMappings||{}),...maps};j.mappingUpdatedAt=new Date().toISOString();
    const f={Title:schema.documentType||schema.key,SchemaKey:schema.key,Dokumentart:schema.documentType||'',Land:schema.country||'',Bereich:schema.domain||'',Status:String(schema.status||''),SchemaJson:JSON.stringify(j),QuelleUrl:schema.sourceUrl||'',QuelleTitel:schema.sourceTitle||'',AktualisiertAm:new Date().toISOString(),Aktiv:true};
    if(row)await api.updateItemByName('DokumentSchemas1104',row.id,f);else await api.createItemByName('DokumentSchemas1104',f);
  }catch(e){console.warn('Mapping cloud save:',e)}
}
function fp1104eSelectHtml(id,value){
  return `<select id="${id}">${fp1104eTargets().map(([v,t])=>`<option value="${fp1104Esc(v)}" ${v===value?'selected':''}>${fp1104Esc(t)}</option>`).join('')}</select>`;
}
function fp1104eEnsureExtraVehicleFields(){
  const grid=document.querySelector('#fp1104VehicleReview .fp1104-review');if(!grid)return;
  if(!document.getElementById('scvYear'))grid.insertAdjacentHTML('beforeend',fp1104Input('scvYear','Baujahr','','number','min="1800" max="2100"'));
  if(!document.getElementById('scvDisplacement'))grid.insertAdjacentHTML('beforeend',fp1104Input('scvDisplacement','Verdrängung t','','number','step="0.001"'));
}
function fp1104eValueForTarget(v,target){
  let s=String(v||'').trim();
  if(target==='vehicle.year'){const m=s.match(/\b(18|19|20)\d{2}\b/);return m?m[0]:s}
  if(['vehicle.powerKw','dimensions.length','dimensions.width','dimensions.height','dimensions.draft','dimensions.displacement'].includes(target)){
    const m=s.replace(/\./g,'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?m[0]:s;
  }
  return s;
}
function fp1104eApplyTarget(target,value){
  const ids={'vehicle.name':'scvName','vehicle.type':'scvType','vehicle.manufacturer':'scvManufacturer','vehicle.model':'scvModel','vehicle.year':'scvYear','vehicle.identifier':'scvId','vehicle.registration':'scvReg','vehicle.firstRegistration':'scvFirst','vehicle.powerKw':'scvPower','dimensions.length':'scvLength','dimensions.width':'scvWidth','dimensions.height':'scvHeight','dimensions.draft':'scvDraft','dimensions.displacement':'scvDisplacement'};
  const el=document.getElementById(ids[target]||'');if(!el)return false;
  el.value=fp1104eValueForTarget(value,target);return true;
}
function fp1104eApplyKnown(){
  for(const p of FP1104E.pairs){
    const target=FP1104E.maps[fp1104eNorm(p.label)]||'';if(target)fp1104eApplyTarget(target,p.value);
  }
}
async function fp1104eRenderMapper(){
  const schema=FP1104.scan?.schema,text=FP1104.scan?.text;if(!schema||!text)return;
  fp1104eEnsureExtraVehicleFields();
  FP1104E.maps={...(await fp1104eLoadCloudMaps(schema)),...fp1104eLocalFor(schema.key)};
  FP1104E.schemaKey=schema.key;FP1104E.pairs=fp1104eExtractPairs(text);
  const review=document.getElementById('fp1104VehicleReview');if(!review)return;
  review.querySelector('#fp1104eMapper')?.remove();
  const knownCount=FP1104E.pairs.filter(p=>FP1104E.maps[fp1104eNorm(p.label)]).length;
  const card=document.createElement('div');card.id='fp1104eMapper';card.className='card fp1104e-card';
  card.innerHTML=`<div class="section first">Scan-Felder zu MobiMory zuordnen</div>
    <p class="muted">Links: erkannter Feldname. Mitte: erkannter Inhalt. Rechts: passendes MobiMory-Feld. Feldname und Inhalt können korrigiert werden.</p>
    <div class="fp1104e-summary"><b>${FP1104E.pairs.length}</b> Feld/Wert-Paare erkannt · <b>${knownCount}</b> bereits gelernt.</div>
    <div id="fp1104eRows">${FP1104E.pairs.map((p,i)=>{const learned=FP1104E.maps[fp1104eNorm(p.label)]||'',suggested=learned||fp1104eSuggestedTarget(p.label);return `<div class="fp1104e-maprow"><div><label>Feldname im Scan</label><input id="fp1104eLabel${i}" value="${fp1104Esc(p.label)}"></div><div><label>Erkannter Inhalt</label><input id="fp1104eValue${i}" value="${fp1104Esc(p.value)}"></div><div><label>MobiMory-Feld ${learned?'<span class="fp1104e-known">· gelernt</span>':''}</label>${fp1104eSelectHtml('fp1104eTarget'+i,suggested)}</div></div>`}).join('')||'<p class="muted">Keine Feld/Wert-Paare gefunden. Eine Zeile kann manuell ergänzt werden.</p>'}</div>
    <div class="actions"><button type="button" onclick="fp1104eAddRow()">+ Zuordnung ergänzen</button><button type="button" onclick="fp1104eApply(false)">Nur übernehmen</button><button type="button" class="primary" onclick="fp1104eApply(true)">Übernehmen & für dieses Dokument merken</button></div>`;
  const debug=review.querySelector('#fp1104cOcrDebug');if(debug)review.insertBefore(card,debug);else review.appendChild(card);
  fp1104eApplyKnown();
}
function fp1104eAddRow(){
  const i=FP1104E.pairs.length;FP1104E.pairs.push({label:'',value:''});
  const host=document.getElementById('fp1104eRows');if(!host)return;
  const row=document.createElement('div');row.className='fp1104e-maprow';row.innerHTML=`<div><label>Feldname im Scan</label><input id="fp1104eLabel${i}"></div><div><label>Erkannter Inhalt</label><input id="fp1104eValue${i}"></div><div><label>MobiMory-Feld</label>${fp1104eSelectHtml('fp1104eTarget'+i,'')}</div>`;host.appendChild(row);
}
async function fp1104eApply(remember){
  const schema=FP1104.scan?.schema;if(!schema)return alert('Dokumenttyp fehlt.');
  const newMaps={};let applied=0,learned=0;
  for(let i=0;i<FP1104E.pairs.length;i++){
    const label=document.getElementById('fp1104eLabel'+i)?.value?.trim()||'',value=document.getElementById('fp1104eValue'+i)?.value?.trim()||'',target=document.getElementById('fp1104eTarget'+i)?.value||'';
    if(!label||!value||!target)continue;
    if(fp1104eApplyTarget(target,value))applied++;
    if(remember){newMaps[fp1104eNorm(label)]=target;learned++}
  }
  if(remember&&Object.keys(newMaps).length){fp1104eSaveLocal(schema.key,newMaps);await fp1104eSaveCloudMaps(schema,newMaps);alert(`${applied} Wert(e) übernommen. ${learned} Zuordnung(en) für ${schema.documentType} gemerkt.`)}
  else alert(`${applied} Wert(e) übernommen.`);
}

if(typeof fp1104RunVehicleScan==='function'){
  const base=fp1104RunVehicleScan;
  fp1104RunVehicleScan=async function(){await base();if(FP1104.scan?.text&&FP1104.scan?.schema)await fp1104eRenderMapper();fp1104eSetVersion()};
}
if(typeof render==='function'){
  const baseRender=render;render=function(){const r=baseRender();setTimeout(fp1104eSetVersion,0);return r};
}
fp1104eSetVersion();
