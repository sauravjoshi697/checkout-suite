const { expect } = require('@playwright/test');

// Every test gets a brand-new browser context (Playwright default), so there is no
// shared cookie/storage state. This also asserts the page really is in its clean
// starting state, so a test can never silently start from leftovers.
async function openCleanCheckout(page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Mini Checkout' })).toBeVisible();
  await expect(page.getByTestId('empty-cart')).toBeVisible();
  await expect(page.getByTestId('order-total')).toHaveText('$0.00');
  await expect(page.getByLabel('Full name')).toHaveValue('');
  await expect(page.getByTestId('confirmation')).toBeHidden();
}

const addProduct = (page, name) => page.getByRole('button', { name: `Add ${name} to cart` }).click();
const nameField = (page) => page.getByLabel('Full name');
const placeOrder = (page) => page.getByRole('button', { name: 'Place Order' });

module.exports = { openCleanCheckout, addProduct, nameField, placeOrder };
