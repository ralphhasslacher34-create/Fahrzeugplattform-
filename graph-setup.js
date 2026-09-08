/* Fahrzeugplattform M365 Setup 1.0.3 via Microsoft Graph v1.0 */
window.FPGraphSetup = class {
  constructor(token, siteUrl, schema){ this.token=token; this.siteUrl=siteUrl.replace(/\/$/,''); this.schema=schema; this.base='https://graph.microsoft.com/v1.0'; }
  async req(path,opt={}){ const r=await fetch(this.base+path,{...opt,headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json',...(opt.headers||{})}}); const t=await r.text(); let j=null; try{j=t?JSON.parse(t):null}catch{} if(!r.ok) throw new Error(`${r.status} ${r.statusText}${j?.error?.message?': '+j.error.message:t?': '+t:''}`); return j; }
  async resolveSite(){ const u=new URL(this.siteUrl); const p=u.pathname.replace(/^\//,''); const s=await this.req(`/sites/${u.hostname}:/${p}?$select=id,displayName,webUrl`); this.site=s; return s; }
  canon(v){ return String(v??'').trim().toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]/g,''); }
  async lists(){ const r=await this.req(`/sites/${encodeURIComponent(this.site.id)}/lists?$select=id,displayName,name`); return r.value||[]; }
  resolveListFromCache(all,name){
    const c=this.canon(name);
    const def=(this.schema?.lists||[]).find(d=>this.canon(d.internalName)===c||this.canon(d.displayName)===c);
    const aliases=[name,def?.internalName,def?.displayName].filter(Boolean).map(x=>this.canon(x));
    return all.find(x=>aliases.includes(this.canon(x.name))||aliases.includes(this.canon(x.displayName)));
  }
  async listByName(name){ const all=await this.lists(); const l=this.resolveListFromCache(all,name); if(!l) throw new Error(`SharePoint-Liste ${name} wurde nicht gefunden.`); return l; }
  async listItemsByName(name){ const l=await this.listByName(name); const r=await this.req(`/sites/${encodeURIComponent(this.site.id)}/lists/${encodeURIComponent(l.id)}/items?expand=fields&$top=200`); return r.value||[]; }
  async getItemByName(name,id){ const l=await this.listByName(name); return this.req(`/sites/${encodeURIComponent(this.site.id)}/lists/${encodeURIComponent(l.id)}/items/${encodeURIComponent(id)}?expand=fields`); }
  async mapFields(l,fields){
    const blocked=new Set(['DocIcon','Created','Modified','Author','Editor','Attachments','ContentType','Edit','LinkTitle','LinkTitleNoMenu','_UIVersionString']);
    const cols=await this.columns(l.id), mapped={};
    for(const [key,val] of Object.entries(fields)){
      if(key==='Title'){ mapped.Title=val; continue; }
      let c=cols.find(x=>x.name===key && !blocked.has(x.name) && x.readOnly!==true);
      if(!c) c=cols.find(x=>x.displayName===key && !blocked.has(x.name) && x.readOnly!==true);
      if(!c) throw new Error(`Beschreibbares Feld '${key}' wurde in ${l.displayName} nicht gefunden. Bitte Microsoft 365 Setup erneut ausführen.`);
      mapped[c.name]=val;
    }
    return mapped;
  }
  async createItemByName(name,fields){ const l=await this.listByName(name); const mapped=await this.mapFields(l,fields); return this.req(`/sites/${encodeURIComponent(this.site.id)}/lists/${encodeURIComponent(l.id)}/items`,{method:'POST',body:JSON.stringify({fields:mapped})}); }
  async updateItemByName(name,id,fields){ const l=await this.listByName(name); const mapped=await this.mapFields(l,fields); return this.req(`/sites/${encodeURIComponent(this.site.id)}/lists/${encodeURIComponent(l.id)}/items/${encodeURIComponent(id)}/fields`,{method:'PATCH',body:JSON.stringify(mapped)}); }
  async deleteItemByName(name,id){ const l=await this.listByName(name); return this.req(`/sites/${encodeURIComponent(this.site.id)}/lists/${encodeURIComponent(l.id)}/items/${encodeURIComponent(id)}`,{method:'DELETE'}); }
  async columns(listId){ const r=await this.req(`/sites/${encodeURIComponent(this.site.id)}/lists/${encodeURIComponent(listId)}/columns?$select=id,name,displayName,readOnly,hidden`); return r.value||[]; }
  column(f){ const c={name:f.internalName,displayName:f.displayName,required:!!f.required}; switch(f.type){case 'Boolean':c.boolean={};break;case 'Number':c.number={};break;case 'Currency':c.currency={locale:'de-DE'};break;case 'DateTime':c.dateTime={format:'dateTime'};break;case 'Choice':c.choice={allowTextEntry:false,choices:f.choices||[],displayAs:'dropDownMenu'};break;case 'Note':c.text={allowMultipleLines:true};break;default:c.text={allowMultipleLines:false};} return c; }
  async ensureList(def,cache){ let l=this.resolveListFromCache(cache,def.internalName)||this.resolveListFromCache(cache,def.displayName); if(l) return {...l,status:'exists'}; l=await this.req(`/sites/${encodeURIComponent(this.site.id)}/lists`,{method:'POST',body:JSON.stringify({displayName:def.displayName,list:{template:'genericList'}})}); cache.push(l); return {...l,status:'created'}; }
  async ensureField(list,field,colCache){ let c=colCache.find(x=>x.name===field.internalName ||x.displayName===field.displayName); if(c) return 'exists'; c=await this.req(`/sites/${encodeURIComponent(this.site.id)}/lists/${encodeURIComponent(list.id)}/columns`,{method:'POST',body:JSON.stringify(this.column(field))}); colCache.push(c); return 'created'; }
  async provision(progress=()=>{}){
    if(!this.site) await this.resolveSite();
    const cache=await this.lists(); let lc=0,fc=0;
    for(const def of this.schema.lists){
      const l=await this.ensureList(def,cache); if(l.status==='created')lc++;
      progress({kind:'list',name:def.displayName,status:l.status});
      const cols=await this.columns(l.id);
      for(const f of def.fields){
        const st=await this.ensureField(l,f,cols); if(st==='created')fc++;
        progress({kind:'field',list:def.displayName,name:f.internalName,status:st});
      }
    }
    const finalLists=await this.lists(),missing=[];
    for(const def of this.schema.lists){
      if(!this.resolveListFromCache(finalLists,def.internalName)) missing.push(`${def.internalName} / ${def.displayName}`);
    }
    if(missing.length) throw new Error(`Setup-Verifikation fehlgeschlagen. Nicht erreichbar: ${missing.join(', ')}`);
    return {listsCreated:lc,fieldsCreated:fc,totalLists:this.schema.lists.length,verifiedLists:this.schema.lists.length};
  }
};
