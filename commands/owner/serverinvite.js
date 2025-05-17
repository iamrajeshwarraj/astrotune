/** @format
 *
 * Fuego By Painfuego
 * Version: 6.0.0-beta
 * © 2024 1sT-Services
 */

module.exports = {
  name: "serverinvite",
  aliases: [],
  cooldown: "",
  category: "owner",
  usage: "<server_id>",
  description: "Send an invite link for the specified server by server ID",
  args: true,
  vote: false,
  new: false,
  admin: false,
  owner: true,
  botPerms: [],
  userPerms: [],
  player: false,
  queue: false,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  execute: async (client, message, args, emoji = {}) => {
    const serverID = args[0];

    // Define emojis
    const tickEmoji = emoji.tick || "<:tick_icon:1272041968842833962>";
    const crossEmoji = emoji.cross || "<:nwrong:1272036067327082530>";
    const warningEmoji = emoji.warning || "<:warn:1272040411598164070>";

    // Only bot owners can use this command
    const botOwnerID = "940959891005243442"; // Replace with your actual bot owner ID
    if (message.author.id !== botOwnerID) {
      return message.reply({
        embeds: [
          new client.embed().desc(`${crossEmoji} **You are not authorized to use this command.**`),
        ],
      });
    }

    // Check if server ID is provided
    if (!serverID) {
      return message.reply({
        embeds: [
          new client.embed().desc(`${crossEmoji} **Please provide a valid server ID.**`),
        ],
      });
    }

    // Fetch the guild (server) by ID
    const guild = client.guilds.cache.get(serverID);

    if (!guild) {
      return message.reply({
        embeds: [
          new client.embed().desc(`${crossEmoji} **Server not found. Please provide a valid server ID.**`),
        ],
      });
    }

    try {
      // Fetch or create an invite for the server
      const invite = await guild.invites.create(guild.channels.cache.filter(channel => channel.isTextBased()).first(), {
        maxAge: 0, // No expiration
        maxUses: 0, // Unlimited uses
        reason: `Invite requested by ${message.author.tag}`,
      });

      // Send the invite link
      return message.reply({
        embeds: [
          new client.embed().desc(`${tickEmoji} **Invite link for ${guild.name}:** ${invite.url}`),
        ],
      });
    } catch (error) {
      console.error(error);
      return message.reply({
        embeds: [
          new client.embed().desc(`${crossEmoji} **Failed to create an invite for the server.**`),
        ],
      });
    }
  },
};
