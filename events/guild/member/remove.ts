import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../../../common/logging.js";
import { closeModmail, getThreadFromMember } from "../../../common/modmail.js";
import type Event from "../../../common/types/event";
import Database from "../../../common/database.js";

export const rolesDatabase = new Database("roles");
await rolesDatabase.init();

const event: Event<"guildMemberAdd"> = async function event(member) {
	if (member.guild.id !== CONSTANTS.guild.id) return;
	await log(`<:leave:1041828514929840208> Member ${member.toString()} left!`, "members");

	const banned = await CONSTANTS.guild.bans
		.fetch(member)
		.then((partialBan) => {
			if (partialBan.partial) return partialBan.fetch();
			return partialBan;
		})
		.catch(() => {});

	const byes = banned
		? [
				`<:ban:1041828544617119764> Oof… **${member.user.username}** got banned…`,
				`<:ban:1041828544617119764> There’s no turning back for **${member.user.username}**…`,
				`<:ban:1041828544617119764> I don't think this was the best place for **${member.user.username}**…`,
				`<:ban:1041828544617119764> Oop, **${member.user.username}** angered the mods!`,
				`<:ban:1041828544617119764> **${member.user.username}** broke the rules and took an L`,
				`<:ban:1041828544617119764> **${member.user.username}** talked about opacity slider too much`,
				`<:ban:1041828544617119764> Yande didnt want to live in the same server with **${member.user.username}**.`,
		  ]
		: [
				`<:leave:1041828514929840208> Welp… **${member.user.username}** decided to leave… what a shame…`,
				`<:leave:1041828514929840208> Ahh… **${member.user.username}** left us… hope they’ll have safe travels!`,
				`<:leave:1041828514929840208> There goes another, bye **${member.user.username}**!`,
				`<:leave:1041828514929840208> Oop, **${member.user.username}** left… will they ever come back?`,
				`<:leave:1041828514929840208> Can we get an F in the chat for **${member.user.username}**? They left!`,
				`<:leave:1041828514929840208> Ope, **${member.user.username}** got eaten by an evil kumquat and left!`,
				`<:leave:1041828514929840208> **${member.user.username}**? dissapeared 🤷`,
		  ];

	const promises = [
		CONSTANTS.channels.welcome?.send(
			CONSTANTS.emojis.misc[banned ? "ban" : "leave"] +
				" " +
				byes[Math.floor(Math.random() * byes.length)],
		),
		getThreadFromMember(member).then(async (thread) => {
			if (thread) closeModmail(thread, member.user, "Member left");
		}),
	];

	await Promise.all(promises);
	const allRoles = rolesDatabase.data;
	const databaseIndex = allRoles.findIndex((entry) => entry.user === member.id);

	const memberRoles = Object.fromEntries(
		member.roles
			.valueOf()
			.filter(
				(role) =>
					role.editable &&
					role.id !== CONSTANTS.guild.id &&
					![CONSTANTS.roles.active?.id, CONSTANTS.roles.weekly_winner?.id].includes(
						role.id,
					),
			)
			.map((role) => [role.id, true] as const),
	);

	if (databaseIndex === -1) allRoles.push(Object.assign({ user: member.id }, memberRoles));
	else allRoles[databaseIndex] = Object.assign({}, allRoles[databaseIndex], memberRoles);

	rolesDatabase.data = allRoles;
};
export default event;
