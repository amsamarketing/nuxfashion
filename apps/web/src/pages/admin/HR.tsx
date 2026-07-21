
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import Modal, { Field, Row } from '../../components/Modal';
import StatRow from '../../components/StatRow';

export default function HR() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:'', name_ar:'', position:'', department_id:'', basic_salary:'', national_id:'', iqama_number:'', nationality:'', join_date:'' });

  const { data:employees=[] } = useQuery({ queryKey:['employees'], queryFn:()=>api.get('/hr/employees').then(r=>r.data) });
  const { data:depts=[] } = useQuery({ queryKey:['depts'], queryFn:()=>api.get('/hr/departments').then(r=>r.data) });

  const addMut = useMutation({
    mutationFn: ()=>api.post('/hr/employees', { ...form, basic_salary:parseFloat(form.basic_salary||'0') }),
    onSuccess: () => {
      toast('Employee added successfully!', 'success');
      qc.invalidateQueries({ queryKey:['employees'] });
      setShowAdd(false);
      setForm({ name:'', name_ar:'', position:'', department_id:'', basic_salary:'', national_id:'', iqama_number:'', nationality:'Saudi', join_date:'' });
    },
    onError: ()=>toast('Failed to add employee','error')
  });

  const set=(k:string,v:string)=>setForm(p=>({...p,[k]:v}));
  const totalPayroll = employees.reduce((s:number,e:any)=>s+parseFloat(e.basic_salary||0),0);
  const totalGosi = totalPayroll * 0.1;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <div style={{ fontSize:14, fontWeight:700 }}>HR & Payroll</div>
          <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{employees.length} employees · {depts.length} departments</div>
        </div>
        <div className="d-flex gap-2">
          <button className="bt"><i className="ti ti-file-export" /> WPS / Mudad</button>
          <button className="bt bt-p" onClick={()=>setShowAdd(true)}><i className="ti ti-plus" /> Add employee</button>
        </div>
      </div>

      <StatRow stats={[
        {label:'Total employees',value:employees.length},
        {label:'Monthly payroll',value:'SAR '+totalPayroll.toLocaleString(undefined,{maximumFractionDigits:0})},
        {label:'GOSI due (10%)',value:'SAR '+totalGosi.toLocaleString(undefined,{maximumFractionDigits:0})},
        {label:'Departments',value:depts.length},
      ]} />

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div className="tr th" style={{ gridTemplateColumns:'1fr 120px 80px 100px 90px 90px' }}>
          {['Employee','Department','Status','Basic salary','GOSI (10%)','Net pay'].map(h=><span key={h}>{h}</span>)}
        </div>
        {employees.map((e:any)=>{
          const gosi=parseFloat(e.basic_salary||0)*0.1;
          return (
            <div key={e.id} className="tr" style={{ gridTemplateColumns:'1fr 120px 80px 100px 90px 90px' }}>
              <span>
                <div style={{ fontWeight:600 }}>{e.name}</div>
                <div style={{ fontSize:10, color:'var(--text-muted-custom)' }}>{e.position||'—'} · {e.nationality||'—'}</div>
              </span>
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

      {showAdd && (
        <Modal title="Add new employee" onClose={()=>setShowAdd(false)} width={580}>
          <Row>
            <Field label="Full name (English) *">
              <input type="text" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Ahmed Al-Rashidi" />
            </Field>
            <Field label="Full name (Arabic)">
              <input type="text" value={form.name_ar} onChange={e=>set('name_ar',e.target.value)} placeholder="أحمد الراشدي" style={{ direction:'rtl' }} />
            </Field>
          </Row>
          <Row>
            <Field label="Position / job title *">
              <input type="text" value={form.position} onChange={e=>set('position',e.target.value)} placeholder="e.g. Sales Associate" />
            </Field>
            <Field label="Department">
              <select value={form.department_id} onChange={e=>set('department_id',e.target.value)}
                style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--border-color)', borderRadius:'var(--radius)', background:'var(--surface-2)', fontSize:12 }}>
                <option value="">Select department</option>
                {depts.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Basic salary (SAR) *">
              <input type="number" value={form.basic_salary} onChange={e=>set('basic_salary',e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Nationality">
              <input type="text" value={form.nationality} onChange={e=>set('nationality',e.target.value)} placeholder="Saudi / Egyptian / etc." />
            </Field>
          </Row>
          <Row>
            <Field label="National ID / Iqama number">
              <input type="text" value={form.national_id||form.iqama_number} onChange={e=>set('national_id',e.target.value)} placeholder="ID number" />
            </Field>
            <Field label="Join date">
              <input type="date" value={form.join_date} onChange={e=>set('join_date',e.target.value)} />
            </Field>
          </Row>
          {form.basic_salary && (
            <div style={{ padding:'10px 12px', background:'var(--bg-accent)', borderRadius:'var(--radius)', fontSize:12, color:'var(--text-accent)', marginBottom:14, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              <div><div style={{ fontWeight:700 }}>SAR {parseFloat(form.basic_salary).toFixed(0)}</div><div style={{ fontSize:10 }}>Basic salary</div></div>
              <div><div style={{ fontWeight:700 }}>SAR {(parseFloat(form.basic_salary)*0.1).toFixed(0)}</div><div style={{ fontSize:10 }}>GOSI (10%)</div></div>
              <div><div style={{ fontWeight:700, color:'var(--text-success-custom)' }}>SAR {(parseFloat(form.basic_salary)*0.9).toFixed(0)}</div><div style={{ fontSize:10 }}>Net pay</div></div>
            </div>
          )}
          <div className="d-flex gap-2 justify-content-end">
            <button className="bt" onClick={()=>setShowAdd(false)}>Cancel</button>
            <button className="bt bt-p" disabled={!form.name||!form.basic_salary||addMut.isPending} onClick={()=>addMut.mutate()}>
              {addMut.isPending ? <><div className="spinner-border spinner-border-sm me-1" />Saving…</> : <><i className="ti ti-check" /> Add employee</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
