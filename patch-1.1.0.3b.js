/* MOBIMORY 1.1.0.3-dev – Workflow / TODO-Build
   Verbindlicher Umfang aus dem Chat:
   1  Personen bleibt unverändert.
   2  Reisecheck raus aus Konfiguration.
   3  Reisecheck als eigene Kachel auf der Startseite.
   4  Microsoft 365 einrichten raus aus Konfiguration -> Einstellungen / Daten.
   5  Konfiguration sonst nicht umbauen.
   6  Nur geplante, nie gestartete Nutzungen: endgültig löschen oder archivieren.
   7  Planungsarchiv: Inhalte erhalten, geplante Start-/Enddaten entfernen, später reaktivieren.
   8  Geplante Überlassungen im Reisecheck auswählbar.
   9  Von Überlassung: neue Reise Schritt für Schritt ODER geplante Nutzung auswählen.
   10 Erste Eignungsprüfung bereits bei Überlassung.
   11 Straße: gültige Fahrerlaubnis als Grundprüfung.
   12 Wasser: Fahrzeug + Komponenten/Ausrüstung + Revier.
   13 Motorboot: Binnen ODER See = grundsätzliche Skipper-Befähigung.
   14 Funkanlage: Funkbefähigung nötig; kann je nach Fall durch Crew erfüllt werden.
   15 Revierprüfung erst im Reisecheck.
   16 Gesamtworkflow Überlassung -> Reisecheck -> konkrete Einsatzprüfung.

   Technischer Grundsatz:
   - kein Umbau der bestehenden Personen-, Fahrzeug- oder Komponenten-Stammdaten
   - kein neues SharePoint-Schema erforderlich
   - 1.1.0.3b: Fahrfunktion wird direkt aus der Personengruppe gelesen; 'Skipper festgelegt' ist keine Eignungsfreigabe
   - Archive-Markierung nutzt ausschließlich ein Title-Präfix;
     geplante Datumsfelder werden geleert
*/
const FP1103_VERSION='1.1.0.3b-dev';
const FP1103={
  archivePrefix:'[PLANUNGSARCHIV] ',
  lending:null,
  lendingRows:[],
  persons:[],
  vehicles:[],
  quals:[],
  components:[],
  selectedLendingId:'',
  selectedUsageId:'',
  selectedCrew:new Set(),
  travelMode:'',
  revier:'',
  timer:null
};

(function fp1103Style(){
  if(document.getElementById('fp1103-style'))return;
  const s=document.createElement('style');s.id='fp1103-style';s.textContent=`
    .fp1103-card{border:1px solid rgba(120,120,120,.23);border-radius:14px;padding:14px;margin:12px 0}
    .fp1103-row{display:flex;gap:8px;flex-wrap:wrap;align-items:end}
    .fp1103-row>.field{flex:1 1 210px;margin:0}
    .fp1103-list{display:grid;gap:8px;margin-top:10px}
    .fp1103-item{border:1px solid rgba(120,120,120,.22);border-radius:11px;padding:10px}
    .fp1103-item-head{display:flex;gap:8px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}
    .fp1103-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
    .fp1103-status{border-left:4px solid currentColor;border-radius:9px;padding:8px 10px;margin:7px 0}
    .fp1103-ok{background:rgba(30,150,80,.08)}
    .fp1103-warn{background:rgba(230,160,20,.09)}
    .fp1103-stop{background:rgba(200,40,40,.08)}
    .fp1103-neutral{background:rgba(80,110,160,.07)}
    .fp1103-crew{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:6px;margin-top:7px}
    .fp1103-crew label{display:flex;gap:7px;align-items:center;border:1px solid rgba(120,120,120,.18);border-radius:8px;padding:7px}
    .fp1103-mini{font-size:.82rem;opacity:.75}
    .fp1103-sep{border-top:1px solid rgba(120,120,120,.18);margin:10px 0}
    @media(max-width:700px){.fp1103-row{display:grid;grid-template-columns:1fr}.fp1103-actions button{flex:1 1 auto}}
  `;document.head.appendChild(s);
})();

