/* MOBIMORY 1.1.0.0-dev – Stammdaten neu
   Fachliche Struktur:
   Fahrzeug 1.1–1.6, Komponenten 2.1–2.7.
   Kein destruktiver Umbau alter Listen; neue Struktur additiv.
*/
const FP1100_VERSION='1.1.0.0-dev';
const FP1100={tab:'vehicle',vehicleItem:null,vehicleData:null,components:[],editComponent:null,loading:false};
function fp1100Esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fp1100Text(v){return String(v??'').trim()}
function fp1100Num(v){const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null}
function fp1100Json(v,fallback){try{return v?JSON.parse(v):fallback}catch{return fallback}}
function fp1100Arr(v){return Array.isArray(v)?v:[]}
function fp1100Bool(v){return v===true||String(v).toLowerCase()==='true'}
function fp1100Today(){return new Date().toISOString().slice(0,10)}
function fp1100Profile(f){return String(f?.Profil||S?.vehicle?.profile||'').toLowerCase()}
function fp1100IsBoat(profile){return /boat|boot|segel|motorboat/.test(profile)}
function fp1100IsRoad(profile){return /motorhome|wohnmobil|car|pkw|road|motorrad|motorcycle/.test(profile)}
function fp1100Money(v){const n=fp1100Num(v);return n==null?'':n.toFixed(2)}

/* Schema additiv in die bestehende M365-Provisionierung hängen. */
const fp1100MergedSchemaBase=fp105MergedSchema;
fp105MergedSchema=async function(){
  const [prior,e]=await Promise.all([
    fp1100MergedSchemaBase(),
    fetch('phase1-sharepoint-schema-1.1.0.0.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Schema 1.1.0.0 fehlt im Repository.');return r.json()})
  ]);
  return fp105MergeSchemas(prior,e);
};

/* Setup-Text auf den aktuellen additiven Stand bringen. */
m365setup=function(){
  head('Microsoft 365 Setup','Schema 1.1.0.0 · Stammdaten neu · additiv');
  const tok=window.FPAuth.token(),authButton=tok?`<button onclick="FPAuth.logout();render()">Microsoft-Verbindung trennen</button>`:`<button class="primary" onclick="sessionStorage.setItem('fp_after_auth','m365setup');FPAuth.login()">Mit Microsoft 365 anmelden</button>`;
  app.innerHTML=`<div class="card"><b>Microsoft-Anmeldung</b><div id="authState">${tok?'✓ Microsoft-Token vorhanden':'Noch nicht mit Microsoft verbunden'}</div>${authButton}</div>
  <div class="card"><div class="field"><label>SharePoint-Site-URL</label><input id="spSite" value="${fp1100Esc(localStorage.getItem('fp_sp_site')||'')}" placeholder="https://…sharepoint.com/sites/Fahrzeugplattform"></div>
  <button class="primary" ${tok?'':'disabled'} onclick="runM365Provision1068()">Phase-1-Struktur prüfen / anlegen</button>
  <p class="muted">1.1.0.0 ergänzt die neue, fachlich gegliederte Fahrzeug-/Komponentenstruktur. Alte Eigenschaften und Alt-Komponenten werden nicht gelöscht oder automatisch migriert.</p></div><div id="m365Result"></div>`;
};

