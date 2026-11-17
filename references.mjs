// Klasik materia medica referans bankası (references.json): Boericke 1901, Kent 1905.
// Remedi kayıtlarını kitap bölümleriyle adlarına göre eşler; YZ sentezine ek kaynak olarak verilir. DOM kullanmaz.
const fold=s=>String(s).toLocaleLowerCase('en').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/æ/g,'ae').replace(/œ/g,'oe').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
const BOOK_LABEL={boericke:'Boericke',kent:'Kent'};
// Tek bölümün YZ'ye giden en fazla uzunluğu (Kent dersleri çok uzun; yerel modellerin bağlamı sınırlı).
export const REF_TEXT_LIMIT=12000;

// Ad biçimleri: "Kalium"↔"Kali", "Natrium"↔"Natrum", "Nitric acid"↔"Nitricum acidum", "Hepar sulphuris"↔"Hepar Sulphur".
// Parantez içi ad da ayrı bir ad sayılır: "Cinchona officinalis (China)", "Cinchona (China)".
// Eski/yeni bitki adları: Kent "Actea racemosa" = "Cimicifuga racemosa".
const SYNONYMS={'cimicifuga racemosa':'actea racemosa'};
const variants=title=>{const alias=[...title.matchAll(/\(([^)]*)\)/g)].map(m=>m[1]);const base=fold(title.replace(/\(.*?\)/g,''));return [title.replace(/\(.*?\)/g,''),...alias,...(SYNONYMS[base]?[SYNONYMS[base]]:[])].map(t=>fold(t).replace(/\bkalium\b/g,'kali').replace(/\bnatrium\b/g,'natrum').replace(/\bacidum\b/g,'acid')).filter(Boolean);};
const twoKey=words=>words.length>1?words.slice(0,2).map(w=>w.slice(0,4)).join(' '):null;
const oneKey=words=>words[0].slice(0,5);
const push=(map,key,entry)=>{if(!key)return;if(!map.has(key))map.set(key,[]);map.get(key).push(entry);};

/** Remedi başlığı → eşleşen kitap bölümleri. Önce ilk iki sözcüğün kökü; tek sözcükte tam ad; son çare ilk sözcük (kitapta tekse). */
export function buildReferenceIndex(bank){
 const byTwo=new Map(),bySingle=new Map(),byFirst=new Map();
 for(const entry of bank?.entries||[])for(const name of variants(entry.title)){
  const words=name.split(' ');push(byTwo,twoKey(words),entry);if(words.length===1)push(bySingle,name,entry);push(byFirst,oneKey(words),entry);
 }
 return function referencesFor(record){
  if(!record||record.category!=='remedies')return [];
  let found=[];
  for(const name of variants(record.title)){
   const words=name.split(' ');
   // 4 harflik kök aday getirir; 5 harfe kadar önek uyumu ayıklar ("Euphrasia" ≠ "Euphorbium", "Amyl" = "Amylenum").
   const close=e=>variants(e.title).some(n=>{const w=n.split(' ');return words.slice(0,2).every((x,i)=>{const a=x.slice(0,5),b=(w[i]||'').slice(0,5);return a.startsWith(b)||b.startsWith(a);});});
   const direct=((words.length>1?byTwo.get(twoKey(words)):bySingle.get(name))||[]).filter(close);
   // İlk sözcük yalnız kitap başına tek bölüme gidiyorsa kullanılır ("Pulsatilla nigricans" ↔ "PULSATILLA PRATENSIS").
   const loose=(byFirst.get(oneKey(words))||[]).filter((e,_,all)=>words[0].length>=5&&all.filter(x=>x.book===e.book).length===1);
   // Tam ilk sözcük: "Sanguinaria" ↔ "SANGUINARIA CANADENSIS", "Mercurius solubilis" ↔ Kent "Mercurius".
   const exactFirst=(bank?.entries||[]).filter(e=>variants(e.title).some(n=>{const w=n.split(' ');return w[0]===words[0]&&(w.length===1||words.length===1);}));
   const have=new Set([...direct,...loose].map(e=>e.book));
   found.push(...direct,...loose.filter(e=>!direct.some(d=>d.book===e.book)),...exactFirst.filter((e,_,all)=>!have.has(e.book)&&all.filter(x=>x.book===e.book).length===1));
  }
  const seen=new Set();return found.filter(e=>!seen.has(e.id)&&seen.add(e.id));
 };
}

/** Kitap bölümünü kaynak kaydı biçimine çevirir (açıklama, alıntı doğrulama ve kaynak listesi aynı yolu kullanır). */
export function referenceRecord(entry){
 const label=BOOK_LABEL[entry.book]||entry.book;
 return {id:'ref/'+entry.id,title:label+' · '+entry.title,category:'references',url:entry.url,original:entry.text.length>REF_TEXT_LIMIT?entry.text.slice(0,REF_TEXT_LIMIT):entry.text};
}

export const REFERENCE_NOTE='Klasik kaynaklar (Boericke 1901, Kent 1905) İngilizcedir. Bu kaynaklardan alıntıyı özgün İngilizce metinden harfiyen ver, açıklamayı Türkçe yaz. Ana kaynak ile klasik kaynakların uyuştuğu ve ayrıştığı noktaları ayrı belirt; klasik kaynakların da tarihsel homeopati iddiaları olduğunu unutma.';
