import { test, expect } from "@playwright/test";

test("loads the FlightSim world foundation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("PROJECT", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("WORLD SYSTEMS / PHASE 01")).toBeVisible();
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