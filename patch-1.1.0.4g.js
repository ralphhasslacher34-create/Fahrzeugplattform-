/* MOBIMORY 1.1.0.4g-dev – Führerschein-Scanner UX + Zonen-Korrektur
   Änderungen:
   - Kartenrahmen deutlich kleiner, immer vollständig sichtbar
   - feste Lesebereiche Feld 1/2/3 anhand 1.1.0.4f-Diagnose korrigiert
   - klare Seitenfortschrittsmeldung nach jeder Aufnahme / Dateiauswahl
   - Vorderseite kann im aktuellen Identitätstest bereits ausgewertet werden
   - Rückseite bleibt Teil des vollständigen Führerschein-Scans
*/
const FP1104G_VERSION='1.1.0.4g-dev';

(function(){
  if(document.getElementById('fp1104g-style'))return;
  const s=document.createElement('style');s.id='fp1104g-style';s.textContent=`
    /* Deutlich kleiner als 1.1.0.4f. Höhe begrenzt zusätzlich auf kleinen Displays. */
    .fp1104f-guide{
      width:min(72vw,720px,calc(58vh * 1.5857725)) !important;
      max-width:72vw !important;
      top:46% !important;
      border-width:3px !important;
    }
    .fp1104f-camhint{
      bottom:12px !important;
      max-width:82% !important;
      font-size:.92rem;
    }
    .fp1104g-flow{
      margin:10px 0 4px;
      padding:12px 13px;
      border-radius:10px;
      background:rgba(80,120,180,.08);
      border:1px solid rgba(80,120,180,.18);
    }
    .fp1104g-flow.ok{background:rgba(35,150,75,.09);border-color:rgba(35,150,75,.25)}
    .fp1104g-flow b{display:block;margin-bottom:3px}
    .fp1104g-flow .actions{margin-top:8px}
    .fp1104g-progress{font-size:.84rem;opacity:.72;margin-top:3px}
    @media(max-width:720px){
      .fp1104f-guide{
        width:min(74vw,calc(54vh * 1.5857725)) !important;
        max-width:74vw !important;
      }
    }
  `;document.head.appendChild(s);
})();

/* Zonen aus dem echten 1.1.0.4f-Test:
   2 lag bereits im Bereich von Feld 3, 3 im Bereich 4c.
   Deshalb enger und nach oben; außerdem links weiter öffnen, da Nachname angeschnitten war. */
if(window.FP1104F?.template?.front){
  FP1104F.template.front.zones={
    lastName:{label:'1 · Nachname',x:.305,y:.170,w:.665,h:.072,psm:7},
    firstName:{label:'2 · Vorname',x:.305,y:.238,w:.665,h:.072,psm:7},
    birth:{label:'3 · Geburtsdatum/-ort',x:.305,y:.300,w:.665,h:.078,psm:7}
  };
}

function fp1104gSetVersion(){
  const f=document.querySelector('footer');
  if(f)f.textContent='Fahrzeugplattform · '+FP1104G_VERSION+' · © 2026 Entwicklungsstand';
  const sub=document.getElementById('sub');
  if(sub && /Smart Capture/i.test(sub.textContent||'')){
    sub.textContent=(sub.textContent||'').replace(/1\.1\.0\.4[a-z]?/ig,'1.1.0.4g');
  }
}

function fp1104gFlowHtml(context){
  return `<div id="fp1104g-flow-${context}" class="fp1104g-flow" role="status" aria-live="polite">
    <b>Noch keine Seite aufgenommen.</b>
    <div class="fp1104g-progress">Bitte mit der Vorderseite beginnen.</div>
  </div>`;
}

/* Statusbereich in die bestehende Führerschein-Erfassung einfügen. */
if(typeof fp1104fLicenceCaptureHtml==='function'){
  const fp1104gLicenceCaptureBase=fp1104fLicenceCaptureHtml;
  fp1104fLicenceCaptureHtml=function(context,schema){
    let html=fp1104gLicenceCaptureBase(context,schema);
    const pos=html.lastIndexOf('</div>');
    if(pos>=0)html=html.slice(0,pos)+fp1104gFlowHtml(context)+html.slice(pos);
    return html;
  };
}