function fp1103Esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fp1103S(v){return String(v??'').trim()}
function fp1103Id(v){return fp1103S(v)}
function fp1103Fields(x){return x?.fields||{}}
function fp1103Name(x){
  const f=fp1103Fields(x);
  return fp1103S(f.Fahrzeugname||f.Name||f.Vorname&&`${f.Vorname} ${f.Nachname||''}`||f.Bezeichnung||f.Nutzungsname||f.Title||x?.name||'');
}
function fp1103TitleWithoutArchive(v){return fp1103S(v).replace(/^\[PLANUNGSARCHIV\]\s*/i,'')}
function fp1103Bool(v){return v===true||String(v).toLowerCase()==='true'}
function fp1103Date(v){if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d}
function fp1103FmtDate(v){const d=fp1103Date(v);return d?d.toLocaleDateString('de-DE'):'–'}
function fp1103AllFieldText(x){
  const f=fp1103Fields(x);
  try{return Object.entries(f).map(([k,v])=>`${k}: ${typeof v==='string'?v:JSON.stringify(v)}`).join(' | ')}catch{return JSON.stringify(f||{})}
}
function fp1103FieldByKey(f,re){
  for(const [k,v] of Object.entries(f||{}))if(re.test(k)&&v!=null&&String(v)!=='')return v;
  return '';
}
function fp1103FindRef(f,kind){
  const rx=kind==='vehicle'?/(Fahrzeug|Vehicle).*(Id|ID)$/i:
           kind==='person'?/(Skipper|Fahrer|Person|Entleiher|Nutzer).*(Id|ID)$/i:
           kind==='usage'?/(Nutzung|Reise|Fahrt).*(Id|ID)$/i:null;
  if(rx){for(const [k,v] of Object.entries(f||{}))if(rx.test(k)&&v!=null&&String(v)!=='')return String(v)}
  return '';
}
function fp1103StatusText(f){return fp1103S(f?.Status||f?.Zustand||f?.State||'')}
function fp1103IsFinishedStatus(s){return /(beendet|abgeschlossen|erledigt|storniert|gelöscht|geloescht|closed|done)/i.test(String(s||''))}
function fp1103IsArchivedUsage(u){
  const f=fp1103Fields(u);
  return fp1103S(f.Title).startsWith(FP1103.archivePrefix)||/planungsarchiv/i.test(fp1103StatusText(f));
}
function fp1103LooksPlanned(u){
  const f=fp1103Fields(u),status=fp1103StatusText(f);
  if(fp1103IsArchivedUsage(u))return false;
  if(f.Beginn||f.Ende)return false;
  if(fp1103IsFinishedStatus(status))return false;
  return !!(f.GeplanterBeginn||f.GeplantesEnde||f.GeplantesEnddatum||f.PlanStart||/plan/i.test(status));
}
function fp1103UsageLabel(u){
  const f=fp1103Fields(u);
  const name=fp1103TitleWithoutArchive(f.Nutzungsname||f.Title||'Geplante Nutzung');
  const d=f.GeplanterBeginn?` · ${fp1103FmtDate(f.GeplanterBeginn)}`:'';
  return `${name}${d}`;
}
async function fp1103Rows(api,name){try{return await fp105SafeList(api,name)}catch{return[]}}
async function fp1103FirstRows(api,names){
  let first={name:names[0],rows:[]};
  for(const name of names){
    const rows=await fp1103Rows(api,name);
    if(rows.length)return {name,rows};
    if(!first.rows.length)first={name,rows};
  }
  return first;
}
async function fp1103LoadCore(){
  const api=await getCloud();
  const [persons,vehicles,components,ql1,ql2,ql3,ql4]=await Promise.all([
    fp1103Rows(api,'Personen'),
    fp1103Rows(api,'Fahrzeuge'),
    fp1103Rows(api,'Komponenten1100'),
    fp1103Rows(api,'Qualifikationen'),
    fp1103Rows(api,'PersonenQualifikationen'),
    fp1103Rows(api,'Befähigungen'),
    fp1103Rows(api,'Befaehigungen')
  ]);
  FP1103.persons=persons;FP1103.vehicles=vehicles;FP1103.components=components;
  FP1103.quals=[...ql1,...ql2,...ql3,...ql4];
  return api;
}

/* ------------------------------------------------------------------ */
/* 1-5 Startseite / Konfiguration / Einstellungen                     */
/* ------------------------------------------------------------------ */
function fp1103EnsureMainTravelTile(){
  if(String(S?.view||'')!=='main')return;
  const grid=app.querySelector('.grid');if(!grid)return;
  const exists=[...grid.querySelectorAll('button,a')].some(x=>/Reisecheck/i.test(x.textContent||''));
  if(exists)return;
  const b=document.createElement('button');b.className='menu';b.setAttribute('onclick',"go('travelcheck')");
  b.innerHTML='<b>Reisecheck</b><span class="muted">Geplante Reise oder Überlassung prüfen</span>';
  const startBtn=[...grid.children].find(x=>/\bStart\b/i.test(x.textContent||''));
  if(startBtn)startBtn.insertAdjacentElement('afterend',b);else grid.prepend(b);
}
function fp1103RemoveConfigurationOutsiders(){
  if(String(S?.view||'')!=='configuration')return;
  [...app.querySelectorAll('button,a,.menu')].forEach(x=>{
    const t=fp1103S(x.textContent),oc=fp1103S(x.getAttribute?.('onclick'));
    if(/Reisecheck/i.test(t)||/travelcheck/i.test(oc)||/Microsoft\s*365|M365|365\s*einrichten/i.test(t)||/m365setup/i.test(oc))x.remove();
  });
}
function fp1103EnsureM365InSettings(){
  if(String(S?.view||'')!=='settings')return;
  const exists=[...app.querySelectorAll('button,a')].some(x=>/Microsoft\s*365|M365|365\s*einrichten/i.test(x.textContent||'')||/m365setup/i.test(x.getAttribute?.('onclick')||''));
  if(exists)return;
  const card=document.createElement('div');card.className='card fp1103-card';card.id='fp1103-m365-settings';
  card.innerHTML='<div class="section first">Microsoft 365</div><p class="muted">System- und Datenanbindung.</p><button type="button" onclick="go(\'m365setup\')">Microsoft 365 einrichten</button>';
  app.appendChild(card);
}
if(typeof main==='function'){
  const fp1103MainBase=main;
  main=function(){const r=fp1103MainBase.apply(this,arguments);fp1103EnsureMainTravelTile();return r};
}
if(typeof configuration==='function'){
  const fp1103ConfigBase=configuration;
  configuration=async function(){const r=await fp1103ConfigBase.apply(this,arguments);fp1103RemoveConfigurationOutsiders();return r};
}
if(typeof settings==='function'){
  const fp1103SettingsBase=settings;
  settings=async function(){const r=await fp1103SettingsBase.apply(this,arguments);fp1103EnsureM365InSettings();return r};
}

