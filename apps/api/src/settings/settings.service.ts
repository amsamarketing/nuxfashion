import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

const DEFAULTS={
 business_name:'NuxFashion',business_name_ar:'نوكس فاشن',vat_number:'',cr_number:'',phone:'',email:'',address:'',address_ar:'',logo_url:'',currency:'SAR',timezone:'Asia/Riyadh',language:'en',
 vat_rate:15,prices_include_vat:true,zatca_enabled:true,simplified_invoice:true,invoice_prefix:'INV',invoice_footer:'Thank you for shopping with us',
 cash_enabled:true,mada_enabled:true,card_enabled:true,tabby_enabled:false,tamara_enabled:false,bank_transfer_enabled:true,cod_enabled:true,mada_commission:0,card_commission:0,tabby_commission:0,tamara_commission:0,
 negative_stock_allowed:true,require_customer:true,allow_split_payment:true,allow_discount:true,max_discount_percent:20,receipt_size:'80mm',auto_print_receipt:false,barcode_format:'CODE128',low_stock_threshold:5,
 store_enabled:true,default_delivery_fee:25,free_delivery_from:300,delivery_estimate:'2–5 business days',return_days:7,guest_checkout:true,online_stock_buffer:0,
 stock_transfer_approval:true,purchase_approval:true,expense_approval:true,email_notifications:true,low_stock_alerts:true,daily_sales_summary:true,audit_log_enabled:true,session_timeout_minutes:480,
 whatsapp_number:'',smtp_from_email:'',google_analytics_id:'',meta_pixel_id:'',webhook_url:''
};
const ALLOWED=new Set(Object.keys(DEFAULTS));
@Injectable()
export class SettingsService implements OnModuleInit{
 constructor(private db:DatabaseService){}
 async onModuleInit(){await this.db.query(`CREATE TABLE IF NOT EXISTS company_settings(company_id uuid PRIMARY KEY,settings jsonb NOT NULL DEFAULT '{}'::jsonb,updated_by uuid,updated_at timestamptz NOT NULL DEFAULT now())`)}
 async get(companyId:string){if(!companyId)throw new BadRequestException('Company is missing from login');const r=await this.db.query(`SELECT settings,updated_at FROM company_settings WHERE company_id=$1`,[companyId]);return {...DEFAULTS,...(r.rows[0]?.settings||{}),updated_at:r.rows[0]?.updated_at||null}}
 async update(companyId:string,userId:string,body:Record<string,unknown>){if(!companyId)throw new BadRequestException('Company is missing from login');const clean:any={};for(const [k,v] of Object.entries(body||{}))if(ALLOWED.has(k))clean[k]=v;if(Number(clean.vat_rate)<0||Number(clean.vat_rate)>100)throw new BadRequestException('VAT rate must be between 0 and 100');if(Number(clean.max_discount_percent)<0||Number(clean.max_discount_percent)>100)throw new BadRequestException('Maximum discount must be between 0 and 100');await this.db.query(`INSERT INTO company_settings(company_id,settings,updated_by) VALUES($1,$2::jsonb,$3) ON CONFLICT(company_id) DO UPDATE SET settings=company_settings.settings||EXCLUDED.settings,updated_by=EXCLUDED.updated_by,updated_at=now()`,[companyId,JSON.stringify(clean),userId]);return this.get(companyId)}
}
