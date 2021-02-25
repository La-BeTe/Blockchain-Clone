import { MessageTitle, Message, socketID } from "../shared";
import { generateUUID, Transaction } from "./lib/utils.js";
import Blockchain, { BlockchainEvents } from "./lib/blockchain.js";

const enum Status {
	Initialization = "🍻 Initializing Blockchain...",
	ReadyToMine = "✅ Ready to mine a new block...",
	MineInProgress = "⏳ Mining a new block...",
	FinishedMining = "💰 Mining completed successfully, ready to mine a new block..."
}

class Application {
	private readonly senderEl = document.getElementById(
		"senderEl"
	) as HTMLInputElement;
	private readonly receiverEl = document.getElementById(
		"receiverEl"
	) as HTMLInputElement;
	private readonly amountEl = document.getElementById(
		"amountEl"
	) as HTMLInputElement;
	private readonly addTransactionForm = document.getElementById(
		"add-transaction"
	) as HTMLFormElement;
	private readonly blocksContainer = document.getElementById(
		"blocks-container"
	) as HTMLDivElement;
	private readonly pendingTransactionsContainer = document.getElementById(
		"pending-transactions-div"
	) as HTMLDivElement;
	private readonly statusEl = document.getElementById(
		"statusEl"
	) as HTMLDivElement;
	private readonly addTransactionBtn = document.getElementById(
		"addTransactionBtn"
	) as HTMLButtonElement;
	private readonly blockchain = Blockchain.init();
	private requestorID: socketID = "";

	constructor(private socket: any) {
		this.setAppStatus(Status.Initialization);
		this.addEventListeners();
		socket.on("Init", (id: socketID) => {
			this.requestorID = id;
			this.sendMessage(MessageTitle.GET_LONGEST_CHAIN_REQUEST, null);
		});
	}

	private addEventListeners() {
		this.socket.on(
			MessageTitle.GET_LONGEST_CHAIN_REQUEST,
			this.handleGetLongestChainRequest.bind(this)
		);
		this.socket.on(
			MessageTitle.GET_LONGEST_CHAIN_RESPONSE,
			this.handleGetLongestChainResponse.bind(this)
		);
		this.socket.on(
			MessageTitle.MINED_BLOCK,
			this.handleNewMinedBlock.bind(this)
		);
		this.socket.on(
			MessageTitle.NEW_TRANSACTION,
			this.addTransaction.bind(this)
		);
		this.addTransactionForm.addEventListener(
			"submit",
			this.addTransaction.bind(this)
		);
		this.blockchain.on(
			BlockchainEvents.TRANSACTIONS_ADDED,
			this.updateTransactionsInDOM.bind(this)
		);
		this.blockchain.on(
			BlockchainEvents.BLOCK_ADDED,
			this.updateBlocksInDOM.bind(this)
		);
		this.blockchain.on(
			BlockchainEvents.START_OF_MINING,
			this.handleStartOfMining.bind(this)
		);
		this.blockchain.on(
			BlockchainEvents.END_OF_MINING,
			this.handleEndOfMining.bind(this)
		);
	}

	private setAppStatus(status: Status) {
		this.statusEl.innerText = status;
	}

	private handleStartOfMining() {
		this.setAppStatus(Status.MineInProgress);
		this.updateTransactionsInDOM();
	}

	private handleEndOfMining() {
		this.sendMessage(MessageTitle.MINED_BLOCK, this.blockchain.lastBlock);
		this.setAppStatus(Status.FinishedMining);
	}

	private async handleNewMinedBlock(message: Message) {
		await this.blockchain.addBlock(message.payload);
	}

	private async handleGetLongestChainRequest(message: Message) {
		this.sendMessage(
			MessageTitle.GET_LONGEST_CHAIN_RESPONSE,
			this.blockchain.chain,
			message.id
		);
	}

	private async handleGetLongestChainResponse(message: Message) {
		if (
			message.payload.length === 0 &&
			this.blockchain.chain.length === 0
		) {
			await this.blockchain.createGenesisBlock();
		} else {
			for (let block of message.payload) {
				await this.blockchain.addBlock(block);
			}
		}
		this.setAppStatus(Status.ReadyToMine);
		this.addTransactionBtn.classList.remove("disabled");
		this.updateBlocksInDOM();
	}

	private addTransaction(eventOrMessage: Event | Message) {
		let transaction: Transaction;
		if (eventOrMessage instanceof Event) {
			eventOrMessage.preventDefault();
			const sender = this.senderEl.value;
			const receiver = this.receiverEl.value;
			const amount = this.amountEl.value;
			if (
				!sender ||
				!receiver ||
				!amount ||
				this.addTransactionBtn.classList.contains("disabled")
			)
				return;
			transaction = { sender, receiver, amount };
			this.sendMessage(MessageTitle.NEW_TRANSACTION, transaction);
			// Reset input values
			this.senderEl.value = "";
			this.receiverEl.value = "";
			this.amountEl.value = "";
		} else {
			transaction = eventOrMessage.payload;
		}
		this.blockchain.createTransaction(transaction);
	}

	private updateBlocksInDOM() {
		const blocksOnPage = Array.from(document.querySelectorAll(".block"));
		const blocksInBlockchain = this.blockchain.chain;
		if (blocksInBlockchain.length > blocksOnPage.length) {
			const newBlocks = blocksInBlockchain.slice(blocksOnPage.length);
			const html = newBlocks
				.map(
					(block) => `
                    <div class="block">
                        <div class="block-heading">
                            <h3>#${block.index}</h3>
                            <p>${new Date(block.timestamp)
								.toLocaleTimeString()
								.replace(/:\d{1,2}\s/, " ")}</p>
                        </div>
                        <div class="block-hashes">
                            <p>PREV HASH: <span>${
								block.previousBlockHash
							}</span></p>
                            <p>
                                THIS HASH:
                                <span>${block.hash}
                                </span>
                            </p>
                        </div>
                        <div class="transactions">
                            <p>Transactions</p>
                            <div>
                            ${block.data.map(
								(transaction) =>
									`<pre>${transaction.sender} &rarr; ${transaction.receiver}: $${transaction.amount}</pre>`
							)}
                            </div>
                        </div>
                    </div>
            `
				)
				.join("");
			this.blocksContainer.innerHTML += html;
		}
	}

	private updateTransactionsInDOM() {
		let html: string;
		if (this.blockchain.pendingTransactions.length === 0)
			html = `<pre>No pending transactions at the moment.</pre>`;
		else {
			html = this.blockchain.pendingTransactions
				.map(
					(transaction) =>
						`<pre>${transaction.sender} &rarr; ${transaction.receiver}: $${transaction.amount}</pre>`
				)
				.join("");
		}
		this.pendingTransactionsContainer.innerHTML = html;
	}

	private sendMessage<T>(
		title: MessageTitle,
		payload: T,
		id = generateUUID()
	) {
		const requestorID = this.requestorID;
		if (!requestorID) return;
		this.socket.emit(title, {
			requestorID,
			payload,
			id
		});
	}
}

export default Application;
