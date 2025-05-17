// utils/messageCleanup.js
async function cleanupPlayerMessages(client, guildId) {
    if (!client.guildTrackMessages || !guildId) {
        // console.log("Cleanup: No guildTrackMessages map or no guildId provided.");
        return;
    }

    const messagesToClean = client.guildTrackMessages.get(guildId);
    // console.log(`Cleanup: Found messages for guild ${guildId}:`, messagesToClean);

    if (messagesToClean && messagesToClean.length > 0) {
        for (const msgInfo of messagesToClean) {
            try {
                const channel = await client.channels.fetch(msgInfo.channelId).catch(() => null);
                if (channel) {
                    const message = await channel.messages.fetch(msgInfo.messageId).catch(() => null);
                    if (message && !message.deleted) {
                        await message.delete().catch(err => {
                            // client.logger.warn(`Cleanup: Failed to delete message ${msgInfo.messageId} in channel ${msgInfo.channelId}: ${err.message}`);
                        });
                        // console.log(`Cleanup: Deleted message ${msgInfo.messageId} in channel ${msgInfo.channelId}`);
                    }
                } else {
                    // client.logger.warn(`Cleanup: Could not fetch channel ${msgInfo.channelId} for message ${msgInfo.messageId}`);
                }
            } catch (error) {
                // client.logger.error(`Cleanup: Error processing message ${msgInfo.messageId}: ${error.message}`);
            }
        }
        client.guildTrackMessages.set(guildId, []); // Clear the array for this guild after attempting to delete all
        // console.log(`Cleanup: Cleared message array for guild ${guildId}`);
    } else {
        // console.log(`Cleanup: No messages to clean for guild ${guildId}`);
    }
}

module.exports = { cleanupPlayerMessages };