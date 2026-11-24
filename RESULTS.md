# Results

Run on 2026-11-23, Google Chrome for Testing 153.0.8010.12 (headless), Playwright 1.65.1, Node 22, Linux.

## Summary

- **Automated:** 9 of 9 tests passed (3 required checks + 6 regression checks), 6.5 s total. Raw output: `results/test-output.txt`; machine-readable: `results/results.json`.
- **Manual/exploratory:** M1, M2 and M3 all behaved as expected.
- **Defects found: none.** No defect has been invented to fill the brief. See "Limits" for what this does and does not show.

## Automated results

| ID | Test | Result |
|----|------|--------|
| A1 | Successful checkout produces a confirmation with a reference | Pass |
| A2 | Missing required field blocks checkout and keeps the cart | Pass |
| A3 | Quantity change updates line totals and order total exactly | Pass |
| A4 | Empty cart blocks checkout, keeps typed name | Pass |
| A5 | Empty cart + blank name show both problems | Pass |
| A6 | Mouse double-click gives one confirmation | Pass |
| A7 | Fast repeat submits keep one confirmation and the same reference | Pass |
| A8 | Invalid typed quantity blocks checkout until fixed | Pass |
| A9 | "Start new order" returns to clean state | Pass |

Evidence: `evidence/automated/01-success-confirmation.png`, `02-missing-name-blocked.png`, `03-quantity-totals.png`.

**Independent reproduction:** the suite was also run on the submitter's own computer on 24/11/2026 (2:43 pm). The Playwright HTML report showed 9 passed, 0 failed, 0 flaky, 0 skipped, total time 5.8 s. Screenshot: `evidence/automated/04-report-reproduced-on-user-machine.png`.

## Manual / exploratory results

These were run by `manual/explore.js`, which drives Chrome with real mouse and keyboard input and records what the page showed. They were executed by script, not by a person clicking, so the by-hand steps in the README are included for anyone who wants to repeat them. Recorded output: `evidence/manual/explore-output.txt` and `observations.json`.

### M1: Empty cart

| Step | Observed |
|------|----------|
| M1a: empty cart, name "Asha Verma", Place Order | No confirmation. Message: "Your cart is empty. Add at least one item before placing your order." Name still "Asha Verma". Total `$0.00`. |
| M1b: empty cart, blank name, Place Order | No confirmation. Both messages shown (cart, and "Please enter your full name."). Name field outlined in red. |
| M1c: add Pen Set afterwards | Cart message cleared immediately; total `$4.00`; name kept. |
| M1d: remove Pen Set | Cart-empty message returned; total `$0.00`. |

Verdict: as expected. Screenshots: `M1a-empty-cart-with-name.png`, `M1b-empty-cart-blank-name.png`.

### M2: Rapid clicking Place Order

Three mouse clicks in a row at the same spot (two separate down/up pairs, then a `clickCount: 3` click). Result: `Order confirmed` heading count = 1, one reference (`ORD-MQ2PCU`), total `$12.50`. Verdict: as expected. Screenshot: `M2a-rapid-triple-click.png`.

Side note, not logged as a defect: in that screenshot the "Start new order" label shows a text-selection highlight. This is the browser's default triple-click selection behaviour; the order and confirmation were unaffected.

### M3: Enter pressed repeatedly in the name field

First Enter produced one confirmation (`ORD-J7T7WU`). Two more Enter presses changed nothing: still one confirmation, same reference. Verdict: as expected. Screenshot: `M3-enter-key-repeat.png`.

## Do the tests catch real breakage?

To check the assertions are not vacuous, the app was temporarily modified and the suite re-run (the original was restored and diffed afterwards; the final run above is on the original code).

| Deliberate break | Tests that failed |
|------------------|-------------------|
| Removed the "already placed" guard and the button disabling | A7 only (1 failed, 8 passed) |
| Order total wrong for quantities above 2 | A2 and A3 (2 failed, 7 passed) |
| Name no longer required | A2 and A5 (2 failed, 7 passed) |

Finding about the suite itself: in the first break, **A6 (the mouse double-click) still passed**. The page hides the form as soon as the first click succeeds, so a second real click has nothing to submit, which makes A6 a weak guard on its own. A7 is the test that actually protects against double submission, because it resubmits the form directly. Both are kept: A6 reflects what a customer does, A7 catches the logic regression.

## Limits

- Chrome only; no Firefox/Safari or mobile-device runs.
- With no backend, "two confirmations" means two confirmation panels or two references on screen. A real system would also need server-side idempotency, which this exercise does not have.
- Quantity is capped at 99 by design; the brief did not specify a limit.
- Passing tests show the listed risks are covered, not that no defects exist.
