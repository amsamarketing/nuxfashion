export declare class CreateVariantDto {
    name: string;
    name_ar?: string;
    sku: string;
    barcode?: string;
    color?: string;
    size?: string;
    cost_price?: number;
    selling_price?: number;
    compare_price?: number;
    stock_quantity?: number;
    low_stock_threshold?: number;
}
export declare class CreateProductDto {
    name: string;
    name_ar?: string;
    description?: string;
    description_ar?: string;
    category_id?: string;
    brand_id?: string;
    sku_prefix?: string;
    tags?: string[];
    is_active?: boolean;
    variants?: CreateVariantDto[];
}
