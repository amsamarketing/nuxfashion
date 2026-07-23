import { useState } from 'react';

const nav = (s: string) => window.dispatchEvent(new CustomEvent('nav', { detail: s }));

const CHANNELS = [
  { id:'website',   name:'Own Website',     icon:'ti-world',          color:'indigo', status:'live',       orders:124, revenue:48200 },
  { id:'instagram', name:'Instagram Shop',  icon:'ti-brand-instagram', color:'rose',   status:'live',       orders:89,  revenue:32100 },
  { id:'tiktok',    name:'TikTok Shop',     icon:'ti-brand-tiktok',   color:'blue',   status:'live',       orders:67,  revenue:21800 },
  { id:'snapchat',  name:'Snapchat',        icon:'ti-brand-snapchat', color:'amber',  status:'live',       orders:34,  revenue:12400 },
  { id:'noon',      name:'Noon.com',        icon:'ti-building-store', color:'amber',  status:'connected',  orders:56,  revenue:19300 },
  { id:'salla',     name:'Salla Store',     icon:'ti-shopping-bag',   color:'teal',   status:'live',       orders:98,  revenue:37600 },
  { id:'zid',       name:'Zid Store',       icon:'ti-storefront',     color:'purple', status:'connected',  orders:43,  revenue:15200 },
  { id:'whatsapp',  name:'WhatsApp Catalog',icon:'ti-brand-whatsapp', color:'green',  status:'connected',  orders:28,  revenue:9800 },
];

const fmt = (n: number) => 'SAR ' + n.toLocaleString('en-SA');

type Tab = 'overview'|'orders'|'listings'|'channels'|'promotions'|'carts'|'analytics';

