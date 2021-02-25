export const enum MessageTitle {
	NEW_TRANSACTION = "NEW PENDING TRANSACTION",
	MINED_BLOCK = "NEW MINED BLOCK",
	GET_LONGEST_CHAIN_REQUEST = "GET LONGEST CHAIN REQUEST",
	GET_LONGEST_CHAIN_RESPONSE = "GET LONGEST CHAIN RESPONSE"
}

export interface Message {
	id: UUID;
	payload?: any;
	requestorID: socketID;
}

export type UUID = string;
export type socketID = string;
