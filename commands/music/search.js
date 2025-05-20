// commands/music/search.js
/** @format */

const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js"); 
const yt = /^(?:(?:(?:https?:)?\/\/)?(?:www\.)?)?(?:youtube\.com\/(?:[^\/\s]+\/\S+\/|(?:c|channel|user)\/\S+|embed\/\S+|watch\?(?=.*v=\S+)(?:\S+&)*v=\S+)|(?:youtu\.be\/\S+)|yt:\S+)$/i;
const sp = /^(?:https?:)?\/\/(?:open|play)\.spotify\.com\/(?:user\/\S+\/playlist\/\S+|playlist\/\S+|track\/\S+|album\/\S+|artist\/\S+)/i; 

module.exports = {
  name: "search",
  aliases: ["sr"],
  cooldown: 5, 
  category: "music",
  usage: "<song name>",
  description: "Searches for songs on Spotify, YouTube Music, and YouTube.",
  args: true,
  player: false, 
  queue: false,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (client, message, args, emoji) => {
    const { channel } = message.member.voice;
    const query = args.join(" ");

    const defaultColor = client.color || client.config?.FUEGO?.COLOR || client.config?.EMBED_COLOR || "#3d16ca";
    const errorColor = client.config?.ERROR_COLOR || "#FF0000";
    const successColor = client.config?.SUCCESS_COLOR || client.config?.EMBED_COLOR || "#00FF00";

    if (yt.test(query) || sp.test(query)) { 
      const linkErrorEmbed = new client.embed(defaultColor);
      linkErrorEmbed.desc(`${emoji.warn  || '⚠️'} **Please use the \`${client.prefix}play\` command for direct links.**`);
      return message.reply({ embeds: [linkErrorEmbed] }).catch(() => {});
    }

    let replyMessage = null;
    try {
        const searchingEmbed = new client.embed(defaultColor);
        searchingEmbed.desc(`${emoji.search || '🔍'} **Searching across platforms for "${query}"...**`);
        replyMessage = await message.reply({ embeds: [searchingEmbed] });
    } catch(e) { client.log(`SearchCmd: Failed to send initial reply: ${e.message}`, "warn", "SearchCmd-Execute");}

    let player = client.manager.players.get(message.guild.id);
    if (!player) {
      try {
        player = await client.manager.createPlayer({
          voiceId: channel.id, textId: message.channel.id, guildId: message.guild.id,
          shardId: message.guild.shardId, loadBalancer: true, deaf: true,
        });
        client.log(`SearchCmd: Player created for guild ${message.guild.id}`, "player", "SearchCmd-Execute");
      } catch (playerError) { 
        client.log(`SearchCmd: Error creating player: ${playerError.message}`, "error", "SearchCmd-Execute");
        const playerErrEmbed = new client.embed(errorColor);
        playerErrEmbed.error(`Could not create music player: ${playerError.message}`);
        if (replyMessage) return replyMessage.edit({ embeds: [playerErrEmbed] }).catch(() => {});
        return message.channel.send({ embeds: [playerErrEmbed] }).catch(() => {});
      }
    }
    
    const searchOptions = { requester: message.author, limit: 5 }; // Limit per source to keep total manageable
    let allResults = [];
    const defaultSearchEngine = client.config.FUEGO?.DEFAULT_SEARCH_ENGINE || "ytmsearch";
    
    const searchSources = [
        { engine: "spotify", name: "Spotify", emojiString: client.emoji?.spotify || "<:Spotify:1308549107677134878>" }, 
        { engine: defaultSearchEngine, name: defaultSearchEngine === "ytmsearch" ? "YouTube Music" : defaultSearchEngine, emojiString: client.emoji?.ytmsearch || "<:y_youtube:1308548668726579293>" }
    ];
    // Add YouTube as a separate source if it's not the default
    if (defaultSearchEngine !== "youtube") {
        searchSources.push({ engine: "youtube", name: "YouTube", emojiString: client.emoji?.youtube || "<:y_youtube:1308548668726579293>" });
    }
    
    if (replyMessage) {
        const searchingSourcesEmbed = new client.embed(defaultColor);
        searchingSourcesEmbed.desc(`${emoji.search || '🔍'} Searching on: ${searchSources.map(s=>s.name).join(', ')}...`);
        await replyMessage.edit({embeds: [searchingSourcesEmbed]}).catch(()=>{});
    }

    for (const source of searchSources) {
        try {
            client.log(`SearchCmd: Searching ${source.name} for: "${query}"`, "debug", "SearchCmd-Execute");
            const result = await player.search(query, { ...searchOptions, engine: source.engine });
            if (result && result.tracks.length > 0) {
                result.tracks.slice(0, searchOptions.limit).forEach(track => {
                    track.requester = message.author; // Ensure requester is set
                    track.userData = { 
                        ...track.userData, 
                        sourceNameForDisplay: source.name, // Store which source this result came from
                        sourceIcon: source.emojiString,
                        requesterId: message.author.id,
                        requesterTag: message.author.tag
                    };
                    // For Spotify results, kazagumo-spotify often puts Spotify's clean metadata directly on track.title/author
                    // We can store them specifically if needed for lyrics later, but also good to have sourceNameForDisplay
                    if (source.engine === "spotify") { 
                        track.userData.isFromSpotify = true; // Flag it as a Spotify metadata source
                        track.userData.spotifyTitle = track.title;
                        track.userData.spotifyAuthor = track.author;
                        track.userData.spotifyDuration = track.length;
                    }
                    allResults.push(track);
                });
            }
        } catch (error) {
            client.log(`SearchCmd: Error searching ${source.name} for "${query}": ${error.message}`, "warn", "SearchCmd-Execute");
        }
    }

    const noResEmbed = new client.embed(defaultColor);
    noResEmbed.desc(`${emoji.no || '❌'} **No results found for your query on any platform.**`);
    if (allResults.length === 0) {
      if (replyMessage) return replyMessage.edit({ embeds: [noResEmbed], components: [] }).catch(() => {});
      return message.channel.send({ embeds: [noResEmbed] }).catch(() => {});
    }

    // De-duplicate results - prioritize keeping Spotify entries if URI matches a YTM/YT one
    const uniqueResults = [];
    const seenUris = new Map(); // Store URI -> track object

    for (const track of allResults) {
        const playableUri = track.uri; // This is the URI Lavalink will try to play (e.g., YouTube URI)
        if (!seenUris.has(playableUri)) {
            seenUris.set(playableUri, track);
            uniqueResults.push(track);
        } else {
            // If URI is already seen, check if current track is from Spotify and old one wasn't
            // This prefers Spotify metadata if the playable URI is the same
            const existingTrack = seenUris.get(playableUri);
            if (track.userData?.isFromSpotify && !existingTrack.userData?.isFromSpotify) {
                // Replace existing non-Spotify with this Spotify-sourced one
                const index = uniqueResults.findIndex(t => t.uri === playableUri);
                if (index !== -1) uniqueResults[index] = track;
                seenUris.set(playableUri, track); // Update the map
            }
        }
    }
    const tracksToDisplay = uniqueResults.slice(0, 25); 

    if (tracksToDisplay.length === 0) { 
        if (replyMessage) return replyMessage.edit({ embeds: [noResEmbed], components: [] }).catch(() => {});
        return message.channel.send({ embeds: [noResEmbed] }).catch(() => {});
    }

    const options = tracksToDisplay.map((track, index) => {
        // Prioritize Spotify metadata for display if available from userData
        const displayTitle = track.userData?.spotifyTitle || track.title || "Unknown Title";
        const displayAuthor = track.userData?.spotifyAuthor || track.author || "Unknown Artist";
        const sourceName = track.userData?.sourceNameForDisplay || "Unknown"; // Get source name
        const sourceIconEmoji = track.userData?.sourceIcon || "🎶"; 
        const durationText = track.isStream ? "◉ LIVE" : client.formatTime(track.length || 0);

        let labelText = `${index + 1}. ${displayTitle}`;
        if (labelText.length > 80) labelText = labelText.substring(0, 77) + "..."; // Shorter label for source
        
        let descriptionText = `By: ${displayAuthor} | ${durationText} | Source: ${sourceName}`;
        if (descriptionText.length > 95) {
            const authorAndSourceMax = 95 - (`By:  | ${durationText} | Source: `).length - 3;
            const truncatedAuthor = displayAuthor.substring(0, Math.max(10, Math.floor(authorAndSourceMax * 0.6)));
            const truncatedSource = sourceName.substring(0, Math.max(5, Math.floor(authorAndSourceMax * 0.3)));
            descriptionText = `By: ${truncatedAuthor}${displayAuthor.length > truncatedAuthor.length ? '...' : ''} | ${durationText} | ${truncatedSource}${sourceName.length > truncatedSource.length ? '...' : ''}`;
            if (descriptionText.length > 95) descriptionText = `${durationText} | ${sourceName}`.substring(0,95) + "...";
        }
        
        const option = new StringSelectMenuOptionBuilder()
            .setLabel(labelText)
            .setValue(`${index}`) // Value is the index in tracksToDisplay
            .setDescription(descriptionText);
        
        const customEmojiMatch = sourceIconEmoji.match(/<a?:[^:]+:(\d+)>$/); 
        if (customEmojiMatch && customEmojiMatch[1]) {
            try { option.setEmoji(customEmojiMatch[1]); } catch (e) { /* ignore */ }
        } else if (!sourceIconEmoji.includes(':') && sourceIconEmoji.length <= 4) { 
            try { option.setEmoji(sourceIconEmoji); } catch (e) { /* ignore */ }
        }        
        return option;
    });

    const menu = new StringSelectMenuBuilder()
      .setCustomId("search_results_menu_v5") // Incremented version
      .setPlaceholder("Select tracks to combine (max 2 from combined results)")
      .setMinValues(1)
      .setMaxValues(Math.min(2, options.length)) 
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);
    const searchEmbed = new client.embed(defaultColor);
    searchEmbed.desc(`${emoji.track || '🎵'} **Found ${tracksToDisplay.length} result(s).**\nSelect up to ${menu.data.max_values} track(s).\n\n**Note:** Choose only **same** track — **one from Spotify** and **one from YouTube Music**, otherwise it will not work!`)
  .setFooter({ text: `Query: ${query.substring(0, 100)}` });

    let selectionMessage;
    if (replyMessage && !replyMessage.deleted) {
        selectionMessage = await replyMessage.edit({ embeds: [searchEmbed], components: [row] }).catch(err => {
            client.log(`SearchCmd: Failed to EDIT replyMessage with results: ${err.message}`, "error", "SearchCmd-Execute");
            return null; 
          });
    } else {
        selectionMessage = await message.channel.send({ embeds: [searchEmbed], components: [row] }).catch(err => {
            client.log(`SearchCmd: Failed to SEND selectionMessage: ${err.message}`, "error", "SearchCmd-Execute");
            return null; 
          });
    }
        
    if (!selectionMessage) {
        client.log("SearchCmd: selectionMessage is null. Aborting collector.", "error", "SearchCmd-Execute");
        return;
    }

    const filter = (interaction) => interaction.user.id === message.author.id;
    const collector = selectionMessage.createMessageComponentCollector({ filter, time: 60000, idle: 30000 });

    collector.on("collect", async (interaction) => {
      if (!interaction.isStringSelectMenu()) return; 
      try { if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate(); } 
      catch(e) { client.log(`SearchCmd: DeferUpdate failed on collect: ${e.message}`, "warn", "SearchCmd-Collector"); return; }

      let addedDesc = "";
      let actuallyAddedThisInteraction = 0;

      for (const value of interaction.values) { 
        const trackIndex = parseInt(value, 10);
        const selectedTrack = tracksToDisplay[trackIndex]; 

        if (selectedTrack) {
          if (selectedTrack.length < 10000 && !selectedTrack.isStream) { 
            addedDesc += `${emoji.no || '❌'} **Skipped (short):** [${(selectedTrack.userData?.spotifyTitle || selectedTrack.title || "Unknown Title").substring(0,30)}...](${selectedTrack.uri || '#'}) \n`;
            continue;
          }
          // Requester info already added when building allResults/tracksToDisplay
          player.queue.add(selectedTrack); 
          addedDesc += `${emoji.yes || '✅'} **Added:** [${(selectedTrack.userData?.spotifyTitle || selectedTrack.title || "Unknown Title").substring(0,30)}...](${selectedTrack.uri || '#'}) \n`;
          actuallyAddedThisInteraction++;
        }
      }
      
      const finalEmbed = new client.embed(successColor); 
      finalEmbed.setDescription(addedDesc || `${emoji.no || '❓'} No valid tracks selected or an issue occurred.`);
      if (selectionMessage && !selectionMessage.deleted) {
        await selectionMessage.edit({ embeds: [finalEmbed], components: [] }).catch(() => {}); 
      } else {
        message.channel.send({ embeds: [finalEmbed] }).catch(e => client.log(`SearchCmd: Failed to send final confirmation: ${e.message}`, "warn", "SearchCmd-Collector"));
      }

      if (actuallyAddedThisInteraction > 0 && !player.playing && !player.paused) {
        if (player.queue.current || player.queue.size > 0) {
            player.play();
        }
      }
      collector.stop("selection_made"); 
    });

    collector.on("end", async (collected, reason) => {
      if (reason !== "selection_made" && selectionMessage && !selectionMessage.deleted) { 
            const timeoutEmbed = new client.embed(defaultColor);
            timeoutEmbed.desc(`${emoji.warn || '⚠️'} **Search selection timed out.**`);
            await selectionMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
      }
    });
  },
};