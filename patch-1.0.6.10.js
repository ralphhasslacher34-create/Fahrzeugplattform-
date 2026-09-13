/* MOBIMORY 1.0.6.10-dev – BLOCK 1 UI-ORDNUNG + TESTBARE ROUTENANSICHT
   Ziel: Skipper-/Fahrer-Workflow statt verstreuter Funktionskarten.
   - ausgewählter/aktueller Routenabschnitt steht oben und ist direkt "öffnbar"
   - echte Kartenansicht (OpenStreetMap/Leaflet) mit GPX-Linie, Start/Ziel, Wetterpunkten, Live-GPS
     plus SVG-Fallback, falls Kartenbibliothek/Tiles nicht verfügbar sind
   - Vorstart-Wetterfenster sitzt direkt bei Karte + ETA/Wetter und ist auch bei aktiver Nutzung testbar
   - Routenabschnitte, GPX-Import, manuelle Abschnitte/Wegpunkte und Grobroute logisch gebündelt
   - keine Routing- oder Kurskorrektur-Anweisung; nur Hinweis "Route/Kurs überprüfen"
*/

const FP10610_VERSION='1.0.6.10-dev';
const FP10610={leafletPromise:null,maps:{},weatherGeom:{}};

(function fp10610Style(){
  if(document.getElementById('fp10610-style'))return;
  const s=document.createElement('style');s.id='fp10610-style';s.textContent=`
  .fp10610-route-card{padding:0;overflow:hidden}
  .fp10610-route-head{display:flex;gap:.7rem;align-items:flex-start;justify-content:space-between;padding:1rem 1rem .7rem;border-bottom:1px solid rgba(120,120,120,.2)}
  .fp10610-route-head h3{margin:0;font-size:1.1rem}.fp10610-route-head .muted{margin-top:.2rem}
  .fp10610-badge{display:inline-flex;align-items:center;border:1px solid currentColor;border-radius:999px;padding:.22rem .55rem;font-size:.78rem;white-space:nowrap;opacity:.8}
  .fp10610-focus{padding:1rem;background:rgba(80,120,180,.07)}
  .fp10610-focus-title{display:flex;gap:.6rem;align-items:flex-start;justify-content:space-between;margin-bottom:.65rem}
  .fp10610-focus-title b{font-size:1.05rem}
  .fp10610-map{height:min(48vh,430px);min-height:280px;border-radius:14px;overflow:hidden;border:1px solid rgba(120,120,120,.25);background:linear-gradient(180deg,rgba(80,130,190,.08),rgba(80,130,190,.02));position:relative}
  .fp10610-map svg{width:100%;height:100%;display:block}
  .fp10610-map-note{position:absolute;left:.6rem;bottom:.55rem;background:rgba(255,255,255,.88);color:#222;border-radius:8px;padding:.25rem .45rem;font-size:.72rem;z-index:500}
  .fp10610-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.5rem;margin-top:.65rem}
  .fp10610-kpi{border:1px solid rgba(120,120,120,.22);border-radius:11px;padding:.55rem .65rem;min-width:0}
  .fp10610-kpi span{display:block;font-size:.73rem;opacity:.68}.fp10610-kpi b{display:block;margin-top:.12rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .fp10610-sim{margin-top:.8rem;padding:.7rem;border-radius:12px;border:1px solid rgba(120,120,120,.22)}
  .fp10610-sim-grid{display:grid;grid-template-columns:minmax(190px,1fr) auto;gap:.55rem;align-items:end}
  .fp10610-sim-buttons{display:flex;gap:.4rem;flex-wrap:wrap}
  .fp10610-forecast{margin-top:.7rem}
  .fp10610-tools{padding:.8rem 1rem 1rem}
  .fp10610-tools details{border-top:1px solid rgba(120,120,120,.2);padding:.7rem 0}
  .fp10610-tools summary{cursor:pointer;font-weight:700;display:flex;align-items:center;gap:.45rem}
  .fp10610-tools summary small{font-weight:400;opacity:.65}
  .fp10610-segment{border:1px solid rgba(120,120,120,.22);border-radius:12px;padding:.7rem;margin:.55rem 0}
  .fp10610-segment.selected{border-width:2px;background:rgba(80,120,180,.06)}
  .fp10610-segment-actions{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.55rem}
  .fp10610-waypoints{display:grid;gap:.35rem;margin-top:.55rem}
  .fp10610-waypoint{display:flex;gap:.5rem;align-items:center;justify-content:space-between;border-bottom:1px dashed rgba(120,120,120,.25);padding:.35rem 0}
  .fp10610-waypoint:last-child{border-bottom:0}
  .fp10610-waypoint .coords{font-size:.75rem;opacity:.65}
  .leaflet-container{font:inherit}
  @media(max-width:720px){.fp10610-sim-grid{grid-template-columns:1fr}.fp10610-map{min-height:250px;height:38vh}.fp10610-route-head{align-items:flex-start}.fp10610-kpis{grid-template-columns:1fr 1fr}}
  `;document.head.appendChild(s);
})();

