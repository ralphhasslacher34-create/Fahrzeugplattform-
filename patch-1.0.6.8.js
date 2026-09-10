/* MOBIMORY 1.0.6.8-dev – BLOCK 1: GPX + GPS-Speedometer + ETA-Routenwetter
   Produktgrenze: MOBIMORY routet nicht. Eine vorhandene GPX-Route liefert nur
   Wegverlauf, Koordinaten, Reihenfolge und vorhandene Namen. MOBIMORY nutzt
   diese Daten für Logbuch, reale GPS-Bewegung, ETA, Wetter und einen neutralen
   Hinweis bei deutlicher Abweichung von der geplanten Strecke.
*/

const FP1068_VERSION='1.0.6.8-dev';
const FP1068={
  watchId:null,watchUsageId:'',lastPos:null,speeds:[],moveDistanceM:0,moveTimeS:0,
  currentSpeedKmh:null,lastPersistAt:0,lastPersistPos:null,routeCache:{},weatherCache:{},renderTimer:null,userId:null,userRuleCache:null,watchVehicleId:''
};

function fp1068Num(v){const n=Number(v);return Number.isFinite(n)?n:null}
function fp1068Esc(v){return typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fp1068DistM(a,b){return fp104DistM(Number(a.lat),Number(a.lon),Number(b.lat),Number(b.lon))}
function fp1068KmhToUnit(v,unit){if(v==null)return null;return unit==='kn'?v/1.852:v}
function fp1068UnitToKmh(v,unit){if(v==null)return null;return unit==='kn'?v*1.852:v}
function fp1068SpeedUnit(f){return String(f?.Geschwindigkeitseinheit1068||'km/h')==='kn'?'kn':'km/h'}
function fp1068LocalInput(v){if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
function fp1068FmtEta(v){const d=new Date(v);return Number.isNaN(d.getTime())?'–':d.toLocaleString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
function fp1068FmtDistance(km,profile){return profile==='motorboat'?`${(km/1.852).toFixed(km/1.852<10?1:0)} sm`:`${km.toFixed(km<10?1:0)} km`}
function fp1068WeatherKey(){return typeof fp1067WeatherKeyParam==='function'?fp1067WeatherKeyParam():''}
function fp1068WeatherHost(){return typeof fp1067WeatherHost==='function'?fp1067WeatherHost(false):'https://api.open-meteo.com'}
function fp1068WeatherText(code){return typeof fp1067WeatherText==='function'?fp1067WeatherText(code):`Code ${code??'–'}`}

function fp1068InstallStyle(){
  if(document.getElementById('fp1068-style'))return;
  const s=document.createElement('style');s.id='fp1068-style';s.textContent=`
    .fp1068-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem}
    .fp1068-speed{font-size:2.15rem;font-weight:800;line-height:1.05}
    .fp1068-speed small{font-size:.9rem;font-weight:600;opacity:.7}
    .fp1068-route-row{display:grid;grid-template-columns:minmax(92px,.75fr) minmax(120px,1fr) minmax(150px,1.4fr);gap:.55rem;padding:.6rem 0;border-bottom:1px solid #e4e8ed;align-items:start}
    .fp1068-route-row:last-child{border-bottom:0}
    .fp1068-route-row b{display:block}
    .fp1068-warn{border:2px solid currentColor;border-radius:12px;padding:.75rem;margin:.6rem 0}
    .fp1068-route-meta{display:flex;gap:.4rem;flex-wrap:wrap;margin:.45rem 0}.fp1068-route-meta span{border:1px solid #d8dde4;border-radius:999px;padding:.25rem .55rem;font-size:.84rem}
    .fp1068-inline{display:flex;gap:.45rem;flex-wrap:wrap;align-items:end}.fp1068-inline .field{flex:1 1 130px;margin:0}
    .fp1068-gpx input[type=file]{width:100%}.fp1068-small{font-size:.82rem;opacity:.75}
    @media(max-width:620px){.fp1068-route-row{grid-template-columns:1fr}.fp1068-grid{grid-template-columns:1fr 1fr}}
  `;document.head.appendChild(s);
}
fp1068InstallStyle();

/* -------------------------------------------------------------------------- */
/* Additives M365-Schema: Geschwindigkeitsstamm + GPX/Regel an der Nutzung   */
/* -------------------------------------------------------------------------- */
const fp1068MergedSchemaBase=fp105MergedSchema;
fp105MergedSchema=async function(){
  const [prior,e1068]=await Promise.all([
    fp1068MergedSchemaBase(),
    fetch('phase1-sharepoint-schema-1.0.6.8.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Schema 1.0.6.8 fehlt im Repository.');return r.json()})
  ]);
  return fp105MergeSchemas(prior,e1068);
};

m365setup=function(){
  head('Microsoft 365 Setup','Schema 1.0.6.8 · Block 1 · additiv');
  const tok=window.FPAuth.token(),authButton=tok?`<button onclick="FPAuth.logout();render()">Microsoft-Verbindung trennen</button>`:`<button class="primary" onclick="sessionStorage.setItem('fp_after_auth','m365setup');FPAuth.login()">Mit Microsoft 365 anmelden</button>`;
  app.innerHTML=`<div class="card"><b>Microsoft-Anmeldung</b><div id="authState">${tok?'✓ Microsoft-Token vorhanden':'Noch nicht mit Microsoft verbunden'}</div>${authButton}</div>
  <div class="card"><div class="field"><label>SharePoint-Site-URL</label><input id="spSite" value="${fp1068Esc(localStorage.getItem('fp_sp_site')||'')}" placeholder="https://…sharepoint.com/sites/Fahrzeugplattform"></div>
  <button class="primary" ${tok?'':'disabled'} onclick="runM365Provision1068()">Phase-1-Struktur prüfen / anlegen</button>
  <p class="muted">Additiv und wiederholbar. 1.0.6.8 ergänzt Fahrzeug-Geschwindigkeiten, GPX-Routendaten, Wetterregel und reale GPS-Geschwindigkeit.</p></div><div id="m365Result"></div>`;
};
async function runM365Provision1068(){
  const url=document.getElementById('spSite')?.value.trim();if(!url)return alert('Bitte die vollständige SharePoint-Site-URL eintragen.');
  localStorage.setItem('fp_sp_site',url);const out=document.getElementById('m365Result');out.innerHTML='<div class="card">Schema 1.0.6.8 wird geladen …</div>';
  try{const schema=await fp105MergedSchema(),setup=new FPGraphSetup(FPAuth.token(),url,schema),site=await setup.resolveSite();let lines=[];out.innerHTML=`<div class="card"><b>Verbunden:</b> ${fp1068Esc(site.displayName)}<div id="provLog" class="muted">Prüfung startet …</div></div>`;const log=document.getElementById('provLog'),res=await setup.provision(e=>{if(e.status==='created')lines.push(`${e.kind==='list'?'Liste':'Feld'} angelegt: ${e.kind==='field'?e.list+' · ':''}${e.name}`);if(log)log.innerHTML=`Fortschritt: ${fp1068Esc(e.kind==='field'?e.list+' · '+e.name:e.name)}<br>${lines.slice(-10).map(fp1068Esc).join('<br>')}`});out.innerHTML=`<div class="card status-ok"><b>Setup abgeschlossen und verifiziert</b><p>${res.totalLists} Listen geprüft · ${res.listsCreated} neu · ${res.fieldsCreated} Felder neu · ${res.verifiedLists} Listen erreichbar.</p></div>`}catch(e){out.innerHTML=`<div class="card status-stop"><b>Setup nicht abgeschlossen</b><p>${fp1068Esc(e.message)}</p></div>`}
}

/* -------------------------------------------------------------------------- */
/* Fahrzeug-Stammdaten: V min / V Reise / V max / Historie                   */
/* -------------------------------------------------------------------------- */
const fp1068VehicleConfigureBase=vehicleconfigure;
vehicleconfigure=async function(){
  await fp1068VehicleConfigureBase();
  if(!S.configVehicleId)return;
  try{const api=await getCloud(),v=await api.getItemByName('Fahrzeuge',S.configVehicleId),f=v.fields||{},unit=fp1068SpeedUnit(f),to=u=>{const x=fp1068KmhToUnit(fp1068Num(u),unit);return x==null?'':x.toFixed(1)};
    const card=document.createElement('div');card.className='card';card.id='fp1068-speed-master';card.innerHTML=`<div class="section first">Geschwindigkeit / ETA-Grundlage</div>
      <p class="muted">Manuelle Stammdaten bleiben erhalten. Der historische Reise-Durchschnitt wird getrennt aus realer GPS-Fahrzeit und Strecke ermittelt; Standzeiten zählen nicht.</p>
      <div class="fp1068-inline"><div class="field"><label>Einheit</label><select id="fp1068SpeedUnit"><option ${unit==='km/h'?'selected':''}>km/h</option><option ${unit==='kn'?'selected':''}>kn</option></select></div>
      <div class="field"><label>V min</label><input id="fp1068VMin" type="number" step="0.1" value="${to(f.VMinKmh1068)}"></div>
      <div class="field"><label>V Reise</label><input id="fp1068VReise" type="number" step="0.1" value="${to(f.VReiseKmh1068)}"></div>
      <div class="field"><label>V max</label><input id="fp1068VMax" type="number" step="0.1" value="${to(f.VMaxKmh1068)}"></div></div>
      <div class="fp1068-route-meta"><span>V Reise ermittelt: <b>${f.VReiseHistorieKmh1068!=null?to(f.VReiseHistorieKmh1068)+' '+unit:'noch keine ausreichende Historie'}</b></span></div>
      <div class="fp1068-inline"><button class="primary" onclick="fp1068SaveVehicleSpeeds()">Geschwindigkeiten speichern</button><button onclick="fp1068RecalcHistorySpeed()">Historie neu ermitteln</button></div>`;
    app.appendChild(card);
  }catch(e){console.warn('Geschwindigkeitsstamm 1.0.6.8',e)}
};
async function fp1068SaveVehicleSpeeds(){
  try{const api=await getCloud(),unit=document.getElementById('fp1068SpeedUnit')?.value==='kn'?'kn':'km/h',read=id=>{const n=fp1068Num(document.getElementById(id)?.value);return n==null?null:fp1068UnitToKmh(n,unit)},f={Geschwindigkeitseinheit1068:unit,VMinKmh1068:read('fp1068VMin'),VReiseKmh1068:read('fp1068VReise'),VMaxKmh1068:read('fp1068VMax')};
    if(f.VReiseKmh1068!=null&&f.VMinKmh1068!=null&&f.VReiseKmh1068<f.VMinKmh1068)return alert('V Reise darf nicht unter V min liegen.');
    if(f.VMaxKmh1068!=null&&f.VReiseKmh1068!=null&&f.VReiseKmh1068>f.VMaxKmh1068)return alert('V Reise darf nicht über V max liegen.');
    await api.updateItemByName('Fahrzeuge',S.configVehicleId,f);FP1068.routeCache={};await vehicleconfigure();
  }catch(e){alert('Geschwindigkeiten konnten nicht gespeichert werden: '+e.message)}
}
async function fp1068RecalcHistorySpeed(){
  try{const api=await getCloud(),rows=(await fp105SafeList(api,'GPSPunkte')).filter(x=>String(x.fields.FahrzeugId)===String(S.configVehicleId)&&String(x.fields.BezugTyp1064||'')==='NutzungRoute'&&x.fields.Aktiv!==false).sort((a,b)=>String(a.fields.Zeitpunkt||'').localeCompare(String(b.fields.Zeitpunkt||''))),groups={};
    for(const r of rows){const id=String(r.fields.NutzungId||'');(groups[id]||(groups[id]=[])).push(r)}let dist=0,time=0;
    for(const g of Object.values(groups)){for(let i=1;i<g.length;i++){const a=g[i-1].fields,b=g[i].fields,dt=(new Date(b.Zeitpunkt)-new Date(a.Zeitpunkt))/1000;if(!(dt>2&&dt<=180))continue;const d=fp104DistM(Number(a.Breite),Number(a.Laenge),Number(b.Breite),Number(b.Laenge));if(!Number.isFinite(d))continue;const kmh=d/dt*3.6;if(kmh>=1&&kmh<=250){dist+=d;time+=dt}}}
    if(time<600||dist<1000)return alert('Noch nicht genug reale GPS-Fahrhistorie für einen belastbaren Wert.');
    const kmh=dist/time*3.6;await api.updateItemByName('Fahrzeuge',S.configVehicleId,{VReiseHistorieKmh1068:kmh});FP1068.routeCache={};await vehicleconfigure();
  }catch(e){alert('Historischer Wert konnte nicht ermittelt werden: '+e.message)}
}

/* -------------------------------------------------------------------------- */
/* GPX: nur Geometrie + vorhandene Namen. Kein Routing, keine GPX-Zeitdaten.  */
/* -------------------------------------------------------------------------- */
function fp1068PointNode(n){const lat=fp1068Num(n.getAttribute('lat')),lon=fp1068Num(n.getAttribute('lon'));if(lat==null||lon==null)return null;const name=(n.getElementsByTagNameNS?.('*','name')?.[0]||n.getElementsByTagName('name')[0])?.textContent?.trim()||'';return {lat,lon,name}}
function fp1068PerpDistanceM(p,a,b){
  const lat0=((a.lat+b.lat+p.lat)/3)*Math.PI/180,kx=111320*Math.cos(lat0),ky=110540,ax=a.lon*kx,ay=a.lat*ky,bx=b.lon*kx,by=b.lat*ky,px=p.lon*kx,py=p.lat*ky,dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;if(!l2)return Math.hypot(px-ax,py-ay);const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/l2));return Math.hypot(px-(ax+t*dx),py-(ay+t*dy))
}
function fp1068Douglas(points,tol){
  if(points.length<=2)return points;let max=0,index=-1;for(let i=1;i<points.length-1;i++){const d=fp1068PerpDistanceM(points[i],points[0],points[points.length-1]);if(d>max){max=d;index=i}}
  if(max>tol&&index>0){const a=fp1068Douglas(points.slice(0,index+1),tol),b=fp1068Douglas(points.slice(index),tol);return a.slice(0,-1).concat(b)}return [points[0],points[points.length-1]]
}
function fp1068PreserveNames(original,simplified){
  const named=original.filter(p=>p.name);for(const p of named){if(!simplified.some(x=>fp1068DistM(x,p)<3))simplified.push(p)}
  const pos=new Map(original.map((p,i)=>[`${p.lat.toFixed(7)},${p.lon.toFixed(7)}`,i]));simplified.sort((a,b)=>(pos.get(`${a.lat.toFixed(7)},${a.lon.toFixed(7)}`)??0)-(pos.get(`${b.lat.toFixed(7)},${b.lon.toFixed(7)}`)??0));return simplified
}
function fp1068ParseGpx(text){
  const xml=new DOMParser().parseFromString(text,'application/xml');if(xml.querySelector('parsererror'))throw new Error('Die GPX-Datei ist kein gültiges XML/GPX.');
  let nodes=[...(xml.getElementsByTagNameNS?.('*','rtept')||xml.getElementsByTagName('rtept'))],type='Route';if(nodes.length<2){nodes=[...(xml.getElementsByTagNameNS?.('*','trkpt')||xml.getElementsByTagName('trkpt'))];type='Track'}if(nodes.length<2){nodes=[...(xml.getElementsByTagNameNS?.('*','wpt')||xml.getElementsByTagName('wpt'))];type='Wegpunkte'}
  let points=nodes.map(fp1068PointNode).filter(Boolean);if(points.length<2)throw new Error('Die GPX-Datei enthält keine nutzbare Folge aus mindestens zwei GPS-Punkten.');
  const originalCount=points.length;if(points.length>500){let tol=10;let simp=fp1068PreserveNames(points,fp1068Douglas(points,tol));while(simp.length>1200&&tol<250){tol*=1.7;simp=fp1068PreserveNames(points,fp1068Douglas(points,tol))}points=simp}
  if(points.length>1600){const named=new Set(points.filter(p=>p.name).map(p=>`${p.lat},${p.lon}`)),step=Math.ceil(points.length/1500);points=points.filter((p,i)=>i===0||i===points.length-1||i%step===0||named.has(`${p.lat},${p.lon}`))}
  return {type,originalCount,points};
}
function fp1068PackRoute(parsed,fileName){return JSON.stringify({v:1,type:parsed.type,file:fileName||'',originalCount:parsed.originalCount,points:parsed.points.map(p=>[+p.lat.toFixed(7),+p.lon.toFixed(7),p.name||''])})}
function fp1068UnpackRoute(raw){try{const x=typeof raw==='string'?JSON.parse(raw):raw;if(!x?.points?.length)return null;return {...x,points:x.points.map(p=>({lat:Number(p[0]),lon:Number(p[1]),name:String(p[2]||'')}))}}catch{return null}}
async function fp1068ImportGpx(input,usageId){
  const file=input?.files?.[0];if(!file||!usageId)return;try{const parsed=fp1068ParseGpx(await file.text()),api=await getCloud(),packed=fp1068PackRoute(parsed,file.name);await api.updateItemByName('Nutzungen',usageId,{GPXRouteJson1068:packed,GPXDateiname1068:file.name,GPXImportiertAm1068:new Date().toISOString()});delete FP1068.routeCache[String(usageId)];alert(`${parsed.type} übernommen: ${parsed.originalCount} GPX-Punkte gelesen, ${parsed.points.length} Routenstützpunkte für MOBIMORY gespeichert.`);await fp1068RefreshCurrentView()}catch(e){alert('GPX konnte nicht importiert werden: '+e.message)}
}
async function fp1068RemoveGpx(usageId){if(!confirm('Importierte GPX-Route aus dieser Nutzung entfernen?'))return;try{const api=await getCloud();await api.updateItemByName('Nutzungen',usageId,{GPXRouteJson1068:'',GPXDateiname1068:'',GPXImportiertAm1068:null});delete FP1068.routeCache[String(usageId)];await fp1068RefreshCurrentView()}catch(e){alert(e.message)}}
async function fp1068RefreshCurrentView(){if(S.view==='cockpit')return cockpit();if(S.view==='usageDetail')return usageDetail();return render()}