function fp1104gPages(context){
  try{return fp1104dPages(context)||[]}catch{return[]}
}
function fp1104gCaptured(context){
  const st=FP1104D?.captures?.[context],pages=fp1104gPages(context);
  return pages.map(p=>({page:p,slot:st?.slots?.[p.key]}));
}
function fp1104gActionButton(context){
  if(context==='newperson')return document.querySelector('button[onclick="fp1104RunNewPersonScan()"]');
  if(context==='identity')return document.querySelector('button[onclick="fp1104RunIdentityCheck()"]');
  if(context==='qualification')return document.querySelector('button[onclick="fp1104RunQualificationScan()"]');
  return null;
}
function fp1104gUpdateFlow(context){
  const box=document.getElementById('fp1104g-flow-'+context);
  const rows=fp1104gCaptured(context);
  if(!box||!rows.length)return;
  const done=rows.filter(x=>!!x.slot),missing=rows.filter(x=>x.page.required&&!x.slot);
  const total=rows.filter(x=>x.page.required).length||rows.length;
  const count=rows.filter(x=>x.page.required&&x.slot).length;
  const btn=fp1104gActionButton(context);

  if(!done.length){
    box.className='fp1104g-flow';
    box.innerHTML='<b>Noch keine Seite aufgenommen.</b><div class="fp1104g-progress">Bitte mit der Vorderseite beginnen.</div>';
    if(btn)btn.textContent='Ergebnis prüfen';
    return;
  }

  if(missing.length){
    const next=missing[0].page;
    box.className='fp1104g-flow';
    box.innerHTML=`<b>✓ ${fp1104Esc(done[done.length-1].page.label)} aufgenommen · ${count}/${total}</b>
      <div>Bitte jetzt <b>${fp1104Esc(next.label)}</b> scannen.</div>
      ${context==='newperson'&&FP1104D.captures[context]?.slots?.front?'<div class="fp1104g-progress">Für unseren aktuellen Identitätstest kannst du die Vorderseitendaten bereits testweise prüfen.</div>':''}
      <div class="actions"><button type="button" onclick="fp1104fOpenCamera('${context}','${next.key}','${fp1104Esc(next.label)}')">${fp1104Esc(next.label)} jetzt scannen</button></div>`;
    if(btn)btn.textContent=context==='newperson'&&FP1104D.captures[context]?.slots?.front?'Vorderseite testweise prüfen':'Ergebnis prüfen';
    return;
  }

  box.className='fp1104g-flow ok';
  box.innerHTML=`<b>✓ Scan fertig · ${count}/${total} Seiten vollständig</b>
    <div>Dokument vollständig erfasst. Bitte jetzt das Ergebnis prüfen.</div>`;
  if(btn)btn.textContent='Ergebnis prüfen';
}

/* Nach Aufnahme klare Meldung setzen. */
if(typeof fp1104fShoot==='function'){
  const fp1104gShootBase=fp1104fShoot;
  fp1104fShoot=async function(){
    const context=FP1104F.context;
    await fp1104gShootBase();
    setTimeout(()=>fp1104gUpdateFlow(context),0);
  };
}

/* Auch Dateiimport bekommt dieselbe Seitenführung. */
if(typeof fp1104fPickFile==='function'){
  const fp1104gPickFileBase=fp1104fPickFile;
  fp1104fPickFile=async function(context,pageKey,input){
    await fp1104gPickFileBase(context,pageKey,input);
    setTimeout(()=>fp1104gUpdateFlow(context),0);
  };
}

/* Bei jedem Render vorhandene Erfassungsstände wieder sichtbar machen. */
if(typeof fp1104dRenderCapture==='function'){
  const fp1104gRenderCaptureBase=fp1104dRenderCapture;
  fp1104dRenderCapture=function(context,host,schema=null){
    const r=fp1104gRenderCaptureBase(context,host,schema);
    setTimeout(()=>fp1104gUpdateFlow(context),0);
    return r;
  };
}

/* Für den aktuellen Test nur Vorderseite für Felder 1/2/3 verlangen.
   Rückseite bleibt im Seitenstatus als Pflichtseite des vollständigen Dokuments sichtbar. */
if(typeof fp1104fExtractIdentity==='function'){
  fp1104fExtractIdentity=async function(context,statusId){
    const st=FP1104D.captures[context];if(!st)throw new Error('Scan fehlt.');
    const front=st.slots.front?.blob;
    if(!front)throw new Error('Vorderseite fehlt.');
    FP1104F.lastZoneDebug=[];
    const z=FP1104F.template.front.zones;
    const lastRaw=await fp1104fOcrZone(front,'lastName',z.lastName,statusId);
    const firstRaw=await fp1104fOcrZone(front,'firstName',z.firstName,statusId);
    const birthRaw=await fp1104fOcrZone(front,'birth',z.birth,statusId);
    return {
      lastName:fp1104fCleanLine(lastRaw,'1'),
      firstName:fp1104fCleanLine(firstRaw,'2'),
      birthDate:fp1104fFindDate(birthRaw),
      birthPlace:'',
      documentNumber:'',
      expiryDate:'',
      classes:[],
      qualifications:[],
      _birthRaw:fp1104fCleanLine(birthRaw,'3')
    };
  };
}

/* Kamerahinweis präziser. */
if(typeof fp1104fOpenCamera==='function'){
  const fp1104gOpenCameraBase=fp1104fOpenCamera;
  fp1104fOpenCamera=async function(context,pageKey,pageLabel){
    await fp1104gOpenCameraBase(context,pageKey,pageLabel);
    const hint=document.querySelector('.fp1104f-camhint');
    if(hint)hint.textContent='Alle vier Kartenecken müssen sichtbar im weißen Rahmen liegen. Rundherum darf etwas Abstand bleiben.';
  };
}

/* Version auch im Kopfbereich nach älteren Patch-Renderern korrigieren. */
if(typeof render==='function'){
  const fp1104gRenderBase=render;
  render=function(){
    const r=fp1104gRenderBase();
    setTimeout(()=>{
      fp1104gSetVersion();
      ['newperson','identity','qualification'].forEach(fp1104gUpdateFlow);
    },0);
    return r;
  };
}
fp1104gSetVersion();
