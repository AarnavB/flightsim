import { test, expect } from "@playwright/test";

test("loads the FlightSim world foundation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("PROJECT", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("STAGE 02 / ARCADE FLIGHT")).toBeVisible();
  await expect(page.getByLabel("3D flight-simulator viewport. Drag to look, use W A S D to move.")).toBeVisible();
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
test("shows the arcade aircraft controls and game telemetry", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "Flight game controls" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Arcade flight telemetry" })).toBeVisible();
  await expect(page.getByLabel("SPAWN CONFIGURATION")).toBeVisible();
});

test("changes spawn and pauses the game simulation", async ({ page }) => {
  await page.goto("/");
  const spawn = page.getByLabel("SPAWN CONFIGURATION");
  await spawn.selectOption("airborne");
  await expect(spawn).toHaveValue("airborne");
  await page.getByRole("button", { name: "PAUSE" }).click();
  await expect(page.getByText("PAUSED").first()).toBeVisible();
  await page.getByRole("button", { name: "RESUME" }).click();
});
