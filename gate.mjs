// Şifreli yayın girişi (yalnız scripts/build-pages.mjs çıktısında kullanılır).
// data.json.enc ve memory-snapshot.json.enc dosyalarını şifreyle açar, sonra uygulamayı yükler.
// Biçim: salt(16) | iv(12) | AES-GCM(gzip(düz metin)), PBKDF2-SHA256 600000 tur.
const ITERATIONS=600000,STORE='sifabul-key';
const files=['data.json','memory-snapshot.json'];
const enc=Object.fromEntries(await Promise.all(files.map(async name=>{const r=await fetch(name+'.enc',{cache:'no-cache'});if(!r.ok)throw Error(name+' yüklenemedi');return [name,new Uint8Array(await r.arrayBuffer())];})));
// Siteye gömülü YZ ayarı (isteğe bağlı): aynı anahtarla şifreli aiforyu anahtarı ve modeli.
// İsteğe bağlı şifreli dosyalar: gömülü YZ ayarı ve klasik kaynak bankası.
for(const name of ['ai.json','references.json','methods.json']){const r=await fetch(name+'.enc',{cache:'no-cache'}).catch(()=>null);if(r?.ok)enc[name]=new Uint8Array(await r.arrayBuffer());}
const salt=enc['data.json'].slice(0,16);
const b64=bytes=>btoa(String.fromCharCode(...bytes)),unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));

async function keyFrom(password){
 const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},base,{name:'AES-GCM',length:256},true,['decrypt']);
}
async function open(key){
 const plain={};
 for(const name of Object.keys(enc)){
  const buf=enc[name];
  const gz=await crypto.subtle.decrypt({name:'AES-GCM',iv:buf.slice(16,28)},key,buf.slice(28));
  plain[name]=await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
 }
 return plain;
}
function start(plain){
 const data=JSON.parse(plain['data.json']);
 if(plain['ai.json'])try{globalThis.SIFABUL_SITE_AI=JSON.parse(plain['ai.json']);}catch{}
 const nativeFetch=window.fetch.bind(window);
 window.fetch=(input,init)=>{
  const url=new URL(typeof input==='string'?input:input.url,location.href);
  for(const name of Object.keys(plain))if(name!=='ai.json'&&url.origin===location.origin&&url.pathname.endsWith('/'+name))return Promise.resolve(new Response(plain[name],{headers:{'Content-Type':'application/json'}}));
  return nativeFetch(input,init);
 };
 // "Markdown indir" bağlantıları açık kaynak dosyasına gider; yayında yoktur, şifresi çözülmüş metinden indirilir.
 document.addEventListener('click',event=>{
  const a=event.target.closest?.('a[href^="sources/"]');if(!a)return;
  const record=data.records.find(r=>r.download===a.getAttribute('href'));if(!record)return;
  event.preventDefault();const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([record.original],{type:'text/markdown'}));link.download=record.download.split('/').pop();link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
 },true);
 document.getElementById('gate')?.remove();
 return import('./app.mjs?v=mwxw1cj3');
}

async function tryStored(){
 try{const raw=localStorage.getItem(STORE);if(!raw)return false;const key=await crypto.subtle.importKey('raw',unb64(raw),'AES-GCM',false,['decrypt']);await start(await open(key));return true;}
 catch{try{localStorage.removeItem(STORE);}catch{}return false;}
}

function showGate(){
 const style=document.createElement('style');
 style.textContent=`#gate{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:16px;background:radial-gradient(circle at 30% 20%,rgba(198,243,109,.12),transparent 55%),#07110d;color:#e8f4ec;font-family:system-ui,sans-serif}
#gate form{width:min(360px,100%);display:grid;gap:14px;padding:28px;border-radius:24px;background:rgba(206,255,224,.05);border:1px solid rgba(206,255,224,.14)}
#gate h1{margin:0;font:700 26px ui-rounded,system-ui}#gate p{margin:0;color:#b7cbbf;font-size:14px}
#gate input[type=password]{padding:14px 18px;border-radius:999px;border:1px solid rgba(206,255,224,.2);background:rgba(0,0,0,.3);color:inherit;font-size:16px}
#gate input[type=password]:focus{outline:2px solid #c6f36d;outline-offset:2px}
#gate label{display:flex;gap:8px;align-items:center;font-size:14px;color:#b7cbbf}
#gate button{padding:14px;border:0;border-radius:999px;background:#c6f36d;color:#11200a;font-weight:700;font-size:15px;cursor:pointer}
#gate button:disabled{opacity:.6}#gate .err{color:#ff9a85;min-height:1.2em}`;
 document.head.append(style);
 const gate=document.createElement('div');gate.id='gate';
 gate.innerHTML=`<form><h1>Şifa Bul</h1><p>Devam etmek için şifreyi girin.</p><input type="password" autocomplete="current-password" aria-label="Şifre" required autofocus><label><input type="checkbox" checked> Bu cihazda hatırla</label><button type="submit">Aç</button><p class="err" role="alert"></p></form>`;
 document.body.append(gate);
 const form=gate.querySelector('form'),input=form.querySelector('input[type=password]'),remember=form.querySelector('input[type=checkbox]'),button=form.querySelector('button'),err=form.querySelector('.err');
 input.focus();
 form.onsubmit=async event=>{
  event.preventDefault();button.disabled=true;button.textContent='Açılıyor…';err.textContent='';
  try{
   const key=await keyFrom(input.value);let plain;
   try{plain=await open(key);}catch{throw Error('Şifre yanlış.');}
   if(remember.checked){try{localStorage.setItem(STORE,b64(new Uint8Array(await crypto.subtle.exportKey('raw',key))));}catch{}}
   await start(plain);
  }catch(e){err.textContent=e.message;button.disabled=false;button.textContent='Aç';input.select();}
 };
}

if(!(await tryStored()))showGate();
