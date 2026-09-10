/* MOBIMORY 1.0.6.9-dev – BLOCK 1 KORREKTUR: Grobroute + mehrere GPX-Routenabschnitte + Vorstart-Wetterfenster
   Produktgrenze bleibt unverändert: MOBIMORY routet nicht und gibt keine Kurs-/Lenkanweisungen.
   - Gesamt-/Grobroute: optional, nur Planungsrahmen und Gesamtauswertung.
   - Routenabschnitte: beliebig viele GPX-Dateien innerhalb einer Nutzung/Reise.
   - Operative ETA/Wetterberechnung: immer auf dem ausgewählten/aktuellen Routenabschnitt.
   - Vorstart: frei wählbare Startzeit + V Reise manuell.
   - Laufend: reale GPS-Position + realer Fahrdurchschnitt der aktuellen Nutzung.
*/

const FP1069_VERSION='1.0.6.9-dev';
const FP1069={selected:{},segments:{},overview:{},previewStart:{}};

function fp1069Id(v){return String(v??'')}
function fp1069BaseName(v){return String(v||'Route').replace(/\.gpx$/i,'').trim()||'Route'}
function fp1069EndpointLabel(route,which){if(!route?.points?.length)return'';const p=which==='start'?route.points[0]:route.points[route.points.length-1];return String(p?.name||'').trim()}
function fp1069DefaultSegmentName(route,file,index){const a=fp1069EndpointLabel(route,'start'),b=fp1069EndpointLabel(route,'end');if(a&&b&&a!==b)return `${a} → ${b}`;if(a||b)return a||b;return `${index||1}. ${fp1069BaseName(file)}`}
function fp1069CoordLabel(p){return p?`${Number(p.lat).toFixed(4)}, ${Number(p.lon).toFixed(4)}`:'–'}
function fp1069SegmentStartText(seg,usage){return fp1068LocalInput(seg?.fields?.GeplanterStart1069||usage?.fields?.GeplanterBeginn||usage?.fields?.Beginn||new Date().toISOString())}
function fp1069IsUsageActive(u){return String(u?.fields?.Status||'')==='Aktiv'}
function fp1069ClearUsageCache(usageId){delete FP1068.routeCache[fp1069Id(usageId)];delete FP1069.segments[fp1069Id(usageId)];delete FP1069.overview[fp1069Id(usageId)]}

/* -------------------------------------------------------------------------- */
/* Additives M365-Schema                                                      */
/* -------------------------------------------------------------------------- */
const fp1069MergedSchemaBase=fp105MergedSchema;
fp105MergedSchema=async function(){
  const [prior,e1069]=await Promise.all([
    fp1069MergedSchemaBase(),
    fetch('phase1-sharepoint-schema-1.0.6.9.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Schema 1.0.6.9 fehlt im Repository.');return r.json()})
  ]);
  return fp105MergeSchemas(prior,e1069);
};

m365setup=function(){
  head('Microsoft 365 Setup','Schema 1.0.6.9 · Routenabschnitte · additiv');
  const tok=window.FPAuth.token(),authButton=tok?`<button onclick="FPAuth.logout();render()">Microsoft-Verbindung trennen</button>`:`<button class="primary" onclick="sessionStorage.setItem('fp_after_auth','m365setup');FPAuth.login()">Mit Microsoft 365 anmelden</button>`;
  app.innerHTML=`<div class="card"><b>Microsoft-Anmeldung</b><div id="authState">${tok?'✓ Microsoft-Token vorhanden':'Noch nicht mit Microsoft verbunden'}</div>${authButton}</div>
  <div class="card"><div class="field"><label>SharePoint-Site-URL</label><input id="spSite" value="${fp1068Esc(localStorage.getItem('fp_sp_site')||'')}" placeholder="https://…sharepoint.com/sites/Fahrzeugplattform"></div>
  <button class="primary" ${tok?'':'disabled'} onclick="runM365Provision1068()">Phase-1-Struktur prüfen / anlegen</button>
  <p class="muted">Additiv und wiederholbar. 1.0.6.9 ergänzt die Liste für beliebig viele GPX-Routenabschnitte. Die Felder aus 1.0.6.8 bleiben kompatibel und werden künftig als optionale Grobroute der gesamten Nutzung verwendet.</p></div><div id="m365Result"></div>`;
};

