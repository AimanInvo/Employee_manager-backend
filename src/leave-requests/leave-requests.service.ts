import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { AuditAction, LeaveStatus } from '@prisma/client';
import type { Queue } from 'bullmq';
import type { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

type LeaveEmailJobName =
  | 'leave-request-created'
  | 'leave-approved'
  | 'leave-rejected';

type LeaveDecisionEmailJobData = {
  employeeEmail: string;
  employeeName: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  numberOfDays: number;
};

type LeaveRequestCreatedEmailJobData = LeaveDecisionEmailJobData & {
  managerEmails: string[];
  reason: string;
};

@Injectable()
export class LeaveRequestsService {
// Inject the PrismaService to interact with the database
  private readonly logger = new Logger(LeaveRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('emails') private readonly emailQueue: Queue,
  ) {}

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
    const createResult = await this.prisma.$transaction(async (tx) => {
      const leaveRequest = await tx.leaveRequest.create({
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

      await tx.auditLog.create({
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

      const employee = await tx.employee.findUnique({
        where: { id: user.id },
        select: {
          email: true,
          fullName: true,
          managers: {
            select: {
              manager: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      return {
        leaveRequest,
        emailJobData: {
          managerEmails: employee.managers.map(
            (assignment) => assignment.manager.email,
          ),
          employeeEmail: employee.email,
          employeeName: employee.fullName,
          leaveType: leaveRequest.leaveType,
          startDate: leaveRequest.startDate,
          endDate: leaveRequest.endDate,
          numberOfDays: leaveRequest.numberOfDays,
          reason: leaveRequest.reason,
        },
      };
    });

    if (createResult.emailJobData.managerEmails.length === 0) {
      this.logger.warn(
        `No managers found for leave request ${createResult.leaveRequest.id}; manager email was not queued`,
      );
    } else {
      await this.queueLeaveEmail(
        'leave-request-created',
        createResult.emailJobData,
        createResult.leaveRequest.id,
      );
    }

    return createResult.leaveRequest;
  }
// Retrieve all leave requests for the authenticated user, ordered by creation date in descending order
async getMyLeaveRequests(user: AuthUser, query: PaginationQueryDto) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const where = {
    employeeId: user.id,
  };
// Use a transaction to fetch the leave requests and the total count in a single query for efficiency
  const [data, total] = await this.prisma.$transaction([
    this.prisma.leaveRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    this.prisma.leaveRequest.count({ where }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
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
  const approvalResult = await this.prisma.$transaction(async (tx) => {
    const leaveRequest = await tx.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        employee: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
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

    return {
      updatedLeaveRequest,
      emailJobData: {
        employeeEmail: leaveRequest.employee.email,
        employeeName: leaveRequest.employee.fullName,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        numberOfDays: leaveRequest.numberOfDays,
      },
    };
  });

  await this.queueLeaveEmail(
    'leave-approved',
    approvalResult.emailJobData,
    leaveRequestId,
  );

  return approvalResult.updatedLeaveRequest;
}

// Reject a leave request by its ID, ensuring that the authenticated manager is assigned to the employee and that the request is pending.
async rejectLeaveRequest(manager: AuthUser, leaveRequestId: number) {
  const rejectionResult = await this.prisma.$transaction(async (tx) => {
    const leaveRequest = await tx.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        employee: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
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

    return {
      updatedLeaveRequest,
      emailJobData: {
        employeeEmail: leaveRequest.employee.email,
        employeeName: leaveRequest.employee.fullName,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        numberOfDays: leaveRequest.numberOfDays,
      },
    };
  });

  await this.queueLeaveEmail(
    'leave-rejected',
    rejectionResult.emailJobData,
    leaveRequestId,
  );

  return rejectionResult.updatedLeaveRequest;
}

private async queueLeaveEmail(
  jobName: LeaveEmailJobName,
  emailJobData: LeaveDecisionEmailJobData | LeaveRequestCreatedEmailJobData,
  leaveRequestId: number,
) {
  try {
    await this.emailQueue.add(jobName, emailJobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
  } catch (error) {
    this.logger.error(
      `Failed to queue ${jobName} email for leave request ${leaveRequestId}`,
      error instanceof Error ? error.stack : String(error),
    );
  }
}
}
