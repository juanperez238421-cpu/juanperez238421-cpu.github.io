import { PRODUCTS, CATEGORIES } from "./products.js";
import { CartStore } from "./cart-store.js";
import {
  COUPON_CODE,
  calculateTotals,
  createOrder,
  formatCurrency,
  normalizeText,
  validateCheckout
} from "./core.js";
import { clearAppStorage, readStorage, writeStorage } from "./storage.js";

const ORDER_STORAGE_KEY = "last-order";
const FORM_STORAGE_KEY = "checkout-form";
const COUPON_STORAGE_KEY = "coupon";

const cart = new CartStore();
let activeCoupon = readStorage(COUPON_STORAGE_KEY, "");
let toastTimer;

const elements = {
  catalogGrid: document.querySelector("#catalogGrid"),
  emptyCatalogMessage: document.querySelector("#emptyCatalogMessage"),
  productCount: document.querySelector("#productCount"),
  searchInput: document.querySelector("#searchInput"),
  categorySelect: document.querySelector("#categorySelect"),
  cartItems: document.querySelector("#cartItems"),
  emptyCartMessage: document.querySelector("#emptyCartMessage"),
  cartCount: document.querySelector("#cartCount"),
  subtotalValue: document.querySelector("#subtotalValue"),
  discountValue: document.querySelector("#discountValue"),
  deliveryValue: document.querySelector("#deliveryValue"),
  totalValue: document.querySelector("#totalValue"),
  couponInput: document.querySelector("#couponInput"),
  applyCouponButton: document.querySelector("#applyCouponButton"),
  couponMessage: document.querySelector("#couponMessage"),
  checkoutForm: document.querySelector("#checkoutForm"),
  customerName: document.querySelector("#customerName"),
  customerEmail: document.querySelector("#customerEmail"),
  addressGroup: document.querySelector("#addressGroup"),
  deliveryAddress: document.querySelector("#deliveryAddress"),
  termsInput: document.querySelector("#termsInput"),
  customerNameError: document.querySelector("#customerNameError"),
  customerEmailError: document.querySelector("#customerEmailError"),
  deliveryAddressError: document.querySelector("#deliveryAddressError"),
  termsError: document.querySelector("#termsError"),
  formMessage: document.querySelector("#formMessage"),
  clearCartButton: document.querySelector("#clearCartButton"),
  resetAppButton: document.querySelector("#resetAppButton"),
  toast: document.querySelector("#toast")
};

initializeApplication();

function initializeApplication() {
  populateCategoryFilter();
  restoreFormState();
  elements.couponInput.value = activeCoupon;
  updateCouponMessage();
  bindEvents();
  renderCatalog();
  renderCart();
  cart.subscribe(renderCart);
}

function bindEvents() {
  elements.searchInput.addEventListener("input", renderCatalog);
  elements.categorySelect.addEventListener("change", renderCatalog);
  elements.catalogGrid.addEventListener("click", handleCatalogClick);
  elements.cartItems.addEventListener("click", handleCartClick);
  elements.applyCouponButton.addEventListener("click", applyCoupon);
  elements.checkoutForm.addEventListener("submit", handleCheckout);
  elements.checkoutForm.addEventListener("input", saveFormState);
  elements.checkoutForm.addEventListener("change", handleFormChange);
  elements.clearCartButton.addEventListener("click", clearCartWithConfirmation);
  elements.resetAppButton.addEventListener("click", resetApplication);
}

function populateCategoryFilter() {
  CATEGORIES.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    elements.categorySelect.append(option);
  });
}

function getFilteredProducts() {
  const query = normalizeText(elements.searchInput.value);
  const category = elements.categorySelect.value;

  return PRODUCTS.filter((product) => {
    const matchesQuery = [product.name, product.category, product.description]
      .some((value) => normalizeText(value).includes(query));
    const matchesCategory = category === "all" || product.category === category;
    return matchesQuery && matchesCategory;
  });
}

