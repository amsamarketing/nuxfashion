import { api } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
export default function Loyalty(){
  const [tab,setTab]=useState('members');
  const {data}=useQuery({queryKey:['loyalty'],queryFn:async()=>{const r=await api.get('/customers?limit=100'); return r.data;}});
  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Loyalty & Promos</h1><p className="nx-page-sub">Points, tiers, and promotional campaigns</p></div>
      <button className="btn-nx primary"><i className="ti ti-plus"/> New Campaign</button>
    </div>
    <div className="nx-stats cols-4">
      <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-star"/></div><div className="nx-stat-body"><div className="nx-stat-val">{data?.total_members||0}</div><div className="nx-stat-lbl">Members</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-coin"/></div><div className="nx-stat-body"><div className="nx-stat-val">{(data?.total_points||0).toLocaleString()}</div><div className="nx-stat-lbl">Points Issued</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-gift"/></div><div className="nx-stat-body"><div className="nx-stat-val">{(data?.points_redeemed||0).toLocaleString()}</div><div className="nx-stat-lbl">Points Redeemed</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon blue"><i className="ti ti-speakerphone"/></div><div className="nx-stat-body"><div className="nx-stat-val">{data?.active_campaigns||0}</div><div className="nx-stat-lbl">Active Campaigns</div></div></div>
    </div>
    <div className="nx-tabs">{['members','campaigns','tiers','redemptions'].map(t=><button key={t} className={`nx-tab${tab===t?' on':''}`} onClick={()=>setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}</div>
    <div className="nx-card" style={{textAlign:'center',padding:'48px 0',color:'var(--muted)'}}>
      <i className="ti ti-star" style={{fontSize:40,opacity:.3,display:'block',marginBottom:12}}/>
      <p style={{fontWeight:600}}>{tab.charAt(0).toUpperCase()+tab.slice(1)} coming soon</p>
    </div>
  </div>);
}