import {renderExplanation,modalityPanel} from './explanation.mjs?v=mwkskr2r';
import {remedyProfile} from './find.mjs?v=mwkskr2r';
import {initCabinet} from './cabinet.mjs?v=mwkskr2r';
import {initAssistant} from './assistant.mjs?v=mwkskr2r';
import {initModels} from './model3d.mjs?v=mwkskr2r';
import {search,norm,nextQuestion,compare,axes} from './search.mjs?v=mwkskr2r';
import {applyIcons,icon,iconNode,axisIcons} from './icons.mjs?v=mwkskr2r';
import {initShell} from './shell.mjs?v=mwkskr2r';
import {getRemote,setRemote,listModels,remoteSynth,DEFAULT_BASE} from './remote-ai.mjs?v=mwkskr2r';
import {buildReferenceIndex,referenceRecord} from './references.mjs?v=mwkskr2r';
const $=id=>document.getElementById(id);const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const btn=(label,fn,cls,iconName)=>{const b=el('button',label,cls);b.type='button';b.onclick=fn;if(iconName)b.prepend(iconNode(iconName));return b;};
applyIcons();initShell();
let records=[],hits=[],selected=new Set(),answers={},limit=24,local=null,activeAxis=null,activeLetter=null;const cats={remedies:'Remedi',symptoms:'Semptom',articles:'Yazı'};
const setup=$('setup');$('localButton').onclick=()=>setup.showModal();$('closeSetup').onclick=()=>setup.close();
$('setupPrompt').value='SifaBul yerel Codex sürümünü başlat. Bu bilgisayarda /Users/caglanacir/Documents/github/SifaBul/site/dist/local-server.mjs varsa onu kullan; yoksa SifaBul sitesinden indirdiğim sifabul-yerel.zip paketini kişisel bir klasöre aç. Node.js 22+ ve codex komutunu kontrol et; yeni kurulum gerekiyorsa önce bana sor. codex login status ile ChatGPT oturumunu doğrula; gerekirse codex login ile giriş yapmamı sağla. Paket klasöründe node local-server.mjs çalıştır. Sunucu yalnızca 127.0.0.1:5183 üzerinde çalışmalı; internete açma. http://localhost:5183/api/status yanıtını doğrula. Sonra “Sunucu çalışıyor” yaz ve http://localhost:5183 adresini ver. İstersem aynı komutu çalıştıran bir masaüstü kısayolu oluştur. Kaynak dosyalarını değiştirme; API anahtarı isteme.';
// Canlı sitede YZ: kendi API anahtarınız (varsayılan aiforyu). Anahtar yalnız bu tarayıcıda saklanır.
function remoteLocal(){const s=getRemote();return s?{ready:true,remote:true,model:s.model||'',message:'YZ hazır',stage:'Hazır',busy:false}:null;}
{
 const box=el('section',undefined,'remote-ai');box.innerHTML='<span class="kicker">API anahtarıyla YZ</span><h2>Bu sitede YZ kullan</h2><p class="muted">aiforyu (veya OpenAI uyumlu başka bir servis) API anahtarınızı girin. Anahtar yalnızca bu tarayıcıda saklanır; istekler doğrudan servise gider.</p><form class="remote-form" autocomplete="off"><label>API anahtarı<input type="password" name="key" autocomplete="off" spellcheck="false" placeholder="aify_…"></label><details><summary>Gelişmiş</summary><label>Adres<input name="base" spellcheck="false"></label></details><label>Model<select name="model"><option value="">Servis varsayılanı</option></select></label><div class="remote-actions"><button type="submit">Kaydet ve dene</button><button type="button" class="secondary" data-forget>Anahtarı sil</button></div><p class="remote-status" role="status"></p></form>';
 const form=box.querySelector('form'),status=box.querySelector('.remote-status'),modelSelect=form.model;
 const current=getRemote();form.base.value=current?.base||DEFAULT_BASE;if(current){form.key.placeholder='Kayıtlı anahtar · değiştirmek için yazın';if(current.model){modelSelect.append(new Option(current.model,current.model));modelSelect.value=current.model;}status.textContent=current.site?'Sitenin aiforyu anahtarı kullanılıyor'+(current.model?' · '+current.model:'')+'. İsterseniz kendi anahtarınızı girebilirsiniz.':'Kayıtlı anahtar var.';if(current.site)form.key.placeholder='aify_…';}
 form.onsubmit=async e=>{e.preventDefault();const saved=getRemote();const key=form.key.value.trim()||saved?.key;if(!key){status.textContent='Anahtarı yazın.';return;}const base=form.base.value.trim()||DEFAULT_BASE;status.textContent='Deneniyor…';
  try{const models=await listModels({base,key});const keep=modelSelect.value;modelSelect.replaceChildren(new Option('Servis varsayılanı',''),...models.map(m=>new Option(m,m)));const model=models.includes(keep)?keep:(models[0]||'');modelSelect.value=model;setRemote({base,key,model});form.key.value='';form.key.placeholder='Kayıtlı anahtar · değiştirmek için yazın';status.textContent='Bağlandı · '+(models.length?models.length+' model':'model listesi boş');if(!local||local.remote){local=remoteLocal();showActivity();$('mode').textContent='YZ hazır · '+(model||'varsayılan');}}
  catch(err){status.textContent=err.message;}};
 modelSelect.onchange=()=>{const s=getRemote();if(s){setRemote({...s,model:modelSelect.value});if(local?.remote){local.model=modelSelect.value;showActivity();}}};
 box.querySelector('[data-forget]').onclick=()=>{setRemote(null);form.key.value='';form.key.placeholder='aify_…';status.textContent='Anahtar silindi.';if(local?.remote){local=null;$('activity').hidden=true;$('localButton').classList.remove('ready');$('mode').textContent='';}};
 setup.querySelector('.kicker').before(box);
}
$('copyPrompt').onclick=async()=>{try{await navigator.clipboard.writeText($('setupPrompt').value);$('copyPrompt').textContent='Kopyalandı';}catch{$('setupPrompt').select();$('copyPrompt').textContent='Metni seçtim; kopyalayabilirsiniz';}};
function sourceLink(r,label='Orijinal kaynak'){const a=el('a',label,'ghost-button');a.href=r.url;a.target='_blank';a.rel='noopener noreferrer';a.append(iconNode('up'));return a;}
const cardAI=new Map();
const explanationState=new WeakMap();
const categoryMeta={remedies:{title:'Remedi kütüphanesi',type:'Remedi',icon:'remedies',help:'Kartlara dokunarak okuyun; + ile karşılaştırmaya ekleyin.'},symptoms:{title:'Semptom kütüphanesi',type:'Semptom',icon:'symptoms',help:'Bir belirtiden başlayın; kaynakta adı geçen remedilere tek dokunuşla geçin.'},articles:{title:'Yazı kütüphanesi',type:'Yazı',icon:'articles',help:'Konuları kaynaklarıyla derinlemesine inceleyin.'},all:{title:'Tüm kaynaklar',icon:'all',help:'Remediler, semptomlar ve yazılar; her biri kendi rengiyle.'}};
// Kayıttaki modalite satırlarından görünür eksen etiketleri çıkarılır (yalnız gösterim; eleme yapmaz).
const axisCache=new Map();
function recordAxes(r){if(axisCache.has(r.id))return axisCache.get(r.id);const text=norm(r.modalities.map(m=>m.text).join('\n'));const found=axes.filter(a=>a.terms.some(t=>text.includes(t)));axisCache.set(r.id,found);return found;}
const remedyNames=r=>[...r.original.matchAll(/^### (.+)$/gm)].map(m=>m[1].trim());
const initialOf=title=>norm(title).trim().charAt(0).toLocaleUpperCase('tr');
function setCategory(category){document.dispatchEvent(new Event('sifabul:open-library'));$('category').value=category;activeAxis=null;activeLetter=null;$('modality').value='';performSearch();}
document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>setCategory(b.dataset.category));
$('clearFilters').onclick=()=>{$('query').value='';$('modality').value='';activeAxis=null;activeLetter=null;performSearch();};
const reader=$('reader');$('closeReader').onclick=()=>reader.close();reader.addEventListener('click',e=>{if(e.target===reader){const r=reader.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)reader.close();}});
function openReader(r){const box=$('readerContent');box.replaceChildren();const top=el('div',undefined,'reader-title '+r.category);const glyph=el('span',undefined,'glyph');glyph.append(iconNode(categoryMeta[r.category].icon));const t=el('div');t.append(el('span',cats[r.category],'kicker'),el('h2',r.title));top.append(glyph,t);box.append(top);
 const found=recordAxes(r);if(found.length){const row=el('div',undefined,'chip-row');for(const a of found){const c=el('span',undefined,'axis-pill');c.append(iconNode(axisIcons[a.id]||'leaf'),el('span',a.label));row.append(c);}box.append(row);}
 const actions=el('div',undefined,'reader-actions');actions.append(sourceLink(r));const download=el('a','Markdown indir','ghost-button');download.href=r.download;download.download='';download.prepend(iconNode('down'));actions.append(download);box.append(actions);
 if(r.modalities.length){const d=el('details',undefined,'basis');const s=el('summary','Kaynakta geçen '+r.modalities.length+' modalite satırı');s.prepend(iconNode('filter'));d.append(s);const list=el('div',undefined,'evidence-list');for(const m of r.modalities){const row=el('div',undefined,'evidence-row');const main=el('div',undefined,'evidence-main');main.append(el('strong',m.heading+' · satır '+m.line),el('p',m.text));row.append(main);list.append(row);}d.append(list);box.append(d);}
 box.append(el('pre',r.original,'original'),el('p',r.file+' · SHA256 '+r.sha256,'meta mono'));reader.showModal();reader.scrollTop=0;}
