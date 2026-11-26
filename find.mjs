// Hızlı bulma yardımcıları: serbest yazıdan semptom kaynağı eşleme ve remedi modalite profili. DOM kullanmaz; testlenebilir.
import {axes,norm,evidence} from './search.mjs?v=mwxfylfz';

const tokens=s=>norm(s).replace(/[^a-z0-9çğıöşü\s]/g,' ').split(/\s+/).filter(t=>t.length>=2);
const stem=t=>t.slice(0,Math.max(3,Math.min(4,t.length)));
// Gündelik ifadeleri kaynak başlıklarına bağlayan küçük eş anlamlılar listesi.
const synonyms={grip:'influenza',nezle:'soguk alginligi',alerji:'saman nezlesi',bulanti:'kusma',regl:'adet',stres:'anksiyete',kaygi:'anksiyete',endise:'anksiyete',uyuyamama:'uykusuzluk',bocek:'isiriklar sokmalar',ari:'sokmalar',donme:'vertigo',sersemlik:'vertigo',yanik:'yaniklari',burkulma:'burkulma',morarma:'darbe carpma',dusme:'darbe dusme',kirik:'kemik kiriklari',aft:'agiz ici yaralar aftlar',bademcik:'tonsiller',tonsil:'tonsiller',gaz:'kolik',karin:'mide agrisi kolik',sanci:'kolik',kramp:'kolik',ates:'ates',corona:'covid',korona:'covid',yorgunluk:'tukenmislik zihinsel yorgunluk',halsizlik:'tukenmislik',hemoroid:'hemoroidler',basur:'hemoroidler',idrar:'sistit',mesane:'sistit',sinus:'sinuzit',akinti:'geniz akintisi',kanama:'kanamasi',kalp:'carpinti',ishal:'ishal'};
// Eş anlamlısı tam eşleşen sözcüğün kendi önek eşleşmesi zayıflatılır ("stres" → Streptokok değil Anksiyete).
const expand=q=>{const out=[];for(const t of q){const exact=synonyms[t],s=exact||Object.entries(synonyms).find(([k])=>t.startsWith(k)&&k.length>=4)?.[1];out.push(exact&&exact!==t?{weak:t}:t);if(s&&s!==t)out.push(...tokens(s).map(x=>({syn:x})));}return out;};
const word=t=>typeof t==='string'?t:t.syn||t.weak;
const factor=t=>typeof t==='string'?10:t.syn?8:2;

/** Yazılan şikâyeti semptom kaynak başlıklarıyla eşler. "baş ağrısı" → "Baş Ağrıları" gibi ek farklarını tolere eder; nadir sözcükler daha ağırdır. */
export function matchSymptoms(records,query){
 const q=tokens(query);if(!q.length)return [];
 const symptoms=records.filter(r=>r.category==='symptoms').map(record=>({record,title:tokens(record.title)}));
 const hits=(t,title)=>{const s=stem(t);return title.some(w=>w.startsWith(s)||s.startsWith(stem(w)));};
 const terms=expand(q);
 const weight=new Map(terms.map(t=>{const w=word(t);return [w,1/Math.max(1,symptoms.filter(x=>hits(w,x.title)).length)];}));
 const phrase=norm(query).trim();
 return symptoms.map(({record,title})=>{
  let hit=0,score=0;
  for(const t of terms){const w=word(t);if(hits(w,title)){if(typeof t==='string'||t.weak)hit++;score+=weight.get(w)*factor(t);}}
  if(!score)return null;
  score+=(norm(record.title).includes(phrase)?6:0)+(hit===q.length?3:0)-title.length*.1;
  return {record,score,complete:hit===q.length};
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.record.title.localeCompare(b.record.title,'tr'));
}

/** Bir remedinin seçilen semptom bağlamında her eksendeki yönü: worse (artıyor), better (azalıyor), both (iki yönlü). */
export function remedyProfile(record,contextSources=[]){
 const profile=new Map();
 for(const axis of axes){const ev=evidence(record,axis,contextSources);if(!ev.length)continue;const effects=new Set(ev.map(x=>x.effect));profile.set(axis.id,{axis,effect:effects.size>1?'both':[...effects][0],evidence:ev});}
 return profile;
}

/** Listedeki remediler için eksen başına artıyor/azalıyor sayıları. Ayrıştırma gücüne göre sıralanır. */
export function axisSummary(profiles){
 const rows=new Map();
 for(const profile of profiles)for(const [id,p] of profile){const row=rows.get(id)||{axis:p.axis,worse:0,better:0};if(p.effect!=='better')row.worse++;if(p.effect!=='worse')row.better++;rows.set(id,row);}
 return [...rows.values()].sort((a,b)=>Math.min(b.worse,b.better)-Math.min(a.worse,a.better)||(b.worse+b.better)-(a.worse+a.better));
}
