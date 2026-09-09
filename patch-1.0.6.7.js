/* MOBIMORY / Fahrzeugplattform 1.0.6.7-dev
   Eng begrenzter Praxis-Fix auf Basis 1.0.6.6:
   1) Personen und Orte in Nutzung/Planung als kompakte, suchbare Auswahl.
      Maximal wenige Treffer sichtbar; zuletzt verwendete Einträge werden bevorzugt.
   2) Wohnmobil: Start-Auswahl nur noch Reise oder Spontanfahrt.
      Reise = geplant; Spontanfahrt = offen, ohne Ziel/Enddatum.
      Historische alte Nutzungsarten bleiben unangetastet.
   3) Wasser-Wetter: einzelne Zeitsprünge Jetzt/+1/+2/+3/+6/+12/+24 h.
      Nur ein Prognose-Zeitpunkt gleichzeitig sichtbar; Marinewerte optional wenn verfügbar.
   Keine Cockpit-Strukturänderung, keine Schemaänderung.
*/

const FP1067_VERSION='1.0.6.7-dev';
const FP1067={forecast:null,marine:null,selectedHours:0,forecastPos:null};

function fp1067Norm(v){
  return String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss');
}
function fp1067Today(){
  const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
}
function fp1067Recent(key){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return[]}}
function fp1067Remember(key,id,max=12){
  id=String(id||'');if(!id)return;
  const a=fp1067Recent(key).filter(x=>String(x)!==id);a.unshift(id);localStorage.setItem(key,JSON.stringify(a.slice(0,max)));
}
function fp1067Rank(id,key){const i=fp1067Recent(key).indexOf(String(id));return i<0?999:i}

function fp1067InstallStyle(){
  if(document.getElementById('fp1067-style'))return;
  const s=document.createElement('style');s.id='fp1067-style';s.textContent=`
    .fp1067-search-wrap{position:relative}
    .fp1067-search{width:100%;box-sizing:border-box}
    .fp1067-hidden-select{display:none!important}
    .fp1067-results{display:grid;gap:.25rem;margin-top:.3rem}
    .fp1067-results:empty{display:none}
    .fp1067-results button{width:100%;padding:.55rem .7rem;text-align:left;font-weight:500}
    .fp1067-picker-search{margin:.35rem 0 .45rem}
    .fp1067-weather-tabs{display:flex;gap:.35rem;overflow-x:auto;padding:.15rem 0 .45rem}
    .fp1067-weather-tabs button{flex:0 0 auto;padding:.55rem .7rem}
    .fp1067-weather-tabs button.active{font-weight:800;outline:2px solid currentColor}
    .fp1067-weather-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem;margin-top:.55rem}
    .fp1067-weather-value{border:1px solid #d8dde4;border-radius:10px;padding:.55rem}
    .fp1067-weather-value small{display:block;opacity:.72;margin-bottom:.15rem}
    .fp1067-weather-value b{font-size:1.05rem}
    .fp1067-source{font-size:.78rem;opacity:.7;margin-top:.6rem}
    @media (min-width:700px){.fp1067-weather-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
  `;document.head.appendChild(s)
}
fp1067InstallStyle();

/* ========================================================================== */
/* 1) Suchbare Orte                                                           */
/* ========================================================================== */

