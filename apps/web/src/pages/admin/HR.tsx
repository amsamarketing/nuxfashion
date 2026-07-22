import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';

// ─── tiny helpers ─────────────────────────────────────────────────────────────
const sar = (n: any) => 'SAR\u00a0' + Number(n||0).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmt  = (d: string) => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const today = () => new Date().toISOString().split('T')[0];

const STATUS_COLOR: Record<string,string> = {
  active:'#10b981', inactive:'#94a3b8', terminated:'#ef4444',
  present:'#10b981', absent:'#ef4444', late:'#f59e0b', half_day:'#8b5cf6',
  on_leave:'#3b82f6', holiday:'#06b6d4',
  pending:'#f59e0b', approved:'#10b981', rejected:'#ef4444', cancelled:'#94a3b8',
  draft:'#94a3b8', paid:'#10b981',
};
const Badge = ({ s }: { s: string }) => (
  <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 10px',borderRadius:99,fontSize:11,fontWeight:700,background:STATUS_COLOR[s]+'22',color:STATUS_COLOR[s]||'#64748b'}}>
    <span style={{width:5,height:5,borderRadius:'50%',background:STATUS_COLOR[s]||'#64748b'}}/>
    {s.replace(/_/g,' ')}
  </span>
);

const Inp = ({ label, ...p }: any) => (
  <div>
    <label style={{display:'block',fontSize:11,fontWeight:600,color:'#64748b',marginBottom:4,textTransform:'uppercase',letterSpacing:.5}}>{label}</label>
    <input style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'8px 12px',fontSize:13,outline:'none',boxSizing:'border-box',transition:'border .15s'}}
      onFocus={e=>(e.target.style.borderColor='#6366f1')} onBlur={e=>(e.target.style.borderColor='#e2e8f0')} {...p}/>
  </div>
);
const Sel = ({ label, children, ...p }: any) => (
  <div>
    <label style={{display:'block',fontSize:11,fontWeight:600,color:'#64748b',marginBottom:4,textTransform:'uppercase',letterSpacing:.5}}>{label}</label>
    <select style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'8px 12px',fontSize:13,outline:'none',boxSizing:'border-box',background:'#fff'}} {...p}>{children}</select>
  </div>
);
const Modal = ({ title, onClose, children, wide }: any) => (
  <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(2px)'}}>
    <div style={{background:'#fff',borderRadius:20,width:'100%',maxWidth:wide?780:520,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 48px rgba(0,0,0,.18)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid #f1f5f9',position:'sticky',top:0,background:'#fff',borderRadius:'20px 20px 0 0'}}>
        <h3 style={{margin:0,fontSize:16,fontWeight:700,color:'#0f172a'}}>{title}</h3>
        <button onClick={onClose} style={{border:'none',background:'#f1f5f9',borderRadius:8,width:32,height:32,cursor:'pointer',fontSize:18,color:'#64748b',display:'flex',alignItems:'center',justifyContent:'center'}}>&times;</button>
      </div>
      <div style={{padding:'24px'}}>{children}</div>
    </div>
  </div>
);
const Card = ({ children, style }: any) => <div style={{background:'#fff',borderRadius:16,border:'1px solid #f1f5f9',boxShadow:'0 1px 4px rgba(0,0,0,.05)',...style}}>{children}</div>;
const Btn = ({ children, variant='primary', ...p }: any) => {
  const styles: any = {
    primary:{background:'#6366f1',color:'#fff',border:'none'},
    secondary:{background:'#f8fafc',color:'#475569',border:'1.5px solid #e2e8f0'},
    danger:{background:'#fef2f2',color:'#ef4444',border:'1.5px solid #fecaca'},
    success:{background:'#f0fdf4',color:'#10b981',border:'1.5px solid #bbf7d0'},
  };
  return <button style={{...styles[variant],padding:'8px 18px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',transition:'opacity .15s',...p.style}} onMouseOver={e=>(e.currentTarget.style.opacity='.85')} onMouseOut={e=>(e.currentTarget.style.opacity='1')} {...p}>{children}</button>;
};
const TH = ({ children }: any) => <th style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.6,whiteSpace:'nowrap'}}>{children}</th>;
const TD = ({ children, style }: any) => <td style={{padding:'12px 14px',fontSize:13,color:'#334155',borderTop:'1px solid #f8fafc',...style}}>{children}</td>;

