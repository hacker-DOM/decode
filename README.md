Decode
======

Decode is a package to make it easier for you to develop on Ethereum. In particular, it parses tx's submitted to a local testrpc node to make them more readable. 

Use
-----

`npm install --save-dev decode-eth`

add this script to your `package.json`: `"decode": "node ./node_modules/decode-eth/main.js"`

run using `npm run decode`!

Works with testrpc & ganache-cli:

`truffle compile`

`truffle test`

`npm run decode`

Works with truffle develop:

`truffle develop`

`compile`

`test`

new tab:

`npm run decode`

Note: for it to work, you need to have a populated `build` folder. So you need to run `compile` before.

Features
-----
For every transaction that ocurred on your blockchain, decode will show:
- the block number
- which account it is being sent from (e.g. accounts[0]) & to (e.g. MyContract)
- if a contract is being created, which one
- all events from the transaction
- amount of ETH sent
- amount of gas used

At the end, it will output all built contracts & their deployed addresses