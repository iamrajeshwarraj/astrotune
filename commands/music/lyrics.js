// lyrics.js
const axios = require("axios");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

// --- Start of getLyrics function (your multi-strategy one for lrclib.net) ---
async function getLyricsFallback(trackName, artistName, duration) {
  // console.log(`[getLyricsFallback - MultiStrategy] INPUT: track='${trackName}', artist='${artistName}', duration=${duration}s`);
  try {
    const cleaningStrategies = [
      {
        track: trackName
          .replace(
            /\b(Official|Audio|Video|Lyrics|Theme|Soundtrack|Music|Full Version|HD|4K|Visualizer|Radio Edit|Live|Remix|Mix|Extended|Cover|Parody|Performance|Version|Unplugged|Reupload|Explicit|Clean|Deluxe|Bonus|Acoustic|Instrumental)\b/gi,
            ""
          )
          .replace(/\s*[-_/|()[\]{}]\s*/g, " ")
          .replace(/[^\w\s&']/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
        artist: artistName
          .replace(
            /\b(Topic|VEVO|Records|Label|Productions|Entertainment|Ltd|Inc|Band|DJ|Composer|Performer|Official|Music)\b/gi,
            ""
          )
          .replace(/ x | feat\. | ft\. | featuring /gi, " & ")
          .replace(/[^\w\s&']/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      },
      {
        track: trackName
          .replace(
            /\b(Official|Audio|Video|Lyrics|HD|4K|Live|Remix|Extended|Version)\b/gi,
            ""
          )
          .replace(/\s*[-_/|]\s*/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
        artist: artistName
          .replace(/\b(Topic|VEVO|Records)\b/gi, "")
          .replace(/ x /gi, " & ")
          .replace(/\s+/g, " ")
          .trim(),
      },
      { track: trackName.trim(), artist: artistName.trim() },
    ];
    for (const strategy of cleaningStrategies) {
      if (!strategy.track || !strategy.artist) continue;
      let response;
      if (typeof duration === "number" && !isNaN(duration) && duration > 0) {
        try {
          response = await axios.get(`https://lrclib.net/api/get`, {
            params: {
              track_name: strategy.track,
              artist_name: strategy.artist,
              duration,
            },
            timeout: 5000,
          });
          if (
            response.data &&
            (response.data.syncedLyrics || response.data.plainLyrics)
          )
            return response.data.syncedLyrics || response.data.plainLyrics;
        } catch (e) {
          /* Continue */
        }
      }
      try {
        response = await axios.get(`https://lrclib.net/api/get`, {
          params: { track_name: strategy.track, artist_name: strategy.artist },
          timeout: 5000,
        });
        if (
          response.data &&
          (response.data.syncedLyrics || response.data.plainLyrics)
        )
          return response.data.syncedLyrics || response.data.plainLyrics;
      } catch (e) {
        /* Continue */
      }
      if (
        strategy.track &&
        strategy.artist &&
        strategy.track.toLowerCase() !== strategy.artist.toLowerCase()
      ) {
        try {
          response = await axios.get(`https://lrclib.net/api/get`, {
            params: {
              track_name: strategy.artist,
              artist_name: strategy.track,
            },
            timeout: 5000,
          });
          if (
            response.data &&
            (response.data.syncedLyrics || response.data.plainLyrics)
          )
            return response.data.syncedLyrics || response.data.plainLyrics;
        } catch (e) {
          /* Continue */
        }
      }
    }
    try {
      if (cleaningStrategies[0].track && cleaningStrategies[0].artist) {
        const searchResponse = await axios.get(
          `https://lrclib.net/api/search`,
          {
            params: {
              q: `${cleaningStrategies[0].track} ${cleaningStrategies[0].artist}`.trim(),
            },
            timeout: 5000,
          }
        );
        if (searchResponse.data && searchResponse.data.length > 0) {
          const bestMatch = searchResponse.data[0];
          if (bestMatch.syncedLyrics || bestMatch.plainLyrics)
            return bestMatch.syncedLyrics || bestMatch.plainLyrics;
        }
      }
    } catch (e) {
      /* Search failed */
    }
    return null;
  } catch (error) {
    console.error(
      "[getLyricsFallback - MultiStrategy] ❌ Top-level fetch error:",
      error.response?.data?.message || error.message
    );
    return null;
  }
}
// --- End of getLyricsFallback function ---

async function showLiveLyrics(
  client,
  channel,
  player,
  config,
  originalAuthorId
) {
  if (!player || !player.queue.current) {
    return;
  }

  const guildId = player.guildId || player.guild;

  if (client.guildTrackMessages && client.guildTrackMessages.has(guildId)) {
    let guildMessages = client.guildTrackMessages.get(guildId);
    const oldLyricsSessions = guildMessages.filter(
      (msgInfo) => msgInfo.type === "lyrics"
    );

    if (oldLyricsSessions.length > 0) {
      for (const oldSession of oldLyricsSessions) {
        if (oldSession.intervalId) {
          clearInterval(oldSession.intervalId);
        }
        if (
          oldSession.collectorInstance &&
          !oldSession.collectorInstance.ended
        ) {
          oldSession.collectorInstance.stop("aggressive_cleanup_by_new_lyrics");
        }
        try {
          const oldChannel = await client.channels
            .fetch(oldSession.channelId)
            .catch(() => null);
          if (oldChannel) {
            const oldMessage = await oldChannel.messages
              .fetch(oldSession.messageId)
              .catch(() => null);
            if (oldMessage && !oldMessage.deleted) {
              await oldMessage.delete().catch((e) => {});
            }
          }
        } catch (e) {}
      }
      guildMessages = guildMessages.filter(
        (msgInfo) => msgInfo.type !== "lyrics"
      );
      client.guildTrackMessages.set(guildId, guildMessages);
    }
  }

  const track = player.queue.current;
  let lyricsText = null;

  // Try to get lyrics from Lavasrc plugin (or other Lavalink plugins)
  if (
    track.pluginInfo &&
    track.pluginInfo.lavasrc &&
    track.pluginInfo.lavasrc.lyrics
  ) {
    const lavasrcLyrics = track.pluginInfo.lavasrc.lyrics;
    if (
      typeof lavasrcLyrics.text === "string" &&
      lavasrcLyrics.text.trim() !== ""
    ) {
      lyricsText = lavasrcLyrics.text;
      client.log(
        `[Lyrics] Loaded lyrics from Lavasrc plugin for track: ${track.title}`,
        "info",
        "LyricsCmd"
      );
    }
  } else if (track.pluginInfo && track.pluginInfo.lyrics) {
    // Generic fallback for other potential lyric plugins
    if (
      typeof track.pluginInfo.lyrics.text === "string" &&
      track.pluginInfo.lyrics.text.trim() !== ""
    ) {
      // Example structure
      lyricsText = track.pluginInfo.lyrics.text;
      client.log(
        `[Lyrics] Loaded lyrics from generic track.pluginInfo.lyrics for track: ${track.title}`,
        "info",
        "LyricsCmd"
      );
    } else if (
      typeof track.pluginInfo.lyrics === "string" &&
      track.pluginInfo.lyrics.trim() !== ""
    ) {
      // Simpler string directly
      lyricsText = track.pluginInfo.lyrics;
      client.log(
        `[Lyrics] Loaded lyrics directly from track.pluginInfo.lyrics (string) for track: ${track.title}`,
        "info",
        "LyricsCmd"
      );
    }
  }

  // If Lavalink didn't provide lyrics, fall back to lrclib.net
  if (!lyricsText) {
    client.log(
      `[Lyrics] Lavalink/Lavasrc lyrics not found for "${track.title}", trying lrclib.net...`,
      "info",
      "LyricsCmd"
    );
    const searchTitle = track.title;
    const searchArtist = track.author;
    const queryDurationMs = track.length;
    let trackDurationSecForAPI =
      typeof queryDurationMs === "number" &&
      !isNaN(queryDurationMs) &&
      queryDurationMs > 0
        ? Math.floor(queryDurationMs / 1000)
        : null;

    lyricsText = await getLyricsFallback(
      searchTitle,
      searchArtist,
      trackDurationSecForAPI
    );
  }

  if (!lyricsText) {
    const noLyricsEmbed = new EmbedBuilder()
      .setColor(config.embedColor || "#FF0000")
      .setDescription("❌ **Lyrics not found for this track!**");
    channel
      .send({ embeds: [noLyricsEmbed] })
      .then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 7000);
      })
      .catch(() => {});
    return;
  }

  const lines = lyricsText
    .split("\n")
    .map((line) => (typeof line === "string" ? line.trim() : ""))
    .filter(Boolean);
  const displayDurationMs = track.length;
  const songDurationSecTotal =
    typeof displayDurationMs === "number" &&
    !isNaN(displayDurationMs) &&
    displayDurationMs > 0
      ? Math.floor(displayDurationMs / 1000)
      : lines.length > 0
        ? lines.length * 4
        : 180;
  const lyricsAreSyncedFormat =
    lines[0] &&
    typeof lines[0] === "string" &&
    lines[0].match(/^\[\d{2}:\d{2}[.:]\d{2,3}\]/);

  let statusMessage = null;
  try {
    statusMessage = await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(config.embedColor || "#3d16ca")
          .setDescription("<a:loop:1308542583991173195> Finding lyrics..."),
      ],
    });
  } catch (e) {
    /* Proceed without status message */
  }

  const initialEmbed = new EmbedBuilder()
    .setTitle(`<a:MusicNotes:1308553832086896771> Live Lyrics: ${track.title}`)
    .setDescription("<a:loop:1308542583991173195> Syncing lyrics...")
    .setColor(config.embedColor || "#3d16ca")
    .setFooter({ text: `Artist: ${track.author}` });
  const stopButton = new ButtonBuilder()
    .setCustomId("lyrics_stop")
    .setLabel("Stop Lyrics")
    .setStyle(ButtonStyle.Danger);
  const fullButton = new ButtonBuilder()
    .setCustomId("lyrics_full")
    .setLabel("Full Lyrics")
    .setStyle(ButtonStyle.Primary);
  const row = new ActionRowBuilder().addComponents(fullButton, stopButton);

  let lyricsMessage;
  try {
    if (statusMessage && !statusMessage.deleted)
      lyricsMessage = await statusMessage.edit({
        embeds: [initialEmbed],
        components: [row],
      });
    else
      lyricsMessage = await channel.send({
        embeds: [initialEmbed],
        components: [row],
      });
  } catch (sendError) {
    console.error(
      "[Lyrics Command] Failed to send/edit initial lyrics message:",
      sendError.message
    );
    if (statusMessage && !statusMessage.deleted)
      statusMessage.delete().catch(() => {});
    return;
  }
  if (!lyricsMessage) {
    console.error("[Lyrics Command] lyricsMessage is null. Aborting.");
    if (statusMessage && !statusMessage.deleted)
      statusMessage.delete().catch(() => {});
    return;
  }

  let currentLyricsIntervalId = null;
  const LYRIC_OFFSET_MS = -4500;

  const updateLyrics = async () => {
    if (
      !currentLyricsIntervalId ||
      !player ||
      !player.queue.current ||
      player.queue.current.identifier !== track.identifier ||
      !lyricsMessage ||
      lyricsMessage.deleted
    ) {
      if (currentLyricsIntervalId) clearInterval(currentLyricsIntervalId);
      currentLyricsIntervalId = null;
      if (lyricsMessage && !lyricsMessage.deleted) {
        lyricsMessage.delete().catch(() => {});
      }
      if (client.guildTrackMessages && guildId && lyricsMessage) {
        let guildMessages = client.guildTrackMessages.get(guildId) || [];
        guildMessages = guildMessages.filter(
          (msgInfo) => msgInfo.messageId !== lyricsMessage.id
        );
        client.guildTrackMessages.set(guildId, guildMessages);
      }
      lyricsMessage = null;
      return;
    }
    const rawCurrentTimeMs = player.position;
    const currentTimeMs = rawCurrentTimeMs - LYRIC_OFFSET_MS;
    const totalLines = lines.length;
    let activeLineIndex = -1;
    if (lyricsAreSyncedFormat) {
      for (let i = 0; i < lines.length; i++) {
        if (typeof lines[i] !== "string") continue;
        const match = lines[i].match(/^\[(\d{2}):(\d{2})[.:](\d{2,3})\](.*)/);
        if (match) {
          const min = parseInt(match[1], 10);
          const sec = parseInt(match[2], 10);
          const msPart = match[3];
          const ms = parseInt(msPart.length === 2 ? msPart + "0" : msPart, 10);
          const lineTimeMs = min * 60 * 1000 + sec * 1000 + ms;
          if (lineTimeMs <= currentTimeMs) {
            activeLineIndex = i;
          } else {
            break;
          }
        }
      }
    } else {
      const progress =
        songDurationSecTotal > 0
          ? Math.max(0, currentTimeMs / 1000) / songDurationSecTotal
          : 0;
      let calculatedIndex = Math.floor(progress * totalLines);
      activeLineIndex = Math.max(0, Math.min(totalLines - 1, calculatedIndex));
      if (totalLines === 0) activeLineIndex = -1;
    }
    const displayLines = [];
    const CONTEXT_LINES_BEFORE_AFTER = 2;
    if (totalLines > 0) {
      let startDisplayIndex;
      let endDisplayIndex;
      if (activeLineIndex !== -1) {
        startDisplayIndex = Math.max(
          0,
          activeLineIndex - CONTEXT_LINES_BEFORE_AFTER
        );
        endDisplayIndex = Math.min(
          totalLines,
          activeLineIndex + CONTEXT_LINES_BEFORE_AFTER + 1
        );
      } else {
        if (lyricsAreSyncedFormat) {
          displayLines.push(
            "<:MUSIC:1308550866956976138> (Lyrics starting soon...)"
          );
        }
        startDisplayIndex = 0;
        endDisplayIndex = Math.min(
          totalLines,
          CONTEXT_LINES_BEFORE_AFTER * 2 + 1
        );
      }
      for (let i = startDisplayIndex; i < endDisplayIndex; i++) {
        if (typeof lines[i] === "string") {
          let lineContent = lines[i];
          if (lyricsAreSyncedFormat) {
            const lineMatch = lineContent.match(
              /^\[(\d{2}):(\d{2})[.:](\d{2,3})\](.*)/
            );
            if (lineMatch && typeof lineMatch[4] === "string") {
              lineContent = lineMatch[4].trim();
            } else {
              lineContent = lineContent.trim();
            }
          } else {
            lineContent = lineContent.trim();
          }
          if (i === activeLineIndex) {
            displayLines.push(
              `**<a:nr_arrow:1308552225450233946> ${lineContent}**`
            );
          } else {
            displayLines.push(lineContent);
          }
        }
      }
    } else {
      displayLines.push("No lyrics lines found to display.");
    }
    let visibleLyrics = displayLines.join("\n");
    if (visibleLyrics.length > 4000) {
      visibleLyrics = visibleLyrics.substring(0, 3997) + "...";
    }
    if (
      visibleLyrics.length === 0 &&
      lines.length > 0 &&
      typeof lines[0] === "string"
    ) {
      visibleLyrics = lyricsAreSyncedFormat
        ? (
            lines[0].match(/^\[(\d{2}):(\d{2})[.:](\d{2,3})\](.*)/)?.[1] ||
            lines[0]
          ).trim()
        : lines[0].trim();
    } else if (visibleLyrics.length === 0) {
      visibleLyrics = "...";
    }
    if (lyricsMessage && !lyricsMessage.deleted) {
      try {
        const newEmbed =
          EmbedBuilder.from(initialEmbed).setDescription(visibleLyrics);
        await lyricsMessage.edit({ embeds: [newEmbed] });
      } catch (editError) {
        if (editError.code === 10008 || editError.httpStatus === 404) {
          if (currentLyricsIntervalId) clearInterval(currentLyricsIntervalId);
          currentLyricsIntervalId = null;
          if (client.guildTrackMessages && guildId && lyricsMessage) {
            let guildMessages = client.guildTrackMessages.get(guildId) || [];
            guildMessages = guildMessages.filter(
              (msgInfo) => msgInfo.messageId !== lyricsMessage.id
            );
            client.guildTrackMessages.set(guildId, guildMessages);
          }
          lyricsMessage = null;
        } else {
          /* console.error("[UpdateLyrics] Unexpected error:", editError.message); */
        }
      }
    } else if (currentLyricsIntervalId) {
      clearInterval(currentLyricsIntervalId);
      currentLyricsIntervalId = null;
      if (client.guildTrackMessages && guildId && lyricsMessage) {
        let guildMessages = client.guildTrackMessages.get(guildId) || [];
        guildMessages = guildMessages.filter(
          (msgInfo) => msgInfo.messageId !== lyricsMessage.id
        );
        client.guildTrackMessages.set(guildId, guildMessages);
      }
      lyricsMessage = null;
    }
  };

  const LYRICS_INTERVAL_MS = 4500;

  if (lines.length > 0) {
    currentLyricsIntervalId = setInterval(updateLyrics, LYRICS_INTERVAL_MS);
    updateLyrics();
  } else {
    initialEmbed.setDescription(
      "Lyrics found, but format is unusual or empty."
    );
    if (lyricsMessage && !lyricsMessage.deleted) {
      await lyricsMessage.edit({ embeds: [initialEmbed], components: [] });
    } else if (statusMessage && !statusMessage.deleted) {
      await statusMessage.edit({ embeds: [initialEmbed], components: [] });
    }
  }

  let remainingDurationMs = 300000;
  if (songDurationSecTotal > 0 && typeof player.position === "number") {
    remainingDurationMs = songDurationSecTotal * 1000 - player.position + 15000;
    if (remainingDurationMs <= 15000) remainingDurationMs = 300000;
  }

  const lyricsButtonFilter = async (interaction) => {
    if (interaction.user.id === originalAuthorId) {
      return true;
    }
    const permissionEmbed = new EmbedBuilder()
      .setColor(config.embedColor || "#FF0000")
      .setDescription(
        `🚫 Only the user who started the lyrics can use these buttons.`
      );
    try {
      await interaction.reply({ embeds: [permissionEmbed], ephemeral: true });
    } catch (e) {
      /* Ignore */
    }
    return false;
  };

  const collector = lyricsMessage.createMessageComponentCollector({
    filter: lyricsButtonFilter,
    time: remainingDurationMs,
  });

  if (client.guildTrackMessages && lyricsMessage) {
    let guildMessages = client.guildTrackMessages.get(guildId) || [];
    guildMessages = guildMessages.filter(
      (msgInfo) => msgInfo.type !== "lyrics"
    );
    guildMessages.push({
      messageId: lyricsMessage.id,
      channelId: channel.id,
      type: "lyrics",
      intervalId: currentLyricsIntervalId,
      collectorInstance: collector,
    });
    client.guildTrackMessages.set(guildId, guildMessages);
  }

  collector.on("collect", async (i) => {
    if (!player || !player.queue.current) {
      collector.stop("player_stopped");
      return;
    }
    try {
      await i.deferUpdate();
    } catch (deferError) {
      return;
    }

    if (i.customId === "lyrics_stop") {
      if (currentLyricsIntervalId) clearInterval(currentLyricsIntervalId);
      currentLyricsIntervalId = null;
      collector.stop("user_stopped_lyrics");
    } else if (i.customId === "lyrics_full") {
      if (currentLyricsIntervalId) clearInterval(currentLyricsIntervalId);
      currentLyricsIntervalId = null;
      let fullLyricsText = lines.join("\n");
      if (lyricsAreSyncedFormat) {
        fullLyricsText = lines
          .map((line) => {
            if (typeof line !== "string") return "";
            const match = line.match(/^\[(\d{2}):(\d{2})[.:](\d{2,3})\](.*)/);
            return match && typeof match[4] === "string"
              ? match[4].trim()
              : line.trim(); // Changed index from 1 to 4 for content
          })
          .filter(Boolean)
          .join("\n");
      }
      if (
        fullLyricsText.length === 0 &&
        typeof lyricsText === "string" &&
        lyricsText.length > 0
      ) {
        fullLyricsText = lyricsText;
      }

      const fullLyricsEmbed = EmbedBuilder.from(initialEmbed);

      if (fullLyricsText.length > 4000) {
        const chunks = [];
        for (let k = 0; k < fullLyricsText.length; k += 3900) {
          chunks.push(fullLyricsText.substring(k, k + 3900));
        }
        fullLyricsEmbed.setDescription(
          chunks[0] || "Lyrics content is too long to display in one part."
        );
        const deleteButton = new ButtonBuilder()
          .setCustomId("lyrics_delete")
          .setLabel("Delete")
          .setStyle(ButtonStyle.Danger);
        const deleteRow = new ActionRowBuilder().addComponents(deleteButton);
        if (lyricsMessage && !lyricsMessage.deleted) {
          try {
            await lyricsMessage.edit({
              embeds: [fullLyricsEmbed],
              components: [deleteRow],
            });
          } catch (e) {
            console.error(
              "[Collector] Error editing message for full lyrics (chunk 1):",
              e
            );
          }
        }
        for (let k = 1; k < chunks.length; k++) {
          const followupEmbed = new EmbedBuilder()
            .setColor(config.embedColor || "#3498db")
            .setDescription(chunks[k]);
          if (channel && typeof channel.send === "function") {
            await channel
              .send({ embeds: [followupEmbed] })
              .catch((e) =>
                console.error(
                  "[Collector] Failed to send followup lyrics chunk:",
                  e
                )
              );
          }
        }
      } else {
        fullLyricsEmbed.setDescription(
          fullLyricsText || "No lyrics content to display."
        );
        const deleteButton = new ButtonBuilder()
          .setCustomId("lyrics_delete")
          .setLabel("Delete")
          .setStyle(ButtonStyle.Danger);
        const deleteRow = new ActionRowBuilder().addComponents(deleteButton);
        if (lyricsMessage && !lyricsMessage.deleted) {
          try {
            await lyricsMessage.edit({
              embeds: [fullLyricsEmbed],
              components: [deleteRow],
            });
          } catch (e) {
            console.error(
              "[Collector] Error editing message for full lyrics:",
              e
            );
          }
        }
      }
    } else if (i.customId === "lyrics_delete") {
      if (currentLyricsIntervalId) clearInterval(currentLyricsIntervalId);
      currentLyricsIntervalId = null;
      collector.stop("user_deleted_lyrics");
    }
  });

  collector.on("end", (collected, reason) => {
    if (currentLyricsIntervalId) clearInterval(currentLyricsIntervalId);
    currentLyricsIntervalId = null;

    if (client.guildTrackMessages && guildId && lyricsMessage) {
      let guildMessages = client.guildTrackMessages.get(guildId) || [];
      guildMessages = guildMessages.filter(
        (msgInfo) => msgInfo.messageId !== lyricsMessage.id
      );
      client.guildTrackMessages.set(guildId, guildMessages);
    }
    if (lyricsMessage && !lyricsMessage.deleted) {
      lyricsMessage.delete().catch((delErr) => {
        if (delErr.code !== 10008) {
          /* console.warn(`[Collector] Delete fail: ${delErr.message}`); */
        }
      });
    }
    lyricsMessage = null;
  });
}

