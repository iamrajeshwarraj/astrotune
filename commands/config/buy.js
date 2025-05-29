const { ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");

module.exports = {
  name: "buy",
  aliases: [],
  cooldown: "",
  category: "config",
  usage: "",
  description: "Use coins to buy premium",
  args: false,
  vote: false,
  new: false,
  admin: false,
  owner: false,
  botPerms: [],
  userPerms: [],
  player: false,
  queue: false,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  execute: async (client, message, args, emoji) => {
    // Ensure client.color is available or use a fallback from config
    const embedColor = client.color || client.config?.FUEGO?.COLOR || client.config?.EMBED_COLOR || "#3d16ca";

    let [coins, premiumUser, premiumGuild] = await Promise.all([
      parseInt((await client.db.coins.get(`${message.author.id}`)) || 0),
      await client.db.premium.get(`${client.user.id}_${message.author.id}`),
      await client.db.premium.get(`${client.user.id}_${message.guild.id}`),
    ]);

    let user = new StringSelectMenuBuilder()
      .setCustomId("user")
      .setMinValues(1)
      .setMaxValues(1)
      .setPlaceholder("Choose the following plans given below(User)")
      .addOptions([
        {
          label: "7 days premium (300 coins)",
          value: "7_300",
          emoji: `<:premium:1308536300529385542>`,
        },
        {
          label: "28 days premium (1000 coins)",
          value: "28_1000",
          emoji: `<:premium:1308536300529385542>`,
          disabled: true, // Assuming this is intentional
        },
        {
          label: "84 days premium (2500 coins)",
          value: "84_2500",
          emoji: `<:premium:1308536300529385542>`,
        },
        {
          label: "168 days premium (5000 coins)",
          value: "168_5000",
          emoji: `<:premium:1308536300529385542>`,
        },
      ]);
    let guild = new StringSelectMenuBuilder()
      .setCustomId("guild")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions([
        {
          label: "7 days premium (500 coins)",
          value: "7_500",
          emoji: `<:premium:1308536300529385542>`,
        },
        {
          label: "28 days premium (1800 coins)",
          value: "28_1800",
          emoji: `<:premium:1308536300529385542>`,
          disabled: true, // Assuming this is intentional
        },
        {
          label: "84 days premium (5000 coins)",
          value: "84_5000",
          emoji: `<:premium:1308536300529385542>`,
        },
        {
          label: "168 days premium (7500 coins)",
          value: "168_7500",
          emoji: `<:premium:1308536300529385542>`,
        },
      ]);

    let rows = [
      premiumUser
        ? new ActionRowBuilder().addComponents(
            user
              .setDisabled(true)
              .setPlaceholder("Premium is already active (User)"), // Clarified placeholder
          )
        : new ActionRowBuilder().addComponents(
            user
              .setDisabled(false)
              .setPlaceholder("Choose your premium plan (User)"),
          ),
      premiumGuild
        ? new ActionRowBuilder().addComponents(
            guild
              .setDisabled(true)
              .setPlaceholder("Premium is already active (Guild)"), // Clarified placeholder
          )
        : new ActionRowBuilder().addComponents(
            guild
              .setDisabled(false)
              .setPlaceholder("Choose your premium plan (Guild)"),
          ),
    ];

    const initialEmbed = new client.embed(embedColor) // Use defined embedColor
        .desc(
            `<:CoinFlipHeads:1308559290545606717> **You have a total of ${coins || `0`} coins\n\n` +
            `<a:VinylRecord:1308559679621693492> Ready to Upgrade? Purchase Premium Now! <a:VinylRecord:1308559679621693492>\n\n` + // Added newline for better spacing
            `With our \`${client.prefix}buy\` command, securing your Premium membership is just a step away. Unlock exclusive features, enjoy high-quality audio, and elevate your music experience instantly!\n\n` + // Added newline
            `Simply use the menus below to get started, and join our community of music lovers who are already enjoying the best we have to offer.\n\n` + // Added newline
            `<:premium:1308536300529385542> Your premium music journey awaits! <:premium:1308536300529385542>**`
        )
        .setFooter({
            text: `Developed by Nexus.`, // Removed extra spaces
        });


    const m = await message
      .reply({
        embeds: [initialEmbed],
        components: rows,
      })
      .catch((e) => {client.log(`Buy command initial reply failed: ${e.message}`, "error", "BuyCmd");});

    if (!m) return; // Stop if message sending failed

    const filter = async (interaction) => {
      if (interaction.user.id === message.author.id) {
        return true;
      }
      const permDenyEmbed = new client.embed(embedColor).desc(`${emoji.no} Only **${message.author.tag}** can use this`);
      await interaction.reply({ embeds: [permDenyEmbed], ephemeral: true }).catch(() => {});
      return false;
    };
    const collector = m.createMessageComponentCollector({ // Removed optional chaining as 'm' is checked
      filter: filter,
      time: 60000,
      idle: 30000 / 2, // This is 15 seconds
    });

    collector.on("collect", async (interaction) => {
      if (!interaction.isStringSelectMenu()) return; // Ensure it's a select menu interaction
      try {
        if (!interaction.deferred) await interaction.deferUpdate();
      } catch (e) { client.log(`BuyCmd deferUpdate failed: ${e.message}`, "warn", "BuyCmd"); return; }


      const choice = interaction.values[0];
      let duration = choice.split("_")[0];
      let coinsNeeded = parseInt(choice.split("_")[1], 10); // Ensure coinsNeeded is a number
      let type = interaction.customId; // "user" or "guild"

      if (coins < coinsNeeded) {
        const coinsNeededEmbed = new client.embed(embedColor).desc(
            `**Need coins ? Here's how you can get them:**\n\n` +
            `${emoji.free} **For Freebies :**\n` +
            `⠀⠀⠀Each cmd used (1-3 coins)\n` +
            `⠀⠀⠀Add me in server (150 coins)\n` +
            `${emoji.rich} **For Rich boys :**\n` +
            `⠀⠀⠀Boost support server (1000 coins)\n` +
            `⠀⠀⠀Pay 1.5M UwU or 29.99 INR (1800 coins)\n` +
            `${emoji.danger} **For Daredevils :**\n` +
            `⠀⠀⠀Beg ! May get u rich / blacklisted\n\n` +
            `${emoji.warn} **You need ${coinsNeeded - coins} more coins for this plan**`
        );
        // No need to edit 'm', just followup
        return interaction.followUp({ embeds: [coinsNeededEmbed], ephemeral: true, }).catch(e => client.log(`BuyCmd followup failed: ${e.message}`, "warn", "BuyCmd"));
      }

      coins = coins - coinsNeeded;
      await client.db.coins.set(`${message.author.id}`, coins);
      let expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(duration));
      const expiryTimestamp = expiryDate.getTime(); // Store timestamp

      await client.db.premium.set(
        `${client.user.id}_${type === "user" ? message.author.id : message.guild.id}`,
        expiryTimestamp, // Store the timestamp
      );

      // interaction.CustomId; // This line doesn't do anything, can be removed

      const successEmbed = new client.embed(embedColor) // Use defined embedColor
          .setTitle(`Premium Activated !`) // CORRECTED
          .setDescription( // Use setDescription for main content
            `**${emoji.cool || '🎉'} Expiry : **<t:${Math.round(expiryTimestamp / 1000)}:R>\n` +
            `**<:premium:1308536300529385542> Premium Type : **${type.toUpperCase()}\n`
          )
          .addFields({
            name: `Privileges Attained :`, // Corrected spelling
            value: `${
              type == "user"
                ? `${emoji.on || '✅'} \`No prefix\`\n` +
                  `${emoji.on || '✅'} \`Vote bypass\`\n` +
                  `${emoji.on || '✅'} \`Support priority\`\n` +
                  `${emoji.on || '✅'} \`Badge in profile\`\n` +
                  `${emoji.on || '✅'} \`Role in support Server\`\n` +
                  `${emoji.on || '✅'} \`Early access & more...\``
                : `${emoji.on || '✅'} \`Vote bypass\`\n` +
                  `${emoji.on || '✅'} \`Customizable playEmbed\`\n` +
                  `${emoji.on || '✅'} \`Better sound quality\`\n` +
                  `${emoji.on || '✅'} \`Volume limit increase\`\n` +
                  `${emoji.on || '✅'} \`Early access & more...\``
            }`,
          })
          .setFooter({
            text: `${message.author.username}, we hope you enjoy our services`,
          });

      await m.edit({ embeds: [successEmbed], components: [] }).catch((e) => {client.log(`BuyCmd success edit failed: ${e.message}`, "error", "BuyCmd");});
      collector.stop("activated"); // Stop collector after successful activation
    });

    collector.on("end", async (collected, reason) => {
      if (reason !== "activated") { // Only edit if not already edited by successful activation
        await m.edit({ components: [] }).catch(() => {}); // Disable components on timeout/idle
      }
    });
  },
};