// functions/handleReadyEvent.js
const { ActivityType, EmbedBuilder } = require("discord.js"); // Import ActivityType AND EmbedBuilder for fallback

module.exports = async (client) => {
  const logSource = `ReadyEvent[${client.shard?.ids?.join(',') || 'S'}]`;
  client.log(`Handling ready event for ${client.user.tag}...`, "event", logSource);

  try {
    await client.user.setPresence({
      activities: [ {
          name: `AstroTune | ${client.prefix || client.config?.FUEGO?.PREFIX ||'.'}help`, 
          type: ActivityType.Listening, 
      } ],
      status: "idle", 
    });
  } catch (presenceError) {
    client.log(`Failed to set presence: ${presenceError.message}`, "warn", logSource);
  }

  let mcount = 0;
  let gcount = client.guilds.cache.size;
  client.guilds.cache.forEach((g) => { mcount += g.memberCount; });

  let eventsSize = { client: 0, node: 0, player: 0, custom: 0 };
  let commandsSize = { message: 0, slash: {} }; 
  try {
    const eventLoaders = [
        require("@loaders/clientEvents.js")(client), require("@loaders/nodeEvents")(client),
        require("@loaders/playerEvents")(client), require("@loaders/customEvents.js")(client),
        require("@loaders/commands.js")(client), // This is likely your message command loader
    ];
    const results = await Promise.allSettled(eventLoaders);
    
    eventsSize.client = results[0].status === 'fulfilled' ? results[0].value : 0;
    eventsSize.node = results[1].status === 'fulfilled' ? results[1].value : 0;
    eventsSize.player = results[2].status === 'fulfilled' ? results[2].value : 0;
    eventsSize.custom = results[3].status === 'fulfilled' ? results[3].value : 0;
    commandsSize.message = results[4].status === 'fulfilled' ? results[4].value : 0;

    results.forEach((r, i) => { 
        if (r.status === 'rejected') {
            client.log(`Error loading module/event loader at index ${i}: ${r.reason?.message || r.reason}`, "error", logSource);
        }
    });
  } catch (loadError) { client.log(`Error during bulk loading: ${loadError.message}`, "error", logSource); }
  
  client.invite = {
    required: `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=37080065&scope=bot%20applications.commands`,
    admin: `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`,
  };

  try {
    // client.embed is the CustomEmbed CLASS (or discord.js EmbedBuilder if not customized)
    const embedColor = client.color || client.config?.EMBED_COLOR || client.config?.FUEGO?.COLOR || "#3d16ca";
    
    if (typeof client.embed === 'function' && typeof client.embed.prototype?.setImage === 'function') { // Better check for class-like structure
        client.endEmbed = new client.embed(embedColor); // Pass color if constructor takes it
        
        // Use standard EmbedBuilder methods or your custom ones if they exist
        if (typeof client.endEmbed.desc === 'function') { // Your custom method
            client.endEmbed.desc(
                `<a:nr_arrow:1308552225450233946>**Enjoying Music with me ?**\n` +
                `If yes, Consider [voting me](https://discord.gg/gRSHCpqK7u)<:arrow_left:1308550693035966545>`
            );
        } else { // Fallback to standard setDescription
            client.endEmbed.setDescription(
                `<a:nr_arrow:1308552225450233946>**Enjoying Music with me ?**\n` +
                `If yes, Consider [voting me](https://discord.gg/gRSHCpqK7u)<:arrow_left:1308550693035966545>`
            );
        }
        client.endEmbed.setThumbnail(client.user.displayAvatarURL()); 
        client.endEmbed.setAuthor({ iconURL: client.user.displayAvatarURL(), name: client.user.username });
        client.endEmbed.setFooter({ text: "Powered by Nexus" });

    } else {
        client.log("client.embed is not a constructor or valid Embed class in handleReadyEvent. Using fallback EmbedBuilder.", "error", logSource);
        client.endEmbed = new EmbedBuilder().setColor(embedColor).setDescription("Default end embed (error with custom embed).");
    }
  } catch (embedError) {
      client.log(`Error creating client.endEmbed: ${embedError.message}`, "error", logSource);
       client.endEmbed = new EmbedBuilder().setColor(client.color || "#FF0000").setDescription("Error creating end embed.");
  }

  client.log(`Loaded ClientEvents: ${eventsSize.client}, NodeEvents: ${eventsSize.node}, PlayerEvents: ${eventsSize.player}, CustomEvents: ${eventsSize.custom}`, "event", `Loader-${logSource}`);
  client.log(`Loaded MessageCommands: ${commandsSize.message}`, "cmd", `Loader-${logSource}`);
  client.log(`Ready for ${gcount} Servers | ${mcount} Users`, "ready", logSource);
};