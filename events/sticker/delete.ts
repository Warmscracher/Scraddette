import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/logging.js";
import type Event from "../../common/types/event";

const event: Event<"stickerDelete"> = async function event(sticker) {
	if (!sticker.guild || sticker.guild.id !== CONSTANTS.guild.id) return;
	await log(`<:deletesticker:1041830160619556905> Sticker ${sticker.name} deleted!`, "server");
};
export default event;
