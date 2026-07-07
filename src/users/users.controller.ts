import { Controller, Get, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UsersService } from './users.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';


@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @Roles(RoleCode.EMPLOYEE, RoleCode.MANAGER)
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.getMe(user);
  }

  @Get('me/managers')
  @Roles(RoleCode.EMPLOYEE)
  getMyManagers(@CurrentUser() user: AuthUser) {
    return this.usersService.getMyManagers(user);
  }

  @Get('me/employees')
  @Roles(RoleCode.MANAGER)
  getMyEmployees(@CurrentUser() user: AuthUser) {
    return this.usersService.getMyEmployees(user);
  }
}
