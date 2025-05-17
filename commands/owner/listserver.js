const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors } = require('discord.js');

module.exports = {
  name: "serverlist",
  aliases: ["servers"],
  cooldown: "",
  category: "owner",
  usage: "",
  description: "Displays a list of all servers the bot is in.",
  args: false,
  vote: false,
  new: false,
  admin: true,
  owner: true,
  botPerms: [],
  userPerms: [],
  player: false,
  queue: false,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  execute: async (client, message, args, emoji) => {
    const servers = client.guilds.cache.map(guild => ({
      name: guild.name,
      id: guild.id,
      memberCount: guild.memberCount,
    }));

    const pageSize = 10;
    let currentPage = 0;
    const totalPages = Math.ceil(servers.length / pageSize);

    const generateEmbed = (page) => {
      const start = page * pageSize;
      const end = start + pageSize;

      const serverList = servers
        .slice(start, end)
        .map((server, index) => `${start + index + 1}. **${server.name}** - ${server.memberCount} members`)
        .join("\n");

      return new EmbedBuilder()
        .setTitle(`Server List (Page ${page + 1}/${totalPages})`)
        .setDescription(serverList)
        .setColor(`#000000`);
    };

    const generateButtons = (page) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('previous')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages - 1),
      );
    };

    const embedMessage = await message.reply({
      embeds: [generateEmbed(currentPage)],
      components: [generateButtons(currentPage)],
    });

    const collector = embedMessage.createMessageComponentCollector({
      filter: (interaction) => interaction.user.id === message.author.id,
      time: 60000,
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'previous') {
        currentPage--;
      } else if (interaction.customId === 'next') {
        currentPage++;
      }

      await interaction.update({
        embeds: [generateEmbed(currentPage)],
        components: [generateButtons(currentPage)],
      });
    });

    collector.on('end', async () => {
      await embedMessage.edit({
        components: [],
      });
    });
  },
};
