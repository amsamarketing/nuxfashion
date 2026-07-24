import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useToast } from '../../components/Toast';

const nav=(s:string)=>window.dispatchEvent(new CustomEvent('nav',{detail:s}));
const num=(v:any)=>Number(v||0);
const money=(v:any)=>`SAR ${num(v).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const TYPE_LABEL:Record<string,string>={main:'Main Distribution',branch:'Branch Stockroom',store:'Retail Store',ecommerce:'E-commerce Fulfillment',returns:'Returns Center',transit:'Transit / Staging'};
const TYPE_ICON:Record<string,string>={main:'ti-building-warehouse',branch:'ti-building-store',store:'ti-building-store',ecommerce:'ti-truck-delivery',returns:'ti-package-export',transit:'ti-arrows-transfer-up'};

function Field({label,children}:any){return <label className="wh-field"><span>{label}</span>{children}</label>}

function WarehouseForm({warehouse,close}:any){
  const qc=useQueryClient();const {toast}=useToast();const editing=Boolean(warehouse?.id);
  const [form,setForm]=useState({
    name:warehouse?.name||'',code:warehouse?.code||warehouse?.warehouse_code||'',type:warehouse?.type||'main',
    location:warehouse?.location||'',address:warehouse?.address||'',city:warehouse?.city||'',region:warehouse?.region||'',
    phone:warehouse?.phone||'',manager_name:warehouse?.manager_name||'',capacity:String(warehouse?.capacity||''),
    fulfillment_priority:String(warehouse?.fulfillment_priority||100),is_active:warehouse?.is_active!==false,
    pos_enabled:warehouse?.pos_enabled!==false,ecommerce_enabled:Boolean(warehouse?.ecommerce_enabled),
    returns_enabled:Boolean(warehouse?.returns_enabled),
  });
  const F=(key:string,value:any)=>setForm(x=>({...x,[key]:value}));
  const save=useMutation({
    mutationFn:()=>editing?api.patch(`/inventory/warehouses/${warehouse.id}`,form):api.post('/inventory/warehouses',form),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['warehouses']});toast(editing?'Warehouse updated':'Warehouse created');close()},
    onError:(e:any)=>toast(e?.response?.data?.message||'Could not save warehouse','error'),
  });
  return <div className="branch-modal-shade" onClick={close}><div className="warehouse-modal" onClick={e=>e.stopPropagation()}>
    <header><div><h2>{editing?'Edit Warehouse':'Add Operational Warehouse'}</h2><p>Configure its business role, location and sales channels.</p></div><button onClick={close}><i className="ti ti-x"/></button></header>
    <div className="warehouse-form">
      <section><h3><i className="ti ti-building-warehouse"/> Identity &amp; Role</h3><div className="warehouse-form-grid">
        <Field label="Warehouse Name *"><input value={form.name} onChange={e=>F('name',e.target.value)} placeholder="Riyadh Central Warehouse"/></Field>
        <Field label="Unique Code"><input value={form.code} onChange={e=>F('code',e.target.value.toUpperCase())} placeholder="Auto-generated if empty"/></Field>
        <Field label="Operational Type"><select value={form.type} onChange={e=>F('type',e.target.value)}>{Object.entries(TYPE_LABEL).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></Field>
        <Field label="Capacity (units)"><input type="number" min="0" value={form.capacity} onChange={e=>F('capacity',e.target.value)} placeholder="10000"/></Field>
      </div></section>
      <section><h3><i className="ti ti-map-pin"/> Location &amp; Contact</h3><div className="warehouse-form-grid">
        <Field label="Location Label"><input value={form.location} onChange={e=>F('location',e.target.value)} placeholder="North Riyadh Industrial Area"/></Field>
        <Field label="City"><input value={form.city} onChange={e=>F('city',e.target.value)} placeholder="Riyadh"/></Field>
        <Field label="Region"><select value={form.region} onChange={e=>F('region',e.target.value)}><option value="">Select region</option>{['Riyadh','Makkah','Madinah','Eastern Province','Qassim','Asir','Tabuk','Hail','Northern Borders','Jazan','Najran','Al Bahah','Al Jawf'].map(r=><option key={r}>{r}</option>)}</select></Field>
        <Field label="Full Address"><input value={form.address} onChange={e=>F('address',e.target.value)} placeholder="Street, district, building"/></Field>
        <Field label="Warehouse Manager"><input value={form.manager_name} onChange={e=>F('manager_name',e.target.value)} placeholder="Manager name"/></Field>
        <Field label="Contact Phone"><input value={form.phone} onChange={e=>F('phone',e.target.value)} placeholder="+966 5X XXX XXXX"/></Field>
      </div></section>
      <section><h3><i className="ti ti-adjustments-horizontal"/> Fulfillment Controls</h3><div className="warehouse-switches">
        <label><input type="checkbox" checked={form.is_active} onChange={e=>F('is_active',e.target.checked)}/><span><b>Active warehouse</b><small>Available for inventory transactions</small></span></label>
        <label><input type="checkbox" checked={form.pos_enabled} onChange={e=>F('pos_enabled',e.target.checked)}/><span><b>POS stock source</b><small>Can serve retail counters and branches</small></span></label>
        <label><input type="checkbox" checked={form.ecommerce_enabled} onChange={e=>F('ecommerce_enabled',e.target.checked)}/><span><b>E-commerce fulfillment</b><small>Can dispatch online store orders</small></span></label>
        <label><input type="checkbox" checked={form.returns_enabled} onChange={e=>F('returns_enabled',e.target.checked)}/><span><b>Receive returns</b><small>Approved location for returned stock</small></span></label>
      </div><Field label="E-commerce Priority (lower number ships first)"><input type="number" min="1" value={form.fulfillment_priority} onChange={e=>F('fulfillment_priority',e.target.value)}/></Field></section>
    </div>
    <footer><button className="btn-nx ghost" onClick={close}>Cancel</button><button className="btn-nx primary" disabled={!form.name.trim()||save.isPending} onClick={()=>save.mutate()}>{save.isPending?'Saving...':editing?'Save Changes':'Create Warehouse'}</button></footer>
  </div></div>;
}

export default function Warehouses(){
  const [selected,setSelected]=useState<any>(null);const [showForm,setShowForm]=useState(false);const [edit,setEdit]=useState<any>(null);
  const [tab,setTab]=useState('overview');const [search,setSearch]=useState('');const [type,setType]=useState('all');
  const {data=[],isLoading}=useQuery<any[]>({queryKey:['warehouses'],queryFn:()=>api.get('/inventory/warehouses').then(r=>Array.isArray(r.data)?r.data:[])});
  const {data:stock=[]}=useQuery<any[]>({queryKey:['warehouse-stock',selected?.id],queryFn:()=>api.get(`/inventory/warehouses/${selected.id}/stock`).then(r=>Array.isArray(r.data)?r.data:[]),enabled:Boolean(selected?.id&&tab==='stock')});
  const warehouses:any[]=Array.isArray(data)?data:[];
  const filtered=useMemo(()=>warehouses.filter(w=>(type==='all'||w.type===type)&&(!search||[w.name,w.code,w.city,w.branch_name,w.manager_name].some(v=>String(v||'').toLowerCase().includes(search.toLowerCase())))),[warehouses,type,search]);
  const totals=warehouses.reduce((x,w)=>({units:x.units+num(w.total_units),value:x.value+num(w.stock_value),reserved:x.reserved+num(w.reserved_units)}),{units:0,value:0,reserved:0});
  const open=(w:any,next='overview')=>{setSelected(w);setTab(next)};
  return <div className="warehouse-page">
    <div className="nx-page-head"><div><h1 className="nx-page-title">Warehouse Control Center</h1><p className="nx-page-sub">Manage branch stockrooms, central distribution and e-commerce fulfillment</p></div><div className="warehouse-head-actions"><button className="btn-nx ghost" onClick={()=>nav('ad-inv')}><i className="ti ti-transfer"/> Stock Transfers</button><button className="btn-nx primary" onClick={()=>{setEdit(null);setShowForm(true)}}><i className="ti ti-plus"/> Add Warehouse</button></div></div>
    <div className="warehouse-auto-note"><i className="ti ti-sparkles"/><div><b>Automatic branch warehouse management</b><span>Every new retail branch gets its own linked stockroom automatically. Add a warehouse here only for central stock, e-commerce, returns or transit operations.</span></div><button onClick={()=>nav('ad-branches')}>Manage Branches <i className="ti ti-arrow-right"/></button></div>
    <div className="nx-stats cols-4 warehouse-stats">
      <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-building-warehouse"/></div><div className="nx-stat-body"><div className="nx-stat-val">{warehouses.filter(w=>w.is_active).length}/{warehouses.length}</div><div className="nx-stat-lbl">Active Locations</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-packages"/></div><div className="nx-stat-body"><div className="nx-stat-val">{totals.units.toLocaleString()}</div><div className="nx-stat-lbl">Stock Units</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon teal"><i className="ti ti-cash"/></div><div className="nx-stat-body"><div className="nx-stat-val">{money(totals.value)}</div><div className="nx-stat-lbl">Stock Cost Value</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-lock"/></div><div className="nx-stat-body"><div className="nx-stat-val">{totals.reserved.toLocaleString()}</div><div className="nx-stat-lbl">Reserved Units</div></div></div>
    </div>
    <div className="warehouse-toolbar"><div><i className="ti ti-search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search warehouse, branch, city or manager..."/></div><select value={type} onChange={e=>setType(e.target.value)}><option value="all">All warehouse types</option>{Object.entries(TYPE_LABEL).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><span>{filtered.length} locations</span></div>
    <div className={`warehouse-layout ${selected?'detail-open':''}`}>
      <div className="warehouse-table-wrap"><table className="warehouse-table"><thead><tr><th>Warehouse</th><th>Business Role</th><th>Linked Operation</th><th>Stock</th><th>Capacity</th><th>Channels</th><th>Health</th><th></th></tr></thead><tbody>
        {isLoading?<tr><td colSpan={8} className="warehouse-empty">Loading warehouses…</td></tr>:!filtered.length?<tr><td colSpan={8} className="warehouse-empty">No warehouses match the selected filters.</td></tr>:filtered.map(w=>{
          const utilization=w.capacity?Math.round(num(w.total_units)/num(w.capacity)*100):null;
          return <tr key={w.id} className={selected?.id===w.id?'selected':''} onClick={()=>open(w)}>
            <td><div className="warehouse-identity"><span><i className={`ti ${TYPE_ICON[w.type]||'ti-building-warehouse'}`}/></span><div><b>{w.name}</b><small>{w.code} · {w.city||'City not set'}</small></div></div></td>
            <td><b>{TYPE_LABEL[w.type]||w.type||'Main Warehouse'}</b><small>{w.manager_name||'Manager not assigned'}</small></td>
            <td>{w.branch_id?<><span className="nx-badge blue">Branch</span><small>{w.branch_name}</small></>:<><span className="nx-badge grey">Independent</span><small>Central operation</small></>}</td>
            <td><b>{num(w.total_units).toLocaleString()} units</b><small>{w.sku_count} active SKUs · {money(w.stock_value)}</small></td>
            <td>{utilization===null?<small>Not configured</small>:<><b className={utilization>90?'capacity-danger':''}>{utilization}%</b><div className="warehouse-capacity"><i style={{width:`${Math.min(100,utilization)}%`}}/></div></>}</td>
            <td><div className="warehouse-channels">{w.pos_enabled&&<span><i className="ti ti-device-desktop"/> POS</span>}{w.ecommerce_enabled&&<span><i className="ti ti-world"/> Web</span>}{w.returns_enabled&&<span><i className="ti ti-package-export"/> Returns</span>}</div></td>
            <td><span className={`nx-badge ${w.is_active?'active':'inactive'}`}>{w.is_active?'Active':'Inactive'}</span>{num(w.low_stock_count)>0&&<small className="warehouse-warning">{w.low_stock_count} low stock</small>}</td>
            <td><button className="warehouse-more" onClick={e=>{e.stopPropagation();setEdit(w);setShowForm(true)}}><i className="ti ti-edit"/></button></td>
          </tr>})}
      </tbody></table></div>
      {selected&&<aside className="warehouse-detail"><header><div><span><i className={`ti ${TYPE_ICON[selected.type]||'ti-building-warehouse'}`}/></span><div><h2>{selected.name}</h2><p>{selected.code} · {TYPE_LABEL[selected.type]||selected.type}</p></div></div><button onClick={()=>setSelected(null)}><i className="ti ti-x"/></button></header><nav>{[['overview','Overview'],['stock','Stock']].map(([id,label])=><button className={tab===id?'active':''} key={id} onClick={()=>setTab(id)}>{label}</button>)}</nav>
        {tab==='overview'?<div className="warehouse-detail-body">
          <div className="warehouse-detail-metrics"><span><small>Available</small><b>{num(selected.available_units).toLocaleString()}</b></span><span><small>Reserved</small><b>{num(selected.reserved_units).toLocaleString()}</b></span><span><small>SKUs</small><b>{selected.sku_count}</b></span><span><small>Value</small><b>{money(selected.stock_value)}</b></span></div>
          <section><h3>Operation</h3>{[['Linked Branch',selected.branch_name||'Independent warehouse'],['Manager',selected.manager_name||'Not assigned'],['Phone',selected.phone||'Not set'],['Priority',selected.ecommerce_enabled?`#${selected.fulfillment_priority} for online orders`:'Not used for online orders']].map(([a,b])=><div key={a}><span>{a}</span><b>{b}</b></div>)}</section>
          <section><h3>Location</h3>{[['City / Region',[selected.city,selected.region].filter(Boolean).join(', ')||'Not set'],['Location',selected.location||'Not set'],['Address',selected.address||'Not set'],['Capacity',selected.capacity?`${num(selected.total_units).toLocaleString()} / ${num(selected.capacity).toLocaleString()} units`:'Not configured']].map(([a,b])=><div key={a}><span>{a}</span><b>{b}</b></div>)}</section>
          <button className="btn-nx primary" onClick={()=>{setEdit(selected);setShowForm(true)}}><i className="ti ti-edit"/> Edit Warehouse</button>
        </div>:<div className="warehouse-stock-list">{!stock.length?<div className="warehouse-empty">No stock in this warehouse.</div>:stock.map(s=><div key={s.id}><span><b>{s.product_name}</b><small>{s.sku}{s.size?` · ${s.size}`:''}{s.color?` · ${s.color}`:''}</small></span><em><b>{num(s.available_quantity)}</b><small>available of {num(s.quantity)}</small></em></div>)}</div>}
      </aside>}
    </div>
    {showForm&&<WarehouseForm warehouse={edit} close={()=>{setShowForm(false);setEdit(null)}}/>}
  </div>;
}
