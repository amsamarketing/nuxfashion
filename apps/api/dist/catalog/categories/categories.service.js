"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../database/database.service");
let CategoriesService = class CategoriesService {
    db;
    constructor(db) {
        this.db = db;
    }
    async findAll(companyId) {
        const result = await this.db.query(`SELECT c.*, p.name as parent_name FROM categories c
       LEFT JOIN categories p ON p.id = c.parent_id
       WHERE c.company_id = $1 AND c.deleted_at IS NULL
       ORDER BY c.sort_order, c.name`, [companyId]);
        return result.rows;
    }
    async findOne(id, companyId) {
        const result = await this.db.query(`SELECT * FROM categories WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`, [id, companyId]);
        if (!result.rows[0])
            throw new common_1.NotFoundException('Category not found');
        return result.rows[0];
    }
    async create(dto, companyId) {
        const result = await this.db.query(`INSERT INTO categories (company_id, parent_id, name, name_ar, slug, description, description_ar, image_url, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [companyId, dto.parent_id || null, dto.name, dto.name_ar || null, dto.slug,
            dto.description || null, dto.description_ar || null, dto.image_url || null,
            dto.sort_order ?? 0, dto.is_active ?? true]);
        return result.rows[0];
    }
    async update(id, dto, companyId) {
        await this.findOne(id, companyId);
        const result = await this.db.query(`UPDATE categories SET name=COALESCE($1,name), name_ar=COALESCE($2,name_ar),
       slug=COALESCE($3,slug), description=COALESCE($4,description),
       description_ar=COALESCE($5,description_ar), image_url=COALESCE($6,image_url),
       sort_order=COALESCE($7,sort_order), is_active=COALESCE($8,is_active),
       updated_at=NOW() WHERE id=$9 AND company_id=$10 RETURNING *`, [dto.name, dto.name_ar, dto.slug, dto.description, dto.description_ar,
            dto.image_url, dto.sort_order, dto.is_active, id, companyId]);
        return result.rows[0];
    }
    async remove(id, companyId) {
        await this.findOne(id, companyId);
        await this.db.query(`UPDATE categories SET deleted_at=NOW() WHERE id=$1 AND company_id=$2`, [id, companyId]);
        return { message: 'Category deleted' };
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map