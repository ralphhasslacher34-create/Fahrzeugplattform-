/* MOBIMORY 1.1.0.0-dev – Stammdatenstruktur REBUILD
   Basis: 1.0.6.15.
   Ein gemeinsamer Editor für neues und bestehendes Fahrzeug.
   Kein Aufruf der alten vehicleconfigure-/Fahrzeugmerkmale-Oberfläche.
*/
const FP1100_VERSION='1.1.0.0-dev';
const FP1100={tab:'vehicle',vehicleItem:null,vehicleData:null,components:[],editComponent:null,loading:false};

function fp1100Esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fp1100Text(v){return String(v??'').trim()}
function fp1100Num(v){if(v===null||v===undefined||v==='')return null;const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null}
function fp1100Json(v,fallback){try{return v?JSON.parse(v):fallback}catch{return fallback}}
function fp1100Arr(v){return Array.isArray(v)?v:[]}
function fp1100ProfileValue(f){return String(f?.Profil||'Motorboot')}
function fp1100ProfileKey(v){const s=String(v||'').toLowerCase();if(/segel|sail/.test(s))return'sailboat';if(/wohnmobil|motorhome|camper/.test(s))return'motorhome';if(/motorrad|motorcycle/.test(s))return'motorcycle';if(/pkw|auto|car/.test(s))return'car';if(/boot|motorboat|yacht/.test(s))return'motorboat';return'other'}
function fp1100IsBoat(v){return ['motorboat','sailboat'].includes(fp1100ProfileKey(v))}
function fp1100IsRoad(v){return ['motorhome','car','motorcycle'].includes(fp1100ProfileKey(v))}
function fp1100Date(v){return v?String(v).slice(0,10):''}
function fp1100Input(id,label,value,type='text',extra=''){return `<div class="field"><label>${fp1100Esc(label)}</label><input id="${id}" type="${type}" value="${fp1100Esc(value??'')}" ${extra}></div>`}
function fp1100Select(id,label,value,opts,extra=''){return `<div class="field"><label>${fp1100Esc(label)}</label><select id="${id}" ${extra}>${opts.map(([v,t])=>`<option value="${fp1100Esc(v)}" ${String(v)===String(value)?'selected':''}>${fp1100Esc(t)}</option>`).join('')}</select></div>`}
function fp1100Grid(parts){return `<div class="fp1100-grid">${parts.join('')}</div>`}
function fp1100Details(title,body,open=false){return `<details class="fp1100-detail" ${open?'open':''}><summary>${fp1100Esc(title)}</summary><div class="fp1100-detail-body">${body}</div></details>`}
function fp1100Get(id){return document.getElementById(id)?.value??''}
function fp1100Checked(id){return !!document.getElementById(id)?.checked}
function fp1100MoneyInput(id,label,value){return fp1100Input(id,label,value,'number','step="0.01" min="0"')}
function fp1100SpeedToKmh(v,unit){const n=fp1100Num(v);if(n==null)return null;return unit==='kn'?n*1.852:n}
function fp1100SpeedFromKmh(v,unit){const n=fp1100Num(v);if(n==null)return'';return unit==='kn'?(n/1.852).toFixed(1):n.toFixed(1)}
function fp1100HullSpeedKn(lwlM){const n=fp1100Num(lwlM);return n&&n>0?2.427*Math.sqrt(n):null}

/* Additives Schema an bestehendes Setup hängen. */
const fp1100MergedSchemaBase=fp105MergedSchema;
fp105MergedSchema=async function(){
  const [prior,e]=await Promise.all([
    fp1100MergedSchemaBase(),
    fetch('phase1-sharepoint-schema-1.1.0.0.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Schema 1.1.0.0 fehlt im Repository.');return r.json()})
  ]);
  return fp105MergeSchemas(prior,e);
};

/* Setup nur um aktuellen Stand ergänzen. */
const fp1100M365Base=m365setup;
m365setup=function(){
  fp1100M365Base();
  head('Microsoft 365 Setup','Schema 1.1.0.0 · Stammdatenstruktur · additiv');
  const cards=[...app.querySelectorAll('.card')];
  const target=cards.find(c=>(c.textContent||'').includes('SharePoint-Site-URL'));
  if(target&&!target.querySelector('.fp1100-setup-note')){
    const p=document.createElement('p');p.className='muted fp1100-setup-note';p.textContent='1.1.0.0 ergänzt die neue Fahrzeug-/Komponentenstruktur. Bestehende Alt-Daten werden nicht gelöscht.';target.appendChild(p);
  }
};

function fp1100Defaults(f={}){
  const profile=fp1100ProfileValue(f),boat=fp1100IsBoat(profile);
  return {
    identity:{
      name:f.Fahrzeugname||f.Title||'',profile,subtype:f.Fahrzeugtyp||'',manufacturer:f.Hersteller||'',model:f.Modell||'',year:f.Baujahr??'',identifier:f.HINCIN||f.FINVIN||'',
      purchaseDate:'',purchasePrice:'',paymentMode:'oneoff',installments:'',installmentRhythm:'year',currentValue:'',valuationDate:''
    },
    registrations:f.KennzeichenRegistrierung?[{kind:'',country:'',number:f.KennzeichenRegistrierung,issuer:'',date:'',expiry:'',recognitionUntil:'',renew:'unknown'}]:[],
    dimensions:{
      length:'',width:'',heightNormal:'',heightLow:'',heightHigh:'',lwl:'',draft:'',bridgeNormal:'',bridgeLow:'',
      displacementLight:'',displacementTravel:'',displacementMax:'',weightReference:'',
      weightEmpty:'',weightGross:'',clearanceNormal:'',clearanceLow:'',clearanceHigh:'',approachFront:'',approachRear:'',axleLoads:'',trailerBraked:'',trailerUnbraked:'',drawbarLoad:'',trainGross:''
    },
    performance:{unit:f.Geschwindigkeitseinheit1068||(boat?'kn':'km/h'),vmin:'',vtravel:'',vmax:'',historyKmh:f.VReiseHistorieKmh1068??null},
    adminEntries:[],locations:[]
  };
}
function fp1100MergeData(base,data){
  data=data&&typeof data==='object'?data:{};
  return {...base,...data,
    identity:{...base.identity,...(data.identity||{})},dimensions:{...base.dimensions,...(data.dimensions||{})},performance:{...base.performance,...(data.performance||{})},
    registrations:fp1100Arr(data.registrations),adminEntries:fp1100Arr(data.adminEntries),locations:fp1100Arr(data.locations)
  };
}
function fp1100ImportLegacySpeeds(d,f){
  if((d.performance.vmin===''||d.performance.vmin==null)&&f.VMinKmh1068!=null)d.performance.vmin=fp1100SpeedFromKmh(f.VMinKmh1068,d.performance.unit);
  if((d.performance.vtravel===''||d.performance.vtravel==null)&&f.VReiseKmh1068!=null)d.performance.vtravel=fp1100SpeedFromKmh(f.VReiseKmh1068,d.performance.unit);
  if((d.performance.vmax===''||d.performance.vmax==null)&&f.VMaxKmh1068!=null)d.performance.vmax=fp1100SpeedFromKmh(f.VMaxKmh1068,d.performance.unit);
  d.performance.historyKmh=f.VReiseHistorieKmh1068??d.performance.historyKmh??null;
  return d;
}
async function fp1100LoadVehicle(){
  if(!S.editVehicleId){FP1100.vehicleItem=null;FP1100.vehicleData=fp1100Defaults({});FP1100.components=[];return}
  const api=await getCloud(),v=await api.getItemByName('Fahrzeuge',S.editVehicleId),f=v.fields||{};
  let d=fp1100MergeData(fp1100Defaults(f),fp1100Json(f.StammdatenJson1100,null));d=fp1100ImportLegacySpeeds(d,f);
  FP1100.vehicleItem=v;FP1100.vehicleData=d;
  FP1100.components=(await fp105SafeList(api,'Komponenten1100')).filter(x=>String(x.fields.FahrzeugId)===String(S.editVehicleId)&&x.fields.Aktiv!==false);
}

