// Remedi bul: şikâyeti yaz, kaynakta adı geçen remediler hemen sıralansın; modalitelerle daralt veya grupla.
// Kayıt/eşitleme kodu önceki sürümle aynıdır.
import {loadMemory,getMemory,subscribeMemory,saveSessions} from './memory-client.mjs?v=mwkskr2r';
import {buildCandidates} from './assistant-engine.mjs?v=mwkskr2r';
import {axes,norm,evidence} from './search.mjs?v=mwkskr2r';
import {setView} from './shell.mjs?v=mwkskr2r';
import {iconNode,axisIcons} from './icons.mjs?v=mwkskr2r';
import {buildClusters} from './symptom-map.mjs?v=mwkskr2r';
import {matchSymptoms,remedyProfile,axisSummary} from './find.mjs?v=mwkskr2r';
const $=id=>document.getElementById(id);
const e=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(label,fn,cls='chip')=>{const b=e('button',label,cls);b.type='button';b.onclick=fn;return b;};
const withIcon=(node,name,cls)=>{node.prepend(iconNode(name,cls||'icon'));return node;};
const ARROW={worse:'↑',better:'↓',both:'↕'};
const WORD={worse:'artıyor',better:'azalıyor',both:'iki yönlü'};

export async function initAssistant(hooks){
 const {records}=hooks;const initial=await loadMemory();let saved={sessions:JSON.parse(JSON.stringify(initial.sessions.sessions)),inventory:initial.inventory.items.map(x=>x.recordId).filter(Boolean),memory:initial.sessions.preferences.remember};let inventoryCount=initial.inventory.items.length;
 let session=null,onlyOwned=false,summarySignature='';
 let persistenceQueue=Promise.resolve(),persistenceEpoch=0,persistenceBlocked=false,pendingWrites=0,pendingPreferences=0,rememberDesired=saved.memory;
 let epoch=0;
 const clusters=buildClusters(records);
 // Arama durumu
 let query='',selected=[],filters={},groupAxis=null,expanded=new Set(),showAllAxes=false,boardOpen=false;
 const root=$('assistantView');root.innerHTML=`
 <header class="view-head find-head">
  <div><span class="kicker">REMEDİ BUL</span><h1>Şikâyeti yaz, remediler sıralansın.</h1></div>
  <div class="view-tools">
   <span id="memorySaveState" class="status-pill" role="status"></span>
   <label class="switch" title="Aramaları Belgeler/Hafiza/gorusmeler.json dosyasında sakla"><input id="rememberSession" type="checkbox"><span class="switch-track"></span><span>Geçmişe kaydet</span></label>
  </div>
 </header>
 <form id="findForm" class="find-bar" role="search" autocomplete="off"><span class="find-icon" data-icon="search"></span><label class="sr-only" for="findInput">Şikâyet</label><input id="findInput" type="search" placeholder="Ör. burun tıkanıklığı" enterkeyhint="search"><button id="clearFind" class="icon-button" type="button" aria-label="Aramayı temizle" data-icon="close" hidden></button></form>
 <div id="symptomChips" class="symptom-chips" aria-live="polite"></div>
 <div class="find-grid">
  <section class="results-col" aria-label="Remedi listesi">
   <div id="resultsHead" class="results-head"></div>
   <div id="activeFilters" class="active-filters"></div>
   <div id="remedyList" class="remedy-list"></div>
   <div id="excludedBox"></div>
   <div id="assistantSummary" aria-live="polite"></div>
  </section>
  <aside id="board" class="board" aria-label="Modaliteye göre ayrıştır">
   <button id="boardToggle" class="board-toggle" type="button" aria-expanded="false" aria-controls="axisBoard"><span data-icon="filter"></span><span>Ayrıştır</span><small id="boardBadge"></small></button>
   <div class="board-body"><div class="board-head"><h2>Ayrıştır</h2><p>Şikâyet hangi durumda artıyor, hangisinde azalıyor? Dokun, liste daralsın. Grupla ile listeyi o modaliteye göre böl.</p></div><div id="axisBoard" class="axis-board"></div><label class="switch board-switch"><input type="checkbox" id="onlyOwned"><span class="switch-track"></span><span>Yalnız dolabımdakiler <small id="ownedCount"></small></span></label></div>
  </aside>
 </div>
 <dialog id="historyDialog" class="sheet"><button class="close" id="closeHistory" type="button" aria-label="Geçmişi kapat" data-icon="close"></button><span class="kicker">PROJE HAFIZASINDA</span><h2>Geçmiş aramalar</h2><p class="muted">Bir aramaya dokunun; seçtiğiniz modalitelerle birlikte açılır.</p><div id="historyList" class="history-list"></div><button id="clearHistory" class="danger-button" type="button">Geçmişi sil</button></dialog>`;
 for(const n of root.querySelectorAll('[data-icon]')){n.prepend(iconNode(n.dataset.icon));n.dataset.iconReady='1';}
 {const pill=$('memorySaveState');new MutationObserver(()=>{const t=pill.textContent;pill.title=t;pill.classList.toggle('long',t.length>60);}).observe(pill,{childList:true,characterData:true,subtree:true});}
 const clone=value=>JSON.parse(JSON.stringify(value));
 const conflictHelp='Güvenli kayıt için bekleyen işlemler durduruldu. Güncel bir görüşmeyi Geçmiş’ten açın veya Yeni görüşme ile başlayın; mevcut taslak otomatik yazılmayacak.';
 function updateMemoryControls(){const writable=getMemory()?.writable===true;$('rememberSession').disabled=!writable||persistenceBlocked;$('clearHistory').disabled=!writable||persistenceBlocked;$('rememberSession').checked=rememberDesired;}
 function resetPersistence(){
  if(!persistenceBlocked)return;
  persistenceEpoch++;persistenceBlocked=false;rememberDesired=getMemory().sessions.preferences.remember;
  $('memorySaveState').textContent='Güncel kayıtlarla devam ediliyor.';updateMemoryControls();
 }
 function queuePersistence(operation){
  if(persistenceBlocked){$('memorySaveState').textContent=conflictHelp;return Promise.resolve(false);}
  if(!getMemory()?.writable){$('memorySaveState').textContent='Kayıt için yerel sürümü açın.';return Promise.resolve(false);}
  const job=clone(operation),jobEpoch=persistenceEpoch;pendingWrites++;if(job.kind==='preference')pendingPreferences++;
  $('memorySaveState').textContent='Proje dosyasına kaydediliyor…';
  const result=persistenceQueue.then(async()=>{
   if(persistenceBlocked||jobEpoch!==persistenceEpoch)return false;
   // Her iş sunucunun son onayladığı listeye yalnız kendi değişikliğini uygular.
   const current=getMemory(),base=current.sessions;let next=clone(base.sessions);const preferences={...base.preferences};
   const upsert=draft=>{next=[draft,...next.filter(item=>item.id!==draft.id)].slice(0,20);};
   if(job.kind==='upsert'){if(!preferences.remember){$('memorySaveState').textContent='Görüşme kaydı kapalı; bu taslak dosyaya yazılmadı.';return true;}upsert(job.session);}
   else if(job.kind==='preference'){
    preferences.remember=job.remember;
    if(!job.remember&&job.sessionId)next=next.filter(item=>item.id!==job.sessionId);
    else if(job.remember&&job.session)upsert(job.session);
   }else if(job.kind==='clear')next=[];
   else throw Error('Desteklenmeyen görüşme kayıt işlemi.');
   const value=await saveSessions(next,preferences,base.revision);
   if(jobEpoch===persistenceEpoch&&!persistenceBlocked)$('memorySaveState').textContent=pendingWrites>1?'Son değişiklikler kaydediliyor…':value.sync?.pending?'Proje dosyasına kaydedildi · yayın güncellemesi bekliyor':'Proje dosyası güncel.';
   return true;
  }).catch(err=>{
   if(jobEpoch===persistenceEpoch){
    // Belirsiz/başarısız kayıt da otomatik tekrar edilmez; eski işler yeni veriyi ezemez.
    persistenceBlocked=true;persistenceEpoch++;rememberDesired=getMemory().sessions.preferences.remember;
    $('memorySaveState').textContent=err.message+' '+conflictHelp;updateMemoryControls();
   }
   return false;
  }).finally(()=>{
   pendingWrites--;if(job.kind==='preference')pendingPreferences--;
   if(!pendingPreferences)rememberDesired=getMemory().sessions.preferences.remember;
   updateMemoryControls();
  });
  persistenceQueue=result.then(()=>{});return result;
 }
 function save(){
  if(!session||!rememberDesired)return;
  session.updatedAt=new Date().toISOString();
  queuePersistence({kind:'upsert',session:clone(session)});
 }
 function view(which){if($('cabinetView'))$('cabinetView').hidden=true;document.body.classList.remove('cabinet-open');history.replaceState(null,'',which==='library'?'#kutuphane':'#asistan');root.hidden=which!=='assistant';$('libraryView').hidden=which!=='library';setView(which);}
 document.addEventListener('sifabul:open-library',()=>view('library'));
 $('assistantNav').onclick=()=>{view('assistant');$('findInput').focus();};document.querySelectorAll('[data-open-library]').forEach(n=>n.onclick=()=>view('library'));
 $('rememberSession').checked=rememberDesired;$('rememberSession').onchange=()=>{rememberDesired=$('rememberSession').checked;if(session&&rememberDesired)session.updatedAt=new Date().toISOString();queuePersistence({kind:'preference',remember:rememberDesired,sessionId:session?.id||null,session:rememberDesired&&session?clone(session):null});};
 $('onlyOwned').onchange=()=>{onlyOwned=$('onlyOwned').checked;render();};
 $('boardToggle').onclick=()=>{boardOpen=!boardOpen;render();};

 // ---------- Arama ----------
 const input=$('findInput');let typingTimer=null;
 function runQuery(text,{keepSelection=false}={}){query=text;$('clearFind').hidden=!text;if(!keepSelection){const best=matchSymptoms(records,text)[0];selected=best?[best.record.id]:[];filters={};groupAxis=null;expanded=new Set();resetPersistence();epoch++;session=null;}render();scheduleSave();}
 input.addEventListener('input',()=>{clearTimeout(typingTimer);typingTimer=setTimeout(()=>runQuery(input.value.trim()),160);});
 $('findForm').onsubmit=ev=>{ev.preventDefault();clearTimeout(typingTimer);runQuery(input.value.trim());const first=$('remedyList').querySelector('.row-main');if(first&&matchMedia('(max-width: 760px)').matches)input.blur();};
 $('clearFind').onclick=()=>{input.value='';runQuery('');input.focus();};
 function toggleSymptom(id){selected=selected.includes(id)?selected.filter(x=>x!==id):[...selected,id];filters={};groupAxis=null;expanded=new Set();render();scheduleSave();}

 // Bir arama, hafıza şemasına uyan bir görüşme kaydı olarak saklanır (yalnız "Geçmişe kaydet" açıksa).
 let saveTimer=null;
 function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{if(!selected.length&&!query)return;const names=selected.map(id=>records.find(r=>r.id===id)?.title).filter(Boolean);
  const message='Arama · '+(query||names.join(', '))+(names.length?' → '+names.join(', '):'');
  session={id:session?.id||crypto.randomUUID(),message:message.slice(0,5000),analysis:{summary:'',keywords:query?[query.slice(0,80)]:[],symptomIds:[...selected],facts:[],answers:{},safety:{level:'none',message:''},patient:'unknown',ageYears:null},answers:{...filters},safetyAnswers:{},confirmed:true,createdAt:session?.createdAt||new Date().toISOString()};
  save();},700);}

 function analysis(){return {symptomIds:selected,keywords:selected.length?[]:(query?[query]:[]),answers:{},safety:{level:'none'}};}
 function contextSources(){return records.filter(r=>selected.includes(r.id));}
 const profileCache=new Map();
 function profileOf(record){const key=record.id+'|'+selected.join(',');if(!profileCache.has(key))profileCache.set(key,remedyProfile(record,contextSources()));return profileCache.get(key);}

 // ---------- Görünüm ----------
 function renderChips(){const box=$('symptomChips');box.replaceChildren();
  if(!query&&!selected.length){box.append(e('span','Ya da bir alandan seç','kicker muted'));const wrap=e('div',undefined,'browse');for(const c of clusters){const d=e('details',undefined,'browse-group');const s=e('summary');s.append(iconNode(c.icon),e('span',c.label),e('small',String(c.items.length),'mono'));d.append(s);const row=e('div',undefined,'chip-row');for(const item of c.items)row.append(button(item.record.title,()=>{input.value=item.record.title;query=item.record.title;$('clearFind').hidden=false;selected=[item.record.id];filters={};groupAxis=null;render();scheduleSave();},'chip'));d.append(row);wrap.append(d);}box.append(wrap);return;}
  const all=query?matchSymptoms(records,query):[],top=all[0]?.score||0,matches=all.filter(m=>m.score>=top*.45).slice(0,8);
  const ids=[...new Set([...selected,...matches.map(m=>m.record.id)])];
  if(!ids.length){box.append(e('span','“'+query+'” adında semptom kaynağı yok; remedi metinlerinde aranıyor.','muted small'));return;}
  for(const id of ids){const r=records.find(x=>x.id===id);const on=selected.includes(id);const b=button('',()=>toggleSymptom(id),'symptom-chip'+(on?' on':''));b.setAttribute('aria-pressed',String(on));b.append(iconNode(on?'check':'plus'),e('span',r.title));box.append(b);}
  if(selected.length>1)box.append(e('span',selected.length+' semptom birlikte: listede hepsinin remedileri','muted small'));
 }

 function tag(p,active){const t=e('span',undefined,'mod-tag '+p.effect+(active?' active':''));t.append(iconNode(axisIcons[p.axis.id]||'leaf'),e('span',p.axis.label),e('b',ARROW[p.effect]));t.title=p.axis.label+': '+WORD[p.effect];return t;}

 function remedyRow(row,index){const {record}=row;const profile=profileOf(record),owned=saved.inventory.includes(record.id),open=expanded.has(record.id);
  const card=e('article',undefined,'remedy-row'+(open?' open':'')+(owned?' owned':''));
  const main=button('',()=>{open?expanded.delete(record.id):expanded.add(record.id);render();},'row-main');main.setAttribute('aria-expanded',String(open));
  const name=e('div',undefined,'row-name');name.append(e('span',String(index+1).padStart(2,'0'),'row-rank mono'));const title=e('h3',record.title);name.append(title);if(owned)name.append(withIcon(e('span','Dolabımda','badge owned'),'cabinet'));if(row.matches)name.append(e('span',row.matches+' eşleşme','badge match'));main.append(name);
  const tags=e('div',undefined,'row-tags');const list=[...profile.values()].sort((a,b)=>(b.axis.id in filters)-(a.axis.id in filters)||(b.axis.id===groupAxis)-(a.axis.id===groupAxis));
  for(const p of list.slice(0,open?99:6))tags.append(tag(p,p.axis.id in filters||p.axis.id===groupAxis));if(!open&&list.length>6)tags.append(e('span','+'+(list.length-6),'mod-tag more'));if(!list.length)tags.append(e('span','Bu şikâyet için modalite bilgisi yok','muted small'));
  main.append(tags,iconNode('chevron','icon row-chevron'));card.append(main);
  const tools=e('div',undefined,'row-tools');const read=button('',()=>hooks.openSource(record),'icon-button');read.append(iconNode('book'));read.setAttribute('aria-label',record.title+' kaynağını oku');read.title='Kaynağı oku';tools.append(read);card.append(tools);
  if(open){const detail=e('div',undefined,'row-detail');
   for(const p of list){const g=e('div',undefined,'evidence-group');const side=e('div',undefined,'group-axis');const nm=e('span',undefined,'group-name');nm.append(iconNode(axisIcons[p.axis.id]||'leaf'),e('span',p.axis.label));side.append(nm,e('span',ARROW[p.effect]+' '+WORD[p.effect],'effect-word '+p.effect));
    const quotes=e('ul',undefined,'group-quotes');for(const ev of p.evidence){const li=e('li',undefined,ev.effect);li.append(e('span',(ev.effect==='worse'?'↑ ':'↓ ')+ev.text.replace(/^[-–•]\s*/,''),'quote'));const src=records.find(x=>x.id===(ev.sourceId||record.id))||record;const b=button('',()=>hooks.openSource(src),'line-link');b.append(e('span',(src.id!==record.id?src.title+' · ':'')+'satır '+ev.line),iconNode('book'));b.setAttribute('aria-label',src.title+' satır '+ev.line+' kaynağını aç');li.append(b);quotes.append(li);}
    g.append(side,quotes);detail.append(g);}
   const ai=e('div',undefined,'row-ai');const ask=withIcon(button('YZ ile açıkla',()=>hooks.synthesize([record.id],ai,ask,false,('Bu remediyi şu şikâyet bağlamında kaynağa dayanarak kısaca açıkla: '+(query||selected.map(id=>records.find(r=>r.id===id)?.title).join(', '))+'. Seçilen modaliteler: '+JSON.stringify(filters)+'. Tedavi veya doz önerme.').slice(0,2500)),'ghost-button'),'sparkle');detail.append(ask,ai);card.append(detail);}
  return card;}

 function render(){const signature=JSON.stringify([selected,query,filters,onlyOwned]);if(signature!==summarySignature){const fresh=e('div');fresh.id='assistantSummary';fresh.setAttribute('aria-live','polite');$('assistantSummary').replaceWith(fresh);summarySignature=signature;}
  renderChips();$('ownedCount').textContent='('+inventoryCount+' şişe)';
  const head=$('resultsHead'),list=$('remedyList'),excludedBox=$('excludedBox'),board=$('axisBoard'),active=$('activeFilters');[head,list,excludedBox,board,active].forEach(n=>n.replaceChildren());
  root.classList.toggle('has-results',!!(query||selected.length));
  if(!query&&!selected.length){$('board').hidden=true;return;}
  const result=buildCandidates(records,analysis(),filters,saved.inventory,onlyOwned);
  const rows=[...result.candidates].sort((a,b)=>b.matches-a.matches||(saved.inventory.includes(b.record.id)-saved.inventory.includes(a.record.id))||a.record.title.localeCompare(b.record.title,'tr'));
  // Başlık
  const h=e('div',undefined,'count-line');h.append(e('strong',String(rows.length),'big-count'),e('span',rows.length===result.initialCount?' remedi':' / '+result.initialCount+' remedi'));head.append(h);
  const ctx=e('span',selected.length?'Kaynak: '+selected.map(id=>records.find(r=>r.id===id)?.title).join(' + '):(query?'Remedi metinlerinde “'+query+'”':''),'muted small');head.append(ctx);
  if(rows.length>1){const cmp=withIcon(button('YZ ile karşılaştır',()=>hooks.synthesize(rows.slice(0,5).map(r=>r.record.id),$('assistantSummary'),cmp,false,('Şikâyet: '+(query||'')+'. Seçilen modaliteler (worse=artıyor, better=azalıyor): '+JSON.stringify(filters)+'. Bu remedileri kaynaklara dayanarak karşılaştır; ayırt edici modaliteleri belirt. Tedavi veya doz önerme.').slice(0,2500)),'ghost-button small-button'),'sparkle');cmp.title='İlk 5 remediyi karşılaştırır';head.append(cmp);}
  // Etkin süzgeçler
  for(const [id,value] of Object.entries(filters)){const axis=axes.find(a=>a.id===id);const c=button('',()=>{delete filters[id];render();scheduleSave();},'filter-chip '+value);c.append(iconNode(axisIcons[id]||'leaf'),e('span',axis.label+' '+ARROW[value]+' '+WORD[value]),iconNode('close','icon dim'));c.setAttribute('aria-label',axis.label+' '+WORD[value]+' süzgecini kaldır');active.append(c);}
  if(Object.keys(filters).length>1)active.append(button('Tümünü temizle',()=>{filters={};render();scheduleSave();},'text-button'));
  // Liste
  if(!rows.length){list.append(e('p',result.reason,'empty-note'));}
  else if(groupAxis){const axis=axes.find(a=>a.id===groupAxis);const buckets={worse:[],better:[],both:[],none:[]};for(const r of rows){const p=profileOf(r.record).get(groupAxis);buckets[p?p.effect:'none'].push(r);}
   const gh=e('div',undefined,'group-banner');gh.append(iconNode(axisIcons[groupAxis]||'leaf'),e('span','Gruplandı: '+axis.label),button('Gruplamayı kaldır',()=>{groupAxis=null;render();},'text-button'));list.append(gh);
   let n=0;for(const [key,label] of [['worse',axis.label+' ile ↑ artanlar'],['better',axis.label+' ile ↓ azalanlar'],['both','İki yönlü'],['none','Kaynakta '+axis.label.toLocaleLowerCase('tr')+' bilgisi yok']]){if(!buckets[key].length)continue;const sec=e('section',undefined,'group-section '+key);sec.append(e('h4',label+' · '+buckets[key].length));for(const r of buckets[key])sec.append(remedyRow(r,n++));list.append(sec);}}
  else rows.forEach((r,i)=>list.append(remedyRow(r,i)));
  if(result.excluded?.length){const d=e('details',undefined,'excluded');d.append(withIcon(e('summary',result.excluded.length+' remedi seçtiğin modaliteyle çelişti'),'filter'));const row=e('div',undefined,'chip-row');for(const x of result.excluded)row.append(button(x.record.title,()=>hooks.openSource(x.record),'chip dim-chip'));d.append(row);excludedBox.append(d);}
  // Ayrıştırma panosu
  $('board').hidden=false;$('board').classList.toggle('open',boardOpen);$('boardToggle').setAttribute('aria-expanded',String(boardOpen));
  const summary=axisSummary(rows.map(r=>profileOf(r.record)));const activeIds=Object.keys(filters);
  for(const id of activeIds)if(!summary.some(s=>s.axis.id===id))summary.unshift({axis:axes.find(a=>a.id===id),worse:0,better:0});
  summary.sort((a,b)=>(activeIds.includes(b.axis.id)-activeIds.includes(a.axis.id)));
  $('boardBadge').textContent=activeIds.length?activeIds.length+' seçili':summary.length+' modalite';
  if(!summary.length)board.append(e('p','Bu listede ayırt edici modalite bilgisi yok.','muted small'));
  summary.forEach((s,i)=>{const row=e('div',undefined,'axis-row'+(i>=10&&!showAllAxes&&!activeIds.includes(s.axis.id)?' extra':''));const label=e('span',undefined,'axis-label');label.append(iconNode(axisIcons[s.axis.id]||'leaf'),e('span',s.axis.label));row.append(label);
   for(const value of ['worse','better']){const n=s[value],on=filters[s.axis.id]===value;const b=button('',()=>{if(on)delete filters[s.axis.id];else filters[s.axis.id]=value;expanded=new Set();render();scheduleSave();},'dir-button '+value+(on?' on':''));b.disabled=!n&&!on;b.append(e('b',ARROW[value]),e('span',value==='worse'?'Artıyor':'Azalıyor'),e('small',String(n),'mono'));b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',s.axis.label+' ile '+WORD[value]+': '+n+' remedi');row.append(b);}
   const g=button('',()=>{groupAxis=groupAxis===s.axis.id?null:s.axis.id;render();},'group-button'+(groupAxis===s.axis.id?' on':''));g.append(iconNode('all'));g.setAttribute('aria-pressed',String(groupAxis===s.axis.id));g.setAttribute('aria-label',s.axis.label+' modalitesine göre grupla');g.title='Bu modaliteye göre grupla';row.append(g);board.append(row);});
  if(summary.length>10&&!showAllAxes)board.append(button('Tüm modaliteler ('+summary.length+')',()=>{showAllAxes=true;render();},'text-button'));
 }

 // ---------- Geçmiş ----------
 function restore(item){resetPersistence();epoch++;session=clone(item);const a=item.analysis||{};selected=(a.symptomIds||[]).filter(id=>records.some(r=>r.id===id));filters={...(a.answers||{}),...(item.answers||{})};for(const k of Object.keys(filters))if(filters[k]==='unknown')delete filters[k];
  query=item.message.startsWith('Arama · ')?item.message.slice(8).split(' → ')[0]:(selected.length?'':(a.keywords||[])[0]||'');input.value=query||selected.map(id=>records.find(r=>r.id===id)?.title).join(', ');$('clearFind').hidden=!input.value;groupAxis=null;expanded=new Set();render();}
 function renderHistory(){const box=$('historyList');box.replaceChildren();if(!saved.sessions.length)box.append(e('p','Henüz kaydedilmiş arama yok.','empty-note'));for(const item of saved.sessions){const row=button('',()=>{$('historyDialog').close();view('assistant');restore(item);},'history-item');const n=Object.values({...item.analysis?.answers,...item.answers}).filter(v=>v!=='unknown').length;row.append(iconNode('search','icon history-icon'));const text=e('span',undefined,'history-text');text.append(e('strong',item.message.replace(/^Arama · /,'').replace(/^Dokunarak seçildi · /,'').slice(0,110)),e('small',new Date(item.updatedAt||item.createdAt).toLocaleString('tr-TR')+(n?' · '+n+' modalite':''),'mono'));row.append(text,iconNode('next','icon dim'));box.append(row);}}
 function openHistory(){view('assistant');renderHistory();$('historyDialog').showModal();}
 $('historyNav').onclick=openHistory;$('closeHistory').onclick=()=>$('historyDialog').close();$('clearHistory').onclick=async()=>{if(await queuePersistence({kind:'clear'})){renderHistory();if(!saved.sessions.length)$('historyList').replaceChildren(e('p','Geçmiş dosyadan temizlendi.','empty-note'));}};
 const requestedHash=location.hash;view('assistant');if(requestedHash==='#dolabim')history.replaceState(null,'','#dolabim');if(requestedHash==='#kutuphane')view('library');subscribeMemory(value=>{
  saved.sessions=clone(value.sessions.sessions);saved.memory=value.sessions.preferences.remember;
  if(!pendingPreferences)rememberDesired=saved.memory;
  inventoryCount=value.inventory.items.length;saved.inventory=value.inventory.items.map(x=>x.recordId).filter(Boolean);
  updateMemoryControls();if($('historyDialog').open)renderHistory();render();
 });updateMemoryControls();render();
 if(!requestedHash||requestedHash==='#asistan')requestAnimationFrame(()=>input.focus({preventScroll:true}));
}
