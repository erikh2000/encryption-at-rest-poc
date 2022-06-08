import { findTampering } from './orginalCrypto';
import { getAppData, getKeyGenData, putAppData, putKeyGenData } from './database';

function _randomBytes(byteLength:number):Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(byteLength));
}

const textEncoder = new TextEncoder();
function _stringToBytes(text:string):Uint8Array {
  return textEncoder.encode(text);
}

const textDecoder = new TextDecoder();
function _bytesToString(utf8Array:Uint8Array):string {
  return textDecoder.decode(utf8Array);
}

function _getSubtle():SubtleCrypto {
  const subtle = global.crypto && global.crypto.subtle;
  if (!subtle) throw Error('Browser does not implement Web Crypto.');
  if (!subtle.importKey || !subtle.deriveKey || !subtle.decrypt || !subtle.encrypt) throw Error('Web Crypto on this browser does not implement required APIs.');
  if (findTampering()) throw Error('Crypto functions have been tampered with.');
  return subtle;
}

const PBKDF2_SALT_BYTE_LENGTH = 16;
const DERIVE_KEY_ITERATIONS = 1000000;
async function _generateCredentialKey(password:string, forPasswordChange:boolean):Promise<CryptoKey> {
  const subtle = _getSubtle();
  const credentialKeyData = await getKeyGenData();
  const generateDeriveKeySalt = forPasswordChange || !credentialKeyData.deriveKeySalt;
  if (generateDeriveKeySalt) { 
    credentialKeyData.deriveKeySalt = _randomBytes(PBKDF2_SALT_BYTE_LENGTH);
    await putKeyGenData(credentialKeyData);
  }
  const salt = credentialKeyData.deriveKeySalt as Uint8Array;
  const passwordUint8:Uint8Array = _stringToBytes(password); 
  const algorithmParams:Pbkdf2Params = { name: 'PBKDF2', hash: 'SHA-256', salt, iterations:DERIVE_KEY_ITERATIONS };
  const baseKey:CryptoKey = await subtle.importKey('raw', passwordUint8, 'PBKDF2', false, ['deriveKey']);
  const derivedParams:AesKeyGenParams = { name: 'AES-GCM', length: 128 };
  const credentialsKey = await subtle.deriveKey(algorithmParams, baseKey, derivedParams, false, ['decrypt', 'encrypt']);
  return credentialsKey;
}

const AES_GCM_IV_LENGTH = 12;
async function _encryptText(text:string, key:CryptoKey):Promise<Uint8Array> {
  const subtle = _getSubtle();
  const iv = _randomBytes(AES_GCM_IV_LENGTH);
  const algorithmParams:AesGcmParams = {name: 'AES-GCM', iv };
  const data:Uint8Array = _stringToBytes(text);
  const cipherText = await subtle.encrypt(algorithmParams, key, data);
  const fullMessage:Uint8Array = new Uint8Array(AES_GCM_IV_LENGTH + cipherText.byteLength);
  fullMessage.set(iv);
  fullMessage.set(new Uint8Array(cipherText), AES_GCM_IV_LENGTH);
  return fullMessage;
}

async function _decryptText(fullMessage:Uint8Array, key:CryptoKey):Promise<string> {
  const subtle = _getSubtle();
  const iv = fullMessage.slice(0, AES_GCM_IV_LENGTH);
  const cipherText = fullMessage.slice(AES_GCM_IV_LENGTH);
  
  const algorithmParams:AesGcmParams = {name: 'AES-GCM', iv};
  const plainText = await subtle.decrypt(algorithmParams, key, cipherText);

  const text = _bytesToString(new Uint8Array(plainText));
  return text;
}

export async function loadStoreFromAppData(credentialKey:CryptoKey):Promise<object> {
  const appData = await getAppData();
  const sensitiveData = appData.sensitiveData === null ? '' 
    : await _decryptText(appData.sensitiveData, credentialKey);
  return { sensitiveData };
}

export async function saveStoreToAppData(credentialKey:CryptoKey, store:any):Promise<void> {
  const appData = await getAppData();  
  appData.sensitiveData = await _encryptText(store.sensitiveData as string, credentialKey);
  await putAppData(appData);
}

export async function generateCredentialKey(password:string):Promise<CryptoKey> {
  return _generateCredentialKey(password, false);
}

export async function updateForPasswordChange(oldCredentialKey:CryptoKey, password:string):Promise<CryptoKey> {
  const credentialKey = await _generateCredentialKey(password, true);
  const appData = await getAppData();
  if (appData.sensitiveData !== null) {
    const plaintext = await _decryptText(appData.sensitiveData, oldCredentialKey);
    appData.sensitiveData = await _encryptText(plaintext, credentialKey);
    await putAppData(appData);
  }
  return credentialKey;
}