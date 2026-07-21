
const CATS = [
  {title:'Company & branches',icon:'ti-building',items:[['Company details, logo & CR number',''],['Branch management',''],['Warehouse configuration',''],['Multi-company / holding group setup','']]},
  {title:'Users & permissions',icon:'ti-lock',items:[['User accounts',''],['Roles & permissions (RBAC)',''],['POS terminal configuration',''],['API access keys & webhooks','']]},
  {title:'Payment integrations',icon:'ti-credit-card',items:[['Tabby BNPL','Configured'],['Tamara BNPL','Configured'],['HyperPay / PayTabs gateway','Configured'],['Mada · Apple Pay · STC Pay','Configured']]},
  {title:'Shipping & logistics',icon:'ti-truck',items:[['Aramex — Saudi express','Configured'],['SMSA Express','Configured'],['Naqel Express','Configured'],['Fetchr last-mile delivery','Configured']]},
  {title:'ZATCA & compliance',icon:'ti-file-check',items:[['Phase 2 e-invoicing','Live'],['Signing certificate (exp. Jan 2027)',''],['VAT registration (15%)',''],['PDPL data privacy compliance','']]},
  {title:'POS & hardware',icon:'ti-device-desktop',items:[['Receipt printer templates',''],['Cash drawer configuration',''],['Barcode scanner setup',''],['Offline sync policy','']]},
  {title:'Marketplace connectors',icon:'ti-world',items:[['Amazon SP-API','Connected'],['Noon seller API','Connected'],['Product sync rules',''],['Inventory channel allocation','']]},
  {title:'Security & audit',icon:'ti-shield',items:[['MFA — required for Admin+','Active'],['Audit log (7-year retention)',''],['Session & device management',''],['Data backup schedule (daily)','']]},
];
export default function Settings() {
  return (
    <div>
      <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Settings & system configuration</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {CATS.map(cat => (
          <div key={cat.title} className="card">
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:9 }}>
              <i className={'ti '+cat.icon} style={{ fontSize:18 }} />
              <span style={{ fontSize:12, fontWeight:600 }}>{cat.title}</span>
            </div>
            {cat.items.map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:'0.5px solid var(--border)', cursor:'pointer' }}
                onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-accent)')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                <span style={{ color:'var(--text-accent)', fontSize:11 }}>{l}</span>
                {v && <span className="bx g">{v}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
