import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

(async () => {
  const artifactDir = 'C:\\Users\\bambi\\.gemini\\antigravity-ide\\brain\\ac1b2d76-b298-4248-bed6-78a7e6cac488';
  const reportPath = path.join(artifactDir, 'audit_raw_log.json');
  
  const auditData = {
    timestamp: new Date().toISOString(),
    url: 'http://localhost:5173/',
    viewport: { width: 1280, height: 800 },
    browserVersion: '',
    consoleErrors: [],
    consoleWarnings: [],
    uncaughtExceptions: [],
    failedNetworkRequests: [],
    phases: {}
  };

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    auditData.browserVersion = browser.version();
  } catch (err) {
    console.error('BLOCKED — BROWSER VERIFICATION FAILED:', err.message);
    auditData.phases['PHASE_0'] = { status: 'BLOCKED', error: err.message };
    fs.writeFileSync(reportPath, JSON.stringify(auditData, null, 2));
    process.exit(1);
  }

  const context = await browser.newContext({
    viewport: auditData.viewport
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') auditData.consoleErrors.push(msg.text());
    if (msg.type() === 'warning') auditData.consoleWarnings.push(msg.text());
  });

  page.on('pageerror', err => {
    auditData.uncaughtExceptions.push(err.toString());
  });

  page.on('requestfailed', req => {
    auditData.failedNetworkRequests.push({
      url: req.url(),
      failure: req.failure() ? req.failure().errorText : 'Unknown'
    });
  });

  try {
    const response = await page.goto(auditData.url, { waitUntil: 'networkidle', timeout: 10000 });
    if (!response || response.status() >= 400) {
      throw new Error(`Failed to load page, status: ${response ? response.status() : 'No response'}`);
    }
    auditData.phases['PHASE_0'] = { status: 'PASS', details: 'Application rendered successfully.' };
  } catch (err) {
    console.error('BLOCKED — BROWSER VERIFICATION FAILED:', err.message);
    auditData.phases['PHASE_0'] = { status: 'BLOCKED', error: err.message };
    fs.writeFileSync(reportPath, JSON.stringify(auditData, null, 2));
    await browser.close();
    process.exit(1);
  }

  const screenshotPath = path.join(artifactDir, 'phase0_initial.png');
  await page.screenshot({ path: screenshotPath });

  fs.writeFileSync(reportPath, JSON.stringify(auditData, null, 2));
  console.log('Phase 0 verified successfully. Data logged.');
  await browser.close();
})();
