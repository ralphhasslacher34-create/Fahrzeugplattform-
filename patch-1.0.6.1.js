/* MOBIMORY / Fahrzeugplattform 1.0.6.1-dev
   Scope:
   1) Reisecheck bleibt frei nutzbar ODER uebernimmt eine geplante Nutzung.
   2) Bei geplanter Nutzung werden Start, Zwischenziele, Ziel, Personen, Tiere,
      Fahrzeug und Zeitraum uebernommen. Routenoptionen werden an die aktuelle
      Online-Recherche uebergeben; Transitlaender und Grenztypen werden sichtbar.
   3) Automatisches Pruefergebnis und manuelle Bewertung werden getrennt gespeichert.
*/

const FP1061_VERSION='1.0.6.1-dev';
const FP1061={mode:'free',selectedUsageId:'',routePlan:null};

function fp1061DateInput(v){
  if(!v)return '';
  const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v).slice(0,10);
  return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
}
function fp1061EffectiveStatus(x){return x?.manualStatus||x?.autoStatus||x?.status||'Prüfen'}
function fp1061StatusBadge(status,label=''){return `<span class="${fp106StatusClass(status)}" style="padding:.2rem .45rem;border-radius:.45rem"><b>${label?esc(label)+': ':''}${esc(status||'Prüfen')}</b></span>`}
function fp1061UsageLabel(u,vm,tm){
  const f=u.fields||{},date=fp1061DateInput(f.GeplanterBeginn||f.Beginn),start=f.GeplanterStartort||f.Startpunkt||'',end=f.GeplanterEndort||f.GeplantesZiel||'';
  return `${date?date+' · ':''}${vm[String(f.FahrzeugId)]||'Fahrzeug'} · ${tm[String(f.NutzungsartId)]||f.Title||'Nutzung'}${start||end?` · ${start||'–'} → ${end||'–'}`:''}`;
}
function fp1061UsageWaypoints(u){
  if(!u||!FP106.data)return [];
  const f=u.fields||{},stops=(FP106.data.usageStops||[]).filter(x=>String(x.fields.NutzungId)===String(u.id)).sort((a,b)=>Number(a.fields.Sortierung||0)-Number(b.fields.Sortierung||0));
  const out=[];
  const add=(label,kind)=>{const s=String(label||'').trim();if(s&&!out.some(x=>x.label.toLowerCase()===s.toLowerCase()))out.push({order:out.length+1,label:s,kind})};
  add(f.GeplanterStartort||f.Startpunkt,'Start');
  for(const x of stops)add(x.fields.Ort||x.fields.Name||x.fields.Title,'Zwischenziel');
  add(f.GeplanterEndort||f.GeplantesZiel,'Ziel');
  return out;
}
function fp1061ModeHtml(){
  return `<div class="card"><div class="section first">Art des Reisechecks</div>
    <div class="grid compact">
      <button id="tcModeFree" class="primary" onclick="fp1061SetMode('free')"><b>Freier Reisecheck</b><span class="muted">Gebiete / Reviere selbst auswählen</span></button>
      <button id="tcModeUsage" onclick="fp1061SetMode('usage')"><b>Geplante Nutzung prüfen</b><span class="muted">Route und Reisedaten übernehmen</span></button>
    </div>
  </div>`;
}
function fp1061SetMode(mode){
  FP1061.mode=mode==='usage'?'usage':'free';
  const f=document.getElementById('tcFreeIntro'),u=document.getElementById('tcUsageBox'),r=document.getElementById('tcRouteOptions'),veh=document.getElementById('tcVehicle'),bF=document.getElementById('tcModeFree'),bU=document.getElementById('tcModeUsage');
  if(f)f.hidden=FP1061.mode!=='free';if(u)u.hidden=FP1061.mode!=='usage';if(r)r.hidden=FP1061.mode!=='usage';if(veh)veh.disabled=FP1061.mode==='usage';
  if(bF)bF.className=FP1061.mode==='free'?'primary':'';if(bU)bU.className=FP1061.mode==='usage'?'primary':'';
  const areaTitle=document.getElementById('tcAreaTitle');if(areaTitle)areaTitle.textContent=FP1061.mode==='usage'?'Zusätzliche Ziele / Länder / Reviere':'Ziele / Länder / Reviere';
  const areaHint=document.getElementById('tcAreaHint');if(areaHint)areaHint.textContent=FP1061.mode==='usage'?'Optional: zusätzliche Gebiete ergänzen, die nicht aus der Route hervorgehen.':'Mehrfachauswahl möglich. Die Gebietshierarchie wird an die Recherche übergeben.';
  if(FP1061.mode==='free'){FP1061.selectedUsageId='';FP1061.routePlan=null;if(veh){veh.disabled=false;fp106SuggestModes()}}
  else{const sel=document.getElementById('tcUsageSelect');if(sel?.value)fp1061LoadUsage(sel.value)}
}
async function fp1061LoadUsage(id){
  const u=(FP106.data?.usages||[]).find(x=>String(x.id)===String(id));if(!u)return;
  FP1061.selectedUsageId=String(id);
  const f=u.fields||{},veh=document.getElementById('tcVehicle'),title=document.getElementById('tcTitle'),start=document.getElementById('tcStart'),end=document.getElementById('tcEnd');
  if(veh){veh.disabled=false;veh.value=String(f.FahrzeugId||'');fp106SuggestModes();veh.disabled=true}
  if(title)title.value=f.Title||title.value||'Geplante Reise';
  if(start)start.value=fp1061DateInput(f.GeplanterBeginn||f.Beginn);
  if(end)end.value=fp1061DateInput(f.GeplantesEndeDatum||f.Ende||f.GeplanterBeginn||f.Beginn);
  document.querySelectorAll('[data-tcperson]').forEach(x=>x.checked=false);document.querySelectorAll('[data-tcanimal]').forEach(x=>x.checked=false);
  for(const rel of (FP106.data.usagePeople||[]).filter(x=>String(x.fields.NutzungId)===String(id))){const cb=document.querySelector(`[data-tcperson="${rel.fields.PersonId}"]`);if(cb)cb.checked=true}
  for(const rel of (FP106.data.usageAnimals||[]).filter(x=>String(x.fields.NutzungId)===String(id))){const cb=document.querySelector(`[data-tcanimal="${rel.fields.TierId}"]`);if(cb)cb.checked=true}
  const waypoints=fp1061UsageWaypoints(u);FP1061.routePlan={usageId:String(id),waypoints};
  const box=document.getElementById('tcUsageRoute');if(box)box.innerHTML=waypoints.length?`<div class="section">Geplante Route</div>${waypoints.map((w,i)=>`<div class="line"><div><b>${i+1}. ${esc(w.label)}</b><div class="muted">${esc(w.kind)}</div></div></div>`).join('')}`:'<div class="status-warn">In dieser Nutzung sind noch kein verwertbarer Start und kein Ziel hinterlegt.</div>';
}

