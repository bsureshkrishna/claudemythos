const $=(s,e=document)=>e.querySelector(s), $$=(s,e=document)=>[...e.querySelectorAll(s)];
const D=window.MYTHOS, concepts=D.concepts, cultures=D.cultures;
const cultureById=Object.fromEntries(cultures.map(c=>[c.id,c]));
const bookHost=$("#bookHost"),gridEl=$("#grid"),bookView=$("#bookView"),browseView=$("#browseView"),
bookMode=$("#bookMode"),browseMode=$("#browseMode"),search=$("#search"),searchResults=$("#searchResults"),
prevBtn=$("#prevBtn"),nextBtn=$("#nextBtn"),upBtn=$("#upBtn"),tocBtn=$("#tocBtn"),tocDialog=$("#tocDialog"),
tocList=$("#tocList"),position=$("#position"),currentTitle=$("#currentTitle"),trackLabel=$("#trackLabel"),
thanksBtn=$("#thanksBtn"),thanksWrap=$("#thanksWrap"),thanksPanel=$("#thanksPanel");

const COLORS={norse:"#3d6a8c",greek:"#2f7a78",indian:"#c0692a",mesopotamian:"#9a6b2f",egyptian:"#a8841f",levantine:"#7a5a3a",
anatolian:"#8a4f3a",persian:"#2c7a5a",celtic:"#3f7d3a",slavic:"#a33b3b",finnic:"#4f6fae",chinese:"#b03a2e",japanese:"#c2455f",
maya:"#2e8a6e",aztec:"#b5552b",andean:"#8a5aa8","west-african":"#9a6a1c",polynesian:"#1f8aa0","north-american":"#6f5530"};
const color=cu=>COLORS[cu]||"#6b5a48";
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const paras=s=>String(s||"").split(/\n\s*\n/).map(p=>`<p>${esc(p.trim())}</p>`).join("");
const pad=n=>String(n).padStart(3,"0");
const store={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
// A concept may hold several versions from one umbrella culture (e.g. Yoruba and Akan under West African),
// so a version is addressed by its concept index and its index in that concept's versions.
const cultureLabel=v=>esc(cultureById[v.culture].name)+(v.people?` · ${esc(v.people)}`:"");
const sameCulture=(ci,vi)=>concepts[ci].versions.filter(v=>v.culture===concepts[ci].versions[vi].culture);
// Chips name the culture; when a culture tells a concept more than once, name the people, or failing that the story.
const chipLabel=(ci,vi)=>{
  const v=concepts[ci].versions[vi], same=sameCulture(ci,vi);
  if(same.length<2)return esc(cultureById[v.culture].name);
  return esc(v.people&&same.filter(x=>x.people===v.people).length===1?v.people:v.title);
};
const cultureCount=Object.fromEntries(cultures.map(c=>[c.id,concepts.reduce((n,x)=>n+x.versions.filter(v=>v.culture===c.id).length,0)]));
const storyCount=concepts.reduce((n,c)=>n+c.versions.length,0);

// The book is a set of "tracks". The concept track (track=null) pages through concepts;
// a culture track pages through that culture's versions only, skipping concepts it lacks.
// Each entry in a track is one two-page spread; `page` indexes spreads, not StPageFlip pages.
let track=null, pages=[], page=0, ci=0, pageFlip=null, needsMount=true;
let mode=store.get("mythosView")||"book";

function trackPages(cu){
  if(!cu)return [{kind:"cover"},...concepts.map((_,i)=>({kind:"concept",ci:i})),{kind:"end"}];
  return [{kind:"culture-cover",cu},...concepts.flatMap((c,i)=>c.versions.flatMap((v,vi)=>v.culture===cu?[{kind:"version",ci:i,vi,cu}]:[])),{kind:"culture-end",cu}];
}
const conceptPage=i=>i+1;

function coverHTML(){return `<div class="sheet split"><div class="half cover-half"><div><div class="cover-kicker">A comparative notebook</div><h1>Mythos</h1><p>The same stories, told again and again across the world: floods and world trees, tricksters and stolen fire, the road to the dead and the end of days.</p></div><div class="cover-bottom"><span>${concepts.length} concepts · ${storyCount} stories · ${cultures.length} traditions</span><span>open →</span></div></div><div class="half intro-half"><span class="eyebrow">How to read it</span><h2>One idea per spread, many tellers.</h2>
  <p>Each concept names a motif and lists the cultures that tell it. Pick a culture to read its version.</p>
  <div class="how"><div><kbd>←</kbd><kbd>→</kbd> On a concept, move between concepts. Inside a culture, keep reading that culture.</div><div><kbd>↓</kbd><kbd>↑</kbd> Step through the cultures that tell this concept. Past the last (or first) one, you are back at the concept.</div></div>
  <p class="intro-note">Similar stories don't have to share an origin. Some descend from a common ancestor (the Indo-European storm god), some travelled with trade and conquest, and some were invented independently. The notes on each page say which is likely.</p>
  <span class="eyebrow">Or start with one tradition</span>
  <div class="culture-chips">${cultures.filter(c=>cultureCount[c.id]).map(c=>`<button class="chip" data-culture="${c.id}" style="--c:${color(c.id)}">${esc(c.name)} <small>${cultureCount[c.id]}</small></button>`).join("")}</div></div></div>`}
function conceptHTML(i){
  const c=concepts[i];
  return `<div class="sheet flow concept-sheet">
  <div class="page-head"><span class="eyebrow">${esc(c.section)}</span><span class="page-no">No. ${pad(c.n)}</span></div>
  <h2 class="concept-title">${esc(c.title)}</h2>
  <div class="summary">${paras(c.summary)}</div>
  <div class="versions-label">${c.versions.length} tellings · choose one</div>
  <div class="version-list">${c.versions.map((v,vi)=>`<button class="version-row" data-go="${i}/${vi}" title="${esc(v.teaser)}" style="--c:${color(v.culture)}"><span class="vr-culture">${cultureLabel(v)}</span><span class="vr-title">${esc(v.title)}</span><span class="vr-teaser">${esc(v.teaser)}</span></button>`).join("")}</div>
  </div>`}
function imageHTML(img){
  if(!img)return "";
  const credit=[img.artist,img.license].filter(Boolean).map(esc).join(" · ")||"Wikimedia Commons";
  return `<figure class="plate"><img src="${esc(img.src)}" alt="${esc(img.caption)}" loading="lazy" referrerpolicy="no-referrer"><figcaption>${esc(img.caption)} <a href="${esc(img.page)}" target="_blank" rel="noopener">${credit}</a></figcaption></figure>`}
function versionHTML(p){
  const i=p.ci, cu=p.cu, c=concepts[i], v=c.versions[p.vi], list=pages.filter(q=>q.kind==="version"), k=list.indexOf(p)+1;
  const others=c.versions.map((x,vi)=>vi).filter(vi=>vi!==p.vi);
  return `<div class="sheet flow version-sheet" style="--c:${color(cu)}">
  <div class="page-head"><button class="up-link" data-up>↑ ${esc(c.title)}</button><span class="page-no">${k} / ${list.length}</span></div>
  <div class="culture-tag">${cultureLabel(v)}</div>
  <h2 class="version-title">${esc(v.title)}</h2>
  ${imageHTML(v.image)}
  <div class="story${/^.\p{M}/u.test(v.text.normalize("NFD"))?" no-dropcap":""}">${paras(v.text)}</div>
  ${v.caveat?`<div class="caveat"><strong>Note.</strong> ${esc(v.caveat)}</div>`:""}
  <div class="sources"><strong>Sources</strong> ${v.sources.map(esc).join("; ")}</div>
  ${others.length?`<div class="also"><span>Also told by</span>${others.map(vi=>`<button class="chip small" data-go="${i}/${vi}" style="--c:${color(c.versions[vi].culture)}">${chipLabel(i,vi)}</button>`).join("")}</div>`:""}
  </div>`}
function cultureCoverHTML(cu){
  const c=cultureById[cu], list=pages.filter(p=>p.kind==="version"), nConcepts=new Set(list.map(p=>p.ci)).size;
  return `<div class="sheet split" style="--c:${color(cu)}"><div class="half culture-half"><div><div class="cover-kicker">Reading one tradition</div><h1>${esc(c.name)}</h1><p>${esc(c.region)}</p></div>
  <div class="cover-bottom"><span>${list.length} stories · ${nConcepts} of ${concepts.length} concepts</span><span>→ to read · ↑ to concepts</span></div></div>
  <div class="half contents-half"><span class="eyebrow">Contents</span><ol class="culture-contents">${list.map(p=>`<li><button data-page="${pages.indexOf(p)}">${esc(concepts[p.ci].title)}${sameCulture(p.ci,p.vi).length>1?`: ${esc(concepts[p.ci].versions[p.vi].title)}`:""}</button></li>`).join("")}</ol></div></div>`}
function endHTML(cu){
  if(cu)return `<div class="sheet split" style="--c:${color(cu)}"><div class="half back-half"><span class="eyebrow">End of the ${esc(cultureById[cu].name)} tellings</span><h2>${cultureCount[cu]} stories</h2><p><button class="chip" data-up>↑ Back to the concepts</button></p></div><div class="half blank-half"></div></div>`;
  return `<div class="sheet split"><div class="half back-half"><span class="eyebrow">End</span><h2>${concepts.length} concepts</h2><p>Every story here was told by someone first. The sources on each page are the way back to them.</p></div><div class="half blank-half"></div></div>`}
function sheetHTML(p){
  switch(p.kind){
    case "cover":return coverHTML(); case "concept":return conceptHTML(p.ci);
    case "version":return versionHTML(p); case "culture-cover":return cultureCoverHTML(p.cu);
    default:return endHTML(p.cu);
  }
}

// A spread is laid out once as a single "sheet" two pages wide, at a fixed size: flowing sheets run their
// text in two columns, one per page. Both StPageFlip pages hold a copy of the sheet; the right page's copy
// is shifted left by one page width. A sheet too long for its spread is laid out larger (--f < 1) and
// scaled down to fit, so nothing scrolls.
const PAGE_W=540,PAGE_H=760,MIN_PAGE_W=300;
const fitCache=new Map(), measurer=document.createElement("div");
measurer.className="measurer";measurer.setAttribute("aria-hidden","true");document.body.append(measurer);
const sheetKey=p=>[p.kind,p.ci,p.vi,p.cu].join("/");
const overflows=sh=>[sh,...$$(".half",sh)].some(e=>e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1);
function fitFactor(p,html){
  const key=sheetKey(p);
  if(fitCache.has(key))return fitCache.get(key);
  measurer.innerHTML=html;
  const sh=measurer.firstElementChild, fits=f=>(sh.style.setProperty("--f",f),!overflows(sh));
  let f=1;
  if(!fits(1)){let lo=.5,hi=1;for(let n=0;n<7;n++){const m=(lo+hi)/2;if(fits(m))lo=m;else hi=m}f=lo}
  measurer.innerHTML="";fitCache.set(key,f);return f;
}
function spreadHTML(p){
  const html=sheetHTML(p), f=fitFactor(p,html).toFixed(4);
  const sheet=html.replace(/^<div class="sheet([^"]*)"(?: style="([^"]*)")?/,(_,cls,st)=>`<div class="sheet${cls}" style="--f:${f};${st||""}"`);
  const hard=p.kind==="cover"||p.kind==="culture-cover"?` data-density="hard"`:"";
  return `<div class="page page-l"${hard}>${sheet}</div><div class="page page-r">${sheet}</div>`;
}
// StPageFlip derives the page height from its width, so fit the host to the stage first. Two pages
// side by side when each can be at least MIN_PAGE_W wide; otherwise one at a time (StPageFlip's portrait).
function sizeHost(){
  const stage=bookHost.parentElement, r=PAGE_W/PAGE_H, sw=stage.clientWidth, sh=stage.clientHeight;
  let w=Math.min(sw,2*sh*r), h=w/2/r;
  if(w<2*MIN_PAGE_W){w=Math.min(sw,sh*r);h=w/r}
  bookHost.style.width=`${Math.floor(w)}px`;bookHost.style.height=`${Math.floor(h)}px`;
}
function scalePages(){if(pageFlip)bookHost.style.setProperty("--s",pageFlip.getBoundsRect().pageWidth/PAGE_W)}
function mount(nextTrack,startPage,enter){
  if(pageFlip){try{pageFlip.destroy()}catch{}pageFlip=null}
  track=nextTrack; pages=trackPages(track); page=Math.max(0,Math.min(pages.length-1,startPage));
  syncConcept(); needsMount=false;
  sizeHost();bookHost.innerHTML=`<div class="book"></div>`;
  const el=bookHost.firstElementChild;
  el.innerHTML=pages.map(spreadHTML).join("");
  pageFlip=new St.PageFlip(el,{startPage:2*page,width:PAGE_W,height:PAGE_H,size:"stretch",minWidth:MIN_PAGE_W,maxWidth:2000,minHeight:200,maxHeight:2000,
    usePortrait:true,showCover:false,autoSize:true,drawShadow:true,maxShadowOpacity:.28,mobileScrollSupport:true,disableFlipByClick:true,flippingTime:650});
  pageFlip.loadFromHTML($$(".page",el));
  pageFlip.on("flip",e=>{page=e.data>>1;syncConcept();updateUI()});
  pageFlip.on("changeOrientation",()=>{scalePages();updateUI()});
  scalePages();
  if(enter){bookHost.classList.remove("enter-down","enter-up","enter-side");void bookHost.offsetWidth;bookHost.classList.add(enter)}
  updateUI();
}
function syncConcept(){const p=pages[page];if(p&&p.ci!=null)ci=p.ci}

