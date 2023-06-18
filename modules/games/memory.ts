import {
	Collection,
	type ChatInputCommandInteraction,
	ComponentType,
	ButtonStyle,
	type APIMessageComponentEmoji,
	type Snowflake,
	ButtonInteraction,
	InteractionCollector,
	Message,
	type PartialMessage,
	User,
} from "discord.js";
import config from "../../common/config.js";
import { GAME_COLLECTOR_TIME, CURRENTLY_PLAYING, checkIfUserPlaying } from "./misc.js";
import constants from "../../common/constants.js";
import { generateHash } from "../../util/text.js";
import { disableComponents } from "../../util/discord.js";

const EMPTY_TILE = "⬛";

const deletedPings: Record<string, Snowflake | undefined> = {};

export default async function (interaction: ChatInputCommandInteraction<"cached" | "raw">) {
	const otherUser = interaction.options.getUser("user", true);
	if (
		otherUser.bot ||
		(interaction.user.id === otherUser.id && process.env.NODE_ENV === "production")
	) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You can’t play against that user!`,
		});
	}
	const mode = interaction.options.getString("mode") ?? "Traditional";
	const message = await interaction.reply({
		fetchReply: true,
		content: `${
			constants.emojis.misc.challenge
		} **${otherUser.toString()}, you are challenged to a game of Memory (${mode}) by ${interaction.user.toString()}!** Do you accept?`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: "Game on!",
						style: ButtonStyle.Success,
						customId: `confirm-${interaction.id}`,
					},
					{
						type: ComponentType.Button,
						label: "Not now…",
						customId: `cancel-${interaction.id}`,
						style: ButtonStyle.Danger,
					},
				],
			},
		],
	});
	message
		.createMessageComponentCollector({
			componentType: ComponentType.Button,
			filter: (buttonInteraction) =>
				otherUser.id === buttonInteraction.user.id &&
				buttonInteraction.customId.endsWith(`-${interaction.id}`),
			max: 1,
			time: GAME_COLLECTOR_TIME,
		})
		.on("collect", async (buttonInteraction) => {
			if (buttonInteraction.customId.startsWith("cancel-")) {
				await buttonInteraction.deferUpdate();
				await message.edit({ components: disableComponents(message.components) });
				return;
			}

			return await memory(buttonInteraction, {
				users: ([interaction.user, otherUser] satisfies [User, User]).sort(
					() => Math.random() - 0.5,
				),
				mode,
			});
		})
		.on("end", async (_, reason) => {
			if (reason === "time")
				await message.edit({ components: disableComponents(message.components) });
		});
}

async function memory(
	interaction: ButtonInteraction,
	{ users, mode }: { users: [User, User]; mode: string },
) {
	if (await checkIfUserPlaying(interaction)) return;
	const otherUser = users.find((user) => user.id !== interaction.user.id) ?? interaction.user;
	if (CURRENTLY_PLAYING.get(otherUser.id)) {
		await interaction.reply({
			content: `${constants.emojis.statuses.no} <@${otherUser}> is playing a different game now!`,
			ephemeral: true,
		});
		return;
	}

	await interaction.deferUpdate();
	const deletedHash = generateHash();
	const scores: [string[], string[]] = [[], ["22"]];
	const chunks = await setupGame(mode === "Easy" ? 4 : 2);
	let totalTurns = 0;
	let collector: InteractionCollector<ButtonInteraction> | undefined;
	let timeout: NodeJS.Timeout | undefined;

	const message = await interaction.message.edit(getBoard(totalTurns));

	CURRENTLY_PLAYING.set(users[0].id, {
		url: message.url,
		end: () => {
			collector?.stop("end");
			return endGame(`🛑 ${users[0].toString()} ended the game`, users[0]);
		},
	});
	CURRENTLY_PLAYING.set(users[1].id, {
		url: message.url,
		end: () => {
			collector?.stop("end");
			return endGame(`🛑 ${users[1].toString()} ended the game`, users[1]);
		},
	});

	await takeTurns(totalTurns);

	async function takeTurns(turn: number) {
		const user = users[turn % 2] ?? users[0];
		const ping = await message.reply({
			content: `🎲 ${user.toString()}, your turn!`,
			components: [
				{
					type: ComponentType.ActionRow,

					components: [
						{
							label: "End game",
							style: ButtonStyle.Danger,
							type: ComponentType.Button,
							customId: `${users.map((user) => user.id).join("-")}_endGame`,
						} as const,
					],
				},
			],
		});
		const shown: string[] = [];

		collector = message
			.createMessageComponentCollector({
				componentType: ComponentType.Button,
				filter: (interaction) => user.id === interaction.user.id,
				max: 2,
				idle: GAME_COLLECTOR_TIME,
			})
			.on("collect", async (buttonInteraction) => {
				if (timeout) clearTimeout(timeout);
				shown.push(buttonInteraction.customId);
				await buttonInteraction.deferUpdate();
				await interaction.message.edit(getBoard(turn, shown));
			})
			.on("end", async (_, endReason) => {
				if (endReason === "idle") {
					await ping.edit({ components: disableComponents(ping.components) });
					return endGame(`🛑 ${user.toString()}, you didn’t take your turn!`, user);
				}
				if (endReason === "end") {
					await ping.edit({ components: disableComponents(ping.components) });
					return;
				}

				totalTurns++;
				const selected = shown.map(
					([row = 6, column = 6]) => chunks[+row]?.[+column] ?? {},
				);

				const match = selected.every(
					(item) => item.name === selected[0]?.name && item.id === selected[0]?.id,
				);
				if (match) {
					scores[turn % 2]?.push(...shown);
					await interaction.message.edit(getBoard(turn));
				}

				deletedPings[deletedHash] = ping.id;
				await ping.delete();
				if (scores[0].length + scores[1].length === 25) return await endGame();

				timeout = setTimeout(
					() => interaction.message.edit(getBoard(turn + +!match)),
					GAME_COLLECTOR_TIME / 60,
				);
				await takeTurns(turn + +!match);
			});
	}

	function getBoard(turn: number, shown: string[] = []) {
		const firstTurn = turn % 2 ? "" : "__",
			secondTurn = turn % 2 ? "__" : "";

		return {
			content: `${firstTurn}${constants.emojis.misc.blue} ${users[0].toString()} - **${
				scores[0].length
			}** point${scores[0].length === 1 ? "" : "s"}${firstTurn}\n${secondTurn}${
				constants.emojis.misc.green
			} ${users[1].toString()} - **${scores[1].length}** point${
				scores[1].length === 1 ? "" : "s"
			}${secondTurn}`,

			components: chunks.map((chunk, rowIndex) => ({
				type: ComponentType.ActionRow,
				components: chunk.map((emoji, index) => {
					const id = rowIndex.toString() + index.toString();
					const discovered = shown.concat(...scores).includes(id);

					return {
						type: ComponentType.Button,
						emoji: discovered ? emoji : EMPTY_TILE,
						customId: id,
						style: ButtonStyle[
							scores[0]?.includes(id)
								? "Primary"
								: scores[1]?.includes(id)
								? "Success"
								: "Secondary"
						],
						disabled: discovered,
					} as const;
				}),
			})),

			allowedMentions: { users: [] },
		};
	}

	async function endGame(content?: string, user?: User) {
		CURRENTLY_PLAYING.delete(users[0].id);
		CURRENTLY_PLAYING.delete(users[1].id);
		deletedPings[deletedHash] = undefined;

		await message.edit({ components: disableComponents((await message.fetch()).components) });

		const firstScore = scores[0].length - (users[0].id === user?.id ? 2 : 0),
			secondScore = scores[1].length - (users[1].id === user?.id ? 2 : 0);

		const firstUser = `${users[0].toString()} - **${firstScore}** point${
				firstScore === 1 ? "" : "s"
			}`,
			secondUser = `${users[1].toString()} - **${secondScore}** point${
				secondScore === 1 ? "" : "s"
			}`;
		const secondWon = firstScore < secondScore;
		const winner = await config.guild.members.fetch(users[secondWon ? 1 : 0].id);

		await message.reply({
			content,
			embeds: [
				{
					description: `👑 ${secondWon ? secondUser : firstUser}\n${
						secondWon
							? `${constants.emojis.misc.blue} ${firstUser}`
							: `${constants.emojis.misc.green} ${secondUser}`
					}`,
					title: "Memory Results",
					color: winner.displayColor,
					thumbnail: { url: winner.displayAvatarURL() },
					footer: {
						text: `${totalTurns.toLocaleString()} turn${
							totalTurns === 1 ? "" : "s"
						} taken`,
					},
				},
			],
		});
	}
}

async function setupGame(difficulty: 2 | 4) {
	const allEmojis = new Collection(
		[
			"🥔",
			"🍡",
			"🥑",
			"😏",
			"🦆",
			"🇫🇷",
			"📻",
			...(process.env.NODE_ENV === "production"
				? [
						{ name: "bowling_ball", id: "1104935019232899183" },
						{ name: "hog", id: "1090372592642306048" },
						{ name: "mater", id: "1073805840584282224" },
						{ name: "new", id: "1091409541079507104" },
						{ name: "rick", id: "962421165295554601", animated: true },
						{ name: "rip", id: "1082693496739201205" },
						{ name: "sxd", id: "962798819572056164" },
						{ name: "wasteof", id: "1044651861682176080" },
				  ]
				: []),
		].map((emoji): [string, APIMessageComponentEmoji] =>
			typeof emoji === "string" ? [emoji, { name: emoji }] : [emoji.id, emoji],
		),
	).concat(
		(await config.guild.emojis.fetch())
			.filter((emoji) => emoji.available)
			.mapValues((emoji) => ({
				id: emoji.id,
				name: emoji.name ?? undefined,
				animated: emoji.animated || undefined,
			})),
	);
	const selected = allEmojis.random(24 / difficulty);
	const emojis = selected
		.concat(...Array<APIMessageComponentEmoji[]>(difficulty - 1).fill(selected))
		.sort(() => Math.random() - 0.5);

	const chunks = [];
	while (emojis.length) {
		chunks.push(
			chunks.length === 2
				? emojis.splice(0, 2).concat([{ name: EMPTY_TILE }], emojis.splice(0, 2))
				: emojis.splice(0, 5),
		);
	}

	return chunks;
}

export async function messageDelete(message: Message | PartialMessage) {
	return !Object.values(deletedPings).includes(message.id);
}
