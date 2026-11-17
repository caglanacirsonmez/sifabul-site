/* SifaBul — bağımlılıksız gerçek WebGL modelleri.
 * Geometri üçgenlerden oluşur; sürükleme perspektif içindeki modeli döndürür.
 * Kullanım: <canvas data-model="remedy|articles|scene|vial"></canvas>; initModels();
 */
const instances = new WeakMap();
const active = new Set();
const shelves = new Set();
const TAU = Math.PI * 2;
const palette = {
  green: [0.20, 0.47, 0.35], greenDark: [0.12, 0.31, 0.23],
  ivory: [0.94, 0.92, 0.80], white: [0.99, 0.98, 0.91],
  terracotta: [0.78, 0.48, 0.35], skin: [0.88, 0.62, 0.46],
  clay: [0.68, 0.38, 0.28], purple: [0.52, 0.43, 0.65],
  page: [0.95, 0.91, 0.80], darkPage: [0.77, 0.72, 0.62],
  leaf: [0.42, 0.61, 0.29], stem: [0.23, 0.40, 0.20]
};
const vertexShader = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
varying vec3 vNormal;
varying vec3 vColor;
varying vec3 vPosition;
void main(){
 vec4 world=uModel*vec4(aPosition,1.0);
 vNormal=mat3(uModel)*aNormal;
 vColor=aColor;
 vPosition=world.xyz;
 gl_Position=uProjection*uView*world;
}`;
const fragmentShader = `
precision mediump float;
varying vec3 vNormal;
varying vec3 vColor;
varying vec3 vPosition;
uniform vec3 uEye;
uniform float uGlass;
uniform float uVial;
void main(){
 vec3 N=normalize(vNormal);
 vec3 L=normalize(vec3(-0.65,0.95,1.25));
 vec3 R=normalize(vec3(0.8,0.5,-1.0));
 vec3 V=normalize(uEye-vPosition);
 float diffuse=max(dot(N,L),0.0);
 float rim=max(dot(N,R),0.0);
 float specular=pow(max(dot(N,normalize(L+V)),0.0),40.0);
 float hemisphere=mix(0.84,1.0,N.y*0.5+0.5);
 vec3 color=vColor*(0.35+0.64*diffuse+0.16*rim)*hemisphere;
 color=mix(color,vColor*(0.53+0.51*diffuse+0.12*rim)*hemisphere,uVial);
 color+=vec3(1.0,0.99,0.94)*specular*mix(0.24,0.30,uVial);
 float edge=pow(1.0-abs(dot(N,V)),2.5);
 float alpha=mix(1.0,0.055+edge*0.24+specular*0.11,uGlass);
 color=mix(color,vec3(0.88,0.94,0.95)+vec3(specular*0.25),uGlass*0.72);
 gl_FragColor=vec4(color,alpha);
}`;

function identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);}
function multiply(a,b){
 const out=new Float32Array(16);
 for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let i=0;i<4;i++)out[c*4+r]+=a[i*4+r]*b[c*4+i];
 return out;
}
function rotationX(a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]);}
function rotationY(a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]);}
function rotationZ(a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1]);}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
function normalize(v){const length=Math.hypot(...v)||1;return v.map(x=>x/length);}
function direction(matrix,v){return [matrix[0]*v[0]+matrix[4]*v[1]+matrix[8]*v[2],matrix[1]*v[0]+matrix[5]*v[1]+matrix[9]*v[2],matrix[2]*v[0]+matrix[6]*v[1]+matrix[10]*v[2]];}
function transformFor(o={}){
 const pos=o.position||[0,0,0],scale=o.scale||[1,1,1];
 const angles=o.rotation||[0,0,0];
 const rot=multiply(rotationY(angles[1]),multiply(rotationX(angles[0]),rotationZ(angles[2])));
 return (p,n)=>{
  const v=direction(rot,p.map((x,i)=>x*scale[i]));
  const normal=normalize(direction(rot,n.map((x,i)=>x/scale[i])));
  return [v.map((x,i)=>x+pos[i]),normal];
 };
}
class Geometry {
 constructor(){this.data=[];}
 vertex(p,n,color,transform){const [v,nn]=transform(p,n);this.data.push(...v,...nn,...color);}
 triangle(vertices,normals,color,transform){for(let i=0;i<3;i++)this.vertex(vertices[i],normals[i],color,transform);}
 sphere(o={}){
  const t=transformFor(o),color=o.color||palette.skin,segments=o.segments||28,rings=o.rings||18;
  const point=(u,v)=>[Math.sin(v)*Math.cos(u),Math.cos(v),Math.sin(v)*Math.sin(u)];
  for(let y=0;y<rings;y++)for(let x=0;x<segments;x++){
   const a=point(x/segments*TAU,y/rings*Math.PI),b=point((x+1)/segments*TAU,y/rings*Math.PI),c=point(x/segments*TAU,(y+1)/rings*Math.PI),d=point((x+1)/segments*TAU,(y+1)/rings*Math.PI);
   this.triangle([a,c,b],[a,c,b],color,t);this.triangle([b,c,d],[b,c,d],color,t);
  }
 }
 lathe(profile,o={}){
  const t=transformFor(o),color=o.color||palette.green,segments=o.segments||48;
  for(let j=0;j<profile.length-1;j++){
   const [r0,y0]=profile[j],[r1,y1]=profile[j+1];
   const dy=y1-y0,dr=r1-r0;
   for(let i=0;i<segments;i++){
    const u=i/segments*TAU,v=(i+1)/segments*TAU;
    const a=[r0*Math.cos(u),y0,r0*Math.sin(u)],b=[r0*Math.cos(v),y0,r0*Math.sin(v)],c=[r1*Math.cos(u),y1,r1*Math.sin(u)],d=[r1*Math.cos(v),y1,r1*Math.sin(v)];
    const n0=normalize([dy*Math.cos(u),-dr,dy*Math.sin(u)]),n1=normalize([dy*Math.cos(v),-dr,dy*Math.sin(v)]);
    this.triangle([a,b,c],[n0,n1,n0],color,t);this.triangle([b,d,c],[n1,n1,n0],color,t);
   }
  }
 }
 cylinder(radius,height,o={}){this.lathe([[0,-height/2],[radius,-height/2],[radius,height/2],[0,height/2]],o);}
 box(o={}){
  const t=transformFor(o),color=o.color||palette.page;
  const faces=[
   [[0,0,1],[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],
   [[0,0,-1],[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]],
   [[1,0,0],[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]]],
   [[-1,0,0],[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]]],
   [[0,1,0],[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]]],
   [[0,-1,0],[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]]
  ];
  for(const [n,p] of faces){this.triangle([p[0],p[1],p[2]],[n,n,n],color,t);this.triangle([p[0],p[2],p[3]],[n,n,n],color,t);}
 }
 group(fn,o={}){
  const temp=new Geometry();fn(temp);const t=transformFor(o);
  for(let i=0;i<temp.data.length;i+=9){const [p,n]=t(temp.data.slice(i,i+3),temp.data.slice(i+3,i+6));this.data.push(...p,...n,...temp.data.slice(i+6,i+9));}
 }
}
function makeBottle(g){
 // Dönel şişe profili ve omuzları gerçek hacimdir; etiket gövdeyi sarar.
 g.lathe([[0,-1.05],[.42,-1.05],[.49,-.97],[.5,-.86],[.5,.33],[.47,.46],[.30,.61],[.28,.72],[.28,.9],[0,.9]],{color:palette.green});
 g.lathe([[.504,-.58],[.504,.11]],{color:palette.ivory});
 g.cylinder(.325,.28,{position:[0,.86,0],color:palette.ivory});
 g.cylinder(.335,.035,{position:[0,1.015,0],color:palette.white});
 g.cylinder(.31,.02,{position:[0,.71,0],color:palette.greenDark});
 for(let i=0;i<32;i++){
  const angle=i/32*TAU;
  g.cylinder(.009,.2,{position:[Math.sin(angle)*.327,.86,Math.cos(angle)*.327],color:[.73,.73,.61],segments:8});
 }
 // Ön etiketteki yıldız kabartması.
 for(let i=0;i<4;i++)g.box({position:[0,-.23,.509],scale:[.012,.16,.007],rotation:[0,0,i*Math.PI/4],color:palette.greenDark});
 for(const [x,y,z,r] of [[-.62,-.99,.3,.10],[-.81,-1.04,.55,.09],[-.50,-1.09,.68,.10],[.59,-1.03,.54,.085]])g.sphere({position:[x,y,z],scale:[r,r,r],color:palette.white,segments:16,rings:10});
 // Yapraklar kalınlıkları olan elipsoidal yüzeylerdir.
 g.cylinder(.017,.86,{position:[.65,-.45,.04],rotation:[0,0,-.35],color:palette.stem,segments:12});
 g.sphere({position:[.68,-.23,.03],scale:[.18,.42,.045],rotation:[-.2,.3,-.65],color:palette.leaf});
 g.sphere({position:[.85,-.62,.02],scale:[.14,.30,.04],rotation:[.2,-.2,-1.0],color:[.57,.70,.36]});
}
function makeBook(g){
 const wing=(side)=>{
  const sign=side===0?-1:1;
  g.group(p=>{
   p.box({position:[0,-.095,0],scale:[.52,.055,.68],color:palette.purple});
   p.box({position:[0,.015,0],scale:[.49,.065,.64],color:palette.page});
   for(let i=0;i<4;i++)p.box({position:[0,-.025+i*.025,.642],scale:[.48,.002,.003],color:palette.darkPage});
   for(let i=0;i<8;i++)p.box({position:[0,.083,-.46+i*.12],scale:[i===0?.26:.35,.0015,.009],color:i===0?palette.purple:[.79,.75,.65]});
   p.box({position:[sign*.27,.087,-.05],scale:[.035,.002,.52],color:palette.purple});
  },{position:[sign*.49,0,0],rotation:[0,0,sign*.16]});
 };
 wing(0);wing(1);
 g.cylinder(.05,1.36,{rotation:[Math.PI/2,0,0],position:[0,-.03,0],color:palette.purple,segments:20});
}
// Tüp seviyesi yalnız gerçek kullanıcı verisi varsa geometriye uygulanır.
function normalizedLevel(value){
 if(value===null||value===undefined||value==='')return null;
 const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):null;
}
function vialGeometry(levelPercent=null){
 const opaque=new Geometry(),glass=new Geometry(),level=normalizedLevel(levelPercent);
 // İnce, düz gövdeli eczane tüpü; beyaz tırtıklı kapak.
 opaque.cylinder(.268,.36,{position:[0,1.095,0],color:[.97,.98,.96],segments:48});
 opaque.cylinder(.273,.045,{position:[0,1.293,0],color:palette.white,segments:48});
 opaque.cylinder(.263,.035,{position:[0,.899,0],color:[.79,.84,.82],segments:48});
 for(let i=0;i<36;i++){
  const a=i/36*TAU;
  opaque.cylinder(.006,.285,{position:[Math.cos(a)*.268,1.10,Math.sin(a)*.268],color:[.80,.84,.82],segments:6});
 }
 // Etiket yazısı DOM katmanından gelir; bu bant yalnız fiziksel kağıt yüzeydir.
 opaque.lathe([[.253,.16],[.253,.62]],{color:[.97,.96,.89],segments:48});
 opaque.lathe([[.254,.16],[.254,.184]],{color:[.43,.55,.48],segments:48});
 opaque.lathe([[.254,.598],[.254,.62]],{color:[.43,.55,.48],segments:48});
 // Bilinmeyen seviye bir doluluk yüzdesi gibi gösterilmez: temsili gevşek taneler.
 const layers=level===null?2:Math.ceil(level/100*17);
 for(let row=0;row<layers;row++){
  const y=-1.075+row*.113,offset=row*.69;
  const count=level===null&&row===1?4:7;
  for(let i=0;i<count;i++){
   const a=i/6*TAU+offset,r=i===6?0:.139;
   const size=.051+(i%3)*.002;
   opaque.sphere({position:[Math.cos(a)*r,y+Math.sin(i*7+row)*.009,Math.sin(a)*r],scale:[size,size*.94,size],color:[1,1,.98],segments:12,rings:8});
  }
 }
 // Gerçek çift yüzeyli saydam cam: taban kalınlığı ve boyun dahil.
 glass.lathe([[0,-1.17],[.205,-1.17],[.242,-1.135],[.25,-1.08],[.25,.83],[.237,.91],[.23,.94],[.215,.94],[.215,-1.06],[.19,-1.12],[0,-1.12]],{color:[.78,.91,.94],segments:56});
 // Raf ölçeğinde cam ve taneler rahat seçilsin diye tüp çapı bir miktar geniştir.
 const widen=data=>{
  for(let i=0;i<data.length;i+=9){
   data[i]*=1.18;data[i+2]*=1.18;
   const n=normalize([data[i+3]/1.18,data[i+4],data[i+5]/1.18]);
   data[i+3]=n[0];data[i+4]=n[1];data[i+5]=n[2];
  }
  return new Float32Array(data);
 };
 return {opaque:widen(opaque.data),glass:widen(glass.data)};
}
function geometryFor(kind){
 const g=new Geometry();
 if(kind==='articles')g.group(makeBook,{rotation:[.68,-.2,-.08],position:[0,.02,0]});
 else if(kind==='scene'){
  g.group(makeBottle,{position:[-1.05,.12,.40],scale:[.88,.88,.88],rotation:[0,.15,-.10]});
  g.group(makeBook,{position:[.95,-.81,.65],scale:[.62,.62,.62],rotation:[.38,-.42,.04]});
 }else g.group(makeBottle,{position:[0,.08,0]});
 return new Float32Array(g.data);
}
function compile(gl,type,source){
 const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
 if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw Error('3B gölgelendirici başlatılamadı.');}
 return shader;
}
function createRenderer(canvas){
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,powerPreference:'low-power'});
 if(!gl)throw Error('WebGL desteklenmiyor.');
 const program=gl.createProgram();let vs,fs;
 try{
  vs=compile(gl,gl.VERTEX_SHADER,vertexShader);fs=compile(gl,gl.FRAGMENT_SHADER,fragmentShader);
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('3B programı bağlanamadı.');
 }catch(error){gl.deleteProgram(program);throw error;}
 finally{if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);}
 const uniforms=Object.fromEntries(['uProjection','uView','uModel','uEye','uGlass','uVial'].map(n=>[n,gl.getUniformLocation(program,n)]));
 const attributes=['aPosition','aNormal','aColor'].map(n=>gl.getAttribLocation(program,n));
 return {canvas,gl,program,uniforms,attributes,resources:new Map(),cleanup:[],lost:false};
}
function resourceFor(renderer,kind,level=null){
 const normalized=normalizedLevel(level),key=kind+':'+(normalized??'unknown');
 if(renderer.resources.has(key))return renderer.resources.get(key);
 const geometry=kind==='vial'?vialGeometry(normalized):{opaque:geometryFor(kind),glass:null};
 const upload=data=>{if(!data?.length)return null;const buffer=renderer.gl.createBuffer();renderer.gl.bindBuffer(renderer.gl.ARRAY_BUFFER,buffer);renderer.gl.bufferData(renderer.gl.ARRAY_BUFFER,data,renderer.gl.STATIC_DRAW);return {buffer,count:data.length/9};};
 const resource={opaque:upload(geometry.opaque),glass:upload(geometry.glass)};
 renderer.resources.set(key,resource);return resource;
}
function deleteResource(gl,resource){for(const part of [resource.opaque,resource.glass])if(part)gl.deleteBuffer(part.buffer);}
function release(renderer,loseContext=true){
 for(const cleanup of renderer.cleanup)cleanup();
 for(const resource of renderer.resources.values())deleteResource(renderer.gl,resource);
 renderer.resources.clear();renderer.gl.deleteProgram(renderer.program);
 if(loseContext)renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
}
function listen(renderer,target,type,handler,options){target.addEventListener(type,handler,options);renderer.cleanup.push(()=>target.removeEventListener(type,handler,options));}
function resizeRenderer(renderer){
 const rect=renderer.canvas.getBoundingClientRect(),limit=renderer.gl.getParameter(renderer.gl.MAX_RENDERBUFFER_SIZE)||8192;
 // İki sütunlu uzun mobil raf GPU'nun renderbuffer boyutunu aşmamalı.
 const ratio=Math.min(window.devicePixelRatio||1,2,limit/Math.max(1,rect.width),limit/Math.max(1,rect.height));
 renderer.width=Math.max(1,rect.width);renderer.height=Math.max(1,rect.height);renderer.ratio=ratio;
 const width=Math.max(1,Math.round(rect.width*ratio)),height=Math.max(1,Math.round(rect.height*ratio));
 if(renderer.canvas.width!==width||renderer.canvas.height!==height){renderer.canvas.width=width;renderer.canvas.height=height;renderer.dirty=true;}
}
function watchSize(renderer,callback=()=>{}){
 const resize=()=>{resizeRenderer(renderer);callback();};
 if(typeof ResizeObserver==='function'){const observer=new ResizeObserver(resize);observer.observe(renderer.canvas);renderer.cleanup.push(()=>observer.disconnect());}
 else listen(renderer,window,'resize',resize);
 resize();
}
function renderModel(renderer,resource,kind,yaw,pitch,aspect,scale=1,lift=0){
 const {gl,uniforms}=renderer;
 const distance=kind==='scene'?Math.max(4.9,3.3/aspect):kind==='vial'?Math.max(4.5,1.20/aspect):Math.max(3.8,2.6/aspect);
 const view=identity();view[14]=-distance;view[13]=kind==='scene'?.02:kind==='vial'?-.05:.05;
 const model=multiply(rotationX(pitch),rotationY(yaw));
 for(let i=0;i<12;i++)model[i]*=scale;model[13]=lift;
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.useProgram(renderer.program);
 gl.uniformMatrix4fv(uniforms.uProjection,false,perspective(Math.PI/5,aspect,.1,50));
 gl.uniformMatrix4fv(uniforms.uView,false,view);gl.uniformMatrix4fv(uniforms.uModel,false,model);gl.uniform3f(uniforms.uEye,0,0,distance);gl.uniform1f(uniforms.uVial,kind==='vial'?1:0);
 const drawPart=(part,glass)=>{
  if(!part)return;
  gl.bindBuffer(gl.ARRAY_BUFFER,part.buffer);
  renderer.attributes.forEach((location,index)=>{gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,gl.FLOAT,false,36,index*12);});
  gl.uniform1f(uniforms.uGlass,glass?1:0);gl.drawArrays(gl.TRIANGLES,0,part.count);
 };
 gl.disable(gl.BLEND);gl.depthMask(true);drawPart(resource.opaque,false);
 if(resource.glass){
  gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);drawPart(resource.glass,true);gl.depthMask(true);gl.disable(gl.BLEND);
 }
}
function clearRenderer(renderer){const {gl}=renderer;gl.disable(gl.SCISSOR_TEST);gl.depthMask(true);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);}
function fallback(canvas){
 canvas.dataset.fallback='true';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','3B model bu tarayıcıda kullanılamıyor.');
 const previousDisplay=canvas.style.display;canvas.style.display='none';
 const label=document.createElement('span');label.className='model-fallback';label.setAttribute('role','img');
 const kind=canvas.dataset.model;label.textContent=kind==='articles'?'▤ Kaynak modeli':kind==='scene'?'✳ SifaBul modelleri':'✳ Remedi tüpü';
 label.setAttribute('aria-label','WebGL desteklenmediği için 3B model gösterilemiyor.');
 Object.assign(label.style,{display:'grid',placeItems:'center',height:'100%',minHeight:'64px',padding:'12px',fontSize:'12px',color:'inherit'});
 canvas.insertAdjacentElement('afterend',label);
 return {fallback:true,label,previousDisplay};
}
function initialAngles(kind){return {yaw:kind==='scene'?.06:kind==='vial'?-.16:-.24,pitch:kind==='articles'?-.1:kind==='vial'?.025:.08};}
function initialize(canvas){
 if(instances.has(canvas))return;
 let state;
 try{
  state=createRenderer(canvas);
  const kind=canvas.dataset.model||'remedy',level=normalizedLevel(canvas.dataset.level),angles=initialAngles(kind);
  Object.assign(state,{kind,level,...angles,drag:false,visible:true,lastInteraction:0,previous:null,dirty:true});
  state.resource=resourceFor(state,kind,level);instances.set(canvas,state);active.add(state);
  canvas.dataset.modelReady='true';canvas.dataset.vertexCount=String(state.resource.opaque.count+(state.resource.glass?.count||0));
  canvas.tabIndex=canvas.tabIndex<0?0:canvas.tabIndex;canvas.setAttribute('role','img');
  if(!canvas.hasAttribute('aria-label'))canvas.setAttribute('aria-label',`${kind==='articles'?'Açık kitap':kind==='scene'?'Şişe ve kitap':kind==='vial'?'Remedi tüpü':'Remedi şişesi'} 3B modeli. Sürükleyerek veya ok tuşlarıyla döndürün.`);
  canvas.style.touchAction='pan-y';canvas.style.cursor='grab';
  listen(state,canvas,'pointerdown',e=>{if(e.button!==0)return;state.drag=true;state.previous=[e.clientX,e.clientY];state.lastInteraction=performance.now();canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';});
  listen(state,canvas,'pointermove',e=>{if(!state.drag)return;const dx=e.clientX-state.previous[0],dy=e.clientY-state.previous[1];state.yaw+=dx*.012;state.pitch=Math.max(-.85,Math.min(.85,state.pitch+dy*.009));state.previous=[e.clientX,e.clientY];state.lastInteraction=performance.now();state.dirty=true;});
  const end=()=>{state.drag=false;state.previous=null;canvas.style.cursor='grab';};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(state,canvas,event,end);
  listen(state,canvas,'keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')state.yaw-=.15;if(e.key==='ArrowRight')state.yaw+=.15;if(e.key==='ArrowUp')state.pitch=Math.max(-.85,state.pitch-.12);if(e.key==='ArrowDown')state.pitch=Math.min(.85,state.pitch+.12);if(e.key==='Home')Object.assign(state,initialAngles(kind));state.lastInteraction=performance.now();state.dirty=true;});
  watchSize(state);
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{state.visible=entries[0].isIntersecting;state.dirty=true;},{rootMargin:'80px'});observer.observe(canvas);state.cleanup.push(()=>observer.disconnect());}
  listen(state,canvas,'webglcontextlost',e=>{e.preventDefault();state.lost=true;});
  listen(state,canvas,'webglcontextrestored',()=>{active.delete(state);instances.delete(canvas);release(state,false);initialize(canvas);});
 }catch(error){if(state){active.delete(state);release(state);}instances.set(canvas,fallback(canvas));}
}
const reduced=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
let frameStarted=false,lastTime=0;
function renderShelf(state,now,dt){
 if(state.lost||!state.canvas.isConnected||document.hidden)return;
 const selected=Number(state.getActiveIndex?.()??-1),hasAnimation=selected>=0&&!reduced.matches;
 let transitioning=false;
 for(let i=0;i<state.items.length;i++){
  const target=i===selected?1:0,previous=state.hover[i]||0;
  state.hover[i]=reduced.matches?target:previous+(target-previous)*Math.min(1,dt*12);
  if(Math.abs(state.hover[i]-target)>.001)transitioning=true;
  else state.hover[i]=target;
 }
 if(!state.dirty&&!transitioning&&!hasAnimation&&state.selected===selected)return;
 state.selected=selected;state.dirty=false;
 const {gl}=state,canvasRect=state.canvas.getBoundingClientRect();
 clearRenderer(state);gl.enable(gl.SCISSOR_TEST);
 state.items.forEach((item,index)=>{
  if(!item.element?.isConnected)return;
  const rect=item.element.getBoundingClientRect();
  if(rect.width<=0||rect.height<=0||rect.bottom<0||rect.top>window.innerHeight)return;
  const x=Math.round((rect.left-canvasRect.left)*state.ratio),y=Math.round((canvasRect.bottom-rect.bottom)*state.ratio),w=Math.round(rect.width*state.ratio),h=Math.round(rect.height*state.ratio);
  if(w<=0||h<=0)return;
  gl.viewport(x,y,w,h);gl.scissor(x,y,w,h);
  const hover=state.hover[index]||0,turn=hover*(.31+(reduced.matches?0:Math.sin(now/2100)*.12));
  renderModel(state,item.resource,'vial',-.18+turn,.025-hover*.045,rect.width/rect.height,1+hover*.095,hover*.07);
 });
 gl.disable(gl.SCISSOR_TEST);
}
function draw(now){
 const dt=Math.min((now-lastTime)/1000,.04);lastTime=now;
 for(const state of active){
  if(!state.canvas.isConnected){disposeModels(state.canvas);continue;}
  if(!state.visible||state.lost||document.hidden)continue;
  const rotating=!reduced.matches&&!state.drag&&now-state.lastInteraction>2500;
  if(rotating){state.yaw+=dt*.055;state.dirty=true;}
  if(!state.dirty)continue;state.dirty=false;
  clearRenderer(state);state.gl.viewport(0,0,state.canvas.width,state.canvas.height);
  renderModel(state,state.resource,state.kind,state.yaw,state.pitch,state.width/state.height);
 }
 for(const shelf of shelves){if(!shelf.canvas.isConnected){shelf.api.dispose();continue;}renderShelf(shelf,now,dt);}
 if(active.size||shelves.size)requestAnimationFrame(draw);else frameStarted=false;
}
function startDrawing(){if(!frameStarted){frameStarted=true;lastTime=performance.now();requestAnimationFrame(draw);}}
function modelCanvases(root){return root.matches?.('canvas[data-model]')?[root]:Array.from(root.querySelectorAll('canvas[data-model]'));}
export function initModels(root=document){for(const canvas of modelCanvases(root))initialize(canvas);startDrawing();}
export function updateModel(canvas,{levelPercent=null}={}){
 const level=normalizedLevel(levelPercent);if(level===null)delete canvas.dataset.level;else canvas.dataset.level=String(level);
 initialize(canvas);const state=instances.get(canvas);if(!state||state.fallback)return;
 const resource=resourceFor(state,state.kind,level);state.resource=resource;state.level=level;state.dirty=true;
 // Seçili detayda önceki seviyenin tamponu tutulmaz; tek canvas tekrar kullanılır.
 for(const [key,value] of state.resources)if(value!==resource){deleteResource(state.gl,value);state.resources.delete(key);}
 canvas.dataset.vertexCount=String(resource.opaque.count+(resource.glass?.count||0));startDrawing();
}
export function disposeModels(root=document){
 for(const canvas of modelCanvases(root)){
  const state=instances.get(canvas);if(!state)continue;
  if(state.fallback){state.label?.remove();canvas.style.display=state.previousDisplay||'';delete canvas.dataset.fallback;}
  else{active.delete(state);release(state);}
  instances.delete(canvas);delete canvas.dataset.modelReady;delete canvas.dataset.vertexCount;
 }
}
/** Tek WebGL bağlamında rafın tüm tüpleri. Kart başına canvas oluşturmaz. */
export function initVialShelf(canvas,{root=canvas.parentElement,getItems=()=>[],getActiveIndex=()=>-1}={}){
 let state,disposed=false;
 const empty={refresh(){},dispose(){disposed=true;}};
 try{
  state=createRenderer(canvas);Object.assign(state,{root,getItems,getActiveIndex,items:[],hover:[],dirty:true,selected:-1});
  const refresh=()=>{
   if(disposed)return;
   resizeRenderer(state);
   state.items=Array.from(getItems()||[]).map(item=>({...item,resource:resourceFor(state,'vial',item.levelPercent)}));
   // Yalnız rafta kullanılan seviyelerin tamponları kalır.
   const used=new Set(state.items.map(item=>item.resource));
   for(const [key,value] of state.resources)if(!used.has(value)){deleteResource(state.gl,value);state.resources.delete(key);}
   state.hover=state.items.map((_,i)=>state.hover[i]||0);state.dirty=true;
  };
  const dispose=()=>{if(disposed)return;disposed=true;shelves.delete(state);release(state);delete canvas.dataset.modelReady;};
  state.api={refresh,dispose};shelves.add(state);canvas.dataset.modelReady='true';canvas.setAttribute('aria-hidden','true');
  watchSize(state,()=>{state.dirty=true;});
  listen(state,window,'scroll',()=>{state.dirty=true;},{passive:true,capture:true});
  listen(state,window,'resize',()=>{state.dirty=true;},{passive:true});
  listen(state,document,'visibilitychange',()=>{state.dirty=true;});
  listen(state,canvas,'webglcontextlost',e=>{e.preventDefault();state.lost=true;});
  listen(state,canvas,'webglcontextrestored',()=>{
   state.lost=false;const options={root,getItems,getActiveIndex};shelves.delete(state);release(state,false);disposed=true;
   const renewed=initVialShelf(canvas,options);state.api.refresh=renewed.refresh;state.api.dispose=renewed.dispose;
  });
  refresh();startDrawing();return state.api;
 }catch(error){
  if(state){shelves.delete(state);release(state);}
  canvas.dataset.fallback='true';canvas.style.display='none';
  if(root){root.dataset.modelFallback='true';const note=document.createElement('span');note.className='model-fallback';note.textContent='3B tüpler bu tarayıcıda gösterilemiyor. Remedi etiketleri kullanılabilir.';note.setAttribute('role','status');root.append(note);empty.dispose=()=>{note.remove();delete root.dataset.modelFallback;delete canvas.dataset.fallback;canvas.style.display='';};}
  return empty;
 }
}
