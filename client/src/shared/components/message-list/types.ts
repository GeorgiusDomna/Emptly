export type ChatViewMessage = {
	id: string;
	userId: string;
	text: string;
	sentAt: string;
	isOwn: boolean;
	kind?: "user" | "system";
};
