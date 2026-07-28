/**
 * docs/screenshots/ 를 최신 화면으로 재생성하는 스크립트.
 * 사용법은 docs/screenshots/README.md 참고.
 *
 * 필수 환경변수:
 *   ADMIN_PASSWORD    - k8s Secret server-secrets의 ADMIN_INITIAL_PASSWORD 값
 *                       (kubectl get secret server-secrets -n tram -o jsonpath='{.data.ADMIN_INITIAL_PASSWORD}' | base64 -d)
 *   ARGOCD_PASSWORD   - ArgoCD admin 비밀번호 (argocd-initial-admin-secret이 최신이 아닐 수 있음 —
 *                       `argocd account update-password`로 바꾼 적이 있다면 그 비밀번호)
 *   GRAFANA_PASSWORD  - Grafana admin 비밀번호 (kube-prometheus-stack-grafana secret이 최신이
 *                       아닐 수 있음 — Grafana UI에서 직접 바꾼 적이 있다면 그 비밀번호)
 * 선택 환경변수:
 *   SITE_BASE_URL     - 기본값 https://oasis-tram.duckdns.org
 *   ADMIN_USERNAME    - 기본값 admin (우리 서비스 로그인 계정)
 *   ARGOCD_URL        - 기본값 https://argocd.oasis-tram.duckdns.org
 *   GRAFANA_URL       - 기본값 https://grafana.oasis-tram.duckdns.org
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.SITE_BASE_URL || 'https://oasis-tram.duckdns.org';
const ARGOCD_URL = process.env.ARGOCD_URL || 'https://argocd.oasis-tram.duckdns.org';
const GRAFANA_URL = process.env.GRAFANA_URL || 'https://grafana.oasis-tram.duckdns.org';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ARGOCD_PASSWORD = process.env.ARGOCD_PASSWORD;
const GRAFANA_PASSWORD = process.env.GRAFANA_PASSWORD;

const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'screenshots');

for (const [name, value] of Object.entries({ ADMIN_PASSWORD, ARGOCD_PASSWORD, GRAFANA_PASSWORD })) {
  if (!value) {
    console.error(`[capture] ${name} 환경변수가 필요합니다.`);
    process.exit(1);
  }
}

async function screenshot(page, filename) {
  const filePath = path.join(OUTPUT_DIR, filename);
  await page.screenshot({ path: filePath });
  const { size } = fs.statSync(filePath);
  console.log(`[capture] ${filename} (${(size / 1024).toFixed(1)} KB)`);
}

async function capture(page, url, filename, { waitUntil = 'networkidle', extraWaitMs = 4000 } = {}) {
  await page.goto(url, { waitUntil, timeout: 30000 });
  await page.waitForTimeout(extraWaitMs);
  await screenshot(page, filename);
  console.log(`  <- ${url}`);
}

async function login(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.fill('input[name="id"]', ADMIN_USERNAME);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL('**/admin', { timeout: 10000 }),
    page.click('button[type="submit"]')
  ]);
}

// ArgoCD: 로그인 후 Applications 목록에서 tram-app이 Synced/Healthy로 보이는 화면.
async function captureArgoCD(page) {
  await page.goto(ARGOCD_URL, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1500);

  await page.locator('input[name="username"]').fill('admin');
  await page.locator('input[name="password"]').fill(ARGOCD_PASSWORD);
  await Promise.all([
    page.waitForLoadState('load'),
    page.getByRole('button', { name: 'Sign In' }).click()
  ]);

  // 기본 랜딩 페이지가 Applications 목록. tram-app 카드가 뜰 때까지 대기.
  await page.waitForSelector('text=tram-app', { timeout: 20000 });
  await page.waitForTimeout(2500); // Synced/Healthy 상태 아이콘까지 렌더링될 시간
  await screenshot(page, 'argocd.png');
  console.log(`  <- ${ARGOCD_URL} (Applications 목록)`);
}

// Grafana: 로그인 후 "Kubernetes / Compute Resources / Cluster" 대시보드를 열어서 캡처.
async function captureGrafana(page) {
  await page.goto(GRAFANA_URL, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1500);

  await page.locator('input[name="user"]').fill('admin');
  await page.locator('input[name="password"]').fill(GRAFANA_PASSWORD);
  await Promise.all([
    page.waitForLoadState('load'),
    page.getByRole('button', { name: 'Log in' }).click()
  ]);
  await page.waitForTimeout(1500);

  // 대시보드 검색으로 이동해서 "Compute Resources / Cluster"를 찾아 클릭.
  await page.goto(`${GRAFANA_URL}/dashboards`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('input[placeholder*="Search"]', 'Compute Resources / Cluster');
  const link = page.getByRole('link', { name: /Compute Resources \/ Cluster/i }).first();
  await link.waitFor({ timeout: 15000 });
  await Promise.all([
    page.waitForLoadState('networkidle'),
    link.click()
  ]);

  // 패널(그래프) 렌더링 대기.
  await page.waitForTimeout(4000);
  await screenshot(page, 'grafana.png');
  console.log(`  <- ${GRAFANA_URL} (Kubernetes / Compute Resources / Cluster)`);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  // 페이지 진입 시 3초짜리 스플래시 오버레이(SplashScreen.tsx)가 항상 뜨므로,
  // 매 goto마다 이게 완전히 사라질 때까지 넉넉히 기다린 뒤 캡처해야 한다.
  const SPLASH_CLEAR_MS = 4000;

  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // 1. 시민 대시보드 (공개, 로그인 불필요) — 날씨 로딩 대기 겸 여유시간을 조금 더 준다.
    await capture(page, `${BASE_URL}/dashboard`, 'dashboard.png', { extraWaitMs: SPLASH_CLEAR_MS });

    // 2. 로그인 화면
    await capture(page, `${BASE_URL}/`, 'login.png', { extraWaitMs: SPLASH_CLEAR_MS });

    // 3. 로그인 수행 후 관제 전용 화면들
    await login(page);
    await capture(page, `${BASE_URL}/admin`, 'admin.png', { extraWaitMs: SPLASH_CLEAR_MS });
    await capture(page, `${BASE_URL}/simulation`, 'simulation.png', { extraWaitMs: SPLASH_CLEAR_MS });
    await capture(page, `${BASE_URL}/prediction`, 'prediction.png', { extraWaitMs: SPLASH_CLEAR_MS + 500 });

    await context.close();
  }

  // ArgoCD/Grafana는 우리 앱과 무관한 별도 세션이라 컨텍스트를 분리한다.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    await captureArgoCD(page);
    await captureGrafana(page);
    await context.close();
  }

  await browser.close();
  console.log('[capture] 완료 ->', OUTPUT_DIR);
}

main().catch((err) => {
  console.error('[capture] 실패:', err);
  process.exit(1);
});
