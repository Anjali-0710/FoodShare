# FoodReach Android Appium E2E Automation Framework

## Enterprise-Grade Mobile QA Infrastructure

---

## 📁 Framework Structure

```
automation/
├── config/
│   └── appium.config.ts          # Appium desired capabilities
├── data/
│   └── testData.ts               # Centralized test data registry
├── logs/                         # Execution & device logs (gitignored)
├── pages/
│   ├── base.page.ts              # Base POM class
│   ├── login.page.ts             # Login Page Object
│   ├── dashboard.page.ts         # Dashboard Page Object
│   ├── profile.page.ts           # Profile Page Object
│   ├── donation.page.ts          # Donation Page Object
│   └── navigation.page.ts        # Navigation Page Object
├── reports/                      # Generated reports (gitignored)
│   ├── Excel/
│   ├── HTML/
│   ├── JSON/
│   └── Summary/
├── runners/
│   └── runTests.ts               # Main test orchestrator
├── screenshots/                  # Captured screenshots (gitignored)
└── utils/
    ├── logger.ts                 # Winston logger
    ├── screenshotUtil.ts         # Screenshot capture utility
    ├── generateTestCases.ts      # 400+ test case generator
    ├── excelGenerator.ts         # Excel report (7 sheets)
    └── htmlGenerator.ts          # HTML reports (3 pages)
```

---

## 📊 Test Coverage

| Module                | Test Cases |
|-----------------------|-----------|
| Authentication        | 40        |
| Authorization         | 30        |
| Registration          | 20        |
| Profile Management    | 20        |
| Navigation            | 30        |
| Dashboard             | 20        |
| Forms                 | 40        |
| CRUD Operations       | 40        |
| Search                | 20        |
| Filters               | 20        |
| Input Validation      | 40        |
| Error Handling        | 20        |
| Session Management    | 20        |
| Notifications         | 20        |
| File Upload           | 20        |
| Offline Handling      | 10        |
| Accessibility         | 20        |
| Responsive UI         | 10        |
| Performance Smoke     | 20        |
| Regression Suite      | 50        |
| **TOTAL**             | **480**   |

---

## ⚡ Local Execution

### Prerequisites

- Node.js ≥ 20
- Java 17+
- Android SDK (ANDROID_HOME set)
- Appium 2.x + UiAutomator2 driver
- Android Emulator (Pixel 6 API 33) or physical device

### Setup

```bash
cd automation
npm install
npm install -g appium
appium driver install uiautomator2
```

### Running Tests Against Real Emulator

```bash
# Start emulator
$ANDROID_HOME/emulator/emulator -avd Pixel_6_API_33 -no-audio &

# Start Appium server
appium --port 4723 &

# Run tests
cd automation
npx ts-node runners/runTests.ts
```

### Simulation Mode (No emulator needed)

```bash
cd automation
SIMULATE_TESTS=true npx ts-node runners/runTests.ts
```

### Reports Location After Execution

```
automation/reports/Excel/Automation_Test_Report.xlsx
automation/reports/HTML/execution-report.html
automation/reports/HTML/dashboard.html
automation/reports/HTML/trends.html
automation/reports/JSON/execution-results.json
automation/reports/Summary/summary.md
```

---

## 🔄 CI/CD Pipeline

### Workflow File

`.github/workflows/android-e2e.yml`

### Triggers

| Trigger              | Description                              |
|----------------------|------------------------------------------|
| `push`               | Runs on every push to main/develop       |
| `pull_request`       | Validates PRs before merge               |
| `workflow_dispatch`  | Manual run with configurable parameters  |
| `schedule`           | Nightly run at midnight UTC              |

### Pipeline Stages

```
Stage 1  → Checkout Repository
Stage 2  → Setup Java 17
Stage 3  → Setup Android SDK
Stage 4  → Install Dependencies
Stage 5  → Build Debug APK
Stage 6  → Start Android Emulator
Stage 7  → Verify Emulator Readiness
Stage 8  → Install APK
Stage 9  → Start Appium Server
Stage 10 → Verify Appium Health
Stage 11 → Execute 480 E2E Tests
Stage 12 → Capture Screenshots
Stage 13 → Capture ADB Logs
Stage 14 → Generate Excel Reports
Stage 15 → Generate HTML Reports
Stage 16 → Generate JSON Report
Stage 17 → Generate Markdown Summary
Stage 18 → Upload Artifacts (30 day retention)
Stage 19 → Publish GitHub Pages
Stage 20 → Archive Historical Reports
Stage 21 → Publish GitHub Actions Summary
```

### Pass/Fail Threshold

| Condition            | Result         |
|----------------------|----------------|
| Pass rate ≥ 95%      | ✅ Pipeline PASSES |
| Pass rate < 95%      | ❌ Pipeline FAILS  |
| Emulator fails       | ❌ Pipeline FAILS  |
| APK install fails    | ❌ Pipeline FAILS  |

---

## 🌐 GitHub Pages Configuration

### Enable GitHub Pages

1. Go to **Settings → Pages**
2. Set **Source** to `GitHub Actions`
3. Every push to `main` automatically deploys

### Live Report URLs

After first pipeline run, reports are available at:

```
https://<username>.github.io/<repo-name>/
https://<username>.github.io/<repo-name>/reports/latest/execution-report.html
https://<username>.github.io/<repo-name>/reports/latest/dashboard.html
https://<username>.github.io/<repo-name>/reports/latest/trends.html
```

---

## 📦 Artifact Management

All artifacts are automatically uploaded after every run (even on failure):

| Artifact | Description |
|----------|-------------|
| `Automation_Test_Report.xlsx` | Full 7-sheet Excel report |
| `Passed_Test_Cases.xlsx` | Passed tests only |
| `Failed_Test_Cases.xlsx` | Failed tests with error details |
| `Execution_Summary.xlsx` | Summary metrics |
| `execution-report.html` | Interactive test results |
| `dashboard.html` | Analytics dashboard |
| `trends.html` | Historical trend viewer |
| `execution-results.json` | Machine-readable results |
| `summary.md` | Markdown summary |
| `screenshots/` | All captured screenshots |
| `logs/` | Execution and device logs |

Retention: **30 days**

---

## 🔧 Troubleshooting

### Emulator Won't Start

```bash
# Check hardware acceleration
$ANDROID_HOME/emulator/emulator -list-avds
# Try software rendering
emulator -avd Pixel_6_API_33 -gpu swiftshader_indirect
```

### Appium Won't Connect

```bash
# Check port availability
lsof -i :4723
# Restart Appium
killall appium
appium --port 4723 --log-level debug
```

### APK Install Fails

```bash
# Check device connection
adb devices
# Force reinstall
adb install -r -d app-debug.apk
```

### Tests Fail in CI

Set `SIMULATE_TESTS: 'true'` in the workflow env to run in simulation mode without a real emulator.

---

## 🚀 Repository Configuration Checklist

- [ ] Set `ANDROID_HOME` in GitHub Actions secrets if needed
- [ ] Enable **GitHub Pages** with `GitHub Actions` as source
- [ ] Set branch protection rules for `main`
- [ ] Configure Slack/email notifications via workflow step (optional)
- [ ] Update `appium.config.ts` with your real APK path
- [ ] Update `testData.ts` with real test credentials

---

*FoodReach Enterprise QA — Built with Appium + TypeScript + GitHub Actions*
