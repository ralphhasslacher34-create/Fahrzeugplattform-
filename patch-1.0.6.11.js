/* MOBIMORY 1.0.6.11-dev – BLOCK 1 UI-BEREINIGUNG
   Ziel: keine mehrfachen Mini-Funktionskarten mehr.
   - Planung: genau EIN Block "Route & Wetterplanung"
   - Unterwegs: genau EIN Block "Unterwegs" mit GPS, Route, ETA und Wetter
   - kein separater GPS-Speedometer mehr im Cockpit
   - Wetteransicht erhält keinen zusätzlichen Route/ETA-Block
   - Routenverwaltung/Wetterregel bleiben erreichbar, aber eingeklappt
   - Alt-/Doppelblöcke werden vor jedem Render konsequent entfernt
*/

const FP10611_VERSION='1.0.6.11-dev';
const FP10611={live:null};

(function fp10611Style(){
  if(document.getElementById('fp10611-style'))return;
  const s=document.createElement('style');s.id='fp10611-style';s.textContent=`
    .fp10611-livebar{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.5rem;margin:.65rem 0 0}
    .fp10611-livebox{border:1px solid rgba(120,120,120,.22);border-radius:11px;padding:.55rem .65rem;min-width:0;background:rgba(255,255,255,.35)}
    .fp10611-livebox span{display:block;font-size:.72rem;opacity:.68;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .fp10611-livebox b{display:block;font-size:1.12rem;margin-top:.1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .fp10611-gpsstate{font-size:.74rem;opacity:.68;margin-top:.35rem}
    .fp10611-active .fp10610-route-head{padding-bottom:.55rem}
    .fp10611-active .fp10610-focus{padding-top:.75rem}
    .fp10611-active .fp10610-map{height:min(42vh,360px);min-height:240px}
    .fp10611-active .fp10610-sim{display:none!important}
    .fp10611-active .fp10610-kpis{display:none!important}
    .fp10611-active .fp10610-tools details{margin:0}
    .fp10611-active .fp10610-tools{padding-top:.25rem}
    .fp10611-compact-forecast details{margin-top:.45rem;border-top:1px solid rgba(120,120,120,.18);padding-top:.45rem}
    .fp10611-compact-forecast summary{cursor:pointer;font-weight:700}
    @media(max-width:720px){.fp10611-livebar{grid-template-columns:1fr 1fr}.fp10611-active .fp10610-map{height:34vh;min-height:220px}}
  `;document.head.appendChild(s);
})();

function fp10611RemoveDuplicates(){
  const doomed=new Set();
  document.querySelectorAll('#fp1068-speed-card,#fp1068-route-card,.fp10610-route-card').forEach(x=>doomed.add(x));
  document.querySelectorAll('#app .card').forEach(card=>{
    const t=(card.textContent||'').replace(/\s+/g,' ').trim();
    if(/^GPS-Speedometer\b/i.test(t)||/^Route · ETA · Wetter\b/i.test(t))doomed.add(card);
  });
  doomed.forEach(x=>{try{x.remove()}catch{}});
}

function fp10611CloseTools(card){
  if(!card)return;
  card.querySelectorAll('.fp10610-tools details').forEach(d=>d.removeAttribute('open'));
}

function fp10611FmtDurationSeconds(sec){
  if(!Number.isFinite(sec)||sec<0)return'–';
  const min=Math.round(sec/60),h=Math.floor(min/60),m=min%60;
  return h?`${h} h ${String(m).padStart(2,'0')} min`:`${m} min`;
}

function fp10611LiveAverageKmh(){
  return FP1068.moveTimeS>0?FP1068.moveDistanceM/FP1068.moveTimeS*3.6:null;
}

function fp10611EffectiveLiveKmh(){
  const avg=fp10611LiveAverageKmh();
  if(FP1068.moveTimeS>=120&&FP1068.moveDistanceM>=300&&avg>0)return avg;
  const manual=FP10611.live?.manualKmh;
  return Number.isFinite(manual)&&manual>0?manual:avg;
}

