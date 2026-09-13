/* MOBIMORY 1.0.6.15-dev – dynamische Begriffe je Nutzungsart
   UI-Grundsatz:
   - Bis zur Wahl der Nutzungsart bleibt "Nutzung" der neutrale Oberbegriff.
   - Danach spricht die Oberfläche mit der konkreten Nutzungsart: Törn, Ausfahrt,
     Wasserski, Reise, Spontanfahrt usw.
   - Sobald ein eigener Name vorhanden ist, ist dieser die Hauptüberschrift;
     Nutzungsart + Fahrzeug stehen als Einordnung darunter.
   - Datenmodell / SharePoint-Listen bleiben unverändert (intern weiterhin "Nutzung").
*/
const FP10615_VERSION='1.0.6.15-dev';
const FP10615={cache:{},pending:{},applying:false,timer:null};

function fp10615Esc(v){return typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fp10615Norm(v){return String(v??'').trim()}

function fp10615Term(raw){
  const label=fp10615Norm(raw)||'Nutzung',key=label.toLowerCase();
  const known={
    'törn':{label:'Törn',plural:'Törns',nameLabel:'Name des Törns',gen:'des Törns',dat:'diesem Törn',acc:'diesen Törn'},
    'ausfahrt':{label:'Ausfahrt',plural:'Ausfahrten',nameLabel:'Name der Ausfahrt',gen:'der Ausfahrt',dat:'dieser Ausfahrt',acc:'diese Ausfahrt'},
    'wasserski':{label:'Wasserski',plural:'Wasserski',nameLabel:'Bezeichnung',gen:'des Wasserskis',dat:'diesem Wasserski',acc:'Wasserski'},
    'reise':{label:'Reise',plural:'Reisen',nameLabel:'Name der Reise',gen:'der Reise',dat:'dieser Reise',acc:'diese Reise'},
    'spontanfahrt':{label:'Spontanfahrt',plural:'Spontanfahrten',nameLabel:'Name der Spontanfahrt',gen:'der Spontanfahrt',dat:'dieser Spontanfahrt',acc:'diese Spontanfahrt'},
    'tour':{label:'Tour',plural:'Touren',nameLabel:'Name der Tour',gen:'der Tour',dat:'dieser Tour',acc:'diese Tour'},
    'fahrt':{label:'Fahrt',plural:'Fahrten',nameLabel:'Name der Fahrt',gen:'der Fahrt',dat:'dieser Fahrt',acc:'diese Fahrt'}
  };
  return known[key]||{label,plural:label,nameLabel:'Name',gen:label,dat:label,acc:label};
}

function fp10615Replace(s,term){
  if(!s||!term||term.label==='Nutzung')return s;
  let x=String(s),L=term.label;
  const pairs=[
    [/Name der Nutzung \(optional\)/gi,`${term.nameLabel} (optional)`],
    [/Name der Nutzung/gi,term.nameLabel],
    [/Nutzungsname/gi,term.nameLabel],
    [/Aktive Nutzung fortsetzen/gi,`${L} fortsetzen`],
    [/Nutzung fortsetzen/gi,`${L} fortsetzen`],
    [/Nutzung starten/gi,`${L} starten`],
    [/Nutzung beenden/gi,`${L} beenden`],
    [/Nutzung bearbeiten/gi,`${L} bearbeiten`],
    [/Nutzungsdaten/gi,`${L}-Daten`],
    [/Nutzungsstart/gi,`${L}-Start`],
    [/Nutzungsende/gi,`${L}-Ende`],
    [/Nutzungsebene/gi,`${L}-Ebene`],
    [/der gesamten Reise\/Nutzung/gi,term.gen],
    [/Reise\/Nutzung/gi,L],
    [/dieser Nutzung/gi,term.dat],
    [/diese Nutzung/gi,term.acc],
    [/der Nutzung/gi,term.gen],
    [/Nutzungen/gi,term.plural],
    [/Nutzung/gi,L]
  ];
  for(const [re,r] of pairs)x=x.replace(re,r);
  return x;
}

function fp10615ShouldPersonalize(){
  const v=String(S?.view||'');
  if(['login','main','start','vehicle','usage','history','configuration','persons','areas','travelcheck','workshop','lending','settings','m365setup'].includes(v))return false;
  return !!(S?.usage?.name||S?.usageDetailId||S?.usage?.cloudId);
}

async function fp10615ResolveStored(id){
  id=fp10615Norm(id);if(!id)return null;
  if(FP10615.cache[id])return FP10615.cache[id];
  if(FP10615.pending[id])return FP10615.pending[id];
  FP10615.pending[id]=(async()=>{
    try{
      const api=await getCloud(),u=await api.getItemByName('Nutzungen',id),f=u.fields||{},[types,vehicles]=await Promise.all([fp105SafeList(api,'Nutzungsarten'),fp105SafeList(api,'Fahrzeuge')]),t=types.find(x=>String(x.id)===String(f.NutzungsartId)),v=vehicles.find(x=>String(x.id)===String(f.FahrzeugId)),typeName=t?.fields?.Name||t?.fields?.Title||S?.usage?.name||'Nutzung',vehicleName=v?.fields?.Fahrzeugname||v?.fields?.Title||S?.vehicle?.name||'Fahrzeug',name=fp10615Norm(f.Nutzungsname||f.Title||S?.usage?.displayName||typeName),ctx={id,name,typeName,vehicleName,term:fp10615Term(typeName)};FP10615.cache[id]=ctx;return ctx;
    }catch(e){console.warn('Begriffs-Kontext konnte nicht geladen werden',e);return null}
    finally{delete FP10615.pending[id]}
  })();
  return FP10615.pending[id];
}

async function fp10615Context(){
  const typeName=fp10615Norm(S?.usage?.name);
  if(typeName&&typeName!=='Nutzung'){
    const term=fp10615Term(typeName),name=fp10615Norm(S?.usage?.displayName),vehicleName=fp10615Norm(S?.vehicle?.name)||'Fahrzeug';
    if(name)return {name,typeName,vehicleName,term};
    const id=fp10615Norm(S?.usage?.cloudId||S?.usageDetailId);if(id){const stored=await fp10615ResolveStored(id);if(stored)return stored}
    return {name:'',typeName,vehicleName,term};
  }
  const id=fp10615Norm(S?.usageDetailId||S?.usage?.cloudId);return id?fp10615ResolveStored(id):null;
}

function fp10615TextNodes(root){
  if(!root)return[];const out=[],w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){const p=n.parentElement;if(!p||['SCRIPT','STYLE','TEXTAREA','OPTION'].includes(p.tagName))return NodeFilter.FILTER_REJECT;return /Nutzung|Reise\/Nutzung/i.test(n.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});let n;while(n=w.nextNode())out.push(n);return out
}
function fp10615ApplyText(root,term){for(const n of fp10615TextNodes(root)){const before=n.nodeValue,after=fp10615Replace(before,term);if(after!==before)n.nodeValue=after}}