/* ------------------------------------------------------------------ */
/* 6-7 Geplante Nutzungen: Löschen / Planungsarchiv                   */
/* ------------------------------------------------------------------ */
async function fp1103UsageHasStarted(u){
  const f=fp1103Fields(u),id=fp1103Id(u?.id);
  if(f.Beginn||f.Ende)return true;
  if(/(aktiv|laufend|unterwegs|beendet|abgeschlossen)/i.test(fp1103StatusText(f))&&!/plan/i.test(fp1103StatusText(f)))return true;
  try{
    const api=await getCloud();
    const [events,gps]=await Promise.all([fp1103Rows(api,'Ereignisse'),fp1103Rows(api,'GPSPunkte')]);
    if(events.some(x=>fp1103Id(fp1103Fields(x).NutzungId)===id&&fp1103Fields(x).Rohdaten!==true))return true;
    if(gps.some(x=>fp1103Id(fp1103Fields(x).NutzungId)===id))return true;
  }catch{}
  return false;
}
async function fp1103TryClearUsageDate(api,id,field){
  try{await api.updateItemByName('Nutzungen',id,{[field]:null})}catch{}
}
async function fp1103ArchiveUsage(id){
  try{
    const api=await getCloud(),u=await api.getItemByName('Nutzungen',id);
    if(await fp1103UsageHasStarted(u))return alert('Diese Nutzung wurde bereits gestartet. Dafür bleibt die vorhandene Beenden-Funktion zuständig.');
    if(!confirm('Diese Planung ins Planungsarchiv verschieben?\n\nAlle Inhalte bleiben erhalten. Geplanter Start und geplantes Ende werden entfernt, damit keine Datumssperre bestehen bleibt.'))return;
    const f=fp1103Fields(u),title=fp1103TitleWithoutArchive(f.Title||f.Nutzungsname||'Planung');
    await api.updateItemByName('Nutzungen',id,{Title:FP1103.archivePrefix+title,GeplanterBeginn:null});
    for(const field of ['GeplantesEnde','GeplantesEnddatum','GeplanterEndtermin','PlanEnde','PlanEnd'])await fp1103TryClearUsageDate(api,id,field);
    if(typeof FP1068==='object')FP1068.routeCache={};
    await fp1103RefreshStart();
  }catch(e){alert('Planung konnte nicht archiviert werden: '+e.message)}
}
async function fp1103DeleteUsage(id){
  try{
    const api=await getCloud(),u=await api.getItemByName('Nutzungen',id);
    if(await fp1103UsageHasStarted(u))return alert('Diese Nutzung wurde bereits gestartet und kann hier nicht endgültig gelöscht werden.');
    if(!confirm('Planung wirklich ENDGÜLTIG löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden.'))return;
    const segs=(await fp1103Rows(api,'NutzungsRoutenabschnitte')).filter(x=>fp1103Id(fp1103Fields(x).NutzungId)===fp1103Id(id));
    for(const s of segs){try{await api.deleteItemByName('NutzungsRoutenabschnitte',s.id)}catch{}}
    await api.deleteItemByName('Nutzungen',id);
    if(typeof FP1068==='object')FP1068.routeCache={};
    await fp1103RefreshStart();
  }catch(e){alert('Planung konnte nicht gelöscht werden: '+e.message)}
}
async function fp1103RestoreUsage(id){
  try{
    const api=await getCloud(),u=await api.getItemByName('Nutzungen',id),f=fp1103Fields(u);
    const title=fp1103TitleWithoutArchive(f.Title||f.Nutzungsname||'Planung');
    await api.updateItemByName('Nutzungen',id,{Title:title,GeplanterBeginn:null});
    for(const field of ['GeplantesEnde','GeplantesEnddatum','GeplanterEndtermin','PlanEnde','PlanEnd'])await fp1103TryClearUsageDate(api,id,field);
    alert('Planung wurde aus dem Archiv geholt. Bitte neue Start- und Enddaten vergeben.');
    await fp1103RefreshStart();
  }catch(e){alert('Planung konnte nicht wiederhergestellt werden: '+e.message)}
}
async function fp1103RefreshStart(){
  if(String(S?.view||'')==='start'&&typeof start==='function')return start();
  if(typeof render==='function')return render();
}
async function fp1103AppendPlanManager(){
  if(String(S?.view||'')!=='start')return;
  document.getElementById('fp1103-plan-manager')?.remove();
  try{
    const api=await getCloud(),all=await fp1103Rows(api,'Nutzungen');
    const planned=all.filter(fp1103LooksPlanned);
    const archived=all.filter(fp1103IsArchivedUsage);
    const card=document.createElement('div');card.className='card fp1103-card';card.id='fp1103-plan-manager';
    card.innerHTML=`<div class="section first">Planungen verwalten</div>
      <p class="muted">Nur noch nie gestartete Planungen können gelöscht oder archiviert werden.</p>
      <details ${planned.length?'open':''}><summary><b>Geplante Nutzungen (${planned.length})</b></summary>
        <div class="fp1103-list">${planned.length?planned.map(u=>`<div class="fp1103-item"><div class="fp1103-item-head"><div><b>${fp1103Esc(fp1103UsageLabel(u))}</b><div class="fp1103-mini">${fp1103Esc(fp1103Fields(u).Fahrzeugname||'')}</div></div></div><div class="fp1103-actions"><button onclick="fp1103ArchiveUsage('${fp1103Esc(u.id)}')">Ins Planungsarchiv</button><button class="danger-lite" onclick="fp1103DeleteUsage('${fp1103Esc(u.id)}')">Endgültig löschen</button></div></div>`).join(''):'<div class="muted">Keine nur geplanten Nutzungen.</div>'}</div>
      </details>
      <details><summary><b>Planungsarchiv (${archived.length})</b></summary>
        <p class="muted">Archivierte Planungen besitzen keine geplanten Start-/Enddaten und blockieren deshalb keinen Zeitraum.</p>
        <div class="fp1103-list">${archived.length?archived.map(u=>`<div class="fp1103-item"><b>${fp1103Esc(fp1103TitleWithoutArchive(fp1103Fields(u).Title||'Planung'))}</b><div class="fp1103-actions"><button onclick="fp1103RestoreUsage('${fp1103Esc(u.id)}')">Wieder hervorholen</button><button class="danger-lite" onclick="fp1103DeleteUsage('${fp1103Esc(u.id)}')">Endgültig löschen</button></div></div>`).join(''):'<div class="muted">Planungsarchiv ist leer.</div>'}</div>
      </details>`;
    app.appendChild(card);
  }catch(e){console.warn('Planungsverwaltung 1.1.0.3',e)}
}
if(typeof start==='function'){
  const fp1103StartBase=start;
  start=async function(){const r=await fp1103StartBase.apply(this,arguments);await fp1103AppendPlanManager();return r};
}

