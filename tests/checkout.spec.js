// The three required automated checks. Each starts from a clean page and asserts
// on what the customer actually sees (text, visibility, values), not on timing.
const { test, expect } = require('@playwright/test');
const { openCleanCheckout, addProduct, nameField, placeOrder } = require('./helpers');

test.describe('Required checks', () => {
  test.beforeEach(async ({ page }) => {
    await openCleanCheckout(page);
  });

  test('1. successful checkout produces a confirmation with a reference', async ({ page }) => {
    await addProduct(page, 'Notebook');
    await addProduct(page, 'Pen Set');
    await nameField(page).fill('Asha Verma');
    await expect(page.getByTestId('order-total')).toHaveText('$16.50');

    await placeOrder(page).click();

    const confirmation = page.getByTestId('confirmation');
    await expect(confirmation).toBeVisible();
    await expect(confirmation.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
    await expect(page.getByTestId('confirmation-ref')).toHaveText(/^ORD-[A-Z0-9]{6}$/);
    await expect(page.getByTestId('confirmation-name')).toHaveText('Asha Verma');
    await expect(page.getByTestId('confirmation-total')).toHaveText('$16.50');
    await expect(page.getByTestId('confirmation-items')).toContainText(['1 × Notebook — $12.50']);
    await expect(page.getByTestId('name-error')).toBeHidden();
    await expect(page.getByTestId('cart-error')).toBeHidden();

    await page.screenshot({ path: 'evidence/automated/01-success-confirmation.png' });
  });

  test('2. a missing required field blocks checkout and keeps the cart', async ({ page }) => {
    await addProduct(page, 'Notebook');
    await page.getByLabel('Quantity for Notebook').fill('3');
    await expect(page.getByTestId('order-total')).toHaveText('$37.50');

    await placeOrder(page).click();

    await expect(page.getByTestId('name-error')).toBeVisible();
    await expect(page.getByTestId('name-error')).toHaveText('Please enter your full name.');
    await expect(nameField(page)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByTestId('confirmation')).toBeHidden();

    // What the customer already entered is preserved.
    await expect(page.getByLabel('Quantity for Notebook')).toHaveValue('3');
    await expect(page.getByTestId('order-total')).toHaveText('$37.50');

    // A whitespace-only name is still "missing".
    await nameField(page).fill('   ');
    await placeOrder(page).click();
    await expect(page.getByTestId('name-error')).toBeVisible();
    await expect(page.getByTestId('confirmation')).toBeHidden();

    await page.screenshot({ path: 'evidence/automated/02-missing-name-blocked.png' });

    // Fixing the field clears the message and lets the order through.
    await nameField(page).fill('Asha Verma');
    await expect(page.getByTestId('name-error')).toBeHidden();
    await placeOrder(page).click();
    await expect(page.getByTestId('confirmation')).toBeVisible();
  });

  test('3. changing a quantity updates line totals and the order total exactly', async ({ page }) => {
    await addProduct(page, 'Notebook');
    await addProduct(page, 'Pen Set');
    await expect(page.getByTestId('line-total-notebook')).toHaveText('$12.50');
    await expect(page.getByTestId('line-total-pen-set')).toHaveText('$4.00');
    await expect(page.getByTestId('order-total')).toHaveText('$16.50');

    await page.getByLabel('Quantity for Notebook').fill('3');
    await expect(page.getByTestId('line-total-notebook')).toHaveText('$37.50');
    await expect(page.getByTestId('order-total')).toHaveText('$41.50');

    await page.getByRole('button', { name: 'Increase quantity of Pen Set' }).click();
    await expect(page.getByLabel('Quantity for Pen Set')).toHaveValue('2');
    await expect(page.getByTestId('line-total-pen-set')).toHaveText('$8.00');
    await expect(page.getByTestId('order-total')).toHaveText('$45.50');

    await page.getByLabel('Quantity for Notebook').fill('4');
    await expect(page.getByTestId('line-total-notebook')).toHaveText('$50.00');
    await expect(page.getByTestId('order-total')).toHaveText('$58.00');

    await page.getByRole('button', { name: 'Remove Notebook' }).click();
    await expect(page.getByTestId('row-notebook')).toHaveCount(0);
    await expect(page.getByTestId('order-total')).toHaveText('$8.00');

    await page.screenshot({ path: 'evidence/automated/03-quantity-totals.png' });
  });
});
