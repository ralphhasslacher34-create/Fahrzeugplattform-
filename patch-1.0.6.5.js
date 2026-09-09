/* MOBIMORY / Fahrzeugplattform 1.0.6.5-dev
   Eng begrenzter Cockpit-Fix auf Basis 1.0.6.4:
   A) Ausfahrt: Cockpit exakt wieder auf den in 1.0.6.4 gesicherten 1.0.6.3-Cockpitstand.
   B) Wasserski: dediziertes 1.0.6.5-Cockpit in Praxisreihenfolge:
      Abfahrtskontrolle -> Tank/Tanken -> Motor Start/Stop + BH -> Ablegen -> Runs -> Anlegen.
      Run-Start nur wenn abgelegt UND mindestens ein Antriebsmotor läuft.
   Keine Schemaänderung, keine Änderung der Startmasken oder sonstiger Module.
*/

const FP1065_VERSION='1.0.6.5-dev';

function fp1065IsWaterski(){return typeof fp1064IsWaterski==='function'&&fp1064IsWaterski()}
function fp1065IsAusfahrt(){return typeof fp1064IsAusfahrt==='function'&&fp1064IsAusfahrt()}

function fp1065InstallStyle(){
  if(document.getElementById('fp1065-style'))return;
  const s=document.createElement('style');s.id='fp1065-style';s.textContent=`
    .fp1065-step{margin:.65rem 0}
    .fp1065-step button{width:100%;text-align:left;padding:.9rem 1rem}
    .fp1065-step button.primary{text-align:center;font-size:1.08rem;font-weight:800}
    .fp1065-step button:disabled{opacity:.48}
    .fp1065-motor-btn{width:100%;text-align:left;padding:.9rem 1rem}
    .fp1065-motor-btn b{font-size:1.05rem}
    .fp1065-state{margin-top:.35rem;font-size:.92rem}
    .fp1065-hint{margin:.35rem 0 0;font-size:.9rem;opacity:.78}
    .fp1065-ready{font-weight:800}
  `;document.head.appendChild(s)
}

async function fp1065MovementState(api,usageId=String(S.waterskiUsageId||S.usage?.cloudId||'')){
  const all=(await fp105SafeList(api,'Ereignisse')).filter(x=>String(x.fields.NutzungId)===String(usageId||'')&&x.fields.Rohdaten!==true&&['Ablegen','Anlegen / Ankern','Anlegen'].includes(String(x.fields.Art||'')));
  const dayId=String(S.day?.id||'');
  const rows=(dayId?all.filter(x=>String(x.fields.TagesetappeId||'')===dayId):all).sort((a,b)=>String(a.fields.Zeitpunkt||'').localeCompare(String(b.fields.Zeitpunkt||'')));
  const last=rows[rows.length-1]||null,underway=String(last?.fields?.Art||'')==='Ablegen';
  const dep=[...rows].reverse().find(x=>String(x.fields.Art||'')==='Ablegen');
  const arr=[...rows].reverse().find(x=>['Anlegen / Ankern','Anlegen'].includes(String(x.fields.Art||'')));
  return {underway,last,depTime:dep?.fields?.Zeitpunkt||null,arrTime:!underway?(arr?.fields?.Zeitpunkt||null):null};
}

function fp1065WaterskiMotorCard(data){
  FP1064.motorSnapshot=data;
  return `<div class="card"><div class="section first">Motor</div><div class="fp1064-motors">${data.engines.map(e=>{
    const s=data.state[e.id],c=fp1064MotorCalc(data,e.id),running=!!s?.running;
    return `<button class="fp1065-motor-btn ${running?'fp1063-motor-running':''}" onclick="fp1064ToggleMotor('${e.id}')"><b>${running?'Motor Stop':'Motor Start'} · ${esc(e.name)}</b><div class="fp1065-state">${running?'● Motor läuft':'○ Motor aus'} · BH <span id="fp1064Bh_${e.id}">${fp1064FmtH(c.theoretical)}</span> · Laufzeit <span id="fp1064Rt_${e.id}">${fp1064FmtRuntime(c.runtime)}</span></div><small>${running?'Drücken beendet Motorlauf und BH-Hochrechnung.':'Drücken startet Motorlauf und BH-Hochrechnung.'}</small></button>`
  }).join('')||'<p class="muted">Kein Antriebsmotor konfiguriert.</p>'}</div></div>`;
}

