/* MOBIMORY / Fahrzeugplattform 1.0.5.1-dev
   Korrektur/Ausbau auf Basis 1.0.5-dev:
   - Wartungsplan: fehlendes SharePoint-Feld Testdaten
   - Werkstattansicht: Fahrzeug bei Aufgaben, Wartungen, Prüfungen und Arbeiten sichtbar
   - Wohnmobil: erforderliche Fahrerlaubnisklasse direkt am Fahrzeug hinterlegen
   - Ereignisarten: konfigurierbarer Stamm statt ausschließlich fest im Code
   Der automatische Online-Reisecheck bleibt für 1.0.6-dev vorgesehen. */

const FP1051_VERSION='1.0.5.1-dev';

/* ---------- Ereignisarten-Stamm ---------- */
function fp1051EventProfileLabel(){return S.vehicle?.profile==='motorhome'?'Wohnmobil':'Motorboot'}
function fp1051EventProfileMatch(row,profile){
  const p=String(row?.fields?.Profil||'Allgemein').trim();
  return p==='Allgemein'||p===profile;
}
function fp1051EventFallback(){
  const p=profileDef(),out=(p.events||[]).map((name,i)=>({id:'',fields:{Name:name,Profil:fp1051EventProfileLabel(),Aktiv:true,System:false,Sortierung:(i+1)*10}}));
  for(const name of ['Wegpunkt / Position','Nachtrag / Sonstiges'])if(!out.some(x=>x.fields.Name===name))out.push({id:'',fields:{Name:name,Profil:'Allgemein',Aktiv:true,System:true,Sortierung:900+out.length}});
  return out;
}
function fp1051EventRowsForCurrentProfile(rows){
  const profile=fp1051EventProfileLabel(),scoped=(rows||[]).filter(x=>fp1051EventProfileMatch(x,profile));
  let active=scoped.filter(x=>x.fields.Aktiv!==false).sort((a,b)=>Number(a.fields.Sortierung||999)-Number(b.fields.Sortierung||999)||String(a.fields.Name||'').localeCompare(String(b.fields.Name||''),'de'));
  if(!scoped.length)active=fp1051EventFallback();
  for(const name of ['Wegpunkt / Position','Nachtrag / Sonstiges'])if(!active.some(x=>x.fields.Name===name))active.push({id:'',fields:{Name:name,Profil:'Allgemein',Aktiv:true,System:true,Sortierung:999}});
  return active;
}

const fp1051ConfigurationBase=configuration;
configuration=async function(){
  await fp1051ConfigurationBase();
  const grid=app.querySelector('.grid');
  if(grid&&!document.getElementById('fp1051EventCatalogButton')){
    const b=document.createElement('button');b.className='menu';b.id='fp1051EventCatalogButton';b.onclick=()=>go('eventcatalog');b.innerHTML='<b>Ereignisarten</b><span class="muted">Auswahl für Ereignisse verwalten</span>';grid.appendChild(b);
  }
};

