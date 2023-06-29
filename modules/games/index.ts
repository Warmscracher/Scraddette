import { ApplicationCommandOptionType } from "discord.js";
import guessAddon from "./guessAddon.js";
import memoryMatch, { messageDelete } from "./memoryMatch.js";
import { defineButton, defineCommand, defineEvent } from "strife.js";
import { CURRENTLY_PLAYING } from "./misc.js";
import constants from "../../common/constants.js";
import { disableComponents } from "../../util/discord.js";

defineCommand(
	{ name: "guess-addon", description: "Think of an addon for me to guess it" },
	guessAddon,
);

defineCommand(
	{
		name: "memory-match",
		description: "Play a memory matching game against someone else",
		options: {
			user: {
				description: "A user to challenge",
				type: ApplicationCommandOptionType.User,
				required: true,
			},
			mode: {
				description: "The difficulty (defaults to Traditional)",
				type: ApplicationCommandOptionType.String,
				choices: {
					"Easy (2 matches per emoji)": "Easy",
					"Traditional (1 match per emoji)": "Traditional",
				},
			},
			thread: {
				description:
					"Whether to create a thread for chatting alongside the game (defaults to true)",
				type: ApplicationCommandOptionType.Boolean,
			},
		},
	},
	memoryMatch,
);
defineEvent.pre("messageDelete", messageDelete);

defineButton("endGame", async (interaction, users) => {
	if (!users.split("-").includes(interaction.user.id))
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You can’t end someone else’s game!`,
		});

	await interaction.message.edit({
		components: disableComponents(interaction.message.components),
	});

	const current = CURRENTLY_PLAYING.get(interaction.user.id);
	if (!current)
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You aren’t playing any games currently!`,
		});

	if (!current.end)
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You can’t end this game!`,
		});

	await interaction.deferUpdate();
	return await current.end();
});
