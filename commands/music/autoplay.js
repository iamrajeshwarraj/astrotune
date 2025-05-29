const { ActionRowBuilder } = require("discord.js");

module.exports = {
  name: "autoplay",
  aliases: ["ap"],
  cooldown: "",
  category: "music",
  usage: "",
  description: "en/dis-able autoplay",
  args: false,
  vote: false,
  new: true, // Assuming this 'new' flag is for your own system
  admin: false,
  owner: false,
  botPerms: [],
  userPerms: [],
  player: true,
  queue: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (client, message, args, emoji) => {
    let player = await client.getPlayer(message.guild.id);
    const embedColor = client.color || client.config?.FUEGO?.COLOR || client.config?.EMBED_COLOR || "#3d16ca";

    let data = player.data.get("autoplay");

    const row = new ActionRowBuilder().addComponents(
      new client.button().success("enable", "Enable", "", data ? true : false), // Disabled if already enabled
      new client.button().danger("disable", "Disable", "", data ? false : true) // Disabled if already disabled
    );

    const initialEmbed = new client.embed(embedColor); // Create instance
    initialEmbed.desc( // Use your custom .desc() method
      `${emoji.autoplay || '🔄'} **Choose autoplay-mode :**` // Added fallback emoji
    );

    const m = await message
      .reply({
        embeds: [initialEmbed],
        components: [row],
      })
      .catch((e) => {client.log(`AutoplayCmd: Initial reply failed: ${e.message}`, "warn", "AutoplayCmd");});

    if (!m) return;

    const filter = async (interaction) => {
      if (interaction.user.id === message.author.id) {
        return true;
      }
      const permDenyEmbed = new client.embed(embedColor);
      permDenyEmbed.desc(`${emoji.no} Only **${message.author.tag}** can use this`);
      await interaction.reply({ embeds: [permDenyEmbed], ephemeral: true }).catch(() => {});
      return false;
    };
    const collector = m.createMessageComponentCollector({ // Removed optional chaining as 'm' is checked
      filter: filter,
      time: 60000,
      idle: 30000, // Corrected: 30000 / 2 is 15000, if you meant 30s idle, use 30000
    });

    collector.on("collect", async (interaction) => {
      if (!interaction.isButton()) return; // Ensure it's a button
      try {
        if (!interaction.deferred) await interaction.deferUpdate();
      } catch(e) { client.log(`AutoplayCmd: DeferUpdate failed: ${e.message}`, "warn", "AutoplayCmd"); return; }


      let responseEmbed = new client.embed(embedColor); // Create instance for response

      if (interaction.customId == "enable") {
        player.data.set("autoplay", true);
        responseEmbed.desc( // Use .desc()
          `${emoji.on || '✅'} **Autoplay is now \`Enabled\`**\n` +
            `${emoji.bell || '🔔'} *Set by ${message.author.tag} - (New config)*`
        );
        // await require("@functions/updateEmbed.js")(client, player); // Assuming this updates a main player embed
      } else { // Assumed "disable"
        player.data.set("autoplay", false);
        responseEmbed.desc( // Use .desc()
          `${emoji.off || '❌'} **Autoplay is now \`Disabled\`**\n` +
            `${emoji.bell || '🔔'} *Set by ${message.author.tag} - (New config)*`
        );
        // await require("@functions/updateEmbed.js")(client, player);
      }
      
      // Update embed after setting autoplay, if that function exists and is needed
      if (typeof require("@functions/updateEmbed.js") === 'function') {
          try {
            await require("@functions/updateEmbed.js")(client, player);
          } catch (updateEmbedError) {
            client.log(`AutoplayCmd: Error calling updateEmbed.js: ${updateEmbedError.message}`, "warn", "AutoplayCmd");
          }
      }

      await m.edit({ embeds: [responseEmbed], components: [] }).catch((e) => {client.log(`AutoplayCmd: Edit after selection failed: ${e.message}`, "warn", "AutoplayCmd");});
      collector.stop("selection_made"); // Stop collector after action
    });

    collector.on("end", async (collected, reason) => {
      if (reason !== "selection_made") { // Only edit if not already edited by successful selection
        player = await client.getPlayer(message.guild.id); // Re-fetch player to get latest autoplay state
        const timeoutEmbedDesc = player?.data.get("autoplay")
            ? `${emoji.on || '✅'} **Autoplay remains \`Enabled\`**\n` +
              `${emoji.bell || '🔔'} *Selection timed out! Fell back to existing config*`
            : `${emoji.off || '❌'} **Autoplay remains \`Disabled\`**\n` +
              `${emoji.bell || '🔔'} *Selection timed out! Fell back to existing config*`;
        
        const timeoutEmbed = new client.embed(embedColor);
        timeoutEmbed.desc(timeoutEmbedDesc);
        if (m && !m.deleted) { // Check if message m still exists
            await m.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        }
      }
    });
  },
};