function fp1100Defaults(f){
  const p=fp1100Profile(f),boat=fp1100IsBoat(p),road=fp1100IsRoad(p);
  return {
    identity:{subtype:'',manufacturer:'',model:'',year:'',identifier:'',purchaseDate:'',purchasePrice:'',paymentMode:'included',installments:'',installmentRhythm:'year',currentValue:'',valuationDate:''},
    registrations:[],
    dimensions:{length:'',width:'',heightNormal:'',heightLow:'',heightHigh:'',lwl:'',draft:'',bridgeNormal:'',bridgeLow:'',displacementLight:'',displacementTravel:'',displacementMax:'',weightEmpty:'',weightGross:'',clearanceNormal:'',clearanceLow:'',clearanceHigh:'',approachFront:'',approachRear:'',axleLoads:'',trailerBraked:'',trailerUnbraked:'',drawbarLoad:'',trainGross:'',weightReference:''},
    performance:{unit:(f?.Geschwindigkeitseinheit1068|| (boat?'kn':'km/h')),vmin:'',vtravel:'',vmax:''},
    adminEntries:[],
    locations:[],
    meta:{boat,road,createdAt:new Date().toISOString()}
  };
}
function fp1100MergeData(base,data){
  data=data&&typeof data==='object'?data:{};
  return {...base,...data,identity:{...base.identity,...(data.identity||{})},dimensions:{...base.dimensions,...(data.dimensions||{})},performance:{...base.performance,...(data.performance||{})},registrations:fp1100Arr(data.registrations),adminEntries:fp1100Arr(data.adminEntries),locations:fp1100Arr(data.locations),meta:{...base.meta,...(data.meta||{})}};
}
async function fp1100Load(force=false){
  if(FP1100.loading)return;FP1100.loading=true;
  try{
    if(!S.configVehicleId)return;
    const api=await getCloud(),v=await api.getItemByName('Fahrzeuge',S.configVehicleId),f=v.fields||{};
    let d=fp1100MergeData(fp1100Defaults(f),fp1100Json(f.StammdatenJson1100,null));
    /* vorhandene V-Werte als Startwerte übernehmen */
    if(!d.performance.vmin&&f.VMinKmh1068!=null)d.performance.vmin=String(f.VMinKmh1068);
    if(!d.performance.vtravel&&f.VReiseKmh1068!=null)d.performance.vtravel=String(f.VReiseKmh1068);
    if(!d.performance.vmax&&f.VMaxKmh1068!=null)d.performance.vmax=String(f.VMaxKmh1068);
    d.performance.historyKmh=f.VReiseHistorieKmh1068??null;
    FP1100.vehicleItem=v;FP1100.vehicleData=d;
    if(force||!FP1100.components.length){FP1100.components=(await fp105SafeList(api,'Komponenten1100')).filter(x=>String(x.fields.FahrzeugId)===String(S.configVehicleId)&&x.fields.Aktiv!==false)}
  }finally{FP1100.loading=false}
}
function fp1100LegacyHide(){
  const own=document.getElementById('fp1100-master-card');
  [...app.querySelectorAll('.card')].forEach(c=>{
    if(c===own||c.closest('#fp1100-master-card'))return;
    const h=(c.querySelector('.section')?.textContent||c.querySelector('b')?.textContent||'').trim().toLowerCase();
    if(h==='eigenschaften'||h.startsWith('eigenschaften ')||h==='komponenten'||h.startsWith('komponenten ')||h.includes('geschwindigkeit / eta-grundlage'))c.style.display='none';
  });
}
function fp1100LabelValue(label,value){return `<div class="field"><label>${fp1100Esc(label)}</label>${value}</div>`}
function fp1100Input(id,label,value,type='text',extra=''){return fp1100LabelValue(label,`<input id="${id}" type="${type}" value="${fp1100Esc(value??'')}" ${extra}>`)}
function fp1100Select(id,label,value,opts){return fp1100LabelValue(label,`<select id="${id}">${opts.map(([v,t])=>`<option value="${fp1100Esc(v)}" ${String(v)===String(value)?'selected':''}>${fp1100Esc(t)}</option>`).join('')}</select>`)}
function fp1100Grid(parts){return `<div class="fp1100-grid">${parts.join('')}</div>`}
function fp1100Details(title,body,open=false){return `<details class="fp1100-detail" ${open?'open':''}><summary>${fp1100Esc(title)}</summary><div class="fp1100-detail-body">${body}</div></details>`}
function fp1100ProfileOptions(){return [['motorboat','Motorboot'],['sailboat','Segelboot'],['motorhome','Wohnmobil'],['car','PKW'],['motorcycle','Motorrad'],['other','Sonstiges']]}
function fp1100SubtypeOptions(profile,value){
  let opts=[['','–']];
  if(/motorboat|boot/.test(profile))opts=opts.concat([['displacement','Verdränger'],['semi-planing','Halbgleiter'],['planing','Gleiter']]);
  else if(/sail/.test(profile))opts=opts.concat([['sailing','Segelboot'],['motorsailer','Motorsegler']]);
  else if(/motorhome/.test(profile))opts=opts.concat([['campervan','Kastenwagen'],['semi-integrated','Teilintegriert'],['integrated','Integriert'],['alcove','Alkoven']]);
  else if(/car/.test(profile))opts=opts.concat([['passenger','PKW'],['oldtimer','Oldtimer'],['offroad','Geländewagen']]);
  return fp1100Select('fp1100Subtype','Unterart',value,opts);
}
function fp1100RegRows(rows){
  if(!rows.length)return '<p class="muted">Noch keine Registrierung hinterlegt.</p>';
  return rows.map((r,i)=>`<div class="fp1100-subrow" data-reg="${i}">${fp1100Grid([
    fp1100Input(`fp1100RegKind${i}`,'Art der Registrierung',r.kind||''),fp1100Input(`fp1100RegCountry${i}`,'Land / Flaggenstaat',r.country||''),fp1100Input(`fp1100RegNo${i}`,'Registriernummer / Kennzeichen',r.number||''),fp1100Input(`fp1100RegIssuer${i}`,'Behörde / Register / Aussteller',r.issuer||''),fp1100Input(`fp1100RegDate${i}`,'Ausstellungsdatum',r.date||'','date'),fp1100Input(`fp1100RegExpiry${i}`,'Formales Ablaufdatum',r.expiry||'','date'),fp1100Input(`fp1100RegRecognition${i}`,'Anerkennung relevant bis',r.recognitionUntil||'','date'),fp1100Select(`fp1100RegRenew${i}`,'Erneuerung',r.renew||'manual',[['manual','manuell'],['automatic','automatisch'],['none','keine / unbefristet'],['unknown','unbekannt']])
  ])}<button type="button" onclick="fp1100RemoveReg(${i})">Eintrag entfernen</button></div>`).join('');
}
function fp1100AdminRows(rows){
  if(!rows.length)return '<p class="muted">Noch keine administrativen Einträge.</p>';
  return rows.map((r,i)=>`<div class="fp1100-subrow">${fp1100Grid([
    fp1100Select(`fp1100AdmCat${i}`,'Kategorie',r.category||'insurance',[['insurance','Versicherung'],['tax','Steuer / Abgabe'],['permit','Sonderzulassung / Vignette / Berechtigung'],['document','Fahrzeugdokument / Nachweis']]),fp1100Input(`fp1100AdmName${i}`,'Bezeichnung',r.name||''),fp1100Input(`fp1100AdmArea${i}`,'Land / Gebiet / Geltung',r.area||''),fp1100Input(`fp1100AdmNo${i}`,'Nummer / Police / Kennzeichen',r.number||''),fp1100Input(`fp1100AdmFrom${i}`,'Gültig ab',r.from||'','date'),fp1100Input(`fp1100AdmTo${i}`,'Gültig bis',r.to||'','date'),fp1100Input(`fp1100AdmCost${i}`,'Kosten €',r.cost||'','number','step="0.01"'),fp1100Select(`fp1100AdmRhythm${i}`,'Rhythmus',r.rhythm||'once',[['once','einmalig'],['monthly','monatlich'],['yearly','jährlich'],['2year','alle 2 Jahre'],['other','anderer']]),fp1100Select(`fp1100AdmAuto${i}`,'Erneuerung / Zahlung',r.automatic?'automatic':'manual',[['manual','manuell / Handlungsbedarf'],['automatic','automatisch']]),fp1100Input(`fp1100AdmNote${i}`,'Bemerkung',r.note||'')
  ])}<button type="button" onclick="fp1100RemoveAdmin(${i})">Eintrag entfernen</button></div>`).join('');
}
function fp1100LocationRows(rows){
  if(!rows.length)return '<p class="muted">Noch kein fester Standort.</p>';
  return rows.map((r,i)=>`<div class="fp1100-subrow">${fp1100Grid([
    fp1100Select(`fp1100LocType${i}`,'Typ',r.type||'parking',[['berth','Liegeplatz / Heimathafen'],['parking','Stellplatz'],['garage','Garage'],['hall','Halle'],['winter','Winterlager'],['other','Sonstiges']]),fp1100Input(`fp1100LocName${i}`,'Bezeichnung',r.name||''),fp1100Input(`fp1100LocAddress${i}`,'Adresse / Ort',r.address||''),fp1100Input(`fp1100LocPos${i}`,'GPS / Position',r.position||''),fp1100Input(`fp1100LocFrom${i}`,'Von',r.from||'','date'),fp1100Input(`fp1100LocTo${i}`,'Bis',r.to||'','date'),fp1100Input(`fp1100LocCost${i}`,'Kosten €',r.cost||'','number','step="0.01"'),fp1100Select(`fp1100LocRhythm${i}`,'Kostenrhythmus',r.rhythm||'yearly',[['once','einmalig'],['monthly','monatlich'],['yearly','jährlich'],['season','Saison'],['other','anderer']]),fp1100Select(`fp1100LocMain${i}`,'Standort',r.main?'1':'0',[['0','zusätzlicher Standort'],['1','Hauptstandort']])
  ])}<button type="button" onclick="fp1100RemoveLocation(${i})">Eintrag entfernen</button></div>`).join('');
}
function fp1100HullSpeedKmH(lwlM){const m=fp1100Num(lwlM);return m&&m>0?4.496*Math.sqrt(m):null}
function fp1100HullBlock(d){const hs=fp1100HullSpeedKmH(d.dimensions.lwl),unit=d.performance.unit||'km/h';if(hs==null)return '<div id="fp1100Hull" class="muted">Rumpfgeschwindigkeit: wird aus LWL berechnet.</div>';const val=unit==='kn'?hs/1.852:hs;return `<div id="fp1100Hull"><b>Rumpfgeschwindigkeit berechnet:</b> ${val.toFixed(1)} ${unit}<div class="muted">Nur bei geeigneter Rumpfform als praktische Vergleichsgröße verwenden.</div></div>`}
function fp1100VehicleHtml(){
  const v=FP1100.vehicleItem?.fields||{},d=FP1100.vehicleData||fp1100Defaults(v),p=fp1100Profile(v),boat=fp1100IsBoat(p),road=fp1100IsRoad(p);
  const identity=fp1100Grid([
    fp1100Input('fp1100VehicleName','Fahrzeugname',v.Fahrzeugname||v.Title||S.vehicle?.name||''),fp1100Select('fp1100Profile','Fahrzeugart',v.Profil||p,fp1100ProfileOptions()),fp1100SubtypeOptions(p,d.identity.subtype),fp1100Input('fp1100Manufacturer','Hersteller',d.identity.manufacturer),fp1100Input('fp1100Model','Modell / Typ',d.identity.model),fp1100Input('fp1100Year','Baujahr / Modelljahr',d.identity.year),fp1100Input('fp1100Identifier',boat?'HIN / Rumpfnummer / Identifikation':'FIN / VIN / Identifikation',d.identity.identifier),fp1100Input('fp1100PurchaseDate','Kaufdatum',d.identity.purchaseDate,'date'),fp1100Input('fp1100PurchasePrice','Anschaffungspreis €',d.identity.purchasePrice,'number','step="0.01"'),fp1100Select('fp1100PaymentMode','Zahlungsmodell',d.identity.paymentMode||'once',[['once','einmalig'],['installments','Raten'],['included','bereits vorhanden / nicht separat'],['unknown','unbekannt']]),fp1100Input('fp1100Installments','Anzahl Raten',d.identity.installments,'number'),fp1100Select('fp1100InstallmentRhythm','Ratenrhythmus',d.identity.installmentRhythm||'year',[['month','monatlich'],['quarter','vierteljährlich'],['year','jährlich']]),fp1100Input('fp1100CurrentValue','Aktueller / Gutachtenwert €',d.identity.currentValue,'number','step="0.01"'),fp1100Input('fp1100ValuationDate','Bewertungs-/Gutachtendatum',d.identity.valuationDate,'date')
  ]);
  let dims=[fp1100Input('fp1100Length','Länge m',d.dimensions.length,'number','step="0.01"'),fp1100Input('fp1100Width','Breite m',d.dimensions.width,'number','step="0.01"'),fp1100Input('fp1100HeightNormal','Höhe normal m',d.dimensions.heightNormal,'number','step="0.01"'),fp1100Input('fp1100HeightLow','Höhe reduziert / abgesenkt m',d.dimensions.heightLow,'number','step="0.01"'),fp1100Input('fp1100HeightHigh','Höhe angehoben m',d.dimensions.heightHigh,'number','step="0.01"')];
  if(boat)dims=dims.concat([fp1100Input('fp1100Lwl','Länge Wasserlinie (LWL) m',d.dimensions.lwl,'number','step="0.01" oninput="fp1100UpdateHull()"'),fp1100Input('fp1100Draft','Tiefgang m',d.dimensions.draft,'number','step="0.01"'),fp1100Input('fp1100BridgeNormal','Durchfahrtshöhe normal m',d.dimensions.bridgeNormal,'number','step="0.01"'),fp1100Input('fp1100BridgeLow','Durchfahrtshöhe reduziert m',d.dimensions.bridgeLow,'number','step="0.01"'),fp1100Input('fp1100DispLight','Verdrängung leicht / leer',d.dimensions.displacementLight),fp1100Input('fp1100DispTravel','Verdrängung Reisezustand',d.dimensions.displacementTravel),fp1100Input('fp1100DispMax','Max. zulässige Verdrängung / Beladung',d.dimensions.displacementMax)]);
  if(road)dims=dims.concat([fp1100Input('fp1100WeightEmpty','Leergewicht kg',d.dimensions.weightEmpty,'number'),fp1100Input('fp1100WeightGross','Zulässiges Gesamtgewicht kg',d.dimensions.weightGross,'number'),fp1100Input('fp1100ClearanceNormal','Bodenfreiheit normal mm',d.dimensions.clearanceNormal,'number'),fp1100Input('fp1100ClearanceLow','Bodenfreiheit abgesenkt mm',d.dimensions.clearanceLow,'number'),fp1100Input('fp1100ClearanceHigh','Bodenfreiheit angehoben mm',d.dimensions.clearanceHigh,'number'),fp1100Input('fp1100ApproachFront','Böschungswinkel vorne °',d.dimensions.approachFront,'number','step="0.1"'),fp1100Input('fp1100ApproachRear','Böschungswinkel hinten °',d.dimensions.approachRear,'number','step="0.1"'),fp1100Input('fp1100AxleLoads','Zulässige Achslasten',d.dimensions.axleLoads),fp1100Input('fp1100TrailerBraked','Anhängelast gebremst kg',d.dimensions.trailerBraked,'number'),fp1100Input('fp1100TrailerUnbraked','Anhängelast ungebremst kg',d.dimensions.trailerUnbraked,'number'),fp1100Input('fp1100DrawbarLoad','Stützlast kg',d.dimensions.drawbarLoad,'number'),fp1100Input('fp1100TrainGross','Zulässiges Zuggesamtgewicht kg',d.dimensions.trainGross,'number')]);
  dims.push(fp1100Input('fp1100WeightRef','Bezugszustand Gewicht / Verdrängung',d.dimensions.weightReference));
  const perf=fp1100Grid([fp1100Select('fp1100SpeedUnit','Einheit',d.performance.unit||'km/h',[['km/h','km/h'],['kn','kn']]),fp1100Input('fp1100VMin','V min',d.performance.vmin,'number','step="0.1"'),fp1100Input('fp1100VTravel','V Reise',d.performance.vtravel,'number','step="0.1"'),fp1100Input('fp1100VMax','V max',d.performance.vmax,'number','step="0.1"')]);
  const hist=d.performance.historyKmh!=null?`${(d.performance.unit==='kn'?Number(d.performance.historyKmh)/1.852:Number(d.performance.historyKmh)).toFixed(1)} ${d.performance.unit}`:'noch keine ausreichende Historie';
  return `${fp1100Details('1.1 Identität',identity,true)}
    ${fp1100Details('1.2 Zulassung / Registrierung',`${fp1100RegRows(d.registrations)}<button type="button" onclick="fp1100AddReg()">+ Registrierung hinzufügen</button>`)}
    ${fp1100Details('1.3 Abmessungen / Gewichte',`${fp1100Grid(dims)}${boat?fp1100HullBlock(d):''}`)}
    ${fp1100Details('1.4 Fahr- und Leistungsdaten',`${perf}<div class="muted">V Reise Historie: <b>${hist}</b>. Dieser Erfahrungswert überschreibt V Reise nicht automatisch.</div>`)}
    ${fp1100Details('1.5 Rechtliche / administrative Daten',`${fp1100AdminRows(d.adminEntries)}<button type="button" onclick="fp1100AddAdmin()">+ Versicherung / Steuer / Vignette / Dokument</button>`)}
    ${fp1100Details('1.6 Feste Standorte',`${fp1100LocationRows(d.locations)}<button type="button" onclick="fp1100AddLocation()">+ Standort hinzufügen</button>`)}
    <div class="fp1100-actions"><button class="primary" type="button" onclick="fp1100SaveVehicle()">Fahrzeug-Stammdaten speichern</button></div>`;
}
function fp1100CaptureVehicle(){
  const d=FP1100.vehicleData||fp1100Defaults(FP1100.vehicleItem?.fields||{}),g=id=>document.getElementById(id)?.value??'';
  d.identity={...d.identity,subtype:g('fp1100Subtype'),manufacturer:g('fp1100Manufacturer'),model:g('fp1100Model'),year:g('fp1100Year'),identifier:g('fp1100Identifier'),purchaseDate:g('fp1100PurchaseDate'),purchasePrice:g('fp1100PurchasePrice'),paymentMode:g('fp1100PaymentMode'),installments:g('fp1100Installments'),installmentRhythm:g('fp1100InstallmentRhythm'),currentValue:g('fp1100CurrentValue'),valuationDate:g('fp1100ValuationDate')};
  const dm=d.dimensions;['Length','Width','HeightNormal','HeightLow','HeightHigh','Lwl','Draft','BridgeNormal','BridgeLow','DispLight','DispTravel','DispMax','WeightEmpty','WeightGross','ClearanceNormal','ClearanceLow','ClearanceHigh','ApproachFront','ApproachRear','AxleLoads','TrailerBraked','TrailerUnbraked','DrawbarLoad','TrainGross','WeightRef'].forEach(k=>{const map={Length:'length',Width:'width',HeightNormal:'heightNormal',HeightLow:'heightLow',HeightHigh:'heightHigh',Lwl:'lwl',Draft:'draft',BridgeNormal:'bridgeNormal',BridgeLow:'bridgeLow',DispLight:'displacementLight',DispTravel:'displacementTravel',DispMax:'displacementMax',WeightEmpty:'weightEmpty',WeightGross:'weightGross',ClearanceNormal:'clearanceNormal',ClearanceLow:'clearanceLow',ClearanceHigh:'clearanceHigh',ApproachFront:'approachFront',ApproachRear:'approachRear',AxleLoads:'axleLoads',TrailerBraked:'trailerBraked',TrailerUnbraked:'trailerUnbraked',DrawbarLoad:'drawbarLoad',TrainGross:'trainGross',WeightRef:'weightReference'};if(document.getElementById('fp1100'+k))dm[map[k]]=g('fp1100'+k)});
  d.performance={...d.performance,unit:g('fp1100SpeedUnit')||'km/h',vmin:g('fp1100VMin'),vtravel:g('fp1100VTravel'),vmax:g('fp1100VMax')};
  d.registrations=d.registrations.map((r,i)=>({...r,kind:g('fp1100RegKind'+i),country:g('fp1100RegCountry'+i),number:g('fp1100RegNo'+i),issuer:g('fp1100RegIssuer'+i),date:g('fp1100RegDate'+i),expiry:g('fp1100RegExpiry'+i),recognitionUntil:g('fp1100RegRecognition'+i),renew:g('fp1100RegRenew'+i)}));
  d.adminEntries=d.adminEntries.map((r,i)=>({...r,category:g('fp1100AdmCat'+i),name:g('fp1100AdmName'+i),area:g('fp1100AdmArea'+i),number:g('fp1100AdmNo'+i),from:g('fp1100AdmFrom'+i),to:g('fp1100AdmTo'+i),cost:g('fp1100AdmCost'+i),rhythm:g('fp1100AdmRhythm'+i),automatic:g('fp1100AdmAuto'+i)==='automatic',note:g('fp1100AdmNote'+i)}));
  d.locations=d.locations.map((r,i)=>({...r,type:g('fp1100LocType'+i),name:g('fp1100LocName'+i),address:g('fp1100LocAddress'+i),position:g('fp1100LocPos'+i),from:g('fp1100LocFrom'+i),to:g('fp1100LocTo'+i),cost:g('fp1100LocCost'+i),rhythm:g('fp1100LocRhythm'+i),main:g('fp1100LocMain'+i)==='1'}));
  FP1100.vehicleData=d;return d;
}
function fp1100UpdateHull(){const el=document.getElementById('fp1100Hull');if(!el)return;const d=fp1100CaptureVehicle(),hs=fp1100HullSpeedKmH(d.dimensions.lwl),u=d.performance.unit||'km/h';el.innerHTML=hs==null?'Rumpfgeschwindigkeit: wird aus LWL berechnet.':`<b>Rumpfgeschwindigkeit berechnet:</b> ${(u==='kn'?hs/1.852:hs).toFixed(1)} ${u}<div class="muted">Nur bei geeigneter Rumpfform als praktische Vergleichsgröße verwenden.</div>`}
function fp1100AddReg(){fp1100CaptureVehicle();FP1100.vehicleData.registrations.push({kind:'',country:'',number:'',issuer:'',date:'',expiry:'',recognitionUntil:'',renew:'manual'});fp1100RenderCard()}
function fp1100RemoveReg(i){fp1100CaptureVehicle();FP1100.vehicleData.registrations.splice(i,1);fp1100RenderCard()}
function fp1100AddAdmin(){fp1100CaptureVehicle();FP1100.vehicleData.adminEntries.push({category:'insurance',name:'',area:'',number:'',from:'',to:'',cost:'',rhythm:'once',automatic:false,note:''});fp1100RenderCard()}
function fp1100RemoveAdmin(i){fp1100CaptureVehicle();FP1100.vehicleData.adminEntries.splice(i,1);fp1100RenderCard()}
function fp1100AddLocation(){fp1100CaptureVehicle();FP1100.vehicleData.locations.push({type:'parking',name:'',address:'',position:'',from:'',to:'',cost:'',rhythm:'yearly',main:FP1100.vehicleData.locations.length===0});fp1100RenderCard()}
function fp1100RemoveLocation(i){fp1100CaptureVehicle();FP1100.vehicleData.locations.splice(i,1);fp1100RenderCard()}
async function fp1100SaveVehicle(){
  try{
    const d=fp1100CaptureVehicle(),api=await getCloud(),unit=d.performance.unit||'km/h',toKmh=x=>{const n=fp1100Num(x);return n==null?null:(unit==='kn'?n*1.852:n)},fields={StammdatenJson1100:JSON.stringify(d),StammdatenStand1100:new Date().toISOString(),Fahrzeugname:fp1100Text(document.getElementById('fp1100VehicleName')?.value),Profil:document.getElementById('fp1100Profile')?.value||FP1100.vehicleItem?.fields?.Profil||'',Geschwindigkeitseinheit1068:unit,VMinKmh1068:toKmh(d.performance.vmin),VReiseKmh1068:toKmh(d.performance.vtravel),VMaxKmh1068:toKmh(d.performance.vmax)};
    const a=fields.VMinKmh1068,b=fields.VReiseKmh1068,c=fields.VMaxKmh1068;if(a!=null&&b!=null&&b<a)return alert('V Reise darf nicht unter V min liegen.');if(c!=null&&b!=null&&b>c)return alert('V Reise darf nicht über V max liegen.');
    await api.updateItemByName('Fahrzeuge',S.configVehicleId,fields);if(typeof FP1068==='object')FP1068.routeCache={};await fp1100Load(true);await vehicleconfigure();
  }catch(e){alert('Fahrzeug-Stammdaten konnten nicht gespeichert werden: '+e.message)}
}

