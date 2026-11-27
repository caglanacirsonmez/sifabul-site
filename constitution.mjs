// Yapısal (bütüncül) remedi anketi. Sorular kişinin genel yapısını sorar; yanıtlar Holirem remedi sayfalarındaki
// (ve Ek remedilerdeki) satırlarla eşleşir. Her eşleşme satır numarasıyla gösterilir; puan, nadir özelliklere
// (az remedide geçen) daha fazla ağırlık verir. Sonuç bir eşleştirmedir: yapısal remedi seçimi uzman görüşmesi ister.
import {norm} from './search.mjs?v=mwzcsp3l';

// Kapsam: hangi bölümlerdeki satırlar sayılır.
// mind: zihin/duygu bölümleri; general: genel belirtiler ve genel modaliteler; any: tüm sayfa (ör. susama, istekler).
const SECTIONS={
 mind:/^(zihin|ana temalar|genel bakis|anahtar belirtiler|remedi detayi|giris|cocuklarda)/,
 general:/^(genel belirtiler|genel bakis|ana temalar|anahtar belirtiler|sikayetleri artiran|sikayetleri hafifleten|modaliteler|remedi detayi|giris)/,
 // Ayırıcı özellikler başka remedileri anlatır; o satırlar bu remediye puan vermez.
 any:/^(?!ayirici|iliskili remediler|karsilastir)/,
};

