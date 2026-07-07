import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { LeaveRequestsService } from './leave-requests.service';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';


@ApiTags('Leave Requests')
@ApiBearerAuth()
@Controller('leave-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  // Create a new leave request for the authenticated user this is only accessible to users with the EMPLOYEE role
  @Post()
  @ApiBody({ type: CreateLeaveRequestDto })
  @Roles(RoleCode.EMPLOYEE)
  createLeaveRequest(
    @CurrentUser() user: AuthUser,
    @Body() createLeaveRequestDto: CreateLeaveRequestDto,
  ) {
    return this.leaveRequestsService.createLeaveRequest(
      user,
      createLeaveRequestDto,
    );
  }
// Retrieve all leave requests for the authenticated user
  @Get('me')
  @Roles(RoleCode.EMPLOYEE)
  getMyLeaveRequests(@CurrentUser() user: AuthUser) {
    return this.leaveRequestsService.getMyLeaveRequests(user);
  }

  // Retrieve all leave requests for the team of the authenticated manager
  @Get('team')
@Roles(RoleCode.MANAGER)
getTeamLeaveRequests(@CurrentUser() user: AuthUser) {
  return this.leaveRequestsService.getTeamLeaveRequests(user);
}

// Approve a leave request by its ID, only accessible to users with the MANAGER role
@Patch(':id/approve')
@Roles(RoleCode.MANAGER)
approveLeaveRequest(
  @CurrentUser() user: AuthUser,
  @Param('id', ParseIntPipe) id: number,
) {
  return this.leaveRequestsService.approveLeaveRequest(user, id);
}

// Reject a leave request by its ID, only accessible to users with the MANAGER role
@Patch(':id/reject')
@Roles(RoleCode.MANAGER)
rejectLeaveRequest(
  @CurrentUser() user: AuthUser,
  @Param('id', ParseIntPipe) id: number,
) {
  return this.leaveRequestsService.rejectLeaveRequest(user, id);
}
}
