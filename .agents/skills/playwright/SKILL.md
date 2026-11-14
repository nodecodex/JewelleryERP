---
name: playwright
description: Best practices, test runner instructions, and E2E automation patterns for Playwright in desktop and web applications. Use when creating, debugging, or running automated End-to-End (E2E) tests, browser tests, UI integration flows, and visual regression suites.
---

# Playwright Testing Skill

This skill guides the creation, maintenance, and execution of comprehensive Playwright End-to-End (E2E) test suites for desktop (Tauri WebView / Web) ERP applications.

## Core Directives

1. **Robust Selectors**:
   - Always prefer user-visible attributes: `getByRole`, `getByLabel`, `getByPlaceholder`, `getByText`.
   - Use `data-testid` only for highly dynamic, dense data-grid cells where semantic roles are ambiguous.
   - Avoid brittle CSS class hierarchies (e.g. `div > div > span:nth-child(2)`).

2. **Asynchronous & Auto-Waiting**:
   - Never use arbitrary `sleep` or hard timeouts like `waitForTimeout(3000)`.
   - Leverage Playwright's built-in web-first assertions (`expect(locator).toBeVisible()`, `expect(locator).toHaveText()`).
   - For backend IPC / SQLite database mutations, assert UI updates triggered by completion events.

3. **ERP Flow Testing Scenarios**:
   - **Company Setup**: Verification of creation, financial year lock, GST validation.
   - **Fast Billing**: Rapid scanning simulation, line-item additions, discount/tax calculations, and thermal print dialog trigger.
   - **Tag Opening & Stock**: Adding item tags, validating gross/net/fine weights, verifying stock summary.
   - **Daybook & Vouchers**: Multi-voucher posting and ledger balance reconciliation.

4. **CLI Commands**:
   - Run tests: `npx playwright test`
   - Run specific file: `npx playwright test tests/e2e/billing.spec.ts`
   - Debug mode: `npx playwright test --debug`
   - Show HTML report: `npx playwright show-report`
