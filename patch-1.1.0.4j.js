/* MOBIMORY 1.1.0.4j-dev – Template-Gate + OCR-Sicherheitsgate */
const FP1104J_VERSION='1.1.0.4j-dev';
const FP1104J_ENGINE='1.1.0.4j';
const FP1104J={stale:{},autoTrainerStarted:{}};

(function(){
  if(document.getElementById('fp1104j-style'))return;
  const s=document.createElement('style');s.id='fp1104j-style';s.textContent=`
    .fp1104j-warn{padding:11px 12px;margin:9px 0;border:1px solid rgba(210,120,20,.3);border-radius:10px;background:rgba(210,120,20,.10)}
    .fp1104j-warn b{display:block;margin-bottom:4px}
    .fp1104j-uncertain{opacity:.75;font-style:italic}
  `;document.head.appendChild(s);
})();

function fp1104jSetVersion(){
  const f=document.querySelector('footer');
  if(f)f.textContent='Fahrzeugplattform · '+FP1104J_VERSION+' · © 2026 Entwicklungsstand';
  const sub=document.getElementById('sub');
  if(sub&&/Smart Capture/i.test(sub.textContent||''))sub.textContent=(sub.textContent||'').replace(/1\.1\.0\.4[a-z]?/ig,'1.1.0.4j');
}
function fp1104jEsc(v){return typeof fp1104Esc==='function'?fp1104Esc(v):String(v??'')}

function fp1104jTemplateCompatible(tpl){
  if(!tpl||tpl.version!==FP1104J_ENGINE||tpl.engineVersion!==FP1104J_ENGINE)return false;
  const pages=Object.values(tpl.pages||{});if(!pages.length)return false;
  for(const p of pages){
    const zones=p?.zones||{},meta=p?.fieldMeta||{};
    for(const key of Object.keys(zones))if(!meta[key]?.fieldType)return false;
  }
  return true;
}

/* Alte Templates bleiben gespeichert, werden aber nicht benutzt. */
if(typeof fp1104hLoadTemplate==='function'){
  const baseLoad=fp1104hLoadTemplate;
  fp1104hLoadTemplate=async function(schema){
    const tpl=await baseLoad(schema);
    if(!tpl)return null;
    if(fp1104jTemplateCompatible(tpl))return tpl;
    if(schema?.key)FP1104J.stale[schema.key]=tpl;
    return null;
  };
}

/* Nach erfolgreicher Neuanlernung Template eindeutig auf Engine j setzen. */
if(typeof fp1104hSaveTrainer==='function'){
  const baseSaveTrainer=fp1104hSaveTrainer;
  fp1104hSaveTrainer=async function(){
    const t=FP1104H?.trainer;
    const schema=t?.schema,context=t?.context,pageKey=t?.pageKey;
    await baseSaveTrainer();
    if(!schema?.key)return;
    const tpl=typeof fp1104hLocalTemplate==='function'?fp1104hLocalTemplate(schema.key):null;
    if(!tpl)return;
    tpl.version=FP1104J_ENGINE;tpl.engineVersion=FP1104J_ENGINE;tpl.validatedStructure=true;tpl.updatedAt=new Date().toISOString();
    fp1104hSaveLocalTemplate(schema.key,tpl);await fp1104hSaveCloudTemplate(schema,tpl);
    if(FP1104H?.templateCache)FP1104H.templateCache[schema.key]=tpl;
    delete FP1104J.stale[schema.key];
    if(context&&pageKey)delete FP1104J.autoTrainerStarted[context+'|'+pageKey+'|'+schema.key];
  };
}

function fp1104jContextSchema(context){
  const ids={vehicle:'fp1104dVehicleSchema',newperson:'fp1104dNewPersonSchema',identity:'fp1104dIdentitySchema',qualification:'fp1104dQualSchema'};
  const key=document.getElementById(ids[context]||'')?.value||FP1104D?.captures?.[context]?.schemaKey||'';
  return key?fp1104dSchemaByKey(key):null;
}
function fp1104jStatusId(context){return context==='vehicle'?'fp1104VehicleStatus':context==='qualification'?'fp1104QualStatus':'fp1104PersonStatus'}
function fp1104jRequireTemplateMessage(context,schema){
  const st=document.getElementById(fp1104jStatusId(context)),old=FP1104J.stale[schema?.key];
  if(st)st.innerHTML=old
    ?`<b>Dokumentart bekannt – altes visuelles Template gesperrt.</b> Vorlage ${fp1104jEsc(old.version||'alt')} wird nicht verwendet. Die aktuelle Dokumentseite muss neu angelernt werden.`
    :`<b>Dokumentart bekannt – noch kein aktuelles visuelles Template.</b> Die Dokumentseite muss einmal angelernt werden.`;
}

