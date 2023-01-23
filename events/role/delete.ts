import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/logging.js";

import type Event from "../../common/types/event";

const event: Event<"roleDelete"> = async function event(role) {
	if (role.guild.id !== CONSTANTS.guild.id) return;
	await log(
		`<:deleterole:1041830305281097748> Role @${role.name} deleted! (ID: ${role.id})`,
		"server",
	);
};
export default event;
