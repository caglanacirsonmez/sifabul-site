// Canlı sitede YZ: API anahtarıyla tarayıcıdan istek. Claude anahtarı (sk-ant-…) Claude Messages API'sine,
// diğerleri OpenAI uyumlu uç noktaya (varsayılan aiforyu) gider.
// Anahtar yalnız bu tarayıcının localStorage'ında durur; depoya veya yayına girmez.
// Talimat yerel Codex sürümüyle aynıdır (ai-prompt.mjs); alıntılar yine özgün kaynakla doğrulanır (quote-check.mjs).
import {instruction} from './ai-prompt.mjs?v=mwl49cw1';
import {verifyCitations} from './quote-check.mjs?v=mwl49cw1';
import {REFERENCE_NOTE} from './references.mjs?v=mwl49cw1';

const STORE='sifabul-remote-ai';
export const DEFAULT_BASE='https://xfraoziegesiumubeegp.supabase.co/functions/v1/api';
export const CLAUDE_BASE='https://api.anthropic.com';
export const CLAUDE_MODEL='claude-opus-5-5';
const CLAUDE_VERSION='2026-10-21';
const CLAUDE_FALLBACK_BETA='server-side-fallback-2026-07-01';

/** Claude anahtarı ya da Anthropic adresi mi? */
export function isClaude({base='',key=''}={}){return /^sk-ant-/.test(key)||(()=>{try{return /(^|\.)anthropic\.com$/i.test(new URL(base).hostname);}catch{return false;}})();}
/** Claude anahtarı aiforyu adresiyle (veya adressiz) verilirse Claude adresine geçer. */
export function resolveBase(base,key){return /^sk-ant-/.test(key||'')&&(!base||base===DEFAULT_BASE)?CLAUDE_BASE:(base||DEFAULT_BASE);}
/** Modeli seçer: Claude'da varsayılan Claude Opus 5.5, diğer servislerde ilk izinli model. */
export function pickModel(models,settings,keep=''){if(keep&&models.includes(keep))return keep;if(isClaude(settings))return CLAUDE_MODEL;return models[0]||'';}

// Önce bu tarayıcıda kaydedilen anahtar; yoksa şifreli yayına gömülü site anahtarı (gate.mjs çözer).
export function getRemote(){let v=null;try{v=JSON.parse(localStorage.getItem(STORE)||'null');}catch{}if(!v?.key)v=globalThis.SIFABUL_SITE_AI||null;return v?.key?{base:resolveBase(v.base,v.key),key:v.key,model:v.model||'',site:v===globalThis.SIFABUL_SITE_AI}:null;}
export function setRemote(value){try{if(value)localStorage.setItem(STORE,JSON.stringify(value));else localStorage.removeItem(STORE);}catch{}}

const headers=key=>({'Authorization':'Bearer '+key,'Content-Type':'application/json'});
// Tarayıcıdan doğrudan Claude API'si: anthropic-dangerous-direct-browser-access CORS iznini açar.
const claudeHeaders=(key,beta)=>({'x-api-key':key,'anthropic-version':CLAUDE_VERSION,'anthropic-dangerous-direct-browser-access':'true','Content-Type':'application/json',...(beta?{'anthropic-beta':beta}:{})});
async function failure(response){
 let detail='';try{const j=await response.json();detail=j.error?.message||j.error||j.message||'';}catch{}
 if(response.status===401)return Error('API anahtarı geçersiz.');
 if(response.status===403)return Error('Hesap bu API için onaylı değil.');
 if(response.status===429)return Error('Kullanım sınırına ulaşıldı. Biraz sonra deneyin.');
 if(response.status===503)return Error('YZ sunucusu şu an kapalı.');
 return Error('YZ yanıt vermedi ('+response.status+(detail?': '+detail:'')+').');
}
async function call(url,init){
 try{return await fetch(url,init);}
 catch{throw Error('YZ sunucusuna bağlanılamadı (ağ veya CORS izni).');}
}

/** İzinli modeller. Anahtarı denemek için de kullanılır. */
export async function listModels({base=DEFAULT_BASE,key}){
 const r=await call(base.replace(/\/$/,'')+'/v1/models',{headers:isClaude({base,key})?claudeHeaders(key):headers(key)});
 if(!r.ok)throw await failure(r);
 const j=await r.json();return (j.data||[]).map(m=>m.id).filter(Boolean);
}

// Akışlı yanıtı (SSE) birleştirir; akış yoksa tek parça JSON'u okur.
async function readCompletion(response,onProgress){
 if(!(response.headers.get('content-type')||'').includes('event-stream')){const j=await response.json();return j.choices?.[0]?.message?.content||'';}
 const reader=response.body.pipeThrough(new TextDecoderStream()).getReader();let buffer='',text='';
 for(;;){
  const {value,done}=await reader.read();if(done)break;buffer+=value;
  let i;while((i=buffer.indexOf('\n'))>=0){
   const line=buffer.slice(0,i).trim();buffer=buffer.slice(i+1);
   if(!line.startsWith('data:'))continue;const data=line.slice(5).trim();if(data==='[DONE]')continue;
   try{const j=JSON.parse(data);if(j.error)throw Error(j.error.message||String(j.error));const piece=j.choices?.[0]?.delta?.content||'';if(piece){text+=piece;onProgress?.(text.length);}}
   catch(e){if(e instanceof SyntaxError)continue;throw e;}
  }
 }
 return text;
}