function fp1100CompParse(item){const f=item?.fields||{};return {id:String(item?.id||''),type:f.Komponententyp||'',name:f.Bezeichnung||'',position:f.Position||'',manufacturer:f.Hersteller||'',model:f.Modell||'',modelType:f.Typ||'',serial:f.Seriennummer||'',parentId:f.ElternKomponenteId||'',tech:fp1100Json(f.TechnischeMerkmaleJson,[]),connections:fp1100Json(f.VerbindungenJson,[]),life:fp1100Json(f.LebenszyklusJson,{}),maintenance:fp1100Json(f.WartungJson,[]),cost:fp1100Json(f.KostenJson,{}),docs:fp1100Json(f.DokumenteJson,[]),status:f.Status||'aktiv'} }
function fp1100NewComp(){return {id:'',type:'',name:'',position:'',manufacturer:'',model:'',modelType:'',serial:'',parentId:'',tech:[],connections:[],life:{purchaseDate:'',installDate:'',commissionDate:'',removalDate:'',status:'aktiv',replacedBy:'',note:'',guaranteeUntil:'',warrantyUntil:''},maintenance:[],cost:{mode:'included',purchasePrice:'',paymentMode:'once',installments:'',rhythm:'year',currentValue:'',valuationDate:''},docs:[],status:'aktiv'} }
function fp1100CompTitle(c){return [c.type,c.name,c.position].map(fp1100Text).filter(Boolean).join(' · ')||'Neue Komponente'}
function fp1100CompOptions(exclude){return [['','–']].concat(FP1100.components.filter(x=>String(x.id)!==String(exclude)).map(x=>{const c=fp1100CompParse(x);return [String(x.id),fp1100CompTitle(c)]}))}
function fp1100TechRows(rows){if(!rows.length)return '<p class="muted">Keine technischen Merkmale. Nur das erfassen, was für diese Komponente sinnvoll ist.</p>';return rows.map((r,i)=>`<div class="fp1100-triple"><input id="fp1100TechName${i}" placeholder="Merkmal, z. B. Leistung" value="${fp1100Esc(r.name||'')}"><input id="fp1100TechValue${i}" placeholder="Wert" value="${fp1100Esc(r.value||'')}"><input id="fp1100TechUnit${i}" placeholder="Einheit" value="${fp1100Esc(r.unit||'')}"><button type="button" onclick="fp1100RemoveTech(${i})">×</button></div>`).join('')}
function fp1100ConnRows(rows,c){if(!rows.length)return '<p class="muted">Keine Verbindungen / Zuordnungen.</p>';return rows.map((r,i)=>`<div class="fp1100-subrow">${fp1100Grid([fp1100Select(`fp1100ConnTarget${i}`,'Zielkomponente',r.targetId||'',fp1100CompOptions(c.id)),fp1100Input(`fp1100ConnType${i}`,'Beziehung',r.type||''),fp1100Select(`fp1100ConnPossible${i}`,'Technisch möglich',r.possible===false?'0':'1',[['1','ja'],['0','nein']]),fp1100Select(`fp1100ConnActive${i}`,'Aktuell aktiv',r.active?'1':'0',[['0','nein'],['1','ja']])])}<button type="button" onclick="fp1100RemoveConn(${i})">Verbindung entfernen</button></div>`).join('')}
function fp1100MaintRows(rows){if(!rows.length)return '<p class="muted">Noch keine Wartungs-/Prüfregel.</p>';return rows.map((r,i)=>`<div class="fp1100-subrow">${fp1100Grid([fp1100Input(`fp1100MaintName${i}`,'Maßnahme / Prüfung',r.name||''),fp1100Input(`fp1100MaintInt${i}`,'Intervall',r.interval||'','number'),fp1100Select(`fp1100MaintUnit${i}`,'Intervall-Einheit',r.unit||'month',[['month','Monate'],['year','Jahre'],['hours','Betriebsstunden'],['km','km'],['sm','sm']]),fp1100Input(`fp1100MaintLast${i}`,'Letzte Durchführung',r.last||'','date'),fp1100Input(`fp1100MaintNext${i}`,'Nächste Fälligkeit',r.next||'','date'),fp1100Input(`fp1100MaintCost${i}`,'Erwartete Kosten €',r.expectedCost||'','number','step="0.01"'),fp1100Select(`fp1100MaintMandatory${i}`,'Art',r.mandatory?'mandatory':'voluntary',[['voluntary','freiwillig / technisch'],['mandatory','vorgeschrieben / prüfpflichtig']])])}<button type="button" onclick="fp1100RemoveMaint(${i})">Regel entfernen</button></div>`).join('')}
function fp1100DocRows(rows){if(!rows.length)return '<p class="muted">Keine Dokument-Metadaten hinterlegt.</p>';return rows.map((r,i)=>`<div class="fp1100-subrow">${fp1100Grid([fp1100Input(`fp1100DocType${i}`,'Dokumentart',r.type||''),fp1100Input(`fp1100DocName${i}`,'Bezeichnung',r.name||''),fp1100Input(`fp1100DocIssuer${i}`,'Aussteller',r.issuer||''),fp1100Input(`fp1100DocDate${i}`,'Datum',r.date||'','date'),fp1100Input(`fp1100DocValid${i}`,'Gültig bis',r.validUntil||'','date'),fp1100Input(`fp1100DocRef${i}`,'Datei / Referenz',r.ref||''),fp1100Input(`fp1100DocNote${i}`,'Bemerkung',r.note||'')])}<button type="button" onclick="fp1100RemoveDoc(${i})">Dokument entfernen</button></div>`).join('')}
function fp1100ComponentEditor(c){
  const life=c.life||{},cost=c.cost||{};
  return `<div class="fp1100-editor"><div class="section first">${fp1100Esc(c.id?'Komponente bearbeiten':'Neue Komponente')}</div>
  ${fp1100Details('2.1 Identität',fp1100Grid([fp1100Input('fp1100CType','Komponententyp',c.type),fp1100Input('fp1100CName','Bezeichnung',c.name),fp1100Input('fp1100CPosition','Einbauort / Position',c.position),fp1100Input('fp1100CManufacturer','Hersteller',c.manufacturer),fp1100Input('fp1100CModel','Modell',c.model),fp1100Input('fp1100CModelType','Typ',c.modelType),fp1100Input('fp1100CSerial','Seriennummer / Identifikation',c.serial),fp1100Select('fp1100CParent','Übergeordnete Baugruppe',c.parentId||'',fp1100CompOptions(c.id))]),true)}
  ${fp1100Details('2.2 Technische Merkmale',`${fp1100TechRows(c.tech||[])}<button type="button" onclick="fp1100AddTech()">+ Merkmal hinzufügen</button>`)}
  ${fp1100Details('2.3 Verbindungen / Zuordnungen',`${fp1100ConnRows(c.connections||[],c)}<button type="button" onclick="fp1100AddConn()">+ Verbindung hinzufügen</button>`)}
  ${fp1100Details('2.4 Lebenszyklus / Status',fp1100Grid([fp1100Input('fp1100CLifePurchase','Kaufdatum',life.purchaseDate||'','date'),fp1100Input('fp1100CLifeInstall','Einbaudatum',life.installDate||'','date'),fp1100Input('fp1100CLifeCommission','Inbetriebnahme',life.commissionDate||'','date'),fp1100Select('fp1100CLifeStatus','Status',life.status||c.status||'aktiv',[['aktiv','aktiv'],['ausser_betrieb','außer Betrieb'],['ausgebaut','ausgebaut'],['ersetzt','ersetzt'],['verkauft','verkauft'],['verschrottet','verschrottet']]),fp1100Input('fp1100CLifeRemoval','Ausbaudatum',life.removalDate||'','date'),fp1100Input('fp1100CLifeReplaced','Ersetzt durch / Hinweis',life.replacedBy||''),fp1100Input('fp1100CGuarantee','Garantie bis',life.guaranteeUntil||'','date'),fp1100Input('fp1100CWarranty','Gewährleistung bis',life.warrantyUntil||'','date'),fp1100Input('fp1100CLifeNote','Bemerkung',life.note||'')]))}
  ${fp1100Details('2.5 Wartung / Prüfung / Fristen',`${fp1100MaintRows(c.maintenance||[])}<button type="button" onclick="fp1100AddMaint()">+ Wartungs-/Prüfregel hinzufügen</button>`)}
  ${fp1100Details('2.6 Kosten / Wert',fp1100Grid([fp1100Select('fp1100CCostMode','Kostenbezug',cost.mode||'included',[['included','im Fahrzeug enthalten / kein separater Preis'],['separate','separat angeschafft'],['selfbuilt','Eigenbau'],['existing','übernommen / bereits vorhanden'],['unknown','Preis unbekannt']]),fp1100Input('fp1100CPurchasePrice','Kauf-/Materialpreis €',cost.purchasePrice||'','number','step="0.01"'),fp1100Select('fp1100CPaymentMode','Zahlungsmodell',cost.paymentMode||'once',[['once','einmalig'],['installments','Raten']]),fp1100Input('fp1100CInstallments','Anzahl Raten',cost.installments||'','number'),fp1100Select('fp1100CRhythm','Ratenrhythmus',cost.rhythm||'year',[['month','monatlich'],['quarter','vierteljährlich'],['year','jährlich']]),fp1100Input('fp1100CCurrentValue','Aktueller / Gutachtenwert €',cost.currentValue||'','number','step="0.01"'),fp1100Input('fp1100CValuationDate','Bewertungsdatum',cost.valuationDate||'','date')]))}
  ${fp1100Details('2.7 Dokumente / Nachweise',`${fp1100DocRows(c.docs||[])}<button type="button" onclick="fp1100AddDoc()">+ Dokument-Metadaten hinzufügen</button><p class="muted">Dateiablage selbst bleibt im bestehenden Dokumentbereich; hier wird die fachliche Zuordnung zur Komponente geführt.</p>`)}
  <div class="fp1100-actions"><button class="primary" type="button" onclick="fp1100SaveComponent()">Komponente speichern</button><button type="button" onclick="fp1100CancelComponent()">Schließen</button></div></div>`;
}
function fp1100ComponentList(){
  const items=FP1100.components.map(x=>fp1100CompParse(x));
  return `<div class="fp1100-actions"><button class="primary" type="button" onclick="fp1100NewComponent()">+ Komponente anlegen</button></div>${items.length?items.map(c=>`<button class="fp1100-comp-card" type="button" onclick="fp1100EditComponent('${fp1100Esc(c.id)}')"><b>${fp1100Esc(fp1100CompTitle(c))}</b><span>${fp1100Esc(c.manufacturer||'')}${c.model?' · '+fp1100Esc(c.model):''}</span><small>${fp1100Esc(c.life?.status||c.status||'aktiv')}</small></button>`).join(''):'<div class="card"><span class="muted">Noch keine Komponenten in der neuen Struktur.</span></div>'}`;
}
function fp1100CaptureComponent(){
  const c=FP1100.editComponent||fp1100NewComp(),g=id=>document.getElementById(id)?.value??'';
  c.type=g('fp1100CType');c.name=g('fp1100CName');c.position=g('fp1100CPosition');c.manufacturer=g('fp1100CManufacturer');c.model=g('fp1100CModel');c.modelType=g('fp1100CModelType');c.serial=g('fp1100CSerial');c.parentId=g('fp1100CParent');
  c.tech=fp1100Arr(c.tech).map((r,i)=>({...r,name:g('fp1100TechName'+i),value:g('fp1100TechValue'+i),unit:g('fp1100TechUnit'+i)}));
  c.connections=fp1100Arr(c.connections).map((r,i)=>({...r,targetId:g('fp1100ConnTarget'+i),type:g('fp1100ConnType'+i),possible:g('fp1100ConnPossible'+i)!=='0',active:g('fp1100ConnActive'+i)==='1'}));
  c.life={...c.life,purchaseDate:g('fp1100CLifePurchase'),installDate:g('fp1100CLifeInstall'),commissionDate:g('fp1100CLifeCommission'),status:g('fp1100CLifeStatus')||'aktiv',removalDate:g('fp1100CLifeRemoval'),replacedBy:g('fp1100CLifeReplaced'),guaranteeUntil:g('fp1100CGuarantee'),warrantyUntil:g('fp1100CWarranty'),note:g('fp1100CLifeNote')};c.status=c.life.status;
  c.maintenance=fp1100Arr(c.maintenance).map((r,i)=>({...r,name:g('fp1100MaintName'+i),interval:g('fp1100MaintInt'+i),unit:g('fp1100MaintUnit'+i),last:g('fp1100MaintLast'+i),next:g('fp1100MaintNext'+i),expectedCost:g('fp1100MaintCost'+i),mandatory:g('fp1100MaintMandatory'+i)==='mandatory'}));
  c.cost={...c.cost,mode:g('fp1100CCostMode'),purchasePrice:g('fp1100CPurchasePrice'),paymentMode:g('fp1100CPaymentMode'),installments:g('fp1100CInstallments'),rhythm:g('fp1100CRhythm'),currentValue:g('fp1100CCurrentValue'),valuationDate:g('fp1100CValuationDate')};
  c.docs=fp1100Arr(c.docs).map((r,i)=>({...r,type:g('fp1100DocType'+i),name:g('fp1100DocName'+i),issuer:g('fp1100DocIssuer'+i),date:g('fp1100DocDate'+i),validUntil:g('fp1100DocValid'+i),ref:g('fp1100DocRef'+i),note:g('fp1100DocNote'+i)}));
  FP1100.editComponent=c;return c;
}
function fp1100NewComponent(){FP1100.editComponent=fp1100NewComp();fp1100RenderCard()}
function fp1100EditComponent(id){const item=FP1100.components.find(x=>String(x.id)===String(id));if(item){FP1100.editComponent=fp1100CompParse(item);fp1100RenderCard()}}
function fp1100CancelComponent(){FP1100.editComponent=null;fp1100RenderCard()}
function fp1100AddTech(){fp1100CaptureComponent();FP1100.editComponent.tech.push({name:'',value:'',unit:''});fp1100RenderCard()}
function fp1100RemoveTech(i){fp1100CaptureComponent();FP1100.editComponent.tech.splice(i,1);fp1100RenderCard()}
function fp1100AddConn(){fp1100CaptureComponent();FP1100.editComponent.connections.push({targetId:'',type:'',possible:true,active:false});fp1100RenderCard()}
function fp1100RemoveConn(i){fp1100CaptureComponent();FP1100.editComponent.connections.splice(i,1);fp1100RenderCard()}
function fp1100AddMaint(){fp1100CaptureComponent();FP1100.editComponent.maintenance.push({name:'',interval:'',unit:'month',last:'',next:'',expectedCost:'',mandatory:false});fp1100RenderCard()}
function fp1100RemoveMaint(i){fp1100CaptureComponent();FP1100.editComponent.maintenance.splice(i,1);fp1100RenderCard()}
function fp1100AddDoc(){fp1100CaptureComponent();FP1100.editComponent.docs.push({type:'',name:'',issuer:'',date:'',validUntil:'',ref:'',note:''});fp1100RenderCard()}
function fp1100RemoveDoc(i){fp1100CaptureComponent();FP1100.editComponent.docs.splice(i,1);fp1100RenderCard()}
async function fp1100SaveComponent(){
  try{
    const c=fp1100CaptureComponent();if(!fp1100Text(c.type))return alert('Komponententyp ist erforderlich.');const api=await getCloud(),fields={Title:fp1100CompTitle(c),FahrzeugId:String(S.configVehicleId),Komponententyp:c.type,Bezeichnung:c.name,Position:c.position,Hersteller:c.manufacturer,Modell:c.model,Typ:c.modelType,Seriennummer:c.serial,ElternKomponenteId:c.parentId,TechnischeMerkmaleJson:JSON.stringify(c.tech||[]),VerbindungenJson:JSON.stringify(c.connections||[]),LebenszyklusJson:JSON.stringify(c.life||{}),WartungJson:JSON.stringify(c.maintenance||[]),KostenJson:JSON.stringify(c.cost||{}),DokumenteJson:JSON.stringify(c.docs||[]),Status:c.life?.status||c.status||'aktiv',Aktiv:true,Testdaten:typeof testFlag==='function'?testFlag():false,AktualisiertAm1100:new Date().toISOString()};
    if(c.id)await api.updateItemByName('Komponenten1100',c.id,fields);else await api.createItemByName('Komponenten1100',fields);FP1100.editComponent=null;await fp1100Load(true);fp1100RenderCard();
  }catch(e){alert('Komponente konnte nicht gespeichert werden: '+e.message)}
}
function fp1100SetTab(tab){if(FP1100.tab==='vehicle')try{fp1100CaptureVehicle()}catch{};if(FP1100.tab==='components'&&FP1100.editComponent)try{fp1100CaptureComponent()}catch{};FP1100.tab=tab;fp1100RenderCard()}
function fp1100RenderCard(){
  let card=document.getElementById('fp1100-master-card');if(!card){card=document.createElement('div');card.id='fp1100-master-card';card.className='card';app.appendChild(card)}
  card.innerHTML=`<style>
  #fp1100-master-card{margin-top:14px}.fp1100-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.fp1100-tabs button.active{font-weight:800}.fp1100-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}.fp1100-detail{border-top:1px solid rgba(127,127,127,.24);padding:8px 0}.fp1100-detail summary{cursor:pointer;font-weight:800;font-size:16px;padding:6px 0}.fp1100-detail-body{padding:8px 0}.fp1100-subrow{padding:10px;border:1px solid rgba(127,127,127,.22);border-radius:10px;margin:8px 0}.fp1100-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.fp1100-comp-card{width:100%;text-align:left;display:flex;flex-direction:column;gap:3px;margin:7px 0;padding:12px}.fp1100-comp-card span,.fp1100-comp-card small{opacity:.75}.fp1100-triple{display:grid;grid-template-columns:1.5fr 1fr .7fr auto;gap:7px;margin:7px 0}.fp1100-editor{margin-top:12px}@media(max-width:700px){.fp1100-triple{grid-template-columns:1fr}.fp1100-grid{grid-template-columns:1fr}}
  </style><div class="section first">Stammdaten</div><p class="muted">Fachliche Struktur: Fahrzeug oder Komponente. Der alte Hauptbereich „Eigenschaften“ entfällt.</p><div class="fp1100-tabs"><button class="${FP1100.tab==='vehicle'?'active primary':''}" onclick="fp1100SetTab('vehicle')">Fahrzeug</button><button class="${FP1100.tab==='components'?'active primary':''}" onclick="fp1100SetTab('components')">Komponenten / Ausrüstung</button></div><div id="fp1100Body">${FP1100.tab==='vehicle'?fp1100VehicleHtml():(FP1100.editComponent?fp1100ComponentEditor(FP1100.editComponent):fp1100ComponentList())}</div>`;
  fp1100LegacyHide();
}
async function fp1100Install(){if(!S.configVehicleId)return;try{await fp1100Load(true);fp1100LegacyHide();fp1100RenderCard()}catch(e){console.warn('Stammdaten 1.1.0.0',e)}}

const fp1100VehicleConfigureBase=vehicleconfigure;
vehicleconfigure=async function(){await fp1100VehicleConfigureBase();await fp1100Install()};

/* Version */
const fp1100MainBase=main;
main=function(){fp1100MainBase();document.title=`Fahrzeugplattform ${FP1100_VERSION}`;const f=document.querySelector('footer');if(f)f.textContent=`Fahrzeugplattform · ${FP1100_VERSION} · © 2026 Entwicklungsstand`};
document.title=`Fahrzeugplattform ${FP1100_VERSION}`;const fp1100Foot=document.querySelector('footer');if(fp1100Foot)fp1100Foot.textContent=`Fahrzeugplattform · ${FP1100_VERSION} · © 2026 Entwicklungsstand`;