/* -------------------------------------------------------------------------- */
/* Datenmodell: Grobroute an Nutzung + x Routenabschnitte                     */
/* -------------------------------------------------------------------------- */
async function fp1069Segments(usageId,force=false){
  const key=fp1069Id(usageId);if(!force&&FP1069.segments[key])return FP1069.segments[key];
  const api=await getCloud(),rows=(await fp105SafeList(api,'NutzungsRoutenabschnitte')).filter(x=>fp1069Id(x.fields.NutzungId)===key&&x.fields.Aktiv!==false).sort((a,b)=>(Number(a.fields.Sortierung)||0)-(Number(b.fields.Sortierung)||0)||fp1069Id(a.id).localeCompare(fp1069Id(b.id)));
  FP1069.segments[key]=rows;return rows;
}
function fp1069SegmentRoute(seg){return fp1068UnpackRoute(seg?.fields?.GPXRouteJson1069||'')}
function fp1069OverviewRoute(usage){return fp1068UnpackRoute(usage?.fields?.GPXRouteJson1068||'')}
function fp1069SelectedSegmentId(usageId){return FP1069.selected[fp1069Id(usageId)]||sessionStorage.getItem('fp1069_segment_'+fp1069Id(usageId))||''}
function fp1069RememberSegment(usageId,segmentId){const u=fp1069Id(usageId),s=fp1069Id(segmentId);FP1069.selected[u]=s;try{sessionStorage.setItem('fp1069_segment_'+u,s)}catch{}}
async function fp1069CurrentSegment(usageId,active=false){
  const rows=await fp1069Segments(usageId),selected=fp1069SelectedSegmentId(usageId);
  if(active){const current=rows.find(x=>x.fields.IstAktiv1069===true);if(current)return current}
  return rows.find(x=>fp1069Id(x.id)===selected)||rows[0]||null;
}
async function fp1069SetCurrentSegment(usageId,segmentId){
  try{const api=await getCloud(),rows=await fp1069Segments(usageId,true);for(const r of rows){const want=fp1069Id(r.id)===fp1069Id(segmentId);if(Boolean(r.fields.IstAktiv1069)!==want)await api.updateItemByName('NutzungsRoutenabschnitte',r.id,{IstAktiv1069:want})}fp1069RememberSegment(usageId,segmentId);fp1069ClearUsageCache(usageId);await fp1068RefreshCurrentView()}catch(e){alert('Aktueller Routenabschnitt konnte nicht gesetzt werden: '+e.message)}
}
async function fp1069SelectSegment(usageId,segmentId){fp1069RememberSegment(usageId,segmentId);fp1069ClearUsageCache(usageId);await fp1068RefreshCurrentView()}

