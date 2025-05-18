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
  receivedArtistName,
  trackDurationInSeconds
) {
  // ... (Keep your latest working getLyricsFromLrcLib here - the one that handles labels like Coke Studio) ...
  // For brevity, I'm not pasting it again here. It's the long one from three responses ago.
  // Make sure it includes the expanded knownLabelsOrProducers list.
  // console.log(`\n--- [getLyricsFromLrcLib] NEW REQUEST ---`);
  // console.log(`[getLyricsFromLrcLib] INPUT: track='${trackName}', artist='${receivedArtistName}', durationSec=${trackDurationInSeconds}`);

  const normalizeAndLower = (str) =>
    typeof str === "string" ? str.normalize("NFC").toLowerCase() : "";

  let titleForParsing = normalizeAndLower(trackName);
  let artistInputLower = normalizeAndLower(receivedArtistName);

  let artistsToQuery = [];
  const knownLabelsOrProducers = [
    "t series",
    "t-series",
    "sony music",
    "zee music company",
    "eros now",
    "saregama geny",
    "yash raj films",
    "yrf music",
    "coke studio",
    "coke studio pakistan",
    "cokestudio",
    "speed records",
    "aditya music",
    "lahari music",
    "amara muzik",
    "madhura audio",
    "maajja",
    "azadi records",
    "gully gang records",
    "incink records",
    "ennui.bomb",
    "magnasound records",
    "earthsync",
    "infestdead records",
    "jackson records",
    "muzik 247",
    "muzik247 tulu",
    "puri sangeet",
    "satyam audios",
    "shivaranjani music",
    "spi music",
    "svf music",
    "tharangini records",
    "trend music",
    "u1 records",
    "underscore records",
    "veena music",
    "vyrl originals",
    "fire records",
    "the musik records",
    "ary musik",
    "crystal records",
    "thar production",
    "giraffe",
    "just music records",
    "roindpak records",
    "alprints",
    "collaborators",
    "ems enterprises",
  ].map(normalizeAndLower);

  let comparableInputArtist = artistInputLower
    .replace(
      /\b(official|topic|vevo|music|records|label|entertainment|productions|various artists|ost|season \d+|ep \d+)\b/gi,
      ""
    )
    .replace(/\(.*?\)|\[.*?\]|\{.*?\}/g, "")
    .replace(/\s*[-_/|—:,.]\s*/g, " ")
    .replace(/[^\p{L}\p{N}\s&']/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (comparableInputArtist.startsWith("coke studio"))
    comparableInputArtist = "coke studio";
  if (comparableInputArtist === "t-series") comparableInputArtist = "t series";

  const isInputArtistALabelOrProducer = knownLabelsOrProducers.includes(
    comparableInputArtist
  );

  let extractedArtistsFromTitle = [];
  if (isInputArtistALabelOrProducer || comparableInputArtist.length <= 2) {
    let artistsSegment = titleForParsing;
    knownLabelsOrProducers.forEach((label) => {
      artistsSegment = artistsSegment.replace(
        new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
        ""
      );
    });
    artistsSegment = artistsSegment.replace(
      /\b(season \d+|episode \d+)\b/gi,
      ""
    );
    artistsSegment = artistsSegment
      .replace(/[|–—:]/g, ",")
      .replace(/ x | & /gi, ",")
      .replace(/\b(ft|feat|featuring|with)\b/gi, ",");

    const potentialArtistSegments = artistsSegment
      .split(",")
      .map((s) => s.replace(/[^\p{L}\p{N}\s']/gu, "").trim())
      .filter(
        (s) =>
          s &&
          s.length > 2 &&
          s.split(" ").length <= 3 &&
          !knownLabelsOrProducers.includes(s)
      );

    if (potentialArtistSegments.length > 0)
      extractedArtistsFromTitle.push(...potentialArtistSegments);
  }

  if (extractedArtistsFromTitle.length > 0)
    artistsToQuery = extractedArtistsFromTitle;
  else if (comparableInputArtist.length > 1 && !isInputArtistALabelOrProducer)
    artistsToQuery.push(comparableInputArtist);
  else if (comparableInputArtist.length > 1 && isInputArtistALabelOrProducer)
    artistsToQuery.push(comparableInputArtist);

  if (artistsToQuery.length === 0) {
    let fallbackArtist = artistInputLower.split(" ")[0].trim();
    if (fallbackArtist && fallbackArtist.length > 1)
      artistsToQuery.push(fallbackArtist);
    else {
      return null;
    }
  }

  artistsToQuery = [
    ...new Set(
      artistsToQuery.map((a) => a.trim()).filter((a) => a && a.length > 1)
    ),
  ];
  if (artistsToQuery.length === 0) return null;

  let coreSongTitle = normalizeAndLower(trackName);
  knownLabelsOrProducers.forEach((label) => {
    coreSongTitle = coreSongTitle.replace(
      new RegExp(`\\b${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"),
      ""
    );
  });
  artistsToQuery.forEach((artist) => {
    coreSongTitle = coreSongTitle.replace(
      new RegExp(
        `\\b${artist.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "gi"
      ),
      ""
    );
  });
  coreSongTitle = coreSongTitle
    .replace(
      /\b(ft|feat|featuring|with|vs|versus|official|audio|video|lyrics|theme|soundtrack|music|full|song|hd|4k|visualizer|radio edit|live|remix|mix|extended|cover|parody|performance|version|unplugged|reupload|lyric video|music video|audio only|instrumental|explicit|clean|promo|original|album|single|season \d+|ep \d+|episode \d+)\b/gi,
      ""
    )
    .replace(/\(.*?\)|\[.*?\]|\{.*?\}/g, "")
    .replace(/\s*[-_/|—:,.]\s*/g, " ")
    .replace(/[^\p{L}\p{N}\s&']/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  coreSongTitle = coreSongTitle.split(/[,|–—:]/)[0].trim();
  if (!coreSongTitle)
    coreSongTitle = normalizeAndLower(trackName)
      .split(/[-|(/[:]/)[0]
      .trim()
      .replace(/[^\p{L}\p{N}\s&']/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  if (!coreSongTitle) return null;

  const trackNameWords = coreSongTitle.split(" ");
  const trackQueryVariations = [
    coreSongTitle,
    trackNameWords.slice(0, 3).join(" "),
    trackNameWords.slice(0, 2).join(" "),
    trackNameWords.slice(0, 1).join(" "),
  ].filter(
    (value, index, self) =>
      value &&
      value.length > 0 &&
      self.indexOf(value) === index &&
      !artistsToQuery.includes(value)
  );
  const originalTitleLower = normalizeAndLower(trackName);
  if (
    originalTitleLower.includes("jhol") &&
    !trackQueryVariations.includes("jhol")
  )
    trackQueryVariations.unshift("jhol");
  if (
    originalTitleLower.includes("maand") &&
    !trackQueryVariations.includes("maand")
  )
    trackQueryVariations.unshift("maand");
  if (
    originalTitleLower.includes("tum hi ho") &&
    !trackQueryVariations.includes("tum hi ho")
  )
    trackQueryVariations.unshift("tum hi ho");
  const finalTrackQueries = [
    ...new Set(trackQueryVariations.filter((q) => q && q.length > 0)),
  ];
  if (finalTrackQueries.length === 0) return null;

  const hasValidDuration =
    typeof trackDurationInSeconds === "number" &&
    !isNaN(trackDurationInSeconds) &&
    Number.isFinite(trackDurationInSeconds) &&
    trackDurationInSeconds > 0;
  for (const currentArtistQuery of artistsToQuery) {
    if (!currentArtistQuery || currentArtistQuery.length < 1) continue;
    for (const currentTrackQuery of finalTrackQueries) {
      if (!currentTrackQuery || currentTrackQuery.length < 1) continue;
      if (hasValidDuration) {
        const params = {
          track_name: currentTrackQuery,
          artist_name: currentArtistQuery,
          album_name: "",
          duration: trackDurationInSeconds,
        };
        try {
          const res = await axios.get(`https://lrclib.net/api/get`, {
            params,
            timeout: 7000,
          });
          if (res.data && (res.data.syncedLyrics || res.data.plainLyrics))
            return res.data.syncedLyrics || res.data.plainLyrics;
        } catch (error) {
          /* Continue */
        }
      }
      const paramsNoDuration = {
        track_name: currentTrackQuery,
        artist_name: currentArtistQuery,
        album_name: "",
      };
      try {
        const res = await axios.get(`https://lrclib.net/api/get`, {
          params: paramsNoDuration,
          timeout: 7000,
        });
        if (res.data && (res.data.syncedLyrics || res.data.plainLyrics))
          return res.data.syncedLyrics || res.data.plainLyrics;
      } catch (error) {
        /* Continue */
      }
    }
  }
  return null;
}

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
    const oldLyricsInfo = guildMessages.find(
      (msgInfo) => msgInfo.type === "lyrics"
    );
    if (oldLyricsInfo) {
      try {
        const oldChannel = await client.channels
          .fetch(oldLyricsInfo.channelId)
          .catch(() => null);
        if (oldChannel) {
          const oldMessage = await oldChannel.messages
            .fetch(oldLyricsInfo.messageId)
            .catch(() => null);
          if (oldMessage && !oldMessage.deleted) {
            await oldMessage.delete().catch((e) => {});
          }
        }
      } catch (e) {}
      guildMessages = guildMessages.filter(
        (msgInfo) => msgInfo.messageId !== oldLyricsInfo.messageId
      );
      client.guildTrackMessages.set(guildId, guildMessages);
    }
  }

  const track = player.queue.current;
  const trackDurationMs = track.length;
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
    channel.send({ embeds: [noLyricsEmbed] });
    return;
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

  let lyricsMessage; // THIS MUST BE `let` TO BE REASSIGNABLE
  try {
    lyricsMessage = await channel.send({
      embeds: [initialEmbed],
      components: [row],
    });
  } catch (sendError) {
    console.error(
      "[Lyrics Command] Failed to send initial lyrics message:",
      sendError.message
    ); // Log the error message
    // Optionally send a message to the channel if sending failed, if permissions allow
    // channel.send("Sorry, I couldn't display the lyrics right now.").catch(() => {});
    return; // Exit if message couldn't be sent
  }

  // CRITICAL CHECK: If lyricsMessage is still not defined (e.g. channel.send failed silently or permissions changed)
  if (!lyricsMessage) {
    console.error(
      "[Lyrics Command] lyricsMessage is null or undefined after attempting to send. Aborting lyrics session."
    );
    return;
  }

  if (client.guildTrackMessages) {
    let guildMessages = client.guildTrackMessages.get(guildId) || [];
    guildMessages.push({
      messageId: lyricsMessage.id,
      channelId: channel.id,
      type: "lyrics",
    });
    client.guildTrackMessages.set(guildId, guildMessages);
  }

  let lyricsInterval = null;
  const LYRIC_OFFSET_MS = -4500;

  const updateLyrics = async () => {
    if (
      !lyricsInterval ||
      !player ||
      !player.queue.current ||
      player.queue.current.identifier !== track.identifier ||
      !lyricsMessage ||
      lyricsMessage.deleted
    ) {
      if (lyricsInterval) clearInterval(lyricsInterval);
      lyricsInterval = null;
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
          if (lyricsInterval) clearInterval(lyricsInterval);
          lyricsInterval = null;
          if (client.guildTrackMessages && guildId && lyricsMessage) {
            let guildMessages = client.guildTrackMessages.get(guildId) || [];
            guildMessages = guildMessages.filter(
              (msgInfo) => msgInfo.messageId !== lyricsMessage.id
            );
            client.guildTrackMessages.set(guildId, guildMessages);
          }
          lyricsMessage = null;
        } else {
          console.error(
            "[UpdateLyrics] Unexpected error editing lyrics message:",
            editError.message,
            `Code: ${editError.code}`
          );
        }
      }
    } else if (lyricsInterval) {
      clearInterval(lyricsInterval);
      lyricsInterval = null;
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

  // THIS IS WHERE THE ERROR OCCURS if lyricsMessage is null
  const collector = lyricsMessage.createMessageComponentCollector({
    filter: lyricsButtonFilter,
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
      return;
    }

    if (i.customId === "lyrics_stop") {
      if (lyricsInterval) clearInterval(lyricsInterval);
      lyricsInterval = null;
      collector.stop("user_stopped_lyrics");
    } else if (i.customId === "lyrics_full") {
      if (lyricsInterval) clearInterval(lyricsInterval);
      lyricsInterval = null;
      let fullLyricsText = lines.join("\n");
      if (lyricsAreSyncedFormat) {
        fullLyricsText = lines
          .map((line) => {
            if (typeof line !== "string") return "";
            const match = line.match(/^\[(\d{2}):(\d{2})[.:](\d{2,3})\](.*)/);
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
      if (lyricsInterval) clearInterval(lyricsInterval);
      lyricsInterval = null;
      collector.stop("user_deleted_lyrics");
    }
  });

  collector.on("end", (collected, reason) => {
    if (lyricsInterval) clearInterval(lyricsInterval);
    lyricsInterval = null;

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
          // console.warn(`[Collector] Failed to delete lyrics message on end (unexpected error): ${delErr.message} (Code: ${delErr.code})`);
        }
      });
    }
    lyricsMessage = null;
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
  inVoiceChannel: true,
  sameVoiceChannel: false,
  execute: async (client, message, args, commandName, prefix, db, config) => {
    const player = client.manager.players.get(message.guild.id);
    if (!player || !player.queue.current) {
      return message.reply({
        embeds: [
          new client.embed()
            .setColor(config.embedColor || "#FF0000")
            .desc(
              "<a:cross:1303637975292313633> **No song is currently playing!**"
            ),
        ],
      });
    }

    // Simplified: Always proceed to showLiveLyrics.
    // showLiveLyrics itself will handle cleaning up any of its own previous messages.
    await showLiveLyrics(
      client,
      message.channel,
      player,
      client.config || config,
      message.author.id
    );
  },
};
