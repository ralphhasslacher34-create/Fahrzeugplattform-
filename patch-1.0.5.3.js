/* MOBIMORY / Fahrzeugplattform 1.0.5.3-dev
   Korrektur auf Basis 1.0.5.2-dev:
   - Personenfunktionen aktivieren / inaktiv setzen / historien-sicher entfernen
   - Komponenten: Wartung, Prüfung und Austausch als getrennte dynamische Bereiche
   - Wasserski: Run erst nach Ablegen; Anlegen/Ankern erst nach Run-Ende
   - Nutzungsansicht: Ereignisse mit Uhrzeit + Datum
   Reisecheck 1.0.6 bleibt bewusst außerhalb dieses Patches. */

const FP1053_VERSION='1.0.5.3-dev';

function fp1053DateTimeLabel(v){
  if(!v)return '–';
  const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v);
  return `${d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} · ${d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}`;
}

/* ========================================================================== */
/*  Personenfunktionen – aktiv / inaktiv / historien-sicher entfernen        */
/* ========================================================================== */

persondetail=async function(){
  head('Person','Funktionen und Nachweise');app.innerHTML='<div class="card">Person wird geladen …</div>';
  try{
    const api=await getCloud(),p=await api.getItemByName('Personen',S.personDetailId),
      [fs,qs,cat]=await Promise.all([fp105SafeList(api,'PersonFunktionen'),fp105SafeList(api,'Befaehigungen'),ensureQualificationCatalog(api)]),
      ownF=fs.filter(x=>String(x.fields.PersonId)===String(S.personDetailId)),
      ownQ=qs.filter(x=>String(x.fields.PersonId)===String(S.personDetailId));
    app.innerHTML=`<div class="card"><b>${esc(p.fields.Anzeigename||p.fields.Title)}</b><div class="muted">Rolle: ${esc(p.fields.Rolle||'Benutzer')}</div><div class="actions"><button onclick="S.editPersonId='${S.personDetailId}';go('personedit')">Person bearbeiten</button></div></div>
    <div class="card" id="person-functions"><div class="section first">Mögliche Funktionen</div>
      ${ownF.map(x=>`<div class="line"><div><b>${esc(x.fields.Funktion)}</b><div class="muted">${x.fields.Aktiv===false?'inaktiv':'aktiv'}</div></div><div class="row-actions"><button onclick="fp1053TogglePersonFunction('${x.id}',${x.fields.Aktiv===false?'true':'false'})">${x.fields.Aktiv===false?'Aktivieren':'Inaktiv'}</button><button class="danger-lite" onclick="fp1053RemovePersonFunction('${x.id}')">Entfernen</button></div></div>`).join('')||'<p class="muted">Noch keine Funktionen.</p>'}
      <div class="field"><label>Funktion hinzufügen</label><select id="pfFunction">${['Skipper','Fahrer','Crew','Beifahrer','Gast'].map(x=>`<option>${x}</option>`).join('')}</select></div><button onclick="addPersonFunction()">Funktion hinzufügen</button>
    </div>
    <div class="card" id="person-quals"><div class="section first">Lizenzen / Patente / Nachweise</div>
      ${ownQ.map(q=>`<div class="line"><div><b>${esc(q.fields.Art)}</b><div class="muted">${q.fields.Vorhanden===false?'nicht vorhanden':'vorhanden'}${q.fields.GueltigBis?' · bis '+fmtDate(q.fields.GueltigBis):''}${q.fields.Aktiv===false?' · inaktiv':''}</div></div></div>`).join('')||'<p class="muted">Noch keine Nachweise.</p>'}
      <div class="field"><label>Nachweis auswählen</label><select id="pqArt">${cat.filter(x=>x.fields.Aktiv!==false).map(x=>`<option>${esc(x.fields.Name||x.fields.Title)}</option>`).join('')}</select></div>
      <div class="grid compact"><div class="field"><label>Nummer</label><input id="pqNum"></div><div class="field"><label>Aussteller</label><input id="pqIssuer"></div></div>
      <div class="grid compact"><div class="field"><label>Gültig von</label><input id="pqFrom" type="date"></div><div class="field"><label>Gültig bis</label><input id="pqTo" type="date"></div></div>
      <label class="checkrow"><input id="pqPresent" type="checkbox" checked> Vorhanden / nachgewiesen</label><button onclick="addQualification()">Nachweis hinzufügen</button><hr>
      <div class="grid compact"><div class="field"><label>Weiteren Katalogeintrag ergänzen</label><input id="qcName" placeholder="z. B. kanadischer Bootsführerschein"></div><div class="field"><label>Kategorie</label><select id="qcCat"><option>Führerschein</option><option>Bootsführerschein</option><option>Funkzeugnis</option><option>Patent</option><option>Sonstiges</option></select></div></div>
      <div class="field"><label>Land / Geltungsbereich</label><input id="qcLand"></div><button onclick="addQualificationCatalog()">Zum Auswahlkatalog hinzufügen</button>
    </div>`;
  }catch(e){failBox(e)}
};