// ─── TABS config ──────────────────────────────────────────────────────────────
const TABS = [
  { id:'employees',    icon:'👥', label:'Employees' },
  { id:'departments',  icon:'🏢', label:'Departments' },
  { id:'attendance',   icon:'📅', label:'Attendance' },
  { id:'leave',        icon:'🌴', label:'Leave' },
  { id:'payroll',      icon:'💳', label:'Payroll' },
];

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color }: any) => (
  <Card style={{padding:'20px 24px',display:'flex',alignItems:'center',gap:16}}>
    <div style={{width:48,height:48,borderRadius:14,background:color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{icon}</div>
    <div>
      <p style={{margin:0,fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5}}>{label}</p>
      <p style={{margin:'4px 0 0',fontSize:24,fontWeight:800,color:'#0f172a'}}>{value}</p>
    </div>
  </Card>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function HR() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('employees');
  const { data: emps = [] } = useQuery({ queryKey:['employees'], queryFn:()=>api.get('/employees').then(r=>r.data) });
  const { data: attToday = [] } = useQuery({ queryKey:['att-today'], queryFn:()=>api.get(`/attendance/date/${today()}`).then(r=>r.data) });
  const now = new Date();
  const { data: paySum } = useQuery({ queryKey:['payroll-summary', now.getMonth()+1, now.getFullYear()], queryFn:()=>api.get(`/payroll/summary?month=${now.getMonth()+1}&year=${now.getFullYear()}`).then(r=>r.data) });

  const activeEmps  = emps.filter((e:any)=>e.status==='active').length;
  const presentToday = attToday.filter((a:any)=>a.status==='present').length;
  const onLeave      = attToday.filter((a:any)=>a.status==='on_leave').length;
  const monthPayroll = paySum?.total_net || 0;

  return (
    <div style={{display:'flex',height:'100%',background:'#f8fafc'}}>
      {/* ── Sidebar ── */}
      <aside style={{width:220,background:'#fff',borderRight:'1px solid #f1f5f9',display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'24px 20px 16px'}}>
          <p style={{margin:0,fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.8}}>HR & Payroll</p>
        </div>
        <nav style={{flex:1,padding:'0 12px'}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:12,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,textAlign:'left',marginBottom:2,transition:'all .15s',background:tab===t.id?'#6366f1':'transparent',color:tab===t.id?'#fff':'#64748b'}}>
              <span style={{fontSize:18}}>{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main area ── */}
      <div style={{flex:1,overflowY:'auto',padding:28}}>
        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
          <StatCard icon="👥" label="Active Employees" value={activeEmps} color="#6366f1"/>
          <StatCard icon="✅" label="Present Today" value={presentToday} color="#10b981"/>
          <StatCard icon="🌴" label="On Leave Today" value={onLeave} color="#f59e0b"/>
          <StatCard icon="💳" label="Month Payroll" value={sar(monthPayroll)} color="#3b82f6"/>
        </div>

        {/* Tab content */}
        {tab==='employees'   && <EmployeesTab   toast={toast} qc={qc} emps={emps}/>}
        {tab==='departments' && <DepartmentsTab toast={toast} qc={qc}/>}
        {tab==='attendance'  && <AttendanceTab  toast={toast} qc={qc} emps={emps}/>}
        {tab==='leave'       && <LeaveTab       toast={toast} qc={qc} emps={emps}/>}
        {tab==='payroll'     && <PayrollTab     toast={toast} qc={qc} paySum={paySum}/>}
      </div>
    </div>
  );
}

// ─── EMPLOYEES TAB ────────────────────────────────────────────────────────────
const EMP0 = {firstName:'',lastName:'',email:'',phone:'',joiningDate:new Date().toISOString().split('T')[0],basicSalary:'',housingAllowance:'',transportAllowance:'',departmentId:'',designationId:'',gender:'male',status:'active',nationalId:'',bankName:'',bankAccount:'',address:''};
function EmployeesTab({ toast, qc, emps }: any) {
  const [show, setShow]   = useState(false);
  const [edit, setEdit]   = useState<any>(null);
  const [form, setForm]   = useState({...EMP0});
  const [search, setSearch] = useState('');
  const f = (k:string,v:string) => setForm(p=>({...p,[k]:v}));
  const { data: depts=[]  } = useQuery({queryKey:['departments'], queryFn:()=>api.get('/departments').then(r=>r.data)});
  const { data: desigs=[] } = useQuery({queryKey:['designations'],queryFn:()=>api.get('/designations').then(r=>r.data)});
  const save = useMutation({mutationFn:()=>edit?api.put(`/employees/${edit.id}`,{...form,basicSalary:Number(form.basicSalary),housingAllowance:Number(form.housingAllowance),transportAllowance:Number(form.transportAllowance)}):api.post('/employees',{...form,basicSalary:Number(form.basicSalary),housingAllowance:Number(form.housingAllowance),transportAllowance:Number(form.transportAllowance)}),onSuccess:()=>{qc.invalidateQueries({queryKey:['employees']});toast('Saved');setShow(false);setEdit(null);setForm({...EMP0});},onError:(e:any)=>toast(getErr(e),'error')});
  const del  = useMutation({mutationFn:(id:string)=>api.delete(`/employees/${id}`),onSuccess:()=>{qc.invalidateQueries({queryKey:['employees']});toast('Deleted');},onError:(e:any)=>toast(getErr(e),'error')});
  const open = (emp?:any) => {
    if(emp){setEdit(emp);setForm({firstName:emp.first_name,lastName:emp.last_name,email:emp.email,phone:emp.phone||'',joiningDate:emp.joining_date?.split('T')[0]||'',basicSalary:emp.basic_salary||'',housingAllowance:emp.housing_allowance||'',transportAllowance:emp.transport_allowance||'',departmentId:emp.department_id||'',designationId:emp.designation_id||'',gender:emp.gender||'male',status:emp.status||'active',nationalId:emp.national_id||'',bankName:emp.bank_name||'',bankAccount:emp.bank_account||'',address:emp.address||''});}
    else{setEdit(null);setForm({...EMP0});}
    setShow(true);
  };
  const filtered = emps.filter((e:any)=>{const q=search.toLowerCase();return !q||e.first_name?.toLowerCase().includes(q)||e.last_name?.toLowerCase().includes(q)||e.email?.toLowerCase().includes(q)||e.employee_id?.toLowerCase().includes(q);});
  const active=emps.filter((e:any)=>e.status==='active').length;
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* Header row */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
        <div style={{flex:1,position:'relative'}}>
          <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#94a3b8',fontSize:14}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search employees..." style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'9px 12px 9px 36px',fontSize:13,outline:'none',boxSizing:'border-box'}}/>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:12,color:'#64748b',whiteSpace:'nowrap'}}>{active} active / {emps.length} total</span>
          <Btn onClick={()=>open()}>+ Add Employee</Btn>
        </div>
      </div>
      {/* Table */}
      <Card>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead style={{background:'#f8fafc'}}>
            <tr><TH>Employee</TH><TH>Department</TH><TH>Designation</TH><TH>Joined</TH><TH>Basic Salary</TH><TH>Status</TH><TH></TH></tr>
          </thead>
          <tbody>
            {filtered.map((e:any)=>(
              <tr key={e.id} style={{transition:'background .1s'}} onMouseOver={ev=>ev.currentTarget.style.background='#fafbff'} onMouseOut={ev=>ev.currentTarget.style.background='#fff'}>
                <TD><div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:13,flexShrink:0}}>{e.first_name?.[0]}{e.last_name?.[0]}</div><div><div style={{fontWeight:600,color:'#0f172a'}}>{e.first_name} {e.last_name}</div><div style={{fontSize:11,color:'#94a3b8'}}>{e.employee_id} · {e.email}</div></div></div></TD>
                <TD>{e.department_name||'—'}</TD>
                <TD>{e.designation_name||'—'}</TD>
                <TD>{fmt(e.joining_date)}</TD>
                <TD style={{fontWeight:600}}>{sar(e.basic_salary)}</TD>
                <TD><Badge s={e.status}/></TD>
                <TD><div style={{display:'flex',gap:6}}><Btn variant="secondary" style={{padding:'4px 12px',fontSize:12}} onClick={()=>open(e)}>Edit</Btn><Btn variant="danger" style={{padding:'4px 12px',fontSize:12}} onClick={()=>{if(confirm('Delete this employee?'))del.mutate(e.id);}}>Del</Btn></div></TD>
              </tr>
            ))}
            {filtered.length===0&&<tr><td colSpan={7} style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:13}}>No employees found</td></tr>}
          </tbody>
        </table>
      </Card>
      {/* Modal */}
      {show&&<Modal title={edit?`Edit — ${edit.first_name} ${edit.last_name}`:'Add New Employee'} onClose={()=>setShow(false)} wide>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <Inp label="First Name" value={form.firstName} onChange={(e:any)=>f('firstName',e.target.value)}/>
          <Inp label="Last Name"  value={form.lastName}  onChange={(e:any)=>f('lastName',e.target.value)}/>
          <Inp label="Email" type="email" value={form.email} onChange={(e:any)=>f('email',e.target.value)}/>
          <Inp label="Phone" value={form.phone} onChange={(e:any)=>f('phone',e.target.value)}/>
          <Inp label="National ID" value={form.nationalId} onChange={(e:any)=>f('nationalId',e.target.value)}/>
          <Inp label="Joining Date" type="date" value={form.joiningDate} onChange={(e:any)=>f('joiningDate',e.target.value)}/>
          <Sel label="Department" value={form.departmentId} onChange={(e:any)=>f('departmentId',e.target.value)}><option value="">— Select —</option>{depts.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}</Sel>
          <Sel label="Designation" value={form.designationId} onChange={(e:any)=>f('designationId',e.target.value)}><option value="">— Select —</option>{desigs.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}</Sel>
          <Sel label="Gender" value={form.gender} onChange={(e:any)=>f('gender',e.target.value)}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></Sel>
          <Sel label="Status" value={form.status} onChange={(e:any)=>f('status',e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="terminated">Terminated</option></Sel>
          <Inp label="Basic Salary (SAR)" type="number" value={form.basicSalary} onChange={(e:any)=>f('basicSalary',e.target.value)}/>
          <Inp label="Housing Allowance" type="number" value={form.housingAllowance} onChange={(e:any)=>f('housingAllowance',e.target.value)}/>
          <Inp label="Transport Allowance" type="number" value={form.transportAllowance} onChange={(e:any)=>f('transportAllowance',e.target.value)}/>
          <Inp label="Bank Name" value={form.bankName} onChange={(e:any)=>f('bankName',e.target.value)}/>
          <div style={{gridColumn:'1/-1'}}><Inp label="Bank Account / IBAN" value={form.bankAccount} onChange={(e:any)=>f('bankAccount',e.target.value)}/></div>
          <div style={{gridColumn:'1/-1'}}><Inp label="Address" value={form.address} onChange={(e:any)=>f('address',e.target.value)}/></div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20}}>
          <Btn variant="secondary" onClick={()=>setShow(false)}>Cancel</Btn>
          <Btn onClick={()=>save.mutate()} style={{opacity:save.isPending?.5:1}}>{save.isPending?'Saving...':'Save Employee'}</Btn>
        </div>
      </Modal>}
    </div>
  );
}

