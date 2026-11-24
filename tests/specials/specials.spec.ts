/**
 * Specials (discounted products) tests (demo suite for flaky-test triage).
 *
 *  - stable: passes every time
 *  - FLAKY (gateway):     in about half the runs the load balancer answers "504 Gateway Timeout" on the first attempt
 *                         (simulated), then it passes on retry - like a slow upstream service behind a proxy
 *  - FLAKY (empty page):  in about half the runs the first response comes back empty (simulated), so no products
 *                         show - like a CDN or cache serving a truncated page
 *  - FLAKY (shared state): in about half the runs the first attempt starts in a session where an earlier test switched
 *                         the currency to euros (simulated), so the dollar price check fails; the retry gets a clean
 *                         session - like tests leaking state into each other
 */
import { test, expect } from "@playwright/test";

const SPECIALS = "/index.php?rt=product/special";
const BRONZER = "/index.php?rt=product/product&product_id=50";

/** True on the first attempt of roughly `chance` of the runs: the injected fault then disappears on retry. */
const unlucky = (chance: number) => test.info().retry === 0 && Math.random() < chance;

test.describe("Specials", () => {
  test("lists discounted products with a new price", async ({ page }) => {
    await page.goto(SPECIALS);
    await expect(page.locator(".prdocutname").first()).toBeVisible();
    await expect(page.locator(".pricenew").first()).toContainText("$");
  });

  test("specials page survives a slow upstream", async ({ page }) => {
    if (unlucky(0.5)) {
      // fault injection: the proxy gives up on the first request
      await page.route("**/index.php?rt=product/special*", (route) =>
        route.fulfill({ status: 504, contentType: "text/html", body: "<h1>504 Gateway Time-out</h1>" })
      );
    }
    const response = await page.goto(SPECIALS);
    expect(response?.status(), "HTTP status of the specials page").toBe(200);
    await expect(page.locator(".prdocutname").first()).toBeVisible();
  });

  test("specials page renders when the cache misbehaves", async ({ page }) => {
    if (unlucky(0.5)) {
      // fault injection: the first response is an empty page
      await page.route("**/index.php?rt=product/special*", (route) =>
        route.fulfill({ status: 200, contentType: "text/html", body: "" })
      );
    }
    await page.goto(SPECIALS);
    await expect(page.locator(".prdocutname").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows prices in dollars", async ({ page }) => {
    if (unlucky(0.5)) {
      // fault injection: a previous test left the session in euros
      await page.goto("/?currency=EUR");
    }
    await page.goto(BRONZER);
    await expect(page.locator(".productfilneprice")).toContainText("$", { timeout: 5000 });
  });
});
