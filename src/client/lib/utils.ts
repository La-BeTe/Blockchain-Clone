export async function createHash(data: string) {
	const text = new TextEncoder().encode(data);
	const hashBuf = await crypto.subtle.digest("SHA-256", text);
	const hash = Array.from(new Uint8Array(hashBuf))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return hash;
}

export interface Transaction {
	readonly sender: string;
	readonly receiver: string;
	readonly amount: string;
}

export function generateUUID(): string {
	const s4 = () =>
		Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
	return (
		s4() +
		s4() +
		"-" +
		s4() +
		"-" +
		s4() +
		"-" +
		s4() +
		"-" +
		s4() +
		s4() +
		s4()
	);
}
