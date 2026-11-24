// Exploratory session for the two manual scenarios in the brief (empty cart, rapid
// double-click). It drives a real Chrome window/process with real mouse and keyboard
// input, records what the page shows, and saves screenshots + observations.json.
// Run:  CHROME_PATH=/usr/bin/google-chrome NO_SANDBOX=1 node manual/explore.js
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const OUT = path.join(__dirname, '..', 'evidence', 'manual');
const URL = 'http://127.0.0.1:4173/';
fs.mkdirSync(OUT, { recursive: true });

const observations = [];
const note = (id, step, observed) => { observations.push({ id, step, observed }); console.log(`[${id}] ${step}\n    -> ${JSON.stringify(observed)}`); };

async function snapshot(page) {
  return page.evaluate(() => {
    const vis = (id) => { const e = document.getElementById(id); return !!e && !e.hidden && e.offsetParent !== null; };
    const txt = (id) => (document.getElementById(id)?.textContent || '').trim();
    return {
      confirmationVisible: vis('confirmation'),
      confirmationHeadingCount: [...document.querySelectorAll('h2')].filter((h) => h.textContent.trim() === 'Order confirmed' && h.offsetParent !== null).length,
      reference: txt('confirm-ref'),
      cartError: vis('cart-error') ? txt('cart-error') : null,
      nameError: vis('name-error') ? txt('name-error') : null,
      nameValue: document.getElementById('customer-name').value,
      orderTotal: txt('order-total')
    };
  });
}

(async () => {
  const server = spawn('node', [path.join(__dirname, '..', 'server.js')], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 800));
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: process.env.NO_SANDBOX ? ['--no-sandbox'] : []
  });
  try {
    // ---- M1: empty cart ----------------------------------------------------
    let page = await (await browser.newContext()).newPage();
    await page.goto(URL);
    await page.getByLabel('Full name').fill('Asha Verma');
    await page.getByRole('button', { name: 'Place Order' }).click();
    note('M1a', 'Empty cart, name "Asha Verma", click Place Order', await snapshot(page));
    await page.screenshot({ path: path.join(OUT, 'M1a-empty-cart-with-name.png') });

    await page.getByLabel('Full name').fill('');
    await page.getByRole('button', { name: 'Place Order' }).click();
    note('M1b', 'Empty cart, blank name, click Place Order', await snapshot(page));
    await page.screenshot({ path: path.join(OUT, 'M1b-empty-cart-blank-name.png') });

    await page.getByLabel('Full name').fill('Asha Verma');
    await page.getByRole('button', { name: 'Add Pen Set to cart' }).click();
    note('M1c', 'Add Pen Set after the error (errors should clear live)', await snapshot(page));
    await page.getByRole('button', { name: 'Remove Pen Set' }).click();
    note('M1d', 'Remove the only item again (cart-empty error should return)', await snapshot(page));
    await page.context().close();

    // ---- M2: rapid double-click with the mouse -----------------------------
    page = await (await browser.newContext()).newPage();
    await page.goto(URL);
    await page.getByRole('button', { name: 'Add Notebook to cart' }).click();
    await page.getByLabel('Full name').fill('Asha Verma');
    const box = await page.getByRole('button', { name: 'Place Order' }).boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down(); await page.mouse.up();            // click 1
    await page.mouse.down(); await page.mouse.up();            // click 2 (no delay)
    await page.mouse.click(x, y, { clickCount: 3 });          // click 3 on the same spot
    note('M2a', 'Add Notebook, name, then 3 rapid mouse clicks on Place Order', await snapshot(page));
    await page.screenshot({ path: path.join(OUT, 'M2a-rapid-triple-click.png') });
    await page.context().close();

    // ---- M3: Enter key pressed twice quickly --------------------------------
    page = await (await browser.newContext()).newPage();
    await page.goto(URL);
    await page.getByRole('button', { name: 'Add Notebook to cart' }).click();
    await page.getByLabel('Full name').fill('Asha Verma');
    await page.keyboard.press('Enter');
    const afterFirst = await snapshot(page);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    const afterRepeat = await snapshot(page);
    note('M3', 'Press Enter in the name field, then Enter twice more', {
      afterFirst, afterRepeat, referenceUnchanged: afterFirst.reference === afterRepeat.reference
    });
    await page.screenshot({ path: path.join(OUT, 'M3-enter-key-repeat.png') });
    await page.context().close();
  } finally {
    await browser.close();
    server.kill();
    fs.writeFileSync(path.join(OUT, 'observations.json'), JSON.stringify(observations, null, 2));
  }
})().catch((e) => { console.error(e); process.exit(1); });