/* -------------------------------------------------------------------------- */
/* GPX-Import: Grobroute oder neuer Routenabschnitt                           */
/* -------------------------------------------------------------------------- */
async function fp1069ImportOverviewGpx(input,usageId){
  const file=input?.files?.[0];if(!file||!usageId)return;
  try{const parsed=fp1068ParseGpx(await file.text()),api=await getCloud(),packed=fp1068PackRoute(parsed,file.name);await api.updateItemByName('Nutzungen',usageId,{GPXRouteJson1068:packed,GPXDateiname1068:file.name,GPXImportiertAm1068:new Date().toISOString()});fp1069ClearUsageCache(usageId);alert(`Grobroute übernommen: ${parsed.originalCount} GPX-Punkte gelesen, ${parsed.points.length} Routenstützpunkte gespeichert.`);await fp1068RefreshCurrentView()}catch(e){alert('Grobroute konnte nicht importiert werden: '+e.message)}finally{if(input)input.value=''}
}
async function fp1069RemoveOverviewGpx(usageId){
  if(!confirm('Optionale Grobroute dieser Nutzung entfernen? Die einzelnen Routenabschnitte bleiben erhalten.'))return;
  try{const api=await getCloud();await api.updateItemByName('Nutzungen',usageId,{GPXRouteJson1068:'',GPXDateiname1068:'',GPXImportiertAm1068:null});fp1069ClearUsageCache(usageId);await fp1068RefreshCurrentView()}catch(e){alert(e.message)}
}
async function fp1069ImportSegmentGpx(input,usageId){
  const file=input?.files?.[0];if(!file||!usageId)return;
  try{
    const parsed=fp1068ParseGpx(await file.text()),route=fp1068UnpackRoute(fp1068PackRoute(parsed,file.name)),api=await getCloud(),rows=await fp1069Segments(usageId,true),u=await api.getItemByName('Nutzungen',usageId),sort=(rows.reduce((m,x)=>Math.max(m,Number(x.fields.Sortierung)||0),0)||0)+1,name=fp1069DefaultSegmentName(route,file.name,sort),makeCurrent=fp1069IsUsageActive(u)&&!rows.some(x=>x.fields.IstAktiv1069===true);
    const created=await api.createItemByName('NutzungsRoutenabschnitte',{Title:name,NutzungId:fp1069Id(usageId),Sortierung:sort,Abschnittsname1069:name,GPXRouteJson1069:fp1068PackRoute(parsed,file.name),GPXDateiname1069:file.name,GPXImportiertAm1069:new Date().toISOString(),GeplanterStart1069:rows.length?null:(u.fields.GeplanterBeginn||null),IstAktiv1069:makeCurrent,Aktiv:true,Testdaten:testFlag()});
    const id=created?.id||created?.Id||created?.fields?.id||'';if(id)fp1069RememberSegment(usageId,id);fp1069ClearUsageCache(usageId);
    alert(`Routenabschnitt ${sort} hinzugefügt: ${parsed.originalCount} GPX-Punkte gelesen, ${parsed.points.length} Routenstützpunkte gespeichert.`);await fp1068RefreshCurrentView();
  }catch(e){alert('Routenabschnitt konnte nicht importiert werden: '+e.message)}finally{if(input)input.value=''}
}
async function fp1069DeleteSegment(usageId,segmentId){
  if(!confirm('Diesen Routenabschnitt löschen? Die übrigen Abschnitte und die Grobroute bleiben erhalten.'))return;
  try{const api=await getCloud(),rows=await fp1069Segments(usageId,true),target=rows.find(x=>fp1069Id(x.id)===fp1069Id(segmentId));await api.deleteItemByName('NutzungsRoutenabschnitte',segmentId);const rest=rows.filter(x=>fp1069Id(x.id)!==fp1069Id(segmentId));for(let i=0;i<rest.length;i++){if(Number(rest[i].fields.Sortierung)!==i+1)await api.updateItemByName('NutzungsRoutenabschnitte',rest[i].id,{Sortierung:i+1})}if(target?.fields?.IstAktiv1069&&rest[0])await api.updateItemByName('NutzungsRoutenabschnitte',rest[0].id,{IstAktiv1069:true});FP1069.selected[fp1069Id(usageId)]='';try{sessionStorage.removeItem('fp1069_segment_'+fp1069Id(usageId))}catch{}fp1069ClearUsageCache(usageId);await fp1068RefreshCurrentView()}catch(e){alert('Routenabschnitt konnte nicht gelöscht werden: '+e.message)}
}
async function fp1069MoveSegment(usageId,segmentId,dir){
  try{const api=await getCloud(),rows=await fp1069Segments(usageId,true),i=rows.findIndex(x=>fp1069Id(x.id)===fp1069Id(segmentId)),j=i+Number(dir);if(i<0||j<0||j>=rows.length)return;const a=rows[i],b=rows[j],sa=Number(a.fields.Sortierung)||i+1,sb=Number(b.fields.Sortierung)||j+1;await api.updateItemByName('NutzungsRoutenabschnitte',a.id,{Sortierung:sb});await api.updateItemByName('NutzungsRoutenabschnitte',b.id,{Sortierung:sa});fp1069ClearUsageCache(usageId);await fp1068RefreshCurrentView()}catch(e){alert(e.message)}
}
async function fp1069RenameSegment(usageId,segmentId){
  try{const rows=await fp1069Segments(usageId,true),s=rows.find(x=>fp1069Id(x.id)===fp1069Id(segmentId));if(!s)return;const name=prompt('Bezeichnung des Routenabschnitts',s.fields.Abschnittsname1069||s.fields.Title||'');if(name==null)return;const n=name.trim();if(!n)return alert('Bitte eine Bezeichnung eingeben.');const api=await getCloud();await api.updateItemByName('NutzungsRoutenabschnitte',segmentId,{Title:n,Abschnittsname1069:n});fp1069ClearUsageCache(usageId);await fp1068RefreshCurrentView()}catch(e){alert(e.message)}
}