async function fp1053TogglePersonFunction(id,active){
  try{const api=await getCloud();await api.updateItemByName('PersonFunktionen',id,{Aktiv:!!active});rerenderKeepPosition('person-functions')}catch(e){alert(e.message)}
}
async function fp1053RemovePersonFunction(id){
  try{
    const api=await getCloud(),all=await fp105SafeList(api,'PersonFunktionen'),row=all.find(x=>String(x.id)===String(id));if(!row)return;
    const [np,up,wr]=await Promise.all([fp105SafeList(api,'NutzungsPersonen'),fp105SafeList(api,'UeberlassungsPersonen'),fp105SafeList(api,'WasserskiRunPersonen')]),personId=String(row.fields.PersonId||''),fn=String(row.fields.Funktion||'');
    const used=np.some(x=>String(x.fields.PersonId)===personId&&String(x.fields.Funktion||'')===fn)||up.some(x=>String(x.fields.PersonId)===personId&&(String(x.fields.Funktion||'')===fn||String(x.fields.Fahrrolle||'')===fn))||wr.some(x=>String(x.fields.PersonId)===personId&&String(x.fields.Funktion||'')===fn);
    if(used){await api.updateItemByName('PersonFunktionen',id,{Aktiv:false});alert('Die Funktion wurde bereits historisch verwendet und deshalb nicht gelöscht, sondern inaktiv gesetzt.');}
    else{if(!confirm(`Funktion „${fn}“ wirklich löschen?`))return;await api.deleteItemByName('PersonFunktionen',id)}
    rerenderKeepPosition('person-functions');
  }catch(e){alert(e.message)}
}
addPersonFunction=async function(){
  try{
    const api=await getCloud(),all=await fp105SafeList(api,'PersonFunktionen'),fn=pfFunction.value,existing=all.find(x=>String(x.fields.PersonId)===String(S.personDetailId)&&x.fields.Funktion===fn);
    if(existing){if(existing.fields.Aktiv===false){await api.updateItemByName('PersonFunktionen',existing.id,{Aktiv:true});rerenderKeepPosition('person-functions');return}return alert('Funktion ist bereits aktiv hinterlegt.')}
    await api.createItemByName('PersonFunktionen',{PersonId:String(S.personDetailId),Funktion:fn,Aktiv:true});rerenderKeepPosition('person-functions');
  }catch(e){alert(e.message)}
};

/* ========================================================================== */
/*  Komponenten – Wartung / Prüfung / Austausch getrennt                     */
/* ========================================================================== */

