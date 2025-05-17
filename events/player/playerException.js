module.exports = {
  name: "playerException",
  run: async (client, player, error) => {
    const guild = client.guilds.cache.get(player.guildId);
    if (!guild) return;

    let channel = await client.channels.cache.get(player.textId);
    
    await channel
      ?.send({
        embeds: [
          new client.embed().desc(
            `${client.emoji.warn} **Unknown exception occurred! Please use \`${client.prefix}report\` **\n` +
              `Join [support](${client.support}) for more information\n` +
              `\`\`\`js\n${error.exception.message}\n\`\`\``,
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
              `**Player Exception** in [ ${client.guilds.cache.get(
                player.guildId,
              )} ]\n` + `\`\`\`js\n${error.exception.message}\n\`\`\``,
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
      } catch (bitrateError) {
        console.error(`Failed to set bitrate: ${bitrateError.message}`);
      }
    }

    await client.getPlayer(player?.guildId).then((player) => player?.destroy());
  },
};
