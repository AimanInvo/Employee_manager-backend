import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { hashToken } from '../utils/token-hash.util';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    let payload: { sub?: number };

    try {
      payload = await this.jwtService.verifyAsync<{ sub?: number }>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    const revokedToken = await this.prisma.revokedToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true },
    });

    if (revokedToken) {
      throw new UnauthorizedException('Token has been revoked');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!employee || !employee.isActive) {
      throw new UnauthorizedException('User is not active');
    }

    request['accessToken'] = token;
    request['user'] = {
      id: employee.id,
      email: employee.email,
      role: employee.role,
    };

    return true;
  }
}