/* 1.0.6.1 ersetzt nur die Reisecheck-Oberflaeche; der freie Check bleibt erhalten. */
travelcheck=async function(){
  head('Reisecheck','Frei prüfen oder geplante Nutzung mit Route übernehmen');app.innerHTML='<div class="card">Reisedaten werden geladen …</div>';
  try{
    const api=await getCloud(),[vs,ps,animals,areas,checks,usages,usageStops,usagePeople,usageAnimals,types]=await Promise.all([
      fp105SafeList(api,'Fahrzeuge'),fp105SafeList(api,'Personen'),fp105SafeList(api,'Tiere'),fp105SafeList(api,'Gebiete'),fp105SafeList(api,'Reisechecks'),
      fp105SafeList(api,'Nutzungen'),fp105SafeList(api,'NutzungsZwischenziele'),fp105SafeList(api,'NutzungsPersonen'),fp105SafeList(api,'NutzungsTiere'),fp105SafeList(api,'Nutzungsarten')
    ]);
    const activeV=vs.filter(x=>x.fields.Aktiv!==false),activeP=ps.filter(x=>x.fields.Aktiv!==false),activeA=animals.filter(x=>x.fields.Aktiv!==false),activeG=areas.filter(x=>x.fields.Aktiv!==false),byId=Object.fromEntries(activeG.map(x=>[String(x.id),x])),vm=Object.fromEntries(vs.map(v=>[String(v.id),v.fields.Fahrzeugname||v.fields.Title])),tm=Object.fromEntries(types.map(t=>[String(t.id),t.fields.Name||t.fields.Title]));
    const candidates=usages.filter(u=>{const f=u.fields||{},s=String(f.Status||'');return s==='Geplant'||s==='Aktiv'||!!f.GeplanterBeginn||!!f.GeplanterStartort||!!f.GeplanterEndort}).sort((a,b)=>String(b.fields.GeplanterBeginn||b.fields.Beginn||'').localeCompare(String(a.fields.GeplanterBeginn||a.fields.Beginn||'')));
    FP106.data={vs,ps,animals,areas:activeG,byId,usages,usageStops,usagePeople,usageAnimals,types};FP1061.mode='free';FP1061.selectedUsageId='';FP1061.routePlan=null;
    const now=new Date(),later=new Date(now.getTime()+7*86400000),loc=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
    app.innerHTML=`${fp1061ModeHtml()}
      <div class="card" id="tcUsageBox" hidden><div class="section first">Geplante Nutzung</div>
        <div class="field"><label>Nutzung auswählen</label><select id="tcUsageSelect" onchange="fp1061LoadUsage(this.value)"><option value="">– geplante / aktive Nutzung auswählen –</option>${candidates.map(u=>`<option value="${u.id}">${esc(fp1061UsageLabel(u,vm,tm))}</option>`).join('')}</select></div>
        <div id="tcUsageRoute" class="muted">Nach Auswahl werden Start, Zwischenziele, Ziel, Fahrzeug, Personen und Tiere übernommen.</div>
      </div>
      <div class="card"><div class="section first">Reise</div>
        <div id="tcFreeIntro" class="muted">Reisedaten frei zusammenstellen.</div>
        <div class="field"><label>Titel (optional)</label><input id="tcTitle" placeholder="z. B. Elsass 2026"></div>
        <div class="grid compact"><div class="field"><label>Beginn</label><input id="tcStart" type="date" value="${loc(now)}"></div><div class="field"><label>Ende</label><input id="tcEnd" type="date" value="${loc(later)}"></div></div>
        <div class="field"><label>Fahrzeug</label><select id="tcVehicle" onchange="fp106SuggestModes()">${activeV.map(v=>`<option value="${v.id}" data-profile="${esc(v.fields.Profil||'')}">${esc(v.fields.Fahrzeugname||v.fields.Title)} · ${esc(v.fields.Profil||v.fields.Fahrzeugtyp||'')}</option>`).join('')}</select></div>
        <div class="section">Verkehrsart</div><div class="chips"><label class="person-tile"><input type="checkbox" data-tcmode="Strasse"> Straße</label><label class="person-tile"><input type="checkbox" data-tcmode="Binnen"> Binnen</label><label class="person-tile"><input type="checkbox" data-tcmode="See"> See</label><label class="person-tile"><input type="checkbox" data-tcmode="Sonderrevier"> Sonderrevier</label></div>
        <div class="section">Mitreisende Personen</div>${activeP.map(p=>`<label class="person-tile"><input type="checkbox" data-tcperson="${p.id}"> ${esc(p.fields.Anzeigename||p.fields.Title)} · ${esc(p.fields.Rolle||'')}</label>`).join('')||'<p class="muted">Keine aktiven Personen.</p>'}
        <div class="section">Mitreisende Tiere</div>${activeA.map(a=>`<label class="person-tile"><input type="checkbox" data-tcanimal="${a.id}"> ${esc(a.fields.Name||a.fields.Title)} · ${esc(a.fields.Tierart||'')}</label>`).join('')||'<p class="muted">Keine aktiven Tiere.</p>'}
        <div class="section" id="tcAreaTitle">Ziele / Länder / Reviere</div><p class="muted" id="tcAreaHint">Mehrfachauswahl möglich. Die Gebietshierarchie wird an die Recherche übergeben.</p>${activeG.sort((a,b)=>fp106AreaPath(a.id,byId).localeCompare(fp106AreaPath(b.id,byId),'de')).map(g=>`<label class="person-tile"><input type="checkbox" data-tcarea="${g.id}"> ${esc(fp106AreaPath(g.id,byId))}</label>`).join('')||'<p class="muted">Noch keine Gebiete/Reviere angelegt.</p>'}
      </div>
      <div class="card" id="tcRouteOptions" hidden><div class="section first">Route verfeinern</div>
        <div class="chips"><label class="person-tile"><input id="tcAvoidHighways" type="checkbox"> Autobahnen vermeiden</label><label class="person-tile"><input id="tcAvoidTolls" type="checkbox"> Maut vermeiden</label><label class="person-tile"><input id="tcAvoidFerries" type="checkbox"> Fähren vermeiden</label></div>
        <div class="field"><label>Länder vermeiden (optional)</label><input id="tcAvoidCountries" placeholder="z. B. Schweiz, Österreich"></div>
        <div class="field"><label>Weitere Routenvorgabe (optional)</label><input id="tcRouteNote" placeholder="z. B. nur tagsüber, bestimmter Grenzübergang"></div>
        <p class="muted">MOBIMORY recherchiert eine plausible Route und die tatsächlich betroffenen Länder/Grenzen. Bei nicht eindeutig belegbarer Routenführung wird das sichtbar als „Prüfen“ markiert.</p>
      </div>
      <div class="card"><button class="primary" onclick="runTravelCheck106()">Aktuell online recherchieren & prüfen</button><div id="tcResearchState" class="muted"></div></div>
      <div id="tcResult"></div>
      <div class="card"><div class="section first">Gespeicherte Reisechecks</div>${checks.sort((a,b)=>String(b.fields.ErstelltAm||'').localeCompare(String(a.fields.ErstelltAm||''))).slice(0,12).map(c=>`<button class="menu" onclick="S.travelCheckDetailId='${c.id}';go('travelcheckdetail')"><b>${esc(c.fields.Titel||c.fields.Title||'Reisecheck')}</b><span class="muted">${fp106DateTime(c.fields.OnlineRecherchiertAm||c.fields.ErstelltAm)} · ${esc(c.fields.Status||'')}</span><span>${esc(vm[String(c.fields.FahrzeugId)]||'')} ${c.fields.CheckModus1061?`· ${esc(c.fields.CheckModus1061)}`:''}</span></button>`).join('')||'<p class="muted">Noch kein Reisecheck gespeichert.</p>'}</div>
      <div class="card status-warn"><b>Planungshilfe</b><p>Routen- und Regelrecherche ersetzt keine Navigation oder behördliche Einzelfallentscheidung. Quellen, Annahmen und Unsicherheiten bleiben sichtbar.</p></div>`;
    fp106SuggestModes();fp1061SetMode('free');
    if(!fp106ResearchUrl()){const s=document.getElementById('tcResearchState');if(s){s.className='status-warn';s.innerHTML='Online-Recherche noch nicht eingerichtet. <button onclick="go(\'settings\')">Einstellungen öffnen</button>'}}
  }catch(e){failBox(e,'configuration')}
};