function fp1100ProfileOptions(){return [['Motorboot','Motorboot'],['Segelboot','Segelboot'],['Wohnmobil','Wohnmobil'],['PKW','PKW'],['Motorrad','Motorrad'],['Sonstiges','Sonstiges']]}
function fp1100SubtypeOptions(profile){
  const p=fp1100ProfileKey(profile);if(p==='motorboat')return [['','– auswählen –'],['Verdränger','Verdränger'],['Halbgleiter','Halbgleiter'],['Gleiter','Gleiter']];
  if(p==='sailboat')return [['','– auswählen –'],['Segelboot','Segelboot'],['Motorsegler','Motorsegler']];
  if(p==='motorhome')return [['','– auswählen –'],['Kastenwagen','Kastenwagen'],['Teilintegriert','Teilintegriert'],['Integriert','Integriert'],['Alkoven','Alkoven']];
  return [['','– optional –']];
}
function fp1100RegistrationRows(rows){
  if(!rows.length)return '<p class="muted">Noch keine Registrierung hinterlegt.</p>';
  return rows.map((r,i)=>`<div class="fp1100-subrow">${fp1100Grid([
    fp1100Input(`fp1100RegKind${i}`,'Art der Registrierung',r.kind||''),fp1100Input(`fp1100RegCountry${i}`,'Land / Flaggenstaat',r.country||''),fp1100Input(`fp1100RegNo${i}`,'Registriernummer / Kennzeichen',r.number||''),fp1100Input(`fp1100RegIssuer${i}`,'Behörde / Register / Aussteller',r.issuer||''),
    fp1100Input(`fp1100RegDate${i}`,'Ausstellungsdatum',r.date||'','date'),fp1100Input(`fp1100RegExpiry${i}`,'Formales Ablaufdatum',r.expiry||'','date'),fp1100Input(`fp1100RegRecognition${i}`,'Anerkennung relevant bis',r.recognitionUntil||'','date'),
    fp1100Select(`fp1100RegRenew${i}`,'Erneuerung',r.renew||'unknown',[['unknown','unbekannt'],['manual','manuell'],['automatic','automatisch'],['none','keine / unbefristet']])
  ])}<button type="button" class="danger-lite" onclick="fp1100RemoveRegistration(${i})">Registrierung entfernen</button></div>`).join('');
}
function fp1100AdminRows(rows){
  if(!rows.length)return '<p class="muted">Noch keine Versicherung, Steuer, Vignette oder Dokument hinterlegt.</p>';
  return rows.map((r,i)=>`<div class="fp1100-subrow">${fp1100Grid([
    fp1100Select(`fp1100AdmCat${i}`,'Art',r.category||'insurance',[['insurance','Versicherung'],['tax','Steuer / Abgabe'],['permit','Vignette / Sonderzulassung / Berechtigung'],['document','Dokument / Nachweis']]),
    fp1100Input(`fp1100AdmName${i}`,'Bezeichnung',r.name||''),fp1100Input(`fp1100AdmArea${i}`,'Land / Gebiet',r.area||''),fp1100Input(`fp1100AdmNo${i}`,'Nummer / Referenz',r.number||''),
    fp1100Input(`fp1100AdmFrom${i}`,'Gültig ab',r.from||'','date'),fp1100Input(`fp1100AdmUntil${i}`,'Gültig bis',r.until||'','date'),
    fp1100MoneyInput(`fp1100AdmCost${i}`,'Kosten',r.cost||''),fp1100Select(`fp1100AdmRhythm${i}`,'Kostenrhythmus',r.rhythm||'once',[['once','einmalig'],['monthly','monatlich'],['yearly','jährlich'],['custom','anderes Intervall']]),
    fp1100Select(`fp1100AdmAction${i}`,'Erneuerung / Zahlung',r.action||'manual',[['manual','manuell'],['automatic','automatisch'],['none','keine']]),fp1100Input(`fp1100AdmDoc${i}`,'Dokument / Link / Ablagehinweis',r.documentRef||'')
  ])}<button type="button" class="danger-lite" onclick="fp1100RemoveAdmin(${i})">Eintrag entfernen</button></div>`).join('');
}
function fp1100LocationRows(rows){
  if(!rows.length)return '<p class="muted">Noch kein fester Standort hinterlegt.</p>';
  return rows.map((r,i)=>`<div class="fp1100-subrow">${fp1100Grid([
    fp1100Input(`fp1100LocName${i}`,'Bezeichnung',r.name||''),fp1100Select(`fp1100LocType${i}`,'Typ',r.type||'stand',[['stand','Stellplatz'],['berth','Liegeplatz / Heimathafen'],['garage','Garage / Halle'],['winter','Winterlager'],['other','Sonstiges']]),
    fp1100Input(`fp1100LocAddress${i}`,'Adresse / Ort',r.address||''),fp1100Input(`fp1100LocPosition${i}`,'Platz / Box / Position',r.position||''),fp1100Input(`fp1100LocFrom${i}`,'Von',r.from||'','date'),fp1100Input(`fp1100LocUntil${i}`,'Bis',r.until||'','date'),
    fp1100MoneyInput(`fp1100LocCost${i}`,'Kosten',r.cost||''),fp1100Select(`fp1100LocRhythm${i}`,'Kostenrhythmus',r.rhythm||'yearly',[['once','einmalig'],['monthly','monatlich'],['yearly','jährlich'],['custom','anderes Intervall']])
  ])}<label class="checkrow"><input id="fp1100LocMain${i}" type="checkbox" ${r.main?'checked':''}> Hauptstandort</label><button type="button" class="danger-lite" onclick="fp1100RemoveLocation(${i})">Standort entfernen</button></div>`).join('');
}
function fp1100DimensionHtml(d,profile){
  const common=fp1100Grid([fp1100Input('fp1100Length','Länge',d.length,'number','step="0.01"'),fp1100Input('fp1100Width','Breite',d.width,'number','step="0.01"'),fp1100Input('fp1100HeightNormal','Höhe normal',d.heightNormal,'number','step="0.01"'),fp1100Input('fp1100HeightLow','Höhe abgesenkt / reduziert',d.heightLow,'number','step="0.01"'),fp1100Input('fp1100HeightHigh','Höhe angehoben',d.heightHigh,'number','step="0.01"')]);
  if(fp1100IsBoat(profile))return common+fp1100Grid([
    fp1100Input('fp1100Lwl','Länge Wasserlinie (LWL)',d.lwl,'number','step="0.01"'),fp1100Input('fp1100Draft','Tiefgang',d.draft,'number','step="0.01"'),fp1100Input('fp1100BridgeNormal','Durchfahrtshöhe normal',d.bridgeNormal,'number','step="0.01"'),fp1100Input('fp1100BridgeLow','Durchfahrtshöhe reduziert',d.bridgeLow,'number','step="0.01"'),
    fp1100Input('fp1100DispLight','Leer-/Leichtverdrängung',d.displacementLight,'number','step="0.01"'),fp1100Input('fp1100DispTravel','Verdrängung Reisezustand',d.displacementTravel,'number','step="0.01"'),fp1100Input('fp1100DispMax','Max. Verdrängung / Beladungszustand',d.displacementMax,'number','step="0.01"'),fp1100Input('fp1100WeightReference','Bezugszustand Tanks / Beladung',d.weightReference)
  ]);
  return common+fp1100Grid([
    fp1100Input('fp1100WeightEmpty','Leergewicht',d.weightEmpty,'number','step="0.1"'),fp1100Input('fp1100WeightGross','Zulässiges Gesamtgewicht',d.weightGross,'number','step="0.1"'),fp1100Input('fp1100AxleLoads','Zulässige Achslasten',d.axleLoads),fp1100Input('fp1100TrailerBraked','Anhängelast gebremst',d.trailerBraked,'number','step="0.1"'),fp1100Input('fp1100TrailerUnbraked','Anhängelast ungebremst',d.trailerUnbraked,'number','step="0.1"'),fp1100Input('fp1100DrawbarLoad','Stützlast',d.drawbarLoad,'number','step="0.1"'),fp1100Input('fp1100TrainGross','Zulässiges Zuggesamtgewicht',d.trainGross,'number','step="0.1"'),
    fp1100Input('fp1100ClearNormal','Bodenfreiheit normal',d.clearanceNormal,'number','step="0.01"'),fp1100Input('fp1100ClearLow','Bodenfreiheit abgesenkt',d.clearanceLow,'number','step="0.01"'),fp1100Input('fp1100ClearHigh','Bodenfreiheit angehoben',d.clearanceHigh,'number','step="0.01"'),fp1100Input('fp1100ApproachFront','Böschungswinkel vorne',d.approachFront,'number','step="0.1"'),fp1100Input('fp1100ApproachRear','Böschungswinkel hinten',d.approachRear,'number','step="0.1"'),fp1100Input('fp1100WeightReference','Bezugszustand Tanks / Beladung',d.weightReference)
  ]);
}
function fp1100PerformanceHtml(d,identity){
  const unit=d.unit||'km/h',hist=d.historyKmh!=null?fp1100SpeedFromKmh(d.historyKmh,unit):'';
  let hull='';if(fp1100IsBoat(identity.profile)&&identity.subtype==='Verdränger'){
    const hs=fp1100HullSpeedKn(FP1100.vehicleData?.dimensions?.lwl);if(hs){const shown=unit==='kn'?hs:hs*1.852;hull=`<div class="fp1100-info"><b>Berechnete Rumpfgeschwindigkeit:</b> ${shown.toFixed(1)} ${unit}</div>`;const vt=fp1100Num(d.vtravel);if(vt!=null&&vt>shown*1.03)hull+=`<div class="fp1100-warn">Hinweis: V Reise liegt über der berechneten Rumpfgeschwindigkeit. Wirtschaftlichkeit bzw. Plausibilität prüfen.</div>`;}
  }
  return fp1100Grid([fp1100Select('fp1100SpeedUnit','Einheit',unit,[['km/h','km/h'],['kn','kn']]),fp1100Input('fp1100VMin','V min',d.vmin,'number','step="0.1"'),fp1100Input('fp1100VTravel','V Reise',d.vtravel,'number','step="0.1"'),fp1100Input('fp1100VMax','V max',d.vmax,'number','step="0.1"'),fp1100Input('fp1100VHistory','V Reise aus Historie',hist,'text','readonly')])+hull;
}
function fp1100VehicleHtml(){
  const d=FP1100.vehicleData||fp1100Defaults({}),i=d.identity,profile=i.profile||'Motorboot';
  return `<div class="fp1100-section-head"><b>${S.editVehicleId?'Fahrzeug bearbeiten':'Neues Fahrzeug'}</b><span class="muted">eine gemeinsame Stammdatenmaske</span></div>
  ${fp1100Details('1.1 Identität',fp1100Grid([
    fp1100Input('fp1100Name','Fahrzeugname *',i.name),fp1100Select('fp1100Profile','Fahrzeugart / Profil *',profile,fp1100ProfileOptions(),'onchange="fp1100ProfileChanged()"'),fp1100Select('fp1100Subtype','Unterart',i.subtype,fp1100SubtypeOptions(profile)),
    fp1100Input('fp1100Manufacturer','Hersteller',i.manufacturer),fp1100Input('fp1100Model','Modell / Typ',i.model),fp1100Input('fp1100Year','Baujahr',i.year,'number','min="1800" max="2200"'),fp1100Input('fp1100Identifier','FIN / VIN / HIN / CIN / Rumpfnummer',i.identifier),
    fp1100Input('fp1100PurchaseDate','Kaufdatum',i.purchaseDate,'date'),fp1100MoneyInput('fp1100PurchasePrice','Anschaffungspreis',i.purchasePrice),fp1100Select('fp1100PaymentMode','Zahlungsart',i.paymentMode||'oneoff',[['oneoff','einmalig'],['installments','Raten'],['unknown','nicht erfasst']]),fp1100Input('fp1100Installments','Anzahl Raten',i.installments,'number','min="1"'),fp1100Select('fp1100InstallmentRhythm','Ratenrhythmus',i.installmentRhythm||'year',[['month','monatlich'],['quarter','vierteljährlich'],['year','jährlich']]),fp1100MoneyInput('fp1100CurrentValue','Aktueller / Gutachtenwert',i.currentValue),fp1100Input('fp1100ValuationDate','Bewertungsdatum',i.valuationDate,'date')
  ]),true)}
  ${fp1100Details('1.2 Zulassung / Registrierung',`<div id="fp1100Registrations">${fp1100RegistrationRows(d.registrations)}</div><button type="button" onclick="fp1100AddRegistration()">+ Registrierung</button>`)}
  ${fp1100Details('1.3 Abmessungen / Gewichte',fp1100DimensionHtml(d.dimensions,profile))}
  ${fp1100Details('1.4 Fahr- / Leistungsdaten',fp1100PerformanceHtml(d.performance,i))}
  ${fp1100Details('1.5 Rechtlich / administrativ',`<p class="muted">Versicherung, Steuer/Abgaben, Vignetten/Sonderzulassungen und Fahrzeugdokumente. Kosten werden hier am Ursprung erfasst.</p><div id="fp1100AdminEntries">${fp1100AdminRows(d.adminEntries)}</div><button type="button" onclick="fp1100AddAdmin()">+ Eintrag</button>`)}
  ${fp1100Details('1.6 Feste Standorte',`<p class="muted">Heimliegeplatz, Stellplatz, Garage/Halle, Winterlager – keine Reiseparkplätze oder Gastliegeplätze.</p><div id="fp1100Locations">${fp1100LocationRows(d.locations)}</div><button type="button" onclick="fp1100AddLocation()">+ Standort</button>`)}
  <label class="checkrow"><input id="fp1100Active" type="checkbox" ${FP1100.vehicleItem?.fields?.Aktiv===false?'':'checked'}> Fahrzeug aktiv</label>
  <div class="fp1100-actions"><button class="primary" onclick="fp1100SaveVehicle()">${S.editVehicleId?'Fahrzeug speichern':'Fahrzeug anlegen'}</button>${S.editVehicleId?'<button onclick="fp1100SetTab(\'components\')">Komponenten / Ausrüstung</button>':''}</div>`;
}
function fp1100CaptureVehicle(){
  const d=FP1100.vehicleData||fp1100Defaults({}),i=d.identity,dim=d.dimensions,p=d.performance;
  i.name=fp1100Get('fp1100Name');i.profile=fp1100Get('fp1100Profile');i.subtype=fp1100Get('fp1100Subtype');i.manufacturer=fp1100Get('fp1100Manufacturer');i.model=fp1100Get('fp1100Model');i.year=fp1100Get('fp1100Year');i.identifier=fp1100Get('fp1100Identifier');i.purchaseDate=fp1100Get('fp1100PurchaseDate');i.purchasePrice=fp1100Get('fp1100PurchasePrice');i.paymentMode=fp1100Get('fp1100PaymentMode');i.installments=fp1100Get('fp1100Installments');i.installmentRhythm=fp1100Get('fp1100InstallmentRhythm');i.currentValue=fp1100Get('fp1100CurrentValue');i.valuationDate=fp1100Get('fp1100ValuationDate');
  d.registrations=fp1100Arr(d.registrations).map((r,n)=>({...r,kind:fp1100Get(`fp1100RegKind${n}`),country:fp1100Get(`fp1100RegCountry${n}`),number:fp1100Get(`fp1100RegNo${n}`),issuer:fp1100Get(`fp1100RegIssuer${n}`),date:fp1100Get(`fp1100RegDate${n}`),expiry:fp1100Get(`fp1100RegExpiry${n}`),recognitionUntil:fp1100Get(`fp1100RegRecognition${n}`),renew:fp1100Get(`fp1100RegRenew${n}`)}));
  ['length','width','heightNormal','heightLow','heightHigh','lwl','draft','bridgeNormal','bridgeLow','displacementLight','displacementTravel','displacementMax','weightReference','weightEmpty','weightGross','clearanceNormal','clearanceLow','clearanceHigh','approachFront','approachRear','axleLoads','trailerBraked','trailerUnbraked','drawbarLoad','trainGross'].forEach(k=>{const map={length:'Length',width:'Width',heightNormal:'HeightNormal',heightLow:'HeightLow',heightHigh:'HeightHigh',lwl:'Lwl',draft:'Draft',bridgeNormal:'BridgeNormal',bridgeLow:'BridgeLow',displacementLight:'DispLight',displacementTravel:'DispTravel',displacementMax:'DispMax',weightReference:'WeightReference',weightEmpty:'WeightEmpty',weightGross:'WeightGross',clearanceNormal:'ClearNormal',clearanceLow:'ClearLow',clearanceHigh:'ClearHigh',approachFront:'ApproachFront',approachRear:'ApproachRear',axleLoads:'AxleLoads',trailerBraked:'TrailerBraked',trailerUnbraked:'TrailerUnbraked',drawbarLoad:'DrawbarLoad',trainGross:'TrainGross'};dim[k]=fp1100Get('fp1100'+map[k])});
  p.unit=fp1100Get('fp1100SpeedUnit')||p.unit;p.vmin=fp1100Get('fp1100VMin');p.vtravel=fp1100Get('fp1100VTravel');p.vmax=fp1100Get('fp1100VMax');
  d.adminEntries=fp1100Arr(d.adminEntries).map((r,n)=>({...r,category:fp1100Get(`fp1100AdmCat${n}`),name:fp1100Get(`fp1100AdmName${n}`),area:fp1100Get(`fp1100AdmArea${n}`),number:fp1100Get(`fp1100AdmNo${n}`),from:fp1100Get(`fp1100AdmFrom${n}`),until:fp1100Get(`fp1100AdmUntil${n}`),cost:fp1100Get(`fp1100AdmCost${n}`),rhythm:fp1100Get(`fp1100AdmRhythm${n}`),action:fp1100Get(`fp1100AdmAction${n}`),documentRef:fp1100Get(`fp1100AdmDoc${n}`)}));
  d.locations=fp1100Arr(d.locations).map((r,n)=>({...r,name:fp1100Get(`fp1100LocName${n}`),type:fp1100Get(`fp1100LocType${n}`),address:fp1100Get(`fp1100LocAddress${n}`),position:fp1100Get(`fp1100LocPosition${n}`),from:fp1100Get(`fp1100LocFrom${n}`),until:fp1100Get(`fp1100LocUntil${n}`),cost:fp1100Get(`fp1100LocCost${n}`),rhythm:fp1100Get(`fp1100LocRhythm${n}`),main:fp1100Checked(`fp1100LocMain${n}`)}));
  FP1100.vehicleData=d;return d;
}
function fp1100ProfileChanged(){fp1100CaptureVehicle();FP1100.vehicleData.identity.subtype='';fp1100RenderMaster()}
function fp1100AddRegistration(){fp1100CaptureVehicle();FP1100.vehicleData.registrations.push({kind:'',country:'',number:'',issuer:'',date:'',expiry:'',recognitionUntil:'',renew:'unknown'});fp1100RenderMaster()}
function fp1100RemoveRegistration(i){fp1100CaptureVehicle();FP1100.vehicleData.registrations.splice(i,1);fp1100RenderMaster()}
function fp1100AddAdmin(){fp1100CaptureVehicle();FP1100.vehicleData.adminEntries.push({category:'insurance',name:'',area:'',number:'',from:'',until:'',cost:'',rhythm:'once',action:'manual',documentRef:''});fp1100RenderMaster()}
function fp1100RemoveAdmin(i){fp1100CaptureVehicle();FP1100.vehicleData.adminEntries.splice(i,1);fp1100RenderMaster()}
function fp1100AddLocation(){fp1100CaptureVehicle();FP1100.vehicleData.locations.push({name:'',type:'stand',address:'',position:'',from:'',until:'',cost:'',rhythm:'yearly',main:false});fp1100RenderMaster()}
function fp1100RemoveLocation(i){fp1100CaptureVehicle();FP1100.vehicleData.locations.splice(i,1);fp1100RenderMaster()}
async function fp1100SaveVehicle(){
  try{
    const d=fp1100CaptureVehicle(),i=d.identity,name=fp1100Text(i.name);if(!name)return alert('Fahrzeugname ist erforderlich.');if(!i.profile)return alert('Fahrzeugart / Profil ist erforderlich.');
    const unit=d.performance.unit||'km/h',vmin=fp1100SpeedToKmh(d.performance.vmin,unit),vtravel=fp1100SpeedToKmh(d.performance.vtravel,unit),vmax=fp1100SpeedToKmh(d.performance.vmax,unit);
    if(vmin!=null&&vtravel!=null&&vtravel<vmin)return alert('V Reise darf nicht unter V min liegen.');if(vmax!=null&&vtravel!=null&&vtravel>vmax)return alert('V Reise darf nicht über V max liegen.');
    const firstReg=d.registrations.find(r=>fp1100Text(r.number));
    const fields={Title:name,DatenraumId:'default',Fahrzeugname:name,Profil:i.profile,Fahrzeugtyp:i.subtype||i.profile,Hersteller:i.manufacturer||'',Modell:i.model||'',KennzeichenRegistrierung:firstReg?.number||'',Aktiv:fp1100Checked('fp1100Active'),StammdatenJson1100:JSON.stringify(d),StammdatenStand1100:new Date().toISOString(),Geschwindigkeitseinheit1068:unit,VMinKmh1068:vmin,VReiseKmh1068:vtravel,VMaxKmh1068:vmax};
    if(i.year!=='')fields.Baujahr=Number(i.year);else fields.Baujahr=null;
    const api=await getCloud();
    if(S.editVehicleId)await api.updateItemByName('Fahrzeuge',S.editVehicleId,fields);else{const x=await api.createItemByName('Fahrzeuge',fields);S.editVehicleId=String(x.id)}
    await fp1100LoadVehicle();fp1100RenderMaster();
    alert('Fahrzeugstammdaten gespeichert.');
  }catch(e){alert('Fahrzeug konnte nicht gespeichert werden: '+e.message)}
}

