module.exports = {
  name: "profile",
  aliases: ["pr"],
  cooldown: "",
  category: "config",
  usage: "",
  description: "See server configs",
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
    let [pfx, premiumUser, dev, admin] = await Promise.all([
      await client.db.pfx.get(`${client.user.id}_${message.author.id}`),
      await client.db.premium.get(`${client.user.id}_${message.author.id}`),
      await client.owners.find((x) => x === message.author.id),
      await client.admins.find((x) => x === message.author.id),
    ]);

    let premium =
      premiumUser == true
        ? "Lifetime"
        : premiumUser
          ? `Expiring <t:${`${premiumUser}`?.slice(0, -3)}:R>`
          : `\`No Active Plan\``;

    await message
      .reply({
        embeds: [
          new client.embed()

            .setAuthor({
              name: `Profile Panel`,

              iconURL: client.user.displayAvatarURL(),
            })
            .desc(
                `**Hey! AstroTune here, Welcome to Profile Overview**\n` +
                
              `\n**<:Bell:1308507329116770365> User Prefix : ${pfx ? `\`${pfx}\`` : `\`Not set\``}**\n\n` +
                `${dev ? `<:developer:1308537963554148352> - Developer\n` : ``}` +
                `${admin ? `🛡️ - Administrator\n` : ``}` +
                `${
                  premiumUser ? `<:premium:1308536300529385542> - Premium User\n` : ``
                }` +
                `<:role:1303279834633343008> - AstroTuneuser/(s)\n\n` +
                `**Premium : ${premium}**\n\n`,
            )

            .thumb(message.member.displayAvatarURL())
            
        ],
      })
      .catch(() => {});
  },
};
