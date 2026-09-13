/* MOBIMORY 1.0.6.14-dev – BLOCK 1: Planung strikt getrennt von Live-Fahrt
   - Planung/Vorschau ignoriert Live-GPS vollständig: GPX-Start + fiktive Startzeit + V Reise.
   - Cockpit wird erst nach realem Ablegen/Abfahrt zum Live-Modus.
   - Startplausibilität: weit vom GPX-Start -> Warnung + bewusste Bestätigung statt stiller Live-Annahme.
   - Während Fahrt auf Route: Wetter/ETA entlang verbleibender GPX.
   - Während Fahrt außerhalb Route: Abweichungswarnung bleibt; Wetter folgt echter GPS-Position
     über einen reinen Prognosekorridor aktuelle Position -> Ziel (keine Navigation/Kursweisung).
   - geplante GPX bleibt als Referenz sichtbar.
   - kein neues SharePoint-Schema.
*/
const FP10614_VERSION='1.0.6.14-dev';
const FP10614={forecast:{},movement:{},corridorLayers:{}};

(function fp10614Style(){
  if(document.getElementById('fp10614-style'))return;
  const s=document.createElement('style');s.id='fp10614-style';s.textContent=`
    .fp10614-mode{margin:.45rem 0;padding:.5rem .65rem;border-radius:10px;border:1px solid rgba(120,120,120,.22);font-size:.86rem}
    .fp10614-mode strong{display:block;margin-bottom:.15rem}
    .fp10614-offroute{border-left:4px solid #f59e0b}
    .fp10614-planning{border-left:4px solid #2563eb}
    .fp10614-live{border-left:4px solid #16a34a}
    .fp10614-corridor-note{font-size:.78rem;opacity:.72;margin-top:.25rem}
  `;document.head.appendChild(s);
})();

function fp10614Id(v){return String(v??'')}
function fp10614Departure(profile){return profile==='motorboat'?'Ablegen':'Abfahrt'}
function fp10614Arrivals(profile){return profile==='motorboat'?['Anlegen / Ankern','Anlegen']:['Ankunft / Parken','Ankunft','Ankunft / Aufenthalt']}
function fp10614KmText(m){if(!(Number(m)>=0))return'–';return m<1000?`${Math.round(m)} m`:`${(m/1000).toFixed(m<10000?1:0)} km`}

async function fp10614MovementState(usageId,profile){
  const key=fp10614Id(usageId),api=await getCloud(),dep=fp10614Departure(profile),arr=fp10614Arrivals(profile),all=(await fp105SafeList(api,'Ereignisse')).filter(x=>fp10614Id(x.fields.NutzungId)===key&&x.fields.Rohdaten!==true&&([dep,...arr].includes(String(x.fields.Art||''))));
  const dayId=String(S.day?.id||''),rows=(dayId?all.filter(x=>String(x.fields.TagesetappeId||'')===dayId):all).sort((a,b)=>String(a.fields.Zeitpunkt||'').localeCompare(String(b.fields.Zeitpunkt||''))),last=rows[rows.length-1]||null;
  const out={underway:String(last?.fields?.Art||'')===dep,last,dep,arr,depTime:[...rows].reverse().find(x=>String(x.fields.Art||'')===dep)?.fields?.Zeitpunkt||null};
  FP10614.movement[key]=out;return out;
}

async function fp10614UsageMovement(usageId){
  try{const ctx=await fp1068LoadUsageContext(usageId);return await fp10614MovementState(usageId,ctx.profile)}catch{return {underway:false,last:null}}
}

function fp10614ThresholdM(ctx,rule){
  const r=rule||fp1068RuleFromFields(ctx.usage.fields,ctx.profile,ctx.userRule),m=fp1068RuleMeters(Number(r.devValue)||0,r.devUnit||'km');
  return Math.max(100,Number(m)||0);
}
function fp10614StraightRoute(a,b){return {v:1,type:'Prognosekorridor',file:'',originalCount:2,points:[{lat:Number(a.lat),lon:Number(a.lon),name:'Aktuelle Position'},{lat:Number(b.lat),lon:Number(b.lon),name:b.name||'Ziel'}]}}