// ─── DEPARTMENTS TAB ─────────────────────────────────────────────────────────
function DepartmentsTab({ toast, qc }: any) {
  const [showD,setShowD]=useState(false);const [editD,setEditD]=useState<any>(null);const [formD,setFormD]=useState({name:'',description:''});
  const [showDes,setShowDes]=useState(false);const [editDes,setEditDes]=useState<any>(null);const [formDes,setFormDes]=useState({name:'',departmentId:'',description:''});
  const {data:depts=[]}=useQuery({queryKey:['departments'],queryFn:()=>api.get('/departments').then(r=>r.data)});
  const {data:desigs=[]}=useQuery({queryKey:['designations'],queryFn:()=>api.get('/designations').then(r=>r.data)});
  const saveD=useMutation({mutationFn:()=>editD?api.put(`/departments/${editD.id}`,formD):api.post('/departments',formD),onSuccess:()=>{qc.invalidateQueries({queryKey:['departments']});toast('Saved');setShowD(false);setEditD(null);setFormD({name:'',description:''});},onError:(e:any)=>toast(getErr(e),'error')});
  const delD=useMutation({mutationFn:(id:string)=>api.delete(`/departments/${id}`),onSuccess:()=>{qc.invalidateQueries({queryKey:['departments']});toast('Deleted');},onError:(e:any)=>toast(getErr(e),'error')});
  const saveDes=useMutation({mutationFn:()=>editDes?api.put(`/designations/${editDes.id}`,formDes):api.post('/designations',formDes),onSuccess:()=>{qc.invalidateQueries({queryKey:['designations']});toast('Saved');setShowDes(false);setEditDes(null);setFormDes({name:'',departmentId:'',description:''});},onError:(e:any)=>toast(getErr(e),'error')});
  const delDes=useMutation({mutationFn:(id:string)=>api.delete(`/designations/${id}`),onSuccess:()=>{qc.invalidateQueries({queryKey:['designations']});toast('Deleted');},onError:(e:any)=>toast(getErr(e),'error')});
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
      {/* Departments */}
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><h3 style={{margin:0,fontSize:15,fontWeight:700,color:'#0f172a'}}>🏢 Departments <span style={{fontSize:12,fontWeight:400,color:'#94a3b8'}}>({depts.length})</span></h3><Btn onClick={()=>{setEditD(null);setFormD({name:'',description:''});setShowD(true);}}>+ Add</Btn></div>
        <Card>
          {depts.length===0&&<p style={{padding:24,textAlign:'center',color:'#94a3b8',fontSize:13}}>No departments yet</p>}
          {depts.map((d:any,i:number)=>(
            <div key={d.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderBottom:i<depts.length-1?'1px solid #f8fafc':'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}><div style={{width:38,height:38,borderRadius:10,background:'#6366f118',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🏢</div><div><p style={{margin:0,fontWeight:600,fontSize:13,color:'#0f172a'}}>{d.name}</p><p style={{margin:0,fontSize:11,color:'#94a3b8'}}>{d.description||'No description'}</p></div></div>
              <div style={{display:'flex',gap:6}}><Btn variant="secondary" style={{padding:'4px 10px',fontSize:11}} onClick={()=>{setEditD(d);setFormD({name:d.name,description:d.description||''});setShowD(true);}}>Edit</Btn><Btn variant="danger" style={{padding:'4px 10px',fontSize:11}} onClick={()=>{if(confirm('Delete?'))delD.mutate(d.id);}}>Del</Btn></div>
            </div>
          ))}
        </Card>
      </div>
      {/* Designations */}
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><h3 style={{margin:0,fontSize:15,fontWeight:700,color:'#0f172a'}}>💼 Designations <span style={{fontSize:12,fontWeight:400,color:'#94a3b8'}}>({desigs.length})</span></h3><Btn onClick={()=>{setEditDes(null);setFormDes({name:'',departmentId:'',description:''});setShowDes(true);}}>+ Add</Btn></div>
        <Card>
          {desigs.length===0&&<p style={{padding:24,textAlign:'center',color:'#94a3b8',fontSize:13}}>No designations yet</p>}
          {desigs.map((d:any,i:number)=>(
            <div key={d.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderBottom:i<desigs.length-1?'1px solid #f8fafc':'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}><div style={{width:38,height:38,borderRadius:10,background:'#8b5cf618',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>💼</div><div><p style={{margin:0,fontWeight:600,fontSize:13,color:'#0f172a'}}>{d.name}</p><p style={{margin:0,fontSize:11,color:'#94a3b8'}}>{d.department_name||'No dept'}</p></div></div>
              <div style={{display:'flex',gap:6}}><Btn variant="secondary" style={{padding:'4px 10px',fontSize:11}} onClick={()=>{setEditDes(d);setFormDes({name:d.name,departmentId:d.department_id||'',description:d.description||''});setShowDes(true);}}>Edit</Btn><Btn variant="danger" style={{padding:'4px 10px',fontSize:11}} onClick={()=>{if(confirm('Delete?'))delDes.mutate(d.id);}}>Del</Btn></div>
            </div>
          ))}
        </Card>
      </div>
      {showD&&<Modal title={editD?'Edit Department':'New Department'} onClose={()=>setShowD(false)}><div style={{display:'flex',flexDirection:'column',gap:12}}><Inp label="Department Name" value={formD.name} onChange={(e:any)=>setFormD(p=>({...p,name:e.target.value}))}/><Inp label="Description" value={formD.description} onChange={(e:any)=>setFormD(p=>({...p,description:e.target.value}))}/></div><div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}><Btn variant="secondary" onClick={()=>setShowD(false)}>Cancel</Btn><Btn onClick={()=>saveD.mutate()} style={{opacity:saveD.isPending?.5:1}}>{saveD.isPending?'Saving...':'Save'}</Btn></div></Modal>}
      {showDes&&<Modal title={editDes?'Edit Designation':'New Designation'} onClose={()=>setShowDes(false)}><div style={{display:'flex',flexDirection:'column',gap:12}}><Inp label="Designation Name" value={formDes.name} onChange={(e:any)=>setFormDes(p=>({...p,name:e.target.value}))}/><Sel label="Department" value={formDes.departmentId} onChange={(e:any)=>setFormDes(p=>({...p,departmentId:e.target.value}))}><option value="">— Select —</option>{depts.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}</Sel><Inp label="Description" value={formDes.description} onChange={(e:any)=>setFormDes(p=>({...p,description:e.target.value}))}/></div><div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}><Btn variant="secondary" onClick={()=>setShowDes(false)}>Cancel</Btn><Btn onClick={()=>saveDes.mutate()} style={{opacity:saveDes.isPending?.5:1}}>{saveDes.isPending?'Saving...':'Save'}</Btn></div></Modal>}
    </div>
  );
}

