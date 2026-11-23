/**
 * Cart tests (demo suite for flaky-test triage).
 *
 *  - stable:  passes every time
 *  - FLAKY:   in about half the runs the page is very slow on the first attempt (simulated delay), so the test times out
 *             once and passes on retry - like a busy CI runner or slow test environment
 *  - FAILING: uses a button id that no longer exists on the site, so it fails on every attempt -
 *             like a test that broke after a UI change
 */
import { test, expect } from "@playwright/test";

const PRODUCT = "/index.php?rt=product/product&product_id=50";

test.describe("Cart", () => {
  test("adds a product to the cart", async ({ page }) => {
    await page.goto(PRODUCT);
    await page.locator("a.cart").click();
    await expect(page).toHaveURL(/rt=checkout\/cart/);
    await expect(page.locator(".contentpanel")).toContainText("Skinsheen Bronzer Stick");
  });

  test("opens the cart on a slow environment", async ({ page }) => {
    if (test.info().retry === 0 && Math.random() < 0.5) {
      // fault injection: in ~half the runs, the first attempt waits 15 s (longer than the 10 s budget below)
      await page.route("**/index.php?rt=checkout/cart*", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 15000));
        await route.continue().catch(() => {});
      });
    }
    await page.goto("/index.php?rt=checkout/cart", { timeout: 10000 });
    await expect(page.locator(".maintext")).toBeVisible();
  });

  test("adds a product with the new Add-to-Cart button", async ({ page }) => {
    await page.goto(PRODUCT);
    // "#add_to_cart_button" doesn't exist on the site: this fails every time (a broken test)
    await page.locator("#add_to_cart_button").click({ timeout: 5000 });
    await expect(page).toHaveURL(/rt=checkout\/cart/);
  });
});
