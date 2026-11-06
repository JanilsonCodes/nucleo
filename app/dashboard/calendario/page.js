
"use client";
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';

export default function Calendar(){
 const [events,setEvents]=useState([]),[month,setMonth]=useState(new Date()),[company,setCompany]=useState(''),[selected,setSelected]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);

 useEffect(()=>{
  let alive=true;
  async function load(){
   const cid=localStorage.getItem('nucleo_company')||'';
   setCompany(cid);
   if(!cid){setEvents([]);setLoading(false);return;}
   setLoading(true);
   try{
    const r=await fetch('/api/events?empresa_id='+encodeURIComponent(cid));
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||'Não foi possível carregar o calendário.');
    if(alive)setEvents(d.events||[]);
   }catch(e){
    if(alive)setError(e.message);
   }finally{
    if(alive)setLoading(false);
   }
  }
  load();
  const fn=()=>load();
  window.addEventListener('nucleo-company-change',fn);
  return()=>{alive=false;window.removeEventListener('nucleo-company-change',fn)};
 },[]);

 useEffect(()=>{
  if(!selected)return;
  const fn=e=>{if(e.key==='Escape')setSelected(null)};
  const old=document.body.style.overflow;
  document.body.style.overflow='hidden';
  window.addEventListener('keydown',fn);
  return()=>{
   document.body.style.overflow=old;
   window.removeEventListener('keydown',fn);
  };
 },[selected]);

 const y=month.getFullYear(),m=month.getMonth(),first=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate();
 const dayKey=d=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

 const byDay=useMemo(()=>{
  const map={};
  for(const e of events){
   const key=new Intl.DateTimeFormat('en-CA',{timeZone:'Atlantic/Cape_Verde',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(e.inicio));
   (map[key]??=[]).push(e);
  }
  return map;
 },[events]);

 const openDay=(key,day)=>{
  const list=[...(byDay[key]||[])].sort((a,b)=>new Date(a.inicio)-new Date(b.inicio));
  setSelected({key,day,events:list});
 };

 const formatTime=date=>new Date(date).toLocaleTimeString('pt-PT',{timeZone:'Atlantic/Cape_Verde',hour:'2-digit',minute:'2-digit'});

 const formatDate=day=>new Date(y,m,day).toLocaleDateString('pt-PT',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});

 return <>
  <div className="page-head">
   <div>
    <div className="eyebrow">Planeamento visual</div>
    <h1>Calendário</h1>
    <p>Seleciona um dia para consultar e abrir os eventos.</p>
   </div>
   <div className="actions" style={{display:'flex',alignItems:'center',gap:12}}>
    <button type="button" className="btn secondary" onClick={()=>setMonth(new Date(y,m-1,1))}>‹</button>
    <b>{month.toLocaleDateString('pt-PT',{month:'long',year:'numeric'})}</b>
    <button type="button" className="btn secondary" onClick={()=>setMonth(new Date(y,m+1,1))}>›</button>
   </div>
  </div>

  {error&&<div className="notice">{error}</div>}

  <div className="panel" style={{padding:12}}>
   <div className="calendar-grid">
    {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(x=><b key={x} className="calendar-weekday">{x}</b>)}
    {Array.from({length:first},(_,i)=><div key={'blank'+i}/>)}
    {Array.from({length:days},(_,i)=>{
     const d=i+1,key=dayKey(d),list=byDay[key]||[];
     return <button type="button" key={key} onClick={()=>openDay(key,d)} className="calendar-day">
      <b>{d}</b>
      {list.slice(0,2).map(e=><div key={e.id} title={e.nome_evento} className="calendar-event-preview">{e.nome_evento}</div>)}
      {list.length>2&&<small>+{list.length-2} eventos</small>}
     </button>
    })}
   </div>
   {loading&&<div className="empty">A carregar calendário…</div>}
  </div>

  {/* MODAL DO DIA */}
  {selected&&<div className="calendar-modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}>
   <section className="calendar-modal">
    <div className="calendar-modal-header">
     <div>
      <div className="eyebrow">Planeamento diário</div>
      <h2>{formatDate(selected.day)}</h2>
      <p>{selected.events.length} evento(s) neste dia</p>
     </div>
     <button type="button" className="calendar-modal-close" onClick={()=>setSelected(null)}>×</button>
    </div>

    <div className="calendar-modal-divider"/>

    {selected.events.length>0?
     <div className="calendar-modal-events">
      {selected.events.map((e,i)=><div className="calendar-modal-event" key={e.id}>
       <div className="calendar-event-info">
        <div className="calendar-modal-time">
         <strong>{formatTime(e.inicio)}</strong>
         <small>até {formatTime(e.fim)}</small>
        </div>
        <div className="calendar-event-details">
         <div className="eyebrow">Evento #{i+1}</div>
         <h3>{e.nome_evento}</h3>
         <small>📍 {e.zona||'Local não definido'}</small>
        </div>
       </div>
       <Link className="btn" href={`/dashboard/eventos/${e.id}`}>Abrir / modificar →</Link>
      </div>)}
     </div>
     :
     <div className="calendar-empty-day">
      <div style={{fontSize:38}}>📅</div>
      <h3>Dia livre</h3>
      <p>Não existem eventos registados nesta data.</p>
     </div>
    }

    <div className="calendar-modal-footer">
     <button type="button" className="btn secondary" onClick={()=>setSelected(null)}>Fechar</button>
    </div>
   </section>
  </div>}
 </>;
}
