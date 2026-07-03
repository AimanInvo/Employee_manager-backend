import { Injectable, NotFoundException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';

const publicEmployeeSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  departmentId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Get the authenticated user's information
  async getMe(user: AuthUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: user.id },
      select: publicEmployeeSelect,
    });

    if (!employee) {
      throw new NotFoundException('User not found');
    }

    return employee;
  }

  // Get the authenticated user's assigned managers
  async getMyManagers(user: AuthUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: user.id },
      select: {
        managers: {
          select: {
            manager: {
              select: publicEmployeeSelect,
            },
          },
          orderBy: { managerId: 'asc' },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('User not found');
    }

    return employee.managers.map((assignment) => assignment.manager);
  }

  // Get employees assigned to the authenticated manager
  async getMyEmployees(user: AuthUser) {
    const assignments = await this.prisma.employeeManager.findMany({
      where: {
        managerId: user.id,
        employee: {
          role: RoleCode.EMPLOYEE,
        },
      },
      select: {
        employee: {
          select: publicEmployeeSelect,
        },
      },
      orderBy: { employeeId: 'asc' },
    });

    return assignments.map((assignment) => assignment.employee);
  }
}
