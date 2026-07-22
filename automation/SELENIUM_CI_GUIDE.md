# 🌐 FoodReach Enterprise Selenium Live CI/CD Automation Guide

This guide details the architecture, setup, configuration, and execution of the enterprise-grade Selenium E2E CI/CD pipeline targeting the **LIVE GitHub Pages deployment**.

---

## 1. Core Principles

- **MANDATORY RULE:** All Selenium E2E tests execute strictly against the **LIVE GitHub Pages URL**:
  ```
  BASE_URL=https://Anjali-0710.github.io/FoodShare/
  ```
- Tests **NEVER** run against `localhost` or local dev servers.
- The pipeline executes automatically on every code push to `main`.

---

## 2. CI/CD Pipeline Order (13 Stages)

```
Build → Deploy → Verify Deployment → Run Selenium Live Tests → Generate Reports → Upload Artifacts → Publish Summary
```

1. **Stage 1:** Repository Checkout
2. **Stage 2:** Setup Node.js v20 Environment
3. **Stage 3:** Build Application (`npx expo export -p web`)
4. **Stage 4:** Static Analysis & TypeScript Verification
5. **Stage 5:** Deploy Artifacts to GitHub Pages
6. **Stage 6:** Wait for Deployment Propagation (15s)
7. **Stage 7:** Deployment Verification (cURL HTTP 200 Check)
8. **Stage 8:** Run 420+ Live Selenium E2E Test Cases against `BASE_URL`
9. **Stage 9:** Generate HTML Reports (`execution-report.html`, `dashboard.html`)
10. **Stage 10:** Generate Excel Reports (`Automation_Test_Report.xlsx` + 3 Workbooks)
11. **Stage 11:** Upload All Artifacts (30-Day Retention)
12. **Stage 12:** Publish GitHub Action Step Summary
13. **Stage 13:** Archive Historical Results

---

## 3. Local Execution Guide

To execute the Selenium live test suite locally against the deployed application:

```bash
cd automation
export BASE_URL="https://Anjali-0710.github.io/FoodShare/"
npx ts-node runners/runSeleniumSuite.ts
```

---

## 4. Repository & Pages Configuration

Ensure GitHub Pages is configured under Repository Settings:
- **Source:** GitHub Actions
- **Permissions:** `contents: read`, `pages: write`, `id-token: write`
