/* MOBIMORY 1.1.0.3d-dev – Reisecheck Überlassung / geführter Assistent
   - ausgewählte Überlassung ist verbindliche Datenbasis des Reisechecks
   - alte/stale Reisecheck-Ergebnisse werden bei Auswahl einer Überlassung ausgeblendet
   - "Schritt für Schritt" wird durch einen erklärten Assistenten ersetzt
   - neue Reise: Reisedaten -> Route/Revier -> Crew -> Zusammenfassung/Prüfung
   - geplante Nutzung: Auswahl -> Route/Revier übernehmen/ergänzen -> Crew -> Prüfung
   - Routen-/Kartenimport: GPX, GeoJSON/JSON, KML
   - vorhandener freier Reisecheck bleibt nutzbar, wenn keine Überlassung gewählt ist
*/
const FP1103D_VERSION='1.1.0.3d-dev';
const FP1103D={
  step:0, mode:'', trip:{name:'',start:'',end:'',revier:''}, route:null,
  map:null, hidden:[], bridging:false
};

(function(){
  if(document.getElementById('fp1103d-style'))return;
  const s=document.createElement('style');s.id='fp1103d-style';s.textContent=`
    .fp1103d-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:12px 0}
    .fp1103d-progress div{padding:8px;border:1px solid rgba(120,120,120,.22);border-radius:9px;text-align:center;font-size:.82rem;opacity:.65}
    .fp1103d-progress div.active{font-weight:800;opacity:1;border-width:2px}
    .fp1103d-choice{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}
    .fp1103d-choice button{text-align:left;padding:14px}
    .fp1103d-choice b{display:block;font-size:1rem}.fp1103d-choice span{display:block;margin-top:4px;opacity:.72;font-weight:400}
    .fp1103d-nav{display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap;margin-top:14px}
    .fp1103d-nav .right{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}
    .fp1103d-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin:10px 0}
    .fp1103d-summary>div{border:1px solid rgba(120,120,120,.2);border-radius:9px;padding:9px}
    .fp1103d-summary span{display:block;font-size:.75rem;opacity:.68}.fp1103d-summary b{display:block;margin-top:2px}
    .fp1103d-map{height:300px;min-height:220px;border:1px solid rgba(120,120,120,.25);border-radius:12px;overflow:hidden;margin-top:9px}
    .fp1103d-routeinfo{padding:8px 10px;border-radius:9px;background:rgba(70,110,170,.07);margin:8px 0}
    .fp1103d-note{padding:9px 10px;border-left:4px solid currentColor;background:rgba(70,110,170,.06);border-radius:8px;margin:8px 0}
    @media(max-width:700px){.fp1103d-choice{grid-template-columns:1fr}.fp1103d-progress{grid-template-columns:1fr 1fr}.fp1103d-map{height:240px}}
  `;document.head.appendChild(s);
})();

