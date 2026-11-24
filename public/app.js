(function () {
  'use strict';

  // ---- Data ---------------------------------------------------------------
  // Two synthetic products. Prices are integer cents so totals stay exact.
  var PRODUCTS = [
    { id: 'notebook', name: 'Notebook', priceCents: 1250 },
    { id: 'pen-set', name: 'Pen Set', priceCents: 400 }
  ];
  var MAX_QTY = 99;

  // ---- State --------------------------------------------------------------
  // Each cart line: { id, qty (last valid quantity), invalid (typed value is not 1..99) }
  var cart = [];
  var attempted = false; // after the first failed/attempted submit, errors update live
  var placed = false;    // once true, the order can never be submitted again

  // ---- Elements -----------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var els = {
    products: $('products'),
    shop: $('shop'),
    form: $('checkout-form'),
    emptyCart: $('empty-cart'),
    table: $('cart-table'),
    body: $('cart-body'),
    cartError: $('cart-error'),
    total: $('order-total'),
    name: $('customer-name'),
    nameError: $('name-error'),
    place: $('place-order'),
    confirmation: $('confirmation'),
    confirmHeading: $('confirmation-heading'),
    confirmName: $('confirm-name'),
    confirmRef: $('confirm-ref'),
    confirmItems: $('confirm-items'),
    confirmTotal: $('confirm-total'),
    newOrder: $('new-order')
  };

  var rows = {}; // product id -> { tr, input, minus, plus, lineTotal }

  // ---- Helpers ------------------------------------------------------------
  function product(id) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
  }
  function line(id) {
    for (var i = 0; i < cart.length; i++) if (cart[i].id === id) return cart[i];
  }
  function money(cents) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  }
  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function makeReference() {
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    var out = 'ORD-';
    for (var i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
    return out;
  }
  function hasInvalid() {
    return cart.some(function (l) { return l.invalid; });
  }
  function orderTotalCents() {
    return cart.reduce(function (sum, l) { return sum + product(l.id).priceCents * l.qty; }, 0);
  }

  // ---- Rendering ----------------------------------------------------------
  function renderProducts() {
    PRODUCTS.forEach(function (p) {
      var li = el('li', { 'data-testid': 'product-' + p.id });
      li.appendChild(el('span', { 'class': 'name' }, p.name));
      li.appendChild(el('span', { 'class': 'price' }, money(p.priceCents)));
      var btn = el('button', { type: 'button' }, 'Add ' + p.name + ' to cart');
      btn.addEventListener('click', function () { addToCart(p.id); });
      li.appendChild(btn);
      els.products.appendChild(li);
    });
  }

  function buildRow(l) {
    var p = product(l.id);
    var tr = el('tr', { 'data-testid': 'row-' + p.id });
    tr.appendChild(el('td', {}, p.name));
    tr.appendChild(el('td', {}, money(p.priceCents)));

    var qtyCell = el('td');
    var wrap = el('span', { 'class': 'qty' });
    var minus = el('button', { type: 'button', 'aria-label': 'Decrease quantity of ' + p.name }, '−');
    var input = el('input', {
      type: 'number', min: '1', max: String(MAX_QTY), step: '1', inputmode: 'numeric',
      'aria-label': 'Quantity for ' + p.name, 'data-testid': 'qty-' + p.id
    });
    var plus = el('button', { type: 'button', 'aria-label': 'Increase quantity of ' + p.name }, '+');
    input.value = String(l.qty);
    wrap.appendChild(minus); wrap.appendChild(input); wrap.appendChild(plus);
    qtyCell.appendChild(wrap);
    tr.appendChild(qtyCell);

    var lineTotal = el('td', { 'data-testid': 'line-total-' + p.id });
    tr.appendChild(lineTotal);

    var removeCell = el('td');
    var remove = el('button', { type: 'button' }, 'Remove');
    remove.setAttribute('aria-label', 'Remove ' + p.name);
    removeCell.appendChild(remove);
    tr.appendChild(removeCell);

    minus.addEventListener('click', function () { stepQty(l.id, -1); });
    plus.addEventListener('click', function () { stepQty(l.id, 1); });
    remove.addEventListener('click', function () { removeFromCart(l.id); });
    input.addEventListener('input', function () { typeQty(l.id, input.value); });
    input.addEventListener('change', function () {
      // Tidy up values like "007" once the customer leaves the field.
      if (!l.invalid) input.value = String(l.qty);
    });

    rows[l.id] = { tr: tr, input: input, minus: minus, plus: plus, lineTotal: lineTotal };
    return tr;
  }

  // Updates every number the customer sees from the cart state.
  function updateTotals() {
    cart.forEach(function (l) {
      var r = rows[l.id];
      var p = product(l.id);
      r.lineTotal.textContent = l.invalid ? '—' : money(p.priceCents * l.qty);
      r.minus.disabled = !l.invalid && l.qty <= 1;
      r.plus.disabled = !l.invalid && l.qty >= MAX_QTY;
      r.input.setAttribute('aria-invalid', l.invalid ? 'true' : 'false');
    });
    els.total.textContent = hasInvalid() ? '—' : money(orderTotalCents());
  }

  function renderCartStructure() {
    els.body.textContent = '';
    cart.forEach(function (l) { els.body.appendChild(rows[l.id].tr); });
    var empty = cart.length === 0;
    els.emptyCart.hidden = !empty;
    els.table.hidden = empty;
    updateTotals();
    refreshErrors();
  }

  // ---- Cart actions -------------------------------------------------------
  function addToCart(id) {
    if (placed) return;
    var existing = line(id);
    if (existing) {
      existing.qty = Math.min(MAX_QTY, existing.qty + 1);
      existing.invalid = false;
      rows[id].input.value = String(existing.qty);
      updateTotals();
      refreshErrors();
      return;
    }
    var l = { id: id, qty: 1, invalid: false };
    cart.push(l);
    buildRow(l);
    renderCartStructure();
  }

  function removeFromCart(id) {
    if (placed) return;
    cart = cart.filter(function (l) { return l.id !== id; });
    delete rows[id];
    renderCartStructure();
  }

  function stepQty(id, delta) {
    if (placed) return;
    var l = line(id);
    l.qty = Math.max(1, Math.min(MAX_QTY, l.qty + delta));
    l.invalid = false;
    rows[id].input.value = String(l.qty);
    updateTotals();
    refreshErrors();
  }

  function typeQty(id, raw) {
    if (placed) return;
    var l = line(id);
    var n = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
    if (n >= 1 && n <= MAX_QTY) {
      l.qty = n;
      l.invalid = false;
    } else {
      l.invalid = true; // keep what was typed; totals show an em dash and checkout is blocked
    }
    updateTotals();
    refreshErrors();
  }

  // ---- Validation ---------------------------------------------------------
  function validate() {
    var errs = {};
    if (cart.length === 0) {
      errs.cart = 'Your cart is empty. Add at least one item before placing your order.';
    } else if (hasInvalid()) {
      var names = cart.filter(function (l) { return l.invalid; })
        .map(function (l) { return product(l.id).name; });
      errs.cart = 'Enter a quantity from 1 to ' + MAX_QTY + ' for: ' + names.join(', ') + '.';
    }
    if (!els.name.value.trim()) errs.name = 'Please enter your full name.';
    return errs;
  }

  function showErrors(errs) {
    els.cartError.textContent = errs.cart || '';
    els.cartError.hidden = !errs.cart;
    els.nameError.textContent = errs.name || '';
    els.nameError.hidden = !errs.name;
    els.name.setAttribute('aria-invalid', errs.name ? 'true' : 'false');
  }

  function refreshErrors() {
    if (attempted) showErrors(validate());
  }

  // ---- Submit -------------------------------------------------------------
  function placeOrder() {
    placed = true;
    els.place.disabled = true;

    var name = els.name.value.trim();
    els.confirmName.textContent = name;
    els.confirmRef.textContent = makeReference();
    els.confirmItems.textContent = '';
    cart.forEach(function (l) {
      var p = product(l.id);
      els.confirmItems.appendChild(
        el('li', {}, l.qty + ' × ' + p.name + ' — ' + money(p.priceCents * l.qty))
      );
    });
    els.confirmTotal.textContent = money(orderTotalCents());

    els.shop.hidden = true;
    els.confirmation.hidden = false;
    els.confirmHeading.focus();
  }

  els.form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (placed) return; // second submit of the same order is ignored

    attempted = true;
    var errs = validate();
    showErrors(errs);
    if (errs.cart || errs.name) {
      if (errs.cart) {
        var bad = cart.filter(function (l) { return l.invalid; })[0];
        if (bad) rows[bad.id].input.focus();
        else els.products.querySelector('button').focus();
      } else {
        els.name.focus();
      }
      return;
    }
    placeOrder();
  });

  els.name.addEventListener('input', refreshErrors);

  els.newOrder.addEventListener('click', function () {
    cart = [];
    rows = {};
    attempted = false;
    placed = false;
    els.name.value = '';
    els.place.disabled = false;
    showErrors({});
    els.confirmation.hidden = true;
    els.shop.hidden = false;
    renderCartStructure();
    els.products.querySelector('button').focus();
  });

  // ---- Init ---------------------------------------------------------------
  renderProducts();
  renderCartStructure();
})();
