const abiDecoder = require('abi-decoder')
const fs = require('fs')
const Web3 = require('web3') 

// const web3 = new Web3(Web3.givenProvider || "ws://localhost:9545");

// web3.setProvider(new web3.providers.HttpProvider('http://geth-node-ip:8545'));

let web3

if (typeof web3 !== 'undefined') {
  web3 = new Web3(web3.currentProvider);
} else {
  // set the provider you want from Web3.providers
  web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:9545"));
}

// here we use path relative to cwd
const abiFolder = 'build/contracts'

const abis = []
const bytecodes = []
const names = []
const addresses = []

fs.readdirSync(abiFolder).forEach((fileName, index) => {
	// require uses path relative to __dirname 
	const file = require('../../' + abiFolder + '/' + fileName)
	abis[index] = file.abi
	bytecodes[index] = file.bytecode
	names[index] = file.contractName
})

abis.forEach(abi => abiDecoder.addABI(abi))

const latestBlock = web3.eth.blockNumber

const format = a => {
	const inAcc = web3.eth.accounts.indexOf(a)

	if (inAcc > -1) {
		// a is an account
		return 'accounts[' + inAcc + ']'
	} else {
		let inContr

		for (let i = 0; i < addresses.length; i++) {
			if (addresses[i]) {
				let inAdd = addresses[i].indexOf(a)
				if (inAdd > -1) {
					inContr = i
				}
			}
		}
		
		if (inContr > -1) {
			// a is a contract
			return names[inContr]
		} else {
			// console.log('a.parseInt',a.parseInt)
			if (parseInt(a, 10) && parseInt(a, 10) % 10000 === 0) {
				// a is a number that should be displayed in scientific notation
				// console.log('a.toExponential()',a.toExponential())
				return parseInt(a,10).toExponential()
			} else {
				return a
			}
		}
	}
}

const isInUpToLibraries = (bytecode, input) => {
	let index
	for (let i = 0; i < bytecode.length; i++) {
		if (bytecode[i] !== input[i]) {
			index = i
			break
		}
	}

	if (!index || bytecode[index] === '_') return true
		else return false
}

const getContractCreated = (address, input) => {
	let index
	for (let i = 0; i < bytecodes.length; i++) {
		if (isInUpToLibraries(bytecodes[i], input)) {
			index = i
			break
		}
	}

	if (addresses[index]) {
		addresses[index].push(address)
	} else {
		addresses[index] = [address]
	}

	return names[index]
}

if (latestBlock === 0) {
	console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
	console.log('There are no transactions to show');
	console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
}

for (let i = 0; i <= latestBlock; i++) {
	const block = web3.eth.getBlock(i)
	const txs = block.transactions
	for (let j = 0; j < txs.length; j++) {
		const tx = web3.eth.getTransaction(txs[j])
		const txReceipt = web3.eth.getTransactionReceipt(txs[j])

		const from = format(tx.from)
		let to
		let input2
		const logs = abiDecoder.decodeLogs(txReceipt.logs)

		if (tx.to == '0x0') {
			to = '0x0 (most likely contract created)'
			input2 = getContractCreated(txReceipt.contractAddress, tx.input)
		} else {
			to = format(tx.to)
			const input = abiDecoder.decodeMethod(tx.input)
			input2 = input.name + '('
			input.params.forEach((param, index) => {
				input2 += format(param.value)
				if (index != input.params.length - 1) {
					input2 += ', '
				}
			})
			input2 += ')'
		}

		console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
		console.log('Tx in Block #' + tx.blockNumber)
		console.log('Transaction being sent from:', from);
		console.log('To:', to)
		console.log('Input:', input2)
		console.log('Events:',)
		logs.forEach(log => {
			console.log(`${log.name}:`)
			log.events.forEach(param => console.log('',format(param.value)))
			console.log('------',)
		})
		console.log('Value (i.e. ETH sent):', tx.value.toNumber())
		console.log('Gas used:', Math.floor(txReceipt.gasUsed / 1000) + 'k')
		console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');

	}
}