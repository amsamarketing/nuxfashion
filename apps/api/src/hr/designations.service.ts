import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateDesignationDto, UpdateDesignationDto } from './designation.dto';
@Injectable()
export class DesignationsService {
  constructor(private db: DatabaseService) {}
  async findAll() { return (await this.db.query('SELECT d.*,dep.name as department_name FROM designations d LEFT JOIN departments dep ON dep.id=d.department_id ORDER BY d.name')).rows; }
  async findOne(id: string) { const r = await this.db.query('SELECT d.*,dep.name as department_name FROM designations d LEFT JOIN departments dep ON dep.id=d.department_id WHERE d.id=$1',[id]); if (!r.rows[0]) throw new NotFoundException('Not found'); return r.rows[0]; }
  async create(dto: CreateDesignationDto) { return (await this.db.query('INSERT INTO designations(name,description,department_id) VALUES($1,$2,$3) RETURNING *',[dto.name,dto.description??null,dto.departmentId??null])).rows[0]; }
  async update(id: string, dto: UpdateDesignationDto) { await this.findOne(id); return (await this.db.query('UPDATE designations SET name=COALESCE($1,name),description=COALESCE($2,description),department_id=COALESCE($3,department_id),updated_at=NOW() WHERE id=$4 RETURNING *',[dto.name??null,dto.description??null,dto.departmentId??null,id])).rows[0]; }
  async remove(id: string) { await this.findOne(id); await this.db.query('DELETE FROM designations WHERE id=$1',[id]); return {message:'Deleted'}; }
}
