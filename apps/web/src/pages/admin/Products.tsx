import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const SIZES=['XS','S','M','L','XL','XXL','XXXL','Free Size'];
const COLORS=['Black','White','Red','Blue','Green','Yellow','Pink','Purple','Orange','Brown','Grey','Navy','Beige','Maroon'];

function ProductModal({prod,cats,brands,onClose}:{prod:any,cats:any[],brands:any[],onClose:()=>void}){
  const qc=useQueryClient();
  const isEdit=!!prod?.id;
  const [tab,setTab]=useState('basic');
  const [form,setForm]=useState({
    name:prod?.name||'', name_ar:prod?.name_ar||'',
    description:prod?.description||'', description_ar:prod?.description_ar||'',
    sku_prefix:prod?.sku_prefix||'', barcode:prod?.barcode||'',
    category_id:prod?.category_id||'', brand_id:prod?.brand_id||'',
    tags:prod?.tags||[],
  });
  const [variants,setVariants]=useState<any[]>([]);
  const [images,setImages]=useState<string[]>(prod?.images||[]);
  const [imgUrl,setImgUrl]=useState('');
  const [newVar,setNewVar]=useState({size:'M',color:'Black',sku:'',price:'',cost:'',max_discount:'',barcode:''});

  const {data:varData}=useQuery({queryKey:['variants',prod?.id],queryFn:async()=>{if(!prod?.id)return[];const r=await api.get(`/catalog/products/${prod.id}`);return r.data?.variants||[];},enabled:!!prod?.id});
  const existingVars:any[]=varData||[];

  const save=useMutation({mutationFn:async()=>{
    if(isEdit){return api.patch(`/catalog/products/${prod.id}`,form);}
    return api.post('/catalog/products',form);
  },onSuccess:(res)=>{qc.invalidateQueries({queryKey:['products']});if(!isEdit&&variants.length>0){const id=res.data?.id;Promise.all(variants.map(v=>api.post(`/catalog/products/${id}/variants`,v)));}onClose();}});

  const addVariant=useMutation({mutationFn:()=>api.post(`/catalog/products/${prod?.id}/variants`,{...newVar,price:parseFloat(newVar.price),cost:parseFloat(newVar.cost||'0'),max_discount:parseFloat(newVar.max_discount||'0')}),onSuccess:()=>{qc.invalidateQueries({queryKey:['variants',prod?.id]});setNewVar({size:'M',color:'Black',sku:'',price:'',cost:'',max_discount:'',barcode:''});}});

  const delVariant=useMutation({mutationFn:(vid:string)=>api.delete(`/catalog/products/variants/${vid}`),onSuccess:()=>qc.invalidateQueries({queryKey:['variants',prod?.id]})});

  const F=(k:string,v:string)=>setForm(f=>({...f,[k]:v}));

  return(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
    <div style={{width:'min(780px,100%)',maxHeight:'90vh',background:'var(--cd)',borderRadius:16,display:'flex',flexDirection:'column',overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
      <div style={{padding:'20px 24px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:700}}>{isEdit?'Edit Product':'Add Product'}</h2>
        <button className="btn-nx ghost sm" onClick={onClose}><i className="ti ti-x"/></button>
      </div>
      <div style={{display:'flex',gap:0,borderBottom:'1px solid var(--bd)'}}>
        {[['basic','Basic Info'],['variants','Sizes & Colors'],['images','Photos']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:'10px 20px',border:'none',background:'none',borderBottom:tab===id?'2px solid var(--ac)':'2px solid transparent',color:tab===id?'var(--ac)':'var(--mu)',fontWeight:tab===id?600:400,cursor:'pointer',fontSize:13}}>{l}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:24}}>
        {tab==='basic'&&(<div style={{display:'grid',gap:14}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Product Name (English) *</label><input className="nx-input" style={{width:'100%'}} value={form.name} onChange={e=>F('name',e.target.value)} placeholder="e.g. Classic T-Shirt"/></div>
            <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>اسم المنتج (عربي)</label><input className="nx-input" style={{width:'100%',direction:'rtl'}} value={form.name_ar} onChange={e=>F('name_ar',e.target.value)} placeholder="مثال: تيشيرت كلاسيك"/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Category</label>
              <select className="nx-select" style={{width:'100%'}} value={form.category_id} onChange={e=>F('category_id',e.target.value)}>
                <option value="">Select category</option>
                {cats.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Brand</label>
              <select className="nx-select" style={{width:'100%'}} value={form.brand_id} onChange={e=>F('brand_id',e.target.value)}>
                <option value="">Select brand</option>
                {brands.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>SKU Prefix</label><input className="nx-input" style={{width:'100%'}} value={form.sku_prefix} onChange={e=>F('sku_prefix',e.target.value)} placeholder="e.g. TSH-001"/></div>
            <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Barcode</label><input className="nx-input" style={{width:'100%'}} value={form.barcode} onChange={e=>F('barcode',e.target.value)} placeholder="e.g. 6291234567890"/></div>
          </div>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>Description (English)</label><textarea className="nx-input" style={{width:'100%',height:80,resize:'none'}} value={form.description} onChange={e=>F('description',e.target.value)} placeholder="Product description..."/></div>
          <div><label style={{fontSize:12,color:'var(--mu)',display:'block',marginBottom:4}}>الوصف (عربي)</label><textarea className="nx-input" style={{width:'100%',height:80,resize:'none',direction:'rtl'}} value={form.description_ar} onChange={e=>F('description_ar',e.target.value)} placeholder="وصف المنتج..."/></div>
        </div>)}

        {tab==='variants'&&(<div>
          <div style={{background:'var(--cv)',borderRadius:10,padding:16,marginBottom:16}}>
            <div style={{fontWeight:600,marginBottom:12,fontSize:14}}>Add Size/Color Variant</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:10}}>
              <div><label style={{fontSize:11,color:'var(--mu)',display:'block',marginBottom:3}}>Size</label>
                <select className="nx-select" style={{width:'100%'}} value={newVar.size} onChange={e=>setNewVar(v=>({...v,size:e.target.value}))}>
                  {SIZES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div><label style={{fontSize:11,color:'var(--mu)',display:'block',marginBottom:3}}>Color</label>
                <select className="nx-select" style={{width:'100%'}} value={newVar.color} onChange={e=>setNewVar(v=>({...v,color:e.target.value}))}>
                  {COLORS.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label style={{fontSize:11,color:'var(--mu)',display:'block',marginBottom:3}}>SKU</label><input className="nx-input" style={{width:'100%'}} value={newVar.sku} onChange={e=>setNewVar(v=>({...v,sku:e.target.value}))} placeholder="TSH-BLK-M"/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:12}}>
              <div><label style={{fontSize:11,color:'var(--mu)',display:'block',marginBottom:3}}>Selling Price (SAR) *</label><input className="nx-input" type="number" style={{width:'100%'}} value={newVar.price} onChange={e=>setNewVar(v=>({...v,price:e.target.value}))} placeholder="0.00"/></div>
              <div><label style={{fontSize:11,color:'var(--mu)',display:'block',marginBottom:3}}>Cost Price (SAR)</label><input className="nx-input" type="number" style={{width:'100%'}} value={newVar.cost} onChange={e=>setNewVar(v=>({...v,cost:e.target.value}))} placeholder="0.00"/></div>
              <div><label style={{fontSize:11,color:'var(--mu)',display:'block',marginBottom:3}}>Max Discount (SAR)</label><input className="nx-input" type="number" style={{width:'100%'}} value={newVar.max_discount} onChange={e=>setNewVar(v=>({...v,max_discount:e.target.value}))} placeholder="0.00"/></div>
            </div>
            {isEdit?(<button className="btn-nx primary" onClick={()=>addVariant.mutate()} disabled={!newVar.price||addVariant.isPending}><i className="ti ti-plus"/> Add Variant</button>):(<button className="btn-nx primary" onClick={()=>{setVariants(vs=>[...vs,{...newVar}]);setNewVar({size:'M',color:'Black',sku:'',price:'',cost:'',max_discount:'',barcode:''});}}><i className="ti ti-plus"/> Add to List</button>)}
          </div>
          <div className="nx-table-wrap"><table className="nx-table">
            <thead><tr><th>Size</th><th>Color</th><th>SKU</th><th>Price</th><th>Cost</th><th>Max Disc.</th><th></th></tr></thead>
            <tbody>{(isEdit?existingVars:variants).length===0?<tr><td colSpan={7} style={{textAlign:'center',padding:'20px 0',color:'var(--mu)'}}>No variants yet</td></tr>:(isEdit?existingVars:variants).map((v:any,i:number)=>(
              <tr key={v.id||i}>
                <td><span className="nx-badge teal">{v.size||v.attributes?.size||'—'}</span></td>
                <td>{v.color||v.attributes?.color||'—'}</td>
                <td style={{color:'var(--mu)',fontSize:12}}>{v.sku||'—'}</td>
                <td style={{fontWeight:600}}>SAR {parseFloat(v.price||0).toFixed(2)}</td>
                <td style={{color:'var(--mu)'}}>SAR {parseFloat(v.cost||0).toFixed(2)}</td>
                <td style={{color:'var(--mu)'}}>SAR {parseFloat(v.max_discount||0).toFixed(2)}</td>
                <td>{isEdit?<button className="btn-nx danger sm" onClick={()=>delVariant.mutate(v.id)}><i className="ti ti-trash"/></button>:<button className="btn-nx danger sm" onClick={()=>setVariants(vs=>vs.filter((_,j)=>j!==i))}><i className="ti ti-trash"/></button>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>)}

        {tab==='images'&&(<div>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <input className="nx-input" style={{flex:1}} value={imgUrl} onChange={e=>setImgUrl(e.target.value)} placeholder="Paste image URL (https://...)"/>
            <button className="btn-nx primary" onClick={()=>{if(imgUrl){setImages(i=>[...i,imgUrl]);setImgUrl('');}}} disabled={!imgUrl}><i className="ti ti-plus"/> Add</button>
          </div>
          {images.length===0?(<div style={{textAlign:'center',padding:'40px 0',color:'var(--mu)'}}><i className="ti ti-photo" style={{fontSize:40,display:'block',marginBottom:8}}/><div>No images yet — paste an image URL above</div></div>):(
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12}}>
              {images.map((url,i)=>(
                <div key={i} style={{position:'relative',borderRadius:10,overflow:'hidden',border:'1px solid var(--bd)'}}>
                  <img src={url} alt="" style={{width:'100%',height:140,objectFit:'cover'}} onError={e=>(e.currentTarget.src='https://via.placeholder.com/140')}/>
                  <button onClick={()=>setImages(imgs=>imgs.filter((_,j)=>j!==i))} style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,.6)',border:'none',borderRadius:6,color:'white',width:24,height:24,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ti ti-x" style={{fontSize:12}}/></button>
                </div>
              ))}
            </div>
          )}
        </div>)}
      </div>
      <div style={{padding:'16px 24px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end'}}>
        <button className="btn-nx ghost" onClick={onClose}>Cancel</button>
        <button className="btn-nx primary" onClick={()=>save.mutate()} disabled={!form.name||save.isPending}>{save.isPending?'Saving...':'Save Product'}</button>
      </div>
    </div>
  </div>);
}

export default function Products(){
  const qc=useQueryClient();
  const [q,setQ]=useState('');const [showModal,setShowModal]=useState(false);const [editProd,setEditProd]=useState<any>(null);
  const {data,isLoading}=useQuery({queryKey:['products'],queryFn:async()=>{const r=await api.get('/catalog/products?limit=200');return r.data;}});
  const {data:cats}=useQuery({queryKey:['categories'],queryFn:async()=>{const r=await api.get('/catalog/categories');return r.data;}});
  const {data:brands}=useQuery({queryKey:['brands'],queryFn:async()=>{const r=await api.get('/catalog/brands');return r.data;}});
  const del=useMutation({mutationFn:(id:string)=>api.delete(`/catalog/products/${id}`),onSuccess:()=>qc.invalidateQueries({queryKey:['products']})});
  const raw:any[]=Array.isArray(data)?data:data?.products||data?.data||[];
  const products=raw.filter((p:any)=>!q||p.name?.toLowerCase().includes(q.toLowerCase())||(p.sku_prefix||'').toLowerCase().includes(q.toLowerCase()));
  const catList:any[]=Array.isArray(cats)?cats:cats?.categories||cats?.data||[];
  const brandList:any[]=Array.isArray(brands)?brands:brands?.brands||brands?.data||[];
  const openAdd=()=>{setEditProd(null);setShowModal(true);};
  const openEdit=(p:any)=>{setEditProd(p);setShowModal(true);};
  return(<div>
    <div className="nx-page-head">
      <div><h1 className="nx-page-title">Products</h1><p className="nx-page-sub">{products.length} products</p></div>
      <button className="btn-nx primary" onClick={openAdd}><i className="ti ti-plus"/> Add Product</button>
    </div>
    <div className="nx-toolbar"><div className="nx-search"><i className="ti ti-search"/><input className="nx-input" placeholder="Search products..." value={q} onChange={e=>setQ(e.target.value)}/></div></div>
    <div className="nx-table-wrap"><table className="nx-table">
      <thead><tr><th>Name</th><th>Arabic Name</th><th>SKU</th><th>Category</th><th>Brand</th><th>Variants</th><th>Actions</th></tr></thead>
      <tbody>{isLoading?<tr><td colSpan={7} style={{textAlign:'center',padding:'32px 0'}}>Loading...</td></tr>:products.length===0?<tr><td colSpan={7} style={{textAlign:'center',padding:'32px 0',color:'var(--mu)'}}>No products found</td></tr>:products.map((p:any)=>(
        <tr key={p.id}>
          <td style={{fontWeight:600}}>{p.name}</td>
          <td style={{direction:'rtl',color:'var(--mu)'}}>{p.name_ar||'—'}</td>
          <td style={{color:'var(--mu)',fontSize:12}}>{p.sku_prefix||'—'}</td>
          <td style={{color:'var(--mu)'}}>{p.category_name||'—'}</td>
          <td style={{color:'var(--mu)'}}>{p.brand_name||'—'}</td>
          <td><span className="nx-badge teal">{p.variants_count||p.variants?.length||0} variants</span></td>
          <td style={{display:'flex',gap:4}}>
            <button className="btn-nx ghost sm" onClick={()=>openEdit(p)}><i className="ti ti-edit"/> Edit</button>
            <button className="btn-nx danger sm" onClick={()=>{if(confirm('Delete '+p.name+'?'))del.mutate(p.id)}}><i className="ti ti-trash"/></button>
          </td>
        </tr>
      ))}</tbody>
    </table></div>
    {showModal&&<ProductModal prod={editProd} cats={catList} brands={brandList} onClose={()=>setShowModal(false)}/>}
  </div>);
}
