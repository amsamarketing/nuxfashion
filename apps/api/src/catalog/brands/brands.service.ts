import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateBrandDto } from './dto/create-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private db: DatabaseService) {}

  async findAll(companyId: string) {
    const result = await this.db.query(
      `SELECT * FROM brands WHERE company_id=$1 ORDER BY name`,
      [companyId],
    );
    return result.rows;
  }

  async findOne(id: string, companyId: string) {
    const result = await this.db.query(
      `SELECT * FROM brands WHERE id=$1 AND company_id=$2`,
      [id, companyId],
    );
    if (!result.rows[0]) throw new NotFoundException('Brand not found');
    return result.rows[0];
  }

  async create(dto: CreateBrandDto, companyId: string) {
    const result = await this.db.query(
      `INSERT INTO brands (company_id, name, name_ar, logo_url, is_active)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [companyId, dto.name, dto.name_ar || null, dto.logo_url || null, dto.is_active ?? true],
    );
    return result.rows[0];
  }

  async update(id: string, dto: Partial<CreateBrandDto>, companyId: string) {
    await this.findOne(id, companyId);
    const result = await this.db.query(
      `UPDATE brands SET name=COALESCE($1,name), name_ar=COALESCE($2,name_ar),
       logo_url=COALESCE($3,logo_url), is_active=COALESCE($4,is_active),
       updated_at=NOW() WHERE id=$5 AND company_id=$6 RETURNING *`,
      [dto.name, dto.name_ar, dto.logo_url, dto.is_active, id, companyId],
    );
    return result.rows[0];
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.db.query(`DELETE FROM brands WHERE id=$1 AND company_id=$2`, [id, companyId]);
    return { message: 'Brand deleted' };
  }
}