export default function Ecommerce() {
  const [tab, setTab] = useState<Tab>('overview');

  const totalOrders  = CHANNELS.reduce((a, c) => a + c.orders, 0);
  const totalRevenue = CHANNELS.reduce((a, c) => a + c.revenue, 0);
  const liveChannels = CHANNELS.filter(c => c.status === 'live').length;

  return (
    <div>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">E-commerce & Omnichannel</h1>
          <p className="nx-page-sub">Manage all your sales channels from one place</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-nx ghost"><i className="ti ti-refresh"/> Sync All</button>
          <button className="btn-nx primary"><i className="ti ti-plus"/> Add Channel</button>
        </div>
      </div>

      {/* Stats */}
      <div className="nx-stats cols-4">
        <div className="nx-stat">
          <div className="nx-stat-icon teal"><i className="ti ti-world"/></div>
          <div className="nx-stat-body"><div className="nx-stat-val">{liveChannels}</div><div className="nx-stat-lbl">Live Channels</div></div>
        </div>
        <div className="nx-stat">
          <div className="nx-stat-icon indigo"><i className="ti ti-shopping-cart"/></div>
          <div className="nx-stat-body"><div className="nx-stat-val">{totalOrders}</div><div className="nx-stat-lbl">Online Orders (MTD)</div></div>
        </div>
        <div className="nx-stat">
          <div className="nx-stat-icon green"><i className="ti ti-cash"/></div>
          <div className="nx-stat-body"><div className="nx-stat-val">{fmt(totalRevenue)}</div><div className="nx-stat-lbl">Online Revenue (MTD)</div></div>
        </div>
        <div className="nx-stat">
          <div className="nx-stat-icon amber"><i className="ti ti-shopping-cart-off"/></div>
          <div className="nx-stat-body"><div className="nx-stat-val">23</div><div className="nx-stat-lbl">Abandoned Carts</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="nx-tabs">
        {([['overview','Overview'],['orders','Online Orders'],['listings','Product Listings'],
           ['channels','Channels'],['promotions','Promotions'],['carts','Abandoned Carts'],
           ['analytics','Analytics']] as [Tab,string][]).map(([id,lbl])=>(
          <button key={id} className={`nx-tab${tab===id?' on':''}`} onClick={()=>setTab(id)}>{lbl}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab==='overview' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
            {CHANNELS.map(ch=>(
              <div key={ch.id} className="nx-card" style={{ padding:'18px 20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                  <div className={`nx-stat-icon ${ch.color}`} style={{ width:40, height:40, borderRadius:10, fontSize:18 }}>
                    <i className={`ti ${ch.icon}`}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{ch.name}</div>
                    <span className={`nx-badge ${ch.status==='live'?'active':ch.status==='connected'?'teal':'inactive'}`}>
                      {ch.status==='live'?'🟢 Live':ch.status==='connected'?'Connected':'Setup Required'}
                    </span>
                  </div>
                  <button className="btn-nx ghost sm"><i className="ti ti-settings"/></button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div style={{ background:'#f8fafc', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:18, fontWeight:800, color:'var(--tx)' }}>{ch.orders}</div>
                    <div style={{ fontSize:11, color:'var(--mu)', marginTop:2 }}>Orders MTD</div>
                  </div>
                  <div style={{ background:'#f8fafc', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:14, fontWeight:800, color:'var(--ac)' }}>{fmt(ch.revenue)}</div>
                    <div style={{ fontSize:11, color:'var(--mu)', marginTop:2 }}>Revenue MTD</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, marginTop:12 }}>
                  <button className="btn-nx ghost sm" style={{ flex:1 }}><i className="ti ti-eye"/> View</button>
                  <button className="btn-nx ghost sm" style={{ flex:1 }}><i className="ti ti-refresh"/> Sync</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ONLINE ORDERS ── */}
      {tab==='orders' && (
        <div>
          <div className="nx-toolbar">
            <div className="nx-search"><i className="ti ti-search"/><input className="nx-input" placeholder="Search order, customer..."/></div>
            <select className="nx-select">
              <option>All Channels</option>
              {CHANNELS.map(c=><option key={c.id}>{c.name}</option>)}
            </select>
            <select className="nx-select">
              <option>All Status</option>
              <option>Pending</option><option>Processing</option><option>Shipped</option><option>Delivered</option><option>Cancelled</option>
            </select>
            <div className="nx-toolbar-right">
              <button className="btn-nx ghost"><i className="ti ti-download"/> Export</button>
            </div>
          </div>
          <div className="nx-table-wrap">
            <table className="nx-table">
              <thead><tr><th>Order #</th><th>Channel</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Fulfillment</th><th>Date</th></tr></thead>
              <tbody>
                {[
                  { id:'EC-1042', ch:'Instagram Shop', cust:'Sara Al-Ahmad', items:2, total:460, status:'processing', ful:'unfulfilled', date:'23 Jul 2026' },
                  { id:'EC-1041', ch:'Salla Store',    cust:'Omar Hassan',   items:1, total:255, status:'shipped',    ful:'fulfilled',   date:'22 Jul 2026' },
                  { id:'EC-1040', ch:'Own Website',    cust:'Reem Khalid',   items:3, total:687, status:'delivered',  ful:'fulfilled',   date:'22 Jul 2026' },
                  { id:'EC-1039', ch:'TikTok Shop',    cust:'Fahad Al-Otaibi',items:1,total:230, status:'pending',   ful:'unfulfilled', date:'21 Jul 2026' },
                  { id:'EC-1038', ch:'Noon.com',       cust:'Nora Salem',    items:2, total:510, status:'processing', ful:'unfulfilled', date:'21 Jul 2026' },
                ].map(o=>(
                  <tr key={o.id}>
                    <td><span style={{ fontWeight:700, color:'var(--ac)' }}>#{o.id}</span></td>
                    <td><span className="nx-badge blue">{o.ch}</span></td>
                    <td style={{ fontWeight:600 }}>{o.cust}</td>
                    <td style={{ color:'var(--mu)' }}>{o.items}</td>
                    <td style={{ fontWeight:700 }}>{fmt(o.total)}</td>
                    <td><span className={`nx-badge ${o.status==='delivered'?'active':o.status==='shipped'?'teal':o.status==='processing'?'pending':'inactive'}`}>{o.status}</span></td>
                    <td><span className={`nx-badge ${o.ful==='fulfilled'?'active':'pending'}`}>{o.ful}</span></td>
                    <td style={{ color:'var(--mu)', fontSize:12 }}>{o.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PRODUCT LISTINGS ── */}
      {tab==='listings' && (
        <div>
          <div className="nx-toolbar">
            <div className="nx-search"><i className="ti ti-search"/><input className="nx-input" placeholder="Search products..."/></div>
            <select className="nx-select"><option>All Channels</option>{CHANNELS.map(c=><option key={c.id}>{c.name}</option>)}</select>
            <div className="nx-toolbar-right">
              <button className="btn-nx ghost"><i className="ti ti-refresh"/> Sync All Products</button>
              <button className="btn-nx primary"><i className="ti ti-upload"/> Push to Channel</button>
            </div>
          </div>
          <div className="nx-table-wrap">
            <table className="nx-table">
              <thead>
                <tr>
                  <th>Product</th><th>SKU</th><th>Price</th><th>Stock</th>
                  {CHANNELS.slice(0,5).map(c=><th key={c.id}><i className={`ti ${c.icon}`}/> {c.name.split(' ')[0]}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  { name:'Caps', sku:'NUX1259', price:230, stock:43, sync:[true,true,true,false,true] },
                  { name:'T-Shirt', sku:'NUX011', price:255, stock:2, sync:[true,true,false,false,true] },
                  { name:'Pen', sku:'NUX001', price:199, stock:0, sync:[false,false,false,false,false] },
                ].map(p=>(
                  <tr key={p.sku}>
                    <td style={{ fontWeight:600 }}>{p.name}</td>
                    <td style={{ fontFamily:'monospace', fontSize:12, color:'var(--mu)' }}>{p.sku}</td>
                    <td style={{ fontWeight:700 }}>{fmt(p.price)}</td>
                    <td>{p.stock===0?<span className="nx-badge danger">Out</span>:p.stock<5?<span className="nx-badge pending">{p.stock} pcs</span>:<span style={{fontWeight:600}}>{p.stock} pcs</span>}</td>
                    {p.sync.map((s,i)=>(
                      <td key={i}>{s?<span style={{color:'var(--ac)',fontSize:18}}><i className="ti ti-circle-check"/></span>:<span style={{color:'#e2e8f0',fontSize:18}}><i className="ti ti-circle-x"/></span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CHANNELS ── */}
      {tab==='channels' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
            {CHANNELS.map(ch=>(
              <div key={ch.id} className="nx-card">
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
                  <div className={`nx-stat-icon ${ch.color}`} style={{ width:48, height:48, borderRadius:12, fontSize:22 }}>
                    <i className={`ti ${ch.icon}`}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15 }}>{ch.name}</div>
                    <div style={{ fontSize:12, color:'var(--mu)', marginTop:2 }}>
                      {ch.orders} orders · {fmt(ch.revenue)} revenue this month
                    </div>
                  </div>
                  <span className={`nx-badge ${ch.status==='live'?'active':'teal'}`}>
                    {ch.status==='live'?'Live':'Connected'}
                  </span>
                </div>
                <div style={{ borderTop:'1px solid var(--bd)', paddingTop:14, display:'flex', gap:8 }}>
                  <button className="btn-nx ghost sm" style={{ flex:1 }}><i className="ti ti-settings"/> Settings</button>
                  <button className="btn-nx ghost sm" style={{ flex:1 }}><i className="ti ti-refresh"/> Sync</button>
                  <button className="btn-nx primary sm" style={{ flex:1 }}><i className="ti ti-external-link"/> Open</button>
                </div>
              </div>
            ))}
            {/* Add Channel Card */}
            <div className="nx-card" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px', border:'2px dashed var(--bd)', background:'transparent', cursor:'pointer', transition:'all .15s' }}
              onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--ac)')}
              onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--bd)')}>
              <div style={{ width:52, height:52, borderRadius:14, background:'#f0fdfa', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, color:'var(--ac)', marginBottom:12 }}>
                <i className="ti ti-plus"/>
              </div>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--tx)' }}>Add New Channel</div>
              <div style={{ fontSize:12.5, color:'var(--mu)', marginTop:4, textAlign:'center' }}>Connect marketplaces, social shops & more</div>
            </div>
          </div>
        </div>
      )}

      {/* ── PROMOTIONS ── */}
      {tab==='promotions' && (
        <div>
          <div className="nx-toolbar">
            <div className="nx-search"><i className="ti ti-search"/><input className="nx-input" placeholder="Search promotions..."/></div>
            <div className="nx-toolbar-right">
              <button className="btn-nx ghost"><i className="ti ti-tag"/> Discount Codes</button>
              <button className="btn-nx primary"><i className="ti ti-plus"/> New Campaign</button>
            </div>
          </div>
          <div className="nx-stats cols-4" style={{ marginBottom:20 }}>
            <div className="nx-stat"><div className="nx-stat-icon teal"><i className="ti ti-speakerphone"/></div><div className="nx-stat-body"><div className="nx-stat-val">5</div><div className="nx-stat-lbl">Active Campaigns</div></div></div>
            <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-tag"/></div><div className="nx-stat-body"><div className="nx-stat-val">120</div><div className="nx-stat-lbl">Codes Used</div></div></div>
            <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-cash"/></div><div className="nx-stat-body"><div className="nx-stat-val">{fmt(14500)}</div><div className="nx-stat-lbl">Discount Given</div></div></div>
            <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-chart-line"/></div><div className="nx-stat-body"><div className="nx-stat-val">3.2%</div><div className="nx-stat-lbl">Conversion Rate</div></div></div>
          </div>
          <div className="nx-table-wrap">
            <table className="nx-table">
              <thead><tr><th>Campaign</th><th>Type</th><th>Code</th><th>Discount</th><th>Channels</th><th>Used</th><th>Expires</th><th>Status</th></tr></thead>
              <tbody>
                {[
                  { name:'Summer Sale',     type:'Percentage', code:'SUMMER25', disc:'25%',   ch:'All',       used:45, exp:'31 Jul 2026', st:'active' },
                  { name:'New Customer',    type:'Fixed',      code:'WELCOME50', disc:'SAR 50',ch:'Website',  used:28, exp:'31 Dec 2026', st:'active' },
                  { name:'Flash Friday',    type:'Percentage', code:'FLASH30',  disc:'30%',   ch:'Instagram',used:19, exp:'25 Jul 2026', st:'active' },
                  { name:'Ramadan Special', type:'Percentage', code:'RAMADAN20',disc:'20%',   ch:'All',      used:82, exp:'Ended',        st:'inactive' },
                ].map(p=>(
                  <tr key={p.code}>
                    <td style={{ fontWeight:700 }}>{p.name}</td>
                    <td style={{ color:'var(--mu)' }}>{p.type}</td>
                    <td><code style={{ background:'#f1f5f9', padding:'2px 8px', borderRadius:5, fontSize:12, fontWeight:700 }}>{p.code}</code></td>
                    <td style={{ fontWeight:700, color:'var(--ac)' }}>{p.disc}</td>
                    <td style={{ color:'var(--mu)' }}>{p.ch}</td>
                    <td style={{ fontWeight:600 }}>{p.used}</td>
                    <td style={{ color:'var(--mu)', fontSize:12 }}>{p.exp}</td>
                    <td><span className={`nx-badge ${p.st==='active'?'active':'inactive'}`}>{p.st}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ABANDONED CARTS ── */}
      {tab==='carts' && (
        <div>
          <div className="nx-stats cols-3" style={{ marginBottom:20 }}>
            <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-shopping-cart-off"/></div><div className="nx-stat-body"><div className="nx-stat-val">23</div><div className="nx-stat-lbl">Abandoned Carts</div></div></div>
            <div className="nx-stat"><div className="nx-stat-icon red"><i className="ti ti-cash-off"/></div><div className="nx-stat-body"><div className="nx-stat-val">{fmt(9840)}</div><div className="nx-stat-lbl">Revenue at Risk</div></div></div>
            <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-check"/></div><div className="nx-stat-body"><div className="nx-stat-val">6</div><div className="nx-stat-lbl">Recovered Today</div></div></div>
          </div>
          <div className="nx-table-wrap">
            <table className="nx-table">
              <thead><tr><th>Customer</th><th>Channel</th><th>Items</th><th>Cart Value</th><th>Abandoned</th><th>Recovery</th><th>Action</th></tr></thead>
              <tbody>
                {[
                  { cust:'Sara Al-Ahmad', ch:'Website',   items:2, val:460, time:'2h ago', rec:'Email sent' },
                  { cust:'Unknown',       ch:'Instagram', items:1, val:255, time:'3h ago', rec:'Pending' },
                  { cust:'Reem Khalid',   ch:'Salla',     items:3, val:687, time:'5h ago', rec:'SMS sent' },
                  { cust:'Unknown',       ch:'TikTok',    items:1, val:230, time:'6h ago', rec:'Pending' },
                ].map((c,i)=>(
                  <tr key={i}>
                    <td style={{ fontWeight:600 }}>{c.cust}</td>
                    <td><span className="nx-badge blue">{c.ch}</span></td>
                    <td style={{ color:'var(--mu)' }}>{c.items}</td>
                    <td style={{ fontWeight:700 }}>{fmt(c.val)}</td>
                    <td style={{ color:'var(--mu)', fontSize:12 }}>{c.time}</td>
                    <td><span className={`nx-badge ${c.rec==='Pending'?'pending':'active'}`}>{c.rec}</span></td>
                    <td><button className="btn-nx primary sm"><i className="ti ti-send"/> Recover</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ANALYTICS ── */}
      {tab==='analytics' && (
        <div>
          <div className="nx-stats cols-4" style={{ marginBottom:20 }}>
            <div className="nx-stat"><div className="nx-stat-icon sky"><i className="ti ti-eye"/></div><div className="nx-stat-body"><div className="nx-stat-val">12,480</div><div className="nx-stat-lbl">Total Visitors (MTD)</div></div></div>
            <div className="nx-stat"><div className="nx-stat-icon teal"><i className="ti ti-pointer"/></div><div className="nx-stat-body"><div className="nx-stat-val">3.4%</div><div className="nx-stat-lbl">Conversion Rate</div></div></div>
            <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-cash"/></div><div className="nx-stat-body"><div className="nx-stat-val">{fmt(totalRevenue)}</div><div className="nx-stat-lbl">Online Revenue</div></div></div>
            <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-shopping-bag"/></div><div className="nx-stat-body"><div className="nx-stat-val">{fmt(Math.round(totalRevenue/totalOrders))}</div><div className="nx-stat-lbl">Avg Order Value</div></div></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {/* Revenue by channel */}
            <div className="nx-card">
              <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>Revenue by Channel</div>
              {CHANNELS.sort((a,b)=>b.revenue-a.revenue).map(ch=>(
                <div key={ch.id} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <i className={`ti ${ch.icon}`} style={{ color:'var(--mu)', fontSize:15 }}/>
                      <span style={{ fontSize:13, fontWeight:600 }}>{ch.name}</span>
                    </div>
                    <span style={{ fontSize:13, fontWeight:700 }}>{fmt(ch.revenue)}</span>
                  </div>
                  <div style={{ height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', background:'var(--ac)', borderRadius:3, width: (ch.revenue/totalRevenue*100)+'%', transition:'width .6s' }}/>
                  </div>
                </div>
              ))}
            </div>
            {/* Orders by channel */}
            <div className="nx-card">
              <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>Orders by Channel</div>
              {CHANNELS.sort((a,b)=>b.orders-a.orders).map(ch=>(
                <div key={ch.id} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <i className={`ti ${ch.icon}`} style={{ color:'var(--mu)', fontSize:15 }}/>
                      <span style={{ fontSize:13, fontWeight:600 }}>{ch.name}</span>
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--ac)' }}>{ch.orders} orders</span>
                  </div>
                  <div style={{ height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', background:'#6366f1', borderRadius:3, width:(ch.orders/totalOrders*100)+'%', transition:'width .6s' }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
