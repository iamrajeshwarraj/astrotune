// clients/manager/func.js (or a shared utils/clientExtensions.js)
/** @format ... */

module.exports = (client) => {
  client.log = (message, type = "log", clientNameParam) => {
    const logSource = clientNameParam || client.user?.username || client.config?.FUEGO?.CLIENT_NAME || "Process";
    if (client.LoggerClass && typeof client.LoggerClass.log === 'function') {
        return client.LoggerClass.log(message, type, logSource);
    } else {
        console.log(`[NoLogger] [${type.toUpperCase()}] (${logSource}) ${message}`);
    }
  };

  client.sleep = (t) => new Promise((r) => setTimeout(r, t));

  client.send = async (user, desc) => {
    try {
      // Assuming client.embed is the Class constructor for your EmbedBuilder
      if (typeof client.embed !== 'function' || !client.embed.prototype?.toJSON) { // Check if it's a class
          client.log("client.embed is not a constructor or valid Embed class!", "error", "DMHandler");
          return; 
      }
      const embedColor = client.config?.FUEGO?.COLOR || client.config?.EMBED_COLOR || "#3d16ca";
      // If your embed class takes color in constructor: new client.embed(embedColor).setDescription(desc)
      // If it's discord.js EmbedBuilder assigned to client.embed: new client.embed().setColor(embedColor).setDescription(desc)
      // Let's assume your @plugins/embed exports a class that extends EmbedBuilder and handles color in constructor or via a method
      const embedInstance = new client.embed(); // Create instance
      if (typeof embedInstance.setColor === 'function') embedInstance.setColor(embedColor);
      if (typeof embedInstance.desc === 'function') embedInstance.desc(desc); // If your class has .desc()
      else if (typeof embedInstance.setDescription === 'function') embedInstance.setDescription(desc); // Standard EmbedBuilder

      await user.send({ embeds: [embedInstance] });
    } catch (error) {
      const logSource = client.config?.FUEGO?.CLIENT_NAME || "DMHandler";
      client.log(`Failed to send DM to ${user.tag || user.id}: ${error.message}`, "warn", logSource);
    }
  };
};