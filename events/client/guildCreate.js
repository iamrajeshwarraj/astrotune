// events/client/guildCreate.js
// const { EmbedBuilder } = require('discord.js'); // Not needed if using client.embed

module.exports = {
    name: 'guildCreate',
    async run(client, guild) { // Parameters may vary based on your event handler
        try {
            client.log(`Joined a new guild: ${guild.name} (ID: ${guild.id}) with ${guild.memberCount} members.`, "event", "GuildEvents");

            // Example: Send a message to a default channel or system channel
            let defaultChannel = null;
            if (guild.systemChannel && guild.systemChannel.permissionsFor(guild.members.me).has("SendMessages")) {
                defaultChannel = guild.systemChannel;
            } else {
                defaultChannel = guild.channels.cache.find(
                    channel => channel.type === 0 && // 0 for GUILD_TEXT
                               channel.permissionsFor(guild.members.me).has("SendMessages")
                );
            }

            if (defaultChannel) {
                const embedColor = client.color || client.config?.FUEGO?.COLOR || client.config?.EMBED_COLOR || "#3498db";
                
                // Assuming client.embed is your CustomEmbed class constructor
                // Line 26 from your error was likely similar to this embed creation
                const welcomeEmbed = new client.embed(embedColor)
                    .setTitle(`Thanks for adding ${client.user.username}!`) // CORRECTED: .setTitle()
                    .setDescription(
                        `Hi there! I'm ${client.user.username}, your music companion.\n` +
                        `My prefix is \`${client.prefix || client.config?.FUEGO?.PREFIX || "!"}\`. ` +
                        `Type \`${client.prefix || client.config?.FUEGO?.PREFIX || "!"}help\` to see my commands.\n` +
                        (client.support ? `If you need help, join our [Support Server](${client.support})!` : "")
                    )
                    .setThumbnail(client.user.displayAvatarURL())
                    .setFooter({ text: `Currently in ${client.guilds.cache.size} servers!` });

                await defaultChannel.send({ embeds: [welcomeEmbed] }).catch(e => {
                    client.log(`Failed to send welcome message to ${guild.name}: ${e.message}`, "warn", "GuildEvents");
                });
            }

            // Log to your server webhook if configured
            if (client.webhooks && client.webhooks.server) {
                const webhookEmbed = new client.embed(client.color || "#00FF00") // Use a distinct color
                    .setTitle("Joined New Server")
                    .addFields(
                        { name: "Server Name", value: guild.name, inline: true },
                        { name: "Server ID", value: guild.id, inline: true },
                        { name: "Member Count", value: `${guild.memberCount}`, inline: true },
                        { name: "Owner", value: `<@${guild.ownerId}> (ID: ${guild.ownerId})`, inline: true }
                    )
                    .setThumbnail(guild.iconURL())
                    .setTimestamp();
                client.webhooks.server.send({ embeds: [webhookEmbed] }).catch(e => client.log(`Webhook server log failed: ${e.message}`, "warn", "GuildEvents"));
            }

        } catch (error) {
            if (client && typeof client.log === 'function') {
                client.log(`Error in guildCreate event: ${error.message}`, "error", "GuildEvents");
            }
            console.error("guildCreate Error:", error);
        }
    }
};