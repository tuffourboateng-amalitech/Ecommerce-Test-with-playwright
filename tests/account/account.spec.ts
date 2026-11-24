/**
 * Account tests (demo suite for flaky-test triage).
 *
 *  - stable: passes every time
 *  - FLAKY (deploy):    in about half the runs the server refuses the connection on the first attempt (simulated),
 *                       then it passes on retry - like a backend that is restarting during a deployment
 *  - FLAKY (rendering): in about half the runs the login form is still hidden when the test looks for it (simulated
 *                       slow JavaScript), so a short wait isn't enough - like a slow, overloaded CI machine
 */
import { test, expect } from "@playwright/test";

const LOGIN = "/index.php?rt=account/login";

/** True on the first attempt of roughly `chance` of the runs: the injected fault then disappears on retry. */
const unlucky = (chance: number) => test.info().retry === 0 && Math.random() < chance;

test.describe("Account", () => {
  test("login page shows the returning-customer form", async ({ page }) => {
    await page.goto(LOGIN);
    await expect(page.locator("#loginFrm_loginname")).toBeVisible();
    await expect(page.locator("#loginFrm_password")).toBeVisible();
  });

  test("login page loads during a deployment", async ({ page }) => {
    if (unlucky(0.5)) {
      // fault injection: the first request is refused, as if the server was restarting
      await page.route("**/index.php?rt=account/login*", (route) => route.abort("connectionrefused"));
    }
    await page.goto(LOGIN);
    await expect(page.locator("#loginFrm")).toBeVisible();
  });

  test("register button appears quickly", async ({ page }) => {
    if (unlucky(0.5)) {
      // fault injection: the page's scripts are slow, so the form stays hidden for 30 s
      await page.addInitScript(() => {
        window.addEventListener("DOMContentLoaded", () => {
          const form = document.getElementById("accountFrm");
          form?.style.setProperty("display", "none", "important");
          setTimeout(() => form?.style.removeProperty("display"), 30000);
        });
      });
    }
    await page.goto(LOGIN);
    await expect(page.locator("#accountFrm button[type=submit]")).toBeVisible({ timeout: 5000 });
  });
});
