import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateProductDto, CreateVariantDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private db: DatabaseService) {}

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
              ) as variants
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
      `INSERT INTO products (company_id, category_id, brand_id, name, name_ar, description, description_ar, sku_prefix, tags, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [companyId, dto.category_id || null, dto.brand_id || null, dto.name, dto.name_ar || null,
       dto.description || null, dto.description_ar || null, dto.sku_prefix || null,
       dto.tags || [], dto.is_active ?? true],
    );
    const product = result.rows[0];
    if (dto.variants?.length) {
      for (const v of dto.variants) {
        await this.addVariant(product.id, v);
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
       sku_prefix=COALESCE($7,sku_prefix), is_active=COALESCE($8,is_active),
       updated_at=NOW() WHERE id=$9 AND company_id=$10 RETURNING *`,
      [dto.name, dto.name_ar, dto.description, dto.description_ar,
       dto.category_id, dto.brand_id, dto.sku_prefix, dto.is_active, id, companyId],
    );
    return result.rows[0];
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.db.query(`UPDATE products SET deleted_at=NOW() WHERE id=$1`, [id]);
    return { message: 'Product deleted' };
  }

  async addVariant(productId: string, dto: CreateVariantDto) {
    const result = await this.db.query(
      `INSERT INTO product_variants (product_id, name, name_ar, sku, barcode, color, size, cost_price, selling_price, compare_price, stock_quantity, low_stock_threshold)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [productId, dto.name, dto.name_ar || null, dto.sku || null, dto.barcode || null,
       dto.color || null, dto.size || null, dto.cost_price || 0, dto.selling_price || 0,
       dto.compare_price || null, dto.stock_quantity || 0, dto.low_stock_threshold || 5],
    );
    return result.rows[0];
  }

  async updateVariant(variantId: string, dto: Partial<CreateVariantDto>) {
    const result = await this.db.query(
      `UPDATE product_variants SET name=COALESCE($1,name), sku=COALESCE($2,sku),
       color=COALESCE($3,color), size=COALESCE($4,size),
       cost_price=COALESCE($5,cost_price), selling_price=COALESCE($6,selling_price),
       stock_quantity=COALESCE($7,stock_quantity), updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [dto.name, dto.sku, dto.color, dto.size, dto.cost_price, dto.selling_price, dto.stock_quantity, variantId],
    );
    if (!result.rows[0]) throw new NotFoundException('Variant not found');
    return result.rows[0];
  }

  async removeVariant(variantId: string) {
    await this.db.query(`DELETE FROM product_variants WHERE id=$1`, [variantId]);
    return { message: 'Variant deleted' };
  }
}