async function fp10614ForecastData(usageId,active=false){
  const ctx=await fp1068LoadUsageContext(usageId);if(!ctx?.route||!ctx?.segment)return {ctx,mode:'none',points:[]};
  const route=ctx.route,g=fp1068RouteGeom(route),rule=fp1068RuleFromFields(ctx.usage.fields,ctx.profile,ctx.userRule),speed=fp1068EffectiveSpeed(ctx,active),plannedStart=new Date(FP1069.previewStart[fp1069Id(usageId)]||ctx.segment.fields.GeplanterStart1069||ctx.usage.fields.GeplanterBeginn||ctx.usage.fields.Beginn||Date.now());
  if(!(speed?.kmh>0))return {ctx,route,g,rule,speed,mode:'nospeed',points:[]};

  /* PLANUNG: GPS ist ausdrücklich irrelevant. */
  if(!active){
    const points=fp1068WeatherPoints(route,0,plannedStart,speed.kmh,rule),data={ctx,route,g,rule,speed,mode:'planning',points,startAlong:0,startTime:plannedStart,deviationM:null,thresholdM:fp10614ThresholdM(ctx,rule),corridor:null};
    FP10614.forecast[fp10614Id(usageId)]=data;return data;
  }

  /* LIVE: erst nach realem Ablegen/Abfahrt. */
  const movement=await fp10614MovementState(usageId,ctx.profile);
  if(!movement.underway){
    const points=fp1068WeatherPoints(route,0,plannedStart,speed.kmh,rule),data={ctx,route,g,rule,speed,mode:'planning',points,startAlong:0,startTime:plannedStart,deviationM:null,thresholdM:fp10614ThresholdM(ctx,rule),corridor:null,movement};
    FP10614.forecast[fp10614Id(usageId)]=data;return data;
  }

  const now=new Date(),thresholdM=fp10614ThresholdM(ctx,rule),pos=FP1068.lastPos;
  if(!pos){
    const points=fp1068WeatherPoints(route,0,now,speed.kmh,rule),data={ctx,route,g,rule,speed,mode:'live-waiting-gps',points,startAlong:0,startTime:now,deviationM:null,thresholdM,corridor:null,movement};
    FP10614.forecast[fp10614Id(usageId)]=data;return data;
  }

  const projection=fp1068Project(route,pos),deviationM=projection.distanceM;
  if(Number.isFinite(deviationM)&&deviationM<=thresholdM){
    const startAlong=Math.max(0,Math.min(g.totalM,projection.alongM||0)),points=fp1068WeatherPoints(route,startAlong,now,speed.kmh,rule),data={ctx,route,g,rule,speed,mode:'live-route',points,startAlong,startTime:now,deviationM,thresholdM,projection,corridor:null,movement};
    FP10614.forecast[fp10614Id(usageId)]=data;return data;
  }

  /* Abweichungsfall: tatsächliche Position ist die Wetter-Realität. Ziel bleibt bestehen.
     Der Korridor ist NUR Wetter-/ETA-Prognose, niemals Navigationsroute. */
  const target=route.points[route.points.length-1],corridor=fp10614StraightRoute(pos,target),cg=fp1068RouteGeom(corridor),future=fp1068WeatherPoints(corridor,0,now,speed.kmh,rule),current={lat:Number(pos.lat),lon:Number(pos.lon),name:'Aktuelle Position',alongM:0,distanceFromNowKm:0,eta:now,isCurrent:true};
  const points=[current,...future],data={ctx,route,g,rule,speed,mode:'live-offroute',points,startAlong:null,startTime:now,deviationM,thresholdM,projection,corridor,corridorM:cg.totalM,movement};
  FP10614.forecast[fp10614Id(usageId)]=data;return data;
}

/* Karte fragt dieselbe Wettergeometrie ab wie die Textberechnung. */
fp10610WeatherGeometry=async function(usageId,active){try{return (await fp10614ForecastData(usageId,active)).points||[]}catch(e){console.warn('Wettergeometrie 1.0.6.14',e);return[]}};

