module.exports = {
  name: "disconnect",
  run: async (client, name, players, moved) => {
    client.log(`Lavalink ${name}: Disconnected`, "warn");
  },
};
