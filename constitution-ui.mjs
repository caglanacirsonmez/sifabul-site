// Bul sayfasında "Akut | Yapısal" anahtarı. Akut: mevcut şikâyet araması + potens/doz notu.
// Yapısal: kişinin genel yapısını soran anket; sonuçta Holirem remedi sayfalarıyla en çok örtüşen remediler,
// her eşleşme satır kaynağıyla. Yanıtlar ve seçili mod bu cihazın tarayıcısında saklanır.
import {QUESTIONS,indexRemedies,scoreConstitution} from './constitution.mjs?v=mwzcsp3l';
import {iconNode} from './icons.mjs?v=mwzcsp3l';
import {favoriteButton} from './favorites.mjs?v=mwzcsp3l';
const KEY='sifabul.constitution.v1';
const POTENCY_ID='articles/potens-ve-dozlama';
const e=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const btn=(label,fn,cls='ghost-button')=>{const b=e('button',label,cls);b.type='button';b.onclick=fn;return b;};
const load=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');return v&&typeof v==='object'?v:{};}catch{return {};}};
const store=v=>{try{localStorage.setItem(KEY,JSON.stringify(v));}catch{}};
const MIN_ANSWERS=5;

export function initConstitution({root,records,openSource}){
 const potency=records.find(r=>r.id===POTENCY_ID);
 let state=load();state.answers=state.answers||{};state.step=Math.min(state.step||0,QUESTIONS.length);
 let index=null;const getIndex=()=>index||(index=indexRemedies(records));
 const save=()=>store(state);

 // Anahtar: başlığın altında
 const toggle=e('div',undefined,'mode-toggle');toggle.setAttribute('role','tablist');toggle.setAttribute('aria-label','Akut ya da yapısal');
 const tAcute=btn('Akut',()=>setMode('acute'),'mode-btn'),tConst=btn('Yapısal',()=>setMode('constitution'),'mode-btn');
 for(const b of [tAcute,tConst])b.setAttribute('role','tab');
 toggle.append(tAcute,tConst);root.querySelector('.find-head').after(toggle);

 // Akut: potens ve doz notu (sunumdan)
 const acuteNote=e('details',undefined,'potency-note');
 {const s=e('summary');s.append(iconNode('info'),e('span','Potens ve doz (akut)'));acuteNote.append(s);
  const ul=e('ul');for(const t of ['Akutta genellikle 30C ya da 200C tercih edilir. 30C: ateş, öksürük, grip, ishal, kusma; hafifte günde 2–3, yoğunda 1–2 saatte bir, düzeldikçe aralık açılır.','200C ve üstü: şiddetli ve ani tablolar (ani yüksek ateş, şok, travma); genelde 1 doz, sonra gözlem, gerekirse 12–24 saatte bir.','Sulu doz: ateş, ağrı, akut enfeksiyonda 30 dk–1 saatte bir; belirgin iyileşmede 3–4 saate, sonra günde 2’ye; tam iyileşmede kesilir. Her içimden önce şişe vurulur.','İyileşme başladıysa tekrar etmeyin. Değişiklik yoksa remediyi yeniden düşünün; yeni semptom çıkarsa kesip gözlemleyin.','Tedavi süresince kahve, alkol ve kâfurlu yağlar (nane, okaliptüs, biberiye) remediyi etkileyebilir. Emin değilseniz en düşük potens.'])ul.append(e('li',t));
  acuteNote.append(ul);const foot=e('p','Sunumun uyarısı: kişiye özel tedavi veya acil durum rehberi değildir. Nefes darlığı, bilinç bulanıklığı, 3 aydan küçük bebekte 38 °C ateş gibi durumlarda tıbbi yardım alın.','muted small');acuteNote.append(foot);
  if(potency)acuteNote.append(btn('Sunumun tamamını oku',()=>openSource(potency),'text-button cite'));}
 // Potens notu sayfanın en altında; arama sonuçlarının önüne geçmez.
 root.querySelector('.find-grid').after(acuteNote);

 // Yapısal panel
 const panel=e('section',undefined,'constitution-panel');panel.id='constitutionPanel';panel.hidden=true;panel.setAttribute('aria-live','polite');root.querySelector('#findForm').after(panel);

 function setMode(mode){state.mode=mode;save();apply();if(mode==='constitution')render();}
 const h1=root.querySelector('.find-head h1'),kick=root.querySelector('.find-head .kicker'),h1Acute=h1.textContent,kickAcute=kick.textContent;
 function apply(){const c=state.mode==='constitution';root.classList.toggle('constitution-mode',c);panel.hidden=!c;
  h1.textContent=c?'Yapınızı anlatın, uyumlu remedi bulunsun.':h1Acute;kick.textContent=c?'YAPISAL REMEDİ':kickAcute;
  tAcute.classList.toggle('on',!c);tConst.classList.toggle('on',c);tAcute.setAttribute('aria-selected',String(!c));tConst.setAttribute('aria-selected',String(c));}

 const answered=()=>QUESTIONS.filter(q=>{const a=state.answers[q.id];return Array.isArray(a)?a.length:!!a;}).length;

 function intro(){
  const box=e('div',undefined,'const-intro');
  box.append(e('h2','Sizi anlatan remediyi birlikte arayalım'));
  box.append(e('p','Yapısal tedavide yalnız şikâyete değil, kişinin bütün yapısına bakılır: bedeni, duyguları, istekleri, sıcak-soğuk tepkileri. Aşağıdaki sorular bu yapıyı sorar; yanıtlarınız Holirem remedi sayfalarındaki satırlarla karşılaştırılır ve en çok örtüşen remediler kanıtlarıyla gösterilir.'));
  box.append(e('p','Şikâyetinizi değil, genel olarak nasıl biri olduğunuzu düşünerek yanıtlayın. Emin değilseniz “Belirgin değil” deyin; bu yanıt puanı etkilemez.','muted small'));
  const warn=e('p',undefined,'const-warn small');warn.append(iconNode('info'),e('span','Bu bir eşleştirmedir, reçete değildir. Pınar Hardless’in sunumuna göre yapısal tedavide potens ve tekrar uzman homeopat rehberliğinde belirlenir.'));box.append(warn);
  return box;}

 function render(){
  panel.replaceChildren();
  if(state.step>=QUESTIONS.length&&answered()>=1)return renderResults();
  const q=QUESTIONS[state.step];if(state.step===0)panel.append(intro());
  const card=e('div',undefined,'const-card');
  const prog=e('div',undefined,'const-progress');const bar=e('span');bar.style.width=Math.round(100*state.step/QUESTIONS.length)+'%';prog.append(bar);
  card.append(e('div',(state.step+1)+' / '+QUESTIONS.length+' · '+q.group,'kicker'),prog,e('h3',q.text));
  if(q.multi)card.append(e('p','Birden fazla seçebilirsiniz.','muted small'));
  const opts=e('div',undefined,'const-options');const cur=state.answers[q.id];
  for(const o of q.options){const on=q.multi?(Array.isArray(cur)&&cur.includes(o.id)):cur===o.id;const b=btn(o.label,()=>choose(q,o),'const-option'+(on?' on':''));b.setAttribute('aria-pressed',String(on));opts.append(b);}
  card.append(opts);
  const nav=e('div',undefined,'const-nav');
  const back=btn('Geri',()=>{state.step=Math.max(0,state.step-1);save();render();});back.disabled=state.step===0;nav.append(back);
  if(q.multi)nav.append(btn(state.step===QUESTIONS.length-1?'Sonuçları gör':'Devam',()=>{state.step++;save();render();},'primary-button'));
  else nav.append(btn('Atla',()=>{state.step++;save();render();},'text-button'));
  const n=answered();if(n>=MIN_ANSWERS&&state.step<QUESTIONS.length-1)nav.append(btn('Şimdi sonuçları gör ('+n+' yanıt)',()=>{state.step=QUESTIONS.length;save();render();},'text-button'));
  card.append(nav);panel.append(card);
 }
 function choose(q,o){
  if(q.multi){let a=Array.isArray(state.answers[q.id])?[...state.answers[q.id]]:[];
   if(o.id==='skip')a=a.includes('skip')?[]:['skip'];else{a=a.filter(x=>x!=='skip');a=a.includes(o.id)?a.filter(x=>x!==o.id):[...a,o.id];}
   state.answers[q.id]=a;save();render();return;}
  state.answers[q.id]=o.id;state.step++;save();render();
 }
 function renderResults(){
  const rows=scoreConstitution(getIndex(),state.answers);const n=answered();
  const head=e('div',undefined,'const-intro');head.append(e('span','YAPISAL REMEDİ · SONUÇ','kicker'));
  if(!rows.length){head.append(e('h2','Eşleşme bulunamadı'),e('p','Yanıtlarınız remedi sayfalarındaki satırlarla eşleşmedi. Daha fazla soruyu “Belirgin değil” dışında yanıtlamayı deneyin.'));panel.append(head,actions());return;}
  const top=rows[0],second=rows[1];
  head.append(e('h2','En uyumlu remedi: '+top.record.title));
  const close=second&&top.percent-second.percent<10;
  head.append(e('p',n+' yanıt değerlendirildi. '+(close?'İlk sıralar birbirine çok yakın; aşağıdaki kanıtları ve remedilerin ayırıcı özelliklerini birlikte okuyun.':'Puan, yanıtlarınızın bu remedinin sayfasında karşılık bulma oranıdır; nadir özellikler daha çok sayılır.'),'muted'));
  const warn=e('p',undefined,'const-warn small');warn.append(iconNode('info'),e('span','Bu bir eşleştirmedir, reçete değildir. Yapısal remedi, potens ve tekrar uzman homeopat görüşmesiyle belirlenir. Süren veya ciddi bir sağlık sorununda hekime başvurun.'));head.append(warn);
  panel.append(head);
  rows.slice(0,5).forEach((r,i)=>panel.append(resultCard(r,i)));
  panel.append(actions());
 }
 function resultCard(r,i){
  const card=e('article',undefined,'const-result'+(i===0?' top':''));
  const h=e('div',undefined,'const-result-head');h.append(e('span',String(i+1).padStart(2,'0'),'row-rank mono'),e('h3',r.record.title));
  if(r.record.origin){const o=e('span','Holirem dışı','badge origin');o.title=r.record.origin;h.append(o);}
  const meter=e('span',undefined,'const-meter');const fill=e('span');fill.style.width=r.percent+'%';meter.append(fill);h.append(meter,e('strong','%'+r.percent,'mono'));
  h.append(favoriteButton(r.record));card.append(h);
  const d=e('details',undefined,'const-why');if(i===0)d.open=true;d.append(e('summary',r.matched.length+' yanıtınız bu sayfada karşılık buldu'));
  for(const m of r.matched){const blk=e('div',undefined,'const-why-item');blk.append(e('b',m.answer));const ul=e('ul');
   for(const l of m.lines){const li=e('li');li.append(e('span',l.text));const link=btn('',()=>openSource(r.record),'line-link');link.append(e('span','satır '+l.line),iconNode('book'));link.setAttribute('aria-label',r.record.title+' satır '+l.line);li.append(link);ul.append(li);}
   blk.append(ul);d.append(blk);}
  card.append(d);
  const act=e('div',undefined,'fav-actions');const read=btn('Remedi sayfasını oku',()=>openSource(r.record),'ghost-button');read.prepend(iconNode('book'));act.append(read);card.append(act);
  return card;
 }
 function actions(){const a=e('div',undefined,'const-nav');
  a.append(btn('Yanıtları düzenle',()=>{state.step=0;save();render();panel.scrollIntoView({block:'start'});}),btn('Baştan başla',()=>{state.answers={};state.step=0;save();render();panel.scrollIntoView({block:'start'});},'text-button'));
  if(potency){const p=btn('Potens ve doz sunumu',()=>openSource(potency),'text-button cite');a.append(p);}
  return a;}

 apply();if(state.mode==='constitution')render();
 return {setMode};
}
