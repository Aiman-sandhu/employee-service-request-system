# Requirements

## Problem
Employees raise IT, HR and facility requests through email and chat. Requests get lost, nobody owns them, and deadlines are missed.

## Stakeholders
| Role | Needs |
|---|---|
| Employee | Raise a request, track its status, comment |
| Agent (IT / HR / Facility) | See requests of own category, update status, comment |
| Admin | See everything, reassign, view dashboard and audit logs |

## Scope
In: auth, role-based access, requests, auto-routing, SLA deadlines, status workflow, comments, dashboard, audit logs.
Out: email notifications, file attachments, payments, escalation rules.

## SLA (time to resolve)
| Priority | Hours |
|---|---|
| URGENT | 4 |
| HIGH | 24 |
| MEDIUM | 72 |
| LOW | 168 |

## Success Metrics
- Every request has an owner (auto-assigned agent) and a due date
- Overdue requests are visible on the admin dashboard
- Employees can never change a request status
- Every important action is recorded in the audit log

## Acceptance Criteria
1. Register always creates an EMPLOYEE
2. Creating a request sets `dueAt` from priority and assigns an agent of that category
3. Employee sees only own requests; agent sees own category; admin sees all
4. Status follows OPEN → IN_PROGRESS → RESOLVED → CLOSED (reopen allowed from RESOLVED); invalid transitions return 400
5. Wrong role or wrong category returns 403
6. Dashboard returns counts by status, by category and overdue count (admin only)
7. All of the above are covered by automated tests