function fp1100NewComp(){return {id:'',type:'',name:'',position:'',manufacturer:'',model:'',modelType:'',serial:'',parentId:'',tech:[],connections:[],life:{purchaseDate:'',installDate:'',commissionDate:'',status:'aktiv',removalDate:'',replacedBy:'',guaranteeUntil:'',warrantyUntil:'',note:''},maintenance:[],cost:{mode:'included',purchasePrice:'',paymentMode:'oneoff',installments:'',rhythm:'year',currentValue:'',valuationDate:''},docs:[]}}
function fp1100CompTitle(c){return [c.type,c.name,c.position].map(fp1100Text).filter(Boolean).join(' · ')||'Komponente'}
function fp1100ParseComp(x){const f=x.fields||{},c=fp1100NewComp();return {...c,id:String(x.id),type:f.Komponententyp||'',name:f.Bezeichnung||'',position:f.Position||'',manufacturer:f.Hersteller||'',model:f.Modell||'',modelType:f.Typ||'',serial:f.Seriennummer||'',parentId:f.ElternKomponenteId||'',tech:fp1100Json(f.TechnischeMerkmaleJson,[]),connections:fp1100Json(f.VerbindungenJson,[]),life:{...c.life,...fp1100Json(f.LebenszyklusJson,{})},maintenance:fp1100Json(f.WartungJson,[]),cost:{...c.cost,...fp1100Json(f.KostenJson,{})},docs:fp1100Json(f.DokumenteJson,[])}}
function fp1100ComponentList(){
  if(!S.editVehicleId)return '<div class="fp1100-info">Fahrzeug zuerst speichern. Danach können Komponenten/Ausrüstung angelegt werden.</div>';
  return `<div class="fp1100-section-head"><b>Komponenten / Ausrüstung</b><span class="muted">2.1–2.7 in einer Maske je Komponente</span></div><button class="primary" onclick="fp1100NewComponent()">+ Komponente anlegen</button>${FP1100.components.length?FP1100.components.map(x=>{const c=fp1100ParseComp(x);return `<button class="fp1100-comp-card" onclick="fp1100EditComponent('${x.id}')"><b>${fp1100Esc(fp1100CompTitle(c))}</b><span>${fp1100Esc(c.manufacturer)} ${fp1100Esc(c.model)}</span><small>${fp1100Esc(c.life?.status||'aktiv')}</small></button>`}).join(''):'<p class="muted">Noch keine Komponenten in der neuen Struktur.</p>'}`;
}
function fp1100TechRows(c){return c.tech.length?c.tech.map((r,i)=>`<div class="fp1100-row4">${fp1100Input(`fp1100TechName${i}`,'Merkmal',r.name||'')}${fp1100Input(`fp1100TechValue${i}`,'Wert',r.value||'')}${fp1100Input(`fp1100TechUnit${i}`,'Einheit',r.unit||'')}<button type="button" class="danger-lite" onclick="fp1100RemoveTech(${i})">Entfernen</button></div>`).join(''):'<p class="muted">Keine technischen Merkmale. Nur erfassen, was für diese Komponente sinnvoll ist.</p>'}
function fp1100ConnectionRows(c){return c.connections.length?c.connections.map((r,i)=>`<div class="fp1100-subrow">${fp1100Grid([fp1100Select(`fp1100ConnTarget${i}`,'Zielkomponente',r.targetId||'',[['','– auswählen –'],...FP1100.components.filter(x=>String(x.id)!==String(c.id)).map(x=>[String(x.id),fp1100CompTitle(fp1100ParseComp(x))])]),fp1100Input(`fp1100ConnType${i}`,'Art der Verbindung',r.type||''),fp1100Select(`fp1100ConnPossible${i}`,'Technisch möglich',r.possible===false?'0':'1',[['1','ja'],['0','nein']]),fp1100Select(`fp1100ConnActive${i}`,'Aktuell aktiv',r.active?'1':'0',[['0','nein'],['1','ja']])])}<button type="button" class="danger-lite" onclick="fp1100RemoveConnection(${i})">Verbindung entfernen</button></div>`).join(''):'<p class="muted">Keine Verbindung hinterlegt.</p>'}
function fp1100MaintenanceRows(c){return c.maintenance.length?c.maintenance.map((r,i)=>`<div class="fp1100-subrow">${fp1100Grid([fp1100Input(`fp1100MaintName${i}`,'Wartung / Prüfung',r.name||''),fp1100Input(`fp1100MaintInt${i}`,'Intervall',r.interval||'','number','step="0.1" min="0"'),fp1100Select(`fp1100MaintUnit${i}`,'Intervall nach',r.unit||'month',[['month','Monaten'],['year','Jahren'],['bh','Betriebsstunden'],['km','Kilometern'],['sm','Seemeilen']]),fp1100Input(`fp1100MaintLast${i}`,'Letzte Durchführung',r.last||'','date'),fp1100Input(`fp1100MaintNext${i}`,'Nächste Fälligkeit',r.next||'','date'),fp1100MoneyInput(`fp1100MaintCost${i}`,'Erwartete Kosten',r.expectedCost||''),fp1100Select(`fp1100MaintMandatory${i}`,'Art',r.mandatory?'mandatory':'optional',[['optional','freiwillig / technisch'],['mandatory','vorgeschrieben / prüfpflichtig']])])}<button type="button" class="danger-lite" onclick="fp1100RemoveMaintenance(${i})">Regel entfernen</button></div>`).join(''):'<p class="muted">Keine Wartungs-/Prüfregel hinterlegt.</p>'}
function fp1100DocRows(c){return c.docs.length?c.docs.map((r,i)=>`<div class="fp1100-subrow">${fp1100Grid([fp1100Input(`fp1100DocType${i}`,'Dokumentart',r.type||''),fp1100Input(`fp1100DocName${i}`,'Bezeichnung',r.name||''),fp1100Input(`fp1100DocIssuer${i}`,'Aussteller',r.issuer||''),fp1100Input(`fp1100DocDate${i}`,'Datum',r.date||'','date'),fp1100Input(`fp1100DocValid${i}`,'Gültig bis',r.validUntil||'','date'),fp1100Input(`fp1100DocRef${i}`,'Datei / Link / Ablagehinweis',r.ref||''),fp1100Input(`fp1100DocNote${i}`,'Bemerkung',r.note||'')])}<button type="button" class="danger-lite" onclick="fp1100RemoveDoc(${i})">Dokument entfernen</button></div>`).join(''):'<p class="muted">Keine dauerhaften Dokumente/Nachweise hinterlegt.</p>'}
function fp1100ComponentEditor(c){
  const costMode=c.cost?.mode||'included';return `<div class="fp1100-editor"><div class="fp1100-section-head"><b>${c.id?'Komponente bearbeiten':'Neue Komponente'}</b><span class="muted">einmal öffnen, vollständig erfassen</span></div>
  ${fp1100Details('2.1 Identität',fp1100Grid([fp1100Input('fp1100CType','Komponententyp *',c.type),fp1100Input('fp1100CName','Bezeichnung',c.name),fp1100Input('fp1100CPosition','Einbauort / Position',c.position),fp1100Input('fp1100CManufacturer','Hersteller',c.manufacturer),fp1100Input('fp1100CModel','Modell',c.model),fp1100Input('fp1100CModelType','Typ',c.modelType),fp1100Input('fp1100CSerial','Seriennummer / Identifikation',c.serial),fp1100Select('fp1100CParent','Baugruppe / Unterkomponente von',c.parentId||'',[['','– keine –'],...FP1100.components.filter(x=>String(x.id)!==String(c.id)).map(x=>[String(x.id),fp1100CompTitle(fp1100ParseComp(x))])])]),true)}
  ${fp1100Details('2.2 Technische Merkmale',`<div id="fp1100TechRows">${fp1100TechRows(c)}</div><button type="button" onclick="fp1100AddTech()">+ Merkmal</button>`)}
  ${fp1100Details('2.3 Verbindungen / Zuordnungen',`<p class="muted">Technisch mögliche und aktuell aktive Beziehungen, z. B. Tank → Motor oder Batterie → Wechselrichter.</p>${fp1100ConnectionRows(c)}<button type="button" onclick="fp1100AddConnection()">+ Verbindung</button>`)}
  ${fp1100Details('2.4 Lebenszyklus / Status',fp1100Grid([fp1100Input('fp1100CLifePurchase','Kaufdatum',c.life.purchaseDate,'date'),fp1100Input('fp1100CLifeInstall','Einbaudatum',c.life.installDate,'date'),fp1100Input('fp1100CLifeCommission','Inbetriebnahme',c.life.commissionDate,'date'),fp1100Select('fp1100CLifeStatus','Status',c.life.status||'aktiv',[['aktiv','aktiv'],['ausser_betrieb','außer Betrieb'],['ausgebaut','ausgebaut'],['ersetzt','ersetzt'],['verkauft','verkauft'],['verschrottet','verschrottet']]),fp1100Input('fp1100CLifeRemoval','Ausbaudatum',c.life.removalDate,'date'),fp1100Input('fp1100CLifeReplaced','Ersetzt durch / Ersatz für',c.life.replacedBy),fp1100Input('fp1100CGuarantee','Garantie bis',c.life.guaranteeUntil,'date'),fp1100Input('fp1100CWarranty','Gewährleistung bis',c.life.warrantyUntil,'date'),fp1100Input('fp1100CLifeNote','Bemerkung',c.life.note)]))}
  ${fp1100Details('2.5 Wartung / Prüfung / Fristen',`${fp1100MaintenanceRows(c)}<button type="button" onclick="fp1100AddMaintenance()">+ Wartung / Prüfung</button>`)}
  ${fp1100Details('2.6 Kosten / Wert',`<p class="muted">Anschaffungskosten sind optional. „Im Fahrzeug enthalten“ bedeutet nicht Wert 0.</p>${fp1100Grid([fp1100Select('fp1100CCostMode','Kostenbezug',costMode,[['included','im Fahrzeug enthalten'],['separate','separat angeschafft'],['selfbuilt','Eigenbau'],['existing','übernommen / vorhanden'],['unknown','Preis unbekannt']]),fp1100MoneyInput('fp1100CPurchasePrice','Separater Kaufpreis',c.cost.purchasePrice),fp1100Select('fp1100CPaymentMode','Zahlungsart',c.cost.paymentMode||'oneoff',[['oneoff','einmalig'],['installments','Raten'],['unknown','nicht erfasst']]),fp1100Input('fp1100CInstallments','Anzahl Raten',c.cost.installments,'number','min="1"'),fp1100Select('fp1100CRhythm','Ratenrhythmus',c.cost.rhythm||'year',[['month','monatlich'],['quarter','vierteljährlich'],['year','jährlich']]),fp1100MoneyInput('fp1100CCurrentValue','Aktueller / Gutachtenwert',c.cost.currentValue),fp1100Input('fp1100CValuationDate','Bewertungsdatum',c.cost.valuationDate,'date')])}`)}
  ${fp1100Details('2.7 Dokumente / Nachweise',`${fp1100DocRows(c)}<button type="button" onclick="fp1100AddDoc()">+ Dokument</button>`)}
  <div class="fp1100-actions"><button class="primary" onclick="fp1100SaveComponent()">Komponente speichern</button><button onclick="fp1100CancelComponent()">Abbrechen</button></div></div>`;
}
function fp1100CaptureComponent(){
  const c=FP1100.editComponent||fp1100NewComp();c.type=fp1100Get('fp1100CType');c.name=fp1100Get('fp1100CName');c.position=fp1100Get('fp1100CPosition');c.manufacturer=fp1100Get('fp1100CManufacturer');c.model=fp1100Get('fp1100CModel');c.modelType=fp1100Get('fp1100CModelType');c.serial=fp1100Get('fp1100CSerial');c.parentId=fp1100Get('fp1100CParent');
  c.tech=fp1100Arr(c.tech).map((r,i)=>({...r,name:fp1100Get(`fp1100TechName${i}`),value:fp1100Get(`fp1100TechValue${i}`),unit:fp1100Get(`fp1100TechUnit${i}`)}));
  c.connections=fp1100Arr(c.connections).map((r,i)=>({...r,targetId:fp1100Get(`fp1100ConnTarget${i}`),type:fp1100Get(`fp1100ConnType${i}`),possible:fp1100Get(`fp1100ConnPossible${i}`)!=='0',active:fp1100Get(`fp1100ConnActive${i}`)==='1'}));
  c.life={...c.life,purchaseDate:fp1100Get('fp1100CLifePurchase'),installDate:fp1100Get('fp1100CLifeInstall'),commissionDate:fp1100Get('fp1100CLifeCommission'),status:fp1100Get('fp1100CLifeStatus')||'aktiv',removalDate:fp1100Get('fp1100CLifeRemoval'),replacedBy:fp1100Get('fp1100CLifeReplaced'),guaranteeUntil:fp1100Get('fp1100CGuarantee'),warrantyUntil:fp1100Get('fp1100CWarranty'),note:fp1100Get('fp1100CLifeNote')};
  c.maintenance=fp1100Arr(c.maintenance).map((r,i)=>({...r,name:fp1100Get(`fp1100MaintName${i}`),interval:fp1100Get(`fp1100MaintInt${i}`),unit:fp1100Get(`fp1100MaintUnit${i}`),last:fp1100Get(`fp1100MaintLast${i}`),next:fp1100Get(`fp1100MaintNext${i}`),expectedCost:fp1100Get(`fp1100MaintCost${i}`),mandatory:fp1100Get(`fp1100MaintMandatory${i}`)==='mandatory'}));
  c.cost={...c.cost,mode:fp1100Get('fp1100CCostMode'),purchasePrice:fp1100Get('fp1100CPurchasePrice'),paymentMode:fp1100Get('fp1100CPaymentMode'),installments:fp1100Get('fp1100CInstallments'),rhythm:fp1100Get('fp1100CRhythm'),currentValue:fp1100Get('fp1100CCurrentValue'),valuationDate:fp1100Get('fp1100CValuationDate')};
  c.docs=fp1100Arr(c.docs).map((r,i)=>({...r,type:fp1100Get(`fp1100DocType${i}`),name:fp1100Get(`fp1100DocName${i}`),issuer:fp1100Get(`fp1100DocIssuer${i}`),date:fp1100Get(`fp1100DocDate${i}`),validUntil:fp1100Get(`fp1100DocValid${i}`),ref:fp1100Get(`fp1100DocRef${i}`),note:fp1100Get(`fp1100DocNote${i}`)}));
  FP1100.editComponent=c;return c;
}
function fp1100NewComponent(){FP1100.editComponent=fp1100NewComp();fp1100RenderMaster()}
function fp1100EditComponent(id){const x=FP1100.components.find(z=>String(z.id)===String(id));if(x){FP1100.editComponent=fp1100ParseComp(x);fp1100RenderMaster()}}
function fp1100CancelComponent(){FP1100.editComponent=null;fp1100RenderMaster()}
function fp1100AddTech(){fp1100CaptureComponent();FP1100.editComponent.tech.push({name:'',value:'',unit:''});fp1100RenderMaster()}
function fp1100RemoveTech(i){fp1100CaptureComponent();FP1100.editComponent.tech.splice(i,1);fp1100RenderMaster()}
function fp1100AddConnection(){fp1100CaptureComponent();FP1100.editComponent.connections.push({targetId:'',type:'',possible:true,active:false});fp1100RenderMaster()}
function fp1100RemoveConnection(i){fp1100CaptureComponent();FP1100.editComponent.connections.splice(i,1);fp1100RenderMaster()}
function fp1100AddMaintenance(){fp1100CaptureComponent();FP1100.editComponent.maintenance.push({name:'',interval:'',unit:'month',last:'',next:'',expectedCost:'',mandatory:false});fp1100RenderMaster()}
function fp1100RemoveMaintenance(i){fp1100CaptureComponent();FP1100.editComponent.maintenance.splice(i,1);fp1100RenderMaster()}
function fp1100AddDoc(){fp1100CaptureComponent();FP1100.editComponent.docs.push({type:'',name:'',issuer:'',date:'',validUntil:'',ref:'',note:''});fp1100RenderMaster()}
function fp1100RemoveDoc(i){fp1100CaptureComponent();FP1100.editComponent.docs.splice(i,1);fp1100RenderMaster()}
async function fp1100SaveComponent(){
  try{const c=fp1100CaptureComponent();if(!fp1100Text(c.type))return alert('Komponententyp ist erforderlich.');const api=await getCloud(),fields={Title:fp1100CompTitle(c),FahrzeugId:String(S.editVehicleId),Komponententyp:c.type,Bezeichnung:c.name,Position:c.position,Hersteller:c.manufacturer,Modell:c.model,Typ:c.modelType,Seriennummer:c.serial,ElternKomponenteId:c.parentId,TechnischeMerkmaleJson:JSON.stringify(c.tech),VerbindungenJson:JSON.stringify(c.connections),LebenszyklusJson:JSON.stringify(c.life),WartungJson:JSON.stringify(c.maintenance),KostenJson:JSON.stringify(c.cost),DokumenteJson:JSON.stringify(c.docs),Status:c.life.status||'aktiv',Aktiv:true,Testdaten:typeof testFlag==='function'?testFlag():false,AktualisiertAm1100:new Date().toISOString()};if(c.id)await api.updateItemByName('Komponenten1100',c.id,fields);else await api.createItemByName('Komponenten1100',fields);await fp1100LoadVehicle();FP1100.editComponent=null;fp1100RenderMaster()}catch(e){alert('Komponente konnte nicht gespeichert werden: '+e.message)}
}
function fp1100SetTab(tab){if(FP1100.tab==='vehicle'&&document.getElementById('fp1100Name'))fp1100CaptureVehicle();if(FP1100.tab==='components'&&FP1100.editComponent&&document.getElementById('fp1100CType'))fp1100CaptureComponent();FP1100.tab=tab;fp1100RenderMaster()}
function fp1100RenderMaster(){
  head(S.editVehicleId?'Fahrzeugstammdaten':'Neues Fahrzeug',S.editVehicleId?'Fahrzeug · Komponenten / Ausrüstung':'Fahrzeug anlegen');
  app.innerHTML=`<style>
    .fp1100-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.fp1100-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}.fp1100-detail{border-top:1px solid rgba(127,127,127,.25);padding:8px 0}.fp1100-detail summary{cursor:pointer;font-weight:800;font-size:17px;padding:8px 0}.fp1100-detail-body{padding:6px 0}.fp1100-subrow{border:1px solid rgba(127,127,127,.25);border-radius:12px;padding:10px;margin:8px 0}.fp1100-actions{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.fp1100-section-head{display:flex;justify-content:space-between;gap:12px;align-items:end;margin-bottom:12px}.fp1100-section-head b{font-size:20px}.fp1100-comp-card{width:100%;text-align:left;display:flex;flex-direction:column;gap:3px;padding:12px;margin:7px 0}.fp1100-row4{display:grid;grid-template-columns:1.4fr 1fr .7fr auto;gap:8px;align-items:end}.fp1100-info{padding:10px;border-radius:10px;background:rgba(80,120,180,.10);margin:8px 0}.fp1100-warn{padding:10px;border:1px solid currentColor;border-radius:10px;margin:8px 0;font-weight:600}@media(max-width:760px){.fp1100-grid,.fp1100-row4{grid-template-columns:1fr}.fp1100-section-head{align-items:start;flex-direction:column}}
  </style><div class="card" id="fp1100Master"><div class="fp1100-tabs"><button class="${FP1100.tab==='vehicle'?'primary':''}" onclick="fp1100SetTab('vehicle')">Fahrzeug</button><button ${S.editVehicleId?'':'disabled'} class="${FP1100.tab==='components'?'primary':''}" onclick="fp1100SetTab('components')">Komponenten / Ausrüstung</button></div>${FP1100.tab==='vehicle'?fp1100VehicleHtml():(FP1100.editComponent?fp1100ComponentEditor(FP1100.editComponent):fp1100ComponentList())}</div>`;
}