const fp1061BuildPayloadBase=fp106BuildResearchPayload;
fp106BuildResearchPayload=async function(){
  const payload=await fp1061BuildPayloadBase();
  payload.trip.checkMode=FP1061.mode==='usage'?'planned-usage':'free';
  if(FP1061.mode==='usage'){
    const waypoints=FP1061.routePlan?.waypoints||[];
    payload.trip.routePlan={
      waypoints:waypoints.map((w,i)=>({order:i+1,label:w.label,kind:w.kind||''})),
      preferences:{
        avoidHighways:!!document.getElementById('tcAvoidHighways')?.checked,
        avoidTolls:!!document.getElementById('tcAvoidTolls')?.checked,
        avoidFerries:!!document.getElementById('tcAvoidFerries')?.checked,
        avoidCountries:String(document.getElementById('tcAvoidCountries')?.value||'').split(',').map(x=>x.trim()).filter(Boolean),
        note:String(document.getElementById('tcRouteNote')?.value||'').trim()
      }
    };
  }
  return payload;
};

runTravelCheck106=async function(){
  const out=document.getElementById('tcResult'),state=document.getElementById('tcResearchState');if(!out)return;
  const areaIds=fp106Selected('tcarea');
  if(FP1061.mode==='free'&&!areaIds.length)return alert('Beim freien Reisecheck mindestens ein Ziel / Land / Gebiet / Revier auswählen.');
  if(FP1061.mode==='usage'){
    if(!FP1061.selectedUsageId)return alert('Bitte zuerst eine geplante Nutzung auswählen.');
    if((FP1061.routePlan?.waypoints||[]).length<2)return alert('Die geplante Nutzung braucht mindestens Start und Ziel.');
  }
  const s=document.getElementById('tcStart'),e=document.getElementById('tcEnd');if(!s?.value||!e?.value)return alert('Reisebeginn und Reiseende eingeben.');if(new Date(e.value)<new Date(s.value))return alert('Reiseende liegt vor dem Reisebeginn.');if(!fp106ResearchUrl())return alert('Bitte zuerst unter Einstellungen den Research Service einrichten.');
  out.innerHTML='<div class="card">Aktuelle Route, Grenzen, Regeln und Hinweise werden online recherchiert …</div>';if(state){state.className='muted';state.textContent='Web-Recherche läuft. Das kann etwas dauern …'}
  try{
    const payload=await fp106BuildResearchPayload(),r=await fp106FetchResearch('/research',{method:'POST',body:JSON.stringify(payload)}),result=r.result||{};
    if(!Array.isArray(result.requirements))throw new Error('Research Service hat keine strukturierten Anforderungen geliefert.');
    const rows=result.requirements.map((x,i)=>({...x,id:x.id||`R${i+1}`,subjectName:FP106.subjectMap[x.subjectKey]||x.subjectKey||x.subjectType||'Reise',sources:Array.isArray(x.sources)?x.sources:[],autoStatus:x.status||'Prüfen',manualStatus:'',manualNote:''}));
    rows.sort((a,b)=>fp106CatOrder(a.category)-fp106CatOrder(b.category)||fp106StatusOrder(a.autoStatus)-fp106StatusOrder(b.autoStatus)||String(a.area||'').localeCompare(String(b.area||''),'de'));
    FP106.last={title:payload.trip.title||`${FP106.subjectMap.vehicle} · Reisecheck`,vehicleId:String(document.getElementById('tcVehicle')?.value||''),usageId:FP1061.mode==='usage'?FP1061.selectedUsageId:'',checkMode:FP1061.mode,start:payload.trip.start,end:payload.trip.end,areaIds:fp106Selected('tcarea'),personIds:fp106Selected('tcperson'),animalIds:fp106Selected('tcanimal'),modes:fp106Selected('tcmode'),routePlan:payload.trip.routePlan||null,route:result.route||null,researchedAt:r.researchedAt||new Date().toISOString(),provider:r.provider||'OpenAI',model:r.model||'',requestId:r.requestId||'',researchStatus:result.researchStatus||'teilweise',summary:result.summary||'',warnings:Array.isArray(result.warnings)?result.warnings:[],rows,raw:result};
    if(state){state.className='status-ok';state.textContent=`✓ Online-Recherche abgeschlossen · ${FP106.last.provider}${FP106.last.model?' · '+FP106.last.model:''} · ${fp106DateTime(FP106.last.researchedAt)}`}
    fp1061RenderResult();
  }catch(e){if(state){state.className='status-stop';state.textContent=e.message}out.innerHTML=`<div class="card status-stop"><b>Online-Recherche fehlgeschlagen</b><p>${esc(e.message)}</p><button onclick="go('settings')">Research Service prüfen</button></div>`}
};