function fp10615Header(ctx){
  if(!ctx?.term||ctx.term.label==='Nutzung')return;
  const view=String(S?.view||''),title=document.getElementById('title'),sub=document.getElementById('sub'),vehicle=ctx.vehicleName||S?.vehicle?.name||'Fahrzeug',entered=fp10615Norm(document.getElementById('usageName1062')?.value),display=entered||ctx.name||fp10615Norm(S?.usage?.displayName);
  if(!title||!sub)return;
  if(view==='setup'){
    title.textContent=display||`${ctx.term.label} planen`;
    sub.textContent=display?`${ctx.term.label} · ${vehicle} · Planung`:`${ctx.term.label} · ${vehicle}`;
    return;
  }
  if(view==='usageDetail'){
    title.textContent=display||ctx.term.label;sub.textContent=`${ctx.term.label} · ${vehicle}`;return;
  }
  if(view==='cockpit'){
    title.textContent=display||ctx.term.label;sub.textContent=`${ctx.term.label} · ${vehicle} · Cockpit`;return;
  }
  /* In Unteransichten bleibt die Funktionsüberschrift erhalten; der Kontext steht darunter. */
  if(display&&!sub.textContent.includes(display))sub.textContent=`${display} · ${ctx.term.label} · ${vehicle}`;
}