/* ------------------------------------------------------------------ */
/* Qualifikations- / Eignungslogik                                    */
/* ------------------------------------------------------------------ */
function fp1103Profile(vehicle){
  return fp1103S(fp1103Fields(vehicle).Profil||fp1103Fields(vehicle).Fahrzeugart||'').toLowerCase();
}
function fp1103IsBoat(vehicle){return /(motorboat|sailboat|boot|segel|yacht)/i.test(fp1103Profile(vehicle)+' '+fp1103AllFieldText(vehicle))}
function fp1103IsRoad(vehicle){return /(motorhome|wohnmobil|car|pkw|road|motorrad|motorcycle|lkw|truck)/i.test(fp1103Profile(vehicle)+' '+fp1103AllFieldText(vehicle))}
function fp1103PersonById(id){return FP1103.persons.find(x=>fp1103Id(x.id)===fp1103Id(id))||null}
function fp1103VehicleById(id){return FP1103.vehicles.find(x=>fp1103Id(x.id)===fp1103Id(id))||null}
function fp1103RelevantQualRows(person){
  if(!person)return[];
  const pid=fp1103Id(person.id),pname=fp1103Name(person).toLowerCase();
  return FP1103.quals.filter(x=>{
    const f=fp1103Fields(x),txt=fp1103AllFieldText(x).toLowerCase();
    return Object.entries(f).some(([k,v])=>/(Person|Fahrer|Skipper).*(Id|ID)$/i.test(k)&&fp1103Id(v)===pid)||(pname&&txt.includes(pname));
  });
}
function fp1103Expiry(row){
  const f=fp1103Fields(row);
  return fp1103FieldByKey(f,/(GültigBis|GueltigBis|Ablauf|Expiry|ValidUntil|Ende)$/i);
}
function fp1103QualData(person){
  if(!person)return {text:'',validText:'',rows:[]};
  const rows=fp1103RelevantQualRows(person),now=Date.now();
  let valid=[fp1103AllFieldText(person)];
  for(const r of rows){
    const exp=fp1103Date(fp1103Expiry(r));
    if(!exp||exp.getTime()>=now)valid.push(fp1103AllFieldText(r));
  }
  return {text:[fp1103AllFieldText(person),...rows.map(fp1103AllFieldText)].join(' | '),validText:valid.join(' | '),rows};
}
function fp1103HasRoadLicence(q){return /(führerschein|fuehrerschein|fahrerlaubnis|klasse\s*[a-z0-9]|driving\s*licen)/i.test(q.validText)}
function fp1103HasBoatBase(q){return /(sportbootführerschein|sportbootfuehrerschein|\bsbf\b|bootführerschein|bootfuehrerschein|motorboot.*(schein|lizenz|patent)|schiffsführer|schiffsfuehrer|skipper.*(schein|lizenz)|boots?patent)/i.test(q.validText)}
function fp1103HasBinnen(q){return /(sbf\s*binnen|sportboot.*binnen|binnen.*(schein|patent|führerschein|fuehrerschein))/i.test(q.validText)}
function fp1103HasSee(q){return /(sbf\s*see|sportboot.*see|küsten.*(schein|patent)|kuesten.*(schein|patent)|seeschiff|see.*(führerschein|fuehrerschein|patent))/i.test(q.validText)}
function fp1103HasRadio(q){return /(\bsrc\b|\blrc\b|\bubi\b|funkzeugnis|sprechfunk|seefunk|binnenfunk|funkberechtigung)/i.test(q.validText)}
function fp1103VehicleComponents(vehicleId){
  return FP1103.components.filter(x=>fp1103Id(fp1103Fields(x).FahrzeugId)===fp1103Id(vehicleId)&&fp1103Fields(x).Aktiv!==false);
}
function fp1103HasRadioEquipment(vehicleId){
  return fp1103VehicleComponents(vehicleId).some(x=>/(funkanlage|funkgerät|funkgeraet|seefunk|binnenfunk|\bvhf\b|\bukw\b|radioanlage)/i.test(fp1103AllFieldText(x)));
}
function fp1103RevierClass(revier){
  const s=fp1103S(revier).toLowerCase();
  if(!s)return'unknown';
  if(/adria|kroat|mittelmeer|nordsee|ostsee|atlantik|küste|kueste|meer|seegebiet|offshore/.test(s))return'sea';
  if(/binnen|rhein|mosel|donau|kanal|fluss|wasserstraße|wasserstrasse/.test(s))return'inland';
  return'unknown';
}
function fp1103Status(kind,title,text){
  const cls=kind==='ok'?'fp1103-ok':kind==='stop'?'fp1103-stop':kind==='warn'?'fp1103-warn':'fp1103-neutral';
  return `<div class="fp1103-status ${cls}"><b>${fp1103Esc(title)}</b><div>${fp1103Esc(text)}</div></div>`;
}
function fp1103Evaluate(person,vehicle,crewIds=[],revier='',finalCheck=false){
  const out=[],q=fp1103QualData(person),vehicleId=fp1103Id(vehicle?.id),boat=fp1103IsBoat(vehicle),road=fp1103IsRoad(vehicle);
  if(!person||!vehicle)return {ok:false,html:fp1103Status('warn','Prüfung unvollständig','Fahrzeug und Fahrer / Skipper auswählen.')};

  if(road){
    const ok=fp1103HasRoadLicence(q);
    out.push(fp1103Status(ok?'ok':'stop','Grundbefähigung Straße',ok?'Gültige Fahrerlaubnis ist in den hinterlegten Nachweisen erkennbar.':'Keine gültige Fahrerlaubnis in den hinterlegten Nachweisen erkannt.'));
    return {ok,html:out.join('')};
  }

  if(boat){
    const base=fp1103HasBoatBase(q)||fp1103HasBinnen(q)||fp1103HasSee(q);
    out.push(fp1103Status(base?'ok':'stop','Grundbefähigung Motorboot',base?'Motorboot-Befähigung ist grundsätzlich vorhanden. Binnen oder See reicht für diese erste Stufe.':'Keine grundsätzliche Motorboot-Befähigung erkannt.'));

    const radioNeeded=fp1103HasRadioEquipment(vehicleId);
    if(radioNeeded){
      const skipperRadio=fp1103HasRadio(q);
      const crew=crewIds.map(fp1103PersonById).filter(Boolean);
      const crewRadio=crew.find(p=>fp1103HasRadio(fp1103QualData(p)));
      if(skipperRadio)out.push(fp1103Status('ok','Funkanlage / Funkbefähigung','Funkbefähigung beim Skipper erkannt.'));
      else if(crewRadio)out.push(fp1103Status('ok','Funkanlage / Funkbefähigung',`Funkbefähigung durch Crewmitglied ${fp1103Name(crewRadio)} erfüllt.`));
      else out.push(fp1103Status(finalCheck?'stop':'warn','Funkanlage / Funkbefähigung',finalCheck?'Funkanlage erkannt, aber weder beim Skipper noch bei der ausgewählten Crew eine Funkbefähigung gefunden.':'Funkanlage erkannt. Beim Skipper ist keine Funkbefähigung erkennbar; sie kann im Reisecheck gegebenenfalls durch ein Crewmitglied erfüllt werden.'));
    }else out.push(fp1103Status('ok','Ausrüstung','Keine Funkanlage als zusätzliche Befähigungsanforderung erkannt.'));

    if(!finalCheck){
      out.push(fp1103Status('neutral','Revier','Die Reviertauglichkeit wird bewusst erst im Reisecheck bewertet.'));
      return {ok:base,html:out.join('')};
    }

    const rc=fp1103RevierClass(revier);
    if(rc==='sea'){
      const ok=fp1103HasSee(q);
      out.push(fp1103Status(ok?'ok':'stop','Revierprüfung',ok?`See-/Küstenbefähigung für „${revier}“ erkannt.`:`Das Revier „${revier}“ ist See/Küste zugeordnet. Eine reine Binnen-Befähigung reicht dafür nicht.`));
    }else if(rc==='inland'){
      const ok=fp1103HasBinnen(q);
      out.push(fp1103Status(ok?'ok':'stop','Revierprüfung',ok?`Binnen-Befähigung für „${revier}“ erkannt.`:`Das Revier „${revier}“ ist Binnen zugeordnet; eine passende Binnen-Befähigung wurde nicht erkannt.`));
    }else{
      out.push(fp1103Status('warn','Revierprüfung',revier?`„${revier}“ konnte nicht eindeutig Binnen oder See/Küste zugeordnet werden. Manuelle Prüfung erforderlich.`:'Revier noch nicht angegeben. Eine endgültige Einsatzprüfung ist deshalb noch nicht möglich.'));
    }
    const stopped=out.join('').includes('fp1103-stop');
    return {ok:base&&!stopped,html:out.join('')};
  }

  out.push(fp1103Status('warn','Fahrzeugart','Für diese Fahrzeugart ist noch keine automatische Befähigungsregel definiert.'));
  return {ok:false,html:out.join('')};
}