locSelect=function(prefix,label,orts,sites){
  const sorted=[...orts].filter(o=>o.fields.Aktiv!==false).sort((a,b)=>
    fp1067Rank(a.id,'fp1067_recent_places')-fp1067Rank(b.id,'fp1067_recent_places')||
    ((b.fields.Favorit?1000:0)+(Number(b.fields.Verwendungen)||0))-((a.fields.Favorit?1000:0)+(Number(a.fields.Verwendungen)||0))||
    String(a.fields.Name||a.fields.Title||'').localeCompare(String(b.fields.Name||b.fields.Title||''),'de'));
  const siteData=sites.map(s=>({id:s.id,ort:String(s.fields.OrtId||''),name:s.fields.Name||s.fields.Title,type:s.fields.Standorttyp||'',active:s.fields.Aktiv!==false,fav:!!s.fields.Favorit}));
  return `<div class="location-box fp1067-location"><label>${label}</label>
    <div class="fp1067-search-wrap">
      <input id="${prefix}OrtSearch" class="fp1067-search" autocomplete="off" placeholder="Ort suchen …" onfocus="fp1067PlaceResults('${prefix}')" oninput="fp1067PlaceResults('${prefix}')">
      <select id="${prefix}Ort" class="fp1067-hidden-select" onchange="refreshSiteOptions('${prefix}');fp1067SyncPlaceSearch('${prefix}')"><option value="">– Ort auswählen –</option>${sorted.map(o=>`<option value="${o.id}">${o.fields.Favorit?'★ ':''}${esc(o.fields.Name||o.fields.Title)}</option>`).join('')}</select>
      <div id="${prefix}OrtResults" class="fp1067-results"></div>
    </div>
    <select id="${prefix}Standort" data-sites='${esc(JSON.stringify(siteData))}'><option value="">– konkreter Standort optional –</option></select>
    <button type="button" class="small-action" onclick="quickAddPlace('${prefix}')">+ neuen Ort anlegen</button>
  </div>`;
};

function fp1067PlaceResults(prefix){
  const input=document.getElementById(prefix+'OrtSearch'),sel=document.getElementById(prefix+'Ort'),box=document.getElementById(prefix+'OrtResults');
  if(!input||!sel||!box)return;
  const q=fp1067Norm(input.value),recent=fp1067Recent('fp1067_recent_places');
  let rows=[...sel.options].slice(1).map((o,i)=>({id:String(o.value),text:String(o.textContent||'').replace(/^★\s*/,''),star:String(o.textContent||'').startsWith('★'),i}));
  if(q)rows=rows.filter(x=>fp1067Norm(x.text).includes(q));
  rows.sort((a,b)=>{const ar=recent.indexOf(a.id),br=recent.indexOf(b.id),aa=ar<0?999:ar,bb=br<0?999:br;return aa-bb||(b.star?1:0)-(a.star?1:0)||a.i-b.i});
  rows=rows.slice(0,8);
  box.innerHTML=rows.map(x=>`<button type="button" onclick="fp1067ChoosePlace('${prefix}','${x.id}')">${x.star?'★ ':''}${esc(x.text)}</button>`).join('')||(q?'<div class="muted">Kein Treffer.</div>':'');
}
function fp1067ChoosePlace(prefix,id){
  const sel=document.getElementById(prefix+'Ort'),input=document.getElementById(prefix+'OrtSearch'),box=document.getElementById(prefix+'OrtResults');if(!sel)return;
  sel.value=String(id);fp1067Remember('fp1067_recent_places',id);if(input){const o=sel.options[sel.selectedIndex];input.value=String(o?.textContent||'').replace(/^★\s*/,'')}if(box)box.innerHTML='';refreshSiteOptions(prefix);
}
function fp1067SyncPlaceSearch(prefix){
  const sel=document.getElementById(prefix+'Ort'),input=document.getElementById(prefix+'OrtSearch');if(!sel||!input)return;
  const o=sel.options[sel.selectedIndex];input.value=sel.value?String(o?.textContent||'').replace(/^★\s*/,''):'';
}

quickAddPlace=async function(prefix){
  const n=prompt('Neuen Ort einmalig anlegen:');if(!n||!n.trim())return;
  try{
    const api=await getCloud(),all=await list(api,'Orte'),name=n.trim();
    let hit=all.find(x=>fp1067Norm(x.fields.Name||x.fields.Title)===fp1067Norm(name));
    if(!hit)hit=await api.createItemByName('Orte',{Title:name,Name:name,Verwendungen:0,Aktiv:true});
    const id=String(hit.id),label=hit.fields?.Name||hit.fields?.Title||name;
    document.querySelectorAll('select[id$="Ort"]').forEach(sel=>{
      if(![...sel.options].some(o=>String(o.value)===id)){const o=document.createElement('option');o.value=id;o.textContent=label;sel.appendChild(o)}
    });
    const target=document.getElementById(prefix+'Ort');if(target){target.value=id;fp1067Remember('fp1067_recent_places',id);fp1067SyncPlaceSearch(prefix);refreshSiteOptions(prefix)}
  }catch(e){alert(e.message)}
};

