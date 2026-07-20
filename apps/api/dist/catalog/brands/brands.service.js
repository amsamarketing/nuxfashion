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
exports.BrandsService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../database/database.service");
let BrandsService = class BrandsService {
    db;
    constructor(db) {
        this.db = db;
    }
    async findAll(companyId) {
        const result = await this.db.query(`SELECT * FROM brands WHERE company_id=$1 ORDER BY name`, [companyId]);
        return result.rows;
    }
    async findOne(id, companyId) {
        const result = await this.db.query(`SELECT * FROM brands WHERE id=$1 AND company_id=$2`, [id, companyId]);
        if (!result.rows[0])
            throw new common_1.NotFoundException('Brand not found');
        return result.rows[0];
    }
    async create(dto, companyId) {
        const result = await this.db.query(`INSERT INTO brands (company_id, name, name_ar, logo_url, is_active)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`, [companyId, dto.name, dto.name_ar || null, dto.logo_url || null, dto.is_active ?? true]);
        return result.rows[0];
    }
    async update(id, dto, companyId) {
        await this.findOne(id, companyId);
        const result = await this.db.query(`UPDATE brands SET name=COALESCE($1,name), name_ar=COALESCE($2,name_ar),
       logo_url=COALESCE($3,logo_url), is_active=COALESCE($4,is_active),
       updated_at=NOW() WHERE id=$5 AND company_id=$6 RETURNING *`, [dto.name, dto.name_ar, dto.logo_url, dto.is_active, id, companyId]);
        return result.rows[0];
    }
    async remove(id, companyId) {
        await this.findOne(id, companyId);
        await this.db.query(`DELETE FROM brands WHERE id=$1 AND company_id=$2`, [id, companyId]);
        return { message: 'Brand deleted' };
    }
};
exports.BrandsService = BrandsService;
exports.BrandsService = BrandsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], BrandsService);
//# sourceMappingURL=brands.service.js.map