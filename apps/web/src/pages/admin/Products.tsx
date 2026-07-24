import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useRef } from 'react';

const SIZE_GROUPS=[
  {name:'Clothing',icon:'ti-shirt',sizes:['XXS','XS','S','M','L','XL','XXL','3XL','4XL','5XL','28','30','32','34','36','38','40','42','44']},
  {name:'Shoes (EU)',icon:'ti-shoe',sizes:['35','36','37','38','39','40','41','42','43','44','45','46','47','48']},
  {name:'Accessories',icon:'ti-watch',sizes:['One Size','Adjustable','Small','Medium','Large']},
  {name:'Bags',icon:'ti-briefcase',sizes:['Mini','Small','Medium','Large','Extra Large','One Size']},
];
const SIZES=[...new Set(SIZE_GROUPS.flatMap(group=>group.sizes))];
const COLORS=['Black','White','Navy','Grey','Beige','Brown','Red','Pink','Blue','Green','Yellow','Orange','Purple','Gold','Silver','Multicolor'];
const COLOR_DOT:Record<string,string>={Black:'#111',White:'#f5f5f5',Navy:'#1e3a5f',Grey:'#9ca3af',Beige:'#d4b896',Brown:'#7c4a03',Red:'#ef4444',Pink:'#f472b6',Blue:'#3b82f6',Green:'#22c55e',Yellow:'#eab308',Orange:'#f97316',Purple:'#a855f7',Gold:'#f59e0b',Silver:'#aaa',Multicolor:'linear-gradient(135deg,#ef4444,#3b82f6,#22c55e)'};

const slugify=(s:string)=>s.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
const NO_POS='channel:no-pos';
const NO_ECOM='channel:no-ecommerce';
const csvCell=(v:any)=>`"${String(v??'').replace(/"/g,'""')}"`;
const autoBarcode=(seed:string)=>{
  let hash=2166136261;
  for(let i=0;i<seed.length;i++){hash^=seed.charCodeAt(i);hash=Math.imul(hash,16777619);}
  let digits='';
  for(let i=0;i<12;i++){hash^=hash<<13;hash^=hash>>>17;hash^=hash<<5;digits+=String((hash>>>0)%10);}
  const sum=digits.split('').reduce((total,digit,index)=>total+Number(digit)*(index%2===0?1:3),0);
  return digits+String((10-(sum%10))%10);
};
const parseCsv=(text:string)=>text.trim().split(/\r?\n/).map(line=>{
  const cells:string[]=[];let cur='';let quoted=false;
  for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'&&line[i+1]==='"'&&quoted){cur+='"';i++;}else if(c==='"'){quoted=!quoted;}else if(c===','&&!quoted){cells.push(cur);cur='';}else cur+=c;}cells.push(cur);return cells;
});

function inp(label:string,el:React.ReactNode){return(<div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>{label}</label>{el}</div>);}