function fp1065DueCard(due){
  return `<div class="card"><div class="line"><div><b>Abfahrtskontrolle</b><div class="${due.length?'status-warn':'fp1064-status-ok'}">${due.length?due.length+' Hinweis(e)':'✓ OK'}</div></div><button onclick="fp104CockpitAction('Kontrolle','control')">Öffnen</button></div>${due.length?due.slice(0,5).map(x=>`<div class="due-line"><b>${esc(x.name)}</b><span>${esc(x.source)} · ${dueText(x.days)}</span></div>`).join(''):''}</div>`
}

async function fp1065WaterskiCockpit(){
  fp1064StopMotorTimer();fp1064InstallStyle();fp1065InstallStyle();
  head('Cockpit',`${S.vehicle.name} · ${S.usage.displayName||S.usage.name}`);
  app.innerHTML='<div class="card">Wasserski-Cockpit wird geladen …</div>';
  try{
    const api=await getCloud(),[due,mot,tank,movement]=await Promise.all([fp1064DueData(api),fp1064MotorData(api),fp1064TankState(api),fp1065MovementState(api)]),runningCount=mot.engines.filter(e=>mot.state[e.id]?.running).length,anyRunning=runningCount>0,ready=movement.underway&&anyRunning;

    const ablegeHint=!anyRunning?'Motor zuerst starten.':movement.underway?'Boot ist bereits abgelegt.':'';
    const runHint=!movement.underway?'Boot ist angelegt – zuerst Ablegen.':!anyRunning?'Motor läuft nicht – Run gesperrt.':'Bereit für Runs.';
    const anlegHint=movement.underway?'':'Boot ist bereits angelegt.';

    app.innerHTML=
      fp1065DueCard(due)+
      fp1064TankCard(tank)+
      fp1065WaterskiMotorCard(mot)+
      `<div class="card fp1065-step"><button class="primary" ${(!anyRunning||movement.underway)?'disabled':''} onclick="fp1064Movement('Ablegen')">Ablegen${movement.depTime?' · '+fp104Time(movement.depTime):''}</button>${ablegeHint?`<div class="fp1065-hint">${esc(ablegeHint)}</div>`:''}</div>`+
      `<div class="card fp1065-step"><button class="primary" ${ready?'':'disabled'} onclick="S.waterskiUsageId=String(S.usage.cloudId);go('waterski')">Runs</button><div class="fp1065-hint ${ready?'fp1065-ready':''}">${esc(runHint)}</div></div>`+
      `<div class="card fp1065-step"><button ${movement.underway?'':'disabled'} onclick="fp1064Movement('Anlegen','stay')">Anlegen${movement.arrTime?' · '+fp104Time(movement.arrTime):''}</button>${anlegHint?`<div class="fp1065-hint">${esc(anlegHint)}</div>`:''}</div>`+
      `<div class="fp1064-cockpit-actions"><button onclick="fp104CockpitAction('Foto / Film','media')">Foto / Film</button><button onclick="fp104CockpitAction('Wetter','weather')">Wetter</button><button onclick="fp104CockpitAction('Ereignis','event')">Ereignis</button></div>`;
    fp1064StartMotorTimer();
  }catch(e){failBox(e,'start')}
}

