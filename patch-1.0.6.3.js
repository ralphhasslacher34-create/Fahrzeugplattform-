/* MOBIMORY / Fahrzeugplattform 1.0.6.3-dev
   Praxis-Fix auf Basis 1.0.6.2 FIX1:
   - Nutzungsname ist in Start/Dashboard, Planung und Historie die Hauptbezeichnung
   - Planungszeitraum wieder als reine Datumsfelder; tatsächliche Ereignisse behalten Datum + Uhrzeit
   - Personen innerhalb einer Nutzung gleichzeitig nur einmal / nur in einer Funktion auswählbar
   - Nutzung starten / fortsetzen startet KEINE Motoren
   - gemeinsames Ablegen startet alle konfigurierten Antriebsmotoren
   - pro Motor im Cockpit nur ein Stop-Button, solange der Motor läuft
   - Anlegen beendet die Fahrt mit Zeit/GPS, stoppt Motoren aber nicht automatisch
   - Ereignisprotokoll zeigt konkretes Ereignis bzw. Motor + Aktion + Uhrzeit/Datum
   - technische Kontext-Rohereignisse werden in der sichtbaren Historie ausgeblendet
*/

const FP1063_VERSION='1.0.6.3-dev';

/* -------------------------------------------------------------------------- */
/* Datum: Planung bleibt Datum, reale Vorgänge bleiben DateTime                */
/* -------------------------------------------------------------------------- */
function fp1063DateValue(v){return v?String(v).slice(0,10):''}
function fp1063PlanIso(v){if(!v)return null;const d=new Date(String(v).slice(0,10)+'T12:00:00');return Number.isNaN(d.getTime())?null:d.toISOString()}
function fp1063LocalDayStart(v){if(!v)return null;const d=new Date(String(v).slice(0,10)+'T00:00:00');return Number.isNaN(d.getTime())?null:d}
function fp1063LocalDayEnd(v){if(!v)return null;const d=new Date(String(v).slice(0,10)+'T23:59:59.999');return Number.isNaN(d.getTime())?null:d}
function fp1063ValidPlanRange(a,b){return !!a&&!!b&&String(b).slice(0,10)>=String(a).slice(0,10)}
function fp1063GermanDate(v){const s=fp1063DateValue(v);if(!s)return'';const p=s.split('-');return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:s}
function fp1063PlanRangeLabel(f){
  const a=fp1063DateValue(f?.GeplanterBeginn||''),b=fp1063DateValue(f?.GeplantesEndeDatum||'');
  if(!a&&!b)return'';if(a&&b&&a===b)return fp1063GermanDate(a);if(a&&b)return `${fp1063GermanDate(a)}–${fp1063GermanDate(b)}`;return fp1063GermanDate(a||b);
}
function fp1063FallbackUsageName(){
  const d=document.getElementById('planFrom')?.value||new Date().toISOString().slice(0,10),kind=S.usage?.name||'Nutzung';
  return `${kind} · ${fp1063GermanDate(d)}`;
}
function fp1063SyncDatePair(start,end){
  if(typeof start==='string')start=document.getElementById(start);if(typeof end==='string')end=document.getElementById(end);if(!start||!end)return;
  const sync=()=>{if(start.value){end.min=start.value;if(end.value&&end.value<start.value)end.value=start.value}else end.removeAttribute('min')};
  start.addEventListener('input',sync);start.addEventListener('change',sync);sync();
}
function fp1063ReplaceWithDateInput(id){
  const old=document.getElementById(id);if(!old)return null;const v=fp1063DateValue(old.value),n=old.cloneNode(true);n.type='date';n.value=v;old.replaceWith(n);return n;
}

/* Verfügbarkeit weiterhin über den kompletten geplanten Kalendertag prüfen. */
fp1052RequestedUsageRange=function(){
  const now=new Date(),pf=document.getElementById('planFrom')?.value||'',pt=document.getElementById('planTo')?.value||'';
  if(pf&&pt){const a=fp1063LocalDayStart(pf),b=fp1063LocalDayEnd(pt);if(a&&b)return {start:a,end:b}}
  const end=new Date(now);end.setHours(23,59,59,999);return {start:now,end};
};

function fp1063PlanFields({status='Geplant',now=new Date().toISOString()}={}){
  const multi=!!S.usage?.multi,orts=S.locationData?.orts||[],sites=S.locationData?.sites||[],ps=multi?locValue('planStart',orts,sites):locValue('dayStart',orts,sites),pe=multi?locValue('planEnd',orts,sites):locValue('dayGoal',orts,sites),from=multi?document.getElementById('planFrom')?.value:'',to=multi?document.getElementById('planTo')?.value:'',entered=(document.getElementById('usageName1062')?.value||'').trim(),name=entered||fp1063FallbackUsageName();
  const f={Title:name,Nutzungsname:name,ErstgeplantAm1062:now,PlanungGeaendertAm1062:now,FahrzeugId:String(S.vehicle.id),BenutzerId:'current',NutzungsartId:String(S.usage.id),Status:status,GeplanterStartort:ps.text,GeplanterEndort:pe.text,GeplantesZiel:pe.text,GeplanterStartOrtId:ps.ortId,GeplanterStartStandortId:ps.standortId,GeplanterEndOrtId:pe.ortId,GeplanterEndStandortId:pe.standortId,Testdaten:testFlag()};
  if(multi){f.GeplanterBeginn=fp1063PlanIso(from);f.GeplantesEndeDatum=fp1063PlanIso(to)}
  return {f,from,to,ps,pe,name};
}

