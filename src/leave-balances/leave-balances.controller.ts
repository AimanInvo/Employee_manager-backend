import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { LeaveBalancesService } from './leave-balances.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Leave Balances')
@ApiBearerAuth()
@Controller('leave-balances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveBalancesController {
  constructor(private readonly leaveBalancesService: LeaveBalancesService) {}

  // Get the authenticated employee's leave balances
  @Get('me')
  @Roles(RoleCode.EMPLOYEE)
  getMyBalances(@CurrentUser() user: AuthUser) {
    return this.leaveBalancesService.getMyBalances(user);
  }

  // Get the leave balances of an employee assigned to the authenticated manager
  @Get('employees/:employeeId')
  @Roles(RoleCode.MANAGER)
  getEmployeeBalances(
    @CurrentUser() user: AuthUser,
    @Param('employeeId', ParseIntPipe) employeeId: number,
  ) {
    return this.leaveBalancesService.getEmployeeBalances(user, employeeId);
  }
}
