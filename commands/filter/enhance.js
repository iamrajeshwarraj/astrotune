// commands/filter/enhance.js
module.exports = {
  name: "enhance",
  aliases: [],
  cooldown: 5, 
  category: "filter",
  usage: "",
  description: "Optimizes audio quality with an EQ and bitrate adjustment.",
  args: false,
  vote: false,
  new: false,
  admin: false,
  owner: false,
  botPerms: ["ManageChannels"], 
  userPerms: [], 
  player: true,
  queue: true, 
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (client, message, args, emoji) => {
    const player = await client.getPlayer(message.guild.id);
    if (!player) { 
        return message.reply({ embeds: [new client.embed(client.color).error("No player found for this guild.")]});
    }

    const { channel } = message.member.voice; 
    if (!channel) { 
         return message.reply({ embeds: [new client.embed(client.color).error("You need to be in a voice channel.")]});
    }

    let bitrate = 96000; 
    switch (message.guild.premiumTier) { 
      case 1: bitrate = 128000; break;
      case 2: bitrate = 256000; break;
      case 3: bitrate = 384000; break;
    }

    let bitrateChangeResponse = "";
    try {
      await channel.setBitrate(bitrate);
      bitrateChangeResponse = `${emoji.yes} Set voice channel bitrate to **${bitrate / 1000}kbps**`;
      client.log(`Set bitrate to ${bitrate / 1000}kbps in VC ${channel.id} for guild ${message.guild.id}`, "info", "EnhanceCmd");
    } catch (e) {
      client.log(`Failed to set bitrate in VC ${channel.id} for guild ${message.guild.id}: ${e.message}`, "warn", "EnhanceCmd");
      bitrateChangeResponse = `${emoji.bell} *Could not set VC bitrate. Check 'Manage Channels' perm or set manually.*`;
    }

    let eqResponse = "";
    // --- Attempting Shoukaku setFilters with a simple EQ first ---
    // Lavalink equalizer: 15 bands (0-14). Gain: -0.25 to 1.0. 0.0 = normal.
    const simpleEQ = [ // Example: Slight bass boost and treble boost
        { band: 0, gain: 0.1 },
        { band: 1, gain: 0.05 },
        { band: 13, gain: 0.05 },
        { band: 14, gain: 0.1 },
    ];

    const harmanEQ = [ // Your Harman target, values should be fine if node supports them
        { band: 0, gain: 0.025 },  { band: 1, gain: 0.03 },   { band: 2, gain: 0.06 },
        { band: 3, gain: 0.01 },   { band: 4, gain: 0.0625 }, { band: 5, gain: 0.0125 },
        { band: 6, gain: -0.025 },{ band: 7, gain: -0.05 },  { band: 8, gain: -0.025 },
        { band: 9, gain: 0.01 },   { band: 10, gain: 0.005 }, { band: 11, gain: 0.0325 },
        { band: 12, gain: 0.05 },  { band: 13, gain: 0.07 },  { band: 14, gain: 0.04 },
    ];

    // Let's try the Harman EQ directly, but be mindful if it causes disconnects
    const eqToApply = harmanEQ; 

    try {
        if (player.shoukaku && typeof player.shoukaku.setFilters === 'function') {
            client.log(`Attempting to apply EQ via player.shoukaku.setFilters for guild ${message.guild.id}`, "debug", "EnhanceCmd");
            await player.shoukaku.setFilters({
                op: "filters", // This op might be implicit for some shoukaku/lavalink versions when just sending filters
                guildId: message.guild.id, // guildId might also be implicit if called on player.node or player.shoukaku
                equalizer: eqToApply,
                // volume: 0.9, // Optional: can also set volume here (0.0 to 5.0, 1.0 is normal)
                                // Note: Kazagumo's player.setVolume(90) uses 0-100 scale. Lavalink filter volume is different.
            });
            // For some Lavalink nodes, filters are applied on the next play or seek.
            // A small seek might be needed to force refresh if the EQ isn't heard immediately.
            // await player.seek(player.position); // Try this if EQ isn't applying.

            eqResponse = `${emoji.yes} Audio spectrum optimized (Harman target 2019)`;
            client.log(`Applied EQ for guild ${message.guild.id} via shoukaku.setFilters`, "info", "EnhanceCmd");
        } else {
            eqResponse = `${emoji.no} Direct filter control (shoukaku) not available.`;
            client.log("player.shoukaku or player.shoukaku.setFilters not found.", "warn", "EnhanceCmd");
        }
    } catch (eqError) {
        client.log(`Failed to apply EQ via shoukaku.setFilters: ${eqError.message}`, "error", "EnhanceCmd");
        console.error("Enhance EQ Error (shoukaku.setFilters):", eqError);
        eqResponse = `${emoji.no} Failed to apply equalizer. ${eqError.message.substring(0, 50)}`;
    }

    let volResponse = "";
    try {
        await player.setVolume(90); 
        volResponse = `${emoji.yes} Set volume to **90%**`;
        client.log(`Set volume to 90 for guild ${message.guild.id}`, "info", "EnhanceCmd");
    } catch (volError) {
        client.log(`Failed to set volume: ${volError.message}`, "error", "EnhanceCmd");
        volResponse = `${emoji.no} Failed to set volume.`;
    }

    const initialReplyEmbed = new client.embed(client.color).desc(
        `${emoji.cool} **Adjusting audio parameters...**`
    );
    
    const feedbackMessage = await message.reply({ embeds: [initialReplyEmbed] }).catch(e => client.log(`EnhanceCmd initial reply failed: ${e.message}`, "warn"));

    if (feedbackMessage) {
        setTimeout(async () => {
            const finalDescription = `${bitrateChangeResponse}\n${volResponse}\n${eqResponse}`;
            const finalEmbed = new client.embed(client.color).desc(finalDescription.trim() || "Audio enhancement attempted.");
            await feedbackMessage.edit({ embeds: [finalEmbed] }).catch(() => {});
        }, 2000);
    } else { 
        const finalDescription = `${bitrateChangeResponse}\n${volResponse}\n${eqResponse}`;
        await message.channel.send({ embeds: [new client.embed(client.color).desc(finalDescription.trim() || "Audio enhancement attempted.")]}).catch(()=>{});
    }
  },
};