function fp1061RouteHtml(route){
  if(!route||route.mode==='free')return '';
  const cls=route.routingStatus==='plausibel'?'status-ok':'status-warn';
  return `<div class="card ${cls}"><div class="section first">Routen- und Grenzanalyse</div><p>${esc(route.summary||'')}</p>
    ${Array.isArray(route.countries)&&route.countries.length?`<div class="section">Betroffene Länder</div><div class="chips">${route.countries.map(c=>`<span><b>${esc(c.name)}</b> · ${esc(c.schengenStatus||'Unklar')}</span>`).join('')}</div>`:''}
    ${Array.isArray(route.borders)&&route.borders.length?`<div class="section">Grenzübertritte</div>${route.borders.map(b=>`<div class="entitybox"><b>${esc(b.fromCountry)} → ${esc(b.toCountry)}</b><div>${esc(b.classification||'Unklar')}</div>${b.note?`<div class="muted">${esc(b.note)}</div>`:''}</div>`).join('')}`:'<p class="muted">Keine grenzüberschreitende Route erkannt.</p>'}
    ${route.assumptions?.length?`<div class="section">Routenannahmen</div>${route.assumptions.map(x=>`<div class="muted">• ${esc(x)}</div>`).join('')}`:''}
    ${route.routeWarnings?.length?`<div class="status-warn">${route.routeWarnings.map(x=>`<div>${esc(x)}</div>`).join('')}</div>`:''}
    <p class="muted">Routingstatus: ${esc(route.routingStatus||'prüfen')} · Diese Analyse ist keine Turn-by-Turn-Navigation.</p></div>`;
}
function fp1061RequirementHtml(x,i,editable=true){
  const auto=x.autoStatus||x.status||'Prüfen',manual=x.manualStatus||'',effective=fp1061EffectiveStatus(x);
  return `<div class="entitybox ${fp106StatusClass(effective)}"><div class="line"><div><b>${esc(x.category||'')} · ${esc(x.requirement||'')}</b><div class="muted">${esc(x.area||'')} ${x.trafficMode?'· '+esc(x.trafficMode):''} · ${esc(x.subjectName||'')}</div></div>${fp1061StatusBadge(effective,'Wirksam')}</div>
    <div class="chips">${fp1061StatusBadge(auto,'Automatik')}${manual?fp1061StatusBadge(manual,'Manuell'):'<span class="muted">Keine manuelle Bewertung</span>'}</div>
    ${x.proofKey?`<div class="muted">Prüfschlüssel: ${esc(x.proofKey)}</div>`:''}<p>${esc(x.evidence||x.explanation||'')}</p>${x.explanation&&x.evidence?`<p class="muted">${esc(x.explanation)}</p>`:''}
    ${(x.sources||[]).map(fp106SourceHtml).join('')||'<div class="muted">Keine belastbare Quelle geliefert.</div>'}<div class="muted">Recherche-Sicherheit: ${esc(x.confidence||'')} ${x.conflict?'· ⚠ Quellen-/Regelkonflikt':''}</div>
    ${manual&&x.manualNote?`<div class="status-warn"><b>Manuelle Begründung:</b> ${esc(x.manualNote)}</div>`:''}
    ${editable?`<div class="section">Manuelle Bewertung</div><div class="grid compact"><select onchange="fp1061SetManualDraft(${i},this.value)"><option value="" ${!manual?'selected':''}>– keine –</option>${['Erfüllt','Fehlt','Prüfen','Nicht relevant'].map(s=>`<option value="${s}" ${manual===s?'selected':''}>${s}</option>`).join('')}</select><button onclick="fp1061EditManualNote(${i})">Begründung / Notiz</button></div><p class="muted">Die Automatik bleibt unverändert dokumentiert. Eine manuelle Bewertung wird separat protokolliert.</p>`:''}</div>`;
}
function fp1061SetManualDraft(i,v){
  const x=FP106.last?.rows?.[i];if(!x)return;
  if(!v){x.manualStatus='';x.manualNote='';fp1061RenderResult();return}
  const previous=x.manualStatus||'';x.manualStatus=v;
  if(v!==x.autoStatus&&!x.manualNote){const n=prompt(`Automatik: ${x.autoStatus}\nManuell: ${v}\n\nBegründung für die Abweichung:`,x.manualNote||'');if(n===null){x.manualStatus=previous;fp1061RenderResult();return}x.manualNote=n.trim()}
  fp1061RenderResult();
}
function fp1061EditManualNote(i){const x=FP106.last?.rows?.[i];if(!x)return;if(!x.manualStatus)return alert('Bitte zuerst eine manuelle Bewertung auswählen.');const n=prompt('Manuelle Begründung / Notiz:',x.manualNote||'');if(n===null)return;x.manualNote=n.trim();fp1061RenderResult()}
function fp1061RenderResult(){
  const out=document.getElementById('tcResult'),d=FP106.last;if(!out||!d)return;
  const statuses=['Erfüllt','Fehlt','Prüfen','Nicht relevant'],autoCounts=Object.fromEntries(statuses.map(s=>[s,d.rows.filter(x=>(x.autoStatus||x.status)===s).length])),effCounts=Object.fromEntries(statuses.map(s=>[s,d.rows.filter(x=>fp1061EffectiveStatus(x)===s).length])),manualCount=d.rows.filter(x=>!!x.manualStatus).length,official=d.rows.flatMap(x=>x.sources||[]).filter(s=>s.official).length,sources=d.rows.flatMap(x=>x.sources||[]).length;
  out.innerHTML=`${fp1061RouteHtml(d.route)}<div class="card ${effCounts.Fehlt?'status-stop':effCounts['Prüfen']?'status-warn':'status-ok'}"><div class="section first">${esc(d.title)}</div><p>${fp106Date(d.start)} bis ${fp106Date(d.end)} · online recherchiert ${fp106DateTime(d.researchedAt)}</p>
    <div class="section">Automatisches Ergebnis</div><div class="chips"><span>✓ ${autoCounts.Erfüllt}</span><span>✕ ${autoCounts.Fehlt}</span><span>○ ${autoCounts['Prüfen']}</span><span>– ${autoCounts['Nicht relevant']}</span></div>
    ${manualCount?`<div class="section">Nach ${manualCount} manueller Bewertung(en)</div><div class="chips"><span>✓ ${effCounts.Erfüllt}</span><span>✕ ${effCounts.Fehlt}</span><span>○ ${effCounts['Prüfen']}</span><span>– ${effCounts['Nicht relevant']}</span></div>`:''}
    <p>${esc(d.summary||'')}</p><p class="muted">${sources} Quellenangabe(n), davon ${official} als offiziell gekennzeichnet · Recherchestatus: ${esc(d.researchStatus)}</p>${d.warnings?.length?`<div class="status-warn">${d.warnings.map(w=>`<div>${esc(w)}</div>`).join('')}</div>`:''}<button class="primary" onclick="saveTravelCheck106()">Reisecheck speichern</button></div>
    <div class="card"><div class="section first">Aktuelle Anforderungen & Hinweise</div>${d.rows.map((x,i)=>fp1061RequirementHtml(x,i,true)).join('')||'<p class="muted">Keine Anforderungen geliefert.</p>'}</div>`;
}
/* Alt-Funktionen auf die getrennte Bewertungslogik umbiegen. */
fp106SetResult=function(i,v){fp1061SetManualDraft(i,v)};
fp106AddNote=function(i){fp1061EditManualNote(i)};
fp106RenderResult=fp1061RenderResult;