function fp10614ModeHtml(d){
  if(d.mode==='planning')return `<div class="fp10614-mode fp10614-planning"><strong>Planung / Wetterfenster</strong>Live-GPS wird nicht verwendet. Berechnung ab GPX-Start mit gewählter Startzeit und V Reise.</div>`;
  if(d.mode==='live-offroute')return `<div class="fp10614-mode fp10614-offroute"><strong>Live · außerhalb der geplanten Route</strong>Wetter wird ab der echten GPS-Position in Richtung des weiterhin gültigen Ziels aktualisiert.<div class="fp10614-corridor-note">Gestrichelter Prognosekorridor = Wetter-/ETA-Hilfe, keine Navigation und keine Kursanweisung.</div></div>`;
  if(d.mode==='live-route')return `<div class="fp10614-mode fp10614-live"><strong>Live · auf/nahe geplanter Route</strong>ETA und Wetter folgen der verbleibenden GPX-Strecke.</div>`;
  if(d.mode==='live-waiting-gps')return `<div class="fp10614-mode fp10614-live"><strong>Live · GPS wird bestimmt</strong>Bis zur ersten Position wird ab dem GPX-Start gerechnet.</div>`;
  return '';
}

async function fp10614BuildWeather(usageId,active=false,hostId='fp1068ForecastRows'){
  const host=document.getElementById(hostId);if(!host)return;host.innerHTML='<div class="muted">ETA und Routenwetter werden berechnet …</div>';
  try{
    const d=await fp10614ForecastData(usageId,active),ctx=d.ctx;if(!ctx?.segment||!ctx?.route){host.innerHTML='<div class="muted">Noch kein Routenabschnitt für die Wetterberechnung ausgewählt.</div>';return}
    if(!(d.speed?.kmh>0)){host.innerHTML='<div class="status-warn"><b>V Reise fehlt.</b><div>Bitte zuerst im Fahrzeug V Reise hinterlegen.</div></div>';return}
    await fp1068FetchWeather(d.points);
    const profile=ctx.profile,unit=fp1068SpeedUnit(ctx.vehicle.fields),segName=ctx.segment.fields.Abschnittsname1069||ctx.segment.fields.Title||'Routenabschnitt',target=ctx.route.points[ctx.route.points.length-1];
    let distanceLabel='';
    if(d.mode==='planning')distanceLabel=`Strecke ${fp1068FmtDistance(d.g.totalM/1000,profile)}`;
    else if(d.mode==='live-route')distanceLabel=`Rest ${fp1068FmtDistance(Math.max(0,d.g.totalM-d.startAlong)/1000,profile)}`;
    else if(d.mode==='live-offroute')distanceLabel=`Zielkorridor ${fp1068FmtDistance((d.corridorM||0)/1000,profile)}`;
    else distanceLabel=`Strecke ${fp1068FmtDistance(d.g.totalM/1000,profile)}`;
    const warn=d.mode==='live-offroute'&&Number.isFinite(d.deviationM)?`<div class="fp1068-warn"><b>Achtung: ${fp10614KmText(d.deviationM)} von der geplanten Strecke entfernt.</b><div>Bitte Route/Kurs überprüfen.</div></div>`:'';
    host.innerHTML=`${fp10614ModeHtml(d)}<div class="fp1068-route-meta"><span><b>${fp1068Esc(segName)}</b></span><span>${distanceLabel}</span><span>ETA-Basis ${fp1068KmhToUnit(d.speed.kmh,unit).toFixed(1)} ${unit}</span><span>${fp1068Esc(d.speed.source)}</span></div>${warn}
      ${d.points.map((p,i)=>{const w=p.weather,label=p.isCurrent?'Aktuelle Position':p.isTarget?'Ziel':(p.name||`Wetterpunkt ${i+1}`);return `<div class="fp1068-route-row"><div><b>${fp1068Esc(label)}</b><span class="fp1068-small">${fp1068FmtDistance(Number(p.distanceFromNowKm||0),profile)} voraus</span></div><div><b>ETA ${fp1068Esc(fp1068FmtEta(p.eta))}</b><span class="fp1068-small">${Number(p.lat).toFixed(5)}, ${Number(p.lon).toFixed(5)}</span></div><div>${w?`<b>${fp1068Esc(fp1068WeatherText(w.code))} · ${Math.round(Number(w.temp))} °C</b><span class="fp1068-small">Wind ${Math.round(Number(w.wind))} · Böen ${Math.round(Number(w.gust))} km/h · Regen ${Math.round(Number(w.pop))}%</span>`:`<b>Wetter noch nicht verfügbar</b><span class="fp1068-small">${fp1068Esc(p.weatherError||'ETA außerhalb des verfügbaren Prognosefensters')}</span>`}</div></div>`}).join('')}`;
    try{await fp10610RenderMap(usageId,active)}catch(e){console.warn('Karte 1.0.6.14',e)}
    try{if(typeof fp10611CompactForecast==='function')fp10611CompactForecast(active&&d.mode!=='planning')}catch{}
    try{if(active&&d.mode!=='planning'&&typeof fp10611UpdateLiveSummary==='function')fp10611UpdateLiveSummary()}catch{}
  }catch(e){host.innerHTML=`<div class="status-warn"><b>Routenwetter nicht verfügbar.</b><div>${fp1068Esc(e.message)}</div></div>`}
}
fp1069BuildWeather=fp10614BuildWeather;
fp1068BuildRouteWeather=fp10614BuildWeather;

