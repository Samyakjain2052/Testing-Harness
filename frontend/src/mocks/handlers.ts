import { http, HttpResponse, delay } from 'msw';
import {
  mockUser,
  applications,
  environments,
  testScripts,
  testExecutions,
  testResults,
  scriptContents,
  nextId,
  type Application,
  type Environment,
  type TestScript,
  type TestExecution,
} from './data';

const ok = (data: unknown, meta?: unknown) =>
  HttpResponse.json({ success: true, data, ...(meta ? { meta } : {}) });

const paginate = <T>(items: T[], page = 1, limit = 20) => ({
  data: items.slice((page - 1) * limit, page * limit),
  meta: { total: items.length, page, limit, totalPages: Math.ceil(items.length / limit) },
});

// Simulate network latency
const lat = () => delay(Math.random() * 200 + 80);

export const handlers = [
  // ─── Auth ──────────────────────────────────────────────────────────────────
  http.post('/api/v1/auth/login', async () => {
    await lat();
    return HttpResponse.json({
      success: true,
      data: {
        token: 'mock-jwt-token-for-dev',
        user: mockUser,
      },
    });
  }),

  http.get('/api/v1/auth/me', async () => {
    await lat();
    return ok(mockUser);
  }),

  // ─── Applications ──────────────────────────────────────────────────────────
  http.get('/api/v1/applications', async ({ request }) => {
    await lat();
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 20);

    const filtered = applications.filter(
      (a) => !a.is_archived && (!search || a.name.toLowerCase().includes(search)),
    );
    const { data, meta } = paginate(filtered, page, limit);
    return HttpResponse.json({ success: true, data, meta });
  }),

  http.get('/api/v1/applications/:id', async ({ params }) => {
    await lat();
    const app = applications.find((a) => a.id === params.id);
    if (!app) return HttpResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return ok(app);
  }),

  http.post('/api/v1/applications', async ({ request }) => {
    await lat();
    const body = (await request.json()) as { name: string; description?: string };
    const app: Application = {
      id: nextId('app'),
      name: body.name,
      description: body.description ?? null,
      created_by: mockUser.id,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    applications.push(app);
    return ok(app);
  }),

  http.put('/api/v1/applications/:id', async ({ params, request }) => {
    await lat();
    const idx = applications.findIndex((a) => a.id === params.id);
    if (idx === -1) return HttpResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    const body = (await request.json()) as Partial<Application>;
    applications[idx] = { ...applications[idx], ...body, updated_at: new Date().toISOString() };
    return ok(applications[idx]);
  }),

  http.delete('/api/v1/applications/:id', async ({ params }) => {
    await lat();
    const idx = applications.findIndex((a) => a.id === params.id);
    if (idx !== -1) applications[idx].is_archived = true;
    return new HttpResponse(null, { status: 204 });
  }),

  // ─── Environments ──────────────────────────────────────────────────────────
  http.get('/api/v1/applications/:appId/environments', async ({ params }) => {
    await lat();
    const envs = environments.filter((e) => e.app_id === params.appId);
    return ok(envs);
  }),

  http.post('/api/v1/applications/:appId/environments', async ({ params, request }) => {
    await lat();
    const body = (await request.json()) as { name: string; base_url: string; variables?: Record<string, string> };
    const env: Environment = {
      id: nextId('env'),
      app_id: params.appId as string,
      name: body.name,
      base_url: body.base_url,
      is_active: true,
      variables: body.variables ?? {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    environments.push(env);
    return ok(env);
  }),

  http.put('/api/v1/environments/:id', async ({ params, request }) => {
    await lat();
    const idx = environments.findIndex((e) => e.id === params.id);
    if (idx === -1) return HttpResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    const body = (await request.json()) as Partial<Environment>;
    environments[idx] = { ...environments[idx], ...body, updated_at: new Date().toISOString() };
    return ok(environments[idx]);
  }),

  http.delete('/api/v1/environments/:id', async ({ params }) => {
    await lat();
    const idx = environments.findIndex((e) => e.id === params.id);
    if (idx !== -1) environments.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ─── Test Scripts ──────────────────────────────────────────────────────────
  http.get('/api/v1/applications/:appId/scripts', async ({ params, request }) => {
    await lat();
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 20);

    const filtered = testScripts.filter(
      (s) =>
        s.app_id === params.appId &&
        !s.is_archived &&
        (!search || s.name.toLowerCase().includes(search)),
    );
    const { data, meta } = paginate(filtered, page, limit);
    return HttpResponse.json({ success: true, data, meta });
  }),

  http.get('/api/v1/scripts/:id', async ({ params }) => {
    await lat();
    const script = testScripts.find((s) => s.id === params.id);
    if (!script) return HttpResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return ok(script);
  }),

  http.get('/api/v1/scripts/:id/content', async ({ params }) => {
    await lat();
    const content = scriptContents[params.id as string] ?? `import { test, expect } from '@playwright/test';\n\ntest('placeholder', async ({ page }) => {\n  // TODO: implement test\n});\n`;
    return new HttpResponse(content, {
      headers: { 'Content-Type': 'text/typescript' },
    });
  }),

  http.post('/api/v1/applications/:appId/scripts', async ({ params }) => {
    // File upload – return a mock script
    await lat();
    const script: TestScript = {
      id: nextId('scr'),
      app_id: params.appId as string,
      name: 'Uploaded Script',
      description: null,
      blob_path: `scripts/${params.appId}/uploaded-script.spec.ts`,
      file_size_bytes: 1024,
      tags: [],
      is_archived: false,
      created_by: mockUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    testScripts.push(script);
    return ok(script);
  }),

  http.put('/api/v1/scripts/:id', async ({ params, request }) => {
    await lat();
    const idx = testScripts.findIndex((s) => s.id === params.id);
    if (idx === -1) return HttpResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    const body = (await request.json()) as Partial<TestScript>;
    testScripts[idx] = { ...testScripts[idx], ...body, updated_at: new Date().toISOString() };
    return ok(testScripts[idx]);
  }),

  http.delete('/api/v1/scripts/:id', async ({ params }) => {
    await lat();
    const idx = testScripts.findIndex((s) => s.id === params.id);
    if (idx !== -1) testScripts[idx].is_archived = true;
    return new HttpResponse(null, { status: 204 });
  }),

  // ─── Test Executions ───────────────────────────────────────────────────────
  http.post('/api/v1/scripts/:scriptId/execute', async ({ params, request }) => {
    await lat();
    const body = (await request.json()) as { environment_id: string };
    const execution: TestExecution = {
      id: nextId('exe'),
      script_id: params.scriptId as string,
      environment_id: body.environment_id,
      status: 'queued',
      queue_job_id: nextId('job'),
      triggered_by: mockUser.id,
      started_at: null,
      completed_at: null,
      duration_ms: null,
      error_message: null,
      retry_count: 0,
      metadata: {},
      created_at: new Date().toISOString(),
    };
    testExecutions.unshift(execution);

    // Simulate progression: queued → running → passed after a few seconds
    setTimeout(() => { execution.status = 'running'; execution.started_at = new Date().toISOString(); }, 1500);
    setTimeout(() => {
      execution.status = 'passed';
      execution.completed_at = new Date().toISOString();
      execution.duration_ms = 42000;
    }, 6000);

    return ok(execution);
  }),

  http.get('/api/v1/executions/:id', async ({ params }) => {
    await lat();
    const exe = testExecutions.find((e) => e.id === params.id);
    if (!exe) return HttpResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return ok(exe);
  }),

  http.get('/api/v1/executions/:id/results', async ({ params }) => {
    await lat();
    const results = testResults.filter((r) => r.execution_id === params.id);
    return ok(results);
  }),

  http.post('/api/v1/executions/:id/cancel', async ({ params }) => {
    await lat();
    const exe = testExecutions.find((e) => e.id === params.id);
    if (exe) { exe.status = 'cancelled'; exe.completed_at = new Date().toISOString(); }
    return ok(exe ?? {});
  }),

  http.get('/api/v1/applications/:appId/executions', async ({ params, request }) => {
    await lat();
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 20);

    // Collect script IDs for this app
    const scriptIds = testScripts.filter((s) => s.app_id === params.appId).map((s) => s.id);
    let filtered = testExecutions.filter((e) => scriptIds.includes(e.script_id));
    if (statusFilter) filtered = filtered.filter((e) => e.status === statusFilter);

    const { data, meta } = paginate(filtered, page, limit);
    return HttpResponse.json({ success: true, data, meta });
  }),

  http.get('/api/v1/scripts/:scriptId/executions', async ({ params, request }) => {
    await lat();
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 20);

    const filtered = testExecutions.filter((e) => e.script_id === params.scriptId);
    const { data, meta } = paginate(filtered, page, limit);
    return HttpResponse.json({ success: true, data, meta });
  }),

  // ─── Dashboard Stats ───────────────────────────────────────────────────────
  http.get('/api/v1/dashboard/stats', async () => {
    await lat();
    const total = testExecutions.length;
    const passed = testExecutions.filter((e) => e.status === 'passed').length;
    return ok({
      totalApps: applications.filter((a) => !a.is_archived).length,
      totalScripts: testScripts.filter((s) => !s.is_archived).length,
      totalExecutions: total,
      passRate: total ? Math.round((passed / total) * 100) : 0,
      recentExecutions: testExecutions.slice(0, 5).length,
    });
  }),

  // ─── Recordings ────────────────────────────────────────────────────────────
  http.post('/api/v1/applications/:appId/recordings/start', async ({ params, request }) => {
    await lat();
    const body = (await request.json()) as { target_url: string; name: string };
    return ok({
      sessionId: nextId('sess'),
      appId: params.appId,
      targetUrl: body.target_url,
      status: 'recording',
      startedAt: new Date().toISOString(),
    });
  }),

  http.get('/api/v1/recordings/:sessionId/status', async ({ params }) => {
    await lat();
    return ok({
      sessionId: params.sessionId,
      status: 'recording',
      startedAt: new Date().toISOString(),
    });
  }),

  http.post('/api/v1/recordings/:sessionId/save', async ({ request }) => {
    await lat();
    const body = (await request.json()) as { name: string };
    return ok({ id: nextId('scr'), name: body.name, message: 'Recording saved' });
  }),
];
