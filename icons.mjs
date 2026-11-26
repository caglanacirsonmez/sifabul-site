// SifaBul simge seti: 24px ızgara, 1.6 çizgi, yuvarlak uç, currentColor. Bağımlılık yok.
const paths={
 // Gezinme
 discover:'<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8Z"/>',
 assistant:'<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8Z"/>',
 cabinet:'<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M4 12h16M8 7.5v1.5M12 7.5v1.5M16 7.5v1.5M8 15.5V17M12 15.5V17M16 15.5V17"/>',
 history:'<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4.5v3.8h3.8M12 8v4.2l2.8 1.8"/>',
 library:'<path d="M5 4.5h3v15H5zM10.5 4.5h3v15h-3zM16 5.2l2.8-.7 2.4 14.6-2.8.7z"/>',
 remedies:'<path d="M9.5 3.5h5M10 3.5v3.2L7.4 9.6A3 3 0 0 0 6.6 11.7V18a2.5 2.5 0 0 0 2.5 2.5h5.8a2.5 2.5 0 0 0 2.5-2.5v-6.3a3 3 0 0 0-.8-2.1L14 6.7V3.5"/><path d="M9.5 13.5h5M12 11v5"/>',
 symptoms:'<path d="M3.5 12h3.6l2-5 3.6 10 2.2-6 1.3 1h4.3"/>',
 articles:'<path d="M12 6.5C10 5 7.2 4.6 4 5v13c3.2-.4 6 0 8 1.5 2-1.5 4.8-1.9 8-1.5V5c-3.2-.4-6 0-8 1.5Z"/><path d="M12 6.5v13"/>',
 all:'<circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="7" r="2.5"/><circle cx="7" cy="17" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
 // Eylemler
 search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
 sparkle:'<path d="M12 3.5c.6 4.4 2.2 6.6 6.5 8.5-4.3 1.9-5.9 4.1-6.5 8.5-.6-4.4-2.2-6.6-6.5-8.5 4.3-1.9 5.9-4.1 6.5-8.5Z"/>',
 check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 back:'<path d="M15 5 8 12l7 7"/>',
 next:'<path d="m9 5 7 7-7 7"/>',
 edit:'<path d="M4.5 19.5h4l10-10-4-4-10 10Z"/><path d="m13 7 4 4"/>',
 chevron:'<path d="m8 10 4 4 4-4"/>',
 alert:'<path d="M12 4 3.5 19h17Z"/><path d="M12 10v4M12 16.8v.2"/>',
 info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.2"/>',
 book:'<path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11.5H8.5A3.5 3.5 0 0 1 5 16Z"/><path d="M5 16a3 3 0 0 1 3-3h11"/>',
 leaf:'<path d="M5 19c0-8 5-13.5 14-14-.5 9-6 14-14 14Z"/><path d="M5 19 13 11"/>',
 shield:'<path d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18"/>',
 filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',
 cube:'<path d="m12 3.5 7.5 4.2v8.6L12 20.5l-7.5-4.2V7.7Z"/><path d="m4.5 7.7 7.5 4.3 7.5-4.3M12 12v8.5"/>',
 down:'<path d="M7 7l10 10M17 9v8H9"/>',
 up:'<path d="M7 17 17 7M9 7h8v8"/>',
 unknown:'<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.6v.2"/>',
 // Kişi
 adult:'<circle cx="12" cy="7" r="3.2"/><path d="M5.5 20.5c.6-4.2 3-6.5 6.5-6.5s5.9 2.3 6.5 6.5"/>',
 child:'<circle cx="12" cy="9" r="2.6"/><path d="M7.5 20.5c.4-3.4 2.1-5.2 4.5-5.2s4.1 1.8 4.5 5.2M9 4.5c1.5-1 4.5-1 6 0"/>',
 globe:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.3 3.5 8.5S14.5 17.9 12 20.5C9.5 17.9 8.5 15.2 8.5 12S9.5 6.1 12 3.5Z"/>',
 // Semptom kümeleri
 head:'<path d="M8 20.5v-3.2C6 16 5 13.8 5 11.5 5 7.4 8.1 4 12.3 4 16.4 4 19 7 19 10.5l1.5 3.5H19v2.5a2 2 0 0 1-2 2h-2v2"/><path d="M11 9.5c1.5-1 3.5 0 3.5 1.7"/>',
 ent:'<path d="M9 4.5c-2 2-2.5 4.3-1.5 6.5L6 15c-.4 1.3.7 2 1.7 1.4L10 15"/><path d="M15 6a5 5 0 0 1 0 8M17.5 4a8 8 0 0 1 0 12"/>',
 eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
 lungs:'<path d="M12 4v7M12 11c-1 1.5-2.5 2-4 2M12 11c1 1.5 2.5 2 4 2"/><path d="M8.5 7.5C5.5 8 4 12 4 16.5c0 2 1.5 3.3 3.5 2.6l2.5-1V9.5c0-1.2-.6-2.1-1.5-2ZM15.5 7.5c3 .5 4.5 4.5 4.5 9 0 2-1.5 3.3-3.5 2.6l-2.5-1V9.5c0-1.2.6-2.1 1.5-2Z"/>',
 virus:'<circle cx="12" cy="12" r="5"/><path d="M12 3.5V7M12 17v3.5M3.5 12H7M17 12h3.5M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/><circle cx="10.5" cy="11" r=".6"/><circle cx="13.5" cy="13" r=".6"/>',
 stomach:'<path d="M9 3.5v4c0 1.5-1 2.5-2.5 3S4 12.5 4 15a5.5 5.5 0 0 0 9.5 3.8c1-1 2.5-1.3 4-1.3a3 3 0 0 0 3-3V11c0-3-2.3-5.5-5.5-5.5H14V3.5"/>',
 skin:'<rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="M10.5 10.5h.1M13.5 13.5h.1M10.5 13.5h.1M13.5 10.5h.1"/>',
 baby:'<circle cx="12" cy="10" r="5.5"/><path d="M10 9.5h.1M14 9.5h.1M10.5 12.3c.8.6 2.2.6 3 0M8 19.5c1-1.5 2.4-2.2 4-2.2s3 .7 4 2.2"/>',
 mind:'<path d="M9 20.5v-2.7C6.4 16.6 5 14.3 5 11.5 5 7.4 8.1 4.5 12 4.5s7 2.9 7 6.6c0 1.3-.4 2.5-1.1 3.4l.9 2.3h-2.3v1.2a2.5 2.5 0 0 1-2.5 2.5"/><path d="M10 10.5c0-1.2 1-2 2-2s2 .8 2 2c0 1.5-2 1.5-2 3"/>',
 travel:'<path d="M3.5 13.5 20 6.5l-4.5 13-3.3-5.5Z"/><path d="m12.2 14 7.8-7.5"/>',
 heart:'<path d="M12 19.5S4 15 4 9.3A4 4 0 0 1 12 7a4 4 0 0 1 8 2.3C20 15 12 19.5 12 19.5Z"/><path d="M6.5 12h2.5l1.2-2 2 4 1.3-2h4"/>',
 // Modalite eksenleri
 move:'<circle cx="13.5" cy="4.8" r="1.8"/><path d="m9 21 2.5-6 2.5 2v4M7 11l3-3.2 3.5.7 2 3.5 3 1M11.5 15l-1-4"/>',
 rest:'<path d="M3.5 16.5h17M5 16.5v-5h6.5a3 3 0 0 1 3 3v2M5 11.5V8.5M20.5 16.5v3M3.5 16.5v3"/><circle cx="8" cy="9" r="1.6"/>',
 heat:'<path d="M12 3.5v9.2a3.8 3.8 0 1 0 3 0V5a1.5 1.5 0 0 0-3 0"/><path d="M13.5 15v1.5"/>',
 cold:'<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>',
 pressure:'<path d="M12 3.5v9M8.5 9 12 12.5 15.5 9M4.5 17.5h15M7 20.5h10"/>',
 night:'<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z"/>',
 air:'<path d="M3.5 9h11a2.5 2.5 0 1 0-2.5-2.5M3.5 13h15a2.5 2.5 0 1 1-2.5 2.5M3.5 17h7"/>',
 light:'<path d="M9 18h6M10 21h4M12 3.5a6 6 0 0 0-3.5 10.9V16h7v-1.6A6 6 0 0 0 12 3.5Z"/>',
 noise:'<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5Z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
 touch:'<path d="M9 11.5V5.5a1.5 1.5 0 0 1 3 0v5M12 10.5V9a1.5 1.5 0 0 1 3 0v2M15 11a1.5 1.5 0 0 1 3 0v3.5a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.6-2.2L4.5 15.5a1.6 1.6 0 0 1 2.3-2.2L9 15"/>',
 jarring:'<path d="M3.5 12h2l2-5 3 10 3-10 3 10 2-5h2"/>',
 bend:'<circle cx="16" cy="6.5" r="1.8"/><path d="M5 20.5 8.5 14 15 10.5M8.5 14 12 20.5M14.5 10.5 11.5 8"/>',
 morning:'<path d="M3.5 17.5h17M7 17.5a5 5 0 0 1 10 0M12 4.5v3M5.5 8.5l1.8 1.8M18.5 8.5l-1.8 1.8M7 21h10"/>',
 evening:'<path d="M3.5 17.5h17M7 17.5a5 5 0 0 1 10 0M12 7.5v-3M10 6l2 1.5L14 6"/>',
 drop:'<path d="M12 3.5S6 10 6 14.5a6 6 0 0 0 12 0C18 10 12 3.5 12 3.5Z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
 meal:'<path d="M7 3.5v7a2 2 0 0 0 2 2v8M5 3.5v5a2 2 0 0 0 2 2M9 3.5v5a2 2 0 0 1-2 2M17 20.5v-17c-2.2 1.3-3 4-3 7.5h3"/>',
 sleep:'<path d="M4 18.5V7M4 14.5h16v4M20 14.5a3 3 0 0 0-3-3h-6v3"/><circle cx="7.5" cy="11.5" r="1.5"/><path d="M14 4.5h3l-3 3h3"/>',
 cup:'<path d="M5 9.5h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5ZM16 11h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8.5 3.5c-.6 1 .6 2 0 3M12 3.5c-.6 1 .6 2 0 3"/>',
 coldcup:'<path d="M6 5.5h12l-1.5 15h-9Z"/><path d="M6.5 10.5h11M10 13.5l1.5 1.5M13 16.5l1 1"/>',
 wind:'<path d="M3.5 8.5h10a2.5 2.5 0 1 0-2.5-2.5M3.5 12.5h15a2.5 2.5 0 1 1-2.5 2.5M3.5 16.5h7a2 2 0 1 1-2 2"/>',
 star:'<path d="M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6L12 16.6l-5 2.6.9-5.6-4-3.9 5.6-.8Z"/>',
 focus:'<circle cx="12" cy="12" r="3"/><path d="M4 8.5V5.5A1.5 1.5 0 0 1 5.5 4h3M15.5 4h3A1.5 1.5 0 0 1 20 5.5v3M20 15.5v3a1.5 1.5 0 0 1-1.5 1.5h-3M8.5 20h-3A1.5 1.5 0 0 1 4 18.5v-3"/>'
};
export function icon(name,cls='icon'){
 const body=paths[name];if(!body)return '';
 return `<svg class="${cls}" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}
/** Simgeyi DOM düğümü olarak döndürür (textContent ile kurulan bileşenler için). */
export function iconNode(name,cls){const t=document.createElement('template');t.innerHTML=icon(name,cls);return t.content.firstChild||document.createTextNode('');}
export function applyIcons(root=document){
 for(const node of root.querySelectorAll('[data-icon]')){if(node.dataset.iconReady)continue;node.insertAdjacentHTML('afterbegin',icon(node.dataset.icon));node.dataset.iconReady='1';}
}
export const axisIcons={movement:'move',rest:'rest',heat:'heat',cold:'cold',pressure:'pressure',night:'night',air:'air',light:'light',noise:'noise',touch:'touch',jarring:'jarring',bending:'bend',lying:'rest',morning:'morning',evening:'evening',mentalEffort:'mind',humidity:'drop',wind:'wind',sunlight:'sun',eating:'meal',sleep:'sleep',afterSleep:'morning',warmDrink:'cup',coldDrink:'coldcup',firstMovement:'move',continuedMovement:'move'};
export const iconNames=Object.keys(paths);
