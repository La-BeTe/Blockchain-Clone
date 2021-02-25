import { Server, Socket } from "socket.io";
import { Message, MessageTitle, UUID, socketID } from "../shared";

type GetLongestChainCallback = (payload?: any[]) => any;

class BlockchainServer {
	private sockets: Socket[] = [];
	private sentMessagesAwaitingReplies = new Map<UUID, Message[]>();
	private expectedNumOfRepliesForSentMessages = new Map<UUID, number>();
	private receivedMessagesAwaitingResponse = new Map<
		UUID,
		GetLongestChainCallback
	>();

	private constructor(private io: Server) {
		this.io.on("connection", this.handleNewConnection.bind(this));
	}

	private get isFirstClient() {
		return this.sockets.length === 1;
	}

	private handleNewConnection(socket: Socket) {
		this.addEventListeners(socket);
		this.sockets.push(socket);
		socket.emit("Init", socket.id);
	}

	private addEventListeners(socket: Socket) {
		socket.on(
			MessageTitle.GET_LONGEST_CHAIN_REQUEST,
			this.handleGetLongestChainRequest.bind(this)
		);
		socket.on(
			MessageTitle.GET_LONGEST_CHAIN_RESPONSE,
			this.handleGetLongestChainResponse.bind(this)
		);
		socket.on(
			MessageTitle.NEW_TRANSACTION,
			this.handleAddTransaction.bind(this)
		);
		socket.on(
			MessageTitle.MINED_BLOCK,
			this.handleNewBlockAnnouncement.bind(this)
		);
		socket.on(
			"disconnecting",
			this.handleSocketDisconnection.bind(this, socket)
		);
	}

	private handleSocketDisconnection(disconnectingSocket: Socket) {
		this.sockets = this.sockets.filter(
			(socket) => socket.id !== disconnectingSocket.id
		);
	}

	private handleGetLongestChainRequest(message: Message) {
		const cb: GetLongestChainCallback = (payload) => {
			this.sendMessage(
				MessageTitle.GET_LONGEST_CHAIN_RESPONSE,
				{ ...message, payload },
				false
			);
		};

		if (this.isFirstClient) return cb([]);
		this.receivedMessagesAwaitingResponse.set(message.id, cb);
		const expectedNumOfReplies = this.sendMessage(
			MessageTitle.GET_LONGEST_CHAIN_REQUEST,
			message,
			true
		);
		this.sentMessagesAwaitingReplies.set(message.id, []);
		this.expectedNumOfRepliesForSentMessages.set(
			message.id,
			expectedNumOfReplies
		);
	}

	private handleGetLongestChainResponse(message: Message) {
		const replies = this.sentMessagesAwaitingReplies.get(message.id);
		if (replies) {
			replies.push(message);
			if (this.hasEveryoneReplied(message.id)) {
				const cb = this.receivedMessagesAwaitingResponse.get(
					message.id
				);
				if (cb) {
					cb(this.getLongestChain(replies));
				}
			}
		}
	}

	private handleAddTransaction(message: Message) {
		this.sendMessage(MessageTitle.NEW_TRANSACTION, message, true);
	}

	private handleNewBlockAnnouncement(message: Message) {
		this.sendMessage(MessageTitle.MINED_BLOCK, message, true);
	}

	private hasEveryoneReplied(id: UUID) {
		const replies = this.sentMessagesAwaitingReplies.get(id);
		const expectedNumOfReplies = this.expectedNumOfRepliesForSentMessages.get(
			id
		);
		return (
			!!replies &&
			!!expectedNumOfReplies &&
			replies.length === expectedNumOfReplies
		);
	}

	private getLongestChain(messages: Message[]): any[] {
		const longestChain = messages.reduce((longest, current) => {
			if (longest.payload.length < current.payload.length) return current;
			else return longest;
		});
		return longestChain.payload;
	}

	private getSocket(id: socketID) {
		return this.sockets.filter((socket) => socket.id === id)[0];
	}

	private sendMessage(
		title: MessageTitle,
		{ id, requestorID, payload }: Message,
		broadcast: boolean
	) {
		const socket = this.getSocket(requestorID);
		if (broadcast) {
			socket.broadcast.emit(title, { id, payload });
		} else {
			socket.emit(title, { id, payload });
		}
		return broadcast ? this.sockets.length - 1 : 1;
	}

	static initialize(io: Server) {
		return new BlockchainServer(io);
	}
}

export default BlockchainServer;
