export const norm=s=>String(s).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
export function search(records,q,category='all'){
 const terms=norm(q).split(/\s+/).filter(Boolean);
 return records.filter(r=>category==='all'||r.category===category).map(r=>{
  const title=norm(r.title), body=norm(r.original);
  const score=terms.reduce((n,t)=>n+(title.includes(t)?20:0)+(body.includes(t)?1:0),0);
  return {record:r,score};
 }).filter(x=>!terms.length||terms.every(t=>norm(x.record.original+' '+x.record.title).includes(t)))
 .sort((a,b)=>b.score-a.score||a.record.title.localeCompare(b.record.title,'tr'));
}
// Tek katalog: ilk anlatım, soru motoru ve dosya hafızası aynı eksenleri kullanır.
export const axes=[
 {id:'movement',label:'Hareket',question:'Hareket etmek şikâyeti nasıl etkiliyor?',terms:['hareket','efor','yurume','egzersiz']},
 {id:'rest',label:'Dinlenme',question:'Dinlenmek veya hareketsiz kalmak nasıl etkiliyor?',terms:['dinlen','hareketsiz','istirahat']},
 {id:'heat',label:'Sıcak ortam / uygulama',question:'Sıcak ortam veya sıcak uygulama şikâyeti nasıl etkiliyor?',terms:['sicak','sicag','ilik','isi uygul','ortam isisi']},
 {id:'cold',label:'Soğuk / serinlik',question:'Soğuk uygulama veya serin ortam şikâyeti nasıl etkiliyor?',terms:['soguk','sogug','serin']},
 {id:'pressure',label:'Basınç',question:'Bölgeye basınç uygulanması nasıl etkiliyor?',terms:['basinc','baski']},
 {id:'night',label:'Gece',question:'Gece saatlerinde şikâyet nasıl değişiyor?',terms:['gece']},
 {id:'air',label:'Açık hava',question:'Açık havada olmak nasıl etkiliyor?',terms:['acik hava','temiz hava']},
 {id:'light',label:'Işık',question:'Işık şikâyeti nasıl etkiliyor?',terms:['isik','isig']},
 {id:'noise',label:'Ses / gürültü',question:'Ses veya gürültü şikâyeti nasıl etkiliyor?',terms:['gurultu','sesle','sesler','sese']},
 {id:'touch',label:'Dokunma',question:'Hafifçe dokunmak şikâyeti nasıl etkiliyor?',terms:['dokun']},
 {id:'jarring',label:'Sarsıntı',question:'Sarsıntı veya sallanma şikâyeti nasıl etkiliyor?',terms:['sarsin','sallan','sallayin']},
 {id:'bending',label:'Eğilme',question:'Öne eğilmek şikâyeti nasıl etkiliyor?',terms:['egil']},
 {id:'lying',label:'Uzanma',question:'Uzanmak veya yatmak şikâyeti nasıl etkiliyor?',terms:['uzan','yatma','yatinca','yatmak','yatarken']},
 {id:'morning',label:'Sabah',question:'Sabah saatlerinde şikâyet nasıl değişiyor?',terms:['sabah']},
 {id:'evening',label:'Akşam',question:'Akşam saatlerinde şikâyet nasıl değişiyor?',terms:['aksam']},
 {id:'mentalEffort',label:'Zihinsel efor',question:'Zihinsel efor veya yoğun düşünmek şikâyeti nasıl etkiliyor?',terms:['zihinsel efor','mental efor','zihinsel yorgun','zihinsel calis','dusunsel efor']},
 {id:'humidity',label:'Nemli hava',question:'Nemli veya rutubetli hava şikâyeti nasıl etkiliyor?',terms:['nemli','rutubet']},
 {id:'wind',label:'Rüzgâr',question:'Rüzgâra maruz kalmak şikâyeti nasıl etkiliyor?',terms:['ruzgar']},
 {id:'sunlight',label:'Güneş',question:'Güneşe maruz kalmak şikâyeti nasıl etkiliyor?',terms:['gunes']},
 {id:'eating',label:'Yemek sonrası',question:'Yemekten sonra şikâyet nasıl değişiyor?',terms:['yemekten sonra','yemek yedikten','yemek sonrasi']},
 {id:'sleep',label:'Uyku',question:'Uyumak şikâyeti nasıl etkiliyor?',terms:['uykuyla','uyumak','uyku ile','bir uyku']},
 {id:'afterSleep',label:'Uyandıktan sonra',question:'Uyandıktan sonra şikâyet nasıl değişiyor?',terms:['uyuduktan sonra','uykudan sonra','uyandiktan','uyaninca']},
 {id:'warmDrink',label:'Sıcak içecek',question:'Sıcak içecekler şikâyeti nasıl etkiliyor?',terms:['sicak icecek','sicak icme','sicak su ic','sicak sivi']},
 {id:'coldDrink',label:'Soğuk içecek',question:'Soğuk içecekler şikâyeti nasıl etkiliyor?',terms:['soguk icecek','soguk icme','soguk su ic','soguk sivi']},
 {id:'firstMovement',label:'İlk hareket',question:'Dinlenme sonrası ilk hareket şikâyeti nasıl etkiliyor?',terms:['ilk hareket','harekete basla']},
 {id:'continuedMovement',label:'Hareketi sürdürme',question:'Hareket etmeyi sürdürünce şikâyet nasıl değişiyor?',terms:['devam eden hareket','surekli hareket','harekete devam','hareket ettikce']}
];
function matchesAxis(text,axis){
 let n=norm(text);
 if(axis.id==='movement'){
  n=n.replaceAll('hareketsiz','');
  if(/ilk hareket|harekete basla|devam eden hareket|surekli hareket|harekete devam|hareket ettikce/.test(n))return false;
 }
 if(axis.id==='pressure')n=n.replace(/\b(?:(?:zihinsel|mental|psikolojik|duygusal|ruhsal|sosyal|performans|atmosferik|atmosfer|barometrik|hava)(?:\s+(?:ve|veya)\s+(?:zihinsel|mental|psikolojik|duygusal|ruhsal|sosyal))?)\s+(?:baski|basinc)\w*/g,'').replace(/\bbaskilan\w*|\bbaskilama\w*/g,'');
 // Vücutta sıcaklık/ateş ve içeceğin ısısı ortam modalitesi değildir.
 if(['heat','cold'].includes(axis.id))n=n.replace(/(?:sicak|soguk)\s+(?:icecek\w*|sivi\w*|su\w*|yiyecek\w*)/g,'').replace(/(?:sicak|soguk)\s+(?:cilt|deri|yuz|bas|ayak|el)\w*/g,'').replace(/(?:cilt|cildi|deri|derisi|yuz|yuzu|bas|basi|ayaklar|eller)\s+(?:sicak|soguk)\w*/g,'').replace(/(?:sicaklik hissi|sicak basma\w*|vucut sicakligi|ates\w*)/g,'');
 if(axis.id==='lying'&&/taraf\w*.*yat|sirtustu|yuzustu|yan yat/.test(n))return false; // Belirli pozisyon genel uzanmayla eş tutulmaz.
 return axis.terms.some(t=>(new RegExp('(?:^|[^a-z])'+t)).test(n)&&!(axis.id==='movement'&&t==='efor'&&/\b(?:zihinsel|mental|dusunsel|bilissel)\b/.test(n)&&!/\b(?:fiziksel|bedensel)\b/.test(n)));
}
export function supportsAxisQuote(text,id){const axis=axes.find(a=>a.id===id);return !!axis&&matchesAxis(text,axis);}
const negativeDirection=n=>/artm\w*|artirmaz|azalm\w*|hafiflem\w*|kotulesm\w*|iyilesm\w*|etkilem\w*|degism\w*|fark etmez|fark etmiyor/.test(n);
function explicitEffect(text){
 const n=norm(text);if(negativeDirection(n))return null;
 const worse=/\b(?:artar\w*|artiyor\w*|artabilir\w*|artan\w*|artir\w*|kotules\w*|agirlas\w*)\b/.test(n);
 const better=/\b(?:hafifle\w*|rahatla\w*|iyiles\w*|azalir\w*|azaliyor\w*|azalan\w*|azalabilir\w*)\b/.test(n);
 return worse===better?null:worse?'worse':'better';
}
const headingKey=s=>norm(s).replace(/[*_`]/g,'').replace(/\s+/g,' ').trim();
/** Tam remedi başlığı altındaki semptom bağlamını alır; genel girişleri adaylara mal etmez. */
function contextualLines(record,contextSources){
 const lines=[];
 for(const source of contextSources){let active=false,heading='';for(const [i,text] of (source.original||'').split('\n').entries()){
  const h=text.match(/^(#{1,6})\s+(.+)$/);if(h){if(h[1].length<=3){active=h[1].length===3&&headingKey(h[2])===headingKey(record.title);heading=h[2];}continue;}
  if(active&&text.trim())lines.push({text,line:i+1,heading,sourceId:source.id,title:source.title});
 }}return lines;
}
/** Kaynak alıntısını aynen korur; açık yönü olmayan/olumsuz/karma ifadeden kesin etki üretmez. */
export function evidence(record,axis,contextSources=[]){
 const out=[],seen=new Set();
 function add(text,line,heading,effect,sourceId=record.id,title=record.title){
  if(!effect||!matchesAxis(text,axis)||negativeDirection(norm(text)))return;
  const key=sourceId+'|'+text.trim()+'|'+effect;if(seen.has(key))return;seen.add(key);
  out.push({effect,text,line,heading,sourceId,title,recordId:record.id});
 }
 for(const section of record.modalities||[]){
  let effect=null;
  const head=norm(section.heading||'');if(/artiran|kotulestiren/.test(head))effect='worse';if(/hafifleten|iyilestiren/.test(head))effect='better';
  for(const [i,line] of section.text.split('\n').entries()){
   const n=norm(line),header=/^\s*(?:#{1,6}\s|\*\*)/.test(line);
   if(header){if(/artiran|kotulestiren/.test(n))effect='worse';else if(/hafifleten|iyilestiren/.test(n))effect='better';else if(!/modalite/.test(n))effect=null;}
   if(/^\s*[-•*]\s/.test(line)&&effect)add(line,section.line+i,section.heading,effect);
  }
 }
 for(const entry of contextualLines(record,contextSources)){
  // Noktalı virgülle ayrılmış karşıt koşullar birbirine taşınmaz; virgüllü ortak listeler korunur.
  for(const clause of entry.text.split(/[;.!?]|\b(?:ama|fakat|ancak)\b/iu)){const text=clause.trim();add(text,entry.line,entry.heading,explicitEffect(text),entry.sourceId,entry.title);}
 }
 return out;
}
export function compare(records,answers,contextSources=[]){return records.map(record=>{
 let matches=0,conflicts=0;const details=[];
 for(const [id,a] of Object.entries(answers)){if(a==='unknown')continue;const axis=axes.find(x=>x.id===id);if(!axis)continue;const ev=evidence(record,axis,contextSources);const effects=new Set(ev.map(x=>x.effect));
 if(effects.size===1){if(effects.has(a))matches++;else conflicts++;}
 if(ev.length)details.push({axis:axis.label,evidence:ev,ambiguous:effects.size>1});
 }
 return {record,matches,conflicts,details};
}).sort((a,b)=>(b.matches-b.conflicts)-(a.matches-a.conflicts));}
export function nextQuestions(records,answers,contextSources=[]){return axes.filter(a=>!(a.id in answers)).map(a=>{
 let better=0,worse=0,unknown=0,ambiguous=0;const sources=[];
 for(const r of records){const ev=evidence(r,a,contextSources),effects=new Set(ev.map(x=>x.effect));if(effects.size===1){if(effects.has('better'))better++;else worse++;}else if(effects.size>1)ambiguous++;else unknown++;sources.push(...ev);}
 return {...a,weight:Math.min(better,worse)*5+better+worse,better,worse,unknown,ambiguous,sources};
}).filter(a=>a.weight>0).sort((a,b)=>b.weight-a.weight);}
export function nextQuestion(records,answers,contextSources=[]){return nextQuestions(records,answers,contextSources)[0];}
