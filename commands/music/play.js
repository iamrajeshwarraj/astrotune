// commands/music/play.js
/** @format */

const yt =  /^(?:(?:(?:https?:)?\/\/)?(?:www\.)?)?(?:youtube\.com\/(?:[^\/\s]+\/\S+\/|(?:c|channel|user)\/\S+|embed\/\S+|watch\?(?=.*v=\S+)(?:\S+&)*v=\S+)|(?:youtu\.be\/\S+)|yt:\S+)$/i;
const sp = /^(?:https?:)?\/\/(?:open|play)\.spotify\.com\/(?:user\/\S+\/playlist\/\S+|playlist\/\S+|track\/\S+|album\/\S+|artist\/\S+)/i; 

module.exports = {
  name: "play",
  aliases: ["p"],
  cooldown: 3, 
  category: "music",
  usage: "<Spotify/YouTube URL or Song Name / file>",
  description: "Plays a song or playlist. Searches YouTube/YTM first, then tries to get Spotify metadata.",
  args: false, 
  player: false, 
  queue: false,  
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (client, message, args, emoji) => {
    const { channel } = message.member.voice; 
    const file = message.attachments.first(); 
    let query = file ? file.url : args.join(" ").trim(); 

    const defaultColor = client.color || client.config?.FUEGO?.COLOR || client.config?.EMBED_COLOR || "#3d16ca";
    const errorColor = client.config?.ERROR_COLOR || "#FF0000"; 
    const successColor = client.config?.SUCCESS_COLOR || client.config.EMBED_COLOR || "#00FF00";

    if (!query && !file) { 
      const noQueryEmbed = new client.embed(defaultColor);
      noQueryEmbed.desc(`${emoji.bell} **No query provided! Try \`${client.prefix}radio\`**`);
      return message.reply({ embeds: [noQueryEmbed] }).catch(() => {});
    }

    let replyMessage = null; 
    try {
      const searchingEmbed = new client.embed(defaultColor);
      searchingEmbed.desc(`${emoji.search} **Searching, please wait...**`);
      replyMessage = await message.reply({ embeds: [searchingEmbed] });
    } catch (e) { 
      client.log(`PlayCmd: Failed to send initial reply: ${e.message}`, "warn", "PlayCmd-Execute");
    }

    let player = client.manager.players.get(message.guild.id);
    if (!player) {
        try {
            player = await client.manager.createPlayer({
                voiceId: channel.id, textId: message.channel.id, guildId: message.guild.id,
                shardId: message.guild.shardId, loadBalancer: true, deaf: true,
            });
            client.log(`Player created for guild ${message.guild.id}`, "player", "PlayCmd-Execute");
        } catch (playerError) {
            client.log(`Error creating player: ${playerError.message}`, "error", "PlayCmd-Execute");
            const errEmbedInstance = new client.embed(errorColor); 
            errEmbedInstance.error(`Could not create music player: ${playerError.message}`);
            if (replyMessage) return replyMessage.edit({ embeds: [errEmbedInstance] }).catch(() => {});
            return message.channel.send({ embeds: [errEmbedInstance] }).catch(() => {});
        }
    }
    
    let searchResult;
    const searchOptions = { requester: message.author }; 
    let queryForLavalink = query; 
    let isSpotifyLinkInput = sp.test(query);
    let isYouTubeLinkInput = yt.test(query);
    let defaultSearchEngine = client.config.FUEGO?.DEFAULT_SEARCH_ENGINE || "ytmsearch";
    let spotifyMetadataToApply = null; // To store metadata if found from Spotify later

    if (isSpotifyLinkInput || isYouTubeLinkInput || file) { 
        // For direct URLs or files, Kazagumo handles them directly
        if (replyMessage) {
            const processingEmbed = new client.embed(defaultColor);
            processingEmbed.desc(`${emoji.search} Processing ${isSpotifyLinkInput ? "Spotify" : (isYouTubeLinkInput ? "YouTube" : "file")} link...`);
            await replyMessage.edit({ embeds: [processingEmbed] }).catch(()=>{});
        }
        // No engine needs to be set in searchOptions for URLs/files; Kazagumo auto-detects.
    } else { // It's a text query
        if (replyMessage) await replyMessage.edit({ embeds: [new client.embed(defaultColor).desc(`${emoji.search} Searching ${defaultSearchEngine} for: **"${query}"**`)]}).catch(()=>{});
        searchOptions.engine = defaultSearchEngine; // Search default engine first
        // queryForLavalink is already the original query
    }

    try {
        client.log(`Initial search for Lavalink: Query="${queryForLavalink}", Engine="${searchOptions.engine || 'Kazagumo Auto-Detect (URL/File)'}"`, "debug", "PlayCmd-Execute");
        searchResult = await player.search(queryForLavalink, searchOptions); 
        client.log(`Result from initial player.search: Type=${searchResult?.type}, Tracks=${searchResult?.tracks?.length}, PlaylistName=${searchResult?.playlistName}`, "debug", "PlayCmd-Execute");

        // If it was a text query and we found something on YTM/YT, now try to get Spotify metadata for the first result
        if (!isSpotifyLinkInput && !isYouTubeLinkInput && !file && searchResult && searchResult.tracks.length > 0) {
            const firstPlayableTrack = searchResult.tracks[0];
            const queryForSpotifyMeta = `${firstPlayableTrack.author} - ${firstPlayableTrack.title}`;
            if (replyMessage) await replyMessage.edit({ embeds: [new client.embed(defaultColor).desc(`${emoji.search} Found: "${firstPlayableTrack.title.substring(0,30)}...". Checking Spotify for enhanced metadata...`)]}).catch(()=>{});
            
            try {
                const spotifyMetaResults = await player.search(queryForSpotifyMeta, { requester: message.author, engine: "spotify" });
                if (spotifyMetaResults && spotifyMetaResults.tracks.length > 0) {
                    const spotifyTrack = spotifyMetaResults.tracks[0];
                    // Compare durations roughly (e.g., within 10 seconds) to ensure it's likely the same song
                    const durationDifference = Math.abs((firstPlayableTrack.length || 0) - (spotifyTrack.length || 0));
                    if (durationDifference < 10000) { // Less than 10 seconds difference
                        spotifyMetadataToApply = {
                            title: spotifyTrack.title,
                            author: spotifyTrack.author,
                            duration: spotifyTrack.length,
                            thumbnail: spotifyTrack.thumbnail 
                        };
                        client.log(`Found matching Spotify metadata for "${firstPlayableTrack.title}": "${spotifyTrack.title}"`, "info", "PlayCmd-Execute");
                    } else {
                        client.log(`Spotify result for "${queryForSpotifyMeta}" has significantly different duration. Original: ${firstPlayableTrack.length}, Spotify: ${spotifyTrack.length}. Not applying meta.`, "debug", "PlayCmd-Execute");
                    }
                } else {
                    client.log(`No direct Spotify metadata match found for "${queryForSpotifyMeta}"`, "debug", "PlayCmd-Execute");
                }
            } catch (e) {
                client.log(`Error searching Spotify for metadata for "${queryForSpotifyMeta}": ${e.message}`, "warn", "PlayCmd-Execute");
            }
        }
    } catch (e) {
        client.log(`Lavalink search failed for "${queryForLavalink}": ${e.message}`, "error", "PlayCmd-Execute");
        const errEmbedInstance = new client.embed(errorColor);
        errEmbedInstance.error(`Failed to find or play track: ${e.message}`);
        if (replyMessage) return replyMessage.edit({ embeds: [errEmbedInstance] }).catch(() => {});
        return message.channel.send({ embeds: [errEmbedInstance] }).catch(() => {});
    }
    
    const noResEmbedInstance = new client.embed(defaultColor);
    noResEmbedInstance.desc(`${emoji.no} **No results found for your query.**`);
    if (!searchResult || searchResult.tracks.length === 0) {
        if (replyMessage) return replyMessage.edit({ embeds: [noResEmbedInstance] }).catch(() => {});
        return message.channel.send({ embeds: [noResEmbedInstance] }).catch(() => {});
    }

    const tracks = searchResult.tracks;
    let actuallyAddedCount = 0;
    let firstTrackTitleForMessage = null; 
    let firstTrackUriForMessage = "#";

    const addTrackWithEnhancedMeta = (track, predefinedSpotifyMeta = null) => {
        track.requester = message.author; // Always set requester
        track.userData = { 
            ...track.userData, 
            requesterId: message.author.id,
            requesterTag: message.author.tag
        };
        if (predefinedSpotifyMeta) { // This comes from our text search flow
            track.userData.spotifyTitle = predefinedSpotifyMeta.title;
            track.userData.spotifyAuthor = predefinedSpotifyMeta.author;
            track.userData.spotifyDuration = predefinedSpotifyMeta.duration;
            if (predefinedSpotifyMeta.thumbnail && !track.thumbnail) track.thumbnail = predefinedSpotifyMeta.thumbnail;
        } else if (isSpotifyLinkInput) { // If original query was a Spotify link, Kazagumo might have put meta on track directly
             track.userData.spotifyTitle = track.title;
             track.userData.spotifyAuthor = track.author;
             track.userData.spotifyDuration = track.length;
        }
        // For display, prioritize Spotify title if available
        const displayTitle = track.userData?.spotifyTitle || track.title;
        player.queue.add(track);
        return displayTitle;
    };

    if (searchResult.type === "PLAYLIST") {
        client.log(`Adding playlist: "${searchResult.playlistName}", tracks provided: ${tracks.length}. Original query: "${query}" (Spotify URL: ${isSpotifyLinkInput})`, "info", "PlayCmd-Execute");
        for (const track of tracks) { 
            if (track.length < 10000 && !track.isStream) { continue; }
            const addedTitle = addTrackWithEnhancedMeta(track, isSpotifyLinkInput, null); // For playlists from Spotify URL, meta should be on track
            if (actuallyAddedCount === 0) { 
                firstTrackTitleForMessage = addedTitle;
                firstTrackUriForMessage = track.uri; 
            }
            actuallyAddedCount++;
        }
        if (actuallyAddedCount === 0 && tracks.length > 0) {
             const shortPlaylistEmbedInstance = new client.embed(defaultColor);
             shortPlaylistEmbedInstance.desc(`${emoji.no} All tracks in the playlist were too short to be added.`);
             if (replyMessage) return replyMessage.edit({ embeds: [shortPlaylistEmbedInstance] }).catch(() => {});
             return message.channel.send({ embeds: [shortPlaylistEmbedInstance] }).catch(() => {});
        }
    } else if (["TRACK", "SEARCH", "ARTIST", "ALBUM"].includes(searchResult.type)) {
        const trackToAdd = tracks[0];
        if (trackToAdd.length < 10000 && !trackToAdd.isStream) { 
            const shortTrackEmbedInstance = new client.embed(defaultColor);
            shortTrackEmbedInstance.desc(`${emoji.no} Song is too short (less than 10s).`);
            if (replyMessage) return replyMessage.edit({ embeds: [shortTrackEmbedInstance] }).catch(() => {});
            return message.channel.send({ embeds: [shortTrackEmbedInstance] }).catch(() => {});
        }
        firstTrackTitleForMessage = addTrackWithEnhancedMeta(trackToAdd, isSpotifyLinkInput, spotifyMetadataToApply); 
        firstTrackUriForMessage = trackToAdd.uri;
        actuallyAddedCount++;
        client.log(`Added single track: "${firstTrackTitleForMessage}" (Lavalink URI: ${trackToAdd.uri})`, "info", "PlayCmd-Execute");
    } else { 
        if (replyMessage) return replyMessage.edit({ embeds: [noResEmbedInstance] }).catch(() => {});
        return message.channel.send({ embeds: [noResEmbedInstance] }).catch(() => {});
    }

    if (actuallyAddedCount === 0) { 
        if (replyMessage) return replyMessage.edit({ embeds: [noResEmbedInstance] }).catch(() => {});
        return message.channel.send({ embeds: [noResEmbedInstance] }).catch(() => {});
    }
    
    if (!player.playing && !player.paused) { 
        if (player.queue.current || player.queue.size > 0) { 
            client.log(`[PlayCmd] Player not playing/paused. Calling play().`, "debug", "PlayCmd-Execute");
            player.play();
        }
    }
    
    let addedMessageText;
    if (searchResult.type === "PLAYLIST") {
        addedMessageText = `${emoji.yes} **Added ${actuallyAddedCount} tracks from playlist "${searchResult.playlistName || 'Fetched Playlist'}" to the queue.**`;
        if (actuallyAddedCount === 1 && firstTrackTitleForMessage && player.queue.size === 1) { 
             addedMessageText += `\nNow playing: [${firstTrackTitleForMessage.replace(/[[\]()]/g, '')}](${firstTrackUriForMessage || '#'})`;
        }
    } else if (firstTrackTitleForMessage) { 
        addedMessageText = `${emoji.yes} **Added to queue: [${firstTrackTitleForMessage.replace(/[[\]()]/g, '')}](${firstTrackUriForMessage || '#'})**`;
    } else { 
        addedMessageText = `${emoji.yes} **Track(s) added to queue.**`;
    }
    const addedEmbedInstance = new client.embed(successColor);
    addedEmbedInstance.desc(addedMessageText); 
    if (replyMessage) return replyMessage.edit({ embeds: [addedEmbedInstance] }).catch(() => {});
    return message.channel.send({ embeds: [addedEmbedInstance] }).catch(() => {});
  },
};