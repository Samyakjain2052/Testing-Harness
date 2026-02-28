# Testing Harness — Complete Feature & API Documentation

> **Written in plain English.** This document explains every feature of the platform, every button a user can click, and every backend function that gets called behind the scenes. Perfect for onboarding new developers or understanding how the system fits together.

---

## Table of Contents

1. [How the System Works (Big Picture)](#1-how-the-system-works-big-picture)
2. [Project Structure — Files You Need to Know](#2-project-structure--files-you-need-to-know)
3. [Authentication](#3-authentication)
4. [Applications](#4-applications)
5. [Environments](#5-environments)
6. [Test Scripts](#6-test-scripts)
7. [Recording a Test](#7-recording-a-test)
8. [Running a Test](#8-running-a-test)
9. [Execution Report Page](#9-execution-report-page)
10. [Dashboard Stats](#10-dashboard-stats)
11. [Complete API Reference](#11-complete-api-reference)
12. [How Data Flows End-to-End](#12-how-data-flows-end-to-end)

---

## 1. How the System Works (Big Picture)

The Testing Harness is a **web-based automated testing platform**. Here's what it does in one paragraph:

You open the app in your browser, create an **Application** (e.g. "My Website"), add one or more **Environments** (e.g. "Production" → `https://mysite.com`), then **record a test** by clicking through your website in a real Chromium browser — Playwright captures every click and keystroke as TypeScript code. That recorded script is saved to Azure Blob Storage. You can then **run the script** at any time against any environment. A background worker picks up the job, executes the Playwright test, captures screenshots and logs, and stores the results in the database. You view the pass/fail report in the browser.

```
User's Browser (React)
       │
       ▼
Backend API (Express on port 3007)
       │           │
       ▼           ▼
 PostgreSQL      Azure Blob Storage
                 (scripts, screenshots, logs, traces)
       │
       ▼
Redis Queue (BullMQ)
       │
       ▼
Automation Worker (Playwright test runner)
```

---

## 2. Project Structure — Files You Need to Know

```
Testing-Harness/
│
├── frontend/src/
│   ├── pages/                    ← What the user sees
│   │   ├── LoginPage.tsx         ← Login / Register
│   │   ├── DashboardPage.tsx     ← Home page with stats + app list
│   │   ├── AppWorkspacePage.tsx  ← Scripts + execution history for one app
│   │   ├── ExecutionDetailPage.tsx ← Full test report (results, logs, screenshots)
│   │   └── TestDetailPage.tsx    ← Script viewer + run history
│   │
│   ├── hooks/                    ← React Query data-fetching wrappers
│   │   ├── useApplications.ts
│   │   ├── useEnvironments.ts
│   │   ├── useTestScripts.ts
│   │   └── useTestExecutions.ts
│   │
│   └── api/                      ← Raw HTTP calls to the backend
│       ├── client.ts             ← Axios instance with JWT auth header
│       ├── applications.api.ts
│       ├── environments.api.ts
│       ├── test-scripts.api.ts
│       ├── test-executions.api.ts
│       └── recordings.api.ts
│
├── backend/src/
│   ├── routes/                   ← URL → controller mapping
│   ├── controllers/              ← Request handlers (what to do with the request)
│   ├── services/                 ← Business logic
│   ├── repositories/             ← Database queries
│   └── middleware/               ← Auth, validation, error handling
│
├── automation/src/               ← The test runner worker process
│   ├── index.ts                  ← Starts BullMQ worker
│   └── executor/
│       ├── test-runner.ts        ← Orchestrates the full test execution
│       ├── script-loader.ts      ← Downloads script from Azure Blob
│       ├── result-collector.ts   ← Parses Playwright JSON report
│       └── artifact-uploader.ts ← Uploads screenshots, logs, traces to Azure
│
└── shared/src/                   ← Types and validation shared by all packages
    ├── types/                    ← TypeScript interfaces
    └── utils/validation.ts       ← Zod schemas for request validation
```

---

## 3. Authentication

### What the user sees
The **Login Page** (`LoginPage.tsx`) has two modes:
- **Sign In** — enter email + password
- **Register** — enter name, email, password

### What happens behind the scenes

| User Action | Frontend File | API Call | Backend Function | What It Does |
|---|---|---|---|---|
| Click **"Sign In"** button | `LoginPage.tsx` | `POST /api/v1/auth/login` | `login()` in `auth.controller.ts` | Checks email/password against database, returns a JWT token |
| Click **"Register"** button | `LoginPage.tsx` | `POST /api/v1/auth/register` | `register()` in `auth.controller.ts` | Creates a new user account in the database, returns a JWT token |
| App loads (auto) | `useAuthStore` (Zustand) | `GET /api/v1/auth/me` | `getMe()` in `auth.controller.ts` | Verifies the stored token is still valid and loads the user's name/email |

> **The JWT token** is stored in `localStorage` and automatically added to every API request by `frontend/src/api/client.ts`.

---

## 4. Applications

An **Application** represents a website or web app you want to test (e.g. "E-commerce Site", "Admin Portal").

### What the user sees
On the **Dashboard Page** (`DashboardPage.tsx`):
- A grid of application cards
- A **"New Application"** button at the top right

### What happens behind the scenes

| User Action | Frontend File | Hook | API Call | Backend Function | What It Does |
|---|---|---|---|---|---|
| Dashboard loads | `DashboardPage.tsx` | `useApplications()` in `useApplications.ts` | `GET /api/v1/applications` | `listApplications()` in `applications.controller.ts` | Fetches all applications from the database |
| Click **"New Application"** | `DashboardPage.tsx` | `useCreateApplication()` | `POST /api/v1/applications` | `createApplication()` | Creates a new application row in the database |
| Click an application card | `DashboardPage.tsx` | — | Navigation only | — | Navigates to `AppWorkspacePage` for that app |
| App workspace loads | `AppWorkspacePage.tsx` | `useApplication()` | `GET /api/v1/applications/:id` | `getApplication()` | Loads the name and description of the specific app |

---

## 5. Environments

An **Environment** is a URL where the app is running (e.g. "Production" → `https://mysite.com`, "Staging" → `https://staging.mysite.com`). Every test run needs to be aimed at a specific environment.

### What the user sees
On **App Workspace Page** (`AppWorkspacePage.tsx`):
- A **dropdown selector** in the top-right to pick which environment to run against
- A **gear icon (⚙)** button next to the dropdown that opens the "Add Environment" dialog

### What happens behind the scenes

| User Action | Frontend File | Hook | API Call | Backend Function | What It Does |
|---|---|---|---|---|---|
| Page loads (auto) | `AppWorkspacePage.tsx` | `useEnvironments()` in `useEnvironments.ts` | `GET /api/v1/applications/:appId/environments` | `listEnvironments()` in `environments.controller.ts` | Loads all environments for this app into the dropdown |
| Click **gear icon ⚙** → fill form → click **"Add"** | `AppWorkspacePage.tsx` → `EnvFormDialog` component | `useCreateEnvironment()` | `POST /api/v1/applications/:appId/environments` | `createEnvironment()` | Saves the new environment (name + base URL) to the database |

---

## 6. Test Scripts

A **Test Script** is a Playwright TypeScript file that describes a test (e.g. "click Sign In, fill in email, click Submit"). Scripts are stored as files in **Azure Blob Storage** and their metadata (name, tags) are stored in **PostgreSQL**.

### What the user sees
On **App Workspace Page** → **"Test Scripts" tab**:
- A table listing all scripts with their name, tags, and creation date
- **"Run"** and **"Watch"** buttons on each row
- **"Record New Test"** button

On **Script Detail Page** (`TestDetailPage.tsx`):
- The script source code
- Recent execution history for that script

### What happens behind the scenes

| User Action | Frontend File | Hook | API Call | Backend Function | What It Does |
|---|---|---|---|---|---|
| Scripts tab loads | `AppWorkspacePage.tsx` | `useTestScripts()` in `useTestScripts.ts` | `GET /api/v1/applications/:appId/scripts` | `listScripts()` in `test-scripts.controller.ts` | Fetches list of all scripts for this app |
| Click script name link | `AppWorkspacePage.tsx` | — | Navigation only | — | Navigates to `TestDetailPage` for that script |
| Script detail page loads | `TestDetailPage.tsx` | `useTestScript()` | `GET /api/v1/scripts/:id` | `getScript()` | Loads script metadata (name, description, tags) |
| Code viewer opens | `TestDetailPage.tsx` | `useTestScriptContent()` | `GET /api/v1/scripts/:id/content` | `getScriptContent()` | Downloads the TypeScript source code from Azure Blob Storage and displays it |

---

## 7. Recording a Test

Recording uses **Playwright Codegen** — it opens a real Chromium browser and records every click/type/navigation you make into TypeScript code.

### What the user sees

Click **"Record New Test"** button → a dialog appears with 4 steps:

1. **Setup step** — Enter test name, optional description, target URL
2. **Recording step** — Playwright browser opens on your machine; you interact with the site; pulsing red dot shows it's recording
3. **"Done Recording"** button — stops the recording
4. **"Save Recording"** button → **saving step** → **success step**

### What happens behind the scenes

| User Action | Frontend File | API Call | Backend Function | What It Does |
|---|---|---|---|---|
| Click **"Start Recording"** | `AppWorkspacePage.tsx` → `RecordDialog` | `POST /api/v1/applications/:appId/recordings/start` | `startRecording()` in `recordings.controller.ts` | Spawns `playwright codegen <url>` as a child process on the server; returns a `sessionId` |
| While recording (auto-poll every 2s) | `RecordDialog` (useEffect) | `GET /api/v1/recordings/:sessionId/status` | `getRecordingStatus()` | Checks if the Playwright process is still running, completed, or errored |
| Click **"Done Recording"** | `RecordDialog` → `handleStop()` | `POST /api/v1/recordings/:sessionId/stop` | `stopRecording()` | Sends SIGTERM to the Playwright process to close the browser gracefully |
| Click **"Save Recording"** | `RecordDialog` → `handleSave()` | `POST /api/v1/recordings/:sessionId/save` | `saveRecording()` | Reads the generated TypeScript, parameterizes all hardcoded URLs (`https://mysite.com/path` → `${BASE_URL}/path`), uploads the script to Azure Blob, saves metadata to PostgreSQL |

---

## 8. Running a Test

There are two ways to run a test:

- **Run** (headless) — Chromium runs invisibly in the background; fastest mode
- **Watch** (headed + slow motion) — Chromium opens as a visible window on your screen; every action is slowed down by 500ms so you can watch what's happening

### What the user sees

On **App Workspace Page** → scripts table:
- **▶ Run** button (blue) — headless execution
- **👁 Watch** button (white/outline) — headed execution with slowMo

On **Execution Detail Page** (top right):
- **👁 Watch** button — re-run this execution in headed mode
- **↺ Re-run** button — re-run headless

### What happens behind the scenes

| User Action | Frontend File | Hook | API Call | Backend Controller | What It Does |
|---|---|---|---|---|---|
| Click **"▶ Run"** | `AppWorkspacePage.tsx` → `handleRunTest()` | `useTriggerExecution()` in `useTestExecutions.ts` | `POST /api/v1/scripts/:scriptId/execute` | `triggerExecution()` in `test-executions.controller.ts` | Creates an execution record in the DB (status: `queued`), pushes a job onto the Redis/BullMQ queue with default options: `headless: true, slowMo: 0` |
| Click **"👁 Watch"** | `AppWorkspacePage.tsx` → `handleWatchTest()` | `useTriggerExecution()` | `POST /api/v1/scripts/:scriptId/execute` | `triggerExecution()` | Same as Run, but sends extra options: `headless: false, slowMo: 500, captureScreenshots: 'always', captureTrace: 'always'` |
| After job is queued (auto) | **Automation Worker** (`automation/src/index.ts`) | — | Internal only | — | Worker picks up the job from Redis and runs the following steps automatically |

### What the Automation Worker does (automatically, no user action needed)

This all happens inside `automation/src/executor/test-runner.ts`:

```
Step 1  Update DB status → "running"
Step 2  Create a temporary folder (e.g. C:\Temp\testing-harness\executions\<id>\)
Step 3  Download the script from Azure Blob Storage → saves as test.spec.ts
Step 4  Generate a playwright.config.ts file with the correct baseURL, headless, slowMo, timeout settings
Step 5  Spawn: node playwright/cli.js test --config playwright.config.ts
Step 6  Upload stdout + stderr logs to Azure Blob Storage
Step 7  Parse the Playwright JSON report (report.json) to extract pass/fail per step
Step 8  Upload screenshots, trace.zip, report.json to Azure Blob Storage
Step 9  Save step results to PostgreSQL (test_results table)
Step 10 Update DB status → "passed" or "failed"
Step 11 Clean up the temporary folder
```

---

## 9. Execution Report Page

When you click an execution ID anywhere in the UI, you land on the **Execution Detail Page** (`ExecutionDetailPage.tsx`).

### What the user sees

| Section | Description |
|---|---|
| **Header card** | Status badge (Passed/Failed/Error), execution ID, script name, environment, timestamps, duration |
| **Error banner** | If the whole execution crashed, shows the error message here |
| **Summary stats row** | 4 cards: Total Steps / Passed / Failed / Skipped |
| **Progress bar** | Color-coded bar: green = passed, red = failed, orange = error, gray = skipped |
| **Step timeline** | Each test step as a row with: number, icon, name, duration, status badge. Failed steps auto-expand. Click any step to expand/collapse |
| **Step details** | When expanded: error message (ANSI codes cleaned), expected vs actual diff, screenshot |
| **Execution metadata sidebar** | Environment name, base URL, script link, retry count, browser, headless, timeout, screenshots mode, trace mode, Queue Job ID |
| **Execution Logs** | Collapsible section at the bottom; tabs for stdout / stderr; dark terminal style |
| **Download Playwright Trace** | Link to download the `.zip` trace file for use with `npx playwright show-trace` |

### What happens behind the scenes

| Auto-loaded data | Hook | API Call | Backend Function | What It Does |
|---|---|---|---|---|
| Execution header | `useTestExecution()` | `GET /api/v1/executions/:id` | `getExecution()` | Returns execution + joined script name, environment name, app_id |
| Step results | `useExecutionResults()` | `GET /api/v1/executions/:id/results` | `getExecutionResults()` | Returns all rows from `test_results` table for this execution |
| Auto-polling (while running) | Both hooks above | Same endpoints | Same | Re-fetches every 3 seconds while status is `queued` or `running` |

| User-triggered data | Trigger | API Call | Backend Function | What It Does |
|---|---|---|---|---|
| stdout logs | Click **"Execution Logs"** → **stdout** tab | `GET /api/v1/executions/:id/logs?type=stdout` | `getExecutionLogs()` | Downloads `stdout.log` from Azure Blob Storage |
| stderr logs | Click **stderr** tab | `GET /api/v1/executions/:id/logs?type=stderr` | `getExecutionLogs()` | Downloads `stderr.log` from Azure Blob Storage |
| Screenshot | Auto-loads when step is expanded | `GET /api/v1/executions/:id/screenshot?path=<blobPath>` | `getScreenshot()` | Downloads PNG from Azure Blob, streams it back as `image/png` (authenticated via JWT) |
| Trace file | Click **"Download Playwright Trace"** | `GET /api/v1/executions/:id/trace` | `getTrace()` | Downloads `trace.zip` from Azure Blob as an attachment |
| Cancel button | Click **"Cancel"** (only visible while running/queued) | `POST /api/v1/executions/:id/cancel` | `cancelExecution()` | Sets execution status to `cancelled` in the database |
| Re-run | Click **"↺ Re-run"** | `POST /api/v1/scripts/:scriptId/execute` | `triggerExecution()` | Creates a new execution (headless mode) |
| Watch | Click **"👁 Watch"** | `POST /api/v1/scripts/:scriptId/execute` | `triggerExecution()` | Creates a new execution (headed + slowMo mode) |

---

## 10. Dashboard Stats

The **Dashboard Page** (`DashboardPage.tsx`) shows 4 stat cards at the top:

| Stat Card | Data Source |
|---|---|
| Total Applications | Count of non-archived rows in `applications` table |
| Total Scripts | Count of non-archived rows in `test_scripts` table |
| Total Executions | Count of all rows in `test_executions` table |
| Pass Rate | Percentage of executions with status = `passed` |

**How it loads:**
- `useDashboardStats()` hook in `useTestExecutions.ts`
- Calls `GET /api/v1/dashboard/stats`
- Handled by `getDashboardStats()` in `test-executions.controller.ts`

---

## 11. Complete API Reference

All endpoints are prefixed with `/api/v1/`. All endpoints except `/auth/login` and `/auth/register` require a JWT token in the `Authorization: Bearer <token>` header.

### Auth Endpoints — `backend/src/routes/auth.routes.ts`

| Method | Path | Controller Function | Description |
|---|---|---|---|
| POST | `/auth/login` | `login()` | Sign in, returns JWT |
| POST | `/auth/register` | `register()` | Create account, returns JWT |
| GET | `/auth/me` | `getMe()` | Returns current user info |

### Application Endpoints — `backend/src/routes/applications.routes.ts`

| Method | Path | Controller Function | Description |
|---|---|---|---|
| GET | `/applications` | `listApplications()` | List all apps (paginated, searchable) |
| POST | `/applications` | `createApplication()` | Create a new app |
| GET | `/applications/:id` | `getApplication()` | Get one app's details |
| PUT | `/applications/:id` | `updateApplication()` | Update name/description |
| DELETE | `/applications/:id` | `archiveApplication()` | Soft-delete the app |

### Environment Endpoints — `backend/src/routes/environments.routes.ts`

| Method | Path | Controller Function | Description |
|---|---|---|---|
| GET | `/applications/:appId/environments` | `listEnvironments()` | List environments for an app |
| POST | `/applications/:appId/environments` | `createEnvironment()` | Add a new environment |
| GET | `/environments/:id` | `getEnvironment()` | Get one environment |
| PUT | `/environments/:id` | `updateEnvironment()` | Update name, URL, or variables |
| DELETE | `/environments/:id` | `deleteEnvironment()` | Remove an environment |

### Script Endpoints — `backend/src/routes/test-scripts.routes.ts`

| Method | Path | Controller Function | Description |
|---|---|---|---|
| GET | `/applications/:appId/scripts` | `listScripts()` | List scripts for an app |
| POST | `/applications/:appId/scripts` | `uploadScript()` | Create a new script (called during save recording) |
| GET | `/scripts/:id` | `getScript()` | Get script metadata |
| GET | `/scripts/:id/content` | `getScriptContent()` | Get the TypeScript source code |
| PUT | `/scripts/:id` | `updateScript()` | Update name/description/tags |
| DELETE | `/scripts/:id` | `archiveScript()` | Soft-delete the script |

### Recording Endpoints — `backend/src/routes/recordings.routes.ts`

| Method | Path | Controller Function | Description |
|---|---|---|---|
| POST | `/applications/:appId/recordings/start` | `startRecording()` | Launch Playwright Codegen browser |
| GET | `/recordings/:sessionId/status` | `getRecordingStatus()` | Check if recording is still running |
| POST | `/recordings/:sessionId/stop` | `stopRecording()` | Stop the recording browser |
| POST | `/recordings/:sessionId/save` | `saveRecording()` | Parameterize URLs and save script to Azure |

### Execution Endpoints — `backend/src/routes/test-executions.routes.ts`

| Method | Path | Controller Function | Description |
|---|---|---|---|
| GET | `/dashboard/stats` | `getDashboardStats()` | Stats for the dashboard cards |
| POST | `/scripts/:scriptId/execute` | `triggerExecution()` | Queue a new test run |
| GET | `/executions/:id` | `getExecution()` | Get execution details (with script + env names joined) |
| GET | `/executions/:id/results` | `getExecutionResults()` | Get all step results |
| GET | `/executions/:id/logs?type=stdout\|stderr` | `getExecutionLogs()` | Get log text from Azure Blob |
| GET | `/executions/:id/screenshot?path=<blob>` | `getScreenshot()` | Stream a screenshot PNG |
| GET | `/executions/:id/trace` | `getTrace()` | Download trace.zip |
| POST | `/executions/:id/cancel` | `cancelExecution()` | Cancel a queued/running execution |
| GET | `/applications/:appId/executions` | `listAppExecutions()` | List all executions for an app |
| GET | `/scripts/:scriptId/executions` | `listScriptExecutions()` | List executions for one script |

---

## 12. How Data Flows End-to-End

### Example: User clicks "▶ Run" on a script

```
1. USER clicks "Run" button
   File: frontend/src/pages/AppWorkspacePage.tsx → handleRunTest()

2. FRONTEND calls hook
   File: frontend/src/hooks/useTestExecutions.ts → useTriggerExecution()

3. FRONTEND makes HTTP request
   File: frontend/src/api/test-executions.api.ts → trigger()
   → POST /api/v1/scripts/:scriptId/execute
   → Body: { environment_id: "...", options: { headless: true } }

4. BACKEND validates the request
   File: backend/src/middleware/validate.ts + shared/src/utils/validation.ts
   → Checks environment_id is a valid UUID, options are within allowed values

5. BACKEND controller handles it
   File: backend/src/controllers/test-executions.controller.ts → triggerExecution()

6. BACKEND service creates the execution record
   File: backend/src/services/test-execution.service.ts → trigger()
   → Validates script exists + environment is active
   → Inserts a row in test_executions table with status="queued"

7. BACKEND adds job to queue
   File: backend/src/services/queue.service.ts → enqueueExecution()
   → Pushes a job to Redis via BullMQ with all execution options

8. BACKEND returns 202 Accepted
   → Returns the execution record including the new execution ID

9. FRONTEND navigates to execution detail
   → React Query invalidates the executions list cache
   → UI shows the new execution as "Queued"

10. AUTOMATION WORKER picks up the job
    File: automation/src/index.ts → BullMQ worker
    → Receives the TestExecutionJobData from Redis

11. WORKER runs the test
    File: automation/src/executor/test-runner.ts → execute()
    → Downloads script → generates playwright.config.ts
    → Spawns: node cli.js test --config playwright.config.ts
    → Playwright runs the test steps

12. WORKER uploads results
    File: automation/src/executor/artifact-uploader.ts
    → Screenshots → Azure Blob Storage
    → Logs (stdout/stderr) → Azure Blob Storage
    → trace.zip → Azure Blob Storage

13. WORKER parses the report
    File: automation/src/executor/result-collector.ts → parseReport()
    → Reads report.json output from Playwright
    → Maps each test to a step with status/duration/error

14. WORKER saves step results to DB
    File: automation/src/executor/test-runner.ts → storeResults()
    → INSERT into test_results table (one row per step)

15. WORKER updates execution status
    → UPDATE test_executions SET status='passed'/'failed'

16. FRONTEND polls and updates
    File: frontend/src/hooks/useTestExecutions.ts → useTestExecution()
    → Polls GET /executions/:id every 3 seconds while status is running/queued
    → Once completed, shows the full report with steps, screenshots, logs
```

---

### Example: User clicks "👁 Watch" — what's different

Steps 1–9 are the same except step 3 sends extra options:
```json
{
  "environment_id": "...",
  "options": {
    "headless": false,
    "slowMo": 500,
    "captureScreenshots": "always",
    "captureTrace": "always"
  }
}
```

At step 11, the generated `playwright.config.ts` includes:
```typescript
use: {
  headless: false,   // Chromium window opens visibly
  slowMo: 500,       // 500ms pause between every action
  screenshot: 'on',  // Screenshot after every step
  trace: 'on',       // Full trace recorded
}
```

The result: **a Chromium browser window opens on the machine running the automation worker**, and you can watch every click and keystroke happen in slow motion.

---

## Key Concepts Summary

| Term | What It Is | Stored In |
|---|---|---|
| **Application** | A website/app you're testing | PostgreSQL `applications` table |
| **Environment** | A URL for the app (prod/staging/dev) | PostgreSQL `environments` table |
| **Test Script** | Playwright TypeScript file | Azure Blob Storage (metadata in PostgreSQL) |
| **Recording Session** | An active Playwright Codegen session | In-memory on the backend server |
| **Execution** | One run of a test script | PostgreSQL `test_executions` table |
| **Step Result** | Pass/fail of one test step within an execution | PostgreSQL `test_results` table |
| **Artifact** | Screenshot, trace.zip, log file | Azure Blob Storage |
| **Queue Job** | The task sent to the automation worker | Redis (via BullMQ) |

---

*Documentation generated for Testing Harness v1.0 · February 2026*
