/**
 * Safe localStorage wrapper for OzMos.
 * Handles private browsing / storage-restricted contexts gracefully.
 * Validates values against allowlists to prevent poisoned-storage attacks.
 */

/**
 * Read a value from localStorage.
 * @param {string} key
 * @param {string[]|null} allowedValues - If provided, the stored value must be one of these.
 * @param {string|null} fallback - Returned when the key is missing, inaccessible, or invalid.
 * @returns {string|null}
 */
export function storageGet(key, allowedValues = null, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    if (val === null) return fallback;
    if (allowedValues !== null && !allowedValues.includes(val)) return fallback;
    return val;
  } catch {
    return fallback;
  }
}

/**
 * Write a value to localStorage.
 * Silently no-ops in private browsing or when storage is full/blocked.
 * @param {string} key
 * @param {string} value
 */
export function storageSet(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Private browsing or quota exceeded — ignore
  }
}

/**
 * Remove a key from localStorage.
 * @param {string} key
 */
export function storageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}
