import { api } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export default function Products() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [status, setStatus] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const r = await api.get('/catalog/products?limit=200');
      return r.data;
    }
  });

  const raw: any[] = data?.products || data?.data || [];
  const categories = ['all', ...Array.from(new Set(raw.map((p: any) => p.category_name).filter(Boolean))) as string[]];
  const items = raw
    .filter((p: any) => cat === 'all' || p.category_name === cat)
    .filter((p: any) => status === 'all' || p.status === status)
    .filter((p: any) => !q || (p.name||'').toLowerCase().includes(q.toLowerCase()) || (p.sku||'').toLowerCase().includes(q.toLowerCase()));

  const fmt = (n: number) => 'SAR ' + parseFloat(n+'').toFixed(2);
  const margin = (sell: number, cost: number) => sell > 0 ? Math.round(((sell-cost)/sell)*100)+'%' : '—';

  return (
    <div>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Products</h1>
          <p className="nx-page-sub">{raw.length} products &middot; {categories.length-1} categories &middot; {[...new Set(raw.map((p:any)=>p.brand_name).filter(Boolean))].length} brands</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn-nx ghost"><i className="ti ti-download"/> Export</button>
          <button className="btn-nx ghost"><i className="ti ti-upload"/> Import</button>
          <button className="btn-nx primary"><i className="ti ti-plus"/> Add Product</button>
        </div>
      </div>

      <div className="nx-stats cols-4">
        <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-tag"/></div><div className="nx-stat-body"><div className="nx-stat-val">{raw.length}</div><div className="nx-stat-lbl">Total Products</div></div></div>
        <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-check"/></div><div className="nx-stat-body"><div className="nx-stat-val">{raw.filter((p:any)=>p.status==='active').length}</div><div className="nx-stat-lbl">Active</div></div></div>
        <div className="nx-stat"><div className="nx-stat-icon red"><i className="ti ti-alert-triangle"/></div><div className="nx-stat-body"><div className="nx-stat-val">{raw.filter((p:any)=>(p.stock_quantity||0)===0).length}</div><div className="nx-stat-lbl">Out of Stock</div></div></div>
        <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-category"/></div><div className="nx-stat-body"><div className="nx-stat-val">{categories.length-1}</div><div className="nx-stat-lbl">Categories</div></div></div>
      </div>

      <div className="nx-toolbar">
        <div className="nx-search"><i className="ti ti-search"/><input className="nx-input" placeholder="Search name, SKU..." value={q} onChange={e=>setQ(e.target.value)}/></div>
        <select className="nx-select" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="nx-tabs">
        {categories.map(c => {
          const count = c==='all' ? raw.length : raw.filter((p:any)=>p.category_name===c).length;
          return <button key={c} className={`nx-tab${cat===c?' on':''}`} onClick={()=>setCat(c)}>{c==='all'?'All':c} ({count})</button>;
        })}
      </div>

      <div className="nx-table-wrap">
        <table className="nx-table">
          <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Sell Price</th><th>Cost</th><th>Margin</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={9} style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>Loading...</td></tr>
            : items.length===0 ? <tr><td colSpan={9} style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>No products found</td></tr>
            : items.map((p:any) => {
              const qty = p.stock_quantity ?? 0;
              const sell = parseFloat(p.price||p.sell_price||0);
              const cost = parseFloat(p.cost||0);
              return (
                <tr key={p.id}>
                  <td><div style={{fontWeight:600}}>{p.name}</div>{p.description&&<div style={{fontSize:11.5,color:'var(--muted)'}}>{p.description}</div>}</td>
                  <td style={{fontFamily:'monospace',fontSize:12,color:'var(--muted)'}}>{p.sku||'—'}</td>
                  <td style={{color:'var(--muted)'}}>{p.category_name||'—'}</td>
                  <td style={{fontWeight:700}}>{fmt(sell)}</td>
                  <td style={{color:'var(--muted)'}}>{cost?fmt(cost):'—'}</td>
                  <td style={{fontWeight:600,color:'var(--accent)'}}>{cost?margin(sell,cost):'—'}</td>
                  <td>{qty===0?<span className="nx-badge danger">Out</span>:qty<5?<span className="nx-badge pending">{qty} pcs</span>:<span style={{fontWeight:600}}>{qty} pcs</span>}</td>
                  <td><span className={`nx-badge ${p.status==='active'?'active':'inactive'}`}>{p.status||'active'}</span></td>
                  <td><div className="actions">
                    <button className="btn-nx ghost sm"><i className="ti ti-edit"/></button>
                    <button className="btn-nx ghost sm"><i className="ti ti-eye-off"/></button>
                    <button className="btn-nx danger sm"><i className="ti ti-trash"/></button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
