/**
 * Search tests (demo suite for flaky-test triage).
 *
 *  - stable:  passes every time
 *  - FLAKY:   the network drops the connection on the first attempt of about half the runs (simulated with request
 *             interception); it then passes on retry - like a real, occasional network blip in CI
 *  - FAILING: asserts the wrong number of results, so it fails on every attempt - like a real bug
 */
import { test, expect } from "@playwright/test";

test.describe("Search", () => {
  test("finds shampoo products", async ({ page }) => {
    await page.goto("/index.php?rt=product/search&keyword=shampoo");
    await expect(page.locator(".prdocutname").first()).toContainText("Shampoo");
  });

  test("search survives a network blip", async ({ page }) => {
    if (test.info().retry === 0 && Math.random() < 0.5) {
      // fault injection: in ~half the runs, the first attempt hits a dropped connection
      await page.route("**/index.php?rt=product/search*", (route) => route.abort("connectionreset"));
    }
    await page.goto("/index.php?rt=product/search&keyword=conditioner");
    await expect(page.locator(".prdocutname").first()).toBeVisible();
  });

  test("returns all five shampoo products", async ({ page }) => {
    await page.goto("/index.php?rt=product/search&keyword=shampoo");
    // the catalogue only has 2 shampoos: this expectation is wrong every time (a consistent failure)
    await expect(page.locator(".prdocutname")).toHaveCount(5, { timeout: 5000 });
  });
});
