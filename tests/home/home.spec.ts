/**
 * Home page tests (demo suite for flaky-test triage).
 *
 *  - stable: passes every time
 *  - FLAKY (DNS):     in about half the runs the site's address fails to resolve on the first attempt (simulated),
 *                     then it passes on retry - like a flaky DNS server on a CI runner
 *  - FLAKY (pop-up):  in about half the runs a promotional pop-up covers the page on the first attempt (simulated),
 *                     so the click can't land; the test doesn't handle the pop-up - like a random marketing banner
 *                     or A/B test that only some sessions get
 */
import { test, expect } from "@playwright/test";

/** True on the first attempt of roughly `chance` of the runs: the injected fault then disappears on retry. */
const unlucky = (chance: number) => test.info().retry === 0 && Math.random() < chance;

test.describe("Home page", () => {
  test("shows the featured products", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#featured .maintext")).toContainText("Featured");
    await expect(page.locator("#featured .prdocutname").first()).toBeVisible();
  });

  test("loads when DNS is unreliable", async ({ page }) => {
    if (unlucky(0.5)) {
      // fault injection: the first page request fails with "name not resolved"
      await page.route("https://automationteststore.com/", (route) => route.abort("namenotresolved"));
    }
    await page.goto("/");
    await expect(page.locator("#featured")).toBeVisible();
  });

  test("opens the login page from the header", async ({ page }) => {
    if (unlucky(0.5)) {
      // fault injection: a full-screen promo pop-up sits on top of the page in this session
      await page.addInitScript(() => {
        window.addEventListener("DOMContentLoaded", () => {
          const popup = document.createElement("div");
          popup.id = "promo-popup";
          popup.textContent = "Black Friday: 50% off everything!";
          popup.style.cssText =
            "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);color:#fff;font-size:40px;padding:20%";
          document.body.appendChild(popup);
        });
      });
    }
    await page.goto("/");
    await page.locator("#customer_menu_top a").first().click({ timeout: 5000 });
    await expect(page).toHaveURL(/rt=account\/login/);
  });
});