/* -------------------------------------------------------------------------- */
/* Route-Geometrie: Strecke, Position auf Route, Abweichung                   */
/* -------------------------------------------------------------------------- */
function fp1068RouteGeom(route){
  if(route._geom)return route._geom;const cum=[0];for(let i=1;i<route.points.length;i++)cum.push(cum[i-1]+fp1068DistM(route.points[i-1],route.points[i]));route._geom={cum,totalM:cum[cum.length-1]||0};return route._geom
}
function fp1068Project(route,pos){
  const g=fp1068RouteGeom(route);let best={distanceM:Infinity,alongM:0,lat:route.points[0].lat,lon:route.points[0].lon,seg:0,t:0};
  for(let i=0;i<route.points.length-1;i++){const a=route.points[i],b=route.points[i+1],lat0=((a.lat+b.lat+pos.lat)/3)*Math.PI/180,kx=111320*Math.cos(lat0),ky=110540,ax=a.lon*kx,ay=a.lat*ky,bx=b.lon*kx,by=b.lat*ky,px=pos.lon*kx,py=pos.lat*ky,dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy,t=l2?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/l2)):0,qx=ax+t*dx,qy=ay+t*dy,d=Math.hypot(px-qx,py-qy);if(d<best.distanceM){const segLen=g.cum[i+1]-g.cum[i];best={distanceM:d,alongM:g.cum[i]+t*segLen,lat:a.lat+t*(b.lat-a.lat),lon:a.lon+t*(b.lon-a.lon),seg:i,t}}}
  return best
}
function fp1068AtDistance(route,meters){
  const g=fp1068RouteGeom(route),m=Math.max(0,Math.min(g.totalM,meters));let i=1;while(i<g.cum.length&&g.cum[i]<m)i++;if(i>=g.cum.length)i=g.cum.length-1;const a=route.points[Math.max(0,i-1)],b=route.points[i],from=g.cum[i-1],len=Math.max(1,g.cum[i]-from),t=Math.max(0,Math.min(1,(m-from)/len)),near=t<.15?a:(t>.85?b:null);return {lat:a.lat+t*(b.lat-a.lat),lon:a.lon+t*(b.lon-a.lon),name:near?.name||'',alongM:m}
}

