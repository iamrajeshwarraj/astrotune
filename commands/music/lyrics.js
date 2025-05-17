// lyrics.js
const axios = require("axios");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

// --- Start of functions ---

async function getLyricsFromLrcLib(
  trackName,
  artistName,
  trackDurationInSeconds
) {
  // console.log(`[getLyricsFromLrcLib] Initial: trackName='${trackName}', artistName='${artistName}', duration=${trackDurationInSeconds}s`);
  try {
    let cleanedTrackName = trackName
      .toLowerCase()
      .replace(/\b(ft|feat)\b\.?/g, "")
      .replace(
        /\b(official|audio|video|lyrics|theme|soundtrack|music|full version|hd|4k|visualizer|radio edit|live|remix|mix|extended|cover|parody|performance|version|unplugged|reupload|lyric video|music video|audio only|instrumental)\b/gi,
        ""
      )
      .replace(/\(.*?\)|\[.*?\]|\{.*?\}/g, "")
      .replace(/\s*[-_/|—]\s*/g, " ")
      .replace(/[^\w\s&']/g, "")
      .replace(/\s+/g, " ")
      .trim();
    let cleanedArtistName = artistName
      .toLowerCase()
      .replace(/\b(ft|feat)\b\.?/g, "")
      .replace(
        /\b(topic|vevo|records|label|productions|entertainment|ltd|inc|band|dj|composer|performer|official)\b/gi,
        ""
      )
      .replace(/ x /gi, " & ")
      .replace(/\(.*?\)|\[.*?\]|\{.*?\}/g, "")
      .replace(/\s*[-_/|—]\s*/g, " ")
      .replace(/[^\w\s&']/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanedArtistName && artistName)
      cleanedArtistName = artistName.trim().toLowerCase();
    if (!cleanedTrackName && trackName)
      cleanedTrackName = trackName.trim().toLowerCase();

    if (!cleanedTrackName || !cleanedArtistName) {
      return null;
    }

    let responseData = null;

    if (
      typeof trackDurationInSeconds === "number" &&
      !isNaN(trackDurationInSeconds) &&
      Number.isFinite(trackDurationInSeconds) &&
      trackDurationInSeconds > 0
    ) {
      const paramsWithDuration = {
        track_name: cleanedTrackName,
        artist_name: cleanedArtistName,
        album_name: "",
        duration: trackDurationInSeconds,
      };
      try {
        const res = await axios.get(`https://lrclib.net/api/get`, {
          params: paramsWithDuration,
          timeout: 7000,
        });
        if (res.data && (res.data.syncedLyrics || res.data.plainLyrics)) {
          responseData = res.data;
        }
      } catch (error) {
        /* Continue */
      }
    }

    if (!responseData) {
      const paramsWithoutDuration = {
        track_name: cleanedTrackName,
        artist_name: cleanedArtistName,
        album_name: "",
      };
      try {
        const res = await axios.get(`https://lrclib.net/api/get`, {
          params: paramsWithoutDuration,
          timeout: 7000,
        });
        if (res.data && (res.data.syncedLyrics || res.data.plainLyrics)) {
          responseData = res.data;
        }
      } catch (error) {
        console.error(
          "[getLyricsFromLrcLib] ❌ Error during request without duration:",
          error.message
        );
      }
    }
    return responseData
      ? responseData.syncedLyrics || responseData.plainLyrics
      : null;
  } catch (error) {
    console.error(
      "[getLyricsFromLrcLib] ❌ Unexpected error in function:",
      error.message
    );
    return null;
  }
}

async function showLiveLyrics(client, channel, player, config) {
  if (!player || !player.queue.current) {
    const noSongEmbed = new EmbedBuilder()
      .setColor(config.embedColor || "#FF0000")
      .setDescription("🚫 **No song is currently playing.**");
    return channel.send({ embeds: [noSongEmbed] });
  }

  const track = player.queue.current;
  const trackDurationMs = track.duration;
  let trackDurationSecForAPI =
    typeof trackDurationMs === "number" &&
    !isNaN(trackDurationMs) &&
    trackDurationMs > 0
      ? Math.floor(trackDurationMs / 1000)
      : null;
  const lyricsText = await getLyricsFromLrcLib(
    track.title,
    track.author,
    trackDurationSecForAPI
  );

  if (!lyricsText) {
    const noLyricsEmbed = new EmbedBuilder()
      .setColor(config.embedColor || "#FF0000")
      .setDescription("❌ **Lyrics not found for this track!**");
    return channel.send({ embeds: [noLyricsEmbed] });
  }

  const lines = lyricsText
    .split("\n")
    .map((line) => (typeof line === "string" ? line.trim() : ""))
    .filter(Boolean);
  const songDurationSecTotal =
    typeof trackDurationMs === "number" &&
    !isNaN(trackDurationMs) &&
    trackDurationMs > 0
      ? Math.floor(trackDurationMs / 1000)
      : lines.length > 0
        ? lines.length * 4
        : 180;
  const lyricsAreSyncedFormat =
    lines[0] &&
    typeof lines[0] === "string" &&
    lines[0].match(/^\[\d{2}:\d{2}[.:]\d{2,3}\]/);

  const initialEmbed = new EmbedBuilder()
    .setTitle(`🎵 Live Lyrics: ${track.title}`)
    .setDescription("🔄 Syncing lyrics...")
    .setColor(config.embedColor || "#3498db")
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
    lyricsMessage = await channel.send({
      embeds: [initialEmbed],
      components: [row],
    });
  } catch (sendError) {
    console.error(
      "[Lyrics Command] Failed to send initial lyrics message:",
      sendError
    );
    return;
  }

  const guildId = player.guildId || player.guild;
  if (client.guildTrackMessages && guildId) {
    if (!client.guildTrackMessages.has(guildId)) {
      client.guildTrackMessages.set(guildId, []);
    }
    client.guildTrackMessages
      .get(guildId)
      .push({
        messageId: lyricsMessage.id,
        channelId: channel.id,
        type: "lyrics",
      });
  }

  let lyricsInterval;

  // ===== CONFIGURABLE SYNC OFFSET =====
  const LYRIC_OFFSET_MS = -4000; // If lyrics are BEHIND, make this NEGATIVE to "advance" them.
  // ====================================

  const updateLyrics = async () => {
    if (
      !player ||
      !player.queue.current ||
      player.queue.current.identifier !== track.identifier ||
      (lyricsMessage && lyricsMessage.deleted)
    ) {
      clearInterval(lyricsInterval);
      if (lyricsMessage && !lyricsMessage.deleted) {
        lyricsMessage.delete().catch(() => {});
      }
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
          displayLines.push("🎶 (Lyrics starting soon...)");
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
            displayLines.push(`**➡️ ${lineContent}**`);
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
            lines[0].match(/^\[\d{2}:\d{2}[.:]\d{2,3}\](.*)/)?.[1] || lines[0]
          ).trim()
        : lines[0].trim();
    } else if (visibleLyrics.length === 0) {
      visibleLyrics = "...";
    }

    // console.log(`[UpdateLyrics] PlayerPos(ms)=${rawCurrentTimeMs}, EffectiveTime(ms)=${currentTimeMs}, activeLineIndex=${activeLineIndex}`);

    if (lyricsMessage && !lyricsMessage.deleted) {
      try {
        const newEmbed =
          EmbedBuilder.from(initialEmbed).setDescription(visibleLyrics);
        await lyricsMessage.edit({ embeds: [newEmbed] });
      } catch (editError) {
        console.error(
          "[UpdateLyrics] Error editing lyrics message:",
          editError.message,
          `Code: ${editError.code}`
        );
        if (editError.code === 10008 || editError.httpStatus === 404) {
          clearInterval(lyricsInterval);
        }
      }
    } else {
      clearInterval(lyricsInterval);
    }
  };

  // ===== LYRICS UPDATE INTERVAL =====
  // Set this close to your PlayerPos(ms) update frequency from Kazagumo logs
  const LYRICS_INTERVAL_MS = 4500; // Example: if PlayerPos updates approx every 5s
  // =================================

  if (lines.length > 0) {
    lyricsInterval = setInterval(updateLyrics, LYRICS_INTERVAL_MS);
    updateLyrics();
  } else {
    initialEmbed.setDescription(
      "Lyrics found, but format is unusual or empty."
    );
    if (lyricsMessage && !lyricsMessage.deleted) {
      await lyricsMessage.edit({ embeds: [initialEmbed], components: [] });
    }
  }

  let remainingDurationMs = 300000;
  if (songDurationSecTotal > 0 && typeof player.position === "number") {
    remainingDurationMs = songDurationSecTotal * 1000 - player.position + 15000;
    if (remainingDurationMs <= 15000) remainingDurationMs = 300000;
  }
  const collector = lyricsMessage.createMessageComponentCollector({
    time: remainingDurationMs,
  });

  collector.on("collect", async (i) => {
    if (!player || !player.queue.current) {
      collector.stop("player_stopped");
      return;
    }
    try {
      await i.deferUpdate();
    } catch (deferError) {
      console.error(
        `[Collector] Failed to defer update for '${i.customId}':`,
        deferError
      );
      return;
    }

    if (i.customId === "lyrics_stop") {
      clearInterval(lyricsInterval);
      collector.stop("user_stopped_lyrics");
    } else if (i.customId === "lyrics_full") {
      clearInterval(lyricsInterval);
      let fullLyricsText = lines.join("\n");
      if (lyricsAreSyncedFormat) {
        fullLyricsText = lines
          .map((line) => {
            if (typeof line !== "string") return "";
            const match = line.match(/^\[\d{2}:\d{2}[.:]\d{2,3}\](.*)/);
            return match && typeof match[1] === "string"
              ? match[1].trim()
              : line.trim();
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
      collector.stop("user_deleted_lyrics");
    }
  });

  collector.on("end", (collected, reason) => {
    clearInterval(lyricsInterval);
    if (lyricsMessage && !lyricsMessage.deleted) {
      lyricsMessage.delete().catch((delErr) => {
        if (delErr.code !== 10008) {
          console.warn(
            `[Collector] Failed to delete lyrics message on end (unexpected error): ${delErr.message} (Code: ${delErr.code})`
          );
        }
      });
    }
    if (client.guildTrackMessages && guildId) {
      const messages = client.guildTrackMessages.get(guildId);
      if (messages) {
        const index = messages.findIndex(
          (m) => m.messageId === lyricsMessage.id
        );
        if (index > -1) {
          messages.splice(index, 1);
        }
      }
    }
  });
}
// --- End of functions ---

module.exports = {
  name: "lyrics",
  aliases: ["ly", "l"],
  cooldown: 10,
  category: "music",
  description: "Shows live lyrics for the currently playing song.",
  args: false,
  vote: false,
  admin: false,
  owner: false,
  permissions: ["EmbedLinks", "SendMessages"],
  player: true,
  queue: true,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  execute: async (client, message, args, commandName, prefix, db, config) => {
    const player = client.manager.players.get(message.guild.id);
    if (!player || !player.queue.current) {
      return message.reply({
        embeds: [
          new client.embed()
            .setColor(config.embedColor || "#FF0000")
            .desc("❌ **No song is currently playing!**"),
        ],
      });
    }
    await showLiveLyrics(
      client,
      message.channel,
      player,
      client.config || config
    );
  },
};
