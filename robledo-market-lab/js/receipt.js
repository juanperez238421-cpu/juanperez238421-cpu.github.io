import { formatCurrency } from "./core.js";
import { readStorage, removeStorage } from "./storage.js";

const ORDER_STORAGE_KEY = "last-order";

const elements = {
  missingOrder: document.querySelector("#missingOrder"),
  receiptContent: document.querySelector("#receiptContent"),
  orderId: document.querySelector("#orderId"),
  orderDate: document.querySelector("#orderDate"),
  orderCustomer: document.querySelector("#orderCustomer"),
  orderDelivery: document.querySelector("#orderDelivery"),
  receiptItems: document.querySelector("#receiptItems"),
  receiptSubtotal: document.querySelector("#receiptSubtotal"),
  receiptDiscount: document.querySelector("#receiptDiscount"),
  receiptDeliveryFee: document.querySelector("#receiptDeliveryFee"),
  receiptTotal: document.querySelector("#receiptTotal"),
  printButton: document.querySelector("#printButton"),
  newOrderButton: document.querySelector("#newOrderButton")
};

initializeReceipt();

function initializeReceipt() {
  const order = readStorage(ORDER_STORAGE_KEY, null);
  bindEvents();

  if (!isValidOrder(order)) {
    showMissingOrderState();
    return;
  }

  renderReceipt(order);
}

function bindEvents() {
  elements.printButton.addEventListener("click", () => window.print());
  elements.newOrderButton.addEventListener("click", startNewOrder);
}

function isValidOrder(order) {
  return Boolean(
    order &&
    typeof order.id === "string" &&
    Array.isArray(order.items) &&
    order.items.length > 0 &&
    order.totals
  );
}

function showMissingOrderState() {
  elements.missingOrder.hidden = false;
  elements.receiptContent.hidden = true;
  elements.printButton.disabled = true;
}

function renderReceipt(order) {
  elements.missingOrder.hidden = true;
  elements.receiptContent.hidden = false;

  elements.orderId.textContent = order.id;
  elements.orderDate.textContent = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short"
  }).format(new Date(order.createdAt));
  elements.orderCustomer.textContent = `${order.customer.name} · ${order.customer.email}`;
  elements.orderDelivery.textContent = order.delivery.method === "delivery"
    ? `Domicilio: ${order.delivery.address}`
    : "Recoger en el aula";

  elements.receiptItems.innerHTML = order.items.map((item) => `
    <tr>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>${formatCurrency(item.price)}</td>
      <td>${formatCurrency(item.price * item.quantity)}</td>
    </tr>
  `).join("");

  elements.receiptSubtotal.textContent = formatCurrency(order.totals.subtotal);
  elements.receiptDiscount.textContent = `-${formatCurrency(order.totals.discount)}`;
  elements.receiptDeliveryFee.textContent = formatCurrency(order.totals.deliveryFee);
  elements.receiptTotal.textContent = formatCurrency(order.totals.total);
}

function startNewOrder() {
  removeStorage(ORDER_STORAGE_KEY);
  window.location.href = "index.html";
}
