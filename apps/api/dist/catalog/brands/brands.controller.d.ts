import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import type { Request } from 'express';
export declare class BrandsController {
    private readonly service;
    constructor(service: BrandsService);
    findAll(req: Request): Promise<import("pg").QueryResultRow[]>;
    findOne(id: string, req: Request): Promise<import("pg").QueryResultRow>;
    create(dto: CreateBrandDto, req: Request): Promise<import("pg").QueryResultRow>;
    update(id: string, dto: Partial<CreateBrandDto>, req: Request): Promise<import("pg").QueryResultRow>;
    remove(id: string, req: Request): Promise<{
        message: string;
    }>;
}
