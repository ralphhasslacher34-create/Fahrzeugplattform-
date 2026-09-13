/* MOBIMORY 1.0.6.12-dev – Kartenfix Block 1
   - Leaflet-Vektor-SVG wird nicht mehr von der Fallback-Grafik-CSS verzerrt
   - GPX-Route erhält eine klare sichtbare Linie
   - Start, Ziel, Wetterpunkte und aktuelle GPS-Position werden eindeutig gefärbt
   - keine neue Datenstruktur / kein neues M365-Schema
*/
const FP10612_VERSION='1.0.6.12-dev';

(function fp10612Style(){
  if(document.getElementById('fp10612-style'))return;
  const s=document.createElement('style');
  s.id='fp10612-style';
  s.textContent=`
    /* 1.0.6.10 setzt alle SVG in der Kartenbox auf 100% x 100%.
       Das ist für unsere eigene Fallback-Grafik richtig, aber für Leaflets
       internes Vektor-SVG falsch. Leaflet muss seine berechneten SVG-Maße behalten. */
    .fp10610-map .leaflet-pane > svg,
    .fp10610-map .leaflet-overlay-pane svg,
    .fp10610-map svg.leaflet-zoom-animated {
      width:auto !important;
      height:auto !important;
      max-width:none !important;
      max-height:none !important;
    }
    .fp10610-map .leaflet-overlay-pane svg { overflow:visible; }
    .fp10610-map .leaflet-overlay-pane path { vector-effect:non-scaling-stroke; }
  `;
  document.head.appendChild(s);
})();

function fp10612RepairMap(){
  try{
    const host=document.getElementById('fp10610RouteMap');
    if(!host)return;
    const map=FP10610?.maps?.[host.id];
    if(!map||!window.L)return;

    map.eachLayer(layer=>{
      try{
        /* Die eigentliche GPX-Linie ist die normale Polyline, nicht CircleMarker. */
        if(layer instanceof L.Polyline && !(layer instanceof L.Polygon) && !(layer instanceof L.CircleMarker)){
          layer.setStyle({color:'#005bbb',weight:6,opacity:.95,lineCap:'round',lineJoin:'round'});
          if(typeof layer.bringToFront==='function')layer.bringToFront();
          return;
        }
        if(layer instanceof L.CircleMarker){
          const text=String(layer.getTooltip?.()?.getContent?.()||'');
          if(text.startsWith('Start:')) layer.setStyle({color:'#ffffff',weight:3,fillColor:'#16a34a',fillOpacity:1});
          else if(text.startsWith('Ziel:')) layer.setStyle({color:'#ffffff',weight:3,fillColor:'#111827',fillOpacity:1});
          else if(text.includes('Aktuelle GPS-Position')) layer.setStyle({color:'#ffffff',weight:3,fillColor:'#dc2626',fillOpacity:1});
          else if(text.includes('Wetterpunkt')||text.startsWith('Ziel · ETA')) layer.setStyle({color:'#ffffff',weight:2,fillColor:'#f59e0b',fillOpacity:.95});
        }
      }catch(e){}
    });
    try{map.invalidateSize(false)}catch(e){}
  }catch(e){console.warn('Kartenfix 1.0.6.12',e)}
}

/* Jede neue Kartenzeichnung direkt nachbearbeiten. */
const fp10612RenderMapBase=fp10610RenderMap;
fp10610RenderMap=async function(usageId,active=false){
  await fp10612RenderMapBase(usageId,active);
  fp10612RepairMap();
  setTimeout(fp10612RepairMap,80);
};

/* Falls 1.0.6.11 beim Laden bereits die aktuelle Ansicht gerendert hat. */
setTimeout(fp10612RepairMap,120);
setTimeout(fp10612RepairMap,500);

/* Versionsanzeige sauber auf 1.0.6.12 ziehen, ohne die 1.0.6.11-UI umzubauen. */
const fp10612MainBase=main;
main=function(){
  fp10612MainBase();
  document.title=`Fahrzeugplattform ${FP10612_VERSION}`;
  const f=document.querySelector('footer');if(f)f.textContent=`Fahrzeugplattform · ${FP10612_VERSION} · © 2026 Entwicklungsstand`;
};
document.title=`Fahrzeugplattform ${FP10612_VERSION}`;
const fp10612Foot=document.querySelector('footer');if(fp10612Foot)fp10612Foot.textContent=`Fahrzeugplattform · ${FP10612_VERSION} · © 2026 Entwicklungsstand`;
