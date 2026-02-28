// ---------------------------------------------------------------------------
// In-memory mock data store – mutated by handler operations so creates /
// updates / deletes persist within a single browser session.
// ---------------------------------------------------------------------------

export type Application = {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type Environment = {
  id: string;
  app_id: string;
  name: string;
  base_url: string;
  is_active: boolean;
  variables: Record<string, string>;
  created_at: string;
  updated_at: string;
};

export type TestScript = {
  id: string;
  app_id: string;
  name: string;
  description: string | null;
  blob_path: string;
  file_size_bytes: number;
  tags: string[];
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type TestExecution = {
  id: string;
  script_id: string;
  environment_id: string;
  status: 'queued' | 'running' | 'passed' | 'failed' | 'error' | 'cancelled';
  queue_job_id: string | null;
  triggered_by: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  retry_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type TestResult = {
  id: string;
  execution_id: string;
  step_number: number;
  step_name: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration_ms: number | null;
  screenshot_blob_path: string | null;
  error_details: string | null;
  expected_value: string | null;
  actual_value: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const USER_ID = 'u-0001';
const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export const mockUser = {
  id: USER_ID,
  email: 'qa@company.internal',
  name: 'QA Engineer',
  role: 'admin',
};

// Applications ---------------------------------------------------------------
export const applications: Application[] = [
  {
    id: 'app-001',
    name: 'E-Commerce Portal',
    description: 'Customer-facing storefront – product catalogue, cart & checkout',
    created_by: USER_ID,
    is_archived: false,
    created_at: ago(30),
    updated_at: ago(2),
  },
  {
    id: 'app-002',
    name: 'Admin Dashboard',
    description: 'Internal management console – users, orders, analytics',
    created_by: USER_ID,
    is_archived: false,
    created_at: ago(25),
    updated_at: ago(5),
  },
  {
    id: 'app-003',
    name: 'Mobile API Gateway',
    description: 'REST gateway consumed by iOS / Android clients',
    created_by: USER_ID,
    is_archived: false,
    created_at: ago(15),
    updated_at: ago(1),
  },
];

// Environments ---------------------------------------------------------------
export const environments: Environment[] = [
  // E-Commerce Portal
  { id: 'env-001', app_id: 'app-001', name: 'Development', base_url: 'https://dev.shop.example.com', is_active: true, variables: { TIMEOUT: '5000' }, created_at: ago(29), updated_at: ago(29) },
  { id: 'env-002', app_id: 'app-001', name: 'UAT',         base_url: 'https://uat.shop.example.com', is_active: true, variables: { TIMEOUT: '8000' }, created_at: ago(29), updated_at: ago(10) },
  { id: 'env-003', app_id: 'app-001', name: 'Production',  base_url: 'https://shop.example.com',     is_active: true, variables: { TIMEOUT: '10000' }, created_at: ago(28), updated_at: ago(3) },
  // Admin Dashboard
  { id: 'env-004', app_id: 'app-002', name: 'Development', base_url: 'https://dev.admin.example.com', is_active: true, variables: {}, created_at: ago(24), updated_at: ago(24) },
  { id: 'env-005', app_id: 'app-002', name: 'UAT',         base_url: 'https://uat.admin.example.com', is_active: true, variables: {}, created_at: ago(24), updated_at: ago(12) },
  { id: 'env-006', app_id: 'app-002', name: 'Production',  base_url: 'https://admin.example.com',     is_active: true, variables: {}, created_at: ago(23), updated_at: ago(4) },
  // Mobile API
  { id: 'env-007', app_id: 'app-003', name: 'Development', base_url: 'https://dev-api.example.com',  is_active: true, variables: {}, created_at: ago(14), updated_at: ago(14) },
  { id: 'env-008', app_id: 'app-003', name: 'Staging',     base_url: 'https://staging-api.example.com', is_active: true, variables: {}, created_at: ago(14), updated_at: ago(7) },
  { id: 'env-009', app_id: 'app-003', name: 'Production',  base_url: 'https://api.example.com',      is_active: true, variables: {}, created_at: ago(13), updated_at: ago(2) },
];

// Test scripts ----------------------------------------------------------------
export const testScripts: TestScript[] = [
  {
    id: 'scr-001', app_id: 'app-001', name: 'Login Flow',
    description: 'Validates user login with valid and invalid credentials',
    blob_path: 'scripts/app-001/login-flow.spec.ts', file_size_bytes: 1842,
    tags: ['auth', 'smoke'], is_archived: false, created_by: USER_ID,
    created_at: ago(20), updated_at: ago(1),
  },
  {
    id: 'scr-002', app_id: 'app-001', name: 'Product Search',
    description: 'Searches for a product and validates search results and filters',
    blob_path: 'scripts/app-001/product-search.spec.ts', file_size_bytes: 2310,
    tags: ['catalogue', 'search'], is_archived: false, created_by: USER_ID,
    created_at: ago(18), updated_at: ago(3),
  },
  {
    id: 'scr-003', app_id: 'app-001', name: 'Checkout Process',
    description: 'End-to-end checkout with guest user and credit card payment',
    blob_path: 'scripts/app-001/checkout.spec.ts', file_size_bytes: 4127,
    tags: ['checkout', 'payment', 'e2e'], is_archived: false, created_by: USER_ID,
    created_at: ago(15), updated_at: ago(2),
  },
  {
    id: 'scr-004', app_id: 'app-002', name: 'User Management',
    description: 'Create, edit and deactivate users via admin panel',
    blob_path: 'scripts/app-002/user-management.spec.ts', file_size_bytes: 3200,
    tags: ['admin', 'users'], is_archived: false, created_by: USER_ID,
    created_at: ago(12), updated_at: ago(5),
  },
  {
    id: 'scr-005', app_id: 'app-002', name: 'Reports Dashboard',
    description: 'Validate report generation and CSV export functionality',
    blob_path: 'scripts/app-002/reports.spec.ts', file_size_bytes: 2750,
    tags: ['reports', 'export'], is_archived: false, created_by: USER_ID,
    created_at: ago(10), updated_at: ago(4),
  },
  {
    id: 'scr-006', app_id: 'app-003', name: 'Health Check',
    description: 'Pings all health endpoints and verifies response codes',
    blob_path: 'scripts/app-003/health-check.spec.ts', file_size_bytes: 980,
    tags: ['smoke', 'api'], is_archived: false, created_by: USER_ID,
    created_at: ago(8), updated_at: ago(1),
  },
  {
    id: 'scr-007', app_id: 'app-003', name: 'Auth Token Refresh',
    description: 'Verifies JWT refresh flow returns a valid token',
    blob_path: 'scripts/app-003/auth-refresh.spec.ts', file_size_bytes: 1450,
    tags: ['auth', 'api'], is_archived: false, created_by: USER_ID,
    created_at: ago(6), updated_at: ago(1),
  },
];

// Test executions -------------------------------------------------------------
export const testExecutions: TestExecution[] = [
  {
    id: 'exe-001', script_id: 'scr-001', environment_id: 'env-002', status: 'passed',
    queue_job_id: 'job-1001', triggered_by: USER_ID,
    started_at: ago(1), completed_at: new Date(Date.now() - 86_400_000 + 45_000).toISOString(),
    duration_ms: 45000, error_message: null, retry_count: 0, metadata: {},
    created_at: ago(1),
  },
  {
    id: 'exe-002', script_id: 'scr-002', environment_id: 'env-002', status: 'failed',
    queue_job_id: 'job-1002', triggered_by: USER_ID,
    started_at: ago(1), completed_at: new Date(Date.now() - 86_400_000 + 62_000).toISOString(),
    duration_ms: 62000, error_message: 'Element not found: [data-testid="search-results"]', retry_count: 0, metadata: {},
    created_at: ago(1),
  },
  {
    id: 'exe-003', script_id: 'scr-003', environment_id: 'env-001', status: 'passed',
    queue_job_id: 'job-1003', triggered_by: USER_ID,
    started_at: ago(2), completed_at: new Date(Date.now() - 2 * 86_400_000 + 120_000).toISOString(),
    duration_ms: 120000, error_message: null, retry_count: 0, metadata: {},
    created_at: ago(2),
  },
  {
    id: 'exe-004', script_id: 'scr-001', environment_id: 'env-003', status: 'passed',
    queue_job_id: 'job-1004', triggered_by: USER_ID,
    started_at: ago(3), completed_at: new Date(Date.now() - 3 * 86_400_000 + 38_000).toISOString(),
    duration_ms: 38000, error_message: null, retry_count: 0, metadata: {},
    created_at: ago(3),
  },
  {
    id: 'exe-005', script_id: 'scr-004', environment_id: 'env-004', status: 'error',
    queue_job_id: 'job-1005', triggered_by: USER_ID,
    started_at: ago(2), completed_at: new Date(Date.now() - 2 * 86_400_000 + 5_000).toISOString(),
    duration_ms: 5000, error_message: 'Browser launch failed: chromium not found', retry_count: 2, metadata: {},
    created_at: ago(2),
  },
  {
    id: 'exe-006', script_id: 'scr-005', environment_id: 'env-005', status: 'passed',
    queue_job_id: 'job-1006', triggered_by: USER_ID,
    started_at: ago(4), completed_at: new Date(Date.now() - 4 * 86_400_000 + 88_000).toISOString(),
    duration_ms: 88000, error_message: null, retry_count: 0, metadata: {},
    created_at: ago(4),
  },
  {
    id: 'exe-007', script_id: 'scr-006', environment_id: 'env-008', status: 'passed',
    queue_job_id: 'job-1007', triggered_by: USER_ID,
    started_at: ago(1), completed_at: new Date(Date.now() - 86_400_000 + 8_000).toISOString(),
    duration_ms: 8000, error_message: null, retry_count: 0, metadata: {},
    created_at: ago(1),
  },
  {
    id: 'exe-008', script_id: 'scr-007', environment_id: 'env-007', status: 'cancelled',
    queue_job_id: 'job-1008', triggered_by: USER_ID,
    started_at: ago(0), completed_at: null,
    duration_ms: null, error_message: 'Cancelled by user', retry_count: 0, metadata: {},
    created_at: ago(0),
  },
];

// Step-level results for passed / failed executions -------------------------
export const testResults: TestResult[] = [
  // exe-001 – Login Flow / passed
  { id: 'res-001', execution_id: 'exe-001', step_number: 1, step_name: 'Navigate to login page',    status: 'passed', duration_ms: 1200, screenshot_blob_path: null, error_details: null, expected_value: null, actual_value: null, created_at: ago(1) },
  { id: 'res-002', execution_id: 'exe-001', step_number: 2, step_name: 'Fill email field',          status: 'passed', duration_ms: 320,  screenshot_blob_path: null, error_details: null, expected_value: null, actual_value: null, created_at: ago(1) },
  { id: 'res-003', execution_id: 'exe-001', step_number: 3, step_name: 'Fill password field',      status: 'passed', duration_ms: 290,  screenshot_blob_path: null, error_details: null, expected_value: null, actual_value: null, created_at: ago(1) },
  { id: 'res-004', execution_id: 'exe-001', step_number: 4, step_name: 'Click Login button',       status: 'passed', duration_ms: 3400, screenshot_blob_path: null, error_details: null, expected_value: null, actual_value: null, created_at: ago(1) },
  { id: 'res-005', execution_id: 'exe-001', step_number: 5, step_name: 'Verify dashboard loaded',  status: 'passed', duration_ms: 800,  screenshot_blob_path: null, error_details: null, expected_value: null, actual_value: null, created_at: ago(1) },
  { id: 'res-006', execution_id: 'exe-001', step_number: 6, step_name: 'Verify welcome message',   status: 'passed', duration_ms: 150,  screenshot_blob_path: null, error_details: null, expected_value: 'Welcome', actual_value: 'Welcome', created_at: ago(1) },

  // exe-002 – Product Search / failed
  { id: 'res-007', execution_id: 'exe-002', step_number: 1, step_name: 'Navigate to homepage',     status: 'passed', duration_ms: 1500, screenshot_blob_path: null, error_details: null, expected_value: null, actual_value: null, created_at: ago(1) },
  { id: 'res-008', execution_id: 'exe-002', step_number: 2, step_name: 'Click search bar',         status: 'passed', duration_ms: 400,  screenshot_blob_path: null, error_details: null, expected_value: null, actual_value: null, created_at: ago(1) },
  { id: 'res-009', execution_id: 'exe-002', step_number: 3, step_name: 'Type search query',        status: 'passed', duration_ms: 250,  screenshot_blob_path: null, error_details: null, expected_value: null, actual_value: null, created_at: ago(1) },
  { id: 'res-010', execution_id: 'exe-002', step_number: 4, step_name: 'Wait for search results',  status: 'failed', duration_ms: 30000, screenshot_blob_path: 'screenshots/exe-002/step-4.png', error_details: 'Timeout 30000ms exceeded waiting for selector [data-testid="search-results"]', expected_value: 'Results list visible', actual_value: 'Element not found', created_at: ago(1) },
];

// Script file contents -------------------------------------------------------
export const scriptContents: Record<string, string> = {
  'scr-001': `import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should log in with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-btn"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="welcome-msg"]')).toContainText('Welcome');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpass');
    await page.click('[data-testid="login-btn"]');

    await expect(page.locator('[data-testid="error-msg"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-msg"]')).toContainText('Invalid credentials');
  });
});`,

  'scr-002': `import { test, expect } from '@playwright/test';

test.describe('Product Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should return results for a valid query', async ({ page }) => {
    await page.click('[data-testid="search-bar"]');
    await page.fill('[data-testid="search-input"]', 'laptop');
    await page.press('[data-testid="search-input"]', 'Enter');

    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    const items = page.locator('[data-testid="product-card"]');
    await expect(items).toHaveCount(await items.count());
    expect(await items.count()).toBeGreaterThan(0);
  });

  test('should filter results by category', async ({ page }) => {
    await page.goto('/search?q=laptop');
    await page.click('[data-testid="filter-electronics"]');
    await expect(page.locator('[data-testid="active-filter"]')).toContainText('Electronics');
  });
});`,

  'scr-003': `import { test, expect } from '@playwright/test';

test.describe('Checkout Process', () => {
  test('guest checkout with credit card', async ({ page }) => {
    // Add item to cart
    await page.goto('/products/123');
    await page.click('[data-testid="add-to-cart"]');
    await expect(page.locator('[data-testid="cart-count"]')).toContainText('1');

    // Proceed to checkout
    await page.click('[data-testid="cart-icon"]');
    await page.click('[data-testid="checkout-btn"]');

    // Guest checkout
    await page.fill('[data-testid="guest-email"]', 'guest@test.com');
    await page.click('[data-testid="continue-guest"]');

    // Shipping
    await page.fill('[data-testid="first-name"]', 'Jane');
    await page.fill('[data-testid="last-name"]', 'Doe');
    await page.fill('[data-testid="address"]', '123 Main St');
    await page.fill('[data-testid="city"]', 'Springfield');
    await page.click('[data-testid="continue-shipping"]');

    // Payment
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/30');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.click('[data-testid="place-order"]');

    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
  });
});`,
};

// Utility: counter for generating IDs
let counter = 1000;
export const nextId = (prefix: string) => `${prefix}-${++counter}`;
