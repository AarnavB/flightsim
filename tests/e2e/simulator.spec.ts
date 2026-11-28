import { test, expect } from "@playwright/test";

test("loads the Stage 3 FlightSim world and instrument HUD", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("PROJECT", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("STAGE 03", { exact: false }).first()).toBeVisible();
  await expect(page.getByLabel("3D flight-simulator viewport. Drag to look, use W A S D to move.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Simulated flight instruments" })).toBeVisible();
});

test("opens streaming diagnostics", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Streaming diagnostics" }).click();
  await expect(page.getByText("Streaming diagnostics").last()).toBeVisible();
});

test("changes the graphics profile", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Graphics quality" }).selectOption("High");
  await expect(page.getByRole("combobox", { name: "Graphics quality" })).toHaveValue("High");
});

test("exposes adjustable movement sensitivity", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open settings" }).click();
  const sensitivity = page.getByRole("slider", { name: "Movement sensitivity" });
  await expect(sensitivity).toHaveValue("1");
  await sensitivity.fill("2");
  await expect(sensitivity).toHaveValue("2");
});

test("shows aircraft controls and the toggleable systems guide", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "Aircraft controls" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Startup guide" })).toBeVisible();
  await page.getByRole("button", { name: "Hide startup guide" }).click();
  await expect(page.getByRole("complementary", { name: "Startup guide" })).toHaveCount(0);
  await page.getByRole("button", { name: "OPEN STARTUP GUIDE" }).click();
  await expect(page.getByRole("complementary", { name: "Startup guide" })).toBeVisible();
});

test("drives engine readiness from system controls rather than a cosmetic switch", async ({ page }) => {
  await page.goto("/");
  const guide = page.getByRole("complementary", { name: "Startup guide" });
  await guide.getByRole("button", { name: "ENABLE MASTER" }).click();
  await guide.getByRole("button", { name: "ENABLE FUEL" }).click();
  await guide.getByRole("button", { name: "ENABLE IGNITION" }).click();
  await guide.getByRole("button", { name: "REQUEST ENGINE START" }).click();
  await expect(guide.getByText("SYSTEMS READY")).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText("ENGINE RUNNING").first()).toBeVisible();
});

test("changes spawn and pauses the simulation", async ({ page }) => {
  await page.goto("/");
  const spawn = page.getByLabel("SIMULATION START");
  await spawn.selectOption("airborne");
  await expect(spawn).toHaveValue("airborne");
  await page.getByRole("button", { name: "PAUSE" }).click();
  await expect(page.getByText("PAUSED").first()).toBeVisible();
  await page.getByRole("button", { name: "RESUME" }).click();
});
