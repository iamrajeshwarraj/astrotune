module.exports = async (client) => {
  // Ensure client.color is available or use a fallback from config
  const embedColor = client.color || client.config?.FUEGO?.COLOR || client.config?.EMBED_COLOR || "#3d16ca";

  // Check Lavalink node readiness more safely
  const firstNode = [...client.manager.shoukaku.nodes][0]?.[1]; // Get the first node entry (value part)
  if (!firstNode || firstNode.state !== 1) { // state 1 usually means CONNECTED for Shoukaku nodes
    client.log(
      `Lavalink node not ready! State: ${firstNode?.state}. Loading 24*7 player/(s) once node is ready`,
      "warn", "Load247"
    );
    return;
  }

  client.loading247 = true; // This seems like a custom flag, ensure it's handled elsewhere if needed
  let i = 0;
  let keys = [];
  try {
    keys = await client.db.twoFourSeven.keys; // Ensure .keys is a getter or async property that resolves to an array
    if (!Array.isArray(keys)) {
        client.log("Failed to retrieve 24/7 keys or keys is not an array.", "error", "Load247");
        keys = []; // Default to empty array to prevent further errors
    }
  } catch (dbError) {
    client.log(`Error fetching 24/7 keys: ${dbError.message}`, "error", "Load247");
    return; // Stop if we can't get keys
  }
  
  keys = keys.filter((key) => typeof key === 'string' && key.includes(client.user.id));

  client.log(`Found ${keys.length} potential 24/7 keys to process.`, "info", "Load247");

  for (let key of keys) {
    let guildId = key.split("_")[1]; // Corrected variable name from 'guild' to 'guildId' for clarity
    if (!guildId) {
        client.log(`Invalid key format for 24/7 player: ${key}`, "warn", "Load247");
        continue;
    }

    let data247 = await client.db.twoFourSeven.get(key);
    if (!data247 || !data247.TextId || !data247.VoiceId) {
        client.log(`Missing TextId or VoiceId for 24/7 key: ${key}`, "warn", "Load247");
        continue;
    }
    let { TextId, VoiceId } = data247;

    let textChannel = client.channels.cache.get(TextId) || null; // Renamed for clarity
    let voiceChannel = client.channels.cache.get(VoiceId) || null; // Renamed for clarity

    if (!voiceChannel) {
      client.log(`24/7 Voice Channel ${VoiceId} not found for guild ${guildId}. Key: ${key}`, "warn", "Load247");
      if (textChannel && textChannel.isTextBased()) { // Check if textChannel is valid before sending
        await textChannel
          .send({
            embeds: [
              new client.embed(embedColor) // Use defined embedColor
                .setTitle(`24/7 Player Error`) // CORRECTED
                .setDescription( // Use setDescription
                  `${client.emoji.warn || '⚠️'} **Unable to find 24/7 voice channel (${VoiceId})**\n` +
                  `${client.emoji.bell || '🔔'} *Use \`${client.prefix}move\` to set a new 24/7 channel*`,
                ),
            ],
          })
          .catch((e) => client.log(`Failed to send message to text channel ${TextId}: ${e.message}`, "warn", "Load247"));
      }
      continue;
    }

    if (!textChannel) {
      client.log(`24/7 Text Channel ${TextId} not found for guild ${guildId}. Using voice channel ${VoiceId} as text channel. Key: ${key}`, "warn", "Load247");
      if (voiceChannel.isTextBased && voiceChannel.isTextBased()) { // Check if voiceChannel can be used as text (e.g. stage announcement)
        textChannel = voiceChannel; // This is unusual, ensure voiceChannel can actually receive messages
        await client.db.twoFourSeven.set(key, {
          TextId: textChannel.id,
          VoiceId: voiceChannel.id,
        });
         await textChannel.send({ // Send to the new textChannel (which is voiceChannel)
          embeds: [
            new client.embed(embedColor)
              .setTitle(`24/7 Player Notice`) // CORRECTED
              .setDescription( // Use setDescription
                `${client.emoji.warn || '⚠️'} **Unable to find 24/7 text channel (${TextId})**\n` +
                `${client.emoji.bell || '🔔'} *This voice channel will now be used as default 24/7 text channel*\n` +
                `${client.emoji.bell || '🔔'} *Use \`${client.prefix}move\` to set a new 24/7 text channel*`,
              ),
          ],
        }).catch((e) => client.log(`Failed to send message to voice channel (as text) ${VoiceId}: ${e.message}`, "warn", "Load247"));
      } else {
          client.log(`Cannot use voice channel ${VoiceId} as text channel for guild ${guildId}. Skipping 24/7 setup.`, "error", "Load247");
          continue;
      }
    }
    
    // Check if player already exists for this guild
    if (client.manager.players.has(guildId)) { // More direct check
        client.log(`Player already exists for guild ${guildId}. Skipping 24/7 player creation.`, "info", "Load247");
        continue;
    }

    try {
      await client.manager.createPlayer({
        voiceId: voiceChannel.id,
        textId: textChannel.id,
        guildId: guildId, // Use guildId string
        shardId: voiceChannel.guild.shardId, // Get shardId from the voice channel's guild
        loadBalancer: true,
        deaf: true,
      });
      client.log(`24/7 Player re-/created for guild ${guildId}`, "player", "Load247");
    } catch (e) {
      client.log(`Failed to create 24/7 player for guild ${guildId}: ${e.message}`, "error", "Load247");
      console.error(`Error creating 24/7 player for ${guildId}:`, e); // Log full error for debugging
      continue; // Skip to next key if player creation fails
    }

    // Send confirmation to the text channel
    if (textChannel && textChannel.isTextBased()) {
        await textChannel
        .send({
            embeds: [
            new client.embed(embedColor) // Use defined embedColor
                .setTitle(`24/7 Player Reconnected`) // CORRECTED
                .setDescription( // Use setDescription
                `${client.emoji.bell || '🔔'} **Joined <#${voiceChannel.id}> and bound to <#${textChannel.id}>**`,
                ),
            ],
        })
        .then(async (m) =>
            setTimeout(async () => await m.delete().catch(() => {}), 5000),
        )
        .catch((e) => client.log(`Failed to send 24/7 reconnected message to ${textChannel.id}: ${e.message}`, "warn", "Load247"));
    }
    i++;
  }

  client.log(`Loaded ${i} 24/7 player(s)`, `player`, "Load247");
  client.loading247 = false; // Reset the flag
};