/* Nach der ersten Aufnahme bei fehlender/veralteter Vorlage direkt Anlernen starten. */
if(typeof fp1104dRefreshPage==='function'){
  const baseRefresh=fp1104dRefreshPage;
  fp1104dRefreshPage=function(context,key){
    const r=baseRefresh(context,key);
    setTimeout(async()=>{
      const schema=FP1104D?.captures?.[context]?.schema||fp1104jContextSchema(context);if(!schema)return;
      const tpl=await fp1104hLoadTemplate(schema);if(tpl)return;
      fp1104jRequireTemplateMessage(context,schema);
      const slot=FP1104D?.captures?.[context]?.slots?.[key],id=context+'|'+key+'|'+schema.key;
      if(slot?.blob&&!FP1104J.autoTrainerStarted[id]){
        FP1104J.autoTrainerStarted[id]=true;
        setTimeout(()=>fp1104hStartTrainer(context,key,schema.key),100);
      }
    },0);
    return r;
  };
}

/* Dokumentansicht zeigt klar, dass Dokumentart != gültiges visuelles Template. */
if(typeof fp1104hDecorateCapture==='function'){
  const baseDecorate=fp1104hDecorateCapture;
  fp1104hDecorateCapture=async function(context,schema){
    await baseDecorate(context,schema);if(!schema)return;
    const tpl=await fp1104hLoadTemplate(schema);if(tpl)return;
    const root=document.getElementById('fp1104d-capture-'+context);if(!root)return;
    root.querySelectorAll('.fp1104j-warn').forEach(x=>x.remove());
    const old=FP1104J.stale[schema.key];
    root.insertAdjacentHTML('afterbegin',`<div class="fp1104j-warn"><b>${old?'Vorhandenes Template ist veraltet':'Kein aktuelles visuelles Template vorhanden'}</b><div>${old?`Die alte Vorlage ${fp1104jEsc(old.version||'')} wird bewusst nicht benutzt.`:'MobiMory kennt die Dokumentart, aber noch nicht sicher deren visuelles Feldlayout.'} Nach der ersten Seitenaufnahme startet die Anlernung automatisch.</div></div>`);
  };
}

/* -------- OCR-Sicherheitsgate -------- */
function fp1104jValidDateText(v){
  const m=String(v||'').match(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\b/);if(!m)return false;
  const d=+m[1],mo=+m[2],y=+(m[3].length===2?'20'+m[3]:m[3]);return d>=1&&d<=31&&mo>=1&&mo<=12&&y>=1900&&y<=2200;
}
function fp1104jGate(d){
  const type=d?.fieldType||'singleLineText',text=String(d?.text||'').trim(),conf=Number(d?.confidence||0);
  const plaus=typeof fp1104iPlausibility==='function'?fp1104iPlausibility(text,type):0,score=(conf/100)*.55+plaus*.45;
  let accepted=false;
  if(!text)accepted=false;
  else if(type==='date')accepted=fp1104jValidDateText(text)&&score>=.64;
  else if(type==='id')accepted=conf>=45&&score>=.68;
  else if(type==='number')accepted=conf>=50&&score>=.70;
  else if(type==='tokenList')accepted=conf>=55&&score>=.72;
  else{
    const q=text.replace(/\s/g,''),letters=(q.match(/[A-Za-zÄÖÜäöüßÀ-ÿ]/g)||[]).length,letterRatio=letters/Math.max(1,q.length);
    const suspicious=(text.match(/\b[A-Z]{2,}\b/g)||[]).length>=3||/www|[<>_=]/i.test(text);
    accepted=conf>=60&&score>=.66&&letterRatio>=.65&&!suspicious;
  }
  return{accepted,score,plausibility:plaus};
}

if(typeof fp1104hOcrTemplate==='function'){
  const baseOcrTemplate=fp1104hOcrTemplate;
  fp1104hOcrTemplate=async function(context,schema,statusId){
    const res=await baseOcrTemplate(context,schema,statusId);if(!res)return res;
    let rejected=0;
    for(const d of res.debug||[]){
      const g=fp1104jGate(d);d.accepted=g.accepted;d.gateScore=g.score;d.plausibility=g.plausibility;
      if(!g.accepted){res.values[d.fieldKey]='';rejected++}
    }
    res.rejectedCount=rejected;res.acceptedCount=(res.debug?.length||0)-rejected;
    setTimeout(()=>{
      const st=document.getElementById(statusId);if(!st)return;
      st.innerHTML=rejected
        ?`<b>Scan ausgewertet.</b> ${res.acceptedCount} Feld(er) sicher übernommen, ${rejected} unsicher und deshalb leer gelassen. Bitte Ergebnis prüfen.`
        :`<b>Scan ausgewertet.</b> Alle gelesenen Felder haben das Sicherheitsgate bestanden. Bitte Ergebnis prüfen.`;
    },0);
    return res;
  };
}