function fp10610Esc(v){return typeof fp1068Esc==='function'?fp1068Esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function fp10610SegmentName(s){return String(s?.fields?.Abschnittsname1069||s?.fields?.Title||'Routenabschnitt')}
function fp10610RouteEnds(route){return {a:route?.points?.[0]||null,b:route?.points?.[route?.points?.length-1]||null}}
function fp10610PointLabel(p,fallback){return String(p?.name||fallback||fp1069CoordLabel(p)||'')}

async function fp10610LoadLeaflet(){
  if(window.L)return window.L;
  if(FP10610.leafletPromise)return FP10610.leafletPromise;
  FP10610.leafletPromise=new Promise((resolve,reject)=>{
    if(!document.querySelector('link[data-fp10610-leaflet]')){const l=document.createElement('link');l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';l.dataset.fp10610Leaflet='1';document.head.appendChild(l)}
    const old=document.querySelector('script[data-fp10610-leaflet]');if(old){old.addEventListener('load',()=>resolve(window.L));old.addEventListener('error',reject);return}
    const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.async=true;s.dataset.fp10610Leaflet='1';s.onload=()=>window.L?resolve(window.L):reject(new Error('Leaflet nicht verfügbar'));s.onerror=()=>reject(new Error('Kartenbibliothek konnte nicht geladen werden'));document.head.appendChild(s)
  });
  return FP10610.leafletPromise;
}

function fp10610SvgFallback(host,route,weatherPoints,currentPos){
  const pts=[...(route?.points||[])];if(currentPos)pts.push(currentPos);if(!pts.length){host.innerHTML='<div class="muted" style="padding:1rem">Keine Routengeometrie vorhanden.</div>';return}
  const mid=pts.reduce((a,p)=>a+p.lat,0)/pts.length,cos=Math.max(.15,Math.cos(mid*Math.PI/180));
  const xs=pts.map(p=>p.lon*cos),ys=pts.map(p=>p.lat),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),dx=Math.max(1e-6,maxX-minX),dy=Math.max(1e-6,maxY-minY),W=1000,H=500,pad=42;
  const xy=p=>({x:pad+(p.lon*cos-minX)/dx*(W-2*pad),y:H-pad-(p.lat-minY)/dy*(H-2*pad)}),line=(route.points||[]).map(p=>{const q=xy(p);return `${q.x.toFixed(1)},${q.y.toFixed(1)}`}).join(' '),a=route.points[0],b=route.points[route.points.length-1],qa=xy(a),qb=xy(b);
  const wm=(weatherPoints||[]).map((p,i)=>{const q=xy(p);return `<g><circle cx="${q.x}" cy="${q.y}" r="9" fill="#f59e0b" stroke="white" stroke-width="3"><title>${fp10610Esc(p.isTarget?'Ziel':(p.name||'Wetterpunkt '+(i+1)))}</title></circle></g>`}).join('');
  const cp=currentPos?xy(currentPos):null;
  host.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="GPX-Routengrafik"><defs><pattern id="fp10610grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M100 0H0V100" fill="none" stroke="rgba(80,100,120,.16)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#fp10610grid)"/><polyline points="${line}" fill="none" stroke="#2563eb" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${qa.x}" cy="${qa.y}" r="12" fill="#16a34a" stroke="white" stroke-width="4"><title>Start</title></circle><circle cx="${qb.x}" cy="${qb.y}" r="12" fill="#111827" stroke="white" stroke-width="4"><title>Ziel</title></circle>${wm}${cp?`<circle cx="${cp.x}" cy="${cp.y}" r="12" fill="#dc2626" stroke="white" stroke-width="4"><title>Aktuelle GPS-Position</title></circle>`:''}</svg><div class="fp10610-map-note">GPX-Streckenkarte · Kartenhintergrund nicht geladen</div>`;
}

async function fp10610WeatherGeometry(usageId,active){
  try{const ctx=await fp1068LoadUsageContext(usageId);if(!ctx?.route)return[];const speed=fp1068EffectiveSpeed(ctx,active);if(!(speed?.kmh>0))return[];const rule=fp1068RuleFromFields(ctx.usage.fields,ctx.profile,ctx.userRule);let startAlong=0,startTime=new Date((!active&&FP1069.previewStart[fp1069Id(usageId)])||ctx.segment?.fields?.GeplanterStart1069||ctx.usage.fields.GeplanterBeginn||ctx.usage.fields.Beginn||Date.now());if(active&&FP1068.lastPos){const pr=fp1068Project(ctx.route,FP1068.lastPos);startAlong=pr.alongM;startTime=new Date()}return fp1068WeatherPoints(ctx.route,startAlong,startTime,speed.kmh,rule)}catch{return[]}
}

async function fp10610RenderMap(usageId,active=false){
  const host=document.getElementById('fp10610RouteMap');if(!host)return;
  try{
    const ctx=await fp1068LoadUsageContext(usageId),route=ctx?.route;if(!route?.points?.length){host.innerHTML='<div class="muted" style="padding:1rem">Abschnitt enthält noch keine Route.</div>';return}
    const weatherPoints=await fp10610WeatherGeometry(usageId,active),currentPos=active&&FP1068.lastPos?FP1068.lastPos:null;
    try{
      const L=await fp10610LoadLeaflet();if(!document.body.contains(host))return;
      const old=FP10610.maps[host.id];if(old){try{old.remove()}catch{}delete FP10610.maps[host.id]}
      host.innerHTML='';const map=L.map(host,{zoomControl:true,attributionControl:true});FP10610.maps[host.id]=map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
      const latlngs=route.points.map(p=>[p.lat,p.lon]);const poly=L.polyline(latlngs,{weight:5,opacity:.85}).addTo(map);const e=fp10610RouteEnds(route);
      L.circleMarker([e.a.lat,e.a.lon],{radius:8,weight:3,fillOpacity:1}).bindTooltip('Start: '+fp10610PointLabel(e.a,'Start')).addTo(map);
      L.circleMarker([e.b.lat,e.b.lon],{radius:8,weight:3,fillOpacity:1}).bindTooltip('Ziel: '+fp10610PointLabel(e.b,'Ziel')).addTo(map);
      for(const p of weatherPoints){L.circleMarker([p.lat,p.lon],{radius:p.isTarget?8:6,weight:2,fillOpacity:.9}).bindTooltip((p.isTarget?'Ziel':'Wetterpunkt')+' · ETA '+fp1068FmtEta(p.eta)).addTo(map)}
      if(currentPos)L.circleMarker([currentPos.lat,currentPos.lon],{radius:9,weight:3,fillOpacity:1}).bindTooltip('Aktuelle GPS-Position').addTo(map);
      map.fitBounds(poly.getBounds().pad(.08),{animate:false});setTimeout(()=>{try{map.invalidateSize()}catch{}},80);
    }catch(e){console.warn('Leaflet-Fallback',e);fp10610SvgFallback(host,route,weatherPoints,currentPos)}
  }catch(e){host.innerHTML=`<div class="status-warn" style="margin:1rem"><b>Streckenkarte nicht verfügbar.</b><div>${fp10610Esc(e.message)}</div></div>`}
}

const fp10610BuildWeatherBase=fp1069BuildWeather;
fp1069BuildWeather=async function(usageId,active=false,hostId='fp1068ForecastRows'){
  await fp10610BuildWeatherBase(usageId,active,hostId);await fp10610RenderMap(usageId,active)
};
fp1068BuildRouteWeather=fp1069BuildWeather;

async function fp10610OpenSegment(usageId,segmentId){fp1069RememberSegment(usageId,segmentId);fp1069ClearUsageCache(usageId);await fp1068RefreshCurrentView();setTimeout(()=>document.getElementById('fp10610RouteMap')?.scrollIntoView({behavior:'smooth',block:'center'}),120)}
async function fp10610LiveWeather(usageId){await fp1069BuildWeather(usageId,true)}

function fp10610NumPrompt(label,initial=''){const v=prompt(label,initial);if(v==null)return null;const n=Number(String(v).trim().replace(',','.'));return Number.isFinite(n)?n:NaN}
function fp10610ValidateCoord(lat,lon){return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180}

async function fp10610CreateManualSegment(usageId){
  try{
    const rows=await fp1069Segments(usageId,true),u=(await getCloud()).getItemByName?await (await getCloud()).getItemByName('Nutzungen',usageId):null,sort=(rows.reduce((m,x)=>Math.max(m,Number(x.fields.Sortierung)||0),0)||0)+1;
    const name=(prompt('Name des Routenabschnitts',`Abschnitt ${sort}`)||'').trim();if(!name)return;
    const startName=(prompt('Bezeichnung Startpunkt','Start')||'Start').trim(),slat=fp10610NumPrompt('Breitengrad Start'),slon=fp10610NumPrompt('Längengrad Start');if(!fp10610ValidateCoord(slat,slon))return alert('Start-Koordinaten sind ungültig.');
    const goalName=(prompt('Bezeichnung Zielpunkt','Ziel')||'Ziel').trim(),glat=fp10610NumPrompt('Breitengrad Ziel'),glon=fp10610NumPrompt('Längengrad Ziel');if(!fp10610ValidateCoord(glat,glon))return alert('Ziel-Koordinaten sind ungültig.');
    const parsed={type:'Wegpunkte',originalCount:2,points:[{lat:slat,lon:slon,name:startName},{lat:glat,lon:glon,name:goalName}]},api=await getCloud(),makeCurrent=fp1069IsUsageActive(u)&&!rows.some(x=>x.fields.IstAktiv1069===true),created=await api.createItemByName('NutzungsRoutenabschnitte',{Title:name,NutzungId:fp1069Id(usageId),Sortierung:sort,Abschnittsname1069:name,GPXRouteJson1069:fp1068PackRoute(parsed,'manuell'),GPXDateiname1069:'manuell',GPXImportiertAm1069:new Date().toISOString(),GeplanterStart1069:rows.length?null:(u?.fields?.GeplanterBeginn||null),IstAktiv1069:makeCurrent,Aktiv:true,Testdaten:testFlag()});
    const id=created?.id||created?.Id||created?.fields?.id||'';if(id)fp1069RememberSegment(usageId,id);fp1069ClearUsageCache(usageId);await fp1068RefreshCurrentView()
  }catch(e){alert('Manueller Routenabschnitt konnte nicht angelegt werden: '+e.message)}
}

function fp10610BestInsertIndex(route,p){let best=1,cost=Infinity;for(let i=0;i<route.points.length-1;i++){const a=route.points[i],b=route.points[i+1],c=fp1068DistM(a,p)+fp1068DistM(p,b)-fp1068DistM(a,b);if(c<cost){cost=c;best=i+1}}return best}
async function fp10610SaveRoute(usageId,segmentId,route){const api=await getCloud(),parsed={type:route.type||'Route',originalCount:route.points.length,points:route.points};await api.updateItemByName('NutzungsRoutenabschnitte',segmentId,{GPXRouteJson1069:fp1068PackRoute(parsed,route.file||'manuell'),GPXImportiertAm1069:new Date().toISOString()});fp1069RememberSegment(usageId,segmentId);fp1069ClearUsageCache(usageId);await fp1068RefreshCurrentView()}
async function fp10610AddWaypoint(usageId,segmentId){
  try{const rows=await fp1069Segments(usageId,true),s=rows.find(x=>fp1069Id(x.id)===fp1069Id(segmentId)),route=fp1069SegmentRoute(s);if(!route)return alert('Der Abschnitt enthält noch keine Route.');const name=(prompt('Bezeichnung des Wegpunkts','Wegpunkt')||'').trim();if(!name)return;const lat=fp10610NumPrompt('Breitengrad'),lon=fp10610NumPrompt('Längengrad');if(!fp10610ValidateCoord(lat,lon))return alert('Koordinaten sind ungültig.');const p={lat,lon,name},idx=fp10610BestInsertIndex(route,p);route.points.splice(idx,0,p);await fp10610SaveRoute(usageId,segmentId,route)}catch(e){alert('Wegpunkt konnte nicht hinzugefügt werden: '+e.message)}
}
async function fp10610EditWaypoint(usageId,segmentId,index){
  try{const rows=await fp1069Segments(usageId,true),s=rows.find(x=>fp1069Id(x.id)===fp1069Id(segmentId)),route=fp1069SegmentRoute(s),p=route?.points?.[index];if(!p)return;const name=prompt('Bezeichnung',p.name||'');if(name==null)return;const lat=fp10610NumPrompt('Breitengrad',String(p.lat)),lon=fp10610NumPrompt('Längengrad',String(p.lon));if(!fp10610ValidateCoord(lat,lon))return alert('Koordinaten sind ungültig.');route.points[index]={lat,lon,name:name.trim()};await fp10610SaveRoute(usageId,segmentId,route)}catch(e){alert(e.message)}
}
async function fp10610DeleteWaypoint(usageId,segmentId,index){
  try{const rows=await fp1069Segments(usageId,true),s=rows.find(x=>fp1069Id(x.id)===fp1069Id(segmentId)),route=fp1069SegmentRoute(s);if(!route||index<=0||index>=route.points.length-1)return;if(!confirm('Diesen Wegpunkt aus dem Abschnitt entfernen?'))return;route.points.splice(index,1);await fp10610SaveRoute(usageId,segmentId,route)}catch(e){alert(e.message)}
}

function fp10610WaypointManagerHtml(usageId,seg,route){if(!seg||!route)return'';const visible=route.points.map((p,i)=>({p,i})).filter(x=>x.i===0||x.i===route.points.length-1||x.p.name);return `<div class="fp10610-waypoints">${visible.map(({p,i})=>`<div class="fp10610-waypoint"><div><b>${fp10610Esc(i===0?'Start · '+fp10610PointLabel(p,'Start'):i===route.points.length-1?'Ziel · '+fp10610PointLabel(p,'Ziel'):fp10610PointLabel(p,'Wegpunkt'))}</b><div class="coords">${Number(p.lat).toFixed(5)}, ${Number(p.lon).toFixed(5)}</div></div><div class="fp10610-segment-actions"><button onclick="fp10610EditWaypoint('${usageId}','${seg.id}',${i})">Bearbeiten</button>${i>0&&i<route.points.length-1?`<button class="danger-lite" onclick="fp10610DeleteWaypoint('${usageId}','${seg.id}',${i})">Entfernen</button>`:''}</div></div>`).join('')}</div><div class="fp10610-segment-actions"><button onclick="fp10610AddWaypoint('${usageId}','${seg.id}')">+ Wegpunkt manuell hinzufügen</button></div>`}

async function fp10610AppendRouteCard(usageId,active=false){
  try{
    const ctx=await fp1068LoadUsageContext(usageId),segments=await fp1069Segments(usageId,true),overview=ctx.overview,og=overview?fp1068RouteGeom(overview):null;
    let selected=active?(segments.find(x=>x.fields.IstAktiv1069===true)||segments.find(x=>fp1069Id(x.id)===fp1069SelectedSegmentId(usageId))||segments[0]||null):(segments.find(x=>fp1069Id(x.id)===fp1069SelectedSegmentId(usageId))||segments[0]||null);if(selected)fp1069RememberSegment(usageId,selected.id);
    const route=fp1069SegmentRoute(selected),g=route?fp1068RouteGeom(route):null,e=fp10610RouteEnds(route),planning=!active,unit=fp1068SpeedUnit(ctx.vehicle.fields),vPlan=fp1068KmhToUnit(fp1068Num(ctx.vehicle.fields.VReiseKmh1068),unit),vHist=fp1068KmhToUnit(fp1068Num(ctx.vehicle.fields.VReiseHistorieKmh1068),unit),startValue=selected?fp1068LocalInput(FP1069.previewStart[fp1069Id(usageId)]||selected.fields.GeplanterStart1069||ctx.usage.fields.GeplanterBeginn||ctx.usage.fields.Beginn||new Date().toISOString()):'';
    const old=document.getElementById('fp1068-route-card');if(old)old.remove();const card=document.createElement('div');card.className='card fp10610-route-card';card.id='fp1068-route-card';
    card.innerHTML=`<div class="fp10610-route-head"><div><h3>${active?'Unterwegs · Route & Wetter':'Planung · Route & Wetter'}</h3><div class="muted">GPX liefert den Weg. MOBIMORY berechnet ETA, Wetter und Soll/Ist – ohne selbst zu routen.</div></div><span class="fp10610-badge">Block 1 · ${FP10610_VERSION}</span></div>
      <div class="fp10610-focus">
        ${selected&&route?`<div class="fp10610-focus-title"><div><span class="muted">${active?'Aktueller':'Ausgewählter'} Routenabschnitt</span><br><b>${fp10610Esc(fp10610SegmentName(selected))}</b><div class="muted">${fp10610Esc(fp10610PointLabel(e.a,'Start'))} → ${fp10610Esc(fp10610PointLabel(e.b,'Ziel'))}</div></div>${selected.fields.IstAktiv1069?'<span class="fp10610-badge">AKTUELL</span>':''}</div>
        <div id="fp10610RouteMap" class="fp10610-map"><div class="muted" style="padding:1rem">Streckenkarte wird geladen …</div></div>
        <div class="fp10610-kpis"><div class="fp10610-kpi"><span>Abschnitt</span><b>${g?fp1068FmtDistance(g.totalM/1000,ctx.profile):'–'}</b></div><div class="fp10610-kpi"><span>V Reise Planung</span><b>${vPlan==null?'–':vPlan.toFixed(1)+' '+unit}</b></div><div class="fp10610-kpi"><span>V Reise Historie</span><b>${vHist==null?'–':vHist.toFixed(1)+' '+unit}</b></div><div class="fp10610-kpi"><span>Routenstützpunkte</span><b>${route.points.length}</b></div></div>
        <div class="fp10610-sim"><b>Wetterfenster vorab prüfen</b><div class="muted">Fiktive Startzeit – ändert die reale Fahrt nicht.</div><div class="fp10610-sim-grid"><div class="field"><label>Startzeit</label><input id="fp1069CalcStart" type="datetime-local" value="${fp10610Esc(startValue)}"></div><div class="fp10610-sim-buttons"><button onclick="fp1069ShiftPreviewStart('${usageId}',-1)">−1 h</button><button onclick="fp1069ShiftPreviewStart('${usageId}',1)">+1 h</button><button class="primary" onclick="fp1069PreviewForInput('${usageId}')">Wetter berechnen</button>${active?`<button onclick="fp10610LiveWeather('${usageId}')">Zurück zu Live</button>`:''}<button onclick="fp1069SavePreviewStart('${usageId}','${selected.id}')">Startzeit speichern</button></div></div></div>
        <div id="fp1068ForecastRows" class="fp10610-forecast"></div>`:`<div class="status-warn"><b>Noch kein Routenabschnitt.</b><div>GPX importieren oder einen Abschnitt manuell anlegen. Danach erscheinen hier sofort Karte, ETA und Wettervorschau.</div></div>`}
      </div>
      <div class="fp10610-tools">
        <details open><summary>Routenabschnitte <small>${segments.length} vorhanden</small></summary>
          <div class="fp10610-segment-actions" style="margin:.7rem 0">${planning?`<label class="button-like"><b>+ GPX-Abschnitt importieren</b><input style="display:block;margin-top:.35rem" type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" onchange="fp1069ImportSegmentGpx(this,'${usageId}')"></label><button onclick="fp10610CreateManualSegment('${usageId}')">+ Abschnitt manuell anlegen</button>`:''}</div>
          ${segments.map((s,i)=>{const r=fp1069SegmentRoute(s),sel=selected&&fp1069Id(selected.id)===fp1069Id(s.id);return `<div class="fp10610-segment ${sel?'selected':''}">${fp1069SegmentMeta(s,r,ctx.profile,i+1)}<div class="fp10610-segment-actions"><button ${sel?'class="primary"':''} onclick="fp10610OpenSegment('${usageId}','${s.id}')">${sel?'Geöffnet':'Öffnen'}</button>${fp1069IsUsageActive(ctx.usage)?`<button ${s.fields.IstAktiv1069?'class="primary"':''} onclick="fp1069SetCurrentSegment('${usageId}','${s.id}')">${s.fields.IstAktiv1069?'Aktueller Abschnitt':'Für Fahrt verwenden'}</button>`:''}${planning?`<button onclick="fp1069RenameSegment('${usageId}','${s.id}')">Name</button><button onclick="fp1069MoveSegment('${usageId}','${s.id}',-1)" ${i===0?'disabled':''}>↑</button><button onclick="fp1069MoveSegment('${usageId}','${s.id}',1)" ${i===segments.length-1?'disabled':''}>↓</button><button class="danger-lite" onclick="fp1069DeleteSegment('${usageId}','${s.id}')">Löschen</button>`:''}</div></div>`}).join('')||'<div class="muted">Noch keine Abschnitte.</div>'}
        </details>
        ${selected&&route?`<details><summary>Wegpunkte <small>GPX-Namen + manuelle Punkte</small></summary>${fp10610WaypointManagerHtml(usageId,selected,route)}</details>`:''}
        <details open><summary>Wetterregel <small>persönlich · jederzeit änderbar</small></summary>${fp1069RuleEditorHtml(ctx.usage,ctx.profile,ctx.userRule)}</details>
        ${planning?`<details><summary>Gesamt-/Grobroute <small>optional · nur Planungsrahmen</small></summary><p class="muted">Die Grobroute dient nur der Gesamtübersicht. Operative ETA und Wetter laufen auf dem geöffneten Abschnitt.</p><div class="fp1068-gpx"><label><b>Grobroute als GPX importieren oder ersetzen</b></label><input type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" onchange="fp1069ImportOverviewGpx(this,'${usageId}')"></div>${overview?`<div class="fp1068-route-meta"><span>${fp10610Esc(ctx.usage.fields.GPXDateiname1068||overview.file||'Grobroute')}</span><span>${overview.points.length} Stützpunkte</span><span>${fp1068FmtDistance(og.totalM/1000,ctx.profile)}</span><button class="danger-lite" onclick="fp1069RemoveOverviewGpx('${usageId}')">Entfernen</button></div>`:'<div class="muted">Keine Grobroute hinterlegt.</div>'}</details>`:''}
      </div>`;
    if(active){const speed=document.getElementById('fp1068-speed-card');if(speed)speed.insertAdjacentElement('afterend',card);else app.prepend(card)}else{const first=app.querySelector('.card');if(first)first.insertAdjacentElement('afterend',card);else app.prepend(card)}
    if(selected&&route){await fp10610RenderMap(usageId,active);await fp1069BuildWeather(usageId,active)}
  }catch(e){console.warn('Route UI 1.0.6.10',e);const x=document.createElement('div');x.className='card status-warn';x.innerHTML=`<b>Route & Wetter konnten nicht geöffnet werden.</b><div>${fp10610Esc(e.message)}</div>`;app.prepend(x)}
}
fp1068AppendRouteCard=fp10610AppendRouteCard;
fp1069AppendRouteCard=fp10610AppendRouteCard;

/* Cockpit: GPS-Speedometer und Route/Wetter direkt nacheinander. */
const fp10610CockpitBase=fp1068CockpitBase;
cockpit=async function(){await fp10610CockpitBase();const usageId=String(S.usage?.cloudId||'');if(!usageId)return;await fp1068AppendSpeedometer(usageId);await fp10610AppendRouteCard(usageId,true)};

/* Wetteransicht behält manuelle Wettererfassung, zeigt Route/Wetter kompakt direkt oben dazu. */
const fp10610WeatherBase=fp1068WeatherBase;
weather=async function(){await fp10610WeatherBase();const usageId=String(S.usage?.cloudId||'');if(usageId)await fp10610AppendRouteCard(usageId,true)};

/* sichtbare Version */
main=function(){S.stack=[];head('MOBIMORY','Phase 1 · '+FP10610_VERSION);app.innerHTML=`<div class="home-brand">${typeof mobiIcon==='function'?mobiIcon():''}${typeof brandHeadline==='function'?brandHeadline():''}</div><div class="grid"><button class="menu" onclick="go('start')"><b>Start</b><span class="muted">Nutzung, Cockpit, Planung & Historie</span></button><button class="menu" onclick="go('configuration')"><b>Konfiguration</b><span class="muted">Fahrzeuge, Personen, Tiere, Orte, Reisegrundlagen</span></button><button class="menu" onclick="go('workshop')"><b>Werkstatt</b><span class="muted">Störungen, Wartung, Arbeiten und Aufgaben</span></button><button class="menu" onclick="go('lending')"><b>Verleihmodus</b><span class="muted">Gruppen, Qualifikationen und Rechte</span></button><button class="menu" onclick="go('settings')"><b>Einstellungen / Daten</b><span class="muted">M365, Testmodus, Export</span></button></div>`};
document.title=`Fahrzeugplattform ${FP10610_VERSION}`;const fp10610Foot=document.querySelector('footer');if(fp10610Foot)fp10610Foot.textContent=`Fahrzeugplattform · ${FP10610_VERSION} · © 2026 Entwicklungsstand`;try{render()}catch(e){console.warn(e)}
