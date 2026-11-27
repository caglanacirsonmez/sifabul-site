import {axes,norm,search,compare,supportsAxisQuote,nextQuestions as selectQuestions} from './search.mjs?v=mwzcsp3l';

const axisIds=new Set(axes.map(a=>a.id));
const validAnswer=x=>['better','worse','unknown'].includes(x);
const generic=new Set(['agri','belirti','sikayet','cocuk','cocugum','kizim','oglum','remedi','hasta','hastalik']);
const headingKey=s=>norm(s).replace(/[*_`]/g,'').replace(/\s+/g,' ').trim();

/** Yalnızca kaynak metinlerinden adaylar çıkarır. Eşleşme tıbbi uygunluk değildir. */
export function buildCandidates(records,analysis={},answers={},inventoryIds=[],onlyOwned=false){
 const empty=(reason)=>({candidates:[],excluded:[],initialCount:0,nextQuestion:null,complete:true,reason});
 if(['emergency','urgent'].includes(analysis.safety?.level))return empty(analysis.safety.message||'Kaynak karşılaştırmasından önce sağlık değerlendirmesi gerekir.');
 const remedies=records.filter(r=>r.category==='remedies');
 const ids=new Set();
 const symptomIds=new Set(Array.isArray(analysis.symptomIds)?analysis.symptomIds:[]);
 for(const symptom of records.filter(r=>r.category==='symptoms'&&symptomIds.has(r.id))){
  const headings=new Set([...symptom.original.matchAll(/^###\s+(.+)$/gm)].map(m=>m[1]).concat((symptom.extraRemedies||[]).map(x=>x.title)).map(headingKey));
  for(const r of remedies)if(headings.has(headingKey(r.title)))ids.add(r.id);
 }
 const keywords=(Array.isArray(analysis.keywords)?analysis.keywords:[]).filter(k=>typeof k==='string'&&norm(k).trim().length>=3&&!generic.has(norm(k).trim()));
 // Bir semptom kaynağı remedileri adlandırıyorsa havuzu genel sözcüklerle genişletmeyiz.
 if(!ids.size)for(const keyword of keywords)for(const row of search(remedies,keyword,'remedies'))ids.add(row.record.id);
 if(!ids.size)return empty('Anlatımınızla bağlantısı doğrulanabilen kaynak adayı bulunamadı. Belirtinin yeri veya adını biraz daha açık anlatın; tüm remediler eşleşme sayılmaz.');
 let pool=remedies.filter(r=>ids.has(r.id));
 if(onlyOwned){const owned=new Set(inventoryIds||[]);pool=pool.filter(r=>owned.has(r.id));if(!pool.length)return empty('Bu kaynak adaylarından hiçbiri remedi dolabınızda işaretli değil. Dolap filtresini kaldırarak bütün kaynak adaylarını inceleyebilirsiniz.');}
 const merged={};
 for(const [key,value] of Object.entries({...analysis.answers,...answers}))if(axisIds.has(key)&&validAnswer(value))merged[key]=value;
 const contextSources=records.filter(r=>r.category==='symptoms'&&symptomIds.has(r.id));
 const rows=compare(pool,merged,contextSources);
 const candidates=rows.filter(r=>r.conflicts===0),excluded=rows.filter(r=>r.conflicts>0);
 if(!candidates.length)return {candidates,excluded,initialCount:pool.length,nextQuestion:null,complete:true,reason:'Kaynaklardaki açık modalite ifadeleri yanıtlarınızla çelişti. Bu durum bir tanı değildir; yanıtları ve kaynak ayrıntılarını yeniden inceleyin.'};
 const questions=selectQuestions(candidates.map(r=>r.record),merged,contextSources),question=questions[0]||null;
 const complete=!question;
 return {candidates,excluded,initialCount:pool.length,nextQuestion:question,questions,complete,reason:!question&&candidates.length<=2?'Kaynak incelemesi için az sayıda aday kaldı. Bunlar tedavi önerisi veya doğru remedi sonucu değildir; eksik ve çelişkili bilgileri özgün metinle kontrol edin.':!question?'Kaynakların açık modalite bilgisi daha fazla ayrım sağlamıyor. Listeyi zorla daraltmadan bu adayları koruduk.':'Yalnızca yanıtınızla açıkça çelişen kaynak adayları ayrıldı. Eksik veya iki yönlü bilgiler eleme nedeni değildir.'};
}

const negative=s=>{
 const clauses=norm(s).split(/[,;.!?]|\b(?:ama|fakat|ancak|ve)\b/).map(x=>x.trim()).filter(Boolean);
 const risks=clauses.filter(x=>/kus|ates|nobet|kasil|uyand|ense|gucsuz|bilinc|kafa karis|agri/.test(x));
 return risks.length>0&&risks.every(x=>/\b(yok|yoktu|olmadi|olmuyor|degil|yasamadi|gecirmedi|etmiyor|bulunmuyor|kusmuyor|kusmadi|uyandirmiyor|uyandirmadi)\b/.test(x));
};
/** Modelin alıntılarını kullanıcının metnine ve kataloğa karşı doğrular. */
export function validateIntake(raw,message,records){
 if(!raw||typeof raw.summary!=='string'||!Array.isArray(raw.facts)||!Array.isArray(raw.answers)||!Array.isArray(raw.symptomIds)||!Array.isArray(raw.keywords))throw Error('Anlatım güvenilir biçimde ayrıştırılamadı. Lütfen yeniden deneyin.');
 const quoted=q=>typeof q==='string'&&q.trim().length>=2&&message.includes(q);
 const facts=raw.facts.map(f=>{
  if(!f||typeof f.key!=='string'||typeof f.value!=='string'||!quoted(f.quote))throw Error('YZ, anlatımınızda doğrulanamayan bir ayrıntı üretti. Yeniden deneyin.');
  return {key:f.key.slice(0,60),value:f.value.slice(0,400),quote:f.quote};
 });
 const answers={},conflictedAxes=new Set();
 for(const a of raw.answers){
  if(!axisIds.has(a.axis)||!['better','worse','unknown'].includes(a.value)||!quoted(a.quote))throw Error('Modalite yanıtı anlatımınızla doğrulanamadı.');
  if(!supportsAxisQuote(a.quote,a.axis))continue;
  // "Artmıyor" veya "fark etmiyor" bir iyileşme ifadesi değildir.
  if(/artmiyor|azalmiyor/.test(norm(a.quote)))continue;
  const value=/degismiyor|fark etmiyor|etkilemiyor|bilmiyorum/.test(norm(a.quote))?'unknown':a.value;
  if(conflictedAxes.has(a.axis))continue;
  if(a.axis in answers&&answers[a.axis]!==value){delete answers[a.axis];conflictedAxes.add(a.axis);continue;}
  answers[a.axis]=value;
 }
 const knownSymptoms=new Set(records.filter(r=>r.category==='symptoms').map(r=>r.id));
 const symptomIds=[...new Set(raw.symptomIds.filter(id=>knownSymptoms.has(id)))];
 let ageYears=null;
 if(raw.ageYears!==null){
  if(!Number.isFinite(raw.ageYears)||raw.ageYears<0||raw.ageYears>120||!quoted(raw.ageQuote))throw Error('Yaş bilgisi anlatımınızla doğrulanamadı.');
  const ageMatch=norm(raw.ageQuote).match(/\b(\d{1,3})(?:[.,](\d+))?\s*yas/);
  const monthMatch=norm(raw.ageQuote).match(/\b(\d{1,3})\s*aylik/);
  if(ageMatch){const n=Number(ageMatch[1]+(ageMatch[2]?'.'+ageMatch[2]:''));if(n===raw.ageYears)ageYears=n;}
  else if(monthMatch&&Math.abs(Number(monthMatch[1])/12-raw.ageYears)<0.02)ageYears=raw.ageYears;
  // Yazıyla belirtilen yaş tahmin edilmez; arayüz ayrıca sorabilir.
 }
 let patient='unknown';
 if(ageYears!==null)patient=ageYears<18?'child':'adult';
 else if(['child','adult'].includes(raw.patient)&&quoted(raw.patientQuote)){
  const p=norm(raw.patientQuote);
  if(raw.patient==='child'&&/cocuk|bebek|oglum|kizim/.test(p))patient='child';
  else if(raw.patient==='adult'&&/yetiskin|resit/.test(p))patient='adult';
 }
 let safety={level:['emergency','urgent','check','none'].includes(raw.safety?.level)?raw.safety.level:'check',message:typeof raw.safety?.message==='string'?raw.safety.message:''};
 if(['emergency','urgent'].includes(safety.level)){
  const evidence=raw.safety.evidence;
  if(!Array.isArray(evidence)||!evidence.length||!evidence.every(quoted))throw Error('Acil durum değerlendirmesinin anlatım dayanağı doğrulanamadı.');
  if(evidence.every(negative))safety={level:'check',message:'Anlatımdaki olumsuz ifadeler acil belirti olarak sayılmadı. Belirsiz ayrıntıları doğrulayın.'};
 }
 return {summary:raw.summary.slice(0,1600),keywords:[...new Set(raw.keywords.filter(k=>typeof k==='string'&&k.trim()).map(k=>k.trim().slice(0,80)))].slice(0,8),symptomIds,facts,answers,safety,patient,ageYears};
}
