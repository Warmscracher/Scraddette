import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../../../common/logging.js";
import type Event from "../../../common/types/event";

const event: Event<"guildBanAdd"> = async function event(ban) {
	if (ban.partial) ban = await ban.fetch();
	if (ban.guild.id !== CONSTANTS.guild.id) return;
	await log(
		`<:banmembers:1041828789048586360> User ${ban.user.toString()} banned${
			ban.reason ? ` - ${ban.reason}` : "!"
		}`,
		"members",
	);
};
export default event;
