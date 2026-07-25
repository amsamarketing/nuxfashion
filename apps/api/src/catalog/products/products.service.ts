import { BadRequestException, Injectable, NotFoundException, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateProductDto, CreateVariantDto } from './dto/create-product.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(private db: DatabaseService) {}

  async onModuleInit() {
    await this.db.query(`CREATE TABLE IF NOT EXISTS product_images(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL, alt_text TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
      is_primary BOOLEAN NOT NULL DEFAULT FALSE, image_type VARCHAR(30) NOT NULL DEFAULT 'product',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await this.db.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_images' AND column_name='url')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_images' AND column_name='image_url')
      THEN ALTER TABLE product_images RENAME COLUMN url TO image_url; END IF;
    END $$;`);
    await this.db.query(`ALTER TABLE product_images ADD COLUMN IF NOT EXISTS image_url TEXT`);
    await this.db.query(`ALTER TABLE product_images ADD COLUMN IF NOT EXISTS alt_text TEXT`);
    await this.db.query(`ALTER TABLE product_images ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0`);
    await this.db.query(`ALTER TABLE product_images ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE`);
    await this.db.query(`ALTER TABLE product_images ADD COLUMN IF NOT EXISTS image_type VARCHAR(30) NOT NULL DEFAULT 'product'`);
  }

  async findAll(companyId: string, query: any = {}) {
    const conditions = ['p.company_id = $1', 'p.deleted_at IS NULL'];
    const params: any[] = [companyId];
    let i = 2;
    if (query.category_id) { conditions.push(`p.category_id = $${i++}`); params.push(query.category_id); }
    if (query.brand_id) { conditions.push(`p.brand_id = $${i++}`); params.push(query.brand_id); }
    if (query.search) { conditions.push(`(p.name ILIKE $${i} OR p.name_ar ILIKE $${i})`); params.push(`%${query.search}%`); i++; }
    const result = await this.db.query(
      `SELECT p.*, c.name as category_name, b.name as brand_name,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', v.id, 'name', v.name, 'sku', v.sku,
                    'barcode', v.barcode, 'color', v.color, 'size', v.size,
                    'selling_price', v.selling_price, 'cost_price', v.cost_price,
                    'stock_quantity', v.stock_quantity
                  )
                ) FILTER (WHERE v.id IS NOT NULL), '[]'
              ) as variants,
              COALESCE((SELECT json_agg(json_build_object('id',pi.id,'image_url',pi.image_url,'sort_order',pi.sort_order,'is_primary',pi.is_primary,'image_type',pi.image_type) ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id=p.id),'[]') images
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN brands b ON b.id = p.brand_id
       LEFT JOIN product_variants v ON v.product_id = p.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY p.id, c.name, b.name
       ORDER BY p.created_at DESC
       LIMIT $${i} OFFSET $${i+1}`,
      [...params, query.limit || 20, query.offset || 0],
    );
    return result.rows;
  }

  async findOne(id: string, companyId: string) {
    const product = await this.db.query(
      `SELECT p.*, c.name as category_name, b.name as brand_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN brands b ON b.id = p.brand_id
       WHERE p.id=$1 AND p.company_id=$2 AND p.deleted_at IS NULL`,
      [id, companyId],
    );
    if (!product.rows[0]) throw new NotFoundException('Product not found');
    const variants = await this.db.query(
      `SELECT * FROM product_variants WHERE product_id=$1 ORDER BY created_at`, [id]);
    const images = await this.db.query(
      `SELECT * FROM product_images WHERE product_id=$1 ORDER BY sort_order`, [id]);
    return { ...product.rows[0], variants: variants.rows, images: images.rows };
  }

  async create(dto: CreateProductDto, companyId: string) {
    const result = await this.db.query(
      `INSERT INTO products (company_id, category_id, brand_id, name, name_ar, description, description_ar, sku_prefix, image_url, tags, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [companyId, dto.category_id || null, dto.brand_id || null, dto.name, dto.name_ar || null,
       dto.description || null, dto.description_ar || null, dto.sku_prefix || null,
       dto.image_url || null, dto.tags || [], dto.is_active ?? true],
    );
    const product = result.rows[0];
    if (dto.variants?.length) {
      for (const v of dto.variants) {
        await this.addVariant(product.id, v, companyId);
      }
    }
    return this.findOne(product.id, companyId);
  }

  async update(id: string, dto: Partial<CreateProductDto>, companyId: string) {
    await this.findOne(id, companyId);
    const result = await this.db.query(
      `UPDATE products SET name=COALESCE($1,name), name_ar=COALESCE($2,name_ar),
       description=COALESCE($3,description), description_ar=COALESCE($4,description_ar),
       category_id=COALESCE($5,category_id), brand_id=COALESCE($6,brand_id),
       sku_prefix=COALESCE($7,sku_prefix), image_url=COALESCE($8,image_url),
       is_active=COALESCE($9,is_active), tags=COALESCE($10,tags),
       updated_at=NOW() WHERE id=$11 AND company_id=$12 RETURNING *`,
      [dto.name, dto.name_ar, dto.description, dto.description_ar,
       dto.category_id, dto.brand_id, dto.sku_prefix, dto.image_url, dto.is_active, dto.tags, id, companyId],
    );
    return result.rows[0];
  }

  async syncImages(productId:string, companyId:string, body:any){
    await this.findOne(productId,companyId);
    const images=Array.isArray(body?.images)?body.images.slice(0,12):[];
    if(images.some((x:any)=>!String(x?.image_url||'').startsWith('http')&&!String(x?.image_url||'').startsWith('data:image/'))) throw new BadRequestException('Each image must be an image URL or uploaded image');
    await this.db.transaction(async client=>{
      await client.query(`DELETE FROM product_images WHERE product_id=$1`,[productId]);
      for(let i=0;i<images.length;i++) await client.query(`INSERT INTO product_images(id,product_id,image_url,alt_text,sort_order,is_primary,image_type) VALUES($1,$2,$3,$4,$5,$6,$7)`,[randomUUID(),productId,images[i].image_url,images[i].alt_text||null,i,i===0,images[i].image_type||'product']);
      await client.query(`UPDATE products SET image_url=$1,updated_at=NOW() WHERE id=$2 AND company_id=$3`,[images[0]?.image_url||null,productId,companyId]);
    });
    return this.findOne(productId,companyId);
  }

  async generateLifestyle(productId:string,companyId:string,body:any){
    const product=await this.findOne(productId,companyId);
    const source=String(body?.source_image||product.image_url||'');
    if(!source)throw new BadRequestException('Upload a clear product image first');
    const key=process.env.OPENAI_API_KEY;if(!key)throw new ServiceUnavailableException('AI image generation is not configured. Add OPENAI_API_KEY in Railway.');
    const sourceResponse=source.startsWith('data:')?null:await fetch(source);
    if(sourceResponse&&!sourceResponse.ok)throw new BadRequestException('Could not download source image');
    const match=source.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    const blob=match?new Blob([new Uint8Array(Buffer.from(match[2],'base64'))],{type:match[1]}):await sourceResponse!.blob();
    const styles:any={mall:'a premium Saudi shopping mall',riyadh:'a modern Riyadh street',ramadan:'an elegant Ramadan evening setting',studio:'a luxury fashion studio',resort:'a sophisticated desert resort'};
    const prompt=`Create a photorealistic vertical ecommerce lifestyle photograph featuring the exact product from the reference image in ${styles[body?.style]||styles.studio}. ${body?.gender&&body.gender!=='none'?`Use a professional ${body.gender} fashion model.`:'Use an appropriate premium retail presentation.'} Preserve the product design, color, fabric, logo and proportions exactly. Full product clearly visible, natural commercial lighting, Saudi market styling, no text, no watermark. ${String(body?.prompt||'').slice(0,500)}`;
    const count=Math.min(3,Math.max(1,Number(body?.count||1)));const made:any[]=[];
    for(let i=0;i<count;i++){
      const form=new FormData();form.append('model',process.env.OPENAI_IMAGE_MODEL||'gpt-image-2');form.append('image',blob,'product.png');form.append('prompt',prompt);form.append('size','1024x1536');form.append('quality','medium');form.append('output_format','jpeg');
      const response=await fetch('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:`Bearer ${key}`},body:form});const data:any=await response.json();
      if(!response.ok)throw new ServiceUnavailableException(data?.error?.message||'AI image generation failed');
      const image_url=data?.data?.[0]?.b64_json?`data:image/jpeg;base64,${data.data[0].b64_json}`:data?.data?.[0]?.url;if(image_url)made.push({image_url,image_type:'lifestyle'});
    }
    return {images:made};
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.db.query(`UPDATE products SET deleted_at=NOW() WHERE id=$1`, [id]);
    return { message: 'Product deleted' };
  }

  async addVariant(productId: string, dto: CreateVariantDto, companyId: string) {
    const owner = await this.db.query(
      `SELECT id FROM products WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL`,
      [productId, companyId],
    );
    if (!owner.rows[0]) throw new NotFoundException('Product not found');
    const result = await this.db.query(
      `INSERT INTO product_variants (product_id, name, name_ar, sku, barcode, color, size, cost_price, selling_price, compare_price, stock_quantity, low_stock_threshold)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [productId, dto.name, dto.name_ar || null, dto.sku || null, dto.barcode || null,
       dto.color || null, dto.size || null, dto.cost_price || 0, dto.selling_price || 0,
       dto.compare_price || null, dto.stock_quantity || 0, dto.low_stock_threshold || 5],
    );
    return result.rows[0];
  }

  async updateVariant(variantId: string, dto: Partial<CreateVariantDto>, companyId: string) {
    const owner = await this.db.query(
      `SELECT v.id FROM product_variants v JOIN products p ON p.id=v.product_id
       WHERE v.id=$1 AND p.company_id=$2 AND p.deleted_at IS NULL`,
      [variantId, companyId],
    );
    if (!owner.rows[0]) throw new NotFoundException('Variant not found');
    const result = await this.db.query(
      `UPDATE product_variants SET name=COALESCE($1,name), name_ar=COALESCE($2,name_ar),
       sku=COALESCE($3,sku), barcode=COALESCE($4,barcode),
       color=COALESCE($5,color), size=COALESCE($6,size),
       cost_price=COALESCE($7,cost_price), selling_price=COALESCE($8,selling_price),
       compare_price=COALESCE($9,compare_price), stock_quantity=COALESCE($10,stock_quantity),
       low_stock_threshold=COALESCE($11,low_stock_threshold), updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [dto.name, dto.name_ar, dto.sku, dto.barcode, dto.color, dto.size, dto.cost_price,
       dto.selling_price, dto.compare_price, dto.stock_quantity, dto.low_stock_threshold, variantId],
    );
    if (!result.rows[0]) throw new NotFoundException('Variant not found');
    return result.rows[0];
  }

  async removeVariant(variantId: string, companyId: string) {
    const owner = await this.db.query(
      `SELECT v.id FROM product_variants v JOIN products p ON p.id=v.product_id
       WHERE v.id=$1 AND p.company_id=$2 AND p.deleted_at IS NULL`,
      [variantId, companyId],
    );
    if (!owner.rows[0]) throw new NotFoundException('Variant not found');
    await this.db.query(`DELETE FROM product_variants WHERE id=$1`, [variantId]);
    return { message: 'Variant deleted' };
  }
}
