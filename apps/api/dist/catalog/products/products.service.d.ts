import { DatabaseService } from '../../database/database.service';
import { CreateProductDto, CreateVariantDto } from './dto/create-product.dto';
export declare class ProductsService {
    private db;
    constructor(db: DatabaseService);
    findAll(companyId: string, query?: any): Promise<import("pg").QueryResultRow[]>;
    findOne(id: string, companyId: string): Promise<{
        variants: import("pg").QueryResultRow[];
        images: import("pg").QueryResultRow[];
    }>;
    create(dto: CreateProductDto, companyId: string): Promise<{
        variants: import("pg").QueryResultRow[];
        images: import("pg").QueryResultRow[];
    }>;
    update(id: string, dto: Partial<CreateProductDto>, companyId: string): Promise<import("pg").QueryResultRow>;
    remove(id: string, companyId: string): Promise<{
        message: string;
    }>;
    addVariant(productId: string, dto: CreateVariantDto): Promise<import("pg").QueryResultRow>;
    updateVariant(variantId: string, dto: Partial<CreateVariantDto>): Promise<import("pg").QueryResultRow>;
    removeVariant(variantId: string): Promise<{
        message: string;
    }>;
}
