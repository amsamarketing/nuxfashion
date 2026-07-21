
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';
import Modal, { Field, Row2, Inp, Sel, SaveBtn } from '../../components/Modal';
import StatRow from '../../components/StatRow';

const EMPTY = { name:'', name_ar:'', position:'', department_id:'', basic_salary:'', national_id:'', nationality:'Saudi', join_date:new Date().toISOString().split('T')[0], employment_type:'full_time' };

export default function HR() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState('employees');
  const [form, setForm] = useState({...EMPTY});

  const { data:employees=[] } = useQuery({ queryKey:['employees'], queryFn:()=>api.get('/hr/employees').then(r=>r.data) });
  const { data:depts=[] } = useQuery({ queryKey:['depts'], queryFn:()=>api.get('/hr/departments').then(r=>r.data) });

  const addMut = useMutation({
    mutationFn: ()=>api.post('/hr/employees', {
      name: form.name,
      name_ar: form.name_ar || undefined,
      position: form.position,
      department_id: form.department_id || undefined,
      basic_salary: parseFloat(form.basic_salary),
      national_id: form.national_id || undefined,
      nationality: form.nationality,
      join_date: form.join_date,
      employment_type: form.employment_type,
      status: 'active',
    }),
    onSuccess: () => {
      toast('Employee added!', 'success');
      qc.invalidateQueries({ queryKey:['employees'] });
      setShowAdd(false); setForm({...EMPTY});
    },
    onError: e => toast(getErr(e), 'error')
  });

  const set=(k:string,v:string)=>setForm(p=>({...p,[k]:v}));
  const totalPayroll = employees.reduce((s:number,e:any)=>s+parseFloat(e.basic_salary||0),0);

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <div style={{ fontSize:14, fontWeight:700 }}>HR & Payroll</div>
          <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{employees.length} employees · {depts.length} departments</div>
        </div>
        <div className="d-flex gap-2">
          <button className="bt"><i className="ti ti-file-export" /> WPS / Mudad export</button>
          <button className="bt bt-p" onClick={()=>setShowAdd(true)}><i className="ti ti-plus" /> Add employee</button>
        </div>
      </div>

      <div className="d-flex gap-2 mb-3">
        {[['employees','Employees'],['payroll','Payroll summary'],['depts','Departments']].map(([v,l])=>(
          <button key={v} className={'snb'+(tab===v?' on':'')} onClick={()=>setTab(v)}>{l}</button>
        ))}
      </div>

      <StatRow stats={[
        {label:'Total employees',value:employees.length},
        {label:'Monthly payroll',value:'SAR '+totalPayroll.toLocaleString(undefined,{maximumFractionDigits:0})},
        {label:'GOSI employee (10%)',value:'SAR '+(totalPayroll*0.1).toLocaleString(undefined,{maximumFractionDigits:0})},
        {label:'GOSI employer (12%)',value:'SAR '+(totalPayroll*0.12).toLocaleString(undefined,{maximumFractionDigits:0})},
      ]} />

      {tab==='employees' && (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div className="tr th" style={{ gridTemplateColumns:'1fr 110px 80px 100px 90px 90px' }}>
            {['Employee','Department','Status','Basic salary','GOSI (10%)','Net pay'].map(h=><span key={h}>{h}</span>)}
          </div>
          {employees.map((e:any)=>{
            const gosi=parseFloat(e.basic_salary||0)*0.1;
            return (
              <div key={e.id} className="tr" style={{ gridTemplateColumns:'1fr 110px 80px 100px 90px 90px' }}>
                <span><div style={{ fontWeight:600 }}>{e.name}</div><div style={{ fontSize:10, color:'var(--text-muted-custom)' }}>{e.position||'—'} · {e.nationality||'—'}</div></span>
                <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{e.department_name||'—'}</span>
                <span><span className={'bx '+(e.status==='active'?'g':'a')} style={{ textTransform:'capitalize' }}>{e.status}</span></span>
                <span style={{ fontWeight:700 }}>SAR {parseFloat(e.basic_salary||0).toLocaleString()}</span>
                <span style={{ color:'var(--text-secondary)' }}>SAR {gosi.toFixed(0)}</span>
                <span style={{ fontWeight:700, color:'var(--text-success-custom)' }}>SAR {(parseFloat(e.basic_salary||0)-gosi).toFixed(0)}</span>
              </div>
            );
          })}
          {employees.length===0 && <div style={{ padding:32, textAlign:'center', color:'var(--text-muted-custom)' }}>No employees yet</div>}
        </div>
      )}

      {tab==='depts' && (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div className="tr th" style={{ gridTemplateColumns:'1fr 80px 100px' }}>
            {['Department','Headcount','Payroll'].map(h=><span key={h}>{h}</span>)}
          </div>
          {depts.map((d:any)=>{
            const emps=employees.filter((e:any)=>e.department_id===d.id);
            const pay=emps.reduce((s:number,e:any)=>s+parseFloat(e.basic_salary||0),0);
            return (
              <div key={d.id} className="tr" style={{ gridTemplateColumns:'1fr 80px 100px' }}>
                <span style={{ fontWeight:600 }}>{d.name}</span>
                <span style={{ fontWeight:700 }}>{emps.length}</span>
                <span style={{ fontWeight:700 }}>SAR {pay.toLocaleString()}</span>
              </div>
            );
          })}
          {depts.length===0 && <div style={{ padding:24, textAlign:'center', color:'var(--text-muted-custom)' }}>No departments configured</div>}
        </div>
      )}

      {tab==='payroll' && (
        <div className="card">
          <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Payroll summary — {new Date().toLocaleString('default',{month:'long',year:'numeric'})}</div>
          {[['Total basic salaries','SAR '+totalPayroll.toFixed(2)],['GOSI employee contribution (10%)','SAR '+(totalPayroll*0.1).toFixed(2)],['GOSI employer contribution (12%)','SAR '+(totalPayroll*0.12).toFixed(2)],['Total cost to company','SAR '+(totalPayroll*1.12).toFixed(2)],['Net payroll (after employee GOSI)','SAR '+(totalPayroll*0.9).toFixed(2)]].map(([l,v],i)=>(
            <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid var(--border-color)', fontWeight:i===4?700:400 }}>
              <span style={{ color:'var(--text-secondary)' }}>{l}</span>
              <span style={{ fontWeight:i>=3?700:400, color:i===4?'var(--text-success-custom)':'' }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop:12 }}>
            <button className="bt bt-p"><i className="ti ti-file-export" /> Generate WPS file</button>
          </div>
        </div>
      )}

      {showAdd && (
        <Modal title="Add new employee" onClose={()=>setShowAdd(false)} width={580}>
          <Row2>
            <Field label="Full name (English)" required><Inp value={form.name} onChange={v=>set('name',v)} placeholder="Ahmed Al-Rashidi" /></Field>
            <Field label="Full name (Arabic)"><Inp value={form.name_ar} onChange={v=>set('name_ar',v)} placeholder="أحمد الراشدي" dir="rtl" /></Field>
          </Row2>
          <Row2>
            <Field label="Job title / position" required><Inp value={form.position} onChange={v=>set('position',v)} placeholder="Sales Associate" /></Field>
            <Field label="Department">
              <Sel value={form.department_id} onChange={v=>set('department_id',v)}>
                <option value="">No department</option>
                {depts.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}
              </Sel>
            </Field>
          </Row2>
          <Row2>
            <Field label="Basic salary (SAR)" required><Inp type="number" value={form.basic_salary} onChange={v=>set('basic_salary',v)} placeholder="5000" /></Field>
            <Field label="Employment type">
              <Sel value={form.employment_type} onChange={v=>set('employment_type',v)}>
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="contract">Contract</option>
              </Sel>
            </Field>
          </Row2>
          <Row2>
            <Field label="National ID / Iqama"><Inp value={form.national_id} onChange={v=>set('national_id',v)} placeholder="ID number" /></Field>
            <Field label="Nationality"><Inp value={form.nationality} onChange={v=>set('nationality',v)} placeholder="Saudi" /></Field>
          </Row2>
          <Field label="Join date"><Inp type="date" value={form.join_date} onChange={v=>set('join_date',v)} /></Field>
          {form.basic_salary && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, padding:'12px', background:'var(--bg-accent)', borderRadius:'var(--radius)', marginBottom:14 }}>
              {[['Basic salary','SAR '+parseFloat(form.basic_salary).toFixed(0),''],['GOSI deduction (10%)','SAR '+(parseFloat(form.basic_salary)*0.1).toFixed(0),'var(--text-danger-custom)'],['Net pay','SAR '+(parseFloat(form.basic_salary)*0.9).toFixed(0),'var(--text-success-custom)']].map(([l,v,c])=>(
                <div key={l} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:16, fontWeight:800, color:c||'var(--fill-accent)' }}>{v}</div>
                  <div style={{ fontSize:10, color:'var(--text-secondary)', marginTop:2 }}>{l}</div>
                </div>
              ))}
            </div>
          )}
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setShowAdd(false)}>Cancel</button>
            <SaveBtn label="Add employee" loading={addMut.isPending} disabled={!form.name||!form.basic_salary||!form.position} onClick={()=>addMut.mutate()} />
          </div>
        </Modal>
      )}
    </div>
  );
}
