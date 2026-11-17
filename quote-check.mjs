// YZ alıntılarını özgün kaynakla karşılaştırır. Kaynak metin markdown'dır (**kalın**, satır sonları, kıvrık tırnak);
// model alıntıyı bu işaretler olmadan yazabilir. Anlamı değiştirmeyen biçim farkları yok sayılır, sözcükler birebir aranır.
const fold=s=>String(s)
 .replace(/!\[[^\]]*\]\([^)]*\)/g,' ')        // görseller
 .replace(/\[([^\]]*)\]\([^)]*\)/g,'$1')      // bağlantı metni kalır
 .replace(/[*_#`>|]+/g,' ')                   // markdown işaretleri
 .replace(/[‘’ʼ´`]/g,"'").replace(/[“”„«»]/g,'"').replace(/[–—−]/g,'-')
 .replace(/\s*-\s*/g,' - ').replace(/\s+([.,;:!?)])/g,'$1').replace(/\(\s+/g,'(')
 .toLocaleLowerCase('tr').replace(/\s+/g,' ').trim();

/** Alıntı kaynakta geçiyor mu? "…" veya "..." ile kısaltılmış alıntıda parçalar sırayla aranır. */
export function quoteInSource(quote,original){
 if(typeof quote!=='string'||typeof original!=='string')return false;
 const text=fold(original);
 const parts=quote.split(/…|\.{3,}|\[\s*\.\.\.\s*\]/).map(x=>fold(x).replace(/^["'\s]+|["'\s]+$/g,'')).filter(Boolean);
 if(!parts.length||parts.join('').length<8)return false;
 let at=0;for(const part of parts){const i=text.indexOf(part,at);if(i<0)return false;at=i+part.length;}
 return true;
}

/** Doğrulanan alıntıları tutar; doğrulanamayanları sayar. */
export function verifyCitations(citations,sources){
 const verified=[];let unverified=0;
 for(const c of citations||[]){const r=sources.find(x=>x.id===c?.id);if(r&&quoteInSource(c.quote,r.original))verified.push({id:c.id,quote:c.quote});else unverified++;}
 return {verified,unverified};
}