saveTravelCheck106=async function(){
  const d=FP106.last;if(!d)return;
  try{
    const api=await getCloud(),effective=x=>fp1061EffectiveStatus(x),status=d.rows.some(x=>['Fehlt','Prüfen'].includes(effective(x)))?'Unvollstaendig':'Vollstaendig',sources=d.rows.flatMap(x=>(x.sources||[]).map(s=>({requirementId:x.id,title:s.title||'',url:s.url||'',publisher:s.publisher||'',official:!!s.official,updated:s.updated||''}))),snap={title:d.title,start:d.start,end:d.end,areas:d.areaIds,persons:d.personIds,animals:d.animalIds,modes:d.modes,summary:d.summary,warnings:d.warnings,checkMode:d.checkMode};
    const h=await api.createItemByName('Reisechecks',{Title:d.title,Titel:d.title,NutzungId:String(d.usageId||'FREI'),FahrzeugId:d.vehicleId,ErstelltAm:new Date().toISOString(),ReiseBeginn:d.start,ReiseEnde:d.end,GebietIds:d.areaIds.join('|'),PersonIds:d.personIds.join('|'),TierIds:d.animalIds.join('|'),Verkehrsarten:d.modes.join('|'),OnlineRecherchiertAm:d.researchedAt,RechercheProvider:d.provider,RechercheModell:d.model,RechercheRequestId:d.requestId,RechercheStatus:d.researchStatus,RechercheSnapshot:JSON.stringify(snap),QuellenSnapshot:JSON.stringify(sources),CheckModus1061:d.checkMode==='usage'?'Geplante Nutzung':'Freier Reisecheck',RouteSnapshot1061:JSON.stringify(d.route||{}),RoutingOptionen1061:JSON.stringify(d.routePlan?.preferences||{}),Status:status,Testdaten:testFlag()});
    for(const x of d.rows){const src=(x.sources||[])[0]||{},eff=effective(x),now=new Date().toISOString();await api.createItemByName('ReisecheckPunkte',{ReisecheckId:String(h.id),GebietsAnforderungId:'',SubjektTyp:x.subjectType||'Reise',SubjektId:x.subjectKey||'',SubjektKey:x.subjectKey||'',SubjektName:x.subjectName||'',GebietName:x.area||'',Anforderung:x.requirement||'',Ergebnis:fp106OldResult(eff),Status106:eff,AutomatikStatus1061:x.autoStatus||x.status||'Prüfen',ManuellStatus1061:x.manualStatus||'',ManuelleBegruendung1061:x.manualNote||'',ManuellBewertetAm1061:x.manualStatus?now:null,ManuellBewertetVon1061:x.manualStatus?'current':'',Kategorie106:x.category||'',Verkehrsart:x.trafficMode||'',NachweisArt:x.proofKey||'',Begruendung:[x.evidence,x.explanation].filter(Boolean).join(' · '),QuelleTitel:src.title||'',QuelleUrl:src.url||'',QuellePublisher:src.publisher||'',QuelleStand:src.updated||'',QuelleOffiziell:!!src.official,Confidence:x.confidence||'',Konflikt:!!x.conflict,AutomatischBewertet:!x.manualStatus,BestaetigtAm:x.manualStatus?now:null,Notiz:x.manualNote||'',Testdaten:testFlag()})}
    alert('Reisecheck gespeichert. Automatik und manuelle Bewertungen bleiben getrennt nachvollziehbar.');S.travelCheckDetailId=String(h.id);go('travelcheckdetail');
  }catch(e){alert('Reisecheck konnte nicht gespeichert werden: '+e.message+'\n\nBitte Microsoft 365 Setup für Version 1.0.6.1 ausführen.')}
};

