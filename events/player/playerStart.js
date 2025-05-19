/** @format
 *
 * Fuego By Painfuego
 * Version: 6.0.0-beta
 * © 2024 Aero-Services
 */

const { RateLimitManager } = require("@sapphire/ratelimits");
const adCooldownManager = new RateLimitManager(600000); // 10 minutes
const { VibeSync } = require('vibesync'); 
const { EmbedBuilder } = require('discord.js'); // Import EmbedBuilder for safety/fallback

module.exports = {
  name: "playerStart", // Kazagumo typically uses 'playerStart'
  run: async (client, player, track) => {
    if (!track?.title) {
        if (client.log) client.log("playerStart: Track or track.title missing, skipping.", "warn", `Player[${player?.guildId}]`);
        return;
    }

    const logSource = `PlayerEvent[${player.guildId}]`;
    if (client.log) client.log(`Track started: "${track.title}"`, "player", logSource);

    const premium = await client.db.premium.get(`${client.user.id}_${player.guildId}`).catch(e => {
        if (client.log) client.log(`Error fetching premium status: ${e.message}`, "warn", logSource);
        return false;
    });

    // Determine preset path, provide a fallback if db or preset is missing
    let presetPath = 'embeds/embed3.js'; // Default fallback
    try {
        const userPreset = await client.db.preset.get(`${client.user.id}_${player.guildId}`);
        if (userPreset) presetPath = userPreset;
    } catch (e) {
        if (client.log) client.log(`Error fetching preset, using default: ${e.message}`, "warn", logSource);
    }
    
    let requester = track?.requester; // This might be a User object or just an ID string

    const dataForPreset = {
        title: track?.title.replace(/[^\w\s!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, "").substring(0, 35) || "Playing Music", // Allow more chars, limit length
        author: track?.author.replace(/[^\w\s!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, "").substring(0, 25) || "Unknown Artist",
        duration: track?.isStream ? "◉ LIVE" : client.formatTime(track?.length || 0) || "00:00", // Use track.length
        thumbnail: track?.thumbnail || client.user.displayAvatarURL({ extension: "png" }), // Use extension for .png
        color: client.color || client.config?.FUEGO?.COLOR || "#3d16ca",
        progress: Math.floor(Math.random() * 60) + 10, // Example, you might want actual progress
        source: track?.sourceName || "Unknown Source",
        requester: requester, // Pass the requester object/ID
        uri: track?.uri, // Pass URI for potential links
        client: client // Pass client for things like formatTime inside preset if needed
    };

    let presetModule;
    try {
        presetModule = require(`@presets/${presetPath}`);
    } catch (e) {
        if (client.log) client.log(`Failed to load preset ${presetPath}, using fallback embed. Error: ${e.message}`, "error", logSource);
        // Fallback embed generation if preset fails
        const fallbackEmbed = new client.embed(dataForPreset.color) // Assuming client.embed is your CustomEmbed class
            .setTitle("🎶 Now Playing")
            .setDescription(`[${dataForPreset.title}](${dataForPreset.uri})\nDuration: \`${dataForPreset.duration}\`\nRequester: ${dataForPreset.requester ? `<@${dataForPreset.requester.id || dataForPreset.requester}>` : "Unknown"}`)
            .setThumbnail(dataForPreset.thumbnail);
        if (dataForPreset.author) fallbackEmbed.addFields({ name: "Artist", value: dataForPreset.author, inline: true});
        presetModule = () => [[fallbackEmbed], [], []]; // Return structure expected by your code [embeds, files, components]
    }
    
    const data = await presetModule(dataForPreset, client, player).catch(e => {
        if (client.log) client.log(`Error executing preset function from ${presetPath}: ${e.message}`, "error", logSource);
        // Fallback if preset execution fails
        const fallbackEmbed = new client.embed(dataForPreset.color)
            .setTitle("🎶 Now Playing")
            .setDescription(`[${dataForPreset.title}](${dataForPreset.uri})\nDuration: \`${dataForPreset.duration}\`\nRequester: ${dataForPreset.requester ? `<@${dataForPreset.requester.id || dataForPreset.requester}>` : "Unknown"}`)
            .setThumbnail(dataForPreset.thumbnail);
        if (dataForPreset.author) fallbackEmbed.addFields({ name: "Artist", value: dataForPreset.author, inline: true});
        return [[fallbackEmbed], [], []]; // Structure: [embeds], [files], [components]
    });


    await player.data.set("autoplaySystem", track); // Used by your autoplay logic

    // Ad Embed
    const adEmbed = new client.embed(dataForPreset.color) // Use consistent embed creation
      .desc( // Use your custom .desc method
        `Sponsored content [ Ends in 30s ]\n` + // Increased duration for visibility
          `**Want your server's AD here ? Join [Support Server](${client.support || '#'})**`
      )
      .setImage("https://share.creavite.co/668e3360c7f9c736f75568f1.gif") // CORRECTED: .img() to .setImage()
      .setFooter({
        text: `Ads help keep our services free for users.`, // Simpler footer
      });

    const channel = client.channels.cache.get(player.textId);
    if (!channel || !channel.isTextBased()) {
        if (client.log) client.log(`Text channel ${player.textId} not found or not text-based for playerStart.`, "warn", logSource);
        return;
    }

    const adCooldownBucket = adCooldownManager.acquire(`${player.guildId}`);
    if (!adCooldownBucket.limited && !premium) {
      channel.send({ embeds: [adEmbed] })
        .then((m) => setTimeout(() => { m.delete().catch(() => {}); }, 30000))
        .catch((e) => { if (client.log) client.log(`Failed to send ad message: ${e.message}`, "warn", logSource); });
      try { adCooldownBucket.consume(); } catch (e) {}
    }

    // Main Now Playing Message
    // Ensure data has the expected structure: [embedsArray, filesArray, componentsArray]
    const embedsToSend = (data && data[0] && Array.isArray(data[0])) ? data[0] : [new client.embed(dataForPreset.color).setDescription("Now playing your song!")];
    const filesToSend = (data && data[1] && Array.isArray(data[1])) ? data[1] : [];
    const componentsToSend = (data && data[2] && Array.isArray(data[2])) ? data[2] : [];

    const msg = await channel.send({
        embeds: embedsToSend,
        files: filesToSend,
        components: componentsToSend,
      }).catch((e) => { if (client.log) client.log(`Failed to send main player message: ${e.message}`, "warn", logSource); });

    if (msg) player.data.set("message", msg);
    
    // VibeSync - Voice Channel Status Update
    try {
        const vcStatus = new VibeSync(client); 
        const voiceChannelId = player.voiceId;  
        const songTitleForStatus = track?.title?.substring(0, 100) || "Music"; // Limit length for status 
        const statusText = `<a:MusicNotes:1308553832086896771> ${songTitleForStatus}`;
        if (voiceChannelId) {
            // vcStatus.setVoiceStatus(voiceChannelId, statusText); // This might need await or have its own error handling
            // For now, let's wrap in try-catch as it's external
            await vcStatus.setVoiceStatus(voiceChannelId, statusText)
                .catch(vsError => client.log(`VibeSync error: ${vsError.message}`, 'warn', logSource));
        } else {
            client.log("VibeSync: Voice channel ID not found on player.", "warn", logSource);
        }
    } catch (e) {
        client.log(`Error initializing or using VibeSync: ${e.message}`, "warn", logSource);
    }
     
    // Webhook Log for Play Start
    if (client.webhooks && client.webhooks.player) {
        client.webhooks.player.send({
            username: client.user.username,
            avatarURL: client.user.displayAvatarURL(),
            embeds: [
            new client.embed(dataForPreset.color).desc( // Use consistent embed creation
                `**Playing** ${track?.title.replace(/[^\w\s!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, "").substring(0, 35)} in [ ${client.guilds.cache.get(player.guildId)?.name || player.guildId} ]`
            ),
            ],
        }).catch((e) => { if (client.log) client.log(`Webhook player log failed: ${e.message}`, "warn", logSource); });
    }
  },
};