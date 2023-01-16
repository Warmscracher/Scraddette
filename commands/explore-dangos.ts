import {
	ChannelType,
	ButtonStyle,
	CategoryChannel,
	type APIInteractionDataResolvedChannel,
	type GuildBasedChannel,
	type Snowflake,
	ComponentType,
	type InteractionReplyOptions,
	ApplicationCommandOptionType,
} from "discord.js";

import {
	boardDatabase,
	generateBoardMessage,
	boardReactionCount,
	BOARD_EMOJI,
} from "../common/board.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { defineCommand } from "../common/types/command.js";
import { disableComponents } from "../util/discord.js";
import { asyncFilter, firstTrueyPromise } from "../util/promises.js";
import { generateHash } from "../util/text.js";

/**
 * Determine if a text-based channel is a match of a guild-based channel.
 *
 * @param channelWanted - Guild based channel.
 * @param channelFound - Text based channel.
 *
 * @returns Whether the channel is a match.
 */
async function textChannelMatches(
	channelWanted: APIInteractionDataResolvedChannel | GuildBasedChannel,
	channelFound: Snowflake,
): Promise<boolean> {
	if (channelWanted.id === channelFound) return true;

	switch (channelWanted.type) {
		case ChannelType.GuildCategory: {
			const fetchedChannel =
				channelWanted instanceof CategoryChannel
					? channelWanted
					: await CONSTANTS.guild.channels.fetch(channelWanted.id).catch(() => {});

			if (fetchedChannel?.type !== ChannelType.GuildCategory)
				throw new TypeError("Channel#type disagrees with itself pre and post fetch");

			return await firstTrueyPromise(
				fetchedChannel.children
					.valueOf()
					.map(async (child) => await textChannelMatches(child, channelFound)),
			);
		}
		case ChannelType.GuildForum:
		case ChannelType.GuildText:
		case ChannelType.GuildAnnouncement: {
			// If channelFound is a matching non-thread it will have already returned at the start of the function, so only check for threads.
			const thread = await CONSTANTS.guild.channels.fetch(channelFound).catch(() => {});
			return thread?.parent?.id === channelWanted.id;
		}

		default: {
			// It’s a DM, stage, directory, non-matching thread, non-matching VC, or an unimplemented channel type.
			return false;
		}
	}
}

const defaultMinReactions = Math.round(boardReactionCount() * 0.4);

const command = defineCommand({
	data: {
		description: `Replies with a random message that has ${BOARD_EMOJI} reactions`,

		options: {
			"channel": {
				channelTypes: [
					ChannelType.GuildText,
					ChannelType.GuildVoice,
					ChannelType.GuildCategory,
					ChannelType.GuildAnnouncement,
					ChannelType.AnnouncementThread,
					ChannelType.PublicThread,
					ChannelType.PrivateThread,
					ChannelType.GuildForum,
				],

				description: "Filter messages to only get those in a certain channel",
				type: ApplicationCommandOptionType.Channel,
			},

			"minimum-reactions": {
				description: `Filter messages to only get those with at least this many reactions (defaults to ${defaultMinReactions})`,
				minValue: 1,
				type: ApplicationCommandOptionType.Integer,
			},

			"user": {
				description: "Filter messages to only get those by a certain user",
				type: ApplicationCommandOptionType.User,
			},
		},
	},

	async interaction(interaction) {
		await interaction.deferReply();
		const minReactions =
			interaction.options.getInteger("minimum-reactions") ?? defaultMinReactions;
		const user = interaction.options.getUser("user")?.id;
		const channelWanted = interaction.options.getChannel("channel");
		const { data } = boardDatabase;
		const fetchedMessages = asyncFilter(
			data.sort(() => Math.random() - 0.5),
			async (message) =>
				message.reactions >= minReactions &&
				(user ? message.user === user : true) &&
				(channelWanted ? await textChannelMatches(channelWanted, message.channel) : true) &&
				message,
		);

		const nextId = generateHash("next");
		const previousId = generateHash("prev");

		const messages: InteractionReplyOptions[] = [];
		// eslint-disable-next-line fp/no-let -- This needs to change.
		let index = 0;

		/**
		 * Get the next message to reply with.
		 *
		 * @returns The reply information.
		 */
		async function getNextMessage(): Promise<InteractionReplyOptions> {
			const info = (await fetchedMessages.next()).value;

			const reply: InteractionReplyOptions | undefined = info
				? await generateBoardMessage(info, {
						pre:
							index > 0
								? [
										{
											custom_id: previousId,
											label: "<< Previous",
											style: ButtonStyle.Primary,
											type: ComponentType.Button,
										},
								  ]
								: [],

						post: [
							{
								custom_id: nextId,
								label: "Next >>",
								style: ButtonStyle.Primary,
								type: ComponentType.Button,
							},
						],
				  })
				: {
						allowedMentions: { users: [] },

						components:
							index > 0
								? [
										{
											components: [
												{
													customId: previousId,
													label: "<< Previous",
													style: ButtonStyle.Primary,
													type: ComponentType.Button,
												},
											],

											type: ComponentType.ActionRow,
										},
								  ]
								: [],

						content: `${CONSTANTS.emojis.statuses.no} No messages found. Try changing any filters you may have used.`,

						embeds: [],
						ephemeral: true,
						files: [],
				  };

			if (!reply) {
				boardDatabase.data = data.filter(({ source }) => source !== info?.source);

				return await getNextMessage();
			}
			messages.push(reply);
			return reply;
		}

		const reply = await interaction.editReply(await getNextMessage());

		const collector = reply.createMessageComponentCollector({
			filter: (buttonInteraction) =>
				[previousId, nextId].includes(buttonInteraction.customId) &&
				buttonInteraction.user.id === interaction.user.id,

			time: CONSTANTS.collectorTime,
		});

		collector
			.on("collect", async (buttonInteraction) => {
				await buttonInteraction.deferUpdate();
				if (buttonInteraction.customId === previousId) index--;
				else index++;
				await interaction.editReply(messages[Number(index)] ?? (await getNextMessage()));

				collector.resetTimer();
			})
			.on("end", async () => {
				const source = await interaction.fetchReply();

				await interaction.editReply({
					allowedMentions: { users: [] },

					components: disableComponents(source.components),
				});
			});
	},
});
export default command;
