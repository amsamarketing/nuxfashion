import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';

const sar   = (n:any) => 'SAR\u00a0'+Number(n||0).toLocaleString('en-SA',{minimumFractionDigits:0,maximumFractionDigits:0});
const sarD  = (n:any) => 'SAR\u00a0'+Number(n||0).toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmt   = (d:string) => d?new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
const todayStr = () => new Date().toISOString().split('T')[0];
const gosiAmt  = (basic:any) => Math.round(Number(basic||0)*0.10);
const netSalary = (e:any) => Number(e.basic_salary||0)+Number(e.housing_allowance||0)+Number(e.transport_allowance||0)+Number(e.commission||0)-gosiAmt(e.basic_salary);
const nextPayrollDate = () => { const d=new Date(); d.setMonth(d.getMonth()+1); d.setDate(1); return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); };

const SC:Record<string,string> = {active:'#16a34a',inactive:'#94a3b8',terminated:'#dc2626',present:'#16a34a',absent:'#dc2626',late:'#d97706',half_day:'#7c3aed',on_leave:'#2563eb',holiday:'#0891b2',pending:'#d97706',approved:'#16a34a',rejected:'#dc2626',cancelled:'#94a3b8',draft:'#94a3b8',paid:'#16a34a'};
const Chip=({s}:{s:string})=><span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:700,background:(SC[s]||'#94a3b8')+'18',color:SC[s]||'#64748b'}}><span style={{width:5,height:5,borderRadius:'50%',background:SC[s]||'#94a3b8'}}/>{s.replace(/_/g,' ')}</span>;

const F=({label,...p}:any)=><div><label style={{display:'block',fontSize:11,fontWeight:600,color:'#64748b',marginBottom:4,textTransform:'uppercase',letterSpacing:.4}}>{label}</label><input style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:8,padding:'8px 11px',fontSize:13,outline:'none',boxSizing:'border-box'}} onFocus={e=>e.target.style.borderColor='#2563eb'} onBlur={e=>e.target.style.borderColor='#e2e8f0'} {...p}/></div>;
const S=({label,children,...p}:any)=><div><label style={{display:'block',fontSize:11,fontWeight:600,color:'#64748b',marginBottom:4,textTransform:'uppercase',letterSpacing:.4}}>{label}</label><select style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:8,padding:'8px 11px',fontSize:13,outline:'none',boxSizing:'border-box',background:'#fff'}} {...p}>{children}</select></div>;
const Dlg=({title,onClose,children,wide}:any)=><div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.35)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}><div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:wide?800:480,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px',borderBottom:'1px solid #f1f5f9'}}><h3 style={{margin:0,fontSize:15,fontWeight:700}}>{title}</h3><button onClick={onClose} style={{border:'none',background:'#f1f5f9',borderRadius:8,width:30,height:30,cursor:'pointer',fontSize:16,color:'#64748b'}}>✕</button></div><div style={{padding:22}}>{children}</div></div></div>;
const TH=({ch,style}:any)=><th style={{padding:'10px 14px',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,textAlign:'left',whiteSpace:'nowrap',...style}}>{ch}</th>;
const TD=({ch,style}:any)=><td style={{padding:'13px 14px',fontSize:13,borderTop:'1px solid #f8fafc',color:'#334155',...style}}>{ch}</td>;
const Btn=({ch,variant='blue',...p}:any)=>{const V:any={blue:{background:'#2563eb',color:'#fff',border:'none'},ghost:{background:'#f8fafc',color:'#475569',border:'1.5px solid #e2e8f0'},red:{background:'#fef2f2',color:'#dc2626',border:'1.5px solid #fecaca'},green:{background:'#f0fdf4',color:'#16a34a',border:'1.5px solid #bbf7d0'}};return<button style={{...V[variant],padding:'8px 16px',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',...p.style}} {...p}>{ch}</button>;};

const TABS=[{id:'employees',l:'Employees'},{id:'attendance',l:'Attendance'},{id:'payroll',l:'Payroll'},{id:'commissions',l:'Commissions'},{id:'gosi',l:'GOSI'},{id:'leave',l:'Leave'},{id:'schedules',l:'Schedules'}];

export default function HR() {
  const {toast}=useToast(); const qc=useQueryClient();
  const [tab,setTab]=useState('employees');
  const {data:emps=[]}=useQuery({queryKey:['employees'],queryFn:()=>api.get('/employees').then(r=>r.data)});
  const {data:attToday=[]}=useQuery({queryKey:['att-today'],queryFn:()=>api.get(`/attendance/date/${todayStr()}`).then(r=>r.data)});
  const now=new Date();
  const {data:paySum}=useQuery({queryKey:['paysum',now.getMonth()+1,now.getFullYear()],queryFn:()=>api.get(`/payroll/summary?month=${now.getMonth()+1}&year=${now.getFullYear()}`).then(r=>r.data)});

  const active=emps.filter((e:any)=>e.status==='active');
  const presentN=attToday.filter((a:any)=>a.status==='present').length;
  const onLeaveN=attToday.filter((a:any)=>a.status==='on_leave').length;
  const lateN=attToday.filter((a:any)=>a.status==='late').length;
  const totalBasic=active.reduce((s:number,e:any)=>s+Number(e.basic_salary||0),0);
  const totalGosi=active.reduce((s:number,e:any)=>s+gosiAmt(e.basic_salary),0);
  const totalComm=active.reduce((s:number,e:any)=>s+Number(e.commission||0),0);

  const exportWPS=()=>{
    const rows=[['EMP ID','Name','Bank','IBAN','Net Pay'],...active.map((e:any)=>[e.employee_id,`${e.first_name} ${e.last_name}`,e.bank_name||'',e.bank_account||'',netSalary(e)])];
    const csv=rows.map(r=>r.join(',')).join('\n');
    const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download=`WPS_${now.getFullYear()}_${now.getMonth()+1}.csv`;a.click();
    toast('WPS file downloaded');
  };

  const STATS=[
    {l:'Total employees',v:emps.length},
    {l:'Present today',v:presentN,c:'#16a34a'},
    {l:'On leave',v:onLeaveN,c:'#2563eb'},
    {l:'Late today',v:lateN,c:'#d97706'},
    {l:'Monthly payroll',v:sar(paySum?.total_net||totalBasic),big:true},
    {l:'GOSI due (10%)',v:sar(totalGosi),big:true},
    {l:'Commissions',v:sar(totalComm),big:true},
  ];

  return (
    <div style={{padding:'24px 28px',minHeight:'100%',background:'#f8fafc',fontFamily:'inherit'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 style={{margin:0,fontSize:20,fontWeight:800,color:'#0f172a'}}>HR & payroll</h1>
          <p style={{margin:'4px 0 0',fontSize:13,color:'#64748b'}}>{emps.length} employees · Next payroll: {nextPayrollDate()}</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <Btn variant="ghost" ch="📄 WPS / Mudad export" onClick={exportWPS}/>
          <Btn ch="+ Add employee" onClick={()=>window.dispatchEvent(new CustomEvent('hr-add-emp'))}/>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'7px 18px',borderRadius:99,fontSize:13,fontWeight:600,cursor:'pointer',border:tab===t.id?'2px solid #2563eb':'2px solid #e2e8f0',background:tab===t.id?'#eff6ff':'#fff',color:tab===t.id?'#2563eb':'#64748b',transition:'all .15s'}}>{t.l}{t.id==='employees'?` (${emps.length})`:''}</button>)}
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:10,marginBottom:22}}>
        {STATS.map((s,i)=><div key={i} style={{background:'#fff',borderRadius:12,border:'1px solid #f1f5f9',padding:'14px 16px'}}><p style={{margin:0,fontSize:11,color:'#94a3b8',fontWeight:500}}>{s.l}</p><p style={{margin:'4px 0 0',fontSize:s.big?16:24,fontWeight:800,color:s.c||'#0f172a',lineHeight:1.2}}>{s.v}</p></div>)}
      </div>

      {/* Content */}
      {tab==='employees'   && <EmployeesTab   toast={toast} qc={qc} emps={emps}/>}
      {tab==='attendance'  && <AttendanceTab  toast={toast} qc={qc} emps={emps}/>}
      {tab==='payroll'     && <PayrollTab     toast={toast} qc={qc}/>}
      {tab==='commissions' && <CommissionsTab toast={toast} qc={qc} emps={emps}/>}
      {tab==='gosi'        && <GosiTab        emps={emps}/>}
      {tab==='leave'       && <LeaveTab       toast={toast} qc={qc} emps={emps}/>}
      {tab==='schedules'   && <SchedulesTab   toast={toast} qc={qc} emps={emps}/>}
    </div>
  );
}