/* -------------------------------------------------------------------------- */
/* Personen: innerhalb derselben aktuellen Auswahl exakt eine Funktion         */
/* -------------------------------------------------------------------------- */
function fp1063RoleId(cb,names){for(const n of names){if(cb?.dataset?.[n])return String(cb.dataset[n])}return''}
function fp1063RefreshPeopleExclusions(){
  const primary=String(document.getElementById('primaryPerson')?.value||''),secs=[...document.querySelectorAll('[data-secondary]')],guests=[...document.querySelectorAll('[data-guest]')];
  /* Priorität bei alten Doppelbelegungen: Hauptfunktion > Crew/Beifahrer > Gast. */
  for(const cb of secs){const id=String(cb.dataset.secondary||'');if(id===primary)cb.checked=false}
  const secSelected=new Set(secs.filter(x=>x.checked).map(x=>String(x.dataset.secondary||'')));
  for(const cb of guests){const id=String(cb.dataset.guest||'');if(id===primary||secSelected.has(id))cb.checked=false}
  const guestSelected=new Set(guests.filter(x=>x.checked).map(x=>String(x.dataset.guest||'')));
  for(const cb of secs){const id=String(cb.dataset.secondary||'');cb.disabled=id===primary||guestSelected.has(id)}
  for(const cb of guests){const id=String(cb.dataset.guest||'');cb.disabled=id===primary||secSelected.has(id)}
}
refreshPeopleExclusions=fp1063RefreshPeopleExclusions;

function fp1063RefreshEditPeopleExclusions(){
  const primary=String(document.getElementById('upePrimary')?.value||''),secs=[...document.querySelectorAll('[data-upesecondary]')],guests=[...document.querySelectorAll('[data-upeguest]')];
  for(const cb of secs){const id=String(cb.dataset.upesecondary||'');if(id===primary)cb.checked=false}
  const secSelected=new Set(secs.filter(x=>x.checked).map(x=>String(x.dataset.upesecondary||'')));
  for(const cb of guests){const id=String(cb.dataset.upeguest||'');if(id===primary||secSelected.has(id))cb.checked=false}
  const guestSelected=new Set(guests.filter(x=>x.checked).map(x=>String(x.dataset.upeguest||'')));
  for(const cb of secs){const id=String(cb.dataset.upesecondary||'');cb.disabled=id===primary||guestSelected.has(id)}
  for(const cb of guests){const id=String(cb.dataset.upeguest||'');cb.disabled=id===primary||secSelected.has(id)}
}
function fp1063RefreshCrewChangeExclusions(){
  const primary=String(document.getElementById('ccPrim')?.value||''),secs=[...document.querySelectorAll('[data-ccsecondary]')],guests=[...document.querySelectorAll('[data-ccguest]')];
  for(const cb of secs){const id=String(cb.dataset.ccsecondary||'');if(id===primary)cb.checked=false}
  const secSelected=new Set(secs.filter(x=>x.checked).map(x=>String(x.dataset.ccsecondary||'')));
  for(const cb of guests){const id=String(cb.dataset.ccguest||'');if(id===primary||secSelected.has(id))cb.checked=false}
  const guestSelected=new Set(guests.filter(x=>x.checked).map(x=>String(x.dataset.ccguest||'')));
  for(const cb of secs){const id=String(cb.dataset.ccsecondary||'');cb.disabled=id===primary||guestSelected.has(id)}
  for(const cb of guests){const id=String(cb.dataset.ccguest||'');cb.disabled=id===primary||secSelected.has(id)}
}
refreshCrewChangeExclusions=fp1063RefreshCrewChangeExclusions;

async function fp1063SaveRelationsForNewUsage(api,usageId,dayId=''){
  const pp=document.getElementById('primaryPerson'),primary=profileDef().functions[0];if(!pp?.value)throw new Error(`Bitte ${primary} auswählen.`);
  const used=new Set([String(pp.value)]),secondary=checkedIds('secondary').filter(id=>!used.has(String(id)));secondary.forEach(id=>used.add(String(id)));const guests=checkedIds('guest').filter(id=>!used.has(String(id)));
  await api.createItemByName('NutzungsPersonen',{NutzungId:String(usageId),TagesetappeId:String(dayId||''),PersonId:pp.value,Funktion:primary,Testdaten:testFlag()});
  for(const id of secondary)await api.createItemByName('NutzungsPersonen',{NutzungId:String(usageId),TagesetappeId:String(dayId||''),PersonId:id,Funktion:profileDef().functions[1],Testdaten:testFlag()});
  for(const id of guests)await api.createItemByName('NutzungsPersonen',{NutzungId:String(usageId),TagesetappeId:String(dayId||''),PersonId:id,Funktion:'Gast',Testdaten:testFlag()});
  for(const id of checkedIds('animal'))await api.createItemByName('NutzungsTiere',{NutzungId:String(usageId),TierId:id,Testdaten:testFlag()});
}
fp1062SaveRelationsForNewUsage=fp1063SaveRelationsForNewUsage;

