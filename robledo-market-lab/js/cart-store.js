import { PRODUCTS } from "./products.js";
import { readStorage, writeStorage, removeStorage } from "./storage.js";

const CART_STORAGE_KEY = "cart";

export class CartStore {
  #items;
  #listeners = new Set();

  constructor() {
    const savedItems = readStorage(CART_STORAGE_KEY, []);
    this.#items = this.#sanitizeItems(savedItems);
  }

  get items() {
    return this.#items.map((item) => ({ ...item }));
  }

  get itemCount() {
    return this.#items.reduce((total, item) => total + item.quantity, 0);
  }

  add(productId, quantity = 1) {
    const product = PRODUCTS.find((candidate) => candidate.id === productId);
    if (!product) {
      throw new Error("El producto seleccionado no existe.");
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      throw new Error("La cantidad debe ser un número entero mayor que cero.");
    }

    const currentItem = this.#items.find((item) => item.id === productId);
    const nextQuantity = (currentItem?.quantity ?? 0) + parsedQuantity;

    if (nextQuantity > product.stock) {
      throw new Error(`Solo hay ${product.stock} unidades disponibles.`);
    }

    if (currentItem) {
      currentItem.quantity = nextQuantity;
    } else {
      this.#items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: parsedQuantity,
        stock: product.stock
      });
    }

    this.#commit();
  }

  increase(productId) {
    this.add(productId, 1);
  }

  decrease(productId) {
    const item = this.#items.find((candidate) => candidate.id === productId);
    if (!item) return;

    if (item.quantity <= 1) {
      this.remove(productId);
      return;
    }

    item.quantity -= 1;
    this.#commit();
  }

  remove(productId) {
    this.#items = this.#items.filter((item) => item.id !== productId);
    this.#commit();
  }

  clear() {
    this.#items = [];
    removeStorage(CART_STORAGE_KEY);
    this.#notify();
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #commit() {
    writeStorage(CART_STORAGE_KEY, this.#items);
    this.#notify();
  }

  #notify() {
    this.#listeners.forEach((listener) => listener(this.items));
  }

  #sanitizeItems(items) {
    if (!Array.isArray(items)) return [];

    return items.flatMap((item) => {
      const product = PRODUCTS.find((candidate) => candidate.id === item.id);
      const quantity = Number(item.quantity);

      if (!product || !Number.isInteger(quantity) || quantity <= 0) {
        return [];
      }

      return [{
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: Math.min(quantity, product.stock),
        stock: product.stock
      }];
    });
  }
}
