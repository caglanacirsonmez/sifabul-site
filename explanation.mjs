// YZ açıklamasının görünümü. İçerik korunur; ağ isteğini çağıran denetleyici yürütür.
let nextResultId=0;
const node=(tag,text,className)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;};
const action=(label,handler,className)=>{const button=node('button',label,className);button.type='button';button.addEventListener('click',()=>handler(button));return button;};
const answer=value=>({summary:typeof value?.summary==='string'?value.summary:'',question:typeof value?.question==='string'?value.question:'',citations:Array.isArray(value?.citations)?value.citations.filter(c=>typeof c?.id==='string'&&typeof c?.quote==='string'):[]});
function preview(text){
 const clean=text.trim().replace(/^(?:[-*•]|\d+[.)])\s+/,'');
 const sentence=clean.match(/^[\s\S]*?[.!?](?=\s|$)/)?.[0]||clean;
 const chars=Array.from(sentence);return chars.length>140?chars.slice(0,139).join('')+'…':sentence;
}
function previews(summary){
 const paragraphs=summary.split(/\n\s*\n|\n(?=\s*(?:[-*•]|\d+[.)])\s)/).map(x=>x.trim()).filter(Boolean);
 return paragraphs.slice(0,3).map(preview);
}

/** Tam kısa/ayrıntılı yanıt, sorular ve birebir kaynak alıntıları erişilebilir kalır. */
export function renderExplanation(box,{shortAnswer,detailAnswer=null,records=[],onDetail,onFollow,onSource,initialView='overview',preserveDrafts=false,modalities=null,onReferences=null,referenceCount=0,usedReferences=false}={}){
 const draftKey=input=>JSON.stringify([input.getAttribute('aria-label'),input.closest('.ai-followup')?.querySelector('.ai-question')?.textContent||'']);
 const drafts=new Map(preserveDrafts?[...box.querySelectorAll('.ai-reply textarea')].map(input=>[draftKey(input),{value:input.value,open:input.closest('details').open}]):[]);
 const short=answer(shortAnswer),detail=detailAnswer===null?null:answer(detailAnswer);
 const versions=detail?{short,detail}:{short};let selectedVersion=detail?'detail':'short';
 const prefix='ai-result-'+(++nextResultId),result=node('section',undefined,'ai-result');
 result.setAttribute('aria-label','Kaynaklara dayalı YZ açıklaması');
 const citations=[],seen=new Set();
 for(const citation of [...short.citations,...(detail?.citations||[])]){const key=JSON.stringify([citation.id,citation.quote]);if(!seen.has(key)){seen.add(key);citations.push(citation);}}
 const groups=new Map();for(const citation of citations){if(!groups.has(citation.id))groups.set(citation.id,[]);groups.get(citation.id).push(citation.quote);}
 const tabs=node('div',undefined,'ai-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Açıklama görünümü');tabs.setAttribute('aria-orientation','horizontal');
 const views=[['overview','Özet'],['full','Tam açıklama'],['sources','Kaynaklar ('+groups.size+')']];
 const tabButtons=new Map(),panels=new Map();let activeView=views.some(([id])=>id===initialView)?initialView:'overview';
 for(const [id,label] of views){
  const button=action(label,()=>setView(id));button.id=prefix+'-tab-'+id;button.setAttribute('role','tab');button.setAttribute('aria-controls',prefix+'-panel-'+id);
  button.addEventListener('keydown',event=>{
   const current=views.findIndex(([key])=>key===id);let index;
   if(event.key==='ArrowRight')index=(current+1)%views.length;else if(event.key==='ArrowLeft')index=(current+views.length-1)%views.length;else if(event.key==='Home')index=0;else if(event.key==='End')index=views.length-1;else return;
   event.preventDefault();setView(views[index][0],true);
  });
  const panel=node('div');panel.id=prefix+'-panel-'+id;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);panel.tabIndex=0;
  tabs.append(button);tabButtons.set(id,button);panels.set(id,panel);
 }
 if(Array.isArray(modalities))result.append(modalityPanel(modalities,box.querySelector('.ai-modalities')?.open));
 result.append(tabs,...panels.values());
 // Metindeki [kaynak/kimlik] işaretleri okunur adlara çevrilir: [Kent], [Boericke], [Natrum muriaticum].
 const sourceName=id=>{const m=/^ref\/(boericke|kent)\//.exec(id);if(m)return m[1]==='kent'?'Kent':'Boericke';return records.find(r=>r.id===id)?.title||null;};
 const readable=text=>text.replace(/\[([^\[\]]+)\]/g,(all,inner)=>{const names=inner.split(/\s*[,;]\s*/).map(sourceName);return names.every(Boolean)?'['+[...new Set(names)].join(', ')+']':all;});
 const overview=node('div',undefined,'ai-overview'),items=previews(readable(short.summary));
 if(items.length)for(const text of items){const card=action(text,()=>{selectedVersion='short';updateFullText();setView('full',true);},'ai-insight');card.setAttribute('aria-label',text+' — tam açıklamayı aç');overview.append(card);}
 else overview.append(node('p','Özet metni bulunmuyor.','ai-result-note'));
 panels.get('overview').append(overview);
 const fullText=node('div',undefined,'ai-full-text'),versionButtons=new Map();
 if(detail){
  const switcher=node('div',undefined,'ai-version-switch');switcher.setAttribute('role','group');switcher.setAttribute('aria-label','Yanıt sürümü');
  for(const [id,label] of [['short','Kısa yanıt'],['detail','Ayrıntılı yanıt']]){const button=action(label,()=>{selectedVersion=id;updateFullText();updateQuestions();});versionButtons.set(id,button);switcher.append(button);}
  panels.get('full').append(switcher);
 }
 panels.get('full').append(fullText);
 function updateFullText(){fullText.textContent=readable(versions[selectedVersion].summary);for(const [id,button] of versionButtons)button.setAttribute('aria-pressed',String(id===selectedVersion));}
 const sourceList=node('div',undefined,'ai-citations');
 if(!groups.size)sourceList.append(node('p','Bu yanıtta kaynak alıntısı bulunmuyor.','ai-result-note'));
 for(const [id,quotes] of groups){
  const record=records.find(item=>item.id===id),entry=node('details'),title=record?.title||id;
  entry.append(node('summary',title+(quotes.length>1?' · '+quotes.length+' alıntı':'')));
  for(const quote of quotes)entry.append(node('blockquote',quote));
  if(record&&typeof onSource==='function')entry.append(action('Özgün kaynağı aç ↗',()=>onSource(record),'ai-source-button'));
  else if(!record)entry.append(node('p','Kaynak kaydı bu katalogda bulunamadı. Alıntı yukarıda korunuyor.','ai-result-note'));
  sourceList.append(entry);
 }
 panels.get('sources').append(sourceList);
 const actions=node('div',undefined,'ai-actions');
 if(!detail&&typeof onDetail==='function')actions.append(action('YZ ile ayrıntılandır',button=>onDetail(button),'ai-primary'));
 if(typeof onReferences==='function'&&referenceCount&&!usedReferences)actions.append(action('Klasik kaynaklarla sentezle ('+referenceCount+')',button=>onReferences(button),'ai-primary'));
 if(usedReferences)result.prepend(node('p','Klasik kaynaklarla (Boericke, Kent) sentezlendi.','ai-result-note'));
 if(typeof onFollow==='function')for(const text of ['Farkları karşılaştır',...(Array.isArray(modalities)?[]:['Modaliteleri göster']),'Eksik ayrıntıları bul'])actions.append(action(text,button=>onFollow(text,button)));
 if(actions.children.length)result.append(actions);
 const questionGroups=new Map();
 for(const value of Object.values(versions)){
  if(!value.question.trim()||questionGroups.has(value.question))continue;
  const group=node('section',undefined,'ai-followup');group.append(node('p',value.question,'ai-question'));
  if(typeof onFollow==='function')group.append(reply('Yanıt ver','Bu soruya yanıtınız','Yanıtımla karşılaştır',text=>'Takip sorusu: '+value.question+'\nYanıt: '+text));
  questionGroups.set(value.question,group);result.append(group);
 }
 if(typeof onFollow==='function')result.append(reply('Kendi sorumu yaz','Kaynaklarla ilgili sorunuz','Gönder',text=>text));
 function reply(label,inputLabel,submitLabel,format){
  const disclosure=node('details',undefined,'ai-reply');disclosure.append(node('summary',label));
  const form=node('form'),input=node('textarea');input.rows=3;input.maxLength=1000;input.placeholder=inputLabel;input.setAttribute('aria-label',inputLabel);input.required=true;
  const button=node('button',submitLabel);button.type='submit';
  form.addEventListener('submit',event=>{event.preventDefault();const value=input.value.trim();if(!value){input.focus();return;}onFollow(format(value),button);});
  form.append(input,button);disclosure.append(form);return disclosure;
 }
 function updateQuestions(){const current=activeView==='overview'?short:versions[selectedVersion];for(const [text,group] of questionGroups)group.hidden=text!==current.question;}
 function setView(id,focus=false){
  if(!panels.has(id))return;activeView=id;
  for(const [key,button] of tabButtons){const selected=key===id;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;panels.get(key).hidden=!selected;}
  updateQuestions();if(focus)tabButtons.get(id).focus();
 }
 updateFullText();setView(activeView);box.replaceChildren(result);
 for(const input of result.querySelectorAll('.ai-reply textarea')){const draft=drafts.get(draftKey(input));if(draft){input.value=draft.value;input.closest('details').open=draft.open;}}
 return {element:result,setView};
}