/* ── Brand Modal ─────────────────────────────────────────── */
function BrandModal({brand,onClose}:{brand:any;onClose:()=>void}){
  const qc=useQueryClient();
  const [form,setForm]=useState({name:brand?.name||'',name_ar:brand?.name_ar||'',logo_url:brand?.logo_url||'',is_active:brand?.is_active??true});
  const F=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const save=useMutation({
    mutationFn:()=>brand?.id?api.patch(`/catalog/brands/${brand.id}`,form):api.post('/catalog/brands',form),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['brands']});onClose();},
  });
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{width:'min(440px,100%)',background:'var(--cd)',borderRadius:16,overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 22px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{margin:0,fontSize:17,fontWeight:700}}>{brand?.id?'Edit Brand':'New Brand'}</h2>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x"/></button>
        </div>
        <div style={{padding:20,display:'grid',gap:12}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {inp('Brand Name (EN) *',<input className="nx-input" style={{width:'100%'}} value={form.name} onChange={e=>F('name',e.target.value)} placeholder="Nike"/>)}
            {inp('Brand Name (AR)',<input className="nx-input" style={{width:'100%',direction:'rtl'}} value={form.name_ar} onChange={e=>F('name_ar',e.target.value)} placeholder="نايك"/>)}
          </div>
          {inp('Logo URL',<input className="nx-input" style={{width:'100%'}} value={form.logo_url} onChange={e=>F('logo_url',e.target.value)} placeholder="https://..."/>)}
          {form.logo_url&&<img src={form.logo_url} alt="" style={{height:48,objectFit:'contain',borderRadius:6,border:'1px solid var(--bd)'}} onError={e=>(e.currentTarget.style.display='none')}/>}
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
            <input type="checkbox" checked={form.is_active} onChange={e=>F('is_active',e.target.checked)}/><span style={{fontSize:13}}>Active</span>
          </label>
        </div>
        <div style={{padding:'14px 20px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={()=>save.mutate()} disabled={!form.name||save.isPending}>{save.isPending?'Saving...':'Save Brand'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Category Modal ──────────────────────────────────────── */
function CategoryModal({cat,categories,onClose}:{cat:any;categories:any[];onClose:()=>void}){
  const qc=useQueryClient();
  const [form,setForm]=useState({name:cat?.name||'',name_ar:cat?.name_ar||'',slug:cat?.slug||'',description:cat?.description||'',parent_id:cat?.parent_id||'',image_url:cat?.image_url||'',sort_order:cat?.sort_order??0,is_active:cat?.is_active??true});
  const F=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const roots=categories.filter(c=>!c.parent_id&&c.id!==cat?.id);
  const save=useMutation({
    mutationFn:()=>cat?.id?api.patch(`/catalog/categories/${cat.id}`,{...form,parent_id:form.parent_id||undefined}):api.post('/catalog/categories',{...form,parent_id:form.parent_id||undefined}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['categories']});onClose();},
  });
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{width:'min(520px,100%)',background:'var(--cd)',borderRadius:16,overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 22px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{margin:0,fontSize:17,fontWeight:700}}>{cat?.id?'Edit Category':'New Category'}</h2>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x"/></button>
        </div>
        <div style={{padding:20,display:'grid',gap:12}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {inp('Name (EN) *',<input className="nx-input" style={{width:'100%'}} value={form.name} onChange={e=>{F('name',e.target.value);if(!cat?.id)F('slug',slugify(e.target.value));}} placeholder="T-Shirts"/>)}
            {inp('Name (AR)',<input className="nx-input" style={{width:'100%',direction:'rtl'}} value={form.name_ar} onChange={e=>F('name_ar',e.target.value)} placeholder="تيشيرتات"/>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {inp('Slug *',<input className="nx-input" style={{width:'100%',fontFamily:'monospace'}} value={form.slug} onChange={e=>F('slug',e.target.value)} placeholder="t-shirts"/>)}
            {inp('Parent Category',<select className="nx-select" style={{width:'100%'}} value={form.parent_id} onChange={e=>F('parent_id',e.target.value)}><option value="">— Root —</option>{roots.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>)}
          </div>
          {inp('Description',<textarea className="nx-input" style={{width:'100%',height:52,resize:'none'}} value={form.description} onChange={e=>F('description',e.target.value)}/>)}
          <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10,alignItems:'end'}}>
            {inp('Image URL',<input className="nx-input" style={{width:'100%'}} value={form.image_url} onChange={e=>F('image_url',e.target.value)} placeholder="https://..."/>)}
            {inp('Sort',<input className="nx-input" type="number" style={{width:64}} value={form.sort_order} onChange={e=>F('sort_order',parseInt(e.target.value)||0)}/>)}
          </div>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
            <input type="checkbox" checked={form.is_active} onChange={e=>F('is_active',e.target.checked)}/><span style={{fontSize:13}}>Active</span>
          </label>
        </div>
        <div style={{padding:'14px 20px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={()=>save.mutate()} disabled={!form.name||!form.slug||save.isPending}>{save.isPending?'Saving...':'Save Category'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Variant Modal ───────────────────────────────────────── */
function VariantModal({productId,variant,onClose}:{productId:string;variant:any;onClose:()=>void}){
  const qc=useQueryClient();
  const [form,setForm]=useState({name:variant?.name||'',name_ar:variant?.name_ar||'',sku:variant?.sku||'',barcode:variant?.barcode||'',size:variant?.size||'',color:variant?.color||'',cost_price:String(variant?.cost_price||''),selling_price:String(variant?.selling_price||''),compare_price:String(variant?.compare_price||''),stock_quantity:String(variant?.stock_quantity||0),low_stock_threshold:String(variant?.low_stock_threshold||5)});
  const F=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const generatedBarcode=autoBarcode(`${productId}|${form.sku}|${form.color}|${form.size}`);
  const save=useMutation({
    mutationFn:()=>variant?.id
      ?api.patch(`/catalog/products/variants/${variant.id}`,{...form,cost_price:parseFloat(form.cost_price)||undefined,selling_price:parseFloat(form.selling_price)||undefined,compare_price:parseFloat(form.compare_price)||undefined,stock_quantity:parseInt(form.stock_quantity)||0,low_stock_threshold:parseInt(form.low_stock_threshold)||5})
      :api.post(`/catalog/products/${productId}/variants`,{...form,barcode:form.barcode||generatedBarcode,cost_price:parseFloat(form.cost_price)||undefined,selling_price:parseFloat(form.selling_price)||undefined,compare_price:parseFloat(form.compare_price)||undefined,stock_quantity:parseInt(form.stock_quantity)||0,low_stock_threshold:parseInt(form.low_stock_threshold)||5}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['products']});qc.invalidateQueries({queryKey:['product',productId]});onClose();},
  });
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1100,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{width:'min(560px,100%)',background:'var(--cd)',borderRadius:16,overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 22px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{margin:0,fontSize:17,fontWeight:700}}>{variant?.id?'Edit Variant':'Add Variant'}</h2>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x"/></button>
        </div>
        <div style={{padding:20,display:'grid',gap:12}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {inp('Variant Name (EN)',<input className="nx-input" style={{width:'100%'}} value={form.name} onChange={e=>F('name',e.target.value)} placeholder="Black / L"/>)}
            {inp('Variant Name (AR)',<input className="nx-input" style={{width:'100%',direction:'rtl'}} value={form.name_ar} onChange={e=>F('name_ar',e.target.value)}/>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {inp('Size',<><input className="nx-input" list="product-size-options" style={{width:'100%'}} value={form.size} onChange={e=>F('size',e.target.value)} placeholder="Select or type a size"/><datalist id="product-size-options">{SIZES.map(s=><option key={s} value={s}/>)}</datalist></>)}
            {inp('Color',<><input className="nx-input" list="product-color-options" style={{width:'100%'}} value={form.color} onChange={e=>F('color',e.target.value)} placeholder="Select or type a color"/><datalist id="product-color-options">{COLORS.map(c=><option key={c} value={c}/>)}</datalist></>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {inp('SKU',<input className="nx-input" style={{width:'100%',fontFamily:'monospace'}} value={form.sku} onChange={e=>F('sku',e.target.value)} placeholder="PROD-BLK-L"/>)}
            {inp('Barcode (auto)',<input className="nx-input" style={{width:'100%',fontFamily:'monospace'}} value={form.barcode||generatedBarcode} onChange={e=>F('barcode',e.target.value)} title="Automatically generated from SKU, color and size"/>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
            {inp('Cost Price (SAR)',<input className="nx-input" type="number" style={{width:'100%'}} value={form.cost_price} onChange={e=>F('cost_price',e.target.value)}/>)}
            {inp('Selling Price (SAR)',<input className="nx-input" type="number" style={{width:'100%'}} value={form.selling_price} onChange={e=>F('selling_price',e.target.value)}/>)}
            {inp('Compare Price (SAR)',<input className="nx-input" type="number" style={{width:'100%'}} value={form.compare_price} onChange={e=>F('compare_price',e.target.value)} placeholder="Was..."/>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {inp('Stock Qty',<input className="nx-input" type="number" style={{width:'100%'}} value={form.stock_quantity} onChange={e=>F('stock_quantity',e.target.value)}/>)}
            {inp('Low Stock Alert',<input className="nx-input" type="number" style={{width:'100%'}} value={form.low_stock_threshold} onChange={e=>F('low_stock_threshold',e.target.value)}/>)}
          </div>
        </div>
        <div style={{padding:'14px 20px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={()=>save.mutate()} disabled={save.isPending}>{save.isPending?'Saving...':'Save Variant'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Bulk Variant Modal ──────────────────────────────────── */
function BulkVariantModal({product,existing,onClose}:{product:any;existing:any[];onClose:()=>void}){
  const qc=useQueryClient();
  const [sizes,setSizes]=useState<string[]>([]);
  const [colors,setColors]=useState<string[]>([]);
  const [customSizes,setCustomSizes]=useState('');
  const [customColors,setCustomColors]=useState('');
  const [form,setForm]=useState({model:String(product.sku_prefix||''),cost_price:'',selling_price:'',compare_price:'',stock_quantity:'0',low_stock_threshold:'5'});
  const toggle=(list:string[],value:string,setter:(v:string[])=>void)=>setter(list.includes(value)?list.filter(v=>v!==value):[...list,value]);
  const cleanList=(preset:string[],custom:string)=>[...new Set([...preset,...custom.split(',').map(v=>v.trim()).filter(Boolean)])];
  const allSizes=cleanList(sizes,customSizes);
  const allColors=cleanList(colors,customColors);
  const combinations=(allSizes.length?allSizes:['']).flatMap(size=>(allColors.length?allColors:['']).map(color=>({size,color})));
  const save=useMutation({
    mutationFn:async()=>{
      const current=new Set(existing.map(v=>`${String(v.size||'').toLowerCase()}|${String(v.color||'').toLowerCase()}`));
      const prefix=String(form.model||product.sku_prefix||product.name||'PROD').toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,20)||'PROD';
      let created=0,skipped=0;
      for(const item of combinations){
        const key=`${item.size.toLowerCase()}|${item.color.toLowerCase()}`;
        if(current.has(key)){skipped++;continue;}
        const suffix=[item.color,item.size].filter(Boolean).map(v=>v.toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'')).join('-');
        const sku=`${prefix}-${suffix||'STD'}`;
        await api.post(`/catalog/products/${product.id}/variants`,{
          name:[item.color,item.size].filter(Boolean).join(' / ')||'Standard',
          size:item.size||undefined,color:item.color||undefined,sku,barcode:autoBarcode(`${product.id}|${sku}|${item.color}|${item.size}`),
          cost_price:parseFloat(form.cost_price)||0,selling_price:parseFloat(form.selling_price)||0,
          compare_price:parseFloat(form.compare_price)||undefined,stock_quantity:parseInt(form.stock_quantity)||0,
          low_stock_threshold:parseInt(form.low_stock_threshold)||5,
        });
        current.add(key);created++;
      }
      return {created,skipped};
    },
    onSuccess:async result=>{await qc.invalidateQueries({queryKey:['products']});await qc.invalidateQueries({queryKey:['product',product.id]});alert(`${result.created} variants added${result.skipped?` · ${result.skipped} duplicates skipped`:''}`);onClose();},
  });
  const chip=(value:string,active:boolean,onClick:()=>void)=><button key={value} type="button" className={`btn-nx ${active?'primary':'ghost'} sm`} onClick={onClick}>{value}</button>;
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:1200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{width:'min(760px,100%)',maxHeight:'92vh',background:'var(--cd)',borderRadius:16,overflow:'hidden',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 22px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><h2 style={{margin:0,fontSize:17,fontWeight:700}}>Bulk Add Sizes & Colors</h2><div style={{fontSize:12,color:'var(--mu)',marginTop:3}}>{product.name} · Select multiple options to create every combination</div></div>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x"/></button>
        </div>
        <div style={{padding:20,overflowY:'auto',display:'grid',gap:18}}>
          <div>
            <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>1. Select sizes</div>
            {SIZE_GROUPS.map(group=><div key={group.name} style={{marginBottom:10}}><div style={{fontSize:11,color:'var(--mu)',marginBottom:6}}>{group.name}</div><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{group.sizes.map(size=>chip(size,sizes.includes(size),()=>toggle(sizes,size,setSizes)))}</div></div>)}
            <input className="nx-input" style={{width:'100%',marginTop:4}} value={customSizes} onChange={e=>setCustomSizes(e.target.value)} placeholder="Other sizes, comma-separated (optional)"/>
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>2. Select colors</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{COLORS.map(color=><button key={color} type="button" className={`btn-nx ${colors.includes(color)?'primary':'ghost'} sm`} onClick={()=>toggle(colors,color,setColors)}><span style={{width:12,height:12,borderRadius:'50%',background:COLOR_DOT[color],border:'1px solid rgba(0,0,0,.15)'}}/>{color}</button>)}</div>
            <input className="nx-input" style={{width:'100%',marginTop:10}} value={customColors} onChange={e=>setCustomColors(e.target.value)} placeholder="Other colors, comma-separated (optional)"/>
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>3. Common price and stock</div>
            {inp('Model / SKU Prefix *',<input className="nx-input" style={{width:'100%',marginBottom:10,fontFamily:'monospace'}} value={form.model} onChange={e=>setForm(f=>({...f,model:e.target.value.toUpperCase()}))} placeholder="Example: NK-AIR90"/>)}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:8}}>
              {inp('Cost (SAR)',<input className="nx-input" type="number" style={{width:'100%'}} value={form.cost_price} onChange={e=>setForm(f=>({...f,cost_price:e.target.value}))}/>)}
              {inp('Selling (SAR)',<input className="nx-input" type="number" style={{width:'100%'}} value={form.selling_price} onChange={e=>setForm(f=>({...f,selling_price:e.target.value}))}/>)}
              {inp('Compare (SAR)',<input className="nx-input" type="number" style={{width:'100%'}} value={form.compare_price} onChange={e=>setForm(f=>({...f,compare_price:e.target.value}))}/>)}
              {inp('Stock per variant',<input className="nx-input" type="number" style={{width:'100%'}} value={form.stock_quantity} onChange={e=>setForm(f=>({...f,stock_quantity:e.target.value}))}/>)}
              {inp('Low stock alert',<input className="nx-input" type="number" style={{width:'100%'}} value={form.low_stock_threshold} onChange={e=>setForm(f=>({...f,low_stock_threshold:e.target.value}))}/>)}
            </div>
          </div>
          <div style={{padding:'11px 13px',borderRadius:9,background:'var(--acg)',color:'var(--ac)',fontSize:13,fontWeight:600}}>{allSizes.length||'No'} size(s) × {allColors.length||'No'} color(s) = {(allSizes.length||1)*(allColors.length||1)} variant(s)</div>
        </div>
        <div style={{padding:'14px 20px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={()=>save.mutate()} disabled={!form.model.trim()||(!allSizes.length&&!allColors.length)||save.isPending}>{save.isPending?'Adding variants...':`Add ${combinations.length} Variants`}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Product Modal ───────────────────────────────────────── */
function ProductModal({prod,categories,brands,onClose}:{prod:any;categories:any[];brands:any[];onClose:()=>void}){
  const qc=useQueryClient();
  const existingTags:string[]=prod?.tags||[];
  const [form,setForm]=useState({name:prod?.name||'',name_ar:prod?.name_ar||'',description:prod?.description||'',description_ar:prod?.description_ar||'',category_id:prod?.category_id||'',brand_id:prod?.brand_id||'',sku_prefix:prod?.sku_prefix||'',image_url:prod?.image_url||'',tags:existingTags.filter(t=>!t.startsWith('channel:')).join(', '),is_active:prod?.is_active??true,pos_active:!existingTags.includes(NO_POS),ecommerce_active:!existingTags.includes(NO_ECOM)});
  const F=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const save=useMutation({
    mutationFn:()=>{
      const tags=form.tags.split(',').map((t:string)=>t.trim()).filter(Boolean);
      if(!form.pos_active)tags.push(NO_POS);if(!form.ecommerce_active)tags.push(NO_ECOM);
      const {pos_active,ecommerce_active,...rest}=form;
      const body={...rest,tags,category_id:form.category_id||undefined,brand_id:form.brand_id||undefined};
      return prod?.id?api.patch(`/catalog/products/${prod.id}`,body):api.post('/catalog/products',body);
    },
    onSuccess:()=>{qc.invalidateQueries({queryKey:['products']});onClose();},
  });
  const roots=categories.filter(c=>!c.parent_id);
  const subs=categories.filter(c=>c.parent_id);
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{width:'min(600px,100%)',background:'var(--cd)',borderRadius:16,overflow:'hidden',display:'flex',flexDirection:'column',maxHeight:'90vh'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 22px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <h2 style={{margin:0,fontSize:17,fontWeight:700}}>{prod?.id?'Edit Product':'New Product'}</h2>
          <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x"/></button>
        </div>
        <div style={{padding:20,overflowY:'auto',flex:1,display:'grid',gap:14}}>
          <div style={{fontWeight:600,fontSize:12,color:'var(--mu)',textTransform:'uppercase',letterSpacing:.5}}>Basic Info</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {inp('Product Name (EN) *',<input className="nx-input" style={{width:'100%'}} value={form.name} onChange={e=>F('name',e.target.value)} placeholder="Classic White Tee"/>)}
            {inp('Product Name (AR)',<input className="nx-input" style={{width:'100%',direction:'rtl'}} value={form.name_ar} onChange={e=>F('name_ar',e.target.value)} placeholder="تيشيرت أبيض كلاسيك"/>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
            {inp('SKU Prefix',<input className="nx-input" style={{width:'100%',fontFamily:'monospace'}} value={form.sku_prefix} onChange={e=>F('sku_prefix',e.target.value.toUpperCase())} placeholder="WT"/>)}
            {inp('Category',
              <select className="nx-select" style={{width:'100%'}} value={form.category_id} onChange={e=>F('category_id',e.target.value)}>
                <option value="">— None —</option>
                {roots.map(r=><optgroup key={r.id} label={r.name}>
                  <option value={r.id}>{r.name}</option>
                  {subs.filter(s=>s.parent_id===r.id).map(s=><option key={s.id} value={s.id}>  ↳ {s.name}</option>)}
                </optgroup>)}
                {subs.filter(s=>!roots.find(r=>r.id===s.parent_id)).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            {inp('Brand',<select className="nx-select" style={{width:'100%'}} value={form.brand_id} onChange={e=>F('brand_id',e.target.value)}><option value="">— None —</option>{brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>)}
          </div>
          {inp('Tags (comma-separated)',<input className="nx-input" style={{width:'100%'}} value={form.tags} onChange={e=>F('tags',e.target.value)} placeholder="summer, casual, cotton"/>)}
          <div style={{fontWeight:600,fontSize:12,color:'var(--mu)',textTransform:'uppercase',letterSpacing:.5,marginTop:4}}>Product Image</div>
          <div style={{display:'grid',gridTemplateColumns:'110px 1fr',gap:12,alignItems:'center'}}>
            <div style={{height:100,border:'1px dashed var(--bd)',borderRadius:10,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
              {form.image_url?<img src={form.image_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<i className="ti ti-photo" style={{fontSize:28,color:'var(--mu)'}}/>}
            </div>
            <div>
              <input className="nx-input" style={{width:'100%',marginBottom:7}} value={form.image_url} onChange={e=>F('image_url',e.target.value)} placeholder="Image URL or upload below"/>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{
                const file=e.target.files?.[0];if(!file)return;
                if(file.size>1024*1024){alert('Image must be 1 MB or smaller');return;}
                const reader=new FileReader();reader.onload=()=>F('image_url',String(reader.result));reader.readAsDataURL(file);
              }}/>
              {form.image_url&&<button className="btn-nx ghost sm" style={{marginTop:7,color:'#ef4444'}} onClick={()=>F('image_url','')}>Remove image</button>}
            </div>
          </div>
          <div style={{fontWeight:600,fontSize:12,color:'var(--mu)',textTransform:'uppercase',letterSpacing:.5,marginTop:4}}>Description</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {inp('Description (EN)',<textarea className="nx-input" style={{width:'100%',height:72,resize:'none'}} value={form.description} onChange={e=>F('description',e.target.value)}/>)}
            {inp('Description (AR)',<textarea className="nx-input" style={{width:'100%',height:72,resize:'none',direction:'rtl'}} value={form.description_ar} onChange={e=>F('description_ar',e.target.value)}/>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
            {[['is_active','Product Active','Available for business'],['pos_active','Active in POS','Visible to cashiers'],['ecommerce_active','Active in E-commerce','Visible in online store']].map(([key,title,sub])=><label key={key} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'10px 12px',border:'1px solid var(--bd)',borderRadius:8}}>
              <input type="checkbox" checked={(form as any)[key]} onChange={e=>F(key,e.target.checked)}/><div><div style={{fontWeight:600,fontSize:12}}>{title}</div><div style={{fontSize:10,color:'var(--mu)'}}>{sub}</div></div>
            </label>)}
          </div>
          {prod?.id&&<div style={{padding:'10px 14px',background:'var(--acg)',borderRadius:8,fontSize:12,color:'var(--ac)'}}><i className="ti ti-info-circle" style={{marginRight:6}}/>Save product first, then manage variants in the side panel.</div>}
        </div>
        <div style={{padding:'14px 20px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end',flexShrink:0}}>
          <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
          <button className="btn-nx primary" onClick={()=>save.mutate()} disabled={!form.name||save.isPending}>{save.isPending?'Saving...':'Save Product'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function Products(){
  const qc=useQueryClient();
  const [tab,setTab]=useState('products');
  const [search,setSearch]=useState('');
  const [filterCat,setFilterCat]=useState('');
  const [filterBrand,setFilterBrand]=useState('');
  const [filterStatus,setFilterStatus]=useState('all');
  const [sortBy,setSortBy]=useState('newest');
  const [selected,setSelected]=useState<any>(null);
  const [detailTab,setDetailTab]=useState('info');
  const [showProd,setShowProd]=useState(false);
  const [editProd,setEditProd]=useState<any>(null);
  const [showVariant,setShowVariant]=useState(false);
  const [showBulkVariants,setShowBulkVariants]=useState(false);
  const [editVariant,setEditVariant]=useState<any>(null);
  const importRef=useRef<HTMLInputElement>(null);
  const [showCat,setShowCat]=useState(false);
  const [editCat,setEditCat]=useState<any>(null);
  const [showBrand,setShowBrand]=useState(false);
  const [editBrand,setEditBrand]=useState<any>(null);

  const {data:prodData,isLoading:prodLoading}=useQuery({queryKey:['products'],queryFn:async()=>{const r=await api.get('/catalog/products?limit=300');return r.data;}});
  const {data:catData}=useQuery({queryKey:['categories'],queryFn:async()=>{const r=await api.get('/catalog/categories');return r.data;}});
  const {data:brandData}=useQuery({queryKey:['brands'],queryFn:async()=>{const r=await api.get('/catalog/brands');return r.data;}});

  const {data:detailData}=useQuery({queryKey:['product',selected?.id],queryFn:async()=>{const r=await api.get(`/catalog/products/${selected.id}`);return r.data;},enabled:!!selected?.id});

  const products:any[]=Array.isArray(prodData)?prodData:prodData?.products||prodData?.data||[];
  const categories:any[]=Array.isArray(catData)?catData:catData?.categories||catData?.data||[];
  const brands:any[]=Array.isArray(brandData)?brandData:brandData?.brands||brandData?.data||[];

  const detail:any=detailData;
  const variants:any[]=detail?.variants||[];

  const delProduct=useMutation({mutationFn:(id:string)=>api.delete(`/catalog/products/${id}`),onSuccess:()=>{qc.invalidateQueries({queryKey:['products']});setSelected(null);}});
  const delVariant=useMutation({mutationFn:(id:string)=>api.delete(`/catalog/products/variants/${id}`),onSuccess:()=>{qc.invalidateQueries({queryKey:['product',selected?.id]});}});
  const delCategory=useMutation({mutationFn:(id:string)=>api.delete(`/catalog/categories/${id}`),onSuccess:()=>qc.invalidateQueries({queryKey:['categories']})});
  const delBrand=useMutation({mutationFn:(id:string)=>api.delete(`/catalog/brands/${id}`),onSuccess:()=>qc.invalidateQueries({queryKey:['brands']})});

  const filtered=useMemo(()=>{
    let list=products;
    if(filterStatus==='active') list=list.filter(p=>p.is_active);
    if(filterStatus==='inactive') list=list.filter(p=>!p.is_active);
    if(filterStatus==='out') list=list.filter(p=>totalStock(p)===0);
    if(filterStatus==='incomplete') list=list.filter(p=>!p.image_url||!p.category_id||!(p.variants||[]).length||(p.variants||[]).some((v:any)=>!Number(v.selling_price)||!v.sku||!v.barcode));
    if(filterCat) list=list.filter(p=>p.category_id===filterCat);
    if(filterBrand) list=list.filter(p=>p.brand_id===filterBrand);
    if(search){const needle=search.toLowerCase();list=list.filter(p=>[p.name,p.name_ar,p.sku_prefix,p.category_name,p.brand_name,...(p.variants||[]).flatMap((v:any)=>[v.sku,v.barcode,v.color,v.size])].some(v=>String(v||'').toLowerCase().includes(needle)));}
    return [...list].sort((a,b)=>sortBy==='name'?String(a.name).localeCompare(String(b.name)):sortBy==='stock'?totalStock(b)-totalStock(a):sortBy==='price'?Number((a.variants||[])[0]?.selling_price||0)-Number((b.variants||[])[0]?.selling_price||0):new Date(b.created_at||0).getTime()-new Date(a.created_at||0).getTime());
  },[products,filterStatus,filterCat,filterBrand,search,sortBy]);

  const catMap=Object.fromEntries(categories.map(c=>[c.id,c.name]));
  const brandMap=Object.fromEntries(brands.map(b=>[b.id,b.name]));
  const rootCats=categories.filter(c=>!c.parent_id);
  const subCats=categories.filter(c=>c.parent_id);

  const priceRange=(p:any)=>{const vs=p.variants||[];if(!vs.length)return null;const prices=vs.map((v:any)=>v.selling_price).filter(Boolean);if(!prices.length)return null;const mn=Math.min(...prices),mx=Math.max(...prices);return mn===mx?`SAR ${mn}`:`SAR ${mn}–${mx}`;};
  function totalStock(p:any){return (p.variants||[]).reduce((s:number,v:any)=>s+Number(v.stock_quantity||0),0);}
  const totalVariants=products.reduce((s,p)=>s+(p.variants||[]).length,0);
  const outProducts=products.filter(p=>totalStock(p)===0).length;
  const incompleteProducts=products.filter(p=>!p.image_url||!p.category_id||!(p.variants||[]).length||(p.variants||[]).some((v:any)=>!Number(v.selling_price)||!v.sku||!v.barcode)).length;
  const exportProducts=()=>{
    const head=['name','name_ar','description','description_ar','sku_prefix','category','brand','image_url','active','active_pos','active_ecommerce','tags'];
    const rows=products.map(p=>[p.name,p.name_ar,p.description,p.description_ar,p.sku_prefix,catMap[p.category_id]||'',brandMap[p.brand_id]||'',p.image_url,p.is_active!==false,!(p.tags||[]).includes(NO_POS),!(p.tags||[]).includes(NO_ECOM),(p.tags||[]).filter((t:string)=>!t.startsWith('channel:')).join('|')]);
    const blob=new Blob([[head,...rows].map(r=>r.map(csvCell).join(',')).join('\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`products-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);
  };
  const importProducts=async(file:File)=>{
    const rows=parseCsv(await file.text());const head=rows.shift()?.map(x=>x.trim())||[];
    let done=0;
    for(const row of rows){const x=Object.fromEntries(head.map((h,i)=>[h,row[i]||'']));if(!x.name)continue;
      const tags=(x.tags||'').split('|').filter(Boolean);if(x.active_pos==='false')tags.push(NO_POS);if(x.active_ecommerce==='false')tags.push(NO_ECOM);
      await api.post('/catalog/products',{name:x.name,name_ar:x.name_ar||undefined,description:x.description||undefined,description_ar:x.description_ar||undefined,sku_prefix:x.sku_prefix||undefined,image_url:x.image_url||undefined,category_id:categories.find(c=>c.name===x.category)?.id,brand_id:brands.find(b=>b.name===x.brand)?.id,is_active:x.active!=='false',tags});done++;
    }
    await qc.invalidateQueries({queryKey:['products']});alert(`${done} products imported`);
  };

  return(<div style={{display:'flex',gap:0,height:'calc(100vh - 64px)',overflow:'hidden'}}>
    <div style={{flex:1,overflowY:'auto',padding:'0 20px 20px'}}>
      <div className="nx-page-head">
        <div><h1 className="nx-page-title">Products</h1><p className="nx-page-sub">{products.length} products · {categories.length} categories · {brands.length} brands</p></div>
        <div style={{display:'flex',gap:8}}>
          {tab==='categories'&&<button className="btn-nx primary" onClick={()=>{setEditCat(null);setShowCat(true);}}><i className="ti ti-plus"/> New Category</button>}
          {tab==='brands'&&<button className="btn-nx primary" onClick={()=>{setEditBrand(null);setShowBrand(true);}}><i className="ti ti-plus"/> New Brand</button>}
          {tab==='products'&&<><input ref={importRef} type="file" accept=".csv,text/csv" hidden onChange={e=>{const f=e.target.files?.[0];if(f)importProducts(f).catch(err=>alert(err?.response?.data?.message||err.message));e.currentTarget.value='';}}/><button className="btn-nx ghost" onClick={()=>importRef.current?.click()}><i className="ti ti-file-import"/> Import CSV</button><button className="btn-nx ghost" onClick={exportProducts}><i className="ti ti-file-export"/> Export CSV</button><button className="btn-nx primary" onClick={()=>{setEditProd(null);setShowProd(true);}}><i className="ti ti-plus"/> New Product</button></>}
        </div>
      </div>

      <div className="nx-stats cols-4" style={{marginBottom:16}}>
        <div className="nx-stat"><div className="nx-stat-icon indigo"><i className="ti ti-shirt"/></div><div className="nx-stat-body"><div className="nx-stat-val">{products.length}</div><div className="nx-stat-lbl">Total Products</div></div></div>
        <div className="nx-stat"><div className="nx-stat-icon teal"><i className="ti ti-box-multiple"/></div><div className="nx-stat-body"><div className="nx-stat-val">{totalVariants}</div><div className="nx-stat-lbl">Total Variants</div></div></div>
        <div className="nx-stat"><div className="nx-stat-icon red"><i className="ti ti-package-off"/></div><div className="nx-stat-body"><div className="nx-stat-val">{outProducts}</div><div className="nx-stat-lbl">Out of Stock</div></div></div>
        <div className="nx-stat"><div className="nx-stat-icon amber"><i className="ti ti-alert-triangle"/></div><div className="nx-stat-body"><div className="nx-stat-val">{incompleteProducts}</div><div className="nx-stat-lbl">Needs Attention</div></div></div>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:14,borderBottom:'1px solid var(--bd)'}}>
        {[['products','📦 Products'],['sizes-colors','📐 Sizes & Colors'],['categories','📂 Categories'],['brands','🏷 Brands']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:'8px 16px',border:'none',background:'none',borderBottom:tab===id?'2px solid var(--ac)':'2px solid transparent',color:tab===id?'var(--ac)':'var(--mu)',fontWeight:tab===id?600:400,cursor:'pointer',fontSize:13}}>{l}</button>
        ))}
      </div>

      {/* PRODUCTS TAB */}
      {tab==='products'&&(<div>
        <div className="product-list-toolbar">
          <div className="product-list-search"><i className="ti ti-search"/><input placeholder="Search product, SKU, barcode, size or color..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <select className="nx-select" value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c=><option key={c.id} value={c.id}>{c.parent_id?'  ↳ ':''}{c.name}</option>)}
          </select>
          <select className="nx-select" value={filterBrand} onChange={e=>setFilterBrand(e.target.value)}>
            <option value="">All Brands</option>
            {brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="nx-select" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="all">All Statuses</option><option value="active">Active</option><option value="inactive">Draft / Inactive</option><option value="out">Out of Stock</option><option value="incomplete">Needs Attention</option></select>
          <select className="nx-select" value={sortBy} onChange={e=>setSortBy(e.target.value)}><option value="newest">Newest First</option><option value="name">Name A–Z</option><option value="stock">Highest Stock</option><option value="price">Lowest Price</option></select>
          {(search||filterCat||filterBrand||filterStatus!=='all')&&<button className="btn-nx ghost sm" onClick={()=>{setSearch('');setFilterCat('');setFilterBrand('');setFilterStatus('all')}}><i className="ti ti-filter-off"/> Clear</button>}
        </div>
        {prodLoading?<div style={{padding:40,textAlign:'center',color:'var(--mu)'}}>Loading...</div>:filtered.length===0?<div className="nx-card" style={{textAlign:'center',padding:48,color:'var(--mu)'}}><i className="ti ti-shirt" style={{fontSize:40,display:'block',opacity:.3,marginBottom:8}}/><p style={{fontWeight:600}}>No products found</p></div>:(
          <div className="product-list-wrap"><table className="product-list-table"><thead><tr><th>Product</th><th>Model / Category</th><th>Variants</th><th>Price</th><th>Stock</th><th>Channels</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {filtered.map(p=>{
              const stock=totalStock(p);
              const price=priceRange(p);
              const threshold=(p.variants||[]).reduce((s:number,v:any)=>s+Number(v.low_stock_threshold||5),0);
              const isLow=stock>0&&stock<=Math.max(5,threshold);
              const isOut=stock===0;
              const tags:string[]=p.tags||[];const posOn=!tags.includes(NO_POS);const webOn=!tags.includes(NO_ECOM);
              const missing=[!p.image_url&&'Image',!p.category_id&&'Category',!(p.variants||[]).length&&'Variants',(p.variants||[]).some((v:any)=>!Number(v.selling_price))&&'Price',(p.variants||[]).some((v:any)=>!v.barcode)&&'Barcode'].filter(Boolean);
              return(
                <tr key={p.id} className={selected?.id===p.id?'selected':''} onClick={()=>{setSelected(p);setDetailTab('info');}}>
                  <td><div className="product-list-identity">{p.image_url?<img src={p.image_url} alt=""/>:<span><i className="ti ti-shirt"/></span>}<div><b>{p.name}</b>{p.name_ar&&<small dir="rtl">{p.name_ar}</small>}{missing.length>0&&<em title={`Missing: ${missing.join(', ')}`}><i className="ti ti-alert-circle"/> {missing.join(', ')}</em>}</div></div></td>
                  <td><b className="product-model">{p.sku_prefix||'No model'}</b><small className="product-cell-sub">{catMap[p.category_id]||'Uncategorized'}{p.brand_id?` · ${brandMap[p.brand_id]}`:''}</small></td>
                  <td><b>{(p.variants||[]).length}</b><small className="product-cell-sub">{[...new Set((p.variants||[]).map((v:any)=>v.color).filter(Boolean))].length} colors · {[...new Set((p.variants||[]).map((v:any)=>v.size).filter(Boolean))].length} sizes</small></td>
                  <td><b className="product-price">{price||'Not set'}</b></td>
                  <td><b className={isOut?'stock-out':isLow?'stock-low':'stock-good'}>{stock} units</b><small className="product-cell-sub">{isOut?'Out of stock':isLow?'Low stock':'Available'}</small></td>
                  <td><div className="product-channels"><span className={posOn?'on':'off'}><i className="ti ti-device-desktop"/> POS</span><span className={webOn?'on':'off'}><i className="ti ti-world"/> Web</span></div></td>
                  <td><span className={`nx-badge ${p.is_active?'active':'inactive'}`}>{p.is_active?'Active':'Draft'}</span></td>
                  <td><div className="product-row-actions"><button title="Manage variants" onClick={e=>{e.stopPropagation();setSelected(p);setDetailTab('variants')}}><i className="ti ti-box-multiple"/></button><button title="Edit product" onClick={e=>{e.stopPropagation();setEditProd(p);setShowProd(true)}}><i className="ti ti-edit"/></button><button className="danger" title="Delete" onClick={e=>{e.stopPropagation();if(confirm('Delete product?'))delProduct.mutate(p.id)}}><i className="ti ti-trash"/></button></div></td>
                </tr>
              );
            })}
          </tbody></table></div>
        )}
      </div>)}

      {/* SIZES & COLORS TAB */}
      {tab==='sizes-colors'&&(<div style={{display:'grid',gap:16}}>
        <div className="nx-card">
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
            <div className="nx-stat-icon indigo" style={{width:40,height:40}}><i className="ti ti-ruler"/></div>
            <div><div style={{fontWeight:700,fontSize:16}}>Size presets</div><div style={{fontSize:12,color:'var(--mu)'}}>Available when adding a variant. You can also type any custom size.</div></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>
            {SIZE_GROUPS.map(group=><div key={group.name} style={{padding:14,border:'1px solid var(--bd)',borderRadius:10,background:'var(--bg)'}}>
              <div style={{fontWeight:700,marginBottom:10,display:'flex',alignItems:'center',gap:7}}><i className={`ti ${group.icon}`} style={{color:'var(--ac)',fontSize:18}}/>{group.name}</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>{group.sizes.map(size=><span key={size} className="nx-badge blue">{size}</span>)}</div>
            </div>)}
          </div>
        </div>
        <div className="nx-card">
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
            <div className="nx-stat-icon rose" style={{width:40,height:40}}><i className="ti ti-palette"/></div>
            <div><div style={{fontWeight:700,fontSize:16}}>Color presets</div><div style={{fontSize:12,color:'var(--mu)'}}>Available for clothing, shoes, accessories and bags. Custom colors are also supported.</div></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8}}>
            {COLORS.map(color=><div key={color} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 11px',border:'1px solid var(--bd)',borderRadius:9}}>
              <span style={{width:20,height:20,borderRadius:'50%',background:COLOR_DOT[color],border:'1px solid var(--bd)',flexShrink:0}}/>
              <span style={{fontSize:12,fontWeight:600}}>{color}</span>
            </div>)}
          </div>
        </div>
        <div style={{padding:'12px 14px',background:'var(--acg)',border:'1px solid var(--ac)',borderRadius:10,color:'var(--ac)',fontSize:12}}>
          <i className="ti ti-info-circle" style={{marginRight:6}}/>To assign size and color: open a product, choose <strong>Variants</strong>, then add or edit a variant.
        </div>
      </div>)}

      {/* CATEGORIES TAB */}
      {tab==='categories'&&(<div>
        {rootCats.map(root=>(
          <div key={root.id} style={{marginBottom:16}}>
            <div className="nx-card" style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
              {root.image_url?<img src={root.image_url} alt="" style={{width:40,height:40,borderRadius:8,objectFit:'cover'}} onError={e=>(e.currentTarget.style.display='none')}/>:<div style={{width:40,height:40,borderRadius:8,background:'var(--acg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>📂</div>}
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15}}>{root.name}{root.name_ar&&<span style={{color:'var(--mu)',fontWeight:400,fontSize:12,marginLeft:8,direction:'rtl'}}>{root.name_ar}</span>}</div>
                <div style={{fontSize:11,color:'var(--mu)',fontFamily:'monospace'}}>{root.slug}</div>
              </div>
              <span style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:root.is_active?'#d1fae5':'#fee2e2',color:root.is_active?'#065f46':'#991b1b',fontWeight:600}}>{root.is_active?'Active':'Inactive'}</span>
              <button className="btn-nx ghost sm" onClick={()=>{setEditCat(root);setShowCat(true);}}><i className="ti ti-edit"/></button>
              <button className="btn-nx ghost sm" style={{color:'#ef4444'}} onClick={()=>{if(confirm('Delete category?'))delCategory.mutate(root.id);}}><i className="ti ti-trash"/></button>
            </div>
            {subCats.filter(s=>s.parent_id===root.id).map(sub=>(
              <div key={sub.id} className="nx-card" style={{display:'flex',alignItems:'center',gap:12,marginLeft:24,marginBottom:6,padding:'10px 14px',borderLeft:'3px solid var(--ac)'}}>
                <div style={{fontSize:16}}>↳</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13}}>{sub.name}{sub.name_ar&&<span style={{color:'var(--mu)',fontWeight:400,fontSize:11,marginLeft:8}}>{sub.name_ar}</span>}</div>
                  <div style={{fontSize:10,color:'var(--mu)',fontFamily:'monospace'}}>{sub.slug}</div>
                </div>
                <span style={{fontSize:10,padding:'1px 6px',borderRadius:8,background:sub.is_active?'#d1fae5':'#fee2e2',color:sub.is_active?'#065f46':'#991b1b',fontWeight:600}}>{sub.is_active?'Active':'Inactive'}</span>
                <button className="btn-nx ghost sm" onClick={()=>{setEditCat(sub);setShowCat(true);}}><i className="ti ti-edit"/></button>
                <button className="btn-nx ghost sm" style={{color:'#ef4444'}} onClick={()=>{if(confirm('Delete?'))delCategory.mutate(sub.id);}}><i className="ti ti-trash"/></button>
              </div>
            ))}
          </div>
        ))}
        {categories.length===0&&<div className="nx-card" style={{textAlign:'center',padding:48,color:'var(--mu)'}}><div style={{fontSize:40,marginBottom:8}}>📂</div><p style={{fontWeight:600}}>No categories yet</p><button className="btn-nx primary" style={{marginTop:8}} onClick={()=>{setEditCat(null);setShowCat(true);}}>Add First Category</button></div>}
      </div>)}

      {/* BRANDS TAB */}
      {tab==='brands'&&(<div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
          {brands.map(b=>(
            <div key={b.id} className="nx-card" style={{textAlign:'center',position:'relative'}}>
              <div style={{position:'absolute',top:10,right:10,display:'flex',gap:4}}>
                <button className="btn-nx ghost sm" onClick={()=>{setEditBrand(b);setShowBrand(true);}}><i className="ti ti-edit"/></button>
                <button className="btn-nx ghost sm" style={{color:'#ef4444'}} onClick={()=>{if(confirm('Delete brand?'))delBrand.mutate(b.id);}}><i className="ti ti-trash"/></button>
              </div>
              <div style={{width:60,height:60,borderRadius:12,background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px',overflow:'hidden',border:'1px solid var(--bd)'}}>
                {b.logo_url?<img src={b.logo_url} alt="" style={{width:'100%',height:'100%',objectFit:'contain'}} onError={e=>(e.currentTarget.style.display='none')}/>:<span style={{fontSize:24}}>🏷</span>}
              </div>
              <div style={{fontWeight:700,fontSize:15}}>{b.name}</div>
              {b.name_ar&&<div style={{fontSize:12,color:'var(--mu)',direction:'rtl'}}>{b.name_ar}</div>}
              <div style={{marginTop:8}}><span style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:b.is_active?'#d1fae5':'#fee2e2',color:b.is_active?'#065f46':'#991b1b',fontWeight:600}}>{b.is_active?'Active':'Inactive'}</span></div>
              <div style={{marginTop:8,fontSize:12,color:'var(--mu)'}}>{products.filter(p=>p.brand_id===b.id).length} products</div>
            </div>
          ))}
          {brands.length===0&&<div className="nx-card" style={{textAlign:'center',padding:48,color:'var(--mu)',gridColumn:'1/-1'}}><div style={{fontSize:40,marginBottom:8}}>🏷</div><p style={{fontWeight:600}}>No brands yet</p><button className="btn-nx primary" style={{marginTop:8}} onClick={()=>{setEditBrand(null);setShowBrand(true);}}>Add First Brand</button></div>}
        </div>
      </div>)}
    </div>

    {/* DETAIL SIDE PANEL */}
    {selected&&tab==='products'&&(
      <div style={{width:380,borderLeft:'1px solid var(--bd)',overflowY:'auto',flexShrink:0,background:'var(--cd)'}}>
        <div style={{padding:'14px 16px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontWeight:700,fontSize:14,maxWidth:260,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selected.name}</div>
          <div style={{display:'flex',gap:4}}>
            <button className="btn-nx ghost sm" onClick={()=>{setEditProd(selected);setShowProd(true);}}><i className="ti ti-edit"/></button>
            <button className="btn-nx ghost sm" style={{color:'#ef4444'}} onClick={()=>{if(confirm('Delete product?'))delProduct.mutate(selected.id);}}><i className="ti ti-trash"/></button>
            <button className="btn-nx ghost sm" onClick={()=>setSelected(null)}><i className="ti ti-x"/></button>
          </div>
        </div>
        <div style={{display:'flex',gap:4,padding:'10px 16px',borderBottom:'1px solid var(--bd)'}}>
          {[['info','Info'],['variants','Variants']].map(([id,l])=>(
            <button key={id} onClick={()=>setDetailTab(id)} style={{padding:'5px 14px',borderRadius:8,border:'none',background:detailTab===id?'var(--acg)':'transparent',color:detailTab===id?'var(--ac)':'var(--mu)',fontWeight:detailTab===id?600:400,cursor:'pointer',fontSize:13}}>{l}</button>
          ))}
        </div>

        {detailTab==='info'&&(<div style={{padding:16,display:'grid',gap:12}}>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {selected.is_active?<span className="nx-badge active">Active</span>:<span className="nx-badge inactive">Draft</span>}
            {selected.brand_id&&<span className="nx-badge teal">{brandMap[selected.brand_id]||'Brand'}</span>}
            {selected.category_id&&<span className="nx-badge grey">{catMap[selected.category_id]||'Category'}</span>}
          </div>
          {selected.name_ar&&<div><div style={{fontSize:11,color:'var(--mu)'}}>Arabic Name</div><div style={{direction:'rtl',fontWeight:600}}>{selected.name_ar}</div></div>}
          {selected.sku_prefix&&<div><div style={{fontSize:11,color:'var(--mu)'}}>SKU Prefix</div><div style={{fontFamily:'monospace',fontWeight:600}}>{selected.sku_prefix}</div></div>}
          {selected.description&&<div><div style={{fontSize:11,color:'var(--mu)',marginBottom:4}}>Description</div><div style={{fontSize:13,lineHeight:1.5}}>{selected.description}</div></div>}
          {selected.tags?.length>0&&<div><div style={{fontSize:11,color:'var(--mu)',marginBottom:4}}>Tags</div><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{selected.tags.map((t:string)=><span key={t} style={{fontSize:11,padding:'2px 8px',borderRadius:12,background:'var(--acg)',color:'var(--ac)'}}>{t}</span>)}</div></div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div style={{padding:'10px 12px',background:'var(--bg)',borderRadius:8}}><div style={{fontSize:10,color:'var(--mu)'}}>VARIANTS</div><div style={{fontWeight:700,fontSize:18}}>{variants.length}</div></div>
            <div style={{padding:'10px 12px',background:'var(--bg)',borderRadius:8}}><div style={{fontSize:10,color:'var(--mu)'}}>TOTAL STOCK</div><div style={{fontWeight:700,fontSize:18}}>{variants.reduce((s,v)=>s+(v.stock_quantity||0),0)}</div></div>
          </div>
          {priceRange(detail||selected)&&<div style={{padding:'10px 12px',background:'var(--bg)',borderRadius:8}}><div style={{fontSize:10,color:'var(--mu)'}}>PRICE RANGE</div><div style={{fontWeight:700,fontSize:16,color:'var(--ac)'}}>{priceRange(detail||selected)}</div></div>}
        </div>)}

        {detailTab==='variants'&&(<div style={{padding:16}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
            <button className="btn-nx ghost sm" style={{justifyContent:'center'}} onClick={()=>{setEditVariant(null);setShowVariant(true);}}><i className="ti ti-plus"/> Add One</button>
            <button className="btn-nx primary sm" style={{justifyContent:'center'}} onClick={()=>setShowBulkVariants(true)}><i className="ti ti-table-plus"/> Bulk Add</button>
          </div>
          {variants.length===0?<div style={{textAlign:'center',padding:32,color:'var(--mu)'}}><i className="ti ti-layers-subtract" style={{fontSize:32,display:'block',opacity:.3,marginBottom:8}}/><p style={{fontSize:13}}>No variants yet</p></div>:(
            <div style={{display:'grid',gap:8}}>
              {variants.map((v:any)=>{
                const isLow=v.stock_quantity>0&&v.stock_quantity<=(v.low_stock_threshold||5);
                const isOut=v.stock_quantity===0;
                return(
                  <div key={v.id} style={{border:'1px solid var(--bd)',borderRadius:10,padding:'10px 12px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                      <div>
                        <div style={{fontWeight:600,fontSize:13}}>{v.name||[v.color,v.size].filter(Boolean).join(' / ')||'Variant'}</div>
                        {v.sku&&<div style={{fontFamily:'monospace',fontSize:10,color:'var(--mu)'}}>{v.sku}</div>}
                      </div>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn-nx ghost sm" onClick={()=>{setEditVariant(v);setShowVariant(true);}}><i className="ti ti-edit"/></button>
                        <button className="btn-nx ghost sm" style={{color:'#ef4444'}} onClick={()=>{if(confirm('Delete variant?'))delVariant.mutate(v.id);}}><i className="ti ti-trash"/></button>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                      {v.size&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:8,background:'var(--bg)',border:'1px solid var(--bd)',fontWeight:600}}>{v.size}</span>}
                      {v.color&&(<span style={{display:'flex',alignItems:'center',gap:4,fontSize:11,padding:'2px 8px',borderRadius:8,background:'var(--bg)',border:'1px solid var(--bd)',fontWeight:600}}>
                        <span style={{width:10,height:10,borderRadius:'50%',background:COLOR_DOT[v.color]||'#999',display:'inline-block',border:'1px solid rgba(0,0,0,.1)'}}/>{v.color}
                      </span>)}
                      {v.selling_price&&<span style={{fontSize:12,fontWeight:700,color:'var(--ac)'}}>SAR {v.selling_price}</span>}
                      {v.compare_price&&<span style={{fontSize:11,textDecoration:'line-through',color:'var(--mu)'}}>SAR {v.compare_price}</span>}
                      <span style={{marginLeft:'auto',fontSize:11,padding:'2px 8px',borderRadius:8,fontWeight:700,background:isOut?'#fee2e2':isLow?'#fef9c3':'#d1fae5',color:isOut?'#991b1b':isLow?'#854d0e':'#065f46'}}>
                        {isOut?'Out':isLow?`Low: ${v.stock_quantity}`:`${v.stock_quantity} pcs`}
                      </span>
                    </div>
                    {v.barcode&&<div style={{fontSize:10,color:'var(--mu)',fontFamily:'monospace',marginTop:4}}>🔳 {v.barcode}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>)}
      </div>
    )}

    {showProd&&<ProductModal prod={editProd} categories={categories} brands={brands} onClose={()=>{setShowProd(false);setEditProd(null);}}/>}
    {showVariant&&selected&&<VariantModal productId={selected.id} variant={editVariant} onClose={()=>{setShowVariant(false);setEditVariant(null);}}/>}
    {showBulkVariants&&selected&&<BulkVariantModal product={selected} existing={variants} onClose={()=>setShowBulkVariants(false)}/>}
    {showCat&&<CategoryModal cat={editCat} categories={categories} onClose={()=>{setShowCat(false);setEditCat(null);}}/>}
    {showBrand&&<BrandModal brand={editBrand} onClose={()=>{setShowBrand(false);setEditBrand(null);}}/>}
  </div>);
}
