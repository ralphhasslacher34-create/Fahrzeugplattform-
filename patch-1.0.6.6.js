/* MOBIMORY / Fahrzeugplattform 1.0.6.6-dev
   Eng begrenzter Fix für Törn / Planung:
   1) Törn: zusätzliches 1.0.6.4-Startdatum entfernen (kein Doppel-Feld mehr).
   2) Aktive offene Ausfahrt blockiert zukünftige Planung nicht mehr hart:
      Planung darf unter Vorbehalt gespeichert werden; tatsächlicher Start bleibt hart geprüft.
   3) "+ neuen Ort anlegen" ergänzt die laufende Maske direkt und verliert keine Eingaben.
   Keine Cockpit-, Wasserski-, Motor-, BH- oder Tankänderungen.
*/

const FP1066_VERSION='1.0.6.6-dev';

function fp1066IsCompactMotorboatUsage(){
  return S.vehicle?.profile==='motorboat' &&
    ((typeof fp1064IsWaterski==='function'&&fp1064IsWaterski()) ||
     (typeof fp1064IsAusfahrt==='function'&&fp1064IsAusfahrt()));
}

/* -------------------------------------------------------------------------- */
/* 1) Törn: doppeltes Startdatum entfernen                                    */
/* -------------------------------------------------------------------------- */
const fp1066SetupBase=setupBase;
setupBase=async function(){
  const r=await fp1066SetupBase();
  if(S.vehicle?.profile==='motorboat'&&!fp1066IsCompactMotorboatUsage()){
    const extra=document.getElementById('fp1064StartDate');
    if(extra){const box=extra.closest('.field');if(box)box.remove();else extra.remove()}
  }
  return r;
};

/* -------------------------------------------------------------------------- */
/* 2) Offene Ausfahrt = weicher Planungskonflikt, kein harter Block            */
/* -------------------------------------------------------------------------- */
async function fp1066ClassifyConflicts(api,rows){
  if(!rows?.length)return {soft:[],hard:[]};
  const [usages,types]=await Promise.all([fp105SafeList(api,'Nutzungen'),fp105SafeList(api,'Nutzungsarten')]);
  const typeNames=Object.fromEntries(types.map(x=>[String(x.id),String(x.fields.Name||x.fields.Title||'')]));
  const soft=[],hard=[];
  for(const row of rows){
    if(row.type!=='Nutzung'){hard.push(row);continue}
    const u=usages.find(x=>String(x.id)===String(row.id));
    if(!u){hard.push(row);continue}
    const f=u.fields||{},usageName=typeNames[String(f.NutzungsartId)]||'',isOpenAusfahrt=
      String(f.Status||'')==='Aktiv' &&
      !(f.Ende||f.GeplantesEndeDatum) &&
      (typeof fp1064Norm==='function'?fp1064Norm(usageName):String(usageName).trim().toLowerCase())==='ausfahrt';
    (isOpenAusfahrt?soft:hard).push(row);
  }
  return {soft,hard};
}

function fp1066SoftConflictText(rows){
  if(!rows?.length)return'';
  return 'Aktuell läuft eine offene Ausfahrt. Die Planung kann unter Vorbehalt gespeichert werden. '+
    'Zum tatsächlichen Start muss die vorherige Nutzung beendet sein.';
}

fp1052RefreshUsageAvailability=async function(){
  const box=document.getElementById('fp1052UsageAvailability');if(!box||!S.vehicle?.id)return;
  box.className='muted';box.textContent='Fahrzeug-Verfügbarkeit wird geprüft …';
  try{
    const api=await getCloud(),r=fp1052RequestedUsageRange(),res=await fp1052AssertVehicleAvailable(S.vehicle.id,r.start,r.end,{api,excludeUsageId:S.usage?.cloudId||''}),c=await fp1066ClassifyConflicts(api,res.rows);
    if(c.hard.length){
      box.className='status-stop';
      box.innerHTML=`<b>Fahrzeug im gewählten Zeitraum bereits belegt</b><br>${c.hard.map(x=>esc(`${x.type} · ${x.status||''} · ${fp1052RangeText(x.start,x.end)}`)).join('<br>')}`;
      return;
    }
    if(c.soft.length){
      box.className='status-warn';
      box.innerHTML=`<b>Planung unter Vorbehalt möglich</b><br>${esc(fp1066SoftConflictText(c.soft))}`;
      return;
    }
    box.className='status-ok';box.textContent='✓ Fahrzeug im gewählten Zeitraum verfügbar';
  }catch(e){box.className='status-warn';box.textContent='Verfügbarkeit konnte nicht geprüft werden: '+e.message}
};