travelcheckdetail=async function(){
  head('Reisecheck','Automatisches Ergebnis · manuelle Bewertung · Quellenstand');app.innerHTML='<div class="card">Reisecheck wird geladen …</div>';
  try{
    const api=await getCloud(),h=await api.getItemByName('Reisechecks',S.travelCheckDetailId),pts=(await fp105SafeList(api,'ReisecheckPunkte')).filter(x=>String(x.fields.ReisecheckId)===String(S.travelCheckDetailId)),route=fp106SafeJson(h.fields.RouteSnapshot1061||'{}',{}),snap=fp106SafeJson(h.fields.RechercheSnapshot||'{}',{});
    const rows=pts.map(p=>{const f=p.fields,legacy=f.Status106||fp106NewResult(f.Ergebnis),auto=f.AutomatikStatus1061||legacy,manual=f.ManuellStatus1061||'';return {id:p.id,category:f.Kategorie106||'',requirement:f.Anforderung||'',area:f.GebietName||'',trafficMode:f.Verkehrsart||'',subjectName:f.SubjektName||f.SubjektTyp||'',subjectKey:f.SubjektKey||f.SubjektId||'',autoStatus:auto,manualStatus:manual,manualNote:f.ManuelleBegruendung1061||f.Notiz||'',status:manual||auto,proofKey:f.NachweisArt||'',evidence:f.Begruendung||'',explanation:'',confidence:f.Confidence||'',conflict:!!f.Konflikt,manualAt:f.ManuellBewertetAm1061||f.BestaetigtAm||'',manualBy:f.ManuellBewertetVon1061||'',sources:f.QuelleUrl?[{title:f.QuelleTitel||'',url:f.QuelleUrl||'',publisher:f.QuellePublisher||'',updated:f.QuelleStand||'',official:!!f.QuelleOffiziell}]:[]}}),statuses=['Erfüllt','Fehlt','Prüfen','Nicht relevant'],counts=Object.fromEntries(statuses.map(s=>[s,rows.filter(x=>fp1061EffectiveStatus(x)===s).length]));
    app.innerHTML=`${fp1061RouteHtml(route)}<div class="card ${counts.Fehlt?'status-stop':counts['Prüfen']?'status-warn':'status-ok'}"><div class="section first">${esc(h.fields.Titel||h.fields.Title||'Reisecheck')}</div><p>${fp106Date(h.fields.ReiseBeginn)} bis ${fp106Date(h.fields.ReiseEnde)}</p><div class="chips"><span>✓ ${counts.Erfüllt}</span><span>✕ ${counts.Fehlt}</span><span>○ ${counts['Prüfen']}</span><span>– ${counts['Nicht relevant']}</span></div><p>${esc(snap.summary||'')}</p><p class="muted">${esc(h.fields.CheckModus1061||'Reisecheck')} · online recherchiert ${fp106DateTime(h.fields.OnlineRecherchiertAm)} · ${esc(h.fields.RechercheProvider||'')} ${esc(h.fields.RechercheModell||'')} · ${esc(h.fields.RechercheStatus||'')}</p><div class="actions"><button class="danger-lite" onclick="fp106DeleteCheck('${h.id}')">Reisecheck löschen</button></div></div>
      <div class="card"><div class="section first">Gespeicherte Prüfpunkte</div>${rows.sort((a,b)=>fp106CatOrder(a.category)-fp106CatOrder(b.category)).map(x=>`<div id="rcp-${x.id}">${fp1061RequirementHtml(x,0,false)}${x.manualStatus?`<div class="muted">Manuell bewertet ${fp106DateTime(x.manualAt)}${x.manualBy?' · '+esc(x.manualBy):''}</div>`:''}<div class="grid compact"><select id="rcs-${x.id}"><option value="" ${!x.manualStatus?'selected':''}>– keine manuelle Bewertung –</option>${statuses.map(s=>`<option value="${s}" ${x.manualStatus===s?'selected':''}>${s}</option>`).join('')}</select><button onclick="fp106UpdatePoint('${x.id}')">Manuelle Bewertung speichern</button></div></div>`).join('')||'<p class="muted">Keine Prüfpunkte.</p>'}</div>`;
  }catch(e){failBox(e,'travelcheck')}
};
fp106UpdatePoint=async function(id){
  try{
    const api=await getCloud(),p=await api.getItemByName('ReisecheckPunkte',id),f=p.fields||{},auto=f.AutomatikStatus1061||f.Status106||fp106NewResult(f.Ergebnis),v=document.getElementById('rcs-'+id)?.value||'';let note='';
    if(v){note=prompt(`Automatisches Ergebnis: ${auto}\nManuelle Bewertung: ${v}\n\nBegründung / Notiz:`,f.ManuelleBegruendung1061||f.Notiz||'');if(note===null)return;note=note.trim();if(v!==auto&&!note)return alert('Bei einer Abweichung vom automatischen Ergebnis bitte eine kurze Begründung eintragen.')}
    const eff=v||auto,now=new Date().toISOString();await api.updateItemByName('ReisecheckPunkte',id,{Status106:eff,Ergebnis:fp106OldResult(eff),AutomatikStatus1061:auto,ManuellStatus1061:v,ManuelleBegruendung1061:note,ManuellBewertetAm1061:v?now:null,ManuellBewertetVon1061:v?'current':'',AutomatischBewertet:!v,BestaetigtAm:v?now:null,Notiz:note});
    const all=(await fp105SafeList(api,'ReisecheckPunkte')).filter(x=>String(x.fields.ReisecheckId)===String(S.travelCheckDetailId)),effectiveRow=x=>{if(String(x.id)===String(id))return eff;return x.fields.ManuellStatus1061||x.fields.AutomatikStatus1061||x.fields.Status106||fp106NewResult(x.fields.Ergebnis)},status=all.some(x=>['Fehlt','Prüfen'].includes(effectiveRow(x)))?'Unvollstaendig':'Vollstaendig';await api.updateItemByName('Reisechecks',S.travelCheckDetailId,{Status:status});await travelcheckdetail();
  }catch(e){alert(e.message)}
};