fp1052AppendMaintenanceSections=async function(){
  if(!S.configVehicleId)return;
  try{
    const api=await getCloud(),[vehicle,components,plans,checks]=await Promise.all([api.getItemByName('Fahrzeuge',S.configVehicleId),fp105SafeList(api,'Komponenten'),fp105SafeList(api,'Wartungsplaene'),fp105SafeList(api,'Pruefungen')]),
      cs=components.filter(x=>String(x.fields.FahrzeugId)===String(S.configVehicleId)&&x.fields.Aktiv!==false),
      wp=plans.filter(x=>String(x.fields.FahrzeugId)===String(S.configVehicleId)&&x.fields.Aktiv!==false),
      ps=checks.filter(x=>String(x.fields.FahrzeugId)===String(S.configVehicleId)&&x.fields.Aktiv!==false);
    FP1052.maintenanceData={vehicle,components:cs,plans:wp,checks:ps};
    const vChecks=ps.filter(x=>x.fields.BezugTyp==='Fahrzeug'||(!x.fields.BezugTyp&&!x.fields.KomponenteId));
    const rowButtons=(kind,id,componentId='')=>`<div class="row-actions"><button onclick="fp1052EditMaintenanceItem('${kind}','${id}','${componentId}')">Bearbeiten</button><button class="danger-lite" onclick="fp1052DeleteMaintenanceItem('${kind}','${id}')">Entfernen</button></div>`;
    const componentPlans=(c,kind)=>wp.filter(x=>String(x.fields.KomponenteId||x.fields.BezugId||'')===String(c.id)&&(kind==='austausch'?x.fields.RegelTyp==='Austausch':x.fields.RegelTyp!=='Austausch'));
    const planRows=(c,kind)=>componentPlans(c,kind).map(x=>`<div class="line"><div><b>${esc(x.fields.Name||(kind==='austausch'?'Austausch':'Wartung'))}</b><div class="muted">${esc(x.fields.IntervallRegel||'Intervall offen')} · nächster Termin ${fp1052DateLabel(x.fields.NaechsterTermin)}${x.fields.NaechsterZaehlerstand!=null?' · bei '+esc(x.fields.NaechsterZaehlerstand):''}</div></div>${rowButtons(kind,x.id,c.id)}</div>`).join('');
    const checkRows=c=>ps.filter(x=>(x.fields.BezugTyp==='Komponente'&&String(x.fields.BezugId||x.fields.KomponenteId||'')===String(c.id))||(!x.fields.BezugTyp&&String(x.fields.KomponenteId||'')===String(c.id))).map(x=>`<div class="line"><div><b>${esc(x.fields.Art||'Prüfung')}</b><div class="muted">${esc(x.fields.Intervall||'Intervall offen')} · nächster Termin ${fp1052DateLabel(x.fields.NaechsterTermin||x.fields.GueltigBis)}</div></div>${rowButtons('pruefung',x.id,c.id)}</div>`).join('');
    const old=document.getElementById('sec-maintenance');if(old)old.remove();
    const box=document.createElement('div');box.className='card';box.id='sec-maintenance';box.innerHTML=`<div class="section first">Fahrzeugprüfungen</div><p class="muted">Die Liste darf leer bleiben. Hier stehen nur Prüfungen, die das Fahrzeug als Ganzes betreffen.</p>
      ${vChecks.map(x=>`<div class="line"><div><b>${esc(x.fields.Art||'Prüfung')}</b><div class="muted">${esc(x.fields.Intervall||'Intervall offen')} · nächster Termin ${fp1052DateLabel(x.fields.NaechsterTermin||x.fields.GueltigBis)}</div></div>${rowButtons('fahrzeugpruefung',x.id)}</div>`).join('')||'<p class="muted">Keine Fahrzeugprüfung hinterlegt.</p>'}
      <button onclick="fp1052EditMaintenanceItem('fahrzeugpruefung','','')">Fahrzeugprüfung hinzufügen</button><div id="fp1052-vehicle-check-editor"></div>
      <div class="section">Bauteile · Wartungen, Prüfungen und Austausch</div>
      ${cs.map(c=>`<div class="entitybox"><b>${esc(c.fields.Name||'Bauteil')}</b><div class="muted">${esc(c.fields.KomponentenTyp||c.fields.Typ||'')}</div>
        <div class="section">Wartungen</div>${planRows(c,'wartung')||'<p class="muted">Keine Wartung hinterlegt.</p>'}<button onclick="fp1052EditMaintenanceItem('wartung','','${c.id}')">Wartung hinzufügen</button><div id="fp1052-maint-editor-${c.id}"></div>
        <div class="section">Prüfungen</div>${checkRows(c)||'<p class="muted">Keine Prüfung hinterlegt.</p>'}<button onclick="fp1052EditMaintenanceItem('pruefung','','${c.id}')">Prüfung hinzufügen</button><div id="fp1052-check-editor-${c.id}"></div>
        <div class="section">Austausch</div>${planRows(c,'austausch')||'<p class="muted">Kein Austausch hinterlegt.</p>'}<button onclick="fp1052EditMaintenanceItem('austausch','','${c.id}')">Austausch hinzufügen</button><div id="fp1053-exchange-editor-${c.id}"></div>
      </div>`).join('')||'<p class="muted">Noch keine aktiven Bauteile.</p>'}`;
    app.appendChild(box);
  }catch(e){const box=document.createElement('div');box.className='card status-warn';box.textContent='Wartungen, Prüfungen und Austausch werden nach dem Microsoft 365 Setup 1.0.5.3 verfügbar.';app.appendChild(box)}
};