/* Setup 6.2 ausführen, danach Datumsfelder/Personenlogik auf 6.3 umstellen. */
const fp1063SetupBase=setupBase;
setupBase=async function(){
  const r=await fp1063SetupBase();
  const pf=fp1063ReplaceWithDateInput('planFrom'),pt=fp1063ReplaceWithDateInput('planTo');
  if(pf&&pt){fp1063SyncDatePair(pf,pt);pf.addEventListener('change',fp1052RefreshUsageAvailability);pt.addEventListener('change',fp1052RefreshUsageAvailability);const save=document.getElementById('fp1062SavePlan');if(save)save.onclick=fp1063SaveNewPlan}
  const hint=document.querySelector('#usageName1062 + .muted');if(hint)hint.textContent='Leer = automatisch aus Nutzungsart und geplantem Startdatum.';
  const primary=document.getElementById('primaryPerson');if(primary)primary.onchange=fp1063RefreshPeopleExclusions;document.querySelectorAll('[data-secondary],[data-guest]').forEach(x=>x.addEventListener('change',fp1063RefreshPeopleExclusions));fp1063RefreshPeopleExclusions();
  return r;
};

/* -------------------------------------------------------------------------- */
/* Planung speichern / Nutzung starten: Datumsfelder, Motoren bleiben aus      */
/* -------------------------------------------------------------------------- */
async function fp1063SaveNewPlan(){
  if(!S.usage?.multi)return alert('Eine separate Planung ist für mehrtägige Nutzungen vorgesehen.');
  const pf=document.getElementById('planFrom')?.value,pt=document.getElementById('planTo')?.value;if(!pf||!pt)return alert('Geplanten Start und geplantes Ende eingeben.');if(!fp1063ValidPlanRange(pf,pt))return alert('Das geplante Ende darf nicht vor dem geplanten Start liegen.');
  try{
    const api=await getCloud(),r={start:fp1063LocalDayStart(pf),end:fp1063LocalDayEnd(pt)},available=typeof fp1052AssertVehicleAvailable==='function'?await fp1052AssertVehicleAvailable(S.vehicle.id,r.start,r.end,{api}):{ok:true,rows:[]};
    if(!available.ok)return alert('Dieses Fahrzeug ist im geplanten Zeitraum bereits belegt:\n\n'+fp1052ConflictMessage(available.rows));
    const now=new Date().toISOString(),{f}=fp1063PlanFields({status:'Geplant',now}),u=await api.createItemByName('Nutzungen',f);await fp1062SaveStops(api,u.id);await fp1063SaveRelationsForNewUsage(api,u.id,'');
    alert('Planung gespeichert. Zählerstände werden erst beim tatsächlichen Start bestätigt.');S.usageDetailId=String(u.id);S.stack=[];S.view='usageDetail';render();
  }catch(e){alert('Planung konnte nicht gespeichert werden: '+e.message)}
}
fp1062SaveNewPlan=fp1063SaveNewPlan;

beginCloud101=async function(){
  const pp=document.getElementById('primaryPerson');if(!pp?.value)return alert(`Bitte ${profileDef().functions[0]} auswählen.`);const multi=!!S.usage.multi,pf=document.getElementById('planFrom')?.value||'',pt=document.getElementById('planTo')?.value||'';
  if(multi&&(!pf||!pt))return alert('Geplanten Start und geplantes Ende eingeben.');if(multi&&!fp1063ValidPlanRange(pf,pt))return alert('Das geplante Ende darf nicht vor dem geplanten Start liegen.');if(!document.getElementById('fp1062CounterConfirm')?.checked)return alert('Bitte die aktuellen Zählerstände beim tatsächlichen Start prüfen und bestätigen.');
  try{
    const api=await getCloud(),now=new Date().toISOString(),range=multi?{start:fp1063LocalDayStart(pf),end:fp1063LocalDayEnd(pt)}:{start:new Date(),end:new Date(Date.now()+60000)},available=typeof fp1052AssertVehicleAvailable==='function'?await fp1052AssertVehicleAvailable(S.vehicle.id,range.start,range.end,{api}):{ok:true,rows:[]};if(!available.ok)return alert('Dieses Fahrzeug ist im vorgesehenen Zeitraum bereits belegt:\n\n'+fp1052ConflictMessage(available.rows));
    const counters=await fp1062ValidateStartInputs(api),orts=S.locationData?.orts||[],sites=S.locationData?.sites||[],ds=locValue('dayStart',orts,sites),dg=locValue('dayGoal',orts,sites),plan=fp1063PlanFields({status:'Aktiv',now});plan.f.Beginn=now;plan.f.Startpunkt=ds.text;plan.f.GeplantesZiel=multi?plan.f.GeplantesZiel:dg.text;
    const u=await api.createItemByName('Nutzungen',plan.f),day=await api.createItemByName('Tagesetappen',{NutzungId:String(u.id),FahrzeugId:String(S.vehicle.id),TagNr:1,Datum:now,Startpunkt:ds.text,Tagesziel:dg.text,Beginn:now,Status:'Aktiv',StartOrtId:ds.ortId,StartStandortId:ds.standortId,ZielOrtId:dg.ortId,ZielStandortId:dg.standortId,Testdaten:testFlag()});
    await fp1062SaveStops(api,u.id);await fp1063SaveRelationsForNewUsage(api,u.id,day.id);S.usage.cloudId=String(u.id);S.usage.displayName=plan.name;S.day={id:String(day.id),start:ds.text,goal:dg.text,startMeters:counters.map(x=>String(x.value))};localStorage.setItem('fp-current',JSON.stringify({vehicle:S.vehicle,usage:S.usage,day:S.day,startedAt:now}));
    for(let i=0;i<(S.metrics||[]).length;i++){const m=S.metrics[i],v=counters[i];await api.createItemByName('Messwerte',{FahrzeugId:String(S.vehicle.id),NutzungId:String(u.id),TagesetappeId:String(day.id),KomponenteId:m.componentId,Messgroesse:m.measure,Wert:v.value,Einheit:m.unit,Phase:'Start',GemessenAm:now,Quelle:'Manuell bestätigt',Notiz:v.reason||'',Testdaten:testFlag(),Aktiv:true})}
    /* Wichtig 6.3: Nutzung ist aktiv, Motoren bleiben aus. */
    go('cockpit');
  }catch(e){alert('Nutzung konnte nicht gestartet werden: '+e.message)}
};
beginCloud=beginCloud101;

