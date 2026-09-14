/* MOBIMORY 1.1.0.1-dev – Stammdaten Legacy-UI Fix
   Fix: Die neue 1.1–1.6 / 2.1–2.7 Stammdatenansicht ersetzt in der
   Fahrzeugkonfiguration die alte Legacy-Konfiguration vollständig sichtbar.
   Alte Daten/Listen bleiben technisch unangetastet.
*/
const FP1101_VERSION='1.1.0.1-dev';

function fp1101HideLegacyVehicleConfigure(){
  const master=document.getElementById('fp1100-master-card');
  if(!master || !window.app) return;

  /* Alles, was die alte vehicleconfigure()-Ansicht direkt in #app gerendert hat,
     wird nur ausgeblendet. Keine Daten werden gelöscht. */
  Array.from(app.children).forEach(el=>{
    if(el===master) return;
    el.style.display='none';
    el.setAttribute('data-fp1101-legacy-hidden','1');
  });

  /* Neue Stammdatenansicht nach oben holen. */
  if(app.firstElementChild!==master) app.prepend(master);
  master.style.display='block';
}

/* Die 1.1.0.0-Funktion gezielt verschärfen: nicht einzelne Karten erraten,
   sondern die komplette alte Fahrzeugkonfiguration ausblenden. */
fp1100LegacyHide=fp1101HideLegacyVehicleConfigure;

/* Falls der Nutzer beim Laden bereits in der Fahrzeugkonfiguration steht. */
queueMicrotask(()=>{
  try{
    const master=document.getElementById('fp1100-master-card');
    if(master) fp1101HideLegacyVehicleConfigure();
  }catch(e){ console.warn('1.1.0.1 Legacy-Hide',e); }
});

/* Version */
const fp1101MainBase=main;
main=function(){
  fp1101MainBase();
  document.title=`Fahrzeugplattform ${FP1101_VERSION}`;
  const f=document.querySelector('footer');
  if(f) f.textContent=`Fahrzeugplattform · ${FP1101_VERSION} · © 2026 Entwicklungsstand`;
};
document.title=`Fahrzeugplattform ${FP1101_VERSION}`;
const fp1101Foot=document.querySelector('footer');
if(fp1101Foot) fp1101Foot.textContent=`Fahrzeugplattform · ${FP1101_VERSION} · © 2026 Entwicklungsstand`;