fp1052EditMaintenanceItem=function(kind,id,componentId){
  const d=FP1052.maintenanceData||{},isPlan=kind==='wartung'||kind==='austausch',row=isPlan?(d.plans||[]).find(x=>String(x.id)===String(id)):(d.checks||[]).find(x=>String(x.id)===String(id));
  S.fp1052MaintenanceEdit={kind,id:String(id||''),componentId:String(componentId||row?.fields?.KomponenteId||row?.fields?.BezugId||'')};let h;
  if(kind==='fahrzeugpruefung')h=document.getElementById('fp1052-vehicle-check-editor');
  else if(kind==='wartung')h=document.getElementById('fp1052-maint-editor-'+S.fp1052MaintenanceEdit.componentId);
  else if(kind==='austausch')h=document.getElementById('fp1053-exchange-editor-'+S.fp1052MaintenanceEdit.componentId);
  else h=document.getElementById('fp1052-check-editor-'+S.fp1052MaintenanceEdit.componentId);
  if(!h)return;
  if(isPlan){const label=kind==='austausch'?'Austausch':'Wartung';h.innerHTML=`<div class="subeditor"><div class="grid compact"><div class="field"><label>${label} *</label><input id="mwName" value="${esc(row?.fields?.Name||'')}"></div><div class="field"><label>Intervall / Lebensdauer *</label><input id="mwInterval" value="${esc(row?.fields?.IntervallRegel||'')}" placeholder="z. B. jährlich, 250 h oder 6 Jahre"></div><div class="field"><label>Nächster Termin</label><input id="mwNext" type="date" value="${fp1052DateInput(row?.fields?.NaechsterTermin)}"></div><div class="field"><label>Nächster Zählerstand</label><input id="mwCounter" type="number" step="0.1" value="${esc(row?.fields?.NaechsterZaehlerstand??'')}"></div></div><div class="field"><label>Notiz</label><textarea id="mwNote">${esc(row?.fields?.Notiz||'')}</textarea></div><div class="actions"><button class="primary" onclick="fp1052SaveMaintenanceItem()">Speichern</button><button onclick="vehicleconfigure()">Abbrechen</button></div></div>`;}
  else{h.innerHTML=`<div class="subeditor"><div class="grid compact"><div class="field"><label>Art der Prüfung *</label><input id="mpName" value="${esc(row?.fields?.Art||'')}"></div><div class="field"><label>Intervall</label><input id="mpInterval" value="${esc(row?.fields?.Intervall||'')}" placeholder="z. B. 2 Jahre"></div><div class="field"><label>Nächster Termin</label><input id="mpNext" type="date" value="${fp1052DateInput(row?.fields?.NaechsterTermin||row?.fields?.GueltigBis)}"></div></div><div class="field"><label>Quelle / Grundlage (optional)</label><textarea id="mpSource">${esc(row?.fields?.QuelleGrundlage||'')}</textarea></div><div class="field"><label>Notiz</label><textarea id="mpNote">${esc(row?.fields?.Notiz||'')}</textarea></div><div class="actions"><button class="primary" onclick="fp1052SaveMaintenanceItem()">Speichern</button><button onclick="vehicleconfigure()">Abbrechen</button></div></div>`;}
  h.scrollIntoView({block:'nearest'});
};

