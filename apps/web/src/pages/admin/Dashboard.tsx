import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

const today      = new Date().toISOString().split('T')[0];
const yesterday  = new Date(Date.now()-86400000).toISOString().split('T')[0];
const monthStart = today.slice(0,7)+'-01';
const yearStart  = today.slice(0,4)+'-01-01';

const sar  = (n:any)=>'SAR '+parseFloat(n||0).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
const pct  = (a:number,b:number)=>b>0?((a-b)/b*100).toFixed(1):'0';
const sarK = (n:any)=>{const v=parseFloat(n||0);return v>=1000?'SAR '+(v/1000).toFixed(1)+'K':'SAR '+v.toFixed(0);};
const CAT_COLORS=['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];

function Trend({val,suffix='%'}:{val:string|number;suffix?:string}){
  const v=parseFloat(String(val));
  if(isNaN(v)||v===0) return <span style={{fontSize:11,color:'#9ca3af'}}>—</span>;
  return <span style={{fontSize:11,fontWeight:700,color:v>0?'#10b981':'#ef4444'}}>{v>0?'▲':'▼'} {Math.abs(v).toFixed(1)}{suffix}</span>;
}

function KPICard({label,value,sub,trend,icon,gradient,iconBg}:{label:string;value:string|number;sub?:string;trend?:number;icon:string;gradient?:string;iconBg?:string}){
  return(
    <div style={{background:gradient||'#fff',borderRadius:16,padding:'16px 18px',boxShadow:'0 1px 4px rgba(0,0,0,.06)',border:'1px solid #f1f5f9',position:'relative',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
        <span style={{fontSize:11,fontWeight:600,color:gradient?'rgba(255,255,255,.8)':'#64748b',letterSpacing:.3}}>{label.toUpperCase()}</span>
        <div style={{width:34,height:34,borderRadius:10,background:iconBg||(gradient?'rgba(255,255,255,.2)':'#f0f4ff'),display:'flex',alignItems:'center',justifyContent:'center'}}>
          <i className={'ti '+icon} style={{fontSize:17,color:gradient?'#fff':'#6366f1'}}/>
        </div>
      </div>
      <div style={{fontSize:24,fontWeight:900,color:gradient?'#fff':'#1e293b',lineHeight:1,marginBottom:6}}>{value}</div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        {sub&&<div style={{fontSize:11,color:gradient?'rgba(255,255,255,.7)':'#94a3b8'}}>{sub}</div>}
        {trend!==undefined&&<Trend val={trend}/>}
      </div>
    </div>
  );
}

function MiniBar({data,color='#6366f1'}:{data:number[];color?:string}){
  const max=Math.max(...data,1);
  return(
    <div style={{display:'flex',alignItems:'flex-end',gap:2,height:32}}>
      {data.map((v,i)=>(
        <div key={i} style={{flex:1,background:i===data.length-1?color:color+'44',borderRadius:'2px 2px 0 0',height:`${Math.max(v/max*100,4)}%`}}/>
      ))}
    </div>
  );
}

function DonutChart({slices,size=80}:{slices:{value:number;color:string;label:string}[];size?:number}){
  const total=slices.reduce((s,x)=>s+x.value,0)||1;
  let angle=-90;
  const r=size/2-8;const cx=size/2;const cy=size/2;
  const paths=slices.map(s=>{
    const pct=s.value/total;const deg=pct*360;
    const r1=angle*(Math.PI/180);const r2=(angle+deg)*(Math.PI/180);
    const x1=cx+r*Math.cos(r1);const y1=cy+r*Math.sin(r1);
    const x2=cx+r*Math.cos(r2);const y2=cy+r*Math.sin(r2);
    const la=deg>180?1:0;
    const d=`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${la},1 ${x2},${y2} Z`;
    angle+=deg;
    return{d,color:s.color,label:s.label,pct:(pct*100).toFixed(0)};
  });
  return(
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((p,i)=><path key={i} d={p.d} fill={p.color} stroke="#fff" strokeWidth={1.5}><title>{p.label}: {p.pct}%</title></path>)}
      <circle cx={cx} cy={cy} r={r*0.55} fill="#fff"/>
    </svg>
  );
}

export default function Dashboard(){
  const {data:dash,isLoading}=useQuery({queryKey:['dashboard'],queryFn:()=>api.get('/reports/dashboard').then(r=>r.data)});
  const {data:orders=[]}=useQuery<any[]>({queryKey:['orders-recent'],queryFn:()=>api.get('/sales/orders').then(r=>Array.isArray(r.data)?r.data:r.data?.data||[])});
  const {data:byDay=[]}=useQuery<any[]>({queryKey:['rpt-day',monthStart,today],queryFn:()=>api.get(`/reports/sales/by-period?group_by=day&from=${monthStart}&to=${today}`).then(r=>r.data).catch(()=>[])});
  const {data:byMonth=[]}=useQuery<any[]>({queryKey:['rpt-month',yearStart,today],queryFn:()=>api.get(`/reports/sales/by-period?group_by=month&from=${yearStart}&to=${today}`).then(r=>r.data).catch(()=>[])});
  const {data:byCategory=[]}=useQuery<any[]>({queryKey:['rpt-cat',yearStart,today],queryFn:()=>api.get(`/reports/sales/by-category?from=${yearStart}&to=${today}`).then(r=>r.data).catch(()=>[])});
  const {data:customers=[]}=useQuery<any[]>({queryKey:['customers'],queryFn:()=>api.get('/customers').then(r=>Array.isArray(r.data)?r.data:[])});
  const {data:products=[]}=useQuery<any[]>({queryKey:['products'],queryFn:()=>api.get('/catalog/products').then(r=>Array.isArray(r.data)?r.data:[])});
  const {data:todayOrders=[]}=useQuery<any[]>({queryKey:['orders-today',today],queryFn:()=>api.get('/sales/orders').then(r=>(Array.isArray(r.data)?r.data:r.data?.data||[]).filter((o:any)=>o.created_at?.slice(0,10)===today)).catch(()=>[])});
  const {data:yesterdayOrders=[]}=useQuery<any[]>({queryKey:['orders-yday',yesterday],queryFn:()=>api.get('/sales/orders').then(r=>(Array.isArray(r.data)?r.data:r.data?.data||[]).filter((o:any)=>o.created_at?.slice(0,10)===yesterday)).catch(()=>[])});

  // ── Derived metrics ──────────────────────────────────────────
  const todayRev   = todayOrders.reduce((s:number,o:any)=>s+parseFloat(o.total||0),0);
  const ydayRev    = yesterdayOrders.reduce((s:number,o:any)=>s+parseFloat(o.total||0),0);
  const monthRev   = parseFloat(dash?.this_month?.revenue||0);
  const yearRev    = (byMonth as any[]).reduce((s:number,r:any)=>s+parseFloat(r.revenue||0),0);
  const todayOrdsN = todayOrders.length;
  const monthOrds  = dash?.this_month?.orders||0;
  const avgBasket  = monthOrds>0?monthRev/monthOrds:0;
  const todayVAT   = todayRev*15/115;
  const monthVAT   = monthRev*15/115;
  const revTrend   = parseFloat(pct(todayRev,ydayRev));
  const loyalMembers=(customers as any[]).filter((c:any)=>c.loyalty_points>0).length;
  const totalPts   =(customers as any[]).reduce((s:number,c:any)=>s+(c.loyalty_points||0),0);
  const goldPlat   =(customers as any[]).filter((c:any)=>['gold','platinum'].includes(c.loyalty_tier)).length;
  const newCustsMon=(customers as any[]).filter((c:any)=>c.created_at?.slice(0,7)===today.slice(0,7)).length;
  const totalVariants=(products as any[]).flatMap((p:any)=>p.variants||[]);
  const lowStock   =totalVariants.filter((v:any)=>parseFloat(v.stock_quantity||0)<=5&&parseFloat(v.stock_quantity||0)>0).length;
  const outOfStock =totalVariants.filter((v:any)=>parseFloat(v.stock_quantity||0)<=0).length;
  const inStock    =totalVariants.length-lowStock-outOfStock;

  // Payment method breakdown from orders
  const pmBreak:(Record<string,number>)={};
  (orders as any[]).forEach((o:any)=>{const m=(o.payment_method||'cash').toLowerCase().replace(/ /g,'_');pmBreak[m]=(pmBreak[m]||0)+parseFloat(o.total||0);});
  const pmTotal=Object.values(pmBreak).reduce((s,v)=>s+v,0)||1;
  const pmEntries=Object.entries(pmBreak).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const pmLabels:Record<string,string>={cash:'Cash',card:'Card',mada:'Mada',credit_card:'Card',tabby:'Tabby',tamara:'Tamara',apple_pay:'Apple Pay',wallet:'Wallet',loyalty_points:'Points'};
  const pmColors=['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6'];

  // 7-day sparkline
  const last7days=Array.from({length:7},(_,i)=>{
    const d=new Date(Date.now()-(6-i)*86400000).toISOString().split('T')[0];
    const dayOrds=(orders as any[]).filter((o:any)=>o.created_at?.slice(0,10)===d);
    return dayOrds.reduce((s:number,o:any)=>s+parseFloat(o.total||0),0);
  });

  // Top 5 categories
  const topCats=(byCategory as any[]).slice(0,5);
  const catTotal=topCats.reduce((s:number,c:any)=>s+parseFloat(c.revenue||0),0)||1;

  // Top customers by spend
  const topCusts=(customers as any[]).map((c:any)=>({...c,spend:parseFloat(c.total_spent||c.lifetime_value||0)})).sort((a:any,b:any)=>b.spend-a.spend).slice(0,5);

  // Recent 8 orders
  const recentOrders=(orders as any[]).slice(0,8);

  // Hourly distribution from today's orders
  const hourly=Array(24).fill(0);
  todayOrders.forEach((o:any)=>{const h=new Date(o.created_at).getHours();if(h>=0&&h<24)hourly[h]+=parseFloat(o.total||0);});
  const peakHour=hourly.indexOf(Math.max(...hourly));
  const businessHours=hourly.slice(8,22);

  if(isLoading) return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300,flexDirection:'column',gap:12,color:'#94a3b8'}}>
      <div style={{width:36,height:36,border:'3px solid #e2e8f0',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      <div style={{fontSize:13,fontWeight:600}}>Loading dashboard…</div>
    </div>
  );

  return(
    <div style={{display:'flex',flexDirection:'column',gap:20,maxWidth:1400}}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <h4 style={{margin:0,fontWeight:800,fontSize:20,color:'#1e293b'}}>Dashboard</h4>
          <div style={{fontSize:13,color:'#94a3b8',marginTop:3}}>
            {new Date().toLocaleDateString('en-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})} · NuxFashion KSA
          </div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',background:'#f0fdf4',border:'1px solid #86efac',borderRadius:10,fontSize:12,fontWeight:600,color:'#15803d'}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:'#22c55e'}}/> ZATCA Active
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',background:'#f0f4ff',border:'1px solid #c7d2fe',borderRadius:10,fontSize:12,fontWeight:600,color:'#4f46e5'}}>
            <i className="ti ti-circle-dot" style={{fontSize:13}}/> Live
          </div>
        </div>
      </div>

      {/* ── Primary KPIs ─────────────────────────────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        <KPICard label="Today's Revenue" value={sarK(todayRev)} sub={`${todayOrdsN} orders · VAT ${sarK(todayVAT)}`} trend={revTrend} icon="ti-cash" gradient="linear-gradient(135deg,#6366f1,#8b5cf6)" iconBg="rgba(255,255,255,.2)"/>
        <KPICard label="Month Revenue" value={sarK(monthRev)} sub={`${monthOrds} orders · VAT ${sarK(monthVAT)}`} icon="ti-calendar-month" iconBg="#ede9fe"/>
        <KPICard label="Avg Basket Size" value={sar(avgBasket)} sub="per transaction this month" icon="ti-shopping-bag" iconBg="#fef3c7"/>
        <KPICard label="Year Revenue" value={sarK(yearRev)} sub={`YTD ${new Date().getFullYear()}`} icon="ti-chart-line" iconBg="#dcfce7"/>
      </div>

      {/* ── Secondary KPIs ───────────────────────────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        <KPICard label="Loyal Members" value={loyalMembers.toLocaleString()} sub={`${goldPlat} Gold/Platinum · ${totalPts.toLocaleString()} pts`} icon="ti-star" iconBg="#fef3c7"/>
        <KPICard label="New Customers" value={newCustsMon} sub="joined this month" icon="ti-user-plus" iconBg="#dcfce7"/>
        <KPICard label="Low Stock Variants" value={lowStock} sub={`${outOfStock} out of stock · ${inStock} OK`} icon="ti-alert-triangle" iconBg={lowStock>0?'#fee2e2':'#dcfce7'}/>
        <KPICard label="Total Customers" value={(customers as any[]).length.toLocaleString()} sub={`${(customers as any[]).filter((c:any)=>c.loyalty_tier==='platinum').length} Platinum members`} icon="ti-users" iconBg="#ede9fe"/>
      </div>

      {/* ── Sales trend + Hourly heatmap ─────────────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16}}>
        {/* Daily chart this month */}
        <div style={{background:'#fff',borderRadius:16,padding:'20px 22px',boxShadow:'0 1px 4px rgba(0,0,0,.06)',border:'1px solid #f1f5f9'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
            <div>
              <div style={{fontWeight:700,fontSize:15,color:'#1e293b'}}>Sales Trend</div>
              <div style={{fontSize:12,color:'#94a3b8'}}>Daily revenue · {new Date().toLocaleString('en-SA',{month:'long',year:'numeric'})}</div>
            </div>
            <div style={{display:'flex',gap:12,fontSize:12}}>
              <span style={{color:'#94a3b8'}}>MTD <strong style={{color:'#1e293b'}}>{sarK(monthRev)}</strong></span>
              <span style={{color:'#94a3b8'}}>Orders <strong style={{color:'#1e293b'}}>{monthOrds}</strong></span>
            </div>
          </div>
          {/* Bar chart */}
          {(byDay as any[]).length>0?(
            <div style={{display:'flex',alignItems:'flex-end',gap:3,height:120}}>
              {(byDay as any[]).map((r:any,i:number)=>{
                const max=Math.max(...(byDay as any[]).map((x:any)=>parseFloat(x.revenue||0)),1);
                const h=Math.max(parseFloat(r.revenue||0)/max*100,2);
                const isToday=r.period===today;
                return(
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}} title={`${r.period}: ${sar(r.revenue)}`}>
                    <div style={{width:'100%',height:`${h}%`,background:isToday?'#6366f1':i===byDay.length-1?'#8b5cf6':'#c7d2fe',borderRadius:'3px 3px 0 0',minHeight:3,transition:'height .3s'}}/>
                    {(byDay as any[]).length<=20&&<div style={{fontSize:7,color:'#94a3b8',whiteSpace:'nowrap'}}>{r.period?.slice(-2)}</div>}
                  </div>
                );
              })}
            </div>
          ):(
            <div style={{height:120,display:'flex',alignItems:'center',justifyContent:'center',color:'#cbd5e1',fontSize:13}}>No sales data this month yet</div>
          )}
          {/* 7-day sparkline */}
          <div style={{marginTop:14,padding:'12px 14px',background:'#f8fafc',borderRadius:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{fontSize:11,fontWeight:600,color:'#64748b'}}>LAST 7 DAYS</span>
              <span style={{fontSize:11,color:'#94a3b8'}}>{sarK(last7days.reduce((s,v)=>s+v,0))} total</span>
            </div>
            <MiniBar data={last7days} color="#6366f1"/>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
              {['7d ago','6d','5d','4d','3d','2d','Today'].map(l=><span key={l} style={{fontSize:8,color:'#cbd5e1'}}>{l}</span>)}
            </div>
          </div>
        </div>

        {/* Hourly heatmap */}
        <div style={{background:'#fff',borderRadius:16,padding:'20px 22px',boxShadow:'0 1px 4px rgba(0,0,0,.06)',border:'1px solid #f1f5f9'}}>
          <div style={{fontWeight:700,fontSize:15,color:'#1e293b',marginBottom:4}}>Today's Peak Hours</div>
          <div style={{fontSize:12,color:'#94a3b8',marginBottom:16}}>Revenue by hour · {new Date().toLocaleDateString('en-SA')}</div>
          {todayOrdsN>0?(
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:10}}>
                {businessHours.map((v:number,i:number)=>{
                  const maxH=Math.max(...businessHours,1);
                  const intensity=v/maxH;
                  const hour=i+8;
                  const isNow=new Date().getHours()===hour;
                  return(
                    <div key={i} title={`${hour}:00 — ${sar(v)}`} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                      <div style={{width:'100%',height:60,background:`rgba(99,102,241,${Math.max(intensity*.9,.05)})`,borderRadius:6,border:isNow?'2px solid #6366f1':'2px solid transparent',transition:'all .2s'}}/>
                      <div style={{fontSize:8,color:'#94a3b8'}}>{hour}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{padding:'10px 14px',background:'#f0f4ff',borderRadius:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><div style={{fontSize:11,fontWeight:700,color:'#6366f1'}}>Peak Hour</div><div style={{fontSize:13,fontWeight:800,color:'#4f46e5'}}>{peakHour}:00 – {peakHour+1}:00</div></div>
                <div style={{textAlign:'right'}}><div style={{fontSize:11,color:'#94a3b8'}}>Peak revenue</div><div style={{fontSize:13,fontWeight:700,color:'#6366f1'}}>{sarK(hourly[peakHour])}</div></div>
              </div>
            </>
          ):(
            <div style={{height:120,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'#cbd5e1',gap:8}}>
              <i className="ti ti-clock" style={{fontSize:36}}/>
              <span style={{fontSize:13}}>No sales today yet</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Category + Payment Methods + Stock ───────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>

        {/* Category performance */}
        <div style={{background:'#fff',borderRadius:16,padding:'20px 22px',boxShadow:'0 1px 4px rgba(0,0,0,.06)',border:'1px solid #f1f5f9'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div>
              <div style={{fontWeight:700,fontSize:15,color:'#1e293b'}}>Top Categories</div>
              <div style={{fontSize:12,color:'#94a3b8'}}>Sales by product category · YTD</div>
            </div>
            {topCats.length>0&&<DonutChart slices={topCats.map((c:any,i:number)=>({value:parseFloat(c.revenue||0),color:CAT_COLORS[i],label:c.category_name||'Other'}))} size={60}/>}
          </div>
          {topCats.length>0?topCats.map((c:any,i:number)=>{
            const rev=parseFloat(c.revenue||0);
            const share=rev/catTotal*100;
            return(
              <div key={i} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,alignItems:'center'}}>
                  <div style={{display:'flex',alignItems:'center',gap:7}}>
                    <div style={{width:10,height:10,borderRadius:3,background:CAT_COLORS[i],flexShrink:0}}/>
                    <span style={{fontSize:12,fontWeight:600,color:'#374151'}}>{c.category_name||'Other'}</span>
                  </div>
                  <span style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{sarK(rev)} <span style={{fontSize:10,color:'#94a3b8',fontWeight:400}}>({share.toFixed(0)}%)</span></span>
                </div>
                <div style={{height:5,background:'#f1f5f9',borderRadius:99,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${share}%`,background:CAT_COLORS[i],borderRadius:99}}/>
                </div>
              </div>
            );
          }):(
            <div style={{textAlign:'center',padding:'24px 0',color:'#cbd5e1',fontSize:13}}>
              <i className="ti ti-tags" style={{fontSize:32,display:'block',marginBottom:8}}/>
              No category data yet
            </div>
          )}
        </div>

        {/* Payment methods */}
        <div style={{background:'#fff',borderRadius:16,padding:'20px 22px',boxShadow:'0 1px 4px rgba(0,0,0,.06)',border:'1px solid #f1f5f9'}}>
          <div style={{marginBottom:16}}>
            <div style={{fontWeight:700,fontSize:15,color:'#1e293b'}}>Payment Methods</div>
            <div style={{fontSize:12,color:'#94a3b8'}}>Revenue split by payment type</div>
          </div>
          {pmEntries.length>0?(
            <>
              <div style={{display:'flex',justifyContent:'center',marginBottom:16}}>
                <DonutChart slices={pmEntries.map(([m,v]:any,i:number)=>({value:v,color:pmColors[i],label:pmLabels[m]||m}))} size={100}/>
              </div>
              {pmEntries.map(([m,v]:any,i:number)=>(
                <div key={m} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 0',borderBottom:i<pmEntries.length-1?'1px solid #f8fafc':'none'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:10,height:10,borderRadius:3,background:pmColors[i],flexShrink:0}}/>
                    <span style={{fontSize:12,color:'#374151',textTransform:'capitalize'}}>{pmLabels[m]||m}</span>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{sarK(v)}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>{(v/pmTotal*100).toFixed(0)}%</div>
                  </div>
                </div>
              ))}
            </>
          ):(
            <div style={{textAlign:'center',padding:'24px 0',color:'#cbd5e1',fontSize:13}}>
              <i className="ti ti-credit-card" style={{fontSize:32,display:'block',marginBottom:8}}/>
              No payment data yet
            </div>
          )}
        </div>

        {/* Inventory health + Loyalty */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Inventory health */}
          <div style={{background:'#fff',borderRadius:16,padding:'18px 20px',boxShadow:'0 1px 4px rgba(0,0,0,.06)',border:'1px solid #f1f5f9',flex:1}}>
            <div style={{fontWeight:700,fontSize:14,color:'#1e293b',marginBottom:12}}>Stock Health</div>
            {[{label:'In Stock',count:inStock,color:'#10b981',bg:'#f0fdf4'},{label:'Low Stock',count:lowStock,color:'#f59e0b',bg:'#fffbf0'},{label:'Out of Stock',count:outOfStock,color:'#ef4444',bg:'#fef2f2'}].map(s=>(
              <div key={s.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',background:s.bg,borderRadius:10,marginBottom:6}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:s.color}}/>
                  <span style={{fontSize:12,fontWeight:600,color:'#374151'}}>{s.label}</span>
                </div>
                <span style={{fontSize:14,fontWeight:800,color:s.color}}>{s.count}</span>
              </div>
            ))}
            <div style={{fontSize:11,color:'#94a3b8',marginTop:6}}>{totalVariants.length} total variants tracked</div>
          </div>
          {/* Loyalty snapshot */}
          <div style={{background:'linear-gradient(135deg,#1e1b4b,#312e81)',borderRadius:16,padding:'18px 20px',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <div style={{fontWeight:700,fontSize:14,color:'#fff',marginBottom:10}}>⭐ Loyalty Program</div>
            {[{label:'Members',value:loyalMembers,icon:'👥'},{label:'Total Points',value:totalPts.toLocaleString(),icon:'⭐'},{label:'Gold/Platinum',value:goldPlat,icon:'🏆'}].map(s=>(
              <div key={s.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <span style={{fontSize:12,color:'rgba(255,255,255,.6)'}}>{s.icon} {s.label}</span>
                <span style={{fontSize:13,fontWeight:800,color:'#fff'}}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Monthly trend + Top customers ────────────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {/* Monthly YTD */}
        <div style={{background:'#fff',borderRadius:16,padding:'20px 22px',boxShadow:'0 1px 4px rgba(0,0,0,.06)',border:'1px solid #f1f5f9'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
            <div>
              <div style={{fontWeight:700,fontSize:15,color:'#1e293b'}}>Monthly Revenue</div>
              <div style={{fontSize:12,color:'#94a3b8'}}>Year to date · {new Date().getFullYear()}</div>
            </div>
            <div style={{fontWeight:800,fontSize:15,color:'#10b981'}}>{sarK(yearRev)}</div>
          </div>
          {(byMonth as any[]).length>0?(
            <div style={{display:'flex',alignItems:'flex-end',gap:6,height:100}}>
              {(byMonth as any[]).map((r:any,i:number)=>{
                const max=Math.max(...(byMonth as any[]).map((x:any)=>parseFloat(x.revenue||0)),1);
                const h=Math.max(parseFloat(r.revenue||0)/max*100,2);
                const isThis=r.period?.slice(0,7)===today.slice(0,7);
                const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const mIdx=parseInt(r.period?.slice(5,7)||'1')-1;
                return(
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}} title={`${r.period}: ${sar(r.revenue)}`}>
                    <div style={{width:'100%',height:`${h}%`,background:isThis?'#10b981':'#d1fae5',borderRadius:'4px 4px 0 0',minHeight:3}}/>
                    <div style={{fontSize:8,color:'#94a3b8'}}>{months[mIdx]}</div>
                  </div>
                );
              })}
            </div>
          ):(
            <div style={{height:100,display:'flex',alignItems:'center',justifyContent:'center',color:'#cbd5e1',fontSize:13}}>No monthly data</div>
          )}
        </div>

        {/* Top customers */}
        <div style={{background:'#fff',borderRadius:16,padding:'20px 22px',boxShadow:'0 1px 4px rgba(0,0,0,.06)',border:'1px solid #f1f5f9'}}>
          <div style={{fontWeight:700,fontSize:15,color:'#1e293b',marginBottom:4}}>Top Customers</div>
          <div style={{fontSize:12,color:'#94a3b8',marginBottom:14}}>By lifetime spend · All time</div>
          {topCusts.filter((c:any)=>c.spend>0).length>0?topCusts.filter((c:any)=>c.spend>0).map((c:any,i:number)=>(
            <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',borderBottom:i<4?'1px solid #f8fafc':'none'}}>
              <div style={{width:36,height:36,borderRadius:10,background:i===0?'linear-gradient(135deg,#f59e0b,#ef4444)':i===1?'linear-gradient(135deg,#94a3b8,#64748b)':i===2?'linear-gradient(135deg,#cd7f32,#b45309)':'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff',flexShrink:0}}>
                {i===0?'🥇':i===1?'🥈':i===2?'🥉':c.name?.slice(0,2).toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</div>
                <div style={{fontSize:11,color:'#94a3b8',textTransform:'capitalize'}}>{c.loyalty_tier||'Bronze'} · {(c.loyalty_points||0).toLocaleString()} pts</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:800,fontSize:13,color:'#1e293b'}}>{sarK(c.spend)}</div>
              </div>
            </div>
          )):(
            <div style={{textAlign:'center',padding:'24px 0',color:'#cbd5e1',fontSize:13}}>
              <i className="ti ti-users" style={{fontSize:32,display:'block',marginBottom:8}}/>
              No customer spend data yet
            </div>
          )}
        </div>
      </div>

      {/* ── Recent orders ─────────────────────────────────────── */}
      <div style={{background:'#fff',borderRadius:16,padding:'20px 22px',boxShadow:'0 1px 4px rgba(0,0,0,.06)',border:'1px solid #f1f5f9'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div>
            <div style={{fontWeight:700,fontSize:15,color:'#1e293b'}}>Recent Orders</div>
            <div style={{fontSize:12,color:'#94a3b8'}}>Last {recentOrders.length} transactions · All channels</div>
          </div>
          <div style={{fontSize:11,padding:'4px 12px',borderRadius:20,background:'#f0f4ff',color:'#6366f1',fontWeight:700}}>{(orders as any[]).length} total</div>
        </div>
        <div style={{overflowX:'auto'}}>
          <div style={{display:'grid',gridTemplateColumns:'100px 110px 1fr 90px 110px 80px',gap:8,padding:'8px 12px',background:'#f8fafc',borderRadius:10,marginBottom:6,fontSize:11,fontWeight:700,color:'#94a3b8',letterSpacing:.3}}>
            <span>ORDER #</span><span>DATE & TIME</span><span>CUSTOMER</span><span>PAYMENT</span><span>TOTAL</span><span>STATUS</span>
          </div>
          {recentOrders.length===0&&<div style={{padding:'32px 0',textAlign:'center',color:'#cbd5e1',fontSize:13}}><i className="ti ti-shopping-cart" style={{fontSize:32,display:'block',marginBottom:8}}/>No orders yet</div>}
          {recentOrders.map((o:any,i:number)=>{
            const statusColor:Record<string,string>={paid:'#10b981',completed:'#10b981',pending:'#f59e0b',returned:'#ef4444',cancelled:'#ef4444'};
            const statusBg:Record<string,string>={paid:'#f0fdf4',completed:'#f0fdf4',pending:'#fffbf0',returned:'#fef2f2',cancelled:'#fef2f2'};
            const sc=statusColor[o.status]||'#94a3b8';
            const sb=statusBg[o.status]||'#f8fafc';
            return(
              <div key={o.id} style={{display:'grid',gridTemplateColumns:'100px 110px 1fr 90px 110px 80px',gap:8,padding:'10px 12px',borderRadius:10,background:i%2===0?'#fff':'#fafbfc',alignItems:'center',marginBottom:2}}>
                <span style={{fontWeight:700,fontSize:13,color:'#6366f1'}}>#{o.order_number}</span>
                <span style={{fontSize:11,color:'#94a3b8'}}>{o.created_at?new Date(o.created_at).toLocaleString('en-SA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'-'}</span>
                <div>
                  <div style={{fontWeight:600,fontSize:12}}>{o.customer_name||'Walk-in'}</div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>POS · Riyadh Mall</div>
                </div>
                <span style={{fontSize:11,color:'#64748b',textTransform:'capitalize'}}>{(o.payment_method||'—').replace(/_/g,' ')}</span>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:'#1e293b'}}>{sar(o.total)}</div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>VAT {sar(parseFloat(o.tax_amount||0))}</div>
                </div>
                <span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:sb,color:sc,fontWeight:700,textTransform:'capitalize',textAlign:'center'}}>{o.status||'—'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Alerts ────────────────────────────────────────────── */}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {outOfStock>0&&(
          <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:14}}>
            <i className="ti ti-alert-circle" style={{fontSize:22,color:'#ef4444',flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:'#991b1b',fontSize:13}}>{outOfStock} variants out of stock</div>
              <div style={{fontSize:12,color:'#b91c1c',opacity:.8}}>Check inventory and create purchase orders immediately</div>
            </div>
            <button style={{padding:'7px 16px',borderRadius:10,border:'1px solid #fca5a5',background:'#fff',color:'#ef4444',cursor:'pointer',fontSize:12,fontWeight:700,whiteSpace:'nowrap'}}>View Inventory</button>
          </div>
        )}
        {lowStock>0&&(
          <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',background:'#fffbf0',border:'1px solid #fde68a',borderRadius:14}}>
            <i className="ti ti-alert-triangle" style={{fontSize:22,color:'#f59e0b',flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:'#92400e',fontSize:13}}>{lowStock} variants running low (≤5 units)</div>
              <div style={{fontSize:12,color:'#b45309',opacity:.8}}>Consider reordering soon to avoid stockouts</div>
            </div>
            <button style={{padding:'7px 16px',borderRadius:10,border:'1px solid #fde68a',background:'#fff',color:'#f59e0b',cursor:'pointer',fontSize:12,fontWeight:700,whiteSpace:'nowrap'}}>Reorder</button>
          </div>
        )}
        {dash?.alerts?.open_purchase_orders>0&&(
          <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',background:'#f0f4ff',border:'1px solid #c7d2fe',borderRadius:14}}>
            <i className="ti ti-truck" style={{fontSize:22,color:'#6366f1',flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:'#4338ca',fontSize:13}}>{dash.alerts.open_purchase_orders} open purchase orders pending</div>
              <div style={{fontSize:12,color:'#4f46e5',opacity:.8}}>Awaiting supplier confirmation or delivery</div>
            </div>
            <button style={{padding:'7px 16px',borderRadius:10,border:'1px solid #c7d2fe',background:'#fff',color:'#6366f1',cursor:'pointer',fontSize:12,fontWeight:700,whiteSpace:'nowrap'}}>View POs</button>
          </div>
        )}
      </div>

    </div>
  );
}