async function fp10615Decorate(){
  if(FP10615.applying||!fp10615ShouldPersonalize())return;FP10615.applying=true;
  try{
    const ctx=await fp10615Context();if(!ctx?.term||ctx.term.label==='Nutzung')return;
    fp10615ApplyText(document.getElementById('app'),ctx.term);fp10615Header(ctx);
    const input=document.getElementById('usageName1062');if(input&&!input.dataset.fp10615){input.dataset.fp10615='1';input.addEventListener('input',()=>{S.usage.displayName=fp10615Norm(input.value);fp10615Header({...ctx,name:fp10615Norm(input.value)})})}
    const edit=document.getElementById('upeName');if(edit){const lab=edit.closest('.field')?.querySelector('label');if(lab&&/Nutzung|Name/i.test(lab.textContent||'')&&lab.textContent!==ctx.term.nameLabel)lab.textContent=ctx.term.nameLabel}
  }finally{FP10615.applying=false}
}
function fp10615Schedule(){clearTimeout(FP10615.timer);FP10615.timer=setTimeout(()=>fp10615Decorate(),25)}

/* Head-Texte mit generischem Wort werden nach Auswahl ebenfalls dynamisch. */
const fp10615HeadBase=head;
head=function(t,s){
  const term=S?.usage?.name&&S.usage.name!=='Nutzung'?fp10615Term(S.usage.name):null;
  const r=fp10615HeadBase(term?fp10615Replace(t,term):t,term?fp10615Replace(s,term):s);fp10615Schedule();return r;
};

/* Die wichtigsten Arbeitsansichten unmittelbar nach ihrem asynchronen Rendern nachziehen. */
if(typeof setupBase==='function'){
  const fp10615SetupBase=setupBase;setupBase=async function(){const r=await fp10615SetupBase();await fp10615Decorate();return r};
}
if(typeof cockpit==='function'){
  const fp10615CockpitBase=cockpit;cockpit=async function(){const r=await fp10615CockpitBase();await fp10615Decorate();return r};
}
if(typeof usageDetail==='function'){
  const fp10615UsageDetailBase=usageDetail;usageDetail=async function(){const r=await fp10615UsageDetailBase();await fp10615Decorate();return r};
}
if(typeof editUsagePlan==='function'){
  const fp10615EditPlanBase=editUsagePlan;editUsagePlan=async function(...a){const r=await fp10615EditPlanBase(...a);await fp10615Decorate();return r};
}

/* Auch spät nachgeladene Karten/Wetterblöcke werden sprachlich nachgezogen. */
const fp10615Observer=new MutationObserver(()=>{if(!FP10615.applying)fp10615Schedule()});
try{fp10615Observer.observe(document.getElementById('app'),{childList:true,subtree:true,characterData:true})}catch{}

/* Version – keine Schemaänderung. */
const fp10615MainBase=main;
main=function(){fp10615MainBase();document.title=`Fahrzeugplattform ${FP10615_VERSION}`;const f=document.querySelector('footer');if(f)f.textContent=`Fahrzeugplattform · ${FP10615_VERSION} · © 2026 Entwicklungsstand`};
document.title=`Fahrzeugplattform ${FP10615_VERSION}`;const fp10615Foot=document.querySelector('footer');if(fp10615Foot)fp10615Foot.textContent=`Fahrzeugplattform · ${FP10615_VERSION} · © 2026 Entwicklungsstand`;
fp10615Schedule();