fp1063SaveNewPlan=async function(){
  if(!S.usage?.multi)return alert('Eine separate Planung ist für mehrtägige Nutzungen vorgesehen.');
  const pf=document.getElementById('planFrom')?.value,pt=document.getElementById('planTo')?.value;
  if(!pf||!pt)return alert('Geplanten Start und geplantes Ende eingeben.');
  if(!fp1063ValidPlanRange(pf,pt))return alert('Das geplante Ende darf nicht vor dem geplanten Start liegen.');
  try{
    const api=await getCloud(),range={start:fp1063LocalDayStart(pf),end:fp1063LocalDayEnd(pt)},availability=await fp1052AssertVehicleAvailable(S.vehicle.id,range.start,range.end,{api}),classified=await fp1066ClassifyConflicts(api,availability.rows);
    if(classified.hard.length)return alert('Dieses Fahrzeug ist im geplanten Zeitraum bereits belegt:\n\n'+fp1052ConflictMessage(classified.hard));
    const now=new Date().toISOString(),{f}=fp1063PlanFields({status:'Geplant',now}),u=await api.createItemByName('Nutzungen',f);
    await fp1062SaveStops(api,u.id);await fp1063SaveRelationsForNewUsage(api,u.id,'');
    alert(classified.soft.length?
      'Planung unter Vorbehalt gespeichert.\n\nZum tatsächlichen Start muss die aktuell offene Ausfahrt beendet sein.':
      'Planung gespeichert. Zählerstände werden erst beim tatsächlichen Start bestätigt.');
    S.usageDetailId=String(u.id);S.stack=[];S.view='usageDetail';render();
  }catch(e){alert('Planung konnte nicht gespeichert werden: '+e.message)}
};
fp1062SaveNewPlan=fp1063SaveNewPlan;

/* -------------------------------------------------------------------------- */
/* 3) Neuer Ort: bestehende Maske NICHT neu aufbauen                          */
/* -------------------------------------------------------------------------- */
quickAddPlace=async function(prefix){
  const n=prompt('Neuen Ort einmalig anlegen:');if(!n||!n.trim())return;
  try{
    const api=await getCloud(),all=await list(api,'Orte'),name=n.trim();
    let hit=all.find(x=>(x.fields.Name||x.fields.Title||'').trim().toLowerCase()===name.toLowerCase());
    if(!hit)hit=await api.createItemByName('Orte',{Title:name,Name:name,Verwendungen:0,Aktiv:true});
    const id=String(hit.id),label=hit.fields?.Name||hit.fields?.Title||name;
    /* Alle aktuell sichtbaren Ortsfelder ergänzen, ohne setup()/render(). */
    document.querySelectorAll('select[id$="Ort"]').forEach(sel=>{
      if(![...sel.options].some(o=>String(o.value)===id)){
        const opt=document.createElement('option');opt.value=id;opt.textContent=label;sel.appendChild(opt)
      }
    });
    const target=document.getElementById(prefix+'Ort');
    if(target){target.value=id;refreshSiteOptions(prefix)}
  }catch(e){alert(e.message)}
};

/* Nur sichtbare Versionsanzeige aktualisieren. */
main=function(){S.stack=[];head('MOBIMORY','Phase 1 · '+FP1066_VERSION);app.innerHTML=`<div class="home-brand">${typeof mobiIcon==='function'?mobiIcon():''}${typeof brandHeadline==='function'?brandHeadline():''}</div><div class="grid"><button class="menu" onclick="go('start')"><b>Start</b><span class="muted">Nutzung, Cockpit, Planung & Historie</span></button><button class="menu" onclick="go('configuration')"><b>Konfiguration</b><span class="muted">Fahrzeuge, Personen, Tiere, Orte, Reisegrundlagen</span></button><button class="menu" onclick="go('workshop')"><b>Werkstatt</b><span class="muted">Störungen, Wartung, Arbeiten und Aufgaben</span></button><button class="menu" onclick="go('lending')"><b>Verleihmodus</b><span class="muted">Gruppen, Qualifikationen und Rechte</span></button><button class="menu" onclick="go('settings')"><b>Einstellungen / Daten</b><span class="muted">M365, Testmodus, Export</span></button></div>`};