function goTo(nextTrack,target,enter){
  if(mode!=="book")setMode("book",{mount:false});
  if(nextTrack===track&&pageFlip&&!needsMount){
    if(target===page)return;
    if(Math.abs(target-page)===1)pageFlip.flip(2*target);else{pageFlip.turnToPage(2*target);page=target;syncConcept();updateUI()}
    return;
  }
  mount(nextTrack,target,enter);
}
function openVersion(i,vi,enter){
  const cu=concepts[i].versions[vi].culture;
  goTo(cu,trackPages(cu).findIndex(p=>p.ci===i&&p.vi===vi),enter||(track===null?"enter-down":"enter-side"));
}
function openCulture(cu){goTo(cu,0,"enter-down")}
function openConcept(i,enter){goTo(null,conceptPage(i),enter||(track?"enter-up":null))}
function up(){if(track)openConcept(ci)}
// ↓ / ↑ step through a concept's tellings in list order; stepping past either end returns to the concept.
function cycle(dir){
  const p=pages[page];if(!p)return;
  const enter=dir>0?"enter-down":"enter-up";
  if(p.kind==="concept"){const n=concepts[p.ci].versions.length;if(n)openVersion(p.ci,dir>0?0:n-1,enter)}
  else if(p.kind==="version"){const vi=p.vi+dir;if(vi<0||vi>=concepts[p.ci].versions.length)openConcept(p.ci,enter);else openVersion(p.ci,vi,enter)}
  else if(dir<0)up();
}
function navigate(dir){
  if(mode!=="book"||!pageFlip||pageFlip.getState()==="flipping")return;
  if(dir>0){pageFlip.flipNext();return}
  // In portrait, flipPrev aims at the hidden left page's corner, which disableFlipByClick rejects,
  // so lift that setting just for this call; clicks on the page text still don't turn it.
  const settings=pageFlip.getSettings();settings.disableFlipByClick=false;
  try{pageFlip.flipPrev()}finally{settings.disableFlipByClick=true}
}

