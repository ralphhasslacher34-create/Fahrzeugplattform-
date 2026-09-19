/* MOBIMORY 1.1.0.4b-dev – Smart Capture geführte Fahrzeug-Dokumenterkennung
   Hotfix/Weiterentwicklung auf 1.1.0.4a.
   Ablauf: Fahrzeugwelt -> passende Dokumentgruppe -> Scan.
   Keine Suche mehr quer durch Straßen- und Wasserfahrzeugdokumente.
*/
const FP1104B_VERSION='1.1.0.4b-dev';

(function(){
  if(document.getElementById('fp1104b-style'))return;
  const s=document.createElement('style');
  s.id='fp1104b-style';
  s.textContent=`
    .fp1104b-family{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}
    .fp1104b-family button{padding:16px;text-align:left}
    .fp1104b-family button.active{outline:2px solid currentColor;font-weight:800}
    .fp1104b-candidates{margin:8px 0;padding:10px;border-radius:9px;background:rgba(80,120,180,.06)}
    .fp1104b-candidates span{display:inline-block;margin:3px 5px 3px 0;padding:3px 7px;border:1px solid rgba(120,120,120,.25);border-radius:999px;font-size:.8rem}
    @media(max-width:650px){.fp1104b-family{grid-template-columns:1fr}}
  `;
  document.head.appendChild(s);
})();

function fp1104bConfiguredVehicleSchemas(family){
  const c=FP1104.config||fp1104LoadLocalConfig();
  const all=(FP1104.catalog?.schemas||[]).filter(s=>s.domain==='vehicle');
  const tag=family==='water'?'water_vehicle':'road_vehicle';
  const countries=new Set([...(c.vehicleCountries||[]),'EU']);
  const enabled=new Set(c.enabledSchemas||[]);
  return all
    .filter(s=>countries.has(s.country)&&s.appliesTo?.includes(tag))
    .sort((a,b)=>(enabled.has(b.key)?1:0)-(enabled.has(a.key)?1:0)||String(a.documentType).localeCompare(String(b.documentType),'de'));
}

function fp1104bStrongScore(text,schema){
  const u=String(text||'').toUpperCase();
  let score=0, hits=0;
  for(const raw of schema?.detect||[]){
    const k=String(raw||'').toUpperCase();
    if(!k)continue;
    if(u.includes(k)){
      hits++;
      // Lange/eindeutige Begriffe zählen stärker als kurze Feldcodes.
      score += k.length>=12 ? 3 : k.length>=5 ? 2 : 1;
    }
  }
  return {score,hits};
}

function fp1104bDetectAmong(text,rows){
  const ranked=(rows||[]).map(s=>({schema:s,...fp1104bStrongScore(text,s)}))
    .sort((a,b)=>b.score-a.score||b.hits-a.hits);
  const first=ranked[0],second=ranked[1];
  if(!first || first.score<2)return {schema:null,ranked,reason:'low'};
  if(second && first.score===second.score && first.hits===second.hits)return {schema:null,ranked,reason:'tie'};
  return {schema:first.schema,ranked,reason:'ok'};
}

function fp1104bSchemaOptions(rows){
  return `<option value="">Automatisch innerhalb dieser Fahrzeugwelt</option>`+
    rows.map(s=>`<option value="${fp1104Esc(s.key)}">${fp1104Esc(s.documentType)}${String(s.status).startsWith('ready')?'':' · Details teilweise offen'}</option>`).join('');
}

function fp1104bCandidateBadges(rows){
  return rows.map(s=>`<span>${fp1104Esc(s.documentType)}</span>`).join('');
}

function fp1104bSelectFamily(family){
  FP1104.scan.vehicleFamily=family;
  FP1104.scan.schema=null;
  FP1104.scan.parsed=null;
  const rows=fp1104bConfiguredVehicleSchemas(family);
  document.querySelectorAll('[data-fp1104b-family]').forEach(b=>b.classList.toggle('active',b.dataset.fp1104bFamily===family));
  const area=document.getElementById('fp1104bDocArea');
  if(!area)return;
  area.innerHTML=`
    <div class="section">2 · Dokument eingrenzen</div>
    <p class="muted">MobiMory betrachtet jetzt nur noch Dokumente für <b>${family==='water'?'Wasserfahrzeuge':'Straßenfahrzeuge'}</b>.</p>
    <div class="fp1104b-candidates"><b>In Frage kommen:</b><br>${fp1104bCandidateBadges(rows)||'Für diese Konfiguration ist noch kein Dokumenttyp hinterlegt.'}</div>
    <div class="field">
      <label>Dokumentart</label>
      <select id="fp1104bSchemaSelect">${fp1104bSchemaOptions(rows)}</select>
    </div>
    <div class="field">
      <label>Dokumentfoto(s)</label>
      <input id="fp1104VehicleFiles" type="file" accept="image/*" capture="environment" multiple>
    </div>
    <div class="fp1104-progress"><div id="fp1104-ocrbar"></div></div>
    <div id="fp1104VehicleStatus" class="fp1104-status">Bereit.</div>
    <button class="primary" onclick="fp1104RunVehicleScan()">Scannen und Fahrzeug erkennen</button>
  `;
  const review=document.getElementById('fp1104VehicleReview');
  if(review)review.innerHTML='';
}

