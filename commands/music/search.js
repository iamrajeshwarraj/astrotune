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
  description: "Searches for songs on YouTube Music and YouTube.", // Updated description
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

    if (yt.test(query) || sp.test(query)) { 
      const linkErrorEmbed = new client.embed(defaultColor);
      linkErrorEmbed.desc(`${emoji.warn  || '⚠️'} **Please use the \`${client.prefix}play\` command for direct links.**`);
      return message.reply({ embeds: [linkErrorEmbed] }).catch(() => {});
    }

    let replyMessage = null;
    try {
        const searchingEmbed = new client.embed(defaultColor);
        searchingEmbed.desc(`${emoji.search || '🔍'} **Searching for songs...**`); // Simplified message
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
    
    const searchOptions = { requester: message.author, limit: 8 }; // Slightly increased limit for 2 sources
    let allResults = [];
    
    // --- MODIFIED: Removed Spotify from searchSources ---
    let searchSources = [
        { engine: "ytmsearch", name: "YouTube Music", emojiString: client.emoji?.ytmsearch || "<:y_youtube:1308548668726579293>" }, // Prioritize YTM
        { engine: "youtube", name: "YouTube", emojiString: client.emoji?.youtube || "<:y_youtube:1308548668726579293>" }
    ];
    // You could also make this configurable via client.config.FUEGO.SEARCH_ENGINES if you want more flexibility
    // Example: client.config.FUEGO.SEARCH_ENGINES || [{ engine: "ytmsearch", ...}, {engine: "youtube", ...}]
    
    if (replyMessage) {
        const searchingSourcesEmbed = new client.embed(defaultColor);
        searchingSourcesEmbed.desc(`${emoji.search || '🔍'} Searching on: ${searchSources.map(s=>s.name).join(' & ')}...`);
        await replyMessage.edit({embeds: [searchingSourcesEmbed]}).catch(()=>{});
    }

    for (const source of searchSources) {
        try {
            // client.log(`SearchCmd: Searching ${source.name} for: "${query}"`, "debug", "SearchCmd-Execute");
            const result = await player.search(query, { ...searchOptions, engine: source.engine });
            if (result && result.tracks.length > 0) {
                result.tracks.slice(0, searchOptions.limit).forEach(track => {
                    track.requester = message.author; // Ensure requester is set
                    track.userData = { 
                        ...track.userData, 
                        sourceNameForDisplay: source.name, 
                        sourceIcon: source.emojiString,
                        requesterId: message.author.id,
                        requesterTag: message.author.tag
                        // No need for spotifyTitle etc. if not searching spotify here
                    };
                    allResults.push(track);
                });
            }
        } catch (error) {
            client.log(`SearchCmd: Error searching ${source.name} for "${query}": ${error.message}`, "warn", "SearchCmd-Execute");
        }
    }

    const noResEmbed = new client.embed(defaultColor);
    noResEmbed.desc(`${emoji.no || '❌'} **No results found for your query.**`); // Updated message
    if (allResults.length === 0) {
      if (replyMessage) return replyMessage.edit({ embeds: [noResEmbed], components: [] }).catch(() => {});
      return message.channel.send({ embeds: [noResEmbed] }).catch(() => {});
    }

    // Remove duplicate tracks based on title and author (simple check)
    const uniqueResults = [];
    const seenTracks = new Set();
    for (const track of allResults) {
        // Use a more robust identifier if possible, e.g., from track.identifier if available and consistent
        const trackIdentifier = `${(track.title)?.toLowerCase()}-${(track.author)?.toLowerCase()}`;
        if (!seenTracks.has(trackIdentifier)) {
            uniqueResults.push(track);
            seenTracks.add(trackIdentifier);
        }
    }
    const tracksToDisplay = uniqueResults.slice(0, 25); 

    if (tracksToDisplay.length === 0) { 
        if (replyMessage) return replyMessage.edit({ embeds: [noResEmbed], components: [] }).catch(() => {});
        return message.channel.send({ embeds: [noResEmbed] }).catch(() => {});
    }

    const options = tracksToDisplay.map((track, index) => {
        // Since Spotify search is removed, userData.spotifyTitle/Author won't be set by this command
        const displayTitle = track.title || "Unknown Title";
        const displayAuthor = track.author || "Unknown Artist";
        const sourceIconEmoji = track.userData?.sourceIcon || "🎶"; 
        const durationText = track.isStream ? "◉ LIVE" : client.formatTime(track.length || 0);

        let labelText = `${index + 1}. ${displayTitle}`;
        if (labelText.length > 95) labelText = labelText.substring(0, 92) + "..."; 
        
        let descriptionText = `By: ${displayAuthor} | ${durationText}`;
        if (descriptionText.length > 95) {
            const authorMax = 95 - (`By:  | ${durationText}`).length - 3; 
            const truncatedAuthor = displayAuthor.substring(0, Math.max(10, authorMax)); 
            descriptionText = `By: ${truncatedAuthor}${displayAuthor.length > truncatedAuthor.length ? '...' : ''} | ${durationText}`;
            if (descriptionText.length > 95) descriptionText = durationText.substring(0,95) + (durationText.length > 95 ? "..." : "");
        }
        
        const option = new StringSelectMenuOptionBuilder()
            .setLabel(labelText)
            .setValue(`${index}`) 
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
      .setCustomId("search_results_menu_v3") 
      .setPlaceholder("Select tracks to add (max 5)")
      .setMinValues(1)
      .setMaxValues(Math.min(5, options.length)) 
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);
    const searchEmbed = new client.embed(defaultColor);
    searchEmbed.desc(`${emoji.track || '🎵'} **Found ${tracksToDisplay.length} result(s). Select up to ${menu.data.max_values}.**`)
               .setFooter({ text: `Query: ${query.substring(0,100)}` });

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
            addedDesc += `${emoji.no || '❌'} **Skipped (short):** [${(selectedTrack.title || "Unknown Title").substring(0,30)}...](${selectedTrack.uri || '#'}) \n`;
            continue;
          }
          // Ensure requester info is on the track for event handlers
          selectedTrack.requester = message.author; 
          selectedTrack.userData = {
              ...selectedTrack.userData, // Keep existing userData like sourceNameForDisplay
              requesterId: message.author.id,
              requesterTag: message.author.tag
          };
          player.queue.add(selectedTrack); 
          addedDesc += `${emoji.yes || '✅'} **Added:** [${(selectedTrack.title || "Unknown Title").substring(0,30)}...](${selectedTrack.uri || '#'}) \n`;
          actuallyAddedThisInteraction++;
        }
      }
      
      const finalEmbed = new client.embed(defaultColor); 
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