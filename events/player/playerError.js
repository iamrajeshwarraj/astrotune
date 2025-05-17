module.exports = {
  name: "playerError",
  run: async (client, player, type, error) => {
    const guild = client.guilds.cache.get(player.guildId);
    if (!guild) return;
    
    let channel = await client.channels.cache.get(player.textId);
    
    await channel
      ?.send({
        embeds: [
          new client.embed().desc(
            `${client.emoji.warn} **Unknown error occurred! Please use \`${client.prefix}report\`**\n` +
              `Join [support](${client.support}) for more information\n` +
              `\`\`\`js\n${type}\n${JSON.stringify(error)}\n\`\`\``,
          ),
        ],
      })
      .catch(() => {});

    await client.webhooks.error
      .send({
        username: client.user.username,
        avatarURL: client.user.displayAvatarURL(),
        embeds: [
          new client.embed()
            .desc(
              `**Player Error** in [ ${client.guilds.cache.get(
                player.guildId,
              )} ]\n` + `\`\`\`js\n${type}\n${JSON.stringify(error)}\n\`\`\``,
            )
            .setColor("#fa7f2d"),
        ],
      })
      .catch(() => {});

    await client.sleep(1500);

    // Fetch the voice channel and change its bitrate to 64000
    let voiceChannel = guild.channels.cache.get(player.voiceId);
    if (voiceChannel && voiceChannel.type === 2) {
      try {
        await voiceChannel.setBitrate(64000);
      } catch (error) {
        console.error(`Failed to set bitrate: ${error.message}`);
      }
    }

    await client.getPlayer(player?.guildId).then((player) => player?.destroy());
  },
};
