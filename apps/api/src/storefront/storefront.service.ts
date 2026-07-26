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
    await this.db.query(`ALTER TABLE storefront_banners ADD COLUMN IF NOT EXISTS mobile_image_url TEXT`);
    await this.db.query(`ALTER TABLE storefront_banners ADD COLUMN IF NOT EXISTS image_url_ar TEXT`);
    await this.db.query(`ALTER TABLE storefront_banners ADD COLUMN IF NOT EXISTS mobile_image_url_ar TEXT`);
    await this.db.query(`ALTER TABLE storefront_banners ADD COLUMN IF NOT EXISTS kicker TEXT`);
    await this.db.query(`ALTER TABLE storefront_banners ADD COLUMN IF NOT EXISTS subtitle_ar TEXT`);
    await this.db.query(`ALTER TABLE storefront_banners ADD COLUMN IF NOT EXISTS button_label_ar TEXT`);
    await this.db.query(`ALTER TABLE storefront_banners ADD COLUMN IF NOT EXISTS overlay_strength NUMERIC(4,2) NOT NULL DEFAULT .65`);
    await this.db.query(`ALTER TABLE storefront_banners ADD COLUMN IF NOT EXISTS text_position VARCHAR(20) NOT NULL DEFAULT 'left'`);
    await this.db.query(`ALTER TABLE storefront_banners ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ`);
    await this.db.query(`ALTER TABLE storefront_banners ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ`);
    await this.db.query(`ALTER TABLE discounts ADD COLUMN IF NOT EXISTS channels jsonb NOT NULL DEFAULT '["pos","ecommerce"]'::jsonb`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS discount_redemptions(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,
      discount_id uuid NOT NULL REFERENCES discounts(id),customer_id uuid,order_id uuid,
      amount numeric(12,2) NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now())`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS storefront_subscribers(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      email varchar(320) NOT NULL,is_active boolean NOT NULL DEFAULT true,source varchar(40) NOT NULL DEFAULT 'footer',
      subscribed_at timestamptz NOT NULL DEFAULT now(),unsubscribed_at timestamptz,
      UNIQUE(company_id,email))`);
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
      store_tagline:'FASHION · أزياء',logo_url:'',primary_color:'#0f766e',
      category_enabled:true,category_title:'Find your style',category_title_ar:'اكتشف أسلوبك',
      promo_enabled:true,promo_button_label:'Explore all products',promo_button_link:'#products',
      newsletter_enabled:true,newsletter_title:'New drops, offers & inspiration',
      newsletter_subtitle:'Join our list for collection updates and exclusive promotions.',
      footer_about:'Modern fashion retail from Saudi Arabia.',support_email:'',
      footer_about_ar:'متجر أزياء عصري من المملكة العربية السعودية.',
      seo_title:'NuxFashion · Saudi Fashion Store',seo_description:'Shop clothing, shoes, bags and accessories online.',
      flash_enabled:true,flash_title:'Flash Deals',flash_title_ar:'عروض سريعة',
      new_arrivals_enabled:true,best_sellers_enabled:true,
      best_sellers_title:'Best Sellers',best_sellers_title_ar:'الأكثر مبيعاً',
      promo_banners_enabled:true,seasonal_enabled:true,brands_enabled:true,
      trending_enabled:true,trending_title:'Trending Now',trending_title_ar:'الأكثر رواجاً',
      instagram_enabled:true,app_download_enabled:false,trust_enabled:true,
      hero_autoplay_seconds:5,product_slider_autoplay_seconds:3,
      homepage_sections:[
        {id:'hero',type:'hero',title:'Hero Banner',enabled:true},
        {id:'announcement',type:'announcement',title:'Announcement Bar',enabled:true},
        {id:'categories',type:'categories',title:'Shop by Category',title_ar:'تسوق حسب الفئة',enabled:true},
        {id:'flash',type:'flash',title:"Today's Top Offer",title_ar:'أفضل عروض اليوم',enabled:true},
        {id:'new-arrivals',type:'products',title:'New Arrivals',title_ar:'وصل حديثاً',enabled:true,source:'collection'},
        {id:'promo-grid',type:'promo_grid',title:'Campaign Banners',title_ar:'لافتات الحملات',enabled:true,layout:'mosaic',items:[
          {id:'promo-1',title:"Women's Edit",title_ar:'تشكيلة المرأة',subtitle:'New season, new you',subtitle_ar:'موسم جديد، أنتِ جديدة',image:'',link:'/category/women'},
          {id:'promo-2',title:"Men's Collection",title_ar:'مجموعة الرجال',subtitle:'Style meets comfort',subtitle_ar:'الأناقة تلتقي بالراحة',image:'',link:'/category/men'},
          {id:'promo-3',title:'New Arrivals',title_ar:'وصل حديثاً',subtitle:'Fresh styles just landed',subtitle_ar:'أحدث التصاميم وصلت الآن',image:'',link:'/category/all'}
        ]},
        {id:'best-sellers',type:'products',title:'Best Sellers',title_ar:'الأكثر مبيعاً',enabled:true,source:'best_sellers'},
        {id:'seasonal',type:'seasonal',title:'Seasonal Campaign',enabled:true},
        {id:'brands',type:'brands',title:'Featured Brands',title_ar:'العلامات المميزة',enabled:true},
        {id:'trending',type:'products',title:'Trending Now',title_ar:'الأكثر رواجاً',enabled:true,source:'trending'},
        {id:'trust',type:'trust',title:'Why NuxStore?',title_ar:'لماذا نوكس ستور؟',enabled:true}
      ],
      promo_card_1_title:"Women's Edit",promo_card_1_title_ar:'تشكيلة المرأة',promo_card_1_subtitle:'New season, new you',promo_card_1_image:'',promo_card_1_link:'/category/women',
      promo_card_2_title:"Men's Collection",promo_card_2_title_ar:'مجموعة الرجال',promo_card_2_subtitle:'Style meets comfort',promo_card_2_image:'',promo_card_2_link:'/category/men',
      seasonal_title:'Dress for the Season',seasonal_title_ar:'تألق في الموسم',seasonal_subtitle:'Discover our latest seasonal edit.',seasonal_subtitle_ar:'اكتشف أحدث تشكيلاتنا الموسمية.',seasonal_image:'',seasonal_button_label:'Shop Collection',seasonal_button_label_ar:'تسوق المجموعة',seasonal_button_link:'/category/all',
      category_ids:[],flash_product_ids:[],collection_product_ids:[],best_seller_product_ids:[],trending_product_ids:[],featured_brand_ids:[],
      trust_title:'Why NuxStore?',trust_title_ar:'لماذا نوكس ستور؟',trust_items:[],
      footer_customer_links:[],footer_company_links:[],footer_legal_links:[],footer_copyright:'© NuxStore. All rights reserved.',footer_copyright_ar:'© نوكس ستور. جميع الحقوق محفوظة.',
      contact_phone:'',contact_email:'',contact_address:'Riyadh, Saudi Arabia',contact_address_ar:'الرياض، المملكة العربية السعودية',contact_hours:'Saturday–Thursday, 9 AM–6 PM',contact_map_url:'',
      facebook_url:'',twitter_url:'',tiktok_url:'',snapchat_url:'',youtube_url:'',
      page_about:'',page_about_ar:'',page_careers:'',page_careers_ar:'',page_press:'',page_press_ar:'',page_blog:'',page_blog_ar:'',page_stores:'',page_stores_ar:'',
      page_returns:'',page_returns_ar:'',page_faq:'',page_faq_ar:'',page_privacy:'',page_privacy_ar:'',page_terms:'',page_terms_ar:'',page_shipping_policy:'',page_shipping_policy_ar:'',page_cookies:'',page_cookies_ar:'',page_accessibility:'',page_accessibility_ar:'',
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
    const banners=await this.db.query(`SELECT * FROM storefront_banners WHERE company_id=$1 AND is_active=true
      AND (starts_at IS NULL OR starts_at<=NOW()) AND (ends_at IS NULL OR ends_at>=NOW()) ORDER BY sort_order,created_at`,[companyId]);
    return {
      name:company.rows[0]?.name||'NuxFashion',
      currency:'SAR',vat_rate:15,...settings,banners:banners.rows,
      payment_methods:['cash_on_delivery','bank_transfer'],
    };
  }

  async subscribe(email:string){
    const normalized=String(email||'').trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))throw new BadRequestException('Enter a valid email address');
    const companyId=await this.tenantId();
    await this.db.query(`INSERT INTO storefront_subscribers(company_id,email) VALUES($1,$2)
      ON CONFLICT(company_id,email) DO UPDATE SET is_active=true,unsubscribed_at=NULL,subscribed_at=NOW()`,[companyId,normalized]);
    return {success:true,message:'Subscription confirmed'};
  }

  async getAdminContent(companyId:string){
    const banners=await this.db.query(`SELECT * FROM storefront_banners WHERE company_id=$1 ORDER BY sort_order,created_at`,[companyId]);
    return {settings:await this.settings(companyId),banners:banners.rows};
  }
  async updateSettings(companyId:string,body:any){
    const allowed=[...Object.keys(this.defaults())];
    const clean:Object=Object.fromEntries(allowed.filter(k=>body[k]!==undefined).map(k=>[k,body[k]]));
    await this.db.query(`INSERT INTO storefront_settings(company_id,config) VALUES($1,$2::jsonb)
      ON CONFLICT(company_id) DO UPDATE SET config=storefront_settings.config||EXCLUDED.config,updated_at=NOW()`,[companyId,JSON.stringify(clean)]);
    return this.settings(companyId);
  }
  async createBanner(companyId:string,body:any){
    if(!String(body.title||'').trim())throw new BadRequestException('Banner title is required');
    const result=await this.db.query(`INSERT INTO storefront_banners(id,company_id,title,title_ar,subtitle,subtitle_ar,image_url,mobile_image_url,image_url_ar,mobile_image_url_ar,kicker,button_label,button_label_ar,button_link,sort_order,is_active,overlay_strength,text_position,starts_at,ends_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,[randomUUID(),companyId,body.title,body.title_ar||null,body.subtitle||null,body.subtitle_ar||null,body.image_url||null,body.mobile_image_url||null,body.image_url_ar||null,body.mobile_image_url_ar||null,body.kicker||null,body.button_label||'Shop Now',body.button_label_ar||null,body.button_link||'#collection',Number(body.sort_order||0),body.is_active!==false,Number(body.overlay_strength??.65),body.text_position||'left',body.starts_at||null,body.ends_at||null]);
    return result.rows[0];
  }
  async updateBanner(companyId:string,id:string,body:any){
    const current=await this.db.query(`SELECT * FROM storefront_banners WHERE id=$1 AND company_id=$2`,[id,companyId]);
    if(!current.rows[0])throw new NotFoundException('Banner not found');const b={...current.rows[0],...body};
    const result=await this.db.query(`UPDATE storefront_banners SET title=$1,title_ar=$2,subtitle=$3,subtitle_ar=$4,image_url=$5,mobile_image_url=$6,image_url_ar=$7,mobile_image_url_ar=$8,kicker=$9,button_label=$10,button_label_ar=$11,button_link=$12,sort_order=$13,is_active=$14,overlay_strength=$15,text_position=$16,starts_at=$17,ends_at=$18,updated_at=NOW() WHERE id=$19 AND company_id=$20 RETURNING *`,
      [b.title,b.title_ar||null,b.subtitle||null,b.subtitle_ar||null,b.image_url||null,b.mobile_image_url||null,b.image_url_ar||null,b.mobile_image_url_ar||null,b.kicker||null,b.button_label||'Shop Now',b.button_label_ar||null,b.button_link||'#collection',Number(b.sort_order||0),b.is_active!==false,Number(b.overlay_strength??.65),b.text_position||'left',b.starts_at||null,b.ends_at||null,id,companyId]);
    return result.rows[0];
  }
  async deleteBanner(companyId:string,id:string){await this.db.query(`DELETE FROM storefront_banners WHERE id=$1 AND company_id=$2`,[id,companyId]);return{success:true}}

  async getCatalog(search?:string,category?:string){
    const companyId=await this.tenantId();const params:any[]=[companyId];const where=[
      `p.company_id=$1`,`p.deleted_at IS NULL`,`p.is_active=true`,
      `NOT ('channel:no-ecommerce'=ANY(COALESCE(p.tags,ARRAY[]::text[])))`,
    ];
    if(search){params.push(`%${search}%`);where.push(`(p.name ILIKE $${params.length} OR p.name_ar ILIKE $${params.length} OR p.description ILIKE $${params.length})`)}
    if(category){params.push(category);where.push(`(c.id::text=$${params.length} OR LOWER(c.slug)=LOWER($${params.length}) OR LOWER(REPLACE(c.name,' ','-'))=LOWER($${params.length}))`)}
    const products=await this.db.query(
      `SELECT p.id,p.name,p.name_ar,p.description,p.description_ar,p.image_url,p.tags,b.id brand_id,b.name brand_name,b.name_ar brand_name_ar,b.logo_url brand_logo_url,
       c.id category_id,c.name category_name,c.name_ar category_name_ar,c.slug category_slug,
       COALESCE((SELECT json_agg(pi.image_url ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id=p.id),'[]') images,
       COALESCE(json_agg(json_build_object(
        'id',v.id,'name',v.name,'name_ar',v.name_ar,'sku',v.sku,'barcode',v.barcode,
        'color',v.color,'size',v.size,'selling_price',v.selling_price,'compare_price',v.compare_price,
        'stock',COALESCE((SELECT SUM(i.quantity-i.reserved_quantity) FROM inventory i WHERE i.variant_id=v.id),v.stock_quantity,0)
       ) ORDER BY v.created_at) FILTER(WHERE v.id IS NOT NULL),'[]') variants
       FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN brands b ON b.id=p.brand_id
       LEFT JOIN product_variants v ON v.product_id=p.id
       WHERE ${where.join(' AND ')}
       GROUP BY p.id,c.id,c.name,c.name_ar,c.slug,b.id,b.name,b.name_ar,b.logo_url ORDER BY p.created_at DESC LIMIT 200`,params,
    );
    const categories=await this.db.query(
      `SELECT c.id,c.name,c.name_ar,c.slug,c.image_url,COUNT(DISTINCT p.id)::int product_count
       FROM categories c LEFT JOIN products p ON p.category_id=c.id AND p.is_active=true AND p.deleted_at IS NULL
       WHERE c.company_id=$1 AND c.deleted_at IS NULL AND c.is_active=true
       GROUP BY c.id ORDER BY c.sort_order,c.name`,[companyId],
    );
    const brands=await this.db.query(`SELECT id,name,name_ar,logo_url FROM brands WHERE company_id=$1 AND is_active=true ORDER BY name`,[companyId]);
    return {products:products.rows,categories:categories.rows,brands:brands.rows};
  }

  async getProduct(id:string){
    const catalog=await this.getCatalog();const product=catalog.products.find((p:any)=>p.id===id||p.slug===id);
    if(!product)throw new NotFoundException('Product not found');return product;
  }

  async trackOrder(orderNumber:string,phone:string){
    if(!orderNumber?.trim()||!phone?.trim())throw new BadRequestException('Order number and phone are required');
    const companyId=await this.tenantId();
    const row=await this.db.query(`SELECT o.order_number,o.status,o.total,o.created_at,o.updated_at,COUNT(l.id)::int item_count
      FROM sales_orders o JOIN customers c ON c.id=o.customer_id LEFT JOIN sales_order_lines l ON l.order_id=o.id
      WHERE o.company_id=$1 AND UPPER(o.order_number)=UPPER($2) AND regexp_replace(c.phone,'[^0-9]','','g')=regexp_replace($3,'[^0-9]','','g')
      GROUP BY o.id LIMIT 1`,[companyId,orderNumber.trim(),phone.trim()]);
    if(!row.rows[0])throw new NotFoundException('Order not found. Check the order number and phone.');return row.rows[0];
  }

  async checkout(dto:StoreCheckoutDto){
    if(!dto.lines.length)throw new BadRequestException('Cart is empty');
    const companyId=await this.tenantId();
    const storeSettings=await this.settings(companyId);
    const shippingFee=Number(storeSettings.shipping_fee);
    const freeFrom=Number(storeSettings.free_shipping_from);
    return this.db.transaction(async client=>{
      const warehouse=await client.query(
        `SELECT id FROM warehouses WHERE company_id=$1 AND COALESCE(is_active,true)=true
         ORDER BY COALESCE(ecommerce_enabled,false) DESC,COALESCE(fulfillment_priority,100),created_at LIMIT 1`,
        [companyId],
      );
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
      let discount:any=null;let discountAmount=0;
      if(dto.coupon_code?.trim()){
        const coupon=await client.query(
          `SELECT * FROM discounts WHERE company_id=$1 AND UPPER(coupon_code)=UPPER($2) AND is_coupon=true AND is_active=true
           AND channels ? 'ecommerce' AND (valid_from IS NULL OR valid_from<=NOW()) AND (valid_until IS NULL OR valid_until>=NOW())
           AND (usage_limit IS NULL OR usage_count<usage_limit) FOR UPDATE`,[companyId,dto.coupon_code.trim()]);
        discount=coupon.rows[0];
        if(!discount)throw new BadRequestException('Invalid, expired or POS-only coupon');
        if(subtotal<Number(discount.min_order_amount||0))throw new BadRequestException(`Minimum order amount is SAR ${discount.min_order_amount}`);
        if(discount.first_order_only){
          const previous=await client.query(`SELECT 1 FROM sales_orders WHERE company_id=$1 AND customer_id=$2 AND status IN ('paid','confirmed') LIMIT 1`,[companyId,customer.rows[0].id]);
          if(previous.rows[0])throw new BadRequestException('Coupon is valid for the first order only');
        }
        if(discount.one_per_customer){
          const used=await client.query(`SELECT 1 FROM discount_redemptions WHERE discount_id=$1 AND customer_id=$2 LIMIT 1`,[discount.id,customer.rows[0].id]);
          if(used.rows[0])throw new BadRequestException('Coupon has already been used by this customer');
        }
        discountAmount=discount.type==='percentage'?subtotal*Math.min(Number(discount.value),100)/100:Math.min(Number(discount.value),subtotal);
      }
      const shipping=subtotal>=freeFrom?0:shippingFee;const taxable=Math.max(0,subtotal-discountAmount)+shipping;const tax=taxable*.15;const total=taxable+tax;const orderNumber=`WEB-${Date.now()}`;
      const address=[dto.address,dto.district,dto.city,dto.postal_code].filter(Boolean).join(', ');
      const notes=`ECOMMERCE | Payment: ${dto.payment_method} | Ship to: ${address}${dto.notes?` | Customer note: ${dto.notes}`:''}`;
      const order=await client.query(
        `INSERT INTO sales_orders(company_id,order_number,warehouse_id,cashier_id,customer_id,status,subtotal,discount_amount,tax_amount,total,notes)
         VALUES($1,$2,$3,$4,$5,'confirmed',$6,$7,$8,$9,$10) RETURNING *`,
        [companyId,orderNumber,warehouse.rows[0].id,operator.rows[0].id,customer.rows[0].id,subtotal,discountAmount,tax,total,notes],
      );
      if(discount){
        await client.query(`INSERT INTO order_discounts(order_id,discount_id,name,type,value,amount,coupon_code) VALUES($1,$2,$3,'coupon',$4,$5,$6)`,
          [order.rows[0].id,discount.id,discount.name,discount.value,discountAmount,discount.coupon_code]);
        await client.query(`UPDATE discounts SET usage_count=usage_count+1 WHERE id=$1`,[discount.id]);
        await client.query(`INSERT INTO discount_redemptions(company_id,discount_id,customer_id,order_id,amount) VALUES($1,$2,$3,$4,$5)`,
          [companyId,discount.id,customer.rows[0].id,order.rows[0].id,discountAmount]);
      }
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
      return {order_number:orderNumber,status:'confirmed',payment_method:dto.payment_method,subtotal,discount:discountAmount,coupon_code:discount?.coupon_code,shipping,vat:tax,total,customer:{name:dto.customer_name,phone:dto.phone},estimated_delivery:storeSettings.delivery_estimate};
    });
  }
}