/* Neuer Tag / geplante Nutzung: Zähler bestätigen, Motoren erst beim Ablegen. */
continueUsage=async function(id){
  let api,ctx,counters=[];try{api=await getCloud();ctx=await fp1062PrepareUsageContext(api,id);const cached=FP1062.counterConfirm&&String(FP1062.counterConfirm.usageId)===String(id)?FP1062.counterConfirm.counters:null;counters=cached||await fp1062PromptCounters(api,String(ctx.u.fields.FahrzeugId));FP1062.counterConfirm=null}catch(e){FP1062.counterConfirm=null;return alert(e.message)}
  const oldDay=String(S.day?.id||'');await fp1062ContinueUsageBase(id);if(!S.day?.id||String(S.day.id)===oldDay)return;
  try{const now=new Date().toISOString();await fp1062PersistStartCounters(api,counters,now)}catch(e){alert('Startwerte konnten nicht vollständig gespeichert werden: '+e.message)}
};

/* -------------------------------------------------------------------------- */
/* Motorlogik 6.3: gemeinsames Ablegen startet, Einzelbutton stoppt nur        */
/* -------------------------------------------------------------------------- */
function fp1063InstallStyle(){
  if(document.getElementById('fp1063-style'))return;const s=document.createElement('style');s.id='fp1063-style';s.textContent='.fp1063-motor-running{background:#168547!important;color:#fff!important;border-color:#168547!important}.fp1063-motor-off{opacity:.7}.fp1063-motor-grid{display:grid;gap:.65rem}.fp1063-motor-grid button{text-align:left;width:100%}';document.head.appendChild(s);
}
async function fp1063LatestArrivalContext(api){
  const es=(await fp105SafeList(api,'Ereignisse')).filter(x=>String(x.fields.NutzungId)===String(S.usage?.cloudId||'')&&String(x.fields.TagesetappeId||'')===String(S.day?.id||'')&&x.fields.Rohdaten!==true&&['Ablegen','Anlegen / Ankern','Anlegen'].includes(String(x.fields.Art||''))).sort((a,b)=>String(a.fields.Zeitpunkt||'').localeCompare(String(b.fields.Zeitpunkt||''))),last=es[es.length-1];
  if(last&&['Anlegen / Ankern','Anlegen'].includes(String(last.fields.Art||'')))return {lat:Number.isFinite(Number(last.fields.Breitengrad))?Number(last.fields.Breitengrad):null,lon:Number.isFinite(Number(last.fields.Laengengrad))?Number(last.fields.Laengengrad):null,accuracy:null};
  let p=null;try{p=typeof fp104Position==='function'?await fp104Position():null}catch{}return {lat:p?.lat??null,lon:p?.lon??null,accuracy:p?.accuracy??null};
}
async function fp1063StopMotor(engineId){
  try{const api=await getCloud(),x=await fp1062MotorState(api),engine=x.engines.find(e=>String(e.id)===String(engineId)),state=x.state[String(engineId)];if(!engine)return alert('Motor wurde nicht gefunden.');if(!state?.running)return cockpit();const p=await fp1063LatestArrivalContext(api),now=new Date().toISOString();await fp1062RecordMotor(api,engine,'gestoppt',{timestamp:now,lat:p.lat,lon:p.lon,accuracy:p.accuracy,source:'Manuell · Cockpit Motor-Aus'});await cockpit()}catch(e){alert('Motor konnte nicht gestoppt werden: '+e.message)}
}

const fp1063CockpitActionBase=fp104CockpitAction;
fp104CockpitAction=async function(action,view,primary=false){
  const startMotors=S.vehicle?.profile==='motorboat'&&String(action)==='Ablegen'&&!!S.usage?.cloudId;
  const r=await fp1063CockpitActionBase(action,view,primary);
  if(startMotors){
    try{const api=await getCloud(),ctx=S.pendingContext||{timestamp:new Date().toISOString(),lat:null,lon:null,accuracy:null};await fp1062StartAllMotors(api,{timestamp:ctx.timestamp||new Date().toISOString(),lat:ctx.lat??null,lon:ctx.lon??null,accuracy:ctx.accuracy??null,source:'System · Ablegen'});if(S.view==='cockpit')await cockpit()}catch(e){alert('Ablegen wurde gespeichert, der Motorstatus konnte aber nicht vollständig gesetzt werden: '+e.message)}
  }
  return r;
};

/* 6.2-Autostopp beim Aufenthalt zurücknehmen: Anlegen stoppt die Fahrt, nicht Motoren. */
saveStayV105=fp1062SaveStayBase;
saveStayV104=saveStayV105;

const fp1063StayBase=stay;
stay=async function(){
  const r=await fp1063StayBase();if(S.vehicle?.profile==='motorboat'){if(title)title.textContent='Anlegen';const b=app.querySelector('.fp-compact-time b');if(b&&/Ankunft/i.test(b.textContent||''))b.textContent='Anlegen'}return r;
};

