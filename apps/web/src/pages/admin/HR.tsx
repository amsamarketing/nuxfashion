import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';

const EMP_TYPE:{[k:string]:{c:string;l:string}}={full_time:{c:'green',l:'Full Time'},part_time:{c:'amber',l:'Part Time'},contract:{c:'teal',l:'Contract'}};
const ATT_STATUS:{[k:string]:{c:string;l:string}}={present:{c:'green',l:'Present'},absent:{c:'red',l:'Absent'},late:{c:'amber',l:'Late'},half_day:{c:'teal',l:'Half Day'},holiday:{c:'indigo',l:'Holiday'}};
const LEAVE_STATUS:{[k:string]:string}={pending:'amber',approved:'green',rejected:'red'};
const LEAVE_TYPES=['annual','sick','emergency','unpaid','maternity','paternity'];
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const inp=(label:string,el:React.ReactNode)=>(<div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>{label}</label>{el}</div>);

/* ── Dept Modal ── */
function DeptModal({dept,employees,onClose}:{dept:any;employees:any[];onClose:()=>void}){
  const qc=useQueryClient();
  const [form,setForm]=useState({name:dept?.name||'',description:dept?.description||'',manager_id:dept?.manager_id||''});
  const F=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const save=useMutation({
    mutationFn:()=>dept?.id?api.patch(`/departments/${dept.id}`,form):api.post('/departments',form),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['departments']});onClose();},
  });
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{width:'min(440px,100%)',background:'var(--cd)',borderRadius:16,overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 22px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{margin:0,fontSize:17,fontWeight:700}}>{dept?.id?'Edit Department':'New Department'}</h2>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x"/></button>
        </div>
        <div style={{padding:20,display:'grid',gap:12}}>
          {inp('Department Name *',<input className="nx-input" style={{width:'100%'}} value={form.name} onChange={e=>F('name',e.target.value)} placeholder="Sales"/>)}
          {inp('Description',<textarea className="nx-input" style={{width:'100%',height:52,resize:'none'}} value={form.description} onChange={e=>F('description',e.target.value)}/>)}
          {inp('Manager',<select className="nx-select" style={{width:'100%'}} value={form.manager_id} onChange={e=>F('manager_id',e.target.value)}><option value="">— None —</option>{employees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select>)}
        </div>
        <div style={{padding:'14px 20px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={()=>save.mutate()} disabled={!form.name||save.isPending}>{save.isPending?'Saving...':'Save'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Employee Modal ── */
function EmployeeModal({emp,departments,onClose}:{emp:any;departments:any[];onClose:()=>void}){
  const qc=useQueryClient();
  const [form,setForm]=useState({employee_number:emp?.employee_number||'',full_name:emp?.full_name||'',national_id:emp?.national_id||'',phone:emp?.phone||'',email:emp?.email||'',department_id:emp?.department_id||'',job_title:emp?.job_title||'',employment_type:emp?.employment_type||'full_time',hire_date:emp?.hire_date?.slice(0,10)||'',basic_salary:String(emp?.basic_salary||''),housing_allowance:String(emp?.housing_allowance||''),transport_allowance:String(emp?.transport_allowance||''),notes:emp?.notes||''});
  const F=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const totalSalary=parseFloat(form.basic_salary||'0')+(parseFloat(form.housing_allowance||'0'))+(parseFloat(form.transport_allowance||'0'));
  const save=useMutation({
    mutationFn:()=>{
      const body={...form,basic_salary:parseFloat(form.basic_salary)||0,housing_allowance:parseFloat(form.housing_allowance)||0,transport_allowance:parseFloat(form.transport_allowance)||0,department_id:form.department_id||undefined};
      return emp?.id?api.patch(`/employees/${emp.id}`,body):api.post('/employees',body);
    },
    onSuccess:()=>{qc.invalidateQueries({queryKey:['employees']});onClose();},
  });
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{width:'min(620px,100%)',background:'var(--cd)',borderRadius:16,overflow:'hidden',display:'flex',flexDirection:'column',maxHeight:'90vh'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 22px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <h2 style={{margin:0,fontSize:17,fontWeight:700}}>{emp?.id?'Edit Employee':'New Employee'}</h2>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x"/></button>
        </div>
        <div style={{padding:20,overflowY:'auto',flex:1,display:'grid',gap:14}}>
          <div style={{fontWeight:600,fontSize:11,color:'var(--mu)',textTransform:'uppercase',letterSpacing:.5}}>Personal Info</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {inp('Employee # *',<input className="nx-input" style={{width:'100%',fontFamily:'monospace'}} value={form.employee_number} onChange={e=>F('employee_number',e.target.value)} placeholder="EMP-001"/>)}
            {inp('Full Name *',<input className="nx-input" style={{width:'100%'}} value={form.full_name} onChange={e=>F('full_name',e.target.value)} placeholder="Ahmed Al-Rashidi"/>)}
            {inp('National ID',<input className="nx-input" style={{width:'100%',fontFamily:'monospace'}} value={form.national_id} onChange={e=>F('national_id',e.target.value)} placeholder="1xxxxxxxxx"/>)}
            {inp('Phone',<input className="nx-input" style={{width:'100%'}} value={form.phone} onChange={e=>F('phone',e.target.value)} placeholder="+966 5x xxx xxxx"/>)}
          </div>
          {inp('Email',<input className="nx-input" type="email" style={{width:'100%'}} value={form.email} onChange={e=>F('email',e.target.value)}/>)}
          <div style={{fontWeight:600,fontSize:11,color:'var(--mu)',textTransform:'uppercase',letterSpacing:.5,marginTop:4}}>Employment</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
            {inp('Department',<select className="nx-select" style={{width:'100%'}} value={form.department_id} onChange={e=>F('department_id',e.target.value)}><option value="">— None —</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select>)}
            {inp('Job Title',<input className="nx-input" style={{width:'100%'}} value={form.job_title} onChange={e=>F('job_title',e.target.value)} placeholder="Sales Associate"/>)}
            {inp('Type',<select className="nx-select" style={{width:'100%'}} value={form.employment_type} onChange={e=>F('employment_type',e.target.value)}><option value="full_time">Full Time</option><option value="part_time">Part Time</option><option value="contract">Contract</option></select>)}
          </div>
          {inp('Hire Date *',<input className="nx-input" type="date" style={{width:200}} value={form.hire_date} onChange={e=>F('hire_date',e.target.value)}/>)}
          <div style={{fontWeight:600,fontSize:11,color:'var(--mu)',textTransform:'uppercase',letterSpacing:.5,marginTop:4}}>Compensation</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
            {inp('Basic Salary (SAR)',<input className="nx-input" type="number" style={{width:'100%'}} value={form.basic_salary} onChange={e=>F('basic_salary',e.target.value)}/>)}
            {inp('Housing Allowance',<input className="nx-input" type="number" style={{width:'100%'}} value={form.housing_allowance} onChange={e=>F('housing_allowance',e.target.value)}/>)}
            {inp('Transport Allowance',<input className="nx-input" type="number" style={{width:'100%'}} value={form.transport_allowance} onChange={e=>F('transport_allowance',e.target.value)}/>)}
          </div>
          {totalSalary>0&&<div style={{padding:'10px 14px',background:'var(--acg)',borderRadius:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:13,color:'var(--ac)',fontWeight:600}}>Total Package</span>
            <span style={{fontSize:16,fontWeight:700,color:'var(--ac)'}}>SAR {totalSalary.toLocaleString()}/mo</span>
          </div>}
          {inp('Notes',<textarea className="nx-input" style={{width:'100%',height:52,resize:'none'}} value={form.notes} onChange={e=>F('notes',e.target.value)}/>)}
        </div>
        <div style={{padding:'14px 20px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end',flexShrink:0}}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={()=>save.mutate()} disabled={!form.full_name||!form.employee_number||!form.hire_date||save.isPending}>{save.isPending?'Saving...':'Save Employee'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Attendance Modal ── */
function AttendanceModal({employees,date,onClose}:{employees:any[];date:string;onClose:()=>void}){
  const qc=useQueryClient();
  const [rows,setRows]=useState<{employee_id:string;status:string;check_in:string;check_out:string;notes:string}[]>(
    employees.slice(0,20).map(e=>({employee_id:e.id,status:'present',check_in:'09:00',check_out:'17:00',notes:''}))
  );
  const updateRow=(i:number,k:string,v:string)=>setRows(r=>{const n=[...r];n[i]={...n[i],[k]:v};return n;});
  const save=useMutation({
    mutationFn:()=>api.post('/attendance/bulk',{records:rows.map(r=>({...r,date,check_in:r.check_in||undefined,check_out:r.check_out||undefined}))}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['attendance']});onClose();},
  });
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{width:'min(800px,100%)',background:'var(--cd)',borderRadius:16,overflow:'hidden',display:'flex',flexDirection:'column',maxHeight:'90vh'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 22px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <h2 style={{margin:0,fontSize:17,fontWeight:700}}>Record Attendance — {date}</h2>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x"/></button>
        </div>
        <div style={{overflowY:'auto',flex:1}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'1px solid var(--bd)',position:'sticky',top:0,background:'var(--cd)'}}>
              {['Employee','Status','Check In','Check Out','Notes'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:11,color:'var(--mu)',fontWeight:600}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((r,i)=>{const emp=employees.find(e=>e.id===r.employee_id);return(
                <tr key={i} style={{borderBottom:'1px solid var(--bd)'}}>
                  <td style={{padding:'8px 12px',fontSize:13,fontWeight:600}}>{emp?.full_name||'—'}</td>
                  <td style={{padding:'8px 12px'}}>
                    <select className="nx-select" value={r.status} onChange={e=>updateRow(i,'status',e.target.value)} style={{fontSize:12}}>
                      {Object.entries(ATT_STATUS).map(([k,{l}])=><option key={k} value={k}>{l}</option>)}
                    </select>
                  </td>
                  <td style={{padding:'8px 12px'}}><input className="nx-input" type="time" value={r.check_in} onChange={e=>updateRow(i,'check_in',e.target.value)} style={{width:100,fontSize:12}}/></td>
                  <td style={{padding:'8px 12px'}}><input className="nx-input" type="time" value={r.check_out} onChange={e=>updateRow(i,'check_out',e.target.value)} style={{width:100,fontSize:12}}/></td>
                  <td style={{padding:'8px 12px'}}><input className="nx-input" value={r.notes} onChange={e=>updateRow(i,'notes',e.target.value)} style={{width:140,fontSize:12}} placeholder="Optional"/></td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
        <div style={{padding:'14px 20px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end',flexShrink:0}}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={()=>save.mutate()} disabled={save.isPending}>{save.isPending?'Saving...':'Save Attendance'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Leave Request Modal ── */
function LeaveModal({employees,onClose}:{employees:any[];onClose:()=>void}){
  const qc=useQueryClient();
  const [form,setForm]=useState({employee_id:'',type:'annual',start_date:'',end_date:'',reason:''});
  const F=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const days=form.start_date&&form.end_date?Math.max(0,Math.ceil((new Date(form.end_date).getTime()-new Date(form.start_date).getTime())/(86400000)))+1:0;
  const save=useMutation({
    mutationFn:()=>api.post('/leave-requests',form),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['leave-requests']});onClose();},
  });
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{width:'min(480px,100%)',background:'var(--cd)',borderRadius:16,overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 22px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{margin:0,fontSize:17,fontWeight:700}}>Apply Leave</h2>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x"/></button>
        </div>
        <div style={{padding:20,display:'grid',gap:12}}>
          {inp('Employee *',<select className="nx-select" style={{width:'100%'}} value={form.employee_id} onChange={e=>F('employee_id',e.target.value)}><option value="">Select employee...</option>{employees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select>)}
          {inp('Leave Type',<select className="nx-select" style={{width:'100%'}} value={form.type} onChange={e=>F('type',e.target.value)}>{LEAVE_TYPES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}</select>)}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {inp('Start Date *',<input className="nx-input" type="date" style={{width:'100%'}} value={form.start_date} onChange={e=>F('start_date',e.target.value)}/>)}
            {inp('End Date *',<input className="nx-input" type="date" style={{width:'100%'}} value={form.end_date} onChange={e=>F('end_date',e.target.value)}/>)}
          </div>
          {days>0&&<div style={{padding:'8px 12px',background:'var(--acg)',borderRadius:8,fontSize:13,color:'var(--ac)',fontWeight:600}}>📅 {days} day{days!==1?'s':''} requested</div>}
          {inp('Reason',<textarea className="nx-input" style={{width:'100%',height:60,resize:'none'}} value={form.reason} onChange={e=>F('reason',e.target.value)} placeholder="Optional reason..."/>)}
        </div>
        <div style={{padding:'14px 20px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={()=>save.mutate()} disabled={!form.employee_id||!form.start_date||!form.end_date||save.isPending}>{save.isPending?'Saving...':'Submit Leave'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Payslip Modal ── */
function PayslipModal({slip,employees,onClose}:{slip:any;employees:any[];onClose:()=>void}){
  const emp=employees.find(e=>e.id===slip.employee_id);
  const gross=(slip.basic_salary||0)+(slip.housing_allowance||0)+(slip.transport_allowance||0)+(slip.other_allowances||0);
  const deductions=(slip.deductions||0)+(slip.gosi_employee||0);
  const net=slip.net_salary||gross-deductions;
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{width:'min(480px,100%)',background:'var(--cd)',borderRadius:16,overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 22px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{margin:0,fontSize:17,fontWeight:700}}>Payslip</h2>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x"/></button>
        </div>
        <div style={{padding:20}}>
          <div style={{textAlign:'center',marginBottom:16,padding:16,background:'var(--bg)',borderRadius:10}}>
            <div style={{fontWeight:700,fontSize:16}}>{emp?.full_name||'Employee'}</div>
            <div style={{fontSize:12,color:'var(--mu)'}}>{emp?.job_title||''} · {MONTHS[(slip.period_month||1)-1]} {slip.period_year}</div>
          </div>
          <div style={{display:'grid',gap:6,marginBottom:12}}>
            <div style={{fontWeight:600,fontSize:11,color:'var(--mu)',textTransform:'uppercase',marginBottom:4}}>Earnings</div>
            {[['Basic Salary',slip.basic_salary],['Housing Allowance',slip.housing_allowance],['Transport Allowance',slip.transport_allowance],['Other Allowances',slip.other_allowances]].filter(([,v])=>v).map(([l,v])=>(
              <div key={String(l)} style={{display:'flex',justifyContent:'space-between',fontSize:13,padding:'6px 0',borderBottom:'1px solid var(--bd)'}}>
                <span>{l}</span><span style={{fontWeight:600}}>SAR {Number(v).toFixed(2)}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',fontSize:14,fontWeight:700,padding:'8px 0',color:'#22c55e'}}>
              <span>Gross Pay</span><span>SAR {gross.toFixed(2)}</span>
            </div>
          </div>
          {deductions>0&&<div style={{display:'grid',gap:6,marginBottom:12}}>
            <div style={{fontWeight:600,fontSize:11,color:'var(--mu)',textTransform:'uppercase',marginBottom:4}}>Deductions</div>
            {[['GOSI (Employee 9.75%)',slip.gosi_employee],['Other Deductions',slip.deductions]].filter(([,v])=>v).map(([l,v])=>(
              <div key={String(l)} style={{display:'flex',justifyContent:'space-between',fontSize:13,padding:'6px 0',borderBottom:'1px solid var(--bd)'}}>
                <span>{l}</span><span style={{fontWeight:600,color:'#ef4444'}}>- SAR {Number(v).toFixed(2)}</span>
              </div>
            ))}
          </div>}
          <div style={{display:'flex',justifyContent:'space-between',fontSize:18,fontWeight:800,padding:'14px 16px',background:'var(--acg)',borderRadius:10,color:'var(--ac)'}}>
            <span>Net Pay</span><span>SAR {net.toFixed(2)}</span>
          </div>
          <div style={{marginTop:10,textAlign:'center'}}><span className={`nx-badge ${slip.status==='paid'?'active':slip.status==='approved'?'teal':'grey'}`}>{slip.status||'draft'}</span></div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function HR(){
  const qc=useQueryClient();
  const [tab,setTab]=useState('employees');
  const [search,setSearch]=useState('');
  const [filterDept,setFilterDept]=useState('');
  const [filterType,setFilterType]=useState('');
  const [attDate,setAttDate]=useState(new Date().toISOString().slice(0,10));
  const [leaveStatus,setLeaveStatus]=useState('pending');
  const [payMonth,setPayMonth]=useState(new Date().getMonth()+1);
  const [payYear,setPayYear]=useState(new Date().getFullYear());
  const [selected,setSelected]=useState<any>(null);
  const [showEmp,setShowEmp]=useState(false);
  const [editEmp,setEditEmp]=useState<any>(null);
  const [showDept,setShowDept]=useState(false);
  const [editDept,setEditDept]=useState<any>(null);
  const [showAtt,setShowAtt]=useState(false);
  const [showLeave,setShowLeave]=useState(false);
  const [showSlip,setShowSlip]=useState<any>(null);

  const {data:empData,isLoading:empLoading}=useQuery({queryKey:['employees'],queryFn:async()=>{const r=await api.get('/employees');return r.data;}});
  const {data:deptData}=useQuery({queryKey:['departments'],queryFn:async()=>{const r=await api.get('/departments');return r.data;}});
  const {data:attData}=useQuery({queryKey:['attendance',attDate],queryFn:async()=>{const r=await api.get(`/attendance?from=${attDate}&to=${attDate}`);return r.data;},enabled:tab==='attendance'});
  const {data:leaveData}=useQuery({queryKey:['leave-requests',leaveStatus],queryFn:async()=>{const r=await api.get(`/leave-requests?status=${leaveStatus}`);return r.data;},enabled:tab==='leave'});
  const {data:payData}=useQuery({queryKey:['payroll',payMonth,payYear],queryFn:async()=>{const r=await api.get(`/payroll?month=${payMonth}&year=${payYear}`);return r.data;},enabled:tab==='payroll'});
  const {data:paySummary}=useQuery({queryKey:['payroll-summary',payMonth,payYear],queryFn:async()=>{const r=await api.get(`/payroll/summary?month=${payMonth}&year=${payYear}`);return r.data;},enabled:tab==='payroll'});

  const employees:any[]=Array.isArray(empData)?empData:empData?.employees||empData?.data||[];
  const departments:any[]=Array.isArray(deptData)?deptData:deptData?.departments||deptData?.data||[];
  const attendance:any[]=Array.isArray(attData)?attData:attData?.records||attData?.data||[];
  const leaveReqs:any[]=Array.isArray(leaveData)?leaveData:leaveData?.requests||leaveData?.data||[];
  const payroll:any[]=Array.isArray(payData)?payData:payData?.records||payData?.data||[];

  const deptMap=Object.fromEntries(departments.map(d=>[d.id,d.name]));

  const filtered=useMemo(()=>{
    let list=employees;
    if(filterDept) list=list.filter(e=>e.department_id===filterDept);
    if(filterType) list=list.filter(e=>e.employment_type===filterType);
    if(search) list=list.filter(e=>e.full_name?.toLowerCase().includes(search.toLowerCase())||e.employee_number?.toLowerCase().includes(search.toLowerCase())||e.job_title?.toLowerCase().includes(search.toLowerCase()));
    return list;
  },[employees,filterDept,filterType,search]);

  const delEmp=useMutation({mutationFn:(id:string)=>api.delete(`/employees/${id}`),onSuccess:()=>{qc.invalidateQueries({queryKey:['employees']});setSelected(null);}});
  const delDept=useMutation({mutationFn:(id:string)=>api.delete(`/departments/${id}`),onSuccess:()=>qc.invalidateQueries({queryKey:['departments']})});
  const reviewLeave=useMutation({
    mutationFn:({id,status,notes}:{id:string;status:string;notes:string})=>api.patch(`/leave-requests/${id}/review`,{status,review_notes:notes}),
    onSuccess:()=>qc.invalidateQueries({queryKey:['leave-requests',leaveStatus]}),
  });
  const generatePayroll=useMutation({
    mutationFn:()=>api.post('/payroll/generate',{period_month:payMonth,period_year:payYear}),
    onSuccess:()=>qc.invalidateQueries({queryKey:['payroll',payMonth,payYear]}),
  });
  const updatePayStatus=useMutation({
    mutationFn:({id,status}:{id:string;status:string})=>api.patch(`/payroll/${id}`,{status}),
    onSuccess:()=>qc.invalidateQueries({queryKey:['payroll',payMonth,payYear]}),
  });

  const onLeave=leaveReqs.filter(l=>l.status==='approved'&&new Date(l.start_date)<=new Date()&&new Date(l.end_date)>=new Date()).length;
  const totalPayroll=(paySummary as any)?.total_net||(payroll.reduce((s,p)=>s+(p.net_salary||0),0));

  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">HR & Payroll</h1><p className="nx-page-sub">{employees.length} employees · {departments.length} departments</p></div>
      <div style={{display:'flex',gap:8}}>
        {tab==='attendance'&&<button className="btn-nx ghost" onClick={()=>setShowAtt(true)}><i className="ti ti-calendar-plus"/> Record Attendance</button>}
        {tab==='leave'&&<button className="btn-nx ghost" onClick={()=>setShowLeave(true)}><i className="ti ti-calendar-off"/> Apply Leave</button>}
        {tab==='departments'&&<button className="btn-nx ghost" onClick={()=>{setEditDept(null);setShowDept(true);}}><i className="ti ti-plus"/> New Department</button>}
        {tab==='employees'&&<button className="btn-nx primary" onClick={()=>{setEditEmp(null);setShowEmp(true);}}><i className="ti ti-plus"/> New Employee</button>}
      </div>
    </div>

    <div className="nx-stats cols-4" style={{marginBottom:16}}>
      <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-users"/></div><div className="nx-stat-body"><div className="nx-stat-val">{employees.length}</div><div className="nx-stat-lbl">Total Employees</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon green"><i className="ti ti-user-check"/></div><div className="nx-stat-body"><div className="nx-stat-val">{employees.filter(e=>e.employment_type==='full_time').length}</div><div className="nx-stat-lbl">Full Time</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-calendar-off"/></div><div className="nx-stat-body"><div className="nx-stat-val">{onLeave}</div><div className="nx-stat-lbl">On Leave Today</div></div></div>
      <div className="nx-stat"><div className="nx-stat-icon teal"><i className="ti ti-cash"/></div><div className="nx-stat-body"><div className="nx-stat-val">SAR {(totalPayroll/1000).toFixed(0)}k</div><div className="nx-stat-lbl">Monthly Payroll</div></div></div>
    </div>

    <div style={{display:'flex',gap:4,marginBottom:14,borderBottom:'1px solid var(--bd)'}}>
      {[['employees','👥 Employees'],['attendance','📋 Attendance'],['leave','🌴 Leave'],['payroll','💰 Payroll'],['departments','🏢 Departments']].map(([id,l])=>(
        <button key={id} onClick={()=>setTab(id)} style={{padding:'8px 16px',border:'none',background:'none',borderBottom:tab===id?'2px solid var(--ac)':'2px solid transparent',color:tab===id?'var(--ac)':'var(--mu)',fontWeight:tab===id?600:400,cursor:'pointer',fontSize:13}}>{l}</button>
      ))}
    </div>

    {/* EMPLOYEES */}
    {tab==='employees'&&(<div style={{display:'flex',gap:0,height:'calc(100vh - 280px)'}}>
      <div style={{flex:1,overflowY:'auto'}}>
        <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
          <input className="nx-input" placeholder="Search employees..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:200}}/>
          <select className="nx-select" value={filterDept} onChange={e=>setFilterDept(e.target.value)}><option value="">All Departments</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <select className="nx-select" value={filterType} onChange={e=>setFilterType(e.target.value)}><option value="">All Types</option><option value="full_time">Full Time</option><option value="part_time">Part Time</option><option value="contract">Contract</option></select>
        </div>
        {empLoading?<div style={{padding:32,textAlign:'center',color:'var(--mu)'}}>Loading...</div>:(
          <div className="nx-card" style={{padding:0,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{borderBottom:'1px solid var(--bd)'}}>
                {['Emp #','Name','Department','Job Title','Type','Salary','Hired',''].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:11,color:'var(--mu)',fontWeight:600}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.map(e=>(
                  <tr key={e.id} onClick={()=>setSelected(e)} style={{borderBottom:'1px solid var(--bd)',cursor:'pointer',background:selected?.id===e.id?'var(--acg)':'transparent'}}>
                    <td style={{padding:'10px 12px',fontFamily:'monospace',fontSize:12,color:'var(--mu)'}}>{e.employee_number}</td>
                    <td style={{padding:'10px 12px',fontWeight:600,fontSize:13}}>{e.full_name}</td>
                    <td style={{padding:'10px 12px',fontSize:12,color:'var(--mu)'}}>{deptMap[e.department_id]||'—'}</td>
                    <td style={{padding:'10px 12px',fontSize:12}}>{e.job_title||'—'}</td>
                    <td style={{padding:'10px 12px'}}><span className={`nx-badge ${EMP_TYPE[e.employment_type||'full_time']?.c||'grey'}`}>{EMP_TYPE[e.employment_type||'full_time']?.l||e.employment_type}</span></td>
                    <td style={{padding:'10px 12px',fontWeight:600,fontSize:13}}>SAR {((e.basic_salary||0)+(e.housing_allowance||0)+(e.transport_allowance||0)).toLocaleString()}</td>
                    <td style={{padding:'10px 12px',fontSize:12,color:'var(--mu)'}}>{e.hire_date?new Date(e.hire_date).toLocaleDateString():'—'}</td>
                    <td style={{padding:'10px 12px'}}><button className="btn-nx ghost sm" onClick={ev=>{ev.stopPropagation();setEditEmp(e);setShowEmp(true);}}><i className="ti ti-edit"/></button></td>
                  </tr>
                ))}
                {filtered.length===0&&<tr><td colSpan={8} style={{padding:32,textAlign:'center',color:'var(--mu)'}}>No employees found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected&&(
        <div style={{width:300,borderLeft:'1px solid var(--bd)',overflowY:'auto',flexShrink:0,background:'var(--cd)',padding:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{width:44,height:44,borderRadius:12,background:'var(--acg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>👤</div>
            <div style={{display:'flex',gap:4}}>
              <button className="btn-nx ghost sm" onClick={()=>{setEditEmp(selected);setShowEmp(true);}}><i className="ti ti-edit"/></button>
              <button className="btn-nx ghost sm" style={{color:'#ef4444'}} onClick={()=>{if(confirm('Delete employee?'))delEmp.mutate(selected.id);}}><i className="ti ti-trash"/></button>
              <button className="btn-nx ghost sm" onClick={()=>setSelected(null)}><i className="ti ti-x"/></button>
            </div>
          </div>
          <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>{selected.full_name}</div>
          <div style={{fontSize:12,color:'var(--mu)',marginBottom:10}}>{selected.job_title||'—'} · {deptMap[selected.department_id]||'No dept'}</div>
          <span className={`nx-badge ${EMP_TYPE[selected.employment_type]?.c||'grey'}`}>{EMP_TYPE[selected.employment_type]?.l||selected.employment_type}</span>
          <div style={{marginTop:14,display:'grid',gap:8}}>
            {[['Emp #',selected.employee_number],['National ID',selected.national_id],['Phone',selected.phone],['Email',selected.email],['Hire Date',selected.hire_date?new Date(selected.hire_date).toLocaleDateString():'—']].filter(([,v])=>v).map(([l,v])=>(
              <div key={String(l)}><div style={{fontSize:10,color:'var(--mu)'}}>{l}</div><div style={{fontSize:13,fontWeight:500}}>{v}</div></div>
            ))}
          </div>
          <div style={{marginTop:14,borderTop:'1px solid var(--bd)',paddingTop:14}}>
            <div style={{fontSize:11,color:'var(--mu)',fontWeight:600,marginBottom:8}}>COMPENSATION / MONTH</div>
            {[['Basic',selected.basic_salary],['Housing',selected.housing_allowance],['Transport',selected.transport_allowance]].filter(([,v])=>v).map(([l,v])=>(
              <div key={String(l)} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span style={{color:'var(--mu)'}}>{l}</span><span style={{fontWeight:600}}>SAR {Number(v).toLocaleString()}</span></div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:700,marginTop:6,paddingTop:6,borderTop:'1px solid var(--bd)',color:'var(--ac)'}}>
              <span>Total</span><span>SAR {((selected.basic_salary||0)+(selected.housing_allowance||0)+(selected.transport_allowance||0)).toLocaleString()}</span>
            </div>
          </div>
          {selected.notes&&<div style={{marginTop:12,fontSize:12,color:'var(--mu)',fontStyle:'italic'}}>{selected.notes}</div>}
        </div>
      )}
    </div>)}

    {/* ATTENDANCE */}
    {tab==='attendance'&&(<div>
      <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
        <input type="date" className="nx-input" value={attDate} onChange={e=>setAttDate(e.target.value)} style={{width:160}}/>
        <button className="btn-nx primary sm" onClick={()=>setShowAtt(true)}><i className="ti ti-plus"/> Record</button>
        <span style={{fontSize:12,color:'var(--mu)',marginLeft:8}}>{attendance.length} records for this date</span>
      </div>
      <div className="nx-card" style={{padding:0,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:'1px solid var(--bd)'}}>
            {['Employee','Status','Check In','Check Out','Hours','Notes'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:11,color:'var(--mu)',fontWeight:600}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {attendance.length===0?(
              <tr><td colSpan={6} style={{padding:32,textAlign:'center',color:'var(--mu)'}}>No attendance records for {attDate}</td></tr>
            ):attendance.map((a:any)=>{
              const emp=employees.find(e=>e.id===a.employee_id);
              const hrs=a.check_in&&a.check_out?((new Date('2000-01-01T'+a.check_out).getTime()-new Date('2000-01-01T'+a.check_in).getTime())/3600000).toFixed(1):'—';
              const st=ATT_STATUS[a.status]||{c:'grey',l:a.status};
              return(<tr key={a.id} style={{borderBottom:'1px solid var(--bd)'}}>
                <td style={{padding:'10px 12px',fontWeight:600,fontSize:13}}>{emp?.full_name||'—'}</td>
                <td style={{padding:'10px 12px'}}><span className={`nx-badge ${st.c}`}>{st.l}</span></td>
                <td style={{padding:'10px 12px',fontSize:13}}>{a.check_in||'—'}</td>
                <td style={{padding:'10px 12px',fontSize:13}}>{a.check_out||'—'}</td>
                <td style={{padding:'10px 12px',fontSize:13,fontWeight:600}}>{hrs}h</td>
                <td style={{padding:'10px 12px',fontSize:12,color:'var(--mu)'}}>{a.notes||'—'}</td>
              </tr>);
            })}
          </tbody>
        </table>
      </div>
    </div>)}

    {/* LEAVE */}
    {tab==='leave'&&(<div>
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {[['pending','⏳ Pending'],['approved','✅ Approved'],['rejected','❌ Rejected'],['','All']].map(([k,l])=>(
          <button key={k} onClick={()=>setLeaveStatus(k)} className={`btn-nx ${leaveStatus===k?'primary':'ghost'} sm`}>{l}</button>
        ))}
        <button className="btn-nx ghost sm" style={{marginLeft:'auto'}} onClick={()=>setShowLeave(true)}><i className="ti ti-plus"/> Apply Leave</button>
      </div>
      <div className="nx-card" style={{padding:0,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:'1px solid var(--bd)'}}>
            {['Employee','Type','From','To','Days','Status','Reason','Actions'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:11,color:'var(--mu)',fontWeight:600}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {leaveReqs.length===0?<tr><td colSpan={8} style={{padding:32,textAlign:'center',color:'var(--mu)'}}>No leave requests</td></tr>:leaveReqs.map((l:any)=>{
              const emp=employees.find(e=>e.id===l.employee_id);
              const days=Math.max(1,Math.ceil((new Date(l.end_date).getTime()-new Date(l.start_date).getTime())/86400000)+1);
              return(<tr key={l.id} style={{borderBottom:'1px solid var(--bd)'}}>
                <td style={{padding:'10px 12px',fontWeight:600,fontSize:13}}>{emp?.full_name||'—'}</td>
                <td style={{padding:'10px 12px'}}><span className="nx-badge grey">{l.type}</span></td>
                <td style={{padding:'10px 12px',fontSize:12}}>{new Date(l.start_date).toLocaleDateString()}</td>
                <td style={{padding:'10px 12px',fontSize:12}}>{new Date(l.end_date).toLocaleDateString()}</td>
                <td style={{padding:'10px 12px',fontWeight:600,textAlign:'center'}}>{days}d</td>
                <td style={{padding:'10px 12px'}}><span className={`nx-badge ${LEAVE_STATUS[l.status]||'grey'}`}>{l.status}</span></td>
                <td style={{padding:'10px 12px',fontSize:12,color:'var(--mu)',maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.reason||'—'}</td>
                <td style={{padding:'10px 12px'}}>
                  {l.status==='pending'&&<div style={{display:'flex',gap:4}}>
                    <button className="btn-nx primary sm" onClick={()=>reviewLeave.mutate({id:l.id,status:'approved',notes:''})}>Approve</button>
                    <button className="btn-nx ghost sm" style={{color:'#ef4444'}} onClick={()=>reviewLeave.mutate({id:l.id,status:'rejected',notes:''})}>Reject</button>
                  </div>}
                </td>
              </tr>);
            })}
          </tbody>
        </table>
      </div>
    </div>)}

    {/* PAYROLL */}
    {tab==='payroll'&&(<div>
      <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center',flexWrap:'wrap'}}>
        <select className="nx-select" value={payMonth} onChange={e=>setPayMonth(Number(e.target.value))}>
          {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
        </select>
        <select className="nx-select" value={payYear} onChange={e=>setPayYear(Number(e.target.value))}>
          {[2023,2024,2025,2026].map(y=><option key={y}>{y}</option>)}
        </select>
        <button className="btn-nx primary" onClick={()=>generatePayroll.mutate()} disabled={generatePayroll.isPending}><i className="ti ti-refresh"/> {generatePayroll.isPending?'Generating...':'Generate Payroll'}</button>
        {(paySummary as any)?.total_net&&<div style={{marginLeft:'auto',padding:'8px 16px',background:'var(--acg)',borderRadius:8,fontWeight:700,color:'var(--ac)'}}>Total Net: SAR {Number((paySummary as any).total_net).toLocaleString()}</div>}
      </div>
      {payroll.length===0?<div className="nx-card" style={{textAlign:'center',padding:48,color:'var(--mu)'}}><i className="ti ti-cash" style={{fontSize:40,display:'block',opacity:.3,marginBottom:8}}/><p style={{fontWeight:600}}>No payroll for {MONTHS[payMonth-1]} {payYear}</p><p style={{fontSize:13}}>Click "Generate Payroll" to create payslips for all employees</p></div>:(
        <div className="nx-card" style={{padding:0,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'1px solid var(--bd)'}}>
              {['Employee','Basic','Housing','Transport','GOSI','Deductions','Net Pay','Status',''].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:11,color:'var(--mu)',fontWeight:600}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {payroll.map((p:any)=>{
                const emp=employees.find(e=>e.id===p.employee_id);
                return(<tr key={p.id} style={{borderBottom:'1px solid var(--bd)'}}>
                  <td style={{padding:'10px 12px',fontWeight:600,fontSize:13}}>{emp?.full_name||'—'}</td>
                  <td style={{padding:'10px 12px',fontSize:12}}>SAR {Number(p.basic_salary||0).toLocaleString()}</td>
                  <td style={{padding:'10px 12px',fontSize:12}}>SAR {Number(p.housing_allowance||0).toLocaleString()}</td>
                  <td style={{padding:'10px 12px',fontSize:12}}>SAR {Number(p.transport_allowance||0).toLocaleString()}</td>
                  <td style={{padding:'10px 12px',fontSize:12,color:'#ef4444'}}>SAR {Number(p.gosi_employee||0).toLocaleString()}</td>
                  <td style={{padding:'10px 12px',fontSize:12,color:'#ef4444'}}>SAR {Number(p.deductions||0).toLocaleString()}</td>
                  <td style={{padding:'10px 12px',fontWeight:700,color:'var(--ac)'}}>SAR {Number(p.net_salary||0).toLocaleString()}</td>
                  <td style={{padding:'10px 12px'}}><span className={`nx-badge ${p.status==='paid'?'active':p.status==='approved'?'teal':'grey'}`}>{p.status||'draft'}</span></td>
                  <td style={{padding:'10px 12px'}}>
                    <div style={{display:'flex',gap:4}}>
                      <button className="btn-nx ghost sm" onClick={()=>setShowSlip(p)}><i className="ti ti-file-text"/></button>
                      {p.status==='draft'&&<button className="btn-nx primary sm" onClick={()=>updatePayStatus.mutate({id:p.id,status:'approved'})}>Approve</button>}
                      {p.status==='approved'&&<button className="btn-nx primary sm" onClick={()=>updatePayStatus.mutate({id:p.id,status:'paid'})}>Mark Paid</button>}
                    </div>
                  </td>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>)}

    {/* DEPARTMENTS */}
    {tab==='departments'&&(<div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
        {departments.map(d=>{
          const mgr=employees.find(e=>e.id===d.manager_id);
          const count=employees.filter(e=>e.department_id===d.id).length;
          return(<div key={d.id} className="nx-card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
              <div style={{width:44,height:44,borderRadius:12,background:'var(--acg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🏢</div>
              <div style={{display:'flex',gap:4}}>
                <button className="btn-nx ghost sm" onClick={()=>{setEditDept(d);setShowDept(true);}}><i className="ti ti-edit"/></button>
                <button className="btn-nx ghost sm" style={{color:'#ef4444'}} onClick={()=>{if(confirm('Delete department?'))delDept.mutate(d.id);}}><i className="ti ti-trash"/></button>
              </div>
            </div>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>{d.name}</div>
            {d.description&&<div style={{fontSize:12,color:'var(--mu)',marginBottom:10}}>{d.description}</div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:10,paddingTop:10,borderTop:'1px solid var(--bd)'}}>
              <div><div style={{fontSize:10,color:'var(--mu)'}}>EMPLOYEES</div><div style={{fontWeight:700,fontSize:20,color:'var(--ac)'}}>{count}</div></div>
              <div><div style={{fontSize:10,color:'var(--mu)'}}>MANAGER</div><div style={{fontSize:12,fontWeight:600}}>{mgr?.full_name||'—'}</div></div>
            </div>
          </div>);
        })}
        {departments.length===0&&<div className="nx-card" style={{textAlign:'center',padding:48,color:'var(--mu)',gridColumn:'1/-1'}}>
          <div style={{fontSize:40,marginBottom:8}}>🏢</div><p style={{fontWeight:600}}>No departments yet</p>
          <button className="btn-nx primary" style={{marginTop:8}} onClick={()=>{setEditDept(null);setShowDept(true);}}>Add First Department</button>
        </div>}
      </div>
    </div>)}

    {showEmp&&<EmployeeModal emp={editEmp} departments={departments} onClose={()=>{setShowEmp(false);setEditEmp(null);}}/>}
    {showDept&&<DeptModal dept={editDept} employees={employees} onClose={()=>{setShowDept(false);setEditDept(null);}}/>}
    {showAtt&&<AttendanceModal employees={employees} date={attDate} onClose={()=>setShowAtt(false)}/>}
    {showLeave&&<LeaveModal employees={employees} onClose={()=>setShowLeave(false)}/>}
    {showSlip&&<PayslipModal slip={showSlip} employees={employees} onClose={()=>setShowSlip(null)}/>}
  </div>);
}