// Not: desenler norm() uygulanmış metinde (küçük harf, aksansız, ı→i) aranır.
export const QUESTIONS=[
 {id:'thermal',group:'Genel yapı',text:'Genel olarak sıcağa mı, soğuğa mı daha duyarlısınız?',weight:2,options:[
  {id:'chilly',label:'Çabuk üşürüm, sıcak iyi gelir',scope:'general',patterns:['usu(r|me|yen|tme|mek)','soguga (karsi )?(duyarl|hassas)','soguk(tan|la)? kotules','soguk hava(da|yla)? kotu','sicak(ta|la|lik|liktan)? (iyi|rahatla|hafifle)','sicak uygulama\\w* (iyi|rahatla|hafifle)','isinmak(la)? (iyi|rahatla)','sicak ortam(da)? (iyi|rahatla)']},
  {id:'hot',label:'Sıcaktan bunalırım, serinlik iyi gelir',scope:'general',patterns:['sicak(tan|la)? kotules','sicak oda(da)? kotu','sicak ortam(da|lar)? kotu','sicaga (karsi )?(duyarl|tahammul)','sicakkanli','serin(lik|de)? (iyi|rahatla)','soguk uygulama\\w* (iyi|rahatla|hafifle)','sicak basma']},
  {id:'skip',label:'Belirgin değil'}]},
 {id:'thirst',group:'Genel yapı',text:'Susama durumunuz nasıldır?',weight:2,options:[
  {id:'thirsty',label:'Çok susarım, bol su içerim',scope:'any',patterns:['(cok|yogun|asiri|belirgin|siddetli) susa','bol (miktarda )?su ic','buyuk yudum','susuzluk(la)? (belirgin|siddetli)']},
  {id:'sips',label:'Sık sık küçük yudumlar içerim',scope:'any',patterns:['kucuk yudum','sik sik az','yudum yudum']},
  {id:'thirstless',label:'Pek susamam',scope:'any',patterns:['susamaz','susama(nin)? (yok|azal|olmama)','susamama','susuzluk yok','su icmek istememe']},
  {id:'skip',label:'Belirgin değil'}]},
 {id:'consolation',group:'Duygular',text:'Üzgünken teselli edilmek size nasıl gelir?',weight:3,options:[
  {id:'likes',label:'İyi gelir, ilgi ve şefkat isterim',scope:'mind',patterns:['teselli (ve ilgi )?(iste|arar)','teselli(yle|ye)? (iyi|rahatla|hafifle)','ilgi (ve sevgi )?(ihtiyac|iste|bekle)','sefkat (iste|ihtiyac)','sevgi (ihtiyac|iste)','destek (arar|iste|ihtiyac)','yakinlik (ve destek )?(arar|iste|ihtiyac)']},
  {id:'dislikes',label:'Hoşlanmam, beni daha da kötü yapar',scope:'mind',patterns:['teselli\\w* (istememe|hoslanmama|hoslanmaz|istemez|nefret|kotules|rahatsiz)','teselli edilmek(ten)? (istememe|hoslanmama|rahatsiz|nefret)','teselli edilince kotu']},
  {id:'skip',label:'Belirgin değil'}]},
 {id:'company',group:'Duygular',text:'Kendinizi kötü hissettiğinizde ne istersiniz?',weight:2,options:[
  {id:'company',label:'Yanımda biri olsun, yalnız kalmak istemem',scope:'mind',patterns:['yalniz kal\\w* (istememe|istemez|hoslanmama|korku|korkar)','yalniz kalamama','yalnizlik(tan)? (korku|kork|hoslanmama)','yaninda biri','eslik iste','yalniz birakilmak istememe','yalniz kalinca kotu']},
  {id:'alone',label:'Yalnız kalmak isterim',scope:'mind',patterns:['yalniz kal(ma|mak) (ihtiyac|iste)','yalnizlik (iste|ihtiyac)','yalniz birakil\\w* iste','kendi(ne|ni) kapa','ice donuk','insanlardan uzak','rahat birakil']},
  {id:'skip',label:'Belirgin değil'}]},
 {id:'weeping',group:'Duygular',text:'Ağlamak konusunda nasılsınız?',weight:2,options:[
  {id:'easy',label:'Kolay ağlarım, duygularımı gösteririm',scope:'mind',patterns:['kolay agla','aglamaya (meyil|egilim)','sik agla','aglamakli','gozyasi(na)? (hakim|kolay)']},
  {id:'holds',label:'Duygularımı içime atarım, zor ağlarım',scope:'mind',patterns:['ic(ine|e) at','bastirilmis (uzuntu|keder|duygu|ofke)','duygu\\w* (bastir|gizle|disa vurma)','sessiz keder','aglayama','yalniz kalip agla']},
  {id:'skip',label:'Belirgin değil'}]},
 {id:'temper',group:'Duygular',text:'Sizi en iyi anlatan hangisi?',weight:2,options:[
  {id:'irritable',label:'Sabırsız, çabuk sinirlenen, gergin',scope:'mind',patterns:['sabirsiz','sinirli','cabuk (sinirlen|ofkelen|kiz)','ofke','tahammulsuz','gergin','huysuz','kavgaci','irritab']},
  {id:'anxious',label:'Kaygılı, huzursuz, endişeli',scope:'mind',patterns:['kaygi','endise','huzursuz','evham','telas']},
  {id:'gentle',label:'Yumuşak, uysal, kolay etkilenen',scope:'mind',patterns:['nazik','yumusak','uysal','cekingen','kolay etkilen','boyun eg','kararsiz']},
  {id:'dull',label:'Durgun, ilgisiz, içine kapanık',scope:'mind',patterns:['kayitsiz','ilgisiz','durgun','uyusuk','sersem','dalgin','apati','tepkisiz']},
  {id:'skip',label:'Belirgin değil'}]},
 {id:'fears',group:'Duygular',text:'Belirgin bir korkunuz var mı?',weight:2,multi:true,options:[
  {id:'dark',label:'Karanlık',scope:'mind',patterns:['karanlik']},
  {id:'death',label:'Ölüm',scope:'mind',patterns:['olum korku','olecegini','olum endise','olumden kork']},
  {id:'illness',label:'Hastalık / sağlık',scope:'mind',patterns:['hastalik (korku|kaygi|endise)','saglik (kaygi|endise|korku)','hastaligin (olumcul|ciddi)']},
  {id:'aloneFear',label:'Yalnız kalmak',scope:'mind',patterns:['yalniz kal\\w* korku','yalnizlik\\W.{0,40}kork','yalniz kalmaktan kork','yalniz kalinca\\W.{0,40}korku']},
  {id:'anticipation',label:'Sınav, sahne, önemli olay öncesi',scope:'mind',patterns:['beklenti','sinav','performans','sahne','onemli (bir )?olay(dan)? once']},
  {id:'crowd',label:'Kalabalık / kapalı alan',scope:'mind',patterns:['kalabalik','kapali alan','klostrofobi']},
  {id:'thunder',label:'Fırtına, gök gürültüsü',scope:'any',patterns:['firtina','gok gurultu']},
  {id:'skip',label:'Belirgin bir korkum yok'}]},
 {id:'order',group:'Duygular',text:'Düzen ve titizlik konusunda nasılsınız?',weight:1.5,options:[
  {id:'fastidious',label:'Çok titizim, her şey yerli yerinde olmalı',scope:'mind',patterns:['titiz','duzen(li|e duskun|takinti)','mukemmeliyet','kontrol (iste|ihtiyac|altinda)','kuralci']},
  {id:'skip',label:'Belirgin değil'}]},
 {id:'pace',group:'Duygular',text:'Temponuz nasıldır?',weight:1.5,options:[
  {id:'hurried',label:'Aceleci, hızlı, hep yetişmeye çalışan',scope:'mind',patterns:['acele','telasli','hizli (konus|hareket|tempo)','zamanla yaris','hirsli','is odakli','calisma(ya)? duskun']},
  {id:'slow',label:'Yavaş, ağır, sakin',scope:'mind',patterns:['yavas','agir (hareket|tempo)','uyusuk','tembel','gec kavra']},
  {id:'talkative',label:'Çok konuşkan, hareketli',scope:'mind',patterns:['konuskan','cok konus','konudan konuya','disa donuk','sosyal','sevecen','kolay bag kur']},
  {id:'skip',label:'Belirgin değil'}]},
 {id:'desires',group:'Yiyecek ve içecek',text:'Belirgin istekleriniz var mı?',weight:1.5,multi:true,options:[
  {id:'sweet',label:'Tatlı',scope:'any',patterns:['tatli\\w*(?: \\w+){0,2} (?:karsi )?(istek|isteg|arzu|duskun|ister|sev)','seker\\w*(?: \\w+){0,2} (?:karsi )?(istek|isteg|arzu|duskun|ister|sev)']},
  {id:'salt',label:'Tuzlu',scope:'any',patterns:['tuz\\w*(?: \\w+){0,2} (?:karsi )?(istek|isteg|arzu|duskun|ister|sev)','asiri tuz']},
  {id:'sour',label:'Ekşi',scope:'any',patterns:['eksi\\w*(?: \\w+){0,2} (?:karsi )?(istek|isteg|arzu|duskun|ister|sev)','limon\\w*(?: \\w+){0,2} (?:karsi )?(istek|isteg|arzu|duskun|ister|sev)']},
  {id:'fatty',label:'Yağlı yiyecek',scope:'any',patterns:['yagli\\w* (?:yiyecek\\w* )?(istek|isteg|arzu|ister)(?!siz)']},
  {id:'spicy',label:'Baharatlı, uyarıcılar (kahve, alkol)',scope:'any',patterns:['baharat\\w*(?: \\w+){0,2} (?:karsi )?(istek|isteg|arzu|duskun|ister|sev)','uyarici\\w*(?: \\w+){0,2} (?:karsi )?(istek|isteg|arzu|duskun|ister|sev)','kahve\\w*(?: \\w+){0,2} (?:karsi )?(istek|isteg|arzu|duskun|ister|sev)','alkol\\w*(?: \\w+){0,2} (?:karsi )?(istek|isteg|arzu|duskun|ister|sev)']},
  {id:'coldDrinks',label:'Soğuk / buzlu içecek',scope:'any',patterns:['soguk (icecek|su|sut|sey)\\w*(?: \\w+){0,2} (?:karsi )?(istek|isteg|arzu|duskun|ister|sev)','buz(lu| gibi)\\w*(?: \\w+){0,2} (istek|isteg|arzu|ister)','dondurma\\w*(?: \\w+){0,2} (?:karsi )?(istek|isteg|arzu|duskun|ister|sev)']},
  {id:'warmDrinks',label:'Sıcak içecek',scope:'any',patterns:['sicak (icecek|su|sivi|sut|cay)\\w*(?: \\w+){0,2} (?:karsi )?(istek|isteg|arzu|duskun|ister|sev)','sicak (icecek|sivi)\\w* (iyi gel|rahatla)']},
  {id:'skip',label:'Belirgin bir isteğim yok'}]},
 {id:'fatAversion',group:'Yiyecek ve içecek',text:'Yağlı yiyecekler size dokunur mu?',weight:1,options:[
  {id:'yes',label:'Evet, yağlı yiyince rahatsızlanırım',scope:'any',patterns:['yagli (yiyecek|yemek|gida)\\w*(?: \\w+){0,2} (kotu|rahatsiz|tolere|dokun|sonra)','yagli\\w*(?: \\w+){0,2} (hoslanmama|istememe|tiksin|isteksiz)']},
  {id:'skip',label:'Hayır / belirgin değil'}]},
 {id:'motion',group:'Genel yapı',text:'Hareket etmek genel olarak size nasıl gelir?',weight:1.5,options:[
  {id:'better',label:'Hareket ettikçe açılırım',scope:'general',patterns:['hareket(le|ettikce|e devam)\\w* (iyi|rahatla|hafifle|acil)','hareket etme (ihtiyac|istegi)','surekli hareket']},
  {id:'worse',label:'Hareket kötü gelir, dinlenmek isterim',scope:'general',patterns:['hareket(le|ten)? kotules','en (kucuk|ufak) hareket','hareketsiz kalmak iste','dinlen(me|mek)(le)? (iyi|rahatla|hafifle)']},
  {id:'skip',label:'Belirgin değil'}]},
 {id:'air',group:'Genel yapı',text:'Açık havada nasıl hissedersiniz?',weight:1.5,options:[
  {id:'better',label:'Açık hava iyi gelir, kapalı oda bunaltır',scope:'general',patterns:['acik hava(da|yla)? (iyi|rahatla|hafifle)','temiz hava (iste|ihtiyac|iyi)','kapali (oda|ortam|alan)(da)? kotu','havasiz (ortam|oda)(da)? kotu']},
  {id:'worse',label:'Açık hava ve rüzgâr dokunur',scope:'general',patterns:['acik hava(da)? kotu','ruzgar(da|la)? kotu','hava akimi(na|yla)? (kotu|hassas)','cereyan']},
  {id:'skip',label:'Belirgin değil'}]},
 {id:'time',group:'Genel yapı',text:'Günün belli bir saatinde kendinizi daha kötü hisseder misiniz?',weight:1.5,options:[
  {id:'morning',label:'Sabah',scope:'general',patterns:['sabah(lari)? (daha )?(kotu|guc|halsiz)','sabah kotules','uyaninca kotu']},
  {id:'afternoon',label:'Öğleden sonra / akşamüstü (16–20)',scope:'any',patterns:['16[.:]?00','saat 16','ogleden sonra (4|dort|16)','16 ?[-–] ?20']},
  {id:'evening',label:'Akşam',scope:'general',patterns:['aksam(lari)? (daha )?(kotu|kotules)']},
  {id:'night',label:'Gece / gece yarısından sonra',scope:'general',patterns:['gece(leri)? (daha )?(kotu|kotules)','gece yarisi(ndan sonra)?','gece 1','saat 1','1[-–:]3']},
  {id:'skip',label:'Belirgin değil'}]},
 {id:'side',group:'Genel yapı',text:'Şikâyetleriniz bir tarafta mı yoğunlaşır?',weight:1,options:[
  {id:'right',label:'Sağ taraf',scope:'any',patterns:['sag taraf','sagdan sola','sag tarafli']},
  {id:'left',label:'Sol taraf',scope:'any',patterns:['sol taraf','soldan saga','sol tarafli']},
  {id:'skip',label:'Belirgin değil'}]},
 {id:'sweat',group:'Genel yapı',text:'Terleme durumunuz?',weight:1,options:[
  {id:'head',label:'Özellikle başım/ensem terler',scope:'any',patterns:['bas(ta|in)? terle','ense(de)? terle','yastig\\w* islat']},
  {id:'profuse',label:'Çok terlerim',scope:'any',patterns:['(bol|asiri|yogun|kolay) terle','terleme(si)? (bol|asiri|fazla)']},
  {id:'skip',label:'Belirgin değil'}]},
 {id:'senses',group:'Genel yapı',text:'Dış uyaranlara aşırı hassas mısınız?',weight:1,multi:true,options:[
  {id:'noise',label:'Gürültü',scope:'any',patterns:['gurultu(ye)? (hassas|tahammul|duyarl|kotu)','sese (hassas|duyarl)']},
  {id:'light',label:'Işık',scope:'any',patterns:['isig\\w* (hassas|duyarl)','isik(la)? kotu']},
  {id:'smell',label:'Koku',scope:'any',patterns:['koku\\w* (hassas|duyarl|tahammul)']},
  {id:'touchS',label:'Dokunulmak',scope:'any',patterns:['dokunul\\w* (istememe|tahammul|hassas|dayanama)','dokunmaya (hassas|tahammul)']},
  {id:'skip',label:'Hayır'}]},
];

