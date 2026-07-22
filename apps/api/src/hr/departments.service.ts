import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './department.dto';
@Injectable()
export class DepartmentsService {
  constructor(private db: DatabaseService) {}
  async findAll() { return (await this.db.query('SELECT * FROM departments ORDER BY name')).rows; }
  async findOne(id: string) { const r = await this.db.query('SELECT * FROM departments WHERE id=$1',[id]); if (!r.rows[0]) throw new NotFoundException('Not found'); return r.rows[0]; }
  async create(dto: CreateDepartmentDto) { return (await this.db.query('INSERT INTO departments(name,description) VALUES($1,$2) RETURNING *',[dto.name,dto.description??null])).rows[0]; }
  async update(id: string, dto: UpdateDepartmentDto) { await this.findOne(id); return (await this.db.query('UPDATE departments SET name=COALESCE($1,name),description=COALESCE($2,description),updated_at=NOW() WHERE id=$3 RETURNING *',[dto.name??null,dto.description??null,id])).rows[0]; }
  async remove(id: string) { await this.findOne(id); await this.db.query('DELETE FROM departments WHERE id=$1',[id]); return {message:'Deleted'}; }
}
