import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeaveBalancesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyBalances(user: AuthUser) {
    return this.getBalancesForEmployee(user.id);
  }

async getEmployeeBalances(manager: AuthUser, employeeId: number) {
  const employee = await this.prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!employee) {
    throw new NotFoundException('Employee not found');
  }

  if (employee.role !== RoleCode.EMPLOYEE) {
    throw new ForbiddenException('You can only view employee balances');
  }

  const assignment = await this.prisma.employeeManager.findUnique({
    where: {
      employeeId_managerId: {
        employeeId,
        managerId: manager.id,
      },
    },
  });

  if (!assignment) {
    throw new ForbiddenException(
      'You can only view balances for your assigned employees',
    );
  }

  return this.getBalancesForEmployee(employeeId);
}

  private async getBalancesForEmployee(employeeId: number) {
    const currentYear = new Date().getFullYear();

    const balances = await this.prisma.leaveBalance.findMany({
      where: {
        employeeId,
        year: currentYear,
      },
      select: {
        leaveType: true,
        totalDays: true,
        usedDays: true,
      },
      orderBy: { leaveType: 'asc' },
    });

    return balances.map((balance) => ({
      leaveType: balance.leaveType,
      totalDays: balance.totalDays,
      usedDays: balance.usedDays,
      availableDays: balance.totalDays - balance.usedDays,
    }));
  }
}