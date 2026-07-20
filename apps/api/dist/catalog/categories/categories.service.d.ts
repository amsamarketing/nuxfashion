import { DatabaseService } from '../../database/database.service';
import { CreateCategoryDto } from './dto/create-category.dto';
export declare class CategoriesService {
    private db;
    constructor(db: DatabaseService);
    findAll(companyId: string): Promise<import("pg").QueryResultRow[]>;
    findOne(id: string, companyId: string): Promise<import("pg").QueryResultRow>;
    create(dto: CreateCategoryDto, companyId: string): Promise<import("pg").QueryResultRow>;
    update(id: string, dto: Partial<CreateCategoryDto>, companyId: string): Promise<import("pg").QueryResultRow>;
    remove(id: string, companyId: string): Promise<{
        message: string;
    }>;
}
