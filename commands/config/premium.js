/** @format
 *
 * Fuego By Painfuego
 * Version: 6.0.0-beta
 * © 2024 Aero-Services
 */
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");

const voucher_codes = require("voucher-code-generator");

module.exports = {
  name: "premium",
  aliases: [],
  cooldown: "",
  category: "config",
  usage: "",
  description: "Shows your premium status",
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
    let [premiumUser, premiumGuild, owner, admin] = await Promise.all([
      await client.db.premium.get(`${client.user.id}_${message.author.id}`),
      await client.db.premium.get(`${client.user.id}_${message.guild.id}`),
      await client.owners.find((x) => x === message.author.id),
      await client.admins.find((x) => x === message.author.id),
    ]);

    const cmd = args[0] ? args[0].toLowerCase() : null;
    const type = args[1] ? args[1].toLowerCase() : null;

    switch (cmd) {
      case "gen":
        if (!owner && !admin)
          return await message.reply({
            embeds: [
              new client.embed().desc(
                `${emoji.admin} **Only my Owner/s and Admin/s can use this command**`,
              ),
            ],
          });
        let code;
        switch (type) {
          case "guild":
            code = voucher_codes.generate({
              pattern: `ASTU-####-GUILD-DUR${args[2] || 28}`,
            });
            code = code[0].toUpperCase();
            await client.db.vouchers.set(code, true);
            break;
          default:
            code = voucher_codes.generate({
              pattern: `ASTU-#####-USER-DUR${args[2] || 28}`,
            });
            code = code[0].toUpperCase();
            await client.db.vouchers.set(code, true);
            break;
        }
        await message
          .reply({
            embeds: [
              new client.embed().desc(
                `<a:nr_arrow:1308552225450233946> **Here's your generated code**\n` +
                  `${emoji.bell} **Usage :** ${client.prefix}redeem your_code\n` +
                  `${emoji.rich} ||${code}||\n`,
              ),
            ],
          })
          .catch(() => {});
        break;
      default:
        await message
          .reply({
            embeds: [
              new client.embed()
                .setAuthor({
                  name: `What about my premium ?`,
                  iconURL: client.user.displayAvatarURL(),
                })
                .desc(
                  `
                    <a:VinylRecord:1308559679621693492> Unlock the Ultimate Music Experience with Premium! <a:VinylRecord:1308559679621693492>

Thank you for your interest in upgrading to Premium! <:premium:1308536300529385542> With our Premium plan, you will elevate your music sessions to the next level. Here is what you will get:

<a:tick:1303637744983216232> Unlimited Skips - Skip as many tracks as you like, whenever you like!

<a:music:1308542971368439879> High-Quality Audio - Enjoy music in stunning clarity, making every beat feel alive.

<:role:1303279834633343008> 24/7 Playback - Keep the tunes going non-stop, even when youâ€™re offline.

<:developer:1308537963554148352> Advanced Commands - Access exclusive features to customize your listening experience.

<:member:1308556543675076699> Early Access - Be the first to try out new features and updates.

<a:Discord_Halloween:1308556876002230302> No Ads - There Will Be No Server Ads When Played Music.

<:Spotify:1308549107677134878> No Prefix - You Can Use Bot Without Any Prefix.

**Ready to take your music to the next level? Upgrade now and enjoy an uninterrupted, premium experience!

This introduction is designed to highlight the key benefits of the Premium plan, encouraging users to consider upgrading.**`,
                ),
            ],
          })
          .catch(() => {});
        break;
    }
  },
};