const fp1063CockpitBase=cockpit;
cockpit=async function(){
  await fp1063CockpitBase();fp1063InstallStyle();if(S.vehicle?.profile!=='motorboat'||!S.usage?.cloudId)return;
  /* Gemeinsame Bewegungsaktion heißt sichtbar nur noch Anlegen; Rohwert bleibt kompatibel. */
  [...app.querySelectorAll('button')].filter(b=>/Anlegen \/ Ankern/i.test(b.textContent||'')).forEach(b=>{b.textContent=(b.textContent||'').replace(/Anlegen \/ Ankern/g,'Anlegen')});
  try{
    const api=await getCloud(),x=await fp1062MotorState(api);document.getElementById('fp1062MotorStatus')?.remove();document.getElementById('fp1063MotorStatus')?.remove();const card=document.createElement('div');card.className='card';card.id='fp1063MotorStatus';
    card.innerHTML=`<div class="section first">Motorstatus</div><div class="fp1063-motor-grid">${x.engines.map(e=>{const s=x.state[e.id],last=s?.last?.fields?.Zeitpunkt||'';return s?.running?`<button class="fp1063-motor-running" onclick="fp1063StopMotor('${e.id}')"><b>${esc(e.name)}</b><br>● Motor läuft${s.since?' · seit '+esc(fp104Time(s.since)):''}<br><small>Drücken = Motor aus</small></button>`:`<button class="fp1063-motor-off" disabled><b>${esc(e.name)}</b><br>○ Motor aus${last?' · seit '+esc(fp104Time(last)):''}</button>`}).join('')||'<p class="muted">Keine Antriebsmotoren konfiguriert.</p>'}</div><p class="muted">Ablegen startet alle Antriebsmotoren gemeinsam. Die Motorbuttons können einen laufenden Motor nur ausschalten.</p>`;
    app.insertBefore(card,app.firstChild);
  }catch(e){console.warn('Motorstatus 1.0.6.3',e)}
};

/* -------------------------------------------------------------------------- */
/* Dashboard / Historie: Nutzungsname zuerst, geplantes Datum statt Erstellung */
/* -------------------------------------------------------------------------- */
start=async function(){
  head('Start','Nutzung und Rückblick');app.innerHTML='<div class="card">Nutzungen werden geladen …</div>';
  try{
    const api=await getCloud(),[us,vs,types]=await Promise.all([list(api,'Nutzungen'),list(api,'Fahrzeuge'),list(api,'Nutzungsarten')]),vm=Object.fromEntries(vs.map(x=>[String(x.id),x.fields.Fahrzeugname||x.fields.Title])),tm=Object.fromEntries(types.map(x=>[String(x.id),x.fields.Name||x.fields.Title])),active=us.filter(x=>x.fields.Status==='Aktiv').sort((a,b)=>String(b.fields.Beginn||'').localeCompare(String(a.fields.Beginn||''))),planned=us.filter(x=>['Vorbereitet','Geplant'].includes(x.fields.Status)).sort((a,b)=>String(a.fields.GeplanterBeginn||'').localeCompare(String(b.fields.GeplanterBeginn||'')));
    const titleFor=u=>fp1062UsageName(u.fields,tm[String(u.fields.NutzungsartId)]||'Nutzung'),metaFor=u=>`${vm[String(u.fields.FahrzeugId)]||'Fahrzeug'} · ${tm[String(u.fields.NutzungsartId)]||'Nutzung'}`;
    app.innerHTML=`${active.length?`<div class="card status-ok"><div class="section first">Aktive Nutzung fortsetzen</div>${active.map(u=>`<button class="menu" onclick="openUsage('${u.id}')"><b>${esc(titleFor(u))}</b><span class="muted">${esc(metaFor(u))}</span><span>${u.fields.Beginn?'Aktiv seit '+fp1063GermanDate(u.fields.Beginn):''}${u.fields.Startpunkt||u.fields.GeplanterStartort?' · '+esc(u.fields.Startpunkt||u.fields.GeplanterStartort):''}</span></button>`).join('')}</div>`:''}<div class="grid"><button class="menu" onclick="go('vehicle')"><b>Neue Nutzung</b><span class="muted">spontan oder geplant</span></button><button class="menu" onclick="go('history')"><b>Planung & Historie</b><span class="muted">geplante, aktive und beendete Nutzungen</span></button></div>${planned.length?`<div class="card"><div class="section first">Geplante Nutzungen</div>${planned.slice(0,8).map(u=>`<button class="menu" onclick="openUsage('${u.id}')"><b>${esc(titleFor(u))}</b><span class="muted">${esc(metaFor(u))}</span><span><b>Geplant:</b> ${esc(fp1063PlanRangeLabel(u.fields)||'Datum offen')}${u.fields.GeplanterStartort||u.fields.GeplanterEndort||u.fields.GeplantesZiel?` · ${esc(u.fields.GeplanterStartort||'')} → ${esc(u.fields.GeplanterEndort||u.fields.GeplantesZiel||'')}`:''}</span></button>`).join('')}</div>`:''}`;
  }catch(e){failBox(e)}
};