/* GPS-/Programm-Auswahl ebenfalls in das sichtbare Suchfeld spiegeln. */
if(typeof fp104ApplyLocation==='function'){
  const fp1067ApplyLocationBase=fp104ApplyLocation;
  fp104ApplyLocation=function(prefix,type,id,ortId){
    fp1067ApplyLocationBase(prefix,type,id,ortId);
    setTimeout(()=>{const oid=type==='ort'?id:ortId;if(oid)fp1067Remember('fp1067_recent_places',oid);fp1067SyncPlaceSearch(prefix)},0);
  };
}

/* ========================================================================== */
/* 1b) Personenlisten kompakt durchsuchen                                     */
/* ========================================================================== */

function fp1067PrimaryResults(){
  const input=document.getElementById('fp1067PrimarySearch'),sel=document.getElementById('primaryPerson'),box=document.getElementById('fp1067PrimaryResults');if(!input||!sel||!box)return;
  const q=fp1067Norm(input.value),recent=fp1067Recent('fp1067_recent_people');
  let rows=[...sel.options].slice(1).map((o,i)=>({id:String(o.value),text:String(o.textContent||''),i}));
  if(q)rows=rows.filter(x=>fp1067Norm(x.text).includes(q));
  rows.sort((a,b)=>{const ar=recent.indexOf(a.id),br=recent.indexOf(b.id);return (ar<0?999:ar)-(br<0?999:br)||a.i-b.i});
  box.innerHTML=rows.slice(0,8).map(x=>`<button type="button" onclick="fp1067ChoosePrimary('${x.id}')">${esc(x.text)}</button>`).join('')||(q?'<div class="muted">Kein Treffer.</div>':'');
}
function fp1067ChoosePrimary(id){
  const sel=document.getElementById('primaryPerson'),input=document.getElementById('fp1067PrimarySearch'),box=document.getElementById('fp1067PrimaryResults');if(!sel)return;
  sel.value=String(id);fp1067Remember('fp1067_recent_people',id);if(input)input.value=sel.options[sel.selectedIndex]?.textContent||'';if(box)box.innerHTML='';refreshPeopleExclusions();
  document.querySelectorAll('.picker .fp1067-picker-search').forEach(fp1067FilterPicker);
}
function fp1067FilterPicker(input){
  if(!input)return;const picker=input.closest('.picker');if(!picker)return;
  const q=fp1067Norm(input.value),labels=[...picker.querySelectorAll('label.person-tile')],recent=fp1067Recent('fp1067_recent_people');
  const rows=labels.map((l,i)=>{const cb=l.querySelector('input[type="checkbox"]'),id=String(cb?.dataset?.secondary||cb?.dataset?.guest||cb?.value||''),name=l.querySelector('span')?.textContent||l.textContent||'';return {l,cb,id,name,i}});
  rows.sort((a,b)=>{const ar=recent.indexOf(a.id),br=recent.indexOf(b.id);return (ar<0?999:ar)-(br<0?999:br)||a.i-b.i});
  rows.forEach(x=>picker.appendChild(x.l));
  let shown=0;
  for(const x of rows){const match=!q||fp1067Norm(x.name).includes(q),keep=!!x.cb?.checked,visible=keep||(match&&shown<8);x.l.style.display=visible?'':'none';if(visible&&!keep)shown++}
}
function fp1067EnhancePeople(){
  const sel=document.getElementById('primaryPerson');
  if(sel&&!document.getElementById('fp1067PrimarySearch')){
    const input=document.createElement('input');input.id='fp1067PrimarySearch';input.className='fp1067-search';input.autocomplete='off';input.placeholder='Person suchen …';input.onfocus=fp1067PrimaryResults;input.oninput=fp1067PrimaryResults;
    const box=document.createElement('div');box.id='fp1067PrimaryResults';box.className='fp1067-results';
    sel.parentElement.insertBefore(input,sel);sel.insertAdjacentElement('afterend',box);sel.classList.add('fp1067-hidden-select');
    if(sel.value)input.value=sel.options[sel.selectedIndex]?.textContent||'';
  }
  document.querySelectorAll('.picker').forEach((picker,i)=>{
    if(picker.querySelector('.fp1067-picker-search'))return;
    const input=document.createElement('input');input.className='fp1067-picker-search fp1067-search';input.placeholder='Person hinzufügen / suchen …';input.autocomplete='off';
    const title=picker.querySelector('.picker-title');if(title)title.insertAdjacentElement('afterend',input);else picker.insertBefore(input,picker.firstChild);
    input.addEventListener('input',()=>fp1067FilterPicker(input));input.addEventListener('focus',()=>fp1067FilterPicker(input));
    picker.querySelectorAll('input[type="checkbox"]').forEach(cb=>cb.addEventListener('change',()=>{const id=cb.dataset.secondary||cb.dataset.guest||cb.value;if(cb.checked)fp1067Remember('fp1067_recent_people',id);fp1067FilterPicker(input)}));
    fp1067FilterPicker(input);
  });
}

