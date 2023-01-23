import { suggestionsDatabase } from "../../commands/get-top-suggestions.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import log, { shouldLog } from "../../common/logging.js";

import type Event from "../../common/types/event";

const event: Event<"threadDelete"> = async function event(thread) {
	if (thread.guild.id !== CONSTANTS.guild.id) return;
	if (!shouldLog(thread)) return;

	if (thread.parent?.id === CONSTANTS.channels.suggestions?.id)
		suggestionsDatabase.data = suggestionsDatabase.data.filter(({ id }) => id !== thread.id);

	await log(
		`<:deletethread:1041830230177878136> Thread #${thread.name} ${
			thread.parent ? `in ${thread.parent.toString()} ` : ""
		}deleted! (ID: ${thread.id})`,
		"channels",
	);
};
export default event;
