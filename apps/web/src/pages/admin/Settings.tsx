import { useState } from 'react';
const SECTIONS=[{id:'general',label:'General',icon:'ti-settings'},{id:'branches',label:'Branches',icon:'ti-building-store'},{id:'taxes',label:'Taxes & VAT',icon:'ti-receipt-tax'},{id:'payment',label:'Payment Methods',icon:'ti-credit-card'},{id:'users',label:'Users & Roles',icon:'ti-users-group'},{id:'integrations',label:'Integrations',icon:'ti-plug'}];
export default function Settings(){
  const [sec,setSec]=useState('general');
  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Settings</h1><p className="nx-page-sub">System configuration & preferences</p></div>
      <button className="btn-nx primary"><i className="ti ti-device-floppy"/> Save Changes</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'210px 1fr',gap:20,alignItems:'start'}}>
      <div className="nx-card" style={{padding:'8px'}}>
        {SECTIONS.map(s=>(<button key={s.id} onClick={()=>setSec(s.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 12px',border:'none',borderRadius:9,cursor:'pointer',textAlign:'left',fontSize:13.5,background:sec===s.id?'var(--canvas)':'none',color:sec===s.id?'var(--accent)':'var(--muted)',fontWeight:sec===s.id?600:400}}>
          <i className={`ti ${s.icon}`}/>{s.label}
        </button>))}
      </div>
      <div className="nx-card">
        <h3 style={{fontWeight:700,fontSize:16,marginBottom:18}}>{SECTIONS.find(s=>s.id===sec)?.label}</h3>
        {sec==='general'?<div style={{display:'flex',flexDirection:'column',gap:16}}>
          {[{l:'Business Name',p:'NuxFashion'},{l:'VAT Number',p:'3000000000'},{l:'CR Number',p:'1010000000'},{l:'Currency',p:'SAR'},{l:'Timezone',p:'Asia/Riyadh'}].map(f=>(<div key={f.l}><label style={{display:'block',fontSize:12.5,fontWeight:600,color:'var(--muted)',marginBottom:5}}>{f.l}</label><input className="nx-input" style={{width:'100%'}} placeholder={f.p}/></div>))}
        </div>:<div style={{textAlign:'center',padding:'40px 0',color:'var(--muted)'}}>
          <i className="ti ti-settings" style={{fontSize:36,opacity:.25,display:'block',marginBottom:12}}/>
          <p style={{fontWeight:600}}>{SECTIONS.find(s=>s.id===sec)?.label} settings coming soon</p>
        </div>}
      </div>
    </div>
  </div>);
}