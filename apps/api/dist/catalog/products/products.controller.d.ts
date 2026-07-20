import { ProductsService } from './products.service';
import { CreateProductDto, CreateVariantDto } from './dto/create-product.dto';
import type { Request } from 'express';
export declare class ProductsController {
    private readonly service;
    constructor(service: ProductsService);
    findAll(req: Request, query: any): Promise<import("pg").QueryResultRow[]>;
    findOne(id: string, req: Request): Promise<{
        variants: import("pg").QueryResultRow[];
        images: import("pg").QueryResultRow[];
    }>;
    create(dto: CreateProductDto, req: Request): Promise<{
        variants: import("pg").QueryResultRow[];
        images: import("pg").QueryResultRow[];
    }>;
    update(id: string, dto: Partial<CreateProductDto>, req: Request): Promise<import("pg").QueryResultRow>;
    remove(id: string, req: Request): Promise<{
        message: string;
    }>;
    addVariant(id: string, dto: CreateVariantDto): Promise<import("pg").QueryResultRow>;
    updateVariant(variantId: string, dto: Partial<CreateVariantDto>): Promise<import("pg").QueryResultRow>;
    removeVariant(variantId: string): Promise<{
        message: string;
    }>;
}
