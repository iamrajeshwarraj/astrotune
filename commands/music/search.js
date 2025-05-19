// commands/music/search.js
/** @format ... */

const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } = require("discord.js"); 
const yt = /^(?:(?:(?:https?:)?\/\/)?(?:www\.)?)?(?:youtube\.com\/(?:[^\/\s]+\/\S+\/|(?:c|channel|user)\/\S+|embed\/\S+|watch\?(?=.*v=\S+)(?:\S+&)*v=\S+)|(?:youtu\.be\/\S+)|yt:\S+)$/i;
const sp = /^(?:https?:)?\/\/(?:open|play)\.spotify\.com\/(?:user\/\S+\/playlist\/\S+|track\/\S+|album\/\S+|artist\/\S+)/i;

module.exports = {
  name: "search",
  aliases: ["sr"],
  cooldown: 5, 
  category: "music",
  usage: "<song name>",
  description: "Searches for songs on Spotify, YouTube, and YouTube Music.",
  args: true,
  player: false, 
  queue: false,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (client, message, args, emoji) => {
    const { channel } = message.member.voice;
    const query = args.join(" ");

    if (yt.test(query) || sp.test(query)) { 
      return message.reply({
          embeds: [ new client.embed(client.color).desc(`${emoji.warn} **Please use the \`${client.prefix}play\` command for direct links.**`) ],
        }).catch(() => {});
    }

    let replyMessage = null;
    try {
        replyMessage = await message.reply({ embeds: [new client.embed(client.color).desc(`${emoji.search} **Searching multiple platforms...**`)] });
    } catch(e) { client.log(`SearchCmd: Failed to send initial reply: ${e.message}`, "warn");}

    let player = client.manager.players.get(message.guild.id);
    if (!player) {
      try {
        player = await client.manager.createPlayer({
          voiceId: channel.id, textId: message.channel.id, guildId: message.guild.id,
          shardId: message.guild.shardId, loadBalancer: true, deaf: true,
        });
      } catch (playerError) { 
        client.log(`SearchCmd: Error creating player: ${playerError.message}`, "error");
        const errEmbed = new client.embed(client.color).error(`Could not create music player: ${playerError.message}`);
        if (replyMessage) return replyMessage.edit({ embeds: [errEmbed] }).catch(() => {});
        return message.channel.send({ embeds: [errEmbed] }).catch(() => {});
      }
    }
    
    const searchOptions = { requester: message.author, limit: 7 }; 
    let allResults = [];
    const defaultSearchEngine = client.config.FUEGO?.DEFAULT_SEARCH_ENGINE || "ytmsearch";
    // Ensure your emoji object has these keys (e.g., client.emoji.spotify) 
    // and they are valid full custom emoji strings like <:name:id> or Unicode characters.
    let searchSources = [
        { engine: "spotify", name: "Spotify", emojiString: client.emoji?.spotify || "<:Spotify:1308549107677134878>" }, 
        { engine: "ytmsearch", name: "YouTube Music", emojiString: client.emoji?.ytmsearch || "<:y_youtube:1308548668726579293>" },
        { engine: "youtube", name: "YouTube", emojiString: client.emoji?.youtube || "<:y_youtube:1308548668726579293>" }
    ];
    
    if (replyMessage) await replyMessage.edit({embeds: [new client.embed(client.color).desc(`${emoji.search} Searching on: ${searchSources.map(s=>s.name).join(', ')}...`)]}).catch(()=>{});

    for (const source of searchSources) {
        try {
            // client.log(`SearchCmd: Searching ${source.name} for: "${query}"`, "debug");
            const result = await player.search(query, { ...searchOptions, engine: source.engine });
            if (result && result.tracks.length > 0) {
                result.tracks.slice(0, searchOptions.limit).forEach(track => {
                    track.userData = { 
                        ...track.userData, 
                        sourceNameForDisplay: source.name, 
                        sourceIcon: source.emojiString 
                    };
                    if (source.engine === "spotify") { 
                        track.userData.spotifyTitle = track.title;
                        track.userData.spotifyAuthor = track.author;
                        track.userData.spotifyDuration = track.length;
                    }
                    allResults.push(track);
                });
            }
        } catch (error) {
            client.log(`SearchCmd: Error searching ${source.name} for "${query}": ${error.message}`, "warn");
        }
    }

    const noResEmbed = new client.embed(client.color).desc(`${emoji.no} **No results found for your query on any platform.**`);
    if (allResults.length === 0) {
      if (replyMessage) return replyMessage.edit({ embeds: [noResEmbed] }).catch(() => {});
      return message.channel.send({ embeds: [noResEmbed] }).catch(() => {});
    }

    const tracksToDisplay = allResults.slice(0, 25); 

    const options = tracksToDisplay.map((track, index) => {
        const displayTitle = track.userData?.spotifyTitle || track.title;
        const displayAuthor = track.userData?.spotifyAuthor || track.author;
        const sourceIconEmoji = track.userData?.sourceIcon || "🎶"; 
        const durationText = track.isStream ? "◉ LIVE" : client.formatTime(track.length);

        let labelText = displayTitle;
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
            .setValue(`${index}`) 
            .setDescription(descriptionText);
        
        const customEmojiMatch = sourceIconEmoji.match(/<a?:[^:]+:(\d+)>$/); // Matches <:name:id> or <a:name:id>
        if (customEmojiMatch && customEmojiMatch[1]) {
            option.setEmoji(customEmojiMatch[1]); // Use only the ID
        } else if (!sourceIconEmoji.includes(':') && sourceIconEmoji.length <= 4) { // Likely a Unicode emoji (allow for flags etc)
            try {
                option.setEmoji(sourceIconEmoji);
            } catch (unicodeError) { /* Ignore if it's not a valid Unicode emoji char */ }
        }        
        return option;
    });

    if (options.length === 0) { 
         if (replyMessage) return replyMessage.edit({ embeds: [noResEmbed] }).catch(() => {});
         return message.channel.send({ embeds: [noResEmbed] }).catch(() => {});
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId("search_results_menu_v3") 
      .setPlaceholder("Select tracks to add (max 5)")
      .setMinValues(1)
      .setMaxValues(Math.min(5, options.length)) 
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);
    const searchEmbed = new client.embed(client.color)
        .desc(`${emoji.track || '🎵'} **Found ${tracksToDisplay.length} results. Select up to ${menu.data.max_values}.**`)
        .setFooter({ text: `Query: ${query.substring(0,100)}` });

    let selectionMessage;
    if (replyMessage && !replyMessage.deleted) {
        selectionMessage = await replyMessage.edit({ embeds: [searchEmbed], components: [row] }).catch(err => {
            client.log(`SearchCmd: Failed to EDIT replyMessage with results: ${err.message}`, "error");
            console.error("SearchCmd Edit Error:", err); 
            return null; 
          });
    } else {
        selectionMessage = await message.channel.send({ embeds: [searchEmbed], components: [row] }).catch(err => {
            client.log(`SearchCmd: Failed to SEND selectionMessage: ${err.message}`, "error");
            console.error("SearchCmd Send Error:", err); 
            return null; 
          });
    }
        
    if (!selectionMessage) {
        client.log("SearchCmd: selectionMessage is null after attempting to send/edit. Aborting collector.", "error");
        return;
    }

    const filter = (interaction) => interaction.user.id === message.author.id;
    const collector = selectionMessage.createMessageComponentCollector({ filter, time: 60000, idle: 30000 });

    collector.on("collect", async (interaction) => {
      if (!interaction.isStringSelectMenu()) return; 
      try { await interaction.deferUpdate(); } catch { return; }

      let addedDesc = "";
      let actuallyAddedThisInteraction = 0;

      for (const value of interaction.values) { 
        const trackIndex = parseInt(value, 10);
        const selectedTrack = tracksToDisplay[trackIndex]; 

        if (selectedTrack) {
          if (selectedTrack.length < 10000 && !selectedTrack.isStream) { 
            addedDesc += `${emoji.no || '❌'} **Skipped (short):** [${(selectedTrack.userData?.spotifyTitle || selectedTrack.title).substring(0,30)}...](${selectedTrack.uri || '#'}) \n`;
            continue;
          }
          player.queue.add(selectedTrack); 
          addedDesc += `${emoji.yes || '✅'} **Added:** [${(selectedTrack.userData?.spotifyTitle || selectedTrack.title).substring(0,30)}...](${selectedTrack.uri || '#'}) \n`;
          actuallyAddedThisInteraction++;
        }
      }

      if (actuallyAddedThisInteraction > 0 && !player.playing && !player.paused && player.queue.current) {
        player.play();
      }
      
      const finalEmbed = new client.embed(client.color).setDescription(addedDesc || `${emoji.no || '❓'} No valid tracks selected or an issue occurred.`);
      if (selectionMessage && !selectionMessage.deleted) {
        await selectionMessage.edit({ embeds: [finalEmbed], components: [] }).catch(() => {}); 
      }
      collector.stop("selection_made"); 
    });

    collector.on("end", async (collected, reason) => {
      if (reason !== "selection_made" && selectionMessage && !selectionMessage.deleted) { 
            const timeoutEmbed = new client.embed(client.color).desc(`${emoji.warn || '⚠️'} **Search selection timed out.**`);
            await selectionMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
      }
    });
  },
};