function fp1103dCurrentLending(){
  return FP1103.lendingRows?.find(x=>fp1103Id(x.id)===fp1103Id(FP1103.selectedLendingId))||null;
}
function fp1103dRefs(){
  const l=fp1103dCurrentLending();return l?fp1103LendingRefs(l):{vehicleId:'',personId:''};
}
function fp1103dVehicle(){return fp1103VehicleById(fp1103dRefs().vehicleId)}
function fp1103dPerson(){return fp1103PersonById(fp1103dRefs().personId)}
function fp1103dField(f,rx){
  for(const [k,v] of Object.entries(f||{}))if(rx.test(k)&&fp1103S(v))return fp1103S(v);
  return '';
}
function fp1103dLendingDate(kind){
  const f=fp1103Fields(fp1103dCurrentLending());
  const v=kind==='start'
    ? fp1103dField(f,/(^|_)(Von|Beginn|Start|Ab|DatumVon|Startdatum)$/i)
    : fp1103dField(f,/(^|_)(Bis|Ende|DatumBis|Enddatum)$/i);
  const d=fp1103Date(v);return d?new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10):'';
}
function fp1103dReset(){
  FP1103D.step=0;FP1103D.mode='';FP1103D.route=null;
  FP1103D.trip={name:'',start:fp1103dLendingDate('start'),end:fp1103dLendingDate('end'),revier:''};
  FP1103.selectedUsageId='';FP1103.selectedCrew=new Set();FP1103.revier='';
}
function fp1103dProgress(step){
  const names=['Reisedaten','Route / Revier','Crew','Prüfen'];
  return `<div class="fp1103d-progress">${names.map((n,i)=>`<div class="${i===step?'active':''}">${i+1} · ${n}</div>`).join('')}</div>`;
}
function fp1103dHideBase(){
  fp1103dRestoreBase();
  if(!FP1103.selectedLendingId)return;
  const own=document.getElementById('fp1103-travel-lending');
  for(const c of [...app.querySelectorAll('.card')]){
    if(c===own||own?.contains(c))continue;
    const t=fp1103S(c.textContent);
    if(/Art des Reisechecks|Freier Reisecheck|Geplante Nutzung prüfen|Automatisches Ergebnis|Reisecheck speichern|Reisecheck-Ergebnis/i.test(t)){
      FP1103D.hidden.push({el:c,display:c.style.display});c.style.display='none';
    }
  }
}
function fp1103dRestoreBase(){
  for(const x of FP1103D.hidden){try{x.el.style.display=x.display}catch{}}
  FP1103D.hidden=[];
}
function fp1103dReadTrip(){
  const g=id=>document.getElementById(id)?.value??'';
  if(document.getElementById('fp1103dName'))FP1103D.trip.name=g('fp1103dName');
  if(document.getElementById('fp1103dStart'))FP1103D.trip.start=g('fp1103dStart');
  if(document.getElementById('fp1103dEnd'))FP1103D.trip.end=g('fp1103dEnd');
  if(document.getElementById('fp1103dRevier'))FP1103D.trip.revier=g('fp1103dRevier');
  FP1103.revier=FP1103D.trip.revier;
}
function fp1103dSetStep(n){fp1103dReadTrip();FP1103D.step=Math.max(0,Math.min(3,n));fp1103RenderTravelContext()}
function fp1103dChooseMode(mode){
  fp1103dReset();FP1103D.mode=mode;FP1103.travelMode=mode;FP1103D.step=0;fp1103RenderTravelContext();
}
function fp1103dUsageChanged(){
  FP1103.selectedUsageId=document.getElementById('fp1103dUsage')?.value||'';
  const u=FP1103._plannedUsages?.find(x=>fp1103Id(x.id)===fp1103Id(FP1103.selectedUsageId));
  if(u){
    const f=fp1103Fields(u);
    FP1103D.trip.name=fp1103TitleWithoutArchive(f.Nutzungsname||f.Title||'');
    FP1103D.trip.start=fp1103dDateInput(f.GeplanterBeginn);
    FP1103D.trip.end=fp1103dDateInput(f.GeplantesEnde||f.GeplantesEnddatum||f.GeplanterEndtermin);
    FP1103D.trip.revier=fp1103ExtractRevier(u)||'';
  }
  fp1103dLoadUsageRoute(u).then(()=>fp1103RenderTravelContext());
}
function fp1103dDateInput(v){
  const d=fp1103Date(v);return d?new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10):'';
}
async function fp1103dLoadUsageRoute(u){
  FP1103D.route=null;if(!u)return;
  const f=fp1103Fields(u);
  try{
    if(f.GPXRouteJson1068&&typeof fp1068UnpackRoute==='function'){
      const r=fp1068UnpackRoute(f.GPXRouteJson1068);if(r?.points?.length){FP1103D.route={...r,file:f.GPXDateiname1068||r.file||'GPX aus Planung'};return}
    }
    const api=await getCloud(),segs=(await fp1103Rows(api,'NutzungsRoutenabschnitte')).filter(x=>fp1103Id(fp1103Fields(x).NutzungId)===fp1103Id(u.id));
    for(const s of segs){
      const raw=fp1103Fields(s).GPXRouteJson1069;
      if(raw&&typeof fp1068UnpackRoute==='function'){
        const r=fp1068UnpackRoute(raw);if(r?.points?.length){FP1103D.route={...r,file:fp1103Fields(s).GPXDateiname1069||fp1103Fields(s).Title||'Route aus Planung'};return}
      }
    }
  }catch{}
}
function fp1103dParseGeoJson(text,file){
  const j=JSON.parse(text),pts=[];
  const addCoords=c=>{if(!Array.isArray(c))return;if(typeof c[0]==='number'&&typeof c[1]==='number'){pts.push({lat:Number(c[1]),lon:Number(c[0]),name:''});return}for(const x of c)addCoords(x)};
  const walk=g=>{if(!g)return;if(g.type==='FeatureCollection')return g.features.forEach(walk);if(g.type==='Feature')return walk(g.geometry);if(g.coordinates)addCoords(g.coordinates)};
  walk(j);if(pts.length<2)throw new Error('Keine nutzbare Route mit mindestens zwei Punkten gefunden.');
  return {type:'GeoJSON',file,points:pts};
}
function fp1103dParseKml(text,file){
  const xml=new DOMParser().parseFromString(text,'application/xml');if(xml.querySelector('parsererror'))throw new Error('KML ist ungültig.');
  const pts=[];for(const n of xml.querySelectorAll('LineString coordinates, gx\\:Track gx\\:coord, coordinates')){
    const raw=fp1103S(n.textContent);for(const token of raw.split(/\s+/)){const a=token.split(',').map(Number);if(a.length>=2&&Number.isFinite(a[0])&&Number.isFinite(a[1]))pts.push({lat:a[1],lon:a[0],name:''})}
  }
  if(pts.length<2)throw new Error('Keine nutzbare Linie in der KML-Datei gefunden.');
  return {type:'KML',file,points:pts};
}
async function fp1103dImportRoute(input){
  const f=input?.files?.[0];if(!f)return;
  try{
    const text=await f.text(),name=f.name.toLowerCase();
    if(name.endsWith('.gpx')){
      if(typeof fp1068ParseGpx!=='function')throw new Error('GPX-Parser nicht verfügbar.');
      const r=fp1068ParseGpx(text);FP1103D.route={...r,file:f.name};
    }else if(name.endsWith('.kml'))FP1103D.route=fp1103dParseKml(text,f.name);
    else FP1103D.route=fp1103dParseGeoJson(text,f.name);
    await fp1103dDrawMap();
    fp1103RenderTravelContext();
  }catch(e){alert('Route/Karte konnte nicht importiert werden: '+e.message)}
}
async function fp1103dDrawMap(){
  const host=document.getElementById('fp1103dMap'),r=FP1103D.route;if(!host||!r?.points?.length)return;
  try{
    if(FP1103D.map){try{FP1103D.map.remove()}catch{}FP1103D.map=null}
    if(typeof fp10610LoadLeaflet!=='function')throw new Error('Kartenbibliothek nicht verfügbar');
    const L=await fp10610LoadLeaflet();if(!document.body.contains(host))return;
    host.innerHTML='';const map=L.map(host);FP1103D.map=map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
    const ll=r.points.map(p=>[Number(p.lat),Number(p.lon)]).filter(x=>Number.isFinite(x[0])&&Number.isFinite(x[1]));
    const line=L.polyline(ll,{weight:5,opacity:.9}).addTo(map);map.fitBounds(line.getBounds().pad(.08),{animate:false});
    L.circleMarker(ll[0],{radius:7,fillOpacity:1}).bindTooltip('Start').addTo(map);
    L.circleMarker(ll[ll.length-1],{radius:7,fillOpacity:1}).bindTooltip('Ziel').addTo(map);
    setTimeout(()=>map.invalidateSize(false),60);
  }catch{
    host.innerHTML='<div class="muted" style="padding:12px">Route importiert. Kartenhintergrund konnte nicht geladen werden.</div>';
  }
}
function fp1103dCrewStep(skipperId){
  const selected=FP1103.selectedCrew;
  return `<p class="muted">Crewmitglieder können zusätzliche Befähigungen erfüllen, z. B. einen erforderlichen Funkschein.</p>
    <div class="fp1103-crew">${FP1103.persons.filter(p=>fp1103Id(p.id)!==fp1103Id(skipperId)&&fp1103Fields(p).Aktiv!==false).map(p=>{
      const id=fp1103Id(p.id);return `<label><input type="checkbox" ${selected.has(id)?'checked':''} onchange="fp1103CrewToggle('${fp1103Esc(id)}',this.checked)"> ${fp1103Esc(fp1103Name(p)||'Person')}</label>`;
    }).join('')||'<span class="muted">Keine weiteren Personen vorhanden.</span>'}</div>`;
}
function fp1103dRouteStep(){
  const info=FP1103D.route?`<div class="fp1103d-routeinfo"><b>${fp1103Esc(FP1103D.route.file||FP1103D.route.type||'Route')}</b> · ${FP1103D.route.points?.length||0} Punkte</div><div id="fp1103dMap" class="fp1103d-map"></div>`:'';
  return `<div class="field"><label>Revier / Länder / Fahrtgebiet</label><input id="fp1103dRevier" value="${fp1103Esc(FP1103D.trip.revier)}" placeholder="z. B. Rhein / Mosel oder Deutschland, Österreich, Italien"></div>
    <div class="field"><label>Route / Karte importieren (optional)</label><input type="file" accept=".gpx,.geojson,.json,.kml,application/gpx+xml,application/geo+json,application/json,application/vnd.google-earth.kml+xml" onchange="fp1103dImportRoute(this)"></div>
    <div class="fp1103d-note"><b>Warum Revier zusätzlich?</b><div>Eine Routendatei zeigt den Weg, enthält aber nicht zuverlässig die rechtliche Einordnung des Reviers. Beides zusammen ergibt die beste Prüfgrundlage.</div></div>${info}`;
}
function fp1103dSummary(vehicle,person){
  return `<div class="fp1103d-summary">
    <div><span>Fahrzeug</span><b>${fp1103Esc(fp1103Name(vehicle)||'–')}</b></div>
    <div><span>Fahrer / Skipper</span><b>${fp1103Esc(fp1103Name(person)||'–')}</b></div>
    <div><span>Zeitraum</span><b>${fp1103Esc(FP1103D.trip.start||'–')} – ${fp1103Esc(FP1103D.trip.end||'–')}</b></div>
    <div><span>Revier</span><b>${fp1103Esc(FP1103D.trip.revier||'–')}</b></div>
    <div><span>Route/Karte</span><b>${fp1103Esc(FP1103D.route?.file||'keine')}</b></div>
    <div><span>Crew</span><b>${FP1103.selectedCrew.size}</b></div>
  </div>`;
}
function fp1103dControls(step){
  return `<div class="fp1103d-nav"><div>${step>0?`<button onclick="fp1103dSetStep(${step-1})">← Zurück</button>`:''}</div><div class="right">${step<3?`<button class="primary" onclick="fp1103dNext(${step})">Weiter →</button>`:''}</div></div>`;
}
function fp1103dNext(step){
  fp1103dReadTrip();
  if(step===0){
    if(FP1103D.mode==='planned'&&!FP1103.selectedUsageId)return alert('Bitte zuerst eine geplante Nutzung auswählen.');
    if(FP1103D.mode==='new'&&(!FP1103D.trip.start||!FP1103D.trip.end))return alert('Bitte Start- und Enddatum eintragen.');
  }
  if(step===1&&!FP1103D.trip.revier&&!FP1103D.route)return alert('Bitte Revier/Fahrtgebiet angeben oder eine Route/Karte importieren.');
  fp1103dSetStep(step+1);
}
function fp1103dStepBody(step,vehicle,person,planned){
  if(step===0){
    if(FP1103D.mode==='planned')return `<div class="field"><label>Geplante Nutzung auswählen</label><select id="fp1103dUsage" onchange="fp1103dUsageChanged()"><option value="">– auswählen –</option>${planned.map(u=>`<option value="${fp1103Esc(u.id)}" ${fp1103Id(u.id)===fp1103Id(FP1103.selectedUsageId)?'selected':''}>${fp1103Esc(fp1103UsageLabel(u))}</option>`).join('')}</select></div>
      ${FP1103.selectedUsageId?`<div class="fp1103d-note"><b>Übernommen</b><div>Name, Zeitraum und vorhandene Route/Revierdaten der Planung werden für die nächsten Schritte verwendet.</div></div>`:''}${fp1103dControls(step)}`;
    return `<div class="field"><label>Name der Reise (optional)</label><input id="fp1103dName" value="${fp1103Esc(FP1103D.trip.name)}"></div>
      <div class="fp1103-row"><div class="field"><label>Startdatum</label><input id="fp1103dStart" type="date" value="${fp1103Esc(FP1103D.trip.start)}"></div><div class="field"><label>Enddatum</label><input id="fp1103dEnd" type="date" value="${fp1103Esc(FP1103D.trip.end)}"></div></div>
      <div class="fp1103d-note"><b>Fahrzeug und Fahrer/Skipper sind bereits festgelegt.</b><div>Sie stammen aus der ausgewählten Überlassung und müssen hier nicht noch einmal eingegeben werden.</div></div>${fp1103dControls(step)}`;
  }
  if(step===1)return fp1103dRouteStep()+fp1103dControls(step);
  if(step===2)return fp1103dCrewStep(person?.id)+fp1103dControls(step);
  const r=fp1103Evaluate(person,vehicle,[...FP1103.selectedCrew],FP1103D.trip.revier,true);
  return `${fp1103dSummary(vehicle,person)}<div class="fp1103-sep"></div><b>Fahrer-/Skipper- und Ausrüstungsprüfung</b>${r.html}
    <div class="fp1103d-note"><b>Als Nächstes</b><div>„Reise jetzt prüfen“ überträgt diese Daten in den bestehenden Reisecheck. Vorherige alte Reisecheck-Daten werden nicht als Grundlage weiterverwendet.</div></div>
    <div class="fp1103d-nav"><button onclick="fp1103dSetStep(2)">← Zurück</button><div class="right"><button class="primary" onclick="fp1103dRunBaseCheck()">Reise jetzt prüfen</button></div></div>`;
}
async function fp1103dRenderContext(){
  const host=document.getElementById('fp1103TravelContext');if(!host)return;
  const lending=fp1103dCurrentLending();
  if(!lending){fp1103dRestoreBase();host.innerHTML='<div class="muted">Überlassung auswählen, um Fahrzeug und Fahrer / Skipper zu übernehmen.</div>';return}
  fp1103dHideBase();
  const refs=fp1103LendingRefs(lending),vehicle=fp1103VehicleById(refs.vehicleId),person=fp1103PersonById(refs.personId);
  const api=await getCloud(),all=await fp1103Rows(api,'Nutzungen');
  const planned=all.filter(u=>fp1103LooksPlanned(u)&&(!refs.vehicleId||fp1103Id(fp1103Fields(u).FahrzeugId)===fp1103Id(refs.vehicleId)));
  FP1103._plannedUsages=planned;
  const basic=fp1103Evaluate(person,vehicle,[],'',false);
  let chooser='';
  if(!FP1103D.mode){
    chooser=`<div class="fp1103d-choice"><button onclick="fp1103dChooseMode('new')"><b>Neue Reise anlegen und prüfen</b><span>MOBIMORY führt dich durch Zeitraum, Revier/Route, Crew und Prüfung.</span></button><button onclick="fp1103dChooseMode('planned')"><b>Geplante Nutzung übernehmen und prüfen</b><span>Eine vorhandene Planung dieses Fahrzeugs auswählen und als Prüfgrundlage verwenden.</span></button></div>`;
  }
  host.innerHTML=`<div class="fp1103-item"><b>${fp1103Esc(fp1103LendingLabel(lending))}</b><div class="fp1103-mini">Fahrzeug: ${fp1103Esc(fp1103Name(vehicle)||'nicht erkannt')} · Fahrer/Skipper: ${fp1103Esc(fp1103Name(person)||'nicht erkannt')}</div></div>
    <div class="fp1103-sep"></div><b>Erste Prüfung aus der Überlassung</b>${basic.html}
    ${chooser}
    ${FP1103D.mode?`${fp1103dProgress(FP1103D.step)}<div class="fp1103d-note"><b>${FP1103D.mode==='new'?'Neue Reise':'Geplante Nutzung'}</b><div>${FP1103D.step===0?'Zuerst die Reisedaten festlegen.':FP1103D.step===1?'Jetzt Revier oder Route festlegen.':FP1103D.step===2?'Jetzt Crew und zusätzliche Befähigungen festlegen.':'Alles kontrollieren und anschließend den Reisecheck starten.'}</div></div>${fp1103dStepBody(FP1103D.step,vehicle,person,planned)}`:''}`;
  if(FP1103D.route&&FP1103D.step===1)setTimeout(fp1103dDrawMap,60);
}
fp1103RenderTravelContext=fp1103dRenderContext;

