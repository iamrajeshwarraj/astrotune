// events/custom/player/playerEmpty.js
const autoplay = require("@functions/autoplay"); // Assuming this path is correct
const { cleanupPlayerMessages } = require('../../utils/messageCleanup.js'); // Path from playerEmpty.js to utils/

module.exports = {
  name: "playerEmpty",
  run: async (client, player) => {
    // If playerEnd has already run and cleaned up, this specific message handling might be redundant
    // or for a message specifically posted BY playerEmpty itself.
    if (player.data.get("message")) {
      let m = player.data.get("message");
      if (player.data.get("autoplay")) {
        // If autoplaying, the message from the PREVIOUS song would have been handled by playerEnd.
        // Autoplay will trigger playerStart for the new song, which creates its own message.
        // So, deleting 'm' here might be for a message that playerEmpty itself posted, or it's legacy.
        m?.delete().catch(() => {});
      } else {
        // If not autoplaying, edit the message to an "end" state.
        m?.edit({
          embeds: [client.endEmbed], // Assuming client.endEmbed is defined
          components: [],
          files: [],
        }).catch(() => {});
      }
    }

    if (player.data.get("autoplay")) {
      player.previous = player.data.get("autoplaySystem"); // Ensure this is set correctly for your autoplay logic
      let channel = await client.channels.cache.get(player.textId); // textId might be textChannel
      // Note: If playerEnd already cleaned messages, ensure autoplay doesn't rely on old ones.
      // The `cleanupPlayerMessages` in `playerEnd` should have cleared the way.
      return autoplay(client, player, channel); // Assuming autoplay triggers a new playerStart
    }

    // Webhook for queue ended
    await client.webhooks.player
      .send({
        username: client.user.username,
        avatarURL: client.user.displayAvatarURL(),
        embeds: [
          new client.embed().desc( // Assuming client.embed is your EmbedBuilder preset
            `**Queue ended** in [ ${client.guilds.cache.get(player.guildId)?.name || player.guildId} ]`,
          ),
        ],
      })
      .catch(() => {});

    const TwoFourSeven = await client.db.twoFourSeven.get( // Ensure client.db is initialized
      `${client.user.id}_${player.guildId}`,
    );

    if (TwoFourSeven) {
      if (!player.queue.previous && !player.queue.current) { // Check if it was truly empty and not just between songs
        client.channels.cache
          .get(player.textId) // textId might be textChannel
          ?.send({
            embeds: [
              new client.embed().desc(
                `${client.emoji.bell || '🔔'} **Not leaving VC as 24/7 is Enabled**\n` + // Added default emoji
                `Bound to  : ** <#${player.voiceId || player.voiceChannel}> [ <#${player.textId || player.textChannel}> ]**`,
              ),
            ],
          })
          .then((msg) => {
            setTimeout(() => {
              msg.delete().catch(() => {});
            }, 5000);
          })
          .catch(() => {});
      }
      return; // Player stays, messages from last song should have been cleaned by playerEnd
    }

    // If not 24/7 and not autoplaying, wait for inactivity
    await client.sleep(30000);

    const newPlayerInstance = await client.getPlayer(player.guildId); // Use a different variable name
    // Check if the player instance still exists and if it's truly inactive
    if (newPlayerInstance && !newPlayerInstance.playing && (!newPlayerInstance.queue || newPlayerInstance.queue.size === 0) && !newPlayerInstance.queue.current) {
      client.channels.cache
        .get(player.textId) // textId might be textChannel
        ?.send({
          embeds: [
            new client.embed().desc(
              `${client.emoji.bell || '🔔'} **Player destroyed due to inactivity**`, // Added default emoji
            ),
          ],
        })
        .then((msg) => {
          setTimeout(() => {
            msg.delete().catch(() => {});
          }, 5000);
        })
        .catch(() => {});

      await client.sleep(1500);

      const guild = client.guilds.cache.get(player.guildId);
      if (guild) {
        const voiceChannelInstance = guild.channels.cache.get(player.voiceId || player.voiceChannel); // Use consistent property
        if (voiceChannelInstance && voiceChannelInstance.type === 2) { // GUILD_VOICE
          try {
            await voiceChannelInstance.setBitrate(64000);
          } catch (error) {
            // console.error(`Failed to set bitrate: ${error.message}`);
            client.logger.error(`Failed to set bitrate after inactivity in ${guild.name}: ${error.message}`);
          }
        }
      }
      
      // The destroy call will trigger 'playerDestroy', which now calls cleanupPlayerMessages.
      // So, no explicit call to cleanupPlayerMessages is strictly needed here IF player.destroy() is guaranteed to run playerDestroy handler.
      if (newPlayerInstance) { // Check again if player still exists
        await newPlayerInstance.destroy();
      }
    }
  },
};