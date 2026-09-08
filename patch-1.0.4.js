/* MOBIMORY / Fahrzeugplattform 1.0.4-dev – Praxispatch
   Cockpit-Kontext, Wetter, Tagesabschluss, Werkstatt, Verleih und Reisecheck. */

const FP104_VERSION='1.0.4-dev';
const FP104={cockpitTimer:null,showLendingArchive:false,lastTravelCheck:null};

function fp104Date(v){
  if(!v)return'';
  const s=String(v).slice(0,10).split('-');
  return s.length===3?`${s[2]}.${s[1]}.${s[0]}`:String(v);
}
function fp104Time(v){
  if(!v)return'';
  const d=new Date(v);if(Number.isNaN(d.getTime()))return'';
  return d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
}
function fp104LocalInput(v){
  if(!v)return'';
  const d=new Date(v);if(Number.isNaN(d.getTime()))return'';
  return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
function fp104Duration(ms){
  if(!Number.isFinite(ms)||ms<0)return'–';
  const total=Math.floor(ms/60000),h=Math.floor(total/60),m=total%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} h`;
}
function fp104Norm(v){return String(v??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim()}
function fp104DistM(a,b,c,d){
  const R=6371000,toRad=x=>x*Math.PI/180,dLat=toRad(c-a),dLon=toRad(d-b),
    q=Math.sin(dLat/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dLon/2)**2;
  return 2*R*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));
}
function fp104Nearest(orts,sites,lat,lon){
  if(lat==null||lon==null)return null;
  const rows=[];
  for(const o of orts||[]){const a=Number(o.fields.Breitengrad),b=Number(o.fields.Laengengrad);if(Number.isFinite(a)&&Number.isFinite(b))rows.push({type:'ort',id:String(o.id),name:o.fields.Name||o.fields.Title||'Ort',ortId:String(o.id),distance:fp104DistM(lat,lon,a,b)})}
  for(const s of sites||[]){const a=Number(s.fields.Breitengrad),b=Number(s.fields.Laengengrad);if(Number.isFinite(a)&&Number.isFinite(b))rows.push({type:'site',id:String(s.id),name:s.fields.Name||s.fields.Title||'Standort',ortId:String(s.fields.OrtId||''),distance:fp104DistM(lat,lon,a,b)})}
  rows.sort((x,y)=>x.distance-y.distance);
  return rows[0]&&rows[0].distance<=5000?rows[0]:null;
}
function fp104Suggestion(prefix,near){
  if(!near)return'';
  const dist=near.distance<1000?`${Math.round(near.distance)} m`:`${(near.distance/1000).toFixed(1)} km`;
  return `<div class="fp-suggestion"><span>Vorschlag aus gespeicherten Positionen: <b>${esc(near.name)}</b> · ${dist}</span><button type="button" onclick="fp104ApplyLocation('${prefix}','${near.type}','${near.id}','${near.ortId||''}')">Übernehmen</button></div>`;
}
function fp104ApplyLocation(prefix,type,id,ortId){
  const o=document.getElementById(prefix+'Ort'),s=document.getElementById(prefix+'Standort');
  if(type==='ort'&&o){o.value=id;refreshSiteOptions(prefix)}
  if(type==='site'){if(o&&ortId)o.value=ortId;refreshSiteOptions(prefix);setTimeout(()=>{const z=document.getElementById(prefix+'Standort');if(z)z.value=id},0)}
}
function fp104Position(){
  return new Promise(resolve=>{
    if(!navigator.geolocation)return resolve({lat:null,lon:null,accuracy:null,error:'GPS nicht verfügbar'});
    navigator.geolocation.getCurrentPosition(
      p=>resolve({lat:p.coords.latitude,lon:p.coords.longitude,accuracy:p.coords.accuracy,error:null}),
      e=>resolve({lat:null,lon:null,accuracy:null,error:e.message||'GPS nicht verfügbar'}),
      {enableHighAccuracy:true,timeout:4500,maximumAge:10000}
    );
  });
}
async function fp104Capture(action,primary=false){
  const timestamp=new Date().toISOString(),pos=await fp104Position(),ctx={action,timestamp,...pos};
  S.pendingContext=ctx;
  try{
    if(S.vehicle?.id&&S.usage?.cloudId&&S.day?.id){
      const api=await getCloud(),f={FahrzeugId:String(S.vehicle.id),NutzungId:String(S.usage.cloudId),TagesetappeId:String(S.day.id),BenutzerId:'current',Art:primary?action:`Kontext · ${action}`,Zeitpunkt:timestamp,ErfasstAm:new Date().toISOString(),Herkunft:'Automatisch',Rohdaten:!primary,Notiz:'',Testdaten:testFlag(),Aktiv:true};
      if(pos.lat!=null)f.Breitengrad=pos.lat;if(pos.lon!=null)f.Laengengrad=pos.lon;
      await api.createItemByName('Ereignisse',f);
    }
  }catch(e){console.warn('Cockpit-Kontext konnte nicht gespeichert werden',e)}
  return ctx;
}
async function fp104CockpitAction(action,view,primary=false){
  await fp104Capture(action,primary);
  if(view)go(view);else await cockpit();
}

/* Datumsanzeige appweit deutsch. */
fmtDate=fp104Date;

/* Login nur für sichtbare Versionsnummer überschreiben. */
login=function(){bar.hidden=true;app.innerHTML=`<div class="login"><div class="card"><div class="brand">Fahrzeugplattform</div><p class="muted">Version ${FP104_VERSION}</p><div class="field"><label>Nutzer</label><input value="Admin"></div><div class="field"><label>Passwort</label><input type="password" value="admin"></div><button class="primary" onclick="S.stack=[];S.view='main';render()">Anmelden</button></div></div>`};

/* Render um Wetter erweitern; GPS-Punkt bleibt als alte Route erreichbar, wird aber im Cockpit nicht mehr angeboten. */
render=function(){
  if(S.vehicle)S.vehicle.profile=normalizeProfile(S.vehicle.profile||S.vehicle.profileLabel);
  ({login,main,start,vehicle,usage,setup,cockpit,event,stay,dayend,history:usageHistory,configuration,vehiclesconfig,vehicleedit,vehicleconfigure,usagecatalog,places,persons,personedit,persondetail,animals,areas,areaedit,areadetail,travelcheck,usageDetail,waterski,m365setup,workshop,lending,settings,control,supply,measure,gps,media,crewchange,weather}[S.view]||placeholder)();
};

/* Cockpit: Anfang/Ende als Paar, sichtbarer Unterwegs-Zustand, kein eigener GPS-Punkt. */
cockpit=async function(){
  const p=profileDef();head('Cockpit',`${S.vehicle.name} · ${S.usage.name}`);
  let due=[],events=[];
  try{
    const api=await getCloud(),r=await Promise.all([list(api,'FahrzeugPruefpunkte'),list(api,'Komponenten'),list(api,'Wartungsplaene'),list(api,'Ereignisse')]),fp=r[0],cs=r[1],wp=r[2];events=r[3];
    fp.filter(x=>String(x.fields.FahrzeugId)===String(S.vehicle.id)&&x.fields.Aktiv!==false&&x.fields.NaechstePruefung).forEach(x=>due.push({name:x.fields.Name,source:'Fahrzeugprüfung',days:daysUntil(x.fields.NaechstePruefung)}));
    cs.filter(x=>String(x.fields.FahrzeugId)===String(S.vehicle.id)&&x.fields.Aktiv!==false&&x.fields.Pruefpflicht&&x.fields.NaechstePruefung).forEach(x=>due.push({name:x.fields.Name,source:'Komponente',days:daysUntil(x.fields.NaechstePruefung)}));
    wp.filter(x=>String(x.fields.FahrzeugId)===String(S.vehicle.id)&&x.fields.Aktiv!==false&&x.fields.NaechsterTermin).forEach(x=>due.push({name:x.fields.Name,source:'Werkstatt / Service',days:daysUntil(x.fields.NaechsterTermin)}));
  }catch(e){console.warn(e)}
  due=due.filter(x=>x.days!==null&&x.days<=60).sort((a,b)=>a.days-b.days);
  const depArt=S.vehicle.profile==='motorboat'?'Ablegen':'Abfahrt',arrArt=S.vehicle.profile==='motorboat'?'Anlegen / Ankern':'Ankunft / Parken',
    own=events.filter(x=>String(x.fields.TagesetappeId)===String(S.day?.id)&&x.fields.Rohdaten!==true&&[depArt,arrArt].includes(x.fields.Art)).sort((a,b)=>String(a.fields.Zeitpunkt||'').localeCompare(String(b.fields.Zeitpunkt||''))),
    last=own[own.length-1],underway=last?.fields?.Art===depArt,
    lastDep=[...own].reverse().find(x=>x.fields.Art===depArt),lastArr=[...own].reverse().find(x=>x.fields.Art===arrArt),
    depTime=lastDep?.fields?.Zeitpunkt||null,arrTime=!underway&&lastArr?.fields?.Zeitpunkt||null,
    dur=depTime?(underway?Date.now()-new Date(depTime).getTime():(arrTime?new Date(arrTime).getTime()-new Date(depTime).getTime():0)):0,
    goal=S.day?.goal||'';
  if(FP104.cockpitTimer){clearInterval(FP104.cockpitTimer);FP104.cockpitTimer=null}
  app.innerHTML=`${due.length?`<div class="card due-card"><div class="section first">Fälligkeiten</div>${due.map(x=>`<div class="due-line"><b>${esc(x.name)}</b><span>${esc(x.source)} · ${dueText(x.days)}</span></div>`).join('')}</div>`:''}
  <div class="card fp-movement-card">
    <div class="fp-pair">
      <button class="${underway?'fp-active':''}" ${underway?'disabled':''} onclick="fp104CockpitAction('${depArt}',null,true)">${depArt}${depTime?` · ${fp104Time(depTime)}`:''}${underway?' ✓':''}</button>
      <button class="${!underway&&arrTime?'fp-done':''}" onclick="fp104CockpitAction('${arrArt}','stay',true)">${arrArt}${arrTime?` · ${fp104Time(arrTime)}`:''}${!underway&&arrTime?' ✓':''}</button>
    </div>
    <div class="fp-live-status">${underway?`<b>Unterwegs seit ${fp104Time(depTime)}</b> · Fahrzeit <span id="fpTravelTime">${fp104Duration(dur)}</span>${goal?` · Ziel ${esc(goal)}`:''} · ETA –`:arrTime?`<b>Angekommen ${fp104Time(arrTime)}</b>${depTime?` · Fahrzeit ${fp104Duration(dur)}`:''}`:'Noch nicht abgefahren.'}</div>
  </div>
  <div class="cockpit"><button onclick="fp104CockpitAction('Kontrolle','control')">Kontrolle</button><button onclick="fp104CockpitAction('Ereignis','event')">Ereignis</button></div>
  <div class="secondary"><button onclick="fp104CockpitAction('Tanken / Versorgung','supply')">Tanken / Versorgung</button><button onclick="fp104CockpitAction('Messwert / Füllstand','measure')">Messwert / Füllstand</button><button onclick="fp104CockpitAction('Wetter','weather')">Wetter</button><button onclick="fp104CockpitAction('Foto / Film','media')">Foto / Film</button><button onclick="fp104CockpitAction('Besatzung ändern','crewchange')">Besatzung ändern</button><button onclick="fp104CockpitAction('Tagesabschluss','dayend')">Tagesabschluss</button></div>`;
  if(underway&&depTime){FP104.cockpitTimer=setInterval(()=>{const el=document.getElementById('fpTravelTime');if(el)el.textContent=fp104Duration(Date.now()-new Date(depTime).getTime());else{clearInterval(FP104.cockpitTimer);FP104.cockpitTimer=null}},30000)}
};

/* Ereignis: Zeitpunkt/GPS kommen vom Cockpit-Tipp; Wegpunkt ist normale Ereignisart. */
event=async function(){
  head('Ereignis / Nachtrag',S.vehicle?.name||'Nutzung');
  try{
    const api=await getCloud(),[orts,sites]=await Promise.all([list(api,'Orte'),list(api,'Standorte')]);S.locationData={orts,sites};
    const p=profileDef(),ctx=S.pendingContext||{timestamp:new Date().toISOString(),lat:null,lon:null,accuracy:null},local=fp104LocalInput(ctx.timestamp),near=fp104Nearest(orts,sites,ctx.lat,ctx.lon);
    const types=[...p.events];if(!types.includes('Wegpunkt / Position'))types.push('Wegpunkt / Position');if(!types.includes('Nachtrag / Sonstiges'))types.push('Nachtrag / Sonstiges');
    app.innerHTML=`<div class="card"><div class="field"><label>Ereignisart</label><select id="evType">${types.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>
      <div class="fp-compact-time"><span><b>Zeitpunkt</b><small>beim Cockpit-Tipp erfasst · für Nachträge änderbar</small></span><input id="evWhen" type="datetime-local" value="${local}"></div>
      ${locSelect('ev','Ort / Standort (optional)',orts,sites)}${fp104Suggestion('ev',near)}
      <div class="fp-gps-line"><span>GPS</span><input id="evLat" type="number" step="0.000001" value="${ctx.lat??''}" placeholder="Breitengrad"><input id="evLon" type="number" step="0.000001" value="${ctx.lon??''}" placeholder="Längengrad">${ctx.accuracy?`<small>± ${Math.round(ctx.accuracy)} m</small>`:''}</div>
      <div class="field"><label>Bemerkung</label><textarea id="evNote"></textarea></div><button class="primary" onclick="saveEventV104()">Speichern</button></div>`;
    refreshSiteOptions('ev');
  }catch(e){failBox(e)}
};
async function saveEventV104(){
  try{
    const api=await getCloud(),loc=locValue('ev',S.locationData.orts,S.locationData.sites),when=evWhen.value?new Date(evWhen.value).toISOString():(S.pendingContext?.timestamp||new Date().toISOString()),now=new Date().toISOString(),isBackfill=Math.abs(new Date(now)-new Date(when))>5*60*1000,
      f={FahrzeugId:String(S.vehicle.id),NutzungId:String(S.usage.cloudId),TagesetappeId:String(S.day?.id||''),BenutzerId:'current',Art:evType.value,Zeitpunkt:when,ErfasstAm:now,Herkunft:isBackfill?'Nachtrag':'Manuell',Rohdaten:false,Notiz:evNote.value.trim(),OrtId:loc.ortId,StandortId:loc.standortId,Testdaten:testFlag(),Aktiv:true};
    if(evLat.value)f.Breitengrad=Number(evLat.value);if(evLon.value)f.Laengengrad=Number(evLon.value);
    await api.createItemByName('Ereignisse',f);S.pendingContext=null;back();
  }catch(e){alert(e.message)}
}

/* Anlegen / Parken: Ankunftszeit/GPS sind bereits beim Cockpit-Tipp gesichert; hier werden Ort und Aufenthaltsart ergänzt. */
stay=async function(){
  head(S.vehicle.profile==='motorboat'?'Anlegen / Ankern':'Ankunft / Parken',S.vehicle.name);
  try{
    const api=await getCloud(),[orts,sites]=await Promise.all([list(api,'Orte'),list(api,'Standorte')]);S.locationData={orts,sites};
    const ctx=S.pendingContext||{timestamp:new Date().toISOString(),lat:null,lon:null,accuracy:null},near=fp104Nearest(orts,sites,ctx.lat,ctx.lon);
    app.innerHTML=`<div class="card"><div class="fp-compact-time"><span><b>Ankunft</b><small>beim Cockpit-Tipp erfasst</small></span><span>${fp104Date(ctx.timestamp)} · ${fp104Time(ctx.timestamp)}</span></div>
      <div class="field"><label>Aufenthaltsart</label><select id="stType">${profileDef().stays.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>${locSelect('st','Ort / Standort',orts,sites)}${fp104Suggestion('st',near)}
      <div class="fp-gps-read">GPS: ${ctx.lat!=null?`${ctx.lat.toFixed(6)} · ${ctx.lon.toFixed(6)}${ctx.accuracy?` · ± ${Math.round(ctx.accuracy)} m`:''}`:'nicht verfügbar'}</div>
      <button class="primary" onclick="saveStayV104()">Speichern</button></div>`;refreshSiteOptions('st');
  }catch(e){failBox(e)}
};
async function saveStayV104(){
  try{
    const api=await getCloud(),l=locValue('st',S.locationData.orts,S.locationData.sites),ctx=S.pendingContext||{timestamp:new Date().toISOString(),lat:null,lon:null,accuracy:null},f={FahrzeugId:String(S.vehicle.id),NutzungId:String(S.usage.cloudId),TagesetappeId:String(S.day.id),Art:stType.value,Ort:l.text,OrtId:l.ortId,StandortId:l.standortId,Beginn:ctx.timestamp,Testdaten:testFlag(),Aktiv:true};
    if(ctx.lat!=null)f.Breitengrad=ctx.lat;if(ctx.lon!=null)f.Laengengrad=ctx.lon;if(ctx.accuracy!=null)f.GenauigkeitM=ctx.accuracy;
    try{await api.createItemByName('Aufenthalte',f)}catch(e){delete f.Breitengrad;delete f.Laengengrad;delete f.GenauigkeitM;await api.createItemByName('Aufenthalte',f)}
    if(l.text){S.day.goal=l.text;try{await api.updateItemByName('Tagesetappen',S.day.id,{TatsaechlichesZiel:l.text})}catch{}const rec=JSON.parse(localStorage.getItem('fp-current')||'{}');if(rec.day){rec.day.goal=l.text;localStorage.setItem('fp-current',JSON.stringify(rec))}}
    S.pendingContext=null;back();
  }catch(e){alert(e.message)}
}

/* Wetter / Umweltbedingungen als eigener Datensatz. */
weather=async function(){
  head('Wetter / Umweltbedingungen',S.vehicle.name);
  const ctx=S.pendingContext||{timestamp:new Date().toISOString(),lat:null,lon:null,accuracy:null},boat=S.vehicle.profile==='motorboat';
  app.innerHTML=`<div class="card"><div class="fp-compact-time"><span><b>Zeitpunkt</b><small>beim Cockpit-Tipp erfasst</small></span><span>${fp104Date(ctx.timestamp)} · ${fp104Time(ctx.timestamp)}</span></div>
    <div class="fp-gps-read">GPS: ${ctx.lat!=null?`${ctx.lat.toFixed(6)} · ${ctx.lon.toFixed(6)}${ctx.accuracy?` · ± ${Math.round(ctx.accuracy)} m`:''}`:'nicht verfügbar'}</div>
    <div class="grid compact"><div class="field"><label>Temperatur °C</label><input id="weTemp" type="number" step="0.1"></div><div class="field"><label>Luftfeuchte %</label><input id="weHum" type="number" step="1"></div><div class="field"><label>Luftdruck hPa</label><input id="wePress" type="number" step="0.1"></div><div class="field"><label>Sichtweite km</label><input id="weVis" type="number" step="0.1"></div></div>
    <div class="grid compact"><div class="field"><label>Windrichtung</label><input id="weDir" placeholder="z. B. WSW"></div><div class="field"><label>Wind km/h</label><input id="weWind" type="number" step="0.1"></div><div class="field"><label>Böen km/h</label><input id="weGust" type="number" step="0.1"></div><div class="field"><label>Bewölkung %</label><input id="weCloud" type="number" step="1"></div></div>
    <div class="grid compact"><div class="field"><label>Niederschlag</label><input id="weRain" placeholder="kein / Regen / Schnee …"></div>${boat?`<div class="field"><label>Wassertemperatur °C</label><input id="weWater" type="number" step="0.1"></div><div class="field"><label>Wellenhöhe m</label><input id="weWave" type="number" step="0.1"></div><div class="field"><label>Beaufort</label><input id="weBft" type="number" min="0" max="12"></div>`:''}</div>
    ${boat?`<div class="field"><label>Seegang</label><input id="weSea" placeholder="ruhig / leicht / mäßig …"></div>`:''}<div class="field"><label>Wetterbeschreibung</label><textarea id="weDesc"></textarea></div><button class="primary" onclick="saveWeather104()">Wetter speichern</button></div>`;
};
async function saveWeather104(){
  try{
    const api=await getCloud(),ctx=S.pendingContext||{timestamp:new Date().toISOString(),lat:null,lon:null},num=id=>{const el=document.getElementById(id);return el&&el.value!==''?Number(el.value):null},f={FahrzeugId:String(S.vehicle.id),NutzungId:String(S.usage.cloudId),TagesetappeId:String(S.day.id),Zeitpunkt:ctx.timestamp,Windrichtung:weDir.value.trim(),Niederschlag:weRain.value.trim(),Wetterbeschreibung:weDesc.value.trim(),Quelle:'Manuell',Testdaten:testFlag(),Aktiv:true};
    const pairs=[['Breitengrad',ctx.lat],['Laengengrad',ctx.lon],['Temperatur',num('weTemp')],['Luftfeuchte',num('weHum')],['Luftdruck',num('wePress')],['Sichtweite',num('weVis')],['Windgeschwindigkeit',num('weWind')],['Boeen',num('weGust')],['Bewoelkung',num('weCloud')],['Wassertemperatur',num('weWater')],['Wellenhoehe',num('weWave')],['Beaufort',num('weBft')]];for(const [k,v] of pairs)if(v!=null)f[k]=v;if(document.getElementById('weSea'))f.Seegang=weSea.value.trim();
    await api.createItemByName('Wetterdaten',f);S.pendingContext=null;back();
  }catch(e){alert('Wetter konnte nicht gespeichert werden: '+e.message+'\nBitte Microsoft 365 Setup für Version 1.0.4 einmal ausführen.')}
}

/* Tagesabschluss: Ort stammt aus Ankunft; Fokus auf Highlights und Tagebuch. */
dayend=async function(){
  head('Tagesabschluss',S.vehicle.name);let actual=S.day?.goal||'';
  try{const api=await getCloud(),st=(await list(api,'Aufenthalte')).filter(x=>String(x.fields.TagesetappeId)===String(S.day?.id)&&x.fields.Aktiv!==false).sort((a,b)=>String(a.fields.Beginn||'').localeCompare(String(b.fields.Beginn||'')));const x=st[st.length-1];if(x)actual=x.fields.Ort||actual}catch{}
  S.dayEndLocation=actual;
  app.innerHTML=`<div class="card"><div class="fp-summary-line"><span><b>Tagesziel / Aufenthaltsort</b></span><span>${esc(actual||'noch nicht erfasst')}</span></div>${endMeters()}
    <div class="field"><label>Highlights des Tages</label><textarea id="dayHighlights" rows="2" placeholder="Was war heute besonders?"></textarea></div><div class="field"><label>Tagebuch / Tagesrückblick</label><textarea id="dayDiary" class="fp-diary" placeholder="Der persönliche Tagesbericht …"></textarea></div>
    <div class="fp-pair"><button class="primary" onclick="finishV104(true)">Tag abschließen · Nutzung fortsetzen</button><button onclick="finishV104(false)">Tag abschließen · Nutzung beenden</button></div></div>`;
};
async function finishV104(continueUsage){
  try{
    const api=await getCloud(),now=new Date().toISOString(),vals=[...document.querySelectorAll('[id^=em]')].map(x=>x.value),base={TatsaechlichesZiel:S.dayEndLocation||S.day?.goal||'',Ende:now,Status:'Abgeschlossen',Tagesbericht:dayDiary.value.trim()};
    try{await api.updateItemByName('Tagesetappen',S.day.id,{...base,Highlights:dayHighlights.value.trim()})}catch(e){await api.updateItemByName('Tagesetappen',S.day.id,base);if(dayHighlights.value.trim())await api.createItemByName('Ereignisse',{FahrzeugId:String(S.vehicle.id),NutzungId:String(S.usage.cloudId),TagesetappeId:String(S.day.id),BenutzerId:'current',Art:'Tageshighlight',Zeitpunkt:now,ErfasstAm:now,Herkunft:'Manuell',Rohdaten:false,Notiz:dayHighlights.value.trim(),Testdaten:testFlag(),Aktiv:true})}
    for(let i=0;i<(S.metrics||[]).length;i++){if(vals[i]==='')continue;const m=S.metrics[i];await api.createItemByName('Messwerte',{FahrzeugId:String(S.vehicle.id),NutzungId:String(S.usage.cloudId),TagesetappeId:String(S.day.id),KomponenteId:m.componentId,Messgroesse:m.measure,Wert:Number(vals[i]),Einheit:m.unit,Phase:'Ende',GemessenAm:now,Quelle:'Manuell',Testdaten:testFlag(),Aktiv:true})}
    if(!continueUsage)await api.updateItemByName('Nutzungen',S.usage.cloudId,{Ende:now,Status:'Beendet',GeaendertAm:now});else await api.updateItemByName('Nutzungen',S.usage.cloudId,{Status:'Aktiv',GeaendertAm:now});
    localStorage.removeItem('fp-current');S.pendingContext=null;S.stack=[];S.view='start';render();
  }catch(e){alert(e.message)}
}

/* Werkstatt: Status direkt am Eintrag bedienen. */
async function fp104SetWorkshopStatus(listName,id,field,status,dateField){
  try{const api=await getCloud(),fields={[field]:status};if(dateField)fields[dateField]=new Date().toISOString();try{await api.updateItemByName(listName,id,fields)}catch(e){if(dateField){delete fields[dateField];await api.updateItemByName(listName,id,fields)}else throw e}await workshop()}catch(e){alert(e.message)}
}
workshop=async function(){
  head('Werkstatt','Störungen · Wartung · Arbeiten · Aufgaben · Prüfungen');app.innerHTML='<div class="card">Werkstattdaten werden geladen …</div>';
  try{
    const api=await getCloud(),[vs,st,wo,wp,tasks,ins]=await Promise.all([list(api,'Fahrzeuge'),list(api,'Stoerungen'),list(api,'Arbeiten'),list(api,'Wartungsplaene'),list(api,'Aufgaben'),list(api,'Pruefungen')]),vopt=vs.filter(x=>x.fields.Aktiv!==false).map(x=>`<option value="${x.id}">${esc(x.fields.Fahrzeugname||x.fields.Title)}</option>`).join(''),vm=Object.fromEntries(vs.map(x=>[String(x.id),x.fields.Fahrzeugname||x.fields.Title]));
    const taskButtons=x=>x.fields.Status==='Erledigt'?'':`<div class="row-actions">${x.fields.Status!=='In Arbeit'?`<button onclick="fp104SetWorkshopStatus('Aufgaben','${x.id}','Status','In Arbeit')">In Arbeit</button>`:''}<button onclick="fp104SetWorkshopStatus('Aufgaben','${x.id}','Status','Erledigt','AbgeschlossenAm')">Erledigt</button></div>`;
    const störButtons=x=>x.fields.Status==='Behoben'?'':`<div class="row-actions">${x.fields.Status!=='In Arbeit'?`<button onclick="fp104SetWorkshopStatus('Stoerungen','${x.id}','Status','In Arbeit')">In Arbeit</button>`:''}<button onclick="fp104SetWorkshopStatus('Stoerungen','${x.id}','Status','Behoben','BehobenAm')">Behoben</button></div>`;
    const workButtons=x=>x.fields.Status==='Abgeschlossen'?'':`<div class="row-actions">${x.fields.Status!=='In Arbeit'?`<button onclick="fp104SetWorkshopStatus('Arbeiten','${x.id}','Status','In Arbeit')">In Arbeit</button>`:''}<button onclick="fp104SetWorkshopStatus('Arbeiten','${x.id}','Status','Abgeschlossen','AbgeschlossenAm')">Abgeschlossen</button></div>`;
    const insButtons=x=>`<div class="row-actions"><button onclick="fp104SetWorkshopStatus('Pruefungen','${x.id}','Ergebnis','Bestanden')">Bestanden</button><button onclick="fp104SetWorkshopStatus('Pruefungen','${x.id}','Ergebnis','Beanstandet')">Beanstandet</button></div>`;
    app.innerHTML=`<div class="card"><div class="section first">Neue Störung / Aufgabe / Prüfung</div><select id="wkVehicle">${vopt}</select><div class="grid compact"><input id="wkDesc" placeholder="Beschreibung"><select id="wkKind"><option>Störung</option><option>Aufgabe</option><option>Wartungsplan</option><option>Prüfung</option><option>Arbeit / Reparatur</option></select><input id="wkDue" type="date"></div><button class="primary" onclick="addWorkshopEntry()">Eintrag anlegen</button></div>
      <div class="card"><div class="section first">Störungen</div>${st.filter(x=>x.fields.Aktiv!==false).map(x=>`<div class="line"><div><b>${esc(vm[String(x.fields.FahrzeugId)]||'')} · ${esc(x.fields.Kategorie||'Störung')}</b><div>${esc(x.fields.Beschreibung||'')}</div><div class="muted">${esc(x.fields.Status||'Offen')} · ${esc(x.fields.Prioritaet||'')}</div></div>${störButtons(x)}</div>`).join('')||'<p class="muted">Keine Störungen.</p>'}</div>
      <div class="card"><div class="section first">Aufgaben</div>${tasks.map(x=>`<div class="line"><div><b>${esc(x.fields.Aufgabe||'')}</b><div class="muted">${fp104Date(x.fields.FaelligAm)} · ${esc(x.fields.Status||'Offen')}</div></div>${taskButtons(x)}</div>`).join('')||'<p class="muted">Keine Aufgaben.</p>'}</div>
      <div class="card"><div class="section first">Wartung / Prüfungen / Arbeiten</div>${wp.map(x=>`<div class="line"><div><b>Wartung: ${esc(x.fields.Name||'')}</b><div class="muted">${esc(x.fields.IntervallRegel||'aktiv')}</div></div></div>`).join('')}${ins.map(x=>`<div class="line"><div><b>Prüfung: ${esc(x.fields.Art||'')}</b><div class="muted">gültig bis ${fp104Date(x.fields.GueltigBis)} · ${esc(x.fields.Ergebnis||'Offen')}</div></div>${insButtons(x)}</div>`).join('')}${wo.map(x=>`<div class="line"><div><b>Arbeit: ${esc(x.fields.Arbeitsart||'')}</b><div>${esc(x.fields.Beschreibung||'')}</div><div class="muted">${esc(x.fields.Status|| (x.fields.AbgeschlossenAm?'Abgeschlossen':'Offen'))}</div></div>${workButtons(x)}</div>`).join('')}</div>`;
  }catch(e){failBox(e)}
};

/* Verleih: sichtbare Aktionen, deutsche Datumsanzeige, vorausgefüllte Beginn/Ende-Felder, Archiv. */
function fp104LendingArchived(x){return x.fields.Archiviert===true||x.fields.Status==='Archiviert'||(x.fields.Aktiv===false&&x.fields.Status==='Beendet')}
function fp104LendingActions(x){
  const s=x.fields.Status||'Vorbereitet';
  if(s==='Vorbereitet')return `<button onclick="editLending('${x.id}')">Bearbeiten</button><button class="danger-lite" onclick="deleteLending104('${x.id}')">Löschen</button>`;
  if(s==='Aktiv')return `<button onclick="editLending('${x.id}')">Bearbeiten</button><button onclick="endLending104('${x.id}')">Beenden</button>`;
  if(s==='Beendet')return `<button onclick="editLending('${x.id}')">Bearbeiten</button><button onclick="archiveLending104('${x.id}')">Archivieren</button>`;
  return '';
}
async function deleteLending104(id){if(!confirm('Vorbereitete Überlassung wirklich löschen?'))return;try{const api=await getCloud();for(const p of (S.lendData?.ups||[]).filter(x=>String(x.fields.UeberlassungId)===String(id)))await api.deleteItemByName('UeberlassungsPersonen',p.id);await api.deleteItemByName('Fahrzeugueberlassungen',id);await lending()}catch(e){alert(e.message)}}
async function endLending104(id){if(!confirm('Überlassung als beendet markieren?'))return;try{const api=await getCloud();try{await api.updateItemByName('Fahrzeugueberlassungen',id,{Status:'Beendet',BeendetAm:new Date().toISOString()})}catch{await api.updateItemByName('Fahrzeugueberlassungen',id,{Status:'Beendet'})}await lending()}catch(e){alert(e.message)}}
async function archiveLending104(id){if(!confirm('Beendete Überlassung archivieren? Alle Daten bleiben erhalten.'))return;try{const api=await getCloud();try{await api.updateItemByName('Fahrzeugueberlassungen',id,{Status:'Archiviert',Archiviert:true,ArchiviertAm:new Date().toISOString(),Aktiv:false})}catch{await api.updateItemByName('Fahrzeugueberlassungen',id,{Aktiv:false})}await lending()}catch(e){alert(e.message)}}
function toggleLendingArchive104(){FP104.showLendingArchive=!FP104.showLendingArchive;lending()}
function removeLendingPerson104(i){S.lendSelected.splice(i,1);renderLendingEditor(S.editLendingId?S.lendData.ls.find(x=>String(x.id)===String(S.editLendingId)):null)}
lending=async function(){
  head('Verleihmodus','Fahrzeugüberlassung · Leiher und Gäste');app.innerHTML='<div class="card">Verleihdaten werden geladen …</div>';
  try{
    const api=await getCloud(),[vs,ps,ls,ups,animals]=await Promise.all([list(api,'Fahrzeuge'),list(api,'Personen'),list(api,'Fahrzeugueberlassungen'),list(api,'UeberlassungsPersonen'),list(api,'Tiere')]);S.lendData={vs,ps,ls,ups,animals};S.lendSelected=[];
    const vm=Object.fromEntries(vs.map(x=>[String(x.id),x.fields.Fahrzeugname||x.fields.Title])),pm=Object.fromEntries(ps.map(x=>[String(x.id),x.fields.Anzeigename||x.fields.Title])),normal=ls.filter(x=>!fp104LendingArchived(x)),archived=ls.filter(fp104LendingArchived),row=x=>{const members=ups.filter(p=>String(p.fields.UeberlassungId)===String(x.id)&&p.fields.Aktiv!==false),names=members.map(m=>esc(pm[String(m.fields.PersonId)]||'')).join(', ')||esc(pm[String(x.fields.LeiherPersonId)]||'');return `<div class="fp-lending-card"><div><b>${esc(vm[String(x.fields.FahrzeugId)]||'Fahrzeug')}</b><div>${names}</div><div class="muted">${fp104Date(x.fields.Beginn)} bis ${fp104Date(x.fields.Ende)} · ${esc(x.fields.Status||'')}</div></div><div class="row-actions">${fp104LendingActions(x)}</div></div>`};
    app.innerHTML=`<div class="card"><button class="primary" onclick="openNewLending()">Neue Überlassung</button></div><div class="card"><div class="section first">Vorhandene Überlassungen</div>${normal.map(row).join('')||'<p class="muted">Keine offenen Überlassungen.</p>'}<button onclick="toggleLendingArchive104()">Archiv / Auswertung (${archived.length})</button>${FP104.showLendingArchive?`<div class="section">Archiv</div>${archived.map(x=>`<div class="fp-lending-card"><div><b>${esc(vm[String(x.fields.FahrzeugId)]||'Fahrzeug')}</b><div>${ups.filter(p=>String(p.fields.UeberlassungId)===String(x.id)&&p.fields.Aktiv!==false).map(m=>esc(pm[String(m.fields.PersonId)]||'')).join(', ')}</div><div class="muted">${fp104Date(x.fields.Beginn)} bis ${fp104Date(x.fields.Ende)} · archiviert</div></div></div>`).join('')||'<p class="muted">Archiv leer.</p>'}`:''}</div>`;
  }catch(e){failBox(e)}
};
function renderLendingEditor(x){
  const d=S.lendData,selected=new Set((S.lendSelected||[]).map(x=>String(x.personId))),eligible=lendingEligiblePeople(),from=fp104LocalInput(x?.fields?.Beginn),to=fp104LocalInput(x?.fields?.Ende);
  app.innerHTML=`<div class="card"><div class="section first">${x?'Überlassung bearbeiten':'Neue Überlassung'}</div><div class="field"><label>Fahrzeug</label><select id="leVehicle">${d.vs.filter(v=>v.fields.Aktiv!==false).map(v=>`<option value="${v.id}" ${x&&String(x.fields.FahrzeugId)===String(v.id)?'selected':''}>${esc(v.fields.Fahrzeugname||v.fields.Title)}</option>`).join('')}</select></div>
    <div class="fp-pair"><div class="field"><label>Beginn</label><input id="leFrom" type="datetime-local" value="${from}"></div><div class="field"><label>Ende</label><input id="leTo" type="datetime-local" value="${to}"></div></div>
    <div class="section">Personengruppe</div><div class="grid compact"><select id="leAddPerson"><option value="">– Leiher oder Gast auswählen –</option>${eligible.filter(p=>!selected.has(String(p.id))).map(p=>`<option value="${p.id}">${esc(p.fields.Anzeigename||p.fields.Title)} · ${esc(p.fields.Rolle)}</option>`).join('')}</select><button onclick="addLendingPersonSelection()">Person hinzufügen</button></div>
    <div>${(S.lendSelected||[]).map((m,i)=>`<div class="line"><div>${esc((d.ps.find(p=>String(p.id)===String(m.personId))?.fields?.Anzeigename)||'')}</div><div class="row-actions"><select onchange="S.lendSelected[${i}].function=this.value"><option ${m.function==='Leiher'?'selected':''}>Leiher</option><option ${m.function==='Gast'?'selected':''}>Gast</option><option ${m.function==='Fahrer'?'selected':''}>Fahrer</option><option ${m.function==='Skipper'?'selected':''}>Skipper</option></select><button type="button" onclick="removeLendingPerson104(${i})">Entfernen</button></div></div>`).join('')||'<p class="muted">Noch niemand ausgewählt.</p>'}</div>
    <div class="field"><label>Übergabenotiz / Zustand / Hinweise</label><textarea id="leNote">${esc(x?.fields?.UebergabeNotiz||'')}</textarea></div><button class="primary" onclick="saveLending104()">${x?'Änderungen speichern':'Überlassung anlegen'}</button></div>`;
}
async function saveLending104(){
  if(!(S.lendSelected||[]).some(x=>x.function==='Leiher'))return alert('Mindestens eine Person muss als Leiher eingetragen sein.');if(!leFrom.value)return alert('Beginn eingeben.');
  try{
    const api=await getCloud(),primary=S.lendSelected.find(x=>x.function==='Leiher'),old=S.editLendingId?S.lendData.ls.find(x=>String(x.id)===String(S.editLendingId)):null,fields={FahrzeugId:String(leVehicle.value),LeiherPersonId:String(primary.personId),Beginn:new Date(leFrom.value).toISOString(),Ende:leTo.value?new Date(leTo.value).toISOString():null,Status:old?.fields?.Status||'Vorbereitet',UebergabeNotiz:leNote.value.trim(),Gruppenmodus:true,Testdaten:testFlag(),Aktiv:old?.fields?.Aktiv===false?false:true};
    let id=S.editLendingId;if(id){await api.updateItemByName('Fahrzeugueberlassungen',id,fields);for(const o of S.lendData.ups.filter(x=>String(x.fields.UeberlassungId)===String(id)))await api.deleteItemByName('UeberlassungsPersonen',o.id)}else{id=String((await api.createItemByName('Fahrzeugueberlassungen',fields)).id)}
    for(const m of S.lendSelected)await api.createItemByName('UeberlassungsPersonen',{UeberlassungId:String(id),PersonId:String(m.personId),Funktion:m.function,QualifikationStatus:'zu prüfen',Aktiv:true,Testdaten:testFlag()});S.editLendingId=null;await lending();
  }catch(e){alert(e.message)}
}
/* Bestehender Speichern-Button aus 1.0.3 ruft nach Override die neue Logik. */
saveLending103=saveLending104;

/* Reisecheck: echte Auswertung der hinterlegten Anforderungen/Nachweise. */
function fp104MatchRequirement(req,art){const r=fp104Norm(req),a=fp104Norm(art);if(!r||!a)return false;if(r.includes(a)||a.includes(r))return true;const rw=new Set(r.split(' ').filter(x=>x.length>2)),aw=a.split(' ').filter(x=>x.length>2);return aw.some(x=>rw.has(x))}
travelcheck=async function(){
  head('Reisecheck','Fahrzeug + Personen + Tiere + Gebiet · keine rechtsverbindliche Auskunft');app.innerHTML='<div class="card">Stammdaten werden geladen …</div>';
  try{const api=await getCloud(),[vs,ps,gs,as]=await Promise.all([list(api,'Fahrzeuge'),list(api,'Personen'),list(api,'Gebiete'),list(api,'Tiere')]);app.innerHTML=`<div class="card"><div class="field"><label>Fahrzeug</label><select id="tcVehicle">${vs.filter(x=>x.fields.Aktiv!==false).map(v=>`<option value="${v.id}">${esc(v.fields.Fahrzeugname||v.fields.Title)}</option>`).join('')}</select></div><div class="section">Mitreisende Personen</div>${ps.filter(x=>x.fields.Aktiv!==false).map(p=>`<label class="person-tile"><input type="checkbox" data-tcperson="${p.id}"> ${esc(p.fields.Anzeigename||p.fields.Title)}</label>`).join('')}<div class="section">Mitreisende Tiere</div>${as.filter(x=>x.fields.Aktiv!==false).map(a=>`<label class="person-tile"><input type="checkbox" data-tcanimal="${a.id}"> ${esc(a.fields.Name||a.fields.Title)} · ${esc(a.fields.Tierart||'')}</label>`).join('')||'<p class="muted">Keine Tiere.</p>'}<div class="field"><label>Gebiet / Revier</label><select id="tcArea">${gs.map(g=>`<option value="${g.id}">${esc(g.fields.Name||g.fields.Title)}</option>`).join('')}</select></div><button class="primary" onclick="runTravelCheck104()">Check erstellen</button></div><div id="tcResult"></div><div class="card"><b>Hinweis</b><p>Diese Prüfung dient als Planungshilfe und ist keine rechtsverbindliche Auskunft. Anforderungen sind vor Reiseantritt anhand aktueller geeigneter Quellen zu prüfen.</p></div>`}catch(e){failBox(e)}
};
async function runTravelCheck104(){
  const out=document.getElementById('tcResult');out.innerHTML='<div class="card">Prüfung läuft …</div>';
  try{
    const api=await getCloud(),people=checkedIds('tcperson'),pets=checkedIds('tcanimal'),[reqs,quals,tierDocs,vs,ps,animals]=await Promise.all([list(api,'GebietsAnforderungen'),list(api,'Befaehigungen'),list(api,'TierNachweise'),list(api,'Fahrzeuge'),list(api,'Personen'),list(api,'Tiere')]),own=reqs.filter(r=>String(r.fields.GebietId)===String(tcArea.value)),vehicle=vs.find(v=>String(v.id)===String(tcVehicle.value)),pm=Object.fromEntries(ps.map(p=>[String(p.id),p.fields.Anzeigename||p.fields.Title])),am=Object.fromEntries(animals.map(a=>[String(a.id),a.fields.Name||a.fields.Title])),rows=[];
    for(const r of own){const typ=r.fields.SubjektTyp||'Allgemein',text=r.fields.Anforderung||'';
      if(typ==='Person'){
        if(!people.length)rows.push({req:r,subject:'Person',result:'NichtErfuellt',note:'Keine mitreisende Person ausgewählt.'});
        for(const id of people){const hits=quals.filter(q=>String(q.fields.PersonId)===String(id)&&q.fields.Vorhanden!==false&&q.fields.Aktiv!==false&&fp104MatchRequirement(text,q.fields.Art));rows.push({req:r,subject:pm[id]||'Person',result:hits.length?'Erfuellt':'NichtErfuellt',note:hits.length?`Nachweis: ${hits[0].fields.Art}`:'Kein passender hinterlegter Nachweis.'})}
      }else if(typ==='Tier'){
        if(!pets.length)rows.push({req:r,subject:'Tier',result:'NichtErfuellt',note:'Kein mitreisendes Tier ausgewählt.'});
        for(const id of pets){const hits=tierDocs.filter(q=>String(q.fields.TierId)===String(id)&&q.fields.Vorhanden!==false&&q.fields.Aktiv!==false&&fp104MatchRequirement(text,q.fields.Art));rows.push({req:r,subject:am[id]||'Tier',result:hits.length?'Erfuellt':'NichtErfuellt',note:hits.length?`Nachweis: ${hits[0].fields.Art}`:'Kein passender hinterlegter Tiernachweis.'})}
      }else if(typ==='Fahrzeug'){
        const t=fp104Norm(text),f=vehicle?.fields||{};let ok=null,note='Fahrzeuganforderung muss anhand der hinterlegten Fahrzeugdaten geprüft werden.';
        if(/kennzeichen|registrierung|zulassung/.test(t)){ok=!!(f.KennzeichenRegistrierung||f.ZulassungsDokNr);note=ok?'Registrierungs-/Zulassungsdaten hinterlegt.':'Registrierungs-/Zulassungsdaten fehlen.'}
        else if(/hin|cin/.test(t)){ok=!!f.HIN_CIN;note=ok?'HIN/CIN hinterlegt.':'HIN/CIN fehlt.'}
        else if(/fin|vin/.test(t)){ok=!!f.FIN_VIN;note=ok?'FIN/VIN hinterlegt.':'FIN/VIN fehlt.'}
        rows.push({req:r,subject:vehicle?.fields?.Fahrzeugname||'Fahrzeug',result:ok===true?'Erfuellt':ok===false?'NichtErfuellt':'ZuPruefen',note});
      }else rows.push({req:r,subject:typ,result:'ZuPruefen',note:'Manuelle Prüfung erforderlich.'});
    }
    const anyFail=rows.some(x=>x.result==='NichtErfuellt'),anyCheck=rows.some(x=>x.result==='ZuPruefen'),status=anyFail?'Unvollständig':anyCheck?'Zu prüfen':'Vollständig';FP104.lastTravelCheck={vehicleId:String(tcVehicle.value),areaId:String(tcArea.value),rows,status};
    const icon=r=>r==='Erfuellt'?'✓':r==='NichtErfuellt'?'✕':'⚠',cls=status==='Vollständig'?'status-ok':'status-warn';
    out.innerHTML=`<div class="card ${cls}"><b>Ergebnis: ${status}</b>${rows.length?rows.map(x=>`<div class="checkresult"><b>${icon(x.result)} ${esc(x.subject)} · ${esc(x.req.fields.Anforderung||'Anforderung')}</b><div class="muted">${esc(x.note)}</div></div>`).join(''):'<p>Für dieses Gebiet sind noch keine Anforderungen hinterlegt.</p>'}${rows.length?'<button onclick="saveTravelCheck104()">Check speichern</button>':''}</div>`;
  }catch(e){out.innerHTML=`<div class="card status-stop">${esc(e.message)}</div>`}
}
async function saveTravelCheck104(){
  const c=FP104.lastTravelCheck;if(!c)return;
  try{const api=await getCloud(),h=await api.createItemByName('Reisechecks',{NutzungId:'',ErstelltAm:new Date().toISOString(),Status:c.status==='Vollständig'?'Vollstaendig':c.status==='Unvollständig'?'Unvollstaendig':'Offen'});for(const x of c.rows)await api.createItemByName('ReisecheckPunkte',{ReisecheckId:String(h.id),GebietsAnforderungId:String(x.req.id),SubjektTyp:x.req.fields.SubjektTyp||'',SubjektId:'',Anforderung:x.req.fields.Anforderung||'',Ergebnis:x.result==='Erfuellt'?'Erfuellt':x.result==='NichtErfuellt'?'NichtErfuellt':'ZuPruefen',Notiz:`${x.subject}: ${x.note}`});alert('Reisecheck gespeichert.')}catch(e){alert(e.message)}
}
runTravelCheck101=runTravelCheck104;

/* M365 Setup 1.0.4: Basisschema + additive Ergänzungen zu einem eindeutigen Schema zusammenführen. */
function fp104MergeSchemas(base,ext){
  const map=new Map();for(const l of [...(base.lists||[]),...(ext.lists||[])]){const k=l.internalName;if(!map.has(k))map.set(k,{...l,fields:[...(l.fields||[])]});else{const t=map.get(k),seen=new Set(t.fields.map(f=>f.internalName));for(const f of l.fields||[])if(!seen.has(f.internalName)){t.fields.push(f);seen.add(f.internalName)}}}return {...base,version:'1.0.4',lists:[...map.values()]};
}
m365setup=function(){head('Microsoft 365 Setup','Schema 1.0.4 · Phase 1 · additiv');const tok=window.FPAuth.token();app.innerHTML=`<div class="card"><b>Microsoft-Anmeldung</b><div id="authState">${tok?'✓ Microsoft-Token vorhanden':'Noch nicht mit Microsoft verbunden'}</div>${tok?'<button onclick="FPAuth.logout();render()">Microsoft-Verbindung trennen</button>':'<button class="primary" onclick="sessionStorage.setItem(\'fp_after_auth\',\'m365setup\');FPAuth.login()">Mit Microsoft 365 anmelden</button>'}</div><div class="card"><div class="field"><label>SharePoint-Site-URL</label><input id="spSite" value="${esc(localStorage.getItem('fp_sp_site')||'')}" placeholder="https://…sharepoint.com/sites/Fahrzeugplattform"></div><button class="primary" ${tok?'':'disabled'} onclick="runM365Provision104()">Phase-1-Struktur prüfen / anlegen</button><p class="muted">Additiv und wiederholbar: vorhandene Listen/Felder bleiben bestehen, fehlende werden ergänzt.</p></div><div id="m365Result"></div>`};
async function runM365Provision104(){
  const url=document.getElementById('spSite').value.trim();if(!url)return alert('Bitte die vollständige SharePoint-Site-URL eintragen.');localStorage.setItem('fp_sp_site',url);const out=document.getElementById('m365Result');out.innerHTML='<div class="card">Schema 1.0.4 wird geladen …</div>';
  try{const [base,ext]=await Promise.all([fetch('phase1-sharepoint-schema.json',{cache:'no-store'}).then(r=>r.json()),fetch('phase1-sharepoint-schema-1.0.4.json',{cache:'no-store'}).then(r=>r.json())]),schema=fp104MergeSchemas(base,ext),setup=new FPGraphSetup(FPAuth.token(),url,schema),site=await setup.resolveSite();let lines=[];out.innerHTML=`<div class="card"><b>Verbunden:</b> ${esc(site.displayName)}<div id="provLog" class="muted">Prüfung startet …</div></div>`;const log=document.getElementById('provLog'),res=await setup.provision(e=>{if(e.status==='created')lines.push(`${e.kind==='list'?'Liste':'Feld'} angelegt: ${e.kind==='field'?e.list+' · ':''}${e.name}`);if(log)log.innerHTML=`Fortschritt: ${esc(e.kind==='field'?e.list+' · '+e.name:e.name)}<br>${lines.slice(-8).map(esc).join('<br>')}`});out.innerHTML=`<div class="card status-ok"><b>Setup abgeschlossen und verifiziert</b><p>${res.totalLists} Listen geprüft · ${res.listsCreated} neu angelegt · ${res.fieldsCreated} Felder neu angelegt · ${res.verifiedLists} Listen für die App erreichbar.</p></div>`}catch(e){out.innerHTML=`<div class="card status-stop"><b>Setup nicht abgeschlossen</b><p>${esc(e.message)}</p></div>`}
}
runM365Provision=runM365Provision104;

/* Datenexport/Testdaten kennen auch die 1.0.4-Erweiterungen. */
exportPhase1Data=async function(){
  try{const [base,ext]=await Promise.all([fetch('phase1-sharepoint-schema.json',{cache:'no-store'}).then(r=>r.json()),fetch('phase1-sharepoint-schema-1.0.4.json',{cache:'no-store'}).then(r=>r.json())]),schema=fp104MergeSchemas(base,ext),api=await getCloud(),data={exportedAt:new Date().toISOString(),version:FP104_VERSION,lists:{}};for(const l of schema.lists){try{data.lists[l.internalName]=await list(api,l.internalName)}catch(e){data.lists[l.internalName]={error:e.message}}}const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Fahrzeugplattform_Export_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}catch(e){alert(e.message)}
};
clearTestData=async function(){
  if(!confirm('Alle als Testdaten markierten Bewegungs-/Vorgangsdaten wirklich löschen? Stammdaten bleiben erhalten.'))return;try{const api=await getCloud(),targets=['NutzungsPersonen','NutzungsTiere','NutzungsZwischenziele','Tagesetappen','Ereignisse','Aufenthalte','GPSPunkte','Messwerte','Versorgungsvorgaenge','Kontrollen','Arbeiten','Aufgaben','Pruefungen','Medien','Dokumente','Ausgaben','Wetterdaten','Fahrzeugueberlassungen','UeberlassungsPersonen','ReisecheckPunkte','Reisechecks','Stoerungen','Nutzungen'];let count=0;for(const ln of targets){let rows=[];try{rows=await list(api,ln)}catch{}for(const r of rows.filter(x=>x.fields.Testdaten===true)){try{await api.deleteItemByName(ln,r.id);count++}catch{}}}alert(`${count} Testdatensätze gelöscht.`)}catch(e){alert(e.message)}
};

/* Zusätzliche, responsive Darstellung. */
(()=>{const s=document.createElement('style');s.textContent=`
.fp-pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:stretch}.fp-pair>button{min-height:58px}.fp-active{border:2px solid #111!important;background:#111!important;color:#fff!important;opacity:1!important}.fp-done{border:2px solid #111!important}.fp-live-status{margin-top:12px;font-size:1rem}.fp-compact-time,.fp-summary-line{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:10px 0 16px}.fp-compact-time span{display:flex;flex-direction:column}.fp-compact-time small{color:#666;font-weight:400}.fp-compact-time input{width:auto;min-width:230px;padding:8px 10px}.fp-gps-line{display:grid;grid-template-columns:auto 1fr 1fr auto;gap:10px;align-items:center;margin:12px 0}.fp-gps-line input{min-width:0}.fp-gps-read{color:#666;margin:8px 0 14px}.fp-suggestion{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 12px;border:1px solid #ddd;border-radius:12px;margin:10px 0;flex-wrap:wrap}.fp-diary{min-height:180px}.fp-lending-card{display:flex;justify-content:space-between;gap:20px;align-items:center;border:1px solid #ddd;border-radius:14px;padding:16px;margin:10px 0}.fp-lending-card .row-actions{display:flex;gap:8px;flex-wrap:wrap}.checkresult{padding:10px 0;border-bottom:1px solid #eee}.checkresult:last-child{border-bottom:0}@media(max-width:620px){.fp-pair{grid-template-columns:1fr}.fp-gps-line{grid-template-columns:1fr}.fp-compact-time{align-items:flex-start}.fp-compact-time input{width:100%;min-width:0}.fp-lending-card{align-items:flex-start;flex-direction:column}}
`;document.head.appendChild(s)})();

/* Version in Shell aktualisieren. */
document.title=`Fahrzeugplattform ${FP104_VERSION}`;const foot=document.querySelector('footer');if(foot)foot.textContent=`Fahrzeugplattform · ${FP104_VERSION} · © 2026 Entwicklungsstand`;

/* Nach Laden des Patches aktuelle Ansicht mit den neuen Funktionen zeichnen. */
try{render()}catch(e){console.warn(e)}