module.exports = {
  name: "lyrics",
  aliases: ["ly", "l"],
  cooldown: 10,
  category: "music",
  description:
    "Shows live lyrics for the currently playing song (tries Lavasrc first).",
  args: false,
  vote: false,
  admin: false,
  owner: false,
  permissions: ["EmbedLinks", "SendMessages"],
  player: true,
  queue: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (client, message, args, commandName, prefix, db, config) => {
    const player = client.manager.players.get(message.guild.id);
    if (!player || !player.queue.current) {
      return message.reply({
        embeds: [
          new client.embed(config.embedColor || client.color)
            .setColor("#FF0000")
            .desc(
              "<a:cross:1303637975292313633> **No song is currently playing!**"
            ),
        ],
      });
    }

    const guildId = message.guild.id;

    if (client.guildTrackMessages && client.guildTrackMessages.has(guildId)) {
      let guildMessages = client.guildTrackMessages.get(guildId);
      const existingLyricsInfo = guildMessages.find(
        (msgInfo) => msgInfo.type === "lyrics"
      );

      if (existingLyricsInfo) {
        try {
          const existingChannel = await client.channels
            .fetch(existingLyricsInfo.channelId)
            .catch(() => null);
          if (existingChannel) {
            const fetchedMsg = await existingChannel.messages
              .fetch(existingLyricsInfo.messageId)
              .catch(() => null);
            if (fetchedMsg && !fetchedMsg.deleted) {
              const replyEmbed = new EmbedBuilder()
                .setColor(config.embedColor || client.color || "#3498db")
                .setDescription(
                  `ℹ️ Lyrics are already active! [Jump to Lyrics](${fetchedMsg.url})`
                );
              message.reply({
                embeds: [replyEmbed],
                allowedMentions: { repliedUser: true },
              });
              return;
            }
          }
        } catch (e) {}
      }
    }

    await showLiveLyrics(
      client,
      message.channel,
      player,
      client.config || config,
      message.author.id
    );
  },
};
