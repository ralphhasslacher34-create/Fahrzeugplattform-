/* Fahrzeugplattform M365 Setup 1.0.3 via Microsoft Graph v1.0
   Provisionierung ist absichtlich additiv und idempotent:
   vorhandene Listen/Felder werden wiederverwendet, fehlende ergänzt. */
window.FPGraphSetup = class {
  constructor(token, siteUrl, schema){
    this.token=token;
    this.siteUrl=siteUrl.replace(/\/$/,'');
    this.schema=schema;
    this.base='https://graph.microsoft.com/v1.0';
  }

  async req(path,opt={}){
    const url=/^https?:\/\//i.test(path)?path:this.base+path;
    const r=await fetch(url,{
      ...opt,
      headers:{
        Authorization:`Bearer ${this.token}`,
        'Content-Type':'application/json',
        ...(opt.headers||{})
      }
    });

    const t=await r.text();
    let j=null;
    try{ j=t?JSON.parse(t):null; }catch{}

    if(!r.ok){
      const e=new Error(
        `${r.status} ${r.statusText}${
          j?.error?.message?': '+j.error.message:t?': '+t:''
        }`
      );
      e.status=r.status;
      e.body=j??t;
      e.url=url;
      throw e;
    }

    return j;
  }

  async resolveSite(){
    const u=new URL(this.siteUrl);
    const p=u.pathname.replace(/^\//,'');
    const s=await this.req(
      `/sites/${u.hostname}:/${p}?$select=id,displayName,webUrl`
    );
    this.site=s;
    return s;
  }

  canon(v){
    return String(v??'')
      .trim()
      .toLowerCase()
      .replace(/ä/g,'ae')
      .replace(/ö/g,'oe')
      .replace(/ü/g,'ue')
      .replace(/ß/g,'ss')
      .replace(/[^a-z0-9]/g,'');
  }

  async paged(path){
    const out=[];
    let next=path;

    while(next){
      const r=await this.req(next);
      if(Array.isArray(r?.value)) out.push(...r.value);
      next=r?.['@odata.nextLink']||null;
    }

    return out;
  }

  async lists(){
    return this.paged(
      `/sites/${encodeURIComponent(this.site.id)}/lists?$select=id,displayName,name`
    );
  }

  resolveListFromCache(all,name){
    const c=this.canon(name);

    const def=(this.schema?.lists||[]).find(
      d=>
        this.canon(d.internalName)===c ||
        this.canon(d.displayName)===c
    );

    const aliases=[
      name,
      def?.internalName,
      def?.displayName
    ]
      .filter(Boolean)
      .map(x=>this.canon(x));

    return all.find(
      x=>
        aliases.includes(this.canon(x.name)) ||
        aliases.includes(this.canon(x.displayName))
    );
  }

  async listByName(name){
    const all=await this.lists();
    const l=this.resolveListFromCache(all,name);

    if(!l){
      throw new Error(
        `SharePoint-Liste ${name} wurde nicht gefunden.`
      );
    }

    return l;
  }

  async listItemsByName(name){
    const l=await this.listByName(name);
    const r=await this.req(
      `/sites/${encodeURIComponent(this.site.id)}`+
      `/lists/${encodeURIComponent(l.id)}`+
      `/items?expand=fields&$top=200`
    );

    return r.value||[];
  }

  async getItemByName(name,id){
    const l=await this.listByName(name);

    return this