fp1052SaveMaintenanceItem=async function(){
  const e=S.fp1052MaintenanceEdit;if(!e)return;
  try{
    const api=await getCloud(),iso=v=>v?new Date(v+'T12:00:00').toISOString():null;
    if(e.kind==='wartung'||e.kind==='austausch'){
      if(!mwName.value.trim()||!mwInterval.value.trim())return alert('Bezeichnung und Intervall / Lebensdauer eingeben.');
      const f={FahrzeugId:String(S.configVehicleId),KomponenteId:String(e.componentId),BezugTyp:'Komponente',BezugId:String(e.componentId),RegelTyp:e.kind==='austausch'?'Austausch':'Wartung',Name:mwName.value.trim(),IntervallRegel:mwInterval.value.trim(),IntervallArt:'Frei',NaechsterTermin:iso(mwNext.value),NaechsterZaehlerstand:mwCounter.value?Number(mwCounter.value):null,Notiz:mwNote.value.trim(),Testdaten:testFlag(),Aktiv:true};
      if(e.id)await api.updateItemByName('Wartungsplaene',e.id,f);else await api.createItemByName('Wartungsplaene',f);
    }else{
      if(!mpName.value.trim())return alert('Art der Prüfung eingeben.');const vehicleLevel=e.kind==='fahrzeugpruefung',next=iso(mpNext.value),f={FahrzeugId:String(S.configVehicleId),KomponenteId:vehicleLevel?'':String(e.componentId),BezugTyp:vehicleLevel?'Fahrzeug':'Komponente',BezugId:vehicleLevel?String(S.configVehicleId):String(e.componentId),Art:mpName.value.trim(),Intervall:mpInterval.value.trim(),NaechsterTermin:next,GueltigBis:next,Ergebnis:'Offen',QuelleGrundlage:mpSource.value.trim(),Notiz:mpNote.value.trim(),Testdaten:testFlag(),Aktiv:true};if(e.id)await api.updateItemByName('Pruefungen',e.id,f);else await api.createItemByName('Pruefungen',f);
    }
    S.fp1052MaintenanceEdit=null;await vehicleconfigure();
  }catch(err){alert('Eintrag konnte nicht gespeichert werden: '+err.message+'\nBitte Microsoft 365 Setup für Version 1.0.5.3 ausführen.')}
};
fp1052DeleteMaintenanceItem=async function(kind,id){if(!confirm('Eintrag wirklich entfernen?'))return;try{const api=await getCloud();await api.deleteItemByName((kind==='wartung'||kind==='austausch')?'Wartungsplaene':'Pruefungen',id);await vehicleconfigure()}catch(e){alert(e.message)}};

/* ========================================================================== */
/*  Wasserski – Ablaufregeln                                                  */
/* ========================================================================== */

async function fp1053WaterskiMovementState(api){
  const usageId=String(S.usage?.cloudId||''),dayId=String(S.day?.id||''),events=(await fp105SafeList(api,'Ereignisse')).filter(x=>String(x.fields.NutzungId)===usageId&&(!dayId||String(x.fields.TagesetappeId||'')===dayId)&&x.fields.Rohdaten!==true&&['Ablegen','Anlegen / Ankern'].includes(String(x.fields.Art||''))).sort((a,b)=>String(a.fields.Zeitpunkt||'').localeCompare(String(b.fields.Zeitpunkt||''))),last=events[events.length-1];
  return {underway:last?.fields?.Art==='Ablegen',last};
}
async function fp1053ActiveWaterskiRun(api){return (await fp105SafeList(api,'WasserskiRuns')).find(x=>String(x.fields.NutzungId)===String(S.usage?.cloudId||'')&&x.fields.Status==='Aktiv'&&x.fields.Aktiv!==false)||null}

const fp1053StartWaterskiBase=fp1052StartWaterskiRun;
fp1052StartWaterskiRun=async function(){
  try{const api=await getCloud(),state=await fp1053WaterskiMovementState(api);if(!state.underway)return alert('Run kann erst nach dem Ablegen gestartet werden.');const active=await fp1053ActiveWaterskiRun(api);if(active)return alert('Es läuft bereits ein Wasserski-Run. Bitte diesen zuerst beenden.')}catch(e){return alert('Run-Status konnte nicht geprüft werden: '+e.message)}
  return fp1053StartWaterskiBase();
};
startWaterskiRun=fp1052StartWaterskiRun;

const fp1053AppendWaterskiBase=fp1052AppendWaterskiCockpit;
fp1052AppendWaterskiCockpit=async function(){
  await fp1053AppendWaterskiBase();
  try{
    const api=await getCloud(),state=await fp1053WaterskiMovementState(api),active=await fp1053ActiveWaterskiRun(api),box=document.getElementById('fp1052-waterski');
    if(box&&!state.underway&&!active){const b=[...box.querySelectorAll('button')].find(x=>/Run starten/i.test(x.textContent||''));if(b)b.disabled=true;const p=document.createElement('div');p.className='status-warn';p.textContent='Run erst nach Ablegen möglich.';box.querySelector('.section.first')?.insertAdjacentElement('afterend',p)}
    if(active){[...app.querySelectorAll('button')].filter(b=>/Anlegen|Ankern/i.test(b.textContent||'')).forEach(b=>{b.disabled=true;b.title='Aktiven Wasserski-Run zuerst beenden.'})}
  }catch(e){console.warn('Wasserski-Ablaufanzeige',e)}
};

