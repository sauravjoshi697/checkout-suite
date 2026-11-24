# Mini Checkout and Browser Test Suite

A single-page checkout (plain HTML/CSS/JS, no backend) plus a Playwright browser test suite, a test plan, and recorded results.

```
public/            the checkout page (index.html, app.js, styles.css)
server.js          tiny static server, no dependencies
tests/             Playwright tests (checkout.spec.js = the 3 required checks)
manual/explore.js  scripted exploratory session for the empty-cart and double-click scenarios
evidence/          screenshots and recorded observations
TEST_PLAN.md       risks and test cases
RESULTS.md         what was run and what happened
```

## What the page does

- Two products with fixed prices: Notebook $12.50 and Pen Set $4.00.
- Add to cart, remove, `+` / `−` buttons, or type a quantity (whole numbers 1–99). Line totals and the order total update immediately.
- One required field: **Full name**.
- **Place Order** is blocked when the cart is empty, the name is blank, or a typed quantity is invalid. Messages appear next to the problem and everything the customer entered is kept.
- On success the order summary and a reference (`ORD-` plus 6 characters) replace the form. The order can only be submitted once; "Start new order" resets everything.

## Run the app

Requires Node 18+.

```bash
node server.js
# open http://127.0.0.1:4173
```

(`PORT=5000 node server.js` to change the port. The page also works if you open `public/index.html` directly.)

## Run the automated tests

```bash
npm install
npx playwright install chromium     # one-time browser download
npm test
```

`npm test` starts the server itself (or reuses one already running on port 4173) and runs 9 tests: the 3 required checks in `tests/checkout.spec.js` and 6 supplementary regression checks. An HTML report is written to `results/html-report/` (`npx playwright show-report results/html-report`).

If you already have Chrome and don't want to download a browser, or you are running as root in a container:

```bash
CHROME_PATH=/usr/bin/google-chrome NO_SANDBOX=1 npm test
```

## Browser-test steps you can do by hand

Start the app, open `http://127.0.0.1:4173`, and follow these. Expected results are in `TEST_PLAN.md`.

**Empty cart (M1)**
1. With nothing in the cart, type `Asha Verma` in Full name and click **Place Order**.
2. Expect: red message "Your cart is empty. Add at least one item before placing your order."; no confirmation; the name is still in the field.
3. Clear the name and click **Place Order** again. Expect both the cart message and "Please enter your full name."
4. Add an item: the cart message should disappear. Remove it: the message should come back.

**Rapid double-click (M2)**
1. Add Notebook, type a name, then click **Place Order** twice (or three times) as fast as you can.
2. Expect: one "Order confirmed" panel and one reference.

**Repeated Enter (M3)**
1. Add Notebook, click into the name field, type a name, and press Enter, then Enter again twice.
2. Expect: one confirmation; the reference does not change.

## Run the scripted exploratory session

`manual/explore.js` performs M1–M3 with real mouse and keyboard input in Chrome, prints what the page shows after each step, and writes screenshots and `observations.json` to `evidence/manual/`:

```bash
node manual/explore.js          # or: CHROME_PATH=... NO_SANDBOX=1 node manual/explore.js
```

## Notes on the tests

- Each test starts in a fresh browser context and first asserts the page is in its clean state (empty cart, `$0.00`, blank name, no confirmation).
- Assertions are on visible text, values and visibility using Playwright's auto-waiting `expect`; there are no fixed waits.
- Money is held as integer cents in the app, so totals are exact.
