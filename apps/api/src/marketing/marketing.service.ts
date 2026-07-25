import { Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class MarketingService implements OnModuleInit {
  constructor(private readonly db:DatabaseService){}
  async onModuleInit(){
    await this.db.query(`CREATE TABLE IF NOT EXISTS marketing_campaigns(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,name varchar(180) NOT NULL,
      objective varchar(50) NOT NULL DEFAULT 'sales',channels jsonb NOT NULL DEFAULT '[]',status varchar(30) NOT NULL DEFAULT 'draft',
      budget numeric(14,2) NOT NULL DEFAULT 0,spent numeric(14,2) NOT NULL DEFAULT 0,revenue numeric(14,2) NOT NULL DEFAULT 0,
      orders int NOT NULL DEFAULT 0,impressions bigint NOT NULL DEFAULT 0,clicks bigint NOT NULL DEFAULT 0,
      audience jsonb NOT NULL DEFAULT '{}',creative jsonb NOT NULL DEFAULT '{}',branch_ids jsonb NOT NULL DEFAULT '[]',
      product_ids jsonb NOT NULL DEFAULT '[]',start_at timestamptz,end_at timestamptz,created_by uuid,
      created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS marketing_journeys(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,name varchar(180) NOT NULL,
      trigger_type varchar(60) NOT NULL,status varchar(30) NOT NULL DEFAULT 'draft',channels jsonb NOT NULL DEFAULT '[]',
      steps jsonb NOT NULL DEFAULT '[]',segment jsonb NOT NULL DEFAULT '{}',sent int NOT NULL DEFAULT 0,
      conversions int NOT NULL DEFAULT 0,revenue numeric(14,2) NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now())`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS marketing_creatives(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,name varchar(180) NOT NULL,
      type varchar(40) NOT NULL DEFAULT 'banner',image_url text,headline text,headline_ar text,body text,body_ar text,
      cta varchar(80),destination_url text,created_at timestamptz NOT NULL DEFAULT now())`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS marketing_integrations(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,provider varchar(40) NOT NULL,
      is_enabled boolean NOT NULL DEFAULT false,account_name text,account_id text,settings jsonb NOT NULL DEFAULT '{}',
      updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(company_id,provider))`);
  }
  async dashboard(companyId:string){
    const [totals,channels,journeys]=await Promise.all([
      this.db.query(`SELECT COALESCE(sum(spent),0)::float spent,COALESCE(sum(revenue),0)::float revenue,
        COALESCE(sum(orders),0)::int orders,COALESCE(sum(clicks),0)::int clicks,COALESCE(sum(impressions),0)::int impressions,
        count(*) FILTER(WHERE status='active')::int active FROM marketing_campaigns WHERE company_id=$1`,[companyId]),
      this.db.query(`SELECT ch channel,COALESCE(sum(spent),0)::float spent,COALESCE(sum(revenue),0)::float revenue,
        COALESCE(sum(orders),0)::int orders FROM marketing_campaigns c,CROSS JOIN LATERAL jsonb_array_elements_text(c.channels) ch
        WHERE company_id=$1 GROUP BY ch ORDER BY revenue DESC`,[companyId]),
      this.db.query(`SELECT COALESCE(sum(sent),0)::int sent,COALESCE(sum(conversions),0)::int conversions,
        COALESCE(sum(revenue),0)::float revenue,count(*) FILTER(WHERE status='active')::int active
        FROM marketing_journeys WHERE company_id=$1`,[companyId])
    ]);
    const t:any=totals.rows[0]||{}; const j:any=journeys.rows[0]||{};
    return { ...t,roas:t.spent?Number(t.revenue)/Number(t.spent):0,cpa:t.orders?Number(t.spent)/Number(t.orders):0,
      ctr:t.impressions?Number(t.clicks)*100/Number(t.impressions):0,channels:channels.rows,retention:j };
  }
  async campaigns(companyId:string){ return (await this.db.query(`SELECT *,CASE WHEN spent>0 THEN revenue/spent ELSE 0 END roas FROM marketing_campaigns WHERE company_id=$1 ORDER BY updated_at DESC`,[companyId])).rows; }
  async saveCampaign(companyId:string,userId:string,b:any,id?:string){
    const v=[b.name||'Untitled campaign',b.objective||'sales',JSON.stringify(b.channels||[]),b.status||'draft',Number(b.budget)||0,Number(b.spent)||0,Number(b.revenue)||0,Number(b.orders)||0,Number(b.impressions)||0,Number(b.clicks)||0,JSON.stringify(b.audience||{}),JSON.stringify(b.creative||{}),JSON.stringify(b.branch_ids||[]),JSON.stringify(b.product_ids||[]),b.start_at||null,b.end_at||null];
    if(id) return (await this.db.query(`UPDATE marketing_campaigns SET name=$1,objective=$2,channels=$3,status=$4,budget=$5,spent=$6,revenue=$7,orders=$8,impressions=$9,clicks=$10,audience=$11,creative=$12,branch_ids=$13,product_ids=$14,start_at=$15,end_at=$16,updated_at=now() WHERE id=$17 AND company_id=$18 RETURNING *`,[...v,id,companyId])).rows[0];
    return (await this.db.query(`INSERT INTO marketing_campaigns(company_id,name,objective,channels,status,budget,spent,revenue,orders,impressions,clicks,audience,creative,branch_ids,product_ids,start_at,end_at,created_by) VALUES($17,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$18) RETURNING *`,[...v,companyId,userId])).rows[0];
  }
  async deleteCampaign(companyId:string,id:string){ await this.db.query(`DELETE FROM marketing_campaigns WHERE id=$1 AND company_id=$2`,[id,companyId]); return {ok:true}; }
  async journeys(companyId:string){ return (await this.db.query(`SELECT * FROM marketing_journeys WHERE company_id=$1 ORDER BY updated_at DESC`,[companyId])).rows; }
  async saveJourney(companyId:string,b:any,id?:string){ const v=[b.name||'Untitled journey',b.trigger_type||'abandoned_cart',b.status||'draft',JSON.stringify(b.channels||[]),JSON.stringify(b.steps||[]),JSON.stringify(b.segment||{})]; if(id)return (await this.db.query(`UPDATE marketing_journeys SET name=$1,trigger_type=$2,status=$3,channels=$4,steps=$5,segment=$6,updated_at=now() WHERE id=$7 AND company_id=$8 RETURNING *`,[...v,id,companyId])).rows[0]; return (await this.db.query(`INSERT INTO marketing_journeys(company_id,name,trigger_type,status,channels,steps,segment) VALUES($7,$1,$2,$3,$4,$5,$6) RETURNING *`,[...v,companyId])).rows[0]; }
  async creatives(companyId:string){ return (await this.db.query(`SELECT * FROM marketing_creatives WHERE company_id=$1 ORDER BY created_at DESC`,[companyId])).rows; }
  async saveCreative(companyId:string,b:any){ return (await this.db.query(`INSERT INTO marketing_creatives(company_id,name,type,image_url,headline,headline_ar,body,body_ar,cta,destination_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[companyId,b.name,b.type||'banner',b.image_url||null,b.headline||null,b.headline_ar||null,b.body||null,b.body_ar||null,b.cta||null,b.destination_url||null])).rows[0]; }
  async deleteCreative(companyId:string,id:string){ await this.db.query(`DELETE FROM marketing_creatives WHERE id=$1 AND company_id=$2`,[id,companyId]);return {ok:true}; }
  async integrations(companyId:string){ const providers=['google','meta','tiktok','snapchat','whatsapp','email','sms']; await Promise.all(providers.map(p=>this.db.query(`INSERT INTO marketing_integrations(company_id,provider) VALUES($1,$2) ON CONFLICT(company_id,provider) DO NOTHING`,[companyId,p]))); return (await this.db.query(`SELECT provider,is_enabled,account_name,account_id,settings,updated_at FROM marketing_integrations WHERE company_id=$1 ORDER BY provider`,[companyId])).rows; }
  async saveIntegration(companyId:string,p:string,b:any){ return (await this.db.query(`INSERT INTO marketing_integrations(company_id,provider,is_enabled,account_name,account_id,settings) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(company_id,provider) DO UPDATE SET is_enabled=$3,account_name=$4,account_id=$5,settings=$6,updated_at=now() RETURNING provider,is_enabled,account_name,account_id,settings`,[companyId,p,!!b.is_enabled,b.account_name||null,b.account_id||null,JSON.stringify(b.settings||{})])).rows[0]; }
}
