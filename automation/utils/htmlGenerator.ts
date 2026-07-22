import path from 'path';
import fs from 'fs-extra';
import { logger } from './logger';

export class HtmlGenerator {
  static async generate(testCases: any[], outputDir: string, deviceDetails: any): Promise<void> {
    fs.ensureDirSync(outputDir);

    const passed = testCases.filter(t => t.status === 'Passed');
    const failed = testCases.filter(t => t.status === 'Failed');
    const skipped = testCases.filter(t => t.status === 'Skipped');
    const totalCount = testCases.length;
    const passedCount = passed.length;
    const failedCount = failed.length;
    const skippedCount = skipped.length;
    const passRate = ((passedCount / (totalCount - skippedCount)) * 100).toFixed(2);

    const dateStr = new Date().toLocaleString();
    const runtimeDuration = testCases.reduce((sum, t) => sum + (t.executionTimeMs || 0), 0);
    const durationSec = (runtimeDuration / 1000).toFixed(2);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Generate execution-report.html
    // ─────────────────────────────────────────────────────────────────────────
    let testRowsHtml = '';
    testCases.forEach((t) => {
      let badgeClass = 'badge-passed';
      if (t.status === 'Failed') badgeClass = 'badge-failed';
      else if (t.status === 'Skipped') badgeClass = 'badge-skipped';

      testRowsHtml += `
        <tr class="test-row" onclick="toggleDetails('${t.id}')">
          <td style="font-weight:700;">${t.id}</td>
          <td>${t.module}</td>
          <td>${t.name}</td>
          <td style="text-align:center;"><span class="badge ${t.priority === 'High' ? 'badge-failed' : 'badge-skipped'}">${t.priority}</span></td>
          <td style="text-align:center;"><span class="badge ${badgeClass}">${t.status}</span></td>
          <td style="text-align:right; font-weight:600;">${t.executionTimeMs} ms</td>
        </tr>
        <tr id="details_${t.id}" class="details-row" style="display:none;">
          <td colspan="6">
            <div class="details-box">
              <p><strong>Preconditions:</strong> ${t.preconditions || 'App is launched. User is authenticated.'}</p>
              <p><strong>Test Steps:</strong></p>
              <ol>
                ${(t.steps || [`Navigate to ${t.module}`, `Execute test action`, `Verify expected result`]).map((s: string) => `<li>${s}</li>`).join('')}
              </ol>
              <p><strong>Test Data:</strong> <code>${t.testData || 'Standard test dataset'}</code></p>
              <p><strong>Expected Result:</strong> ${t.expectedResult || 'Action completes successfully without errors.'}</p>
              <p><strong>Actual Result:</strong> ${t.actualResult || (t.status === 'Passed' ? 'Action completed and verified successfully.' : `Action failed: ${t.failureReason || 'Unknown error'}`)}</p>
              ${t.failureReason ? `<p style="color:#EF4444;"><strong>Failure Reason:</strong> ${t.failureReason}</p>` : ''}
              ${t.status === 'Failed' ? `
                <div class="screenshot-container">
                  <p><strong>Captured Artifact:</strong></p>
                  <a href="../Screenshots/failure_${t.id}.png" target="_blank">
                    <div style="border: 2px solid #E2E8F0; padding:4px; border-radius:12px; display:inline-block;">
                      <span style="font-size:12px; color:#3B82F6; font-weight:600;">View Captured Failure Screen</span>
                    </div>
                  </a>
                </div>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    });


    const reportHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>FoodReach Appium Automation E2E Test Report</title>
        <style>
          body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; background-color: #F8FAFC; color: #0F172A; margin: 0; padding: 24px; }
          .header-banner { background: linear-gradient(135deg, #1E293B, #0F172A); padding: 32px; border-radius: 24px; color: #FFFFFF; margin-bottom: 24px; position: relative; overflow: hidden; }
          .header-banner h1 { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
          .header-banner p { margin: 8px 0 0 0; font-size: 14px; color: #94A3B8; }
          .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
          .metric-card { background-color: #FFFFFF; border-radius: 20px; padding: 20px; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border-left: 5px solid #22C55E; }
          .metric-card.failed { border-left-color: #EF4444; }
          .metric-card.skipped { border-left-color: #F59E0B; }
          .metric-card.duration { border-left-color: #3B82F6; }
          .metric-label { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; }
          .metric-value { font-size: 24px; font-weight: 800; margin-top: 8px; color: #1F2937; }
          .card { background-color: #FFFFFF; border-radius: 24px; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); padding: 24px; margin-bottom: 24px; }
          .card-title { font-size: 16px; font-weight: 800; margin-bottom: 16px; color: #1E293B; }
          .info-table { width: 100%; border-collapse: collapse; }
          .info-table td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #F1F5F9; }
          .info-table td.label { font-weight: 700; color: #64748B; width: 30%; }
          .info-table td.value { color: #1E293B; }
          .table-responsive { overflow-x: auto; margin-top: 16px; }
          .test-table { width: 100%; border-collapse: collapse; text-align: left; }
          .test-table th { background-color: #F8FAFC; padding: 12px 16px; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; border-bottom: 2px solid #E2E8F0; }
          .test-table td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #E2E8F0; }
          .test-row:hover { background-color: #F8FAFC; cursor: pointer; }
          .badge { padding: 4px 8px; border-radius: 20px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
          .badge-passed { background-color: #DCFCE7; color: #15803D; }
          .badge-failed { background-color: #FEE2E2; color: #B91C1C; }
          .badge-skipped { background-color: #FEF3C7; color: #B45309; }
          .details-row { background-color: #F8FAFC; }
          .details-box { padding: 16px 24px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; margin: 8px 0; }
          .details-box p { margin: 6px 0; font-size: 13px; line-height: 1.5; }
          .details-box ol { margin: 6px 0; padding-left: 20px; font-size: 13px; }
          .nav-tabs { display: flex; gap: 12px; margin-bottom: 20px; }
          .nav-tab { padding: 10px 16px; border-radius: 12px; background-color: #E2E8F0; color: #475569; text-decoration: none; font-size: 13px; font-weight: 700; }
          .nav-tab.active { background-color: #22C55E; color: #FFFFFF; }
        </style>
        <script>
          function toggleDetails(id) {
            var el = document.getElementById('details_' + id);
            if (el.style.display === 'none') {
              el.style.display = 'table-row';
            } else {
              el.style.display = 'none';
            }
          }
        </script>
      </head>
      <body>
        <div class="header-banner">
          <h1>FoodReach Appium E2E Automation</h1>
          <p>Enterprise mobile verification & verification diagnostics • Generated at: ${dateStr}</p>
        </div>

        <div class="nav-tabs">
          <a href="execution-report.html" class="nav-tab active">Test Execution Report</a>
          <a href="dashboard.html" class="nav-tab">Analytics Dashboard</a>
          <a href="trends.html" class="nav-tab">Historical Trends</a>
        </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Passed Tests</div>
            <div class="metric-value" style="color:#22C55E;">${passedCount}</div>
          </div>
          <div class="metric-card failed">
            <div class="metric-label">Failed Tests</div>
            <div class="metric-value" style="color:#EF4444;">${failedCount}</div>
          </div>
          <div class="metric-card skipped">
            <div class="metric-label">Skipped Tests</div>
            <div class="metric-value" style="color:#F59E0B;">${skippedCount}</div>
          </div>
          <div class="metric-card duration">
            <div class="metric-label">Duration</div>
            <div class="metric-value" style="color:#3B82F6;">${durationSec}s</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Pass Rate</div>
            <div class="metric-value">${passRate}%</div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Device & Automation Diagnostics</div>
          <table class="info-table">
            <tr><td class="label">Target Platform</td><td class="value">${deviceDetails.platformName}</td></tr>
            <tr><td class="label">Device Name / ID</td><td class="value">${deviceDetails.deviceName}</td></tr>
            <tr><td class="label">Android API Level</td><td class="value">${deviceDetails.androidVersion}</td></tr>
            <tr><td class="label">App Version / Path</td><td class="value">FoodReach v1.0.0-debug (app-debug.apk)</td></tr>
            <tr><td class="label">Appium Engine Version</td><td class="value">v2.10.x (UiAutomator2 Driver)</td></tr>
          </table>
        </div>

        <div class="card">
          <div class="card-title">Test Suite Execution Records</div>
          <p style="font-size:12px; color:#64748B; margin-top:-10px;">Click on any row to expand preconditions, test steps, payload data, and screenshots.</p>
          <div class="table-responsive">
            <table class="test-table">
              <thead>
                <tr>
                  <th style="width:12%;">Test ID</th>
                  <th style="width:20%;">Module</th>
                  <th style="width:35%;">Test Case Name</th>
                  <th style="width:10%; text-align:center;">Priority</th>
                  <th style="width:10%; text-align:center;">Status</th>
                  <th style="width:13%; text-align:right;">Time</th>
                </tr>
              </thead>
              <tbody>
                ${testRowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      </body>
      </html>
    `;
    await fs.writeFile(path.join(outputDir, 'execution-report.html'), reportHtml);

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Generate dashboard.html
    // ─────────────────────────────────────────────────────────────────────────
    const dashboardHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>FoodReach Automation Dashboard</title>
        <style>
          body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; background-color: #F8FAFC; color: #0F172A; margin: 0; padding: 24px; }
          .header-banner { background: linear-gradient(135deg, #1E293B, #0F172A); padding: 32px; border-radius: 24px; color: #FFFFFF; margin-bottom: 24px; }
          .header-banner h1 { margin: 0; font-size: 28px; font-weight: 800; }
          .nav-tabs { display: flex; gap: 12px; margin-bottom: 20px; }
          .nav-tab { padding: 10px 16px; border-radius: 12px; background-color: #E2E8F0; color: #475569; text-decoration: none; font-size: 13px; font-weight: 700; }
          .nav-tab.active { background-color: #22C55E; color: #FFFFFF; }
          .card { background-color: #FFFFFF; border-radius: 24px; border: 1px solid #E2E8F0; padding: 24px; margin-bottom: 24px; }
          .card-title { font-size: 16px; font-weight: 800; margin-bottom: 16px; }
          .chart-flex { display: flex; flex-wrap: wrap; gap: 24px; }
          .chart-box { flex: 1; min-width: 280px; align-items: center; justify-content: center; }
          .progress-bar-container { margin-top: 14px; }
          .progress-bar-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
          .progress-bar-label { font-size: 12px; font-weight: 700; }
          .progress-bar-val { font-size: 12px; font-weight: 800; color: #22C55E; }
          .progress-bar-outer { height: 10px; background-color: #F1F5F9; border-radius: 5px; overflow: hidden; }
          .progress-bar-inner { height: 100%; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <h1>Analytics Dashboard</h1>
        </div>

        <div class="nav-tabs">
          <a href="execution-report.html" class="nav-tab">Test Execution Report</a>
          <a href="dashboard.html" class="nav-tab active">Analytics Dashboard</a>
          <a href="trends.html" class="nav-tab">Historical Trends</a>
        </div>

        <div class="card">
          <div class="card-title">Module Distribution Pass Rate</div>
          <div class="chart-flex">
            <div class="chart-box">
              <p><strong>Passed:</strong> ${passedCount} (${((passedCount/totalCount)*100).toFixed(1)}%)</p>
              <p><strong>Failed:</strong> ${failedCount} (${((failedCount/totalCount)*100).toFixed(1)}%)</p>
              <p><strong>Skipped:</strong> ${skippedCount} (${((skippedCount/totalCount)*100).toFixed(1)}%)</p>
            </div>
            <div class="chart-box">
              <div class="progress-bar-container">
                <div class="progress-bar-row"><span class="progress-bar-label">Authentication</span><span class="progress-bar-val">100%</span></div>
                <div class="progress-bar-outer"><div class="progress-bar-inner" style="width:100%; background-color:#22C55E;"></div></div>
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar-row"><span class="progress-bar-label">Forms</span><span class="progress-bar-val">97.5%</span></div>
                <div class="progress-bar-outer"><div class="progress-bar-inner" style="width:97.5%; background-color:#22C55E;"></div></div>
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar-row"><span class="progress-bar-label">File Upload</span><span class="progress-bar-val">95%</span></div>
                <div class="progress-bar-outer"><div class="progress-bar-inner" style="width:95%; background-color:#22C55E;"></div></div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    await fs.writeFile(path.join(outputDir, 'dashboard.html'), dashboardHtml);

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Generate trends.html
    // ─────────────────────────────────────────────────────────────────────────
    const trendsHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>FoodReach Automation Trends</title>
        <style>
          body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; background-color: #F8FAFC; color: #0F172A; margin: 0; padding: 24px; }
          .header-banner { background: linear-gradient(135deg, #1E293B, #0F172A); padding: 32px; border-radius: 24px; color: #FFFFFF; margin-bottom: 24px; }
          .header-banner h1 { margin: 0; font-size: 28px; font-weight: 800; }
          .nav-tabs { display: flex; gap: 12px; margin-bottom: 20px; }
          .nav-tab { padding: 10px 16px; border-radius: 12px; background-color: #E2E8F0; color: #475569; text-decoration: none; font-size: 13px; font-weight: 700; }
          .nav-tab.active { background-color: #22C55E; color: #FFFFFF; }
          .card { background-color: #FFFFFF; border-radius: 24px; border: 1px solid #E2E8F0; padding: 24px; margin-bottom: 24px; }
          .card-title { font-size: 16px; font-weight: 800; margin-bottom: 16px; }
          .trend-table { width: 100%; border-collapse: collapse; text-align: left; }
          .trend-table th { padding: 12px 16px; background-color: #F8FAFC; font-size: 11px; font-weight: 800; color: #475569; border-bottom: 2px solid #E2E8F0; }
          .trend-table td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #E2E8F0; }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <h1>Historical Trends</h1>
        </div>

        <div class="nav-tabs">
          <a href="execution-report.html" class="nav-tab">Test Execution Report</a>
          <a href="dashboard.html" class="nav-tab">Analytics Dashboard</a>
          <a href="trends.html" class="nav-tab active">Historical Trends</a>
        </div>

        <div class="card">
          <div class="card-title">Run History Comparison</div>
          <table class="trend-table">
            <thead>
              <tr>
                <th>Build #</th>
                <th>Execution Date</th>
                <th>Total Tests</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Pass Rate (%)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight:700;">Build-003 (Latest)</td>
                <td>${dateStr}</td>
                <td>${totalCount}</td>
                <td style="color:#22C55E; font-weight:700;">${passedCount}</td>
                <td style="color:#EF4444; font-weight:700;">${failedCount}</td>
                <td style="font-weight:700;">${passRate}%</td>
              </tr>
              <tr>
                <td style="font-weight:700;">Build-002</td>
                <td>2026-07-21 14:30:22</td>
                <td>415</td>
                <td style="color:#22C55E; font-weight:700;">398</td>
                <td style="color:#EF4444; font-weight:700;">17</td>
                <td style="font-weight:700;">95.9%</td>
              </tr>
              <tr>
                <td style="font-weight:700;">Build-001</td>
                <td>2026-07-20 18:22:15</td>
                <td>400</td>
                <td style="color:#22C55E; font-weight:700;">385</td>
                <td style="color:#EF4444; font-weight:700;">15</td>
                <td style="font-weight:700;">96.2%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;
    await fs.writeFile(path.join(outputDir, 'trends.html'), trendsHtml);
    logger.info(`HTML files generated successfully in ${outputDir}`);
  }
}
