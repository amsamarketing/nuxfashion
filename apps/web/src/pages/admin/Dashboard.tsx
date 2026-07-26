import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

const nav=(s:string)=>window.dispatchEvent(new CustomEvent('nav',{detail:s}));
const n=(v:any)=>Number(v||0);
const money=(v:any)=>'SAR '+n(v).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
const compact=(v:any)=>n(v).toLocaleString('en-SA',{notation:'compact',maximumFractionDigits:1});
const day=(d:Date)=>d.toISOString().slice(0,10);
const SC:Record<string,string>={completed:'active',confirmed:'blue',paid:'active',pending:'pending',cancelled:'danger',draft:'inactive'};
const payLabel=(v:string)=>String(v||'Other').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const get=async(url:string)=>{try{return (await api.get(url)).data}catch{return null}};

export default function Dashboard(){
  const now=new Date();
  const today=day(now);
  const monthStart=today.slice(0,7)+'-01';
  const trendStart=day(new Date(now.getTime()-6*86400000));
  const {data,isLoading,refetch,isFetching}=useQuery({
    queryKey:['executive-dashboard',today],
    queryFn:async()=>{
      const [summary,orders,trend,products,categories,payments,valuation,lowStock,profit,vat,branches]=await Promise.all([
        get('/reports/dashboard'),
        get('/sales/orders?limit=8'),
        get(`/reports/sales/by-period?group_by=day&from=${trendStart}&to=${today}`),
        get(`/reports/sales/by-product?from=${monthStart}&to=${today}&limit=5`),
        get(`/reports/sales/by-category?from=${monthStart}&to=${today}`),
        get(`/reports/sales/payments?from=${monthStart}&to=${today}`),
        get('/reports/inventory/valuation'),
        get('/reports/inventory/low-stock'),
        get(`/finance/reports/profit-loss?from=${monthStart}&to=${today}`),
        get(`/finance/reports/vat?from=${monthStart}&to=${today}`),
        get(`/branches/reports/performance?from=${monthStart}&to=${today}`),
      ]);
      return{summary:summary||{},orders:Array.isArray(orders)?orders:orders?.orders||orders?.data||[],trend:Array.isArray(trend)?trend:[],products:Array.isArray(products)?products:[],categories:Array.isArray(categories)?categories:[],payments:Array.isArray(payments)?payments:[],valuation:valuation||{},lowStock:Array.isArray(lowStock)?lowStock:[],profit:profit||{},vat:vat||{},branches:branches||{branches:[],totals:{}}};
    },
    staleTime:60000,
  });
  const d=data||{summary:{},orders:[],trend:[],products:[],categories:[],payments:[],valuation:{},lowStock:[],profit:{},vat:{},branches:{branches:[],totals:{}}};
  const s:any=d.summary;
  const maxTrend=Math.max(1,...d.trend.map((x:any)=>n(x.revenue)));
  const monthRevenue=n(s?.this_month?.revenue);
  const monthOrders=n(s?.this_month?.orders);
  const avgBasket=monthOrders?monthRevenue/monthOrders:0;
  const retailValue=n(d.valuation?.totals?.total_retail);
  const costValue=n(d.valuation?.totals?.total_cost||s?.inventory?.value);
  const potentialMargin=retailValue?((retailValue-costValue)/retailValue)*100:0;
  const paymentTotal=d.payments.reduce((sum:number,x:any)=>sum+n(x.total),0);
  const categoryTotal=d.categories.reduce((sum:number,x:any)=>sum+n(x.revenue),0);

  if(isLoading)return <div className="dash-loading"><i className="ti ti-loader-2 login-spin"/><span>Preparing business dashboard…</span></div>;
  return <div className="erp-dashboard">
    <header className="dash-hero">
      <div>
        <div className="dash-eyebrow"><i className="ti ti-sparkles"/> Executive overview</div>
        <h1>Fashion Business Dashboard</h1>
        <p>{now.toLocaleDateString('en-SA',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · Live ERP performance</p>
      </div>
      <div className="dash-head-actions">
        <button className="btn-nx ghost" onClick={()=>refetch()} disabled={isFetching}><i className={`ti ti-refresh${isFetching?' login-spin':''}`}/> Refresh</button>
        <button className="btn-nx ghost" onClick={()=>nav('ad-rep')}><i className="ti ti-chart-bar"/> All Reports</button>
        <button className="btn-nx primary" onClick={()=>{window.location.href='/pos-login'}}><i className="ti ti-cash-register"/> Branch POS Login</button>
      </div>
    </header>

    <section className="dash-kpis">
      <Kpi icon="ti-cash" tone="teal" label="Sales Today" value={money(s?.today?.revenue)} note={`${n(s?.today?.orders)} transactions`} />
      <Kpi icon="ti-calendar-stats" tone="indigo" label="Month Revenue" value={money(monthRevenue)} note={`${monthOrders} orders this month`} />
      <Kpi icon="ti-shopping-bag" tone="amber" label="Average Basket" value={money(avgBasket)} note="Revenue per transaction" />
      <Kpi icon="ti-report-money" tone={n(d.profit?.net_profit)>=0?'green':'red'} label="Net Profit MTD" value={money(d.profit?.net_profit)} note={`${d.profit?.net_margin||'0%'} net margin`} />
      <Kpi icon="ti-package" tone="blue" label="Stock at Retail" value={money(retailValue)} note={`${compact(s?.inventory?.variants)} active variants`} />
      <Kpi icon="ti-receipt-tax" tone="purple" label="VAT Position" value={money(d.vat?.net_vat_payable)} note="Month-to-date payable" />
    </section>

    <section className="dash-alert-row">
      <button className={`dash-alert ${n(s?.alerts?.low_stock_variants)>0?'danger':'ok'}`} onClick={()=>nav('ad-inv')}><i className="ti ti-alert-triangle"/><div><b>{n(s?.alerts?.low_stock_variants)} low-stock variants</b><span>{n(s?.alerts?.low_stock_variants)>0?'Replenishment attention required':'Stock levels are healthy'}</span></div><i className="ti ti-chevron-right"/></button>
      <button className="dash-alert warning" onClick={()=>nav('ad-purch')}><i className="ti ti-truck-delivery"/><div><b>{n(s?.alerts?.open_purchase_orders)} open purchase orders</b><span>Awaiting approval or receiving</span></div><i className="ti ti-chevron-right"/></button>
      <button className="dash-alert info" onClick={()=>nav('ad-crm')}><i className="ti ti-user-plus"/><div><b>{n(s?.customers?.new_this_month)} new customers</b><span>{n(s?.customers?.total)} total customer profiles</span></div><i className="ti ti-chevron-right"/></button>
    </section>

    <Panel title="Branch-wise Sales" sub="Month-to-date sales, orders and profit for every location" action={<button onClick={()=>nav('ad-branches')}>Manage branches <i className="ti ti-arrow-right"/></button>}>
      <div className="branch-sales-grid">{(d.branches?.branches||[]).map((row:any)=><button key={row.branch?.id} onClick={()=>nav('ad-branches')}><div><i className="ti ti-building-store"/><span><b>{row.branch?.name}</b><small>{row.branch?.city||row.branch?.code||'Branch'}</small></span></div><strong>{money(row.sales?.net_revenue)}</strong><footer><span>{n(row.sales?.orders)} orders</span><span className={n(row.net_profit)>=0?'positive':'negative'}>{money(row.net_profit)} profit</span></footer></button>)}{!(d.branches?.branches||[]).length&&<Empty text="No active branch performance available"/>}</div>
    </Panel>

    <section className="dash-main-grid">
      <Panel title="7-Day Sales Trend" sub="Daily paid revenue" action={<button onClick={()=>nav('ad-rep')}>Detailed report <i className="ti ti-arrow-right"/></button>}>
        <div className="sales-chart">
          {Array.from({length:7},(_,i)=>{
            const date=new Date(now.getTime()-(6-i)*86400000);const key=day(date);const point=d.trend.find((x:any)=>String(x.period).slice(0,10)===key);const value=n(point?.revenue);
            return <div className="sales-bar-col" key={key}><div className="sales-bar-value">{value?compact(value):'—'}</div><div className="sales-bar-track"><div className="sales-bar" style={{height:`${Math.max(value?8:2,(value/maxTrend)*100)}%`}}/></div><div className="sales-bar-day">{date.toLocaleDateString('en-SA',{weekday:'short'})}</div></div>;
          })}
        </div>
        <div className="dash-chart-summary"><span><small>Month revenue</small><b>{money(monthRevenue)}</b></span><span><small>Orders</small><b>{monthOrders}</b></span><span><small>Discounts</small><b>{money(s?.this_month?.discounts)}</b></span></div>
      </Panel>

      <Panel title="Financial Snapshot" sub="Month-to-date profitability">
        <div className="finance-stack">
          <FinanceRow label="Net sales" value={money(d.profit?.revenue)} tone="blue"/>
          <FinanceRow label="Cost of goods" value={money(d.profit?.cogs)} tone="amber"/>
          <FinanceRow label="Gross profit" value={money(d.profit?.gross_profit)} tone="teal"/>
          <FinanceRow label="Operating expenses" value={money(d.profit?.operating_expenses?.total)} tone="red"/>
          <FinanceRow label="Net profit" value={money(d.profit?.net_profit)} tone={n(d.profit?.net_profit)>=0?'green':'red'} strong/>
        </div>
        <div className="margin-meter"><div><span>Gross margin</span><b>{d.profit?.gross_margin||'0%'}</b></div><div className="margin-track"><span style={{width:`${Math.max(0,Math.min(100,parseFloat(d.profit?.gross_margin)||0))}%`}}/></div></div>
      </Panel>
    </section>

    <section className="dash-three-grid">
      <Panel title="Top Selling Products" sub="This month by revenue">
        <div className="rank-list">{d.products.length?d.products.map((p:any,i:number)=><div className="rank-row" key={`${p.sku}-${i}`}><span className="rank-num">{i+1}</span><div><b>{p.product}</b><small>{p.variant||p.sku} · {n(p.qty_sold)} sold</small></div><strong>{money(p.revenue)}</strong></div>):<Empty text="No product sales this month"/>}</div>
      </Panel>
      <Panel title="Category Performance" sub="Sales mix this month">
        <div className="mix-list">{d.categories.slice(0,5).map((c:any,i:number)=>{const pct=categoryTotal?n(c.revenue)/categoryTotal*100:0;return <div className="mix-row" key={c.category||i}><div><span>{c.category||'Uncategorized'}</span><b>{pct.toFixed(0)}%</b></div><div className="mix-track"><span style={{width:`${pct}%`}}/></div><small>{n(c.qty_sold)} units · {money(c.revenue)}</small></div>})}{!d.categories.length&&<Empty text="No category sales this month"/>}</div>
      </Panel>
      <Panel title="Payment Mix" sub="Collected this month">
        <div className="payment-total"><small>Total collected</small><b>{money(paymentTotal)}</b></div>
        <div className="payment-list">{d.payments.slice(0,6).map((p:any,i:number)=>{const pct=paymentTotal?n(p.total)/paymentTotal*100:0;return <div className="payment-row" key={p.method||i}><span className={`payment-dot p${i%5}`}/><div><b>{payLabel(p.method)}</b><small>{n(p.transactions)} transactions</small></div><strong>{pct.toFixed(0)}%</strong><em>{money(p.total)}</em></div>})}{!d.payments.length&&<Empty text="No payments this month"/>}</div>
      </Panel>
    </section>

    <section className="dash-main-grid lower">
      <Panel title="Inventory Health" sub="Stock value and replenishment">
        <div className="inventory-metrics"><div><small>Cost value</small><b>{money(costValue)}</b></div><div><small>Retail value</small><b>{money(retailValue)}</b></div><div><small>Potential margin</small><b>{potentialMargin.toFixed(1)}%</b></div></div>
        <div className="low-stock-list">{d.lowStock.slice(0,4).map((x:any,i:number)=><div className="stock-row" key={`${x.sku}-${i}`}><div><b>{x.product}</b><small>{x.sku} · {x.warehouse}</small></div><span><strong>{n(x.quantity)}</strong> / reorder {n(x.reorder_point)}</span></div>)}{!d.lowStock.length&&<div className="stock-healthy"><i className="ti ti-circle-check-filled"/> All monitored stock is above reorder level</div>}</div>
        {d.lowStock.length>4&&<button className="dash-link" onClick={()=>nav('ad-inv')}>View all {d.lowStock.length} low-stock items <i className="ti ti-arrow-right"/></button>}
      </Panel>
      <Panel title="Operational Shortcuts" sub="Common clothing retail workflows">
        <div className="ops-grid">
          {[['ti-tag','Products & Variants','Sizes, colors and barcodes','ad-prod'],['ti-package-import','Receive Stock','Purchase receiving','ad-purch'],['ti-building-warehouse','Stock Transfer','Move between branches','ad-inv'],['ti-users','Customer CRM','Loyalty and history','ad-crm'],['ti-file-invoice','VAT & ZATCA','Compliance reports','ad-zatca'],['ti-user-dollar','Payroll','Employees and payroll','ad-hr']].map(([icon,title,sub,screen])=><button key={screen+title} onClick={()=>nav(screen)}><i className={`ti ${icon}`}/><div><b>{title}</b><span>{sub}</span></div><i className="ti ti-chevron-right"/></button>)}
        </div>
      </Panel>
    </section>

    <Panel title="Recent Orders" sub="Latest transactions across POS and channels" action={<button onClick={()=>nav('ad-orders')}>View all orders <i className="ti ti-arrow-right"/></button>}>
      <div className="nx-table-wrap dash-orders"><table className="nx-table"><thead><tr><th>Invoice</th><th>Customer</th><th>Cashier</th><th>Payment</th><th>Total</th><th>Status</th><th>Date & Time</th></tr></thead><tbody>
        {d.orders.length?d.orders.slice(0,8).map((o:any)=><tr key={o.id}><td><b className="order-link">#{o.order_number}</b></td><td>{o.customer_name||'Walk-in'}</td><td>{o.cashier_name||'—'}</td><td>{payLabel(o.payment_method)}</td><td><b>{money(o.total)}</b></td><td><span className={`nx-badge ${SC[o.status]||'inactive'}`}>{o.status}</span></td><td>{o.created_at?new Date(o.created_at).toLocaleString('en-SA',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—'}</td></tr>):<tr><td colSpan={7}><Empty text="No orders yet"/></td></tr>}
      </tbody></table></div>
    </Panel>
  </div>;
}

function Kpi({icon,tone,label,value,note}:{icon:string;tone:string;label:string;value:string;note:string}){return <div className="dash-kpi"><div className={`dash-kpi-icon ${tone}`}><i className={`ti ${icon}`}/></div><div><span>{label}</span><b>{value}</b><small>{note}</small></div></div>}
function Panel({title,sub,action,children}:{title:string;sub:string;action?:any;children:any}){return <section className="dash-panel"><header><div><h3>{title}</h3><p>{sub}</p></div>{action&&<div className="dash-panel-action">{action}</div>}</header><div className="dash-panel-body">{children}</div></section>}
function FinanceRow({label,value,tone,strong}:{label:string;value:string;tone:string;strong?:boolean}){return <div className={`finance-row${strong?' strong':''}`}><span><i className={`finance-dot ${tone}`}/>{label}</span><b>{value}</b></div>}
function Empty({text}:{text:string}){return <div className="dash-empty"><i className="ti ti-chart-dots"/><span>{text}</span></div>}