/* ------------------------------------------------------------------ */
/* 10-14 Erste Prüfung direkt bei Überlassung                         */
/* ------------------------------------------------------------------ */
function fp1103SelectText(el){return fp1103S(el?.selectedOptions?.[0]?.textContent||el?.value||'')}
function fp1103EntityForSelect(el,rows){
  if(!el)return null;
  const val=fp1103Id(el.value),txt=fp1103SelectText(el).toLowerCase();
  return rows.find(x=>fp1103Id(x.id)===val)||
         rows.find(x=>fp1103Name(x)&&fp1103Name(x).toLowerCase()===txt)||
         rows.find(x=>fp1103Name(x)&&txt.includes(fp1103Name(x).toLowerCase()))||null;
}
function fp1103VehicleSelect(){
  const selects=[...app.querySelectorAll('select')],names=FP1103.vehicles.map(fp1103Name).filter(Boolean).map(x=>x.toLowerCase());
  let best=null,bestScore=-1;
  for(const el of selects){
    const opts=[...el.options].map(o=>fp1103S(o.textContent).toLowerCase());
    let score=0;
    for(const v of FP1103.vehicles)if([...el.options].some(o=>fp1103Id(o.value)===fp1103Id(v.id)))score+=4;
    for(const n of names)if(opts.some(o=>o===n||o.includes(n)))score+=2;
    if(/fahrzeug/i.test(el.closest('.field,div')?.textContent||''))score+=1;
    if(score>bestScore&&fp1103EntityForSelect(el,FP1103.vehicles)){best=el;bestScore=score}
  }
  return best;
}
function fp1103FunctionSelect(el){
  const texts=[...el.options].map(o=>fp1103S(o.textContent).toLowerCase());
  return texts.some(x=>x==='skipper'||x==='fahrer'||x.includes('skipper')||x.includes('fahrer'));
}
function fp1103SelectedFunction(el){
  const t=fp1103SelectText(el).toLowerCase();
  if(t.includes('skipper'))return'Skipper';
  if(t.includes('fahrer'))return'Fahrer';
  return'';
}
function fp1103PersonNearSelect(el){
  let node=el;
  for(let depth=0;node&&depth<7;depth++,node=node.parentElement){
    const txt=fp1103S(node.textContent).toLowerCase();
    const hits=FP1103.persons.filter(p=>{
      const n=fp1103Name(p).toLowerCase();
      return n&&txt.includes(n);
    });
    if(hits.length===1)return hits[0];
  }
  return null;
}
function fp1103DrivingAssignments(){
  const out=[];
  for(const el of app.querySelectorAll('select')){
    if(!fp1103FunctionSelect(el))continue;
    const func=fp1103SelectedFunction(el);if(!func)continue;
    const person=fp1103PersonNearSelect(el);if(!person)continue;
    out.push({el,func,person});
  }
  return out;
}
function fp1103UpdateExistingPermission(assignments,results){
  const candidates=[...app.querySelectorAll('b,strong,div,span,p')].filter(el=>{
    const t=fp1103S(el.textContent);
    if(!/^(?:🟢|🔴|🟡|\s)*\s*(Skipper|Fahrer)\s+festgelegt$/i.test(t))return false;
    return ![...el.children].some(c=>/Skipper|Fahrer/i.test(c.textContent||''));
  });
  if(!candidates.length)return;
  const failed=results.some(x=>!x.result.ok),functions=[...new Set(assignments.map(x=>x.func))].join(' / ')||'Fahrfunktion';
  for(const el of candidates){
    el.textContent=(failed?'🔴 ':'🟢 ')+functions+' ausgewählt · Grundbefähigung '+(failed?'nicht erfüllt':'erfüllt');
  }
}
async function fp1103RefreshLendingInline(){
  if(String(S?.view||'')!=='lending')return;
  const host=document.getElementById('fp1103-lending-check');if(!host)return;
  try{
    await fp1103LoadCore();
    const vehicleEl=fp1103VehicleSelect(),vehicle=fp1103EntityForSelect(vehicleEl,FP1103.vehicles);
    const assignments=fp1103DrivingAssignments();

    if(!vehicle){
      host.innerHTML='<div class="fp1103-status fp1103-warn"><b>Fahrzeug nicht erkannt.</b><div>Bitte zuerst das Fahrzeug der Überlassung auswählen.</div></div>';
      return;
    }
    if(!assignments.length){
      host.innerHTML='<div class="fp1103-status fp1103-warn"><b>Noch kein Fahrer / Skipper festgelegt.</b><div>Die Grundprüfung startet, sobald in der Personengruppe eine Fahrfunktion ausgewählt ist.</div></div>';
      return;
    }

    const results=assignments.map(a=>({assignment:a,result:fp1103Evaluate(a.person,vehicle,[],'',false)}));
    host.innerHTML=results.map(({assignment:a,result:r})=>
      `<div class="fp1103-item"><b>${fp1103Esc(a.person?fp1103Name(a.person):'Person')} · ${fp1103Esc(a.func)}</b>${r.html}</div>`
    ).join('');
    fp1103UpdateExistingPermission(assignments,results);

    const watch=[vehicleEl,...assignments.map(a=>a.el)].filter(Boolean);
    for(const el of watch)if(!el.dataset.fp1103Check){
      el.dataset.fp1103Check='1';
      el.addEventListener('change',()=>setTimeout(fp1103RefreshLendingInline,0));
    }

    /* Auch neu ausgewählte Fahrfunktionen erfassen, die beim ersten Render noch auf "Keine" standen. */
    for(const el of app.querySelectorAll('select'))if(fp1103FunctionSelect(el)&&!el.dataset.fp1103Check){
      el.dataset.fp1103Check='1';
      el.addEventListener('change',()=>setTimeout(fp1103RefreshLendingInline,0));
    }
  }catch(e){host.innerHTML=`<div class="muted">Grundprüfung derzeit nicht verfügbar: ${fp1103Esc(e.message)}</div>`}
}
async function fp1103InstallLendingCheck(){
  if(String(S?.view||'')!=='lending')return;
  if(!document.getElementById('fp1103-lending-card')){
    const card=document.createElement('div');card.className='card fp1103-card';card.id='fp1103-lending-card';
    card.innerHTML='<div class="section first">Eignungsprüfung Fahrer / Skipper</div><p class="muted">Erste Grundprüfung während der Überlassungsplanung. Das Revier wird erst im Reisecheck endgültig bewertet.</p><div id="fp1103-lending-check"></div>';
    app.appendChild(card);
  }
  await fp1103RefreshLendingInline();
}
if(typeof lending==='function'){
  const fp1103LendingBase=lending;
  lending=async function(){const r=await fp1103LendingBase.apply(this,arguments);setTimeout(()=>fp1103InstallLendingCheck(),20);return r};
}

