// events/custom/player/playerEnd.js
/** @format
 *
 * Fuego By Painfuego
 * Version: 6.0.0-beta
 * © 2024 Aero-Services
 */
const { cleanupPlayerMessages } = require('../../utils/messageCleanup.js'); // Path from playerEnd.js to utils/

module.exports = {
  name: "playerEnd",
  run: async (client, player, track) => { // track is often passed to playerEnd
    // The specific player.data.get("message") is usually the main "Now Playing" message.
    // The cleanupPlayerMessages will handle this if it was part of guildTrackMessages,
    // and also any other messages like lyrics.
    // If player.data.get("message") is NOT tracked by guildTrackMessages, you might keep its specific delete.
    // However, for simplicity and to ensure lyrics are also cleaned, we use the general cleanup.

    // if (player.data.get("message")) { // This specific deletion might become redundant
    //   player.data
    //     .get("message")
    //     ?.delete()
    //     .catch(() => {});
    // }

    // Perform the general message cleanup for the ended track
    if (player && player.guildId) {
      await cleanupPlayerMessages(client, player.guildId);
    }

    // Any other logic for playerEnd (like checking for autoplay and adding next track) would go here.
    // For example, if your autoplay logic is here:
    // if (player.data.get("autoplay")) {
    //   await handleAutoplay(client, player); // Hypothetical autoplay handler
    // }
  },
};