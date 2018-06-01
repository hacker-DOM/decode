const abiDecoder = require('abi-decoder')
const fs = require('fs')
const Web3 = require('web3')

let web3 = new Web3('http://localhost:8545')

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

asyncFn()

async function asyncFn() {
	let latestBlock
	try {
		latestBlock = await web3.eth.getBlockNumber()

		if (! latestBlock) {
			web3 = new Web3('http://localhost:9545')
			latestBlock = await web3.eth.getBlockNumber()
		}
	} catch (e) {
		web3 = new Web3('http://localhost:9545')
		latestBlock = await web3.eth.getBlockNumber()
	}

	console.log('Listening on ', web3.currentProvider.host)

	if (latestBlock === 0 || typeof latestBlock !== 'number') {
		console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
		console.log('There are no transactions to show');
		console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
		return;
	}

	for (let i = 0; i <= latestBlock; i++) {
		const block = await web3.eth.getBlock(i)
		const txs = block.transactions
		for (let j = 0; j < txs.length; j++) {
			const tx = await web3.eth.getTransaction(txs[j])
			const txReceipt = await web3.eth.getTransactionReceipt(txs[j])

			const from = await format(tx.from)
			let to
			let input2
			const logs = abiDecoder.decodeLogs(txReceipt.logs)

			if (tx.to == null) {
				to = '0x0 (most likely contract created)'
				input2 = getContractCreated(txReceipt.contractAddress, tx.input)
			} else {
				to = await format(tx.to)
				const input = abiDecoder.decodeMethod(tx.input)
				if (!input) {
					input2 = ''
				} else {
					input2 = input.name + '('
					let params = input.params
					for (let k = 0; k < params.length; k++) {
						input2 += await format(params[k].value)
						if (k != params.length - 1) {
							input2 += ', '
						}
					}
					input2 += ')'
				}
			}

			console.log('Tx in Block #' + tx.blockNumber)
			console.log('Transaction being sent from:', from)
			console.log('To:', to)
			console.log('Input:', input2)
			console.log('Events:',)
			await printLogs(logs)
			console.log('Value (i.e. ETH sent):', tx.value)
			console.log('Gas used:', Math.floor(txReceipt.gasUsed / 1000) + 'k')
			console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');

		}
	}

	// Print all contracts

	const l = Math.max(names.length, addresses.length)

	for (let i = 0; i < l; i++) {
		const add = addresses[i] ? addresses[i] : 'not deployed' 
		console.log(names[i], add)
	}
}

async function printLogs(logs) {
	for (let i = 0; i < logs.length; i++) {
		const log = logs[i]
		if (!log) continue
		console.log(`${log.name}:`)
		for (let j = 0; j < log.events.length; j++) {
			const param = log.events[j]
			console.log(await format(param.value))
		}
		console.log('------',)
	}
}

async function format(a) {
	const acc = (await web3.eth.getAccounts()).map(x => x.toLowerCase())

	if (typeof a === 'string') {
		a = a.toLowerCase()
	}
	const inAcc = acc.indexOf(a)

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

function isInUpToLibraries(bytecode, input) {
	let index
	for (let i = 0; i < bytecode.length; i++) {
		if (bytecode[i] !== input[i]) {
			index = i
			break
		}
	}

	if ((!index || bytecode[index] === '_') && bytecode.length > 2) return true
		else return false
}

function getContractCreated(address, input) {
	let index
	for (let i = 0; i < bytecodes.length; i++) {
		if (isInUpToLibraries(bytecodes[i], input)) {
			index = i
			break
		}
	}

	if (addresses[index]) {
		addresses[index].push(address.toLowerCase())
	} else {
		addresses[index] = [address.toLowerCase()]
	}

	return names[index]
}