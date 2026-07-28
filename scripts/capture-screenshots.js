/**
 * docs/screenshots/ 를 최신 화면으로 재생성하는 스크립트.
 * 사용법은 docs/screenshots/README.md 참고.
 *
 * 필수 환경변수:
 *   ADMIN_PASSWORD  - k8s Secret server-secrets의 ADMIN_INITIAL_PASSWORD 값
 *                     (kubectl get secret server-secrets -n tram -o jsonpath='{.data.ADMIN_INITIAL_PASSWORD}' | base64 -d)
 * 선택 환경변수:
 *   SITE_BASE_URL   - 기본값 https://oasis-tram.duckdns.org
 *   ADMIN_USERNAME  - 기본값 admin
 *   ARGOCD_URL      - 기본값 https://argocd.oasis-tram.duckdns.org
 *   GRAFANA_URL     - 기본값 https://grafana.oasis-tram.duckdns.org
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.SITE_BASE_URL || 'https://oasis-tram.duckdns.org';
const ARGOCD_URL = process.env.ARGOCD_URL || 'https://argocd.oasis-tram.duckdns.org';
const GRAFANA_URL = process.env.GRAFANA_URL || 'https://grafana.oasis-tram.duckdns.org';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'screenshots');

if (!ADMIN_PASSWORD) {
  console.error('[capture] ADMIN_PASSWORD 환경변수가 필요합니다 (admin.png/simulation.png/prediction.png 캡처에 로그인이 필요함).');
  process.exit(1);
}

async function capture(page, url, filename, { waitUntil = 'networkidle', extraWaitMs = 4000 } = {}) {
  await page.goto(url, { waitUntil, timeout: 30000 });
  await page.waitForTimeout(extraWaitMs);
  const filePath = path.join(OUTPUT_DIR, filename);
  await page.screenshot({ path: filePath });
  const { size } = fs.statSync(filePath);
  console.log(`[capture] ${filename} (${(size / 1024).toFixed(1)} KB) <- ${url}`);
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

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // 페이지 진입 시 3초짜리 스플래시 오버레이(SplashScreen.tsx)가 항상 뜨므로,
  // 매 goto마다 이게 완전히 사라질 때까지 넉넉히 기다린 뒤 캡처해야 한다.
  const SPLASH_CLEAR_MS = 4000;

  // 1. 시민 대시보드 (공개, 로그인 불필요) — 날씨 로딩 대기 겸 여유시간을 조금 더 준다.
  await capture(page, `${BASE_URL}/dashboard`, 'dashboard.png', { extraWaitMs: SPLASH_CLEAR_MS });

  // 2. 로그인 화면
  await capture(page, `${BASE_URL}/`, 'login.png', { extraWaitMs: SPLASH_CLEAR_MS });

  // 3. 로그인 수행 후 관제 전용 화면들
  await login(page);
  await capture(page, `${BASE_URL}/admin`, 'admin.png', { extraWaitMs: SPLASH_CLEAR_MS });
  await capture(page, `${BASE_URL}/simulation`, 'simulation.png', { extraWaitMs: SPLASH_CLEAR_MS });
  await capture(page, `${BASE_URL}/prediction`, 'prediction.png', { extraWaitMs: SPLASH_CLEAR_MS + 500 });

  // 4. ArgoCD, Grafana — 로그인 화면만 (SSE/웹소켓 때문에 networkidle이 안 걸릴 수 있어 load로 대기)
  await capture(page, ARGOCD_URL, 'argocd.png', { waitUntil: 'load', extraWaitMs: 3000 });
  await capture(page, GRAFANA_URL, 'grafana.png', { waitUntil: 'load', extraWaitMs: 3000 });

  await browser.close();
  console.log('[capture] 완료 ->', OUTPUT_DIR);
}

main().catch((err) => {
  console.error('[capture] 실패:', err);
  process.exit(1);
});