/** Remedi sayfasını (bölüm, satır) listesine çevirir. */
function linesOf(record){
 const out=[];let section='giris';
 record.original.split('\n').forEach((raw,i)=>{const l=raw.trim();
  if(/^#{1,3}\s/.test(l)){section=norm(l.replace(/^#+\s*/,''));return;}
  if(!l||l==='---'||l.startsWith('>')||l.startsWith('!['))return;
  out.push({section,line:i+1,text:l.replace(/^[-•*]\s*/,'').replace(/\*\*/g,''),n:norm(l)});});
 return out;
}

const compiled=new Map();
const rx=option=>{if(!compiled.has(option))compiled.set(option,(option.patterns||[]).map(p=>new RegExp('(?:^|[^a-z])'+p)));return compiled.get(option);};

/** Her seçenek için hangi remedide hangi satırların eşleştiğini hazırlar (bir kez hesaplanır). */
export function indexRemedies(records){
 const remedies=records.filter(r=>r.category==='remedies');
 const idx=new Map();
 for(const r of remedies){const lines=linesOf(r);const hits={};
  for(const q of QUESTIONS)for(const o of q.options){if(!o.patterns)continue;const scope=SECTIONS[o.scope||'any'];
   const found=lines.filter(l=>scope.test(l.section)&&rx(o).some(re=>re.test(l.n)));if(found.length)hits[q.id+'.'+o.id]=found.slice(0,3);}
  idx.set(r.id,{record:r,hits});}
 const df={};for(const {hits} of idx.values())for(const k of Object.keys(hits))df[k]=(df[k]||0)+1;
 return {idx,df,total:remedies.length};
}

/** answers: {questionId: optionId | optionId[]}. Döner: puana göre sıralı [{record,score,percent,matched:[...]}]. */
export function scoreConstitution(index,answers){
 const {idx,df,total}=index;const chosen=[];
 for(const q of QUESTIONS){const a=answers[q.id];const ids=(Array.isArray(a)?a:a?[a]:[]).filter(x=>x!=='skip');
  for(const id of ids){const o=q.options.find(x=>x.id===id);if(o?.patterns)chosen.push({q,o,key:q.id+'.'+id});}}
 if(!chosen.length)return [];
 // Nadir özellik daha ayırt edicidir: ağırlık × log(1 + toplam / geçtiği remedi sayısı).
 const w=c=>c.q.weight*Math.log2(1+total/Math.max(1,df[c.key]||total));
 const max=chosen.reduce((s,c)=>s+w(c),0);
 const rows=[];
 for(const {record,hits} of idx.values()){let score=0;const matched=[];
  for(const c of chosen)if(hits[c.key]){score+=w(c);matched.push({question:c.q.text,answer:c.o.label,lines:hits[c.key]});}
  if(score>0)rows.push({record,score,percent:Math.round(100*score/max),matched,answered:chosen.length});}
 return rows.sort((a,b)=>b.score-a.score||b.matched.length-a.matched.length||a.record.title.localeCompare(b.record.title,'tr'));
}
