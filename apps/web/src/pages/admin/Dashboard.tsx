import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import api from '../../lib/api';

const today     = new Date().toISOString().split('T')[0];
const yearStart = today.slice(0,4)+'-01-01';
const sar  = (n:any)=>'SAR '+parseFloat(n||0).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
const sarK = (n:any)=>{const v=parseFloat(n||0);return v>=1000000?'SAR '+(v/1000000).toFixed(1)+'M':v>=1000?'SAR '+(v/1000).toFixed(1)+'K':'SAR '+v.toFixed(0);};
const CAT_COLORS=['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];
const PERIOD_OPTS=[{k:'day',l:'Day'},{k:'week',l:'Week'},{k:'month',l:'Month'},{k:'3m',l:'3M'},{k:'6m',l:'6M'},{k:'1y',l:'1Y'}];

function dateFrom(k:string):string{
  const d=new Date();
  if(k==='day')  return d.toISOString().split('T')[0];
  if(k==='week') return new Date(d.getTime()-6*864e5).toISOString().split('T')[0];
  if(k==='month')return d.toISOString().slice(0,7)+'-01';
  if(k==='3m')   return new Date(d.getFullYear(),d.getMonth()-3,1).toISOString().split('T')[0];
  if(k==='6m')   return new Date(d.getFullYear(),d.getMonth()-6,1).toISOString().split('T')[0];
  return d.toISOString().slice(0,4)+'-01-01';
}

function PeriodToggle({value,onChange}:{value:string;onChange:(k:string)=>void}){
  return(
    <div style={{display:'flex',gap:2,background:'#f1f5f9',borderRadius:10,padding:3}}>
      {PERIOD_OPTS.map(o=>(
        <button key={o.k} onClick={()=>onChange(o.k)} style={{padding:'4px 10px',borderRadius:8,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,background:value===o.k?'#6366f1':'transparent',color:value===o.k?'#fff':'#64748b',transition:'all .15s'}}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Card({children,style={}}:{children:React.ReactNode;style?:React.CSSProperties}){
  return <div style={{background:'#fff',borderRadius:16,padding:'18px 20px',boxShadow:'0 1px 4px rgba(0,0,0,.06)',border:'1px solid #f1f5f9',...style}}>{children}</div>;
}

function CardHeader({title,sub,right}:{title:string;sub?:string;right?:React.ReactNode}){
  return(
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
      <div><div style={{fontWeight:700,fontSize:14,color:'#1e293b'}}>{title}</div>{sub&&<div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{sub}</div>}</div>
      {right}
    </div>
  );
}

function BarChart({data,color='#6366f1',height=90,labelKey='period',valueKey='revenue'}:{data:any[];color?:string;height?:number;labelKey?:string;valueKey?:string}){
  const max=Math.max(...data.map((r:any)=>parseFloat(r[valueKey]||0)),1);
  if(!data.length) return <div style={{height,display:'flex',alignItems:'center',justifyContent:'center',color:'#cbd5e1',fontSize:12}}>No data</div>;
  return(
    <div style={{display:'flex',alignItems:'flex-end',gap:3,height}}>
      {data.map((r:any,i:number)=>(
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}} title={`${r[labelKey]}: ${sar(r[valueKey])}`}>
          <div style={{width:'100%',borderRadius:'3px 3px 0 0',background:i===data.length-1?color:color+'55',minHeight:3,height:`${Math.max(parseFloat(r[valueKey]||0)/max*100,2)}%`}}/>
        </div>
      ))}
    </div>
  );
}

function DonutChart({slices,size=80}:{slices:{value:number;color:string;label:string}[];size?:number}){
  const total=slices.reduce((s,x)=>s+x.value,0)||1;
  let angle=-90;const r=size/2-8;const cx=size/2;const cy=size/2;
  const paths=slices.map(s=>{
    const deg=s.value/total*360;
    const r1=angle*(Math.PI/180);const r2=(angle+deg)*(Math.PI/180);
    const x1=cx+r*Math.cos(r1);const y1=cy+r*Math.sin(r1);
    const x2=cx+r*Math.cos(r2);const y2=cy+r*Math.sin(r2);
    const d=`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${deg>180?1:0},1 ${x2},${y2} Z`;
    angle+=deg;return{d,color:s.color,label:s.label,pct:(s.value/total*100).toFixed(0)};
  });
  return(
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((p,i)=><path key={i} d={p.d} fill={p.color} stroke="#fff" strokeWidth={1.5}><title>{p.label}: {p.pct}%</title></path>)}
      <circle cx={cx} cy={cy} r={r*0.55} fill="#fff"/>
    </svg>
  );
}

export default function Dashboard(){
  const [svsPeriod,setSvsPeriod]=useState('month');
  const [orderPeriod,setOrderPeriod]=useState('week');
  const [topProdPeriod,setTopProdPeriod]=useState('month');
  const [recentSalesPeriod,setRecentSalesPeriod]=useState('week');
  const [txTab,setTxTab]=useState('sale');
  const [custOverviewDate,setCustOverviewDate]=useState(today.slice(0,7));

  const {data:orders=[]}=useQuery<any[]>({queryKey:['orders-all'],queryFn:()=>api.get('/sales/orders').then(r=>Array.isArray(r.data)?r.data:r.data?.data||[]).catch(()=>[])});
  const {data:returns=[]}=useQuery<any[]>({queryKey:['returns'],queryFn:()=>api.get('/sales/returns').then(r=>Array.isArray(r.data)?r.data:r.data?.data||[]).catch(()=>[])});
  const {data:purchases=[]}=useQuery<any[]>({queryKey:['purchases'],queryFn:()=>api.get('/purchases').then(r=>Array.isArray(r.data)?r.data:r.data?.data||[]).catch(()=>[])});
  const {data:purchaseReturns=[]}=useQuery<any[]>({queryKey:['purchase-returns'],queryFn:()=>api.get('/purchases/returns').then(r=>Array.isArray(r.data)?r.data:r.data?.data||[]).catch(()=>[])});
  const {data:suppliers=[]}=useQuery<any[]>({queryKey:['suppliers'],queryFn:()=>api.get('/suppliers').then(r=>Array.isArray(r.data)?r.data:[]).catch(()=>[])});
  const {data:customers=[]}=useQuery<any[]>({queryKey:['customers'],queryFn:()=>api.get('/customers').then(r=>Array.isArray(r.data)?r.data:[]).catch(()=>[])});
  const {data:products=[]}=useQuery<any[]>({queryKey:['products'],queryFn:()=>api.get('/catalog/products').then(r=>Array.isArray(r.data)?r.data:[]).catch(()=>[])});
  const {data:categories=[]}=useQuery<any[]>({queryKey:['categories'],queryFn:()=>api.get('/catalog/categories').then(r=>Array.isArray(r.data)?r.data:[]).catch(()=>[])});
  const {data:byCategory=[]}=useQuery<any[]>({queryKey:['cat-ytd'],queryFn:()=>api.get(`/reports/sales/by-category?from=${yearStart}&to=${today}`).then(r=>r.data).catch(()=>[])});
  const {data:expenses=[]}=useQuery<any[]>({queryKey:['expenses'],queryFn:()=>api.get('/expenses').then(r=>Array.isArray(r.data)?r.data:[]).catch(()=>[])});
  const {data:quotations=[]}=useQuery<any[]>({queryKey:['quotations'],queryFn:()=>api.get('/sales/quotations').then(r=>Array.isArray(r.data)?r.data:[]).catch(()=>[])});
  const {data:invoices=[]}=useQuery<any[]>({queryKey:['invoices'],queryFn:()=>api.get('/invoices').then(r=>Array.isArray(r.data)?r.data:[]).catch(()=>[])});
  const {data:svsSales=[]}=useQuery<any[]>({queryKey:['svs-sales',svsPeriod],queryFn:()=>api.get(`/reports/sales/by-period?group_by=day&from=${dateFrom(svsPeriod)}&to=${today}`).then(r=>r.data).catch(()=>[])});

  const totalSalesRev    = useMemo(()=>(orders as any[]).reduce((s:number,o:any)=>s+parseFloat(o.total||0),0),[orders]);
  const totalReturnsRev  = useMemo(()=>(returns as any[]).reduce((s:number,o:any)=>s+parseFloat(o.refund_amount||o.total||0),0),[returns]);
  const totalPurchasesRev= useMemo(()=>(purchases as any[]).reduce((s:number,o:any)=>s+parseFloat(o.total||0),0),[purchases]);
  const totalPurRetRev   = useMemo(()=>(purchaseReturns as any[]).reduce((s:number,o:any)=>s+parseFloat(o.total||0),0),[purchaseReturns]);
  const monthOrders      = useMemo(()=>(orders as any[]).filter((o:any)=>o.created_at?.slice(0,7)===today.slice(0,7)),[orders]);
  const monthRevenue     = useMemo(()=>monthOrders.reduce((s:number,o:any)=>s+parseFloat(o.total||0),0),[monthOrders]);
  const monthExpense     = useMemo(()=>(expenses as any[]).filter((e:any)=>e.date?.slice(0,7)===today.slice(0,7)).reduce((s:number,e:any)=>s+parseFloat(e.amount||0),0),[expenses]);

  const custMonthNew = useMemo(()=>(customers as any[]).filter((c:any)=>c.created_at?.slice(0,7)===custOverviewDate),[customers,custOverviewDate]);
  const custReturning= useMemo(()=>(orders as any[]).filter((o:any)=>{
    if(o.created_at?.slice(0,7)!==custOverviewDate||!o.customer_id)return false;
    return (orders as any[]).some((x:any)=>x.customer_id===o.customer_id&&x.created_at?.slice(0,7)<custOverviewDate);
  }),[orders,custOverviewDate]);

  const topProducts=useMemo(()=>{
    const from=dateFrom(topProdPeriod);
    const map:Record<string,{name:string;qty:number;rev:number}>={};
    (orders as any[]).filter((o:any)=>o.created_at?.slice(0,10)>=from).forEach((o:any)=>{
      (o.items||o.order_items||[]).forEach((item:any)=>{
        const k=item.product_id||item.name||'?';
        if(!map[k])map[k]={name:item.product_name||item.name||'Product',qty:0,rev:0};
        map[k].qty+=parseFloat(item.quantity||1);
        map[k].rev+=parseFloat(item.total||item.subtotal||0);
      });
    });
    return Object.values(map).sort((a,b)=>b.qty-a.qty).slice(0,6);
  },[orders,topProdPeriod]);

  const allVariants  = useMemo(()=>(products as any[]).flatMap((p:any)=>(p.variants||[]).map((v:any)=>({...v,product_name:p.name}))),[products]);
  const lowStockItems= useMemo(()=>allVariants.filter((v:any)=>parseFloat(v.stock_quantity||0)<=5).sort((a:any,b:any)=>parseFloat(a.stock_quantity)-parseFloat(b.stock_quantity)).slice(0,6),[allVariants]);
  const recentSales  = useMemo(()=>(orders as any[]).filter((o:any)=>o.created_at?.slice(0,10)>=dateFrom(recentSalesPeriod)).slice(0,8),[orders,recentSalesPeriod]);
  const txData       = useMemo(()=>{
    if(txTab==='sale')     return (orders as any[]).slice(0,8);
    if(txTab==='purchase') return (purchases as any[]).slice(0,8);
    if(txTab==='quotation')return (quotations as any[]).slice(0,8);
    if(txTab==='expense')  return (expenses as any[]).slice(0,8);
    return (invoices as any[]).slice(0,8);
  },[txTab,orders,purchases,quotations,expenses,invoices]);

  const topCustomers = useMemo(()=>(customers as any[]).map((c:any)=>({...c,spend:parseFloat(c.total_spent||c.lifetime_value||0)})).sort((a:any,b:any)=>b.spend-a.spend).slice(0,6),[customers]);

  const orderStatsData=useMemo(()=>{
    const from=dateFrom(orderPeriod);
    const days:Record<string,{orders:number;revenue:number}>={};
    (orders as any[]).filter((o:any)=>o.created_at?.slice(0,10)>=from).forEach((o:any)=>{
      const d=o.created_at?.slice(0,10)||'';
      if(!days[d])days[d]={orders:0,revenue:0};
      days[d].orders++;days[d].revenue+=parseFloat(o.total||0);
    });
    return Object.entries(days).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>({period:k,...v}));
  },[orders,orderPeriod]);

  const svsCombined=useMemo(()=>{
    const from=dateFrom(svsPeriod);
    const purchMap:Record<string,number>={};
    (purchases as any[]).filter((p:any)=>p.created_at?.slice(0,10)>=from).forEach((p:any)=>{
      const d=p.created_at?.slice(0,10)||'';
      purchMap[d]=(purchMap[d]||0)+parseFloat(p.total||0);
    });
    return (svsSales as any[]).map((r:any)=>({...r,purchase:purchMap[r.period]||0}));
  },[svsSales,purchases,svsPeriod]);

  const TIER_COLOR:Record<string,string>={bronze:'#cd7f32',silver:'#94a3b8',gold:'#f59e0b',platinum:'#6366f1'};
  const STATUS_COLOR:Record<string,{c:string;bg:string}>={
    paid:{c:'#10b981',bg:'#f0fdf4'},completed:{c:'#10b981',bg:'#f0fdf4'},
    pending:{c:'#f59e0b',bg:'#fffbf0'},cancelled:{c:'#ef4444',bg:'#fef2f2'},
    returned:{c:'#ef4444',bg:'#fef2f2'},draft:{c:'#94a3b8',bg:'#f8fafc'},approved:{c:'#6366f1',bg:'#f0f4ff'},
  };

  return(
    <div style={{display:'flex',flexDirection:'column',gap:20,maxWidth:1500}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <h4 style={{margin:0,fontWeight:800,fontSize:20,color:'#1e293b'}}>Dashboard</h4>
          <div style={{fontSize:12,color:'#94a3b8',marginTop:3}}>{new Date().toLocaleDateString('en-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})} · NuxFashion KSA</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:'#f0fdf4',border:'1px solid #86efac',borderRadius:10,fontSize:12,fontWeight:700,color:'#15803d'}}><div style={{width:7,height:7,borderRadius:'50%',background:'#22c55e'}}/> ZATCA Active</div>
          <div style={{padding:'6px 14px',background:'#f0f4ff',border:'1px solid #c7d2fe',borderRadius:10,fontSize:12,fontWeight:700,color:'#4f46e5'}}>⬤ Live</div>
        </div>
      </div>

      {/* 4 top summary cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        {[
          {label:'Total Sales',value:sarK(totalSalesRev),count:(orders as any[]).length,gradient:'linear-gradient(135deg,#6366f1,#8b5cf6)',icon:'ti-shopping-cart-up'},
          {label:'Sales Returns',value:sarK(totalReturnsRev),count:(returns as any[]).length,gradient:'linear-gradient(135deg,#ef4444,#f97316)',icon:'ti-shopping-cart-x'},
          {label:'Total Purchases',value:sarK(totalPurchasesRev),count:(purchases as any[]).length,gradient:'linear-gradient(135deg,#10b981,#06b6d4)',icon:'ti-truck-delivery'},
          {label:'Purchase Returns',value:sarK(totalPurRetRev),count:(purchaseReturns as any[]).length,gradient:'linear-gradient(135deg,#f59e0b,#ef4444)',icon:'ti-truck-return'},
        ].map(c=>(
          <div key={c.label} style={{background:c.gradient,borderRadius:16,padding:'18px 20px',boxShadow:'0 4px 15px rgba(0,0,0,.15)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,.1)'}}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.8)',letterSpacing:.5}}>{c.label.toUpperCase()}</span>
              <div style={{width:32,height:32,borderRadius:10,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className={'ti '+c.icon} style={{fontSize:16,color:'#fff'}}/>
              </div>
            </div>
            <div style={{fontSize:22,fontWeight:900,color:'#fff',marginBottom:4}}>{c.value}</div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:11,color:'rgba(255,255,255,.7)'}}>{c.count} transactions</span>
              <button style={{fontSize:10,fontWeight:700,color:'#fff',background:'rgba(255,255,255,.25)',border:'none',borderRadius:8,padding:'3px 10px',cursor:'pointer'}}>View All →</button>
            </div>
          </div>
        ))}
      </div>

      {/* Sales vs Purchase + Overall Info */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16}}>
        <Card>
          <CardHeader title="Sales vs. Purchase" sub="Revenue comparison by period" right={<PeriodToggle value={svsPeriod} onChange={setSvsPeriod}/>}/>
          <div style={{display:'flex',gap:16,marginBottom:12}}>
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12}}><div style={{width:10,height:10,borderRadius:3,background:'#6366f1'}}/><span style={{color:'#64748b'}}>Sales</span></div>
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12}}><div style={{width:10,height:10,borderRadius:3,background:'#10b981'}}/><span style={{color:'#64748b'}}>Purchase</span></div>
          </div>
          {svsCombined.length>0?(
            <div style={{display:'flex',alignItems:'flex-end',gap:3,height:120}}>
              {svsCombined.map((r:any,i:number)=>{
                const maxV=Math.max(...svsCombined.map((x:any)=>Math.max(parseFloat(x.revenue||0),parseFloat(x.purchase||0))),1);
                return(
                  <div key={i} style={{flex:1,display:'flex',alignItems:'flex-end',gap:1}} title={`${r.period}\nSales: ${sar(r.revenue)}\nPurchase: ${sar(r.purchase)}`}>
                    <div style={{flex:1,borderRadius:'3px 3px 0 0',background:'#6366f1',height:`${Math.max(parseFloat(r.revenue||0)/maxV*100,2)}%`,minHeight:3}}/>
                    <div style={{flex:1,borderRadius:'3px 3px 0 0',background:'#10b981',height:`${Math.max(parseFloat(r.purchase||0)/maxV*100,2)}%`,minHeight:3}}/>
                  </div>
                );
              })}
            </div>
          ):(
            <div style={{height:120,display:'flex',alignItems:'center',justifyContent:'center',color:'#cbd5e1',fontSize:13}}>No data for this period</div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginTop:14,padding:'12px 14px',background:'#f8fafc',borderRadius:12}}>
            {[{l:'Total Sales',v:sarK(totalSalesRev),c:'#6366f1'},{l:'Total Purchases',v:sarK(totalPurchasesRev),c:'#10b981'},{l:'Net',v:sarK(totalSalesRev-totalPurchasesRev),c:totalSalesRev>totalPurchasesRev?'#10b981':'#ef4444'}].map(x=>(
              <div key={x.l} style={{textAlign:'center'}}><div style={{fontSize:11,color:'#94a3b8'}}>{x.l}</div><div style={{fontWeight:800,fontSize:14,color:x.c}}>{x.v}</div></div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Overall Information" sub="Business snapshot"/>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              {label:'Suppliers',value:(suppliers as any[]).length,icon:'ti-building-store',color:'#6366f1',bg:'#f0f4ff'},
              {label:'Customers',value:(customers as any[]).length,icon:'ti-users',color:'#10b981',bg:'#f0fdf4'},
              {label:'Total Orders',value:(orders as any[]).length,icon:'ti-shopping-cart',color:'#f59e0b',bg:'#fffbf0'},
              {label:'Products',value:(products as any[]).length,icon:'ti-shirt',color:'#8b5cf6',bg:'#faf5ff'},
              {label:'Categories',value:(categories as any[]).length,icon:'ti-tags',color:'#06b6d4',bg:'#f0fdfa'},
              {label:'Purchases',value:(purchases as any[]).length,icon:'ti-truck',color:'#ec4899',bg:'#fdf2f8'},
            ].map(s=>(
              <div key={s.label} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',background:s.bg,borderRadius:12}}>
                <div style={{width:36,height:36,borderRadius:10,background:s.color,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <i className={'ti '+s.icon} style={{fontSize:17,color:'#fff'}}/>
                </div>
                <div style={{flex:1}}><div style={{fontSize:12,color:'#64748b',fontWeight:600}}>{s.label}</div></div>
                <div style={{fontWeight:900,fontSize:18,color:s.color}}>{s.value||'—'}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Customer Overview + Top Selling Products */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <Card>
          <CardHeader title="Customer Overview" sub="New vs returning"
            right={<input type="month" value={custOverviewDate} onChange={e=>setCustOverviewDate(e.target.value)} style={{padding:'5px 10px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:12,color:'#374151',cursor:'pointer'}}/>}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
            {[{label:'First Time',value:custMonthNew.length,icon:'👋',color:'#6366f1',bg:'linear-gradient(135deg,#f0f4ff,#ede9fe)'},{label:'Returning',value:custReturning.length,icon:'🔄',color:'#10b981',bg:'linear-gradient(135deg,#f0fdf4,#dcfce7)'}].map(s=>(
              <div key={s.label} style={{padding:16,background:s.bg,borderRadius:14,textAlign:'center'}}>
                <div style={{fontSize:28}}>{s.icon}</div>
                <div style={{fontSize:26,fontWeight:900,color:s.color}}>{s.value}</div>
                <div style={{fontSize:12,color:'#64748b',fontWeight:600}}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{marginBottom:8,fontSize:12,fontWeight:700,color:'#64748b'}}>LOYALTY TIERS</div>
          {['bronze','silver','gold','platinum'].map(tier=>{
            const cnt=(customers as any[]).filter((c:any)=>c.loyalty_tier===tier).length;
            const pctV=(customers as any[]).length>0?cnt/(customers as any[]).length*100:0;
            return(
              <div key={tier} style={{marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                  <span style={{fontSize:11,fontWeight:700,color:TIER_COLOR[tier],textTransform:'capitalize'}}>{tier}</span>
                  <span style={{fontSize:11,color:'#94a3b8'}}>{cnt} ({pctV.toFixed(0)}%)</span>
                </div>
                <div style={{height:5,background:'#f1f5f9',borderRadius:99}}><div style={{height:'100%',width:`${pctV}%`,background:TIER_COLOR[tier],borderRadius:99}}/></div>
              </div>
            );
          })}
        </Card>

        <Card>
          <CardHeader title="Top Selling Products" sub="By units sold" right={<PeriodToggle value={topProdPeriod} onChange={setTopProdPeriod}/>}/>
          {topProducts.length>0?topProducts.map((p,i)=>{
            const maxQ=Math.max(...topProducts.map(x=>x.qty),1);
            return(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <div style={{width:32,height:32,borderRadius:10,background:CAT_COLORS[i%8],display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#fff',flexShrink:0}}>{i+1}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                  <div style={{height:5,background:'#f1f5f9',borderRadius:99,marginTop:4}}><div style={{height:'100%',width:`${p.qty/maxQ*100}%`,background:CAT_COLORS[i%8],borderRadius:99}}/></div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontWeight:800,fontSize:12,color:'#1e293b'}}>{p.qty} units</div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>{sarK(p.rev)}</div>
                </div>
              </div>
            );
          }):(
            <div style={{textAlign:'center',padding:'32px 0',color:'#cbd5e1'}}>
              <i className="ti ti-package" style={{fontSize:40,display:'block',marginBottom:8}}/>
              <div style={{fontSize:13}}>No product sales data yet</div>
            </div>
          )}
        </Card>
      </div>

      {/* Low Stock + Recent Sales */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <Card>
          <CardHeader title="Low Stock Products" sub="Variants with ≤5 units" right={<button style={{fontSize:11,fontWeight:700,color:'#6366f1',background:'#f0f4ff',border:'none',borderRadius:8,padding:'4px 12px',cursor:'pointer'}}>View All →</button>}/>
          {lowStockItems.length>0?lowStockItems.map((v:any,i:number)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:i%2?'#fafbfc':'#fff',borderRadius:10,marginBottom:4}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:parseFloat(v.stock_quantity)<=0?'#ef4444':'#f59e0b',flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.product_name}</div>
                <div style={{fontSize:10,color:'#94a3b8'}}>{v.sku||v.size||v.color||'Variant'}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:800,fontSize:13,color:parseFloat(v.stock_quantity)<=0?'#ef4444':'#f59e0b'}}>{v.stock_quantity||0} left</div>
              </div>
            </div>
          )):(
            <div style={{textAlign:'center',padding:'24px 0',color:'#cbd5e1',fontSize:13}}>
              <i className="ti ti-circle-check" style={{fontSize:36,display:'block',marginBottom:8,color:'#10b981'}}/>All variants in stock
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent Sales" sub="Latest transactions"
            right={
              <div style={{display:'flex',gap:6}}>
                {['week','month'].map(p=>(
                  <button key={p} onClick={()=>setRecentSalesPeriod(p)} style={{padding:'4px 12px',borderRadius:8,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,background:recentSalesPeriod===p?'#6366f1':'#f1f5f9',color:recentSalesPeriod===p?'#fff':'#64748b'}}>
                    {p.charAt(0).toUpperCase()+p.slice(1)}
                  </button>
                ))}
              </div>
            }/>
          {recentSales.map((o:any,i:number)=>{
            const sc=STATUS_COLOR[o.status]||{c:'#94a3b8',bg:'#f8fafc'};
            return(
              <div key={o.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<recentSales.length-1?'1px solid #f1f5f9':'none'}}>
                <div style={{width:34,height:34,borderRadius:10,background:'#f0f4ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#6366f1',flexShrink:0}}>#{String(o.order_number||o.id||i+1).slice(-3)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:12}}>{o.customer_name||'Walk-in'}</div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>{o.created_at?new Date(o.created_at).toLocaleDateString('en-SA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'-'}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:800,fontSize:13}}>{sar(o.total)}</div>
                  <span style={{fontSize:9,padding:'2px 8px',borderRadius:20,background:sc.bg,color:sc.c,fontWeight:700}}>{o.status}</span>
                </div>
              </div>
            );
          })}
          {recentSales.length===0&&<div style={{textAlign:'center',padding:'24px 0',color:'#cbd5e1',fontSize:13}}>No sales this period</div>}
        </Card>
      </div>

      {/* Sales Stats + Revenue/Expense */}
      <div style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:16}}>
        <Card>
          <CardHeader title="Sales Statistics" sub="Monthly performance"/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
            {[
              {l:'Month Revenue',v:sarK(monthRevenue),c:'#6366f1'},
              {l:'Month Orders',v:monthOrders.length,c:'#10b981'},
              {l:'Avg Basket',v:sarK(monthOrders.length?monthRevenue/monthOrders.length:0),c:'#f59e0b'},
              {l:'Month Expense',v:sarK(monthExpense),c:'#ef4444'},
            ].map(s=>(
              <div key={s.l} style={{padding:'12px 14px',background:'#f8fafc',borderRadius:12,textAlign:'center'}}>
                <div style={{fontWeight:900,fontSize:16,color:s.c}}>{s.v}</div>
                <div style={{fontSize:10,color:'#94a3b8',marginTop:3}}>{s.l}</div>
              </div>
            ))}
          </div>
          <BarChart data={orderStatsData} valueKey="revenue" color="#6366f1" height={100}/>
        </Card>

        <Card>
          <CardHeader title="Revenue & Expense" sub="This month"/>
          <div style={{display:'flex',justifyContent:'center',marginBottom:12}}>
            <DonutChart size={120} slices={[{value:monthRevenue,color:'#6366f1',label:'Revenue'},{value:monthExpense,color:'#ef4444',label:'Expense'}]}/>
          </div>
          {[{l:'Revenue',v:monthRevenue,c:'#6366f1'},{l:'Expense',v:monthExpense,c:'#ef4444'},{l:'Net Profit',v:monthRevenue-monthExpense,c:monthRevenue>monthExpense?'#10b981':'#ef4444'}].map(s=>(
            <div key={s.l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'#f8fafc',borderRadius:12,marginBottom:8}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:10,height:10,borderRadius:3,background:s.c}}/><span style={{fontSize:12,fontWeight:600,color:'#374151'}}>{s.l}</span></div>
              <span style={{fontWeight:800,fontSize:13,color:s.c}}>{sarK(s.v)}</span>
            </div>
          ))}
          <div style={{marginTop:4}}>
            <div style={{fontSize:10,color:'#94a3b8',marginBottom:4}}>Profit Margin</div>
            <div style={{height:6,background:'#f1f5f9',borderRadius:99}}><div style={{height:'100%',width:`${monthRevenue>0?Math.min(Math.max((monthRevenue-monthExpense)/monthRevenue*100,0),100):0}%`,background:'#10b981',borderRadius:99}}/></div>
            <div style={{fontSize:11,fontWeight:700,color:'#10b981',marginTop:4}}>{monthRevenue>0?((monthRevenue-monthExpense)/monthRevenue*100).toFixed(1):0}%</div>
          </div>
        </Card>
      </div>

      {/* Recent Transactions tabs */}
      <Card>
        <CardHeader title="Recent Transactions" sub="All transaction types"/>
        <div style={{display:'flex',gap:4,marginBottom:16,borderBottom:'2px solid #f1f5f9',paddingBottom:0}}>
          {[{k:'sale',l:'Sales'},{k:'purchase',l:'Purchases'},{k:'quotation',l:'Quotations'},{k:'expense',l:'Expenses'},{k:'invoice',l:'Invoices'}].map(t=>(
            <button key={t.k} onClick={()=>setTxTab(t.k)} style={{padding:'8px 16px',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,background:'transparent',color:txTab===t.k?'#6366f1':'#94a3b8',borderBottom:txTab===t.k?'2px solid #6366f1':'2px solid transparent',marginBottom:-2,transition:'all .15s'}}>
              {t.l}
            </button>
          ))}
        </div>
        {txData.length>0?(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'80px 100px 1fr 120px 100px 80px',gap:8,padding:'6px 10px',background:'#f8fafc',borderRadius:10,marginBottom:6,fontSize:10,fontWeight:700,color:'#94a3b8',letterSpacing:.5}}>
              <span>#</span><span>DATE</span><span>NAME</span><span>METHOD</span><span>AMOUNT</span><span>STATUS</span>
            </div>
            {txData.map((item:any,i:number)=>{
              const sc=STATUS_COLOR[item.status||'pending']||{c:'#94a3b8',bg:'#f8fafc'};
              return(
                <div key={item.id||i} style={{display:'grid',gridTemplateColumns:'80px 100px 1fr 120px 100px 80px',gap:8,padding:'9px 10px',borderRadius:10,background:i%2?'#fafbfc':'#fff',alignItems:'center',marginBottom:2}}>
                  <span style={{fontWeight:700,fontSize:12,color:'#6366f1'}}>#{item.order_number||item.id||i+1}</span>
                  <span style={{fontSize:10,color:'#94a3b8'}}>{item.created_at||item.date?new Date(item.created_at||item.date).toLocaleDateString('en-SA',{month:'short',day:'numeric'}):'-'}</span>
                  <span style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.customer_name||item.supplier_name||item.description||'—'}</span>
                  <span style={{fontSize:11,color:'#64748b',textTransform:'capitalize'}}>{(item.payment_method||item.type||txTab).replace(/_/g,' ')}</span>
                  <span style={{fontWeight:700,fontSize:12}}>{sar(item.total||item.amount||0)}</span>
                  <span style={{fontSize:10,padding:'3px 8px',borderRadius:20,background:sc.bg,color:sc.c,fontWeight:700,textAlign:'center'}}>{item.status||'—'}</span>
                </div>
              );
            })}
          </div>
        ):(
          <div style={{textAlign:'center',padding:'24px 0',color:'#cbd5e1',fontSize:13}}>No {txTab} records</div>
        )}
      </Card>

      {/* Top Customers + Categories */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <Card>
          <CardHeader title="Top Customers" sub="By lifetime spend" right={<button style={{fontSize:11,fontWeight:700,color:'#6366f1',background:'#f0f4ff',border:'none',borderRadius:8,padding:'4px 12px',cursor:'pointer'}}>View All →</button>}/>
          {topCustomers.filter((c:any)=>c.spend>0).length>0?topCustomers.filter((c:any)=>c.spend>0).map((c:any,i:number)=>(
            <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'9px 0',borderBottom:i<5?'1px solid #f8fafc':'none'}}>
              <div style={{width:36,height:36,borderRadius:10,background:['linear-gradient(135deg,#f59e0b,#ef4444)','linear-gradient(135deg,#94a3b8,#64748b)','linear-gradient(135deg,#cd7f32,#b45309)','linear-gradient(135deg,#6366f1,#8b5cf6)','linear-gradient(135deg,#10b981,#06b6d4)','linear-gradient(135deg,#ec4899,#f43f5e)'][i],display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#fff',flexShrink:0}}>
                {i<3?['🥇','🥈','🥉'][i]:c.name?.slice(0,2).toUpperCase()||'??'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</div>
                <div style={{fontSize:10,color:'#94a3b8',textTransform:'capitalize'}}>{c.loyalty_tier||'Bronze'} · {(c.loyalty_points||0).toLocaleString()} pts</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:900,fontSize:13,color:'#1e293b'}}>{sarK(c.spend)}</div>
                <div style={{fontSize:10,color:'#94a3b8'}}>{(orders as any[]).filter((o:any)=>o.customer_id===c.id).length} orders</div>
              </div>
            </div>
          )):(
            <div style={{textAlign:'center',padding:'24px 0',color:'#cbd5e1',fontSize:13}}><i className="ti ti-users" style={{fontSize:36,display:'block',marginBottom:8}}/>No spend data</div>
          )}
        </Card>

        <Card>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
            <div><div style={{fontWeight:700,fontSize:14,color:'#1e293b'}}>Top Categories</div><div style={{fontSize:11,color:'#94a3b8'}}>YTD sales performance</div></div>
            <div style={{display:'flex',gap:8}}>
              <div style={{textAlign:'center',padding:'6px 12px',background:'#f0f4ff',borderRadius:10}}>
                <div style={{fontWeight:900,fontSize:16,color:'#6366f1'}}>{(categories as any[]).length||'—'}</div>
                <div style={{fontSize:9,color:'#94a3b8',fontWeight:600}}>CATEGORIES</div>
              </div>
              <div style={{textAlign:'center',padding:'6px 12px',background:'#f0fdf4',borderRadius:10}}>
                <div style={{fontWeight:900,fontSize:16,color:'#10b981'}}>{(products as any[]).length||'—'}</div>
                <div style={{fontSize:9,color:'#94a3b8',fontWeight:600}}>PRODUCTS</div>
              </div>
            </div>
          </div>
          {(() => {
            const cats=byCategory as any[];
            const total=cats.reduce((s:number,c:any)=>s+parseFloat(c.revenue||0),0)||1;
            return cats.length>0?cats.slice(0,6).map((c:any,i:number)=>{
              const rev=parseFloat(c.revenue||0);
              return(
                <div key={i} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <div style={{display:'flex',alignItems:'center',gap:7}}><div style={{width:10,height:10,borderRadius:3,background:CAT_COLORS[i%8]}}/><span style={{fontSize:12,fontWeight:600}}>{c.category_name||'Other'}</span></div>
                    <span style={{fontSize:11,fontWeight:700}}>{sarK(rev)} <span style={{fontSize:10,color:'#94a3b8',fontWeight:400}}>({(rev/total*100).toFixed(0)}%)</span></span>
                  </div>
                  <div style={{height:5,background:'#f1f5f9',borderRadius:99}}><div style={{height:'100%',width:`${rev/total*100}%`,background:CAT_COLORS[i%8],borderRadius:99}}/></div>
                </div>
              );
            }):(
              <div style={{textAlign:'center',padding:'24px 0',color:'#cbd5e1',fontSize:13}}><i className="ti ti-tags" style={{fontSize:36,display:'block',marginBottom:8}}/>No category data</div>
            );
          })()}
        </Card>
      </div>

      {/* Order Statistics */}
      <Card>
        <CardHeader title="Order Statistics" sub="Orders and revenue trend"
          right={
            <div style={{display:'flex',gap:6}}>
              {['week','month'].map(p=>(
                <button key={p} onClick={()=>setOrderPeriod(p)} style={{padding:'5px 14px',borderRadius:10,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,background:orderPeriod===p?'#6366f1':'#f1f5f9',color:orderPeriod===p?'#fff':'#64748b'}}>
                  {p.charAt(0).toUpperCase()+p.slice(1)}
                </button>
              ))}
            </div>
          }/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
          {[
            {l:`${orderPeriod==='week'?'Week':'Month'} Orders`,v:orderStatsData.reduce((s:number,r:any)=>s+(r.orders||0),0),c:'#6366f1'},
            {l:`${orderPeriod==='week'?'Week':'Month'} Revenue`,v:sarK(orderStatsData.reduce((s:number,r:any)=>s+(r.revenue||0),0)),c:'#10b981'},
            {l:'Avg Daily Orders',v:orderStatsData.length?Math.round(orderStatsData.reduce((s:number,r:any)=>s+(r.orders||0),0)/orderStatsData.length):0,c:'#f59e0b'},
            {l:'Avg Daily Revenue',v:sarK(orderStatsData.length?orderStatsData.reduce((s:number,r:any)=>s+(r.revenue||0),0)/orderStatsData.length:0),c:'#8b5cf6'},
          ].map(s=>(
            <div key={s.l} style={{padding:14,background:'#f8fafc',borderRadius:12,textAlign:'center'}}>
              <div style={{fontWeight:900,fontSize:18,color:s.c}}>{s.v}</div>
              <div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div><div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:8}}>REVENUE</div><BarChart data={orderStatsData} valueKey="revenue" color="#6366f1" height={80}/></div>
          <div><div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:8}}>ORDERS</div><BarChart data={orderStatsData} valueKey="orders" color="#10b981" height={80}/></div>
        </div>
      </Card>

      {/* Alerts */}
      {lowStockItems.length>0&&(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {lowStockItems.filter((v:any)=>parseFloat(v.stock_quantity)<=0).length>0&&(
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 18px',background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:14}}>
              <i className="ti ti-alert-circle" style={{fontSize:20,color:'#ef4444'}}/>
              <div style={{flex:1}}><strong style={{color:'#991b1b'}}>{lowStockItems.filter((v:any)=>parseFloat(v.stock_quantity)<=0).length} variants out of stock</strong> — Create purchase orders immediately</div>
              <button style={{padding:'6px 14px',borderRadius:8,border:'1px solid #fca5a5',background:'#fff',color:'#ef4444',cursor:'pointer',fontSize:11,fontWeight:700}}>Reorder</button>
            </div>
          )}
          {lowStockItems.filter((v:any)=>parseFloat(v.stock_quantity)>0).length>0&&(
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 18px',background:'#fffbf0',border:'1px solid #fde68a',borderRadius:14}}>
              <i className="ti ti-alert-triangle" style={{fontSize:20,color:'#f59e0b'}}/>
              <div style={{flex:1}}><strong style={{color:'#92400e'}}>{lowStockItems.filter((v:any)=>parseFloat(v.stock_quantity)>0).length} variants running low</strong> — Consider reordering soon</div>
              <button style={{padding:'6px 14px',borderRadius:8,border:'1px solid #fde68a',background:'#fff',color:'#f59e0b',cursor:'pointer',fontSize:11,fontWeight:700}}>View All</button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