function renderCatalog() {
  const filteredProducts = getFilteredProducts();
  elements.productCount.textContent = `${filteredProducts.length} producto${filteredProducts.length === 1 ? "" : "s"}`;
  elements.emptyCatalogMessage.hidden = filteredProducts.length > 0;

  elements.catalogGrid.innerHTML = filteredProducts.map((product) => {
    const lowStockClass = product.stock <= 5 ? "low" : "";
    return `
      <article class="product-card" data-product-id="${product.id}">
        <div class="product-icon" aria-hidden="true">${product.icon}</div>
        <p class="section-kicker">${product.category}</p>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="product-meta">
          <span class="product-price">${formatCurrency(product.price)}</span>
          <span class="stock-label ${lowStockClass}">${product.stock} disponibles</span>
        </div>
        <div class="product-actions">
          <label class="sr-only" for="quantity-${product.id}">Cantidad de ${product.name}</label>
          <input id="quantity-${product.id}" data-role="quantity" type="number" min="1" max="${product.stock}" value="1" inputmode="numeric">
          <button class="button button-primary" data-action="add" type="button">Agregar</button>
        </div>
      </article>
    `;
  }).join("");
}

function handleCatalogClick(event) {
  const button = event.target.closest("[data-action='add']");
  if (!button) return;

  const card = button.closest("[data-product-id]");
  const productId = card.dataset.productId;
  const quantityInput = card.querySelector("[data-role='quantity']");

  try {
    cart.add(productId, Number(quantityInput.value));
    quantityInput.value = "1";
    showToast("Producto agregado al carrito.");
  } catch (error) {
    showToast(error.message, true);
  }
}

function handleCartClick(event) {
  const actionButton = event.target.closest("[data-cart-action]");
  if (!actionButton) return;

  const item = actionButton.closest("[data-cart-id]");
  const productId = item.dataset.cartId;
  const action = actionButton.dataset.cartAction;

  try {
    if (action === "increase") cart.increase(productId);
    if (action === "decrease") cart.decrease(productId);
    if (action === "remove") cart.remove(productId);
  } catch (error) {
    showToast(error.message, true);
  }
}

function getDeliveryMethod() {
  return elements.checkoutForm.elements.deliveryMethod.value;
}

function renderCart() {
  const items = cart.items;
  const deliveryMethod = getDeliveryMethod();
  const totals = calculateTotals(items, activeCoupon, deliveryMethod);

  elements.cartCount.textContent = `${cart.itemCount} ítem${cart.itemCount === 1 ? "" : "s"}`;
  elements.emptyCartMessage.hidden = items.length > 0;
  elements.clearCartButton.disabled = items.length === 0;

  elements.cartItems.innerHTML = items.map((item) => `
    <article class="cart-item" data-cart-id="${item.id}">
      <div>
        <div class="cart-item-title">${item.name}</div>
        <p class="cart-item-subtitle">${formatCurrency(item.price)} por unidad · máximo ${item.stock}</p>
      </div>
      <strong class="cart-item-price">${formatCurrency(item.price * item.quantity)}</strong>
      <div class="cart-item-actions">
        <div class="quantity-control" aria-label="Cantidad de ${item.name}">
          <button data-cart-action="decrease" type="button" aria-label="Disminuir cantidad">−</button>
          <span>${item.quantity}</span>
          <button data-cart-action="increase" type="button" aria-label="Aumentar cantidad">+</button>
        </div>
        <button class="button button-danger" data-cart-action="remove" type="button">Eliminar</button>
      </div>
    </article>
  `).join("");

  elements.subtotalValue.textContent = formatCurrency(totals.subtotal);
  elements.discountValue.textContent = `-${formatCurrency(totals.discount)}`;
  elements.deliveryValue.textContent = formatCurrency(totals.deliveryFee);
  elements.totalValue.textContent = formatCurrency(totals.total);
}

function applyCoupon() {
  const enteredCode = elements.couponInput.value.trim().toUpperCase();

  if (!enteredCode) {
    activeCoupon = "";
    writeStorage(COUPON_STORAGE_KEY, activeCoupon);
    updateCouponMessage();
    renderCart();
    return;
  }

  if (enteredCode !== COUPON_CODE) {
    activeCoupon = "";
    writeStorage(COUPON_STORAGE_KEY, activeCoupon);
    updateCouponMessage("El cupón no es válido.", true);
    renderCart();
    return;
  }

  activeCoupon = enteredCode;
  writeStorage(COUPON_STORAGE_KEY, activeCoupon);
  updateCouponMessage("Cupón aplicado: 10% de descuento.");
  renderCart();
  showToast("Descuento aplicado correctamente.");
}

function updateCouponMessage(message = "", isError = false) {
  elements.couponMessage.textContent = message || (activeCoupon
    ? "Cupón aplicado: 10% de descuento."
    : "Usa ROBLEDO10 para aplicar 10% de descuento.");
  elements.couponMessage.style.color = isError ? "var(--danger)" : "";
}

