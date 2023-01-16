import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/logging.js";

import type Event from "../../common/types/event";

const event: Event<"emojiCreate"> = async function event(emoji) {
	if (emoji.guild.id !== CONSTANTS.guild.id) return;
	await log(
		`<:createemoji:1041829029667422278> Emoji ${emoji.toString()} created${
			emoji.author ? ` by ${emoji.author.toString()}` : ""
		}!`,
		"server",
	);
};
export default event;