/* EIN gemeinsamer Weg: Neu + Bearbeiten. Die alte vehicleconfigure-UI wird nicht mehr aufgerufen. */
vehicleedit=async function(){
  FP1100.tab='vehicle';FP1100.editComponent=null;app.innerHTML='<div class="card">Stammdaten werden geladen …</div>';
  try{await fp1100LoadVehicle();fp1100RenderMaster()}catch(e){failBox(e,'vehiclesconfig')}
};
vehicleconfigure=async function(){
  if(S.configVehicleId&&!S.editVehicleId)S.editVehicleId=String(S.configVehicleId);
  S.view='vehicleedit';return vehicleedit();
};
/* Alte saveVehicle-Aufrufe auf den neuen gemeinsamen Speicherweg umleiten. */
saveVehicle=async function(){return fp1100SaveVehicle()};

/* Versionsanzeige */
const fp1100MainBase=main;
main=function(){fp1100MainBase();document.title=`Fahrzeugplattform ${FP1100_VERSION}`;const f=document.querySelector('footer');if(f)f.textContent=`Fahrzeugplattform · ${FP1100_VERSION} · © 2026 Entwicklungsstand`};
document.title=`Fahrzeugplattform ${FP1100_VERSION}`;const fp1100Footer=document.querySelector('footer');if(fp1100Footer)fp1100Footer.textContent=`Fahrzeugplattform · ${FP1100_VERSION} · © 2026 Entwicklungsstand`;