/* -------------------------------------------------------------------------- */
/* Wetterregel bleibt USER-Einstellung; Startzeit gehört zum Abschnitt        */
/* -------------------------------------------------------------------------- */
async function fp1069SaveRule(usageId){
  try{const type=document.getElementById('fp1068RuleType')?.value||'distance',value=Math.max(.05,Number(document.getElementById('fp1068RuleValue')?.value||1)),unit=type==='time'?'h':(document.getElementById('fp1068RuleUnit')?.value||'km'),devValue=Math.max(0,Number(document.getElementById('fp1068DevValue')?.value||0)),devUnit=document.getElementById('fp1068DevUnit')?.value||'km',api=await getCloud(),rule={type,value,unit,devValue,devUnit};await Promise.all([fp1068SaveUserRule(rule),api.updateItemByName('Nutzungen',usageId,{WetterRegelTyp1068:type,WetterRegelWert1068:value,WetterRegelEinheit1068:unit,RoutenabweichungM1068:fp1068RuleMeters(devValue,devUnit)})]);fp1069ClearUsageCache(usageId);await fp1068RefreshCurrentView()}catch(e){alert('Wetterregel konnte nicht gespeichert werden: '+e.message)}
}
async function fp1069SavePreviewStart(usageId,segmentId){
  const v=document.getElementById('fp1069CalcStart')?.value;if(!v)return alert('Bitte Startzeit auswählen.');
  try{const iso=new Date(v).toISOString(),api=await getCloud();await api.updateItemByName('NutzungsRoutenabschnitte',segmentId,{GeplanterStart1069:iso});FP1069.previewStart[fp1069Id(usageId)]=iso;fp1069RememberSegment(usageId,segmentId);fp1069ClearUsageCache(usageId);await fp1068RefreshCurrentView()}catch(e){alert('Startzeit konnte nicht gespeichert werden: '+e.message)}
}
async function fp1069PreviewForInput(usageId){const el=document.getElementById('fp1069CalcStart');if(!el?.value)return alert('Bitte Startzeit auswählen.');FP1069.previewStart[fp1069Id(usageId)]=new Date(el.value).toISOString();await fp1069BuildWeather(usageId,false)}
async function fp1069ShiftPreviewStart(usageId,hours){const el=document.getElementById('fp1069CalcStart');if(!el)return;const d=el.value?new Date(el.value):new Date();d.setHours(d.getHours()+Number(hours||0));el.value=fp1068LocalInput(d.toISOString());await fp1069PreviewForInput(usageId)}

/* -------------------------------------------------------------------------- */
/* Kontext: operative Route = ausgewählter/aktueller Abschnitt                */
/* -------------------------------------------------------------------------- */
fp1068LoadUsageContext=async function(usageId){
  const key=fp1069Id(usageId),api=await getCloud(),u=await api.getItemByName('Nutzungen',usageId),vehicle=await api.getItemByName('Fahrzeuge',String(u.fields.FahrzeugId||S.vehicle?.id||'')),profile=normalizeProfile(vehicle.fields.Profil||S.vehicle?.profile||''),userRule=await fp1068LoadUserRule(profile),active=fp1069IsUsageActive(u),segment=await fp1069CurrentSegment(usageId,active),route=fp1069SegmentRoute(segment),overview=fp1069OverviewRoute(u);return {usage:u,vehicle,route,userRule,profile,segment,overview}
};

