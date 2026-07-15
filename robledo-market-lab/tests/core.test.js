import test from "node:test";
import assert from "node:assert/strict";
import {
  COUPON_CODE,
  DELIVERY_FEE,
  calculateTotals,
  validateCheckout
} from "../js/core.js";

test("calculateTotals calcula subtotal sin descuento ni domicilio", () => {
  const result = calculateTotals([
    { price: 10000, quantity: 2 },
    { price: 5000, quantity: 1 }
  ]);

  assert.deepEqual(result, {
    subtotal: 25000,
    discount: 0,
    deliveryFee: 0,
    total: 25000
  });
});

test("calculateTotals aplica cupón y domicilio", () => {
  const result = calculateTotals(
    [{ price: 100000, quantity: 1 }],
    COUPON_CODE,
    "delivery"
  );

  assert.equal(result.discount, 10000);
  assert.equal(result.deliveryFee, DELIVERY_FEE);
  assert.equal(result.total, 96000);
});

test("validateCheckout detecta errores principales", () => {
  const errors = validateCheckout({
    cartItems: [],
    name: "A",
    email: "correo-invalido",
    deliveryMethod: "delivery",
    address: "corta",
    acceptedTerms: false
  });

  assert.ok(errors.cart);
  assert.ok(errors.name);
  assert.ok(errors.email);
  assert.ok(errors.address);
  assert.ok(errors.terms);
});

test("validateCheckout acepta una orden válida", () => {
  const errors = validateCheckout({
    cartItems: [{ id: "x", price: 1000, quantity: 1 }],
    name: "Ana Pérez",
    email: "ana@example.com",
    deliveryMethod: "pickup",
    address: "",
    acceptedTerms: true
  });

  assert.deepEqual(errors, {});
});