// ── EMPLOYEES TAB ─────────────────────────────────────────────────────────────
const E0={firstName:'',lastName:'',email:'',phone:'',nationalId:'',joiningDate:new Date().toISOString().split('T')[0],departmentId:'',designationId:'',branch:'',gender:'male',status:'active',basicSalary:'',housingAllowance:'',transportAllowance:'',commission:'',bankName:'',bankAccount:'',address:''};
function EmployeesTab({toast,qc,emps}:any){
  const [show,setShow]=useState(false);
  const [edit,setEdit]=useState<any>(null);
  const [form,setForm]=useState({...E0});
  const [search,setSearch]=useState('');
  const [filterStatus,setFilterStatus]=useState('all');
  const f=(k:string,v:string)=>setForm(p=>({...p,[k]:v}));
  const {data:depts=[]}=useQuery({queryKey:['departments'],queryFn:()=>api.get('/departments').then(r=>r.data)});
  const {data:desigs=[]}=useQuery({queryKey:['designations'],queryFn:()=>api.get('/designations').then(r=>r.data)});
  const save=useMutation({mutationFn:()=>{const body={...form,basicSalary:Number(form.basicSalary),housingAllowance:Number(form.housingAllowance),transportAllowance:Number(form.transportAllowance),commission:Number(form.commission)};return edit?api.put(`/employees/${edit.id}`,body):api.post('/employees',body);},onSuccess:()=>{qc.invalidateQueries({queryKey:['employees']});toast('Saved');setShow(false);setEdit(null);setForm({...E0});},onError:(e:any)=>toast(getErr(e),'error')});
  const del=useMutation({mutationFn:(id:string)=>api.delete(`/employees/${id}`),onSuccess:()=>{qc.invalidateQueries({queryKey:['employees']});toast('Deleted');},onError:(e:any)=>toast(getErr(e),'error')});
  const open=(emp?:any)=>{if(emp){setEdit(emp);setForm({firstName:emp.first_name,lastName:emp.last_name,email:emp.email,phone:emp.phone||'',nationalId:emp.national_id||'',joiningDate:emp.joining_date?.split('T')[0]||'',departmentId:emp.department_id||'',designationId:emp.designation_id||'',branch:emp.branch||'',gender:emp.gender||'male',status:emp.status||'active',basicSalary:emp.basic_salary||'',housingAllowance:emp.housing_allowance||'',transportAllowance:emp.transport_allowance||'',commission:emp.commission||'',bankName:emp.bank_name||'',bankAccount:emp.bank_account||'',address:emp.address||''});}else{setEdit(null);setForm({...E0});}setShow(true);};
  // listen for global add-employee event from header button
  useState(()=>{const h=()=>open();window.addEventListener('hr-add-emp',h);return()=>window.removeEventListener('hr-add-emp',h);});
  const rows=useMemo(()=>emps.filter((e:any)=>{const q=search.toLowerCase();const matchQ=!q||`${e.first_name} ${e.last_name} ${e.email} ${e.employee_id}`.toLowerCase().includes(q);const matchS=filterStatus==='all'||e.status===filterStatus;return matchQ&&matchS;}),[emps,search,filterStatus]);
  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:1,minWidth:200}}>
          <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:14,color:'#94a3b8'}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, ID, email…" style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:9,padding:'8px 12px 8px 32px',fontSize:13,outline:'none',boxSizing:'border-box'}}/>
        </div>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{border:'1.5px solid #e2e8f0',borderRadius:9,padding:'8px 12px',fontSize:13,outline:'none',background:'#fff',color:'#475569'}}>
          <option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="terminated">Terminated</option>
        </select>
        <span style={{fontSize:12,color:'#94a3b8'}}>{rows.length} of {emps.length}</span>
      </div>
      <div style={{background:'#fff',borderRadius:12,border:'1px solid #f1f5f9',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead style={{background:'#f8fafc'}}><tr>
            <TH ch="Employee"/><TH ch="Branch & Role"/><TH ch="Status"/><TH ch="Basic salary"/><TH ch="Commission"/><TH ch="GOSI (10%)"/><TH ch="Net pay"/><TH ch=""/>
          </tr></thead>
          <tbody>
            {rows.map((e:any)=>(
              <tr key={e.id} style={{transition:'background .1s',cursor:'default'}} onMouseOver={ev=>ev.currentTarget.style.background='#f8fafc'} onMouseOut={ev=>ev.currentTarget.style.background='#fff'}>
                <TD ch={<div><div style={{fontWeight:600,color:'#0f172a'}}>{e.first_name} {e.last_name} <span style={{color:'#94a3b8',fontWeight:400}}>· #{e.employee_id}</span></div><div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{e.email}</div></div>}/>
                <TD ch={<span style={{color:'#475569'}}>{[e.branch,e.designation_name||e.department_name].filter(Boolean).join(' · ')||'—'}</span>}/>
                <TD ch={<Chip s={e.status}/>}/>
                <TD ch={<span style={{fontWeight:500}}>{sar(e.basic_salary)}</span>}/>
                <TD ch={<span style={{color:Number(e.commission)>0?'#16a34a':'#94a3b8'}}>{sar(e.commission)}</span>}/>
                <TD ch={<span style={{color:'#d97706'}}>{sar(gosiAmt(e.basic_salary))}</span>}/>
                <TD ch={<span style={{fontWeight:700,color:'#0f172a'}}>{sar(netSalary(e))}</span>}/>
                <TD ch={<div style={{display:'flex',gap:6}}><Btn variant="ghost" ch="Edit" style={{padding:'4px 12px',fontSize:11}} onClick={()=>open(e)}/><Btn variant="red" ch="Del" style={{padding:'4px 12px',fontSize:11}} onClick={()=>{if(confirm('Delete?'))del.mutate(e.id);}}/></div>}/>
              </tr>
            ))}
            {rows.length===0&&<tr><td colSpan={8} style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:13}}>No employees found</td></tr>}
          </tbody>
        </table>
      </div>
      {show&&<Dlg title={edit?`Edit — ${edit.first_name} ${edit.last_name}`:'Add New Employee'} onClose={()=>setShow(false)} wide>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
          <F label="First Name" value={form.firstName} onChange={(e:any)=>f('firstName',e.target.value)}/>
          <F label="Last Name"  value={form.lastName}  onChange={(e:any)=>f('lastName',e.target.value)}/>
          <F label="Email" type="email" value={form.email} onChange={(e:any)=>f('email',e.target.value)}/>
          <F label="Phone" value={form.phone} onChange={(e:any)=>f('phone',e.target.value)}/>
          <F label="National ID" value={form.nationalId} onChange={(e:any)=>f('nationalId',e.target.value)}/>
          <F label="Joining Date" type="date" value={form.joiningDate} onChange={(e:any)=>f('joiningDate',e.target.value)}/>
          <S label="Department" value={form.departmentId} onChange={(e:any)=>f('departmentId',e.target.value)}><option value="">— Select —</option>{depts.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}</S>
          <S label="Designation" value={form.designationId} onChange={(e:any)=>f('designationId',e.target.value)}><option value="">— Select —</option>{desigs.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}</S>
          <F label="Branch" value={form.branch} onChange={(e:any)=>f('branch',e.target.value)} placeholder="e.g. Riyadh"/>
          <S label="Gender" value={form.gender} onChange={(e:any)=>f('gender',e.target.value)}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></S>
          <S label="Status" value={form.status} onChange={(e:any)=>f('status',e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="terminated">Terminated</option></S>
          <F label="Basic Salary (SAR)" type="number" value={form.basicSalary} onChange={(e:any)=>f('basicSalary',e.target.value)}/>
          <F label="Housing Allowance" type="number" value={form.housingAllowance} onChange={(e:any)=>f('housingAllowance',e.target.value)}/>
          <F label="Transport Allowance" type="number" value={form.transportAllowance} onChange={(e:any)=>f('transportAllowance',e.target.value)}/>
          <F label="Commission (SAR)" type="number" value={form.commission} onChange={(e:any)=>f('commission',e.target.value)}/>
          <F label="Bank Name" value={form.bankName} onChange={(e:any)=>f('bankName',e.target.value)}/>
          <F label="Bank Account / IBAN" value={form.bankAccount} onChange={(e:any)=>f('bankAccount',e.target.value)}/>
          <div style={{gridColumn:'1/-1'}}><F label="Address" value={form.address} onChange={(e:any)=>f('address',e.target.value)}/></div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:18}}>
          <Btn variant="ghost" ch="Cancel" onClick={()=>setShow(false)}/>
          <Btn ch={save.isPending?'Saving…':'Save Employee'} style={{opacity:save.isPending?.6:1}} onClick={()=>save.mutate()}/>
        </div>
      </Dlg>}
    </div>
  );
}