fp1104hRenderTemplateDebug=function(host,res){
  if(!host||!res?.debug?.length)return;
  host.querySelector('#fp1104hTemplateDebug')?.remove();
  const d=document.createElement('div');d.id='fp1104hTemplateDebug';d.className='card';
  d.innerHTML=`<div class="section first">Dokument-Engine · gelesene Bereiche</div><p class="muted"><b>${res.acceptedCount||0}</b> übernommen · <b>${res.rejectedCount||0}</b> unsicher und leer gelassen.</p><div class="fp1104f-debuggrid">${res.debug.map(x=>`<div class="fp1104f-zone"><img src="${x.image||''}"><b>${fp1104jEsc(x.fieldKey)}</b><div class="${x.accepted?'':'fp1104j-uncertain'}">${x.accepted?fp1104jEsc(x.text||''):'⚠ unsicher – nicht übernommen'}</div><div class="fp1104i-method">${fp1104jEsc(x.method||'')} · ${fp1104jEsc(typeof fp1104iFieldTypeLabel==='function'?fp1104iFieldTypeLabel(x.fieldType):x.fieldType||'')} · ${fp1104jEsc(x.variant||'')} · OCR ${Math.round(x.confidence||0)} %</div></div>`).join('')}</div>`;
  host.appendChild(d);
};

/* Kein alter Vollseiten-OCR-Fallback mehr: alle Dokumenttypen brauchen aktuelles Template. */
function fp1104jGuardScan(context,run){
  return async function(){
    const schema=fp1104jContextSchema(context);if(!schema)return run();
    const tpl=await fp1104hLoadTemplate(schema);if(!tpl){fp1104jRequireTemplateMessage(context,schema);return}
    return run();
  };
}
if(typeof fp1104RunNewPersonScan==='function')fp1104RunNewPersonScan=fp1104jGuardScan('newperson',fp1104RunNewPersonScan);
if(typeof fp1104RunIdentityCheck==='function')fp1104RunIdentityCheck=fp1104jGuardScan('identity',fp1104RunIdentityCheck);
if(typeof fp1104RunVehicleScan==='function')fp1104RunVehicleScan=fp1104jGuardScan('vehicle',fp1104RunVehicleScan);
if(typeof fp1104RunQualificationScan==='function')fp1104RunQualificationScan=fp1104jGuardScan('qualification',fp1104RunQualificationScan);

/* Ergebnisprüfung: Wohnort raus, Ausstellungsdatum + Behörde rein, Klassen sichtbar. */
fp1104RenderNewPersonReview=function(p,s){
  const box=document.getElementById('fp1104PersonNext');if(!box)return;
  const quals=[...(p.qualifications||[]),...(p.classes||[])].filter((v,i,a)=>v&&a.indexOf(v)===i);
  box.innerHTML=`<div class="card"><div class="section first">Ergebnis prüfen</div><div class="fp1104-status"><b>Dokument:</b> ${fp1104jEsc(s?.documentType||'nicht sicher erkannt')}</div><div class="fp1104-review">${fp1104Input('scpFirst','Vorname',p.firstName||'')}${fp1104Input('scpLast','Nachname',p.lastName||'')}${fp1104Input('scpDob','Geburtsdatum',p.birthDate||'','date')}${FP1104.config.personal.birthPlace?fp1104Input('scpBirthPlace','Geburtsort',p.birthPlace||''):''}${FP1104.config.personal.documentNumber?fp1104Input('scpDocNo','Dokumentnummer',p.documentNumber||''):''}${fp1104Input('scpIssueDate','Ausstellungsdatum',p.issueDate||'','date')}${FP1104.config.personal.expiryDate?fp1104Input('scpExpiry','Dokument gültig bis',p.expiryDate||'','date'):''}${fp1104Input('scpIssuer','Ausstellende Behörde',p.issuer||'')}</div><div><b>Erkannte Befähigungen/Klassen:</b> ${quals.length?quals.map(fp1104jEsc).join(', '):'keine sicher erkannt'}</div><label class="checkrow"><input id="scpStoreCopy" type="checkbox" ${FP1104.config.personal.documentCopy?'checked':''}> Dokumentkopie lokal auf diesem Gerät speichern</label><button class="primary" onclick="fp1104SaveNewPerson()">Person und erkannte Befähigungen anlegen</button></div>`;
};

/* Korrekturen für Behörde/Ausstellungsdatum vor dem Speichern in den Dokumentdatensatz übernehmen. */
if(typeof fp1104SaveNewPerson==='function'){
  const baseSavePerson=fp1104SaveNewPerson;
  fp1104SaveNewPerson=async function(){
    FP1104.scan.parsed=FP1104.scan.parsed||{};
    FP1104.scan.parsed.issueDate=document.getElementById('scpIssueDate')?.value||FP1104.scan.parsed.issueDate||'';
    FP1104.scan.parsed.issuer=document.getElementById('scpIssuer')?.value?.trim()||FP1104.scan.parsed.issuer||'';
    return baseSavePerson();
  };
}

if(typeof render==='function'){
  const baseRender=render;render=function(){const r=baseRender();setTimeout(fp1104jSetVersion,0);return r};
}
fp1104jSetVersion();
