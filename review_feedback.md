# Day 2 Review Feedback

1. `reason` and `decisionNote`: how are these different?
   When a manager accepts or rejects a leave request, they can just write a reason/note. No need to keep both if they mean the same thing.

2. No need for `managerId` in `LeaveRequest`.
   We can use the relation from `Employee`, since each employee already has a manager assigned. So `LeaveRequest` only needs to keep `employeeId`.
   I will question the developer about this before giving the solution, to understand what they were thinking.

3. The `Employee` table is being used for both employees and managers.
   Since this table represents different user roles, the name should be more generic, for example `User`.

4. Managers currently have a `departmentId`.
   Shouldn't managers only have authority over employees in the same department? Also, more than one manager may be assigned to employees. Think about the design options for this, such as a pivot table or storing an array of manager IDs.

5. Can employees see what happened to their leave request?
   If the idea is that employees can see whether their request was approved/rejected and the time it was reviewed, then the current fields may be fine. Just confirm if this is the intended thinking behind the design.