async function eventcatalog(){
  head('Ereignisarten','Konfigurierbare Auswahl · Systemereignisse bleiben geschützt');
  app.innerHTML='<div class="card">Ereignisarten werden geladen …</div>';
  try{
    const api=await getCloud(),rows=await fp105SafeList(api,'Ereignisarten');S.eventTypeRows=rows;
    const profileOrder={Allgemein:0,Motorboot:1,Wohnmobil:2},sorted=[...rows].sort((a,b)=>(profileOrder[a.fields.Profil]??9)-(profileOrder[b.fields.Profil]??9)||Number(a.fields.Sortierung||999)-Number(b.fields.Sortierung||999)||String(a.fields.Name||'').localeCompare(String(b.fields.Name||''),'de'));
    app.innerHTML=`<div class="card"><div class="section first">Ereignisarten</div><p class="muted">Ablegen/Abfahrt, Anlegen/Ankunft und andere Ablaufereignisse werden vom System erzeugt und gehören nicht in diesen frei pflegbaren Stamm. Bereits verwendete Ereignisarten werden beim Entfernen nur deaktiviert.</p>${sorted.map(x=>`<div class="line"><div><b>${esc(x.fields.Name||x.fields.Title||'Ereignis')}</b><div class="muted">${esc(x.fields.Profil||'Allgemein')}${x.fields.System?' · System':''}${x.fields.Aktiv===false?' · inaktiv':''}</div></div><div class="row-actions">${x.fields.System?'':`<button onclick="fp1051EditEventType('${x.id}')">Bearbeiten</button><button onclick="fp1051ToggleEventType('${x.id}',${x.fields.Aktiv===false?'true':'false'})">${x.fields.Aktiv===false?'Aktivieren':'Inaktiv'}</button><button class="danger-lite" onclick="fp1051RemoveEventType('${x.id}')">Entfernen</button>`}</div></div>`).join('')||'<p class="muted">Noch keine Ereignisarten im Stamm. Bis zur Anlage nutzt MOBIMORY die bisherige Standardauswahl.</p>'}<div class="actions"><button onclick="fp1051OpenEventTypeEditor()">Neue Ereignisart</button>${rows.length?'' : '<button class="primary" onclick="fp1051SeedEventTypes()">Bisherige Standardauswahl übernehmen</button>'}</div><div id="fp1051EventEditor"></div></div>`;
  }catch(e){failBox(e,'configuration')}
}
function fp1051OpenEventTypeEditor(row=null){
  const h=document.getElementById('fp1051EventEditor');if(!h)return;S.editEventTypeId=row?String(row.id):'';
  h.innerHTML=`<div class="subeditor"><div class="grid compact"><div class="field"><label>Name</label><input id="etName" value="${esc(row?.fields?.Name||row?.fields?.Title||'')}"></div><div class="field"><label>Profil</label><select id="etProfile">${['Allgemein','Motorboot','Wohnmobil'].map(p=>`<option ${String(row?.fields?.Profil||'Allgemein')===p?'selected':''}>${p}</option>`).join('')}</select></div><div class="field"><label>Sortierung</label><input id="etSort" type="number" value="${esc(row?.fields?.Sortierung??100)}"></div></div><button class="primary" onclick="fp1051SaveEventType()">Speichern</button></div>`;
}
function fp1051EditEventType(id){const row=(S.eventTypeRows||[]).find(x=>String(x.id)===String(id));if(row)fp1051OpenEventTypeEditor(row)}
async function fp1051SaveEventType(){
  if(!etName.value.trim())return alert('Name der Ereignisart eingeben.');
  try{const api=await getCloud(),f={Title:etName.value.trim(),Name:etName.value.trim(),Profil:etProfile.value,System:false,Sortierung:etSort.value?Number(etSort.value):100,Aktiv:true};if(S.editEventTypeId)await api.updateItemByName('Ereignisarten',S.editEventTypeId,f);else await api.createItemByName('Ereignisarten',f);S.editEventTypeId='';await eventcatalog()}catch(e){alert('Ereignisart konnte nicht gespeichert werden: '+e.message+'\nBitte Microsoft 365 Setup für Version 1.0.5.1 ausführen.')}
}
async function fp1051ToggleEventType(id,active){try{const api=await getCloud();await api.updateItemByName('Ereignisarten',id,{Aktiv:!!active});await eventcatalog()}catch(e){alert(e.message)}}
async function fp1051RemoveEventType(id){
  const row=(S.eventTypeRows||[]).find(x=>String(x.id)===String(id));if(!row)return;if(!confirm(`Ereignisart „${row.fields.Name||row.fields.Title}“ entfernen?`))return;
  try{const api=await getCloud(),events=await fp105SafeList(api,'Ereignisse'),used=events.some(e=>String(e.fields.EreignisartId||'')===String(id)||(!e.fields.EreignisartId&&String(e.fields.Art||'')===String(row.fields.Name||row.fields.Title||'')));if(used){await api.updateItemByName('Ereignisarten',id,{Aktiv:false});alert('Diese Ereignisart wurde bereits verwendet und deshalb nicht gelöscht, sondern deaktiviert.')}else await api.deleteItemByName('Ereignisarten',id);await eventcatalog()}catch(e){alert(e.message)}
}
async function fp1051SeedEventTypes(){
  if(!confirm('Die bisherige Standardauswahl für Motorboot und Wohnmobil als Ereignisarten-Stamm anlegen?'))return;
  try{const api=await getCloud(),existing=await fp105SafeList(api,'Ereignisarten'),seen=new Set(existing.map(x=>`${fp105NormText(x.fields.Name||x.fields.Title)}|${x.fields.Profil||'Allgemein'}`));const defs=[];for(const [key,label] of [['motorboat','Motorboot'],['motorhome','Wohnmobil']]){for(const [i,name] of (P[key]?.events||[]).entries())defs.push({name,profile:label,system:false,sort:(i+1)*10})}defs.push({name:'Wegpunkt / Position',profile:'Allgemein',system:true,sort:900},{name:'Nachtrag / Sonstiges',profile:'Allgemein',system:true,sort:910});for(const d of defs){const k=`${fp105NormText(d.name)}|${d.profile}`;if(seen.has(k))continue;await api.createItemByName('Ereignisarten',{Title:d.name,Name:d.name,Profil:d.profile,System:d.system,Sortierung:d.sort,Aktiv:true});seen.add(k)}await eventcatalog()}catch(e){alert('Standardauswahl konnte nicht angelegt werden: '+e.message+'\nBitte Microsoft 365 Setup für Version 1.0.5.1 ausführen.')}
}