/* Karte: nach dem normalen Rendern den Prognosekorridor ergänzen und bei Abweichung
   Route + aktuelle Position + Ziel gemeinsam in den Ausschnitt nehmen. */
const fp10614RenderMapBase=fp10610RenderMap;
fp10610RenderMap=async function(usageId,active=false){
  await fp10614RenderMapBase(usageId,active);
  try{
    const d=FP10614.forecast[fp10614Id(usageId)]||await fp10614ForecastData(usageId,active),map=FP10610.maps?.fp10610RouteMap;
    if(!map||!window.L)return;
    const old=FP10614.corridorLayers[fp10614Id(usageId)];if(old){try{map.removeLayer(old)}catch{}delete FP10614.corridorLayers[fp10614Id(usageId)]}
    if(d.mode==='live-offroute'&&d.corridor?.points?.length===2){
      const pts=d.corridor.points.map(p=>[p.lat,p.lon]),layer=L.polyline(pts,{weight:4,opacity:.9,dashArray:'9 8',color:'#f59e0b'}).bindTooltip('Wetter-/Prognosekorridor · keine Navigation').addTo(map);FP10614.corridorLayers[fp10614Id(usageId)]=layer;
      const all=[...d.route.points.map(p=>[p.lat,p.lon]),...pts];map.fitBounds(L.latLngBounds(all).pad(.08),{animate:false});
    }
  }catch(e){console.warn('Prognosekorridor Karte',e)}
};

/* Cockpit ist nur dann LIVE, wenn tatsächlich Ablegen/Abfahrt das letzte Bewegungsereignis ist.
   Nur Cockpit öffnen = Planung/Stand, Tracker bleibt aus. */
const fp10614AppendRouteBase=fp10611AppendRouteCard;
async function fp10614AppendRouteCard(usageId,activeRequested=false){
  let live=false;if(activeRequested){try{live=(await fp10614UsageMovement(usageId)).underway}catch{live=false}}
  return fp10614AppendRouteBase(usageId,live);
}
fp10611AppendRouteCard=fp10614AppendRouteCard;
fp1068AppendRouteCard=fp10614AppendRouteCard;
fp1069AppendRouteCard=fp10614AppendRouteCard;

/* Startplausibilität: bei Ablegen/Abfahrt weit weg vom GPX-Start nicht automatisch tun,
   als wäre dies ein realer Start. Bewusster Override bleibt möglich. */
