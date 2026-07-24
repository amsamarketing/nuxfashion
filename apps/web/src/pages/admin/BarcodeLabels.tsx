import { useMemo, useRef, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import JsBarcode from 'jsbarcode';
import { api } from '../../lib/api';

type LabelItem={id:string;product:string;product_ar?:string;variant:string;sku:string;barcode:string;color?:string;size?:string;price:number;category?:string;copies:number};
const money=(n:any)=>`SAR ${Number(n||0).toFixed(2)}`;

function BarcodePreview({value}: {value:string}){
  const ref=useRef<SVGSVGElement>(null);
  useEffect(()=>{if(ref.current&&value)JsBarcode(ref.current,value,{format:'CODE128',displayValue:false,height:34,width:1.35,margin:0})},[value]);
  return <svg ref={ref} style={{width:'100%',height:38}}/>;
}

export default function BarcodeLabels(){
  const [search,setSearch]=useState('');const [category,setCategory]=useState('');
  const [labelSize,setLabelSize]=useState('50x30');const [showPrice,setShowPrice]=useState(true);
  const [showArabic,setShowArabic]=useState(false);const [queue,setQueue]=useState<Record<string,LabelItem>>({});
  const {data=[],isLoading}=useQuery<any[]>({queryKey:['barcode-products'],queryFn:()=>api.get('/catalog/products?limit=500').then(r=>r.data)});
  const products:any[]=Array.isArray(data)?data:[];
  const categories=useMemo(()=>Array.from(new Set(products.map(p=>p.category_name).filter(Boolean))).sort(),[products]);
  const rows=useMemo(()=>products.flatMap(p=>(p.variants||[]).map((v:any)=>({
    id:v.id,product:p.name,product_ar:p.name_ar,variant:v.name||'',sku:v.sku||'',barcode:v.barcode||'',
    color:v.color,size:v.size,price:Number(v.selling_price||0),category:p.category_name||'Uncategorized'
  }))).filter((v:any)=>(!category||v.category===category)&&(!search.trim()||
    [v.product,v.product_ar,v.variant,v.sku,v.barcode,v.color,v.size].some(x=>String(x||'').toLowerCase().includes(search.toLowerCase())))),[products,search,category]);
  const queued=Object.values(queue),totalLabels=queued.reduce((s,x)=>s+x.copies,0),missing=rows.filter((x:any)=>!x.barcode).length;
  const add=(v:any,copies=1)=>{if(!v.barcode)return;setQueue(q=>({...q,[v.id]:{...v,copies:q[v.id]?.copies||copies}}))};
  const addProduct=(name:string)=>rows.filter((v:any)=>v.product===name&&v.barcode).forEach((v:any)=>add(v));
  const print=()=>{
    if(!queued.length)return;
    const [w,h]=labelSize.split('x').map(Number);const labels=queued.flatMap(x=>Array.from({length:x.copies},()=>x));
    const markup=labels.map(x=>{
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      JsBarcode(svg,x.barcode,{format:'CODE128',displayValue:false,height:42,width:1.45,margin:0});
      return `<article><b>${esc(x.product)}</b>${showArabic&&x.product_ar?`<div class="ar">${esc(x.product_ar)}</div>`:''}
      <small>${esc([x.color,x.size].filter(Boolean).join(' · ')||x.variant||x.sku)}</small>
      ${svg.outerHTML}<strong>${esc(x.barcode)}</strong>${showPrice?`<em>${money(x.price)}</em>`:''}</article>`}).join('');
    const win=window.open('','_blank','width=1000,height=800');if(!win)return;
    win.document.write(`<!doctype html><html><head><title>Product Barcode Labels</title><style>
      @page{size:auto;margin:3mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;display:grid;grid-template-columns:repeat(auto-fill,${w}mm);gap:1mm;align-content:start}
      article{width:${w}mm;height:${h}mm;overflow:hidden;border:.2mm solid #d1d5db;padding:1.5mm;text-align:center;page-break-inside:avoid;display:flex;flex-direction:column;align-items:center;justify-content:center}
      b{font-size:${h<=25?8:9}px;line-height:1.05;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ar{font-size:8px;direction:rtl}small{font-size:7px;color:#475569;margin:1px 0}
      svg{width:94%;height:${h<=25?9:11}mm}strong{font:7px monospace;letter-spacing:.4px}em{font-size:9px;font-style:normal;font-weight:800;margin-top:1px}
      @media print{article{border:0}button{display:none}}</style></head><body>${markup}<script>window.onload=()=>window.print()<\/script></body></html>`);
    win.document.close();
  };
  return <div className="barcode-page">
    <div className="nx-page-head"><div><h1 className="nx-page-title">Barcode Label Printing</h1><p className="nx-page-sub">Print product and variant labels in bulk for clothing, shoes, bags and accessories</p></div>
      <button className="btn-nx primary" disabled={!queued.length} onClick={print}><i className="ti ti-printer"/> Print {totalLabels} Labels</button></div>
    <div className="nx-stats cols-4" style={{marginBottom:18}}><Stat tone="indigo" icon="ti-barcode" label="Available Variants" value={rows.length}/><Stat tone="green" icon="ti-list-check" label="Selected Variants" value={queued.length}/><Stat tone="teal" icon="ti-tags" label="Labels to Print" value={totalLabels}/><Stat tone={missing?'amber':'green'} icon="ti-alert-triangle" label="Missing Barcodes" value={missing}/></div>
    <div className="barcode-workspace">
      <section className="nx-card barcode-catalog">
        <div className="barcode-toolbar"><div className="barcode-search"><i className="ti ti-search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search product, SKU, barcode, color or size…"/></div>
          <select className="nx-select" value={category} onChange={e=>setCategory(e.target.value)}><option value="">All Categories</option>{categories.map((c:any)=><option key={c}>{c}</option>)}</select>
          <button className="btn-nx ghost sm" onClick={()=>rows.forEach((v:any)=>add(v))}><i className="ti ti-select-all"/> Add Visible</button></div>
        <div className="barcode-table"><div className="barcode-row head"><span>Product / Variant</span><span>SKU</span><span>Barcode</span><span>Price</span><span/></div>
          {isLoading?<div className="barcode-empty">Loading products…</div>:rows.map((v:any)=><div className="barcode-row" key={v.id}><span><b>{v.product}</b><small>{[v.color,v.size].filter(Boolean).join(' · ')||v.variant||'Default variant'}</small></span><code>{v.sku||'—'}</code><code className={!v.barcode?'missing':''}>{v.barcode||'Missing barcode'}</code><strong>{money(v.price)}</strong><span className="barcode-row-actions"><button title="Add all variants of this product" onClick={()=>addProduct(v.product)}><i className="ti ti-stack-2"/></button><button disabled={!v.barcode} onClick={()=>add(v)}><i className="ti ti-plus"/></button></span></div>)}
          {!isLoading&&!rows.length&&<div className="barcode-empty">No matching product variants.</div>}</div>
      </section>
      <aside className="nx-card barcode-queue"><h3>Print Queue</h3><p>Choose label format and copies for each variant.</p>
        <div className="label-settings"><label>Label size<select value={labelSize} onChange={e=>setLabelSize(e.target.value)}><option value="50x30">50 × 30 mm</option><option value="40x25">40 × 25 mm</option><option value="60x40">60 × 40 mm</option></select></label>
          <label className="check"><input type="checkbox" checked={showPrice} onChange={e=>setShowPrice(e.target.checked)}/> Show selling price</label><label className="check"><input type="checkbox" checked={showArabic} onChange={e=>setShowArabic(e.target.checked)}/> Show Arabic name</label></div>
        <div className="queue-list">{queued.map(x=><article key={x.id}><div><b>{x.product}</b><small>{[x.color,x.size].filter(Boolean).join(' · ')||x.sku}</small><BarcodePreview value={x.barcode}/></div><div className="copy-control"><button onClick={()=>setQueue(q=>{const n={...q};if(n[x.id].copies<=1)delete n[x.id];else n[x.id]={...n[x.id],copies:n[x.id].copies-1};return n})}>−</button><input type="number" min="1" value={x.copies} onChange={e=>setQueue(q=>({...q,[x.id]:{...q[x.id],copies:Math.max(1,Number(e.target.value)||1)}}))}/><button onClick={()=>setQueue(q=>({...q,[x.id]:{...q[x.id],copies:q[x.id].copies+1}}))}>+</button></div></article>)}
          {!queued.length&&<div className="barcode-empty"><i className="ti ti-barcode-off"/>Select variants from the product list.</div>}</div>
        {!!queued.length&&<button className="btn-nx ghost" onClick={()=>setQueue({})}><i className="ti ti-trash"/> Clear Queue</button>}
      </aside>
    </div>
  </div>;
}
function Stat({tone,icon,label,value}:any){return <div className="nx-stat"><div className={`nx-stat-icon ${tone}`}><i className={`ti ${icon}`}/></div><div className="nx-stat-body"><div className="nx-stat-val">{value}</div><div className="nx-stat-lbl">{label}</div></div></div>}
const esc=(s:any)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
