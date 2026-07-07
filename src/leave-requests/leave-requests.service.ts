import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, LeaveStatus } from '@prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';

@Injectable()
export class LeaveRequestsService {
// Inject the PrismaService to interact with the database

  constructor(private readonly prisma: PrismaService) {}

  async createLeaveRequest(
    user: AuthUser,
    createLeaveRequestDto: CreateLeaveRequestDto,
  ) {
    const startDate = new Date(createLeaveRequestDto.startDate);
    const endDate = new Date(createLeaveRequestDto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('End date cannot be before start date');
    }

    const numberOfDays = this.calculateInclusiveDays(startDate, endDate);
    const currentYear = new Date().getFullYear();
// Check if the user has enough leave balance for the requested leave type and year
    const leaveBalance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveType_year: {
          employeeId: user.id,
          leaveType: createLeaveRequestDto.leaveType,
          year: currentYear,
        },
      },
    });

    if (!leaveBalance) {
      throw new BadRequestException('Leave balance not found');
    }

    const availableDays = leaveBalance.totalDays - leaveBalance.usedDays;

    if (numberOfDays > availableDays) {
      throw new ForbiddenException('Not enough leave balance available');
    }
// Create the leave request and log the action in the audit log
    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        employeeId: user.id,
        leaveType: createLeaveRequestDto.leaveType,
        startDate,
        endDate,
        numberOfDays,
        reason: createLeaveRequestDto.reason,
        status: LeaveStatus.PENDING,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.LEAVE_REQUEST_CREATED,
        entityType: 'LeaveRequest',
        entityId: leaveRequest.id,
        metadata: {
          leaveType: leaveRequest.leaveType,
          startDate: leaveRequest.startDate,
          endDate: leaveRequest.endDate,
          numberOfDays: leaveRequest.numberOfDays,
        },
      },
    });

    return leaveRequest;
  }
// Retrieve all leave requests for the authenticated user, ordered by creation date in descending order
  async getMyLeaveRequests(user: AuthUser) {
    return this.prisma.leaveRequest.findMany({
      where: {
        employeeId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  // Calculate the number of inclusive days between two dates, including both the start and end dates

  private calculateInclusiveDays(startDate: Date, endDate: Date) {
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const start = Date.UTC(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
    );
    const end = Date.UTC(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
    );

    return Math.floor((end - start) / millisecondsPerDay) + 1;
  }

  // Retrieve all leave requests for the team of the authenticated manager, including employee details and ordered by creation date in descending order
  async getTeamLeaveRequests(manager: AuthUser) {
  return this.prisma.leaveRequest.findMany({
    where: {
      employee: {
        managers: {
          some: {
            managerId: manager.id,
          },
        },
      },
    },
    include: {
      employee: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

// Approve a leave request by its ID, ensuring that the authenticated manager is assigned to the employee and that the request is pending.
async approveLeaveRequest(manager: AuthUser, leaveRequestId: number) {
  return this.prisma.$transaction(async (tx) => {
    const leaveRequest = await tx.leaveRequest.findUnique({
      where: { id: leaveRequestId },
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    const assignment = await tx.employeeManager.findUnique({
      where: {
        employeeId_managerId: {
          employeeId: leaveRequest.employeeId,
          managerId: manager.id,
        },
      },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'You can only approve requests from your assigned employees',
      );
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    const currentYear = new Date().getFullYear();

    const leaveBalance = await tx.leaveBalance.findUnique({
      where: {
        employeeId_leaveType_year: {
          employeeId: leaveRequest.employeeId,
          leaveType: leaveRequest.leaveType,
          year: currentYear,
        },
      },
    });

    if (!leaveBalance) {
      throw new BadRequestException('Leave balance not found');
    }

    const availableDays = leaveBalance.totalDays - leaveBalance.usedDays;

    if (leaveRequest.numberOfDays > availableDays) {
      throw new ForbiddenException('Not enough leave balance available');
    }

    const updatedLeaveRequest = await tx.leaveRequest.update({
      where: { id: leaveRequest.id },
      data: {
        status: LeaveStatus.APPROVED,
        decidedAt: new Date(),
      },
    });

    await tx.leaveBalance.update({
      where: {
        employeeId_leaveType_year: {
          employeeId: leaveRequest.employeeId,
          leaveType: leaveRequest.leaveType,
          year: currentYear,
        },
      },
      data: {
        usedDays: {
          increment: leaveRequest.numberOfDays,
        },
      },
    });
// Log the approval action in the audit log
    await tx.auditLog.create({
      data: {
        actorId: manager.id,
        action: AuditAction.LEAVE_REQUEST_APPROVED,
        entityType: 'LeaveRequest',
        entityId: leaveRequest.id,
        metadata: {
          employeeId: leaveRequest.employeeId,
          leaveType: leaveRequest.leaveType,
          numberOfDays: leaveRequest.numberOfDays,
        },
      },
    });

    return updatedLeaveRequest;
  });
}

// Reject a leave request by its ID, ensuring that the authenticated manager is assigned to the employee and that the request is pending.
async rejectLeaveRequest(manager: AuthUser, leaveRequestId: number) {
  return this.prisma.$transaction(async (tx) => {
    const leaveRequest = await tx.leaveRequest.findUnique({
      where: { id: leaveRequestId },
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    const assignment = await tx.employeeManager.findUnique({
      where: {
        employeeId_managerId: {
          employeeId: leaveRequest.employeeId,
          managerId: manager.id,
        },
      },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'You can only reject requests from your assigned employees',
      );
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    const updatedLeaveRequest = await tx.leaveRequest.update({
      where: { id: leaveRequest.id },
      data: {
        status: LeaveStatus.REJECTED,
        decidedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: manager.id,
        action: AuditAction.LEAVE_REQUEST_REJECTED,
        entityType: 'LeaveRequest',
        entityId: leaveRequest.id,
        metadata: {
          employeeId: leaveRequest.employeeId,
          leaveType: leaveRequest.leaveType,
          numberOfDays: leaveRequest.numberOfDays,
        },
      },
    });

    return updatedLeaveRequest;
  });
}
}
