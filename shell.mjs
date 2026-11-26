// Uygulama kabuğu: tek görünüm durumu, gezinme vurgusu, araştırma tepsisi ve klavye kısayolları.
const $=id=>document.getElementById(id);
const typing=target=>target instanceof HTMLElement&&(target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

export function setView(view){document.dispatchEvent(new CustomEvent('sifabul:view',{detail:view}));}

function syncNav(view){
 document.body.dataset.view=view;
 const mark=(node,on)=>{if(!node)return;node.classList.toggle('active',on);if(on)node.setAttribute('aria-current','page');else node.removeAttribute('aria-current');};
 mark($('assistantNav'),view==='assistant');mark($('cabinetNav'),view==='cabinet');mark($('libraryNav'),view==='library');mark($('favoritesNav'),view==='favorites');
 if(view!=='library')setDesk(false);
}

function setDesk(open){
 const desk=document.querySelector('.research-desk'),toggle=$('deskToggle');if(!desk||!toggle)return;
 desk.classList.toggle('open',open);toggle.setAttribute('aria-expanded',String(open));
 toggle.querySelector('.desk-toggle-label').textContent=open?'Masayı kapat':'Masayı aç';
}

export function initShell(){
 document.addEventListener('sifabul:view',event=>syncNav(event.detail));
 // Kategori değişince (arama sonuçları yeniden çizilince) kütüphane vurgusunu güncel tut.
 $('category')?.addEventListener('change',()=>{if(document.body.dataset.view==='library')syncNav('library');});
 $('deskToggle')?.addEventListener('click',()=>setDesk(!document.querySelector('.research-desk').classList.contains('open')));
 // Karşılaştırma ve sentez düğmeleri tepsiyi açık tutar; kullanıcı sonuçları görür.
 for(const id of ['start','synthesize'])$(id)?.addEventListener('click',()=>setDesk(true));
 document.addEventListener('keydown',event=>{
  if(event.defaultPrevented||event.metaKey||event.ctrlKey||event.altKey)return;
  if(event.key==='Escape'&&document.querySelector('.research-desk.open')&&!document.querySelector('dialog[open]')){setDesk(false);$('deskToggle')?.focus();return;}
  if(typing(event.target)||document.querySelector('dialog[open]'))return;
  if(event.key==='/'){
   event.preventDefault();
   const target=document.body.dataset.view==='library'?$('query'):$('findInput');
   if(!target)return;if(target.id==='findInput'&&document.body.dataset.view!=='assistant')$('assistantNav')?.click();
   target.focus();target.select();
  }
 });
}