/** Kaynaktaki modaliteler; YZ'ye gitmeden, açıklamanın üstünde açılır panel. items: [{id,title,rows:[{label,effect,texts}]}] */
export function modalityPanel(items,open=false){
 const total=items.reduce((n,x)=>n+x.rows.length,0);
 const panel=node('details',undefined,'ai-modalities');panel.open=!!open;
 panel.append(node('summary',total?'Modaliteler · '+total+' eksen':'Modaliteler · kaynakta yok'));
 const body=node('div',undefined,'ai-modalities-body');
 if(!total)body.append(node('p','Seçili kaynaklarda modalite bilgisi bulunmuyor.','ai-result-note'));
 for(const item of items){
  if(!item.rows.length)continue;
  const block=node('section',undefined,'ai-mod-remedy');if(items.length>1)block.append(node('h4',item.title));
  for(const [effect,label] of [['worse','↑ Artıyor'],['better','↓ Azalıyor']]){
   const rows=item.rows.filter(r=>r.effect===effect||r.effect==='both');if(!rows.length)continue;
   const col=node('div',undefined,'ai-mod-col '+effect);col.append(node('h5',label));
   const list=node('ul');for(const r of rows){const li=node('li');li.append(node('b',r.label));const texts=r.texts.filter(t=>t.effect===effect).map(t=>t.text);li.append(node('span',' '+texts.join(' · ')));list.append(li);}
   col.append(list);block.append(col);
  }
  body.append(block);
 }
 panel.append(body);return panel;
}
