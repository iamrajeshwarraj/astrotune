/** @format
 *
 * Fuego By Painfuego
 * Version: 6.0.0-beta
 * © 2024 Aero-Services
 */

const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js"); // Added StringSelectMenuOptionBuilder

module.exports = {
  name: "similar",
  aliases: ["sm"],
  cooldown: 10, // Added a cooldown
  category: "music",
  usage: "",
  description: "get similar song/(s)",
  args: false,
  vote: false,
  new: true, // Assuming this 'new' flag is for your own system
  admin: false,
  owner: false,
  botPerms: [],
  userPerms: [],
  player: true,
  queue: true, // Needs a current track to find similar songs
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (client, message, args, emoji) => {
    const embedColor = client.color || client.config?.FUEGO?.COLOR || client.config?.EMBED_COLOR || "#3d16ca";

    const initialSearchEmbed = new client.embed(embedColor); // Create instance
    initialSearchEmbed.desc( // Use .desc()
      `${emoji.search || '🔍'} **Searching for similar songs, please wait...**` // Added fallback emoji
    );
    let m = await message.reply({ embeds: [initialSearchEmbed] }).catch((e) => {
        client.log(`SimilarCmd: Initial reply failed: ${e.message}`, "warn", "SimilarCmd");
        return null;
    });

    if (!m) return;

    const player = await client.getPlayer(message.guild.id);
    let current = player.queue.current;
    if (!current) { // Should be caught by queue:true but good to double check
        const noCurrentEmbed = new client.embed(embedColor);
        noCurrentEmbed.error("No song currently playing to find similar tracks for.");
        return m.edit({ embeds: [noCurrentEmbed], components: [] }).catch(() => {});
    }

    let query = current.author || current.title.split(" ")[0]; // Use author, or first word of title as fallback query
    const result = { youtube: [], spotify: [], soundcloud: [], youtube2: [] }; // Initialize as empty arrays

    const searchOptions = { requester: message.author, limit: 7 }; // Limit results per source

    try {
        result.youtube = await player.search(query, { ...searchOptions, engine: "youtube" }).then((res) => res.tracks || []).catch(() => []);
    } catch (e) { client.log(`SimilarCmd: YouTube search failed: ${e.message}`, "warn", "SimilarCmd"); }
    
    try {
        // For Spotify, it's better to use the current track's title + author for more relevant "similar" results if possible
        const spotifyQuery = `${current.title} ${current.author}`;
        result.spotify = await player.search(spotifyQuery, { ...searchOptions, engine: "spotify" }).then((res) => res.tracks || []).catch(() => []);
    } catch (e) { client.log(`SimilarCmd: Spotify search failed: ${e.message}`, "warn", "SimilarCmd"); }

    try {
        result.soundcloud = await player.search(query, { ...searchOptions, engine: "soundcloud" }).then((res) => res.tracks || []).catch(() => []);
    } catch (e) { client.log(`SimilarCmd: SoundCloud search failed: ${e.message}`, "warn", "SimilarCmd"); }
    
    try {
        let id = current.identifier;
        if (id) { // Only search related if identifier exists
            let relatedQuery = `https://www.youtube.com/watch?v=${id}&list=RD${id}`;
            result.youtube2 = await player.search(relatedQuery, { ...searchOptions, engine: "youtube" }).then((res) => res.tracks || []).catch(() => []);
        }
    } catch (e) { client.log(`SimilarCmd: YouTube related search failed: ${e.message}`, "warn", "SimilarCmd"); }


    result.yt = result.youtube2.length > 0 ? result.youtube2 : result.youtube;

    // Combine, shuffle, and limit total results
    let combinedResults = [
      ...result.yt.slice(0, 5),
      ...result.spotify.slice(0, 5),
      ...result.soundcloud.slice(0, 5),
    ];
    // Shuffle combined results
    combinedResults.sort(() => Math.random() - 0.5);
    result.tracks = combinedResults.slice(0, 15); // Take up to 15 unique tracks overall

    const noResEmbed = new client.embed(embedColor); // Create instance
    noResEmbed.desc(`${emoji.no} **No similar songs found**`);

    if (!result.tracks.length || result.tracks.length === 0) {
      return m.edit({ embeds: [noResEmbed], components: [] }).catch(() => {});
    }

    const tracksToDisplay = result.tracks.slice(0, 25); // Max 25 options for select menu

    const options = tracksToDisplay.map((track, index) => {
        const displayTitle = track.userData?.spotifyTitle || track.title || "Unknown Title";
        const displayAuthor = track.userData?.spotifyAuthor || track.author || "Unknown Artist";
        const sourceName = track.sourceName || "unknown";
        const sourceEmoji = emoji[sourceName.toLowerCase()] || emoji.track || "🎶";
        const durationText = track?.isStream ? "◉ LIVE" : client.formatTime(track.length || 0);

        let labelText = `${index + 1}. ${displayTitle}`; // Add index number
        if (labelText.length > 95) labelText = labelText.substring(0, 92) + "..."; 
        
        let descriptionText = `By: ${displayAuthor} | ${durationText}`;
        if (descriptionText.length > 95) {
            const authorMax = 95 - (`By:  | ${durationText}`).length - 3;
            const truncatedAuthor = displayAuthor.substring(0, Math.max(10, authorMax));
            descriptionText = `By: ${truncatedAuthor}${displayAuthor.length > truncatedAuthor.length ? '...' : ''} | ${durationText}`;
            if (descriptionText.length > 95) descriptionText = durationText.substring(0, 95) + (durationText.length > 95 ? "..." : "");
        }
        
        const option = new StringSelectMenuOptionBuilder()
            .setLabel(labelText)
            .setValue(`${index}`) // Value is the index in tracksToDisplay
            .setDescription(descriptionText);

        const customEmojiMatch = sourceEmoji.match(/<a?:[^:]+:(\d+)>$/);
        if (customEmojiMatch && customEmojiMatch[1]) {
            option.setEmoji(customEmojiMatch[1]);
        } else if (!sourceEmoji.includes(':') && sourceEmoji.length <= 4) {
            try { option.setEmoji(sourceEmoji); } catch { /* Ignore */ }
        }
        return option;
    });
    
    if (options.length === 0) {
         return m.edit({ embeds: [noResEmbed], components: [] }).catch(() => {});
    }


    const menu = new StringSelectMenuBuilder()
      .setCustomId("similar_tracks_menu") // More specific custom ID
      .setPlaceholder("Select similar tracks to add (max 5)")
      .setMinValues(1)
      .setMaxValues(Math.min(5, options.length)) 
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    const selectEmbed = new client.embed(embedColor); // Create instance
    selectEmbed.desc(`${emoji.track || '🎵'} **Found ${tracksToDisplay.length} similar results. Select up to ${menu.data.max_values}.**`)
               .setFooter({ text: `Based on: ${current.title.substring(0, 50)}...` });


    await m.edit({ embeds: [selectEmbed], components: [row] }).catch((e) => {client.log(`SimilarCmd: Edit with results failed: ${e.message}`, "warn", "SimilarCmd");});

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
      idle: 30000, 
    });

    collector.on("end", async (collected, reason) => {
      if (reason !== "selection_made" && m && !m.deleted) { // Check if m still exists
        const timeoutEmbed = new client.embed(embedColor);
        timeoutEmbed.desc(`${emoji.warn || '⚠️'} **Selection timed out. No tracks added.**`);
        await m.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
      }
    });

    collector.on("collect", async (interaction) => {
      if (!interaction.isStringSelectMenu()) return;
      try {
        if (!interaction.deferred) await interaction.deferUpdate();
      } catch(e) { client.log(`SimilarCmd: DeferUpdate failed: ${e.message}`, "warn", "SimilarCmd"); return; }
      
      if (m && !m.deleted) await m.delete().catch(() => {}); // Delete the selection message

      let desc = ``;
      let actuallyAddedCount = 0;
      for (const value of interaction.values) {
        const trackIndex = parseInt(value, 10);
        const song = tracksToDisplay[trackIndex]; 
        if (song) {
          if (song.length < 10000 && !song.isStream) { // Use 10000 for 10s
            desc += `${emoji.no || '❌'} **Skipped (short):** [${(song.title || "Unknown Title").replace(/[[\]()]/g, "").substring(0, 30)}...](${song.uri || '#'}) \n`;
            continue;
          }
          await player.queue.add(song); // Await if your add method is async, otherwise not needed
          desc += `${emoji.yes || '✅'} **Added:** [${(song.title || "Unknown Title").replace(/[[\]()]/g, "").substring(0, 30)}...](${song.uri || '#'}) \n`;
          actuallyAddedCount++;
        }
      }
      
      const finalReplyEmbed = new client.embed(embedColor);
      finalReplyEmbed.desc(desc || `${emoji.no || '❓'} No tracks were added.`);
      await message.channel.send({ embeds: [finalReplyEmbed] }).catch((e) => {client.log(`SimilarCmd: Final reply failed: ${e.message}`, "warn", "SimilarCmd");});
      
      if (actuallyAddedCount > 0 && !player.playing && !player.paused) {
        player.play();
      }
      collector.stop("selection_made");
    });
  },
};