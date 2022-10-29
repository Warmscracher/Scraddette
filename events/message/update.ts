import { automodMessage } from "../../common/moderation/automod.js";
import log, { getLoggingThread, shouldLog } from "../../common/moderation/logging.js";
import { extractMessageExtremities } from "../../util/discord.js";
import jsonDiff from "json-diff";
import { ButtonStyle, ComponentType, Message, PartialMessage } from "discord.js";
import diffLib from "difflib";
import CONSTANTS from "../../common/CONSTANTS.js";
import client from "../../client.js";

const loggingThread = await getLoggingThread("databases");
import type Event from "../../common/types/event";

const event: Event<"messageUpdate"> = async function event(oldMessage, newMessage) {
	if (newMessage.partial) newMessage = await newMessage.fetch();
	if (!shouldLog(newMessage.channel)) return;
	const logs = [];
	if (oldMessage.flags.has("Crossposted") !== newMessage.flags.has("Crossposted")) {
		logs.push(
			`📢 Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} ${
				newMessage.flags.has("Crossposted") ? "" : "un"
			}published`,
		);
	}
	if (oldMessage.flags.has("SuppressEmbeds") !== newMessage.flags.has("SuppressEmbeds")) {
		log(
			`🗄 Embeds ${
				newMessage.flags.has("SuppressEmbeds") ? "removed" : "shown"
			} on message by ${newMessage.author.toString()} in ${newMessage.channel.toString()}` +
				"!",
			"messages",
			{
				embeds: oldMessage.embeds,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								label: "View Message",
								style: ButtonStyle.Link,
								url: newMessage.url,
							},
						],
					},
				],
			},
		);
	}
	if (
		oldMessage.pinned !== null &&
		(newMessage.author.id === client.user.id) !==
			(newMessage.channel.id === CONSTANTS.channels.board?.id) &&
		oldMessage.pinned !== newMessage.pinned
	) {
		logs.push(
			`📌 Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} ${
				newMessage.pinned ? "" : "un"
			}pinned`,
		);
	}
	if (
		!oldMessage.partial &&
		!newMessage.interaction &&
		loggingThread.id !== newMessage.channel.id &&
		newMessage.author.id !== CONSTANTS.robotop
	) {
		const files = [];
		const contentDiff =
			oldMessage.content !== null &&
			diffLib
				.unifiedDiff((oldMessage.content ?? "").split("\n"), newMessage.content.split("\n"))
				.join("\n");

		const extraDiff = jsonDiff.diffString(
			await getMessageJSON(oldMessage),
			await getMessageJSON(newMessage),
			{ color: false },
		);

		if (contentDiff)
			files.push({
				attachment: Buffer.from(
					contentDiff.replace(/^--- \n{2}\+\+\+ \n{2}@@ .+ @@\n{2}/, ""),
					"utf-8",
				),
				name: "content.diff",
			});

		if (extraDiff)
			files.push({ attachment: Buffer.from(extraDiff, "utf-8"), name: "extra.diff" });

		if (files.length)
			log(
				`✏ Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} edited!`,
				"messages",
				{
					files,
					components: [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									label: "View Message",
									style: ButtonStyle.Link,
									url: newMessage.url,
								},
							],
						},
					],
				},
			);
	}

	await Promise.all(
		logs.map((edit) =>
			log(edit + "!", "messages", {
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								label: "View Message",
								style: ButtonStyle.Link,
								url: newMessage.url,
							},
						],
					},
				],
			}),
		),
	);
	if (await automodMessage(newMessage)) return;
};

async function getMessageJSON(message: Message | PartialMessage) {
	const { embeds, files } = await extractMessageExtremities(message);

	return {
		components: message.components.map((component) => component.toJSON()),
		embeds: message.author?.bot ?? true ? embeds : [],
		files: files,
	};
}
export default event;