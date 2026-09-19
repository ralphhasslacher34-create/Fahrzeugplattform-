/* MOBIMORY 1.1.0.4c-dev – Smart Capture OCR-Diagnose
   Diagnosepatch auf 1.1.0.4b:
   - zeigt den tatsächlich erkannten OCR-Rohtext nach jedem Fahrzeugscan
   - speichert diesen Rohtext nicht automatisch
   - hält die sichtbare Versionsanzeige nach jedem Render auf dem aktuellen Stand
*/
const FP1104C_VERSION='1.1.0.4c-dev';

(function(){
  if(document.getElementById('fp1104c-style'))return;
  const s=document.createElement('style');
  s.id='fp1104c-style';
  s.textContent=`
    .fp1104c-debug{margin-top:10px}
    .fp1104c-debug summary{cursor:pointer;font-weight:700}
    .fp1104c-debug pre{
      white-space:pre-wrap;
      word-break:break-word;
      max-height:380px;
      overflow:auto;
      padding:10px;
      border:1px solid rgba(120,120,120,.25);
      border-radius:9px;
      background:rgba(80,120,180,.04);
      font-size:.82rem;
      line-height:1.35;
    }
    .fp1104c-debug .muted{margin:6px 0 8px}
  `;
  document.head.appendChild(s);
})();

function fp1104cSetVersion(){
  const f=document.querySelector('footer');
  if(f)f.textContent='Fahrzeugplattform · '+FP1104C_VERSION+' · © 2026 Entwicklungsstand';
}

function fp1104cRenderOcrDebug(){
  const text=String(FP1104?.scan?.text||'');
  let host=document.getElementById('fp1104VehicleReview');
  if(!host)host=document.getElementById('fp1104bDocArea');
  if(!host)return;

  host.querySelector('#fp1104cOcrDebug')?.remove();

  const wrap=document.createElement('div');
  wrap.id='fp1104cOcrDebug';
  wrap.className='card fp1104c-debug';

  const count=text.length;
  const safe=typeof fp1104Esc==='function'
    ? fp1104Esc(text||'(kein OCR-Text erkannt)')
    : String(text||'(kein OCR-Text erkannt)').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  wrap.innerHTML=`
    <details>
      <summary>Was hat MobiMory tatsächlich gelesen?</summary>
      <p class="muted">Nur Diagnoseanzeige · ${count} Zeichen · wird durch diesen Diagnosebereich nicht zusätzlich gespeichert.</p>
      <pre>${safe}</pre>
    </details>
  `;
  host.appendChild(wrap);
}

if(typeof fp1104RunVehicleScan==='function'){
  const fp1104cRunVehicleScanBase=fp1104RunVehicleScan;
  fp1104RunVehicleScan=async function(){
    try{
      return await fp1104cRunVehicleScanBase();
    }finally{
      fp1104cRenderOcrDebug();
      fp1104cSetVersion();
    }
  };
}

/* Versionsanzeige auch nach späteren Render-Vorgängen korrigieren. */
if(typeof render==='function'){
  const fp1104cRenderBase=render;
  render=function(){
    const result=fp1104cRenderBase();
    setTimeout(fp1104cSetVersion,0);
    return result;
  };
}

fp1104cSetVersion();
