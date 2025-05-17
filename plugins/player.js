/** @format
 *
 * Fuego By Painfuego
 * Version: 6.0.0-beta
 * © 2024 Aero-Services
 */

const { Connectors } = require("shoukaku");
const { Kazagumo, Plugins } = require("kazagumo");

module.exports = player = (client) => {
  client.manager = new Kazagumo(
    { // KazagumoOptions (1st arg)
      plugins: [
        new (require("kazagumo-apple"))({
          countryCode: "us",
          imageWidth: 600,
          imageHeight: 900,
        }),
        new (require("kazagumo-filter"))(),
        new (require("kazagumo-deezer"))({
          playlistLimit: 20,
        }),
        new (require("kazagumo-spotify"))({
          searchLimit: 10,
          albumPageLimit: 1,
          searchMarket: "IN",
          playlistPageLimit: 1,
          clientId: client.config.spotify.id,
          clientSecret: client.config.spotify.secret,
        }),
        new Plugins.PlayerMoved(client),
      ],
      send: (guildId, payload, important) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
      },
      defaultSearchEngine: "youtube",
    },
    new Connectors.DiscordJS(client), // Connector (2nd arg)
    [ // NodeOption[] (3rd arg)
      {
        name: 'AstroTune', // Your Lavalink Node
        url: 'lavahatry4.techbyte.host:3000',
        auth: 'NAIGLAVA-dash.techbyte.host',
        secure: false,
      },
      // You can add other nodes here if you have them
    ],
    // ShoukakuOptions (4th arg)
    {
      // Attempt to set Shoukaku's updatePlayerInterval
      // This will make Shoukaku actively poll the Lavalink server for player state
      // if it doesn't receive updates frequently enough.
      // Value is in milliseconds. 1000ms = 1 second.
      // Start with 1000ms. If your server is very stable, you might not need this,
      // but it can help ensure more frequent position updates if server-sent events are sparse.
      // If you set this, the client will poll. If 0, it relies on server sending updates.
      updatePlayerInterval: 1000, // Poll player state every 1 second

      // Other Shoukaku options you might consider if needed later:
      // resumable: true, // Enable session resuming
      // resumableTimeout: 30, // Timeout for resuming in seconds
      // recheckResumePlayerInterval: 5000, // Interval to recheck if resumePlayer call is needed
      // moveOnDisconnect: false, // Whether to move players to other nodes on disconnect
      // group: 'default',
    }
  );
};