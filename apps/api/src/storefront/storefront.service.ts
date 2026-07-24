import { BadRequestException, Injectable, NotFoundException, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { StoreCheckoutDto } from './dto/checkout.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class StorefrontService implements OnModuleInit {
  constructor(private db:DatabaseService,private config:ConfigService) {}

  async onModuleInit(){
    await this.db.query(`CREATE TABLE IF NOT EXISTS storefront_settings(
      company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS storefront_banners(
      id UUID PRIMARY KEY,company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      title TEXT NOT NULL,title_ar TEXT,subtitle TEXT,image_url TEXT,button_label TEXT,button_link TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  }

  private defaults(){
    return {
      announcement:'Free delivery on orders over SAR 300',
      announcement_ar:'توصيل مجاني للطلبات فوق 300 ريال',
      shipping_fee:Number(this.config.get('STOREFRONT_SHIPPING_FEE')||25),
      free_shipping_from:Number(this.config.get('STOREFRONT_FREE_SHIPPING_FROM')||300),
      delivery_estimate:'2–5 business days',returns_days:7,
      featured_title:'Shop the Collection',featured_title_ar:'تسوق المجموعة',
      promo_title:'Style for every moment',promo_subtitle:'Discover clothing, shoes, bags and accessories selected for modern life.',
      promo_image_url:'',support_phone:'',instagram_url:'',whatsapp_url:'',
    };
  }

  private async settings(companyId:string){
    const row=await this.db.query(`SELECT config FROM storefront_settings WHERE company_id=$1`,[companyId]);
    return {...this.defaults(),...(row.rows[0]?.config||{})};
  }

  private async tenantId(){
    const configured=this.config.get<string>('STOREFRONT_COMPANY_ID');
    if(configured)return configured;
    const company=await this.db.query(`SELECT id FROM companies ORDER BY created_at LIMIT 1`);
    if(!company.rows[0])throw new ServiceUnavailableException('Storefront company is not configured');
    return company.rows[0].id;
  }

  async getConfig(){
    const companyId=await this.tenantId();
    const company=await this.db.query(`SELECT id,name FROM companies WHERE id=$1`,[companyId]);
    const settings=await this.settings(companyId);
    const banners=await this.db.query(`SELECT * FROM storefront_banners WHERE company_id=$1 AND is_active=true ORDER BY sort_order,created_at`,[companyId]);
    return {
      name:company.rows[0]?.name||'NuxFashion',
      currency:'SAR',vat_rate:15,...settings,banners:banners.rows,
      payment_methods:['cash_on_delivery','bank_transfer'],
    };
  }

  async getAdminContent(companyId:string){
    const banners=await this.db.query(`SELECT * FROM storefront_banners WHERE company_id=$1 ORDER BY sort_order,created_at`,[companyId]);
    return {settings:await this.settings(companyId),banners:banners.rows};
  }
  async updateSettings(companyId:string,body:any){
    const allowed=['announcement','announcement_ar','shipping_fee','free_shipping_from','delivery_estimate','returns_days','featured_title','featured_title_ar','promo_title','promo_subtitle','promo_image_url','support_phone','instagram_url','whatsapp_url'];
    const clean:Object=Object.fromEntries(allowed.filter(k=>body[k]!==undefined).map(k=>[k,body[k]]));
    await this.db.query(`INSERT INTO storefront_settings(company_id,config) VALUES($1,$2::jsonb)
      ON CONFLICT(company_id) DO UPDATE SET config=storefront_settings.config||EXCLUDED.config,updated_at=NOW()`,[companyId,JSON.stringify(clean)]);
    return this.settings(companyId);
  }
  async createBanner(companyId:string,body:any){
    if(!String(body.title||'').trim())throw new BadRequestException('Banner title is required');
    const result=await this.db.query(`INSERT INTO storefront_banners(id,company_id,title,title_ar,subtitle,image_url,button_label,button_link,sort_order,is_active)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[randomUUID(),companyId,body.title,body.title_ar||null,body.subtitle||null,body.image_url||null,body.button_label||'Shop Now',body.button_link||'#collection',Number(body.sort_order||0),body.is_active!==false]);
    return result.rows[0];
  }
  async updateBanner(companyId:string,id:string,body:any){
    const current=await this.db.query(`SELECT * FROM storefront_banners WHERE id=$1 AND company_id=$2`,[id,companyId]);
    if(!current.rows[0])throw new NotFoundException('Banner not found');const b={...current.rows[0],...body};
    const result=await this.db.query(`UPDATE storefront_banners SET title=$1,title_ar=$2,subtitle=$3,image_url=$4,button_label=$5,button_link=$6,sort_order=$7,is_active=$8,updated_at=NOW() WHERE id=$9 AND company_id=$10 RETURNING *`,
      [b.title,b.title_ar||null,b.subtitle||null,b.image_url||null,b.button_label||'Shop Now',b.button_link||'#collection',Number(b.sort_order||0),b.is_active!==false,id,companyId]);
    return result.rows[0];
  }
  async deleteBanner(companyId:string,id:string){await this.db.query(`DELETE FROM storefront_banners WHERE id=$1 AND company_id=$2`,[id,companyId]);return{success:true}}

  async getCatalog(search?:string,category?:string){
    const companyId=await this.tenantId();const params:any[]=[companyId];const where=[
      `p.company_id=$1`,`p.deleted_at IS NULL`,`p.is_active=true`,
      `NOT ('channel:no-ecommerce'=ANY(COALESCE(p.tags,ARRAY[]::text[])))`,
    ];
    if(search){params.push(`%${search}%`);where.push(`(p.name ILIKE $${params.length} OR p.name_ar ILIKE $${params.length} OR p.description ILIKE $${params.length})`)}
    if(category){params.push(category);where.push(`(c.id::text=$${params.length} OR c.slug=$${params.length})`)}
    const products=await this.db.query(
      `SELECT p.id,p.name,p.name_ar,p.description,p.description_ar,p.image_url,p.tags,
       c.id category_id,c.name category_name,c.name_ar category_name_ar,c.slug category_slug,
       COALESCE(json_agg(json_build_object(
        'id',v.id,'name',v.name,'name_ar',v.name_ar,'sku',v.sku,'barcode',v.barcode,
        'color',v.color,'size',v.size,'selling_price',v.selling_price,'compare_price',v.compare_price,
        'stock',COALESCE((SELECT SUM(i.quantity-i.reserved_quantity) FROM inventory i WHERE i.variant_id=v.id),v.stock_quantity,0)
       ) ORDER BY v.created_at) FILTER(WHERE v.id IS NOT NULL),'[]') variants
       FROM products p LEFT JOIN categories c ON c.id=p.category_id
       LEFT JOIN product_variants v ON v.product_id=p.id
       WHERE ${where.join(' AND ')}
       GROUP BY p.id,c.id,c.name,c.name_ar,c.slug ORDER BY p.created_at DESC LIMIT 200`,params,
    );
    const categories=await this.db.query(
      `SELECT c.id,c.name,c.name_ar,c.slug,c.image_url,COUNT(DISTINCT p.id)::int product_count
       FROM categories c LEFT JOIN products p ON p.category_id=c.id AND p.is_active=true AND p.deleted_at IS NULL
       WHERE c.company_id=$1 AND c.deleted_at IS NULL AND c.is_active=true
       GROUP BY c.id ORDER BY c.sort_order,c.name`,[companyId],
    );
    return {products:products.rows,categories:categories.rows};
  }

  async getProduct(id:string){
    const catalog=await this.getCatalog();const product=catalog.products.find((p:any)=>p.id===id);
    if(!product)throw new NotFoundException('Product not found');return product;
  }

  async checkout(dto:StoreCheckoutDto){
    if(!dto.lines.length)throw new BadRequestException('Cart is empty');
    const companyId=await this.tenantId();
    const storeSettings=await this.settings(companyId);
    const shippingFee=Number(storeSettings.shipping_fee);
    const freeFrom=Number(storeSettings.free_shipping_from);
    return this.db.transaction(async client=>{
      const warehouse=await client.query(`SELECT id FROM warehouses WHERE company_id=$1 ORDER BY created_at LIMIT 1`,[companyId]);
      if(!warehouse.rows[0])throw new ServiceUnavailableException('Online order warehouse is not configured');
      const operator=await client.query(
        `SELECT u.id FROM users u JOIN user_company_roles ur ON ur.user_id=u.id
         WHERE ur.company_id=$1 AND u.is_active=true AND u.deleted_at IS NULL ORDER BY u.created_at LIMIT 1`,[companyId],
      );
      if(!operator.rows[0])throw new ServiceUnavailableException('Online order operator is not configured');
      const ids=[...new Set(dto.lines.map(x=>x.variant_id))];
      const variants=await client.query(
        `SELECT v.id,v.sku,v.name,v.color,v.size,v.selling_price,p.name product_name
         FROM product_variants v JOIN products p ON p.id=v.product_id
         WHERE v.id=ANY($1::uuid[]) AND p.company_id=$2 AND p.is_active=true AND p.deleted_at IS NULL
         AND NOT ('channel:no-ecommerce'=ANY(COALESCE(p.tags,ARRAY[]::text[])))`,[ids,companyId],
      );
      if(variants.rows.length!==ids.length)throw new BadRequestException('One or more products are unavailable');
      let subtotal=0;const lines=dto.lines.map(line=>{
        const variant=variants.rows.find((v:any)=>v.id===line.variant_id);const price=Number(variant.selling_price);
        if(!variant||price<=0)throw new BadRequestException('A product has no valid selling price');
        subtotal+=price*line.quantity;return {...line,...variant,unit_price:price,line_total:price*line.quantity};
      });
      for(const line of lines){
        const stock=await client.query(
          `SELECT quantity-reserved_quantity available FROM inventory WHERE warehouse_id=$1 AND variant_id=$2 FOR UPDATE`,
          [warehouse.rows[0].id,line.variant_id],
        );
        if(Number(stock.rows[0]?.available||0)<line.quantity)throw new BadRequestException(`${line.product_name} (${[line.size,line.color].filter(Boolean).join('/')}) has insufficient stock`);
      }
      let customer=await client.query(`SELECT id FROM customers WHERE company_id=$1 AND phone=$2 AND is_active=true LIMIT 1`,[companyId,dto.phone.trim()]);
      if(!customer.rows[0])customer=await client.query(
        `INSERT INTO customers(company_id,name,phone,email,tier,notes) VALUES($1,$2,$3,$4,'regular','Created from online checkout') RETURNING id`,
        [companyId,dto.customer_name.trim(),dto.phone.trim(),dto.email?.trim()||null],
      );
      else await client.query(`UPDATE customers SET name=$1,email=COALESCE($2,email),updated_at=NOW() WHERE id=$3`,[dto.customer_name.trim(),dto.email?.trim()||null,customer.rows[0].id]);
      const shipping=subtotal>=freeFrom?0:shippingFee;const taxable=subtotal+shipping;const tax=taxable*.15;const total=taxable+tax;const orderNumber=`WEB-${Date.now()}`;
      const address=[dto.address,dto.district,dto.city,dto.postal_code].filter(Boolean).join(', ');
      const notes=`ECOMMERCE | Payment: ${dto.payment_method} | Ship to: ${address}${dto.notes?` | Customer note: ${dto.notes}`:''}`;
      const order=await client.query(
        `INSERT INTO sales_orders(company_id,order_number,warehouse_id,cashier_id,customer_id,status,subtotal,discount_amount,tax_amount,total,notes)
         VALUES($1,$2,$3,$4,$5,'confirmed',$6,0,$7,$8,$9) RETURNING *`,
        [companyId,orderNumber,warehouse.rows[0].id,operator.rows[0].id,customer.rows[0].id,subtotal,tax,total,notes],
      );
      for(const line of lines){
        await client.query(
          `INSERT INTO sales_order_lines(order_id,variant_id,quantity,unit_price,discount_amount,line_total)
           VALUES($1,$2,$3,$4,0,$5)`,[order.rows[0].id,line.variant_id,line.quantity,line.unit_price,line.line_total],
        );
        await client.query(`UPDATE inventory SET quantity=quantity-$1,updated_at=NOW() WHERE warehouse_id=$2 AND variant_id=$3`,[line.quantity,warehouse.rows[0].id,line.variant_id]);
        await client.query(
          `INSERT INTO stock_movements(warehouse_id,variant_id,movement_type,quantity,quantity_before,quantity_after,reason,created_by)
           SELECT $1,$2,'sale',$3,quantity+$4,quantity,$5,$6 FROM inventory WHERE warehouse_id=$1 AND variant_id=$2`,
          [warehouse.rows[0].id,line.variant_id,-line.quantity,line.quantity,`Online order ${orderNumber}`,operator.rows[0].id],
        );
      }
      return {order_number:orderNumber,status:'confirmed',payment_method:dto.payment_method,subtotal,shipping,vat:tax,total,customer:{name:dto.customer_name,phone:dto.phone},estimated_delivery:storeSettings.delivery_estimate};
    });
  }
}
