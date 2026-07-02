import { SetMetadata } from '@nestjs/common';
import { RoleCode } from '@prisma/client';

export const ROLES_KEY = 'roles';
// Decorator to set roles metadata for route handlers

export const Roles = (...roles: RoleCode[]) => SetMetadata(ROLES_KEY, roles);