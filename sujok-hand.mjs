// Su-Jok ana yazışma sistemi için sade el çizimi: başparmak yukarıda (uç boğum = baş, ikinci boğum = boyun),
// başparmak kökü = göğüs, avuç içi = karın, el sırtı = sırt. İşaretlenen nokta vurgulanır.
const SPOTS={
 head:{x:21,y:56,r:7,zone:'head'}, forehead:{x:21,y:51,zone:'head'}, 'temple-r':{x:27.5,y:56,zone:'head'}, 'temple-l':{x:14.5,y:56,zone:'head'},
 eyes:{x:21,y:56,zone:'head'}, nose:{x:21,y:61,zone:'head'}, mouth:{x:21,y:67,zone:'head'}, ears:{x:13.5,y:61,pair:28.5,zone:'head'},
 throat:{x:21,y:83,zone:'neck'}, tonsils:{x:16.5,y:82,pair:25.5,zone:'neck'}, neck:{x:21,y:85,zone:'neck',back:true},
 chest:{x:40,y:106,r:6,zone:'chest'}, stomach:{x:58,y:88,zone:'palm'}, intestine:{x:64,y:104,r:6,zone:'palm'},
 bladder:{x:64,y:124,zone:'palm'}, uterus:{x:64,y:121,zone:'palm'}, kidney:{x:56,y:100,pair:72,zone:'palm',back:true},
};
const NS='http://www.w3.org/2000/svg';
const el=(tag,attrs)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};

export function hasSpot(id){return id in SPOTS;}

/** spot: SPOTS anahtarı. Döner: <svg> düğümü. */
export function handDrawing(spot,label=''){
 const s=SPOTS[spot]||SPOTS.head;const back=!!s.back;
 const svg=el('svg',{viewBox:'0 0 100 140',class:'sujok-hand','aria-hidden':'true',focusable:'false'});
 const g=el('g',{class:'hand-shape'});
 // avuç ve parmaklar
 g.append(el('rect',{x:34,y:72,width:50,height:60,rx:13}));
 for(const [x,y,h,w] of [[35,24,52,11.5],[48,16,60,11.5],[61,20,56,11.5],[73.5,32,44,10]])g.append(el('rect',{x,y,width:w,height:h,rx:w/2}));
 // başparmak (yukarı bakan) ve kök tümseği
 g.append(el('rect',{x:12,y:46,width:18,height:52,rx:9}));
 g.append(el('ellipse',{cx:39,cy:106,rx:13,ry:19}));
 svg.append(g);
 // bölge gölgeleri
 const zone={head:[12,46,18,26],neck:[12,72,18,24]}[s.zone];
 if(zone)svg.append(el('rect',{x:zone[0],y:zone[1],width:zone[2],height:zone[3],rx:8,class:'hand-zone'}));
 if(s.zone==='chest')svg.append(el('ellipse',{cx:39,cy:106,rx:12,ry:18,class:'hand-zone'}));
 // boğum çizgisi ve tırnak (el sırtı görünümünde)
 svg.append(el('line',{x1:13,y1:72,x2:29,y2:72,class:'hand-line'}));
 if(back){svg.append(el('rect',{x:15.5,y:48,width:11,height:12,rx:4,class:'hand-nail'}));for(const x of [38,51,64,76])svg.append(el('rect',{x:x+.5,y:26,width:7,height:9,rx:3,class:'hand-nail'}));}
 // nokta(lar)
 const dot=(x,y)=>{svg.append(el('circle',{cx:x,cy:y,r:(s.r||4)+3,class:'hand-pulse'}));svg.append(el('circle',{cx:x,cy:y,r:s.r||4,class:'hand-dot'}));};
 dot(s.x,s.y);if(s.pair)dot(s.pair,s.y);
 const t=el('text',{x:50,y:139,class:'hand-caption','text-anchor':'middle'});t.textContent=back?'El sırtı':'Avuç içi';svg.append(t);
 if(label){const title=el('title',{});title.textContent=label;svg.prepend(title);svg.setAttribute('role','img');svg.removeAttribute('aria-hidden');}
 return svg;
}