/*
   Wichtig: fp1064CockpitBase wurde beim Laden von 1.0.6.4 VOR dessen Cockpit-Umbau
   auf den vollständigen 1.0.6.3-Cockpitstand gesetzt. Genau diesen Stand nutzen wir
   für Ausfahrt wieder, ohne ihn nachzubauen oder zu verändern.
*/
const fp1065CockpitFallback=cockpit;
cockpit=async function(){
  if(S.vehicle?.profile==='motorboat'&&S.usage?.cloudId&&fp1065IsAusfahrt()){
    fp1064StopMotorTimer();
    return fp1064CockpitBase();
  }
  if(S.vehicle?.profile==='motorboat'&&S.usage?.cloudId&&fp1065IsWaterski())return fp1065WaterskiCockpit();
  return fp1065CockpitFallback();
};

/* -------------------------------------------------------------------------- */
/* Wasserski-Runs zusätzlich serverseitig/aktionsseitig absichern              */
/* -------------------------------------------------------------------------- */
async function fp1065RunReadiness(){
  const api=await getCloud(),usageId=String(S.waterskiUsageId||S.usage?.cloudId||''),[movement,mot]=await Promise.all([fp1065MovementState(api,usageId),fp1062MotorState(api,{usageId,vehicleId:S.vehicle?.id})]),anyRunning=mot.engines.some(e=>mot.state[e.id]?.running);
  return {api,movement,mot,anyRunning,ready:movement.underway&&anyRunning}
}

const fp1065StartWaterskiRunBase=startWaterskiRun;
startWaterskiRun=async function(){
  try{
    const r=await fp1065RunReadiness();
    if(!r.movement.underway)return alert('Run kann nicht gestartet werden: Das Boot ist angelegt. Bitte zuerst Ablegen.');
    if(!r.anyRunning)return alert('Run kann nicht gestartet werden: Der Motor läuft nicht.');
  }catch(e){return alert('Run-Status konnte nicht geprüft werden: '+e.message)}
  return fp1065StartWaterskiRunBase();
};

const fp1065WaterskiBase=waterski;
waterski=async function(){
  await fp1065WaterskiBase();
  try{
    const active=FP1064.wsRuns?.find(x=>x.fields.Status==='Aktiv');
    if(active)return;
    const r=await fp1065RunReadiness(),btn=[...app.querySelectorAll('button')].find(b=>(b.textContent||'').trim()==='Run starten');
    if(!btn)return;
    btn.disabled=!r.ready;
    const hint=document.createElement('div');hint.className='fp1065-hint';hint.textContent=r.ready?'Boot abgelegt · Motor läuft · Run bereit':!r.movement.underway?'Boot ist angelegt – zuerst Ablegen.':'Motor läuft nicht – Run gesperrt.';btn.insertAdjacentElement('afterend',hint);
  }catch(e){console.warn('Wasserski-Run-Freigabe 1.0.6.5',e)}
};

/* Nur sichtbare Versionsanzeige aktualisieren; Funktionen bleiben 1.0.6.4/6.5. */
main=function(){S.stack=[];head('MOBIMORY','Phase 1 · '+FP1065_VERSION);app.innerHTML=`<div class="home-brand">${typeof mobiIcon==='function'?mobiIcon():''}${typeof brandHeadline==='function'?brandHeadline():''}</div><div class="grid"><button class="menu" onclick="go('start')"><b>Start</b><span class="muted">Nutzung, Cockpit, Planung & Historie</span></button><button class="menu" onclick="go('configuration')"><b>Konfiguration</b><span class="muted">Fahrzeuge, Personen, Tiere, Orte, Reisegrundlagen</span></button><button class="menu" onclick="go('workshop')"><b>Werkstatt</b><span class="muted">Störungen, Wartung, Arbeiten und Aufgaben</span></button><button class="menu" onclick="go('lending')"><b>Verleihmodus</b><span class="muted">Gruppen, Qualifikationen und Rechte</span></button><button class="menu" onclick="go('settings')"><b>Einstellungen / Daten</b><span class="muted">M365, Testmodus, Export</span></button></div>`};
