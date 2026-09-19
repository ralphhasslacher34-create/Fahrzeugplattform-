/* MOBIMORY 1.1.0.4a-dev – M365 Setup 409 Field Conflict Hotfix
   Macht die additive SharePoint-Feldanlage wirklich wiederholbar.
*/
const FP1104A_VERSION='1.1.0.4a-dev';

(function(){
  if(!window.FPGraphSetup?.prototype)return;

  const proto=window.FPGraphSetup.prototype;
  const baseEnsureField=proto.ensureField;

  proto.ensureField=async function(list,field,colCache){
    const same=(a,b)=>this.canon?this.canon(a)===this.canon(b):String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase();

    let c=(colCache||[]).find(x=>
      same(x.name,field.internalName) ||
      same(x.displayName,field.displayName) ||
      same(x.name,field.displayName) ||
      same(x.displayName,field.internalName)
    );
    if(c)return'exists';

    try{
      return await baseEnsureField.call(this,list,field,colCache);
    }catch(e){
      const msg=String(e?.message||e||'');
      if(!/409\s+Conflict/i.test(msg) || !/field with the specified name already exists/i.test(msg))throw e;

      // SharePoint kann interne Namen normalisieren/encodieren oder ein Feld bereits aus
      // einem vorherigen, teilweise erfolgreichen Setup besitzen. Deshalb nach 409 frisch lesen.
      const fresh=await this.columns(list.id);
      if(Array.isArray(colCache)){
        colCache.splice(0,colCache.length,...fresh);
      }
      c=fresh.find(x=>
        same(x.name,field.internalName) ||
        same(x.displayName,field.displayName) ||
        same(x.name,field.displayName) ||
        same(x.displayName,field.internalName)
      );
      if(c)return'exists';

      // Graph meldet bei POST /columns genau diesen 409, wenn der Name bereits belegt ist.
      // In einem additiven/repeatable Setup ist das kein Abbruchgrund.
      return'exists';
    }
  };

  const f=document.querySelector('footer');
  if(f)f.textContent='Fahrzeugplattform · '+FP1104A_VERSION+' · © 2026 Entwicklungsstand';
})();
