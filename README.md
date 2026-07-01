# Employee Manager Backend Practice

This is a beginner-friendly backend practice project for learning how to build a real API with NestJS, Prisma, PostgreSQL, Swagger, authentication, and good database relations.

The project idea is simple: employees can request leaves, and their assigned manager can approve or reject those leave requests.

## Project Goal

The main goal of this project is to practice backend development step by step.

This project will help me learn:

- How to structure a NestJS backend project
- How to design database tables with Prisma
- How to create good relations between tables
- How to use PostgreSQL with Prisma
- How to build login with JWT authentication
- How to protect routes for employees and managers
- How to document APIs with Swagger
- How to create seed data for testing
- How to keep audit logs for important actions

## Project Idea

We have two main types of users:

- Employee
- Manager

Each employee is assigned to only one manager.

Each manager can have many employees.

Employees can create leave requests. A leave request is approved only when the employee's own manager accepts it. The manager can also reject the leave request.

## Leave Types

Each employee has three types of leaves:

| Leave Type | Limit |
| --- | ---: |
| Sick Leave | 5 days |
| Casual Leave | 5 days |
| Annual Leave | 10 days |

Leave balance is reduced only after a manager approves the leave request.

Pending and rejected leave requests do not reduce the employee's leave balance.

## Core Features

### Authentication

- Employee login
- Manager login
- JWT access token
- Protected routes

### Employees

- View own profile
- View assigned manager
- View leave balances
- Create leave request
- View own leave request history

### Managers

- View assigned employees
- View employees' leave requests
- Approve leave requests
- Reject leave requests
- View leave balances of assigned employees

### Leave Requests

- Employee selects leave type
- Employee selects start date and end date
- Employee adds reason
- Request starts as pending
- Manager approves or rejects the request

### Leave Balances

- Sick leave balance
- Casual leave balance
- Annual leave balance
- Balance updates after approval

### Audit Logs

Audit logs will store important history, for example:

- User login
- Leave request created
- Leave request approved
- Leave request rejected

## Seed Data Plan

For practice and testing, we will create seed data:

- 10 managers
- 24 employees
- Each employee assigned to one manager
- Each employee gets:
  - 5 sick leaves
  - 5 casual leaves
  - 10 annual leaves

All seeded users can use a simple practice password.

## Tech Stack

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Swagger
- JWT authentication
- bcrypt
- class-validator
- class-transformer

## Planned Modules

The backend will be divided into simple modules:

- `AuthModule`
- `UsersModule`
- `LeaveRequestsModule`
- `LeaveBalancesModule`
- `AuditLogsModule`
- `PrismaModule`

## Planned Database Tables

### User

Stores both employees and managers.

Important fields:

- id
- fullName
- email
- password
- role
- managerId
- createdAt
- updatedAt

### LeaveBalance

Stores employee leave limits and used days.

Important fields:

- id
- employeeId
- leaveType
- totalDays
- usedDays
- year
- createdAt
- updatedAt

### LeaveRequest

Stores employee leave requests.

Important fields:

- id
- employeeId
- managerId
- leaveType
- startDate
- endDate
- numberOfDays
- reason
- status
- decisionNote
- decidedAt
- createdAt
- updatedAt

### AuditLog

Stores important user actions.

Important fields:

- id
- actorId
- action
- entityType
- entityId
- metadata
- createdAt

## Main Business Rules

- An employee can have only one manager.
- A manager can have many employees.
- An employee can create leave requests only for themselves.
- A manager can approve or reject only their own employees' leave requests.
- Leave request status starts as `PENDING`.
- Only `PENDING` requests can be approved or rejected.
- Approved leave requests reduce the employee's leave balance.
- Rejected leave requests do not reduce leave balance.
- Employee cannot request more leave days than available balance.
- Leave days will be counted as calendar days for the first version.

## Learning Reference

I will use `apmos-backend` as my senior reference project.

Things to learn from `apmos-backend`:

- Prisma module setup
- Prisma service pattern
- Swagger setup
- DTO validation
- Auth module structure
- JWT guards
- Role guards
- Clean controller and service structure

This practice project should stay simpler than `apmos-backend` because the purpose is learning step by step.

## Current Commands

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run start:dev
```

Build the project:

```bash
npm run build
```

Run tests:

```bash
npm run test
```

Run e2e tests:

```bash
npm run test:e2e
```

## Planned Prisma Commands

These commands will be added when Prisma setup is completed:

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed
```

## Development Steps

Recommended beginner steps:

1. Set up Prisma and PostgreSQL connection.
2. Create the database schema.
3. Create seed data for managers, employees, and leave balances.
4. Build login API.
5. Add JWT guard and current user decorator.
6. Build employee leave request APIs.
7. Build manager approval and rejection APIs.
8. Add leave balance update logic.
9. Add audit log creation.
10. Add Swagger documentation.
11. Add tests for important business rules.

## First Version Scope

The first version will not include:

- Admin panel
- Email notifications
- Password reset
- Multi-factor authentication
- Frontend application
- Complex weekend or holiday leave calculation

These features can be added later after the basic backend is working.
