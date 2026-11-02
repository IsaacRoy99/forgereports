FORGE REPORT SYSTEM — NETLIFY DEPLOYMENT PACKAGE
================================================

WHAT THIS PACKAGE CONTAINS
- public/: the website pages, styles, logo and browser JavaScript
- netlify/functions/api.mjs: the hosted API (login, reports, review, resubmission, attachments)
- netlify/database/migrations/: creates the Postgres database tables and seeds the existing demo users/departments
- netlify.toml: Netlify build and API routing configuration

IMPORTANT PLATFORM REQUIREMENT
This package uses Netlify Database (managed PostgreSQL) and Netlify Blobs (persistent attachments). The database dependency is pinned to the published 2.x line (`@netlify/database` ^2.0.1).
Netlify Database is currently available on Netlify credit-based plans. Before deploying, open the Netlify project and confirm that Data & Storage > Database is available for the account. When Netlify detects @netlify/database and the migration folder, it provisions the database and applies the migration as part of deployment. If the account cannot create a Netlify Database, deployment will need a supported external PostgreSQL database instead.

DEPLOY
1. Extract this ZIP. The folder you connect to Netlify/GitHub is the folder containing netlify.toml, package.json, public/, and netlify/.
2. Create a NEW Netlify site or connect a NEW GitHub repository for this package. Do not overwrite the existing GitHub project/site while testing.
3. In Netlify build settings, use the default settings from netlify.toml. Publish directory is public; functions directory is netlify/functions.
4. Deploy. Netlify should detect @netlify/database, create the database and apply the SQL migration. Check the deploy log for migration success.
5. After deployment, open https://YOUR-SITE.netlify.app/api/health. Expected response includes status "ok" and database "connected".
6. Open /login.html and test the seeded users.

DEMO LOGIN BEHAVIOR
The source project did not validate passwords in its login API. This package intentionally preserves that demo behavior: enter a seeded email address; the password field is required by the page but is not checked by the API. This is ONLY suitable for a controlled demonstration. Do not use this build with real confidential company information or expose it publicly. Before production use, implement proper password hashing, authentication tokens, authorization on every API route, and audit logging.

SEEDED USER EMAILS (copied from the source project's seed data)
jane@forgeacademy.co.za
disebo@forgeacademy.co.za
keegan@forgeacademy.co.za
Ali@forgeacademy.co.za
lilian@forgeacademy.co.za
tariq@forgeacademy.co.za
craig@forgeacademy.co.za
lauren@forgeacademy.co.za
kishanry@forgeacademy.co.za
linda@forgeacademy.co.za
francis@forgeacademy.co.za
wayne@forgeacademy.co.za
charmain@forgeacademy.co.za
lezel@forgeacademy.co.za
jabu@forgeacademy.co.za
michael@forgeacademy.co.za
renoo@forgeacademy.co.za
kayleen@forgeacademy.co.za
des@forgeacademy.co.za
olga@forgeacademy.co.za
admin@forgeacademy.co.za

DATABASE CREDENTIAL WARNING
The uploaded ZIP contained a live-looking SQL Server connection string with a password in appsettings.json. That old configuration is not included in this deployment package. Rotate that SQL Server password because it was present in the shared ZIP/repository.

CURRENT SCOPE / LIMITATIONS
- Dashboard navigation is wired: Dashboard, My Reports, Sent Reports, All Reports, Pending Reviews and (for administrators) Admin Panel.
- Department users can view their own reports, filter pending reviews, open report details, see reviewer feedback and resubmit rejected reports.
- Administrators can search/filter all reports, open report details and approve/reject reports with feedback.
- The FORGE REPORTS wordmark has been added alongside the existing Forge logo; the original logo artwork and colour identity are retained.
- Signup page is retained in the source project, but account creation is not implemented; use the pre-seeded demo users.
- Passwords are intentionally not validated in this demo build, matching the source project's current API behavior. The browser-side role checks are not a security boundary and API routes are not fully authorized. This remains a demonstration build only.
- Existing reports from the old SQL Server database are not automatically copied. The Netlify database contains its own seeded departments and users; new demo reports are saved there.
- The files have been syntax-checked locally. This does not replace testing the deployed API, database and attachment storage after GitHub deploys the update.


DASHBOARD UPDATE (v4)
- Removed the left navigation and Workflows sidebar from the department dashboard.
- Added an Add Report button to open the report form on demand.
- The report form now starts hidden and can be closed or cancelled.
- The reports table remains on the dashboard with search, view details, and rejected-report resubmission.
- Existing API routes and database setup are unchanged.
