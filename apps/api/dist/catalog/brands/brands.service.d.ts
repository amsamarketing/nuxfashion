import { DatabaseService } from '../../database/database.service';
import { CreateBrandDto } from './dto/create-brand.dto';
export declare class BrandsService {
    private db;
    constructor(db: DatabaseService);
    findAll(companyId: string): Promise<import("pg").QueryResultRow[]>;
    findOne(id: string, companyId: string): Promise<import("pg").QueryResultRow>;
    create(dto: CreateBrandDto, companyId: string): Promise<import("pg").QueryResultRow>;
    update(id: string, dto: Partial<CreateBrandDto>, companyId: string): Promise<import("pg").QueryResultRow>;
    remove(id: string, companyId: string): Promise<{
        message: string;
    }>;
}
