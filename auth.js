/* Fahrzeugplattform OAuth/PKCE 0.4.2 - kein Client-Secret im Browser */
window.FPAuth = (() => {
  const cfg = {
    clientId: '80d881f4-943f-4465-bba2-e9a7a1b02edc',
    tenant: 'ralphyourway.onmicrosoft.com',
    redirectUri: 'https://ralphhasslacher34-create.github.io/Fahrzeugplattform-/',
    scopes: ['openid','profile','User.Read','Sites.Read.All','Sites.Manage.All']
  };
  const enc = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  async function sha256(s){ return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); }
  function random(n=64){ const a=new Uint8Array(n); crypto.getRandomValues(a); return enc(a); }
  async function login(){
    const verifier=random(64), state=random(24), challenge=enc(await sha256(verifier));
    sessionStorage.setItem('fp_pkce_verifier',verifier); sessionStorage.setItem('fp_oauth_state',state);
    const p=new URLSearchParams({client_id:cfg.clientId,response_type:'code',redirect_uri:cfg.redirectUri,response_mode:'query',scope:cfg.scopes.join(' '),state,code_challenge:challenge,code_challenge_method:'S256'});
    location.href=`https://login.microsoftonline.com/${encodeURIComponent(cfg.tenant)}/oauth2/v2.0/authorize?${p}`;
  }
  async function handleRedirect(){
    const u=new URL(location.href), code=u.searchParams.get('code'); if(!code) return null;
    const state=u.searchParams.get('state'), expected=sessionStorage.getItem('fp_oauth_state');
    if(!expected||state!==expected) throw new Error('OAuth-State stimmt nicht überein.');
    const verifier=sessionStorage.getItem('fp_pkce_verifier');
    const body=new URLSearchParams({client_id:cfg.clientId,grant_type:'authorization_code',code,redirect_uri:cfg.redirectUri,code_verifier:verifier,scope:cfg.scopes.join(' ')});
    const r=await fetch(`https://login.microsoftonline.com/${encodeURIComponent(cfg.tenant)}/oauth2/v2.0/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
    const j=await r.json(); if(!r.ok) throw new Error(j.error_description||j.error||'Token konnte nicht abgerufen werden.');
    sessionStorage.setItem('fp_graph_token',j.access_token); sessionStorage.setItem('fp_graph_token_exp',String(Date.now()+(j.expires_in||3600)*1000));
    window.history.replaceState({}, document.title, cfg.redirectUri); return j.access_token;
  }
  function token(){ const exp=Number(sessionStorage.getItem('fp_graph_token_exp')||0); return exp>Date.now()+30000?sessionStorage.getItem('fp_graph_token'):null; }
  function logout(){ sessionStorage.removeItem('fp_graph_token'); sessionStorage.removeItem('fp_graph_token_exp'); }
  return {cfg,login,handleRedirect,token,logout};
})();