function fp10611UpdateLiveSummary(){
  const l=FP10611.live;if(!l)return;
  const unit=l.unit||'km/h',cv=fp1068KmhToUnit(FP1068.currentSpeedKmh,unit),avKmh=fp10611LiveAverageKmh(),av=fp1068KmhToUnit(avKmh,unit);
  const ce=document.getElementById('fp1068CurrentSpeed'),ae=document.getElementById('fp1068AverageSpeed'),gps=document.getElementById('fp1068GpsState');
  if(ce)ce.textContent=cv==null?'–':cv.toFixed(1);if(ae)ae.textContent=av==null?'–':av.toFixed(1);if(gps)gps.textContent=FP1068.lastPos?`GPS ± ${Math.round(FP1068.lastPos.accuracy||0)} m`:'GPS wird gestartet …';
  let restM=l.totalM||0;
  if(FP1068.lastPos&&l.route){try{const p=fp1068Project(l.route,FP1068.lastPos);restM=Math.max(0,(l.totalM||0)-p.alongM)}catch{}}
  const rest=document.getElementById('fp10611Rest'),eta=document.getElementById('fp10611Eta'),speed=fp10611EffectiveLiveKmh();
  if(rest)rest.textContent=fp1068FmtDistance(restM/1000,l.profile);
  if(eta){if(speed>0){const seconds=restM/(speed/3.6);eta.textContent=fp1068FmtEta(new Date(Date.now()+seconds*1000));eta.title=`ca. ${fp10611FmtDurationSeconds(seconds)} Restfahrzeit`;}else eta.textContent='–'}
}

function fp10611InjectLive(card,usageId){
  if(!card)return;
  card.classList.add('fp10611-active');
  const head=card.querySelector('.fp10610-route-head h3');if(head)head.textContent='Unterwegs';
  const sub=card.querySelector('.fp10610-route-head .muted');if(sub)sub.textContent='Route · GPS · ETA · Wetter';
  const focus=card.querySelector('.fp10610-focus');if(!focus)return;
  const old=focus.querySelector('.fp10611-livebar');if(old)old.remove();
  const bar=document.createElement('div');bar.className='fp10611-livebar';bar.innerHTML=`
    <div class="fp10611-livebox"><span>GPS-Speed</span><b><span id="fp1068CurrentSpeed">–</span> <small id="fp1068LiveUnit" data-unit="${FP10611.live?.unit||'km/h'}">${FP10611.live?.unit||'km/h'}</small></b></div>
    <div class="fp10611-livebox"><span>Ø Fahrt</span><b><span id="fp1068AverageSpeed">–</span> <small>${FP10611.live?.unit||'km/h'}</small></b></div>
    <div class="fp10611-livebox"><span>Reststrecke</span><b id="fp10611Rest">–</b></div>
    <div class="fp10611-livebox"><span>ETA Ziel</span><b id="fp10611Eta">–</b></div>
    <div id="fp1068GpsState" class="fp10611-gpsstate" style="grid-column:1/-1">GPS wird gestartet …</div>`;
  const map=focus.querySelector('#fp10610RouteMap');if(map)map.insertAdjacentElement('afterend',bar);else focus.prepend(bar);
  fp10611UpdateLiveSummary();
}

function fp10611CompactForecast(active){
  const host=document.getElementById('fp1068ForecastRows');if(!host)return;
  host.classList.toggle('fp10611-compact-forecast',!!active);
  if(!active)return;
  const rows=[...host.querySelectorAll(':scope > .fp1068-route-row')];
  if(rows.length<=2)return;
  const keep=new Set([rows[0],rows[rows.length-1]]),extra=rows.filter(r=>!keep.has(r));
  if(!extra.length)return;
  const details=document.createElement('details');details.innerHTML=`<summary>Weitere ${extra.length} Wetterpunkte anzeigen</summary>`;
  extra.forEach(r=>details.appendChild(r));
  host.appendChild(details);
}

/* Wetter-Renderer nur im Unterwegs-Modus kompakt halten. */
const fp10611BuildWeatherBase=fp1069BuildWeather;
fp1069BuildWeather=async function(usageId,active=false){
  await fp10611BuildWeatherBase(usageId,active);
  fp10611CompactForecast(active);
  if(active)fp10611UpdateLiveSummary();
};
fp1068BuildRouteWeather=fp1069BuildWeather;

