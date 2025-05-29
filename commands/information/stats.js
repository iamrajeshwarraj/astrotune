const genGraph = require("@gen/pingGraph.js");
const { ActionRowBuilder } = require("discord.js"); // StringSelectMenuBuilder not used here

module.exports = {
  name: "stats",
  aliases: ["shard", "status", "stat"],
  cooldown: "", // Consider adding a cooldown (e.g., 5 seconds)
  category: "information",
  usage: "",
  description: "Shows bot's shard stats",
  args: false,
  vote: false,
  new: false,
  admin: false,
  owner: false,
  botPerms: [],
  userPerms: [],
  player: false,
  queue: false,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  execute: async (client, message, args, emoji) => {
    const embedColor = client.color || client.config?.FUEGO?.COLOR || client.config?.EMBED_COLOR || "#3d16ca";

    // Initial "waiting" message
    const initialEmbed = new client.embed(embedColor); // Create instance
    initialEmbed.desc( // Use your custom .desc() method
      ` <:Bell:1308507329116770365> **Getting The Information Please Wait for A Second**`
    );
    let wait = await message.reply({ embeds: [initialEmbed] }).catch(e => {
        client.log(`StatsCmd: Failed to send initial reply: ${e.message}`, "warn");
        return null; // Return null if sending failed
    });
    if (!wait) return; // Stop if initial message couldn't be sent

    let v = []; // Initialize v as an empty array
    try {
        v = await client.cluster.broadcastEval(async (c) => { // c is the client on each cluster
            let cpu = 0; // Default to 0
            try {
                cpu = await new Promise((resolve) => { // Removed redundant async for Promise constructor
                    require("os-utils").cpuUsage((val) => {
                        resolve(val);
                    });
                });
            } catch (cpuError) {
                // c.log might not exist if 'c' is not your full client object with extensions
                // console.warn(`[ClusterEval ${process.pid}] CPU Usage error: ${cpuError.message}`);
                // Use a placeholder or log appropriately if c.log is not available
            }

            // Ensure c.formatTime and c.formatBytes are available on the cluster's client 'c'
            // If not, these will throw errors or return undefined.
            // It's safer to send raw numbers and format them on the main process.
            const memoryUsage = process.memoryUsage().heapUsed;
            const uptime = c.uptime;
            const guildsSize = c.guilds.cache.size;
            const memberCount = c.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0);
            const playingPlayers = [...c.manager.players.values()].filter((p) => p.playing).length;
            const totalPlayers = [...c.manager.players.values()].length;


            let stats =
                `[**__<a:nr_arrow:1308552225450233946>Basic Info__**](${c.support || '#'}) \n` + // Use c.support or a default
                `**<a:VinylRecord:1308559679621693492><:SQ_whitedot:1308536580000186388>  Ping : **\`${Math.round(c.ws.ping)} ms\`\n` + // Round ping
                `**<a:VinylRecord:1308559679621693492><:SQ_whitedot:1308536580000186388>  Uptime : **\`${c.formatTime ? c.formatTime(uptime) : (uptime/1000/60).toFixed(2) + 'm'}\`\n` +
                `[**__<a:nr_arrow:1308552225450233946> Resources__**](${c.support || '#'}) \n` +
                `**<a:VinylRecord:1308559679621693492><:SQ_whitedot:1308536580000186388>  RAM : **\`${c.formatBytes ? c.formatBytes(memoryUsage) : (memoryUsage / 1024 / 1024).toFixed(2) + 'MB'}\`\n` +
                `**<a:VinylRecord:1308559679621693492><:SQ_whitedot:1308536580000186388>  CPU : **\`${(cpu * 100).toFixed(2)} %\`\n` + // os-utils gives 0-1, multiply by 100 for %
                `[**__<a:nr_arrow:1308552225450233946> Size & Stats__**](${c.support || '#'}) \n` +
                `**<a:VinylRecord:1308559679621693492><:SQ_whitedot:1308536580000186388>  Players: **\`${playingPlayers}/${totalPlayers}\`\n` +
                `**<a:VinylRecord:1308559679621693492><:SQ_whitedot:1308536580000186388>  Servers: **\`${(guildsSize / 1000).toFixed(2)}K\`\n` + // Use toFixed for K
                `**<a:VinylRecord:1308559679621693492><:SQ_whitedot:1308536580000186388>  Users : **\`${(memberCount / 1000).toFixed(2)}K\`\n`; // Use toFixed for K
            return [stats]; // broadcastEval expects an array if you map over results later
        });
    } catch (broadcastError) {
        client.log(`StatsCmd: broadcastEval failed: ${broadcastError.message}`, "error");
        const broadcastErrEmbed = new client.embed(embedColor);
        broadcastErrEmbed.error("Could not fetch stats from all clusters.");
        return wait.edit({ embeds: [broadcastErrEmbed] }).catch(() => {});
    }


    const statsEmbed = new client.embed(embedColor); // Create instance
    statsEmbed.setTitle(`${client.user.username} Status :`) // CORRECTED
               .setFooter({ text: `Page : [1/3] By Nexus` }); // Removed extra spaces

    const nodeStatsEmbed = new client.embed(embedColor); // Create instance
    nodeStatsEmbed.setTitle(`${client.user.username} Node Status :`) // CORRECTED
                  .setDescription( // Use setDescription for multi-line content
                    [...client.manager.shoukaku.nodes.values()]
                    .map(
                        (node) =>
                        `[**__<a:nr_arrow:1308552225450233946> ${node.name}__**](https://discord.gg/gRSHCpqK7u)\n` +
                        `**<a:VinylRecord:1308559679621693492><:SQ_whitedot:1308536580000186388>  Players : **\`${node.stats?.players || 0}\`\n` +
                        `**<a:VinylRecord:1308559679621693492><:SQ_whitedot:1308536580000186388>  CPU : **\`${(
                            (node.stats?.cpu?.systemLoad || 0) + (node.stats?.cpu?.lavalinkLoad || 0) // Added null checks
                        ).toFixed(2)} / ${(node.stats?.cpu?.cores || 1) * 100} %vCPU\`\n` + // Added null checks
                        `**<a:VinylRecord:1308559679621693492><:SQ_whitedot:1308536580000186388>  RAM : **\`${(
                            (node.stats?.memory?.used || 0) / (1024 * 1024 * 1024)
                        ).toFixed(1)} / ${(
                            ((node.stats?.memory?.reservable || 0) + (node.stats?.memory?.allocated || 0)) / (1024 * 1024 * 1024)
                        ).toFixed(1)} GiB\`\n` + // Added null checks
                        `**<a:VinylRecord:1308559679621693492><:SQ_whitedot:1308536580000186388>  Uptime : **\`${client.formatTime(node.stats?.uptime || 0)}\`` // Added null check
                    )
                    .join("\n\n") || "No nodes connected or stats unavailable."
                  )
                  .setFooter({ text: `Page : [2/3] By Nexus` }); // Removed extra spaces

    let graphImageURL = null;
    try {
        graphImageURL = await genGraph(
            client.ws.ping,
            wait.createdAt && message.createdAt ? wait.createdAt - message.createdAt : 0 // Ensure both exist
        );
    } catch (graphError) {
        client.log(`StatsCmd: genGraph failed: ${graphError.message}`, "warn");
    }

    const graphEmbed = new client.embed(embedColor); // Create instance
    if (graphImageURL) {
        graphEmbed.setImage(graphImageURL); // CORRECTED from .img() to .setImage()
    } else {
        graphEmbed.setDescription("Ping history graph could not be generated.");
    }
    graphEmbed.setFooter({ text: `Page : [3/3] By Nexus` }); // Removed extra spaces


    for (let i = 0; i < v.length; i++) {
      if (v[i] && v[i][0]) { // Check if the broadcasted data exists
        statsEmbed.addFields({
            name: `Cluster [${i}] :`,
            value: v[i][0],
            inline: true,
        });
      }
    }

    let page = 0;
    let pages = [statsEmbed, nodeStatsEmbed, graphEmbed];

    // Assuming client.button() is your factory for creating button instances
    const btn1 = new client.button().secondary(`stats_page_stats`, `Stats`); // More descriptive custom IDs
    const btn2 = new client.button().secondary(`stats_page_node`, `Node`);
    const btn3 = new client.button().secondary(`stats_page_graph`, `Ping`);
    const btn4 = new client.button().danger(`stats_stop_collector`, `Stop`);

    const row = new ActionRowBuilder().addComponents(btn1, btn2, btn3, btn4);

    let m = await wait.edit({ embeds: [pages[page]], components: [row] }).catch((e) => {
        client.log(`StatsCmd: Failed to edit wait message: ${e.message}`, "error");
        return null;
    });
    if (!m) return; // Stop if edit failed

    const filter = async (interaction) => {
      if (interaction.user.id === message.author.id) {
        return true;
      }
      const permDenyEmbed = new client.embed(embedColor).desc(`${emoji.no} Only **${message.author.tag}** can use this`);
      await interaction.reply({ embeds: [permDenyEmbed], ephemeral: true }).catch(() => {});
      return false;
    };
    const collector = m.createMessageComponentCollector({ // Removed optional chaining
      filter: filter,
      time: 60000, // 1 minute
      idle: 30000, // 30 seconds idle timeout
    });

    collector.on("collect", async (c) => {
      if (!c.isButton()) return; // Ensure it's a button
      try {
        if (!c.deferred) await c.deferUpdate();
      } catch (e) { client.log(`StatsCmd collector deferUpdate failed: ${e.message}`, "warn"); return; }


      switch (c.customId) {
        case "stats_page_stats":
          page = 0;
          break;
        case "stats_page_node":
          page = 1;
          break;
        case "stats_page_graph":
          page = 2;
          break;
        case "stats_stop_collector":
          collector.stop("user_stopped");
          return; // Return after stopping
        default:
          return; // Unknown button
      }
      if (m && !m.deleted) { // Check if message still exists
        await m.edit({ embeds: [pages[page]] }).catch((e) => client.log(`StatsCmd page edit failed: ${e.message}`, "warn"));
      }
    });

    collector.on("end", async (collected, reason) => {
      if (m && !m.deleted) { // Check if message still exists
        // Disable buttons on end
        const disabledRow = ActionRowBuilder.from(row); // Create from existing row
        disabledRow.components.forEach(button => button.setDisabled(true));
        await m.edit({ components: [disabledRow] }).catch(() => {});
      }
    });
  },
};