function updateUI(){
  const p=pages[page]||{}, cu=track;
  const nVersions=pages.filter(x=>x.kind==="version").length;
  if(!cu){
    position.textContent=p.kind==="concept"?`${concepts[p.ci].n} / ${concepts.length} · ${concepts[p.ci].section}`:`${concepts.length} concepts`;
    currentTitle.textContent=p.kind==="concept"?concepts[p.ci].title:p.kind==="end"?"Back cover":"Cover";
    trackLabel.innerHTML=`<strong>All concepts</strong><span>← → between concepts · pick a culture to read its telling${p.kind==="concept"?" · ↓ ↑ step through them":""}</span>`;
    trackLabel.style.removeProperty("--c");
  }else{
    const c=cultureById[cu], k=pages.slice(0,page+1).filter(x=>x.kind==="version").length;
    position.textContent=p.kind==="version"?`${c.name} · ${k} / ${nVersions}`:c.name;
    currentTitle.textContent=p.kind==="version"?concepts[p.ci].versions[p.vi].title:p.kind==="culture-cover"?"Contents":"End";
    trackLabel.innerHTML=`<strong>Reading: ${esc(c.name)}</strong><span>← → stays in ${esc(c.name)} · ↓ ↑ other cultures, then back to the concept</span>`;
    trackLabel.style.setProperty("--c",color(cu));
  }
  trackLabel.hidden=false;
  upBtn.hidden=!cu;
  // In portrait each spread is two screens, so the last screen is the right half of the last spread.
  const at=pageFlip?pageFlip.getCurrentPageIndex():2*page, last=pageFlip?.getOrientation()==="portrait"?2*pages.length-1:2*pages.length-2;
  prevBtn.disabled=at<=0; nextBtn.disabled=at>=last;
  const frag=!cu?(p.kind==="concept"?`#${concepts[p.ci].id}`:p.kind==="end"?"#end":"")
    :p.kind==="version"?versionHash(p):p.kind==="culture-cover"?`#culture/${cu}`:`#culture/${cu}/end`;
  history.replaceState(null,"",location.pathname+location.search+frag);
  $$(".concept-card",gridEl).forEach(x=>x.classList.toggle("selected",+x.dataset.index===ci));
}
function versionHash(p){
  const n=sameCulture(p.ci,p.vi).indexOf(concepts[p.ci].versions[p.vi])+1;
  return `#${concepts[p.ci].id}/${p.cu}${n>1?`/${n}`:""}`;
}
function fromHash(){
  const h=decodeURIComponent(location.hash.slice(1));
  if(!h)return [null,0];
  if(h==="intro")return [null,0];
  if(h==="end")return [null,concepts.length+1];
  const [a,b,c]=h.split("/");
  if(a==="culture"&&cultureById[b])return [b,c==="end"?trackPages(b).length-1:0];
  const i=concepts.findIndex(x=>x.id===a);
  if(i<0)return [null,0];
  const tp=b&&cultureById[b]?trackPages(b).filter(p=>p.ci===i):[];
  if(tp.length)return [b,trackPages(b).findIndex(p=>p.ci===i&&p.vi===(tp[(+c||1)-1]||tp[0]).vi)];
  return [null,conceptPage(i)];
}

