/**
 * Catalogue tests (demo suite for flaky-test triage).
 *
 *  - stable:       passes every time
 *  - INTERMITTENT: fails at random in about 1 of 3 attempts (a simulated race with a slow image service),
 *                  so across several runs it flips between pass and fail - the classic flaky pattern
 */
import { test, expect } from "@playwright/test";

test.describe("Catalogue", () => {
  test("Makeup category lists products", async ({ page }) => {
    await page.goto("/index.php?rt=product/category&path=36");
    await expect(page.locator(".maintext")).toContainText("Makeup");
    await expect(page.locator(".prdocutname").first()).toBeVisible();
  });

  test("product thumbnails load in time", async ({ page }) => {
    const slow = Math.random() < 0.35;          // random: sometimes the image service is slow
    if (slow) {
      await page.route("**/*.{jpg,jpeg,png,webp}", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 6000));
        await route.continue().catch(() => {});
      });
    }
    await page.goto("/index.php?rt=product/category&path=36", { waitUntil: "domcontentloaded" });
    const firstImage = page.locator(".thumbnail img").first();
    await expect(firstImage).toBeVisible();
    await expect
      .poll(() => firstImage.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
            { message: "first product thumbnail should finish loading", timeout: 4000 })
      .toBe(true);
  });
});
