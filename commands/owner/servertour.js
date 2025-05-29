const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "servertour",
  aliases: [],
  cooldown: "30",
  category: "owner",
  usage: "<@user>",
  description:
    "Drag a specified user through all voice channels in the server and return them to their original channel.",
  args: true,
  vote: false,
  new: false,
  admin: true,
  owner: true,
  botPerms: [PermissionFlagsBits.MoveMembers],
  userPerms: [],
  player: false,
  queue: false,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  execute: async (client, message, args, emoji = {}) => {
    // Define your custom emojis
    const warningEmoji = emoji.warning || "<a:delete:1304402508462034995>";
    const noEmoji = emoji.no || "<a:cross:1303637975292313633>";
    const yesEmoji = emoji.yes || "<a:tick:1303637744983216232>";

    // Only bot owners can use this command
    // const botOwnerID = "1296592612114960415"; // Replace with your actual bot owner ID
    // if (message.author.id !== botOwnerID) {
    //   return message.reply({
    //     embeds: [
    //       new client.embed().desc(`${noEmoji} **You are not authorized to use this command.**`),
    //     ],
    //   });
    // }

    const targetUser =
      message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!targetUser) {
      return message.reply({
        embeds: [
          new client.embed().desc(`${noEmoji} **Please specify a valid user.**`),
        ],
      });
    }

    if (!targetUser.voice.channel) {
      return message.reply({
        embeds: [
          new client.embed().desc(`${noEmoji} **The specified user is not in a voice channel.**`),
        ],
      });
    }

    const voiceChannels = message.guild.channels.cache.filter((channel) =>
      channel.isVoiceBased()
    );

    if (voiceChannels.size === 0) {
      return message.reply({
        embeds: [
          new client.embed().desc(`${noEmoji} **No voice channels found in this server.**`),
        ],
      });
    }

    const originalChannel = targetUser.voice.channel;

    const msg = await message.reply({
      embeds: [
        new client.embed().desc(
          `${warningEmoji} **Are you sure you want to start a server tour for ${targetUser}?**`
        ),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("confirm_tour")
            .setLabel("Confirm")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("cancel_tour")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });

    const filter = (interaction) => interaction.user.id === message.author.id;
    const collector = msg.createMessageComponentCollector({ filter });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "confirm_tour") {
        await interaction.update({
          embeds: [new client.embed().desc(`${yesEmoji} **Starting the server tour...**`)],
          components: [],
        });

        try {
          // Iterate through voice channels and move the user only to channels the bot has access to
          for (const channel of voiceChannels.values()) {
            const botPermissions = channel.permissionsFor(message.guild.members.me);
            
            // Ensure botPermissions is not null and is a valid PermissionsBitField object
            if (!botPermissions || !(botPermissions instanceof PermissionsBitField)) {
              console.log(`Bot has no permissions in channel: ${channel.name}`);
              continue;
            }

            // Check if the bot has both VIEW_CHANNEL and CONNECT permissions
            if (
              botPermissions.has(PermissionFlagsBits.ViewChannel) &&
              botPermissions.has(PermissionFlagsBits.Connect)
            ) {
              // If bot has permissions, move the user to the channel
              await targetUser.voice.setChannel(channel);
              await new Promise((resolve) => setTimeout(resolve, 1000)); // 1-second delay between moves
            } else {
              console.log(`Bot lacks permissions to view or connect to channel: ${channel.name}`);
            }
          }

          // Ensure that bot has permissions to move user back to the original channel
          const originalChannelPermissions = originalChannel.permissionsFor(message.guild.members.me);
          if (originalChannelPermissions.has(PermissionFlagsBits.Connect)) {
            // After the tour, move the user back to their original channel
            await targetUser.voice.setChannel(originalChannel);
          } else {
            console.log(`Bot lacks permissions to connect to the original channel: ${originalChannel.name}`);
            message.reply({
              embeds: [
                new client.embed().desc(`${noEmoji} **Bot lacks permission to return user to the original channel.**`),
              ],
            });
            return;
          }

          message.reply({
            embeds: [
              new client.embed().desc(
                `${yesEmoji} **Successfully completed the server tour for ${targetUser}. They have been returned to their original channel.**`
              ),
            ],
          });
        } catch (error) {
          // Log error for debugging
          console.error("Error during server tour:", error); // Log the error for debugging

          message.reply({
            embeds: [
              new client.embed().desc(`${noEmoji} **An error occurred during the server tour.**`),
            ],
          });
        }
      } else if (interaction.customId === "cancel_tour") {
        await interaction.update({
          embeds: [new client.embed().desc(`${noEmoji} **Server tour canceled.**`)],
          components: [],
        });
      }
    });

    collector.on("end", (collected, reason) => {
      if (reason === "time") {
        msg.edit({
          embeds: [
            new client.embed().desc(`${noEmoji} **Server tour operation timed out.**`),
          ],
          components: [],
        });
      }
    });
  },
};