const fp1053CockpitActionBase=fp104CockpitAction;
fp104CockpitAction=async function(action,view,primary=false){
  if(fp1052IsWaterskiName(S.usage?.name)&&/Anlegen|Ankern/i.test(String(action||''))){try{const api=await getCloud(),active=await fp1053ActiveWaterskiRun(api);if(active)return alert('Aktiver Wasserski-Run muss zuerst beendet werden.')}catch(e){return alert('Run-Status konnte nicht geprüft werden: '+e.message)}}
  return fp1053CockpitActionBase(action,view,primary);
};

const fp1053StayBase=stay;
stay=async function(){
  if(fp1052IsWaterskiName(S.usage?.name)){try{const api=await getCloud(),active=await fp1053ActiveWaterskiRun(api);if(active)return alert('Aktiver Wasserski-Run muss zuerst beendet werden.')}catch(e){return alert('Run-Status konnte nicht geprüft werden: '+e.message)}}
  return fp1053StayBase();
};

/* ========================================================================== */
/*  Nutzungsansicht – Uhrzeit + Datum                                         */
/* ========================================================================== */

const fp1053UsageDetailBase=usageDetail;
usageDetail=async function(){
  await fp1053UsageDetailBase();
  try{
    const api=await getCloud(),events=(await fp105SafeList(api,'Ereignisse')).filter(x=>String(x.fields.NutzungId)===String(S.usageDetailId)).sort((a,b)=>String(a.fields.Zeitpunkt||'').localeCompare(String(b.fields.Zeitpunkt||''))),heading=[...app.querySelectorAll('.section')].find(x=>(x.textContent||'').trim()==='Ereignisse'),card=heading?.closest('.card');
    if(card){card.querySelectorAll('.line').forEach(x=>x.remove());[...card.querySelectorAll('p.muted')].filter(x=>/Noch keine Ereignisse/i.test(x.textContent||'')).forEach(x=>x.remove());for(const e of events.slice(-30)){const line=document.createElement('div');line.className='line';line.innerHTML=`<div><b>${esc(e.fields.Art||'Ereignis')}</b><div class="muted">${esc(fp1053DateTimeLabel(e.fields.Zeitpunkt))}${e.fields.Herkunft==='Nachtrag'?' · nachgetragen':''}</div></div>`;card.appendChild(line)}if(!events.length){const p=document.createElement('p');p.className='muted';p.textContent='Noch keine Ereignisse.';card.appendChild(p)}}
    const runHeading=[...app.querySelectorAll('.section')].find(x=>(x.textContent||'').trim()==='Wasserski-Runs'),runCard=runHeading?.closest('.card');if(runCard){const [runs,people]=await Promise.all([fp105SafeList(api,'WasserskiRuns'),fp105SafeList(api,'Personen')]),pm=Object.fromEntries(people.map(x=>[String(x.id),x.fields.Anzeigename||x.fields.Title])),rs=runs.filter(x=>String(x.fields.NutzungId)===String(S.usageDetailId)).sort((a,b)=>String(a.fields.Beginn||'').localeCompare(String(b.fields.Beginn||'')));runCard.querySelectorAll('.line').forEach(x=>x.remove());rs.forEach((r,i)=>{const line=document.createElement('div');line.className='line';line.innerHTML=`<div><b>Run ${i+1} · ${esc(pm[String(r.fields.SkilaeuferPersonId)]||'Läufer')}</b><div class="muted">${esc(fp1053DateTimeLabel(r.fields.Beginn))} · ${esc(r.fields.Status||'')}</div></div>`;runCard.appendChild(line)})}
  }catch(e){console.warn('Ereignis-Zeitdarstellung',e)}
};

/* ========================================================================== */
/*  SharePoint-Schema 1.0.5.3 + sichtbare Version                            */
/* ========================================================================== */

