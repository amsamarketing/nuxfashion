import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async login(loginDto: LoginDto, ipAddress: string) {
    const { email, password } = loginDto;

    const userResult = await this.db.query(
      `SELECT u.id, u.email, u.password_hash, u.is_active, u.locked_until,
              u.failed_login_attempts, ur.company_id, r.name as role_name
       FROM users u
       LEFT JOIN user_company_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.email = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [email],
    );

    if (userResult.rows.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      throw new ForbiddenException('Account is inactive');
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new ForbiddenException('Account is locked. Contact administrator.');
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      const lockUntil = newAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;
      await this.db.query(
        `UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3`,
        [newAttempts, lockUntil, user.id],
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.db.query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW(), last_login_ip = $1 WHERE id = $2`,
      [ipAddress, user.id],
    );

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role_name,
      companyId: user.company_id,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.getOrThrow('JWT_REFRESH_EXPIRES_IN') as any,
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role_name, companyId: user.company_id },
    };
  }

  async getProfile(userId: string) {
    const result = await this.db.query(
      `SELECT u.id, u.email, u.name, ur.company_id,
              r.name as role_name, c.name as company_name
       FROM users u
       LEFT JOIN user_company_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       LEFT JOIN companies c ON c.id = ur.company_id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [userId],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    return result.rows[0];
  }
}
