/**
 * Product page tests (demo suite for flaky-test triage).
 *
 *  - stable:  passes every time
 *  - FLAKY:   in about half the runs the server answers "503 Service Unavailable" on the first attempt (simulated),
 *             then it passes on retry - like an occasional backend hiccup
 *  - FAILING: expects a product name that doesn't match the page, on every attempt - like a regression
 */
import { test, expect } from "@playwright/test";

const BRONZER = "/index.php?rt=product/product&product_id=50";

test.describe("Product page", () => {
  test("shows the product name", async ({ page }) => {
    await page.goto(BRONZER);
    await expect(page.locator("h1 .bgnone")).toHaveText("Skinsheen Bronzer Stick");
  });

  test("loads while the backend is briefly unavailable", async ({ page }) => {
    if (test.info().retry === 0 && Math.random() < 0.5) {
      // fault injection: in ~half the runs, the first attempt gets a 503 from the server
      await page.route("**/index.php?rt=product/product*", (route) =>
        route.fulfill({ status: 503, contentType: "text/html", body: "<h1>503 Service Unavailable</h1>" })
      );
    }
    const response = await page.goto(BRONZER);
    expect(response?.status(), "HTTP status of the product page").toBe(200);
    await expect(page.locator("h1 .bgnone")).toBeVisible();
  });

  test("shows the full product title with SPF", async ({ page }) => {
    await page.goto(BRONZER);
    // the page shows "Skinsheen Bronzer Stick": this expectation fails every time (a consistent failure)
    await expect(page.locator("h1 .bgnone")).toHaveText("Skinsheen Bronzer Stick SPF 15", { timeout: 5000 });
  });
});
