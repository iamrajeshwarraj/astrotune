// events/custom/player/playerDestroy.js
const { cleanupPlayerMessages } = require('../../utils/messageCleanup.js'); // Path from playerDestroy.js to utils/

module.exports = {
  name: "playerDestroy",
  run: async (client, player) => {
    const guild = client.guilds.cache.get(player.guildId);
    if (!guild) {
      // If guild is not found, attempt cleanup with just player.guildId if available
      if (player && player.guildId) {
        await cleanupPlayerMessages(client, player.guildId);
      }
      return;
    }

    const channel = guild.channels.cache.get(player.voiceChannel); // voiceChannel might be voiceId depending on your Erela version
    if (channel && channel.type === 2) { // GuildVoice
      try {
        await channel.setBitrate(64000);
      } catch (error) {
        // console.error(`Failed to set bitrate in ${guild.name}: ${error.message}`); // Use client.logger if available
        client.logger.error(`Failed to set bitrate in ${guild.name}: ${error.message}`);
      }
    }

    if (player.data.get("message")) {
      player.data
        .get("message")
        .edit({
          embeds: [client.endEmbed], // Assuming client.endEmbed is defined
          components: [],
          files: [],
        })
        .catch(() => {}); // Ignore errors if message is already deleted
    }

    if (player.data.get("autoplay")) {
      try {
        player.data.delete("autoplay");
      } catch (err) {}
    }

    // Perform the general message cleanup
    if (player && player.guildId) {
      await cleanupPlayerMessages(client, player.guildId);
    }

    // Webhook logging should ideally be last or handled robustly
    await client.webhooks.player
      .send({
        username: client.user.username,
        avatarURL: client.user.displayAvatarURL(),
        embeds: [
          new client.embed().desc( // Assuming client.embed is your EmbedBuilder preset
            `**Player Destroyed** in [ ${guild.name} (${player.guildId}) ]`,
          ),
        ],
      })
      .catch((err) => {
        // client.logger.error(`Failed to send webhook for playerDestroy in ${player.guildId}: ${err.message}`);
      });
  },
};