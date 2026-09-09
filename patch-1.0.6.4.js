/* MOBIMORY / Fahrzeugplattform 1.0.6.4-dev
   Cockpit-/Praxisupdate:
   - Ausfahrt: kein geplantes Ziel nötig, Start kompakter, mehrtägig offen bis bewusst beendet
   - Wasserski: sehr kompakter Start; eigenes Cockpit ohne Besatzungsbutton/Tagesabschluss
   - Motor-BH: Startwert bestätigen, live hochrechnen, Motorstart/-stop mit Zeit/GPS,
     Stop zeigt Laufzeit + theoretischen BH-Stand; Tagesabschluss bestätigt echten Stand
   - Tankanzeige aus BH-Summe x Verbrauch; manuelles Startmodell, Tanken mit Menge/Kosten
   - Wasserski-Runs: Disziplin, dynamische Läufer-Setups, GPS je Run/Etappe und Läuferbezug
*/

const FP1064_VERSION='1.0.6.4-dev';
const FP1064={timer:null,motorSnapshot:null,wsSetups:[],wsRuns:[],wsPeople:[]};

function fp1064Norm(v){return String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function fp1064IsWaterski(){return fp1064Norm(S.usage?.name).includes('wasserski')}
function fp1064IsAusfahrt(){return fp1064Norm(S.usage?.name)==='ausfahrt'}
function fp1064Today(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function fp1064H(v){return Number.isFinite(Number(v))?Number(v):null}
function fp1064FmtH(v){return v==null?'–':Number(v).toFixed(1)+' h'}
function fp1064FmtRuntime(h){if(!Number.isFinite(h))return'–';const m=Math.round(h*60),hh=Math.floor(m/60),mm=m%60;return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')} h`}

function fp1064InstallStyle(){
 if(document.getElementById('fp1064-style'))return;
 const s=document.createElement('style');s.id='fp1064-style';s.textContent=`
 .fp1064-status-ok{font-weight:800}
 .fp1064-tankbar{display:flex;width:100%;height:28px;border-radius:14px;overflow:hidden;border:1px solid #aeb6c0;margin:.5rem 0}
 .fp1064-tankfill{background:#168547;height:100%}.fp1064-tankempty{background:#d9dee5;height:100%}
 .fp1064-bigpercent{font-size:1.45rem;font-weight:800}
 .fp1064-motors{display:grid;gap:.65rem}.fp1064-motors button{text-align:left;width:100%}
 .fp1064-runsetup{border:1px solid #d8dde4;border-radius:12px;padding:.75rem;margin:.6rem 0}
 .fp1064-runvalues{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem}
 .fp1064-runvalues>div{border:1px solid #e2e6eb;border-radius:10px;padding:.55rem}
 .fp1064-cockpit-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem}
 `;document.head.appendChild(s)
}

/* -------------------------------------------------------------------------- */
/* Schema 1.0.6.4 additiv                                                     */
/* -------------------------------------------------------------------------- */
const fp1064MergedSchemaBase=fp105MergedSchema;
fp105MergedSchema=async function(){
 const [prior,e1064]=await Promise.all([fp1064MergedSchemaBase(),fetch('phase1-sharepoint-schema-1.0.6.4.json',{cache:'no-store'}).then(r=>r.json())]);
 return fp105MergeSchemas(prior,e1064)
};

/* -------------------------------------------------------------------------- */
/* Startmasken: Wasserski maximal kompakt, Ausfahrt ohne geplantes Ziel        */
/* -------------------------------------------------------------------------- */
function fp1064RemoveBoxById(id){const el=document.getElementById(id);if(!el)return;const box=el.closest('.location-box,.field');if(box)box.remove()}
function fp1064RenameSection(from,to){[...app.querySelectorAll('.section')].forEach(x=>{if((x.textContent||'').trim()===from)x.textContent=to})}
function fp1064AddStartDate(card){
 if(document.getElementById('fp1064StartDate'))return;
 const d=document.createElement('div');d.className='field';d.innerHTML=`<label>Startdatum</label><input id="fp1064StartDate" type="date" value="${fp1064Today()}">`;
 const first=card.querySelector('.section.first');if(first)first.insertAdjacentElement('afterend',d);else card.insertBefore(d,card.firstChild)
}
const fp1064SetupBase=setupBase;
setupBase=async function(){
 const r=await fp1064SetupBase();
 if(S.vehicle?.profile!=='motorboat')return r;
 const card=app.querySelector('.card');if(!card)return r;fp1064AddStartDate(card);
 if(fp1064IsWaterski()){
   fp1064RemoveBoxById('dayStartOrt');fp1064RemoveBoxById('dayGoalOrt');fp1064RemoveBoxById('planStartOrt');fp1064RemoveBoxById('planEndOrt');
   document.getElementById('usageName1062')?.closest('.field')?.remove();
   const animalSection=[...card.querySelectorAll('.section')].find(x=>/tiere/i.test(x.textContent||''));if(animalSection){let n=animalSection.nextElementSibling;animalSection.remove();while(n&&n.tagName!=='DIV'&&n.tagName!=='BUTTON'){const next=n.nextElementSibling;n.remove();n=next}}
   fp1064RenameSection('Personen','Mit an Bord');
   [...card.querySelectorAll('label')].forEach(l=>{const t=(l.textContent||'').trim();if(/^Crew\s*·/i.test(t))l.childNodes[l.childNodes.length-1].textContent=' Crew';if(/^Gäste\s*·/i.test(t))l.childNodes[l.childNodes.length-1].textContent=' Gäste'});
   const btn=[...card.querySelectorAll('button')].find(b=>/Nutzung starten/i.test(b.textContent||''));if(btn)btn.textContent='Wasserski starten';
 }
 if(fp1064IsAusfahrt()){
   fp1064RemoveBoxById('dayGoalOrt');fp1064RemoveBoxById('planEndOrt');
   const btn=[...card.querySelectorAll('button')].find(b=>/Nutzung starten/i.test(b.textContent||''));if(btn)btn.textContent='Ausfahrt starten';
 }
 return r
};

/* Ausfahrt und Wasserski sind reale Nutzungen ohne geplantes Ziel/Enddatum. */
const fp1064BeginBase=beginCloud101;
beginCloud101=async function(){
 if(fp1064IsWaterski()||fp1064IsAusfahrt()){
   S.usage.multi=false;
   /* entfernte Ort-Felder als leere kompatible Felder bereitstellen */
   for(const id of ['dayStartOrt','dayStartStandort','dayGoalOrt','dayGoalStandort'])if(!document.getElementById(id)){const x=document.createElement('input');x.type='hidden';x.id=id;app.appendChild(x)}
 }
 const requested=document.getElementById('fp1064StartDate')?.value||'';
 const r=await fp1064BeginBase();
 if(requested&&requested!==fp1064Today()&&S.usage?.cloudId&&S.day?.id){
   try{const api=await getCloud(),now=new Date(),local=new Date(`${requested}T${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:00`),iso=local.toISOString();await api.updateItemByName('Nutzungen',S.usage.cloudId,{Beginn:iso});await api.updateItemByName('Tagesetappen',S.day.id,{Datum:iso,Beginn:iso})}catch(e){console.warn('Startdatum konnte nicht nachgetragen werden',e)}
 }
 return r
};
beginCloud=beginCloud101;

/* -------------------------------------------------------------------------- */
/* Motor-BH: bestätigter Startwert + protokollierte Laufzeit = theoretischer BH */
/* -------------------------------------------------------------------------- */
async function fp1064MotorData(api){
 const x=await fp1062MotorState(api),ms=(await fp105SafeList(api,'Messwerte')).filter(m=>String(m.fields.NutzungId)===String(S.usage?.cloudId||'')&&String(m.fields.TagesetappeId)===String(S.day?.id||'')&&m.fields.Aktiv!==false),starts={};
 for(const e of x.engines){const rows=ms.filter(m=>String(m.fields.KomponenteId||'')===String(e.id)&&String(m.fields.Messgroesse||'')==='Betriebsstunden'&&String(m.fields.Phase||'')==='Start').sort((a,b)=>String(b.fields.GemessenAm||'').localeCompare(String(a.fields.GemessenAm||'')));if(rows[0])starts[e.id]={value:Number(rows[0].fields.Wert),at:rows[0].fields.GemessenAm}}
 return {...x,starts}
}
function fp1064MotorCalc(data,engineId,now=new Date().toISOString()){
 const st=data.starts?.[String(engineId)],runtime=st?fp1062MotorElapsed(data.events,String(engineId),st.at,now):0,theoretical=st&&Number.isFinite(st.value)?st.value+runtime:null;return {start:st?.value??null,runtime,theoretical}
}
async function fp1064ToggleMotor(engineId){
 try{
   const api=await getCloud(),data=await fp1064MotorData(api),engine=data.engines.find(e=>String(e.id)===String(engineId)),state=data.state[String(engineId)];if(!engine)return alert('Motor wurde nicht gefunden.');
   const pos=await fp104Position(),now=new Date().toISOString(),action=state?.running?'gestoppt':'gestartet';
   await fp1062RecordMotor(api,engine,action,{timestamp:now,lat:pos.lat,lon:pos.lon,accuracy:pos.accuracy,source:`Manuell · Cockpit Motor-${action==='gestartet'?'Start':'Stop'}`});
   if(action==='gestoppt'){
     const fresh=await fp1064MotorData(api),c=fp1064MotorCalc(fresh,engine.id,now);
     if(c.theoretical!=null)await api.createItemByName('Messwerte',{FahrzeugId:String(S.vehicle.id),NutzungId:String(S.usage.cloudId),TagesetappeId:String(S.day?.id||''),KomponenteId:String(engine.id),Messgroesse:'Betriebsstunden',Wert:Number(c.theoretical.toFixed(3)),Einheit:'h',Phase:'Zwischenwert',GemessenAm:now,Quelle:'Theoretisch aus Motorlaufzeit',Notiz:`Laufzeit heute ${fp1064FmtRuntime(c.runtime)}`,Testdaten:testFlag(),Aktiv:true});
     alert(`${engine.name} gestoppt.\nLaufzeit heute: ${fp1064FmtRuntime(c.runtime)}\nTheoretischer BH-Stand: ${fp1064FmtH(c.theoretical)}`)
   }
   await cockpit()
 }catch(e){alert('Motoraktion konnte nicht gespeichert werden: '+e.message)}
}
function fp1064StopMotorTimer(){if(FP1064.timer){clearInterval(FP1064.timer);FP1064.timer=null}}
function fp1064StartMotorTimer(){fp1064StopMotorTimer();FP1064.timer=setInterval(()=>{const d=FP1064.motorSnapshot;if(!d)return;for(const e of d.engines){const el=document.getElementById('fp1064Bh_'+e.id),rt=document.getElementById('fp1064Rt_'+e.id);if(!el&&!rt)continue;const c=fp1064MotorCalc(d,e.id,new Date().toISOString());if(el)el.textContent=fp1064FmtH(c.theoretical);if(rt)rt.textContent=fp1064FmtRuntime(c.runtime)}},15000)}

/* -------------------------------------------------------------------------- */
/* Tankmodell: manueller Ausgangswert, danach BH-Verbrauch + Tankvorgänge      */
/* -------------------------------------------------------------------------- */
async function fp1064TotalBh(api){const d=await fp1064MotorData(api);let sum=0,known=0;for(const e of d.engines){const c=fp1064MotorCalc(d,e.id);if(c.theoretical!=null){sum+=c.theoretical;known++}}return {sum,known}}
async function fp1064TankModel(api){const rows=(await fp105SafeList(api,'Tankmodelle1064')).filter(x=>String(x.fields.FahrzeugId)===String(S.vehicle.id)&&x.fields.Aktiv!==false&&fp1064Norm(x.fields.Energieart||'Diesel')==='diesel').sort((a,b)=>String(b.fields.AktualisiertAm||'').localeCompare(String(a.fields.AktualisiertAm||'')));return rows[0]||null}
async function fp1064TankState(api){
 const model=await fp1064TankModel(api);if(!model)return {model:null,capacity:null,liters:null,percent:null,used:null};
 const f=model.fields||{},capacity=fp1064H(f.KapazitaetL),basis=fp1064H(f.BasisMengeL),basisBh=fp1064H(f.BasisBhSumme),rate=fp1064H(f.VerbrauchLProBh),bh=await fp1064TotalBh(api);
 if(capacity==null||basis==null||basisBh==null||rate==null||!bh.known)return {model,capacity,liters:basis,percent:capacity?Math.max(0,Math.min(100,basis/capacity*100)):null,used:null};
 const used=Math.max(0,bh.sum-basisBh)*rate,liters=Math.max(0,Math.min(capacity,basis-used)),percent=capacity>0?liters/capacity*100:null;return {model,capacity,liters,percent,used,rate,bh:bh.sum}
}
async function fp1064ConfigureTank(){
 try{
   const api=await getCloud(),old=await fp1064TankModel(api),current=old?await fp1064TankState(api):null,bh=await fp1064TotalBh(api),cap=prompt('Tankkapazität gesamt in Liter:',old?.fields?.KapazitaetL||'' );if(cap===null)return;const amount=prompt('Aktueller Tankinhalt in Liter:',current?.liters!=null?Number(current.liters).toFixed(1):'');if(amount===null)return;const rate=prompt('Verbrauch in Liter pro Motor-Betriebsstunde:',old?.fields?.VerbrauchLProBh||'');if(rate===null)return;
   const fields={FahrzeugId:String(S.vehicle.id),Energieart:'Diesel',KapazitaetL:Number(cap),BasisMengeL:Number(amount),BasisBhSumme:Number(bh.sum||0),VerbrauchLProBh:Number(rate),Quelle:'Manuell',AktualisiertAm:new Date().toISOString(),Aktiv:true,Testdaten:testFlag()};
   if(!Number.isFinite(fields.KapazitaetL)||fields.KapazitaetL<=0||!Number.isFinite(fields.BasisMengeL)||!Number.isFinite(fields.VerbrauchLProBh)||fields.VerbrauchLProBh<0)return alert('Bitte gültige Zahlen eingeben.');
   if(old)await api.updateItemByName('Tankmodelle1064',old.id,fields);else await api.createItemByName('Tankmodelle1064',fields);await cockpit()
 }catch(e){alert('Tankmodell konnte nicht gespeichert werden: '+e.message)}
}
async function fp1064SaveFuel(){
 const amount=Number(document.getElementById('suAmount')?.value),cost=Number(document.getElementById('suCost')?.value);if(!Number.isFinite(amount)||amount<=0)return alert('Bitte getankte Liter eingeben.');if(!Number.isFinite(cost)||cost<0)return alert('Bitte Gesamtkosten eingeben.');
 try{const api=await getCloud(),now=new Date().toISOString(),state=await fp1064TankState(api),bh=await fp1064TotalBh(api);await api.createItemByName('Versorgungsvorgaenge',{FahrzeugId:String(S.vehicle.id),NutzungId:String(S.usage.cloudId),KomponenteId:'',Art:'Diesel',Menge:amount,Einheit:'l',Kosten:cost,Waehrung:'EUR',Zeitpunkt:now,Testdaten:testFlag(),Aktiv:true});if(state.model){const next=Math.min(Number(state.capacity||Infinity),Math.max(0,Number(state.liters||0))+amount);await api.updateItemByName('Tankmodelle1064',state.model.id,{BasisMengeL:next,BasisBhSumme:Number(bh.sum||0),AktualisiertAm:now})}S.pendingContext=null;back()}catch(e){alert('Tanken konnte nicht gespeichert werden: '+e.message)}
}
const fp1064SupplyBase=supply;
supply=async function(){
 if(S.vehicle?.profile!=='motorboat')return fp1064SupplyBase();
 head('Tanken',S.vehicle.name);app.innerHTML=`<div class="card"><div class="section first">Tankvorgang</div><div class="grid compact"><div class="field"><label>Menge</label><input id="suAmount" type="number" step="0.1" placeholder="Liter" oninput="fp1064FuelPrice()"></div><div class="field"><label>Gesamtkosten</label><input id="suCost" type="number" step="0.01" placeholder="EUR" oninput="fp1064FuelPrice()"></div></div><div class="fp-summary-line"><span>Preis / Liter</span><b id="fp1064PriceL">–</b></div><button class="primary" onclick="fp1064SaveFuel()">Tanken speichern</button></div>`
};
function fp1064FuelPrice(){const a=Number(document.getElementById('suAmount')?.value),c=Number(document.getElementById('suCost')?.value),el=document.getElementById('fp1064PriceL');if(el)el.textContent=a>0&&Number.isFinite(c)?(c/a).toFixed(3)+' €/l':'–'}

/* -------------------------------------------------------------------------- */
/* Bewegung: Zeit/GPS beim Tipp; kein automatischer Motorstart mehr            */
/* -------------------------------------------------------------------------- */
async function fp1064Movement(action,view=null){await fp104Capture(action,true);if(view)go(view);else await cockpit()}

/* -------------------------------------------------------------------------- */
/* Cockpit Motorboot / Wasserski                                               */
/* -------------------------------------------------------------------------- */
async function fp1064DueData(api){
 let due=[];const [fp,cs,wp]=await Promise.all([fp105SafeList(api,'FahrzeugPruefpunkte'),fp105SafeList(api,'Komponenten'),fp105SafeList(api,'Wartungsplaene')]);
 fp.filter(x=>String(x.fields.FahrzeugId)===String(S.vehicle.id)&&x.fields.Aktiv!==false&&x.fields.NaechstePruefung).forEach(x=>due.push({name:x.fields.Name,source:'Fahrzeugprüfung',days:daysUntil(x.fields.NaechstePruefung)}));
 cs.filter(x=>String(x.fields.FahrzeugId)===String(S.vehicle.id)&&x.fields.Aktiv!==false&&x.fields.Pruefpflicht&&x.fields.NaechstePruefung).forEach(x=>due.push({name:x.fields.Name,source:'Komponente',days:daysUntil(x.fields.NaechstePruefung)}));
 wp.filter(x=>String(x.fields.FahrzeugId)===String(S.vehicle.id)&&x.fields.Aktiv!==false&&x.fields.NaechsterTermin).forEach(x=>due.push({name:x.fields.Name,source:'Werkstatt / Service',days:daysUntil(x.fields.NaechsterTermin)}));return due.filter(x=>x.days!==null&&x.days<=60).sort((a,b)=>a.days-b.days)
}
function fp1064MotorCard(data){FP1064.motorSnapshot=data;return `<div class="card"><div class="section first">Motoren</div><div class="fp1064-motors">${data.engines.map(e=>{const s=data.state[e.id],c=fp1064MotorCalc(data,e.id);return `<button class="${s?.running?'fp1063-motor-running':''}" onclick="fp1064ToggleMotor('${e.id}')"><b>${esc(e.name)}</b><br>${s?.running?'● Motor läuft':'○ Motor aus'} · BH <span id="fp1064Bh_${e.id}">${fp1064FmtH(c.theoretical)}</span><br><small>Laufzeit heute <span id="fp1064Rt_${e.id}">${fp1064FmtRuntime(c.runtime)}</span> · Drücken = ${s?.running?'Motor Stop':'Motor Start'}</small></button>`}).join('')||'<p class="muted">Keine Antriebsmotoren konfiguriert.</p>'}</div></div>`}
function fp1064TankCard(t){if(!t.model)return `<div class="card"><div class="section first">Tank</div><p>Tankmodell noch nicht eingerichtet.</p><button onclick="fp1064ConfigureTank()">Tankdaten festlegen</button></div>`;const p=Math.max(0,Math.min(100,Number(t.percent||0))),empty=100-p;return `<div class="card"><div class="line"><div><b>Tank</b><div class="muted">rechnerisch aus BH und Verbrauch</div></div><button onclick="fp1064ConfigureTank()">Basis korrigieren</button></div><div class="fp1064-tankbar"><div class="fp1064-tankfill" style="width:${p}%"></div><div class="fp1064-tankempty" style="width:${empty}%"></div></div><div class="line"><span class="fp1064-bigpercent">${p.toFixed(0)} %</span><span>${t.liters!=null?Number(t.liters).toFixed(1)+' l':''}${t.capacity!=null?' / '+Number(t.capacity).toFixed(0)+' l':''}</span></div><button onclick="fp104CockpitAction('Tanken','supply')">Tanken</button></div>`}
const fp1064CockpitBase=cockpit;
cockpit=async function(){
 fp1064StopMotorTimer();if(S.vehicle?.profile!=='motorboat'||!S.usage?.cloudId)return fp1064CockpitBase();fp1064InstallStyle();head('Cockpit',`${S.vehicle.name} · ${S.usage.displayName||S.usage.name}`);app.innerHTML='<div class="card">Cockpit wird geladen …</div>';
 try{
   const api=await getCloud(),[due,mot,tank,events]=await Promise.all([fp1064DueData(api),fp1064MotorData(api),fp1064TankState(api),fp105SafeList(api,'Ereignisse')]);
   const own=events.filter(x=>String(x.fields.TagesetappeId)===String(S.day?.id)&&x.fields.Rohdaten!==true&&['Ablegen','Anlegen / Ankern','Anlegen'].includes(String(x.fields.Art||''))).sort((a,b)=>String(a.fields.Zeitpunkt||'').localeCompare(String(b.fields.Zeitpunkt||''))),last=own[own.length-1],underway=last?.fields?.Art==='Ablegen',lastDep=[...own].reverse().find(x=>x.fields.Art==='Ablegen'),lastArr=[...own].reverse().find(x=>['Anlegen / Ankern','Anlegen'].includes(x.fields.Art)),depTime=lastDep?.fields?.Zeitpunkt||null,arrTime=!underway&&lastArr?.fields?.Zeitpunkt||null;
   const control=`<div class="card"><div class="line"><div><b>Abfahrtskontrolle</b><div class="${due.length?'status-warn':'fp1064-status-ok'}">${due.length?due.length+' Hinweis(e)':'✓ OK'}</div></div><button onclick="fp104CockpitAction('Kontrolle','control')">Öffnen</button></div>${due.length?due.slice(0,5).map(x=>`<div class="due-line"><b>${esc(x.name)}</b><span>${esc(x.source)} · ${dueText(x.days)}</span></div>`).join(''):''}</div>`;
   const movement=`<div class="card"><div class="fp-pair"><button class="${underway?'fp-active':''}" ${underway?'disabled':''} onclick="fp1064Movement('Ablegen')">Ablegen${depTime?' · '+fp104Time(depTime):''}</button><button onclick="fp1064Movement('Anlegen','stay')">Anlegen${arrTime?' · '+fp104Time(arrTime):''}</button></div></div>`;
   if(fp1064IsWaterski()){
     app.innerHTML=control+fp1064TankCard(tank)+fp1064MotorCard(mot)+movement+`<div class="card"><button class="primary" onclick="S.waterskiUsageId=String(S.usage.cloudId);go('waterski')">Runs</button></div><div class="fp1064-cockpit-actions"><button onclick="fp104CockpitAction('Foto / Film','media')">Foto / Film</button><button onclick="fp104CockpitAction('Wetter','weather')">Wetter</button><button onclick="fp104CockpitAction('Ereignis','event')">Ereignis</button></div>`;
   }else{
     app.innerHTML=control+fp1064TankCard(tank)+fp1064MotorCard(mot)+movement+`<div class="fp1064-cockpit-actions"><button onclick="fp104CockpitAction('Ereignis','event')">Ereignis</button><button onclick="fp104CockpitAction('Wetter','weather')">Wetter</button><button onclick="fp104CockpitAction('Foto / Film','media')">Foto / Film</button><button onclick="fp104CockpitAction('Besatzung ändern','crewchange')">Besatzung ändern</button><button onclick="fp104CockpitAction('Tagesabschluss','dayend')">Tagesabschluss</button></div>`;
   }
   fp1064StartMotorTimer()
 }catch(e){failBox(e,'start')}
};

/* -------------------------------------------------------------------------- */
/* Tagesabschluss: theoretischen BH vorfüllen und echten Stand bestätigen      */
/* -------------------------------------------------------------------------- */
const fp1064DayendBase=dayend;
dayend=async function(){
 await fp1064DayendBase();if(S.vehicle?.profile!=='motorboat')return;
 try{const api=await getCloud(),d=await fp1064MotorData(api);for(let i=0;i<(S.metrics||[]).length;i++){const m=S.metrics[i],el=document.getElementById('em'+i);if(!el)continue;const c=fp1064MotorCalc(d,m.componentId);if(c.theoretical!=null)el.value=Number(c.theoretical).toFixed(1);const lab=el.closest('.field')?.querySelector('label');if(lab)lab.textContent=`${m.measure} Ende · ${m.name} · theoretisch ${fp1064FmtH(c.theoretical)} · bitte bestätigen/korrigieren`}
   const first=app.querySelector('.card');if(first&&!document.getElementById('fp1064EndBhConfirm')){const buttons=first.querySelector('.fp-pair')||first.querySelector('.actions');const l=document.createElement('label');l.className='checkrow';l.innerHTML='<input id="fp1064EndBhConfirm" type="checkbox"> Tatsächliche BH-Stände geprüft / korrigiert';if(buttons)first.insertBefore(l,buttons);else first.appendChild(l)}
 }catch(e){console.warn('BH-Vorbelegung Tagesabschluss',e)}
};
const fp1064FinishBase=finishV104;
finishV104=async function(continueUsage){if(S.vehicle?.profile==='motorboat'&&!document.getElementById('fp1064EndBhConfirm')?.checked)return alert('Bitte die tatsächlichen BH-Stände prüfen und bestätigen.');const uid=S.usage?.cloudId,actual=S.dayEndLocation||'';const r=await fp1064FinishBase(continueUsage);if(!continueUsage&&uid&&fp1064IsAusfahrt()&&actual){try{const api=await getCloud();await api.updateItemByName('Nutzungen',uid,{TatsaechlichesZiel1064:actual})}catch(e){console.warn(e)}}return r};

/* -------------------------------------------------------------------------- */
/* Wasserski: dynamische Setups + GPS mit direktem Läufer-/Run-Bezug           */
/* -------------------------------------------------------------------------- */
function fp1064SetupLabel(s){const f=s.fields||{},bits=[];if(f.LeinenlaengeM!=null)bits.push(`${Number(f.LeinenlaengeM)} m`);if(f.Sportgeraet)bits.push(f.Sportgeraet);if(f.GeschwindigkeitKmh!=null)bits.push(`${Number(f.GeschwindigkeitKmh)} km/h`);if(f.DrehzahlRPM!=null)bits.push(`${Number(f.DrehzahlRPM)} rpm`);return f.Bezeichnung||bits.join(' · ')||'Setup'}
function fp1064RefreshSetupChoices(){
 const runner=String(document.getElementById('wsRunner')?.value||''),disc=String(document.getElementById('wsDiscipline')?.value||''),sel=document.getElementById('wsSetup');if(!sel)return;const rows=FP1064.wsSetups.filter(x=>String(x.fields.PersonId)===runner&&fp1064Norm(x.fields.Disziplin)===fp1064Norm(disc)&&x.fields.Aktiv!==false).sort((a,b)=>String(b.fields.ZuletztVerwendet||'').localeCompare(String(a.fields.ZuletztVerwendet||''))||Number(b.fields.Verwendungen||0)-Number(a.fields.Verwendungen||0));sel.innerHTML='<option value="">– neues / freies Setup –</option>'+rows.map(x=>`<option value="${x.id}">${esc(fp1064SetupLabel(x))}</option>`).join('');fp1064ApplySetup()
}
function fp1064ApplySetup(){const id=String(document.getElementById('wsSetup')?.value||''),s=FP1064.wsSetups.find(x=>String(x.id)===id),f=s?.fields||{};for(const [id2,v] of [['wsLine',f.LeinenlaengeM],['wsGear',f.Sportgeraet],['wsSpeed',f.GeschwindigkeitKmh],['wsRpm',f.DrehzahlRPM]]){const e=document.getElementById(id2);if(e)e.value=v??''}fp1064RenderRunPreview()}
function fp1064RenderRunPreview(){const el=document.getElementById('wsPreview');if(!el)return;const runner=FP1064.wsPeople.find(x=>String(x.id)===String(document.getElementById('wsRunner')?.value||'')),name=runner?.fields?.Anzeigename||runner?.fields?.Title||'Läufer',disc=document.getElementById('wsDiscipline')?.value||'',line=document.getElementById('wsLine')?.value||'–',gear=document.getElementById('wsGear')?.value||'–',speed=document.getElementById('wsSpeed')?.value||'–',rpm=document.getElementById('wsRpm')?.value||'–';el.innerHTML=`<b>${esc(name)} · ${esc(disc)}</b><div class="fp1064-runvalues"><div>Leine<br><b>${esc(line)} m</b></div><div>Ski / Board<br><b>${esc(gear)}</b></div><div>Speed<br><b>${esc(speed)} km/h</b></div><div>Drehzahl<br><b>${esc(rpm)} rpm</b></div></div>`}
function fp1064RunFieldsFromUi(){return {Disziplin1064:document.getElementById('wsDiscipline')?.value||'',SetupId1064:String(document.getElementById('wsSetup')?.value||''),LeinenlaengeM1064:document.getElementById('wsLine')?.value?Number(document.getElementById('wsLine').value):null,Sportgeraet1064:(document.getElementById('wsGear')?.value||'').trim(),GeschwindigkeitKmh1064:document.getElementById('wsSpeed')?.value?Number(document.getElementById('wsSpeed').value):null,DrehzahlRPM1064:document.getElementById('wsRpm')?.value?Number(document.getElementById('wsRpm').value):null,SetupGespeichert1064:false}}
waterski=async function(){
 head('Wasserski','Runs · Läufer · Disziplin · Setup');app.innerHTML='<div class="card">Wasserski-Daten werden geladen …</div>';
 try{
  const api=await getCloud(),[runs,legs,roles,people,setups]=await Promise.all([fp105SafeList(api,'WasserskiRuns'),fp105SafeList(api,'WasserskiRunEtappen'),fp105SafeList(api,'WasserskiRunPersonen'),fp105SafeList(api,'Personen'),fp105SafeList(api,'WasserskiSetups1064')]);
  const rs=runs.filter(x=>String(x.fields.NutzungId)===String(S.waterskiUsageId)).sort((a,b)=>String(a.fields.Beginn||'').localeCompare(String(b.fields.Beginn||''))),pm=Object.fromEntries(people.map(x=>[String(x.id),x.fields.Anzeigename||x.fields.Title])),activePeople=people.filter(x=>x.fields.Aktiv!==false),active=rs.find(x=>x.fields.Status==='Aktiv'),lastEnded=[...rs].reverse().find(x=>x.fields.Status==='Beendet'&&x.fields.SetupGespeichert1064!==true);FP1064.wsSetups=setups;FP1064.wsRuns=rs;FP1064.wsPeople=activePeople;
  const pending=lastEnded?`<div class="card status-warn"><div class="section first">Setup nach letztem Run</div><p><b>${esc(pm[String(lastEnded.fields.SkilaeuferPersonId)]||'Läufer')}</b> · ${esc(lastEnded.fields.Disziplin1064||'')}</p><div class="fp1064-runvalues"><div>Leine<br><b>${lastEnded.fields.LeinenlaengeM1064??'–'} m</b></div><div>Ski / Board<br><b>${esc(lastEnded.fields.Sportgeraet1064||'–')}</b></div><div>Speed<br><b>${lastEnded.fields.GeschwindigkeitKmh1064??'–'} km/h</b></div><div>Drehzahl<br><b>${lastEnded.fields.DrehzahlRPM1064??'–'} rpm</b></div></div><div class="actions"><button onclick="fp1064EditRunValues('${lastEnded.id}')">Werte ändern</button>${lastEnded.fields.SetupId1064?`<button onclick="fp1064SaveRunSetup('${lastEnded.id}','overwrite')">Setup überschreiben</button>`:''}<button onclick="fp1064SaveRunSetup('${lastEnded.id}','add')">Als zusätzliches Setup</button><button onclick="fp1064SaveRunSetup('${lastEnded.id}','none')">Nur dieser Run</button></div></div>`:'';
  app.innerHTML=`${pending}<div class="card"><div class="section first">${active?'Aktiver Run':'Nächsten Run starten'}</div>${active?`<p><b>${esc(pm[String(active.fields.SkilaeuferPersonId)]||'Läufer')}</b> · ${esc(active.fields.Disziplin1064||'')}</p><div class="fp1064-runvalues"><div>Leine<br><b>${active.fields.LeinenlaengeM1064??'–'} m</b></div><div>Ski / Board<br><b>${esc(active.fields.Sportgeraet1064||'–')}</b></div><div>Speed<br><b>${active.fields.GeschwindigkeitKmh1064??'–'} km/h</b></div><div>Drehzahl<br><b>${active.fields.DrehzahlRPM1064??'–'} rpm</b></div></div><button onclick="fp1064EditRunValues('${active.id}')">Run-Werte anpassen</button><button onclick="addWaterskiLeg('${active.id}')">Weitere Etappe / Wechselpunkt</button><button class="primary" onclick="endWaterskiRun('${active.id}')">Run beenden / Läuferwechsel</button>`:`<div class="field"><label>Skiläufer</label><select id="wsRunner" onchange="fp1064RefreshSetupChoices()"><option value="">– auswählen –</option>${activePeople.map(p=>`<option value="${p.id}">${esc(p.fields.Anzeigename||p.fields.Title)}</option>`).join('')}</select></div><div class="field"><label>Disziplin</label><select id="wsDiscipline" onchange="fp1064RefreshSetupChoices()"><option>Monoski</option><option>Wakeboard</option><option>Wasserski</option><option>Kneeboard</option><option>Sonstiges</option></select></div><div class="field"><label>Gespeichertes Setup</label><select id="wsSetup" onchange="fp1064ApplySetup()"><option value="">– neues / freies Setup –</option></select></div><div class="grid compact"><input id="wsLine" type="number" step="0.1" placeholder="Leine m" oninput="fp1064RenderRunPreview()"><input id="wsGear" placeholder="Ski / Board" oninput="fp1064RenderRunPreview()"><input id="wsSpeed" type="number" step="0.1" placeholder="km/h" oninput="fp1064RenderRunPreview()"><input id="wsRpm" type="number" step="10" placeholder="rpm" oninput="fp1064RenderRunPreview()"></div><div id="wsPreview" class="fp1064-runsetup"></div><div class="field"><label>Fahrer</label><select id="wsDriver"><option value="">– auswählen –</option>${activePeople.map(p=>`<option value="${p.id}">${esc(p.fields.Anzeigename||p.fields.Title)}</option>`).join('')}</select></div><div class="field"><label>Beobachter</label><select id="wsObserver"><option value="">– auswählen –</option>${activePeople.map(p=>`<option value="${p.id}">${esc(p.fields.Anzeigename||p.fields.Title)}</option>`).join('')}</select></div><button class="primary" onclick="startWaterskiRun()">Run starten</button>`}</div><div class="card"><div class="section first">Runs dieser Nutzung</div>${rs.map((r,i)=>{const rc=roles.filter(x=>String(x.fields.RunId)===String(r.id)&&x.fields.Aktiv!==false),lc=legs.filter(x=>String(x.fields.RunId)===String(r.id));return `<div class="entitybox"><b>Run ${i+1} · ${esc(pm[String(r.fields.SkilaeuferPersonId)]||'Läufer')}</b><div>${esc(r.fields.Disziplin1064||'')} · ${r.fields.LeinenlaengeM1064??'–'} m · ${r.fields.GeschwindigkeitKmh1064??'–'} km/h · ${r.fields.DrehzahlRPM1064??'–'} rpm</div><div class="muted">${esc(r.fields.Status||'')} · ${lc.length} Etappe(n)${r.fields.StartBreitengrad1064!=null?' · GPS Start gespeichert':''}${r.fields.EndeBreitengrad1064!=null?' · GPS Ende gespeichert':''}</div><div class="chips">${rc.map(x=>`<span>${esc(x.fields.Funktion)}: ${esc(pm[String(x.fields.PersonId)]||'')}</span>`).join('')}</div></div>`}).join('')||'<p class="muted">Noch keine Runs.</p>'}</div>`;
  if(!active){fp1064RefreshSetupChoices();fp1064RenderRunPreview()}
 }catch(e){failBox(e,'cockpit')}
};
startWaterskiRun=async function(){
 const runner=document.getElementById('wsRunner')?.value,driver=document.getElementById('wsDriver')?.value,observer=document.getElementById('wsObserver')?.value;if(!runner||!driver||!observer)return alert('Bitte Skiläufer, Fahrer und Beobachter auswählen.');if(new Set([runner,driver,observer]).size<3)return alert('Skiläufer, Fahrer und Beobachter müssen verschiedene Personen sein.');
 try{const api=await getCloud(),p=await fp104Position(),now=new Date().toISOString(),fields={NutzungId:String(S.waterskiUsageId),SkilaeuferPersonId:String(runner),Beginn:now,Status:'Aktiv',Testdaten:testFlag(),Aktiv:true,...fp1064RunFieldsFromUi()};if(p.lat!=null){fields.StartBreitengrad1064=p.lat;fields.StartLaengengrad1064=p.lon;fields.StartGenauigkeitM1064=p.accuracy}const x=await api.createItemByName('WasserskiRuns',fields);for(const [id,fn] of [[runner,'Skiläufer'],[driver,'Fahrer'],[observer,'Beobachter']])await api.createItemByName('WasserskiRunPersonen',{RunId:String(x.id),PersonId:String(id),Funktion:fn,Aktiv:true,Testdaten:testFlag()});const leg={RunId:String(x.id),NutzungId:String(S.waterskiUsageId),EtappeNr:1,Beginn:now,Status:'Aktiv',Testdaten:testFlag(),Aktiv:true};if(p.lat!=null){leg.StartBreitengrad1064=p.lat;leg.StartLaengengrad1064=p.lon;leg.StartGenauigkeitM1064=p.accuracy}await api.createItemByName('WasserskiRunEtappen',leg);if(fields.SetupId1064){const s=FP1064.wsSetups.find(v=>String(v.id)===String(fields.SetupId1064));if(s)await api.updateItemByName('WasserskiSetups1064',s.id,{Verwendungen:Number(s.fields.Verwendungen||0)+1,ZuletztVerwendet:now})}render()}catch(e){alert(e.message)}
};
addWaterskiLeg=async function(runId){try{const api=await getCloud(),p=await fp104Position(),now=new Date().toISOString(),legs=(await fp105SafeList(api,'WasserskiRunEtappen')).filter(x=>String(x.fields.RunId)===String(runId)),n=legs.length+1,active=legs.find(x=>x.fields.Status==='Aktiv');if(active){const f={Status:'Beendet',Ende:now};if(p.lat!=null){f.EndeBreitengrad1064=p.lat;f.EndeLaengengrad1064=p.lon;f.EndeGenauigkeitM1064=p.accuracy}await api.updateItemByName('WasserskiRunEtappen',active.id,f)}const nf={RunId:String(runId),NutzungId:String(S.waterskiUsageId),EtappeNr:n,Beginn:now,Status:'Aktiv',Testdaten:testFlag(),Aktiv:true};if(p.lat!=null){nf.StartBreitengrad1064=p.lat;nf.StartLaengengrad1064=p.lon;nf.StartGenauigkeitM1064=p.accuracy}await api.createItemByName('WasserskiRunEtappen',nf);render()}catch(e){alert(e.message)}};
endWaterskiRun=async function(runId){try{const api=await getCloud(),p=await fp104Position(),now=new Date().toISOString(),legs=(await fp105SafeList(api,'WasserskiRunEtappen')).filter(x=>String(x.fields.RunId)===String(runId)&&x.fields.Status==='Aktiv');for(const l of legs){const f={Status:'Beendet',Ende:now};if(p.lat!=null){f.EndeBreitengrad1064=p.lat;f.EndeLaengengrad1064=p.lon;f.EndeGenauigkeitM1064=p.accuracy}await api.updateItemByName('WasserskiRunEtappen',l.id,f)}const f={Status:'Beendet',Ende:now};if(p.lat!=null){f.EndeBreitengrad1064=p.lat;f.EndeLaengengrad1064=p.lon;f.EndeGenauigkeitM1064=p.accuracy}await api.updateItemByName('WasserskiRuns',runId,f);render()}catch(e){alert(e.message)}};
async function fp1064EditRunValues(runId){try{const api=await getCloud(),r=await api.getItemByName('WasserskiRuns',runId),f=r.fields||{},line=prompt('Leinenlänge m:',f.LeinenlaengeM1064??'');if(line===null)return;const gear=prompt('Ski / Board:',f.Sportgeraet1064||'');if(gear===null)return;const speed=prompt('Geschwindigkeit km/h:',f.GeschwindigkeitKmh1064??'');if(speed===null)return;const rpm=prompt('Drehzahl rpm:',f.DrehzahlRPM1064??'');if(rpm===null)return;await api.updateItemByName('WasserskiRuns',runId,{LeinenlaengeM1064:line===''?null:Number(line),Sportgeraet1064:gear.trim(),GeschwindigkeitKmh1064:speed===''?null:Number(speed),DrehzahlRPM1064:rpm===''?null:Number(rpm),SetupGespeichert1064:false});render()}catch(e){alert(e.message)}}
async function fp1064SaveRunSetup(runId,mode){
 try{const api=await getCloud(),r=await api.getItemByName('WasserskiRuns',runId),f=r.fields||{},fields={PersonId:String(f.SkilaeuferPersonId),Disziplin:f.Disziplin1064||'',LeinenlaengeM:f.LeinenlaengeM1064??null,Sportgeraet:f.Sportgeraet1064||'',GeschwindigkeitKmh:f.GeschwindigkeitKmh1064??null,DrehzahlRPM:f.DrehzahlRPM1064??null,ZuletztVerwendet:new Date().toISOString(),Aktiv:true,Testdaten:testFlag()};if(mode==='overwrite'&&f.SetupId1064){await api.updateItemByName('WasserskiSetups1064',String(f.SetupId1064),fields)}else if(mode==='add'){fields.Verwendungen=1;fields.Bezeichnung='';const x=await api.createItemByName('WasserskiSetups1064',fields);await api.updateItemByName('WasserskiRuns',runId,{SetupId1064:String(x.id)})}await api.updateItemByName('WasserskiRuns',runId,{SetupGespeichert1064:true});render()}catch(e){alert(e.message)}}

/* -------------------------------------------------------------------------- */
/* Ausfahrt: beim endgültigen Ende wird letzter tatsächlicher Aufenthaltsort Ziel */
/* -------------------------------------------------------------------------- */
const fp1064EndWholeUsageBase=endWholeUsage;
async function fp1064ConfirmBhAtUsageEnd(api){
 if(S.vehicle?.profile!=='motorboat'||!S.day?.id)return true;
 const d=await fp1064MotorData(api),now=new Date().toISOString();
 for(const e of d.engines){const c=fp1064MotorCalc(d,e.id,now),v=prompt(`Tatsächlicher BH-Stand · ${e.name}:`,c.theoretical!=null?Number(c.theoretical).toFixed(1):'');if(v===null)return false;const n=Number(v);if(!Number.isFinite(n)||n<0){alert('Bitte einen gültigen BH-Stand eingeben.');return false}await api.createItemByName('Messwerte',{FahrzeugId:String(S.vehicle.id),NutzungId:String(S.usage.cloudId),TagesetappeId:String(S.day.id),KomponenteId:String(e.id),Messgroesse:'Betriebsstunden',Wert:n,Einheit:'h',Phase:'Ende',GemessenAm:now,Quelle:'Manuell bestätigt bei Nutzungsende',Notiz:c.theoretical!=null&&Math.abs(n-c.theoretical)>=0.05?`Theoretisch ${Number(c.theoretical).toFixed(2)} h`:'' ,Testdaten:testFlag(),Aktiv:true})}
 return true
}
endWholeUsage=async function(id){
 let api,u,t;try{api=await getCloud();u=await api.getItemByName('Nutzungen',id);const types=await fp105SafeList(api,'Nutzungsarten');t=types.find(x=>String(x.id)===String(u.fields.NutzungsartId))}catch(e){return alert(e.message)}
 const isAus=fp1064Norm(t?.fields?.Name||'')==='ausfahrt',isWs=fp1064Norm(t?.fields?.Name||'').includes('wasserski');if(!isAus&&!isWs)return fp1064EndWholeUsageBase(id);
 if(!confirm('Gesamte Nutzung beenden? Der Datensatz bleibt für Nachträge und Korrekturen erreichbar.'))return;
 try{if(String(S.usage?.cloudId||'')===String(id)&&S.vehicle?.profile==='motorboat'){const ok=await fp1064ConfirmBhAtUsageEnd(api);if(!ok)return}let finalTarget='';if(isAus){const stays=(await fp105SafeList(api,'Aufenthalte')).filter(x=>String(x.fields.NutzungId)===String(id)&&x.fields.Aktiv!==false).sort((a,b)=>String(a.fields.Beginn||'').localeCompare(String(b.fields.Beginn||'')));finalTarget=stays[stays.length-1]?.fields?.Ort||''}const now=new Date().toISOString(),fields={Status:'Beendet',Ende:now,GeaendertAm:now};if(finalTarget)fields.TatsaechlichesZiel1064=finalTarget;await api.updateItemByName('Nutzungen',id,fields);if(String(S.usage?.cloudId||'')===String(id)){localStorage.removeItem('fp-current');S.stack=[];S.view='start'}render()}catch(e){alert('Nutzung konnte nicht beendet werden: '+e.message)}
};

/* -------------------------------------------------------------------------- */
/* Setup-/Versionsanzeige                                                      */
/* -------------------------------------------------------------------------- */
m365setup=function(){head('Microsoft 365 Setup','Schema 1.0.6.4 · Cockpit + Wasserski');const tok=window.FPAuth.token(),authButton=tok?`<button onclick="FPAuth.logout();render()">Microsoft-Verbindung trennen</button>`:`<button class="primary" onclick="sessionStorage.setItem('fp_after_auth','m365setup');FPAuth.login()">Mit Microsoft 365 anmelden</button>`;app.innerHTML=`<div class="card"><b>Microsoft-Anmeldung</b><div id="authState">${tok?'✓ Microsoft-Token vorhanden':'Noch nicht mit Microsoft verbunden'}</div>${authButton}</div><div class="card"><div class="field"><label>SharePoint-Site-URL</label><input id="spSite" value="${esc(localStorage.getItem('fp_sp_site')||'')}" placeholder="https://…sharepoint.com/sites/Fahrzeugplattform"></div><button class="primary" ${tok?'':'disabled'} onclick="runM365Provision1062()">Phase-1-Struktur prüfen / anlegen</button><p class="muted">Additiv. 1.0.6.4 ergänzt Tankmodell, Wasserski-Setups sowie Run-/GPS-Felder. Vorhandene Daten bleiben erhalten.</p></div><div id="m365Result"></div>`};
main=function(){S.stack=[];head('MOBIMORY','Phase 1 · '+FP1064_VERSION);app.innerHTML=`<div class="home-brand">${typeof mobiIcon==='function'?mobiIcon():''}${typeof brandHeadline==='function'?brandHeadline():''}</div><div class="grid"><button class="menu" onclick="go('start')"><b>Start</b><span class="muted">Nutzung, Cockpit, Planung & Historie</span></button><button class="menu" onclick="go('configuration')"><b>Konfiguration</b><span class="muted">Fahrzeuge, Personen, Tiere, Orte, Reisegrundlagen</span></button><button class="menu" onclick="go('workshop')"><b>Werkstatt</b><span class="muted">Störungen, Wartung, Arbeiten und Aufgaben</span></button><button class="menu" onclick="go('lending')"><b>Verleihmodus</b><span class="muted">Gruppen, Qualifikationen und Rechte</span></button><button class="menu" onclick="go('settings')"><b>Einstellungen / Daten</b><span class="muted">M365, Testmodus, Export</span></button></div>`};
