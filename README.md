# HCM Lite

Human Capital Management Lite: employees, attendance, leave, salary, payroll, payslip PDFs, announcements, notifications, audit log and an AI assistant. Stack: MongoDB, Express, React (Vite), Node.

## Run locally

Requirements: Node 18+ and a MongoDB (local, or a free MongoDB Atlas cluster).

```bash
# 1. Configure
cp server/.env.example server/.env      # set MONGO_URI and a random JWT_SECRET of at least 32 characters

# 2. Install and build everything (frontend is served by the backend)
npm run build

# 3. Start
npm start                               # http://localhost:5000
```

In development (`NODE_ENV=development`), an empty database is seeded with demo data unless `AUTO_SEED=false`. Demo accounts and passwords are for local development only. To wipe and re-seed a development database: `npm run seed`; this destructive command runs only when `NODE_ENV=development`.
On startup, the backend removes the obsolete unique attendance index on `employee` left by older schema versions; the current schema enforces uniqueness on `user` and `date`.
Users can create an account from the login page; public signups are restricted to the Employee role. Admin and HR accounts must be created by an administrator.
For a new deployment, set `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, and a unique `INITIAL_ADMIN_PASSWORD` of at least 16 characters before the first start. After startup confirms the admin was created, remove these three variables from the deployment configuration. Never use published demo credentials for real data.

Development mode with hot reload: run `npm --prefix server install`, `npm --prefix client install`, then `npm run dev:server` and `npm run dev:client` (open http://localhost:5173).

## Demo logins (development only)

| Role | Email | Password |
|---|---|---|
| Admin | admin@hcm.com | Admin@123 |
| HR | hr@hcm.com | Hr@12345 |
| Employee | sara@hcm.com | Emp@12345 |

Other employees: hamza@, fatima@, usman@hcm.com (same password as Sara). Change passwords before any real use.

## Deploy (single service, simplest for judges)

1. Create a free MongoDB Atlas cluster, allow access from anywhere, copy the connection string.
2. Push this folder to GitHub, then create a **Web Service** on Render (or Railway):
   - Build command: `npm run build`
   - Start command: `npm start`
   - Environment variables: `MONGO_URI`, `JWT_SECRET` (unique random string, at least 32 characters), `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` (unique random string, at least 16 characters), `ANTHROPIC_API_KEY` (optional), `NODE_ENV=production`, `TZ=Asia/Karachi`
3. After the first successful startup creates the initial administrator, remove `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, and `INITIAL_ADMIN_PASSWORD` from the deployment configuration. Production never auto-seeds demo accounts.

Separate hosting (frontend on Vercel, backend on Render) also works: set `VITE_API_URL=https://<backend>/api` when building the client.

## Roles and permissions

| Feature | Admin | HR | Employee |
|---|---|---|---|
| Company setup, audit log | yes | no | no |
| Create Admin/HR accounts, deactivate users | yes | no | no |
| Register and edit employees | yes | employees only | no |
| Salary structure, run payroll | yes | yes | no |
| Approve leave | all | employees only | no |
| Attendance for everyone | yes | yes | own only |
| Payslip PDFs | any | any | own only |
| Announcements | post | post | read |
| AI assistant | org-wide data | org-wide data | own data only |

Permissions are enforced on the server (JWT plus role middleware); the UI only hides links. Nobody can approve their own leave.

## Business rules

- Leave counts Monday to Friday only. Overlapping pending/approved leave is rejected. Approving paid leave deducts the balance.
- Check-in later than work start plus the grace period is marked late.
- Net pay = basic + allowances - fixed deductions - ((basic + allowances) / working days x unpaid leave days in that month).

## AI assistant

Set `ANTHROPIC_API_KEY` to use a hosted LLM (model via `AI_MODEL`). Each question is answered from a context built from live database records, filtered by the caller's role, plus the HR policy text in `server/src/services/ai.js`. It also summarizes dashboards and turns messages such as "I need sick leave tomorrow" into a pre-filled leave form that the user reviews before submitting. Without a key the assistant falls back to a basic rule-based mode.

## Tests

`npm test` runs unit tests for date, payroll and parsing logic.