/* ========================================================================== */
/* 2) Wohnmobil: Reise + Spontanfahrt                                         */
/* ========================================================================== */

if(P?.motorhome)P.motorhome.usage=[['Reise',1],['Spontanfahrt',0]];
const fp1067UsageBase=usage;
usage=async function(){
  if(S.vehicle?.profile!=='motorhome')return fp1067UsageBase();
  head('Nutzungsart',S.vehicle.name);
  app.innerHTML=`<div class="grid">
    <button class="menu" onclick="fp1067SelectMotorhomeUsage('Reise')"><b>Reise</b><span class="muted">geplant · Start und Ende · Startort und Ziel</span></button>
    <button class="menu" onclick="fp1067SelectMotorhomeUsage('Spontanfahrt')"><b>Spontanfahrt</b><span class="muted">offen · ohne Ziel und ohne Enddatum</span></button>
  </div>`;
};
async function fp1067EnsureMotorhomeType(api,name){
  let types=await fp105SafeList(api,'Nutzungsarten'),t=types.find(x=>fp1067Norm(x.fields.Profil)==='wohnmobil'&&fp1067Norm(x.fields.Name||x.fields.Title)===fp1067Norm(name));
  if(!t)t=await api.createItemByName('Nutzungsarten',{Title:name,Profil:'Wohnmobil',Name:name,Aktiv:true});
  else if(t.fields.Aktiv===false)await api.updateItemByName('Nutzungsarten',t.id,{Aktiv:true});
  const maps=await fp105SafeList(api,'FahrzeugNutzungsarten');let m=maps.find(x=>String(x.fields.FahrzeugId)===String(S.vehicle.id)&&String(x.fields.NutzungsartId)===String(t.id));
  const sort=name==='Reise'?1:2;if(m){if(m.fields.Aktiv===false||Number(m.fields.Sortierung)!==sort)await api.updateItemByName('FahrzeugNutzungsarten',m.id,{Aktiv:true,Sortierung:sort})}else await api.createItemByName('FahrzeugNutzungsarten',{FahrzeugId:String(S.vehicle.id),NutzungsartId:String(t.id),Aktiv:true,Sortierung:sort});
  return t;
}
async function fp1067SelectMotorhomeUsage(name){
  try{const api=await getCloud(),t=await fp1067EnsureMotorhomeType(api,name);S.usage={id:String(t.id),name,multi:name==='Reise'};go('setup')}catch(e){alert('Nutzungsart konnte nicht vorbereitet werden: '+e.message)}
}

function fp1067IsSpontan(){return S.vehicle?.profile==='motorhome'&&fp1067Norm(S.usage?.name)==='spontanfahrt'}