// ── ATTENDANCE TAB ────────────────────────────────────────────────────────────
function AttendanceTab({toast,qc,emps}:any){
  const [date,setDate]=useState(todayStr());
  const {data:att=[]}=useQuery({queryKey:['att-date',date],queryFn:()=>api.get(`/attendance/date/${date}`).then(r=>r.data)});
  const SOPTS=['present','absent','late','half_day','on_leave','holiday'];
  const SC2:Record<string,string>={present:'#16a34a',absent:'#dc2626',late:'#d97706',half_day:'#7c3aed',on_leave:'#2563eb',holiday:'#0891b2'};
  const [ov,setOv]=useState<Record<string,string>>({});
  const gs=(id:string)=>{const r=att.find((a:any)=>a.employee_id===id);return ov[id]??r?.status??'present';};
  const setAll=(s:string)=>{const o:Record<string,string>={};active.forEach((e:any)=>{o[e.id]=s;});setOv(o);};
  const active=emps.filter((e:any)=>e.status==='active');
  const bulk=useMutation({mutationFn:()=>api.post('/attendance/bulk',{records:active.map((e:any)=>({employeeId:e.id,date,status:gs(e.id)}))}),onSuccess:()=>{qc.invalidateQueries({queryKey:['att-date',date]});qc.invalidateQueries({queryKey:['att-today']});toast('Attendance saved');setOv({});},onError:(e:any)=>toast(getErr(e),'error')});
  const counts:Record<string,number>={};SOPTS.forEach(s=>{counts[s]=active.filter((e:any)=>gs(e.id)===s).length;});
  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',alignItems:'flex-end',gap:12,flexWrap:'wrap'}}>
        <F label="Date" type="date" value={date} onChange={(e:any)=>{setDate(e.target.value);setOv({});}}/>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {SOPTS.map(s=><button key={s} onClick={()=>setAll(s)} style={{padding:'6px 14px',borderRadius:8,border:`1.5px solid ${SC2[s]}55`,background:`${SC2[s]}11`,color:SC2[s],fontSize:11,fontWeight:700,cursor:'pointer',textTransform:'capitalize'}}>{s.replace('_',' ')} all</button>)}
        </div>
        <div style={{marginLeft:'auto'}}><Btn ch={bulk.isPending?'Saving…':'💾 Save Attendance'} style={{opacity:bulk.isPending?.6:1}} onClick={()=>bulk.mutate()}/></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10}}>
        {SOPTS.map(s=><div key={s} style={{background:'#fff',borderRadius:10,border:`1.5px solid ${SC2[s]}33`,padding:'10px 14px'}}><p style={{margin:0,fontSize:10,fontWeight:700,color:SC2[s],textTransform:'capitalize'}}>{s.replace('_',' ')}</p><p style={{margin:'4px 0 0',fontSize:20,fontWeight:800,color:'#0f172a'}}>{counts[s]||0}</p></div>)}
      </div>
      <div style={{background:'#fff',borderRadius:12,border:'1px solid #f1f5f9',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead style={{background:'#f8fafc'}}><tr><TH ch="Employee"/><TH ch="Branch & Role"/><TH ch="Status"/></tr></thead>
          <tbody>
            {active.map((e:any)=>(
              <tr key={e.id}>
                <TD ch={<div><div style={{fontWeight:600}}>{e.first_name} {e.last_name}</div><div style={{fontSize:11,color:'#94a3b8'}}>{e.employee_id}</div></div>}/>
                <TD ch={<span style={{color:'#64748b'}}>{[e.branch,e.department_name].filter(Boolean).join(' · ')||'—'}</span>}/>
                <TD ch={<select value={gs(e.id)} onChange={ev=>setOv(p=>({...p,[e.id]:ev.target.value}))} style={{border:`1.5px solid ${SC2[gs(e.id)]}`,borderRadius:8,padding:'5px 10px',fontSize:12,fontWeight:700,color:SC2[gs(e.id)],background:`${SC2[gs(e.id)]}11`,outline:'none',cursor:'pointer'}}>
                  {SOPTS.map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                </select>}/>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── PAYROLL TAB ───────────────────────────────────────────────────────────────
function PayrollTab({toast,qc}:any){
  const now=new Date();
  const [month,setMonth]=useState(now.getMonth()+1);
  const [year,setYear]=useState(now.getFullYear());
  const {data:rows=[]}=useQuery({queryKey:['payroll',month,year],queryFn:()=>api.get(`/payroll?month=${month}&year=${year}`).then(r=>r.data)});
  const gen=useMutation({mutationFn:()=>api.post('/payroll/generate',{month,year}),onSuccess:()=>{qc.invalidateQueries({queryKey:['payroll',month,year]});toast('Payroll generated');},onError:(e:any)=>toast(getErr(e),'error')});
  const upd=useMutation({mutationFn:({id,status}:any)=>api.put(`/payroll/${id}/status`,{status}),onSuccess:()=>{qc.invalidateQueries({queryKey:['payroll',month,year]});toast('Updated');},onError:(e:any)=>toast(getErr(e),'error')});
  const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const draft=rows.filter((p:any)=>p.status==='draft').length;
  const approved=rows.filter((p:any)=>p.status==='approved').length;
  const paid=rows.filter((p:any)=>p.status==='paid').length;
  const totalNet=rows.reduce((s:number,p:any)=>s+Number(p.net_salary||0),0);
  const approveAll=()=>Promise.all(rows.filter((p:any)=>p.status==='draft').map((p:any)=>upd.mutateAsync({id:p.id,status:'approved'})));
  const payAll=()=>Promise.all(rows.filter((p:any)=>p.status==='approved').map((p:any)=>upd.mutateAsync({id:p.id,status:'paid'})));
  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',alignItems:'flex-end',gap:10,flexWrap:'wrap'}}>
        <S label="Month" value={month} onChange={(e:any)=>setMonth(Number(e.target.value))}>{MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</S>
        <S label="Year" value={year} onChange={(e:any)=>setYear(Number(e.target.value))}>{[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}</S>
        <Btn ch={gen.isPending?'Generating…':'⚡ Generate Payroll'} style={{opacity:gen.isPending?.6:1}} onClick={()=>gen.mutate()}/>
        {draft>0&&<Btn variant="ghost" ch={`✓ Approve All (${draft})`} onClick={approveAll}/>}
        {approved>0&&<Btn variant="green" ch={`💳 Pay All (${approved})`} onClick={payAll}/>}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
        {[{l:'Draft',v:draft,c:'#94a3b8'},{l:'Approved',v:approved,c:'#d97706'},{l:'Paid',v:paid,c:'#16a34a'},{l:'Total Net',v:sar(totalNet),c:'#2563eb',big:true}].map((s,i)=>(
          <div key={i} style={{background:'#fff',borderRadius:12,border:'1px solid #f1f5f9',padding:'14px 18px'}}><p style={{margin:0,fontSize:11,fontWeight:700,color:s.c,textTransform:'uppercase'}}>{s.l}</p><p style={{margin:'4px 0 0',fontSize:s.big?16:24,fontWeight:800,color:'#0f172a'}}>{s.v}</p></div>
        ))}
      </div>
      <div style={{background:'#fff',borderRadius:12,border:'1px solid #f1f5f9',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead style={{background:'#f8fafc'}}><tr><TH ch="Employee"/><TH ch="Basic"/><TH ch="Allowances"/><TH ch="Commission"/><TH ch="GOSI"/><TH ch="Deductions"/><TH ch="Net Salary"/><TH ch="Status"/><TH ch=""/></tr></thead>
          <tbody>
            {rows.map((p:any)=>(
              <tr key={p.id} onMouseOver={e=>e.currentTarget.style.background='#f8fafc'} onMouseOut={e=>e.currentTarget.style.background='#fff'}>
                <TD ch={<div><div style={{fontWeight:600,color:'#0f172a'}}>{p.employee_name}</div><div style={{fontSize:11,color:'#94a3b8'}}>{p.department_name}</div></div>}/>
                <TD ch={sar(p.basic_salary)}/>
                <TD ch={<span style={{color:'#16a34a'}}>{sar(Number(p.housing_allowance||0)+Number(p.transport_allowance||0)+Number(p.other_allowances||0))}</span>}/>
                <TD ch={<span style={{color:'#16a34a'}}>{sar(p.commission||0)}</span>}/>
                <TD ch={<span style={{color:'#d97706'}}>{sar(gosiAmt(p.basic_salary))}</span>}/>
                <TD ch={<span style={{color:'#dc2626'}}>{sar(p.total_deductions)}</span>}/>
                <TD ch={<span style={{fontWeight:800,fontSize:14}}>{sar(p.net_salary)}</span>}/>
                <TD ch={<Chip s={p.status}/>}/>
                <TD ch={<div style={{display:'flex',gap:4}}>
                  {p.status==='draft'&&<Btn variant="ghost" ch="Approve" style={{padding:'4px 10px',fontSize:11}} onClick={()=>upd.mutate({id:p.id,status:'approved'})}/>}
                  {p.status==='approved'&&<Btn variant="green" ch="Mark Paid" style={{padding:'4px 10px',fontSize:11}} onClick={()=>upd.mutate({id:p.id,status:'paid'})}/>}
                </div>}/>
              </tr>
            ))}
            {rows.length===0&&<tr><td colSpan={9} style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:13}}>No payroll records — click Generate Payroll to start</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── COMMISSIONS TAB ───────────────────────────────────────────────────────────
function CommissionsTab({toast,qc,emps}:any){
  const [edit,setEdit]=useState<any>(null);
  const [val,setVal]=useState('');
  const save=useMutation({mutationFn:()=>api.put(`/employees/${edit.id}`,{...edit,commission:Number(val),basicSalary:edit.basic_salary,housingAllowance:edit.housing_allowance,transportAllowance:edit.transport_allowance}),onSuccess:()=>{qc.invalidateQueries({queryKey:['employees']});toast('Commission updated');setEdit(null);},onError:(e:any)=>toast(getErr(e),'error')});
  const activeEmps=emps.filter((e:any)=>e.status==='active');
  const total=activeEmps.reduce((s:number,e:any)=>s+Number(e.commission||0),0);
  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',gap:10}}>
        <div style={{background:'#fff',borderRadius:12,border:'1px solid #f1f5f9',padding:'14px 20px',flex:1}}><p style={{margin:0,fontSize:11,color:'#94a3b8',fontWeight:600,textTransform:'uppercase'}}>Total Commissions</p><p style={{margin:'4px 0 0',fontSize:22,fontWeight:800,color:'#16a34a'}}>{sar(total)}</p></div>
        <div style={{background:'#fff',borderRadius:12,border:'1px solid #f1f5f9',padding:'14px 20px',flex:1}}><p style={{margin:0,fontSize:11,color:'#94a3b8',fontWeight:600,textTransform:'uppercase'}}>Employees with Commission</p><p style={{margin:'4px 0 0',fontSize:22,fontWeight:800,color:'#2563eb'}}>{activeEmps.filter((e:any)=>Number(e.commission)>0).length}</p></div>
      </div>
      <div style={{background:'#fff',borderRadius:12,border:'1px solid #f1f5f9',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead style={{background:'#f8fafc'}}><tr><TH ch="Employee"/><TH ch="Branch & Role"/><TH ch="Basic Salary"/><TH ch="Commission"/><TH ch="Total Comp"/><TH ch=""/></tr></thead>
          <tbody>
            {activeEmps.map((e:any)=>(
              <tr key={e.id} onMouseOver={ev=>ev.currentTarget.style.background='#f8fafc'} onMouseOut={ev=>ev.currentTarget.style.background='#fff'}>
                <TD ch={<div><div style={{fontWeight:600}}>{e.first_name} {e.last_name}</div><div style={{fontSize:11,color:'#94a3b8'}}>#{e.employee_id}</div></div>}/>
                <TD ch={<span style={{color:'#64748b'}}>{[e.branch,e.designation_name||e.department_name].filter(Boolean).join(' · ')||'—'}</span>}/>
                <TD ch={sar(e.basic_salary)}/>
                <TD ch={<span style={{fontWeight:700,color:Number(e.commission)>0?'#16a34a':'#94a3b8'}}>{sar(e.commission)}</span>}/>
                <TD ch={<span style={{fontWeight:700}}>{sar(Number(e.basic_salary||0)+Number(e.commission||0))}</span>}/>
                <TD ch={<Btn variant="ghost" ch="Edit" style={{padding:'4px 12px',fontSize:11}} onClick={()=>{setEdit(e);setVal(e.commission||'0');}}/>}/>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit&&<Dlg title={`Commission — ${edit.first_name} ${edit.last_name}`} onClose={()=>setEdit(null)}>
        <F label="Commission Amount (SAR)" type="number" value={val} onChange={(e:any)=>setVal(e.target.value)}/>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}>
          <Btn variant="ghost" ch="Cancel" onClick={()=>setEdit(null)}/>
          <Btn ch={save.isPending?'Saving…':'Save'} style={{opacity:save.isPending?.6:1}} onClick={()=>save.mutate()}/>
        </div>
      </Dlg>}
    </div>
  );
}

// ── GOSI TAB ──────────────────────────────────────────────────────────────────
function GosiTab({emps}:any){
  const activeEmps=emps.filter((e:any)=>e.status==='active');
  const totalBasic=activeEmps.reduce((s:number,e:any)=>s+Number(e.basic_salary||0),0);
  const totalGosi=activeEmps.reduce((s:number,e:any)=>s+gosiAmt(e.basic_salary),0);
  const empShare=activeEmps.reduce((s:number,e:any)=>s+Math.round(Number(e.basic_salary||0)*0.0975),0);
  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {[{l:'Total Basic Salaries',v:sar(totalBasic),c:'#2563eb'},{l:'Employer GOSI (10%)',v:sar(totalGosi),c:'#d97706'},{l:'Employee GOSI (9.75%)',v:sar(empShare),c:'#7c3aed'}].map((s,i)=>(
          <div key={i} style={{background:'#fff',borderRadius:12,border:'1px solid #f1f5f9',padding:'18px 20px'}}><p style={{margin:0,fontSize:11,fontWeight:700,color:s.c,textTransform:'uppercase'}}>{s.l}</p><p style={{margin:'6px 0 0',fontSize:20,fontWeight:800,color:'#0f172a'}}>{s.v}</p></div>
        ))}
      </div>
      <div style={{background:'#e0f2fe',borderRadius:10,padding:'12px 16px',fontSize:13,color:'#0369a1',fontWeight:500}}>
        ℹ️ <strong>GOSI rates:</strong> Employer contribution 10% · Employee contribution 9.75% of basic salary (Saudi nationals). Expats are generally exempt from GOSI contributions.
      </div>
      <div style={{background:'#fff',borderRadius:12,border:'1px solid #f1f5f9',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead style={{background:'#f8fafc'}}><tr><TH ch="Employee"/><TH ch="National ID"/><TH ch="Basic Salary"/><TH ch="Employer (10%)"/><TH ch="Employee (9.75%)"/><TH ch="Total GOSI"/></tr></thead>
          <tbody>
            {activeEmps.map((e:any)=>{
              const emp10=Math.round(Number(e.basic_salary||0)*0.10);
              const emp975=Math.round(Number(e.basic_salary||0)*0.0975);
              return(
                <tr key={e.id} onMouseOver={ev=>ev.currentTarget.style.background='#f8fafc'} onMouseOut={ev=>ev.currentTarget.style.background='#fff'}>
                  <TD ch={<div><div style={{fontWeight:600}}>{e.first_name} {e.last_name}</div><div style={{fontSize:11,color:'#94a3b8'}}>#{e.employee_id}</div></div>}/>
                  <TD ch={<span style={{color:'#64748b'}}>{e.national_id||'—'}</span>}/>
                  <TD ch={sar(e.basic_salary)}/>
                  <TD ch={<span style={{color:'#d97706',fontWeight:600}}>{sar(emp10)}</span>}/>
                  <TD ch={<span style={{color:'#7c3aed',fontWeight:600}}>{sar(emp975)}</span>}/>
                  <TD ch={<span style={{fontWeight:800,color:'#0f172a'}}>{sar(emp10+emp975)}</span>}/>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── LEAVE TAB ─────────────────────────────────────────────────────────────────
function LeaveTab({toast,qc,emps}:any){
  const [sub,setSub]=useState('requests');
  const {data:reqs=[]}=useQuery({queryKey:['leave-reqs'],queryFn:()=>api.get('/leave-requests').then(r=>r.data)});
  const {data:types=[]}=useQuery({queryKey:['leave-types'],queryFn:()=>api.get('/leave-types').then(r=>r.data)});
  const [showR,setShowR]=useState(false);
  const [formR,setFormR]=useState({employeeId:'',leaveTypeId:'',startDate:'',endDate:'',reason:''});
  const [showT,setShowT]=useState(false);
  const [formT,setFormT]=useState({name:'',maxDaysPerYear:'',isPaid:'true',description:''});
  const saveR=useMutation({mutationFn:()=>api.post('/leave-requests',formR),onSuccess:()=>{qc.invalidateQueries({queryKey:['leave-reqs']});toast('Request submitted');setShowR(false);setFormR({employeeId:'',leaveTypeId:'',startDate:'',endDate:'',reason:''});},onError:(e:any)=>toast(getErr(e),'error')});
  const saveT=useMutation({mutationFn:()=>api.post('/leave-types',{...formT,maxDaysPerYear:Number(formT.maxDaysPerYear),isPaid:formT.isPaid==='true'}),onSuccess:()=>{qc.invalidateQueries({queryKey:['leave-types']});toast('Leave type added');setShowT(false);setFormT({name:'',maxDaysPerYear:'',isPaid:'true',description:''});},onError:(e:any)=>toast(getErr(e),'error')});
  const approve=useMutation({mutationFn:({id,status}:any)=>api.put(`/leave-requests/${id}/approve`,{status}),onSuccess:()=>qc.invalidateQueries({queryKey:['leave-reqs']}),onError:(e:any)=>toast(getErr(e),'error')});
  const pending=reqs.filter((r:any)=>r.status==='pending').length;
  const approved=reqs.filter((r:any)=>r.status==='approved').length;
  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',gap:4,borderBottom:'2px solid #f1f5f9'}}>
        {[{id:'requests',l:`Requests${pending?` (${pending} pending)`:''}`},{id:'types',l:'Leave Types'}].map(t=>(
          <button key={t.id} onClick={()=>setSub(t.id)} style={{padding:'8px 20px',border:'none',background:'transparent',fontSize:13,fontWeight:700,cursor:'pointer',borderBottom:sub===t.id?'2px solid #2563eb':'2px solid transparent',marginBottom:-2,color:sub===t.id?'#2563eb':'#64748b',transition:'all .15s'}}>{t.l}</button>
        ))}
      </div>
      {sub==='requests'&&(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',gap:10}}>
            <div style={{background:'#fff',borderRadius:10,border:'1px solid #f1f5f9',padding:'12px 18px',flex:1,textAlign:'center'}}><p style={{margin:0,fontSize:11,color:'#d97706',fontWeight:700,textTransform:'uppercase'}}>Pending</p><p style={{margin:'4px 0 0',fontSize:22,fontWeight:800,color:'#0f172a'}}>{pending}</p></div>
            <div style={{background:'#fff',borderRadius:10,border:'1px solid #f1f5f9',padding:'12px 18px',flex:1,textAlign:'center'}}><p style={{margin:0,fontSize:11,color:'#16a34a',fontWeight:700,textTransform:'uppercase'}}>Approved</p><p style={{margin:'4px 0 0',fontSize:22,fontWeight:800,color:'#0f172a'}}>{approved}</p></div>
            <div style={{background:'#fff',borderRadius:10,border:'1px solid #f1f5f9',padding:'12px 18px',flex:1,textAlign:'center'}}><p style={{margin:0,fontSize:11,color:'#64748b',fontWeight:700,textTransform:'uppercase'}}>Total</p><p style={{margin:'4px 0 0',fontSize:22,fontWeight:800,color:'#0f172a'}}>{reqs.length}</p></div>
            <div style={{flex:3}}/>
            <Btn ch="+ New Request" onClick={()=>setShowR(true)}/>
          </div>
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #f1f5f9',overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead style={{background:'#f8fafc'}}><tr><TH ch="Employee"/><TH ch="Leave Type"/><TH ch="From"/><TH ch="To"/><TH ch="Days"/><TH ch="Reason"/><TH ch="Status"/><TH ch="Actions"/></tr></thead>
              <tbody>
                {reqs.map((r:any)=>(
                  <tr key={r.id} onMouseOver={e=>e.currentTarget.style.background='#f8fafc'} onMouseOut={e=>e.currentTarget.style.background='#fff'}>
                    <TD ch={<span style={{fontWeight:600}}>{r.employee_name}</span>}/>
                    <TD ch={r.leave_type_name}/>
                    <TD ch={fmt(r.start_date)}/>
                    <TD ch={fmt(r.end_date)}/>
                    <TD ch={<span style={{fontWeight:700,color:'#2563eb'}}>{r.total_days}d</span>}/>
                    <TD ch={<span style={{color:'#64748b',fontSize:12}}>{r.reason||'—'}</span>}/>
                    <TD ch={<Chip s={r.status}/>}/>
                    <TD ch={r.status==='pending'?<div style={{display:'flex',gap:6}}>
                      <Btn variant="green" ch="✓ Approve" style={{padding:'4px 10px',fontSize:11}} onClick={()=>approve.mutate({id:r.id,status:'approved'})}/>
                      <Btn variant="red" ch="✕ Reject" style={{padding:'4px 10px',fontSize:11}} onClick={()=>approve.mutate({id:r.id,status:'rejected'})}/>
                    </div>:<span style={{color:'#94a3b8',fontSize:12}}>—</span>}/>
                  </tr>
                ))}
                {reqs.length===0&&<tr><td colSpan={8} style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:13}}>No leave requests yet</td></tr>}
              </tbody>
            </table>
          </div>
          {showR&&<Dlg title="New Leave Request" onClose={()=>setShowR(false)}>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <S label="Employee" value={formR.employeeId} onChange={(e:any)=>setFormR(p=>({...p,employeeId:e.target.value}))}><option value="">— Select employee —</option>{emps.map((e:any)=><option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}</S>
              <S label="Leave Type" value={formR.leaveTypeId} onChange={(e:any)=>setFormR(p=>({...p,leaveTypeId:e.target.value}))}><option value="">— Select type —</option>{types.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</S>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <F label="Start Date" type="date" value={formR.startDate} onChange={(e:any)=>setFormR(p=>({...p,startDate:e.target.value}))}/>
                <F label="End Date" type="date" value={formR.endDate} onChange={(e:any)=>setFormR(p=>({...p,endDate:e.target.value}))}/>
              </div>
              <F label="Reason" value={formR.reason} onChange={(e:any)=>setFormR(p=>({...p,reason:e.target.value}))}/>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}>
              <Btn variant="ghost" ch="Cancel" onClick={()=>setShowR(false)}/>
              <Btn ch={saveR.isPending?'Submitting…':'Submit Request'} style={{opacity:saveR.isPending?.6:1}} onClick={()=>saveR.mutate()}/>
            </div>
          </Dlg>}
        </div>
      )}
      {sub==='types'&&(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',justifyContent:'flex-end'}}><Btn ch="+ Add Leave Type" onClick={()=>setShowT(true)}/></div>
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #f1f5f9',overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead style={{background:'#f8fafc'}}><tr><TH ch="Name"/><TH ch="Max Days/Year"/><TH ch="Paid"/><TH ch="Description"/></tr></thead>
              <tbody>
                {types.map((t:any)=><tr key={t.id}><TD ch={<span style={{fontWeight:600}}>{t.name}</span>}/><TD ch={<span style={{fontWeight:700,color:'#2563eb'}}>{t.max_days_per_year} days</span>}/><TD ch={<Chip s={t.is_paid?'approved':'rejected'}/>}/><TD ch={<span style={{color:'#94a3b8',fontSize:12}}>{t.description||'—'}</span>}/></tr>)}
                {types.length===0&&<tr><td colSpan={4} style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:13}}>No leave types defined</td></tr>}
              </tbody>
            </table>
          </div>
          {showT&&<Dlg title="Add Leave Type" onClose={()=>setShowT(false)}>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <F label="Name (e.g. Annual Leave)" value={formT.name} onChange={(e:any)=>setFormT(p=>({...p,name:e.target.value}))}/>
              <F label="Max Days Per Year" type="number" value={formT.maxDaysPerYear} onChange={(e:any)=>setFormT(p=>({...p,maxDaysPerYear:e.target.value}))}/>
              <S label="Paid Leave?" value={formT.isPaid} onChange={(e:any)=>setFormT(p=>({...p,isPaid:e.target.value}))}><option value="true">Yes — Paid</option><option value="false">No — Unpaid</option></S>
              <F label="Description" value={formT.description} onChange={(e:any)=>setFormT(p=>({...p,description:e.target.value}))}/>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}>
              <Btn variant="ghost" ch="Cancel" onClick={()=>setShowT(false)}/>
              <Btn ch={saveT.isPending?'Saving…':'Save'} style={{opacity:saveT.isPending?.6:1}} onClick={()=>saveT.mutate()}/>
            </div>
          </Dlg>}
        </div>
      )}
    </div>
  );
}

// ── SCHEDULES TAB ─────────────────────────────────────────────────────────────
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const SHIFTS:Record<string,{label:string,color:string}>={morning:{label:'Morning 8–4',color:'#2563eb'},evening:{label:'Evening 2–10',color:'#7c3aed'},night:{label:'Night 10–6',color:'#0891b2'},off:{label:'Day Off',color:'#94a3b8'}};
function SchedulesTab({toast,emps}:any){
  const active=emps.filter((e:any)=>e.status==='active');
  const [schedules,setSchedules]=useState<Record<string,Record<string,string>>>(()=>{
    try{return JSON.parse(localStorage.getItem('hr_schedules')||'{}');}catch{return {};}
  });
  const setShift=(empId:string,day:string,shift:string)=>{
    setSchedules(prev=>{
      const next={...prev,[empId]:{...(prev[empId]||{})}};
      if(shift==='off')delete next[empId][day]; else next[empId][day]=shift;
      try{localStorage.setItem('hr_schedules',JSON.stringify(next));}catch{}
      return next;
    });
    toast('Schedule updated');
  };
  const getShift=(empId:string,day:string)=>schedules[empId]?.[day]||'off';
  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{background:'#e0f2fe',borderRadius:10,padding:'10px 16px',fontSize:13,color:'#0369a1'}}>
        📅 Weekly schedule — click any cell to rotate shift. Changes are saved locally.
      </div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:4}}>
        {Object.entries(SHIFTS).map(([k,v])=><span key={k} style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:12,color:v.color,fontWeight:600}}><span style={{width:10,height:10,borderRadius:3,background:v.color,display:'inline-block'}}/>{v.label}</span>)}
      </div>
      <div style={{background:'#fff',borderRadius:12,border:'1px solid #f1f5f9',overflow:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
          <thead style={{background:'#f8fafc'}}>
            <tr>
              <TH ch="Employee" style={{minWidth:180}}/>
              {DAYS.map(d=><TH key={d} ch={d} style={{textAlign:'center',width:90}}/>)}
            </tr>
          </thead>
          <tbody>
            {active.map((e:any)=>(
              <tr key={e.id} onMouseOver={ev=>ev.currentTarget.style.background='#f8fafc'} onMouseOut={ev=>ev.currentTarget.style.background='#fff'}>
                <TD ch={<div><div style={{fontWeight:600,fontSize:13}}>{e.first_name} {e.last_name}</div><div style={{fontSize:11,color:'#94a3b8'}}>{e.branch||e.department_name||'—'}</div></div>}/>
                {DAYS.map(d=>{
                  const shift=getShift(e.id,d);
                  const sc=SHIFTS[shift]||SHIFTS.off;
                  const nextShift=(cur:string)=>{const keys=Object.keys(SHIFTS);return keys[(keys.indexOf(cur)+1)%keys.length];};
                  return(
                    <td key={d} style={{padding:'8px 6px',borderTop:'1px solid #f8fafc',textAlign:'center'}}>
                      <button onClick={()=>setShift(e.id,d,nextShift(shift))} title="Click to change" style={{padding:'4px 8px',borderRadius:7,border:'none',background:sc.color+'18',color:sc.color,fontSize:10,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',width:'100%'}}>
                        {shift==='off'?'Off':shift.charAt(0).toUpperCase()+shift.slice(1)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {active.length===0&&<tr><td colSpan={8} style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:13}}>No active employees</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
