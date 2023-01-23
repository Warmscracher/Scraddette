import { suggestionsDatabase } from "../../commands/get-top-suggestions.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/logging.js";
import { sendClosedMessage } from "../../common/modmail.js";
import type Event from "../../common/types/event";

const event: Event<"threadDelete"> = async function event(thread) {
	if (thread.guild.id !== CONSTANTS.guild.id) return;

	if (thread.parent?.id === CONSTANTS.channels.suggestions?.id) {
		suggestionsDatabase.data = suggestionsDatabase.data.filter(({ id }) => id !== thread.id);
	}

	log(
		`<:deletethread:1041830230177878136> Thread #${thread.name} ${
			thread.parent ? `in ${thread.parent?.toString()} ` : ""
		}deleted! (ID: ${thread.id})`,
		"channels",
	);
	if (thread.parent?.id !== CONSTANTS.channels.modmail?.id || thread.archived) return;

	await sendClosedMessage(thread);
};
export default event;
