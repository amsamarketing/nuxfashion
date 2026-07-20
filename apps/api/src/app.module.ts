import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './sales/sales.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { CustomersModule } from './customers/customers.module';
import { HrModule } from './hr/hr.module';
import { FinanceModule } from './finance/finance.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    CatalogModule,
    InventoryModule,
    SalesModule,
    PurchasingModule,
    CustomersModule,
    HrModule,
    FinanceModule,
    ReportsModule,
  ],
})
export class AppModule {}
