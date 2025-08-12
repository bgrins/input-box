import { test, expect } from "@playwright/test";

test.describe("Input box functionality", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should load the page with editor focused", async ({ page }) => {
    // Check that the editor is present and focused
    const editor = page.locator("#editor .ProseMirror");
    await expect(editor).toBeVisible();
    await expect(editor).toBeFocused();
  });

  test("should show suggestions when typing", async ({ page }) => {
    const editor = page.locator("#editor .ProseMirror");

    // Type something
    await editor.type("github");

    // Check that suggestions appear
    const suggestions = page.locator(".suggestions-dropdown");
    await expect(suggestions).toHaveClass(/active/);

    // Check that at least one suggestion is visible
    const suggestionItems = page.locator(".suggestion-item");
    await expect(suggestionItems.first()).toBeVisible();
  });

  test("should show command menu when typing @", async ({ page }) => {
    const editor = page.locator("#editor .ProseMirror");

    // Type @
    await editor.type("@");

    // Check that command menu appears
    const commandMenu = page.locator(".command-menu");
    await expect(commandMenu).toBeVisible();

    // Check that all three command options are present (use more specific selectors)
    await expect(
      page.locator(".command-item-label").filter({ hasText: "tabs" }),
    ).toBeVisible();
    await expect(
      page.locator(".command-item-label").filter({ hasText: "history" }),
    ).toBeVisible();
    await expect(
      page.locator(".command-item-label").filter({ hasText: "bookmarks" }),
    ).toBeVisible();
  });

  test("should complete @tabs and show tabs menu", async ({ page }) => {
    const editor = page.locator("#editor .ProseMirror");

    // Type @tabs
    await editor.type("@tabs");

    // Wait for tabs menu to appear
    await page.waitForTimeout(100);

    // Check that tabs menu is shown with checkboxes
    const commandMenu = page.locator(".command-menu");
    await expect(commandMenu).toBeVisible();

    const checkboxes = commandMenu.locator(".command-checkbox");
    const checkboxCount = await checkboxes.count();
    expect(checkboxCount).toBeGreaterThan(0);
  });

  test("should add pills when selecting tabs", async ({ page }) => {
    const editor = page.locator("#editor .ProseMirror");

    // Type @tabs
    await editor.type("@tabs");

    // Wait for tabs menu
    await page.waitForTimeout(100);

    // Click first checkbox
    const firstCheckbox = page.locator(".command-checkbox").first();
    await firstCheckbox.click();

    // Click apply button
    const applyButton = page.locator(".command-apply-btn");
    await applyButton.click();

    // Check that pill was added
    const pill = page.locator(".tab-pill");
    await expect(pill.first()).toBeVisible();
  });

  test("should handle multiline input with Shift+Enter", async ({ page }) => {
    const editor = page.locator("#editor .ProseMirror");

    // Type text with Shift+Enter
    await editor.type("First line");
    await page.keyboard.press("Shift+Enter");
    await editor.type("Second line");

    // Check that editor has multiline class
    await expect(editor).toHaveClass(/multiline/);

    // Check that suggestions are hidden in multiline mode
    const suggestions = page.locator(".suggestions-dropdown");
    await expect(suggestions).not.toHaveClass(/active/);
  });

  test("should send message on Enter", async ({ page }) => {
    const editor = page.locator("#editor .ProseMirror");

    // Type a message
    await editor.type("Test message");

    // Press Enter
    await page.keyboard.press("Enter");

    // Check that toast notification appears
    const toast = page.locator(".toast-item");
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Test message");

    // Check that editor is cleared
    const editorText = await editor.textContent();
    expect(editorText).toBe("");
  });

  test("should handle mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that the layout adapts
    const container = page.locator(".container");
    await expect(container).toBeVisible();

    // Type and check that it works on mobile
    const editor = page.locator("#editor .ProseMirror");
    await editor.click();
    await editor.type("Mobile test");

    // Press Enter to send
    await page.keyboard.press("Enter");

    // Check toast appears at top on mobile
    const toast = page.locator(".toast-item");
    await expect(toast).toBeVisible();
  });

  test("should navigate suggestions with keyboard", async ({ page }) => {
    const editor = page.locator("#editor .ProseMirror");

    // Type to show suggestions
    await editor.type("test");

    // Navigate down
    await page.keyboard.press("ArrowDown");

    // Check that second item is selected
    const selectedItem = page.locator(".suggestion-item.selected");
    await expect(selectedItem).toBeVisible();

    // Press Tab to select
    await page.keyboard.press("Tab");

    // Check that suggestions are hidden
    const suggestions = page.locator(".suggestions-dropdown");
    await expect(suggestions).not.toHaveClass(/active/);
  });

  test("should blur suggestions when command menu is open", async ({
    page,
  }) => {
    const editor = page.locator("#editor .ProseMirror");

    // Type to show suggestions
    await editor.type("test");

    // Wait for suggestions
    const suggestions = page.locator(".suggestions-dropdown");
    await expect(suggestions).toHaveClass(/active/);

    // Clear and type @
    await editor.clear();
    await editor.type("@");

    // Check that suggestions are blurred
    await expect(suggestions).toHaveClass(/blurred/);
  });
});
