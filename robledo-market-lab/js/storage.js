const STORAGE_PREFIX = "robledo-market:";

function buildKey(key) {
  return `${STORAGE_PREFIX}${key}`;
}

export function readStorage(key, fallbackValue) {
  try {
    const rawValue = localStorage.getItem(buildKey(key));
    return rawValue ? JSON.parse(rawValue) : fallbackValue;
  } catch (error) {
    console.error(`No fue posible leer ${key} desde localStorage.`, error);
    return fallbackValue;
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(buildKey(key), JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`No fue posible guardar ${key} en localStorage.`, error);
    return false;
  }
}

export function removeStorage(key) {
  try {
    localStorage.removeItem(buildKey(key));
    return true;
  } catch (error) {
    console.error(`No fue posible eliminar ${key} de localStorage.`, error);
    return false;
  }
}

export function clearAppStorage() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(STORAGE_PREFIX))
    .forEach((key) => localStorage.removeItem(key));
}
