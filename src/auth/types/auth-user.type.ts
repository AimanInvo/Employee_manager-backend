// src/auth/types/auth-user.type.ts
import { RoleCode } from '@prisma/client';

export type AuthUser = {
  id: number;
  email: string;
  role: RoleCode;
};