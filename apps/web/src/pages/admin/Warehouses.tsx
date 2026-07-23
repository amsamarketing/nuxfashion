import { api } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';
export default function Warehouses(){
  const {data,isLoading}=useQuery({queryKey:['warehouses'],queryFn:async()=>{const r=await api.get('/inventory/warehouses'); return r.data;}});
  const items:any[]=data?.warehouses||data?.data||[];
  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Warehouses</h1><p className="nx-page-sub">{items.length} locations configured</p></div>
      <button className="btn-nx primary"><i className="ti ti-plus"/> Add Warehouse</button>
    </div>
    <div className="nx-stats cols-3">
      <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-building-warehouse"/></div><div className="nx-stat-body"><div className="nx-stat-val">{items.length}</div><div className="nx-stat-lbl">Total Warehouses</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-check"/></div><div className="nx-stat-body"><div className="nx-stat-val">{items.filter((w:any)=>w.status==='active').length}</div><div className="nx-stat-lbl">Active</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon blue"><i className="ti ti-map-pin"/></div><div className="nx-stat-body"><div className="nx-stat-val">{[...new Set(items.map((w:any)=>w.city))].filter(Boolean).length||items.length}</div><div className="nx-stat-lbl">Cities</div></div></div>
    </div>
    <div className="nx-table-wrap"><table className="nx-table">
      <thead><tr><th>Name</th><th>Location</th><th>Manager</th><th>SKUs</th><th>Status</th></tr></thead>
      <tbody>{isLoading?<tr><td colSpan={5} style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>Loading...</td></tr>:items.length===0?<tr><td colSpan={5} style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>No warehouses found</td></tr>:items.map((w:any)=>(
        <tr key={w.id}><td style={{fontWeight:600}}>{w.name}</td><td style={{color:'var(--muted)'}}>{w.city||w.address||'—'}</td><td style={{color:'var(--muted)'}}>{w.manager_name||'—'}</td><td style={{color:'var(--muted)'}}>{w.sku_count||'—'}</td><td><span className={`nx-badge ${w.status==='active'?'active':'inactive'}`}>{w.status||'active'}</span></td></tr>
      ))}</tbody>
    </table></div>
  </div>);
}