const fp1103dLendingChangeBase=fp1103TravelLendingChanged;
fp1103TravelLendingChanged=async function(){
  await fp1103dLendingChangeBase();
  if(FP1103.selectedLendingId)fp1103dReset();else fp1103dRestoreBase();
  await fp1103RenderTravelContext();
};

function fp1103dSetSelect(select,entity){
  if(!select||!entity)return false;
  const id=fp1103Id(entity.id),name=fp1103Name(entity).toLowerCase();
  const o=[...select.options].find(o=>fp1103Id(o.value)===id)||[...select.options].find(o=>fp1103S(o.textContent).toLowerCase()===name)||[...select.options].find(o=>fp1103S(o.textContent).toLowerCase().includes(name));
  if(!o)return false;select.value=o.value;select.dispatchEvent(new Event('change',{bubbles:true}));return true;
}
function fp1103dControlByText(rx,selector='input,select,textarea'){
  for(const el of [...app.querySelectorAll(selector)]){
    if(document.getElementById('fp1103-travel-lending')?.contains(el))continue;
    const p=el.closest('.field,div,label'),t=fp1103S(p?.textContent||'');
    if(rx.test(t))return el;
  }
  return null;
}
function fp1103dSetValue(el,v){
  if(!el||v==null||v==='')return false;el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;
}
async function fp1103dRunBaseCheck(){
  if(FP1103D.bridging)return;FP1103D.bridging=true;fp1103dReadTrip();
  try{
    const vehicle=fp1103dVehicle(),person=fp1103dPerson();
    if(!vehicle||!person)return alert('Fahrzeug oder Fahrer/Skipper konnte nicht übernommen werden.');
    /* alten Reisecheck sichtbar machen, aber altes Ergebnis nicht als Datenquelle stehen lassen */
    fp1103dRestoreBase();
    for(const c of [...app.querySelectorAll('.card')]){
      if(document.getElementById('fp1103-travel-lending')?.contains(c))continue;
      if(/Automatisches Ergebnis/i.test(c.textContent||''))c.remove();
    }
    if(S){
      S.vehicle={...(S.vehicle||{}),id:String(vehicle.id),name:fp1103Name(vehicle),profile:fp1103Fields(vehicle).Profil||S.vehicle?.profile||''};
    }

    const modeText=FP1103D.mode==='planned'?'Geplante Nutzung prüfen':'Freier Reisecheck';
    const modeBtn=[...app.querySelectorAll('button')].find(b=>!document.getElementById('fp1103-travel-lending')?.contains(b)&&fp1103S(b.textContent).includes(modeText));
    if(modeBtn)modeBtn.click();
    await new Promise(r=>setTimeout(r,120));

    /* bekannte Felder des bestehenden Reisechecks dynamisch befüllen */
    const selects=[...app.querySelectorAll('select')].filter(x=>!document.getElementById('fp1103-travel-lending')?.contains(x));
    for(const sel of selects){
      fp1103dSetSelect(sel,vehicle);
      fp1103dSetSelect(sel,person);
    }
    fp1103dSetValue(fp1103dControlByText(/Start|Von|Beginn/i,'input[type="date"],input[type="datetime-local"]'),FP1103D.trip.start);
    fp1103dSetValue(fp1103dControlByText(/Ende|Bis/i,'input[type="date"],input[type="datetime-local"]'),FP1103D.trip.end);
    fp1103dSetValue(fp1103dControlByText(/Revier|Gebiet|Länder|Laender|Staaten|Fahrtgebiet/i,'input,textarea'),FP1103D.trip.revier);

    if(FP1103D.mode==='planned'&&FP1103.selectedUsageId){
      const u=FP1103._plannedUsages?.find(x=>fp1103Id(x.id)===fp1103Id(FP1103.selectedUsageId));
      if(u)for(const sel of selects)fp1103dSetSelect(sel,u);
    }

    await new Promise(r=>setTimeout(r,160));
    const run=[...app.querySelectorAll('button')].find(b=>{
      if(document.getElementById('fp1103-travel-lending')?.contains(b))return false;
      const t=fp1103S(b.textContent);
      return /^(Reisecheck|Reise|Check).*(prüfen|starten|ausführen)|^(Prüfen|Check starten)$/i.test(t);
    });
    if(run)run.click();
    else{
      const base=[...app.querySelectorAll('.card')].find(c=>/Art des Reisechecks|Freier Reisecheck|Geplante Nutzung prüfen/i.test(c.textContent||''));
      base?.scrollIntoView({behavior:'smooth',block:'start'});
      alert('Die Daten wurden in den bestehenden Reisecheck übernommen. Bitte dort den Prüfbutton auslösen.');
    }
  }finally{setTimeout(()=>{FP1103D.bridging=false},300)}
}

/* sichtbare Version */
const fp1103dMainBase=main;
main=function(){
  const r=fp1103dMainBase.apply(this,arguments);
  document.title=`Fahrzeugplattform ${FP1103D_VERSION}`;
  const f=document.querySelector('footer');if(f)f.textContent=`Fahrzeugplattform · ${FP1103D_VERSION} · © 2026 Entwicklungsstand`;
  return r;
};
document.title=`Fahrzeugplattform ${FP1103D_VERSION}`;
const fp1103dFoot=document.querySelector('footer');if(fp1103dFoot)fp1103dFoot.textContent=`Fahrzeugplattform · ${FP1103D_VERSION} · © 2026 Entwicklungsstand`;
