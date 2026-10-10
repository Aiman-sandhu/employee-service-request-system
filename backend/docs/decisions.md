# Decision Log

| Decision | Why |
|---|---|
| SLA hours by priority (4 / 24 / 72 / 168) | Urgent issues like a broken laptop need same-day action; low priority can wait a week. Simple, easy to explain and change in one file (`utils/sla.js`) |
| `dueAt` calculated on the server | The client cannot cheat the deadline |
| Auto-routing to the agent with the fewest open requests | Spreads work evenly without manual assignment. If no agent exists the request stays unassigned and admin can assign it |
| Admin can reassign | Auto-routing is a default, not a final decision |
| Status workflow as a transition table | Prevents jumps like OPEN to CLOSED. Easy to read and test |
| RESOLVED can go back to IN_PROGRESS | Reopen if the fix did not work. CLOSED is final |
| Employees cannot change status | If requesters could mark their own request resolved, SLA tracking would be meaningless. Only the people doing the work update status |
| Agents limited to their category (or assigned requests) | An HR agent should not see IT tickets (privacy and focus) |
| Register always creates EMPLOYEE | Prevents self-assigned admin. Agents and admins are promoted by an admin-side script |
| `category` stored in the JWT | Access checks need no extra DB call. Downside: role changes apply only after re-login |
| Request creation in a transaction | Routing and request insert succeed together, and the audit log rolls back with it |
| Audit log for create, status change and assign | Accountability: who did what and when |
| Same error for wrong email and wrong password | Does not reveal which emails are registered |