const fp1053MergedSchemaBase=fp105MergedSchema;
fp105MergedSchema=async function(){const [prior,e1053]=await Promise.all([fp1053MergedSchemaBase(),fetch('phase1-sharepoint-schema-1.0.5.3.json',{cache:'no-store'}).then(r=>r.json())]);return fp105MergeSchemas(prior,e1053)};
m365setup=function(){head('Microsoft 365 Setup','Schema 1.0.5.3 · Phase 1 · additiv');const tok=window.FPAuth.token();app.innerHTML=`<div class="card"><b>Microsoft-Anmeldung</b><div id="authState">${tok?'✓ Microsoft-Token vorhanden':'Noch nicht mit Microsoft verbunden'}</div>${tok?'<button onclick="FPAuth.logout();render()">Microsoft-Verbindung trennen</button>':'<button class="primary" onclick="sessionStorage.setItem(\'fp_after_auth\',\'m365setup\');FPAuth.login()">Mit Microsoft 365 anmelden</button>'}</div><div class="card"><div class="field"><label>SharePoint-Site-URL</label><input id="spSite" value="${esc(localStorage.getItem('fp_sp_site')||'')}" placeholder="https://…sharepoint.com/sites/Fahrzeugplattform"></div><button class="primary" ${tok?'':'disabled'} onclick="runM365Provision1053()">Phase-1-Struktur prüfen / anlegen</button><p class="muted">Additiv und wiederholbar. 1.0.5.3 ergänzt nur die Kennzeichnung Wartung/Austausch; vorhandene Daten bleiben erhalten.</p></div><div id="m365Result"></div>`};
async function runM365Provision1053(){const url=document.getElementById('spSite').value.trim();if(!url)return alert('Bitte die vollständige SharePoint-Site-URL eintragen.');localStorage.setItem('fp_sp_site',url);const out=document.getElementById('m365Result');out.innerHTML='<div class="card">Schema 1.0.5.3 wird geladen …</div>';try{const schema=await fp105MergedSchema(),setup=new FPGraphSetup(FPAuth.token(),url,schema),site=await setup.resolveSite();let lines=[];out.innerHTML=`<div class="card"><b>Verbunden:</b> ${esc(site.displayName)}<div id="provLog" class="muted">Prüfung startet …</div></div>`;const log=document.getElementById('provLog'),res=await setup.provision(e=>{if(e.status==='created')lines.push(`${e.kind==='list'?'Liste':'Feld'} angelegt: ${e.kind==='field'?e.list+' · ':''}${e.name}`);if(log)log.innerHTML=`Fortschritt: ${esc(e.kind==='field'?e.list+' · '+e.name:e.name)}<br>${lines.slice(-8).map(esc).join('<br>')}`});out.innerHTML=`<div class="card status-ok"><b>Setup abgeschlossen und verifiziert</b><p>${res.totalLists} Listen geprüft · ${res.listsCreated} neu angelegt · ${res.fieldsCreated} Felder neu angelegt · ${res.verifiedLists} Listen für die App erreichbar.</p></div>`}catch(e){out.innerHTML=`<div class="card status-stop"><b>Setup nicht abgeschlossen</b><p>${esc(e.message)}</p></div>`}}
runM365Provision=runM365Provision1053;
exportPhase1Data=async function(){try{const schema=await fp105MergedSchema(),api=await getCloud(),data={exportedAt:new Date().toISOString(),version:FP1053_VERSION,lists:{}};for(const l of schema.lists){try{data.lists[l.internalName]=await list(api,l.internalName)}catch(e){data.lists[l.internalName]={error:e.message}}}const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Fahrzeugplattform_Export_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}catch(e){alert(e.message)}};
login=function(){bar.hidden=true;app.innerHTML=`<div class="login"><div class="card mobi-login">${typeof mobiIcon==='function'?mobiIcon():''}${typeof brandHeadline==='function'?brandHeadline():'<div class="brand">MOBIMORY</div>'}<p class="muted">Version ${FP1053_VERSION}</p><div class="field"><label>Nutzer</label><input value="Admin"></div><div class="field"><label>Passwort</label><input type="password" value="admin"></div><button class="primary" onclick="S.stack=[];S.view='main';render()">Anmelden</button></div></div>`};
document.title=`Fahrzeugplattform ${FP1053_VERSION}`;const fp1053Foot=document.querySelector('footer');if(fp1053Foot)fp1053Foot.textContent=`Fahrzeugplattform · ${FP1053_VERSION} · © 2026 Entwicklungsstand`;
try{render()}catch(e){console.warn(e)}
