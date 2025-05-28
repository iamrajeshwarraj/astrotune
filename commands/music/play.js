// commands/music/play.js
/** @format */

const yt =
  /^(?:(?:(?:https?:)?\/\/)?(?:www\.)?)?(?:youtube\.com\/(?:[^\/\s]+\/\S+\/|(?:c|channel|user)\/\S+|embed\/\S+|watch\?(?=.*v=\S+)(?:\S+&)*v=\S+)|(?:youtu\.be\/\S+)|yt:\S+)$/i;
const sp =
  /^(?:https?:)?\/\/(?:open|play)\.spotify\.com\/(?:user\/\S+\/playlist\/\S+|playlist\/\S+|track\/\S+|album\/\S+|artist\/\S+)/i;

module.exports = {
  name: "play",
  aliases: ["p"],
  cooldown: 3,
  category: "music",
  usage: "<Spotify/YouTube URL or Song Name / file>",
  description:
    "Plays a song or playlist. Lavasrc may handle lyrics for supported tracks.",
  args: false,
  player: false,
  queue: false,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (client, message, args, emoji) => {
    const { channel } = message.member.voice;
    const file = message.attachments.first();
    let query = file ? file.url : args.join(" ").trim();

    const defaultColor =
      client.color ||
      client.config?.FUEGO?.COLOR ||
      client.config?.EMBED_COLOR ||
      "#3d16ca";
    const errorColor = client.config?.ERROR_COLOR || "#FF0000";
    const successColor =
      client.config?.SUCCESS_COLOR || client.config.EMBED_COLOR || "#00FF00";

    if (!query && !file) {
      const noQueryEmbed = new client.embed(defaultColor);
      noQueryEmbed.desc(
        `${emoji.bell} **No query provided! Try \`${client.prefix}radio\`**`
      );
      return message.reply({ embeds: [noQueryEmbed] }).catch(() => {});
    }

    let replyMessage = null;
    try {
      const searchingEmbed = new client.embed(defaultColor);
      searchingEmbed.desc(`${emoji.search} **Searching, please wait...**`);
      replyMessage = await message.reply({ embeds: [searchingEmbed] });
    } catch (e) {
      client.log(
        `PlayCmd: Failed to send initial reply: ${e.message}`,
        "warn",
        "PlayCmd-Execute"
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
          `Player created for guild ${message.guild.id}`,
          "player",
          "PlayCmd-Execute"
        );
      } catch (playerError) {
        client.log(
          `Error creating player: ${playerError.message}`,
          "error",
          "PlayCmd-Execute"
        );
        const errEmbedInstance = new client.embed(errorColor);
        errEmbedInstance.error(
          `Could not create music player: ${playerError.message}`
        );
        if (replyMessage)
          return replyMessage
            .edit({ embeds: [errEmbedInstance] })
            .catch(() => {});
        return message.channel
          .send({ embeds: [errEmbedInstance] })
          .catch(() => {});
      }
    }

    let searchResult;
    const searchOptions = { requester: message.author };
    let queryForLavalink = query;
    let isSpotifyLinkInput = sp.test(query);
    let isYouTubeLinkInput = yt.test(query);
    let defaultSearchEngine =
      client.config.FUEGO?.DEFAULT_SEARCH_ENGINE || "ytmsearch";
    let finalEngineForLavalink = null;

    if (isSpotifyLinkInput) {
      // Lavasrc should handle Spotify links directly
      finalEngineForLavalink = null; // Let Kazagumo/Lavalink decide based on URL
      if (replyMessage)
        await replyMessage
          .edit({
            embeds: [
              new client.embed(defaultColor).desc(
                `${emoji.search} Processing Spotify link...`
              ),
            ],
          })
          .catch(() => {});
    } else if (isYouTubeLinkInput || file) {
      finalEngineForLavalink = null; // Let Kazagumo/Lavalink decide based on URL/file
      if (replyMessage)
        await replyMessage
          .edit({
            embeds: [
              new client.embed(defaultColor).desc(
                `${emoji.search} Processing link/file...`
              ),
            ],
          })
          .catch(() => {});
    } else {
      // Text query
      queryForLavalink = query;
      finalEngineForLavalink = defaultSearchEngine;
      const searchPlatformDisplay = finalEngineForLavalink.startsWith("ytm")
        ? "YouTube Music"
        : finalEngineForLavalink.startsWith("yt")
          ? "YouTube"
          : finalEngineForLavalink;
      if (replyMessage)
        await replyMessage
          .edit({
            embeds: [
              new client.embed(defaultColor).desc(
                `${emoji.search} Searching ${searchPlatformDisplay} for: **"${query}"**`
              ),
            ],
          })
          .catch(() => {});
    }

    if (finalEngineForLavalink) {
      searchOptions.engine = finalEngineForLavalink;
    }

    try {
      client.log(
        `Final search for Lavalink: Query="${queryForLavalink}", Engine="${searchOptions.engine || (isSpotifyLinkInput ? "spotify_url_handler" : isYouTubeLinkInput || file ? "youtube_url_handler/file" : "kazagumo_default")}"`,
        "debug",
        "PlayCmd-Execute"
      );
      searchResult = await player.search(queryForLavalink, searchOptions);
      client.log(
        `Result from player.search: Type=${searchResult?.type}, Tracks=${searchResult?.tracks?.length}, PlaylistName=${searchResult?.playlistName}`,
        "debug",
        "PlayCmd-Execute"
      );
    } catch (e) {
      client.log(
        `Lavalink search failed for "${queryForLavalink}": ${e.message}`,
        "error",
        "PlayCmd-Execute"
      );
      const errEmbedInstance = new client.embed(errorColor);
      errEmbedInstance.error(`Failed to find or play track: ${e.message}`);
      if (replyMessage)
        return replyMessage
          .edit({ embeds: [errEmbedInstance] })
          .catch(() => {});
      return message.channel
        .send({ embeds: [errEmbedInstance] })
        .catch(() => {});
    }

    if (
      isSpotifyLinkInput &&
      searchResult &&
      searchResult.type === "PLAYLIST"
    ) {
      client.log(
        `Spotify Playlist Link Resolved. Result Type: ${searchResult.type}, Playlist Name: ${searchResult.playlistName}, Tracks Resolved: ${searchResult.tracks.length}`,
        "debug",
        "PlayCmd-SpotifyDebug"
      );
    }

    const noResEmbedInstance = new client.embed(defaultColor);
    noResEmbedInstance.desc(`${emoji.no} **No results found for your query.**`);
    if (!searchResult || searchResult.tracks.length === 0) {
      if (replyMessage)
        return replyMessage
          .edit({ embeds: [noResEmbedInstance] })
          .catch(() => {});
      return message.channel
        .send({ embeds: [noResEmbedInstance] })
        .catch(() => {});
    }

    const tracks = searchResult.tracks;
    let actuallyAddedCount = 0;
    let firstTrackTitleForMessage = null;
    let firstTrackUriForMessage = "#";

    if (searchResult.type === "PLAYLIST") {
      client.log(
        `Adding playlist: "${searchResult.playlistName}", tracks provided: ${tracks.length}.`,
        "info",
        "PlayCmd-Execute"
      );
      for (const track of tracks) {
        client.log(
          `Processing playlist track: ${track.title} (URI: ${track.uri}, Length: ${track.length})`,
          "debug",
          "PlayCmd-Execute"
        );
        if (track.length < 10000 && !track.isStream) {
          client.log(
            `Skipping short track: ${track.title}`,
            "debug",
            "PlayCmd-Execute"
          );
          continue;
        }
        // track.requester should be set by Kazagumo via searchOptions
        player.queue.add(track);
        if (actuallyAddedCount === 0) {
          firstTrackTitleForMessage = track.title;
          firstTrackUriForMessage = track.uri;
        }
        actuallyAddedCount++;
      }
      if (actuallyAddedCount === 0 && tracks.length > 0) {
        const shortPlaylistEmbedInstance = new client.embed(defaultColor);
        shortPlaylistEmbedInstance.desc(
          `${emoji.no} All tracks in the playlist were too short to be added.`
        );
        if (replyMessage)
          return replyMessage
            .edit({ embeds: [shortPlaylistEmbedInstance] })
            .catch(() => {});
        return message.channel
          .send({ embeds: [shortPlaylistEmbedInstance] })
          .catch(() => {});
      }
    } else if (
      ["TRACK", "SEARCH", "ARTIST", "ALBUM"].includes(searchResult.type)
    ) {
      const trackToAdd = tracks[0];
      if (trackToAdd.length < 10000 && !trackToAdd.isStream) {
        const shortTrackEmbedInstance = new client.embed(defaultColor);
        shortTrackEmbedInstance.desc(
          `${emoji.no} Song is too short (less than 10s).`
        );
        if (replyMessage)
          return replyMessage
            .edit({ embeds: [shortTrackEmbedInstance] })
            .catch(() => {});
        return message.channel
          .send({ embeds: [shortTrackEmbedInstance] })
          .catch(() => {});
      }
      // trackToAdd.requester should be set by Kazagumo via searchOptions
      player.queue.add(trackToAdd);
      firstTrackTitleForMessage = trackToAdd.title;
      firstTrackUriForMessage = trackToAdd.uri;
      actuallyAddedCount++;
      client.log(
        `Added single track: "${firstTrackTitleForMessage}" (Lavalink URI: ${trackToAdd.uri})`,
        "info",
        "PlayCmd-Execute"
      );
    } else {
      if (replyMessage)
        return replyMessage
          .edit({ embeds: [noResEmbedInstance] })
          .catch(() => {});
      return message.channel
        .send({ embeds: [noResEmbedInstance] })
        .catch(() => {});
    }

    if (actuallyAddedCount === 0) {
      if (replyMessage)
        return replyMessage
          .edit({ embeds: [noResEmbedInstance] })
          .catch(() => {});
      return message.channel
        .send({ embeds: [noResEmbedInstance] })
        .catch(() => {});
    }

    if (!player.playing && !player.paused) {
      if (player.queue.current || player.queue.size > 0) {
        client.log(
          `[PlayCmd] Player not playing/paused. Calling play().`,
          "debug",
          "PlayCmd-Execute"
        );
        player.play();
      }
    }

    let addedMessageText;
    if (searchResult.type === "PLAYLIST") {
      addedMessageText = `${emoji.yes} **Added ${actuallyAddedCount} tracks from playlist "${searchResult.playlistName || "Fetched Playlist"}" to the queue.**`;
      if (
        actuallyAddedCount === 1 &&
        firstTrackTitleForMessage &&
        player.queue.size === 1
      ) {
        addedMessageText += `\nNow playing: [${(firstTrackTitleForMessage || "Track").replace(/[[\]()]/g, "")}](${firstTrackUriForMessage || "#"})`;
      }
    } else if (firstTrackTitleForMessage) {
      addedMessageText = `${emoji.yes} **Added to queue: [${(firstTrackTitleForMessage || "Track").replace(/[[\]()]/g, "")}](${firstTrackUriForMessage || "#"})**`;
    } else {
      addedMessageText = `${emoji.yes} **Track(s) added to queue.**`;
    }
    const addedEmbedInstance = new client.embed(successColor);
    addedEmbedInstance.desc(addedMessageText);
    if (replyMessage)
      return replyMessage
        .edit({ embeds: [addedEmbedInstance] })
        .catch(() => {});
    return message.channel
      .send({ embeds: [addedEmbedInstance] })
      .catch(() => {});
  },
};