/* -------------------------------------------------------------------------- */
/* Wetterpunkte aus USER-Regel; Ziel immer enthalten                         */
/* -------------------------------------------------------------------------- */
function fp1068RuleDefaults(profile){return profile==='motorboat'?{type:'distance',value:10,unit:'sm',devValue:0.5,devUnit:'sm'}:{type:'time',value:1,unit:'h',devValue:1,devUnit:'km'}}
async function fp1068CurrentUserId(){
  if(FP1068.userId)return FP1068.userId;const token=window.FPAuth?.token?.();if(token){try{const me=await fetch('https://graph.microsoft.com/v1.0/me?$select=id',{headers:{Authorization:'Bearer '+token},cache:'no-store'}).then(r=>r.ok?r.json():null);if(me?.id){FP1068.userId=String(me.id);return FP1068.userId}}catch{}}
  FP1068.userId='local-user';return FP1068.userId
}
async function fp1068LoadUserRule(profile){
  if(FP1068.userRuleCache)return FP1068.userRuleCache;const uid=await fp1068CurrentUserId(),key='fp1068_weather_rule_'+uid;let local=null;try{local=JSON.parse(localStorage.getItem(key)||'null')}catch{}
  try{const api=await getCloud(),rows=await fp105SafeList(api,'NutzerWetterEinstellungen'),x=rows.find(r=>String(r.fields.BenutzerId1068||'')===uid&&r.fields.Aktiv!==false);if(x){const f=x.fields,m=fp1068Num(f.RoutenabweichungM1068),devUnit=['m','km','sm'].includes(String(f.RoutenabweichungEinheit1068))?String(f.RoutenabweichungEinheit1068):(profile==='motorboat'?'sm':'km'),rule={type:String(f.WetterRegelTyp1068||'distance'),value:fp1068Num(f.WetterRegelWert1068)||1,unit:String(f.WetterRegelEinheit1068||'km'),devValue:m==null?fp1068RuleDefaults(profile).devValue:(devUnit==='sm'?m/1852:devUnit==='km'?m/1000:m),devUnit};FP1068.userRuleCache=rule;localStorage.setItem(key,JSON.stringify(rule));return rule}}catch(e){console.warn('User-Wetterregel Cloud',e)}
  FP1068.userRuleCache=local;return local
}
async function fp1068SaveUserRule(rule){
  const uid=await fp1068CurrentUserId(),key='fp1068_weather_rule_'+uid;localStorage.setItem(key,JSON.stringify(rule));FP1068.userRuleCache=rule;
  try{const api=await getCloud(),rows=await fp105SafeList(api,'NutzerWetterEinstellungen'),x=rows.find(r=>String(r.fields.BenutzerId1068||'')===uid),f={Title:'Wetterregel',BenutzerId1068:uid,WetterRegelTyp1068:rule.type,WetterRegelWert1068:rule.value,WetterRegelEinheit1068:rule.unit,RoutenabweichungM1068:fp1068RuleMeters(rule.devValue,rule.devUnit),RoutenabweichungEinheit1068:rule.devUnit,AktualisiertAm1068:new Date().toISOString(),Aktiv:true};if(x)await api.updateItemByName('NutzerWetterEinstellungen',x.id,f);else await api.createItemByName('NutzerWetterEinstellungen',f)}catch(e){console.warn('User-Wetterregel konnte nicht in M365 gespeichert werden',e)}
}
function fp1068RuleFromFields(f,profile,userRule){const d=userRule||fp1068RuleDefaults(profile),type=['distance','time'].includes(String(d.type||f?.WetterRegelTyp1068))?String(d.type||f?.WetterRegelTyp1068):fp1068RuleDefaults(profile).type,value=fp1068Num(d.value)??fp1068Num(f?.WetterRegelWert1068)??fp1068RuleDefaults(profile).value,unit=type==='time'?'h':(['km','sm'].includes(String(d.unit||f?.WetterRegelEinheit1068))?String(d.unit||f?.WetterRegelEinheit1068):fp1068RuleDefaults(profile).unit),m=fp1068Num(f?.RoutenabweichungM1068),devUnit=['m','km','sm'].includes(String(d.devUnit))?String(d.devUnit):(profile==='motorboat'?'sm':'km'),devValue=fp1068Num(d.devValue)??(m!=null?(devUnit==='sm'?m/1852:devUnit==='km'?m/1000:m):fp1068RuleDefaults(profile).devValue);return {type,value,unit,devValue,devUnit}}
function fp1068RuleIntervalM(rule,speedKmh){if(rule.type==='time')return Math.max(100,speedKmh*Math.max(.05,rule.value)*1000);return Math.max(100,rule.value*(rule.unit==='sm'?1852:1000))}
function fp1068WeatherPoints(route,startAlongM,startTime,speedKmh,rule){
  const g=fp1068RouteGeom(route),interval=fp1068RuleIntervalM(rule,speedKmh),out=[];let m=startAlongM+interval,guard=0;while(m<g.totalM-20&&guard++<500){const p=fp1068AtDistance(route,m),travelKm=(m-startAlongM)/1000;p.eta=new Date(startTime.getTime()+travelKm/speedKmh*3600000);p.distanceFromNowKm=travelKm;out.push(p);m+=interval}
  const z=fp1068AtDistance(route,g.totalM),travelKm=Math.max(0,(g.totalM-startAlongM)/1000);z.eta=new Date(startTime.getTime()+travelKm/speedKmh*3600000);z.distanceFromNowKm=travelKm;z.isTarget=true;z.name=z.name||'Ziel';if(!out.length||Math.abs(out[out.length-1].alongM-g.totalM)>5)out.push(z);else out[out.length-1]=z;return out
}
async function fp1068FetchWeather(points){
  if(!points.length)return points;const now=Date.now(),valid=points.filter(p=>p.eta.getTime()>=now-3*3600000&&p.eta.getTime()<=now+16*86400000);for(let offset=0;offset<valid.length;offset+=20){const chunk=valid.slice(offset,offset+20),lat=chunk.map(p=>p.lat.toFixed(6)).join(','),lon=chunk.map(p=>p.lon.toFixed(6)).join(','),q=`latitude=${lat}&longitude=${lon}&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation_probability,precipitation,weather_code&forecast_days=16&wind_speed_unit=kmh&timeformat=unixtime&timezone=auto`;
    try{const raw=await fetch(`${fp1068WeatherHost()}/v1/forecast?${q}${fp1068WeatherKey()}`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Wetterdienst '+r.status);return r.json()}),arr=Array.isArray(raw)?raw:[raw];chunk.forEach((p,j)=>{const h=arr[j]?.hourly;if(!h?.time)return;let best=0,delta=Infinity,target=Math.round(p.eta.getTime()/1000);h.time.forEach((t,i)=>{const d=Math.abs(Number(t)-target);if(d<delta){delta=d;best=i}});p.weather={temp:h.temperature_2m?.[best],wind:h.wind_speed_10m?.[best],gust:h.wind_gusts_10m?.[best],pop:h.precipitation_probability?.[best],rain:h.precipitation?.[best],code:h.weather_code?.[best]}})}catch(e){chunk.forEach(p=>p.weatherError=e.message)}}return points
}

async function fp1068LoadUsageContext(usageId){
  const key=String(usageId);if(FP1068.routeCache[key]?.usage)return FP1068.routeCache[key];const api=await getCloud(),u=await api.getItemByName('Nutzungen',usageId),vehicle=await api.getItemByName('Fahrzeuge',String(u.fields.FahrzeugId||S.vehicle?.id||'')),route=fp1068UnpackRoute(u.fields.GPXRouteJson1068||''),profile=normalizeProfile(vehicle.fields.Profil||S.vehicle?.profile||''),userRule=await fp1068LoadUserRule(profile);const x={usage:u,vehicle,route,userRule,profile};FP1068.routeCache[key]=x;return x
}
function fp1068EffectiveSpeed(ctx,active){const manual=fp1068Num(ctx.vehicle.fields?.VReiseKmh1068);if(active&&FP1068.moveTimeS>=120&&FP1068.moveDistanceM>=300)return {kmh:FP1068.moveDistanceM/FP1068.moveTimeS*3.6,source:'realer Fahrdurchschnitt dieses Törns'};return {kmh:manual,source:active?'V Reise (bis reale GPS-Basis belastbar ist)':'V Reise aus Stammdaten'}}
function fp1068RuleMeters(v,unit){return Number(v)*(unit==='sm'?1852:unit==='km'?1000:1)}
async function fp1068SaveRule(usageId){
  try{const type=document.getElementById('fp1068RuleType')?.value||'distance',value=Math.max(.05,Number(document.getElementById('fp1068RuleValue')?.value||1)),unit=type==='time'?'h':(document.getElementById('fp1068RuleUnit')?.value||'km'),devValue=Math.max(0,Number(document.getElementById('fp1068DevValue')?.value||0)),devUnit=document.getElementById('fp1068DevUnit')?.value||'km',start=document.getElementById('fp1068CalcStart')?.value||'',api=await getCloud(),rule={type,value,unit,devValue,devUnit},f={WetterRegelTyp1068:type,WetterRegelWert1068:value,WetterRegelEinheit1068:unit,RoutenabweichungM1068:fp1068RuleMeters(devValue,devUnit)};if(start)f.WetterStartzeit1068=new Date(start).toISOString();await Promise.all([api.updateItemByName('Nutzungen',usageId,f),fp1068SaveUserRule(rule)]);delete FP1068.routeCache[String(usageId)];await fp1068RefreshCurrentView()}catch(e){alert('Wetterregel konnte nicht gespeichert werden: '+e.message)}
}
function fp1068RuleTypeChanged(){const t=document.getElementById('fp1068RuleType')?.value,u=document.getElementById('fp1068RuleUnit');if(!u)return;u.innerHTML=t==='time'?'<option value="h">Stunden</option>':'<option value="km">km</option><option value="sm">sm</option>'}

async function fp1068BuildRouteWeather(usageId,active=false,hostId='fp1068ForecastRows'){
  const host=document.getElementById(hostId);if(!host)return;host.innerHTML='<div class="muted">ETA und Routenwetter werden berechnet …</div>';
  try{const ctx=await fp1068LoadUsageContext(usageId);if(!ctx.route){host.innerHTML='<div class="muted">Noch keine GPX-Route importiert.</div>';return}const speed=fp1068EffectiveSpeed(ctx,active);if(!(speed.kmh>0)){host.innerHTML='<div class="status-warn"><b>V Reise fehlt.</b><div>Bitte zuerst im Fahrzeug V Reise hinterlegen.</div></div>';return}const rule=fp1068RuleFromFields(ctx.usage.fields,ctx.profile,ctx.userRule),route=ctx.route,g=fp1068RouteGeom(route);let startAlong=0,startTime=new Date(ctx.usage.fields.WetterStartzeit1068||ctx.usage.fields.Beginn||ctx.usage.fields.GeplanterBeginn||Date.now()),projection=null;
    if(active&&FP1068.lastPos){projection=fp1068Project(route,FP1068.lastPos);startAlong=projection.alongM;startTime=new Date()}
    const points=fp1068WeatherPoints(route,startAlong,startTime,speed.kmh,rule);await fp1068FetchWeather(points);const profile=ctx.profile,unit=fp1068SpeedUnit(ctx.vehicle.fields),dev=projection?.distanceM;
    host.innerHTML=`${active&&projection?`<div class="fp1068-route-meta"><span>Rest ${fp1068FmtDistance((g.totalM-startAlong)/1000,profile)}</span><span>ETA-Basis ${fp1068KmhToUnit(speed.kmh,unit).toFixed(1)} ${unit}</span><span>${fp1068Esc(speed.source)}</span></div>${dev!=null&&dev>fp1068RuleMeters(rule.devValue,rule.devUnit)?`<div class="fp1068-warn"><b>Achtung: ${dev<1000?Math.round(dev)+' m':(dev/1000).toFixed(1)+' km'} von der geplanten Strecke entfernt.</b><div>Bitte Route/Kurs überprüfen.</div></div>`:''}`:`<div class="fp1068-route-meta"><span>Strecke ${fp1068FmtDistance(g.totalM/1000,profile)}</span><span>ETA-Basis ${fp1068KmhToUnit(speed.kmh,unit).toFixed(1)} ${unit}</span><span>${fp1068Esc(speed.source)}</span></div>`}
      ${points.map((p,i)=>{const w=p.weather,label=p.isTarget?'Ziel':(p.name||`Wetterpunkt ${i+1}`);return `<div class="fp1068-route-row"><div><b>${fp1068Esc(label)}</b><span class="fp1068-small">${fp1068FmtDistance(p.distanceFromNowKm,profile)} voraus</span></div><div><b>ETA ${fp1068Esc(fp1068FmtEta(p.eta))}</b><span class="fp1068-small">${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</span></div><div>${w?`<b>${fp1068Esc(fp1068WeatherText(w.code))} · ${Math.round(Number(w.temp))} °C</b><span class="fp1068-small">Wind ${Math.round(Number(w.wind))} · Böen ${Math.round(Number(w.gust))} km/h · Regen ${Math.round(Number(w.pop))}%</span>`:`<b>Wetter noch nicht verfügbar</b><span class="fp1068-small">${fp1068Esc(p.weatherError||'ETA außerhalb des verfügbaren Prognosefensters')}</span>`}</div></div>`}).join('')}`;
  }catch(e){host.innerHTML=`<div class="status-warn"><b>Routenwetter nicht verfügbar.</b><div>${fp1068Esc(e.message)}</div></div>`}
}

function fp1068RuleEditorHtml(usage,profile,active,userRule){const f=usage.fields||{},r=fp1068RuleFromFields(f,profile,userRule),start=fp1068LocalInput(f.WetterStartzeit1068||f.Beginn||f.GeplanterBeginn||new Date().toISOString());return `<div class="fp1068-inline"><div class="field"><label>Wetterlogik</label><select id="fp1068RuleType" onchange="fp1068RuleTypeChanged()"><option value="distance" ${r.type==='distance'?'selected':''}>nach Strecke</option><option value="time" ${r.type==='time'?'selected':''}>nach Zeit / Position</option></select></div><div class="field"><label>Intervall</label><input id="fp1068RuleValue" type="number" min="0.05" step="0.1" value="${r.value}"></div><div class="field"><label>Einheit</label><select id="fp1068RuleUnit">${r.type==='time'?`<option value="h">Stunden</option>`:`<option value="km" ${r.unit==='km'?'selected':''}>km</option><option value="sm" ${r.unit==='sm'?'selected':''}>sm</option>`}</select></div></div>
  ${active?'':`<div class="field"><label>Berechnungsstart für Vorab-ETA/Wetter</label><input id="fp1068CalcStart" type="datetime-local" value="${fp1068Esc(start)}"></div>`}
  <div class="fp1068-inline"><div class="field"><label>Abweichungshinweis ab</label><input id="fp1068DevValue" type="number" min="0" step="0.1" value="${Number(r.devValue).toFixed(r.devValue<10?1:0)}"></div><div class="field"><label>Einheit</label><select id="fp1068DevUnit"><option value="m">m</option><option value="km" ${r.devUnit==='km'?'selected':''}>km</option><option value="sm" ${r.devUnit==='sm'?'selected':''}>sm</option></select></div><button onclick="fp1068SaveRule('${usage.id}')">Regel speichern / neu berechnen</button></div>`}

async function fp1068AppendRouteCard(usageId,active=false){
  try{const ctx=await fp1068LoadUsageContext(usageId),route=ctx.route,profile=ctx.profile,g=route?fp1068RouteGeom(route):null,card=document.createElement('div');card.className='card';card.id='fp1068-route-card';card.innerHTML=`<div class="section first">Route · ETA · Wetter</div><p class="muted">MOBIMORY führt kein Routing durch. Importiert werden aus GPX nur Wegverlauf, GPS-Koordinaten, Reihenfolge und vorhandene Bezeichnungen.</p>
    ${!active?`<div class="fp1068-gpx"><label><b>GPX-Route importieren / ersetzen</b></label><input type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" onchange="fp1068ImportGpx(this,'${usageId}')"></div>`:''}
    ${route?`<div class="fp1068-route-meta"><span>${fp1068Esc(ctx.usage.fields.GPXDateiname1068||route.file||'GPX')}</span><span>${route.points.length} Routenstützpunkte</span><span>${fp1068FmtDistance(g.totalM/1000,profile)}</span>${!active?`<button class="danger-lite" onclick="fp1068RemoveGpx('${usageId}')">GPX entfernen</button>`:''}</div>`:'<div class="status-warn"><b>Keine GPX-Route hinterlegt.</b><div>Ohne GPX bleibt das normale Logbuch nutzbar; ETA-Routenwetter und Streckenabweichung benötigen den geplanten Weg.</div></div>'}
    ${fp1068RuleEditorHtml(ctx.usage,profile,active,ctx.userRule)}<div id="fp1068ForecastRows"></div>`;
    const target=app.querySelector('.card');if(target)target.insertAdjacentElement('afterend',card);else app.appendChild(card);if(route)fp1068BuildRouteWeather(usageId,active);
  }catch(e){console.warn('Route card 1.0.6.8',e)}
}

/* Planung/History-Detail: GPX importieren und Vorab-ETA/Wetter sehen. */
const fp1068UsageDetailBase=usageDetail;
usageDetail=async function(){await fp1068UsageDetailBase();if(!S.usageDetailId)return;await fp1068AppendRouteCard(String(S.usageDetailId),false)};

/* -------------------------------------------------------------------------- */
/* GPS-Speedometer: aktuelle GPS-Geschwindigkeit + realer Fahrdurchschnitt   */
/* -------------------------------------------------------------------------- */
function fp1068TrackerReset(usageId){FP1068.watchUsageId=String(usageId||'');FP1068.lastPos=null;FP1068.speeds=[];FP1068.moveDistanceM=0;FP1068.moveTimeS=0;FP1068.currentSpeedKmh=null;FP1068.lastPersistAt=0;FP1068.lastPersistPos=null}
async function fp1068RestoreTripStats(usageId){
  try{const api=await getCloud(),rows=(await fp105SafeList(api,'GPSPunkte')).filter(x=>String(x.fields.NutzungId||'')===String(usageId)&&String(x.fields.BezugTyp1064||'')==='NutzungRoute'&&x.fields.Aktiv!==false).sort((a,b)=>String(a.fields.Zeitpunkt||'').localeCompare(String(b.fields.Zeitpunkt||'')));let dist=0,time=0;for(let i=1;i<rows.length;i++){const a=rows[i-1].fields,b=rows[i].fields,dt=(new Date(b.Zeitpunkt)-new Date(a.Zeitpunkt))/1000;if(!(dt>2&&dt<=180))continue;const d=fp104DistM(Number(a.Breite),Number(a.Laenge),Number(b.Breite),Number(b.Laenge));if(!Number.isFinite(d))continue;const kmh=d/dt*3.6;if(kmh>=1&&kmh<=250){dist+=d;time+=dt}}FP1068.moveDistanceM=dist;FP1068.moveTimeS=time}catch(e){console.warn('Törn-GPS-Historie konnte nicht rekonstruiert werden',e)}
}
async function fp1068StartTracker(usageId){
  if(!navigator.geolocation||!usageId)return;if(FP1068.watchId!=null&&FP1068.watchUsageId===String(usageId))return;if(FP1068.watchId!=null){navigator.geolocation.clearWatch(FP1068.watchId);FP1068.watchId=null}fp1068TrackerReset(usageId);await fp1068RestoreTripStats(usageId);
  FP1068.watchId=navigator.geolocation.watchPosition(p=>fp1068OnPosition(p,usageId),e=>fp1068GpsError(e),{enableHighAccuracy:true,maximumAge:2000,timeout:12000});
}
function fp1068GpsError(e){const x=document.getElementById('fp1068GpsState');if(x)x.textContent='GPS: '+(e?.message||'nicht verfügbar')}
function fp1068OnPosition(p,usageId){
  if(String(usageId)!==FP1068.watchUsageId)return;const now=Number(p.timestamp)||Date.now(),pos={lat:p.coords.latitude,lon:p.coords.longitude,accuracy:p.coords.accuracy,time:now},prev=FP1068.lastPos;let derived=null;if(prev){const dt=(now-prev.time)/1000,d=fp1068DistM(prev,pos);if(dt>.5&&dt<120&&Number.isFinite(d))derived=d/dt*3.6;if(derived!=null&&derived>=1&&derived<=250&&(!p.coords.accuracy||p.coords.accuracy<=100)){FP1068.moveDistanceM+=d;FP1068.moveTimeS+=dt}}
  const gpsSpeed=fp1068Num(p.coords.speed);let kmh=gpsSpeed!=null&&gpsSpeed>=0?gpsSpeed*3.6:derived;if(kmh!=null&&kmh>=0&&kmh<=250){FP1068.speeds.push(kmh);if(FP1068.speeds.length>7)FP1068.speeds.shift();FP1068.currentSpeedKmh=FP1068.speeds.reduce((a,b)=>a+b,0)/FP1068.speeds.length}FP1068.lastPos=pos;fp1068UpdateSpeedDom();fp1068PersistGps(pos,usageId);clearTimeout(FP1068.renderTimer);FP1068.renderTimer=setTimeout(()=>{if(document.getElementById('fp1068ForecastRows'))fp1068BuildRouteWeather(usageId,true)},12000)
}
function fp1068UpdateSpeedDom(){const cur=document.getElementById('fp1068CurrentSpeed'),avg=document.getElementById('fp1068AverageSpeed'),gps=document.getElementById('fp1068GpsState'),unitEl=document.getElementById('fp1068LiveUnit'),unit=unitEl?.dataset?.unit||'km/h',cv=fp1068KmhToUnit(FP1068.currentSpeedKmh,unit==='kn'?'kn':'km/h'),av=FP1068.moveTimeS>0?fp1068KmhToUnit(FP1068.moveDistanceM/FP1068.moveTimeS*3.6,unit==='kn'?'kn':'km/h'):null;if(cur)cur.textContent=cv==null?'–':cv.toFixed(1);if(avg)avg.textContent=av==null?'–':av.toFixed(1);if(gps&&FP1068.lastPos)gps.textContent=`GPS ± ${Math.round(FP1068.lastPos.accuracy||0)} m`}
async function fp1068PersistGps(pos,usageId){
  const now=Date.now(),enoughTime=now-FP1068.lastPersistAt>=30000,enoughDist=!FP1068.lastPersistPos||fp1068DistM(FP1068.lastPersistPos,pos)>=30;if(!enoughTime&&!enoughDist)return;FP1068.lastPersistAt=now;FP1068.lastPersistPos={...pos};try{const api=await getCloud();await api.createItemByName('GPSPunkte',{FahrzeugId:String(S.vehicle.id),NutzungId:String(usageId),TagesetappeId:String(S.day?.id||''),Zeitpunkt:new Date(pos.time).toISOString(),Breite:pos.lat,Laenge:pos.lon,Quelle:'GPS Fahrt 1.0.6.8',BezugTyp1064:'NutzungRoute',BezugId1064:String(usageId),GeschwindigkeitKmh1068:FP1068.currentSpeedKmh,Aktiv:true,Testdaten:testFlag()})}catch(e){console.warn('GPS Fahrt konnte nicht gespeichert werden',e)}
}
async function fp1068AppendSpeedometer(usageId){
  try{const ctx=await fp1068LoadUsageContext(usageId),unit=fp1068SpeedUnit(ctx.vehicle.fields),manual=fp1068KmhToUnit(fp1068Num(ctx.vehicle.fields.VReiseKmh1068),unit),hist=fp1068KmhToUnit(fp1068Num(ctx.vehicle.fields.VReiseHistorieKmh1068),unit),card=document.createElement('div');card.className='card';card.id='fp1068-speed-card';card.innerHTML=`<div class="section first">GPS-Speedometer</div><div class="fp1068-grid"><div><div class="fp1068-speed"><span id="fp1068CurrentSpeed">–</span> <small id="fp1068LiveUnit" data-unit="${unit}">${unit}</small></div><div id="fp1068GpsState" class="muted">GPS wird gestartet …</div></div><div><b>Ø reale Fahrt dieses Törns</b><div class="fp1068-speed"><span id="fp1068AverageSpeed">–</span> <small>${unit}</small></div></div></div><div class="fp1068-route-meta"><span>V Reise manuell ${manual==null?'–':manual.toFixed(1)} ${unit}</span><span>Historie ${hist==null?'–':hist.toFixed(1)} ${unit}</span></div>`;
    const first=app.querySelector('.card');if(first)first.insertAdjacentElement('beforebegin',card);else app.prepend(card);await fp1068StartTracker(usageId);fp1068UpdateSpeedDom();
  }catch(e){console.warn('GPS-Speedometer 1.0.6.8',e)}
}

const fp1068CockpitBase=cockpit;
cockpit=async function(){await fp1068CockpitBase();const usageId=String(S.usage?.cloudId||'');if(!usageId)return;await fp1068AppendSpeedometer(usageId);await fp1068AppendRouteCard(usageId,true)};

/* Wetteransicht: vorhandene manuelle Wettererfassung bleibt; Routenwetter zusätzlich. */
const fp1068WeatherBase=weather;
weather=async function(){await fp1068WeatherBase();const usageId=String(S.usage?.cloudId||'');if(usageId)await fp1068AppendRouteCard(usageId,true)};

/* Sichtbare Version. */
main=function(){S.stack=[];head('MOBIMORY','Phase 1 · '+FP1068_VERSION);app.innerHTML=`<div class="home-brand">${typeof mobiIcon==='function'?mobiIcon():''}${typeof brandHeadline==='function'?brandHeadline():''}</div><div class="grid"><button class="menu" onclick="go('start')"><b>Start</b><span class="muted">Nutzung, Cockpit, Planung & Historie</span></button><button class="menu" onclick="go('configuration')"><b>Konfiguration</b><span class="muted">Fahrzeuge, Personen, Tiere, Orte, Reisegrundlagen</span></button><button class="menu" onclick="go('workshop')"><b>Werkstatt</b><span class="muted">Störungen, Wartung, Arbeiten und Aufgaben</span></button><button class="menu" onclick="go('lending')"><b>Verleihmodus</b><span class="muted">Gruppen, Qualifikationen und Rechte</span></button><button class="menu" onclick="go('settings')"><b>Einstellungen / Daten</b><span class="muted">M365, Testmodus, Export</span></button></div>`};
