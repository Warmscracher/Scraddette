import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/logging.js";
import type Event from "../../common/types/event";

const event: Event<"emojiUpdate"> = async function event(oldEmoji, newEmoji) {
	if (newEmoji.name === oldEmoji.name || newEmoji.guild.id !== CONSTANTS.guild.id) return;
	await log(
		`<:updateemoji:1041829065298022510> Emoji ${oldEmoji.toString()} renamed to :${
			newEmoji.name
		}:!`,
		"server",
	);
};
export default event;