function handleFormChange(event) {
  if (event.target.name === "deliveryMethod") {
    toggleAddressField();
    renderCart();
  }
  saveFormState();
}

function toggleAddressField() {
  const requiresAddress = getDeliveryMethod() === "delivery";
  elements.addressGroup.hidden = !requiresAddress;
  elements.deliveryAddress.required = requiresAddress;
  if (!requiresAddress) {
    elements.deliveryAddress.value = "";
    clearFieldError(elements.deliveryAddress, elements.deliveryAddressError);
  }
}

function readCheckoutData() {
  return {
    cartItems: cart.items,
    name: elements.customerName.value,
    email: elements.customerEmail.value,
    deliveryMethod: getDeliveryMethod(),
    address: elements.deliveryAddress.value,
    acceptedTerms: elements.termsInput.checked
  };
}

function handleCheckout(event) {
  event.preventDefault();
  clearValidationErrors();

  const data = readCheckoutData();
  const errors = validateCheckout(data);

  if (Object.keys(errors).length > 0) {
    showValidationErrors(errors);
    return;
  }

  const order = createOrder({
    cartItems: data.cartItems,
    customer: { name: data.name, email: data.email },
    couponCode: activeCoupon,
    deliveryMethod: data.deliveryMethod,
    address: data.address
  });

  const saved = writeStorage(ORDER_STORAGE_KEY, order);
  if (!saved) {
    showFormMessage("No fue posible guardar la orden en este navegador.");
    return;
  }

  cart.clear();
  writeStorage(FORM_STORAGE_KEY, {});
  window.location.href = "receipt.html";
}

function showValidationErrors(errors) {
  if (errors.name) setFieldError(elements.customerName, elements.customerNameError, errors.name);
  if (errors.email) setFieldError(elements.customerEmail, elements.customerEmailError, errors.email);
  if (errors.address) setFieldError(elements.deliveryAddress, elements.deliveryAddressError, errors.address);
  if (errors.terms) elements.termsError.textContent = errors.terms;

  showFormMessage(errors.cart || "Revisa los campos marcados antes de continuar.");

  const firstInvalidField = elements.checkoutForm.querySelector("[aria-invalid='true']");
  firstInvalidField?.focus();
}

function setFieldError(input, errorElement, message) {
  input.setAttribute("aria-invalid", "true");
  errorElement.textContent = message;
}

function clearFieldError(input, errorElement) {
  input.removeAttribute("aria-invalid");
  errorElement.textContent = "";
}

function clearValidationErrors() {
  clearFieldError(elements.customerName, elements.customerNameError);
  clearFieldError(elements.customerEmail, elements.customerEmailError);
  clearFieldError(elements.deliveryAddress, elements.deliveryAddressError);
  elements.termsError.textContent = "";
  elements.formMessage.hidden = true;
}

function showFormMessage(message) {
  elements.formMessage.textContent = message;
  elements.formMessage.hidden = false;
}

function saveFormState() {
  writeStorage(FORM_STORAGE_KEY, {
    name: elements.customerName.value,
    email: elements.customerEmail.value,
    deliveryMethod: getDeliveryMethod(),
    address: elements.deliveryAddress.value
  });
}

function restoreFormState() {
  const state = readStorage(FORM_STORAGE_KEY, {});
  elements.customerName.value = state.name ?? "";
  elements.customerEmail.value = state.email ?? "";
  elements.deliveryAddress.value = state.address ?? "";

  if (state.deliveryMethod === "delivery") {
    const deliveryRadio = elements.checkoutForm.querySelector("[name='deliveryMethod'][value='delivery']");
    deliveryRadio.checked = true;
  }

  toggleAddressField();
}

function clearCartWithConfirmation() {
  if (cart.items.length === 0) return;
  const confirmed = window.confirm("¿Deseas vaciar completamente el carrito?");
  if (confirmed) {
    cart.clear();
    showToast("Carrito vaciado.");
  }
}

function resetApplication() {
  const confirmed = window.confirm("Esto eliminará carrito, formulario, cupón y última orden. ¿Continuar?");
  if (!confirmed) return;

  clearAppStorage();
  window.location.reload();
}

function showToast(message, isError = false) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.style.background = isError ? "var(--danger)" : "var(--ink)";
  elements.toast.classList.add("visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 2600);
}
