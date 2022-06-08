import { generateCredentialKey, loadStoreFromAppData, saveStoreToAppData, updateForPasswordChange } from './encAtRest';
import { deleteDatabase, doesDatabaseExist } from './database';
import styles from './App.module.css';

import React, { useEffect, useState } from 'react';

async function _deleteData(setCredentialKey:any):Promise<void> {
  await deleteDatabase();
  setCredentialKey(null);
}

async function _changePassword(credentialKey:CryptoKey|null, newPassword:string, setCredentialKey:any, setStatusText:any):Promise<void> {
  setStatusText('');
  if (credentialKey === null) {
    setStatusText('Failed to change password due to unexpected error.');
    return;
  }
  const nextCredentialKey = await updateForPasswordChange(credentialKey, newPassword);
  setCredentialKey(nextCredentialKey);
  setStatusText('Sensitive data re-encrypted with credentials.');
}

// Disable linting on "no-control-regex" because these "unprintable" ranges are necessary and not the mistake the rule aimed to prevent.
// eslint-disable-next-line no-control-regex
const UNPRINTABLE_CHARS_REGEX = /[\x00\x08\x0B\x0C\x0E-\x1F]/;
function _isItProbablyPlaintext(text:string) { // False positives are infrequent but definitely expected.
  return !UNPRINTABLE_CHARS_REGEX.test(text);
}

async function _login(userName:string, password:string, setCredentialKey:any, setStore:any, setStatusText:any):Promise<void> {
  // No actual authentication performed here for simplicity's sake. But easily extensible.
  setStatusText('');
  try {
    const credentialKey = await generateCredentialKey(password);
    const nextStore = await loadStoreFromAppData(credentialKey);
    if (!_isItProbablyPlaintext((nextStore as any).sensitiveData)) { // A poor way to authenticate--don't copy.
      setStatusText('You probably entered the wrong password.');
      return;
    }
    setCredentialKey(credentialKey);
    setStore(nextStore);
  } catch(e) { // Sometimes a derived key from a wrong password will cause Web Crypto to throw.
    console.log(e);
    setStatusText('You probably entered the wrong password.');
  }
}

async function _save(credentialKey:CryptoKey|null, store:any, setStatusText:any):Promise<void> {
  setStatusText('');
  if (credentialKey === null) {
    setStatusText('Failed to save data due to unexpected error');
    return;
  }
  await saveStoreToAppData(credentialKey, store);
  setStatusText('Data saved.');
}

function _logout(setCredentialKey:any, setStore:any, setStatusText:any) {
  setStatusText('');
  setStore({});
  setCredentialKey(null);
}

function App() {
  const [credentialKey, setCredentialKey] = useState<CryptoKey|null>(null);
  const [userName, setUserName] = useState<string>('');
  const [password, setPassword] = useState<string>(''); 
  const [newPassword, setNewPassword] = useState<string>('');
  const [store, setStore] = useState<any>({});
  const [statusText, setStatusText] = useState<string|null>(null);
  const [hasAccount, setHasAccount] = useState<boolean|null>(null);

  const isLoggedIn = credentialKey !== null;

  const statusBar = statusText === null ? null : <h1>{statusText}</h1>;
  
  useEffect(() => {
    if (hasAccount === null) doesDatabaseExist().then(databaseExists => setHasAccount(databaseExists));
  }, [hasAccount]);
  if (hasAccount === null) return null; // A very short initial rendering blink while waiting for data.
  const createOrLoginButtonText = hasAccount ? 'Login' : 'Create Account';

  const interior = isLoggedIn ? (
    <React.Fragment>
      <p>
        Sensitive Data: 
        <textarea onChange={event => setStore({ sensitiveData:event.target.value })} value={store?.sensitiveData} /> 
        <button onClick={() => _save(credentialKey, store, setStatusText)}>Save</button>
      </p>
      <p>
        New Password: <input type='password' autoComplete='new-password' onChange={event => setNewPassword(event.target.value)} value={newPassword} /> 
        <button onClick={() => _changePassword(credentialKey, newPassword, setCredentialKey, setStatusText)}>Change Password</button>
      </p>
      <p><button onClick={() => _logout(setCredentialKey, setStore, setStatusText)}>Logout</button></p>
    </React.Fragment>) : (
      <p>
        Username: <input type='text' onChange={event => setUserName(event.target.value)} value={userName}/>&nbsp;
        Password: <input type='password' autoComplete='password' onChange={event => setPassword(event.target.value) } value={password}/> 
        <button onClick={() => _login(userName, password, setCredentialKey, setStore, setStatusText)}>{createOrLoginButtonText}</button>
      </p>
    );

  return (
    <div className={styles.app}>
      {statusBar}
      {interior}
      <p><button onClick={() => _deleteData(setCredentialKey)}>Clear IndexedDB Storage for this app</button><br />(Useful if you forget the password.)</p>
    </div>
  );
}

export default App;