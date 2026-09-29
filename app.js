/* ============================================================
   TLNT.AE Resume Formatter - shared engine
   Used by index.html (editor) and view.html (shared link view)
   ============================================================ */
(function(global){
"use strict";

if (global.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

const FONTS = {
  reg:  "https://cdn.jsdelivr.net/npm/@expo-google-fonts/roboto@0.2.3/Roboto_400Regular.ttf",
  med:  "https://cdn.jsdelivr.net/npm/@expo-google-fonts/roboto@0.2.3/Roboto_500Medium.ttf",
  bold: "https://cdn.jsdelivr.net/npm/@expo-google-fonts/roboto@0.2.3/Roboto_700Bold.ttf",
};
let fontCache = null;

/* ---- sources / watermarks to strip ---- */
const SOURCE_WORDS = [
 "linkedin","indeed","glassdoor","monster.com","ziprecruiter","careerbuilder","simplyhired",
 "snagajob","flexjobs","dice.com","cv-library","totaljobs","reed.co.uk","seek.com",
 "hh.ru","headhunter","superjob","rabota.ru","zarplata","habr career","geekjobs",
 "work.ua","rabota.ua","jooble","talent.com","adzuna","neuvoo","jobs.ge",
 "naukri","bayt.com","gulftalent","laimoon","dubizzle","jobstreet","glints","foundit","shine.com","timesjobs",
 "contactout","rocketreach","lusha","apollo.io","signalhire","hunter.io","kaspr","cognism",
 "upwork","fiverr","freelancer.com","angellist","wellfound","xing.com",
 "resume.io","resume-now","novoresume","zety","enhancv","myperfectresume","kickresume","flowcv","visualcv",
 "indeed.com","glassdoor.com"
];
const WATERMARK_LINE = [
 /powered\s+by/i,/generated\s+(by|on|with)/i,/created\s+(with|on|using)/i,/made\s+with/i,
 /built\s+with/i,/downloaded\s+(from|on)/i,/exported\s+from/i,/imported\s+from/i,
 /\bsource\s*[:\-]/i,/profile\s+url/i,/(public|view)\s+profile/i,
 /page\s+\d+\s+of\s+\d+/i,/^\s*\d+\s*\/\s*\d+\s*$/,
 /this\s+(resume|cv)\s+was/i,/сформировано|скачано\s+с|резюме\s+с\s+сайта|источник\s*:/i,
 /резюме\s+(обновлено|создано|подготовлено)/i,/обновлено\s+\d/i,
 /сгенерировано|создано\s+(в|с\s+помощью)/i,
 /\bconnections?\b/i,/\bfollowers?\b/i,/\d+\+?\s*(connections|подписчиков|контакт)/i,
];

/* section header dictionary -> normalized label */
const HEAD_MAP = [
 [/^(summary|profile|about( me)?|objective|overview|professional summary)(?![a-zа-яё])/i,"Summary"],
 [/^(о себе|обо мне|профиль|краткая информация)(?![a-zа-яё])/i,"О себе"],
 [/^(желаемая должность.*|желаемая зарплата)/i,"Желаемая должность"],
 [/^(experience|work experience|employment( history)?|work history|professional experience|career)(?![a-zа-яё])/i,"Experience"],
 [/^(опыт работы|места работы|трудовой опыт)(?![a-zа-яё])/i,"Опыт работы"],
 [/^(education|academic background|qualifications)(?![a-zа-яё])/i,"Education"],
 [/^(высшее образование|неоконченное высшее|среднее специальное|образование|обучение)(?![a-zа-яё])/i,"Образование"],
 [/^(skills|technical skills|core skills|hard skills|soft skills|key skills|competenc(e|ies)|top skills|core competenc(e|ies)|key competenc(e|ies)|areas? of expertise|technical expertise|professional skills|personal skills|additional skills)(?![a-zа-яё])/i,"Skills"],
 [/^(ключевые навыки|навыки|компетенции|технические навыки|профессиональные навыки|основные навыки)(?![a-zа-яё])/i,"Навыки"],
 [/^(research experience|teaching experience|relevant experience|leadership experience)(?![a-zа-яё])/i,"Experience"],
 [/^(research interests?)(?![a-zа-яё])/i,"Research Interests"],
 [/^(professional development)(?![a-zа-яё])/i,"Professional Development"],
 [/^(personal information|personal details|contact information|contact details|personal data)(?![a-zа-яё])/i,"__PERSONAL__"],
 [/^(projects?|portfolio)(?![a-zа-яё])/i,"Projects"],
 [/^(проекты)(?![a-zа-яё])/i,"Проекты"],
 [/^(certification?s?|certificates?|courses?|training)(?![a-zа-яё])/i,"Certifications"],
 [/^(сертификаты|курсы|повышение квалификации.*)(?![a-zа-яё])/i,"Курсы"],
 [/^(languages?)(?![a-zа-яё])/i,"Languages"],
 [/^(знание языков|владение языками|языки)(?![a-zа-яё])/i,"Языки"],
 [/^(achievements?|awards?|honors?)(?![a-zа-яё])/i,"Achievements"],
 [/^(достижения|награды)(?![a-zа-яё])/i,"Достижения"],
 [/^(interests?|hobbies)(?![a-zа-яё])/i,"Interests"],
 [/^(интересы|хобби|увлечения)(?![a-zа-яё])/i,"Интересы"],
 [/^(publications?)(?![a-zа-яё])/i,"Publications"],
 [/^(references?)(?![a-zа-яё])/i,"References"],
 [/^(рекомендации)(?![a-zа-яё])/i,"Рекомендации"],
 [/^(дополнительная информация)(?![a-zа-яё])/i,"Дополнительно"],
 [/^(контакты|контактная информация|контактные данные|способы связаться|способы связи|связаться со мной)(?![a-zа-яё])/i,"__CONTACTS__"],
 [/^(contacts?|contact (information|details)|how to (reach|contact)|ways to (reach|contact))(?![a-zа-яё])/i,"__CONTACTS__"],
];

const EMAIL_RE = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i;
const EMAIL_G_RE = new RegExp(EMAIL_RE.source,"gi");
const PHONE_RE = /(\+?\(?\d[\d\s().\-]{7,}\d)/;

/* ---- phone picking: the first digit run is often a period or an ID, not the phone ---- */
const PHONE_LINE_RE = /\+?\(?\d(?:[\d().\-]|[^\S\r\n]){7,}\d/g;   // never crosses a line break ("915264444\n2023")
const PHONE_LABEL_RE = /(?<![\p{L}])(phone|telephone|tel|mobile|mob|cell|whatsapp|телефон|тел|мобильный|моб|сотовый)(?![\p{L}])/iu;
const ID_LABEL_RE = /((?<![\p{L}])(id|no|passport|contract|policy|invoice|account|iban|license|licence|паспорт|договор|полис|инн|снилс)|№|n°|#)\s*[.:]?\s*$/iu;
const isYear = g => /^(19|20)\d{2}$/.test(g);
// digits that are not a phone: too short ("36.6"), a period ("2018 - 2024", "2013 2003"), a date ("11.06.1984", "01.2019 - 05.2021")
function phoneJunk(p){
  const g=p.match(/\d+/g)||[];
  if(g.join("").length<7) return true;
  if(g.every(isYear)) return true;
  if(g.some(isYear) && g.every(x=>x.length<=2||isYear(x))) return true;
  return false;
}
// first plausible phone in the text; "+", a phone label or grouped digits win over a bare number sitting inside other text
function findPhone(text){
  let fallback="";
  for(const line of String(text||"").split("\n")){
    for(const m of line.matchAll(PHONE_LINE_RE)){
      let p=m[0].trim();
      if(p[0]==="(" && !p.includes(")")) p=p.slice(1);          // "(2018 - 2020"
      const before=line.slice(0,m.index), after=line.slice(m.index+m[0].length);
      if(phoneJunk(p)) continue;
      if(p[0]!=="+" && /\p{L}$/u.test(before)) continue;          // tail of a code: "CMX094025509", "ivan1234567@..."
      const labeled=PHONE_LABEL_RE.test(line);
      if(p[0]!=="+" && !PHONE_LABEL_RE.test(before) && ID_LABEL_RE.test(before)) continue;   // "Contract n°: 915264444"
      if(/^\s*(₽|руб|\$|€|aed|usd|eur|rub|тыс)/iu.test(after)) continue;                       // salary, not a phone
      const grouped=/^\(\d{2,5}\)/.test(p) || (p.match(/\d+/g)||[]).length>=3;
      const chunk=before.split(/[|•·;,]/).pop();                   // "Dubai, UAE | 0501234567" is a contact row, not text
      const inText=/\p{L}/u.test(chunk.replace(EMAIL_RE,"").replace(/https?:\/\/\S+|www\.\S+/gi,""));
      if(p[0]==="+" || labeled || grouped || !inText) return p;
      if(!fallback) fallback=p;
    }
  }
  return fallback;
}
const URL_RE   = /\b((https?:\/\/)?(www\.)?[a-z0-9\-]+\.[a-z]{2,}(\/[^\s]*)?)\b/i;
const PERSONAL_RE = /(мужчина|женщина|\d+\s+(год|года|лет)|родил|проживает|гражданств|разрешение на работу|готов(а)? к переезд|готов(а)? к командиров|не готов|тип занятости|формат работы|время в пути|желательное время|занятость|желаемая зарплата|date of birth|nationality|marital status)/i;

const JOB_TITLE_RE = /\b(director|manager|engineer|developer|designer|analyst|consultant|specialist|officer|lead|head\s+of|chief|cxo|cto|cfo|ceo|coo|president|founder|co-?founder|nurse|accountant|architect|administrator|coordinator|executive|supervisor|technician|teacher|professor|scientist|marketer|recruiter|strategist|owner|partner|associate|intern|руководитель|директор|менеджер|инженер|разработчик|дизайнер|аналитик|специалист|бухгалтер|консультант|маркетолог|администратор|руководител)\b/i;

/* ---- location detection (generic, not a fixed city list) ---- */
const COUNTRY_RE=/(?<![\p{L}])(uae|united arab emirates|emirates|usa|u\.s\.a\.|united states|uk|united kingdom|england|scotland|ireland|canada|germany|deutschland|france|italy|italia|spain|españa|portugal|poland|polska|netherlands|belgium|sweden|norway|denmark|finland|switzerland|austria|greece|turkey|türkiye|egypt|saudi arabia|saudi|qatar|kuwait|bahrain|oman|jordan|lebanon|morocco|nigeria|kenya|ghana|south africa|japan|china|hong kong|singapore|malaysia|indonesia|thailand|vietnam|philippines|india|pakistan|bangladesh|australia|new zealand|brazil|brasil|argentina|chile|colombia|mexico|méxico|россия|russia|казахстан|kazakhstan|украина|ukraine|беларусь|belarus|узбекистан|армения|грузия|georgia|azerbaijan|азербайджан|оаэ|эмираты|катар|саудовская аравия|кувейт|бахрейн|оман|египет|турция|германия|франция|испания|италия|польша|нидерланды|швейцария|сербия)(?![\p{L}])/iu;
const US_STATE_RE=/,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/;
const CITY_RE=/(?<![\p{L}])(dubai|abu dhabi|sharjah|ajman|doha|riyadh|jeddah|kuwait city|manama|muscat|дубай|абу[\s-]?даби|шарджа|аджман|доха|эр[\s-]?рияд|джидда|манама|маскат|london|manchester|new york|san francisco|los angeles|chicago|boston|seattle|austin|houston|dallas|miami|toronto|vancouver|berlin|munich|hamburg|paris|madrid|barcelona|rome|milan|amsterdam|brussels|zurich|geneva|vienna|warsaw|prague|stockholm|oslo|copenhagen|helsinki|istanbul|cairo|lagos|nairobi|cape town|johannesburg|tokyo|osaka|beijing|shanghai|hong kong|singapore|kuala lumpur|bangkok|jakarta|mumbai|delhi|bangalore|bengaluru|hyderabad|sydney|melbourne|sao paulo|são paulo|mexico city|москва|moscow|санкт\s*-?\s*петербург|петербург|st\.? petersburg|екатеринбург|новосибирск|казань|нижний новгород|самара|краснодар|алматы|астана|almaty|astana|tashkent|ташкент|baku|баку|tbilisi|тбилиси|минск|minsk|kyiv|kiev|киев)(?![\p{L}])/iu;
const LOC_PREFIX_RE=/^\s*(location|address|based in|city|town|город(?:\s+проживания)?|адрес|местоположение|проживает|residence)\s*[:\-\u2013]\s*/i;
function looksLikeLocationChunk(s){
  s=(s||"").trim();
  if(!s||s.length>44||s.split(/\s+/).length>6) return false;
  if(EMAIL_RE.test(s)||/[@]|https?:|www\.|\.com|\.ru|\d{4,}/i.test(s)) return false;   // no years/IDs
  if(/гражданств|разрешение|nationality|date of birth|родил|university|универ|институт|college|школа|degree|ph\.?\s?d|phd|doctorate|diploma|b\.?sc|m\.?sc|mba|bachelor|master|факультет|кафедр/i.test(s)) return false;
  if(LOC_PREFIX_RE.test(s)) return true;
  if(US_STATE_RE.test(s)) return true;
  if(COUNTRY_RE.test(s)) return true;
  if(CITY_RE.test(s)) return true;
  if(/\b(bay area|greater\s+\w+\s+area|metropolitan area|\w+\s+region)\b/i.test(s)) return true;
  return false;
}
function tidyLoc(s){
  return (s||"")
    .replace(/([а-яёa-z])\s*-\s*([а-яёa-z])/gi,"$1-$2")     // "Санкт - Петербург" -> "Санкт-Петербург"
    .replace(/\s{2,}/g," ").replace(/[.,;]+$/,"").trim();
}
function detectLocation(lines){
  for(const raw of lines.slice(0,22)){
    const line=raw.replace(/\s+([,.;:])/g,"$1").trim();
    if(!line) continue;
    const chunks=line.split(/\s*[|·•∙‧]\s*/);                // split combined contact lines
    for(let ch of chunks){
      ch=ch.trim();
      const hadPrefix=LOC_PREFIX_RE.test(ch);
      if(!hadPrefix){                                         // "archvadze89@gmail.com +971502608464 Dubai": the city after the contacts
        const ph=findPhone(ch);
        let rest=ch.replace(EMAIL_G_RE," ").replace(/(https?:\/\/|www\.)\S+/gi," ");
        if(ph) rest=rest.split(ph).join(" ");
        ch=rest.replace(/^[\s,;]+|[\s,;]+$/g,"");
      }
      let cand=hadPrefix ? ch.replace(LOC_PREFIX_RE,"").trim() : ch;
      if(hadPrefix){                                          // keep just the city/region, drop metro & extra clauses
        cand=cand.split(/\s*,\s*/).filter(p=>p && !/^(м\.|метро|ст\.|station|метро)/i.test(p)).slice(0,2).join(", ");
      }
      cand=cand.replace(/\s*[,;]\s*(?=готов|не готов|можно|есть\s|гражданств|разрешение)/i," ").replace(/^[•\-\s|]+/,"").trim();
      cand=tidyLoc(cand);
      const ok = cand && cand.length<=44 && !/гражданств|разрешение/i.test(cand) &&
                 (hadPrefix || looksLikeLocationChunk(cand));
      if(ok) return cand;
    }
  }
  return "";
}

/* ============================ fonts ============================ */
async function fetchBase64(url){
  const buf = await (await fetch(url)).arrayBuffer();
  let bin=""; const bytes=new Uint8Array(buf), chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk) bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+chunk));
  return btoa(bin);
}
async function ensureFonts(cb){
  if(fontCache) return fontCache;
  if(cb) cb("Загружаю шрифт (кириллица)…",0.1);
  const [reg,med,bold]=await Promise.all([fetchBase64(FONTS.reg),fetchBase64(FONTS.med),fetchBase64(FONTS.bold)]);
  fontCache={reg,med,bold};
  if(cb) cb("",1);
  return fontCache;
}

/* ============================ extraction ============================ */
async function extractFile(file, opts){
  opts=opts||{};
  const name=(file.name||"").toLowerCase();
  if(name.endsWith(".txt")||file.type==="text/plain") return {text:await file.text(), photo:""};
  if(name.endsWith(".pdf")||file.type==="application/pdf") return await extractPdf(file);
  if(name.endsWith(".docx")) return {text:await extractDocx(file), photo:""};
  if(name.endsWith(".doc")) throw new Error("Старый формат .doc не поддерживается - пересохраните как .docx или PDF.");
  if((file.type||"").startsWith("image/")||/\.(png|jpe?g|webp|bmp)$/.test(name)) return await extractImage(file,opts);
  return {text:await file.text(), photo:""};
}

async function extractPdf(file, cb){
  const data=new Uint8Array(await file.arrayBuffer());
  const pdf=await pdfjsLib.getDocument({data}).promise;
  let out=[]; let bestImg=null;
  for(let p=1;p<=pdf.numPages;p++){
    if(cb) cb(`Читаю PDF - страница ${p}/${pdf.numPages}…`, p/pdf.numPages);
    const page=await pdf.getPage(p);
    const vp=page.getViewport({scale:1});
    const tc=await page.getTextContent();
    out.push.apply(out, reconstructLines(tc.items, vp.width));
    out.push("");
    // collect images -> keep the largest (candidate photo), ignore tiny icons
    try{
      const ops=await page.getOperatorList();
      const names=[];
      ops.fnArray.forEach((fn,i)=>{ if(fn===pdfjsLib.OPS.paintImageXObject) names.push(ops.argsArray[i][0]); });
      for(const nm of names){
        // images shared between pages live in commonObjs ("g_" prefix): page.objs.get never resolves for them -> hang
        const store=nm.startsWith("g_")?page.commonObjs:page.objs;
        const img=await Promise.race([
          new Promise(res=>{ try{ store.get(nm,res); }catch(e){ res(null); } }),
          new Promise(res=>setTimeout(()=>res(null),4000))   // never block the whole resume on one image
        ]);
        if(!img||!img.width) continue;
        const area=img.width*img.height;
        if(area<60*60) continue;                 // skip icons/logos
        if(!bestImg || area>bestImg.area) bestImg={area,img};
      }
    }catch(e){}
  }
  return { text: out.join("\n"), photo: bestImg? imgToDataUrl(bestImg.img) : "" };
}

/* column-aware line reconstruction: keeps left date-column with its block */
const DATE_L=/(^|[\s(])(янв|фев|мар|апр|ма[йя]|июн|июл|авг|сен|окт|ноя|дек|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[а-яёa-z.]*\s*\d{4}|^\s*\d{4}\s*[\u2014\u2013\-]|настоящее время|по\s+настоящее|present|^\s*\d+\s*(год|года|лет|month|year|мес)|^\s*(месяц[а-яё]*|года?|лет|год|months?|years?)\s*$/i;
const PERIOD_START=/(\d{4}\s*[\u2014\u2013\-]\s*$)|^((янв|фев|мар|апр|ма[йя]|июн|июл|авг|сен|окт|ноя|дек|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[а-яёa-z.]*\s*\d{4})|^\s*(19|20)\d{2}(\s*[\u2014\u2013\-].*)?$/i;
/* ---- letter-spaced (tracked) text: Canva/designer PDFs, hand-spaced Word headings ---- */
const TRK_CH=/^[\p{L}\p{N}]$/u;
// "O G" / "- J a n" / "2 0 2 5 -" -> "OG" / "- Jan" / "2025 -": glue letters/digits, keep spaces next to punctuation.
// null when s is not a run of single characters split by single spaces.
function glueSpaced(s){
  const toks=s.trim().split(" ");
  if(toks.length<2 || toks.some(t=>t.length!==1)) return null;
  let w=toks[0];
  for(let i=1;i<toks.length;i++) w+=(TRK_CH.test(toks[i-1])&&TRK_CH.test(toks[i])?"":" ")+toks[i];
  return w;
}
// "C u s t o m e r" / "З а к а з ч и к" -> "Customer" / "Заказчик". Only a chunk made entirely of single characters
// with 3+ letters/digits is touched, so "Hepatitis A B C" stays; 2+ spaces are word breaks.
function collapseTracked(s){
  if(!s || !/\S \S/.test(s)) return s;
  return s.split(/(\s{2,})/).map(ch=>{
    const w=glueSpaced(ch);
    if(w===null || (ch.match(/[\p{L}\p{N}]/gu)||[]).length<3) return ch;
    return ch.match(/^\s*/)[0]+splitCamel(w)+ch.match(/\s*$/)[0];
  }).join("");
}
// word breaks lost inside one spaced run come back at lower->Upper joints: "CustomerService" -> "Customer Service";
// short prefixes stay glued (McDonald, DeVito, MacArthur)
function splitCamel(w){
  return w.replace(/(\p{Lu}?\p{Ll}{2,})(?=\p{Lu}\p{Ll})/gu, m=>/^(mac|van|von|del|der|dos|das)$/i.test(m)?m:m+" ");
}
// Separator between neighbouring items comes from geometry instead of a blind " ":
//  - items that touch (gap < 0.1em) are one word cut by the PDF producer: "D"+"irected", "202"+"5", "high"+"-"+"performing";
//  - a run of letter-spaced pieces (single glyphs, caps pairs pdf.js merged by kerning "LT", spaced chunks "S O C I O L")
//    glues together, and only a clearly wider gap inside the run is a word break: "N","A","T",... -> "NATALIA SCULLY".
const GLUE_L=/[\p{L}\p{N}\p{M}\p{Pd}+@\/_]$/u, GLUE_R=/^[\p{L}\p{N}\p{M}\p{Pd}@\/_]/u, WORDY=/[\p{L}\p{N}\p{M}]/u;
function trackKind(s){
  const t=s.trim();
  if(TRK_CH.test(t)) return "g";                                                     // one glyph
  if(/^(?=.*\p{Lu})[\p{Lu}\p{N}] ?[\p{Lu}\p{N}]$/u.test(t)) return "k";             // kerned caps pair: "LT", "A T"
  if(glueSpaced(t)!==null && (t.match(/[\p{L}\p{N}]/gu)||[]).length>=2) return "s"; // spaced chunk: "S O C I O L", "O G"
  return "";
}
function glueRowItems(arr){
  const its=arr.slice().sort((a,b)=>a.x-b.x).map(o=>Object.assign({},o,{k:trackKind(o.s)}));
  const n=its.length; if(!n) return "";
  const em=o=>o.fs||10, gap=i=>its[i].x-(its[i-1].x+its[i-1].w);
  const sep=new Array(n).fill(" ");
  for(let i=1;i<n;i++){
    const a=its[i-1].s, b=its[i].s, e=Math.max(em(its[i-1]),em(its[i])), g=gap(i);
    if(/\s$/.test(a) || /^\s/.test(b) || g>=0.1*e || g<-0.3*e) continue;
    if(i===1 && /^[\p{Pd}•*·▪‣]$/u.test(a)) continue;                              // a leading "-" stays a list marker
    const la=a.slice(-1), fb=b.charAt(0);
    // glue only word-ish joints with a letter/digit on at least one side ("|"+"2010" keeps its space)
    if(GLUE_L.test(la) && GLUE_R.test(fb) && (WORDY.test(la)||WORDY.test(fb)) && !(la==="+" && !/\d/.test(fb))) sep[i]="";
  }
  // typical space between ordinary words of this row (em): a lowercase "run" spaced like that is plain text ("в 2 х раза")
  const plain=[];
  for(let i=1;i<n;i++){ const g=gap(i)/em(its[i]); if((!its[i-1].k || !its[i].k) && g>0.1 && g<1) plain.push(g); }
  plain.sort((x,y)=>x-y);
  const plainGap=plain.length ? plain[plain.length>>1] : 0;
  for(let i=0;i<n;){
    if(!its[i].k){ its[i].s=collapseTracked(its[i].s); i++; continue; }
    const e=em(its[i]);
    let j=i;
    while(j+1<n && its[j+1].k && gap(j+1)<e && gap(j+1)>-0.3*e && Math.abs(em(its[j+1])-e)<0.2*e) j++;
    const run=its.slice(i,j+1), txt=run.map(o=>o.s).join(""), cnt=c=>run.filter(o=>o.k===c).length, gs=[];
    for(let k=i+1;k<=j;k++) gs.push(gap(k));
    const q=Math.max(0, gs.length ? gs.slice().sort((x,y)=>x-y)[(gs.length-1)>>2] : 0);   // letter gap = lower quartile
    let ok=(txt.match(/[\p{L}\p{N}]/gu)||[]).length>=3 && (run.length>=3 || (run.length===2 && cnt("s")>0))
           && cnt("g")+cnt("s")>=Math.max(2,cnt("k"));
    if(ok && /\p{Ll}/u.test(txt)) ok=!cnt("k") && !(plainGap && q/e>=0.75*plainGap);
    if(ok){
      run.forEach(o=>{ if(o.k!=="g") o.s=glueSpaced(o.s)||o.s.replace(/ /g,""); });
      const brk=Math.min(0.55*e, q+Math.max(0.15*e, 0.6*q));      // anything wider than 0.55em is a word break anyway
      for(let k=i+1;k<=j;k++) sep[k]= gap(k)>brk ? " " : "";
    } else run.forEach(o=>{ o.s=collapseTracked(o.s); });
    i=j+1;
  }
  let s=its[0].s; for(let i=1;i<n;i++) s+=sep[i]+its[i].s;
  return s;
}
function joinRowItems(arr){
  return glueRowItems(arr).replace(/\s+/g," ").replace(/\s+([,.;:%)\u00bb])/g,"$1").replace(/([\u00ab(])\s+/g,"$1").trim();
}
// A row with a huge horizontal gap is two separate texts that share a baseline (name on the left, city on the right
// of a designer header; left sidebar + right column): split it so they do not end up as one line.
function splitRowAtGaps(arr){
  const its=arr.slice().sort((a,b)=>a.x-b.x), parts=[[its[0]]];
  for(let i=1;i<its.length;i++){
    const a=its[i-1], b=its[i], g=b.x-(a.x+a.w), e=Math.max(a.fs||10,b.fs||10);
    if(a.w>0 && b.w>0 && g>Math.max(3*e,24)) parts.push([b]); else parts[parts.length-1].push(b);
  }
  return parts;
}
// Column-aware line reconstruction: de-interleaves hh.ru's left meta column (period/degree) from the right
// content column, so each entry reads "period / company / position / description" instead of a scrambled mix.
function reconstructLines(items, pageW){
  const its=[];
  items.forEach(it=>{ if(it.str && it.str.trim()) its.push({x:it.transform[4], y:it.transform[5], w:it.width||0, s:it.str,
    fs:it.height||Math.hypot(it.transform[2],it.transform[3])||0}); });
  if(!its.length) return [];
  its.sort((a,b)=> b.y-a.y || a.x-b.x);
  const rows=[]; let cur=null;
  its.forEach(it=>{ if(!cur || Math.abs(cur.y-it.y)>3.2){ cur={y:it.y, its:[]}; rows.push(cur); } cur.its.push(it); });

  // detect the right-column left margin RX
  const h={};
  rows.forEach(r=>{ const minx=Math.min.apply(null,r.its.map(i=>i.x)); if(minx>90 && minx<330){ const b=Math.round(minx/5)*5; h[b]=(h[b]||0)+1; } });
  let RX=0, bc=0; for(const k in h){ if(h[k]>bc){ bc=h[k]; RX=+k; } }
  const leftCount = RX ? its.filter(i=>(i.x+i.w)<RX-8).length : 0;
  if(!RX || bc<4 || leftCount<5)                                          // single column
    return [].concat(...rows.map(r=>splitRowAtGaps(r.its).map(joinRowItems))).filter(Boolean);

  const out=[]; let e=null;
  const flush=()=>{ if(!e) return; out.push("");
    let m=e.meta.join(" ").replace(/\s*[\u2014\u2013\-]\s*$/,"").replace(/\s{2,}/g," ").trim();
    m=m.replace(/\s(\d{1,2}\s+(?:год|года|лет|месяц[а-яё]*).*)$/i," · $1");   // period · duration
    if(m) out.push(m); e.content.forEach(c=>out.push(c)); e=null; };
  for(const r of rows){
    const parts=r.its.slice().sort((a,b)=>a.x-b.x);
    // largest horizontal gap in the row
    let gi=-1, gmax=0;
    for(let i=0;i<parts.length-1;i++){ const g=parts[i+1].x-(parts[i].x+parts[i].w); if(g>gmax){ gmax=g; gi=i; } }
    const splitX = gi>=0 ? parts[gi+1].x : Infinity;
    const twoCol = gi>=0 && gmax>14 && splitX>=RX-26 && splitX<=RX+26 && parts[0].x<RX-12;
    if(twoCol){
      const meta=joinRowItems(parts.slice(0,gi+1)), content=joinRowItems(parts.slice(gi+1));
      if(PERIOD_START.test(meta)){ flush(); e={meta:[meta], content: content?[content]:[]}; }
      else if(e && e.meta.length<4 && !isHeader(meta)){ e.meta.push(meta); if(content) e.content.push(content); }
      else { flush(); out.push(meta); if(content) out.push(content); }   // hh.ru meta is 1-3 short lines; more is a sidebar
    } else {
      const line=joinRowItems(parts);
      const rightOnly = parts.every(p=>p.x>=RX-8);
      const leftOnly  = parts.every(p=>(p.x+p.w)<RX-6);
      if(rightOnly){ if(e) e.content.push(line); else out.push(line); }
      else if(leftOnly && e && e.meta.length<4 && !isHeader(line) && (DATE_L.test(line)||line.length<26)){ e.meta.push(line); }
      else { flush(); out.push(line); }   // heading or full-width prose
    }
  }
  flush();
  return out.filter((l,i,a)=> !(l===""&&(a[i-1]===""||i===0)) );
}

function imgToDataUrl(im, maxW){
  try{
    maxW = maxW || 320;
    const scale = im.width>maxW ? maxW/im.width : 1;
    const w=Math.round(im.width*scale), h=Math.round(im.height*scale);
    const c=document.createElement("canvas"); c.width=w; c.height=h;
    const ctx=c.getContext("2d");
    if(im.bitmap){ ctx.drawImage(im.bitmap,0,0,w,h); }
    else if(im.data){
      const tmp=document.createElement("canvas"); tmp.width=im.width; tmp.height=im.height;
      const tctx=tmp.getContext("2d");
      const id=tctx.createImageData(im.width,im.height); const d=im.data;
      if(d.length===im.width*im.height*3){ for(let i=0,j=0;i<d.length;i+=3,j+=4){ id.data[j]=d[i];id.data[j+1]=d[i+1];id.data[j+2]=d[i+2];id.data[j+3]=255; } }
      else if(d.length===im.width*im.height*4){ id.data.set(d); }
      else return "";
      tctx.putImageData(id,0,0);
      ctx.drawImage(tmp,0,0,w,h);
    } else return "";
    return c.toDataURL("image/jpeg",0.78);
  }catch(e){ return ""; }
}

async function extractDocx(file){
  const r=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
  return r.value;
}
async function extractImage(file, opts){
  const lang=(opts && opts.lang) || "eng+rus";
  const worker=await Tesseract.createWorker(lang,1,{logger:m=>{
    if(opts&&opts.cb&&m.status==="recognizing text") opts.cb("Распознаю текст (OCR)…",0.1+m.progress*0.9);
  }});
  const {data}=await worker.recognize(file);
  await worker.terminate();
  return {text:data.text, photo:""};
}

/* ============================ cleaning ============================ */
function cleanText(text, on){
  on = on!==false;
  let lines=text.replace(/\r/g,"").split("\n").map(collapseTracked);   // "Р Е З Ю М Е" typed by hand in Word, OCR of tracked headings
  const out=[];
  for(let raw of lines){
    let ln=raw.replace(/ /g," ").replace(/[ \t]+/g," ").trimEnd();
    ln=ln.replace(/\s+([,.;:%])/g,"$1");          // fix hh.ru spaced punctuation
    if(on){
      const low=ln.toLowerCase();
      if(WATERMARK_LINE.some(re=>re.test(ln))) continue;
      const hitSource = SOURCE_WORDS.some(w=>low.includes(w));
      if(hitSource){
        if(/(https?:\/\/|www\.|\.(com|ru|io|net|co|me|org|ae|in|ua|ge)\b)/i.test(low) && ln.trim().split(/\s+/).length<=3){ continue; }
        let stripped=ln;
        SOURCE_WORDS.forEach(w=>{ stripped=stripped.replace(new RegExp("\\b"+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b","ig"),""); });
        stripped=stripped
          .replace(/\b(sourced\s+(via|from|on)|found\s+(via|on)|via|from|source)\b\s*[.:,]?\s*$/i,"")
          .replace(/(https?:\/\/|www\.)\S*/gi,"")
          .replace(/\s+\./g,".")
          .replace(/\s*[•|·\-\u2013\u2014,;:]\s*$/,"").replace(/^\s*[•|·\-\u2013\u2014,;:]\s*/,"")
          .replace(/\s{2,}/g," ").trim();
        if(stripped.replace(/[^a-zа-яё0-9]/ig,"").length<3) continue;
        ln=stripped;
      }
    }
    out.push(ln);
  }
  return out.join("\n").replace(/\n{3,}/g,"\n\n").trim();
}

/* ============================ parsing ============================ */
const HEAD_TAIL=new Set(["and","&","of","the","training","information","info","history","summary","details","background","section","skills","experience","education","и","или"]);
function isHeader(line){
  let t=line.trim().replace(/\s*[:：]\s*$/,"");           // tolerate a trailing colon
  if(!t) return null;
  // strip an hh.ru duration tail ("- 13 лет 5 месяцев") before structural checks
  const core=t.replace(/\s*[\u2014\-\u2013]\s*\d+\s*(год\w*|лет|year\w*|month\w*|мес\w*).*$/i,"").trim();
  if(!core||core.length>40) return null;
  if(/[,;]|[•·|]/.test(core)) return null;                // headers carry no commas or bullet separators
  if(core.split(/\s+/).length>6) return null;
  for(const [re,label] of HEAD_MAP){
    const m=core.match(re);
    if(!m) continue;
    const rest=core.slice(m[0].length).trim();
    if(!rest) return label;                               // keyword == whole line
    const restWords=rest.toLowerCase().split(/\s+/).filter(Boolean);
    if(restWords.every(w=>HEAD_TAIL.has(w))) return label; // "Education and training", "Top Skills"
  }
  return null;
}
function isContactLine(tt){
  if(!tt) return false;
  if(EMAIL_RE.test(tt) && tt.length<70) return true;
  if(/^[+(]?\d[\d\s().\-]{7,}\d$/.test(tt) && !/^(19|20)\d{2}\s*\p{Pd}\s*(19|20)\d{2}$/u.test(tt)) return true;   // "2018 - 2024" is a period
  if(/^((https?:\/\/)?(www\.)?[a-z0-9.\-]+\.[a-z]{2,}(\/\S*)?)$/i.test(tt) && !/\s/.test(tt)) return true;
  return false;
}
// contact line already shown in the header (same e-mail / same phone digits); bare URLs are dropped as before
function isHeaderContact(tt,res){
  const e=tt.match(EMAIL_RE), dg=s=>(s||"").replace(/\D/g,"");
  if(e) return !!res.email && e[0].toLowerCase()===res.email.toLowerCase();
  if(/^[+(]?\d[\d\s().\-]{7,}\d$/.test(tt)) return !!res.phone && dg(tt)===dg(res.phone);
  return true;
}
// a sentence, not a contact entry: long, or a short phrase with function words ("Brazil, and the UAE.")
const FUNC_WORD=/(?<![\p{L}])(and|the|with|for|of|in|to|an|on|at|by|from|и|в|с|на|по|для|от|до|за|из)(?![\p{L}])/iu;
function isProseLine(c){
  const t=(c||"").trim(), w=t.split(/\s+/).length;
  if(!t || EMAIL_RE.test(t) || findPhone(t) || /https?:|www\./i.test(t) || PERSONAL_RE.test(t)) return false;
  return (t.length>=40 && w>=4) || (w>=3 && FUNC_WORD.test(t));
}
function isLocationLine(tt){
  if(tt.length>=55 || /\d{4}/.test(tt) || EMAIL_RE.test(tt)) return false;
  if(/гражданств|разрешение на работу/i.test(tt)) return false;
  return /(dubai|abu dhabi|sharjah|ajman|uae|united arab emirates|qatar|doha|riyadh|jeddah|kuwait|москва|moscow|санкт|петербург|липецк|самара|екатеринбург|новосибирск|казань|россия|russia|казахстан|алматы|астана|astana|almaty|проживает)/i.test(tt);
}
function looksLikeName(line){
  const t=line.trim();
  if(!t||t.length>48) return false;
  if(/\d|@|http|www\.|\+?\d{5}/.test(t)) return false;
  if(/^(resume|cv|curriculum vitae|резюме)\s*$/i.test(t)) return false;
  if(isHeader(t)||PERSONAL_RE.test(t)) return false;
  const words=t.split(/\s+/);
  if(words.length<1||words.length>4) return false;
  const letters=t.replace(/[^a-zа-яё]/ig,"").length;
  return letters>=t.replace(/\s/g,"").length*0.7;
}

// hh.ru experience: each job starts with a period line like "Ноябрь 2024 -" - add a blank line between jobs for readability
function spaceExperienceEntries(body){
  const startRe=/^[А-ЯЁA-Z][а-яёa-z]+\.?\s+\d{4}\s*[\u2014\u2013-]\s*$/;
  const lines=body.split("\n"), out=[]; let seen=false;
  for(const l of lines){
    if(startRe.test(l.trim())){
      if(seen && out.length && out[out.length-1].trim()!=="") out.push("");
      seen=true;
    }
    out.push(l);
  }
  return out.join("\n");
}
function parseResume(text){
  const lines=text.split("\n");
  const res={name:"",head:"",email:"",phone:"",loc:"",link:"",personal:"",sections:[]};

  const em=text.match(EMAIL_RE); if(em) res.email=em[0];
  res.phone=findPhone(text);
  const linkM = text.match(/(?:https?:\/\/)?(?:www\.)?(?:github|gitlab|behance|dribbble|medium|stackoverflow)\.[a-z]{2,}\/[A-Za-z0-9_\-./]+/i) || text.match(/\bt\.me\/[A-Za-z0-9_]+/i);
  if(linkM) res.link=linkM[0].replace(/[.,;]+$/,"");
  res.loc = detectLocation(lines);

  // personal facts (hh.ru top block)
  const personal=[];
  lines.slice(0,14).forEach(l=>{ const t=l.trim(); if(t && PERSONAL_RE.test(t) && !isHeader(t) && t.length<90) personal.push(t.replace(/^[•\-\s]+/,"")); });
  res.personal=[...new Set(personal)].join("\n");

  let i=0;
  while(i<lines.length && !lines[i].trim()) i++;
  if(i<lines.length && /^(resume|cv|curriculum vitae|резюме)\s*$/i.test(lines[i].trim())) i++;
  while(i<lines.length && !lines[i].trim()) i++;
  const start=i;
  let pendingHead="";
  // name is valid only above any section header / personal-facts block (hh.ru exports often omit the name)
  for(let k=start;k<Math.min(start+12,lines.length);k++){
    const t=(lines[k]||"").trim();
    if(!t) continue;
    const h=isHeader(t);
    if(h==="__CONTACTS__"||h==="__PERSONAL__") continue;   // skip hh.ru "Способы связаться"/contact labels - the name may sit just after
    if(h||PERSONAL_RE.test(t)) break;
    if(looksLikeName(t)){
      if(JOB_TITLE_RE.test(t) && !pendingHead){ pendingHead=t; continue; } // job title sitting above the name -> headline
      res.name=t; i=k+1; break;
    }
    if(!isContactLine(t)) break;   // first real non-name, non-contact line -> no name here
  }
  // headline = line right after a found name
  if(res.name){
    for(let k=i;k<Math.min(i+4,lines.length);k++){
      const t=(lines[k]||"").trim();
      if(!t) continue;
      if(EMAIL_RE.test(t)||PHONE_RE.test(t)||isHeader(t)||PERSONAL_RE.test(t)) break;
      if(res.loc && tidyLoc(t)===res.loc) continue;          // city printed next to the name is not the headline
      if(t.length<=70 && !/[•|]/.test(t)){ res.head=t; i=k+1; }
      break;
    }
    // a short headline wrapped onto a second line by the layout: "Customer" / "Representative"
    const nx=(lines[i]||"").trim();
    if(res.head && /^[\p{L}\s]+$/u.test(res.head) && res.head.split(/\s+/).length<=2 && /^\p{Lu}\p{L}{2,19}$/u.test(nx)
       && !isHeader(nx) && !PERSONAL_RE.test(nx) && !looksLikeLocationChunk(nx)){ res.head+=" "+nx; i++; }
    if(!res.head && pendingHead) res.head=pendingHead;
  } else { i=start; }

  let cur={title:"",body:[]};
  const flush=()=>{ if(cur.title||cur.body.join("").trim()){ res.sections.push({title:cur.title,body:cur.body.join("\n").trim()}); } };
  let started=false;
  const absorbed=new Set();
  for(let k=i;k<lines.length;k++){
    if(absorbed.has(k)) continue;
    const t=lines[k];
    const h=isHeader(t);
    if(h){
      if(h==="__CONTACTS__" || h==="__PERSONAL__"){
        for(let j=k+1; j<lines.length; j++){
          const c=lines[j]; if(isHeader(c)) break;
          // two-column layouts interleave the neighbour column's sentences into a contacts block: leave them in the flow
          if(h==="__CONTACTS__" && isProseLine(c)) continue;
          absorbed.add(j);
          if(!c.trim()) continue;
          if(!res.email){const e=c.match(EMAIL_RE);if(e)res.email=e[0];}
          if(!res.phone) res.phone=findPhone(c);
          if(h==="__CONTACTS__" && looksLikeLocationChunk(c) && !/(^|[\s,])(м\.|метро|ст\.|station)/i.test(c)){   // "Al Furjan, Dubai, UAE" beats "Dubai, UAE"
            const lc=tidyLoc(c);
            if(!res.loc || (lc.length>res.loc.length && lc.toLowerCase().includes(res.loc.toLowerCase()))) res.loc=lc;
          }
          if(h==="__PERSONAL__"){
            const pl=c.replace(/^[•\-\s]+/,"").trim();
            if(pl && !EMAIL_RE.test(c) && !/^(https?:|www\.)|@/i.test(pl) && pl.length<90)
              res.personal=(res.personal?res.personal+"\n":"")+pl;
          }
        }
        continue;         // absorbed lines are skipped by the main loop
      }
      if(started) flush();
      cur={title:h,body:[]}; started=true;
    } else {
      const tt=t.trim();
      if(isContactLine(tt) && isHeaderContact(tt,res)) continue;   // a second e-mail / phone stays in the text
      if(!started && (tt==="" || isLocationLine(tt) || PERSONAL_RE.test(tt) || (res.loc && tt===res.loc))) continue;
      if(!started){ cur.title=res.name&&/[а-яё]/i.test(res.name)?"Профиль":"Profile"; }
      cur.body.push(t);
      started=true;
    }
  }
  flush();
  res.sections=res.sections.map(s=>({title:s.title,body:s.body.replace(/\n{3,}/g,"\n\n").trim()}));
  // merge all sections sharing a title into the first occurrence (hh.ru repeats e.g. "Навыки", "Образование")
  const merged=[], idx={};
  res.sections.forEach(s=>{
    if(s.title && idx[s.title]!=null){ merged[idx[s.title]].body=(merged[idx[s.title]].body+"\n"+s.body).trim(); }
    else { if(s.title) idx[s.title]=merged.length; merged.push({title:s.title,body:s.body}); }
  });
  res.sections=merged;
  // hh.ru "Желаемая должность" -> use its first line as the headline (no duplication)
  if(!res.head){
    const ds=res.sections.find(s=>/желаемая должность|desired position/i.test(s.title));
    if(ds){ const bl=ds.body.split("\n"); res.head=(bl.shift()||"").trim(); ds.body=bl.join("\n").trim();
      res.head=res.head.replace(/\s+\d[\d\s]{3,}\s*(₽|руб|\$|€|aed|usd|eur|dirham|дирхам).*$/i,"").replace(/\s*(на руки|до вычета налогов).*$/i,"").trim(); }
  }
  res.sections=res.sections.map(s=>/(опыт|experience)/i.test(s.title)?{title:s.title,body:spaceExperienceEntries(s.body)}:s);
  res.sections=res.sections.filter(s=>s.body.length>0);
  if(res.personal) res.personal=[...new Set(res.personal.split("\n").map(s=>s.trim()).filter(Boolean))].join("\n");
  return res;
}

/* ============================ preview (HTML mirror) ============================ */
function escapeHtml(s){return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function bulletize(body){
  return (body||"").split("\n").map(l=>{
    const t=l.trim();
    if(/^[-•*\u2013▪‣·]\s+/.test(t)) return `<div class="li">${escapeHtml(t.replace(/^[-•*\u2013▪‣·]\s+/,""))}</div>`;
    if(!t) return `<div class="sp"></div>`;
    return `<div>${escapeHtml(t)}</div>`;
  }).join("");
}
function safeImg(v){ return (typeof v==="string" && /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(v)) ? v : ""; }
function footerLeft(d){ return (d&&d.lang==="en")
  ? "Prepared by TLNT.AE - talent & recruitment agency, Dubai, UAE"
  : "Подготовлено агентством TLNT.AE - подбор персонала, Дубай, ОАЭ"; }
function renderPreview(el, d){
  const contacts=[d.email,d.phone,d.loc,d.link].filter(Boolean);
  const logo=safeImg(d.logo), photo=safeImg(d.photo);
  const logoHtml = logo ? `<img class="p-logo-img" src="${logo}">` : `<div class="p-logo">TLNT<span class="dot">.</span>AE</div>`;
  const photoHtml = photo ? `<img class="p-photo" src="${photo}">` : "";
  el.innerHTML=`
    <div class="p-mast">${logoHtml}<div class="p-tag">Talent Agency<br>United Arab Emirates</div></div>
    <div class="p-headrow">
      <div class="p-headmain">
        <div class="p-name">${escapeHtml(d.name||"Имя Фамилия")}</div>
        ${d.head?`<div class="p-head">${escapeHtml(d.head)}</div>`:""}
        ${contacts.length?`<div class="p-contacts">${contacts.map(escapeHtml).join('<span>·</span>')}</div>`:""}
        ${d.personal?`<div class="p-personal">${escapeHtml(d.personal).replace(/\n/g,' &nbsp;•&nbsp; ')}</div>`:""}
      </div>
      ${photoHtml?`<div class="p-photowrap">${photoHtml}</div>`:""}
    </div>
    ${(d.sections||[]).map(s=>`<div class="p-sec">${s.title?`<h3>${escapeHtml(s.title)}</h3>`:""}<div class="body">${bulletize(s.body)}</div></div>`).join("")}
    <div class="p-foot"><span>${escapeHtml(footerLeft(d))}</span><span>tlnt.ae</span></div>`;
}

/* ============================ PDF build ============================ */
async function buildResumeDoc(d, cb){
  const f=await ensureFonts(cb);
  const { jsPDF }=global.jspdf;
  const doc=new jsPDF({unit:"pt",format:"a4"});
  doc.addFileToVFS("R-r.ttf",f.reg);  doc.addFont("R-r.ttf","Roboto","normal");
  doc.addFileToVFS("R-m.ttf",f.med);  doc.addFont("R-m.ttf","Roboto","medium");
  doc.addFileToVFS("R-b.ttf",f.bold); doc.addFont("R-b.ttf","Roboto","bold");

  const W=doc.internal.pageSize.getWidth(), H=doc.internal.pageSize.getHeight();
  const M=48, CW=W-M*2, BOTTOM=H-50;
  const GRAPH=[63,58,51], INK=[74,68,60], MUT=[124,116,104], BEI=[176,141,87], BEID=[154,120,66], LINE=[231,222,207];
  let y=0;
  const setC=c=>doc.setTextColor(c[0],c[1],c[2]);

  function masthead(first){
    doc.setFont("Roboto","bold"); doc.setFontSize(first?16:12); setC(GRAPH);
    const baseY=first?50:38;
    doc.text("TLNT", M, baseY, {charSpace:1.1});
    let tw=doc.getTextWidth("TLNT");
    setC(BEI); doc.text(".", M+tw+2, baseY); const dw=doc.getTextWidth(".");
    setC(GRAPH); doc.text("AE", M+tw+dw+3, baseY,{charSpace:1.1});
    doc.setFont("Roboto","normal"); doc.setFontSize(first?7.5:6.5); setC(BEID);
    doc.text("TALENT AGENCY · UAE", W-M, baseY-6, {align:"right",charSpace:1.4});
    const ly=first?60:46;
    doc.setDrawColor(BEI[0],BEI[1],BEI[2]); doc.setLineWidth(1.1); doc.line(M,ly,W-M,ly);
    return ly+ (first?20:16);
  }
  function footer(){
    doc.setDrawColor(LINE[0],LINE[1],LINE[2]); doc.setLineWidth(.6); doc.line(M,H-40,W-M,H-40);
    doc.setFont("Roboto","normal"); doc.setFontSize(7.5); setC(MUT);
    doc.text(footerLeft(d), M, H-28);
    doc.text("tlnt.ae", W-M, H-28, {align:"right"});
  }
  function newPage(){ footer(); doc.addPage(); y=masthead(false); }
  function need(h){ if(y+h>BOTTOM){ newPage(); } }

  y=masthead(true);

  // ---- header row: name/contacts left, photo right ----
  let photoW=0, photoH=0, photoX=0;
  const photoSafe=safeImg(d.photo);
  if(photoSafe){
    try{
      const props=doc.getImageProperties(photoSafe);
      const boxW=92, boxH=118;
      const r=Math.min(boxW/props.width, boxH/props.height);
      photoW=props.width*r; photoH=props.height*r;
      photoX=W-M-photoW;
      doc.addImage(photoSafe,"JPEG",photoX,y,photoW,photoH);
    }catch(e){ photoW=0; }
  }
  const textW = photoW? CW-photoW-16 : CW;
  let leftY=y;
  doc.setFont("Roboto","bold"); doc.setFontSize(18); setC(GRAPH);
  doc.splitTextToSize(d.name||"-", textW).forEach(l=>{ doc.text(l,M,leftY+15); leftY+=21; });
  leftY+=1;
  if(d.head){ doc.setFont("Roboto","normal"); doc.setFontSize(10.5); setC(MUT);
    doc.splitTextToSize(d.head,textW).forEach(l=>{ doc.text(l,M,leftY+9); leftY+=13; }); }
  const contacts=[d.email,d.phone,d.loc,d.link].filter(Boolean);
  if(contacts.length){
    leftY+=4; doc.setFontSize(8.7); let x=M;
    contacts.forEach((c,idx)=>{ const tw=doc.getTextWidth(c);
      if(x+tw>M+textW){ leftY+=11; x=M; }
      doc.setFont("Roboto","normal"); setC(INK); doc.text(c,x,leftY+7); x+=tw;
      if(idx<contacts.length-1){ setC(BEI); doc.text("  ·  ",x,leftY+7); x+=doc.getTextWidth("  ·  "); } });
    leftY+=12;
  }
  if(d.personal){ doc.setFont("Roboto","normal"); doc.setFontSize(8.3); setC(MUT);
    doc.splitTextToSize(d.personal.replace(/\n/g,"  •  "),textW).forEach(l=>{ leftY+=10; doc.text(l,M,leftY+3); }); leftY+=6; }

  y=Math.max(leftY, y+photoH) + 8;
  doc.setDrawColor(LINE[0],LINE[1],LINE[2]); doc.setLineWidth(.8); doc.line(M,y,W-M,y); y+=14;

  // ---- sections (compact) ----
  (d.sections||[]).forEach(s=>{
    if(s.title){
      need(24);
      doc.setFont("Roboto","bold"); doc.setFontSize(9); setC(BEID);
      const title=s.title.toUpperCase();
      doc.text(title,M,y+8,{charSpace:1.2});
      const tw=doc.getTextWidth(title)+title.length*1.2;
      doc.setDrawColor(LINE[0],LINE[1],LINE[2]); doc.setLineWidth(.6); doc.line(M+tw+10,y+5,W-M,y+5);
      y+=17;
    }
    doc.setFont("Roboto","normal"); doc.setFontSize(9); setC(INK);
    s.body.split("\n").forEach(raw=>{
      const t=raw.replace(/\s+$/,"");
      if(!t.trim()){ y+=4; return; }
      const bullet=/^[-•*\u2013▪‣·]\s+/.test(t.trim());
      const indent=bullet?13:0;
      const txt=bullet?t.trim().replace(/^[-•*\u2013▪‣·]\s+/,""):t;
      doc.splitTextToSize(txt,CW-indent).forEach((l,li)=>{
        need(11.5);
        if(bullet&&li===0){ setC(BEI); doc.text("•",M,y+8); setC(INK); }
        doc.text(l,M+indent,y+8); y+=11.5;
      });
      if(bullet) y+=0.5;
    });
    y+=9;
  });

  footer();
  return doc;
}
function uniqueStamp(){
  const d=new Date(), p=n=>String(n).padStart(2,"0");
  const rnd=Math.floor(Math.random()*1296).toString(36).padStart(2,"0"); // avoid same-second clashes
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}_${rnd}`;
}
async function downloadResumePdf(d, cb){
  const doc=await buildResumeDoc(d, cb);
  const base=(d.name||d.head||"resume").replace(/[^\wЀ-ӿ\- ]/g,"").trim().replace(/\s+/g,"_").slice(0,40)||"resume";
  doc.save(`TLNT_${base}_${uniqueStamp()}.pdf`);
}

/* ============================ share payload ============================ */
function encodePayload(d){
  const json=JSON.stringify(d);
  return global.LZString.compressToEncodedURIComponent(json);
}
function decodePayload(str){
  try{ const json=global.LZString.decompressFromEncodedURIComponent(str); return json?JSON.parse(json):null; }
  catch(e){ return null; }
}

global.TLNT = {
  ensureFonts, extractFile, extractPdf, reconstructLines, joinRowItems, collapseTracked, cleanText, parseResume, isHeader, findPhone,
  renderPreview, buildResumeDoc, downloadResumePdf,
  encodePayload, decodePayload, imgToDataUrl
};
})(window);
