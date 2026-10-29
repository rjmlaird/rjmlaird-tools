/*
 * Waiting-On Tracker: logic for tools.rjmlaird.co.uk/waiting-on-tracker.
 * Ported from the standalone single-file version; behaviour is unchanged. Styles come from the shared brand
 * layer (brand.css) plus this tool's tool.css.
 */
import "@rjmlaird/ui/brand.css";
import "./tool.css";

(() => {
'use strict';

/* =====================================================================
   DATA MODEL  (stored under localStorage key "waitingOnTracker.v1")
   {
     id, title, responsible|null, category, dateRequested|null, expectedBy|null,
     followUpOn|null, priority, status, notes, nudgedAt|null, resolvedAt|null,
     resolutionNote|null, createdAt (ISO datetime), updatedAt (ISO datetime)
   }
   Notes on the model:
   - Dates are plain "YYYY-MM-DD" strings in the user's LOCAL calendar. They are
     never converted through time zones, so "today" can't drift by a day.
   - `resolvedAt` doubles as the "closed on" date for cancelled items too.
   - `isExample: true` is an optional extra flag on the built-in example items.
   ===================================================================== */

const STORAGE_KEY = 'waitingOnTracker.v1';
const SETTINGS_KEY = 'waitingOnTracker.v1.settings';
const CATEGORIES = ['work','personal','finance','health','home','other'];
const CATEGORY_LABELS = {work:'Work',personal:'Personal',finance:'Finance',health:'Health',home:'Home',other:'Other'};
const PRIORITIES = ['low','normal','high'];
const PRIORITY_LABELS = {low:'Low',normal:'Normal',high:'High'};
const STATUSES = ['waiting','nudged','resolved','cancelled'];
const STATUS_LABELS = {waiting:'Waiting',nudged:'Nudged',resolved:'Resolved',cancelled:'Cancelled'};
const RECENT_DAYS = 14;          // resolved/cancelled items stay in "Recently resolved" this long
const DEFAULT_FOLLOW_UP_DAYS = 7;// suggested follow-up gap
const NUDGE_RECHECK_DAYS = 3;    // after "Mark as nudged", look again in this many days
const MAX_ITEMS = 5000;
const MS_DAY = 86400000;

/* =====================================================================
   PURE CORE: dates, transitions, filtering, validation (no DOM access)
   ===================================================================== */
const pad = n => String(n).padStart(2,'0');
const plural = (n,w) => `${n} ${w}${n===1?'':'s'}`;

/** Today's date in the user's local calendar as YYYY-MM-DD. */
function todayISO(now = new Date()){ return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`; }

/** Parse "YYYY-MM-DD" to a UTC-midnight timestamp, or null if missing/invalid (e.g. 2026-02-30). */
function parseISODate(s){
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y,m,d] = s.split('-').map(Number);
  const t = Date.UTC(y,m-1,d), dt = new Date(t);
  if (dt.getUTCFullYear()!==y || dt.getUTCMonth()!==m-1 || dt.getUTCDate()!==d) return null;
  return t;
}
const isValidISODate = s => parseISODate(s) !== null;
function fromTime(t){ const d = new Date(t); return `${String(d.getUTCFullYear()).padStart(4,'0')}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`; }
/** Whole days from a to b (positive when b is later). Null if either date is invalid. */
function daysBetween(a,b){ const ta=parseISODate(a), tb=parseISODate(b); return (ta===null||tb===null)?null:Math.round((tb-ta)/MS_DAY); }
function addDays(s,n){ const t=parseISODate(s); return t===null?null:fromTime(t+n*MS_DAY); }
/** Add calendar months, clamping to month end (31 Jan + 1 month = 28/29 Feb). */
function addMonths(s,n){
  const t=parseISODate(s); if (t===null) return null;
  const d=new Date(t), day=d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()+n);
  const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
  d.setUTCDate(Math.min(day,last));
  return fromTime(d.getTime());
}
/** The later of two ISO dates (ISO strings sort correctly as text). Either may be null. */
function laterOf(a,b){ if(!a) return b||null; if(!b) return a; return a>=b?a:b; }
function localDateOf(iso){ const d=new Date(iso); return isNaN(d)?null:todayISO(d); }

/** Suggested follow-up: 7 days after the date requested (or today if none), but never in the past. */
function suggestFollowUp(dateRequested,today){
  const base = isValidISODate(dateRequested) ? dateRequested : today;
  return laterOf(addDays(base,DEFAULT_FOLLOW_UP_DAYS),today);
}
/** Snooze pushes the follow-up back from the later of (today, current follow-up). */
function snoozeDate(item,option,today){
  const from = laterOf(isValidISODate(item.followUpOn)?item.followUpOn:null,today);
  return {'1d':addDays(from,1),'3d':addDays(from,3),'1w':addDays(from,7),'1m':addMonths(from,1)}[option] || null;
}

const isActive = i => i.status==='waiting' || i.status==='nudged';
const isClosed = i => !isActive(i);
/** Active item whose follow-up date is today or earlier. */
const isDue = (i,today) => isActive(i) && isValidISODate(i.followUpOn) && i.followUpOn<=today;
function followUpInfo(item,today){
  const diff = daysBetween(today,item.followUpOn);
  if (diff===null) return {kind:'none'};
  if (diff===0) return {kind:'today',days:0};
  return diff<0 ? {kind:'overdue',days:-diff} : {kind:'upcoming',days:diff};
}
/** The day an item was resolved/cancelled (falls back to updatedAt for imported data). */
function closedDate(i){ return isValidISODate(i.resolvedAt) ? i.resolvedAt : localDateOf(i.updatedAt); }

/** Keep status-dependent fields consistent after any change. `prev` is the item before the change (or null). */
function reconcileStatus(next,prev,today){
  if (next.status==='nudged' && !next.nudgedAt) next.nudgedAt = today;
  if (isClosed(next)){ if(!next.resolvedAt) next.resolvedAt = today; }
  else if (prev && isClosed(prev)){ next.resolvedAt = null; next.resolutionNote = null; }
  return next;
}
function createItem(f,today,nowISO,id){
  const item = {
    id, title:f.title, responsible:f.responsible||null, category:f.category,
    dateRequested:f.dateRequested||null, expectedBy:f.expectedBy||null,
    followUpOn:f.followUpOn || suggestFollowUp(f.dateRequested,today),
    priority:f.priority, status:f.status, notes:f.notes||'',
    nudgedAt:null, resolvedAt:null, resolutionNote:null, createdAt:nowISO, updatedAt:nowISO
  };
  return reconcileStatus(item,null,today);
}
function applyEdit(item,f,today,nowISO){
  const next = {...item, title:f.title, responsible:f.responsible||null, category:f.category,
    dateRequested:f.dateRequested||null, expectedBy:f.expectedBy||null, priority:f.priority,
    status:f.status, notes:f.notes||'', updatedAt:nowISO};
  next.followUpOn = f.followUpOn || (isActive(next) ? suggestFollowUp(next.dateRequested,today) : item.followUpOn);
  return reconcileStatus(next,item,today);
}
function nudge(item,today,nowISO){
  const next = {...item, status:'nudged', nudgedAt:today, updatedAt:nowISO};
  // Move an already-due follow-up on, so the item leaves "Needs a nudge today" once it has been nudged.
  if (!isValidISODate(item.followUpOn) || item.followUpOn<=today) next.followUpOn = addDays(today,NUDGE_RECHECK_DAYS);
  return next;
}
function resolveItem(item,note,today,nowISO){ return {...item, status:'resolved', resolvedAt:today, resolutionNote:note||null, updatedAt:nowISO}; }
function cancelItem(item,today,nowISO){ return {...item, status:'cancelled', resolvedAt:today, resolutionNote:null, updatedAt:nowISO}; }
function reopenItem(item,nowISO){ return {...item, status:'waiting', resolvedAt:null, resolutionNote:null, updatedAt:nowISO}; }
function snoozeItem(item,option,today,nowISO){ return {...item, followUpOn:snoozeDate(item,option,today), updatedAt:nowISO}; }

const PRIORITY_RANK = {high:0,normal:1,low:2};
function byDueThenPriority(a,b){
  return (a.followUpOn||'9999').localeCompare(b.followUpOn||'9999')
    || PRIORITY_RANK[a.priority]-PRIORITY_RANK[b.priority]
    || a.createdAt.localeCompare(b.createdAt);
}
function byClosedDesc(a,b){ return (closedDate(b)||'').localeCompare(closedDate(a)||''); }

/** Split items into the four dashboard groups. */
function groupItems(items,today){
  const g = {due:[],waiting:[],recent:[],archive:[]};
  for (const i of items){
    if (isActive(i)) (isDue(i,today)?g.due:g.waiting).push(i);
    else {
      const c = closedDate(i), age = c ? daysBetween(c,today) : null;
      (age!==null && age>RECENT_DAYS ? g.archive : g.recent).push(i);
    }
  }
  g.due.sort(byDueThenPriority); g.waiting.sort(byDueThenPriority);
  g.recent.sort(byClosedDesc); g.archive.sort(byClosedDesc);
  return g;
}
/** filters = {query, status, category, priority, dueOnly}; "all" or "" means no restriction. */
function filterItems(items,f,today){
  const words = (f.query||'').toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(i=>{
    if (f.status && f.status!=='all' && i.status!==f.status) return false;
    if (f.category && f.category!=='all' && i.category!==f.category) return false;
    if (f.priority && f.priority!=='all' && i.priority!==f.priority) return false;
    if (f.dueOnly && !isDue(i,today)) return false;
    if (words.length){
      const hay = [i.title,i.responsible,i.notes,i.resolutionNote,i.category,CATEGORY_LABELS[i.category]].filter(Boolean).join(' ').toLowerCase();
      if (!words.every(w=>hay.includes(w))) return false;
    }
    return true;
  });
}

/* ---------- Import / load validation ---------- */
const show = v => { let s; try{s=JSON.stringify(v);}catch{s=String(v);} s=s===undefined?'nothing':s; return s.length>40?s.slice(0,40)+'…':s; };
function pickEnum(raw,key,allowed,def,label,errors){
  const v=raw[key];
  if (v===undefined||v===null||v==='') return def;
  if (typeof v==='string' && allowed.includes(v.trim().toLowerCase())) return v.trim().toLowerCase();
  errors.push(`${label}: “${key}” must be one of ${allowed.join(', ')} (found ${show(v)}).`); return def;
}
function pickDate(raw,key,label,errors){
  const v=raw[key];
  if (v===undefined||v===null||v==='') return null;
  if (typeof v==='string' && isValidISODate(v)) return v;
  errors.push(`${label}: “${key}” must be a real date written YYYY-MM-DD (found ${show(v)}).`); return null;
}
function pickText(raw,key,label,errors,{max,nullable,def}){
  const v=raw[key];
  if (v===undefined||v===null) return nullable?null:def;
  if (typeof v!=='string'){ errors.push(`${label}: “${key}” must be text (found ${show(v)}).`); return nullable?null:def; }
  if (v.length>max){ errors.push(`${label}: “${key}” is too long (${v.length} characters; the limit is ${max}).`); return nullable?null:def; }
  return nullable ? (v.trim()||null) : v;
}
function normaliseItem(raw,idx,errors,nowISO){
  if (!raw || typeof raw!=='object' || Array.isArray(raw)){
    errors.push(`Item ${idx+1} isn’t an item (expected an object, found ${raw===null?'null':Array.isArray(raw)?'a list':typeof raw}).`); return null;
  }
  const t = typeof raw.title==='string' ? raw.title.trim() : '';
  const label = `Item ${idx+1}` + (t ? ` (“${t.length>30?t.slice(0,30)+'…':t}”)` : '');
  const before = errors.length;
  if (!t) errors.push(`${label}: “title” is required and must be some text.`);
  else if (t.length>500) errors.push(`${label}: “title” is too long (${t.length} characters; the limit is 500).`);
  const item = {
    id: (typeof raw.id==='string' && raw.id.trim()) ? raw.id.trim() : genId(),
    title: t,
    responsible: pickText(raw,'responsible',label,errors,{max:200,nullable:true}),
    category: pickEnum(raw,'category',CATEGORIES,'other',label,errors),
    dateRequested: pickDate(raw,'dateRequested',label,errors),
    expectedBy: pickDate(raw,'expectedBy',label,errors),
    followUpOn: pickDate(raw,'followUpOn',label,errors),
    priority: pickEnum(raw,'priority',PRIORITIES,'normal',label,errors),
    status: pickEnum(raw,'status',STATUSES,'waiting',label,errors),
    notes: pickText(raw,'notes',label,errors,{max:5000,nullable:false,def:''}),
    nudgedAt: pickDate(raw,'nudgedAt',label,errors),
    resolvedAt: pickDate(raw,'resolvedAt',label,errors),
    resolutionNote: pickText(raw,'resolutionNote',label,errors,{max:1000,nullable:true})
  };
  for (const k of ['createdAt','updatedAt']){
    const v=raw[k];
    if (v===undefined||v===null||v==='') item[k]=null;
    else if (typeof v==='string' && !isNaN(Date.parse(v))) item[k]=new Date(v).toISOString();
    else { errors.push(`${label}: “${k}” must be a date and time like 2026-10-26T09:30:00Z (found ${show(v)}).`); item[k]=null; }
  }
  item.createdAt = item.createdAt || nowISO;
  item.updatedAt = item.updatedAt || item.createdAt;
  if (raw.isExample===true) item.isExample = true;
  return errors.length>before ? null : item;
}
/**
 * Parse and validate JSON text. Strict mode (imports) rejects the whole file on any problem so nothing is half-imported.
 * Lenient mode (loading saved data) drops bad items and reports how many.
 */
function parseData(text,{lenient=false}={}){
  const fail = msg => ({ok:false,items:[],errors:[msg]});
  if (typeof text!=='string' || !text.trim()) return fail('The file is empty.');
  let data;
  try { data = JSON.parse(text); }
  catch(e){ return fail(`This isn’t valid JSON (${e.message}). Please choose a file exported from this tool.`); }
  let list;
  if (Array.isArray(data)) list = data;
  else if (data && typeof data==='object' && Array.isArray(data.items)){
    if (typeof data.version==='number' && data.version>1) return fail(`This file was made by a newer version of the tool (version ${data.version}), so it can’t be read safely here.`);
    list = data.items;
  } else return fail('Expected a list of items, or an object containing an “items” list. This file has neither.');
  if (list.length>MAX_ITEMS) return fail(`This file has ${list.length} items; the limit is ${MAX_ITEMS}.`);
  const errors=[], out=[], seen=new Map(), nowISO=new Date().toISOString();
  let skipped=0;
  list.forEach((raw,idx)=>{
    const itemErrors=[]; const it=normaliseItem(raw,idx,itemErrors,nowISO);
    if (it && seen.has(it.id)){ itemErrors.push(`Item ${idx+1} has the same id (“${it.id}”) as item ${seen.get(it.id)+1}.`); }
    if (!it || itemErrors.length){ errors.push(...itemErrors); skipped++; return; }
    seen.set(it.id,idx); out.push(it);
  });
  if (lenient) return {ok:true,items:out,skipped,errors};
  return errors.length ? {ok:false,items:[],errors} : {ok:true,items:out,errors:[]};
}
function serialise(items){ return JSON.stringify({app:'waiting-on-tracker',version:1,exportedAt:new Date().toISOString(),items},null,2); }
function genId(){ return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2,10); }

/* =====================================================================
   APP STATE + STORAGE
   ===================================================================== */
const $ = (s,r=document)=>r.querySelector(s);
const state = {
  items:[], filters:{query:'',status:'all',category:'all',priority:'all',dueOnly:false},
  calm:false, archiveOpen:false, lastToday:todayISO()
};

function h(tag,props,...kids){
  const el=document.createElement(tag);
  if (props) for (const [k,v] of Object.entries(props)){
    if (v===false||v==null) continue;
    if (k==='class') el.className=v; else el.setAttribute(k,v===true?'':v);
  }
  const add=k=>{ if(k==null||k===false) return; if(Array.isArray(k)) k.forEach(add); else el.append(k instanceof Node?k:document.createTextNode(String(k))); };
  kids.forEach(add);
  return el;
}

function showBanner(msg){ const b=$('#banner'); b.textContent=msg; b.hidden=!msg; }
function loadItems(){
  let raw=null;
  try { raw=localStorage.getItem(STORAGE_KEY); }
  catch { showBanner('Your browser is blocking local storage, so changes will be lost when you close this page. Use Export JSON to keep a copy.'); return []; }
  if (raw===null) return [];
  const res=parseData(raw,{lenient:true});
  if (!res.ok || res.skipped){
    // Never overwrite data we couldn't fully read: keep a raw backup copy first.
    try { localStorage.setItem(STORAGE_KEY+'.backup-'+Date.now(),raw); } catch {}
    showBanner(res.ok
      ? `${plural(res.skipped,'saved item')} couldn’t be read and ${res.skipped===1?'was':'were'} left out. A backup copy of the original data was kept in this browser.`
      : 'Your saved data couldn’t be read, so you’re starting fresh. A backup copy of the original was kept in this browser.');
  }
  return res.ok ? res.items : [];
}
function persist(){
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,items:state.items})); }
  catch { showBanner('Couldn’t save to this browser (storage may be full or blocked). Use Export JSON to keep a copy of your list.'); }
}
function loadSettings(){ try{ return JSON.parse(localStorage.getItem(SETTINGS_KEY))||{}; }catch{ return {}; } }
function saveSettings(){ try{ localStorage.setItem(SETTINGS_KEY,JSON.stringify({calm:state.calm})); }catch{} }

/* =====================================================================
   FORMATTING
   ===================================================================== */
const dtf  = new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});
const dtfY = new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
function fmtDate(iso,today=todayISO()){
  const t=parseISODate(iso); if (t===null) return '';
  return (iso.slice(0,4)===today.slice(0,4)?dtf:dtfY).format(t);
}
function ageLabel(item,today){
  const start = isValidISODate(item.dateRequested) ? item.dateRequested : localDateOf(item.createdAt);
  const end = isActive(item) ? today : (closedDate(item)||today);
  const d = daysBetween(start,end);
  if (d===null||d<0) return null;
  if (isActive(item)) return d===0 ? 'Waiting since today' : `Waiting ${plural(d,'day')}`;
  return d===0 ? 'Closed the same day' : `Waited ${plural(d,'day')}`;
}
function followUpChip(item,today){
  const info=followUpInfo(item,today);
  switch(info.kind){
    case 'today':   return {text:'Follow-up due today',amber:true};
    case 'overdue': return {text:`Follow-up overdue by ${plural(info.days,'day')} · ${fmtDate(item.followUpOn,today)}`,amber:true};
    case 'upcoming':return {text:`Follow-up due in ${plural(info.days,'day')} · ${fmtDate(item.followUpOn,today)}`,amber:false};
    default:        return {text:'No follow-up date',amber:false};
  }
}

/* =====================================================================
   ANNOUNCEMENTS, TOAST (with undo), DIALOGS
   ===================================================================== */
const live=$('#live');
function announce(msg){ live.textContent=''; setTimeout(()=>{ live.textContent=msg; },60); }

const toast=$('#toast'); let toastTimer=null, undoFn=null;
function hideToast(){ clearTimeout(toastTimer); toast.hidden=true; undoFn=null; }
function startToastTimer(ms){ clearTimeout(toastTimer); toastTimer=setTimeout(hideToast,ms); }
function showToast(msg,undo,ms=8000){
  undoFn=undo;
  toast.replaceChildren(
    h('span',{class:'toast-msg'},msg),
    undo ? h('button',{type:'button',class:'btn','data-toast':'undo'},'Undo') : null,
    h('button',{type:'button',class:'btn','data-toast':'close','aria-label':'Dismiss message'},'×'));
  toast.hidden=false; toast.dataset.ms=ms; startToastTimer(ms);
}
toast.addEventListener('click',e=>{
  const b=e.target.closest('[data-toast]'); if(!b) return;
  const fn=undoFn; hideToast(); if (b.dataset.toast==='undo' && fn) fn();
});
// Pause the countdown while the person is hovering or has keyboard focus inside the message.
toast.addEventListener('mouseenter',()=>clearTimeout(toastTimer));
toast.addEventListener('focusin',()=>clearTimeout(toastTimer));
toast.addEventListener('mouseleave',()=>startToastTimer(4000));
toast.addEventListener('focusout',()=>startToastTimer(4000));
// Ctrl/Cmd+Z undoes the last action while its message is showing.
document.addEventListener('keydown',e=>{
  if (e.key.toLowerCase()==='z' && (e.ctrlKey||e.metaKey) && !e.shiftKey && undoFn && !document.querySelector('dialog[open]') &&
      !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)){
    e.preventDefault(); const fn=undoFn; hideToast(); fn();
  }
});

/** Generic modal: returns {value, text}. value is null if dismissed with Escape. */
function openDialog({title,paragraphs=[],list=[],textLabel=null,buttons}){
  return new Promise(resolve=>{
    const d=$('#dlg');
    const ta = textLabel ? h('textarea',{id:'dlgText',rows:'3',maxlength:'1000',autofocus:true}) : null;
    const form=h('form',{method:'dialog'},
      h('div',{class:'dlg-body'},
        h('h2',{id:'dlgTitle'},title),
        paragraphs.map(p=>h('p',null,p)),
        list.length ? h('ul',{class:'err-list'},list.slice(0,8).map(x=>h('li',null,x))) : null,
        list.length>8 ? h('p',null,`…and ${list.length-8} more.`) : null,
        textLabel ? h('div',{class:'field'},h('label',{for:'dlgText'},textLabel),ta) : null),
      h('div',{class:'dlg-actions'},buttons.map(b=>
        h('button',{type:'submit',value:b.value,class:'btn'+(b.primary?' btn-primary':''),autofocus:(!textLabel&&b.focus)||null},b.label))));
    d.replaceChildren(form); d.setAttribute('aria-labelledby','dlgTitle'); d.returnValue='';
    const done=()=>{ d.removeEventListener('close',done); resolve({value:d.returnValue||null,text:ta?ta.value.trim():''}); };
    d.addEventListener('close',done); d.showModal();
  });
}
const CANCEL = {label:'Cancel',value:'cancel',focus:true};

/* =====================================================================
   FORM FIELDS (shared by the Add form and the Edit dialog)
   ===================================================================== */
function fieldsMarkup(p){
  const cats=CATEGORIES.map(c=>`<option value="${c}"${c==='other'?' selected':''}>${CATEGORY_LABELS[c]}</option>`).join('');
  const stats=STATUSES.map(s=>`<option value="${s}">${STATUS_LABELS[s]}</option>`).join('');
  const prio=PRIORITIES.map(v=>`<label class="seg"><input type="radio" name="priority" value="${v}"${v==='normal'?' checked':''}><span>${PRIORITY_LABELS[v]}</span></label>`).join('');
  return `<fieldset><legend class="sr-only">Details</legend><div class="grid">
    <div class="field"><label for="${p}-responsible">Who or what is responsible</label>
      <input id="${p}-responsible" name="responsible" type="text" maxlength="200" autocomplete="off" placeholder="e.g. HMRC, Sarah, Broadband provider"></div>
    <div class="field"><label for="${p}-category">Category</label><select id="${p}-category" name="category">${cats}</select></div>
    <div class="field"><label for="${p}-requested">Date requested</label><input id="${p}-requested" name="dateRequested" type="date"></div>
    <div class="field"><label for="${p}-expected">Expected by</label><input id="${p}-expected" name="expectedBy" type="date"></div>
    <div class="field"><label for="${p}-followup">Follow-up on</label>
      <input id="${p}-followup" name="followUpOn" type="date" aria-describedby="${p}-fu-hint"><p class="hint" id="${p}-fu-hint"></p></div>
    <div class="field"><label for="${p}-status">Status</label><select id="${p}-status" name="status">${stats}</select></div>
    <div class="field wide"><fieldset><legend>Priority</legend><div class="seg-row">${prio}</div></fieldset></div>
    <div class="field wide"><label for="${p}-notes">Notes</label><textarea id="${p}-notes" name="notes" maxlength="5000"></textarea></div>
  </div></fieldset>`;
}
function readForm(form){
  const fd=new FormData(form), g=k=>String(fd.get(k)??'').trim();
  const date=k=>{ const v=g(k); return isValidISODate(v)?v:null; };
  const pick=(k,list,def)=>list.includes(g(k))?g(k):def;
  return {title:g('title'),responsible:g('responsible')||null,category:pick('category',CATEGORIES,'other'),
    dateRequested:date('dateRequested'),expectedBy:date('expectedBy'),followUpOn:date('followUpOn'),
    priority:pick('priority',PRIORITIES,'normal'),status:pick('status',STATUSES,'waiting'),notes:String(fd.get('notes')??'').trim()};
}
function fillForm(form,item){
  const e=form.elements;
  e.title.value=item.title; e.responsible.value=item.responsible||''; e.category.value=item.category;
  e.dateRequested.value=item.dateRequested||''; e.expectedBy.value=item.expectedBy||''; e.followUpOn.value=item.followUpOn||'';
  e.priority.value=item.priority; e.status.value=item.status; e.notes.value=item.notes||'';
}
/** Keeps the "we'll suggest a follow-up" hint in step with the date fields. */
function bindFollowUpHint(form,p){
  const hint=$(`#${p}-fu-hint`,form);
  const update=()=>{
    const f=readForm(form);
    hint.textContent = f.followUpOn ? '' : `Leave blank and we’ll suggest ${fmtDate(suggestFollowUp(f.dateRequested,todayISO()))}.`;
  };
  form.addEventListener('input',update); form.addEventListener('change',update); form.addEventListener('reset',()=>setTimeout(update)); update();
}
function setFieldError(input,errEl,on){ errEl.hidden=!on; input.setAttribute('aria-invalid',on?'true':'false'); }

/* =====================================================================
   COMMITTING CHANGES (single place that saves, renders, announces, offers undo)
   ===================================================================== */
function commit(newItems,{message,focus=null,fallback=null,ms=8000,undo=true,noFocus=false}){
  const before=state.items;
  state.items=newItems; persist(); render(); announce(message);
  showToast(message, undo ? ()=>{ state.items=before; persist(); render(); announce('Change undone.'); focusCard(focus,null); } : null, ms);
  if (!noFocus) focusCard(focus,fallback);
}
function focusCard(id,fallbackId){
  const find=x=>x && $(`[data-id="${CSS.escape(x)}"] .item-title`,$('#results'));
  const el=find(id)||find(fallbackId);
  if (el) el.focus(); else $('#results').focus();
}

/* =====================================================================
   RENDERING
   ===================================================================== */
const results=$('#results');

function render(){
  const has=state.items.length>0;
  $('#emptyState').hidden=has; $('#filters').hidden=!has; results.hidden=!has;
  if (has) renderResults(); else results.replaceChildren();
}
function filtersActive(){ const f=state.filters; return !!(f.query.trim()||f.status!=='all'||f.category!=='all'||f.priority!=='all'||f.dueOnly); }

function renderResults(){
  const today=todayISO(); state.lastToday=today;
  const filtered=filterItems(state.items,state.filters,today);
  const g=groupItems(filtered,today);
  $('#fClear').hidden=!filtersActive();
  const nodes=[];

  if (state.items.some(i=>i.isExample)){
    nodes.push(h('p',{class:'note-banner'},'Some items here are examples.',
      h('button',{type:'button',class:'btn btn-quiet','data-act':'remove-examples'},'Remove examples')));
  }
  if (!filtered.length){
    nodes.push(h('p',{class:'quiet'},'No items match these filters.'));
    results.replaceChildren(...nodes); return;
  }
  const noFilter=!filtersActive();
  nodes.push(groupSection('due','Needs a nudge today',null,g.due,today,noFilter?'Nothing needs a nudge today. Nice and quiet.':null));
  if (!state.filters.dueOnly){
    if (g.waiting.length) nodes.push(groupSection('waiting','Waiting',null,g.waiting,today));
    if (g.recent.length) nodes.push(groupSection('recent','Recently resolved',`Resolved or cancelled in the last ${RECENT_DAYS} days.`,g.recent,today));
    if (g.archive.length){
      const det=h('details',{class:'group'},
        h('summary',null,`Archive (${g.archive.length})`),
        h('p',{class:'sub'},`Resolved or cancelled more than ${RECENT_DAYS} days ago.`),
        h('ul',{class:'cards',role:'list'},g.archive.map(i=>renderCard(i,today))));
      det.open=state.archiveOpen;
      det.addEventListener('toggle',()=>{ state.archiveOpen=det.open; });
      nodes.push(det);
    }
  }
  results.replaceChildren(...nodes);
}
function groupSection(key,title,sub,items,today,emptyMsg){
  const id='h-'+key;
  const sec=h('section',{class:'group','aria-labelledby':id},
    h('h2',{id},title,' ',h('span',{class:'count'},`(${items.length})`)),
    sub?h('p',{class:'sub'},sub):null);
  if (items.length) sec.append(h('ul',{class:'cards',role:'list'},items.map(i=>renderCard(i,today))));
  else if (emptyMsg) sec.append(h('p',{class:'quiet'},emptyMsg));
  return sec;
}

function renderCard(item,today){
  const active=isActive(item), due=isDue(item,today);
  const li=h('li',{class:'card'+(due?' is-due':'')+(item.status==='resolved'?' is-resolved':''),'data-id':item.id});
  li.append(h('div',{class:'card-head'},
    h('h3',{class:'item-title',tabindex:'-1'},item.title),
    h('div',{class:'badges'},
      item.isExample?h('span',{class:'wo-badge wo-badge-example'},'Example'):null,
      h('span',{class:`wo-badge wo-badge-${item.status}`},STATUS_LABELS[item.status]))));

  // Secondary metadata (hidden in Calm mode)
  const metaBits=[];
  if (item.responsible) metaBits.push(h('span',null,`Waiting on ${item.responsible}`));
  metaBits.push(h('span',null,CATEGORY_LABELS[item.category]));
  const dots={low:'●○○',normal:'●●○',high:'●●●'}[item.priority];
  metaBits.push(h('span',null,h('span',{class:'dots','aria-hidden':'true'},dots+' '),`${PRIORITY_LABELS[item.priority]} priority`));
  li.append(h('p',{class:'meta secondary'},metaBits.flatMap((b,i)=>i?[' · ',b]:[b])));

  const chips=[];
  const age=ageLabel(item,today); if (age) chips.push(h('span',{class:'wo-chip'},age));
  if (isValidISODate(item.expectedBy)) chips.push(h('span',{class:'wo-chip'},`Expected by ${fmtDate(item.expectedBy,today)}`));
  if (active){
    const fu=followUpChip(item,today);
    chips.push(h('span',{class:'wo-chip'+(fu.amber?' wo-chip-amber':'')},fu.amber?h('span',{'aria-hidden':'true'},'●'):null,fu.text));
    if (item.status==='nudged' && isValidISODate(item.nudgedAt)){
      const d=daysBetween(item.nudgedAt,today);
      chips.push(h('span',{class:'wo-chip'},d===0?'Nudged today':`Nudged ${plural(d,'day')} ago`));
    }
  } else if (isValidISODate(item.resolvedAt)){
    chips.push(h('span',{class:'wo-chip'},`${STATUS_LABELS[item.status]} ${fmtDate(item.resolvedAt,today)}`));
  }
  li.append(h('div',{class:'wo-chips secondary'},chips));

  if (item.notes) li.append(h('details',{class:'notes secondary'},h('summary',null,'Notes'),h('p',{class:'notes-text'},item.notes)));
  if (item.resolutionNote) li.append(h('p',{class:'resolution secondary'},h('strong',null,'What happened: '),item.resolutionNote));

  // Actions. The button marked "next" is the only one shown in Calm mode.
  const btn=(label,act,cls='',extra={})=>h('button',{type:'button',class:'btn '+cls,'data-act':act,'aria-label':`${label}: ${item.title}`,...extra},label);
  const actions=h('div',{class:'actions'});
  if (active){
    actions.append(
      btn('Mark as nudged','nudge',due?'btn-primary next':''),
      btn('Resolve','resolve',due?'':'btn-primary next'));
    const snoozes=[['1d','+1 day'],['3d','+3 days'],['1w','+1 week'],['1m','+1 month']];
    actions.append(h('details',{class:'more'},h('summary',null,'More actions'),
      h('div',{class:'more-body'},
        h('div',{class:'btn-row'},btn('Edit','edit'),btn('Cancel','cancel'),btn('Delete','delete')),
        h('p',{class:'label'},'Snooze follow-up'),
        h('div',{class:'btn-row',role:'group','aria-label':'Snooze follow-up'},
          snoozes.map(([k,l])=>h('button',{type:'button',class:'btn','data-act':'snooze','data-snooze':k,'aria-label':`Snooze follow-up ${l.replace('+','')}: ${item.title}`},l))))));
  } else {
    actions.append(btn('Reopen','reopen','btn-primary next'));
    actions.append(h('details',{class:'more'},h('summary',null,'More actions'),
      h('div',{class:'more-body'},h('div',{class:'btn-row'},btn('Edit','edit'),btn('Delete','delete')))));
  }
  li.append(actions);
  return li;
}

/* =====================================================================
   EVENT HANDLERS
   ===================================================================== */
// ---- Add form
const addForm=$('#addForm'), addTitle=$('#add-title'), addErr=$('#add-title-error'), addDetails=$('#addDetails');
$('#addFields').innerHTML=fieldsMarkup('add');
bindFollowUpHint(addForm,'add');
addTitle.addEventListener('input',()=>setFieldError(addTitle,addErr,false));
let submitting=false;
addForm.addEventListener('submit',e=>{
  e.preventDefault();
  if (submitting) return;                       // guards against double-clicks / key repeat
  const f=readForm(addForm);
  if (!f.title){ setFieldError(addTitle,addErr,true); addTitle.focus(); return; }
  submitting=true; setTimeout(()=>{ submitting=false; },400);
  const today=todayISO(), item=createItem(f,today,new Date().toISOString(),genId());
  addForm.reset(); addDetails.open=false; setFieldError(addTitle,addErr,false);
  commit([item,...state.items],{
    message: isActive(item) ? `Item added. Follow-up set for ${fmtDate(item.followUpOn,today)}.` : 'Item added.',
    noFocus:true});
  addTitle.focus();                              // ready for the next one
});

// ---- Examples
function exampleItems(){
  const t=todayISO(), now=new Date().toISOString();
  const mk=(o)=>({id:genId(),responsible:null,category:'other',dateRequested:null,expectedBy:null,followUpOn:null,priority:'normal',status:'waiting',
    notes:'',nudgedAt:null,resolvedAt:null,resolutionNote:null,createdAt:now,updatedAt:now,isExample:true,...o});
  return [
    mk({title:'Reply to my proposal',responsible:'Sarah (client)',category:'work',dateRequested:addDays(t,-6),expectedBy:addDays(t,-1),followUpOn:t,priority:'high',notes:'Sent the revised quote on a Monday. A short, friendly nudge is fine.'}),
    mk({title:'Parcel delivery',responsible:'Courier',category:'home',dateRequested:addDays(t,-2),expectedBy:addDays(t,3),followUpOn:addDays(t,3)}),
    mk({title:'Job application response',responsible:'Acme Ltd',category:'work',dateRequested:addDays(t,-9),followUpOn:addDays(t,2),status:'nudged',nudgedAt:addDays(t,-3),priority:'low'})
  ];
}
$('#loadExamples').addEventListener('click',()=>{
  commit(exampleItems(),{message:'Examples loaded. They’re labelled “Example” and you can remove them any time.',noFocus:true});
  $('#results').focus();
});

// ---- Card actions (event delegation)
results.addEventListener('click',async e=>{
  const b=e.target.closest('button[data-act]'); if(!b) return;
  const act=b.dataset.act;
  if (act==='remove-examples'){
    commit(state.items.filter(i=>!i.isExample),{message:'Examples removed.',noFocus:true}); $('#results').focus(); return;
  }
  const li=b.closest('li[data-id]'); if(!li) return;
  const id=li.dataset.id, item=state.items.find(i=>i.id===id); if(!item) return;
  const today=todayISO(), now=new Date().toISOString();
  const nb=(li.nextElementSibling||li.previousElementSibling)?.dataset.id||null;
  const swap=next=>state.items.map(i=>i.id===id?next:i);

  switch(act){
    case 'nudge':{
      const n=nudge(item,today,now);
      commit(swap(n),{message:`Marked as nudged.${n.followUpOn!==item.followUpOn?` Next follow-up ${fmtDate(n.followUpOn,today)}.`:''}`,focus:id,fallback:nb}); break;
    }
    case 'snooze':{
      const n=snoozeItem(item,b.dataset.snooze,today,now);
      commit(swap(n),{message:`Follow-up snoozed to ${fmtDate(n.followUpOn,today)}.`,focus:id,fallback:nb}); break;
    }
    case 'resolve':{
      const r=await openDialog({title:'Resolve this item',paragraphs:[`“${item.title}”`],textLabel:'What happened? (optional)',
        buttons:[{label:'Cancel',value:'cancel'},{label:'Resolve',value:'ok',primary:true}]});
      if (r.value!=='ok') { focusCard(id,nb); return; }
      commit(swap(resolveItem(item,r.text,today,now)),{message:'Item resolved. It’s now under Recently resolved.',focus:id,fallback:nb}); break;
    }
    case 'cancel':
      commit(swap(cancelItem(item,today,now)),{message:'Item cancelled. It’s now under Recently resolved.',focus:id,fallback:nb}); break;
    case 'reopen':
      commit(swap(reopenItem(item,now)),{message:'Item reopened.',focus:id,fallback:nb}); break;
    case 'edit': openEdit(item); break;
    case 'delete':{
      const r=await openDialog({title:'Delete this item?',paragraphs:[`“${item.title}” will be removed from your list. You’ll be able to undo this for a few seconds.`],
        buttons:[CANCEL,{label:'Delete',value:'ok',primary:true}]});
      if (r.value!=='ok') { focusCard(id,nb); return; }
      commit(state.items.filter(i=>i.id!==id),{message:'Item deleted.',fallback:nb,ms:12000}); break;
    }
  }
});

// ---- Edit dialog
function openEdit(item){
  const d=$('#editDlg');
  d.innerHTML=`<form id="editForm" novalidate><div class="dlg-body"><h2 id="editTitle">Edit item</h2>
    <div class="field"><label for="edit-title">What I’m waiting for</label>
      <input id="edit-title" name="title" type="text" required maxlength="200" autocomplete="off" aria-describedby="edit-title-error">
      <p id="edit-title-error" class="field-error" hidden>Add a few words about what you’re waiting for.</p></div>
    ${fieldsMarkup('edit')}</div>
    <div class="dlg-actions"><button type="button" class="btn" id="editCancel">Cancel</button><button type="submit" class="btn btn-primary">Save changes</button></div></form>`;
  const form=$('#editForm',d), title=$('#edit-title',d), err=$('#edit-title-error',d);
  fillForm(form,item); bindFollowUpHint(form,'edit');
  title.addEventListener('input',()=>setFieldError(title,err,false));
  $('#editCancel',d).addEventListener('click',()=>d.close());
  form.addEventListener('submit',ev=>{
    ev.preventDefault();
    const f=readForm(form);
    if (!f.title){ setFieldError(title,err,true); title.focus(); return; }
    d.close();
    const next=applyEdit(item,f,todayISO(),new Date().toISOString());
    commit(state.items.map(i=>i.id===item.id?next:i),{message:'Item updated.',focus:item.id});
  });
  d.showModal();
}

// ---- Filters
const fSearch=$('#fSearch'), fStatus=$('#fStatus'), fCategory=$('#fCategory'), fPriority=$('#fPriority'), fDue=$('#fDue');
CATEGORIES.forEach(c=>fCategory.append(h('option',{value:c},CATEGORY_LABELS[c])));
function readFilters(){
  state.filters={query:fSearch.value,status:fStatus.value,category:fCategory.value,priority:fPriority.value,dueOnly:fDue.checked};
  if (state.items.length) renderResults();
}
[fSearch,fStatus,fCategory,fPriority,fDue].forEach(el=>el.addEventListener('input',readFilters));
$('#fClear').addEventListener('click',()=>{
  fSearch.value=''; fStatus.value=fCategory.value=fPriority.value='all'; fDue.checked=false; readFilters(); announce('Filters cleared.'); fSearch.focus();
});

// ---- Calm mode
function applyCalm(on,{announceIt=false}={}){
  state.calm=on; document.documentElement.classList.toggle('calm',on); $('#calmToggle').checked=on; saveSettings();
  if (announceIt) announce(on?'Calm mode on. Showing titles, status and the next action only.':'Calm mode off.');
}
$('#calmToggle').addEventListener('change',e=>applyCalm(e.target.checked,{announceIt:true}));

// ---- Export / import / clear
$('#exportBtn').addEventListener('click',()=>{
  const blob=new Blob([serialise(state.items)],{type:'application/json'});
  const a=h('a',{href:URL.createObjectURL(blob),download:`waiting-on-tracker-${todayISO()}.json`});
  document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  announce(`Exported ${plural(state.items.length,'item')}.`);
});
$('#importBtn').addEventListener('click',()=>$('#importFile').click());
$('#importFile').addEventListener('change',async ev=>{
  const input=ev.target, file=input.files[0]; input.value=''; if(!file) return;
  const ok=[{label:'OK',value:'ok',primary:true,focus:true}];
  if (file.size>5*1024*1024){ await openDialog({title:'That file is too big',paragraphs:['Files over 5 MB can’t be imported. Nothing was changed.'],buttons:ok}); return; }
  let text; try { text=await file.text(); } catch { await openDialog({title:'Couldn’t read that file',paragraphs:['Your browser wouldn’t open it. Nothing was changed.'],buttons:ok}); return; }
  const res=parseData(text);
  if (!res.ok){ await openDialog({title:'We couldn’t import that file',paragraphs:['Nothing was changed. Here’s what needs fixing:'],list:res.errors,buttons:ok}); return; }
  const n=res.items.length;
  if (!n){ await openDialog({title:'Nothing to import',paragraphs:['That file is valid but contains no items.'],buttons:ok}); return; }
  const r=await openDialog({title:`Import ${plural(n,'item')}?`,
    paragraphs:['Add them to your current list, or replace your list with them? Items that share an id with one you already have will be updated.'],
    buttons:[CANCEL,{label:'Add to my list',value:'merge'},{label:'Replace my list',value:'replace',primary:true}]});
  if (r.value==='replace') commit(res.items,{message:`Imported ${plural(n,'item')}. Your list was replaced.`,noFocus:true});
  else if (r.value==='merge'){
    const ids=new Set(res.items.map(i=>i.id)), kept=state.items.filter(i=>!ids.has(i.id));
    commit([...res.items,...kept],{message:`Imported ${plural(n,'item')} into your list.`,noFocus:true});
  }
});
$('#clearBtn').addEventListener('click',async()=>{
  const r=await openDialog({title:'Clear all data?',
    paragraphs:['This permanently deletes every item stored in this browser. It cannot be undone.','Tip: use Export JSON first if you might want them back.'],
    buttons:[CANCEL,{label:'Clear all data',value:'ok',primary:true}]});
  if (r.value!=='ok') return;
  commit([],{message:'All data cleared.',undo:false,noFocus:true}); addTitle.focus();
});

// ---- Keep the page truthful: roll over at midnight, sync other tabs
function refreshIfNewDay(){ if (todayISO()!==state.lastToday && state.items.length) renderResults(); }
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) refreshIfNewDay(); });
setInterval(refreshIfNewDay,60000);
window.addEventListener('storage',e=>{ if(e.key===STORAGE_KEY){ state.items=loadItems(); render(); } });

/* =====================================================================
   START
   ===================================================================== */
applyCalm(!!loadSettings().calm);
state.items=loadItems();
render();

// Handy for tests/future features (reminders, calendar export): window.WaitingOn.core
window.WaitingOn={core:{todayISO,parseISODate,daysBetween,addDays,addMonths,suggestFollowUp,snoozeDate,groupItems,filterItems,parseData,nudge,resolveItem,createItem}};
if (location.hash==='#selftest'){
  const a=console.assert, c=window.WaitingOn.core;
  a(c.addMonths('2026-01-31',1)==='2026-02-28','month clamp');
  a(c.parseISODate('2026-02-30')===null,'invalid date rejected');
  a(c.daysBetween('2026-10-26','2026-11-02')===7,'days between');
  a(c.suggestFollowUp('2026-01-01','2026-10-26')==='2026-10-26','suggestion never in the past');
  a(c.suggestFollowUp(null,'2026-10-26')==='2026-11-02','default +7 days');
  a(c.parseData('{').ok===false && c.parseData('[{"title":""}]').ok===false,'import validation');
  console.log('Waiting-On Tracker self-test finished.');
}
})();
