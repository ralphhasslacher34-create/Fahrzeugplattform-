/* MOBIMORY / Fahrzeugplattform 1.0.6.2-dev
   Qualitäts- und Infrastruktur-Patch:
   - Reisecheck-Wegpunkte vollständig (Standort + Ort + Land + Adresse/GPS)
   - keine hypothetischen Grenzregeln bei rein nationaler/unklarer Route
   - Nutzungsname + vollständiger Planungseditor + Zukunft bearbeitbar
   - Start/Ende strikt chronologisch (Ende mindestens +1 Minute)
   - Zählerstände bei jedem tatsächlichen Start bestätigen
   - Motorstatus aus Ereignissen; Start alle Antriebsmotoren, Ereignis Motor stoppt/startet einzeln,
     Anlegen stoppt alle laufenden Antriebsmotoren
   - Datenmodell für spätere automatische Motordatenerfassung vorbereitet
*/

const FP1062_VERSION='1.0.6.2-dev';
const FP1062={planEdit:null,counterConfirm:null};

/* -------------------------------------------------------------------------- */
/* Allgemeine Zeit-/Namen-Helfer                                               */
/* -------------------------------------------------------------------------- */
function fp1062LocalDateTime(v){
  if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';
  return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
function fp1062Iso(v){if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString()}
function fp1062MinuteAfter(v){const d=new Date(v);if(Number.isNaN(d.getTime()))return'';d.setMinutes(d.getMinutes()+1);return fp1062LocalDateTime(d)}
function fp1062DefaultUsageName(v=new Date()){
  const d=v instanceof Date?v:new Date(v);if(Number.isNaN(d.getTime()))return 'Nutzung';
  return d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
}
function fp1062UsageName(f,fallback='Nutzung'){return String(f?.Nutzungsname||f?.Title||fallback||'Nutzung').trim()||fallback}
function fp1062BindMinPair(start,end,{minuteGap=1,dateOnly=false}={}){
  if(typeof start==='string')start=document.getElementById(start);if(typeof end==='string')end=document.getElementById(end);if(!start||!end)return;
  const sync=()=>{
    if(!start.value){end.removeAttribute('min');return}
    if(dateOnly){end.min=start.value;if(end.value&&end.value<start.value)end.value=start.value;return}
    const min=fp1062MinuteAfter(start.value);if(min){end.min=min;if(end.value&&new Date(end.value)<new Date(min))end.value=min}
  };
  start.addEventListener('input',sync);start.addEventListener('change',sync);sync();
}
function fp1062ValidRange(a,b,strict=true){const x=fp1062Iso(a),y=fp1062Iso(b);if(!x||!y)return false;return strict?new Date(y)>new Date(x):new Date(y)>=new Date(x)}

/* 1.0.5.2-Verfügbarkeitslogik auch mit datetime-local korrekt halten. */
if(typeof fp1052RequestedUsageRange==='function'){
  fp1052RequestedUsageRange=function(){
    const now=new Date(),pf=document.getElementById('planFrom')?.value||'',pt=document.getElementById('planTo')?.value||'';
    if(pf&&pt){const a=new Date(pf),b=new Date(pt);if(!Number.isNaN(a.getTime())&&!Number.isNaN(b.getTime()))return {start:a,end:b}}
    const end=new Date(now);end.setHours(23,59,59,999);return {start:now,end};
  };
}

/* -------------------------------------------------------------------------- */
/* Reisecheck: strukturierte Wegpunkte                                         */
/* -------------------------------------------------------------------------- */
function fp1062FieldNum(f,names){for(const n of names){const v=f?.[n];if(v!==''&&v!=null&&Number.isFinite(Number(v)))return Number(v)}return null}
function fp1062ResolvedWaypoint({ortId='',standortId='',fallback='',kind=''}){
  const d=FP106.data||{},orts=d.orts||[],sites=d.sites||[],site=sites.find(x=>String(x.id)===String(standortId||'')),
    resolvedOrtId=String(ortId||site?.fields?.OrtId||''),ort=orts.find(x=>String(x.id)===resolvedOrtId),sf=site?.fields||{},of=ort?.fields||{},
    standortName=sf.Name||sf.Title||'',ortName=of.Name||of.Title||'',country=of.Land||sf.Land||'',address=sf.Adresse||of.Adresse||'',
    lat=fp1062FieldNum(sf,['Breitengrad','Latitude','Lat'])??fp1062FieldNum(of,['Breitengrad','Latitude','Lat']),lon=fp1062FieldNum(sf,['Laengengrad','Longitude','Lon'])??fp1062FieldNum(of,['Laengengrad','Longitude','Lon']);
  const parts=[];if(standortName)parts.push(standortName);if(ortName&&!parts.some(x=>String(x).toLowerCase()===String(ortName).toLowerCase()))parts.push(ortName);if(country)parts.push(country);
  const label=parts.join(' · ')||String(fallback||'').trim();
  return {kind,label,standortId:String(standortId||''),ortId:resolvedOrtId,standortName,ortName,country,address,lat,lon};
}
fp1061UsageWaypoints=function(u){
  if(!u||!FP106.data)return[];const f=u.fields||{},stops=(FP106.data.usageStops||[]).filter(x=>String(x.fields.NutzungId)===String(u.id)).sort((a,b)=>Number(a.fields.Sortierung||0)-Number(b.fields.Sortierung||0)),out=[];
  const add=w=>{if(!w.label)return;const key=[w.standortId,w.ortId,w.label.toLowerCase()].join('|');if(out.some(x=>x._key===key))return;out.push({...w,_key:key,order:out.length+1})};
  add(fp1062ResolvedWaypoint({ortId:f.GeplanterStartOrtId,standortId:f.GeplanterStartStandortId,fallback:f.GeplanterStartort||f.Startpunkt,kind:'Start'}));
  for(const x of stops)add(fp1062ResolvedWaypoint({ortId:x.fields.OrtId,standortId:x.fields.StandortId,fallback:x.fields.Ort||x.fields.Name||x.fields.Title,kind:'Zwischenziel'}));
  add(fp1062ResolvedWaypoint({ortId:f.GeplanterEndOrtId,standortId:f.GeplanterEndStandortId,fallback:f.GeplanterEndort||f.GeplantesZiel,kind:'Ziel'}));
  return out.map(({_key,...x})=>x);
};

const fp1062TravelcheckBase=travelcheck;
travelcheck=async function(){
  await fp1062TravelcheckBase();
  try{const api=await getCloud(),[orts,sites]=await Promise.all([fp105SafeList(api,'Orte'),fp105SafeList(api,'Standorte')]);if(FP106.data){FP106.data.orts=orts;FP106.data.sites=sites}}
  catch(e){console.warn('Orte/Standorte für Reisecheck konnten nicht ergänzt werden',e)}
  fp1062BindMinPair('tcStart','tcEnd',{dateOnly:true});
};

const fp1062LoadUsageBase=fp1061LoadUsage;
fp1061LoadUsage=async function(id){
  await fp1062LoadUsageBase(id);
  const u=(FP106.data?.usages||[]).find(x=>String(x.id)===String(id));if(!u)return;
  const title=document.getElementById('tcTitle');if(title)title.value=fp1062UsageName(u.fields,'Geplante Reise');
  const waypoints=fp1061UsageWaypoints(u);FP1061.routePlan={usageId:String(id),waypoints};const box=document.getElementById('tcUsageRoute');
  if(box)box.innerHTML=waypoints.length?`<div class="section">Geplante Route</div>${waypoints.map((w,i)=>`<div class="line"><div><b>${i+1}. ${esc(w.label)}</b><div class="muted">${esc(w.kind)}${w.address?' · '+esc(w.address):''}${w.lat!=null?` · GPS ${Number(w.lat).toFixed(5)}, ${Number(w.lon).toFixed(5)}`:''}</div></div></div>`).join('')}`:'<div class="status-warn">Start/Ziel sind noch nicht eindeutig hinterlegt.</div>';
};

const fp1062PayloadBase=fp106BuildResearchPayload;
fp106BuildResearchPayload=async function(){
  const p=await fp1062PayloadBase();
  if(p?.trip?.checkMode==='planned-usage'&&p.trip.routePlan){
    const ws=FP1061.routePlan?.waypoints||[];
    p.trip.routePlan.waypoints=ws.map((w,i)=>({order:i+1,kind:w.kind||'',label:w.label||'',standortName:w.standortName||'',ortName:w.ortName||'',country:w.country||'',address:w.address||'',lat:w.lat,lon:w.lon}));
    const countries=[...new Set(ws.map(w=>String(w.country||'').trim()).filter(Boolean))];
    p.trip.routePlan.locationContext={allWaypointsResolved:ws.length>=2&&ws.every(w=>!!(w.country&&w.ortName)),knownCountries:countries,sameKnownCountry:countries.length===1?countries[0]:''};
  }
  return p;
};

/* -------------------------------------------------------------------------- */
/* Neue Nutzung: Name, Datetime, Planung getrennt vom tatsächlichen Start      */
/* -------------------------------------------------------------------------- */
async function fp1062LatestMetricValues(api,vehicleId){
  const rows=(await fp105SafeList(api,'Messwerte')).filter(x=>String(x.fields.FahrzeugId)===String(vehicleId)&&x.fields.Aktiv!==false&&x.fields.Wert!==''&&x.fields.Wert!=null).sort((a,b)=>String(b.fields.GemessenAm||'').localeCompare(String(a.fields.GemessenAm||''))),out={};
  for(const m of S.metrics||[]){const hit=rows.find(x=>String(x.fields.KomponenteId||'')===String(m.componentId||'')&&String(x.fields.Messgroesse||'')===String(m.measure||''));if(hit)out[m.componentId+'|'+m.measure]={value:Number(hit.fields.Wert),at:hit.fields.GemessenAm||'',phase:hit.fields.Phase||''}}
  return out;
}
async function fp1062EnhanceSetup(){
  const card=app.querySelector('.card');if(!card)return;
  if(!document.getElementById('usageName1062')){
    const d=document.createElement('div');d.className='field';d.innerHTML='<label>Name der Nutzung (optional)</label><input id="usageName1062" placeholder="z. B. Wochenende Bad Mergentheim"><div class="muted">Leer = Datum und Uhrzeit der ersten Planung.</div>';card.insertBefore(d,card.firstChild);
  }
  const pf=document.getElementById('planFrom'),pt=document.getElementById('planTo');
  if(pf&&pt){pf.type='datetime-local';pt.type='datetime-local';fp1062BindMinPair(pf,pt,{minuteGap:1});
    if(!document.getElementById('fp1062SavePlan')){const startBtn=[...card.querySelectorAll('button')].find(b=>/Nutzung starten/i.test(b.textContent||''));if(startBtn){const b=document.createElement('button');b.id='fp1062SavePlan';b.type='button';b.textContent='Planung speichern';b.onclick=fp1062SaveNewPlan;startBtn.parentNode.insertBefore(b,startBtn)}}
  }
  const startHeading=[...card.querySelectorAll('.section')].find(x=>/Tages-Anfangsstand/i.test(x.textContent||''));if(startHeading)startHeading.textContent='Aktuellen Stand beim tatsächlichen Start bestätigen';
  if(!document.getElementById('fp1062CounterConfirm')){const btn=[...card.querySelectorAll('button')].find(b=>/Nutzung starten/i.test(b.textContent||''));if(btn){const l=document.createElement('label');l.className='checkrow';l.innerHTML='<input id="fp1062CounterConfirm" type="checkbox"> Angezeigte Zählerstände sind aktuell geprüft / korrigiert';btn.parentNode.insertBefore(l,btn)}}
  try{const api=await getCloud(),latest=await fp1062LatestMetricValues(api,S.vehicle.id);for(let i=0;i<(S.metrics||[]).length;i++){const m=S.metrics[i],hit=latest[m.componentId+'|'+m.measure],el=document.getElementById('sm'+i);if(el&&hit&&el.value==='')el.value=hit.value;const label=el?.closest('.field')?.querySelector('label');if(label)label.textContent=`${m.measure} Start · ${m.name} · bitte bestätigen`}}
  catch(e){console.warn('Letzte Zählerstände konnten nicht vorgeschlagen werden',e)}
}
const fp1062SetupBase=setupBase;
setupBase=async function(){const r=await fp1062SetupBase();await fp1062EnhanceSetup();return r};

function fp1062PlanFields({status='Geplant',now=new Date().toISOString()}={}){
  const multi=!!S.usage?.multi,orts=S.locationData?.orts||[],sites=S.locationData?.sites||[],ps=multi?locValue('planStart',orts,sites):locValue('dayStart',orts,sites),pe=multi?locValue('planEnd',orts,sites):locValue('dayGoal',orts,sites),name=(document.getElementById('usageName1062')?.value||'').trim()||fp1062DefaultUsageName(now),from=multi?document.getElementById('planFrom')?.value:'',to=multi?document.getElementById('planTo')?.value:'';
  const f={Title:name,Nutzungsname:name,ErstgeplantAm1062:now,PlanungGeaendertAm1062:now,FahrzeugId:String(S.vehicle.id),BenutzerId:'current',NutzungsartId:String(S.usage.id),Status:status,GeplanterStartort:ps.text,GeplanterEndort:pe.text,GeplantesZiel:pe.text,GeplanterStartOrtId:ps.ortId,GeplanterStartStandortId:ps.standortId,GeplanterEndOrtId:pe.ortId,GeplanterEndStandortId:pe.standortId,Testdaten:testFlag()};
  if(multi){f.GeplanterBeginn=fp1062Iso(from);f.GeplantesEndeDatum=fp1062Iso(to)}
  return {f,from,to,ps,pe,name};
}
async function fp1062SaveRelationsForNewUsage(api,usageId,dayId=''){
  const pp=document.getElementById('primaryPerson'),primary=profileDef().functions[0];if(!pp?.value)throw new Error(`Bitte ${primary} auswählen.`);
  await api.createItemByName('NutzungsPersonen',{NutzungId:String(usageId),TagesetappeId:String(dayId||''),PersonId:pp.value,Funktion:primary,Testdaten:testFlag()});
  for(const id of checkedIds('secondary'))await api.createItemByName('NutzungsPersonen',{NutzungId:String(usageId),TagesetappeId:String(dayId||''),PersonId:id,Funktion:profileDef().functions[1],Testdaten:testFlag()});
  for(const id of checkedIds('guest'))await api.createItemByName('NutzungsPersonen',{NutzungId:String(usageId),TagesetappeId:String(dayId||''),PersonId:id,Funktion:'Gast',Testdaten:testFlag()});
  for(const id of checkedIds('animal'))await api.createItemByName('NutzungsTiere',{NutzungId:String(usageId),TierId:id,Testdaten:testFlag()});
}
async function fp1062SaveStops(api,usageId){
  if(!S.usage?.multi)return;const orts=S.locationData?.orts||[],sites=S.locationData?.sites||[],stops=[...document.querySelectorAll('.planned-stop')];
  for(let i=0;i<stops.length;i++){const d=stops[i],o=orts.find(x=>String(x.id)===String(d.dataset.ortId)),s=sites.find(x=>String(x.id)===String(d.dataset.standortId));await api.createItemByName('NutzungsZwischenziele',{NutzungId:String(usageId),Sortierung:i+1,Ort:s?.fields?.Name||o?.fields?.Name||'',OrtId:d.dataset.ortId||'',StandortId:d.dataset.standortId||'',Testdaten:testFlag()})}
}
async function fp1062SaveNewPlan(){
  if(!S.usage?.multi)return alert('Eine separate Planung ist für mehrtägige Nutzungen vorgesehen.');
  const pf=document.getElementById('planFrom')?.value,pt=document.getElementById('planTo')?.value;if(!pf||!pt)return alert('Geplanten Start und geplantes Ende eingeben.');if(!fp1062ValidRange(pf,pt,true))return alert('Das geplante Ende muss mindestens eine Minute nach dem Start liegen.');
  try{const api=await getCloud(),r={start:new Date(pf),end:new Date(pt)},available=typeof fp1052AssertVehicleAvailable==='function'?await fp1052AssertVehicleAvailable(S.vehicle.id,r.start,r.end,{api}):{ok:true,rows:[]};if(!available.ok)return alert('Dieses Fahrzeug ist im geplanten Zeitraum bereits belegt:\n\n'+fp1052ConflictMessage(available.rows));const now=new Date().toISOString(),{f}=fp1062PlanFields({status:'Geplant',now}),u=await api.createItemByName('Nutzungen',f);await fp1062SaveStops(api,u.id);await fp1062SaveRelationsForNewUsage(api,u.id,'');alert('Planung gespeichert. Zählerstände werden erst beim tatsächlichen Start bestätigt.');S.usageDetailId=String(u.id);S.stack=[];S.view='usageDetail';render()}catch(e){alert('Planung konnte nicht gespeichert werden: '+e.message+'\nBitte Microsoft 365 Setup für Version 1.0.6.2 ausführen.')}
}

async function fp1062ValidateStartInputs(api){
  const latest=await fp1062LatestMetricValues(api,S.vehicle.id),vals=[];
  for(let i=0;i<(S.metrics||[]).length;i++){
    const m=S.metrics[i],el=document.getElementById('sm'+i),raw=el?.value;if(raw===''||raw==null)throw new Error(`${m.measure} · ${m.name}: aktuellen Startwert eingeben.`);const v=Number(raw);if(!Number.isFinite(v))throw new Error(`${m.measure} · ${m.name}: ungültiger Wert.`);const prev=latest[m.componentId+'|'+m.measure];if(prev&&v<prev.value){const reason=prompt(`${m.name}: neuer Wert ${v} liegt unter dem zuletzt bekannten Wert ${prev.value}.\nNur bei Zählerwechsel / Reset / Korrektur fortfahren. Grund:`,'');if(!reason?.trim())throw new Error('Niedrigerer Zählerstand wurde nicht bestätigt.');vals.push({value:v,reason:reason.trim()})}else vals.push({value:v,reason:''});
  }
  return vals;
}

/* Tatsächlicher Sofortstart: Datetime sicher, Zähler bestätigt, danach Motorstatus. */
beginCloud101=async function(){
  const pp=document.getElementById('primaryPerson');if(!pp?.value)return alert(`Bitte ${profileDef().functions[0]} auswählen.`);const multi=!!S.usage.multi,pf=document.getElementById('planFrom')?.value||'',pt=document.getElementById('planTo')?.value||'';
  if(multi&&(!pf||!pt))return alert('Geplanten Start und geplantes Ende eingeben.');if(multi&&!fp1062ValidRange(pf,pt,true))return alert('Das geplante Ende muss mindestens eine Minute nach dem Start liegen.');if(!document.getElementById('fp1062CounterConfirm')?.checked)return alert('Bitte die aktuellen Zählerstände beim tatsächlichen Start prüfen und bestätigen.');
  try{
    const api=await getCloud(),now=new Date().toISOString(),range=multi?{start:new Date(pf),end:new Date(pt)}:{start:new Date(),end:new Date(Date.now()+60000)},available=typeof fp1052AssertVehicleAvailable==='function'?await fp1052AssertVehicleAvailable(S.vehicle.id,range.start,range.end,{api}):{ok:true,rows:[]};if(!available.ok)return alert('Dieses Fahrzeug ist im vorgesehenen Zeitraum bereits belegt:\n\n'+fp1052ConflictMessage(available.rows));
    const counters=await fp1062ValidateStartInputs(api),orts=S.locationData?.orts||[],sites=S.locationData?.sites||[],ds=locValue('dayStart',orts,sites),dg=locValue('dayGoal',orts,sites),plan=fp1062PlanFields({status:'Aktiv',now});plan.f.Beginn=now;plan.f.Startpunkt=ds.text;plan.f.GeplantesZiel=multi?plan.f.GeplantesZiel:dg.text;
    const u=await api.createItemByName('Nutzungen',plan.f),day=await api.createItemByName('Tagesetappen',{NutzungId:String(u.id),FahrzeugId:String(S.vehicle.id),TagNr:1,Datum:now,Startpunkt:ds.text,Tagesziel:dg.text,Beginn:now,Status:'Aktiv',StartOrtId:ds.ortId,StartStandortId:ds.standortId,ZielOrtId:dg.ortId,ZielStandortId:dg.standortId,Testdaten:testFlag()});
    await fp1062SaveStops(api,u.id);await fp1062SaveRelationsForNewUsage(api,u.id,day.id);S.usage.cloudId=String(u.id);S.usage.displayName=plan.name;S.day={id:String(day.id),start:ds.text,goal:dg.text,startMeters:counters.map(x=>String(x.value))};localStorage.setItem('fp-current',JSON.stringify({vehicle:S.vehicle,usage:S.usage,day:S.day,startedAt:now}));
    for(let i=0;i<(S.metrics||[]).length;i++){const m=S.metrics[i],v=counters[i];await api.createItemByName('Messwerte',{FahrzeugId:String(S.vehicle.id),NutzungId:String(u.id),TagesetappeId:String(day.id),KomponenteId:m.componentId,Messgroesse:m.measure,Wert:v.value,Einheit:m.unit,Phase:'Start',GemessenAm:now,Quelle:'Manuell bestätigt',Notiz:v.reason||'',Testdaten:testFlag(),Aktiv:true})}
    if(S.vehicle.profile==='motorboat')await fp1062StartAllMotors(api,{timestamp:now,ortId:ds.ortId,standortId:ds.standortId,source:'System · Nutzungsstart'});go('cockpit');
  }catch(e){alert('Nutzung konnte nicht gestartet werden: '+e.message)}
};
beginCloud=beginCloud101;

/* -------------------------------------------------------------------------- */
/* Bestehende Nutzung: Zähler vor jedem weiteren Start bestätigen              */
/* -------------------------------------------------------------------------- */
async function fp1062PrepareUsageContext(api,id){
  const u=await api.getItemByName('Nutzungen',id),[vs,types]=await Promise.all([fp105SafeList(api,'Fahrzeuge'),fp105SafeList(api,'Nutzungsarten')]),v=vs.find(x=>String(x.id)===String(u.fields.FahrzeugId)),t=types.find(x=>String(x.id)===String(u.fields.NutzungsartId));
  if(!v)throw new Error('Fahrzeug der Nutzung wurde nicht gefunden.');
  S.vehicle={id:String(v.id),name:v.fields.Fahrzeugname||v.fields.Title||'Fahrzeug',profile:normalizeProfile(v.fields.Profil||'Motorboot'),profileLabel:v.fields.Profil||''};
  S.usage={id:String(t?.id||u.fields.NutzungsartId||''),name:t?.fields?.Name||t?.fields?.Title||'Nutzung',displayName:fp1062UsageName(u.fields,t?.fields?.Name||'Nutzung'),cloudId:String(id),multi:true};
  await loadVehicleMetrics();return {u,v,t};
}
async function fp1062PromptCounters(api,vehicleId){
  const latest=await fp1062LatestMetricValues(api,vehicleId),out=[];
  for(const m of S.metrics||[]){
    const prev=latest[m.componentId+'|'+m.measure],suggest=prev?String(prev.value):'',raw=prompt(`${m.measure} · ${m.name}\n${prev?'Zuletzt bestätigt: '+prev.value+' '+m.unit+' · '+fp106DateTime(prev.at):'Noch kein Wert vorhanden.'}\n\nAktuellen Startwert bestätigen oder korrigieren:`,suggest);
    if(raw===null)throw new Error('Start abgebrochen.');const v=Number(String(raw).replace(',','.'));if(!Number.isFinite(v))throw new Error(`${m.name}: ungültiger Zählerstand.`);let reason='';
    if(prev&&v<prev.value){reason=prompt(`Der neue Wert ${v} liegt unter ${prev.value}. Grund (Zählerwechsel / Reset / Korrektur):`,'')||'';if(!reason.trim())throw new Error('Niedrigerer Zählerstand wurde nicht bestätigt.')}
    out.push({metric:m,value:v,reason});
  }
  return out;
}
async function fp1062PersistStartCounters(api,counters,when){
  for(const x of counters)await api.createItemByName('Messwerte',{FahrzeugId:String(S.vehicle.id),NutzungId:String(S.usage.cloudId),TagesetappeId:String(S.day.id),KomponenteId:x.metric.componentId,Messgroesse:x.metric.measure,Wert:x.value,Einheit:x.metric.unit,Phase:'Start',GemessenAm:when,Quelle:'Manuell bestätigt',Notiz:x.reason||'',Testdaten:testFlag(),Aktiv:true});
  S.day.startMeters=counters.map(x=>String(x.value));const rec=JSON.parse(localStorage.getItem('fp-current')||'{}');if(rec.day){rec.day.startMeters=S.day.startMeters;localStorage.setItem('fp-current',JSON.stringify(rec))}
}
const fp1062ContinueUsageBase=continueUsage;
continueUsage=async function(id){
  let api,ctx,counters=[];try{api=await getCloud();ctx=await fp1062PrepareUsageContext(api,id);const cached=FP1062.counterConfirm&&String(FP1062.counterConfirm.usageId)===String(id)?FP1062.counterConfirm.counters:null;counters=cached||await fp1062PromptCounters(api,String(ctx.u.fields.FahrzeugId));FP1062.counterConfirm=null}catch(e){FP1062.counterConfirm=null;return alert(e.message)}
  const oldDay=String(S.day?.id||'');await fp1062ContinueUsageBase(id);if(!S.day?.id||String(S.day.id)===oldDay)return;
  try{
    const now=new Date().toISOString();await fp1062PersistStartCounters(api,counters,now);
    if(S.vehicle.profile==='motorboat'){
      let pos=null;try{pos=typeof fp104Position==='function'?await fp104Position():null}catch{}
      await fp1062StartAllMotors(api,{timestamp:now,lat:pos?.lat??null,lon:pos?.lon??null,accuracy:pos?.accuracy??null,source:'System · weiterer Start'});
    }
  }catch(e){alert('Startwerte konnten nicht vollständig gespeichert werden: '+e.message)}
};

/* Geplante Nutzung: Zähler VOR Statuswechsel bestätigen. */
startPlannedUsage=async function(id){
  let api,ctx,counters,priorStatus='Geplant',priorBeginn=null;
  try{
    api=await getCloud();ctx=await fp1062PrepareUsageContext(api,id);priorStatus=ctx.u.fields.Status||'Geplant';priorBeginn=ctx.u.fields.Beginn||null;
    const now=new Date(),a=ctx.u.fields.GeplanterBeginn?new Date(ctx.u.fields.GeplanterBeginn):now,b=ctx.u.fields.GeplantesEndeDatum?new Date(ctx.u.fields.GeplantesEndeDatum):new Date(now.getTime()+24*3600*1000-1),rangeStart=a<now?a:now;
    if(typeof fp1052AssertVehicleAvailable==='function'){const available=await fp1052AssertVehicleAvailable(ctx.u.fields.FahrzeugId,rangeStart,b,{api,excludeUsageId:id});if(!available.ok)return alert('Start nicht möglich. Das Fahrzeug ist bereits belegt:\n\n'+fp1052ConflictMessage(available.rows))}
    counters=await fp1062PromptCounters(api,String(ctx.u.fields.FahrzeugId));
    FP1062.counterConfirm={usageId:String(id),counters};S.day=null;
    await api.updateItemByName('Nutzungen',id,{Status:'Aktiv',Beginn:new Date().toISOString(),GeaendertAm:new Date().toISOString()});
    await continueUsage(id);
    if(!S.day?.id){FP1062.counterConfirm=null;await api.updateItemByName('Nutzungen',id,{Status:priorStatus,Beginn:priorBeginn});}
  }catch(e){FP1062.counterConfirm=null;try{if(api)await api.updateItemByName('Nutzungen',id,{Status:priorStatus,Beginn:priorBeginn})}catch{}alert('Start nicht möglich: '+e.message)}
};

if(typeof continueExistingUsage==='function'){
  const fp1062ContinueExistingBase=continueExistingUsage;
  continueExistingUsage=async function(id){await fp1062ContinueExistingBase(id);try{if(S.vehicle?.id)await loadVehicleMetrics()}catch(e){console.warn('Zählerkonfiguration',e)}if(S.view==='cockpit')await cockpit()};
}

/* -------------------------------------------------------------------------- */
/* Motorstatus / Motorereignisse                                               */
/* -------------------------------------------------------------------------- */
async function fp1062Engines(api,vehicleId=S.vehicle?.id){
  const cs=(await fp105SafeList(api,'Komponenten')).filter(x=>String(x.fields.FahrzeugId)===String(vehicleId)&&x.fields.Aktiv!==false),motor=cs.filter(x=>/motor|antrieb/i.test(String(x.fields.KomponentenTyp||x.fields.Typ||''))&&!/generator|aggregat|pumpe|lüfter|luefter/i.test(String(x.fields.KomponentenTyp||x.fields.Typ||'')+' '+String(x.fields.Name||'')));
  return motor.map(x=>({id:String(x.id),name:x.fields.Name||x.fields.Title||'Motor'}));
}
function fp1062MotorAction(e){const f=e.fields||{};if(String(f.Art||'')!=='Motor'&&!/^Motor (gestartet|gestoppt)$/i.test(String(f.Art||'')))return'';return String(f.MotorAktion1062||(/gestoppt/i.test(String(f.Art||''))?'gestoppt':/gestartet/i.test(String(f.Art||''))?'gestartet':''))}
async function fp1062MotorState(api,{usageId=S.usage?.cloudId,vehicleId=S.vehicle?.id}={}){
  const engines=await fp1062Engines(api,vehicleId),events=(await fp105SafeList(api,'Ereignisse')).filter(x=>String(x.fields.NutzungId)===String(usageId||'')&&fp1062MotorAction(x)).sort((a,b)=>String(a.fields.Zeitpunkt||'').localeCompare(String(b.fields.Zeitpunkt||''))),state={};for(const e of engines)state[e.id]={...e,running:false,since:null,last:null};for(const e of events){const id=String(e.fields.KomponenteId1062||e.fields.KomponenteId||'');if(!state[id])continue;const a=fp1062MotorAction(e);state[id].running=a==='gestartet';state[id].since=a==='gestartet'?e.fields.Zeitpunkt:null;state[id].last=e}
  return {engines,state,events};
}
async function fp1062RecordMotor(api,engine,action,{timestamp,lat=null,lon=null,accuracy=null,ortId='',standortId='',source='Manuell',note=''}={}){
  const current=await fp1062MotorState(api),s=current.state[String(engine.id)],want=action==='gestartet';if(s&&s.running===want)return null;const when=timestamp||new Date().toISOString(),f={FahrzeugId:String(S.vehicle.id),NutzungId:String(S.usage.cloudId),TagesetappeId:String(S.day?.id||''),BenutzerId:'current',Art:'Motor',Zeitpunkt:when,ErfasstAm:new Date().toISOString(),Herkunft:source.startsWith('System')||source.startsWith('Automatisch')?'Automatisch':'Manuell',Rohdaten:false,Notiz:note||'',OrtId:String(ortId||''),StandortId:String(standortId||''),KomponenteId1062:String(engine.id),AggregatName1062:String(engine.name),MotorAktion1062:action,EreignisQuelle1062:source,Testdaten:testFlag(),Aktiv:true};if(lat!=null){f.Breitengrad=Number(lat);f.Laengengrad=Number(lon);if(accuracy!=null)f.GenauigkeitM1062=Number(accuracy)}return api.createItemByName('Ereignisse',f);
}
async function fp1062StartAllMotors(api,ctx={}){const x=await fp1062MotorState(api);for(const e of x.engines)if(!x.state[e.id]?.running)await fp1062RecordMotor(api,e,'gestartet',ctx)}
async function fp1062StopAllMotors(api,ctx={}){const x=await fp1062MotorState(api);for(const e of x.engines)if(x.state[e.id]?.running)await fp1062RecordMotor(api,e,'gestoppt',ctx)}
function fp1062MotorElapsed(events,engineId,from,to=new Date().toISOString()){
  const rows=events.filter(e=>String(e.fields.KomponenteId1062||'')===String(engineId)).sort((a,b)=>String(a.fields.Zeitpunkt||'').localeCompare(String(b.fields.Zeitpunkt||'')));let running=false,start=null,ms=0;const a=from?new Date(from).getTime():-Infinity,b=new Date(to).getTime();for(const e of rows){const t=new Date(e.fields.Zeitpunkt).getTime();if(!Number.isFinite(t)||t>b)continue;const act=fp1062MotorAction(e);if(act==='gestartet'){running=true;start=Math.max(t,a)}else if(act==='gestoppt'&&running){ms+=Math.max(0,t-start);running=false;start=null}}if(running&&start!=null)ms+=Math.max(0,b-start);return ms/3600000}

/* Cockpit nur Statusanzeige, keine separaten Motorbuttons. */
const fp1062CockpitBase=cockpit;
cockpit=async function(){
  await fp1062CockpitBase();if(S.vehicle?.profile!=='motorboat'||!S.usage?.cloudId)return;
  try{const api=await getCloud(),x=await fp1062MotorState(api),card=document.createElement('div');card.className='card';card.id='fp1062MotorStatus';card.innerHTML=`<div class="section first">Motorstatus in MOBIMORY</div><div class="grid compact">${x.engines.map(e=>{const s=x.state[e.id];return `<div class="entitybox"><b>${esc(e.name)}</b><div style="font-size:1.05rem;margin-top:.25rem">${s?.running?'● läuft':'○ aus'}</div>${s?.running&&s.since?`<div class="muted">seit ${esc(fp106DateTime(s.since))}</div>`:''}</div>`}).join('')||'<p class="muted">Keine Antriebsmotoren konfiguriert.</p>'}</div><p class="muted">Status folgt den protokollierten Motorereignissen. Bedienung erfolgt ausschließlich über Ereignis → Motor.</p>`;const first=app.querySelector('.cockpit')?.parentElement||app.firstElementChild;if(first)app.insertBefore(card,app.firstChild);else app.appendChild(card)}catch(e){console.warn('Motorstatus',e)}
};

/* Ablegen verändert den Motorstatus bewusst NICHT. Ab Nutzungsstart steuern ausschließlich Motorereignisse den Einzelstatus. */

/* Ereignisformular: Ereignisart Motor + nur logisch mögliche Aktion. */
const fp1062EventBase=event;
event=async function(){
  await fp1062EventBase();if(S.vehicle?.profile!=='motorboat')return;const sel=document.getElementById('evType');if(!sel)return;if(![...sel.options].some(o=>o.value==='Motor')){const o=document.createElement('option');o.value='Motor';o.textContent='Motor';sel.appendChild(o)}
  const host=sel.closest('.field');if(!host)return;const box=document.createElement('div');box.id='fp1062MotorEvent';box.hidden=true;box.className='subeditor';host.insertAdjacentElement('afterend',box);sel.addEventListener('change',fp1062RenderMotorEvent);await fp1062RenderMotorEvent();
};
async function fp1062RenderMotorEvent(){
  const sel=document.getElementById('evType'),box=document.getElementById('fp1062MotorEvent');if(!sel||!box)return;box.hidden=sel.value!=='Motor';if(box.hidden)return;
  try{const api=await getCloud(),x=await fp1062MotorState(api);box.innerHTML=`<div class="section first">Motor</div><div class="field"><label>Antriebsmotor</label><select id="evMotor" onchange="fp1062MotorChoiceChanged()">${x.engines.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></div><div id="evMotorAction"></div>`;await fp1062MotorChoiceChanged()}catch(e){box.innerHTML=`<div class="status-warn">${esc(e.message)}</div>`}
}
async function fp1062MotorChoiceChanged(){
  const id=document.getElementById('evMotor')?.value,h=document.getElementById('evMotorAction');if(!id||!h)return;try{const api=await getCloud(),x=await fp1062MotorState(api),s=x.state[id],action=s?.running?'gestoppt':'gestartet';h.innerHTML=`<div class="field"><label>Aktion</label><select id="evMotorActionSelect"><option value="${action}">${action==='gestoppt'?'Motor stoppen':'Motor starten'}</option></select></div><div class="muted">Aktueller MOBIMORY-Status: ${s?.running?'läuft':'aus'}. Deshalb ist nur die logisch mögliche Gegenaktion auswählbar.</div>`}catch(e){h.textContent=e.message}
}
const fp1062SaveEventBase=saveEventV1051;
saveEventV1051=async function(){
  if(document.getElementById('evType')?.value!=='Motor')return fp1062SaveEventBase();
  try{const api=await getCloud(),id=document.getElementById('evMotor')?.value,action=document.getElementById('evMotorActionSelect')?.value,x=await fp1062MotorState(api),engine=x.engines.find(e=>e.id===String(id));if(!engine||!action)return alert('Motor und Aktion auswählen.');const loc=typeof fp105LocationValue==='function'?fp105LocationValue('ev'):{ortId:'',standortId:''},c=typeof fp105Coords==='function'?fp105Coords('ev'):{lat:null,lon:null,accuracy:null},when=document.getElementById('evWhen')?.value?new Date(evWhen.value).toISOString():new Date().toISOString(),note=document.getElementById('evNote')?.value?.trim?.()||'',isBackfill=Math.abs(Date.now()-new Date(when).getTime())>5*60*1000;const before=x.state[engine.id]?.running;if((action==='gestartet'&&before)||(action==='gestoppt'&&!before))return alert('Diese Aktion passt nicht mehr zum aktuellen Motorstatus. Bitte Ereignis neu öffnen.');await fp1062RecordMotor(api,engine,action,{timestamp:when,lat:c.lat,lon:c.lon,accuracy:c.accuracy,ortId:loc.ortId,standortId:loc.standortId,source:isBackfill?'Manuell · Nachtrag':'Manuell',note});S.pendingContext=null;back()}catch(e){alert('Motorereignis konnte nicht gespeichert werden: '+e.message)}
};
saveEventV105=saveEventV1051;saveEventV104=saveEventV1051;

/* Anlegen/Ankern: erst Aufenthalt speichern, dann alle laufenden Motoren stoppen. */
const fp1062SaveStayBase=saveStayV105;
saveStayV105=async function(){
  const ctx=typeof fp105Ctx==='function'?fp105Ctx():{timestamp:new Date().toISOString()},loc=typeof fp105LocationValue==='function'?fp105LocationValue('st'):{ortId:'',standortId:''},wasBoat=S.vehicle?.profile==='motorboat',usageId=S.usage?.cloudId;
  await fp1062SaveStayBase();
  if(wasBoat&&usageId&&S.pendingContext==null){try{const api=await getCloud();await fp1062StopAllMotors(api,{timestamp:ctx.timestamp,lat:ctx.lat,lon:ctx.lon,accuracy:ctx.accuracy,ortId:loc.ortId,standortId:loc.standortId,source:'System · Anlegen'})}catch(e){console.warn('Motorstop beim Anlegen',e)}}
};
saveStayV104=saveStayV105;

/* Tagesabschluss: aus Motorereignissen Endstand vorschlagen, niemals ungeprüft speichern. */
const fp1062DayendBase=dayend;
dayend=async function(){
  await fp1062DayendBase();if(!S.usage?.cloudId||!S.day?.id)return;
  const first=app.querySelector('.card');if(first&&!document.getElementById('fp1062CounterHint')){const p=document.createElement('div');p.id='fp1062CounterHint';p.className='status-warn';p.textContent='Endstände sind Vorschläge bzw. Eingaben und werden erst mit dem Tagesabschluss bestätigt.';first.insertBefore(p,first.firstChild)}
  try{const api=await getCloud(),measures=(await fp105SafeList(api,'Messwerte')).filter(x=>String(x.fields.TagesetappeId)===String(S.day.id)&&x.fields.Phase==='Start'),events=(await fp105SafeList(api,'Ereignisse')).filter(x=>String(x.fields.NutzungId)===String(S.usage.cloudId)),day=await api.getItemByName('Tagesetappen',S.day.id),from=day.fields.Beginn||new Date().toISOString();for(let i=0;i<(S.metrics||[]).length;i++){const m=S.metrics[i],el=document.getElementById('em'+i),start=measures.filter(x=>String(x.fields.KomponenteId||'')===String(m.componentId||'')&&String(x.fields.Messgroesse||'')===String(m.measure)).sort((a,b)=>String(b.fields.GemessenAm||'').localeCompare(String(a.fields.GemessenAm||'')))[0];if(!el||!start)continue;if(S.vehicle.profile==='motorboat'&&m.componentId){const hrs=fp1062MotorElapsed(events,m.componentId,from,new Date().toISOString()),suggest=Number(start.fields.Wert)+hrs;el.value=suggest.toFixed(1);const lab=el.closest('.field')?.querySelector('label');if(lab)lab.textContent=`${m.measure} Ende · ${m.name} · Vorschlag ${hrs.toFixed(2)} h Motorlaufzeit`}else el.value=String(start.fields.Wert)}}catch(e){console.warn('Endstands-Vorschlag',e)}
};

/* Endstand explizit bestätigen, bevor der Tagesabschluss speichert. */
const fp1062DayendConfirmBase=dayend;
dayend=async function(){
  await fp1062DayendConfirmBase();const card=app.querySelector('.card');if(!card||document.getElementById('fp1062EndCounterConfirm'))return;
  const buttons=card.querySelector('.actions')||[...card.querySelectorAll('button')].find(b=>/Tag abschließen/i.test(b.textContent||''))?.parentElement;if(buttons){const l=document.createElement('label');l.className='checkrow';l.innerHTML='<input id="fp1062EndCounterConfirm" type="checkbox"> Endstände geprüft / korrigiert und bestätigt';buttons.parentNode.insertBefore(l,buttons)}
};
const fp1062FinishBase=finishV1;
finishV1=async function(continueUsage=false){
  if((S.metrics||[]).length&&!document.getElementById('fp1062EndCounterConfirm')?.checked)return alert('Bitte die Endstände prüfen / korrigieren und bestätigen.');
  for(let i=0;i<(S.metrics||[]).length;i++){const el=document.getElementById('em'+i);if(!el||el.value==='')return alert(`${S.metrics[i].measure} Ende · ${S.metrics[i].name}: Wert eingeben oder bestätigen.`);if(!Number.isFinite(Number(String(el.value).replace(',','.'))))return alert(`${S.metrics[i].name}: ungültiger Endstand.`)}
  return fp1062FinishBase(continueUsage);
};

/* -------------------------------------------------------------------------- */
/* Planungen vollständig öffnen und zukünftige Angaben ändern                  */
/* -------------------------------------------------------------------------- */
async function editUsagePlan(id){
  head('Planung bearbeiten','Zukünftige Planungsdaten vollständig ändern');app.innerHTML='<div class="card">Planung wird geladen …</div>';
  try{
    const api=await getCloud(),u=await api.getItemByName('Nutzungen',id),[orts,sites,stops,people,funcs,rels,animals,arels,types,vs]=await Promise.all([fp105SafeList(api,'Orte'),fp105SafeList(api,'Standorte'),fp105SafeList(api,'NutzungsZwischenziele'),fp105SafeList(api,'Personen'),fp105SafeList(api,'PersonFunktionen'),fp105SafeList(api,'NutzungsPersonen'),fp105SafeList(api,'Tiere'),fp105SafeList(api,'NutzungsTiere'),fp105SafeList(api,'Nutzungsarten'),fp105SafeList(api,'Fahrzeuge')]);
    const f=u.fields||{},vehicle=vs.find(x=>String(x.id)===String(f.FahrzeugId)),type=types.find(x=>String(x.id)===String(f.NutzungsartId)),p=normalizeProfile(vehicle?.fields?.Profil||'Motorboot')==='motorhome'?P.motorhome:P.motorboat,ownStops=stops.filter(x=>String(x.fields.NutzungId)===String(id)).sort((a,b)=>Number(a.fields.Sortierung||0)-Number(b.fields.Sortierung||0)),ownRels=rels.filter(x=>String(x.fields.NutzungId)===String(id)),ownAnimals=arels.filter(x=>String(x.fields.NutzungId)===String(id)),now=Date.now(),future=(v)=>!v||new Date(v).getTime()>now,canRoute=future(f.GeplantesEndeDatum||f.Ende),canPeople=['Geplant','Vorbereitet'].includes(String(f.Status||''))||future(f.GeplanterBeginn),activePeople=people.filter(x=>x.fields.Aktiv!==false),idsFor=fn=>new Set(funcs.filter(x=>x.fields.Funktion===fn&&x.fields.Aktiv!==false).map(x=>String(x.fields.PersonId))),prim=activePeople.filter(x=>idsFor(p.functions[0]).has(String(x.id))),sec=activePeople.filter(x=>idsFor(p.functions[1]).has(String(x.id))),guests=activePeople.filter(x=>idsFor('Gast').has(String(x.id))),primaryId=ownRels.find(x=>x.fields.Funktion===p.functions[0])?.fields?.PersonId||'',secIds=new Set(ownRels.filter(x=>x.fields.Funktion===p.functions[1]).map(x=>String(x.fields.PersonId))),guestIds=new Set(ownRels.filter(x=>x.fields.Funktion==='Gast').map(x=>String(x.fields.PersonId))),animalIds=new Set(ownAnimals.map(x=>String(x.fields.TierId)));
    S.locationData={orts,sites};FP106.data=FP106.data||{};FP106.data.orts=orts;FP106.data.sites=sites;FP1062.planEdit={id:String(id),u,vehicle,type,canRoute,canPeople};
    app.innerHTML=`<div class="card"><div class="section first">Planung</div><div class="field"><label>Name der Nutzung</label><input id="upeName" value="${esc(fp1062UsageName(f,type?.fields?.Name||'Nutzung'))}"></div><div class="grid compact"><div class="field"><label>Geplanter Start</label><input id="upeFrom" type="datetime-local" value="${fp1062LocalDateTime(f.GeplanterBeginn||f.Beginn)}" ${future(f.GeplanterBeginn||f.Beginn)?'':'disabled'}></div><div class="field"><label>Geplantes Ende</label><input id="upeTo" type="datetime-local" value="${fp1062LocalDateTime(f.GeplantesEndeDatum||f.Ende)}" ${canRoute?'':'disabled'}></div></div>${canRoute?locSelect('upeStart','Geplanter Startort',orts,sites)+locSelect('upeEnd','Geplanter Endort',orts,sites):`<div class="status-warn">Bereits vergangene Routenabschnitte bleiben Historie. Nur zukünftige Planungsdaten sind frei änderbar.</div>`}${canRoute?`<div class="section">Zwischenziele</div>${locSelect('upeStop','Zwischenziel hinzufügen',orts,sites)}<button type="button" onclick="fp1062AddEditStop()">Zwischenziel hinzufügen</button><div id="upeStops">${ownStops.map(x=>{const w=fp1062ResolvedWaypoint({ortId:x.fields.OrtId,standortId:x.fields.StandortId,fallback:x.fields.Ort,kind:'Zwischenziel'});return `<div class="line upe-stop" data-ort-id="${esc(String(x.fields.OrtId||''))}" data-standort-id="${esc(String(x.fields.StandortId||''))}"><div><b>${esc(w.label)}</b></div><button type="button" onclick="this.parentElement.remove()">Entfernen</button></div>`}).join('')}</div>`:''}</div>
    <div class="card"><div class="section first">Personen / Tiere</div>${canPeople?`<div class="field"><label>${esc(p.functions[0])}</label><select id="upePrimary"><option value="">– auswählen –</option>${prim.map(x=>`<option value="${x.id}" ${String(x.id)===String(primaryId)?'selected':''}>${esc(x.fields.Anzeigename||x.fields.Title)}</option>`).join('')}</select></div>${personPicker(`${p.functions[1]} · 0 bis X`,sec,'upesecondary')}${personPicker('Gäste · 0 bis X',guests,'upeguest')}<div class="section">Tiere</div>${animals.filter(x=>x.fields.Aktiv!==false).map(x=>`<label class="person-tile"><input type="checkbox" data-upeanimal="${x.id}" ${animalIds.has(String(x.id))?'checked':''}> ${esc(x.fields.Name||x.fields.Title)}</label>`).join('')}`:'<p class="muted">Bereits gestartete/historische Personenzuordnungen werden nicht rückwirkend überschrieben.</p>'}</div>
    <div class="card"><div class="actions"><button class="primary" onclick="fp1062SaveUsagePlanEdit()">Zukünftige Planung speichern</button><button onclick="S.view='usageDetail';render()">Abbrechen</button></div></div>`;
    if(canRoute){for(const x of ['upeStart','upeEnd','upeStop'])refreshSiteOptions(x);const setLoc=(prefix,oid,sid)=>{const o=document.getElementById(prefix+'Ort');if(o){o.value=String(oid||'');refreshSiteOptions(prefix);const s=document.getElementById(prefix+'Standort');if(s)s.value=String(sid||'')}};setLoc('upeStart',f.GeplanterStartOrtId,f.GeplanterStartStandortId);setLoc('upeEnd',f.GeplanterEndOrtId,f.GeplanterEndStandortId)}
    document.querySelectorAll('[data-upesecondary]').forEach(x=>x.checked=secIds.has(String(x.dataset.upesecondary)));document.querySelectorAll('[data-upeguest]').forEach(x=>x.checked=guestIds.has(String(x.dataset.upeguest)));fp1062BindMinPair('upeFrom','upeTo',{minuteGap:1});
  }catch(e){failBox(e,'usageDetail')}
}
function fp1062AddEditStop(){const o=document.getElementById('upeStopOrt'),s=document.getElementById('upeStopStandort');if(!o?.value)return alert('Bitte Ort auswählen.');const on=o.options[o.selectedIndex]?.text.replace(/^★ /,'')||'',sn=s?.value?s.options[s.selectedIndex]?.text.replace(/^★ /,''):'';const d=document.createElement('div');d.className='line upe-stop';d.dataset.ortId=o.value;d.dataset.standortId=s?.value||'';d.innerHTML=`<div><b>${esc([sn,on].filter(Boolean).join(' · '))}</b></div><button type="button" onclick="this.parentElement.remove()">Entfernen</button>`;upeStops.appendChild(d)}
async function fp1062SaveUsagePlanEdit(){
  const d=FP1062.planEdit;if(!d)return;const from=document.getElementById('upeFrom')?.value||'',to=document.getElementById('upeTo')?.value||'';if(from&&to&&!fp1062ValidRange(from,to,true))return alert('Das Ende muss mindestens eine Minute nach dem Start liegen.');
  try{const api=await getCloud(),f=d.u.fields||{},fields={Nutzungsname:upeName.value.trim()||fp1062UsageName(f),Title:upeName.value.trim()||fp1062UsageName(f),PlanungGeaendertAm1062:new Date().toISOString()};if(!f.ErstgeplantAm1062)fields.ErstgeplantAm1062=f.GeplanterBeginn||f.Beginn||new Date().toISOString();if(document.getElementById('upeFrom')&&!upeFrom.disabled&&from)fields.GeplanterBeginn=fp1062Iso(from);if(document.getElementById('upeTo')&&!upeTo.disabled&&to)fields.GeplantesEndeDatum=fp1062Iso(to);
    if(d.canRoute){const ps=locValue('upeStart',S.locationData.orts,S.locationData.sites),pe=locValue('upeEnd',S.locationData.orts,S.locationData.sites);Object.assign(fields,{GeplanterStartort:ps.text,GeplanterEndort:pe.text,GeplantesZiel:pe.text,GeplanterStartOrtId:ps.ortId,GeplanterStartStandortId:ps.standortId,GeplanterEndOrtId:pe.ortId,GeplanterEndStandortId:pe.standortId});const old=(await fp105SafeList(api,'NutzungsZwischenziele')).filter(x=>String(x.fields.NutzungId)===String(d.id));for(const x of old)await api.deleteItemByName('NutzungsZwischenziele',x.id);const stops=[...document.querySelectorAll('.upe-stop')];for(let i=0;i<stops.length;i++){const z=stops[i],o=S.locationData.orts.find(x=>String(x.id)===String(z.dataset.ortId)),s=S.locationData.sites.find(x=>String(x.id)===String(z.dataset.standortId));await api.createItemByName('NutzungsZwischenziele',{NutzungId:d.id,Sortierung:i+1,Ort:s?.fields?.Name||o?.fields?.Name||'',OrtId:z.dataset.ortId||'',StandortId:z.dataset.standortId||'',Testdaten:testFlag()})}}
    if(d.canPeople){const primary=document.getElementById('upePrimary')?.value||'';if(!primary)return alert('Hauptperson auswählen.');const oldP=(await fp105SafeList(api,'NutzungsPersonen')).filter(x=>String(x.fields.NutzungId)===String(d.id)&&!x.fields.TagesetappeId),oldA=(await fp105SafeList(api,'NutzungsTiere')).filter(x=>String(x.fields.NutzungId)===String(d.id));for(const x of oldP)await api.deleteItemByName('NutzungsPersonen',x.id);for(const x of oldA)await api.deleteItemByName('NutzungsTiere',x.id);await api.createItemByName('NutzungsPersonen',{NutzungId:d.id,TagesetappeId:'',PersonId:primary,Funktion:normalizeProfile(d.vehicle?.fields?.Profil)==='motorhome'?'Fahrer':'Skipper',Testdaten:testFlag()});for(const id of checkedIds('upesecondary'))await api.createItemByName('NutzungsPersonen',{NutzungId:d.id,TagesetappeId:'',PersonId:id,Funktion:normalizeProfile(d.vehicle?.fields?.Profil)==='motorhome'?'Beifahrer':'Crew',Testdaten:testFlag()});for(const id of checkedIds('upeguest'))await api.createItemByName('NutzungsPersonen',{NutzungId:d.id,TagesetappeId:'',PersonId:id,Funktion:'Gast',Testdaten:testFlag()});for(const id of checkedIds('upeanimal'))await api.createItemByName('NutzungsTiere',{NutzungId:d.id,TierId:id,Testdaten:testFlag()})}
    await api.updateItemByName('Nutzungen',d.id,fields);S.usageDetailId=d.id;S.view='usageDetail';render();
  }catch(e){alert('Planung konnte nicht gespeichert werden: '+e.message)}
}

/* Listen/Details zeigen den Nutzungsnamen sichtbar. */
const fp1062UsageHistoryBase=usageHistory;
usageHistory=async function(){await fp1062UsageHistoryBase();try{const api=await getCloud(),us=await fp105SafeList(api,'Nutzungen');for(const b of app.querySelectorAll('.usage-card')){const id=(b.getAttribute('onclick')||'').match(/usageDetailId='([^']+)'/)?.[1],u=us.find(x=>String(x.id)===String(id));if(u&&u.fields.Nutzungsname){const bold=b.querySelector('b');if(bold)bold.textContent=u.fields.Nutzungsname}}
  }catch(e){console.warn(e)}};
const fp1062UsageDetailBase=usageDetail;
usageDetail=async function(){await fp1062UsageDetailBase();try{const api=await getCloud(),u=await api.getItemByName('Nutzungen',S.usageDetailId),card=app.querySelector('.card'),b=card?.querySelector('b');if(b&&u.fields.Nutzungsname)b.textContent=u.fields.Nutzungsname}catch(e){console.warn(e)}};

/* -------------------------------------------------------------------------- */
/* Verleih: Ende strikt nach Beginn                                            */
/* -------------------------------------------------------------------------- */
const fp1062RenderLendingEditorBase=renderLendingEditor;
renderLendingEditor=function(x){fp1062RenderLendingEditorBase(x);const from=document.getElementById('leFrom'),to=document.getElementById('leTo');if(x){if(from&&!from.value)from.value=fp1062LocalDateTime(x.fields.Beginn);if(to&&!to.value)to.value=fp1062LocalDateTime(x.fields.Ende)}fp1062BindMinPair(from,to,{minuteGap:1})};
const fp1062SaveLendingBase=typeof fp1052SaveLending==='function'?fp1052SaveLending:saveLending103;
async function fp1062SaveLendingStrict(){const a=document.getElementById('leFrom')?.value,b=document.getElementById('leTo')?.value;if(a&&b&&!fp1062ValidRange(a,b,true))return alert('Ende der Überlassung muss mindestens eine Minute nach dem Beginn liegen.');return fp1062SaveLendingBase()}
if(typeof fp1052SaveLending==='function')fp1052SaveLending=fp1062SaveLendingStrict;saveLending103=fp1062SaveLendingStrict;if(typeof saveLending105==='function')saveLending105=fp1062SaveLendingStrict;

/* -------------------------------------------------------------------------- */
/* Schema / Setup / Version                                                    */
/* -------------------------------------------------------------------------- */
const fp1062MergedSchemaBase=fp105MergedSchema;
fp105MergedSchema=async function(){const [prior,e1062]=await Promise.all([fp1062MergedSchemaBase(),fetch('phase1-sharepoint-schema-1.0.6.2.json',{cache:'no-store'}).then(r=>r.json())]);return fp105MergeSchemas(prior,e1062)};
m365setup=function(){head('Microsoft 365 Setup','Schema 1.0.6.2 · Planung + Motorlogik · additiv');const tok=window.FPAuth.token(),authButton=tok?`<button onclick="FPAuth.logout();render()">Microsoft-Verbindung trennen</button>`:`<button class="primary" onclick="sessionStorage.setItem('fp_after_auth','m365setup');FPAuth.login()">Mit Microsoft 365 anmelden</button>`;app.innerHTML=`<div class="card"><b>Microsoft-Anmeldung</b><div id="authState">${tok?'✓ Microsoft-Token vorhanden':'Noch nicht mit Microsoft verbunden'}</div>${authButton}</div><div class="card"><div class="field"><label>SharePoint-Site-URL</label><input id="spSite" value="${esc(localStorage.getItem('fp_sp_site')||'')}" placeholder="https://…sharepoint.com/sites/Fahrzeugplattform"></div><button class="primary" ${tok?'':'disabled'} onclick="runM365Provision1062()">Phase-1-Struktur prüfen / anlegen</button><p class="muted">Additiv und wiederholbar. 1.0.6.2 ergänzt Nutzungsname sowie Felder für Motorereignisse; vorhandene Daten bleiben erhalten.</p></div><div id="m365Result"></div>`};
async function runM365Provision1062(){const url=document.getElementById('spSite').value.trim();if(!url)return alert('Bitte die vollständige SharePoint-Site-URL eintragen.');localStorage.setItem('fp_sp_site',url);const out=document.getElementById('m365Result');out.innerHTML='<div class="card">Schema 1.0.6.2 wird geladen …</div>';try{const schema=await fp105MergedSchema(),setup=new FPGraphSetup(FPAuth.token(),url,schema),site=await setup.resolveSite();let lines=[];out.innerHTML=`<div class="card"><b>Verbunden:</b> ${esc(site.displayName)}<div id="provLog" class="muted">Prüfung startet …</div></div>`;const log=document.getElementById('provLog'),res=await setup.provision(e=>{if(e.status==='created')lines.push(`${e.kind==='list'?'Liste':'Feld'} angelegt: ${e.kind==='field'?e.list+' · ':''}${e.name}`);if(log)log.innerHTML=`Fortschritt: ${esc(e.kind==='field'?e.list+' · '+e.name:e.name)}<br>${lines.slice(-8).map(esc).join('<br>')}`});out.innerHTML=`<div class="card status-ok"><b>Setup abgeschlossen und verifiziert</b><p>${res.totalLists} Listen geprüft · ${res.listsCreated} neu angelegt · ${res.fieldsCreated} Felder neu angelegt · ${res.verifiedLists} Listen für die App erreichbar.</p></div>`}catch(e){out.innerHTML=`<div class="card status-stop"><b>Setup nicht abgeschlossen</b><p>${esc(e.message)}</p></div>`}}
runM365Provision=runM365Provision1062;
exportPhase1Data=async function(){try{const schema=await fp105MergedSchema(),api=await getCloud(),data={exportedAt:new Date().toISOString(),version:FP1062_VERSION,lists:{}};for(const l of schema.lists){try{data.lists[l.internalName]=await list(api,l.internalName)}catch(e){data.lists[l.internalName]={error:e.message}}}const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Fahrzeugplattform_Export_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}catch(e){alert(e.message)}};
main=function(){S.stack=[];head('MOBIMORY','Phase 1 · '+FP1062_VERSION);app.innerHTML=`<div class="home-brand">${typeof mobiIcon==='function'?mobiIcon():''}${typeof brandHeadline==='function'?brandHeadline():''}</div><div class="grid"><button class="menu" onclick="go('start')"><b>Start</b><span class="muted">Nutzung, Cockpit, Planung & Historie</span></button><button class="menu" onclick="go('configuration')"><b>Konfiguration</b><span class="muted">Fahrzeuge, Personen, Tiere, Orte, Reisegrundlagen</span></button><button class="menu" onclick="go('workshop')"><b>Werkstatt</b><span class="muted">Störungen, Wartung, Arbeiten und Aufgaben</span></button><button class="menu" onclick="go('lending')"><b>Verleihmodus</b><span class="muted">Gruppen, Qualifikationen und Rechte</span></button><button class="menu" onclick="go('settings')"><b>Einstellungen / Daten</b><span class="muted">M365, Testmodus, Export</span></button></div>`};
login=function(){bar.hidden=true;app.innerHTML=`<div class="login"><div class="card mobi-login">${typeof mobiIcon==='function'?mobiIcon():''}${typeof brandHeadline==='function'?brandHeadline():'<div class="brand">MOBIMORY</div>'}<p class="muted">Version ${FP1062_VERSION}</p><div class="field"><label>Nutzer</label><input value="Admin"></div><div class="field"><label>Passwort</label><input type="password" value="admin"></div><button class="primary" onclick="S.stack=[];S.view='main';render()">Anmelden</button></div></div>`};
document.title=`Fahrzeugplattform ${FP1062_VERSION}`;const fp1062Foot=document.querySelector('footer');if(fp1062Foot)fp1062Foot.textContent=`Fahrzeugplattform · ${FP1062_VERSION} · © 2026 Entwicklungsstand`;try{render()}catch(e){console.warn(e)}