usageHistory=async function(){
  head('Nutzungen / Historie','SharePoint-Auswertung');app.innerHTML='<div class="card">Historie wird geladen …</div>';
  try{
    const api=await getCloud(),[us,vs,types,days,events,costs]=await Promise.all([list(api,'Nutzungen'),list(api,'Fahrzeuge'),list(api,'Nutzungsarten'),list(api,'Tagesetappen'),list(api,'Ereignisse'),list(api,'Ausgaben')]),vm=Object.fromEntries(vs.map(x=>[String(x.id),x.fields.Fahrzeugname||x.fields.Title])),tm=Object.fromEntries(types.map(x=>[String(x.id),x.fields.Name||x.fields.Title]));
    const visibleEvent=e=>e.fields.Rohdaten!==true&&!/^Kontext\s*·/i.test(String(e.fields.Art||''));
    app.innerHTML=`<div class="card"><button onclick="exportPhase1Data()">Kompletten Datenexport erzeugen</button></div>${us.sort((a,b)=>String(b.fields.Beginn||b.fields.GeplanterBeginn||'').localeCompare(String(a.fields.Beginn||a.fields.GeplanterBeginn||''))).map(u=>{const ds=days.filter(d=>String(d.fields.NutzungId)===String(u.id)),es=events.filter(e=>String(e.fields.NutzungId)===String(u.id)&&visibleEvent(e)),sum=costs.filter(c=>String(c.fields.NutzungId)===String(u.id)).reduce((a,c)=>a+Number(c.fields.Betrag||0),0),name=fp1062UsageName(u.fields,tm[String(u.fields.NutzungsartId)]||'Nutzung'),planned=fp1063PlanRangeLabel(u.fields),actual=u.fields.Beginn?fp1063GermanDate(u.fields.Beginn):'';return `<button class="menu usage-card" onclick="openUsage('${u.id}')"><b>${esc(name)}</b><span class="muted">${esc(vm[String(u.fields.FahrzeugId)]||'Fahrzeug')} · ${esc(tm[String(u.fields.NutzungsartId)]||'Nutzung')}</span><span>${planned?`Geplant: ${esc(planned)}`:actual?`Datum: ${esc(actual)}`:'Datum offen'}${u.fields.Startpunkt||u.fields.GeplanterStartort||u.fields.GeplantesZiel?` · ${esc(u.fields.Startpunkt||u.fields.GeplanterStartort||'')} → ${esc(u.fields.GeplantesZiel||u.fields.GeplanterEndort||'')}`:''} · ${esc(u.fields.Status||'')}</span><span>${ds.length} Tagesetappe(n) · ${es.length} Ereignis(se) · Kosten ${sum.toFixed(2)} €${u.fields.Testdaten?' · TEST':''}</span></button>`}).join('')||'<div class="card">Noch keine Nutzungen.</div>'}`;
  }catch(e){failBox(e)}
};

function fp1063EventLabel(e){
  const f=e.fields||{},art=String(f.Art||'Ereignis');if(fp1062MotorAction(e)){const name=String(f.AggregatName1062||'Motor'),action=fp1062MotorAction(e);return `${name} ${action}`}
  if(art==='Anlegen / Ankern')return'Anlegen';return art.replace(/^Kontext\s*·\s*/i,'');
}
function fp1063VisibleEvent(e){return e?.fields?.Rohdaten!==true&&!/^Kontext\s*·/i.test(String(e?.fields?.Art||''))}

const fp1063UsageDetailBase=usageDetail;
usageDetail=async function(){
  await fp1063UsageDetailBase();
  try{
    const api=await getCloud(),[u,events,vs,types]=await Promise.all([api.getItemByName('Nutzungen',S.usageDetailId),fp105SafeList(api,'Ereignisse'),fp105SafeList(api,'Fahrzeuge'),fp105SafeList(api,'Nutzungsarten')]),f=u.fields||{},vehicle=vs.find(x=>String(x.id)===String(f.FahrzeugId)),type=types.find(x=>String(x.id)===String(f.NutzungsartId)),first=app.querySelector('.card'),name=fp1062UsageName(f,type?.fields?.Name||type?.fields?.Title||'Nutzung');
    if(first){const b=first.querySelector('b');if(b)b.textContent=name;[...first.querySelectorAll('.muted')].filter(x=>/erstellt|erstplanung|erstellungsdatum/i.test(x.textContent||'')).forEach(x=>x.remove());if(!first.querySelector('.fp1063-usage-meta')){const d=document.createElement('div');d.className='muted fp1063-usage-meta';d.innerHTML=`${esc(vehicle?.fields?.Fahrzeugname||vehicle?.fields?.Title||'Fahrzeug')} · ${esc(type?.fields?.Name||type?.fields?.Title||'Nutzung')}${fp1063PlanRangeLabel(f)?`<br><b>Geplant:</b> ${esc(fp1063PlanRangeLabel(f))}`:''}`;b?.insertAdjacentElement('afterend',d)}}
    const heading=[...app.querySelectorAll('.section')].find(x=>(x.textContent||'').trim()==='Ereignisse'),card=heading?.closest('.card'),rows=events.filter(x=>String(x.fields.NutzungId)===String(S.usageDetailId)&&fp1063VisibleEvent(x)).sort((a,b)=>String(a.fields.Zeitpunkt||'').localeCompare(String(b.fields.Zeitpunkt||'')));
    if(card){card.querySelectorAll('.line').forEach(x=>x.remove());[...card.querySelectorAll('p.muted')].filter(x=>/Noch keine Ereignisse/i.test(x.textContent||'')).forEach(x=>x.remove());for(const e of rows.slice(-50)){const line=document.createElement('div');line.className='line';const note=String(e.fields.Notiz||'').trim();line.innerHTML=`<div><b>${esc(fp1063EventLabel(e))}</b><div class="muted">${esc(fp1053DateTimeLabel(e.fields.Zeitpunkt))}${note?' · '+esc(note):''}</div></div>`;card.appendChild(line)}if(!rows.length){const p=document.createElement('p');p.className='muted';p.textContent='Noch keine Ereignisse.';card.appendChild(p)}}
  }catch(e){console.warn('Nutzungsdetail 1.0.6.3',e)}
};

