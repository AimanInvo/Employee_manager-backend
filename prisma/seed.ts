import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { LeaveType, RoleCode } from '@prisma/client';
import { createPrismaClient } from '../src/prisma/prisma-client.factory';

const prisma = createPrismaClient();

const DEFAULT_PASSWORD = 'Password123!';
const CURRENT_YEAR = new Date().getFullYear();

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const departments = await Promise.all([
    prisma.department.upsert({
      where: { name: 'Engineering' },
      update: {},
      create: { name: 'Engineering', description: 'Software development team' },
    }),
    prisma.department.upsert({
      where: { name: 'HR' },
      update: {},
      create: { name: 'HR', description: 'Human resources team' },
    }),
    prisma.department.upsert({
      where: { name: 'Finance' },
      update: {},
      create: { name: 'Finance', description: 'Finance and accounts team' },
    }),
  ]);

  const managers: { id: number }[] = [];

  for (let i = 1; i <= 10; i++) {
    const department = departments[i % departments.length];

    const manager = await prisma.employee.upsert({
      where: { email: `manager${i}@example.com` },
      update: {},
      create: {
        fullName: `Manager ${i}`,
        email: `manager${i}@example.com`,
        password: passwordHash,
        role: RoleCode.MANAGER,
        departmentId: department.id,
      },
    });

    managers.push(manager);
  }

  for (let i = 1; i <= 24; i++) {
    const department = departments[i % departments.length];
    const assignedManagers = [
      managers[i % managers.length],
      managers[(i + 1) % managers.length],
    ];

    const employee = await prisma.employee.upsert({
      where: { email: `employee${i}@example.com` },
      update: {},
      create: {
        fullName: `Employee ${i}`,
        email: `employee${i}@example.com`,
        password: passwordHash,
        role: RoleCode.EMPLOYEE,
        departmentId: department.id,
      },
    });

    for (const manager of assignedManagers) {
      await prisma.employeeManager.upsert({
        where: {
          employeeId_managerId: {
            employeeId: employee.id,
            managerId: manager.id,
          },
        },
        update: {},
        create: {
          employeeId: employee.id,
          managerId: manager.id,
        },
      });
    }

    await createLeaveBalances(employee.id);
  }

  console.log('Seed completed successfully.');
  console.log(`Default password for all users: ${DEFAULT_PASSWORD}`);
}

async function createLeaveBalances(employeeId: number) {
  const balances = [
    { leaveType: LeaveType.SICK, totalDays: 5 },
    { leaveType: LeaveType.CASUAL, totalDays: 5 },
    { leaveType: LeaveType.ANNUAL, totalDays: 10 },
  ];

  for (const balance of balances) {
    await prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveType_year: {
          employeeId,
          leaveType: balance.leaveType,
          year: CURRENT_YEAR,
        },
      },
      update: {},
      create: {
        employeeId,
        leaveType: balance.leaveType,
        totalDays: balance.totalDays,
        usedDays: 0,
        year: CURRENT_YEAR,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
