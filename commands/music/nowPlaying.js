/** @format
 *
 * Fuego By Painfuego
 * Version: 6.0.0-beta
 * © 2024 Aero-Services
 */

// const { ActionRowBuilder } = require("discord.js"); // Not used in this file

module.exports = {
  name: "nowplaying",
  aliases: ["now", "np"],
  cooldown: "", 
  category: "music",
  usage: "",
  description: "see what's being played",
  args: false,
  vote: false,
  new: false,
  admin: false,
  owner: false,
  botPerms: [],
  userPerms: [],
  player: true,
  queue: true,
  inVoiceChannel: true, 
  sameVoiceChannel: true, 
  execute: async (client, message, args, emoji) => {
    const embedColor = client.color || client.config?.FUEGO?.COLOR || client.config?.EMBED_COLOR || "#3d16ca";

    const presetPath = // Corrected variable name
      (await client.db.preset.get(`${client.user.id}_${message.guild.id}`)) ||
      `cards/card1.js`; 

    let player = await client.getPlayer(message.guild.id);
    if (!player || !player.queue.current) {
        const noPlayerEmbed = new client.embed(embedColor); // Use your CustomEmbed
        noPlayerEmbed.error("Nothing is currently playing."); // Use your .error() method
        return message.reply({ embeds: [noPlayerEmbed] }).catch(() => {});
    }

    let track = player.queue.current; 

    let progress = 0;
    if (track.length && track.length > 0 && !track.isStream && typeof player.position === 'number') {
        progress = (player.position / track.length) * 100;
    } else if (track.isStream) {
        progress = 50; 
    }

    let requester = track.requester; 

    const displayTitle = track.userData?.spotifyTitle || track.title;
    const displayAuthor = track.userData?.spotifyAuthor || track.author;
    // Use track.length (which is in ms for Kazagumo tracks) for displayDuration
    // This will be passed to client.formatTime which expects milliseconds
    const displayDurationInMs = track.userData?.spotifyDuration || track.length; 

    const dataForPreset = {
        title: displayTitle?.replace(/[^\w\s!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, "").substring(0, 35) || "Playing Music",
        author: displayAuthor?.replace(/[^\w\s!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, "").substring(0, 25) || "Unknown Artist",
        // CORRECTED HERE: Use displayDurationInMs
        duration: track.isStream ? "◉ LIVE" : client.formatTime(displayDurationInMs || 0) || "00:00", 
        thumbnail: track.thumbnail || client.user.displayAvatarURL({ extension: "png" }),
        color: embedColor, 
        progress: Math.min(100, Math.max(0, progress)), 
        source: track.sourceName || "Unknown Source", 
        requester: requester, 
        uri: track.uri,
        client: client, 
        player: player 
    };

    try {
        const presetModule = require(`@presets/${presetPath}`); 
        const presetResult = await presetModule(dataForPreset, client, player); 

        const embedsToSend = (presetResult && presetResult[0] && Array.isArray(presetResult[0])) ? presetResult[0] : null;
        const filesToSend = (presetResult && presetResult[1] && Array.isArray(presetResult[1])) ? presetResult[1] : [];
        
        if (!embedsToSend || embedsToSend.length === 0) {
            client.log(`NowPlayingCmd: Preset ${presetPath} did not return valid embeds.`, "error", "NPCmd");
            const presetErrorEmbed = new client.embed(embedColor);
            presetErrorEmbed.error("Could not display Now Playing information due to a preset error.");
            return message.reply({ embeds: [presetErrorEmbed] }).catch(() => {});
        }

        await message.reply({
            embeds: embedsToSend,
            files: filesToSend,
        }).catch((e) => { client.log(`NowPlayingCmd: Failed to send reply: ${e.message}`, "warn", "NPCmd"); });

    } catch (e) {
        client.log(`NowPlayingCmd: Error loading or executing preset ${presetPath}: ${e.message}`, "error", "NPCmd");
        console.error("NowPlaying Preset Error:", e); 
        const execErrorEmbed = new client.embed(embedColor);
        execErrorEmbed.error("An error occurred while displaying the Now Playing information.");
        await message.reply({ embeds: [execErrorEmbed] }).catch(() => {});
    }
  },
};