/* Additives SharePoint-Schema 1.0.6.1 */
const fp1061MergedSchemaBase=fp105MergedSchema;
fp105MergedSchema=async function(){const [prior,e1061]=await Promise.all([fp1061MergedSchemaBase(),fetch('phase1-sharepoint-schema-1.0.6.1.json',{cache:'no-store'}).then(r=>r.json())]);return fp105MergeSchemas(prior,e1061)};
m365setup=function(){head('Microsoft 365 Setup','Schema 1.0.6.1 · Route + getrennte Bewertung · additiv');const tok=window.FPAuth.token(),authButton=tok?`<button onclick="FPAuth.logout();render()">Microsoft-Verbindung trennen</button>`:`<button class="primary" onclick="sessionStorage.setItem('fp_after_auth','m365setup');FPAuth.login()">Mit Microsoft 365 anmelden</button>`;app.innerHTML=`<div class="card"><b>Microsoft-Anmeldung</b><div id="authState">${tok?'✓ Microsoft-Token vorhanden':'Noch nicht mit Microsoft verbunden'}</div>${authButton}</div><div class="card"><div class="field"><label>SharePoint-Site-URL</label><input id="spSite" value="${esc(localStorage.getItem('fp_sp_site')||'')}" placeholder="https://…sharepoint.com/sites/Fahrzeugplattform"></div><button class="primary" ${tok?'':'disabled'} onclick="runM365Provision1061()">Phase-1-Struktur prüfen / anlegen</button><p class="muted">Additiv und wiederholbar. 1.0.6.1 ergänzt nur Route sowie getrennte automatische/manuelle Bewertungsfelder.</p></div><div id="m365Result"></div>`};
async function runM365Provision1061(){const url=document.getElementById('spSite').value.trim();if(!url)return alert('Bitte die vollständige SharePoint-Site-URL eintragen.');localStorage.setItem('fp_sp_site',url);const out=document.getElementById('m365Result');out.innerHTML='<div class="card">Schema 1.0.6.1 wird geladen …</div>';try{const schema=await fp105MergedSchema(),setup=new FPGraphSetup(FPAuth.token(),url,schema),site=await setup.resolveSite();let lines=[];out.innerHTML=`<div class="card"><b>Verbunden:</b> ${esc(site.displayName)}<div id="provLog" class="muted">Prüfung startet …</div></div>`;const log=document.getElementById('provLog'),res=await setup.provision(e=>{if(e.status==='created')lines.push(`${e.kind==='list'?'Liste':'Feld'} angelegt: ${e.kind==='field'?e.list+' · ':''}${e.name}`);if(log)log.innerHTML=`Fortschritt: ${esc(e.kind==='field'?e.list+' · '+e.name:e.name)}<br>${lines.slice(-8).map(esc).join('<br>')}`});out.innerHTML=`<div class="card status-ok"><b>Setup abgeschlossen und verifiziert</b><p>${res.totalLists} Listen geprüft · ${res.listsCreated} neu angelegt · ${res.fieldsCreated} Felder neu angelegt · ${res.verifiedLists} Listen für die App erreichbar.</p></div>`}catch(e){out.innerHTML=`<div class="card status-stop"><b>Setup nicht abgeschlossen</b><p>${esc(e.message)}</p></div>`}}
runM365Provision=runM365Provision1061;
exportPhase1Data=async function(){try{const schema=await fp105MergedSchema(),api=await getCloud(),data={exportedAt:new Date().toISOString(),version:FP1061_VERSION,lists:{}};for(const l of schema.lists){try{data.lists[l.internalName]=await list(api,l.internalName)}catch(e){data.lists[l.internalName]={error:e.message}}}const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Fahrzeugplattform_Export_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}catch(e){alert(e.message)}};
login=function(){bar.hidden=true;app.innerHTML=`<div class="login"><div class="card mobi-login">${typeof mobiIcon==='function'?mobiIcon():''}${typeof brandHeadline==='function'?brandHeadline():'<div class="brand">MOBIMORY</div>'}<p class="muted">Version ${FP1061_VERSION}</p><div class="field"><label>Nutzer</label><input value="Admin"></div><div class="field"><label>Passwort</label><input type="password" value="admin"></div><button class="primary" onclick="S.stack=[];S.view='main';render()">Anmelden</button></div></div>`};
document.title=`Fahrzeugplattform ${FP1061_VERSION}`;const fp1061Foot=document.querySelector('footer');if(fp1061Foot)fp1061Foot.textContent=`Fahrzeugplattform · ${FP1061_VERSION} · © 2026 Entwicklungsstand`;try{render()}catch(e){console.warn(e)}
