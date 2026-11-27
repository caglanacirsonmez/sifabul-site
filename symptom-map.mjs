// Semptom kaynaklarını dokunarak seçmek için kümeler. Başlık eşleşmesi normalize edilir; listede olmayan yeni semptomlar "Diğer"e düşer.
import {norm} from './search.mjs?v=mwzcsp3l';

export const clusters=[
 {id:'head',label:'Baş ve sinir',icon:'head',titles:['Baş Ağrıları','Migren','Sağ Taraflı Baş Ağrıları','Sol Taraflı Baş Ağrıları','Vertigo','Boyun Tutulması']},
 {id:'ent',label:'Kulak, burun, boğaz',icon:'ent',titles:['Sinüzit','Kulak Enfeksiyonu','Burun Tıkanıklığı','Burun Kanaması','Geniz Akıntısı','Boğaz Ağrısı','Boğaz Enfeksiyonu','Şiş Tonsiller','Farenjit','Larenjit (Ses Telleri İltihabı)','Streptokok (Beta) Boğaz Enfeksiyonu','Saman Nezlesi (Mevsimsel Alerji)']},
 {id:'eye',label:'Göz, ağız, diş',icon:'eye',titles:['Arpacık','Göz İltihabı','Göz Yaralanmaları','Diş Ağrısı','Ağız İçi Yaralar ve Aftlar','Diş Eti Kanaması','Diş İltihabı','Diş Çıkarma Dönemi']},
 {id:'lungs',label:'Ateş ve solunum',icon:'lungs',titles:['Ateş','Soğuk Algınlığı','Öksürük','Kuru Öksürük','Balgamlı Öksürük','Krup','RSV (Respiratuvar Sinsityal Virüs)','Influenza','COVID-19']},
 {id:'virus',label:'Bulaşıcı hastalıklar',icon:'virus',titles:['Zona (Herpes Zoster)','El, Ayak ve Ağız Hastalığı','Beşinci Hastalık','Suçiçeği','Kızamık','Kabakulak','Adenovirüs Enfeksiyonu','Lyme Hastalığı']},
 {id:'stomach',label:'Sindirim ve idrar',icon:'stomach',titles:['Mide Ağrısı','Kusma','İshal','Kolik','Kabızlık','Gıda Zehirlenmesi','Hemoroidler','Sistit','Böbrek Ağrısı']},
 {id:'skin',label:'Cilt ve yaralanma',icon:'skin',titles:['Çıban ve Apse','Güneş Yanığı','Cilt Yanıkları','Isırıklar ve Sokmalar','Darbe, Çarpma ve Düşme','Burkulma, Gerilme ve Kas Yaralanmaları','Kemik Kırıkları','Travma ve Ameliyat Sonrası Homeopatik Remediler','Tırnak Batması']},
 {id:'baby',label:'Kadın, anne, bebek',icon:'baby',titles:['Mastit (Meme İltihabı)','Adet Sorunları','Sıcak Basması','Hamilelik Bulantısı ve Kusma','Emzirme Sorunları','Meme Dolgunluğu ve Süt Birikmesi','Süt Azalması','Meme Bırakma Süreci','Emmeyi Reddetme','Bebeklerde Pamukçuk']},
 {id:'mind',label:'Duygu, zihin, uyku',icon:'mind',titles:['Gece Terörü','Anksiyete','Saldırı Sonrası Travma','Sınav Performans Kaygısı','Derin Yas','Okula Başlama','Korkular','Zihinsel Yorgunluk','Uykusuzluk','Tükenmişlik','Çarpıntı']},
 {id:'travel',label:'Yolculuk ve ritim',icon:'travel',titles:['Taşıt Tutması','Jet Lag']}
];

const remedyNames=record=>[...record.original.matchAll(/^###\s+(.+)$/gm)].map(m=>m[1].trim()).concat((record.extraRemedies||[]).map(x=>x.title));

/** Kümeleri kayıtlarla eşler: her semptoma kaynakta adı geçen remedi sayısını ekler. */
export function buildClusters(records){
 const symptoms=records.filter(r=>r.category==='symptoms');
 const byTitle=new Map(symptoms.map(r=>[norm(r.title),r]));
 const used=new Set();
 const out=clusters.map(c=>({...c,items:c.titles.map(t=>byTitle.get(norm(t))).filter(Boolean)}));
 for(const c of out)for(const r of c.items)used.add(r.id);
 const rest=symptoms.filter(r=>!used.has(r.id));
 if(rest.length)out.push({id:'other',label:'Diğer',icon:'leaf',items:rest});
 for(const c of out)c.items=c.items.map(r=>({record:r,remedyCount:remedyNames(r).length}));
 return out.filter(c=>c.items.length);
}
