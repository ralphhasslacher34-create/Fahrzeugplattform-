/* MOBIMORY 1.1.0.2-dev – Stammdaten Render-Fix
   Basis: 1.1.0.0.
   Ursache: vehicleconfigure() lief weiterhin durch die komplette Legacy-Renderkette
   und haengte die neue Stammdatenansicht erst danach an.
   Fix: Fahrzeug konfigurieren rendert ab hier ausschliesslich die neue 1.1/2.x-
   Stammdatenansicht. Kein CSS-Hide, kein DOM-Nachbearbeiten alter Karten.
*/
const FP1102_VERSION='1.1.0.2-dev';

/* In 1.1.0.0 wird diese Funktion nach dem Rendern aufgerufen. Da die Legacy-
   Ansicht jetzt gar nicht mehr erzeugt wird, ist kein Verstecken mehr noetig. */
fp1100LegacyHide=function(){};

/* Die sichtbare Fahrzeugkonfiguration wird an der Quelle ersetzt.
   WICHTIG: Die bis 1.0.6.x aufgebaute Legacy-Kette wird bewusst NICHT aufgerufen. */
vehicleconfigure=async function(){
  head('Fahrzeug konfigurieren','Stammdaten · Fahrzeug · Komponenten / Ausrüstung');
  app.innerHTML='';

  if(!S.configVehicleId){
    app.innerHTML='<div class="card"><b>Kein Fahrzeug ausgewählt.</b><p class="muted">Bitte zuerst ein Fahrzeug auswählen.</p></div>';
    return;
  }

  try{
    await fp1100Load(true);
    fp1100RenderCard();
  }catch(e){
    console.error('Stammdaten 1.1.0.2 konnten nicht geladen werden',e);
    if(typeof failBox==='function') failBox(e);
    else app.innerHTML=`<div class="card"><b>Stammdaten konnten nicht geladen werden.</b><p>${fp1100Esc(e?.message||e)}</p></div>`;
  }
};

/* Sichtbare Versionskennung. */
const fp1102MainBase=main;
main=function(){
  fp1102MainBase();
  document.title=`Fahrzeugplattform ${FP1102_VERSION}`;
  const f=document.querySelector('footer');
  if(f)f.textContent=`Fahrzeugplattform · ${FP1102_VERSION} · © 2026 Entwicklungsstand`;
};
document.title=`Fahrzeugplattform ${FP1102_VERSION}`;
const fp1102Foot=document.querySelector('footer');
if(fp1102Foot)fp1102Foot.textContent=`Fahrzeugplattform · ${FP1102_VERSION} · © 2026 Entwicklungsstand`;
