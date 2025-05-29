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
    const tickEmoji = emoji.tick || "<a:tick:1303637744983216232>";
    const crossEmoji = emoji.cross || "<a:cross:1303637975292313633>";
    const warningEmoji = emoji.warning || "<a:delete:1304402508462034995>";

    // Only bot owners can use this command
    const botOwnerID = "1296592612114960415"; // Replace with your actual bot owner ID
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