/* Ereignisformular nutzt den Stamm, bleibt vor dem Setup aber rückwärtskompatibel. */
event=async function(){
  head('Ereignis / Nachtrag',S.vehicle?.name||'Nutzung');
  try{
    const api=await getCloud(),ctx=fp105Ctx(),[bundle,catalog]=await Promise.all([fp105LocationBundle(api,ctx),fp105SafeList(api,'Ereignisarten')]);S.locationData={orts:bundle.orts,sites:bundle.sites};
    const types=fp1051EventRowsForCurrentProfile(catalog);
    app.innerHTML=`<div class="card"><div class="field"><label>Ereignisart</label><select id="evType">${types.map(x=>`<option value="${esc(x.fields.Name||x.fields.Title||'Ereignis')}" data-eventtype-id="${esc(String(x.id||''))}">${esc(x.fields.Name||x.fields.Title||'Ereignis')}</option>`).join('')}</select></div><div class="fp-compact-time"><span><b>Zeitpunkt</b><small>beim Cockpit-Tipp erfasst · für Nachträge änderbar</small></span><input id="evWhen" type="datetime-local" value="${fp105IsoLocalValue(ctx.timestamp)}"></div>${fp105LocationBlock('ev',bundle.orts,bundle.sites,bundle.near,'Ort / Standort')}<div class="fp-gps-line"><span>GPS</span><input id="evLat" type="number" step="0.000001" value="${ctx.lat??''}" placeholder="Breitengrad"><input id="evLon" type="number" step="0.000001" value="${ctx.lon??''}" placeholder="Längengrad">${ctx.accuracy?`<small>± ${Math.round(ctx.accuracy)} m</small>`:''}</div><div class="field"><label>Bemerkung</label><textarea id="evNote"></textarea></div><button class="primary" onclick="saveEventV1051()">Speichern</button></div>`;fp105RefreshSites('ev');
  }catch(e){failBox(e)}
};
async function saveEventV1051(){
  try{const api=await getCloud(),loc=fp105LocationValue('ev'),c=fp105Coords('ev'),opt=evType.selectedOptions?.[0],eventTypeId=String(opt?.dataset?.eventtypeId||''),when=evWhen.value?new Date(evWhen.value).toISOString():(fp105Ctx().timestamp||new Date().toISOString()),now=new Date().toISOString(),isBackfill=Math.abs(new Date(now)-new Date(when))>5*60*1000,f={FahrzeugId:String(S.vehicle.id),NutzungId:String(S.usage.cloudId),TagesetappeId:String(S.day?.id||''),BenutzerId:'current',Art:evType.value,EreignisartId:eventTypeId,Zeitpunkt:when,ErfasstAm:now,Herkunft:isBackfill?'Nachtrag':'Manuell',Rohdaten:false,Notiz:evNote.value.trim(),OrtId:loc.ortId,StandortId:loc.standortId,Testdaten:testFlag(),Aktiv:true};if(c.lat!=null){f.Breitengrad=c.lat;f.Laengengrad=c.lon}const x=await api.createItemByName('Ereignisse',f);await fp105RememberLocation(api,loc,{timestamp:when,lat:c.lat,lon:c.lon,accuracy:c.accuracy},'Ereignis',x.id);S.pendingContext=null;back()}catch(e){alert('Ereignis konnte nicht gespeichert werden: '+e.message+'\nBitte Microsoft 365 Setup für Version 1.0.5.1 ausführen.')}
}
saveEventV105=saveEventV1051;saveEventV104=saveEventV1051;

