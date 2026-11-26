// Favori remediler. Yayındaki hafıza salt okunur olduğu için liste bu cihazın tarayıcısında saklanır
// (yalnızca remedi kimlikleri; kişisel sağlık verisi yoktur). Depolama kapalıysa sayfa yine çalışır, liste kaydedilmez.
import {iconNode} from './icons.mjs?v=mwxvjmqb';
import {symptomsForRemedy} from './find.mjs?v=mwxvjmqb';
const KEY='sifabul.favorites.v1';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const listeners=new Set();

export function parseFavorites(raw){
 try{const v=JSON.parse(raw||'[]');return Array.isArray(v)?[...new Set(v.filter(x=>typeof x==='string'&&x))]:[];}catch{return [];}
}
export function getFavorites(){let raw=null;try{raw=globalThis.localStorage?.getItem(KEY)??null;}catch{}return parseFavorites(raw);}
function notify(list){
 for(const fn of listeners){try{fn(list);}catch{}}
 if(typeof document!=='undefined')for(const b of document.querySelectorAll('.fav-toggle[data-fav-id]'))paint(b,list.includes(b.dataset.favId));
}
function save(list){try{globalThis.localStorage?.setItem(KEY,JSON.stringify(list));}catch{}notify(list);}
export function isFavorite(id){return getFavorites().includes(id);}
/** Ekler ya da çıkarır; yeni eklenen en üste gelir. Eklendiyse true döner. */
export function toggleFavorite(id){const list=getFavorites(),i=list.indexOf(id);if(i>=0)list.splice(i,1);else list.unshift(id);save(list);return i<0;}
export function onFavorites(fn){listeners.add(fn);return()=>listeners.delete(fn);}
if(typeof window!=='undefined')window.addEventListener('storage',e=>{if(e.key===KEY)notify(getFavorites());});

function paint(btn,on){
 btn.setAttribute('aria-pressed',String(on));btn.classList.toggle('on',on);
 const name=btn.dataset.favTitle||'Remedi';const label=on?name+' favorilerden çıkar':name+' favorilere ekle';
 btn.setAttribute('aria-label',label);btn.title=on?'Favorilerden çıkar':'Favorilere ekle';
 const text=btn.querySelector('.fav-text');if(text)text.textContent=on?'Favorilerde':'Favorilere ekle';
}
/** Yıldız düğmesi. withText: okuyucu gibi geniş yerlerde yazılı sürüm. */
export function favoriteButton(record,{withText=false}={}){
 const b=el('button',undefined,withText?'ghost-button fav-toggle':'icon-button fav-toggle');b.type='button';
 b.dataset.favId=record.id;b.dataset.favTitle=record.title;b.append(iconNode('star'));if(withText)b.append(el('span','','fav-text'));
 b.onclick=ev=>{ev.stopPropagation();toggleFavorite(record.id);};paint(b,isFavorite(record.id));return b;
}

function summary(record){
 const lines=record.original.split('\n'),i=lines.findIndex(l=>/^##\s+Anahtar Belirtiler/.test(l)),out=[];
 if(i>=0)for(let j=i+1;j<lines.length&&out.length<3;j++){const l=lines[j].trim();if(/^#{1,3}\s/.test(l)||l==='---')break;if(/^[-•*]\s/.test(l))out.push(l.replace(/^[-•*]\s*/,'').replace(/\*+/g,''));}
 if(out.length)return out;
 const p=lines.find((l,n)=>n>0&&l.trim()&&!/^(#|!\[|>|---|-)/.test(l.trim()));return p?[p.trim().replace(/\*+/g,'')]:[];
}

export function initFavorites({records,openSource}){
 const byId=new Map(records.map(r=>[r.id,r]));
 const section=el('section',undefined,'view fav-page');section.id='favoritesView';section.hidden=true;section.setAttribute('aria-label','Favori remediler');$('assistantView').before(section);
 const head=el('header',undefined,'view-head');const h=el('div');h.append(el('span','FAVORİLER','kicker'),el('h1','Favori remedilerim'));const count=el('span','','status-pill');count.setAttribute('role','status');head.append(h,count);
 const help=el('p','Remedi kartında ya da kaynak okurken yıldıza dokunarak ekleyin. Liste bu cihazın tarayıcısında saklanır; başka cihazda ayrıca işaretlemeniz gerekir.','muted small fav-help');
 const filter=el('input');filter.type='search';filter.placeholder='Favorilerde ara…';filter.setAttribute('aria-label','Favorilerde ara');filter.className='fav-filter';
 const list=el('div',undefined,'fav-list');section.append(head,help,filter,list);
 const find=q=>document.dispatchEvent(new CustomEvent('sifabul:find',{detail:q}));
 function render(){
  const favs=getFavorites().map(id=>byId.get(id)).filter(r=>r&&r.category==='remedies');
  count.textContent=favs.length+' remedi';filter.hidden=favs.length<6;
  const q=filter.value.trim().toLocaleLowerCase('tr');const shown=q?favs.filter(r=>r.title.toLocaleLowerCase('tr').includes(q)):favs;
  list.replaceChildren();
  if(!favs.length){const empty=el('div',undefined,'fav-empty');empty.append(iconNode('star'),el('p','Henüz favori remedi yok. Bul sayfasında bir remedi kartındaki ya da kaynak okuyucusundaki ☆ düğmesine dokunun.'));list.append(empty);return;}
  if(!shown.length){list.append(el('p','Aramayla eşleşen favori yok.','muted small'));return;}
  for(const r of shown){
   const card=el('article',undefined,'fav-card');const top=el('div',undefined,'fav-top');const title=el('h3',r.title);top.append(title);
   if(r.origin){const o=el('span','Holirem dışı','badge origin');o.title=r.origin;top.append(o);}
   top.append(favoriteButton(r));card.append(top);
   const ul=el('ul',undefined,'fav-summary');for(const s of summary(r))ul.append(el('li',s));if(ul.children.length)card.append(ul);
   const syms=symptomsForRemedy(records,r);
   if(syms.length){const row=el('div',undefined,'chip-row');row.append(el('span','Geçtiği şikâyetler','kicker'));const chip=s=>Object.assign(el('button',s.title,'chip'),{type:'button',onclick:()=>find(s.title)});
    for(const s of syms.slice(0,8))row.append(chip(s));
    if(syms.length>8){const more=Object.assign(el('button','+'+(syms.length-8)+' daha','chip more'),{type:'button'});more.onclick=()=>{more.replaceWith(...syms.slice(8).map(chip));};row.append(more);}
    card.append(row);}
   const actions=el('div',undefined,'fav-actions');
   const open=el('button','Bul’da aç','primary-button');open.type='button';open.prepend(iconNode('search'));open.onclick=()=>find(r.title);
   const read=el('button','Kaynağı oku','ghost-button');read.type='button';read.prepend(iconNode('book'));read.onclick=()=>openSource(r);
   actions.append(open,read);card.append(actions);list.append(card);
  }
 }
 filter.oninput=render;onFavorites(()=>{if(!section.hidden)render();});
 function show(){
  for(const id of ['assistantView','libraryView','cabinetView'])if($(id))$(id).hidden=true;
  document.body.classList.remove('cabinet-open');section.hidden=false;history.replaceState(null,'','#favoriler');
  document.dispatchEvent(new CustomEvent('sifabul:view',{detail:'favorites'}));window.scrollTo({top:0,behavior:'instant'});render();
 }
 document.addEventListener('sifabul:view',e=>{if(e.detail!=='favorites')section.hidden=true;});
 $('favoritesNav').onclick=show;
 if(location.hash==='#favoriler')show();
 return {show,render};
}
