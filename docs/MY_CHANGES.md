# HostelHub Development Log & Architecture Guide (Tasks 0 – 14)

This document details every major enhancement made across the **HostelHub** codebase, explaining the rationale, files modified, demo steps, and interview questions with answers for each task.

---

## Table of Contents
1. [Task 0: Mess Refocus & Cleanup](#task-0-mess-refocus--cleanup)
2. [Task 1: Complaints System Simplification](#task-1-complaints-system-simplification)
3. [Task 2: Secondary Admin Roles & Granular RBAC](#task-2-secondary-admin-roles--granular-rbac)
4. [Task 3: Deep-Linkable Settings Tabs](#task-3-deep-linkable-settings-tabs)
5. [Task 4: Dedicated Smart Menu Rules Tab](#task-4-dedicated-smart-menu-rules-tab)
6. [Task 5: Tag Library & Rule Integration](#task-5-tag-library--rule-integration)
7. [Task 6: Dish Management Modularization & Custom Hooks](#task-6-dish-management-modularization--custom-hooks)
8. [Task 7: User Management, Password Resets & Bulk Import](#task-7-user-management-password-resets--bulk-import)
9. [Task 8: Menu Change Request Workflow](#task-8-menu-change-request-workflow)
10. [Task 9: Student Self-Registration via Join Code](#task-9-student-self-registration-via-join-code)
11. [Task 10: Server-Side Complaints Query, Search & Pagination](#task-10-server-side-complaints-query-search--pagination)
12. [Task 11: UI Optimistic Updates & Cache Scope Fixes](#task-11-ui-optimistic-updates--cache-scope-fixes)
13. [Task 12: Centralized App Branding Configuration](#task-12-centralized-app-branding-configuration)
14. [Task 13: Production-Ready Demo Seed Script](#task-13-production-ready-demo-seed-script)
15. [Task 14: Soft PREFER Menu Rules with Weight-Based Score Nudging](#task-14-soft-prefer-menu-rules-with-weight-based-score-nudging)
16. [Task 15: Enforce Forced Password Change on the Backend](#task-15-enforce-forced-password-change-on-the-backend)

---

## Task 0: Mess Refocus & Cleanup

### What / Why
- **What**: Removed legacy non-core modules (general maintenance requests, room allocations, gate passes, attendance tracking) to refocus HostelHub strictly on mess operations and food/dining complaints.
- **Why**: Reduced operational cognitive overload, eliminated dead code paths, and allowed the app to excel at its primary value proposition: automated meal planning, student voting, and dining dispute resolution.

### Files Touched
- `backend/src/routes/`: removed deprecated maintenance/gatepass route files
- `backend/src/controllers/`: removed unneeded legacy controller logic
- `frontend/src/components/common/AppTopbar.tsx`: pruned dead navigation links
- `frontend/src/App.tsx`: stripped out orphaned routes

### How to Demo
1. Log in as an administrator.
2. Observe the clean navigation bar containing only Dishes, Weekly Menu, Menu Rules, Complaints, Users, and Settings.
3. Verify legacy endpoints (`/api/gatepass`, `/api/maintenance`) return 404.

### 3 Likely Interview Questions & Answers
1. **Q: Why prune features from a codebase rather than just hiding them in the UI?**
   *A:* Dead code increases test surface area, dependencies, maintenance costs, and attack vectors. Deleting unneeded code reduces bundle sizes, avoids security vulnerabilities in unmaintained modules, and keeps team focus sharp.
2. **Q: How did you ensure removing routes didn't break existing client calls?**
   *A:* By auditing route trees, checking for orphaned API service calls, and running automated end-to-end and unit test suites across frontend and backend.
3. **Q: How does this align with the Single Responsibility Principle?**
   *A:* The app now has a single, cohesive domain: mess operations and dining complaints, rather than attempting to be a monolithic campus ERP.

---

## Task 1: Complaints System Simplification

### What / Why
- **What**: Refactored the generic issue ticket schema to specifically track mess-related complaints (e.g. hygiene, food temperature, taste, timing). Added structured resolver notes upon status changes (`OPEN` vs `CLOSED`).
- **Why**: Students need a direct channel to report mess issues, while mess administrators need a straightforward audit trail to record corrective actions.

### Files Touched
- `backend/src/models/Issue.ts`
- `backend/src/controllers/issue.controller.ts`
- `frontend/src/pages/admin/AdminIssues.tsx`
- `frontend/src/pages/student/StudentIssues.tsx`

### How to Demo
1. As a student, navigate to Complaints and submit a complaint (e.g., "Cold soup served at dinner").
2. Log in as an admin or Complaints Officer, open the ticket, review the description, mark it `CLOSED`, and enter a resolver note ("Kitchen heater recalibrated").
3. Refresh and verify the note persists and displays in the closed ticket summary.

### 3 Likely Interview Questions & Answers
1. **Q: How do you prevent students from viewing or mutating complaints belonging to other hostels?**
   *A:* The JWT verification middleware extracts `hostelId` from the signed token. All queries enforce `{ hostelId: req.user.hostelId }`, preventing cross-tenant leakage.
2. **Q: Why use an enum for status rather than freeform strings?**
   *A:* Enums guarantee state predictability at both schema and TypeScript compile levels, preventing invalid ticket states like "PENDING" or "IN_PROGRESS" where only binary lifecycle states are supported.
3. **Q: Why keep resolver notes optional?**
   *A:* While a ticket is `OPEN`, there is no resolution. When transitioning to `CLOSED`, the resolver note captures what action was taken without forcing placeholder text.

---

## Task 2: Secondary Admin Roles & Granular RBAC

### What / Why
- **What**: Implemented granular permissions (`MANAGE_MENU`, `MANAGE_ISSUES`) alongside a primary admin flag (`isPrimaryAdmin`). Added a reusable `requirePermission` middleware.
- **Why**: Head administrators need to delegate tasks (e.g., hiring a Mess Manager who should only edit dishes and menus, or a Complaints Officer who should only resolve complaints) without giving them master permissions to delete the hostel or create more admins.

### Files Touched
- `backend/src/models/User.ts`
- `backend/src/middlewares/requirePermission.middleware.ts`
- `backend/src/middlewares/requirePrimaryAdmin.middleware.ts`
- `backend/src/controllers/adminUser.controller.ts`
- `frontend/src/components/common/AppTopbar.tsx`

### How to Demo
1. Log in as `admin@home` (Primary Admin) and navigate to Users -> Staff.
2. Create a user with role `ADMIN`, title "Mess Manager", and select permission `MANAGE_MENU`.
3. Log in as that new manager: notice they can access Dishes, Menu, and Menu Rules, but Complaints and Settings tabs are hidden and API calls to `/api/admin/issues` return 403 Forbidden.

### 3 Likely Interview Questions & Answers
1. **Q: What is the difference between Role-Based Access Control (RBAC) and Attribute/Permission-Based Access Control?**
   *A:* Role-based checks whether the user is an `ADMIN` or `STUDENT`. Permission-based checks discrete capabilities (`MANAGE_MENU`). Combining both provides coarse-grained routing with fine-grained endpoint authorization.
2. **Q: How do you prevent privilege escalation where a secondary admin creates another admin?**
   *A:* The user creation endpoint verifies `req.user.isPrimaryAdmin === true`. Non-primary admins are rejected immediately with 403.
3. **Q: Why embed permissions directly inside the JWT payload?**
   *A:* It allows stateless authorization checks on read endpoints without querying the database on every micro-request, while critical mutations verify fresh database records.

---

## Task 3: Deep-Linkable Settings Tabs

### What / Why
- **What**: Refactored `AdminSettings.tsx` into URL-hash-backed tabs (`#general`, `#meals`, `#danger`).
- **Why**: Allows administrators to share direct links to specific settings (e.g., `#meals`), keeps state synchronized on browser reloads, and prevents disorientation.

### Files Touched
- `frontend/src/pages/admin/AdminSettings.tsx`

### How to Demo
1. Go to Admin Settings. Click the "Meal Plan" tab; notice the browser address updates to `/admin/settings#meals`.
2. Refresh the page: the "Meal Plan" tab remains open.
3. Navigate to `/admin/settings#danger`: the Danger Zone section renders directly.

### 3 Likely Interview Questions & Answers
1. **Q: Why use `window.location.hash` instead of query params or sub-routes?**
   *A:* Hashes don't trigger server-side document requests, work seamlessly with client-side SPAs, and represent in-page section jumps without requiring separate route definition overhead.
2. **Q: How do you handle invalid hash fragments?**
   *A:* A sanitize function checks if the hash matches an allowable tab (`meals` | `danger`); if not, it gracefully defaults to `general`.
3. **Q: How do you avoid memory leaks when binding to window navigation events in React?**
   *A:* Clean up event listeners in the `useEffect` cleanup return callback (`window.removeEventListener('hashchange', ...)`).

---

## Task 4: Dedicated Smart Menu Rules Tab

### What / Why
- **What**: Created a dedicated top-level admin page and topbar entry for **Smart Menu Rules** (`/admin/menu/rules`). Admins type natural language instructions, parsed by Google Gemini into pure JsonLogic expressions.
- **Why**: Menu scheduling rules were previously buried in settings. Exposing rules as a first-class citizen highlights the app's AI scheduling differentiation.

### Files Touched
- `frontend/src/pages/admin/AdminMenuRules.tsx`
- `frontend/src/components/common/AppTopbar.tsx`
- `frontend/src/App.tsx`
- `backend/src/services/menuConstraintParser.service.ts`

### How to Demo
1. Log in as an admin or Mess Manager and click "Menu Rules" in the topbar.
2. Enter: *"Require paneer on Monday for dinner and limit fried snacks to 2 per week"*.
3. Click "Preview Rules": view the Gemini-generated interpretation and structured logic.
4. Click "Save Rules" to persist them to the hostel's configuration.

### 3 Likely Interview Questions & Answers
1. **Q: Why separate rule preview from saving?**
   *A:* Large language models can hallucinate or misinterpret edge-case phrasing. A two-step preview-and-confirm workflow gives the human administrator a verification gate before saving solver constraints.
2. **Q: What is JsonLogic and why use it over arbitrary code strings?**
   *A:* JsonLogic represents boolean and arithmetic trees as structured JSON (`{"==": [{"var": "day"}, 0]}`). It can be evaluated securely in any environment without unsafe `eval()` and stored safely in MongoDB.
3. **Q: How do you handle Gemini API rate limits or failures?**
   *A:* Errors are caught, formatted, and surfaced to the UI via user-friendly toast messages, while unit tests mock the parser responses.

---

## Task 5: Tag Library & Rule Integration

### What / Why
- **What**: Created a centralized tag library utility (`DEFAULT_HOSTEL_TAGS`, `normalizeTags` in `tagUtils.ts`), auto-accumulated tags from created dishes onto the hostel model (`$addToSet`), displayed clickable tag chips in the rules UI, and added unknown-tag warning detection during rule preview.
- **Why**: Prevented typos in rules (e.g. "deserts" vs "dessert") that would otherwise silently cause constraints to match zero dishes.

### Files Touched
- `backend/src/utils/tagUtils.ts`
- `backend/src/controllers/dish.controller.ts`
- `backend/src/services/menuConstraintValidator.service.ts`
- `frontend/src/pages/admin/AdminMenuRules.tsx`
- `backend/src/tests/tagLibrary.test.ts`

### How to Demo
1. Go to "Menu Rules". Observe the "Tags in use" chips showing current tags and dish counts (e.g., `paneer (3)`, `chicken (2)`).
2. Click any chip (e.g., `paneer`): the word is instantly inserted into the text area.
3. Type a rule for a nonexistent tag like *"Limit quinoa to once a week"* and click Preview: notice a friendly warning banner: *"No dishes carry 'quinoa', so this rule will have no effect."*

### 3 Likely Interview Questions & Answers
1. **Q: Why use `$addToSet` instead of `$push` in MongoDB?**
   *A:* `$addToSet` treats the array as a mathematical set, preventing duplicate tags from accumulating when dishes with identical tags are updated.
2. **Q: Why normalize tags to lowercase?**
   *A:* Tag matching must be case-insensitive to ensure consistency between user inputs ("Non-Veg", "non-veg", "NON-VEG").
3. **Q: How does the unknown-tag validator work?**
   *A:* It aggregates all tags present across active dishes in the hostel, checks every tag referenced in the parsed rules, and flags any tag with a count of 0 as a non-fatal warning.

---

## Task 6: Dish Management Modularization & Custom Hooks

### What / Why
- **What**: Refactored the monolithic 800+ line `AdminDishes.tsx` file into focused subcomponents (`DishCard`, `DishFilters`, `DishTable`, `DishModal`, `useDishSort` hook).
- **Why**: Reduced re-render bottlenecks, simplified unit testing, improved code readability, and adhered to the single-responsibility principle.

### Files Touched
- `frontend/src/pages/admin/AdminDishes.tsx`
- `frontend/src/pages/admin/components/DishCard.tsx`
- `frontend/src/pages/admin/components/DishFilters.tsx`
- `frontend/src/pages/admin/components/DishTable.tsx`
- `frontend/src/pages/admin/components/DishModal.tsx`
- `frontend/src/pages/admin/hooks/useDishSort.ts`

### How to Demo
1. Open Admin Dishes. Toggle between Grid view and Table view.
2. Filter by meal type (e.g., "Dinner") and category ("Lentils").
3. Click column headers in Table view to sort by name, price score, or health score via `useDishSort`.

### 3 Likely Interview Questions & Answers
1. **Q: What benefits does extracting `useDishSort` into a custom hook provide?**
   *A:* It decouples sorting logic from UI rendering, makes the sort algorithm reusable across other tables, and allows independent unit testing of sorting logic without mocking React DOM.
2. **Q: How do you prevent unnecessary re-renders in child subcomponents?**
   *A:* By isolating state to the component that needs it (e.g. search input inside filter component) and passing stable callbacks.
3. **Q: When should a file be refactored into smaller components?**
   *A:* When a single file exceeds ~250 lines, manages multiple unrelated pieces of state, or mixes data fetching, filtering, modal state, and presentation.

---

## Task 7: User Management, Password Resets & Bulk Import

### What / Why
- **What**: Enhanced the Users page with direct password reset modals, copyable credential snippets, ActivityLog tracking, and robust batch student importing with transactional rollback.
- **Why**: In real hostel deployments, admins regularly need to onboard dozens of students at once or reset forgotten passwords while maintaining security audit trails.

### Files Touched
- `backend/src/controllers/adminUser.controller.ts`
- `backend/src/models/ActivityLog.ts`
- `frontend/src/pages/admin/AdminUsers.tsx`

### How to Demo
1. As an admin, go to Users.
2. Click "Reset Password" on any user: view the generated password and click "Copy Credentials".
3. Check the audit log: verify an `ActivityLog` was recorded with the timestamp and action.

### 3 Likely Interview Questions & Answers
1. **Q: How do you handle bulk creation safely in MongoDB?**
   *A:* Using MongoDB sessions and transactions (`session.startTransaction()`). If any document fails unique index validation, `session.abortTransaction()` rolls back the entire batch.
2. **Q: Why should temporary generated passwords be hashed before storing?**
   *A:* Plaintext passwords must never touch the database. Even temporary passwords must be hashed with bcrypt to protect against database dump leaks.
3. **Q: What information should an audit log include?**
   *A:* The `hostelId`, acting `userId`, timestamp, action name, and affected entity ID—without logging raw passwords.

---

## Task 8: Menu Change Request Workflow

### What / Why
- **What**: Replaced immediate auto-generation in `saveStudentVotes` with a policy-driven change-request workflow. Added `Hostel.menuChangePolicy` (`minVotersPercent`, `minVoters`, `cooldownDays`), a pure `evaluateChangeRequest` evaluation service, and a banner in Menu Management showing voter percentage and cooldown timers.
- **Why**: Auto-publishing on student votes caused chaos and premature menu churn. The new system requires a quorum threshold and cooldown before admins can generate new drafts.

### Files Touched
- `backend/src/services/menuChangeRequest.service.ts`
- `backend/src/controllers/adminMenu.controller.ts`
- `backend/src/controllers/studentVote.controller.ts`
- `backend/src/models/Hostel.ts`
- `backend/src/tests/menuChangeRequest.test.ts`
- `frontend/src/pages/admin/AdminMessMenu.tsx`

### How to Demo
1. Set the policy to `minVotersPercent: 60`, `minVoters: 5`, `cooldownDays: 14` in Settings.
2. When students vote with `wantsNewMenu: true`, observe the banner in Admin Menu: *"62% want a new menu, cooldown ends in 4 days"*.
3. Verify the "Generate drafts" button remains disabled during active cooldown, preventing unwanted generation.

### 3 Likely Interview Questions & Answers
1. **Q: Why extract `evaluateChangeRequest` as a pure function?**
   *A:* Pure functions have zero side effects and don't touch database sockets. They can be tested exhaustively with lightning-fast unit tests covering edge cases (zero voters, within cooldown, exact threshold).
2. **Q: Why shouldn't student votes automatically publish menus?**
   *A:* Automated publishing can generate infeasible menus or bypass dietary review. Admins must review solver output, swap dishes if supplier prices change, and manually publish.
3. **Q: How is the cooldown calculated?**
   *A:* Cooldown starts from `lastPublishedAt`. If `now - lastPublishedAt < cooldownDays`, the system computes `cooldownEndsAt` and blocks draft generation.

---

## Task 9: Student Self-Registration via Join Code

### What / Why
- **What**: Added unique 6-character `Hostel.joinCode` (regenerable in Settings). Created `/student/register` allowing students to sign up with room number and email into a `PENDING` state. Added a "Pending approvals" tab for primary admins to approve/reject students.
- **Why**: Removed the administrative bottleneck of manually keying in every student account.

### Files Touched
- `backend/src/models/Hostel.ts`
- `backend/src/models/User.ts`
- `backend/src/utils/userUtils.ts`
- `backend/src/controllers/auth.controller.ts`
- `backend/src/controllers/adminUser.controller.ts`
- `frontend/src/pages/student/StudentRegister.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/admin/AdminUsers.tsx`
- `backend/src/tests/studentJoin.test.ts`

### How to Demo
1. On the login page, click *"Student? Join your hostel"*.
2. Enter the hostel's 6-character join code, name, room number, email, and password.
3. Attempt to log in immediately: observe rejection with *"Account pending admin approval"*.
4. Log in as Primary Admin, switch to "Pending Approvals" tab, and click "Approve".
5. The student can now log in successfully.

### 3 Likely Interview Questions & Answers
1. **Q: How does the system generate unique student usernames?**
   *A:* `generateStudentUsername(hostelId, domain, roomNo)` queries existing accounts in that room to produce sequential identifiers like `101.1@demo`.
2. **Q: How do you prevent brute-force attacks on the 6-character join code?**
   *A:* Applying rate-limiting middlewares (`express-rate-limit`) on the student registration endpoint to throttle repeat guesses per IP.
3. **Q: Why restrict student approvals to Primary Admins only?**
   *A:* Student enrollment impacts billing and hostel occupancy. Restricting approval rights prevents junior staff from authorizing unauthorized accounts.

---

## Task 10: Server-Side Complaints Query, Search & Pagination

### What / Why
- **What**: Replaced client-side filtering of complaints with a pure server-side query builder `buildComplaintQuery.ts`. Added regex escaping, status filtering, whitelisted sorting, and 300ms search debouncing on the frontend.
- **Why**: In large hostels with hundreds of complaints, fetching all records client-side slows down page load, consumes excessive bandwidth, and breaks mobile browsers.

### Files Touched
- `backend/src/utils/buildComplaintQuery.ts`
- `backend/src/controllers/issue.controller.ts`
- `backend/src/tests/buildComplaintQuery.test.ts`
- `frontend/src/pages/admin/AdminIssues.tsx`

### How to Demo
1. Open Admin Complaints. Type "Rotten" in the search box.
2. Notice the network tab fires a debounced request after 300ms to `/api/admin/issues?q=Rotten&page=1`.
3. Change sort order to "Oldest First" or filter by "Closed": notice the URL params update and results paginate server-side.

### 3 Likely Interview Questions & Answers
1. **Q: Why must search strings be regex-escaped when querying MongoDB?**
   *A:* Characters like `*`, `+`, `?`, or `(` in unescaped regexes can trigger ReDoS (Regular Expression Denial of Service) or syntax errors. Escaping them ensures safe literal matching.
2. **Q: What compound index did you add to support this query?**
   *A:* `{ hostelId: 1, status: 1, createdAt: -1 }`. This allows the database engine to satisfy tenant isolation, status filtering, and reverse chronological sorting via an index scan without an in-memory sort.
3. **Q: Why debounce the search input by 300ms?**
   *A:* Debouncing prevents firing HTTP requests on every single keystroke, reducing server load and avoiding out-of-order response race conditions.

---

## Task 11: UI Optimistic Updates & Cache Scope Fixes

### What / Why
- **What**: Added optimistic state updates with rollback on failure for toggles (activating/deactivating users, closing complaints, approving dishes). Fixed `useApi` cache invalidation and token-based cache key scoping. Fixed the dashboard `totalStudents` counter to exclude `PENDING` students.
- **Why**: Eliminates UI lag and jarring flickers during status changes, and ensures different users sharing the same browser never see cached stale data.

### Files Touched
- `frontend/src/hooks/useApi.ts`
- `frontend/src/services/auth.service.ts`
- `frontend/src/pages/admin/AdminUsers.tsx`
- `frontend/src/pages/admin/AdminIssues.tsx`
- `frontend/src/pages/admin/AdminDishes.tsx`
- `backend/src/controllers/adminDashboard.controller.ts`

### How to Demo
1. In Admin Users, click "Deactivate" on a user: the badge instantly updates to "Inactive" with zero lag.
2. If the network request fails, observe the toggle immediately roll back to its previous state and show an error toast.
3. Log out and log in as another user: verify all cached responses are cleared.

### 3 Likely Interview Questions & Answers
1. **Q: What is an optimistic update and when should it be used?**
   *A:* An optimistic update updates the client UI immediately assuming server success, while capturing a snapshot of previous state. If the API fails, the UI rolls back to the snapshot. It is ideal for low-risk binary actions like toggles and likes.
2. **Q: How did scoping the cache key by token fix cross-user cache bugs?**
   *A:* Previously, cache keys were simply the endpoint string (e.g., `/admin/users`). By prepending `${token || 'anon'}:`, user A's cached responses can never be served to user B.
3. **Q: Why did the dashboard previously show 0 students while Users listed 1?**
   *A:* The dashboard query did not account for user status flags. Adding `{ status: { $ne: 'PENDING' } }` aligned the counting logic with active student rosters.

---

## Task 12: Centralized App Branding Configuration

### What / Why
- **What**: Created `frontend/src/config/app.ts` exporting `APP_NAME = 'HostelHub'`. Unified topbar branding, browser document titles (`document.title`), package names, and headings so changing the brand is a 1-line edit.
- **Why**: Hardcoded branding strings scattered across multiple components make white-labeling or rebranding error-prone.

### Files Touched
- `frontend/src/config/app.ts`
- `frontend/src/components/common/AppTopbar.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/admin/AdminRegister.tsx`
- `frontend/src/pages/student/StudentRegister.tsx`
- `frontend/index.html`
- `frontend/package.json`

### How to Demo
1. Change `export const APP_NAME = 'DormFlow'` in `frontend/src/config/app.ts`.
2. Notice the topbar logo text, browser tab titles, and login headings automatically update to "DormFlow".
3. Revert back to `'HostelHub'`.

### 3 Likely Interview Questions & Answers
1. **Q: Why centralize application configuration in a single TypeScript file?**
   *A:* It creates a single source of truth, enables compiler verification, and avoids missed string replacements across templates.
2. **Q: Why isn't `document.title` updated directly in `index.html` on SPA route changes?**
   *A:* Vite's static HTML is served once at initial load. In SPAs, `useEffect(() => { document.title = APP_NAME }, [])` ensures dynamically navigated pages reflect current page context.
3. **Q: How do you handle environment-specific branding?**
   *A:* Exporting `export const APP_NAME = import.meta.env.VITE_APP_NAME || 'HostelHub'` allows build-time environment variable overrides.

---

## Task 13: Production-Ready Demo Seed Script

### What / Why
- **What**: Built an idempotent demo seed script (`npm run seed -> ts-node -T src/scripts/seed.ts`) that wipes and recreates the "Home" hostel (`home`), populating it with primary admin, mess manager, complaints officer, 20 students, ~40 realistic dishes, reviews, complaints, and a published menu.
- **Why**: Developers, evaluators, and CI/CD pipelines need a single command to spin up an authentic, fully populated test environment.

### Files Touched
- `backend/package.json`
- `backend/src/scripts/seed.ts`
- `.gitignore`

### How to Demo
1. Run `npm run seed` in `backend/`.
2. Review the printed credentials in the terminal:
   - Primary Admin: `admin@home`
   - Mess Manager: `manager@home`
   - Complaints Officer: `complaints@home`
   - Password: `password123`
   - Join Code: printed in output
3. Log in with any of the accounts to verify populated dishes, votes, and complaints.

### 3 Likely Interview Questions & Answers
1. **Q: How do you make a database seed script idempotent?**
   *A:* Check for existing records by unique keys (e.g. `domain: 'home'`), purge existing child records cleanly, and recreate the hierarchy in a known clean state.
2. **Q: Why refuse execution when `NODE_ENV=production` unless `--force` is passed?**
   *A:* To prevent accidental destructive wiping of real student and administrative data if a developer accidentally runs the script against a production database.
3. **Q: Why use `ts-node -T` for running utility scripts?**
   *A:* The `-T` (`--transpile-only`) flag skips TypeScript type checking at execution time, enabling instant script startup without compiling the entire project.

---

## Task 14: Soft PREFER Menu Rules with Weight-Based Score Nudging

### What / Why
- **What**: Extended the rule engine with a soft `PREFER` action and weight parameter `[-50, 50]`. Updated the Gemini schema, parser prompt, and validator. In `solveMealAssignment`, the weight nudges candidate day scores without adding MILP constraints, and the UI displays `soft` badges.
- **Why**: Hard constraints (`REQUIRE_IF`, `LIMIT`) can easily conflict and cause mathematical solver infeasibility. Soft preferences allow admins to gently nudge choices (e.g., "prefer paneer on weekends") without breaking meal generation.

### Files Touched
- `backend/src/models/Hostel.ts`
- `backend/src/services/menuConstraintParser.service.ts`
- `backend/src/services/menuConstraintValidator.service.ts`
- `backend/src/services/menuBuilder.service.ts`
- `backend/src/tests/menuBuilder.test.ts`
- `backend/src/tests/tagLibrary.test.ts`
- `frontend/src/pages/admin/AdminMenuRules.tsx`

### How to Demo
1. In "Menu Rules", type: *"Prefer paneer on weekends with weight 30"*.
2. Preview the rule: observe the AI interpretation and the `soft` badge indicator.
3. When menus are generated, paneer receives a +30 score boost on Saturday/Sunday, winning against close contenders while strictly respecting hard `LIMIT` constraints.

### 3 Likely Interview Questions & Answers
1. **Q: What is the fundamental difference between hard constraints and soft preferences in an optimization solver?**
   *A:* Hard constraints restrict the feasible search space (if violated, the solver reports infeasible). Soft preferences modify the objective function coefficients (weights), guiding the solver toward desirable solutions without eliminating feasibility.
2. **Q: How does `solveMealAssignment` ensure a soft preference never overrides a hard LIMIT?**
   *A:* The preference weight is only added to the objective variable's score (`score: scaledFinalScore + preferBonus`). Hard `LIMIT` rules generate separate row constraints (`model.constraints[dishLimitKey] = { max: limit }`) which the MILP solver cannot violate under any circumstances.
3. **Q: Why constrain the preference weight to `[-50, 50]`?**
   *A:* Base candidate scores are scaled to `[0, 200]`. A weight cap of 50 ensures soft rules can nudge close scores (e.g. 150 vs 170) while preventing a single preference rule from completely overriding student vote majorities.

---

## Task 15: Enforce Forced Password Change on the Backend

### What / Why
- **What**: Backend enforcement of forced password change. Included `mustChangePassword` in the access token claims at login and refresh. Created the `requirePasswordChanged` middleware applied after `verifyToken` to block all protected routes with `403 { code: 'PASSWORD_CHANGE_REQUIRED' }` when `mustChangePassword: true`, exempting only `GET/PUT /api/users/profile`, `POST /api/auth/logout`, and `POST /api/auth/refresh`. Re-issued a fresh access token upon password update, and updated the frontend to redirect to `/set-password` when encountering this code.
- **Why**: Security defense in depth: client-side route guards alone can be bypassed via direct API calls (e.g. using curl or Postman). Enforcing the policy on the backend guarantees temporary or newly provisioned credentials cannot access any hostel data until the user establishes their private password.

### Files Touched
- `backend/src/utils/jwt.ts`
- `backend/src/types/express.d.ts`
- `backend/src/middlewares/verifyToken.middleware.ts`
- `backend/src/middlewares/requirePasswordChanged.middleware.ts`
- `backend/src/controllers/auth.controller.ts`
- `backend/src/controllers/user.controller.ts`
- `backend/src/routes/user.routes.ts`
- `backend/src/server.ts`
- `backend/src/tests/requirePasswordChanged.test.ts`
- `frontend/src/hooks/useApi.ts`
- `frontend/src/pages/SetNewPassword.tsx`

### How to Demo
1. Log in with a user whose account has `mustChangePassword: true` (e.g. newly created student or reset account).
2. Attempt to make a direct API call to a normal route (e.g. `GET /api/issues` or `GET /api/student/menu`) using the access token. Observe that the API returns `403 Forbidden` with `{ code: 'PASSWORD_CHANGE_REQUIRED' }`.
3. In the browser, observe the automatic redirect to `/set-password`.
4. Enter and confirm a new password (min. 8 characters).
5. Upon submission, the backend updates the password hash, resets `mustChangePassword` to `false`, and returns a new access token. The user is redirected to their dashboard and all normal routes become accessible.

### 3 Likely Interview Questions & Answers
1. **Q: Why include `mustChangePassword` in the JWT access token instead of checking the database on every request?**
   *A:* Querying the database on every single API request adds substantial I/O overhead. Embedding `mustChangePassword` inside the signed, tamper-proof JWT allows fast, stateless authorization checks. When the password is changed, a new JWT is minted and returned.
2. **Q: Why must `GET/PUT /api/users/profile` and `POST /api/auth/logout`, `POST /api/auth/refresh` be exempted?**
   *A:* Without these exemptions, the user would enter an unrecoverable deadlock: they could not view or update their profile to change the password, nor could they refresh their session or log out.
3. **Q: How does the frontend handle token synchronization when a new token is re-issued from a profile update?**
   *A:* The profile update endpoint returns `{ accessToken, user, ... }`. The frontend client saves the new access token to localStorage and clears the cached API state, ensuring all subsequent requests carry the updated claims without requiring a relogin.
