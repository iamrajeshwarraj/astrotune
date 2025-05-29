const genButtons = require("@gen/playerButtons.js");
const { AttachmentBuilder } = require("discord.js");

module.exports = async (data, client, player) => {
  /*
  const title = data.title;
  const author = data.author;
  const thumbnail = data.thumbnail;
  const duration = data.duration;
  const color = data.color;
  const progress = data.progress;
  const source = data.source;
  */

  const title = data.title;
  const author = data.author;
  const duration = data.duration;
  const thumbnail = data.thumbnail;

  const embed = new client.embed()
    .addFields([
      {
        name: `<:filter:1304400589270024253> **Now Playing..**`,
        value:
          `<a:MusicNotes:1308553832086896771> **Song <a:nr_arrow:1308552225450233946>** ${title.substring(0, 20)}...\n` +
          `<a:MusicNotes:1308553832086896771> **Author <a:nr_arrow:1308552225450233946>** ${author}\n` +
          `<a:MusicNotes:1308553832086896771> **Duration <a:nr_arrow:1308552225450233946>**${duration}\n` +
          `**Requester <a:nr_arrow:1308552225450233946>**${player.queue.current.requester}`,
        inline: true,
      },
    ])
    .thumb(thumbnail)
    // .img(
    //   "https://media.discordapp.net/attachments/1260198329422450789/1263323005795172444/standard_3.gif?ex=6699d0bb&is=66987f3b&hm=55cc22db373e45c6ba36aad3ab7ce9d25b57d01931cee27a0dda955c40e7f78d&",
    // );

  return [[embed], [], [genButtons(client, player, 5)[0]]];
};