async function fp1069BuildWeather(usageId,active=false,hostId='fp1068ForecastRows'){
  const host=document.getElementById(hostId);if(!host)return;host.innerHTML='<div class="muted">ETA und Routenwetter werden berechnet …</div>';
  try{
    const ctx=await fp1068LoadUsageContext(usageId);if(!ctx.segment||!ctx.route){host.innerHTML='<div class="muted">Noch kein Routenabschnitt für die Wetterberechnung ausgewählt.</div>';return}
    const speed=fp1068EffectiveSpeed(ctx,active);if(!(speed.kmh>0)){host.innerHTML='<div class="status-warn"><b>V Reise fehlt.</b><div>Bitte zuerst im Fahrzeug V Reise hinterlegen.</div></div>';return}
    const rule=fp1068RuleFromFields(ctx.usage.fields,ctx.profile,ctx.userRule),route=ctx.route,g=fp1068RouteGeom(route);let startAlong=0,startTime=new Date((!active&&FP1069.previewStart[fp1069Id(usageId)])||ctx.segment.fields.GeplanterStart1069||ctx.usage.fields.GeplanterBeginn||ctx.usage.fields.Beginn||Date.now()),projection=null;
    if(active&&FP1068.lastPos){projection=fp1068Project(route,FP1068.lastPos);startAlong=projection.alongM;startTime=new Date()}
    const points=fp1068WeatherPoints(route,startAlong,startTime,speed.kmh,rule);await fp1068FetchWeather(points);const profile=ctx.profile,unit=fp1068SpeedUnit(ctx.vehicle.fields),dev=projection?.distanceM,segName=ctx.segment.fields.Abschnittsname1069||ctx.segment.fields.Title||'Routenabschnitt';
    host.innerHTML=`<div class="fp1068-route-meta"><span><b>${fp1068Esc(segName)}</b></span>${active&&projection?`<span>Rest ${fp1068FmtDistance((g.totalM-startAlong)/1000,profile)}</span>`:`<span>Strecke ${fp1068FmtDistance(g.totalM/1000,profile)}</span>`}<span>ETA-Basis ${fp1068KmhToUnit(speed.kmh,unit).toFixed(1)} ${unit}</span><span>${fp1068Esc(speed.source)}</span></div>
      ${active&&projection&&dev!=null&&dev>fp1068RuleMeters(rule.devValue,rule.devUnit)?`<div class="fp1068-warn"><b>Achtung: ${dev<1000?Math.round(dev)+' m':(dev/1000).toFixed(1)+' km'} von der geplanten Strecke entfernt.</b><div>Bitte Route/Kurs überprüfen.</div></div>`:''}
      ${points.map((p,i)=>{const w=p.weather,label=p.isTarget?'Ziel':(p.name||`Wetterpunkt ${i+1}`);return `<div class="fp1068-route-row"><div><b>${fp1068Esc(label)}</b><span class="fp1068-small">${fp1068FmtDistance(p.distanceFromNowKm,profile)} voraus</span></div><div><b>ETA ${fp1068Esc(fp1068FmtEta(p.eta))}</b><span class="fp1068-small">${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</span></div><div>${w?`<b>${fp1068Esc(fp1068WeatherText(w.code))} · ${Math.round(Number(w.temp))} °C</b><span class="fp1068-small">Wind ${Math.round(Number(w.wind))} · Böen ${Math.round(Number(w.gust))} km/h · Regen ${Math.round(Number(w.pop))}%</span>`:`<b>Wetter noch nicht verfügbar</b><span class="fp1068-small">${fp1068Esc(p.weatherError||'ETA außerhalb des verfügbaren Prognosefensters')}</span>`}</div></div>`}).join('')}`;
  }catch(e){host.innerHTML=`<div class="status-warn"><b>Routenwetter nicht verfügbar.</b><div>${fp1068Esc(e.message)}</div></div>`}
}
fp1068BuildRouteWeather=fp1069BuildWeather;

function fp1069RuleEditorHtml(usage,profile,userRule){const f=usage.fields||{},r=fp1068RuleFromFields(f,profile,userRule);return `<div class="section">Persönliche Wetterlogik</div><div class="fp1068-inline"><div class="field"><label>Wetterpunkte</label><select id="fp1068RuleType" onchange="fp1068RuleTypeChanged()"><option value="distance" ${r.type==='distance'?'selected':''}>nach Strecke</option><option value="time" ${r.type==='time'?'selected':''}>nach Zeit / Position</option></select></div><div class="field"><label>Intervall</label><input id="fp1068RuleValue" type="number" min="0.05" step="0.1" value="${r.value}"></div><div class="field"><label>Einheit</label><select id="fp1068RuleUnit">${r.type==='time'?'<option value="h">Stunden</option>':`<option value="km" ${r.unit==='km'?'selected':''}>km</option><option value="sm" ${r.unit==='sm'?'selected':''}>sm</option>`}</select></div></div><div class="fp1068-inline"><div class="field"><label>Abweichungshinweis ab</label><input id="fp1068DevValue" type="number" min="0" step="0.1" value="${Number(r.devValue).toFixed(r.devValue<10?1:0)}"></div><div class="field"><label>Einheit</label><select id="fp1068DevUnit"><option value="m">m</option><option value="km" ${r.devUnit==='km'?'selected':''}>km</option><option value="sm" ${r.devUnit==='sm'?'selected':''}>sm</option></select></div><button onclick="fp1069SaveRule('${usage.id}')">Wetterlogik speichern</button></div>`}

function fp1069SegmentMeta(seg,route,profile,index){const g=route?fp1068RouteGeom(route):null,a=route?.points?.[0],b=route?.points?.[route.points.length-1],start=seg.fields.GeplanterStart1069;return `<div><b>${index}. ${fp1068Esc(seg.fields.Abschnittsname1069||seg.fields.Title||'Routenabschnitt')}</b><div class="muted">${a?fp1068Esc(a.name||fp1069CoordLabel(a)):'–'} → ${b?fp1068Esc(b.name||fp1069CoordLabel(b)):'–'}${g?` · ${fp1068FmtDistance(g.totalM/1000,profile)}`:''}${start?` · geplant ${fp1068Esc(fp1068FmtEta(start))}`:''}${seg.fields.IstAktiv1069?' · AKTUELL':''}</div></div>`}

async function fp1069AppendRouteCard(usageId,active=false){
  try{
    const ctx=await fp1068LoadUsageContext(usageId),api=await getCloud(),segments=await fp1069Segments(usageId,true),overview=ctx.overview,og=overview?fp1068RouteGeom(overview):null,selected=active?(segments.find(x=>x.fields.IstAktiv1069===true)||segments[0]||null):(segments.find(x=>fp1069Id(x.id)===fp1069SelectedSegmentId(usageId))||segments[0]||null);if(selected)fp1069RememberSegment(usageId,selected.id);const selectedRoute=fp1069SegmentRoute(selected),card=document.createElement('div');card.className='card';card.id='fp1068-route-card';
    const planning=!active;
    card.innerHTML=`<div class="section first">Route · ETA · Wetter</div><p class="muted"><b>MOBIMORY routet nicht.</b> Vorhandene Navigation liefert die GPX-Geometrie. MOBIMORY nutzt sie für Planung, Logbuch, ETA, Wetter und Soll/Ist-Auswertung.</p>
      ${planning?`<div class="section">Grobroute gesamt <span class="muted">optional</span></div><p class="muted">Die Grobroute ist nur der Rahmen der gesamten Reise/Nutzung. Sie wird nicht als operative Wetterroute verwendet.</p><div class="fp1068-gpx"><label><b>Gesamt-/Grobroute als GPX importieren oder ersetzen</b></label><input type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" onchange="fp1069ImportOverviewGpx(this,'${usageId}')"></div>${overview?`<div class="fp1068-route-meta"><span>${fp1068Esc(ctx.usage.fields.GPXDateiname1068||overview.file||'Grobroute')}</span><span>${overview.points.length} Stützpunkte</span><span>${fp1068FmtDistance(og.totalM/1000,ctx.profile)}</span><button class="danger-lite" onclick="fp1069RemoveOverviewGpx('${usageId}')">Grobroute entfernen</button></div>`:'<div class="muted">Keine Grobroute hinterlegt.</div>'}`:''}
      <div class="section">Routenabschnitte</div><p class="muted">Ein Abschnitt reicht von seinem Start bis zu seinem Ziel und kann eine Stunde, einen Tag oder mehrere Tage umfassen. Jeder Abschnitt kann eine eigene GPX-Datei haben.</p>
      ${planning?`<div class="fp1068-gpx"><label><b>GPX als neuen Routenabschnitt hinzufügen</b></label><input type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" onchange="fp1069ImportSegmentGpx(this,'${usageId}')"></div>`:''}
      <div id="fp1069Segments">${segments.map((s,i)=>{const r=fp1069SegmentRoute(s),sel=selected&&fp1069Id(selected.id)===fp1069Id(s.id);return `<div class="line" style="align-items:flex-start"><div style="flex:1">${fp1069SegmentMeta(s,r,ctx.profile,i+1)}<div class="fp1068-inline" style="margin-top:.4rem">${planning?`<button ${sel?'class="primary"':''} onclick="fp1069SelectSegment('${usageId}','${s.id}')">${sel?'Wettervorschau gewählt':'Wettervorschau'}</button>`:''}${fp1069IsUsageActive(ctx.usage)?`<button ${s.fields.IstAktiv1069?'class="primary"':''} onclick="fp1069SetCurrentSegment('${usageId}','${s.id}')">${s.fields.IstAktiv1069?'Aktueller Abschnitt':'Für aktuelle Fahrt verwenden'}</button>`:''}${planning?`<button onclick="fp1069RenameSegment('${usageId}','${s.id}')">Name</button><button onclick="fp1069MoveSegment('${usageId}','${s.id}',-1)" ${i===0?'disabled':''}>↑</button><button onclick="fp1069MoveSegment('${usageId}','${s.id}',1)" ${i===segments.length-1?'disabled':''}>↓</button><button class="danger-lite" onclick="fp1069DeleteSegment('${usageId}','${s.id}')">Löschen</button>`:''}</div></div></div>`}).join('')||'<div class="status-warn"><b>Noch kein Routenabschnitt.</b><div>Für ETA und Routenwetter zuerst mindestens einen GPX-Routenabschnitt hinzufügen.</div></div>'}</div>
      ${fp1069RuleEditorHtml(ctx.usage,ctx.profile,ctx.userRule)}
      ${selected&&selectedRoute&&!active?`<div class="section">Vorstart-Wettervorschau</div><p class="muted">Startzeit frei wählen. Vor dem Start rechnet MOBIMORY mit V Reise aus den Fahrzeug-Stammdaten. So lassen sich unterschiedliche Wetterfenster derselben Strecke prüfen.</p><div class="fp1068-inline"><div class="field"><label>Startzeit für die Vorschau</label><input id="fp1069CalcStart" type="datetime-local" value="${fp1068Esc(fp1068LocalInput(FP1069.previewStart[fp1069Id(usageId)]||selected.fields.GeplanterStart1069||ctx.usage.fields.GeplanterBeginn||ctx.usage.fields.Beginn||new Date().toISOString()))}"></div><button onclick="fp1069ShiftPreviewStart('${usageId}',-1)">−1 h</button><button onclick="fp1069ShiftPreviewStart('${usageId}',1)">+1 h</button><button class="primary" onclick="fp1069PreviewForInput('${usageId}')">Wetter für diese Startzeit</button><button onclick="fp1069SavePreviewStart('${usageId}','${selected.id}')">Als geplante Startzeit speichern</button></div>`:''}
      <div id="fp1068ForecastRows"></div>`;
    const target=app.querySelector('.card');if(target)target.insertAdjacentElement('afterend',card);else app.appendChild(card);if(selected&&selectedRoute)fp1069BuildWeather(usageId,active);
  }catch(e){console.warn('Route card 1.0.6.9',e)}
}
fp1068AppendRouteCard=fp1069AppendRouteCard;

/* -------------------------------------------------------------------------- */
/* Live-Tracker: GPS bleibt Nutzungsebene; Route/Abweichung = aktueller Abschnitt */
/* -------------------------------------------------------------------------- */
const fp1069StartTrackerBase=fp1068StartTracker;
fp1068StartTracker=async function(usageId){return fp1069StartTrackerBase(usageId)};

/* -------------------------------------------------------------------------- */
/* Sichtbare Version                                                          */
/* -------------------------------------------------------------------------- */
main=function(){S.stack=[];head('MOBIMORY','Phase 1 · '+FP1069_VERSION);app.innerHTML=`<div class="home-brand">${typeof mobiIcon==='function'?mobiIcon():''}${typeof brandHeadline==='function'?brandHeadline():''}</div><div class="grid"><button class="menu" onclick="go('start')"><b>Start</b><span class="muted">Nutzung, Cockpit, Planung & Historie</span></button><button class="menu" onclick="go('configuration')"><b>Konfiguration</b><span class="muted">Fahrzeuge, Personen, Tiere, Orte, Reisegrundlagen</span></button><button class="menu" onclick="go('workshop')"><b>Werkstatt</b><span class="muted">Störungen, Wartung, Arbeiten und Aufgaben</span></button><button class="menu" onclick="go('lending')"><b>Verleihmodus</b><span class="muted">Gruppen, Qualifikationen und Rechte</span></button><button class="menu" onclick="go('settings')"><b>Einstellungen / Daten</b><span class="muted">M365, Testmodus, Export</span></button></div>`};

document.title=`Fahrzeugplattform ${FP1069_VERSION}`;const fp1069Foot=document.querySelector('footer');if(fp1069Foot)fp1069Foot.textContent=`Fahrzeugplattform · ${FP1069_VERSION} · © 2026 Entwicklungsstand`;try{render()}catch(e){console.warn(e)}