/* ------------------------------------------------------------------ */
/* 8-9,15-16 Überlassung im Reisecheck + endgültige Einsatzprüfung    */
/* ------------------------------------------------------------------ */
async function fp1103LoadLendings(){
  const api=await fp1103LoadCore();
  const r=await fp1103FirstRows(api,['Überlassungen','Ueberlassungen','Verleih','Ausleihen','Lending']);
  FP1103.lendingRows=r.rows||[];
  return FP1103.lendingRows;
}
function fp1103LendingRefs(row){
  const f=fp1103Fields(row),txt=fp1103AllFieldText(row);
  let vehicleId=fp1103FindRef(f,'vehicle'),personId=fp1103FindRef(f,'person');
  if(!vehicleId){
    const v=FP1103.vehicles.find(x=>txt.includes(fp1103Name(x)));if(v)vehicleId=fp1103Id(v.id);
  }
  if(!personId){
    const p=FP1103.persons.find(x=>txt.includes(fp1103Name(x)));if(p)personId=fp1103Id(p.id);
  }
  return {vehicleId,personId};
}
function fp1103PlannedLending(row){
  const f=fp1103Fields(row),s=fp1103StatusText(f);
  if(f.Aktiv===false||fp1103IsFinishedStatus(s))return false;
  return !/(zurück|zurueck|beendet|abgeschlossen)/i.test(s);
}
function fp1103LendingLabel(row){
  const f=fp1103Fields(row),refs=fp1103LendingRefs(row),v=fp1103VehicleById(refs.vehicleId),p=fp1103PersonById(refs.personId);
  const from=fp1103FieldByKey(f,/(Von|Beginn|Start|Ab|DatumVon)$/i);
  return [fp1103S(f.Title)||'Überlassung',v&&fp1103Name(v),p&&fp1103Name(p),from&&fp1103FmtDate(from)].filter(Boolean).join(' · ');
}
function fp1103CrewHtml(skipperId){
  return FP1103.persons.filter(p=>fp1103Id(p.id)!==fp1103Id(skipperId)&&fp1103Fields(p).Aktiv!==false).map(p=>{
    const id=fp1103Id(p.id),checked=FP1103.selectedCrew.has(id)?'checked':'';
    return `<label><input type="checkbox" ${checked} onchange="fp1103CrewToggle('${fp1103Esc(id)}',this.checked)"> ${fp1103Esc(fp1103Name(p)||'Person')}</label>`;
  }).join('')||'<span class="muted">Keine weiteren Personen vorhanden.</span>';
}
function fp1103ExtractRevier(u){
  if(!u)return'';
  const f=fp1103Fields(u);
  for(const [k,v] of Object.entries(f))if(/Revier|Fahrtgebiet|Gebiet|Region|Zielgebiet/i.test(k)&&fp1103S(v))return fp1103S(v);
  return '';
}
async function fp1103TravelLendingChanged(){
  FP1103.selectedLendingId=document.getElementById('fp1103LendingSelect')?.value||'';
  FP1103.selectedUsageId='';FP1103.selectedCrew=new Set();FP1103.travelMode='';FP1103.revier='';
  await fp1103RenderTravelContext();
}
function fp1103CrewToggle(id,on){if(on)FP1103.selectedCrew.add(fp1103Id(id));else FP1103.selectedCrew.delete(fp1103Id(id));fp1103RenderTravelCheck()}
function fp1103ChooseTravelMode(mode){FP1103.travelMode=mode;FP1103.selectedUsageId='';FP1103.revier='';fp1103RenderTravelContext()}
function fp1103UsageChanged(){
  FP1103.selectedUsageId=document.getElementById('fp1103UsageSelect')?.value||'';
  const u=FP1103._plannedUsages?.find(x=>fp1103Id(x.id)===fp1103Id(FP1103.selectedUsageId));
  FP1103.revier=fp1103ExtractRevier(u);
  fp1103RenderTravelContext();
}
function fp1103RevierChanged(v){FP1103.revier=fp1103S(v);fp1103RenderTravelCheck()}
function fp1103RenderTravelCheck(){
  const host=document.getElementById('fp1103TravelResult');if(!host)return;
  const lending=FP1103.lendingRows.find(x=>fp1103Id(x.id)===fp1103Id(FP1103.selectedLendingId));
  if(!lending){host.innerHTML='';return}
  const refs=fp1103LendingRefs(lending),vehicle=fp1103VehicleById(refs.vehicleId),person=fp1103PersonById(refs.personId);
  const r=fp1103Evaluate(person,vehicle,[...FP1103.selectedCrew],FP1103.revier,true);
  host.innerHTML=r.html;
}
async function fp1103RenderTravelContext(){
  const host=document.getElementById('fp1103TravelContext');if(!host)return;
  const lending=FP1103.lendingRows.find(x=>fp1103Id(x.id)===fp1103Id(FP1103.selectedLendingId));
  if(!lending){host.innerHTML='<div class="muted">Überlassung auswählen, um Fahrzeug und Fahrer / Skipper zu übernehmen.</div>';return}
  const refs=fp1103LendingRefs(lending),vehicle=fp1103VehicleById(refs.vehicleId),person=fp1103PersonById(refs.personId);
  const api=await getCloud(),all=await fp1103Rows(api,'Nutzungen');
  const planned=all.filter(u=>fp1103LooksPlanned(u)&&(!refs.vehicleId||fp1103Id(fp1103Fields(u).FahrzeugId)===fp1103Id(refs.vehicleId)));
  FP1103._plannedUsages=planned;
  const basic=fp1103Evaluate(person,vehicle,[],'',false);
  let mode='';
  if(FP1103.travelMode==='planned'){
    mode=`<div class="field"><label>Geplante Nutzung</label><select id="fp1103UsageSelect" onchange="fp1103UsageChanged()"><option value="">– auswählen –</option>${planned.map(u=>`<option value="${fp1103Esc(u.id)}" ${fp1103Id(u.id)===fp1103Id(FP1103.selectedUsageId)?'selected':''}>${fp1103Esc(fp1103UsageLabel(u))}</option>`).join('')}</select></div>`;
  }else if(FP1103.travelMode==='new'){
    mode=`<div class="field"><label>Revier / Fahrtgebiet</label><input id="fp1103Revier" value="${fp1103Esc(FP1103.revier)}" placeholder="z. B. Rhein, Mosel, Adria / Kroatien" oninput="fp1103RevierChanged(this.value)"></div>`;
  }
  if(FP1103.travelMode==='planned'&&FP1103.selectedUsageId){
    const u=planned.find(x=>fp1103Id(x.id)===fp1103Id(FP1103.selectedUsageId));
    if(!FP1103.revier)FP1103.revier=fp1103ExtractRevier(u);
    mode+=`<div class="field"><label>Revier / Fahrtgebiet für die Prüfung</label><input id="fp1103Revier" value="${fp1103Esc(FP1103.revier)}" placeholder="Revier ergänzen, falls in der Planung nicht vorhanden" oninput="fp1103RevierChanged(this.value)"></div>`;
  }
  host.innerHTML=`<div class="fp1103-item"><b>${fp1103Esc(fp1103LendingLabel(lending))}</b><div class="fp1103-mini">Fahrzeug: ${fp1103Esc(fp1103Name(vehicle)||'nicht erkannt')} · Fahrer/Skipper: ${fp1103Esc(fp1103Name(person)||'nicht erkannt')}</div></div>
    <div class="fp1103-sep"></div><b>Erste Prüfung aus der Überlassung</b>${basic.html}
    <div class="fp1103-actions"><button class="${FP1103.travelMode==='new'?'primary':''}" onclick="fp1103ChooseTravelMode('new')">Neue Reise Schritt für Schritt</button><button class="${FP1103.travelMode==='planned'?'primary':''}" onclick="fp1103ChooseTravelMode('planned')">Geplante Nutzung auswählen</button></div>
    ${mode}
    ${FP1103.travelMode?`<div class="fp1103-sep"></div><b>Crew für Zusatzbefähigungen</b><div class="fp1103-crew">${fp1103CrewHtml(refs.personId)}</div><div id="fp1103TravelResult"></div>`:''}`;
  fp1103RenderTravelCheck();
}
async function fp1103InstallTravelLending(){
  if(String(S?.view||'')!=='travelcheck')return;
  document.getElementById('fp1103-travel-lending')?.remove();
  try{
    await fp1103LoadLendings();
    const rows=FP1103.lendingRows.filter(fp1103PlannedLending);
    const card=document.createElement('div');card.className='card fp1103-card';card.id='fp1103-travel-lending';
    card.innerHTML=`<div class="section first">Geplante Überlassung prüfen</div>
      <p class="muted">Fahrzeug und Fahrer / Skipper werden aus der Überlassung übernommen. Die endgültige Revierprüfung erfolgt hier.</p>
      <div class="field"><label>Geplante Überlassung</label><select id="fp1103LendingSelect" onchange="fp1103TravelLendingChanged()"><option value="">– auswählen –</option>${rows.map(x=>`<option value="${fp1103Esc(x.id)}">${fp1103Esc(fp1103LendingLabel(x))}</option>`).join('')}</select></div>
      ${rows.length?'':'<div class="fp1103-status fp1103-warn"><b>Keine geplante Überlassung gefunden.</b><div>Vorhandene Überlassungen erscheinen hier, sobald sie in der bestehenden Überlassungsverwaltung gespeichert sind.</div></div>'}
      <div id="fp1103TravelContext"></div>`;
    app.prepend(card);
  }catch(e){console.warn('Überlassung im Reisecheck 1.1.0.3',e)}
}
if(typeof travelcheck==='function'){
  const fp1103TravelBase=travelcheck;
  travelcheck=async function(){const r=await fp1103TravelBase.apply(this,arguments);await fp1103InstallTravelLending();return r};
}

