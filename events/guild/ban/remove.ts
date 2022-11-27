import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../../../common/logging.js";
import type Event from "../../../common/types/event";

const event: Event<"guildBanRemove"> = async function event(ban) {
	if (ban.guild.id !== CONSTANTS.guild.id) return;
	await log(`<:unbanmember:1041828855456997447> User ${ban.user.toString()} unbanned!`, "members");
};
export default event;
