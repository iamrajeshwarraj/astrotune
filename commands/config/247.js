/** @format
 *
 * Fuego By Painfuego
 * Version: 6.0.0-beta
 * © 2024 Aero-Services
 */

const { ActionRowBuilder } = require("discord.js");

module.exports = {
  name: "247",
  aliases: [],
  cooldown: "",
  category: "config",
  usage: "",
  description: "en/dis-able 247 mode",
  args: false,
  vote: false,
  new: false,
  admin: false,
  owner: false,
  botPerms: [],
  userPerms: [],
  player: true,
  queue: false,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (client, message, args, emoji) => {
    const player = await client.getPlayer(message.guild.id);
    // Ensure client.color is available or use a fallback from config
    const embedColor = client.color || client.config?.FUEGO?.COLOR || client.config?.EMBED_COLOR || "#3d16ca";


    let data = await client.db.twoFourSeven.get(
      `${client.user.id}_${message.guild.id}`,
    );

    const row = new ActionRowBuilder().addComponents(
      new client.button().success(
        "enable",
        "Enable 247",
        "", // No emoji needed if client.button handles it or if none desired
        data ? true : false, // Disabled if already enabled
      ),
      new client.button().danger(
        "disable",
        "Disable 247",
        "",
        data ? false : true, // Disabled if already disabled
      ),
    );

    const initialEmbed = new client.embed(embedColor) // Use defined embedColor
        .setTitle(`247 Profile:`) // CORRECTED
        .setDescription(`${emoji["247"] || '🔄'} **Choose a 247 mode below :**`); // Use setDescription, added fallback emoji

    const m = await message
      .reply({
        embeds: [initialEmbed],
        components: [row],
      })
      .catch((e) => {client.log(`247 command initial reply failed: ${e.message}`, "error", "247Cmd");});

    if (!m) return; // Stop if message sending failed

    const filter = async (interaction) => {
      if (interaction.user.id === message.author.id) {
        return true;
      }
      const permDenyEmbed = new client.embed(embedColor).desc(`${emoji.no} Only **${message.author.tag}** can use this`);
      await interaction.reply({ embeds: [permDenyEmbed], ephemeral: true }).catch(() => {});
      return false;
    };
    const collector = m.createMessageComponentCollector({ // Removed optional chaining
      filter: filter,
      time: 60000,
      idle: 30000 / 2,
    });

    collector.on("collect", async (interaction) => {
      if (!interaction.isButton()) return; // Ensure it's a button interaction
      try {
        if (!interaction.deferred) await interaction.deferUpdate();
      } catch(e) { client.log(`247Cmd deferUpdate failed: ${e.message}`, "warn", "247Cmd"); return; }


      let responseEmbed = new client.embed(embedColor); // Use defined embedColor

      if (interaction.customId == "enable") {
        await client.db.twoFourSeven.set(
          `${client.user.id}_${message.guild.id}`,
          {
            TextId: player.textId, // Ensure player.textId is correct
            VoiceId: player.voiceId, // Ensure player.voiceId is correct
          },
        );
        responseEmbed.setDescription( // Use setDescription
          `${emoji.on || '✅'} **247 mode is now \`Enabled\`**\n` +
            `${emoji.bell || '🔔'} *Set by ${message.author.tag} - (New config)*`,
        );
      } else { // Assumed "disable"
        await client.db.twoFourSeven.delete(
          `${client.user.id}_${message.guild.id}`,
        );
        responseEmbed.setDescription( // Use setDescription
          `${emoji.off || '❌'} **247 mode is now \`Disabled\`**\n` +
            `${emoji.bell || '🔔'} *Set by ${message.author.tag} - (New config)*`,
        );
      }
      await m.edit({ embeds: [responseEmbed], components: [] }).catch((e) => {client.log(`247Cmd success edit failed: ${e.message}`, "error", "247Cmd");});
      collector.stop("selection_made"); // Stop collector after action
    });

    collector.on("end", async (collected, reason) => {
      if (reason !== "selection_made") { // Only edit if not already edited by successful selection
        const timeoutEmbedDesc = data
            ? `${emoji.on || '✅'} **247 mode remains \`Enabled\`**\n` +
              `${emoji.bell || '🔔'} *Selection timed out! Fell back to existing config*`
            : `${emoji.off || '❌'} **247 mode remains \`Disabled\`**\n` +
              `${emoji.bell || '🔔'} *Selection timed out! Fell back to existing config*`;
        
        const timeoutEmbed = new client.embed(embedColor).setDescription(timeoutEmbedDesc); // Use setDescription
        await m.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
      }
    });
  },
};