// Claude akışını (SSE) birleştirir: yalnız metin parçaları alınır; düşünce ve geri dönüş blokları atlanır.
async function readClaude(response,onProgress){
 let text='',stop='';
 const take=j=>{
  if(j.type==='error')throw Error('YZ hatası: '+(j.error?.message||'bilinmeyen'));
  if(j.type==='content_block_delta'&&j.delta?.type==='text_delta'&&j.delta.text){text+=j.delta.text;onProgress?.(text.length);}
  if(j.type==='message_delta'&&j.delta?.stop_reason)stop=j.delta.stop_reason;
 };
 if(!(response.headers.get('content-type')||'').includes('event-stream')){const j=await response.json();stop=j.stop_reason||'';text=(j.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');}
 else{
  const reader=response.body.pipeThrough(new TextDecoderStream()).getReader();let buffer='';
  for(;;){
   const {value,done}=await reader.read();if(done)break;buffer+=value;
   let i;while((i=buffer.indexOf('\n'))>=0){
    const line=buffer.slice(0,i).trim();buffer=buffer.slice(i+1);
    if(!line.startsWith('data:'))continue;let j;try{j=JSON.parse(line.slice(5).trim());}catch{continue;}take(j);
   }
  }
 }
 if(stop==='refusal')throw Error('Claude bu isteği güvenlik nedeniyle yanıtlamadı.');
 if(stop==='max_tokens'&&!text)throw Error('YZ yanıtı yarım kaldı.');
 return text;
}

/** Model metninden ilk JSON nesnesini çıkarır (kod çiti, düşünce etiketi veya ön söz olabilir). */
export function extractJson(text){
 const clean=String(text).replace(/<think>[\s\S]*?<\/think>/g,'').replace(/```(?:json)?/gi,'');
 const start=clean.indexOf('{');if(start<0)throw Error('YZ yanıtı JSON değil.');
 let depth=0,inString=false,escape=false;
 for(let i=start;i<clean.length;i++){
  const c=clean[i];
  if(inString){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')inString=false;continue;}
  if(c==='"')inString=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0)return JSON.parse(clean.slice(start,i+1));
 }
 throw Error('YZ yanıtı yarım kaldı.');
}

/** Yerel /api/synthesize ile aynı sonucu döndürür: {summary, question, citations, unverified}. */
export async function remoteSynth({ids,question,detail,refs=[]},records,settings,onProgress){
 if(!Array.isArray(ids)||!ids.length||ids.length>5)throw Error('En fazla 5 kaynak seçin.');
 const selected=[...new Set(ids)].map(id=>records.find(r=>r.id===id));if(selected.some(x=>!x))throw Error('Bilinmeyen kaynak.');
 selected.push(...refs);
 const system=instruction+(refs.length?' '+REFERENCE_NOTE:'')+(detail?' Detay modu.':' Kısa mod. En fazla 80 kelime.')+
  ' Yanıtı YALNIZCA şu biçimde tek bir JSON nesnesi olarak ver, başka metin ekleme: {"summary": "madde madde Türkçe yanıt", "question": "tek ayırt edici soru", "citations": [{"id": "kaynak id", "quote": "kaynakta harfiyen geçen kısa ifade"}]}';
 const user=JSON.stringify({question:String(question).slice(0,2500),sources:selected.map(r=>({id:r.id,title:r.title,url:r.url,text:r.original}))});
 const base=settings.base.replace(/\/$/,'');let text;
 if(isClaude(settings)){
  // Claude Opus 5.5'te düşünme hep açıktır; temperature gönderilmez. Güvenlik reddinde sunucu tarafı yedek model devreye girer.
  const body={model:settings.model||CLAUDE_MODEL,max_tokens:16000,system,messages:[{role:'user',content:user}],stream:true,fallbacks:'default'};
  const r=await call(base+'/v1/messages',{method:'POST',headers:claudeHeaders(settings.key,CLAUDE_FALLBACK_BETA),body:JSON.stringify(body)});
  if(!r.ok)throw await failure(r);
  text=await readClaude(r,onProgress);
 }else{
  const body={messages:[{role:'system',content:system},{role:'user',content:user}],stream:true,temperature:0.2};
  body.model=settings.model||(await listModels(settings))[0];if(!body.model)throw Error('YZ servisi model bildirmedi.');
  const r=await call(base+'/v1/chat/completions',{method:'POST',headers:headers(settings.key),body:JSON.stringify(body)});
  if(!r.ok)throw await failure(r);
  text=await readCompletion(r,onProgress);
 }
 const raw=extractJson(text);
 if(typeof raw.summary!=='string'||!Array.isArray(raw.citations))throw Error('Kaynaklı yanıt alınamadı; sentez gösterilmedi.');
 const {verified,unverified}=verifyCitations(raw.citations,selected);
 if(!verified.length)throw Error('YZ alıntıları özgün kaynakla doğrulanamadı; sentez gösterilmedi. Yeniden deneyin.');
 return {summary:raw.summary,question:typeof raw.question==='string'?raw.question:'',citations:verified,unverified};
}
