export const COUPON_CODE = "ROBLEDO10";
export const COUPON_RATE = 0.10;
export const DELIVERY_FEE = 6000;

export function formatCurrency(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

export function normalizeText(value) {
  return String(value ?? "").trim().toLocaleLowerCase("es");
}

export function calculateTotals(items, couponCode = "", deliveryMethod = "pickup") {
  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const normalizedCoupon = String(couponCode).trim().toUpperCase();
  const discount = normalizedCoupon === COUPON_CODE
    ? Math.round(subtotal * COUPON_RATE)
    : 0;

  const deliveryFee = deliveryMethod === "delivery" && items.length > 0
    ? DELIVERY_FEE
    : 0;

  return {
    subtotal,
    discount,
    deliveryFee,
    total: Math.max(0, subtotal - discount + deliveryFee)
  };
}

export function validateCheckout({ cartItems, name, email, deliveryMethod, address, acceptedTerms }) {
  const errors = {};

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    errors.cart = "Agrega al menos un producto antes de finalizar.";
  }

  if (String(name).trim().length < 3) {
    errors.name = "Escribe un nombre de al menos 3 caracteres.";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(String(email).trim())) {
    errors.email = "Escribe un correo válido.";
  }

  if (deliveryMethod === "delivery" && String(address).trim().length < 8) {
    errors.address = "Escribe una dirección de al menos 8 caracteres.";
  }

  if (!acceptedTerms) {
    errors.terms = "Debes confirmar la revisión de la orden.";
  }

  return errors;
}

export function generateOrderId(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const time = `${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}`;
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RML-${year}${month}${day}-${time}-${random}`;
}

export function createOrder({ cartItems, customer, couponCode, deliveryMethod, address }) {
  const totals = calculateTotals(cartItems, couponCode, deliveryMethod);
  const now = new Date();

  return {
    id: generateOrderId(now),
    createdAt: now.toISOString(),
    customer: {
      name: String(customer.name).trim(),
      email: String(customer.email).trim()
    },
    delivery: {
      method: deliveryMethod,
      address: deliveryMethod === "delivery" ? String(address).trim() : "Recoger en el aula"
    },
    couponCode: String(couponCode).trim().toUpperCase(),
    items: cartItems.map((item) => ({ ...item })),
    totals
  };
}
