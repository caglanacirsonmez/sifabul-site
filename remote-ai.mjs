// Canlı sitede YZ: kullanıcının kendi API anahtarıyla OpenAI uyumlu uç noktaya (varsayılan aiforyu) tarayıcıdan istek.
// Anahtar yalnız bu tarayıcının localStorage'ında durur; depoya veya yayına girmez.
// Talimat yerel Codex sürümüyle aynıdır (ai-prompt.mjs); alıntılar yine özgün kaynakla doğrulanır (quote-check.mjs).
import {instruction} from './ai-prompt.mjs?v=mwkskr2r';
import {verifyCitations} from './quote-check.mjs?v=mwkskr2r';
import {REFERENCE_NOTE} from './references.mjs?v=mwkskr2r';

const STORE='sifabul-remote-ai';
export const DEFAULT_BASE='https://xfraoziegesiumubeegp.supabase.co/functions/v1/api';

// Önce bu tarayıcıda kaydedilen anahtar; yoksa şifreli yayına gömülü site anahtarı (gate.mjs çözer).
export function getRemote(){let v=null;try{v=JSON.parse(localStorage.getItem(STORE)||'null');}catch{}if(!v?.key)v=globalThis.SIFABUL_SITE_AI||null;return v?.key?{base:v.base||DEFAULT_BASE,key:v.key,model:v.model||'',site:v===globalThis.SIFABUL_SITE_AI}:null;}
export function setRemote(value){try{if(value)localStorage.setItem(STORE,JSON.stringify(value));else localStorage.removeItem(STORE);}catch{}}

const headers=key=>({'Authorization':'Bearer '+key,'Content-Type':'application/json'});
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
 const r=await call(base.replace(/\/$/,'')+'/v1/models',{headers:headers(key)});
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
 const body={messages:[{role:'system',content:system},{role:'user',content:user}],stream:true,temperature:0.2};
 body.model=settings.model||(await listModels(settings))[0];if(!body.model)throw Error('YZ servisi model bildirmedi.');
 const r=await call(settings.base.replace(/\/$/,'')+'/v1/chat/completions',{method:'POST',headers:headers(settings.key),body:JSON.stringify(body)});
 if(!r.ok)throw await failure(r);
 const raw=extractJson(await readCompletion(r,onProgress));
 if(typeof raw.summary!=='string'||!Array.isArray(raw.citations))throw Error('Kaynaklı yanıt alınamadı; sentez gösterilmedi.');
 const {verified,unverified}=verifyCitations(raw.citations,selected);
 if(!verified.length)throw Error('YZ alıntıları özgün kaynakla doğrulanamadı; sentez gösterilmedi. Yeniden deneyin.');
 return {summary:raw.summary,question:typeof raw.question==='string'?raw.question:'',citations:verified,unverified};
}
