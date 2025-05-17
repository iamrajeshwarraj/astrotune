/** @format
 *
 * Fuego By Painfuego
 * Version: 6.0.0-beta
 * © 2024 Aero-Services
 */

module.exports = {
  name: "balance",
  aliases: ["bal"],
  cooldown: "",
  category: "information",
  usage: "",
  description: "Check balance",
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
    let coins = parseInt(
      (await client.db.coins.get(`${message.author.id}`)) || 0,
    );

    const m = await message
      .reply({
        embeds: [
          new client.embed()
            .desc(
              `**<:CoinFlipHeads:1308559290545606717> You have a total of ${
                coins || `0`
              } coins**\n\n` +
                `**Need coins ? Here's are some steps:**\n\n` +
                
                `<:SQ_whitedot:1308536580000186388>⠀⠀**Each cmd used (1-3 coins)**\n` +
                `<:SQ_whitedot:1308536580000186388>⠀⠀⠀**Add me in server (150 coins)**\n` +
               
                `<:SQ_whitedot:1308536580000186388>⠀⠀⠀**Boost support server (1000 coins)**\n` +
                `<:SQ_whitedot:1308536580000186388>⠀⠀⠀**Pay 1.5M UwU or 29.99 INR (1800 coins)**\n` +
                
                `<:SQ_whitedot:1308536580000186388>⠀⠀⠀**Beg ! May get u rich / blacklisted**\n\n`,
            )
      .setThumbnail(client.user.displayAvatarURL())
// .img(

//       "https://media.discordapp.net/attachments/1260198329422450789/1263321407857754202/standard_2.gif?ex=6699cf3f&is=66987dbf&hm=b940469ca479fbd94c1c85727e3b5d2c0abfefd945cb7b55d76a79cca60aa50b&",

//     )
            
        ],
      })
      .catch(() => {});
  },
};