// StPageFlip starts a drag on mousedown/touchstart; let buttons and links inside pages behave normally.
for(const ev of ["mousedown","touchstart"])bookHost.addEventListener(ev,e=>{if(e.target.closest("button,a"))e.stopPropagation()},{capture:true});
bookHost.addEventListener("click",e=>{
  const t=e.target.closest("[data-go],[data-up],[data-culture],[data-concept],[data-page]");if(!t)return;
  if(t.dataset.go){const [i,vi]=t.dataset.go.split("/");openVersion(+i,+vi)}
  else if(t.hasAttribute("data-up"))up();
  else if(t.dataset.culture)openCulture(t.dataset.culture);
  else if(t.dataset.page)goTo(track,+t.dataset.page);
  else openConcept(+t.dataset.concept);
});

function buildBrowse(){
  $("#browseTitle").textContent=`${concepts.length} concepts · ${storyCount} stories`;
  let section="";
  gridEl.innerHTML=concepts.map((c,i)=>{
    const head=c.section!==section?`<h2 class="grid-section">${esc(section=c.section)}</h2>`:"";
    return head+`<article class="concept-card" data-index="${i}" tabindex="0"><div class="card-top"><span class="card-no">No. ${pad(c.n)}</span></div><h3>${esc(c.title)}</h3><p>${esc((c.summary.match(/^.*?[.!?](\s|$)/)||[c.summary])[0])}</p><div class="card-cultures">${c.versions.map((v,vi)=>`<button class="chip small" data-go="${i}/${vi}" style="--c:${color(v.culture)}">${chipLabel(i,vi)}</button>`).join("")}</div></article>`}).join("");
  gridEl.onclick=e=>{
    const chip=e.target.closest("[data-go]");
    if(chip){const [i,vi]=chip.dataset.go.split("/");openVersion(+i,+vi);return}
    const card=e.target.closest(".concept-card");if(card)openConcept(+card.dataset.index);
  };
  gridEl.onkeydown=e=>{const card=e.target.closest(".concept-card");if(card&&e.target===card&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openConcept(+card.dataset.index)}};
}
let tocTab="concepts";
function buildToc(){
  $$(".toc-tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tocTab));
  if(tocTab==="cultures"){
    tocList.className="toc-list cultures";
    tocList.innerHTML=cultures.filter(c=>cultureCount[c.id]).map(c=>`<button class="toc-item" data-toc-culture="${c.id}" style="--c:${color(c.id)}"><strong>${esc(c.name)}</strong><small>${esc(c.region)} · ${cultureCount[c.id]} stories</small></button>`).join("");
    return;
  }
  tocList.className="toc-list";
  let section="";
  tocList.innerHTML=concepts.map((c,i)=>(c.section!==section?`<h3 class="toc-section">${esc(section=c.section)}</h3>`:"")+`<button class="toc-item${i===ci?" current":""}" data-toc-concept="${i}"><strong>${esc(c.title)}</strong><small>No. ${pad(c.n)} · ${c.versions.length} tellings</small></button>`).join("");
}
$$(".toc-tab").forEach(b=>b.onclick=()=>{tocTab=b.dataset.tab;buildToc()});
tocList.onclick=e=>{
  const b=e.target.closest(".toc-item");if(!b)return;tocDialog.close();
  if(b.dataset.tocCulture)openCulture(b.dataset.tocCulture);else openConcept(+b.dataset.tocConcept);
};

const searchItems=[...concepts.map((c,i)=>({type:"concept",ci:i,title:c.title,summary:c.summary,section:c.section})),
  ...concepts.flatMap((c,i)=>c.versions.map((v,vi)=>({type:"version",ci:i,vi,cu:v.culture,title:v.title,concept:c.title,culture:cultureById[v.culture].name,people:v.people||"",names:v.names||[],teaser:v.teaser,sources:v.sources})))];
const fuse=new Fuse(searchItems,{includeScore:true,threshold:.32,ignoreLocation:true,minMatchCharLength:2,
  keys:[{name:"title",weight:2.5},{name:"names",weight:2.2},{name:"concept",weight:1.4},{name:"culture",weight:1.2},{name:"people",weight:1.2},{name:"sources",weight:1},{name:"teaser",weight:.8},{name:"summary",weight:.5}]});
function showSearch(){
  const q=search.value.trim();if(!q){searchResults.hidden=true;return}
  const rs=fuse.search(q,{limit:12});
  searchResults.innerHTML=rs.length?rs.map(({item:x},n)=>x.type==="concept"
    ?`<button class="search-result ${n?"":"active"}" data-concept="${x.ci}"><span class="sr-kind">Concept</span><span><strong>${esc(x.title)}</strong><br><small>${esc(x.section)}</small></span></button>`
    :`<button class="search-result ${n?"":"active"}" data-go="${x.ci}/${x.vi}" style="--c:${color(x.cu)}"><span class="sr-kind culture">${esc(x.culture)}</span><span><strong>${esc(x.title)}</strong><br><small>${esc(x.concept)}${x.names.length?" · "+esc(x.names.slice(0,4).join(", ")):""}</small></span></button>`).join("")
    :`<div class="no-results">No matching myths</div>`;
  searchResults.hidden=false;
}
searchResults.onclick=e=>{
  const b=e.target.closest(".search-result");if(!b)return;searchResults.hidden=true;search.blur();
  if(b.dataset.go){const [i,vi]=b.dataset.go.split("/");openVersion(+i,+vi)}else openConcept(+b.dataset.concept);
};
search.oninput=showSearch;
search.onkeydown=e=>{if(e.key==="Escape"){searchResults.hidden=true;search.blur()}if(e.key==="Enter"){const f=$(".search-result",searchResults);if(f)f.click()}};
document.addEventListener("click",e=>{if(!e.target.closest(".search-wrap"))searchResults.hidden=true});

function setMode(next,{mount:doMount=true}={}){
  mode=next;store.set("mythosView",mode);const b=mode==="book";
  bookView.hidden=!b;browseView.hidden=b;bookMode.classList.toggle("active",b);browseMode.classList.toggle("active",!b);
  $(".navigator").hidden=!b;
  if(b&&doMount&&(needsMount||!pageFlip))mount(track,page);
  else if(b&&pageFlip){sizeHost();pageFlip.update();scalePages()}
  if(!b)setTimeout(()=>$(`.concept-card[data-index="${ci}"]`,gridEl)?.scrollIntoView({block:"center"}),30);
}
document.addEventListener("keydown",e=>{
  if(!thanksPanel.hidden){if(e.key==="Escape"){e.preventDefault();setThanksOpen(false)}return}
  if(tocDialog.open||e.target.matches?.("input,textarea,select")||e.altKey||e.ctrlKey||e.metaKey)return;
  const k=e.key;
  if(k==="/"){e.preventDefault();search.focus()}
  else if(k==="ArrowRight")navigate(1);
  else if(k==="ArrowLeft")navigate(-1);
  else if(k==="ArrowUp"&&mode==="book"){e.preventDefault();cycle(-1)}
  else if(k==="ArrowDown"&&mode==="book"){e.preventDefault();cycle(1)}
  else if(k.toLowerCase()==="b")setMode("book");
  else if(k.toLowerCase()==="g")setMode("browse");
});
prevBtn.onclick=()=>navigate(-1);nextBtn.onclick=()=>navigate(1);upBtn.onclick=up;
bookMode.onclick=()=>setMode("book");browseMode.onclick=()=>setMode("browse");
tocBtn.onclick=()=>{buildToc();tocDialog.showModal();$(".toc-item.current",tocList)?.scrollIntoView({block:"center"})};

function sizeThanksPanel(){thanksPanel.style.setProperty("--thanks-max-height",`${Math.max(100,window.innerHeight-thanksBtn.getBoundingClientRect().bottom-24)}px`)}
function setThanksOpen(open){
  if(open){sizeThanksPanel();searchResults.hidden=true}
  else if(thanksPanel.contains(document.activeElement))thanksBtn.focus({preventScroll:true});
  thanksPanel.hidden=!open;thanksBtn.setAttribute("aria-expanded",String(open));
}
// Touch creates pointer-enter events too; only a mouse should trigger hover behaviour.
thanksWrap.addEventListener("pointerenter",e=>{if(e.pointerType==="mouse")setThanksOpen(true)});
thanksWrap.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse"&&!thanksWrap.querySelector(":focus-visible"))setThanksOpen(false)});
thanksWrap.addEventListener("focusin",()=>setThanksOpen(true));
thanksWrap.addEventListener("focusout",e=>{if(!thanksWrap.contains(e.relatedTarget)&&!thanksWrap.matches(":hover"))setThanksOpen(false)});
thanksBtn.onclick=()=>setThanksOpen(true);
document.addEventListener("pointerdown",e=>{if(!thanksWrap.contains(e.target))setThanksOpen(false)});
window.addEventListener("resize",()=>{if(!thanksPanel.hidden)sizeThanksPanel();if(mode==="book"&&pageFlip){sizeHost();pageFlip.update();scalePages()}});

window.addEventListener("hashchange",()=>{const [t,pg]=fromHash();if(t!==track||pg!==page)goTo(t,pg,t!==track?(t?"enter-down":"enter-up"):null)});

$("#brandCount").textContent=`${concepts.length} concepts · ${cultures.length} traditions`;
[track,page]=fromHash(); pages=trackPages(track); syncConcept();
if(!location.hash)mode="book";
buildBrowse();
// Spreads are fitted against the page fonts, so wait for them (but not forever).
Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2500))]).then(()=>{setMode(mode);if(mode!=="book")updateUI()});