/* ---------- Werkstatt: Fahrzeug überall sichtbar ---------- */
workshop=async function(){
  head('Werkstatt','Störungen · Wartung · Arbeiten · Aufgaben · Prüfungen');app.innerHTML='<div class="card">Werkstattdaten werden geladen …</div>';
  try{
    const api=await getCloud(),[vs,st,wo,wp,tasks,ins]=await Promise.all([list(api,'Fahrzeuge'),list(api,'Stoerungen'),list(api,'Arbeiten'),list(api,'Wartungsplaene'),list(api,'Aufgaben'),list(api,'Pruefungen')]),vopt=vs.filter(x=>x.fields.Aktiv!==false).map(x=>`<option value="${x.id}">${esc(x.fields.Fahrzeugname||x.fields.Title)}</option>`).join(''),vm=Object.fromEntries(vs.map(x=>[String(x.id),x.fields.Fahrzeugname||x.fields.Title])),vn=x=>esc(vm[String(x.fields.FahrzeugId)]||'Fahrzeug nicht zugeordnet');
    const taskButtons=x=>x.fields.Status==='Erledigt'?'':`<div class="row-actions">${x.fields.Status!=='In Arbeit'?`<button onclick="fp104SetWorkshopStatus('Aufgaben','${x.id}','Status','In Arbeit')">In Arbeit</button>`:''}<button onclick="fp104SetWorkshopStatus('Aufgaben','${x.id}','Status','Erledigt','AbgeschlossenAm')">Erledigt</button></div>`;
    const störButtons=x=>x.fields.Status==='Behoben'?'':`<div class="row-actions">${x.fields.Status!=='In Arbeit'?`<button onclick="fp104SetWorkshopStatus('Stoerungen','${x.id}','Status','In Arbeit')">In Arbeit</button>`:''}<button onclick="fp104SetWorkshopStatus('Stoerungen','${x.id}','Status','Behoben','BehobenAm')">Behoben</button></div>`;
    const workButtons=x=>x.fields.Status==='Abgeschlossen'?'':`<div class="row-actions">${x.fields.Status!=='In Arbeit'?`<button onclick="fp104SetWorkshopStatus('Arbeiten','${x.id}','Status','In Arbeit')">In Arbeit</button>`:''}<button onclick="fp104SetWorkshopStatus('Arbeiten','${x.id}','Status','Abgeschlossen','AbgeschlossenAm')">Abgeschlossen</button></div>`;
    const insButtons=x=>`<div class="row-actions"><button onclick="fp104SetWorkshopStatus('Pruefungen','${x.id}','Ergebnis','Bestanden')">Bestanden</button><button onclick="fp104SetWorkshopStatus('Pruefungen','${x.id}','Ergebnis','Beanstandet')">Beanstandet</button></div>`;
    app.innerHTML=`<div class="card"><div class="section first">Neuer Werkstatteintrag</div><div class="field"><label>Fahrzeug</label><select id="wkVehicle">${vopt}</select></div><div class="grid compact"><input id="wkDesc" placeholder="Beschreibung"><select id="wkKind"><option>Störung</option><option>Aufgabe</option><option>Wartungsplan</option><option>Prüfung</option><option>Arbeit / Reparatur</option></select><input id="wkDue" type="date"></div><button class="primary" onclick="addWorkshopEntry()">Eintrag anlegen</button></div><div class="card"><div class="section first">Störungen</div>${st.filter(x=>x.fields.Aktiv!==false).map(x=>`<div class="line"><div><b>${vn(x)} · ${esc(x.fields.Kategorie||'Störung')}</b><div>${esc(x.fields.Beschreibung||'')}</div><div class="muted">${esc(x.fields.Status||'Offen')} · ${esc(x.fields.Prioritaet||'')}</div></div>${störButtons(x)}</div>`).join('')||'<p class="muted">Keine Störungen.</p>'}</div><div class="card"><div class="section first">Aufgaben</div>${tasks.map(x=>`<div class="line"><div><b>${vn(x)} · Aufgabe</b><div>${esc(x.fields.Aufgabe||'')}</div><div class="muted">${fp104Date(x.fields.FaelligAm)} · ${esc(x.fields.Status||'Offen')}</div></div>${taskButtons(x)}</div>`).join('')||'<p class="muted">Keine Aufgaben.</p>'}</div><div class="card"><div class="section first">Wartung / Prüfungen / Arbeiten</div>${wp.map(x=>`<div class="line"><div><b>${vn(x)} · Wartung</b><div>${esc(x.fields.Name||'')}</div><div class="muted">${esc(x.fields.IntervallRegel||'aktiv')}</div></div></div>`).join('')}${ins.map(x=>`<div class="line"><div><b>${vn(x)} · Prüfung</b><div>${esc(x.fields.Art||'')}</div><div class="muted">gültig bis ${fp104Date(x.fields.GueltigBis)} · ${esc(x.fields.Ergebnis||'Offen')}</div></div>${insButtons(x)}</div>`).join('')}${wo.map(x=>`<div class="line"><div><b>${vn(x)} · Arbeit / Reparatur</b><div>${esc(x.fields.Beschreibung||x.fields.Arbeitsart||'')}</div><div class="muted">${esc(x.fields.Status||(x.fields.AbgeschlossenAm?'Abgeschlossen':'Offen'))}</div></div>${workButtons(x)}</div>`).join('')}${!wp.length&&!ins.length&&!wo.length?'<p class="muted">Keine Wartungen, Prüfungen oder Arbeiten.</p>':''}</div>`;
  }catch(e){failBox(e)}
};