async function fp10614CheckDeparture(action){
  try{
    const usageId=String(S.usage?.cloudId||'');if(!usageId)return true;
    const ctx=await fp1068LoadUsageContext(usageId),expected=fp10614Departure(ctx.profile);if(String(action)!==expected||!ctx.route?.points?.length)return true;
    const pos=await fp104Position();if(pos?.lat==null||pos?.lon==null)return confirm('GPS-Position konnte nicht bestimmt werden. '+expected+' trotzdem erfassen?');
    const start=ctx.route.points[0],dist=fp1068DistM(pos,start),rule=fp1068RuleFromFields(ctx.usage.fields,ctx.profile,ctx.userRule),tol=Math.max(300,fp10614ThresholdM(ctx,rule));
    if(dist<=tol)return true;
    const msg=`Aktueller Standort liegt ${fp10614KmText(dist)} vom geplanten GPX-Start entfernt.\n\nDas sieht nicht nach einem realen Fahrtstart aus.\n\nOK = ${expected} trotzdem bewusst erfassen\nAbbrechen = in Planung/Stand bleiben`;
    return confirm(msg);
  }catch(e){console.warn('Startplausibilität',e);return true}
}

if(typeof fp1064Movement==='function'){
  const fp10614MovementBase=fp1064Movement;
  fp1064Movement=async function(action,view=null){if(String(action)==='Ablegen'&&!(await fp10614CheckDeparture(action)))return;return fp10614MovementBase(action,view)};
}
if(typeof fp104CockpitAction==='function'){
  const fp10614CockpitActionBase=fp104CockpitAction;
  fp104CockpitAction=async function(action,view,primary=false){if(String(action)==='Abfahrt'&&!(await fp10614CheckDeparture(action)))return;return fp10614CockpitActionBase(action,view,primary)};
}

/* Live-KPIs folgen derselben Logik: auf Route = Rest-GPX, außerhalb = Zielkorridor.
   Vor Ablegen werden sie gar nicht eingeblendet, weil der Routenblock im Planungsmodus bleibt. */
fp10611UpdateLiveSummary=function(){
  const l=FP10611.live;if(!l)return;
  const unit=l.unit||'km/h',cv=fp1068KmhToUnit(FP1068.currentSpeedKmh,unit),avKmh=fp10611LiveAverageKmh(),av=fp1068KmhToUnit(avKmh,unit),ce=document.getElementById('fp1068CurrentSpeed'),ae=document.getElementById('fp1068AverageSpeed'),gps=document.getElementById('fp1068GpsState');
  if(ce)ce.textContent=cv==null?'–':cv.toFixed(1);if(ae)ae.textContent=av==null?'–':av.toFixed(1);if(gps)gps.textContent=FP1068.lastPos?`GPS ± ${Math.round(FP1068.lastPos.accuracy||0)} m`:'GPS wird gestartet …';
  let restM=l.totalM||0,d=FP10614.forecast[fp10614Id(l.usageId)];
  if(d?.mode==='live-route')restM=Math.max(0,(d.g.totalM||0)-(d.startAlong||0));
  else if(d?.mode==='live-offroute')restM=Math.max(0,d.corridorM||0);
  const rest=document.getElementById('fp10611Rest'),eta=document.getElementById('fp10611Eta'),speed=fp10611EffectiveLiveKmh();if(rest)rest.textContent=fp1068FmtDistance(restM/1000,l.profile);if(eta){if(speed>0){const seconds=restM/(speed/3.6);eta.textContent=fp1068FmtEta(new Date(Date.now()+seconds*1000));eta.title=`ca. ${fp10611FmtDurationSeconds(seconds)} Restfahrzeit`;}else eta.textContent='–'}
};

/* sichtbare Version */
const fp10614MainBase=main;
main=function(){fp10614MainBase();document.title=`Fahrzeugplattform ${FP10614_VERSION}`;const f=document.querySelector('footer');if(f)f.textContent=`Fahrzeugplattform · ${FP10614_VERSION} · © 2026 Entwicklungsstand`};
document.title=`Fahrzeugplattform ${FP10614_VERSION}`;const fp10614Foot=document.querySelector('footer');if(fp10614Foot)fp10614Foot.textContent=`Fahrzeugplattform · ${FP10614_VERSION} · © 2026 Entwicklungsstand`;