/* Offene Spontanfahrt behandelt Zukunftsplanung wie offene Ausfahrt: Warnung statt Planungsblock. */
if(typeof fp1066ClassifyConflicts==='function'){
  const fp1067ClassifyBase=fp1066ClassifyConflicts;
  fp1066ClassifyConflicts=async function(api,rows){
    const c=await fp1067ClassifyBase(api,rows);if(!c.hard.length)return c;
    const [usages,types]=await Promise.all([fp105SafeList(api,'Nutzungen'),fp105SafeList(api,'Nutzungsarten')]),names=Object.fromEntries(types.map(x=>[String(x.id),String(x.fields.Name||x.fields.Title||'')])),hard=[],soft=[...c.soft];
    for(const row of c.hard){
      if(row.type!=='Nutzung'){hard.push(row);continue}
      const u=usages.find(x=>String(x.id)===String(row.id)),f=u?.fields||{},isOpenSpontan=u&&String(f.Status||'')==='Aktiv'&&!(f.Ende||f.GeplantesEndeDatum)&&fp1067Norm(names[String(f.NutzungsartId)])==='spontanfahrt';
      (isOpenSpontan?soft:hard).push(row);
    }
    return {soft,hard};
  };
  fp1066SoftConflictText=function(){return 'Aktuell läuft eine offene Nutzung. Die zukünftige Planung kann unter Vorbehalt gespeichert werden. Zum tatsächlichen Start muss die vorherige Nutzung beendet sein.'};
}

/* Startmaske nach der bisherigen Logik nur kompakt anpassen; Suchfelder sind bereits global aktiv. */
const fp1067SetupBase=setupBase;
setupBase=async function(){
  const r=await fp1067SetupBase();
  if(fp1067IsSpontan()){
    const goal=document.getElementById('dayGoalOrt');if(goal){const box=goal.closest('.location-box');if(box)box.remove()}
    if(!document.getElementById('fp1067StartDate')){
      const start=document.getElementById('dayStartOrt')?.closest('.location-box'),d=document.createElement('div');d.className='field';d.innerHTML=`<label>Startdatum</label><input id="fp1067StartDate" type="date" value="${fp1067Today()}">`;if(start)start.insertAdjacentElement('beforebegin',d);else app.querySelector('.card')?.prepend(d)
    }
  }
  fp1067EnhancePeople();
  return r;
};

/* Bei Spontanfahrt darf ein bewusst gewähltes Startdatum übernommen werden. */
const fp1067BeginBase=beginCloud101;
beginCloud101=async function(){
  const requested=fp1067IsSpontan()?document.getElementById('fp1067StartDate')?.value||'':'';
  const r=await fp1067BeginBase();
  if(requested&&S.usage?.cloudId&&S.day?.id){
    try{
      const api=await getCloud(),now=new Date(),local=new Date(`${requested}T${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:00`),iso=local.toISOString();
      await api.updateItemByName('Nutzungen',S.usage.cloudId,{Beginn:iso});await api.updateItemByName('Tagesetappen',S.day.id,{Datum:iso,Beginn:iso});
    }catch(e){console.warn('Spontanfahrt-Startdatum konnte nicht nachgetragen werden',e)}
  }
  return r;
};
beginCloud=beginCloud101;

/* ========================================================================== */
/* 3) Wasser-Wetter: EIN Zeitpunkt je Ansicht                                */
/* ========================================================================== */

function fp1067WeatherHost(marine=false){
  const key=localStorage.getItem('fp_openmeteo_key')||'';
  if(key)return marine?'https://customer-marine-api.open-meteo.com':'https://customer-api.open-meteo.com';
  return marine?'https://marine-api.open-meteo.com':'https://api.open-meteo.com';
}
function fp1067WeatherKeyParam(){const k=localStorage.getItem('fp_openmeteo_key')||'';return k?'&apikey='+encodeURIComponent(k):''}
function fp1067ClosestIndex(times,targetSec){let best=-1,delta=Infinity;for(let i=0;i<(times||[]).length;i++){const d=Math.abs(Number(times[i])-targetSec);if(d<delta){delta=d;best=i}}return best}
function fp1067Compass(deg){if(deg==null||!Number.isFinite(Number(deg)))return'–';const d=['N','NNO','NO','ONO','O','OSO','SO','SSO','S','SSW','SW','WSW','W','WNW','NW','NNW'];return d[Math.round((((Number(deg)%360)+360)%360)/22.5)%16]}
function fp1067WeatherText(code){const c=Number(code);if(c===0)return'klar';if([1,2].includes(c))return'leicht bewölkt';if(c===3)return'bedeckt';if([45,48].includes(c))return'Nebel';if([51,53,55,56,57].includes(c))return'Nieselregen';if([61,63,65,66,67].includes(c))return'Regen';if([71,73,75,77].includes(c))return'Schnee';if([80,81,82].includes(c))return'Schauer';if([85,86].includes(c))return'Schneeschauer';if([95,96,99].includes(c))return'Gewitter';return'Wettercode '+c}
function fp1067Thunder(code,cape){if([95,96,99].includes(Number(code)))return'Gewitter im Modell';const x=Number(cape);if(!Number.isFinite(x))return'–';if(x>=1000)return'erhöht';if(x>=300)return'möglich';return'gering'}
function fp1067Val(label,value,unit=''){return `<div class="fp1067-weather-value"><small>${esc(label)}</small><b>${value==null||value===''?'–':esc(value)}${value==null||value===''?'':unit}</b></div>`}