/* ---------- Wohnmobil: Fahrerlaubnis einfach am Fahrzeug ---------- */
function fp1051ExtractLicence(rule){const s=String(rule?.fields?.NachweisArt||'').toUpperCase();for(const k of ['C1E','C1','CE','BE','C','B'])if(new RegExp(`(?:KLASSE\\s*)?${k}(?:\\b|$)`).test(s))return k;return''}
async function fp105AppendVehicleRules(){
  if(!S.configVehicleId)return;
  try{
    const api=await getCloud(),vehicle=await api.getItemByName('Fahrzeuge',S.configVehicleId),profile=normalizeProfile(vehicle.fields.Profil||''),rules=(await fp105SafeList(api,'FahrzeugBerechtigungsRegeln')).filter(x=>String(x.fields.FahrzeugId)===String(S.configVehicleId)&&x.fields.Aktiv!==false),fixed=rules.find(r=>r.fields.Regelart==='Fahrerlaubnis'&&(r.fields.Bedingung==='Feste Fahrzeuganforderung'||(!r.fields.Bedingung&&r.fields.Pflichtgrad==='Pflicht'))),others=fixed?rules.filter(r=>String(r.id)!==String(fixed.id)):rules,box=document.createElement('div');box.className='card';box.id='sec-authrules';
    if(profile==='motorhome'){
      const selected=fp1051ExtractLicence(fixed);
      box.innerHTML=`<div class="section first">Fahrerlaubnis / fachliche Berechtigung</div><p class="muted">Für Straßenfahrzeuge wird die erforderliche Fahrerlaubnisklasse direkt am Fahrzeug hinterlegt. App-Rechte im Verleih sind davon getrennt.</p><div class="grid compact"><div class="field"><label>Erforderliche Fahrerlaubnis</label><select id="wmLicence"><option value="">– noch nicht festgelegt –</option>${['B','BE','C1','C1E','C','CE'].map(x=>`<option ${selected===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>&nbsp;</label><button class="primary" onclick="fp1051SaveWomoLicence('${fixed?.id||''}')">Fahrerlaubnis speichern</button></div></div><div class="section">Weitere fachliche Regeln (optional)</div>${others.map(r=>`<div class="line"><div><b>${esc(r.fields.NachweisArt||'Nachweis')}</b><div class="muted">${esc(r.fields.Regelart||'')} · ${esc(r.fields.Pflichtgrad||'Pflicht')}${r.fields.Bedingung?` · ${esc(r.fields.Bedingung)}`:''}</div></div><button class="danger-lite" onclick="fp105DeleteVehicleRule('${r.id}')">Löschen</button></div>`).join('')||'<p class="muted">Keine weiteren Regeln.</p>'}<div class="subeditor"><div class="grid compact"><select id="arKind"><option>Fahrerlaubnis</option><option>Sonderberechtigung</option><option>Sonstiges</option></select><input id="arProof" placeholder="Benötigter Nachweis"><select id="arLevel"><option>Pflicht</option><option>Situativ</option><option>Empfohlen</option></select></div><div class="field"><label>Gilt bei / Bedingung</label><input id="arCondition" placeholder="z. B. Anhängerbetrieb oder besondere Nutzung"></div><button onclick="fp105AddVehicleRule()">Weitere Regel hinzufügen</button></div>`;
    }else{
      box.innerHTML=`<div class="section first">Fachliche Berechtigungen / Lizenzen</div><p class="muted">Bei Booten ist die erforderliche Berechtigung nicht pauschal. Regeln können ausdrücklich von Revier, Nutzung, Motorisierung oder Ausrüstung abhängen.</p>${rules.map(r=>`<div class="line"><div><b>${esc(r.fields.NachweisArt||'Nachweis')}</b><div class="muted">${esc(r.fields.Regelart||'')} · ${esc(r.fields.Pflichtgrad||'Pflicht')}${r.fields.Bedingung?` · ${esc(r.fields.Bedingung)}`:''}</div></div><button class="danger-lite" onclick="fp105DeleteVehicleRule('${r.id}')">Löschen</button></div>`).join('')||'<p class="muted">Noch keine Regel hinterlegt.</p>'}<div class="subeditor"><div class="grid compact"><select id="arKind"><option>Bootsfuehrerschein / Patent</option><option>Funkzeugnis</option><option>Sonderberechtigung</option><option>Sonstiges</option></select><input id="arProof" placeholder="Benötigter Nachweis, z. B. SBF Binnen"><select id="arLevel"><option>Pflicht</option><option>Situativ</option><option>Empfohlen</option></select></div><div class="field"><label>Gilt bei / Bedingung</label><input id="arCondition" placeholder="z. B. Frankreich Binnen, Funkanlage wird benutzt, Wasserski"></div><button onclick="fp105AddVehicleRule()">Regel hinzufügen</button></div>`;
    }
    app.appendChild(box);
  }catch(e){const box=document.createElement('div');box.className='card status-warn';box.textContent='Berechtigungsregeln werden nach dem Microsoft 365 Setup 1.0.5.1 verfügbar.';app.appendChild(box)}
}
async function fp1051SaveWomoLicence(existingId){
  const cls=document.getElementById('wmLicence')?.value||'';
  try{const api=await getCloud();if(!cls){if(existingId&&confirm('Hinterlegte Fahrerlaubnis-Anforderung entfernen?'))await api.deleteItemByName('FahrzeugBerechtigungsRegeln',existingId)}else{const f={FahrzeugId:String(S.configVehicleId),Regelart:'Fahrerlaubnis',NachweisArt:`Führerschein Klasse ${cls}`,Bedingung:'Feste Fahrzeuganforderung',Pflichtgrad:'Pflicht',Aktiv:true};if(existingId)await api.updateItemByName('FahrzeugBerechtigungsRegeln',existingId,f);else await api.createItemByName('FahrzeugBerechtigungsRegeln',f)}rerenderKeepPosition('sec-authrules')}catch(e){alert('Fahrerlaubnis konnte nicht gespeichert werden: '+e.message+'\nBitte Microsoft 365 Setup für Version 1.0.5.1 ausführen.')}
}

/* ---------- SharePoint Schema 1.0.5.1 ---------- */
const fp1051MergedSchemaBase=fp105MergedSchema;
fp105MergedSchema=async function(){const [prior,e1051]=await Promise.all([fp1051MergedSchemaBase(),fetch('phase1-sharepoint-schema-1.0.5.1.json',{cache:'no-store'}).then(r=>r.json())]);return fp105MergeSchemas(prior,e1051)};
m365setup=function(){head('Microsoft 365 Setup','Schema 1.0.5.1 · Phase 1 · additiv');const tok=window.FPAuth.token();app.innerHTML=`<div class="card"><b>Microsoft-Anmeldung</b><div id="authState">${tok?'✓ Microsoft-Token vorhanden':'Noch nicht mit Microsoft verbunden'}</div>${tok?'<button onclick="FPAuth.logout();render()">Microsoft-Verbindung trennen</button>':'<button class="primary" onclick="sessionStorage.setItem(\'fp_after_auth\',\'m365setup\');FPAuth.login()">Mit Microsoft 365 anmelden</button>'}</div><div class="card"><div class="field"><label>SharePoint-Site-URL</label><input id="spSite" value="${esc(localStorage.getItem('fp_sp_site')||'')}" placeholder="https://…sharepoint.com/sites/Fahrzeugplattform"></div><button class="primary" ${tok?'':'disabled'} onclick="runM365Provision1051()">Phase-1-Struktur prüfen / anlegen</button><p class="muted">Additiv und wiederholbar. 1.0.5.1 korrigiert den Wartungsplan und ergänzt den Ereignisarten-Stamm.</p></div><div id="m365Result"></div>`};
async function runM365Provision1051(){const url=document.getElementById('spSite').value.trim();if(!url)return alert('Bitte die vollständige SharePoint-Site-URL eintragen.');localStorage.setItem('fp_sp_site',url);const out=document.getElementById('m365Result');out.innerHTML='<div class="card">Schema 1.0.5.1 wird geladen …</div>';try{const schema=await fp105MergedSchema(),setup=new FPGraphSetup(FPAuth.token(),url,schema),site=await setup.resolveSite();let lines=[];out.innerHTML=`<div class="card"><b>Verbunden:</b> ${esc(site.displayName)}<div id="provLog" class="muted">Prüfung startet …</div></div>`;const log=document.getElementById('provLog'),res=await setup.provision(e=>{if(e.status==='created')lines.push(`${e.kind==='list'?'Liste':'Feld'} angelegt: ${e.kind==='field'?e.list+' · ':''}${e.name}`);if(log)log.innerHTML=`Fortschritt: ${esc(e.kind==='field'?e.list+' · '+e.name:e.name)}<br>${lines.slice(-8).map(esc).join('<br>')}`});out.innerHTML=`<div class="card status-ok"><b>Setup abgeschlossen und verifiziert</b><p>${res.totalLists} Listen geprüft · ${res.listsCreated} neu angelegt · ${res.fieldsCreated} Felder neu angelegt · ${res.verifiedLists} Listen für die App erreichbar.</p></div>`}catch(e){out.innerHTML=`<div class="card status-stop"><b>Setup nicht abgeschlossen</b><p>${esc(e.message)}</p></div>`}}
runM365Provision=runM365Provision1051;

exportPhase1Data=async function(){try{const schema=await fp105MergedSchema(),api=await getCloud(),data={exportedAt:new Date().toISOString(),version:FP1051_VERSION,lists:{}};for(const l of schema.lists){try{data.lists[l.internalName]=await list(api,l.internalName)}catch(e){data.lists[l.internalName]={error:e.message}}}const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Fahrzeugplattform_Export_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}catch(e){alert(e.message)}};

/* Neue Ansicht in den bestehenden Renderer einhängen. */
const fp1051RenderBase=render;
render=function(){if(S.view==='eventcatalog')return eventcatalog();return fp1051RenderBase()};

/* Sichtbare Version. */
login=function(){bar.hidden=true;app.innerHTML=`<div class="login"><div class="card mobi-login">${typeof mobiIcon==='function'?mobiIcon():''}${typeof brandHeadline==='function'?brandHeadline():'<div class="brand">MOBIMORY</div>'}<p class="muted">Version ${FP1051_VERSION}</p><div class="field"><label>Nutzer</label><input value="Admin"></div><div class="field"><label>Passwort</label><input type="password" value="admin"></div><button class="primary" onclick="S.stack=[];S.view='main';render()">Anmelden</button></div></div>`};
document.title=`Fahrzeugplattform ${FP1051_VERSION}`;const fp1051Foot=document.querySelector('footer');if(fp1051Foot)fp1051Foot.textContent=`Fahrzeugplattform · ${FP1051_VERSION} · © 2026 Entwicklungsstand`;
try{render()}catch(e){console.warn(e)}
