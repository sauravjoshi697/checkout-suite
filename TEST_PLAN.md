# Test Plan: Mini Checkout

## Scope

A single-page checkout: two synthetic products (Notebook $12.50, Pen Set $4.00), add/remove items, quantity changes, live line and order totals, one required field (Full name), and an order confirmation with a reference. No backend, database, payments or external services.

Out of scope: real payment, persistence across reloads, accessibility audit beyond basic labelling, cross-browser coverage (Chrome only).

## Risks, in priority order

| # | Risk | Why it matters | Covered by |
|---|------|----------------|------------|
| R1 | Wrong total shown (rounding, stale total after a quantity change, wrong line total) | Customer pays or believes they pay the wrong amount | Automated #3, regression "invalid quantity" |
| R2 | An order is placed that should not be (empty cart, blank name, invalid quantity) | Bad or unfulfillable orders | Automated #2, regression "empty cart" ×2, regression "invalid quantity" |
| R3 | Duplicate order or confirmation from a double-click or repeated Enter | Customer charged or shipped twice, or confused by two references | Regression "double-click", regression "re-submit", **manual M2, M3** |
| R4 | A successful order gives no clear confirmation or no reference | Customer does not know it worked and orders again | Automated #1 |
| R5 | Validation wipes what the customer typed, or the message is unclear | Frustration, abandoned checkout | Automated #2, regression "empty cart" (name preserved), manual M1 |
| R6 | Stale state after an order ("Start new order" leaves old items or name) | Next order contains leftovers | Regression "Start new order" |

## Test cases

### Automated (Playwright, `tests/`)

The three required checks (`tests/checkout.spec.js`):

| ID | Check | Key assertions (on what the customer sees) |
|----|-------|--------------------------------------------|
| A1 | Successful checkout produces a confirmation | Heading "Order confirmed" visible; reference matches `ORD-XXXXXX`; name, line items and total ($16.50) shown; no error messages |
| A2 | Missing field blocks checkout | Exact message "Please enter your full name."; field marked `aria-invalid`; confirmation hidden; quantity (3) and total ($37.50) preserved; whitespace-only name also blocked; fixing the name clears the message and the order then succeeds |
| A3 | Quantity change updates the exact total | Notebook ×3 → $37.50 / $41.50; Pen Set ×2 → $8.00 / $45.50; Notebook ×4 → $50.00 / $58.00; removing Notebook → $8.00 |

Supplementary regression checks (`tests/regression.spec.js`):

| ID | Check |
|----|-------|
| A4 | Empty cart blocks checkout, shows the empty-cart message, keeps the typed name |
| A5 | Empty cart and blank name show both messages at once |
| A6 | Real mouse double-click on Place Order gives exactly one confirmation |
| A7 | Fast repeat submits after the order is placed (scripted clicks plus `requestSubmit`) leave one confirmation with an unchanged reference |
| A8 | Invalid typed quantities (`0`, `-2`, `1.5`, `100`, empty) block checkout, show "—" totals and a clear message; a valid quantity unblocks |
| A9 | "Start new order" returns to an empty cart, `$0.00`, blank name, enabled button |

Isolation: every test gets a fresh browser context (no shared storage) and begins with `openCleanCheckout`, which asserts the empty cart, `$0.00`, blank name and no confirmation before doing anything. Assertions use Playwright's auto-retrying `expect`, so there are no fixed sleeps.

### Manual / exploratory (`manual/explore.js`, steps in README)

| ID | Scenario | Expected |
|----|----------|----------|
| M1 | Empty cart: click Place Order with a name, then with a blank name; add and remove an item afterwards | No confirmation; cart-empty message (plus name message when blank); typed name kept; message clears when an item is added and returns when the cart is emptied again |
| M2 | Rapid double/triple mouse click on Place Order | Exactly one confirmation, one reference |
| M3 | Press Enter in the name field, then Enter twice more | Exactly one confirmation; reference does not change |

## Pass criteria

All required checks pass; no order can be placed with an empty cart, blank name or invalid quantity; no scenario yields more than one confirmation or reference. Any defect found is recorded in `RESULTS.md` with steps, expected vs. actual, and evidence.

## Checking the checks

To confirm the assertions can actually fail, the app was deliberately broken three ways (see `RESULTS.md`) and the suite was confirmed to go red each time, then restored.