/* -------------------------------------------------------------------------- */
/* Planung bearbeiten: Datum-only + eindeutige Personen                       */
/* -------------------------------------------------------------------------- */
const fp1063EditUsagePlanBase=editUsagePlan;
editUsagePlan=async function(id){
  await fp1063EditUsagePlanBase(id);const from=fp1063ReplaceWithDateInput('upeFrom'),to=fp1063ReplaceWithDateInput('upeTo');if(from&&to)fp1063SyncDatePair(from,to);const p=document.getElementById('upePrimary');if(p)p.onchange=fp1063RefreshEditPeopleExclusions;document.querySelectorAll('[data-upesecondary],[data-upeguest]').forEach(x=>x.addEventListener('change',fp1063RefreshEditPeopleExclusions));fp1063RefreshEditPeopleExclusions();
};

fp1062SaveUsagePlanEdit=async function(){
  const d=FP1062.planEdit;if(!d)return;const from=document.getElementById('upeFrom')?.value||'',to=document.getElementById('upeTo')?.value||'';if(from&&to&&!fp1063ValidPlanRange(from,to))return alert('Das geplante Ende darf nicht vor dem geplanten Start liegen.');
  try{
    const api=await getCloud(),f=d.u.fields||{},name=document.getElementById('upeName')?.value.trim()||fp1062UsageName(f),fields={Nutzungsname:name,Title:name,PlanungGeaendertAm1062:new Date().toISOString()};if(!f.ErstgeplantAm1062)fields.ErstgeplantAm1062=f.GeplanterBeginn||f.Beginn||new Date().toISOString();if(document.getElementById('upeFrom')&&!upeFrom.disabled&&from)fields.GeplanterBeginn=fp1063PlanIso(from);if(document.getElementById('upeTo')&&!upeTo.disabled&&to)fields.GeplantesEndeDatum=fp1063PlanIso(to);
    if(d.canRoute){const ps=locValue('upeStart',S.locationData.orts,S.locationData.sites),pe=locValue('upeEnd',S.locationData.orts,S.locationData.sites);Object.assign(fields,{GeplanterStartort:ps.text,GeplanterEndort:pe.text,GeplantesZiel:pe.text,GeplanterStartOrtId:ps.ortId,GeplanterStartStandortId:ps.standortId,GeplanterEndOrtId:pe.ortId,GeplanterEndStandortId:pe.standortId});const old=(await fp105SafeList(api,'NutzungsZwischenziele')).filter(x=>String(x.fields.NutzungId)===String(d.id));for(const x of old)await api.deleteItemByName('NutzungsZwischenziele',x.id);const stops=[...document.querySelectorAll('.upe-stop')];for(let i=0;i<stops.length;i++){const z=stops[i],o=S.locationData.orts.find(x=>String(x.id)===String(z.dataset.ortId)),s=S.locationData.sites.find(x=>String(x.id)===String(z.dataset.standortId));await api.createItemByName('NutzungsZwischenziele',{NutzungId:d.id,Sortierung:i+1,Ort:s?.fields?.Name||o?.fields?.Name||'',OrtId:z.dataset.ortId||'',StandortId:z.dataset.standortId||'',Testdaten:testFlag()})}}
    if(d.canPeople){const primary=document.getElementById('upePrimary')?.value||'';if(!primary)return alert('Hauptperson auswählen.');const used=new Set([String(primary)]),secondary=checkedIds('upesecondary').filter(id=>!used.has(String(id)));secondary.forEach(id=>used.add(String(id)));const guests=checkedIds('upeguest').filter(id=>!used.has(String(id))),oldP=(await fp105SafeList(api,'NutzungsPersonen')).filter(x=>String(x.fields.NutzungId)===String(d.id)&&!x.fields.TagesetappeId),oldA=(await fp105SafeList(api,'NutzungsTiere')).filter(x=>String(x.fields.NutzungId)===String(d.id));for(const x of oldP)await api.deleteItemByName('NutzungsPersonen',x.id);for(const x of oldA)await api.deleteItemByName('NutzungsTiere',x.id);await api.createItemByName('NutzungsPersonen',{NutzungId:d.id,TagesetappeId:'',PersonId:primary,Funktion:normalizeProfile(d.vehicle?.fields?.Profil)==='motorhome'?'Fahrer':'Skipper',Testdaten:testFlag()});for(const id of secondary)await api.createItemByName('NutzungsPersonen',{NutzungId:d.id,TagesetappeId:'',PersonId:id,Funktion:normalizeProfile(d.vehicle?.fields?.Profil)==='motorhome'?'Beifahrer':'Crew',Testdaten:testFlag()});for(const id of guests)await api.createItemByName('NutzungsPersonen',{NutzungId:d.id,TagesetappeId:'',PersonId:id,Funktion:'Gast',Testdaten:testFlag()});for(const id of checkedIds('upeanimal'))await api.createItemByName('NutzungsTiere',{NutzungId:d.id,TierId:id,Testdaten:testFlag()})}
    await api.updateItemByName('Nutzungen',d.id,fields);S.usageDetailId=d.id;S.view='usageDetail';render();
  }catch(e){alert('Planung konnte nicht gespeichert werden: '+e.message)}
};

