// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import type { AuthUser } from './types/auth-user.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.employee.findUnique({
      where: { email: loginDto.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const passwordMatches = await bcrypt.compare(loginDto.password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.LOGIN,
        entityType: 'Employee',
        entityId: user.id,
      },
    });
    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async logout(user: AuthUser) {
    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.LOGOUT,
        entityType: 'Employee',
        entityId: user.id,
      },
    });

    return { message: 'Logged out successfully' };
  }
}
