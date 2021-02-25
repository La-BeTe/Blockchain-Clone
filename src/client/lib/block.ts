import { createHash, Transaction } from "./utils.js";

export class Block {
	hash = "";
	nonce = 0;
	readonly index: number;
	readonly previousBlockHash: string;

	constructor(
		previousBlock: Block,
		readonly data: Transaction[],
		readonly timestamp: number
	) {
		this.index =
			previousBlock.index === undefined ? 0 : previousBlock.index + 1;
		this.previousBlockHash =
			previousBlock.index === undefined ? "NULL" : previousBlock.hash;
	}

	private calculateHash(nonce: number) {
		const data = this.index + JSON.stringify(this.data) + nonce;
		return createHash(data);
	}

	async mine(PROOF_OF_WORK_VALIDATOR: (hash: string) => boolean) {
		console.log(`Mining block ${this.index}`);
		do {
			this.hash = await this.calculateHash(++this.nonce);
		} while (!PROOF_OF_WORK_VALIDATOR(this.hash));
	}
}