fp1104VehicleView=async function(){
  head('Fahrzeug aus Dokument','Smart Capture · geführt · 1.1.0.4b');
  await fp1104TryCloudConfig();
  await fp1104LoadCatalog();
  FP1104.scan={mode:'vehicle',personId:'',phase:'family',text:'',schema:null,parsed:null,files:[],identityOk:false,vehicleFamily:''};

  const c=FP1104.config||fp1104LoadLocalConfig();
  const allowRoad=!!c.vehicleTypes?.road;
  const allowWater=!!c.vehicleTypes?.water;

  app.innerHTML=`
    <div class="card">
      <div class="section first">1 · Welche Art Fahrzeug?</div>
      <p class="muted">Diese Auswahl begrenzt die Dokumenterkennung bereits vor dem Scan.</p>
      <div class="fp1104b-family">
        ${allowRoad?`<button type="button" data-fp1104b-family="road" onclick="fp1104bSelectFamily('road')"><b>Straßenfahrzeug</b><span class="muted">z. B. PKW, Motorrad, Wohnmobil, LKW</span></button>`:''}
        ${allowWater?`<button type="button" data-fp1104b-family="water" onclick="fp1104bSelectFamily('water')"><b>Wasserfahrzeug</b><span class="muted">z. B. Motorboot, Segelboot, Ruderboot</span></button>`:''}
      </div>
      ${!allowRoad&&!allowWater?'<div class="fp1104-status"><b>Keine Fahrzeugwelt aktiviert.</b> Bitte zuerst unter Dokumente & Smart Capture konfigurieren.</div>':''}
      <div id="fp1104bDocArea"></div>
    </div>
    <div id="fp1104VehicleReview"></div>
  `;
};

fp1104RunVehicleScan=async function(){
  const status=document.getElementById('fp1104VehicleStatus');
  try{
    const family=FP1104.scan.vehicleFamily;
    if(!family)throw new Error('Bitte zuerst Straßen- oder Wasserfahrzeug auswählen.');

    const files=[...(document.getElementById('fp1104VehicleFiles')?.files||[])];
    if(!files.length)throw new Error('Bitte mindestens ein Dokumentfoto auswählen.');
    FP1104.scan.files=files;

    const rows=fp1104bConfiguredVehicleSchemas(family);
    if(!rows.length)throw new Error('Für diese Fahrzeugwelt ist in der aktuellen Konfiguration kein Dokumenttyp hinterlegt.');

    const text=await fp1104OcrFiles(files,'fp1104VehicleStatus');
    FP1104.scan.text=text;

    const selectedKey=document.getElementById('fp1104bSchemaSelect')?.value||'';
    let schema=null;

    if(selectedKey){
      schema=rows.find(x=>x.key===selectedKey)||null;
      if(!schema)throw new Error('Die ausgewählte Dokumentart ist nicht mehr verfügbar.');
    }else{
      const det=fp1104bDetectAmong(text,rows);
      schema=det.schema;
      if(!schema){
        const ranked=det.ranked.slice(0,3).filter(x=>x.score>0);
        const names=ranked.map(x=>x.schema.documentType).join(' / ');
        if(status)status.innerHTML=`<b>Dokument innerhalb der gewählten Fahrzeugwelt nicht eindeutig erkannt.</b>${names?` Mögliche Treffer: ${fp1104Esc(names)}.`:''} Bitte oben die Dokumentart auswählen und erneut scannen.`;
        return;
      }
    }

    FP1104.scan.schema=schema;
    const isRoad=schema.extractor==='de-zb1'||schema.extractor==='de-zb2'||schema.appliesTo?.includes('road_vehicle');
    const parsed=isRoad?fp1104ParseZB(text):fp1104ParseWatercraft(text);
    FP1104.scan.parsed=parsed;

    if(status)status.innerHTML=`Erkannt/verwendet: <b>${fp1104Esc(schema.documentType)}</b>`;
    fp1104RenderVehicleReview(parsed,schema);
  }catch(e){
    if(status)status.textContent='Fehler: '+(e?.message||e);
  }
};

// Sichtbarer Versionsstand: der zuletzt geladene Patch gewinnt.
(function(){
  const f=document.querySelector('footer');
  if(f)f.textContent='Fahrzeugplattform · '+FP1104B_VERSION+' · © 2026 Entwicklungsstand';
})();
