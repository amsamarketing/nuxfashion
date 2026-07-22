import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';
import Modal, { Field, Row2, Inp, Sel, SaveBtn } from '../../components/Modal';

const fmt=(n:any)=>'SAR '+parseFloat(n||0).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
const g=(r:any)=>(r as any)?.data??r;
const yr=new Date().getFullYear();

export default function Accounting() {
  const {toast}=useToast();
  const qc=useQueryClient();
  const [tab,setTab]=useState<'pl'|'bs'|'cf'|'journal'|'vat'|'expenses'>('pl');
  const [from,setFrom]=useState(`${yr}-01-01`);
  const [to,setTo]=useState(new Date().toISOString().slice(0,10));
  const [showExpense,setShowExpense]=useState(false);
  const [showJournal,setShowJournal]=useState(false);
  const [exp,setExp]=useState({category_id:'',amount:'',description:'',date:new Date().toISOString().slice(0,10),payment_method:'cash'});
  const [jLines,setJLines]=useState([{account_id:'',debit:'',credit:'',description:''}]);
  const [jDesc,setJDesc]=useState('');

  const qs=`from=${from}&to=${to}`;
  const {data:pl}=useQuery({queryKey:['pl',from,to],queryFn:async()=>{try{return g(await api.get('/finance/reports/profit-loss?'+qs));}catch{return null;}}});
  const {data:bs}=useQuery({queryKey:['bs'],queryFn:async()=>{try{return g(await api.get('/finance/reports/balance-sheet'));}catch{return null;}}});
  const {data:cf}=useQuery({queryKey:['cf',from,to],queryFn:async()=>{try{return g(await api.get('/finance/reports/cash-flow?'+qs));}catch{return null;}}});
  const {data:vat}=useQuery({queryKey:['vat',from,to],queryFn:async()=>{try{return g(await api.get('/finance/reports/vat?'+qs));}catch{return null;}}});
  const {data:journals=[]}=useQuery({queryKey:['journals',from,to],queryFn:async()=>{try{const r=g(await api.get('/finance/journal?from='+from+'&to='+to));return Array.isArray(r)?r:[];}catch{return[];}}});
  const {data:expenses=[]}=useQuery({queryKey:['expenses',from,to],queryFn:async()=>{try{const r=g(await api.get('/finance/expenses?from='+from+'&to='+to));return Array.isArray(r)?r:[];}catch{return[];}}});
  const {data:categories=[]}=useQuery({queryKey:['exp-cats'],queryFn:async()=>{try{const r=g(await api.get('/finance/expense-categories'));return Array.isArray(r)?r:[];}catch{return[];}}});
  const {data:accounts=[]}=useQuery({queryKey:['accounts'],queryFn:async()=>{try{const r=g(await api.get('/finance/accounts'));return Array.isArray(r)?r:[];}catch{return[];}}});

  const addExpense=useMutation({
    mutationFn:()=>api.post('/finance/expenses',{
      category_id:exp.category_id||undefined,
      amount:parseFloat(exp.amount),
      description:exp.description,
      date:exp.date,
      payment_method:exp.payment_method,
    }),
    onSuccess:()=>{toast('Expense recorded','success');qc.invalidateQueries({queryKey:['expenses']});qc.invalidateQueries({queryKey:['pl']});setShowExpense(false);setExp({category_id:'',amount:'',description:'',date:new Date().toISOString().slice(0,10),payment_method:'cash'});},
    onError:e=>toast(getErr(e),'error')
  });

  const addJournal=useMutation({
    mutationFn:()=>api.post('/finance/journal',{
      description:jDesc,
      lines:jLines.filter(l=>l.account_id&&(parseFloat(l.debit)||parseFloat(l.credit))).map(l=>({
        account_id:l.account_id,
        debit:parseFloat(l.debit)||0,
        credit:parseFloat(l.credit)||0,
        description:l.description||undefined,
      }))
    }),
    onSuccess:()=>{toast('Journal entry posted','success');qc.invalidateQueries({queryKey:['journals']});setShowJournal(false);setJDesc('');setJLines([{account_id:'',debit:'',credit:'',description:''}]);},
    onError:e=>toast(getErr(e),'error')
  });

  const totalExp=useMemo(()=>expenses.reduce((s:number,e:any)=>s+parseFloat(e.amount||0),0),[expenses]);
  const jBalance=useMemo(()=>jLines.reduce((s,l)=>({d:s.d+(parseFloat(l.debit)||0),c:s.c+(parseFloat(l.credit)||0)}),{d:0,c:0}),[jLines]);

  const TABS=[{k:'pl',l:'P&L statement'},{k:'bs',l:'Balance sheet'},{k:'cf',l:'Cash flow'},{k:'journal',l:'Journal entries'},{k:'vat',l:'VAT return'},{k:'expenses',l:'Expenses'}];

  const PLRow=({label,value,style='',indent=false}:{label:string,value:any,style?:string,indent?:boolean})=>(
    <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'0.5px solid var(--border-color)',fontWeight:style==='bold'?700:400}}>
      <span style={{color:indent?'var(--text-secondary)':'var(--text-primary)',paddingLeft:indent?16:0,fontWeight:'inherit'}}>{label}</span>
      <span style={{color:style==='success'?'#16a34a':style==='danger'?'#dc2626':'var(--text-primary)',fontWeight:'inherit'}}>{fmt(value)}</span>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <div>
          <div style={{fontSize:14,fontWeight:700}}>Accounting</div>
          <div style={{fontSize:11,color:'var(--text-secondary)'}}>YTD {yr} · Period open</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{padding:'4px 8px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,background:'var(--surface-2)',color:'var(--text-primary)'}}/>
          <span style={{fontSize:12,color:'var(--text-secondary)'}}>to</span>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{padding:'4px 8px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,background:'var(--surface-2)',color:'var(--text-primary)'}}/>
          {tab==='expenses'&&<button className="bt bt-p" onClick={()=>setShowExpense(true)}><i className="ti ti-plus"/> Add expense</button>}
          {tab==='journal'&&<button className="bt bt-p" onClick={()=>setShowJournal(true)}><i className="ti ti-plus"/> New entry</button>}
        </div>
      </div>

      {/* Summary cards */}
      {pl&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:14}}>
          {[
            {l:'Revenue',v:pl.revenue},
            {l:'Cost of goods',v:pl.cogs},
            {l:'Gross profit',v:pl.gross_profit},
            {l:'Net profit',v:pl.net_profit,c:parseFloat(pl.net_profit)>=0?'#16a34a':'#dc2626'},
            {l:'VAT collected',v:vat?.output_vat?.vat??vat?.vat_payable},
          ].map(c=>(
            <div key={c.l} style={{background:'var(--surface-2)',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',padding:'10px 14px'}}>
              <div style={{fontSize:11,color:'var(--text-secondary)',marginBottom:4}}>{c.l}</div>
              <div style={{fontSize:15,fontWeight:700,color:(c as any).c||'var(--text-primary)'}}>{fmt(c.v)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{display:'flex',gap:2,marginBottom:14,borderBottom:'1px solid var(--border-color)'}}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k as any)} style={{padding:'6px 14px',fontSize:12,fontWeight:tab===t.k?700:400,border:'none',background:'none',cursor:'pointer',borderBottom:tab===t.k?'2px solid var(--fill-accent)':'2px solid transparent',color:tab===t.k?'var(--fill-accent)':'var(--text-secondary)'}}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── P&L ── */}
      {tab==='pl'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div className="card" style={{padding:'16px 20px'}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>Profit & Loss — {from} to {to}</div>
            {pl ? <>
              <PLRow label="Revenue" value={pl.revenue} style="bold"/>
              <PLRow label="Cost of goods sold" value={pl.cogs} style="danger"/>
              <PLRow label="Gross profit" value={pl.gross_profit} style="bold"/>
              <div style={{height:8}}/>
              <PLRow label="Operating expenses" value={pl.operating_expenses?.total||0} style="danger"/>
              {pl.operating_expenses?.items?.map((e:any)=><PLRow key={e.name} label={e.name} value={e.amount} indent/>)}
              <div style={{height:8}}/>
              <PLRow label="Net profit" value={pl.net_profit} style={parseFloat(pl.net_profit)>=0?'success':'danger'}/>
            </> : <p style={{color:'var(--text-secondary)',fontSize:12}}>No data for this period</p>}
          </div>
          <div className="card" style={{padding:'16px 20px'}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>Chart of accounts ({accounts.length})</div>
            {accounts.slice(0,15).map((a:any)=>(
              <div key={a.id} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'0.5px solid var(--border-color)',fontSize:11}}>
                <span style={{color:'var(--text-secondary)'}}><span style={{fontFamily:'monospace',fontSize:10,color:'var(--text-muted)',marginRight:6}}>{a.code}</span>{a.name}</span>
                <span style={{fontWeight:600}}>{fmt(a.balance)}</span>
              </div>
            ))}
            {accounts.length===0&&<p style={{color:'var(--text-secondary)',fontSize:12}}>No accounts set up</p>}
          </div>
        </div>
      )}

      {/* ── Balance Sheet ── */}
      {tab==='bs'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          {[{title:'Assets',data:bs?.assets},{title:'Liabilities & Equity',data:bs?.liabilities_and_equity}].map(side=>(
            <div key={side.title} className="card" style={{padding:'16px 20px'}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>{side.title}</div>
              {side.data ? Object.entries(side.data).map(([k,v]:any)=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'0.5px solid var(--border-color)',fontSize:12}}>
                  <span style={{color:'var(--text-secondary)',textTransform:'capitalize'}}>{k.replace(/_/g,' ')}</span>
                  <span style={{fontWeight:600}}>{fmt(v)}</span>
                </div>
              )) : <p style={{color:'var(--text-secondary)',fontSize:12}}>No data</p>}
            </div>
          ))}
        </div>
      )}

      {/* ── Cash Flow ── */}
      {tab==='cf'&&(
        <div className="card" style={{padding:'16px 20px',maxWidth:600}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>Cash flow — {from} to {to}</div>
          {cf ? Object.entries(cf).map(([k,v]:any)=>(
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'0.5px solid var(--border-color)',fontSize:12}}>
              <span style={{color:'var(--text-secondary)',textTransform:'capitalize'}}>{k.replace(/_/g,' ')}</span>
              <span style={{fontWeight:600,color:parseFloat(v)>=0?'#16a34a':'#dc2626'}}>{fmt(v)}</span>
            </div>
          )) : <p style={{color:'var(--text-secondary)',fontSize:12}}>No data for this period</p>}
        </div>
      )}

      {/* ── Journal Entries ── */}
      {tab==='journal'&&(
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="tr th" style={{gridTemplateColumns:'120px 1fr 80px 80px 100px'}}>
            {['Entry #','Description','Debit','Credit','Date'].map(h=><span key={h}>{h}</span>)}
          </div>
          {journals.map((j:any)=>(
            <div key={j.id} className="tr" style={{gridTemplateColumns:'120px 1fr 80px 80px 100px'}}>
              <span style={{fontWeight:700,fontSize:11,color:'var(--fill-accent)'}}>{j.entry_number||j.id?.slice(0,8)}</span>
              <span style={{fontSize:12}}>{j.description}</span>
              <span style={{fontSize:12,fontWeight:600,color:'#16a34a'}}>{fmt(j.total_debit)}</span>
              <span style={{fontSize:12,fontWeight:600,color:'#dc2626'}}>{fmt(j.total_credit)}</span>
              <span style={{fontSize:11,color:'var(--text-secondary)'}}>{j.entry_date?.slice(0,10)||j.created_at?.slice(0,10)}</span>
            </div>
          ))}
          {journals.length===0&&<div style={{padding:32,textAlign:'center',color:'var(--text-secondary)',fontSize:13}}>No journal entries for this period</div>}
        </div>
      )}

      {/* ── VAT Return ── */}
      {tab==='vat'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div className="card" style={{padding:'16px 20px'}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>VAT return — {from} to {to}</div>
            {vat ? <>
              {[
                ['Output VAT (sales)',vat.output_vat?.vat??vat.output_tax,'#16a34a'],
                ['Taxable sales',vat.output_vat?.taxable_sales??vat.taxable_sales,''],
                ['Input VAT (purchases)',vat.input_vat?.vat??vat.input_tax,'#dc2626'],
                ['Taxable purchases',vat.input_vat?.taxable_purchases??vat.taxable_purchases,''],
                ['VAT payable',vat.vat_payable,'#d97706'],
              ].map(([l,v,c]:any)=>l&&(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'0.5px solid var(--border-color)',fontSize:13}}>
                  <span style={{color:'var(--text-secondary)'}}>{l}</span>
                  <span style={{fontWeight:700,color:c||'var(--text-primary)'}}>{fmt(v)}</span>
                </div>
              ))}
              <div style={{marginTop:16,padding:'12px',background:'#fef9c3',borderRadius:'var(--radius)',fontSize:13}}>
                <strong>Net VAT to pay ZATCA: {fmt(vat.vat_payable)}</strong>
              </div>
            </> : <p style={{color:'var(--text-secondary)',fontSize:12}}>No VAT data for this period</p>}
          </div>
          <div className="card" style={{padding:'16px 20px'}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>Filing info</div>
            <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.8}}>
              <div>Period: <strong>{from} — {to}</strong></div>
              <div>Filing frequency: <strong>Quarterly</strong></div>
              <div>VAT rate: <strong>15%</strong></div>
              <div>Status: <span className="bx a">Open</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ── Expenses ── */}
      {tab==='expenses'&&(
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
            {[
              {l:'Total expenses',v:fmt(totalExp)},
              {l:'Transactions',v:expenses.length},
              {l:'Categories',v:categories.length},
            ].map(c=>(
              <div key={c.l} style={{background:'var(--surface-2)',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',padding:'10px 14px'}}>
                <div style={{fontSize:11,color:'var(--text-secondary)',marginBottom:4}}>{c.l}</div>
                <div style={{fontSize:16,fontWeight:700}}>{c.v}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div className="tr th" style={{gridTemplateColumns:'100px 1fr 120px 100px 90px'}}>
              {['Date','Description','Category','Amount','Method'].map(h=><span key={h}>{h}</span>)}
            </div>
            {expenses.map((e:any)=>(
              <div key={e.id} className="tr" style={{gridTemplateColumns:'100px 1fr 120px 100px 90px'}}>
                <span style={{fontSize:11,color:'var(--text-secondary)'}}>{e.date?.slice(0,10)||e.created_at?.slice(0,10)}</span>
                <span style={{fontSize:12}}>{e.description}</span>
                <span style={{fontSize:11,color:'var(--text-secondary)'}}>{e.category_name||'—'}</span>
                <span style={{fontWeight:700,fontSize:12,color:'#dc2626'}}>{fmt(e.amount)}</span>
                <span style={{fontSize:11,color:'var(--text-secondary)',textTransform:'capitalize'}}>{e.payment_method||'—'}</span>
              </div>
            ))}
            {expenses.length===0&&<div style={{padding:32,textAlign:'center',color:'var(--text-secondary)',fontSize:13}}>No expenses for this period</div>}
          </div>
        </div>
      )}

      {/* ── Add Expense Modal ── */}
      {showExpense&&(
        <Modal title="Record expense" onClose={()=>setShowExpense(false)}>
          <Row2>
            <Field label="Amount (SAR)" required><Inp type="number" value={exp.amount} onChange={v=>setExp(p=>({...p,amount:v}))} placeholder="0.00"/></Field>
            <Field label="Date"><Inp type="date" value={exp.date} onChange={v=>setExp(p=>({...p,date:v}))}/></Field>
          </Row2>
          <Field label="Description" required><Inp value={exp.description} onChange={v=>setExp(p=>({...p,description:v}))} placeholder="Rent, utilities, staff expenses…"/></Field>
          <Row2>
            <Field label="Category">
              <Sel value={exp.category_id} onChange={(v:string)=>setExp(p=>({...p,category_id:v}))}>
                <option value="">Uncategorised</option>
                {categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
              </Sel>
            </Field>
            <Field label="Payment method">
              <Sel value={exp.payment_method} onChange={(v:string)=>setExp(p=>({...p,payment_method:v}))}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="cheque">Cheque</option>
              </Sel>
            </Field>
          </Row2>
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setShowExpense(false)}>Cancel</button>
            <SaveBtn label="Record expense" loading={addExpense.isPending} disabled={!exp.amount||!exp.description} onClick={()=>addExpense.mutate()}/>
          </div>
        </Modal>
      )}

      {/* ── New Journal Entry Modal ── */}
      {showJournal&&(
        <Modal title="New journal entry" onClose={()=>setShowJournal(false)}>
          <Field label="Description" required><Inp value={jDesc} onChange={v=>setJDesc(v)} placeholder="Journal entry description…"/></Field>
          <div style={{fontSize:11,fontWeight:700,color:'var(--text-secondary)',marginBottom:6}}>Lines</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 80px 80px 24px',gap:6,fontSize:10,fontWeight:700,color:'var(--text-secondary)',marginBottom:4}}>
            <span>Account</span><span>Debit</span><span>Credit</span><span/>
          </div>
          {jLines.map((l,i)=>(
            <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 80px 80px 24px',gap:6,marginBottom:6,alignItems:'center'}}>
              <select value={l.account_id} onChange={e=>setJLines(ls=>ls.map((x,j)=>j===i?{...x,account_id:e.target.value}:x))}
                style={{padding:'5px 8px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,background:'var(--surface-2)',color:'var(--text-primary)'}}>
                <option value="">Select account…</option>
                {accounts.map((a:any)=><option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
              <input type="number" min={0} step={0.01} value={l.debit} placeholder="0.00"
                onChange={e=>setJLines(ls=>ls.map((x,j)=>j===i?{...x,debit:e.target.value,credit:e.target.value?'':x.credit}:x))}
                style={{padding:'4px 6px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,width:'100%',background:'var(--surface-2)',color:'var(--text-primary)'}}/>
              <input type="number" min={0} step={0.01} value={l.credit} placeholder="0.00"
                onChange={e=>setJLines(ls=>ls.map((x,j)=>j===i?{...x,credit:e.target.value,debit:e.target.value?'':x.debit}:x))}
                style={{padding:'4px 6px',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',fontSize:12,width:'100%',background:'var(--surface-2)',color:'var(--text-primary)'}}/>
              <button onClick={()=>setJLines(ls=>ls.filter((_,j)=>j!==i))} style={{border:'none',background:'none',cursor:'pointer',color:'#dc2626',fontSize:16,padding:0}} disabled={jLines.length===1}>✕</button>
            </div>
          ))}
          <button className="bt" style={{marginBottom:12,fontSize:11}} onClick={()=>setJLines(ls=>[...ls,{account_id:'',debit:'',credit:'',description:''}])}>
            <i className="ti ti-plus"/> Add line
          </button>
          <div style={{textAlign:'right',fontSize:12,padding:'6px 0',borderTop:'1px solid var(--border-color)',color:Math.abs(jBalance.d-jBalance.c)<0.01?'#16a34a':'#dc2626'}}>
            Debit: {fmt(jBalance.d)} | Credit: {fmt(jBalance.c)} {Math.abs(jBalance.d-jBalance.c)<0.01?'✓ Balanced':'⚠ Unbalanced'}
          </div>
          <div className="d-flex gap-2 justify-content-end" style={{marginTop:8}}>
            <button className="bt" onClick={()=>setShowJournal(false)}>Cancel</button>
            <SaveBtn label="Post entry" loading={addJournal.isPending}
              disabled={!jDesc||jLines.length<2||Math.abs(jBalance.d-jBalance.c)>0.01}
              onClick={()=>addJournal.mutate()}/>
          </div>
        </Modal>
      )}
    </div>
  );
}
