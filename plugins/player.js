// plugins/player.js
const { Connectors } = require("shoukaku");
const { Kazagumo, Plugins } = require("kazagumo");

module.exports = (client) => {
  const logSource = `PlayerInit[${client.shard?.ids?.join(",") || "S"}]`;
  const logIt = (message, type = "info") => {
    // Use client.log if it's defined by your func.js or ExtendedClient
    if (client.log && typeof client.log === 'function') {
        client.log(message, type, logSource);
    } else if (client.LoggerClass && typeof client.LoggerClass.log === 'function') { // Fallback to LoggerClass directly
        client.LoggerClass.log(message, type, logSource);
    } else {
        console.log(`[${type.toUpperCase()}] ${logSource}: ${message}`);
    }
  };

  logIt("Initializing Kazagumo PlayerManager...");

  let spotifyClientId = null;
  let spotifyClientSecret = null;
  let lavalinkNodes = [ // Default fallback node
    {
        name: 'AstroTune-Default', 
        url: 'localhost:2444', // Ensure this is your primary, working node
        auth: 'astrotune',
        secure: false,
      },
  ];

  if (client && client.config) {
    if (client.config.spotify) {
      spotifyClientId = client.config.spotify.id;
      spotifyClientSecret = client.config.spotify.secret;
      logIt(`Spotify Client ID: ${spotifyClientId ? "Loaded" : "NOT FOUND"}`, "debug");
      logIt(
        `Spotify Client Secret: ${spotifyClientSecret ? "Loaded" : "NOT FOUND"}`,
        "debug"
      );
      if (!spotifyClientId || !spotifyClientSecret) {
        logIt(
          "CRITICAL: Spotify ID or Secret is MISSING/undefined in client.config.spotify! Spotify features will fail.",
          "error"
        );
      }
    } else {
      logIt(
        "WARN: client.config.spotify section is NOT DEFINED! Spotify features will fail.",
        "warn"
      );
    }

    if (
      client.config.NODES &&
      Array.isArray(client.config.NODES) &&
      client.config.NODES.length > 0
    ) {
      lavalinkNodes = client.config.NODES;
      logIt(
        `Using Lavalink nodes from config: ${lavalinkNodes.map((n) => n.name).join(", ")}`,
        "info"
      );
    } else {
      logIt(
        "Lavalink NODES not found in config or empty. Using default fallback node.",
        "warn"
      );
    }
  } else {
    logIt(
      "CRITICAL: client.config is not defined! Player cannot get node/spotify settings. Using hardcoded defaults.",
      "error"
    );
  }

  try {
    client.manager = new Kazagumo(
      { // KazagumoOptions
        plugins: [
          new (require("kazagumo-apple"))({
            countryCode: client.config?.APPLE_COUNTRY_CODE || "us",
          }),
          new (require("kazagumo-filter"))(),
          new (require("kazagumo-deezer"))({
            playlistLimit: client.config?.DEEZER_PLAYLIST_LIMIT || 20,
          }),
          new (require("kazagumo-spotify"))({
            searchLimit: 10, // For text searches using spotify engine
            albumPageLimit: 3, // How many pages of tracks to fetch for an album link (e.g., 3 * 50 = 150 tracks)
            searchMarket: client.config?.spotify?.searchMarket || "US",
            playlistPageLimit: 5,  // INCREASED: How many pages of tracks to fetch for a playlist link (e.g., 5 * 50 = 250 tracks)
            clientId: spotifyClientId,
            clientSecret: spotifyClientSecret,
          }),
          new Plugins.PlayerMoved(client), // Handles player moving between VCs
        ],
        send: (guildId, payload) => { // Required: send function for Kazagumo
          const guild = client.guilds.cache.get(guildId);
          if (guild) guild.shard.send(payload);
        },
        defaultSearchEngine: // Default engine for text queries if not Spotify
          client.config?.FUEGO?.DEFAULT_SEARCH_ENGINE ||
          client.config?.DEFAULT_SEARCH_ENGINE ||
          "ytmsearch", // YouTube Music search is generally good
      },
      new Connectors.DiscordJS(client), // Connector
      lavalinkNodes, // Nodes array
      { // ShoukakuOptions
        updatePlayerInterval: 1000, // Poll player state every 1 second for smoother position updates
        // resumable: true, // Optional: enable session resuming
        // resumableTimeout: 60, // Optional: timeout for resuming in seconds
        // moveOnDisconnect: false, // Optional: whether to move players to other nodes on Shoukaku disconnect
      }
    );
    logIt("Kazagumo PlayerManager instance created successfully.", "ready");
  } catch (kazagumoError) {
    logIt(`CRITICAL: Failed to initialize Kazagumo: ${kazagumoError.message}`, "error");
    console.error("[Player.js] CRITICAL: Failed to initialize Kazagumo:", kazagumoError);
  }
};