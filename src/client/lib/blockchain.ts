import { Block } from "./block.js";
import { Transaction, createHash } from "./utils.js";

export const enum BlockchainEvents {
	START_OF_MINING = "Mining_Started",
	END_OF_MINING = "Mining_Ended_Successfully",
	TRANSACTIONS_ADDED = "Transactions_Added",
	BLOCK_ADDED = "Block_Added"
}

class Blockchain extends EventTarget {
	private _chain: Block[] = [];
	private _pendingTransactions: Transaction[] = [];
	private static current: Blockchain;
	private readonly TRANSACTIONS_PER_BLOCK = 10;
	private readonly PROOF_OF_WORK = "0000";
	private readonly PROOF_OF_WORK_VALIDATOR = (hash: string) =>
		hash.startsWith(this.PROOF_OF_WORK);

	private constructor() {
		super();
	}

	get lastBlock() {
		return this.chain[this.chain.length - 1];
	}

	get chain() {
		return [...this._chain];
	}
	set chain(longestChain: Block[]) {
		if (this._chain.length < longestChain.length)
			this._chain = longestChain;
	}
	get pendingTransactions() {
		return [...this._pendingTransactions];
	}

	async createGenesisBlock() {
		const genesisBlock = new Block({} as Block, [], Date.now());
		await genesisBlock.mine(this.PROOF_OF_WORK_VALIDATOR);
		await this.addBlock(genesisBlock);
	}

	private emit(e: BlockchainEvents) {
		return this.dispatchEvent(new Event(e));
	}

	on(
		type: BlockchainEvents,
		listener: EventListenerOrEventListenerObject | null,
		options?: boolean | AddEventListenerOptions
	) {
		return super.addEventListener(type, listener, options);
	}

	createTransaction(transaction: Transaction) {
		this._pendingTransactions.push(transaction);
		this.emit(BlockchainEvents.TRANSACTIONS_ADDED);
		if (this.pendingTransactions.length >= this.TRANSACTIONS_PER_BLOCK)
			this.minePendingTransactions();
	}

	async addBlock(block: Block) {
		const flag = await this.validateBlock(block);
		if (flag) {
			this._chain.push(block);
			this.emit(BlockchainEvents.BLOCK_ADDED);
		} else {
			console.log("Block mining failed");
		}
		return flag;
	}

	private async validateBlock(block: Block) {
		const data = block.index + JSON.stringify(block.data) + block.nonce;
		const hash = await createHash(data);
		return (
			// this.chain.length === 0 is added because no block exists yet
			// if validating the genesis block
			(this.chain.length === 0 ||
				this.lastBlock.hash === block.previousBlockHash) &&
			this.PROOF_OF_WORK_VALIDATOR(hash) &&
			hash === block.hash
		);
	}

	private async minePendingTransactions() {
		// Take a copy of pending transactions
		const transactionsToBeProcessed = this.pendingTransactions.slice(
			0,
			this.TRANSACTIONS_PER_BLOCK
		);
		// Remove the first {TRANSACTIONS_PER_BLOCK} transactions in pendingTransactions array
		this._pendingTransactions = this.pendingTransactions.slice(
			this.TRANSACTIONS_PER_BLOCK
		);
		const newBlock = new Block(
			this.lastBlock,
			transactionsToBeProcessed,
			Date.now()
		);
		this.emit(BlockchainEvents.START_OF_MINING);
		await newBlock.mine(this.PROOF_OF_WORK_VALIDATOR);
		const flag = await this.addBlock(newBlock);
		// Return transactions to pending if adding block is not successful
		if (!flag) {
			this._pendingTransactions = [
				...transactionsToBeProcessed,
				...this.pendingTransactions
			];
			this.emit(BlockchainEvents.TRANSACTIONS_ADDED);
		} else this.emit(BlockchainEvents.END_OF_MINING);
	}

	static init() {
		if (Blockchain.current === undefined)
			Blockchain.current = new Blockchain();
		return Blockchain.current;
	}
}

export default Blockchain;
