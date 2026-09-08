/* Fahrzeugplattform M365 Setup 0.3.0
   Provisioniert Phase-1-Listen via SharePoint REST.
   Voraussetzung: gültiger OAuth Bearer Token für die Ziel-Site.
   Das Modul enthält absichtlich keine Zugangsdaten. */
export class FahrzeugplattformM365Setup {
  constructor(siteUrl, accessToken, schema) {
    this.siteUrl = siteUrl.replace(/\/$/, '');
    this.token = accessToken;
    this.schema = schema;
  }
  headers(extra={}) { return { 'Authorization': `Bearer ${this.token}`, 'Accept':'application/json;odata=nometadata', 'Content-Type':'application/json;odata=nometadata', ...extra }; }
  async request(path, options={}) {
    const r=await fetch(this.siteUrl+path,{...options,headers:this.headers(options.headers||{})});
    if(!r.ok){ const t=await r.text(); throw new Error(`${r.status} ${r.statusText}: ${t}`); }
    if(r.status===204) return null; const t=await r.text(); return t?JSON.parse(t):null;
  }
  async listExists(title){
    const r=await fetch(`${this.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(title).replace(/'/g,"''")}')?$select=Id`,{headers:this.headers()});
    return r.ok;
  }
  async ensureList(def){
    if(await this.listExists(def.displayName)) return {name:def.displayName,status:'exists'};
    await this.request('/_api/web/lists',{method:'POST',body:JSON.stringify({Title:def.displayName,BaseTemplate:100,Description:`Fahrzeugplattform Phase 1 – ${def.displayName}`})});
    return {name:def.displayName,status:'created'};
  }
  fieldXml(f){
    const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
    let type=f.type; if(type==='Boolean') type='Boolean'; if(type==='Number') type='Number'; if(type==='Currency') type='Currency'; if(type==='DateTime') type='DateTime'; if(type==='Note') type='Note'; if(type==='Choice') type='Choice'; if(type==='Text') type='Text';
    const req=f.required?'TRUE':'FALSE';
    if(type==='Choice') return `<Field Type="Choice" Name="${esc(f.internalName)}" StaticName="${esc(f.internalName)}" DisplayName="${esc(f.displayName)}" Required="${req}"><CHOICES>${(f.choices||[]).map(c=>`<CHOICE>${esc(c)}</CHOICE>`).join('')}</CHOICES></Field>`;
    return `<Field Type="${type}" Name="${esc(f.internalName)}" StaticName="${esc(f.internalName)}" DisplayName="${esc(f.displayName)}" Required="${req}" />`;
  }
  async fieldExists(listTitle, internalName){
    const url=`${this.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listTitle)}')/fields/getbyinternalnameortitle('${encodeURIComponent(internalName)}')?$select=InternalName`;
    const r=await fetch(url,{headers:this.headers()}); return r.ok;
  }
  async ensureField(list, field){
    if(await this.fieldExists(list.displayName,field.internalName)) return 'exists';
    const path=`/_api/web/lists/getbytitle('${encodeURIComponent(list.displayName)}')/fields/createfieldasxml`;
    await this.request(path,{method:'POST',body:JSON.stringify({parameters:{SchemaXml:this.fieldXml(field),Options:0}})}); return 'created';
  }
  async provision(onProgress=()=>{}){
    const result=[];
    for(const list of this.schema.lists){
      const lr=await this.ensureList(list); onProgress({kind:'list',...lr});
      for(const field of list.fields){ const status=await this.ensureField(list,field); onProgress({kind:'field',list:list.displayName,name:field.internalName,status}); }
      result.push(lr);
    }
    return result;
  }
}
