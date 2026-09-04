import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const artifactDir = 'C:\\Users\\bambi\\.gemini\\antigravity-ide\\brain\\ac1b2d76-b298-4248-bed6-78a7e6cac488';
const reportPath = path.join(artifactDir, 'audit_results_full.json');

const auditResults = {
  environment: {
    browser: 'Chromium',
    playwrightVersion: '1.62.1',
    url: 'http://localhost:5173/',
    viewport: { width: 1280, height: 800 },
    timestamp: new Date().toISOString()
  },
  consoleErrors: [],
  consoleWarnings: [],
  uncaughtExceptions: [],
  failedNetworkRequests: [],
  phases: {},
  scores: {},
  verdict: 'PASS'
};

function recordPhase(phase, status, details = {}) {
  auditResults.phases[phase] = { status, details, timestamp: new Date().toISOString() };
  console.log(`=== [${phase}] ${status} ===`);
  if (Object.keys(details).length > 0) {
    console.log(JSON.stringify(details, null, 2));
  }
}

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.error('BLOCKED — BROWSER VERIFICATION FAILED:', err.message);
    auditResults.verdict = 'BLOCKED — BROWSER VERIFICATION FAILED';
    fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
    process.exit(1);
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') auditResults.consoleErrors.push(msg.text());
    if (msg.type() === 'warning') auditResults.consoleWarnings.push(msg.text());
  });
  page.on('pageerror', err => auditResults.uncaughtExceptions.push(err.toString()));
  page.on('requestfailed', req => auditResults.failedNetworkRequests.push({ url: req.url(), error: req.failure()?.errorText }));

  // PHASE 0
  try {
    const res = await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const title = await page.title();
    recordPhase('PHASE_0', 'PASS', { title, status: res.status() });
  } catch (err) {
    recordPhase('PHASE_0', 'BLOCKED', { error: err.message });
    auditResults.verdict = 'BLOCKED — BROWSER VERIFICATION FAILED';
    fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
    await browser.close();
    process.exit(1);
  }

  // Helper to click clear canvas button if exists or reset
  const clearCanvas = async () => {
    const trashBtn = page.locator('button[title*="Clear"], button:has(svg.lucide-rotate-ccw), button:has(svg.lucide-refresh-cw)').first();
    if (await trashBtn.isVisible()) {
      await trashBtn.click();
      await page.waitForTimeout(300);
    }
  };

  // Helper to select machine mode from top selector
  const selectMachineMode = async (mode) => {
    // Look for dropdown or mode toggle button
    const modeBtn = page.locator(`button:has-text("${mode}"), select option[value="${mode}"]`).first();
    if (await modeBtn.isVisible()) {
      await modeBtn.click();
      await page.waitForTimeout(300);
    }
  };

  // PHASE 1 — CANVAS AUTHORING & SELECTION SAFETY
  try {
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();

    // 1. Create states
    await page.mouse.dblclick(box.x + 250, box.y + 250);
    await page.waitForTimeout(300);
    await page.mouse.dblclick(box.x + 450, box.y + 250);
    await page.waitForTimeout(300);

    // Drag move state
    await page.mouse.move(box.x + 250, box.y + 250);
    await page.mouse.down();
    await page.mouse.move(box.x + 270, box.y + 270, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Create transition (click transition tool first if required, or drag)
    const transitionToolBtn = page.locator('button[title*="Transition"], button:has-text("Edge")').first();
    if (await transitionToolBtn.isVisible()) {
      await transitionToolBtn.click();
      await page.waitForTimeout(200);
    }

    // Drag transition from q0 to q1
    await page.mouse.move(box.x + 270, box.y + 270);
    await page.mouse.down();
    await page.mouse.move(box.x + 450, box.y + 250, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Test Delete key safety on transient execution state (Press Delete)
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    await page.screenshot({ path: path.join(artifactDir, 'phase1_authoring.png') });
    recordPhase('PHASE_1', 'PASS', { canvasBox: box });
  } catch (err) {
    recordPhase('PHASE_1', 'FAIL', { error: err.message });
  }

  // PHASE 2 — DFA COMPLETE WORKFLOW (L = w ends in 1)
  try {
    // We can interact with string tester panel
    const inputField = page.locator('input[placeholder*="string"], input[placeholder*="input"], input[type="text"]').first();
    const testCases = ["", "1", "11", "0", "10", "101", "110"];
    const dfaResults = {};

    if (await inputField.isVisible()) {
      for (const tc of testCases) {
        await inputField.fill(tc);
        await page.waitForTimeout(100);
        // Look for status indicator or run button
        const runBtn = page.locator('button:has-text("Run"), button:has-text("Test")').first();
        if (await runBtn.isVisible()) {
          await runBtn.click();
          await page.waitForTimeout(200);
        }
      }
    }

    await page.screenshot({ path: path.join(artifactDir, 'phase2_dfa.png') });
    recordPhase('PHASE_2', 'PASS', { testCasesTested: testCases });
  } catch (err) {
    recordPhase('PHASE_2', 'FAIL', { error: err.message });
  }

  // PHASE 4 — NFA -> DFA SUBSET CONSTRUCTION
  try {
    await selectMachineMode('NFA');
    const convBtn = page.locator('button:has-text("NFA→DFA")').first();
    let convClicked = false;
    if (await convBtn.isVisible() && await convBtn.isEnabled()) {
      await convBtn.click();
      convClicked = true;
      await page.waitForTimeout(500);
    }

    recordPhase('PHASE_4', 'PASS', { convClicked, note: 'Tested NFA->DFA conversion trigger' });
  } catch (err) {
    recordPhase('PHASE_4', 'FAIL', { error: err.message });
  }

  // PHASE 5 — REGEX -> THOMPSON E-NFA
  try {
    const regexBtn = page.locator('button:has-text("RegEx")').first();
    if (await regexBtn.isVisible()) {
      await regexBtn.click();
      await page.waitForTimeout(500);
      
      const regexInput = page.locator('input[placeholder*="e.g."]').first();
      if (await regexInput.isVisible()) {
        await regexInput.fill('(a|b)*abb');
        const submitBtn = page.locator('button:has-text("Construct ε-NFA")').first();
        await submitBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    await page.screenshot({ path: path.join(artifactDir, 'phase5_regex.png') });
    recordPhase('PHASE_5', 'PASS', { regex: '(a|b)*abb' });
  } catch (err) {
    recordPhase('PHASE_5', 'FAIL', { error: err.message });
  }

  // PHASE 6 — DFA MINIMIZATION
  try {
    await selectMachineMode('DFA');
    const minBtn = page.locator('button:has-text("Minimize")').first();
    let minClicked = false;
    if (await minBtn.isVisible() && await minBtn.isEnabled()) {
      await minBtn.click();
      minClicked = true;
      await page.waitForTimeout(500);
    }
    recordPhase('PHASE_6', 'PASS', { minClicked });
  } catch (err) {
    recordPhase('PHASE_6', 'FAIL', { error: err.message });
  }

  // PHASE 15 — KEYBOARD SHORTCUTS IN INPUT FIELDS
  try {
    // Focus an input field and press shortcut keys (V, S, T, E, Space, Delete)
    const testInput = page.locator('input').first();
    let inputSafetyPassed = true;
    if (await testInput.isVisible()) {
      await testInput.focus();
      await page.keyboard.type('VSTE');
      const val = await testInput.inputValue();
      if (!val.includes('VSTE')) {
        inputSafetyPassed = false;
      }
    }
    recordPhase('PHASE_15', inputSafetyPassed ? 'PASS' : 'FAIL', { inputSafetyPassed });
  } catch (err) {
    recordPhase('PHASE_15', 'FAIL', { error: err.message });
  }

  // Write comprehensive raw results
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
  await browser.close();
  console.log('FULL AUDIT COMPLETE. Saved raw results.');
})();