function updateSelection(){const box=$('selected');box.replaceChildren();$('selectionCount').textContent=selected.size+' / 5';$('deskCount').textContent=selected.size?selected.size+' kaynak seçili':'Henüz kaynak seçilmedi';document.querySelector('.research-desk').classList.toggle('has-selection',selected.size>0);if(!selected.size){box.append(el('div','Kartlardaki + düğmesiyle en fazla 5 kaynak seçin.','empty-note'));}for(const id of selected){const r=records.find(x=>x.id===id),row=el('div',undefined,'selected-item '+r.category);const g=el('span',undefined,'glyph');g.append(iconNode(categoryMeta[r.category].icon));row.append(g,el('span',r.title));const b=btn('',()=>{selected.delete(id);answers={};render();updateSelection();},'icon-button','close');b.setAttribute('aria-label',r.title+' seçimini kaldır');row.append(b);box.append(row);}renderQuestion();}
function performSearch(){limit=24;const cat=$('category').value;const axis=axes.find(a=>a.id===activeAxis);hits=search(records,$('query').value,cat).filter(x=>!axis||recordAxes(x.record).includes(axis));render();}
function snippetFor(r){const lines=r.original.split('\n').filter(l=>l.trim()&&!l.startsWith('#')&&!l.startsWith('!['));const terms=norm($('query').value).split(/\s+/).filter(Boolean);let text=terms.length?lines.find(l=>terms.every(t=>norm(l).includes(t))):null;text=text||lines[0]||r.title;const normalized=norm(text);let at=terms.length?Math.max(0,normalized.indexOf(terms.find(t=>normalized.includes(t))||'')-55):0;const part=text.slice(at,at+160).replace(/\*\*/g,'');return (at?'…':'')+part+(at+160<text.length?'…':'');}
function renderFilters(){const cat=$('category').value;
 const axisBox=$('axisFilter');axisBox.replaceChildren();const pool=search(records,$('query').value,cat);const counts=new Map();for(const {record} of pool)for(const a of recordAxes(record))counts.set(a.id,(counts.get(a.id)||0)+1);
 const top=axes.filter(a=>counts.has(a.id)).sort((x,y)=>counts.get(y.id)-counts.get(x.id)).slice(0,14);
 axisBox.closest('.filter-line').hidden=!top.length;
 for(const a of top){const on=activeAxis===a.id;const b=btn('',()=>{activeAxis=on?null:a.id;activeLetter=null;performSearch();},'axis-chip'+(on?' active':''));b.append(iconNode(axisIcons[a.id]||'leaf'),el('span',a.label),el('small',String(counts.get(a.id)),'mono'));b.setAttribute('aria-pressed',String(on));axisBox.append(b);}
 const letters=[...new Set(hits.map(h=>initialOf(h.record.title)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));const box=$('letterIndex');box.replaceChildren();
 box.closest('.filter-line').hidden=letters.length<4;
 for(const L of letters){const on=activeLetter===L;const b=btn(L,()=>{activeLetter=on?null:L;limit=24;render();},'letter'+(on?' active':''));b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',L+' harfiyle başlayanlar');box.append(b);}
 $('clearFilters').hidden=!($('query').value||activeAxis||activeLetter);
}
function cardFor(r){const card=el('article',undefined,'card '+r.category);card.classList.toggle('is-selected',selected.has(r.id));
 const main=el('button',undefined,'card-main');main.type='button';main.onclick=()=>openReader(r);main.setAttribute('aria-label',r.title+' kaynağını oku');
 const glyph=el('span',undefined,'glyph');glyph.append(iconNode(categoryMeta[r.category].icon));const t=el('span',undefined,'card-titles');t.append(el('span',cats[r.category],'kicker'),el('strong',r.title,'card-title'));main.append(glyph,t);
 if(r.category==='articles'||$('query').value.trim())main.append(el('span',snippetFor(r),'card-snippet'));
 card.append(main);
 const found=recordAxes(r);if(found.length&&r.category!=='articles'){const row=el('div',undefined,'chip-row tight');for(const a of found.slice(0,5)){const c=el('span',undefined,'axis-pill mini');c.append(iconNode(axisIcons[a.id]||'leaf'),el('span',a.label));row.append(c);}if(found.length>5)row.append(el('span','+'+(found.length-5),'axis-pill mini more'));card.append(row);}
 const actions=el('div',undefined,'card-actions');
 if(r.category==='symptoms'){const names=remedyNames(r).map(norm);const related=records.filter(x=>x.category==='remedies'&&names.includes(norm(x.title)));if(related.length)actions.append(btn(related.length+' remedi',()=>{hits=related.map(record=>({record,score:0}));limit=24;selected.clear();answers={};activeAxis=null;activeLetter=null;$('query').value='';$('category').value='remedies';render();updateSelection();$('resultTitle').textContent=r.title;$('resultsHelp').textContent=r.title+' kaynağında adı geçen remediler.';},'pill-button','next'));}
 else actions.append(el('span',found.length?found.length+' modalite ekseni':'Özgün kaynak','mono dim'));
 const spacer=el('span',undefined,'spacer');actions.append(spacer);
 let state=cardAI.get(r.id);if(!state){const box=el('div',undefined,'card-ai'),button=btn('',()=>runAI([r.id],box,button),'icon-button ai','sparkle');button.setAttribute('aria-label',r.title+' için YZ ile kısa açıklama');button.title='YZ ile kısaca açıkla';state={box,button};cardAI.set(r.id,state);}
 const on=selected.has(r.id);const choose=btn('',()=>{if(!selected.has(r.id)&&selected.size>=5){$('resultsHelp').textContent='En fazla 5 kaynak seçebilirsiniz. Araştırma masasından birini çıkarın.';return;}selected.has(r.id)?selected.delete(r.id):selected.add(r.id);answers={};render();updateSelection();},'icon-button choose'+(on?' on':''),on?'check':'plus');choose.setAttribute('aria-label',r.title+(on?' karşılaştırmadan çıkar':' karşılaştırmaya ekle'));choose.setAttribute('aria-pressed',String(on));choose.title=on?'Karşılaştırmadan çıkar':'Karşılaştırmaya ekle';
 actions.append(state.button,choose);card.append(actions,state.box);return card;}
function render(){const out=$('results'),cat=$('category').value;out.replaceChildren();$('resultTitle').textContent=categoryMeta[cat].title;$('resultsHelp').textContent=categoryMeta[cat].help;document.querySelectorAll('[data-category]').forEach(b=>{const on=b.dataset.category===cat;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
 renderFilters();const shown=activeLetter?hits.filter(h=>initialOf(h.record.title)===activeLetter):hits;$('count').textContent=shown.length+' kaynak';
 for(const {record:r} of shown.slice(0,limit))out.append(cardFor(r));
 if(!shown.length){const empty=el('div',undefined,'empty-results');empty.append(iconNode('leaf','icon big'),el('h3','Biraz farklı arayalım.'),el('p','Daha kısa bir sözcük deneyin veya süzgeçleri temizleyin.'));out.append(empty);}$('more').hidden=limit>=shown.length;}
$('searchForm').onsubmit=e=>{e.preventDefault();performSearch();};let typingTimer;$('query').addEventListener('input',()=>{clearTimeout(typingTimer);typingTimer=setTimeout(()=>{activeLetter=null;performSearch();},180);});$('category').onchange=performSearch;$('more').onclick=()=>{limit+=24;render();};
$('start').onclick=()=>{if(!selected.size){const initial=hits.filter(x=>x.record.category==='remedies').slice(0,5);initial.forEach(x=>selected.add(x.record.id));render();updateSelection();}renderQuestion();};$('reset').onclick=()=>{answers={};renderQuestion();};
function renderQuestion(){const chosen=records.filter(r=>selected.has(r.id)&&r.category==='remedies'),box=$('question'),results=$('comparison');box.replaceChildren();results.replaceChildren();if(!chosen.length){box.append(el('p','Soru akışı için en az bir remedi seçin.','muted small'));return;}
 const q=nextQuestion(chosen,answers);if(q){const card=el('div',undefined,'mini-question');const h=el('div',undefined,'question-head');const g=el('span',undefined,'axis-glyph small');g.append(iconNode(axisIcons[q.id]||'leaf'));h.append(g,el('h3',q.question));card.append(h,el('p',`${q.worse} kaynakta ↑ artıyor · ${q.better} kaynakta ↓ azalıyor`,'mono dim'));const grid=el('div',undefined,'answer-grid compact');for(const [value,label,ic,tone] of [['worse','↑ Artıyor','up','worse'],['better','↓ Azalıyor','down','better'],['unknown','Bilmiyorum','unknown','']]){const b=btn('',()=>{answers[q.id]=value;renderQuestion();},'answer-tile '+tone);b.append(iconNode(ic,'icon tile-icon'),el('strong',label));grid.append(b);}card.append(grid);box.append(card);}else box.append(el('p','Kaynakta desteklenen sorular tamamlandı. Eksik koşulları YZ ile inceleyebilirsiniz.','muted small'));
 if(Object.keys(answers).length){box.append(el('p',`${Object.keys(answers).length} soru yanıtlandı. Bilinmeyen veya çift yönlü ifadeler puanlanmaz.`,'muted small'));for(const row of compare(chosen,answers)){const item=el('div',undefined,'compare-row'+(row.conflicts?' conflict':''));const head=el('div',undefined,'compare-head');head.append(el('strong',row.record.title),el('span',row.matches+' eşleşme · '+row.conflicts+' çelişki','badge'));item.append(head);const list=el('div',undefined,'evidence-list');for(const d of row.details)for(const ev of d.evidence){const r=el('div',undefined,'evidence-row '+ev.effect);const tag=el('span',undefined,'effect-tag '+ev.effect);tag.append(iconNode(ev.effect==='better'?'down':'up'),el('span',ev.effect==='better'?'Azalır':'Artar'));const m=el('div',undefined,'evidence-main');m.append(el('strong',d.axis+(d.ambiguous?' · iki yönlü':'')+' · satır '+ev.line),el('p',ev.text));r.append(tag,m);list.append(r);}item.append(list,sourceLink(row.record));results.append(item);}}
}
let aiBusy=false;
function showActivity(){if(!local)return;$('activity').hidden=false;$('localButton').innerHTML=icon('sparkle')+'<span>'+(local.remote?'YZ':'Codex')+'</span>';$('localButton').classList.toggle('ready',!!local.ready);$('localButton').title=local.remote?'YZ ayarları':'Yerel sürüm ayarları';$('localButton').classList.add('with-activity');{const head=document.querySelector('#activity .activity-head strong');if(head?.lastChild)head.lastChild.textContent=local.remote?' YZ · aiforyu':' Yerel Codex';}$('modelName').textContent=local.model?'Model · '+local.model:(local.remote?'Model · servis varsayılanı':'Model · Codex varsayılanı (henüz bildirilmedi)');$('stage').textContent=local.stage||local.message;$('aiProgress').hidden=!local.busy;$('activity').classList.toggle('running',!!local.busy);$('elapsed').textContent=local.busy&&local.startedAt?Math.max(0,Math.floor((Date.now()-local.startedAt)/1000))+' sn':'';}
async function refreshStatus(){if(local?.remote){showActivity();return;}try{const r=await fetch('/api/status');if(r.ok){local=await r.json();showActivity();}}catch{if(aiBusy)$('stage').textContent='Sunucu bağlantısı bekleniyor…';}}
// Seçili kaynakların modaliteleri yerelde çıkarılır (YZ gerekmez). Semptom kaynakları bağlam olarak kullanılır.
function modalityData(ids){
 const recs=ids.map(id=>records.find(r=>r.id===id)).filter(Boolean),context=recs.filter(r=>r.category==='symptoms');
 return recs.filter(r=>r.category!=='articles').map(r=>({id:r.id,title:r.title,rows:[...remedyProfile(r,r.category==='symptoms'?[]:context).values()].map(p=>({label:p.axis.label,effect:p.effect,texts:p.evidence.map(ev=>({effect:ev.effect,text:ev.text.replace(/^[-–•*\s]+/,'').replace(/\*+/g,'').trim()}))}))}));
}
// Klasik kaynak bankası (references.json) ilk gerektiğinde yüklenir; yoksa seçenek görünmez.
let referenceIndex=null;
async function loadReferences(){if(!referenceIndex){try{const r=await fetch('references.json');referenceIndex=r.ok?buildReferenceIndex(await r.json()):()=>[];}catch{referenceIndex=()=>[];}}return referenceIndex;}
async function referencesForIds(ids){const find=await loadReferences();const out=[];for(const id of ids){const rec=records.find(r=>r.id===id);for(const e of find(rec))if(out.length<6&&!out.some(x=>x.id==='ref/'+e.id))out.push(referenceRecord(e));}return out;}
function openSourceOrRef(r){if(r.category==='references')window.open(r.url,'_blank','noopener');else openReader(r);}
async function runAI(ids,box,button,detail=false,fixedQuestion=null,baseQuestion=null,withRefs=false){if(!local?.ready){setup.showModal();const wrap=el('div',undefined,'ai-result');wrap.append(modalityPanel(modalityData(ids),true));box.replaceChildren(wrap,el('p',local?.message||'YZ açıklaması için yerel sürümü açın.','error'));return;}if(!ids.length){box.replaceChildren(el('p','Önce en az bir kaynak seçin.','error'));return;}if(aiBusy)return;
 aiBusy=true;button.disabled=true;box.setAttribute('aria-busy','true');const loading=el('p',detail?'Ayrıntılı açıklama hazırlanıyor…':'Kısa özet hazırlanıyor…','loading');if(!box.querySelector('.ai-modalities')){const wrap=el('div',undefined,'ai-result');wrap.append(modalityPanel(modalityData(ids)));box.replaceChildren(wrap);}box.append(loading);local.busy=true;local.startedAt=Date.now();local.stage='Kaynaklar gönderiliyor';showActivity();const poll=local.remote?null:setInterval(refreshStatus,1000);
 try{const question=(fixedQuestion||(($('context').value||'Bu kaynakları özgün metinlere dayanarak açıkla ve ayırt edici modaliteleri karşılaştır.')+'\nArama: '+$('query').value+'\nModalite yanıtları: '+JSON.stringify(answers))).slice(0,2500);
 const refs=withRefs?await referencesForIds(ids):[];
 let answer;if(local.remote){const remote=getRemote();if(!remote)throw Error('API anahtarı bulunamadı.');local.stage='YZ yanıtı hazırlanıyor';showActivity();answer=await remoteSynth({ids,question,detail,refs},records,remote,n=>{local.stage='YZ yazıyor · '+n+' karakter';showActivity();});local.stage='Alıntılar doğrulandı';}
 else{const response=await fetch('/api/synthesize',{method:'POST',headers:{'Content-Type':'application/json','X-SifaBul-Token':local.token},body:JSON.stringify(refs.length?{ids,question,detail,refs:refs.map(r=>r.id)}:{ids,question,detail})});answer=await response.json();if(!response.ok)throw Error(answer.error||'Yanıt alınamadı.');}
 const previous=explanationState.get(box);
 const rootQuestion=baseQuestion??question;
 const state={shortAnswer:detail&&previous?previous.shortAnswer:answer,detailAnswer:detail?answer:null};
 explanationState.set(box,state);
 const available=(await referencesForIds(ids));
 renderExplanation(box,{...state,records:records.concat(refs,available),modalities:modalityData(ids),preserveDrafts:detail,initialView:detail?'full':'overview',onSource:openSourceOrRef,referenceCount:available.length,usedReferences:withRefs,
  onReferences:control=>runAI(ids,box,control,true,question,rootQuestion,true),
  onDetail:control=>runAI(ids,box,control,true,question,rootQuestion,withRefs),
  onFollow:(text,control)=>{
   const follow='\nYeni istek veya takip yanıtı: '+text;
   const request=rootQuestion.slice(0,Math.max(0,2500-follow.length))+follow;
   runAI(ids,box,control,false,request.slice(0,2500),rootQuestion,withRefs);
  }
 });
 if(box.isConnected)box.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});

 }catch(e){box.append(el('p',e.message,'error'));if(local.remote)local.stage=e.message;}finally{loading.remove();if(poll)clearInterval(poll);if(local.remote)local.busy=false;aiBusy=false;button.disabled=false;box.setAttribute('aria-busy','false');await refreshStatus();}}
$('synthesize').onclick=()=>runAI([...selected],$('ai'),$('synthesize'));
try{const r=await fetch('data.json');if(!r.ok)throw Error('Kaynak verisi yüklenemedi.');records=(await r.json()).records;performSearch();updateSelection();await initAssistant({records,getLocal:()=>local,refreshStatus,openSetup:()=>setup.showModal(),openSource:openReader,synthesize:runAI});await initCabinet({records,openSource:openReader});initModels();}catch(e){$('count').textContent='Yükleme hatası';$('results').textContent=e.message;}
if(['localhost','127.0.0.1'].includes(location.hostname)){try{const r=await fetch('/api/status');if(r.ok){local=await r.json();showActivity();$('mode').textContent=local.ready?'Yerel Codex hazır':'Yerel sürüm · giriş gerekli';}}catch{}}
if(!local?.ready){const r=remoteLocal();if(r){local=r;showActivity();$('mode').textContent='YZ hazır · '+(r.model||'aiforyu');}}
fetch('package-info.json').then(r=>r.ok?r.json():null).then(x=>{if(x)$('packageSize').textContent=x.size;}).catch(()=>{});
