const CIRCULARS_KEY="kvs_oyms_demo_circulars_v1";
function esc(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
function fileUrl(blob){return blob instanceof Blob?URL.createObjectURL(blob):"";}
async function renderPublicCirculars(){
 const root=document.getElementById("publicCircularList");if(!root)return;
 const client=window.oymsSupabase;if(!client){root.innerHTML='<tr><td colspan="5" class="muted">Shared notices are temporarily unavailable.</td></tr>';return;}
 const {data:items,error}=await client.from("notices").select("id,title,body,published_on,audience,created_at").eq("is_published",true).order("published_on",{ascending:false}).limit(100);
 if(error){root.innerHTML='<tr><td colspan="5" class="muted">Could not load published notices.</td></tr>';console.error(error);return;}
 if(!items?.length){root.innerHTML='<tr><td colspan="5" class="muted">No school or unit circulars have been published yet.</td></tr>';return;}
 root.innerHTML=items.map(x=>{const date=x.published_on?new Date(x.published_on+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—";return '<tr><td>'+esc(date)+'</td><td>—</td><td><strong>'+esc(x.title)+'</strong><small>'+esc(x.audience||"All")+(x.body?" · "+esc(x.body):"")+'</small></td><td>—</td><td>—</td></tr>';}).join("");
}
function safeHttpUrl(value){
 try{const url=new URL(String(value||""));return url.protocol==="https:"||url.protocol==="http:"?url.href:"";}catch{return "";}
}
function readPublishedEvents(){
 try{
  const rows=JSON.parse(localStorage.getItem("kvs_oyms_demo_events_v1")||"[]");
  return Array.isArray(rows)?rows.filter(x=>x&&x.status==="Published"&&!x.archived&&/^\d{4}-\d{2}-\d{2}$/.test(x.date||"")):[];
 }catch{return [];}
}
function renderUpcomingEmptyState(root,message){
 root.innerHTML='<div class="upcoming-empty"><span class="upcoming-empty-icon">✦</span><div><strong>Nothing scheduled just yet</strong><p>'+esc(message||"Published school and unit activities will appear here as soon as they are announced.")+'</p></div><span class="upcoming-empty-note">CHECK BACK SOON</span></div>';
}
async function initUpcomingProgrammes(){
 const root=document.getElementById("upcomingProgrammeList");if(!root)return;
 const client=window.oymsSupabase;if(!client){renderUpcomingEmptyState(root,"Shared programme information is temporarily unavailable.");return;}
 try{
  const today=new Date();today.setHours(0,0,0,0);
  const {data:rows,error}=await client.from("events").select("id,title,event_type,event_date,venue,description,status").gte("event_date",today.toISOString().slice(0,10)).order("event_date",{ascending:true}).limit(20);
  if(error)throw error;
  const published=(rows||[]).filter(x=>String(x.status||"").toLowerCase()!=="draft").slice(0,3);
  if(!published.length){renderUpcomingEmptyState(root,"New school and unit programmes will appear here once the Super Administrator publishes them.");return;}
  root.innerHTML=published.map(x=>{const d=new Date(x.event_date+"T00:00:00"),details=[x.event_type,x.venue].filter(Boolean).map(esc).join(" · ");return '<article class="upcoming-programme-card"><time datetime="'+esc(x.event_date)+'"><b>'+d.getDate()+'</b><span>'+d.toLocaleDateString("en-IN",{month:"short",year:"numeric"})+'</span></time><div class="upcoming-programme-copy"><h3>'+esc(x.title||"School Programme")+'</h3><p>'+details+'</p>'+(x.description?'<small>'+esc(x.description)+'</small>':"")+'</div></article>';}).join("");
 }catch(error){console.error("Upcoming programmes could not be rendered.",error);renderUpcomingEmptyState(root,"Published programme information is temporarily unavailable.");}
}
async function initPortalHeaderImage(){
 try{const client=window.oymsSupabase;if(!client)return;const {data,error}=await client.from("homepage_slides").select("image_path,created_at").eq("title","__PORTAL_HEADER__").eq("is_active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();if(error||!data)return;const url=client.storage.from("homepage-slides").getPublicUrl(data.image_path).data.publicUrl;const head=document.querySelector(".school-masthead");if(head&&url){head.classList.add("portal-header-image-mode");head.style.setProperty("--portal-header-image","url("+JSON.stringify(url)+")");}}
 catch(e){console.warn("Custom header unavailable; using default masthead.",e);}
}
async function initHeroSlideshow(){
 const track=document.querySelector(".slide-track"),dotsRoot=document.querySelector(".slide-dots"),hero=track?.closest(".hero-slideshow");
 if(!track||!dotsRoot||!hero)return;
 try{
  const client=window.oymsSupabase;if(!client)throw new Error("Shared slideshow service is unavailable.");
  const now=new Date().toISOString();
  const {data:rows,error}=await client.from("homepage_slides").select("id,title,subtitle,image_path,sort_order,expires_at").eq("is_active",true).neq("title","__PORTAL_HEADER__").or("expires_at.is.null,expires_at.gt."+now).order("sort_order",{ascending:true}).order("created_at",{ascending:true});
  if(error)throw error;
  track.replaceChildren();
  (rows||[]).forEach((item,index)=>{
   const {data}=client.storage.from("homepage-slides").getPublicUrl(item.image_path);if(!data?.publicUrl)return;
   const slide=document.createElement("div");slide.className="hero-slide admin-uploaded-slide";
   const img=document.createElement("img");img.className="slide-image";img.loading=index===0?"eager":"lazy";img.src=data.publicUrl;img.alt=item.title||"PM SHRI KV OF Medak and Bharat Scouts and Guides";
   img.onerror=()=>{slide.remove();if(!track.querySelector(".hero-slide"))hero.hidden=true;};slide.appendChild(img);
   if(item.title||item.subtitle){const caption=document.createElement("div");caption.className="admin-slide-caption";if(item.title){const title=document.createElement("strong");title.textContent=item.title;caption.appendChild(title);}if(item.subtitle){const sub=document.createElement("span");sub.textContent=item.subtitle;caption.appendChild(sub);}slide.appendChild(caption);}
   track.appendChild(slide);
  });
 }catch(error){console.error("Shared homepage slides could not be loaded.",error);}
 const slides=[...track.querySelectorAll(".hero-slide")];if(!slides.length){hero.hidden=true;return;}hero.hidden=false;
 const previous=document.querySelector(".slide-arrow.previous"),next=document.querySelector(".slide-arrow.next"),multiple=slides.length>1;
 if(previous)previous.hidden=!multiple;if(next)next.hidden=!multiple;dotsRoot.hidden=!multiple;dotsRoot.replaceChildren();
 let current=0,timer;
 slides.forEach((slide,i)=>{const dot=document.createElement("button");dot.type="button";dot.setAttribute("aria-label","Show slide "+(i+1));if(i===0)dot.classList.add("active");dotsRoot.appendChild(dot);});
 const dots=[...dotsRoot.querySelectorAll("button")],show=n=>{current=(n+slides.length)%slides.length;slides.forEach((x,i)=>x.classList.toggle("active",i===current));dots.forEach((x,i)=>x.classList.toggle("active",i===current));};
 const restart=()=>{clearInterval(timer);if(multiple)timer=window.setInterval(()=>show(current+1),7000);};
 previous?.addEventListener("click",()=>{show(current-1);restart();});next?.addEventListener("click",()=>{show(current+1);restart();});dots.forEach((dot,i)=>dot.addEventListener("click",()=>{show(i);restart();}));
 show(0);restart();
}
function initActivityCalendar(){
 const daysRoot=document.getElementById("activityCalendarDays"),eventsRoot=document.getElementById("activityCalendarEvents");
 if(!daysRoot||!eventsRoot)return;
 const storeKey="kvs_oyms_demo_events_v1",today=new Date();
 let month=new Date(today.getFullYear(),today.getMonth(),1),selectedDate="";
 const pad=n=>String(n).padStart(2,"0");
 const dateKey=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
 const escHtml=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 const render=()=>{
  const year=month.getFullYear(),m=month.getMonth(),first=new Date(year,m,1),last=new Date(year,m+1,0),events=readPublishedEvents();
  const byDate={};events.forEach(e=>(byDate[e.date]??=[]).push(e));
  document.getElementById("calendarMonthLabel").textContent=month.toLocaleDateString("en-IN",{month:"long",year:"numeric"});
  document.getElementById("calendarEventsHeading").textContent=selectedDate?"Events on "+new Date(year,m,Number(selectedDate.slice(-2))).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"Events this month";
  const offset=first.getDay(),cells=Math.ceil((offset+last.getDate())/7)*7;let markup="";
  for(let i=0;i<cells;i++){
   const day=i-offset+1;
   if(day<1||day>last.getDate()){markup+='<span class="calendar-day empty" aria-hidden="true"></span>';continue;}
   const d=new Date(year,m,day),key=dateKey(d),has=(byDate[key]||[]).length>0,isToday=key===dateKey(today),isSelected=key===selectedDate;
   markup+='<button type="button" class="calendar-day'+(has?' has-event':'')+(isToday?' is-today':'')+(isSelected?' is-selected':'')+'" data-calendar-date="'+key+'" aria-label="'+d.toLocaleDateString("en-IN",{dateStyle:"full"})+(has?', '+byDate[key].length+' published event(s)':'')+'"><span>'+day+'</span>'+(has?'<i class="calendar-event-mark"></i>':"")+'</button>';
  }
  daysRoot.innerHTML=markup;
  daysRoot.querySelectorAll("[data-calendar-date]").forEach(b=>b.addEventListener("click",()=>{selectedDate=selectedDate===b.dataset.calendarDate?"":b.dataset.calendarDate;render();}));
  const inMonth=events.filter(e=>{const d=new Date(e.date+"T00:00:00");return d.getFullYear()===year&&d.getMonth()===m;}).sort((a,b)=>a.date.localeCompare(b.date));
  const shown=selectedDate?inMonth.filter(e=>e.date===selectedDate):inMonth;
  eventsRoot.innerHTML=shown.length?shown.map(e=>{
   const attachment=safeHttpUrl(e.attachmentUrl),registration=safeHttpUrl(e.registrationUrl);
   return '<article class="calendar-event-item"><time datetime="'+escHtml(e.date)+'"><b>'+new Date(e.date+"T00:00:00").getDate()+'</b><span>'+new Date(e.date+"T00:00:00").toLocaleDateString("en-IN",{month:"short"})+'</span></time><div><strong>'+escHtml(e.title)+'</strong><small>'+escHtml(e.section||"All Sections")+(e.time?" · "+escHtml(e.time):"")+(e.venue?" · "+escHtml(e.venue):"")+(e.organiser?" · Organiser: "+escHtml(e.organiser):"")+'</small>'+(e.description?'<p>'+escHtml(e.description)+'</p>':"")+(attachment?'<a class="calendar-detail-link" href="'+attachment+'" target="_blank" rel="noopener noreferrer">Programme attachment ↗</a>':"")+(registration?'<a class="calendar-detail-link" href="'+registration+'" target="_blank" rel="noopener noreferrer">Registration ↗</a>':"")+'</div></article>';
  }).join(""):'<div class="calendar-empty"><span>✦</span><b>'+(selectedDate?"No published event on this date":"No published events this month")+'</b><p>School and unit events approved for publication will appear here.</p></div>';
 };
 document.getElementById("calendarPrev")?.addEventListener("click",()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);selectedDate="";render();});
 document.getElementById("calendarNext")?.addEventListener("click",()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);selectedDate="";render();});
 window.addEventListener("storage",e=>{if(e.key===storeKey){render();initUpcomingProgrammes();}});
 render();
}
function initTemporaryMenuLinks(){
 const link=document.getElementById("scoutGuideWeekTemporaryLink");
 if(!link)return;
 const expiry=new Date(2026,10,30,23,59,59,999);
 if(Date.now()>expiry)link.remove();
}

function initSidebarNavigation(){
 const sidebar=document.getElementById("portalSidebar"),toggle=document.getElementById("menuToggle"),backdrop=document.getElementById("sidebarBackdrop"),close=document.getElementById("sidebarClose");
 if(!sidebar||!toggle||!backdrop)return;
 const setOpen=open=>{
  sidebar.classList.toggle("open",open);
  backdrop.classList.toggle("open",open);
  document.body.classList.toggle("sidebar-open",open);
  toggle.setAttribute("aria-expanded",String(open));
 };
 toggle.addEventListener("click",()=>setOpen(!sidebar.classList.contains("open")));
 close?.addEventListener("click",()=>setOpen(false));
 backdrop.addEventListener("click",()=>setOpen(false));
 sidebar.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>setOpen(false)));
 document.addEventListener("keydown",event=>{if(event.key==="Escape")setOpen(false);});
}


/* KVS-OYMS 2.0 public homepage startup */
document.addEventListener("DOMContentLoaded",()=>{
 initSidebarNavigation();
 initTemporaryMenuLinks();
 initPortalHeaderImage();
 initHeroSlideshow();
 initUpcomingProgrammes();
 renderPublicCirculars();
 initActivityCalendar();
});
