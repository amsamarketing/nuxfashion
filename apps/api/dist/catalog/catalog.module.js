"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogModule = void 0;
const common_1 = require("@nestjs/common");
const categories_controller_1 = require("./categories/categories.controller");
const categories_service_1 = require("./categories/categories.service");
const brands_controller_1 = require("./brands/brands.controller");
const brands_service_1 = require("./brands/brands.service");
const products_controller_1 = require("./products/products.controller");
const products_service_1 = require("./products/products.service");
let CatalogModule = class CatalogModule {
};
exports.CatalogModule = CatalogModule;
exports.CatalogModule = CatalogModule = __decorate([
    (0, common_1.Module)({
        controllers: [categories_controller_1.CategoriesController, brands_controller_1.BrandsController, products_controller_1.ProductsController],
        providers: [categories_service_1.CategoriesService, brands_service_1.BrandsService, products_service_1.ProductsService],
    })
], CatalogModule);
//# sourceMappingURL=catalog.module.js.map