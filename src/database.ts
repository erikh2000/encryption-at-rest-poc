const DB_NAME = 'EncAtRestExample';
const KEYGEN_STORE = 'KeyGen';
const APP_DATA_STORE = 'AppData';
const ONLY_ID = 1; // For use with stores that will only have one object in them.
const SCHEMA = {
  __version:1,
  [KEYGEN_STORE]: {
    __options:{keyPath:'id'}, 
    id:ONLY_ID, deriveKeySalt:null
  },
  [APP_DATA_STORE]: {
    __options:{keyPath:'id'},
    id:ONLY_ID, sensitiveData:null
  }
};

interface IKeyGenData {
  id:number,
  deriveKeySalt:Uint8Array|null
}

interface IAppData {
  id:number,
  sensitiveData:Uint8Array|null
}

function _getStoreNamesFromSchema(schema:any):string[] {
  return Object.keys(schema).filter(key => key !== '__version');
}

function _getStoreObjectValuesFromSchema(schema:any, storeName:string) {
  const storeSchema = schema[storeName];
  const values = {...storeSchema};
  delete values.__options;
  return values;
}

async function _populateStores(db:IDBDatabase, schema:any):Promise<void> {
  const storeNames = _getStoreNamesFromSchema(schema);
  const transaction = db.transaction(storeNames, 'readwrite');
  let remainingCount = storeNames.length;
  return new Promise((resolve, reject) => {
    storeNames.forEach(storeName => {
      const objectToAdd = _getStoreObjectValuesFromSchema(schema, storeName);
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.add(objectToAdd);
      request.onerror = (event:any) => reject(`Failed to add object to "${storeName}" with error code ${event.target.errorCode}.`);
      request.onsuccess = () => {
        if (--remainingCount === 0) resolve();
      }
    });
  });
}

function _createStores(db:IDBDatabase, schema:any) {
  const storeNames = _getStoreNamesFromSchema(schema);
  storeNames.forEach(storeName => {
    const storeSchema = schema[storeName];
    db.createObjectStore(storeName, storeSchema.__options);
  });
}

async function _open(name:string, schema:any):Promise<IDBDatabase> {
  const version = schema.__version;
  let wereStoresCreated = false;
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onerror = (event:any) => reject(`Failed to open "${name}" database with error code ${event.target.errorCode}.`);
    request.onupgradeneeded = (event:any) => {
      const db = event.target.result as IDBDatabase;
      _createStores(db, schema);
      wereStoresCreated = true;
    }
    request.onsuccess = (event:any) => {
      const db = event.target.result as IDBDatabase;
      db.onerror = (event:any) => { throw Error("Database error: " + event.target.errorCode); } // Not using reject() since error could come later after this promise completes.
      if (wereStoresCreated) _populateStores(db, schema);
      resolve(db);
    }
  });
}

async function _get(db:IDBDatabase, storeName:string, key:any):Promise<object> {
  const transaction = db.transaction(storeName);
  const objectStore = transaction.objectStore(storeName);
  const request = objectStore.get(key);
  return new Promise((resolve, reject) => {
    request.onerror = (event:any) => reject(`Failed to get from "${storeName} with error code ${event.target.errorCode}.`);
    request.onsuccess = (event:any) => resolve(request.result)
  });
}

async function _put(db:IDBDatabase, storeName:string, objectToStore:object):Promise<void> {
  const transaction = db.transaction(storeName, 'readwrite');
  const objectStore = transaction.objectStore(storeName);
  const request = objectStore.put(objectToStore);
  return new Promise((resolve, reject) => {
    request.onerror = (event:any) => reject(`Failed to put to "${storeName} with error code ${event.target.errorCode}.`);
    request.onsuccess = () => resolve()
  });
}

export async function deleteDatabase():Promise<void> {
  const request = indexedDB.deleteDatabase(DB_NAME);
  return new Promise((resolve, reject) => {
    request.onerror = (event:any) => reject(`Failed to delete "${DB_NAME}}" database with error code ${event.target.errorCode}.`);
    request.onsuccess = () => resolve();
  });
}

export async function getKeyGenData():Promise<IKeyGenData> {
  const db = await _open(DB_NAME, SCHEMA);
  return (await _get(db, KEYGEN_STORE, ONLY_ID)) as IKeyGenData;
}

export async function putKeyGenData(keyGenData:IKeyGenData):Promise<void> {
  const db = await _open(DB_NAME, SCHEMA);
  return _put(db, KEYGEN_STORE, keyGenData);
}

export async function getAppData():Promise<IAppData> {
  const db = await _open(DB_NAME, SCHEMA);
  return (await _get(db, APP_DATA_STORE, ONLY_ID)) as IAppData;
}

export async function putAppData(appData:IAppData):Promise<void> {
  const db = await _open(DB_NAME, SCHEMA);
  return _put(db, APP_DATA_STORE, appData);
}

export async function doesDatabaseExist():Promise<boolean> {
  const dbInfos:IDBDatabaseInfo[] = await indexedDB.databases();
  const found = dbInfos.find(dbInfo => dbInfo.name === DB_NAME);
  return found !== undefined;
}