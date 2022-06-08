// Must be imported before anything else in each entrypoint page, e.g. index.js.
const decrypt = global.crypto.subtle.decrypt;
const deriveKey = global.crypto.subtle.deriveKey;
const encrypt = global.crypto.subtle.encrypt;
const importKey = global.crypto.subtle.importKey;
const getRandomValues = global.crypto.getRandomValues;

Object.freeze(global.crypto.subtle.encrypt);

export function findTampering():boolean {
  return decrypt !== global.crypto.subtle.decrypt ||
    deriveKey !== global.crypto.subtle.deriveKey ||
    encrypt !== global.crypto.subtle.encrypt ||
    importKey !== global.crypto.subtle.importKey ||
    getRandomValues !== global.crypto.getRandomValues;
}