async function fp1067LoadWaterForecast(){
  const card=document.getElementById('fp1067Forecast');if(!card)return;
  let pos=S.pendingContext&&S.pendingContext.lat!=null?{lat:S.pendingContext.lat,lon:S.pendingContext.lon,accuracy:S.pendingContext.accuracy}:null;
  if(!pos){const p=await fp104Position();if(p.lat!=null)pos=p}
  if(!pos){card.innerHTML='<div class="status-warn"><b>Wettervorschau nicht verfügbar.</b><div>GPS-Position fehlt.</div></div>';return}
  FP1067.forecastPos=pos;card.innerHTML='<div class="muted">Wettervorschau wird geladen …</div>';
  const q=`latitude=${encodeURIComponent(pos.lat)}&longitude=${encodeURIComponent(pos.lon)}&hourly=temperature_2m,relative_humidity_2m,pressure_msl,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation_probability,precipitation,weather_code,cape&forecast_hours=30&wind_speed_unit=kmh&timeformat=unixtime`;
  const mq=`latitude=${encodeURIComponent(pos.lat)}&longitude=${encodeURIComponent(pos.lon)}&hourly=wave_height,wave_direction,sea_surface_temperature&forecast_hours=30&timeformat=unixtime`;
  try{
    const forecast=await fetch(`${fp1067WeatherHost(false)}/v1/forecast?${q}${fp1067WeatherKeyParam()}`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Wetterdienst '+r.status);return r.json()});
    let marine=null;try{marine=await fetch(`${fp1067WeatherHost(true)}/v1/marine?${mq}${fp1067WeatherKeyParam()}`,{cache:'no-store'}).then(r=>r.ok?r.json():null)}catch{}
    FP1067.forecast=forecast;FP1067.marine=marine;FP1067.selectedHours=0;fp1067RenderWaterForecast();
  }catch(e){card.innerHTML=`<div class="status-warn"><b>Wettervorschau konnte nicht geladen werden.</b><div>${esc(e.message)}</div></div>`}
}
function fp1067SelectForecast(h){FP1067.selectedHours=Number(h)||0;fp1067RenderWaterForecast()}
function fp1067RenderWaterForecast(){
  const card=document.getElementById('fp1067Forecast'),f=FP1067.forecast;if(!card||!f?.hourly?.time)return;
  const h=FP1067.selectedHours||0,target=Math.round(Date.now()/1000)+h*3600,i=fp1067ClosestIndex(f.hourly.time,target);if(i<0)return;
  const x=f.hourly,m=FP1067.marine?.hourly,mi=m?.time?fp1067ClosestIndex(m.time,Number(x.time[i])):-1,num=(arr,idx=i,d=1)=>arr&&arr[idx]!=null&&Number.isFinite(Number(arr[idx]))?Number(arr[idx]).toFixed(d):null,int=(arr,idx=i)=>arr&&arr[idx]!=null&&Number.isFinite(Number(arr[idx]))?Math.round(Number(arr[idx])):null;
  const tabs=[0,1,2,3,6,12,24],when=new Date(Number(x.time[i])*1000).toLocaleString('de-DE',{weekday:'short',hour:'2-digit',minute:'2-digit'}),wave=mi>=0?num(m.wave_height,mi,1):null,waveDir=mi>=0?int(m.wave_direction,mi):null,water=mi>=0?num(m.sea_surface_temperature,mi,1):null;
  card.innerHTML=`<div class="section first">Wasser-Wetter</div>
    <div class="fp1067-weather-tabs">${tabs.map(v=>`<button type="button" class="${v===h?'active':''}" onclick="fp1067SelectForecast(${v})">${v===0?'Jetzt':'+'+v+' h'}</button>`).join('')}</div>
    <div><b>${esc(when)} · ${esc(fp1067WeatherText(x.weather_code?.[i]))}</b></div>
    <div class="fp1067-weather-grid">
      ${fp1067Val('Temperatur',num(x.temperature_2m), ' °C')}
      ${fp1067Val('Wind',num(x.wind_speed_10m), ' km/h')}
      ${fp1067Val('Böen',num(x.wind_gusts_10m), ' km/h')}
      ${fp1067Val('Windrichtung',`${fp1067Compass(x.wind_direction_10m?.[i])}${x.wind_direction_10m?.[i]!=null?' · '+Math.round(Number(x.wind_direction_10m[i]))+'°':''}`)}
      ${fp1067Val('Regenwahrscheinlichkeit',int(x.precipitation_probability), ' %')}
      ${fp1067Val('Niederschlag',num(x.precipitation), ' mm')}
      ${fp1067Val('Sicht',x.visibility?.[i]!=null?(Number(x.visibility[i])/1000).toFixed(1):null, ' km')}
      ${fp1067Val('Luftdruck',int(x.pressure_msl), ' hPa')}
      ${fp1067Val('Gewitterhinweis',fp1067Thunder(x.weather_code?.[i],x.cape?.[i]))}
      ${water!=null?fp1067Val('Wassertemperatur',water,' °C'):''}
      ${wave!=null?fp1067Val('Wellenhöhe',wave,' m'):''}
      ${waveDir!=null?fp1067Val('Wellenrichtung',`${fp1067Compass(waveDir)} · ${waveDir}°`):''}
    </div>
    ${water==null&&wave==null?'<div class="fp1067-hint muted">Marinewerte sind an diesem Standort nicht verfügbar; Wind, Böen, Regen, Sicht und Gewitterhinweis bleiben nutzbar.</div>':''}
    <div class="fp1067-source">Prognose: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> · CC BY 4.0 · Prognose, keine Navigations-/Sicherheitsgarantie</div>`;
}

const fp1067WeatherBase=weather;
weather=async function(){
  await fp1067WeatherBase();
  if(S.vehicle?.profile!=='motorboat')return;
  const base=app.querySelector('.card');if(!base)return;
  const card=document.createElement('div');card.className='card';card.id='fp1067Forecast';card.innerHTML='<div class="muted">Wettervorschau wird vorbereitet …</div>';base.insertAdjacentElement('beforebegin',card);
  fp1067LoadWaterForecast();
};

/* Nur sichtbare Versionsanzeige aktualisieren. */
main=function(){S.stack=[];head('MOBIMORY','Phase 1 · '+FP1067_VERSION);app.innerHTML=`<div class="home-brand">${typeof mobiIcon==='function'?mobiIcon():''}${typeof brandHeadline==='function'?brandHeadline():''}</div><div class="grid"><button class="menu" onclick="go('start')"><b>Start</b><span class="muted">Nutzung, Cockpit, Planung & Historie</span></button><button class="menu" onclick="go('configuration')"><b>Konfiguration</b><span class="muted">Fahrzeuge, Personen, Tiere, Orte, Reisegrundlagen</span></button><button class="menu" onclick="go('workshop')"><b>Werkstatt</b><span class="muted">Störungen, Wartung, Arbeiten und Aufgaben</span></button><button class="menu" onclick="go('lending')"><b>Verleihmodus</b><span class="muted">Gruppen, Qualifikationen und Rechte</span></button><button class="menu" onclick="go('settings')"><b>Einstellungen / Daten</b><span class="muted">M365, Testmodus, Export</span></button></div>`};
