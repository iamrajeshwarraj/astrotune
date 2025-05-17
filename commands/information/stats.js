/** @format
 *
 * Fuego By Painfuego
 * Version: 6.0.0-beta
 * © 2024 Aero-Services
 */

const genGraph = require("@gen/pingGraph.js");
const { ActionRowBuilder } = require("discord.js");

module.exports = {
  name: "stats",
  aliases: ["shard", "status", "stat"],
  cooldown: "",
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
    let e = new client.embed().desc(
      ` <:Bell:1308507329116770365> **Getting The Information Please Wait for A Second**`,
    );
    let wait = await message.reply({ embeds: [e] });

    let v = await client.cluster.broadcastEval(async (x) => {
      let cpu = "[ N/A ]";
      await new Promise(async (resolve, reject) => {
        require("os-utils").cpuUsage((v) => {
          resolve(v);
        });
      }).then((value) => {
        return (cpu = value);
      });

      let stats =
        `[**__<a:nr_arrow:1308552225450233946>Basic Info__**](${x.support})\n` +
        `**⠀⠀⠀<:SQ_whitedot:1308536580000186388>  Ping : **\`${x.ws.ping} ms\`\n` +
        `**⠀⠀⠀<:SQ_whitedot:1308536580000186388>  Uptime : **\`${x.formatTime(x.uptime)}\`\n` +
        `[**__<a:nr_arrow:1308552225450233946> Resources__**](${x.support})\n` +
        `**⠀⠀⠀<:SQ_whitedot:1308536580000186388>  RAM : **\`${x.formatBytes(
          process.memoryUsage().heapUsed,
        )}\`\n` +
        `**⠀⠀⠀<:SQ_whitedot:1308536580000186388>  CPU : **\`${cpu.toFixed(2)} %vCPU\`\n` +
        `[**__<a:nr_arrow:1308552225450233946> Size & Stats__**](${x.support})\n` +
        `**⠀⠀⠀<:SQ_whitedot:1308536580000186388>  Players: **\`${
          [...x.manager.players.values()].filter((p) => p.playing).length
        }/${[...x.manager.players.values()].length}\`\n` +
        `**⠀⠀⠀<:SQ_whitedot:1308536580000186388>  Servers: **\`${x.guilds.cache.size / 1000}K\`\n` +
        `**⠀⠀⠀<:SQ_whitedot:1308536580000186388>  Users : **\`${
          (await x.guilds.cache.reduce(
            (total, guild) => total + guild.memberCount,
            0,
          )) / 1000
        }K\`\n`;

      return [stats];
    });

    let statsEmbed = new client.embed()
      .title(`${client.user.username} Status :`)
      .setFooter({
        text: `Page : [1/3] By Nexusㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤ`,
      });
    let nodeStatsEmbed = new client.embed()
      .title(`${client.user.username} Node Status :`)
      .desc(
        [...client.manager.shoukaku.nodes.values()]
          .map(
            (node) =>
              `[**__<a:nr_arrow:1308552225450233946> ${node.name}__**](https://discord.gg/gRSHCpqK7u)\n` +
              `**⠀⠀⠀<:SQ_whitedot:1308536580000186388>  Players : **\`${node.stats.players}\`\n` +
              `**⠀⠀⠀<:SQ_whitedot:1308536580000186388>  CPU : **\`${(
                node.stats.cpu.systemLoad + node.stats.cpu.lavalinkLoad
              ).toFixed(2)}/${node.stats.cpu.cores * 100} %vCPU\`\n` +
              `**⠀⠀⠀<:SQ_whitedot:1308536580000186388>  RAM : **\`${(
                node.stats.memory.used /
                (1024 * 1024 * 1024)
              ).toFixed(1)}/${(
                (node.stats.memory.reservable + node.stats.memory.allocated) /
                (1024 * 1024 * 1024)
              ).toFixed(1)} GiB\`\n` +
              `**⠀⠀⠀<:SQ_whitedot:1308536580000186388>  Uptime : **\`${client.formatTime(node.stats.uptime)}\``,
          )
          .join("\n\n"),
      )
      .setFooter({
        text: `Page : [2/3] By Nexusㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤ`,
      });

    const uri = await genGraph(
      client.ws.ping,
      wait.createdAt - message.createdAt,
    );
    const graphEmbed = new client.embed().img(uri).setFooter({
      text: `Page : [3/3] By Nexusㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤ`,
    });

    for (i = 0; i < v.length; i++) {
      statsEmbed.addFields({
        name: `Cluster [${i}] :`,
        value: v[i][0],
        inline: true,
      });
    }

    let page = 0;
    let pages = [statsEmbed, nodeStatsEmbed, graphEmbed];

    const btn1 = new client.button().secondary(`stats`, `Stat`);
    const btn2 = new client.button().secondary(`node`, `Node`);
    const btn3 = new client.button().secondary(`graph`, `Ping History`);
    const btn4 = new client.button().danger(`stop`, `✖`);

    const row = new ActionRowBuilder().addComponents(btn1, btn2, btn3, btn4);

    let m = await wait
      .edit({ embeds: [pages[page]], components: [row] })
      .catch(() => {});

    const filter = async (interaction) => {
      if (interaction.user.id === message.author.id) {
        return true;
      }
      await interaction
        .reply({
          embeds: [
            new client.embed().desc(
              `${emoji.no} Only **${message.author.tag}** can use this`,
            ),
          ],
          ephemeral: true,
        })
        .catch(() => {});
      return false;
    };
    const collector = m?.createMessageComponentCollector({
      filter: filter,
      time: 60000,
      idle: 60000 / 2,
    });

    collector?.on("collect", async (c) => {
      if (!c.deferred) await c.deferUpdate();

      switch (c.customId) {
        case "stats":
          page = 0;
          await m.edit({ embeds: [pages[page]] }).catch(() => {});
          break;

        case "node":
          page = 1;
          await m.edit({ embeds: [pages[page]] }).catch(() => {});
          break;

        case "graph":
          page = 2;
          await m.edit({ embeds: [pages[page]] }).catch(() => {});
          break;

        case "stop":
          await collector.stop();
          break;

        default:
          break;
      }
    });

    collector?.on("end", async (collected, reason) => {
      await m
        .edit({
          components: [],
        })
        .catch(() => {});
    });
  },
};