/* Besatzungsänderung: ebenfalls keine gleichzeitige Doppelrolle. */
const fp1063CrewChangeBase=crewchange;
crewchange=async function(){await fp1063CrewChangeBase();const p=document.getElementById('ccPrim');if(p)p.onchange=fp1063RefreshCrewChangeExclusions;document.querySelectorAll('[data-ccsecondary],[data-ccguest]').forEach(x=>x.addEventListener('change',fp1063RefreshCrewChangeExclusions));fp1063RefreshCrewChangeExclusions()};
saveCrewChange102=async function(){
  const p=profileDef(),primary=document.getElementById('ccPrim')?.value||'';if(!primary)return alert(`Bitte ${p.functions[0]} auswählen.`);
  try{const api=await getCloud(),used=new Set([String(primary)]),secondary=checkedIds('ccsecondary').filter(id=>!used.has(String(id)));secondary.forEach(id=>used.add(String(id)));const guests=checkedIds('ccguest').filter(id=>!used.has(String(id))),all=await list(api,'NutzungsPersonen'),existing=all.filter(x=>String(x.fields.NutzungId)===String(S.usage.cloudId)&&String(x.fields.TagesetappeId)===String(S.day.id));for(const x of existing){try{await api.deleteItemByName('NutzungsPersonen',x.id)}catch{}}await api.createItemByName('NutzungsPersonen',{NutzungId:String(S.usage.cloudId),TagesetappeId:String(S.day.id),PersonId:primary,Funktion:p.functions[0],Testdaten:testFlag()});for(const id of secondary)await api.createItemByName('NutzungsPersonen',{NutzungId:String(S.usage.cloudId),TagesetappeId:String(S.day.id),PersonId:id,Funktion:p.functions[1],Testdaten:testFlag()});for(const id of guests)await api.createItemByName('NutzungsPersonen',{NutzungId:String(S.usage.cloudId),TagesetappeId:String(S.day.id),PersonId:id,Funktion:'Gast',Testdaten:testFlag()});back()}catch(e){alert(e.message)}
};

/* -------------------------------------------------------------------------- */
/* Sichtbare Version / M365: kein neues Schema gegenüber 1.0.6.2               */
/* -------------------------------------------------------------------------- */
main=function(){S.stack=[];head('MOBIMORY','Phase 1 · '+FP1063_VERSION);app.innerHTML=`<div class="home-brand">${typeof mobiIcon==='function'?mobiIcon():''}${typeof brandHeadline==='function'?brandHeadline():''}</div><div class="grid"><button class="menu" onclick="go('start')"><b>Start</b><span class="muted">Nutzung, Cockpit, Planung & Historie</span></button><button class="menu" onclick="go('configuration')"><b>Konfiguration</b><span class="muted">Fahrzeuge, Personen, Tiere, Orte, Reisegrundlagen</span></button><button class="menu" onclick="go('workshop')"><b>Werkstatt</b><span class="muted">Störungen, Wartung, Arbeiten und Aufgaben</span></button><button class="menu" onclick="go('lending')"><b>Verleihmodus</b><span class="muted">Gruppen, Qualifikationen und Rechte</span></button><button class="menu" onclick="go('settings')"><b>Einstellungen / Daten</b><span class="muted">M365, Testmodus, Export</span></button></div>`};
login=function(){bar.hidden=true;app.innerHTML=`<div class="login"><div class="card mobi-login">${typeof mobiIcon==='function'?mobiIcon():''}${typeof brandHeadline==='function'?brandHeadline():'<div class="brand">MOBIMORY</div>'}<p class="muted">Version ${FP1063_VERSION}</p><div class="field"><label>Nutzer</label><input value="Admin"></div><div class="field"><label>Passwort</label><input type="password" value="admin"></div><button class="primary" onclick="S.stack=[];S.view='main';render()">Anmelden</button></div></div>`};
m365setup=function(){head('Microsoft 365 Setup','1.0.6.3 · Schema unverändert seit 1.0.6.2');const tok=window.FPAuth.token(),authButton=tok?`<button onclick="FPAuth.logout();render()">Microsoft-Verbindung trennen</button>`:`<button class="primary" onclick="sessionStorage.setItem('fp_after_auth','m365setup');FPAuth.login()">Mit Microsoft 365 anmelden</button>`;app.innerHTML=`<div class="card"><b>Microsoft-Anmeldung</b><div id="authState">${tok?'✓ Microsoft-Token vorhanden':'Noch nicht mit Microsoft verbunden'}</div>${authButton}</div><div class="card"><div class="field"><label>SharePoint-Site-URL</label><input id="spSite" value="${esc(localStorage.getItem('fp_sp_site')||'')}" placeholder="https://…sharepoint.com/sites/Fahrzeugplattform"></div><button class="primary" ${tok?'':'disabled'} onclick="runM365Provision1062()">Phase-1-Struktur prüfen / anlegen</button><p class="muted">1.0.6.3 benötigt keine zusätzlichen SharePoint-Felder. Das additive Schema 1.0.6.2 bleibt gültig.</p></div><div id="m365Result"></div>`};

document.title=`Fahrzeugplattform ${FP1063_VERSION}`;const fp1063Foot=document.querySelector('footer');if(fp1063Foot)fp1063Foot.textContent=`Fahrzeugplattform · ${FP1063_VERSION} · © 2026 Entwicklungsstand`;try{render()}catch(e){console.warn(e)}
