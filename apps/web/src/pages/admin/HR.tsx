import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import StatRow from '../../components/StatRow';
export default function HR() {
  const { data:employees } = useQuery({ queryKey:['employees'], queryFn:()=>api.get('/hr/employees').then(r=>r.data) });
  const { data:depts } = useQuery({ queryKey:['depts'], queryFn:()=>api.get('/hr/departments').then(r=>r.data) });
  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
        <div><div style={{ fontSize:14,fontWeight:600 }}>HR & payroll</div><div style={{ fontSize:11,color:'var(--text-secondary)' }}>{employees?.length||0} employees · {depts?.length||0} departments</div></div>
        <div style={{ display:'flex',gap:5 }}>
          <button className="bt"><i className="ti ti-file-export" /> WPS / Mudad export</button>
          <button className="bt bt-p"><i className="ti ti-plus" /> Add employee</button>
        </div>
      </div>
      <div style={{ display:'flex',gap:5,marginBottom:10 }}>
        {['Employees','Attendance','Payroll','Commissions','GOSI','Leave'].map((t,i)=><button key={t} className={'snb'+(i===0?' on':'')}>{t}</button>)}
      </div>
      <StatRow stats={[
        {label:'Total employees',value:employees?.length||0},
        {label:'Departments',value:depts?.length||0},
        {label:'Monthly payroll',value:'SAR '+((employees||[]).reduce((s:number,e:any)=>s+parseFloat(e.basic_salary||0),0)).toLocaleString()},
        {label:'GOSI due (10%)',value:'SAR '+((employees||[]).reduce((s:number,e:any)=>s+parseFloat(e.basic_salary||0)*0.1,0)).toLocaleString()},
      ]} />
      <div className="card" style={{ padding:0,overflow:'hidden' }}>
        <div className="tr th" style={{ gridTemplateColumns:'1fr 100px 70px 90px 80px 80px' }}>
          {['Employee','Department','Status','Basic salary','GOSI (10%)','Net pay'].map(h=><span key={h}>{h}</span>)}
        </div>
        {employees?.map((e:any)=>{
          const gosi=parseFloat(e.basic_salary||0)*0.1;
          return (
            <div key={e.id} className="tr" style={{ gridTemplateColumns:'1fr 100px 70px 90px 80px 80px' }}>
              <span><div style={{ fontWeight:500 }}>{e.name}</div><div style={{ color:'var(--text-muted)',fontSize:10 }}>{e.position||'—'}</div></span>
              <span style={{ color:'var(--text-secondary)' }}>{e.department_name||'—'}</span>
              <span><span className={'bx '+(e.status==='active'?'g':'a')} style={{ textTransform:'capitalize' }}>{e.status}</span></span>
              <span style={{ fontWeight:600 }}>SAR {parseFloat(e.basic_salary||0).toLocaleString()}</span>
              <span style={{ color:'var(--text-secondary)' }}>SAR {gosi.toFixed(0)}</span>
              <span style={{ fontWeight:600 }}>SAR {(parseFloat(e.basic_salary||0)-gosi).toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