/* ------------------------------------------------------------------ */
/* Sicherheitsnetz für dynamische Ansichten                           */
/* ------------------------------------------------------------------ */
function fp1103LateDecorate(){
  const v=String(S?.view||'');
  if(v==='main')fp1103EnsureMainTravelTile();
  else if(v==='configuration')fp1103RemoveConfigurationOutsiders();
  else if(v==='settings')fp1103EnsureM365InSettings();
  else if(v==='lending')fp1103InstallLendingCheck();
}
const fp1103Observer=new MutationObserver(()=>{clearTimeout(FP1103.timer);FP1103.timer=setTimeout(fp1103LateDecorate,40)});
try{fp1103Observer.observe(document.getElementById('app'),{childList:true,subtree:true})}catch{}

/* sichtbare Version – auch nach erneutem Rendern beibehalten */
const fp1103VisibleMainBase=main;
main=function(){
  const r=fp1103VisibleMainBase.apply(this,arguments);
  document.title=`Fahrzeugplattform ${FP1103_VERSION}`;
  const f=document.querySelector('footer');
  if(f)f.textContent=`Fahrzeugplattform · ${FP1103_VERSION} · © 2026 Entwicklungsstand`;
  setTimeout(fp1103LateDecorate,0);
  return r;
};
document.title=`Fahrzeugplattform ${FP1103_VERSION}`;
const fp1103Foot=document.querySelector('footer');
if(fp1103Foot)fp1103Foot.textContent=`Fahrzeugplattform · ${FP1103_VERSION} · © 2026 Entwicklungsstand`;
setTimeout(fp1103LateDecorate,60);
