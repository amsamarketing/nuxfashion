import { Injectable,UnauthorizedException,ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
@Injectable()
export class AuthService{
  constructor(private db:DatabaseService,private jwtService:JwtService,private config:ConfigService){}
  private isPosRole(role:string){return ['cashier','pos','pos_user','sales_associate','salesperson'].includes(String(role||'').toLowerCase().replace(/[\s-]+/g,'_'))}
  async login(loginDto:LoginDto,ipAddress:string,portal:'admin'|'pos'='admin'){
    const userResult=await this.db.query(`SELECT u.id,u.name,u.email,u.password_hash,u.is_active,u.locked_until,u.failed_login_attempts,ur.company_id,r.name role_name FROM users u LEFT JOIN user_company_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id WHERE LOWER(u.email)=LOWER($1) AND u.deleted_at IS NULL LIMIT 1`,[loginDto.email]);
    if(!userResult.rows[0])throw new UnauthorizedException('Invalid credentials');
    const user=userResult.rows[0];if(!user.is_active)throw new ForbiddenException('Account is inactive');if(user.locked_until&&new Date(user.locked_until)>new Date())throw new ForbiddenException('Account is locked. Contact administrator.');
    if(!await bcrypt.compare(loginDto.password,user.password_hash)){const attempts=(user.failed_login_attempts||0)+1,lockUntil=attempts>=5?new Date(Date.now()+30*60*1000):null;await this.db.query(`UPDATE users SET failed_login_attempts=$1,locked_until=$2 WHERE id=$3`,[attempts,lockUntil,user.id]);throw new UnauthorizedException('Invalid credentials')}
    const access=await this.db.query(`SELECT COALESCE(json_agg(DISTINCT ar.slug) FILTER(WHERE ar.slug IS NOT NULL),'[]') roles,COALESCE(json_agg(ar.permissions) FILTER(WHERE ar.id IS NOT NULL),'[]') permission_sets FROM user_access_roles uar JOIN access_roles ar ON ar.id=uar.role_id WHERE uar.user_id=$1 AND uar.company_id=$2`,[user.id,user.company_id]);const accessRoles:string[]=access.rows[0]?.roles||[];const permissions:string[]=[...new Set((access.rows[0]?.permission_sets||[]).flat())] as string[];
    const posRole=this.isPosRole(user.role_name)||accessRoles.includes('cashier');if(portal==='admin'&&posRole&&!accessRoles.some(r=>['super_admin','admin','branch_manager','supervisor'].includes(r)))throw new ForbiddenException('This account can only sign in from the Branch POS login page.');if(portal==='pos'&&!posRole)throw new ForbiddenException('Use a branch POS user account. Administrator accounts open the admin panel.');
    let branch:any=null;if(portal==='pos'){const result=await this.db.query(`SELECT b.id branch_id,b.warehouse_id,b.name branch_name,COALESCE(NULLIF(b.code,''),b.branch_code) branch_code FROM branch_user_assignments a JOIN branches b ON b.id=a.branch_id WHERE a.user_id=$1 AND b.company_id=$2 AND b.is_active=true ORDER BY a.is_default DESC,b.name LIMIT 1`,[user.id,user.company_id]);branch=result.rows[0];if(!branch)throw new ForbiddenException('No active branch is assigned to this POS account. Ask the administrator to assign a branch.')}
    await this.db.query(`UPDATE users SET failed_login_attempts=0,locked_until=NULL,last_login_at=NOW(),last_login_ip=$1 WHERE id=$2`,[ipAddress,user.id]);
    const payload={sub:user.id,email:user.email,role:user.role_name,roles:accessRoles,permissions,companyId:user.company_id,portal,branchId:branch?.branch_id,warehouseId:branch?.warehouse_id};
    const accessToken=this.jwtService.sign(payload),refreshToken=this.jwtService.sign(payload,{secret:this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),expiresIn:this.config.getOrThrow('JWT_REFRESH_EXPIRES_IN') as any});
    return{accessToken,refreshToken,user:{id:user.id,name:user.name,email:user.email,role:user.role_name,roles:accessRoles,permissions,companyId:user.company_id,portal,branchId:branch?.branch_id,warehouseId:branch?.warehouse_id,branchName:branch?.branch_name,branchCode:branch?.branch_code}};
  }
  async getProfile(userId:string){const result=await this.db.query(`SELECT u.id,u.email,u.name,ur.company_id,r.name role_name,c.name company_name FROM users u LEFT JOIN user_company_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id LEFT JOIN companies c ON c.id=ur.company_id WHERE u.id=$1 AND u.deleted_at IS NULL`,[userId]);if(!result.rows[0])throw new UnauthorizedException('User not found');return result.rows[0]}
}