/* 1.0.6.10-Routenkarte als Basis, davor/danach Altblöcke konsequent entfernen. */
const fp10611RouteCardBase=fp10610AppendRouteCard;
async function fp10611AppendRouteCard(usageId,active=false){
  fp10611RemoveDuplicates();
  if(active){
    try{
      const ctx=await fp1068LoadUsageContext(usageId),route=ctx?.route,g=route?fp1068RouteGeom(route):null,unit=fp1068SpeedUnit(ctx.vehicle.fields);
      FP10611.live={usageId:String(usageId),route,totalM:g?.totalM||0,profile:ctx.profile,unit,manualKmh:fp1068Num(ctx.vehicle.fields.VReiseKmh1068)};
    }catch{FP10611.live={usageId:String(usageId),route:null,totalM:0,profile:'motorboat',unit:'km/h',manualKmh:null}}
  }else FP10611.live=null;
  await fp10611RouteCardBase(usageId,active);
  const cards=[...document.querySelectorAll('#fp1068-route-card,.fp10610-route-card')];
  const card=cards[cards.length-1]||null;
  cards.slice(0,-1).forEach(x=>x.remove());
  document.querySelectorAll('#fp1068-speed-card').forEach(x=>x.remove());
  fp10611CloseTools(card);
  if(card){
    const title=card.querySelector('.fp10610-route-head h3');if(title&&!active)title.textContent='Route & Wetterplanung';
    if(active)fp10611InjectLive(card,usageId);
  }
  if(active){await fp1068StartTracker(usageId);fp10611UpdateLiveSummary()}
}
fp1068AppendRouteCard=fp10611AppendRouteCard;
fp1069AppendRouteCard=fp10611AppendRouteCard;

/* GPS-DOM-Update erweitert den einzigen Unterwegs-Block. */
const fp10611UpdateSpeedBase=fp1068UpdateSpeedDom;
fp1068UpdateSpeedDom=function(){try{fp10611UpdateSpeedBase()}catch{}fp10611UpdateLiveSummary()};

/* Cockpit: keine separate Speedometer-Karte mehr. Route/GPS/ETA/Wetter = ein Block. */
cockpit=async function(){
  await fp1068CockpitBase();
  const usageId=String(S.usage?.cloudId||'');if(!usageId)return;
  if(typeof fp1065IsWaterski==='function'&&fp1065IsWaterski())return;
  await fp10611AppendRouteCard(usageId,true);
};

/* Wetter: nur die eigentliche Wetter-/Logbuchansicht. KEIN weiterer Route/ETA-Block. */
weather=async function(){
  FP10611.live=null;
  fp10611RemoveDuplicates();
  await fp1068WeatherBase();
  fp10611RemoveDuplicates();
};

/* Sicherheitsnetz: Planung/Detail soll ebenfalls nur EINEN Routenblock haben. */
const fp10611UsageDetailCurrent=usageDetail;
usageDetail=async function(){
  await fp10611UsageDetailCurrent();
  const cards=[...document.querySelectorAll('#fp1068-route-card,.fp10610-route-card')];
  if(cards.length>1)cards.slice(0,-1).forEach(x=>x.remove());
  document.querySelectorAll('#fp1068-speed-card').forEach(x=>x.remove());
  const card=document.querySelector('#fp1068-route-card');if(card)fp10611CloseTools(card);
};

/* sichtbare Version */
main=function(){S.stack=[];head('MOBIMORY','Phase 1 · '+FP10611_VERSION);app.innerHTML=`<div class="home-brand">${typeof mobiIcon==='function'?mobiIcon():''}${typeof brandHeadline==='function'?brandHeadline():''}</div><div class="grid"><button class="menu" onclick="go('start')"><b>Start</b><span class="muted">Nutzung, Cockpit, Planung & Historie</span></button><button class="menu" onclick="go('configuration')"><b>Konfiguration</b><span class="muted">Fahrzeuge, Personen, Tiere, Orte, Reisegrundlagen</span></button><button class="menu" onclick="go('workshop')"><b>Werkstatt</b><span class="muted">Störungen, Wartung, Arbeiten und Aufgaben</span></button><button class="menu" onclick="go('lending')"><b>Verleihmodus</b><span class="muted">Gruppen, Qualifikationen und Rechte</span></button><button class="menu" onclick="go('settings')"><b>Einstellungen / Daten</b><span class="muted">M365, Testmodus, Export</span></button></div>`};
document.title=`Fahrzeugplattform ${FP10611_VERSION}`;const fp10611Foot=document.querySelector('footer');if(fp10611Foot)fp10611Foot.textContent=`Fahrzeugplattform · ${FP10611_VERSION} · © 2026 Entwicklungsstand`;try{render()}catch(e){console.warn(e)}
