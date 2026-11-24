// Supplementary regression checks for the risks in TEST_PLAN.md that go beyond the
// three required checks (empty cart, double submit, bad quantities).
const { test, expect } = require('@playwright/test');
const { openCleanCheckout, addProduct, nameField, placeOrder } = require('./helpers');

test.describe('Regression checks', () => {
  test.beforeEach(async ({ page }) => {
    await openCleanCheckout(page);
  });

  test('empty cart blocks checkout and preserves the typed name', async ({ page }) => {
    await nameField(page).fill('Asha Verma');
    await placeOrder(page).click();

    await expect(page.getByTestId('cart-error')).toHaveText(
      'Your cart is empty. Add at least one item before placing your order.'
    );
    await expect(page.getByTestId('confirmation')).toBeHidden();
    await expect(nameField(page)).toHaveValue('Asha Verma');
  });

  test('empty cart and blank name show both problems at once', async ({ page }) => {
    await placeOrder(page).click();
    await expect(page.getByTestId('cart-error')).toBeVisible();
    await expect(page.getByTestId('name-error')).toBeVisible();
    await expect(page.getByTestId('confirmation')).toBeHidden();
  });

  test('double-clicking Place Order produces one confirmation', async ({ page }) => {
    await addProduct(page, 'Notebook');
    await nameField(page).fill('Asha Verma');

    await placeOrder(page).dblclick();

    await expect(page.getByRole('heading', { name: 'Order confirmed' })).toHaveCount(1);
    await expect(page.getByTestId('confirmation-ref')).toHaveCount(1);
    await expect(page.getByTestId('confirmation-ref')).toHaveText(/^ORD-[A-Z0-9]{6}$/);
  });

  test('re-submitting after the order is placed keeps the same single confirmation', async ({ page }) => {
    await addProduct(page, 'Notebook');
    await nameField(page).fill('Asha Verma');
    await placeOrder(page).click();

    const ref = await page.getByTestId('confirmation-ref').textContent();

    // Simulate very fast repeat submits (bypassing the now-hidden button).
    await page.evaluate(() => {
      const btn = document.getElementById('place-order');
      btn.click();
      btn.click();
      document.getElementById('checkout-form').requestSubmit();
    });

    await expect(page.getByRole('heading', { name: 'Order confirmed' })).toHaveCount(1);
    await expect(page.getByTestId('confirmation-ref')).toHaveText(ref);
  });

  test('an invalid typed quantity blocks checkout until fixed', async ({ page }) => {
    await addProduct(page, 'Notebook');
    await nameField(page).fill('Asha Verma');

    for (const bad of ['0', '-2', '1.5', '100', '']) {
      await page.getByLabel('Quantity for Notebook').fill(bad);
      await placeOrder(page).click();
      await expect(page.getByTestId('cart-error')).toHaveText('Enter a quantity from 1 to 99 for: Notebook.');
      await expect(page.getByTestId('order-total')).toHaveText('—');
      await expect(page.getByTestId('confirmation')).toBeHidden();
    }

    await page.getByLabel('Quantity for Notebook').fill('2');
    await expect(page.getByTestId('cart-error')).toBeHidden();
    await expect(page.getByTestId('order-total')).toHaveText('$25.00');
    await placeOrder(page).click();
    await expect(page.getByTestId('confirmation')).toBeVisible();
  });

  test('Start new order returns to a clean state', async ({ page }) => {
    await addProduct(page, 'Pen Set');
    await nameField(page).fill('Asha Verma');
    await placeOrder(page).click();
    await page.getByRole('button', { name: 'Start new order' }).click();

    await expect(page.getByTestId('confirmation')).toBeHidden();
    await expect(page.getByTestId('empty-cart')).toBeVisible();
    await expect(page.getByTestId('order-total')).toHaveText('$0.00');
    await expect(nameField(page)).toHaveValue('');
    await expect(placeOrder(page)).toBeEnabled();
  });
});
