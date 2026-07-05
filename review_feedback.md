# Day 2 Review Feedback

1. `reason` and `decisionNote`: how are these different?
   When a manager accepts or rejects a leave request, they can just write a reason/note. No need to keep both if they mean the same thing.

2. No need for `managerId` in `LeaveRequest`.
   We can use the relation from `Employee`, since each employee already has a manager assigned. So `LeaveRequest` only needs to keep `employeeId`.

3. The `Employee` table is being used for both employees and managers.
   Since this table represents different user roles, the name should be more generic, for example `User`.

4. Managers currently have a `departmentId`.
   Shouldn't managers only have authority over employees in the same department? Also, more than one manager may be assigned to employees. Think about the design options for this, such as a pivot table or storing an array of manager IDs.

5. Can employees see what happened to their leave request?
   If the idea is that employees can see whether their request was approved/rejected and the time it was reviewed, then the current fields may be fine. Just confirm if this is the intended thinking behind the design.

# Day 3 Review Feedback

1. Audit logs are only being created for login, but not logout.
   We should also store when a user logs out, because logout is part of the user session history. Add a `LOGOUT` value in `AuditAction` so the code can save this event properly.

2. Successful login should be logged after the token is generated.
   Right now the audit log is created before `signAsync()`. If token generation fails, the system may record a successful login even though the user did not actually receive a token.

# Day 4 Review Feedback

1. In the current logout flow, the API records `LOGOUT` in the audit log and returns a success message. But the JWT token is not cancelled or blocked, so the same token can still be used to call protected APIs until it expires.

2. Check the user's latest role from the database on protected APIs.
   The token should identify the user, but permission should come from the current database record.
   This prevents users from keeping old access after their role is changed or their account is deactivated.
