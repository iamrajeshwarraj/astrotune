module.exports = async (message, command, client = message.client) => {
  // Validate ViewChannel and ReadMessageHistory permissions first
  if (
    !message.guild.members.me
      .permissionsIn(message.channel)
      .has(["ViewChannel", "ReadMessageHistory"])
  ) {
    return false;
  }

  // Check SendMessages permission
  if (
    !message.guild.members.me.permissionsIn(message.channel).has("SendMessages")
  ) {
    await message.author
      .send({
        embeds: [
          new client.embed().desc(
            `${client.emoji.warn} **I need \`SendMessages\` permission in ${message.channel} to execute the command \`${command.name}\`**`
          ),
        ],
      })
      .catch(() => {});
    return false;
  }

  // Check EmbedLinks permission
  if (
    !message.guild.members.me.permissionsIn(message.channel).has("EmbedLinks")
  ) {
    await message.author
      .send({
        embeds: [
          new client.embed().desc(
            `${client.emoji.warn} **I need \`EmbedLinks\` permission in ${message.channel} to execute the command \`${command.name}\`**`
          ),
        ],
      })
      .catch(() => {});
    return false;
  }

  // Validate user permissions with proper checks
  if (
    command.userPerms?.length &&
    !message.member.permissions.has(command.userPerms)
  ) {
    const formattedPerms = command.userPerms
      .map((perm) => `\`${perm}\``)
      .join(", ");
    await message
      .reply({
        embeds: [
          new client.embed().desc(
            `${client.emoji.warn} **You need ${formattedPerms} permission(s) to use this command**`
          ),
        ],
      })
      .catch(() => {});
    return false;
  }

  // Validate bot permissions with proper null checks
  if (command.botPerms?.length) {
    const missingGlobal = !message.guild.members.me.permissions.has(
      command.botPerms
    );
    const missingChannel = !message.guild.members.me
      .permissionsIn(message.channel)
      .has(command.botPerms);

    if (missingGlobal || missingChannel) {
      const formattedPerms = command.botPerms
        .map((perm) => `\`${perm}\``)
        .join(", ");
      await message
        .reply({
          embeds: [
            new client.embed().desc(
              `${client.emoji.warn} **I need ${formattedPerms} permission(s) in ${message.channel} to execute this command**`
            ),
          ],
        })
        .catch(() => {});
      return false;
    }
  }

  return true;
};