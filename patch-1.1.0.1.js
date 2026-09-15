/* MOBIMORY 1.1.0.1-dev – Komponenten/Fahrzeug-Zuordnung sichtbar
   Basis: sauberer 1.1.0.0-Rebuild auf 1.0.6.15.
   Reiner UI-Fix: zeigt in Komponentenliste und Komponentenmaske eindeutig das zugehörige Fahrzeug.
   Die technische Zuordnung über FahrzeugId bleibt unverändert.
*/
const FP1101_VERSION='1.1.0.1-dev';

function fp1101VehicleContext(){
  const d=FP1100?.vehicleData||{};
  const i=d.identity||{};
  const name=fp1100Text(i.name)||fp1100Text(FP1100?.vehicleItem?.fields?.Fahrzeugname)||fp1100Text(FP1100?.vehicleItem?.fields?.Title)||'Unbenanntes Fahrzeug';
  const profile=fp1100Text(i.profile)||fp1100Text(FP1100?.vehicleItem?.fields?.Profil)||'';
  return `<div class="fp1100-info fp1101-vehicle-context"><div class="muted">Zugeordnetes Fahrzeug</div><b>Fahrzeug: ${fp1100Esc(name)}</b>${profile?`<div class="muted">${fp1100Esc(profile)}</div>`:''}</div>`;
}

const fp1101ComponentListBase=fp1100ComponentList;
fp1100ComponentList=function(){
  return fp1101VehicleContext()+fp1101ComponentListBase();
};

const fp1101ComponentEditorBase=fp1100ComponentEditor;
fp1100ComponentEditor=function(c){
  return fp1101VehicleContext()+fp1101ComponentEditorBase(c);
};