// ─── ATTENDANCE TAB ───────────────────────────────────────────────────────────
function AttendanceTab({ toast, qc, emps }: any) {
  const [date,setDate]=useState(new Date().toISOString().split('T')[0]);
  const {data:att=[]}=useQuery({queryKey:['att-date',date],queryFn:()=>api.get(`/attendance/date/${date}`).then(r=>r.data)});
  const STATUS_OPTS=['present','absent','late','half_day','on_leave','holiday'];
  const [overrides,setOverrides]=useState<Record<string,string>>({});
  const getStatus=(id:string)=>{const r=att.find((a:any)=>a.employee_id===id);return overrides[id]??r?.status??'present';};
  const setAll=(s:string)=>{const o:Record<string,string>={};activeEmps.forEach((e:any)=>o[e.id]=s);setOverrides(o);};
  const bulk=useMutation({mutationFn:()=>api.post('/attendance/bulk',{records:activeEmps.map((e:any)=>({employeeId:e.id,date,status:getStatus(e.id)}))}),onSuccess:()=>{qc.invalidateQueries({queryKey:['att-date',date]});qc.invalidateQueries({queryKey:['att-today']});toast('Attendance saved');setOverrides({});},onError:(e:any)=>toast(getErr(e),'error')});
  const activeEmps=emps.filter((e:any)=>e.status==='active');
  const present=activeEmps.filter((e:any)=>getStatus(e.id)==='present').length;
  const absent=activeEmps.filter((e:any)=>getStatus(e.id)==='absent').length;
  const STATUS_COLOR2: Record<string,string>={present:'#10b981',absent:'#ef4444',late:'#f59e0b',half_day:'#8b5cf6',on_leave:'#3b82f6',holiday:'#06b6d4'};
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <Inp label="Date" type="date" value={date} onChange={(e:any)=>{setDate(e.target.value);setOverrides({});}}/>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',paddingTop:20}}>
          {STATUS_OPTS.map(s=><button key={s} onClick={()=>setAll(s)} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid '+STATUS_COLOR2[s]+'55',background:STATUS_COLOR2[s]+'11',color:STATUS_COLOR2[s],fontSize:11,fontWeight:700,cursor:'pointer',textTransform:'capitalize'}}>{s.replace('_',' ')}</button>)}
        </div>
        <div style={{marginLeft:'auto',paddingTop:20}}><Btn onClick={()=>bulk.mutate()} style={{opacity:bulk.isPending?.5:1}}>{bulk.isPending?'Saving...':'💾 Save Attendance'}</Btn></div>
      </div>
      <div style={{display:'flex',gap:12}}>
        <Card style={{padding:'12px 20px',flex:1,textAlign:'center'}}><p style={{margin:0,fontSize:11,color:'#94a3b8',fontWeight:600}}>PRESENT</p><p style={{margin:'4px 0 0',fontSize:22,fontWeight:800,color:'#10b981'}}>{present}</p></Card>
        <Card style={{padding:'12px 20px',flex:1,textAlign:'center'}}><p style={{margin:0,fontSize:11,color:'#94a3b8',fontWeight:600}}>ABSENT</p><p style={{margin:'4px 0 0',fontSize:22,fontWeight:800,color:'#ef4444'}}>{absent}</p></Card>
        <Card style={{padding:'12px 20px',flex:1,textAlign:'center'}}><p style={{margin:0,fontSize:11,color:'#94a3b8',fontWeight:600}}>TOTAL</p><p style={{margin:'4px 0 0',fontSize:22,fontWeight:800,color:'#6366f1'}}>{activeEmps.length}</p></Card>
      </div>
      <Card>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead style={{background:'#f8fafc'}}><tr><TH>Employee</TH><TH>Department</TH><TH>Status</TH></tr></thead>
          <tbody>
            {activeEmps.map((e:any)=>(
              <tr key={e.id}>
                <TD><div style={{fontWeight:600,color:'#0f172a'}}>{e.first_name} {e.last_name}</div><div style={{fontSize:11,color:'#94a3b8'}}>{e.employee_id}</div></TD>
                <TD>{e.department_name||'—'}</TD>
                <TD>
                  <select value={getStatus(e.id)} onChange={ev=>setOverrides(p=>({...p,[e.id]:ev.target.value}))} style={{border:'1.5px solid '+(STATUS_COLOR2[getStatus(e.id)]||'#e2e8f0'),borderRadius:8,padding:'5px 10px',fontSize:12,fontWeight:600,color:STATUS_COLOR2[getStatus(e.id)]||'#334155',background:(STATUS_COLOR2[getStatus(e.id)]||'#fff')+'18',outline:'none',cursor:'pointer'}}>
                    {STATUS_OPTS.map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── LEAVE TAB ────────────────────────────────────────────────────────────────
function LeaveTab({ toast, qc, emps }: any) {
  const [sub,setSub]=useState('requests');
  const {data:reqs=[]}=useQuery({queryKey:['leave-reqs'],queryFn:()=>api.get('/leave-requests').then(r=>r.data)});
  const {data:types=[]}=useQuery({queryKey:['leave-types'],queryFn:()=>api.get('/leave-types').then(r=>r.data)});
  const [showR,setShowR]=useState(false);const [formR,setFormR]=useState({employeeId:'',leaveTypeId:'',startDate:'',endDate:'',reason:''});
  const [showT,setShowT]=useState(false);const [formT,setFormT]=useState({name:'',maxDaysPerYear:'',isPaid:'true',description:''});
  const saveR=useMutation({mutationFn:()=>api.post('/leave-requests',formR),onSuccess:()=>{qc.invalidateQueries({queryKey:['leave-reqs']});toast('Request submitted');setShowR(false);setFormR({employeeId:'',leaveTypeId:'',startDate:'',endDate:'',reason:''});},onError:(e:any)=>toast(getErr(e),'error')});
  const saveT=useMutation({mutationFn:()=>api.post('/leave-types',{...formT,maxDaysPerYear:Number(formT.maxDaysPerYear),isPaid:formT.isPaid==='true'}),onSuccess:()=>{qc.invalidateQueries({queryKey:['leave-types']});toast('Leave type added');setShowT(false);setFormT({name:'',maxDaysPerYear:'',isPaid:'true',description:''});},onError:(e:any)=>toast(getErr(e),'error')});
  const approve=useMutation({mutationFn:({id,status}:any)=>api.put(`/leave-requests/${id}/approve`,{status}),onSuccess:()=>{qc.invalidateQueries({queryKey:['leave-reqs']});toast('Updated');},onError:(e:any)=>toast(getErr(e),'error')});
  const pending=reqs.filter((r:any)=>r.status==='pending').length;
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',gap:4,borderBottom:'2px solid #f1f5f9',paddingBottom:0}}>
        {[{id:'requests',label:`📋 Requests${pending?' ('+pending+')':''}`},{id:'types',label:'🗂️ Leave Types'}].map(t=>(
          <button key={t.id} onClick={()=>setSub(t.id)} style={{padding:'8px 20px',border:'none',background:'transparent',fontSize:13,fontWeight:700,cursor:'pointer',borderBottom:sub===t.id?'2px solid #6366f1':'2px solid transparent',marginBottom:-2,color:sub===t.id?'#6366f1':'#64748b',transition:'all .15s'}}>{t.label}</button>
        ))}
      </div>
      {sub==='requests'&&(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',justifyContent:'flex-end'}}><Btn onClick={()=>setShowR(true)}>+ New Request</Btn></div>
          <Card>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead style={{background:'#f8fafc'}}><tr><TH>Employee</TH><TH>Leave Type</TH><TH>From</TH><TH>To</TH><TH>Days</TH><TH>Status</TH><TH>Actions</TH></tr></thead>
              <tbody>
                {reqs.map((r:any)=>(
                  <tr key={r.id}>
                    <TD><div style={{fontWeight:600}}>{r.employee_name}</div></TD>
                    <TD>{r.leave_type_name}</TD>
                    <TD>{fmt(r.start_date)}</TD>
                    <TD>{fmt(r.end_date)}</TD>
                    <TD><span style={{fontWeight:700,color:'#6366f1'}}>{r.total_days}</span></TD>
                    <TD><Badge s={r.status}/></TD>
                    <TD>{r.status==='pending'&&<div style={{display:'flex',gap:6}}><Btn variant="success" style={{padding:'4px 10px',fontSize:11}} onClick={()=>approve.mutate({id:r.id,status:'approved'})}>✓ Approve</Btn><Btn variant="danger" style={{padding:'4px 10px',fontSize:11}} onClick={()=>approve.mutate({id:r.id,status:'rejected'})}>✕ Reject</Btn></div>}</TD>
                  </tr>
                ))}
                {reqs.length===0&&<tr><td colSpan={7} style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:13}}>No leave requests</td></tr>}
              </tbody>
            </table>
          </Card>
          {showR&&<Modal title="New Leave Request" onClose={()=>setShowR(false)}><div style={{display:'flex',flexDirection:'column',gap:12}}><Sel label="Employee" value={formR.employeeId} onChange={(e:any)=>setFormR(p=>({...p,employeeId:e.target.value}))}><option value="">— Select —</option>{emps.map((e:any)=><option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}</Sel><Sel label="Leave Type" value={formR.leaveTypeId} onChange={(e:any)=>setFormR(p=>({...p,leaveTypeId:e.target.value}))}><option value="">— Select —</option>{types.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</Sel><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}><Inp label="Start Date" type="date" value={formR.startDate} onChange={(e:any)=>setFormR(p=>({...p,startDate:e.target.value}))}/><Inp label="End Date" type="date" value={formR.endDate} onChange={(e:any)=>setFormR(p=>({...p,endDate:e.target.value}))}/></div><Inp label="Reason" value={formR.reason} onChange={(e:any)=>setFormR(p=>({...p,reason:e.target.value}))}/></div><div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}><Btn variant="secondary" onClick={()=>setShowR(false)}>Cancel</Btn><Btn onClick={()=>saveR.mutate()} style={{opacity:saveR.isPending?.5:1}}>{saveR.isPending?'Submitting...':'Submit'}</Btn></div></Modal>}
        </div>
      )}
      {sub==='types'&&(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',justifyContent:'flex-end'}}><Btn onClick={()=>setShowT(true)}>+ Add Leave Type</Btn></div>
          <Card>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead style={{background:'#f8fafc'}}><tr><TH>Name</TH><TH>Max Days/Year</TH><TH>Paid</TH><TH>Description</TH></tr></thead>
              <tbody>
                {types.map((t:any)=><tr key={t.id}><TD style={{fontWeight:600}}>{t.name}</TD><TD>{t.max_days_per_year}</TD><TD>{t.is_paid?<Badge s="approved"/>:<Badge s="rejected"/>}</TD><TD style={{color:'#94a3b8'}}>{t.description||'—'}</TD></tr>)}
                {types.length===0&&<tr><td colSpan={4} style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:13}}>No leave types defined</td></tr>}
              </tbody>
            </table>
          </Card>
          {showT&&<Modal title="Add Leave Type" onClose={()=>setShowT(false)}><div style={{display:'flex',flexDirection:'column',gap:12}}><Inp label="Name (e.g. Annual Leave)" value={formT.name} onChange={(e:any)=>setFormT(p=>({...p,name:e.target.value}))}/><Inp label="Max Days Per Year" type="number" value={formT.maxDaysPerYear} onChange={(e:any)=>setFormT(p=>({...p,maxDaysPerYear:e.target.value}))}/><Sel label="Paid Leave?" value={formT.isPaid} onChange={(e:any)=>setFormT(p=>({...p,isPaid:e.target.value}))}><option value="true">Yes — Paid</option><option value="false">No — Unpaid</option></Sel><Inp label="Description" value={formT.description} onChange={(e:any)=>setFormT(p=>({...p,description:e.target.value}))}/></div><div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}><Btn variant="secondary" onClick={()=>setShowT(false)}>Cancel</Btn><Btn onClick={()=>saveT.mutate()} style={{opacity:saveT.isPending?.5:1}}>{saveT.isPending?'Saving...':'Save'}</Btn></div></Modal>}
        </div>
      )}
    </div>
  );
}

// ─── PAYROLL TAB ──────────────────────────────────────────────────────────────
function PayrollTab({ toast, qc }: any) {
  const now=new Date();
  const [month,setMonth]=useState(now.getMonth()+1);
  const [year,setYear]=useState(now.getFullYear());
  const {data:payrolls=[]}=useQuery({queryKey:['payroll',month,year],queryFn:()=>api.get(`/payroll?month=${month}&year=${year}`).then(r=>r.data)});
  const generate=useMutation({mutationFn:()=>api.post('/payroll/generate',{month,year}),onSuccess:()=>{qc.invalidateQueries({queryKey:['payroll',month,year]});qc.invalidateQueries({queryKey:['payroll-summary']});toast('Payroll generated');},onError:(e:any)=>toast(getErr(e),'error')});
  const updateStatus=useMutation({mutationFn:({id,status}:any)=>api.put(`/payroll/${id}/status`,{status}),onSuccess:()=>{qc.invalidateQueries({queryKey:['payroll',month,year]});qc.invalidateQueries({queryKey:['payroll-summary']});toast('Updated');},onError:(e:any)=>toast(getErr(e),'error')});
  const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const draft=payrolls.filter((p:any)=>p.status==='draft').length;
  const approved=payrolls.filter((p:any)=>p.status==='approved').length;
  const paid=payrolls.filter((p:any)=>p.status==='paid').length;
  const totalNet=payrolls.reduce((s:number,p:any)=>s+Number(p.net_salary||0),0);
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'flex-end',gap:12,flexWrap:'wrap'}}>
        <Sel label="Month" value={month} onChange={(e:any)=>setMonth(Number(e.target.value))}>{MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</Sel>
        <Sel label="Year" value={year} onChange={(e:any)=>setYear(Number(e.target.value))}>{[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}</Sel>
        <Btn onClick={()=>generate.mutate()} style={{opacity:generate.isPending?.5:1}}>{generate.isPending?'Generating...':'⚡ Generate Payroll'}</Btn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        <Card style={{padding:'14px 18px'}}><p style={{margin:0,fontSize:11,color:'#94a3b8',fontWeight:600,textTransform:'uppercase'}}>Draft</p><p style={{margin:'4px 0 0',fontSize:22,fontWeight:800,color:'#94a3b8'}}>{draft}</p></Card>
        <Card style={{padding:'14px 18px'}}><p style={{margin:0,fontSize:11,color:'#f59e0b',fontWeight:600,textTransform:'uppercase'}}>Approved</p><p style={{margin:'4px 0 0',fontSize:22,fontWeight:800,color:'#f59e0b'}}>{approved}</p></Card>
        <Card style={{padding:'14px 18px'}}><p style={{margin:0,fontSize:11,color:'#10b981',fontWeight:600,textTransform:'uppercase'}}>Paid</p><p style={{margin:'4px 0 0',fontSize:22,fontWeight:800,color:'#10b981'}}>{paid}</p></Card>
        <Card style={{padding:'14px 18px'}}><p style={{margin:0,fontSize:11,color:'#6366f1',fontWeight:600,textTransform:'uppercase'}}>Total Net</p><p style={{margin:'4px 0 0',fontSize:16,fontWeight:800,color:'#6366f1'}}>{sar(totalNet)}</p></Card>
      </div>
      <Card>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead style={{background:'#f8fafc'}}><tr><TH>Employee</TH><TH>Basic</TH><TH>Allowances</TH><TH>Deductions</TH><TH>Net Salary</TH><TH>Status</TH><TH>Actions</TH></tr></thead>
          <tbody>
            {payrolls.map((p:any)=>(
              <tr key={p.id} onMouseOver={e=>e.currentTarget.style.background='#fafbff'} onMouseOut={e=>e.currentTarget.style.background='#fff'}>
                <TD><div style={{fontWeight:600,color:'#0f172a'}}>{p.employee_name}</div><div style={{fontSize:11,color:'#94a3b8'}}>{p.department_name}</div></TD>
                <TD>{sar(p.basic_salary)}</TD>
                <TD style={{color:'#10b981',fontWeight:600}}>{sar(Number(p.housing_allowance||0)+Number(p.transport_allowance||0)+Number(p.other_allowances||0))}</TD>
                <TD style={{color:'#ef4444',fontWeight:600}}>{sar(p.total_deductions)}</TD>
                <TD style={{fontWeight:800,fontSize:14,color:'#0f172a'}}>{sar(p.net_salary)}</TD>
                <TD><Badge s={p.status}/></TD>
                <TD><div style={{display:'flex',gap:6}}>
                  {p.status==='draft'&&<Btn variant="secondary" style={{padding:'4px 10px',fontSize:11}} onClick={()=>updateStatus.mutate({id:p.id,status:'approved'})}>Approve</Btn>}
                  {p.status==='approved'&&<Btn variant="success" style={{padding:'4px 10px',fontSize:11}} onClick={()=>updateStatus.mutate({id:p.id,status:'paid'})}>Mark Paid</Btn>}
                </div></TD>
              </tr>
            ))}
            {payrolls.length===0&&<tr><td colSpan={7} style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:13}}>No payroll records. Click "Generate Payroll" to start.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
