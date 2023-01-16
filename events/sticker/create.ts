import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/logging.js";

import type Event from "../../common/types/event";

const event: Event<"stickerCreate"> = async function event(partialSticker) {
	const sticker = partialSticker.partial ? await partialSticker.fetch() : partialSticker;
	if (!sticker.guild || sticker.guild.id !== CONSTANTS.guild.id) return;
	await log(`<:createsticker:1041830125228003329> Sticker ${sticker.name} created!`, "server");
};
export default event;
