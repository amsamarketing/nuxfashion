import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import type { Request } from 'express';
export declare class CategoriesController {
    private readonly service;
    constructor(service: CategoriesService);
    findAll(req: Request): Promise<import("pg").QueryResultRow[]>;
    findOne(id: string, req: Request): Promise<import("pg").QueryResultRow>;
    create(dto: CreateCategoryDto, req: Request): Promise<import("pg").QueryResultRow>;
    update(id: string, dto: Partial<CreateCategoryDto>, req: Request): Promise<import("pg").QueryResultRow>;
    remove(id: string, req: Request): Promise<{
        message: string;
    }>;
}
