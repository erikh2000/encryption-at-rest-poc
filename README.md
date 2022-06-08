# Encryption-at-Rest for Web POC

This is a simple web app that demonstrates how to securely store password-encrypted data in browser persistent storage. Encryption-at-rest is a key capability that many Offline-First web apps will need, and I was excited to get it working in this proof-of-concept.

*WARNING:* Don't use this code for something important without thoroughly understanding the consequences of potential security flaws. Also, as I write this, I don't have 100% confidence that the code doesn't contain vulnerabilities.

Cryptography is subtle and easy to screw up. You don't want to thoughtlessly copy-and-paste code from this repo. The code here is currently good for two things:

* to prove the encryption-at-rest functionality is possible and performant
* to provide a reference point for a cautiously-implemented, production-ready solution

I wrote a detailed explanation of the architecture in this article: https://medium.com/@ErikH2000/adding-encryption-at-rest-to-your-web-app-with-mrs-jeggers-f50b037fbc54

## Try the Web App

You can just go TODO-ADD-LINK to see what the app does.

And if you're confused about the app, see that article linked above. You'll be amazed at how thoroughly the app is explained there.

## How to Install

1. Git clone this repo.
2. Change to the repo directory you just cloned into.
3. `npm install`
4. `npm run start`

Your default browser should then serve a single page from http://localhost:3000

## A Quick Guide to the Source

There's a bit of `create-react-app` boilerplate that you can ignore. Key files to look at are:

* `App.tsx` - Implements a React-based UI for the app. You can think of it as the controlling code.
* `encAtRest.ts` - All the cryptography stuff.
* `database.ts` - All the IndexedDb (browser persistent storage) stuff.
* `originalCrypto.ts` - This is a defense against NPM supply chain attacks.

## Help and Contributing

I'm open to constructive criticism and other thoughts. And if you have an interest in contributing to a production-ready solution, let me know. But this project is just a concluded POC and I am unlikely to fix bugs or add new features to it. An exception could be if someone found a security vulnerability.

-Erik Hermansen