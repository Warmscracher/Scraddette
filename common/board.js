import { Guild, Message, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";

export const BOARD_CHANNEL = process.env.BOARD_CHANNEL;
export const BOARD_EMOJI = "🥔";
export const MIN_COUNT = 1;
/** @param {Guild} guild */
export async function getBoardChannel(guild) {
	const { threads } = await guild.channels.fetchActiveThreads();
	return threads.find((thread) => thread.id === BOARD_CHANNEL);
}

/** @param {Message<boolean>} message */
export async function getMessageFromBoard(message) {
	if (!message.guild) return;
	const board = await getBoardChannel(message.guild);
	if (!board)
		throw new Error("No board channel found. Make sure BOARD_CHANNEL is set in the .env file.");
	const fetchedMessages = await board.messages.fetch({ limit: 100 });
	return fetchedMessages.find((boardMessage) => {
		const component = boardMessage?.components[0]?.components?.[0];
		if (component?.type !== "BUTTON") return false;
		const [, , messageId] = component.url?.match(/\d+/g) || [];
		return messageId === message.id;
	});
}

/** @param {Message<boolean>} message */
export async function postMessageToBoard(message) {
	if (!message.guild) return;

	const author = await message.guild?.members.fetch(message.author).catch(() => {});

	const board = await getBoardChannel(message.guild);
	if (!board)
		throw new Error("No board channel found. Make sure BOARD_CHANNEL is set in the .env file.");

	const repliedMessage = message.reference?.messageId
		? await message.channel.messages.fetch(message.reference?.messageId)
		: "";

	const repliedInfo =
		repliedMessage &&
		"**Replying to " +
			repliedMessage.author.username +
			":**\n> " +
			repliedMessage.content +
			"\n\n";

	const embed = new MessageEmbed()
		.setColor(0xffd700)
		.setDescription(repliedInfo + message.content)
		.setAuthor({
			name: author?.displayName || message.author.username,
			iconURL:
				author?.displayAvatarURL() ||
				message.author.displayAvatarURL() ||
				message.author.defaultAvatarURL ||
				"",
		})
		.setTimestamp(message.createdTimestamp);

	const embeds = [embed, ...message.embeds.map((oldEmbed) => new MessageEmbed(oldEmbed))];
	while (embeds.length > 10) embeds.pop();

	const button = new MessageButton()
		.setEmoji("👀")
		.setLabel("View Context")
		.setStyle("LINK")
		.setURL(
			"https://discord.com/channels/" +
				message.guild.id +
				"/" +
				message.channel.id +
				"/" +
				message.id,
		);

	await board.send({
		content:
			`**${BOARD_EMOJI} ${message.reactions.resolve(BOARD_EMOJI)?.count || 0}** | ${
				message.channel
			}` + (author ? ` | ${author}` : ""),
		embeds,
		files: message.attachments.map((a) => a),
		components: [new MessageActionRow().addComponents(button)],
	});
}

/**
 * @param {number} newCount
 * @param {Message<boolean>} boardMessage
 */
export async function updateReactionCount(newCount, boardMessage) {
	if (newCount < MIN_COUNT) return boardMessage.delete();
	return boardMessage.edit({
		content: boardMessage.content.replace(/ \d+\*\*/, ` ${newCount}**`),
		embeds: boardMessage.embeds.map((oldEmbed) => new MessageEmbed(oldEmbed)),
		files: boardMessage.attachments.map((a) => a),
	});
}
