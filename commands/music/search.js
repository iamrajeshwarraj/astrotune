// commands/music/search.js
/** @format */

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const yt =
  /^(?:(?:(?:https?:)?\/\/)?(?:www\.)?)?(?:youtube\.com\/(?:[^\/\s]+\/\S+\/|(?:c|channel|user)\/\S+|embed\/\S+|watch\?(?=.*v=\S+)(?:\S+&)*v=\S+)|(?:youtu\.be\/\S+)|yt:\S+)$/i;
const sp =
  /^(?:https?:)?\/\/(?:open|play)\.spotify\.com\/(?:user\/\S+\/playlist\/\S+|playlist\/\S+|track\/\S+|album\/\S+|artist\/\S+)/i;

module.exports = {
  name: "search",
  aliases: ["sr"],
  cooldown: 5,
  category: "music",
  usage: "<song name>",
  description: "Searches YouTube Music first, then YouTube if no results.", // Updated description
  args: true,
  player: false,
  queue: false,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (client, message, args, emoji) => {
    const { channel } = message.member.voice;
    const query = args.join(" ");

    const defaultColor =
      client.color ||
      client.config?.FUEGO?.COLOR ||
      client.config?.EMBED_COLOR ||
      "#3d16ca";
    const errorColor = client.config?.ERROR_COLOR || "#FF0000";
    const successColor =
      client.config?.SUCCESS_COLOR || client.config?.EMBED_COLOR || "#00FF00";

    if (yt.test(query) || sp.test(query)) {
      const linkErrorEmbed = new client.embed(defaultColor);
      linkErrorEmbed.desc(
        `${emoji.warn || "⚠️"} **Please use the \`${client.prefix}play\` command for direct links.**`
      );
      return message.reply({ embeds: [linkErrorEmbed] }).catch(() => {});
    }

    let replyMessage = null;
    try {
      const searchingEmbed = new client.embed(defaultColor);
      searchingEmbed.desc(
        `${emoji.search || "🔍"} **Searching for "${query}"...**`
      );
      replyMessage = await message.reply({ embeds: [searchingEmbed] });
    } catch (e) {
      client.log(
        `SearchCmd: Failed to send initial reply: ${e.message}`,
        "warn",
        "SearchCmd-Execute"
      );
    }

    let player = client.manager.players.get(message.guild.id);
    if (!player) {
      try {
        player = await client.manager.createPlayer({
          voiceId: channel.id,
          textId: message.channel.id,
          guildId: message.guild.id,
          shardId: message.guild.shardId,
          loadBalancer: true,
          deaf: true,
        });
        client.log(
          `SearchCmd: Player created for guild ${message.guild.id}`,
          "player",
          "SearchCmd-Execute"
        );
      } catch (playerError) {
        client.log(
          `SearchCmd: Error creating player: ${playerError.message}`,
          "error",
          "SearchCmd-Execute"
        );
        const playerErrEmbed = new client.embed(errorColor);
        playerErrEmbed.error(
          `Could not create music player: ${playerError.message}`
        );
        if (replyMessage)
          return replyMessage
            .edit({ embeds: [playerErrEmbed] })
            .catch(() => {});
        return message.channel
          .send({ embeds: [playerErrEmbed] })
          .catch(() => {});
      }
    }

    const searchOptions = { requester: message.author, limit: 25 }; // Fetch up to 25 to have enough for display
    let allResults = [];
    let currentSearchPlatformName = "";

    // --- Sequential Search Logic ---
    const ytmEngine = client.config.FUEGO?.DEFAULT_SEARCH_ENGINE === "ytmsearch" || client.config.FUEGO?.DEFAULT_SEARCH_ENGINE === "youtube" ? client.config.FUEGO?.DEFAULT_SEARCH_ENGINE : "ytmsearch"; // Prioritize ytmsearch, allow config override
    const ytEngine = "youtube"; // Or "ytsearch" if your Lavalink uses that

    // 1. Try YouTube Music
    currentSearchPlatformName = ytmEngine === "ytmsearch" ? "YouTube Music" : "Default Engine (YTM biased)";
    if (replyMessage) {
        const searchingYtmEmbed = new client.embed(defaultColor);
        searchingYtmEmbed.desc(`${emoji.search || "🔍"} Searching on ${currentSearchPlatformName} for "${query}"...`);
        await replyMessage.edit({ embeds: [searchingYtmEmbed] }).catch(() => {});
    }
    client.log(`SearchCmd: Attempting search on ${currentSearchPlatformName} for: "${query}"`, "debug", "SearchCmd-Execute");
    try {
        const resultYtm = await player.search(query, { ...searchOptions, engine: ytmEngine });
        if (resultYtm && resultYtm.tracks.length > 0) {
            resultYtm.tracks.forEach((track) => {
                track.requester = message.author;
                track.userData = {
                    ...track.userData,
                    sourceNameForDisplay: currentSearchPlatformName,
                    sourceIcon: client.emoji?.ytmsearch || "<:y_youtube:1308548668726579293>", // Use YTM icon
                    requesterId: message.author.id,
                    requesterTag: message.author.tag,
                };
                allResults.push(track);
            });
        }
    } catch (error) {
        client.log(`SearchCmd: Error searching ${currentSearchPlatformName} for "${query}": ${error.message}`, "warn", "SearchCmd-Execute");
    }

    // 2. If no results from YTM, try YouTube
    if (allResults.length === 0) {
        currentSearchPlatformName = "YouTube";
        if (replyMessage) {
            const searchingYtEmbed = new client.embed(defaultColor);
            searchingYtEmbed.desc(`${emoji.warn || "⚠️"} No results on YouTube Music. Searching ${currentSearchPlatformName} for "${query}"...`);
            await replyMessage.edit({ embeds: [searchingYtEmbed] }).catch(() => {});
        }
        client.log(`SearchCmd: No YTM results. Attempting search on ${currentSearchPlatformName} for: "${query}"`, "debug", "SearchCmd-Execute");
        try {
            const resultYt = await player.search(query, { ...searchOptions, engine: ytEngine });
            if (resultYt && resultYt.tracks.length > 0) {
                resultYt.tracks.forEach((track) => {
                    track.requester = message.author;
                    track.userData = {
                        ...track.userData,
                        sourceNameForDisplay: currentSearchPlatformName,
                        sourceIcon: client.emoji?.youtube || "<:y_youtube:1308548668726579293>", // Use YT icon
                        requesterId: message.author.id,
                        requesterTag: message.author.tag,
                    };
                    allResults.push(track);
                });
            }
        } catch (error) {
            client.log(`SearchCmd: Error searching ${currentSearchPlatformName} for "${query}": ${error.message}`, "warn", "SearchCmd-Execute");
        }
    }
    // --- End of Sequential Search Logic ---

    const noResEmbed = new client.embed(defaultColor);
    noResEmbed.desc(
      `${emoji.no || "❌"} **No results found for your query on YouTube Music or YouTube.**`
    );
    if (allResults.length === 0) {
      if (replyMessage)
        return replyMessage
          .edit({ embeds: [noResEmbed], components: [] })
          .catch(() => {});
      return message.channel.send({ embeds: [noResEmbed] }).catch(() => {});
    }

    // De-duplicate results by URI (should be less necessary now but good practice)
    const tracksToDisplay = [];
    const seenUris = new Set(); 

    for (const track of allResults) {
      const playableUri = track.uri;
      if (!seenUris.has(playableUri)) {
        seenUris.add(playableUri);
        tracksToDisplay.push(track);
        if (tracksToDisplay.length >= 25) break; // Limit to 25 for the select menu
      }
    }

    if (tracksToDisplay.length === 0) { 
      if (replyMessage)
        return replyMessage
          .edit({ embeds: [noResEmbed], components: [] })
          .catch(() => {});
      return message.channel.send({ embeds: [noResEmbed] }).catch(() => {});
    }

    const options = tracksToDisplay.map((track, index) => {
      const displayTitle = track.title || "Unknown Title";
      const displayAuthor = track.author || "Unknown Artist";
      const sourceName = track.userData?.sourceNameForDisplay || "Unknown Source"; // Will reflect which source it came from
      const sourceIconEmoji = track.userData?.sourceIcon || "🎶";
      const durationText = track.isStream
        ? "◉ LIVE"
        : client.formatTime(track.length || 0);

      let labelText = `${index + 1}. ${displayTitle}`;
      if (labelText.length > 80) labelText = labelText.substring(0, 77) + "...";

      let descriptionText = `By: ${displayAuthor} | ${durationText} | Source: ${sourceName}`;
      if (descriptionText.length > 95) {
        const authorAndSourceMax =
          95 - `By:  | ${durationText} | Source: `.length - 3;
        const truncatedAuthor = displayAuthor.substring(
          0,
          Math.max(10, Math.floor(authorAndSourceMax * 0.6))
        );
        const truncatedSource = sourceName.substring(
          0,
          Math.max(5, Math.floor(authorAndSourceMax * 0.3))
        );
        descriptionText = `By: ${truncatedAuthor}${displayAuthor.length > truncatedAuthor.length ? "..." : ""} | ${durationText} | ${truncatedSource}${sourceName.length > truncatedSource.length ? "..." : ""}`;
        if (descriptionText.length > 95)
          descriptionText =
            `${durationText} | ${sourceName}`.substring(0, 95) + "...";
      }

      const option = new StringSelectMenuOptionBuilder()
        .setLabel(labelText)
        .setValue(`${index}`)
        .setDescription(descriptionText);

      const customEmojiMatch = sourceIconEmoji.match(/<a?:[^:]+:(\d+)>$/);
      if (customEmojiMatch && customEmojiMatch[1]) {
        try {
          option.setEmoji(customEmojiMatch[1]);
        } catch (e) {
          /* ignore */
        }
      } else if (
        !sourceIconEmoji.includes(":") &&
        sourceIconEmoji.length <= 4
      ) {
        try {
          option.setEmoji(sourceIconEmoji);
        } catch (e) {
          /* ignore */
        }
      }
      return option;
    });

    const menu = new StringSelectMenuBuilder()
      .setCustomId("search_results_menu_v7") // Incremented version
      .setPlaceholder("Select up to 5 tracks to add to the queue") 
      .setMinValues(1)
      .setMaxValues(Math.min(5, options.length)) 
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);
    const searchEmbed = new client.embed(defaultColor);
    searchEmbed
      .desc( 
        `${emoji.track || "🎵"} **Found ${tracksToDisplay.length} result(s) from ${tracksToDisplay[0].userData?.sourceNameForDisplay || "selected source"}.**\nSelect up to ${menu.data.max_values} track(s) to add to the queue.`
      )
      .setFooter({ text: `Query: ${query.substring(0, 100)}` });

    let selectionMessage;
    if (replyMessage && !replyMessage.deleted) {
      selectionMessage = await replyMessage
        .edit({ embeds: [searchEmbed], components: [row] })
        .catch((err) => {
          client.log(
            `SearchCmd: Failed to EDIT replyMessage with results: ${err.message}`,
            "error",
            "SearchCmd-Execute"
          );
          return null;
        });
    } else {
      selectionMessage = await message.channel
        .send({ embeds: [searchEmbed], components: [row] })
        .catch((err) => {
          client.log(
            `SearchCmd: Failed to SEND selectionMessage: ${err.message}`,
            "error",
            "SearchCmd-Execute"
          );
          return null;
        });
    }

    if (!selectionMessage) {
      client.log(
        "SearchCmd: selectionMessage is null. Aborting collector.",
        "error",
        "SearchCmd-Execute"
      );
      return;
    }

    const filter = (interaction) => interaction.user.id === message.author.id;
    const collector = selectionMessage.createMessageComponentCollector({
      filter,
      time: 60000, 
      idle: 30000, 
    });

    collector.on("collect", async (interaction) => {
      if (!interaction.isStringSelectMenu()) return;
      try {
        if (!interaction.deferred && !interaction.replied)
          await interaction.deferUpdate();
      } catch (e) {
        client.log(
          `SearchCmd: DeferUpdate failed on collect: ${e.message}`,
          "warn",
          "SearchCmd-Collector"
        );
        return;
      }

      let addedDesc = "";
      let actuallyAddedThisInteraction = 0;

      for (const value of interaction.values) {
        const trackIndex = parseInt(value, 10);
        const selectedTrack = tracksToDisplay[trackIndex];

        if (selectedTrack) {
          if (selectedTrack.length < 10000 && !selectedTrack.isStream) { 
            addedDesc += `${emoji.no || "❌"} **Skipped (short):** [${(selectedTrack.title || "Unknown Title").substring(0, 30)}...](${selectedTrack.uri || "#"}) \n`;
            continue;
          }
          player.queue.add(selectedTrack);
          addedDesc += `${emoji.yes || "✅"} **Added:** [${(selectedTrack.title || "Unknown Title").substring(0, 30)}...](${selectedTrack.uri || "#"}) \n`;
          actuallyAddedThisInteraction++;
        }
      }

      const finalEmbed = new client.embed(successColor);
      finalEmbed.setDescription(
        addedDesc ||
          `${emoji.no || "❓"} No valid tracks selected or an issue occurred.`
      );
      if (selectionMessage && !selectionMessage.deleted) {
        await selectionMessage
          .edit({ embeds: [finalEmbed], components: [] })
          .catch(() => {});
      } else {
        message.channel
          .send({ embeds: [finalEmbed] })
          .catch((e) =>
            client.log(
              `SearchCmd: Failed to send final confirmation: ${e.message}`,
              "warn",
              "SearchCmd-Collector"
            )
          );
      }

      if (
        actuallyAddedThisInteraction > 0 &&
        !player.playing &&
        !player.paused
      ) {
        if (player.queue.current || player.queue.size > 0) {
          player.play();
        }
      }
      collector.stop("selection_made");
    });

    collector.on("end", async (collected, reason) => {
      if (
        reason !== "selection_made" &&
        selectionMessage &&
        !selectionMessage.deleted
      ) {
        const timeoutEmbed = new client.embed(defaultColor);
        timeoutEmbed.desc(
          `${emoji.warn || "⚠️"} **Search selection timed out.**`
        );
        await selectionMessage
          .edit({ embeds: [timeoutEmbed], components: [] })
          .catch(() => {});
      }
    });
  },
};