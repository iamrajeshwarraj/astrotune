// commands/filter/equalizer.js
const genGraph = require("@gen/eqGraph.js"); 
const { ActionRowBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } = require("discord.js"); // ButtonBuilder itself is not used if client.button() is your factory

module.exports = {
  name: "equalizer",
  aliases: ["eq"],
  cooldown: 5, 
  category: "filter",
  usage: "",
  description: "Interactive 5-band Equalizer.",
  args: false,
  vote: false,
  new: false,
  admin: false,
  owner: false,
  botPerms: [],
  userPerms: [], 
  player: true,
  queue: true, 
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (client, message, args, emoji) => {
    const player = await client.getPlayer(message.guild.id);
    if (!player) {
        return message.reply({ embeds: [new client.embed(client.color).error("No player found.")]});
    }

    const currentEQ = player.filters?.equalizer || player.shoukaku?.filters?.equalizer || [];

    const getGainFromLabel = (label) => {
        if (label === "+2") return 0.5;   // Max positive gain in your example was 0.5
        if (label === "+1") return 0.25;
        if (label === "0") return 0;
        if (label === "-1") return -0.25;
        if (label === "-2") return -0.5;  // Max negative gain in your example was -0.5 (Lavalink min is -0.25)
                                          // Lavalink gain is -0.25 to 1.0. So -0.5 is actually -0.25 (clamped)
                                          // We should use values valid for Lavalink: -0.25, -0.125, 0, 0.125, 0.25 (example steps)
        return 0; // Default
    };

    const getLabelFromGain = (gain) => { // Approximate label from Lavalink gain
        if (gain >= 0.25) return "+2"; // Representing higher gains
        if (gain > 0.1) return "+1";
        if (gain === 0) return "0";
        if (gain < -0.1 && gain >= -0.25) return "-1"; // Lavalink min gain is -0.25
        if (gain < -0.25) return "-2"; // Should be clamped to -0.25 by Lavalink
        return "0"; // Default
    };
    
    // Bands for typical 5-point adjustment (these are indices for Lavalink's 15 bands)
    // 62.5Hz (bass), 250Hz (low-mid), 1kHz (mid), 4kHz (upper-mid/treble), 12kHz (high-treble)
    // Your original mapping: 0, 3, 7, 10, 14
    const bandsToControl = [0, 3, 7, 10, 14];
    const bandDisplayNames = ["62.5Hz", "250Hz", "1KHz", "3.6KHz", "12KHz"]; // For custom IDs
    const gainSteps = [
        { label: "+2", gain: 0.25 },   // Max useful gain for Lavalink is around 0.25 to 0.5 without huge distortion
        { label: "+1", gain: 0.125 },
        { label: "0", gain: 0.0 },
        { label: "-1", gain: -0.125 },
        { label: "-2", gain: -0.25 }    // Min gain for Lavalink
    ];

    // Initialize buttonData from current player EQ or defaults
    let buttonData = {};
    bandsToControl.forEach((bandValue, bandIndex) => {
        const currentBandSetting = currentEQ.find(b => b.band === bandValue);
        const currentActualGain = currentBandSetting ? currentBandSetting.gain : 0;

        gainSteps.forEach(step => {
            const customId = `${bandDisplayNames[bandIndex].replace(/[.\sHzK]/g, '')}-${step.label.replace('+', 'plus_').replace('-', 'minus_').replace('0', 'zero_')}db`;
            let isActive = Math.abs(currentActualGain - step.gain) < 0.01; // Check if current gain is this step

            buttonData[customId] = {
                customId: customId,
                label: step.label,
                style: isActive ? "SUCCESS" : "SECONDARY", // String for your client.button factory
                disabled: isActive,
                band: bandValue,
                gain: step.gain,
            };
        });
    });

    const initialEmbed = new client.embed(client.color)
      .setTitle("🎚️ 5-Band Equalizer")
      .setDescription(
        `${emoji.cog || '⚙️'} **Adjust gain for each frequency band:**\n\n` +
          `**${bandDisplayNames[0]}ㅤ ${bandDisplayNames[1]}ㅤ ${bandDisplayNames[2]}ㅤ ${bandDisplayNames[3]}ㅤ ${bandDisplayNames[4]}**`
      )
      .setFooter({ text: `EQ applies after 20s or selection. Current settings loaded.` });

    // Use your client.button() factory
    const generateButtons = (currentButtonData) => {
        return Object.values(currentButtonData).map((data) => {
            // Assuming client.button() returns an object with methods like .secondary(), .success()
            // And these methods take (customId, label, emoji, disabled)
            const btnStyle = data.style.toLowerCase();
            return new client.button()[btnStyle](data.customId, data.label, "", data.disabled);
        });
    };

    let allButtons = generateButtons(buttonData);
    const rows = [];
    for (let i = 0; i < gainSteps.length; i++) { // 5 rows (one for each gain step)
        const row = new ActionRowBuilder();
        for (let j = 0; j < bandsToControl.length; j++) { // 5 columns (one for each band)
            // Find the correct button: Iterate through allButtons to find matching band and label
            // This assumes a fixed order or requires more complex mapping if buttonData isn't ordered for rows
            const targetLabel = gainSteps[i].label;
            const targetBand = bandsToControl[j];
            const btnDetailKey = Object.keys(buttonData).find(key => buttonData[key].band === targetBand && buttonData[key].label === targetLabel);
            if (btnDetailKey) {
                const btn = buttonData[btnDetailKey];
                 row.addComponents(new client.button()[btn.style.toLowerCase()](btn.customId, btn.label, "", btn.disabled));
            } else {
                // Fallback for safety if a button wasn't found - should not happen
                row.addComponents(new client.button().secondary(`fb_${i}_${j}`, "Err").setDisabled(true));
            }
        }
        rows.push(row);
    }

    const m = await message.reply({ embeds: [initialEmbed], components: rows }).catch(e => client.log(`EQ initial reply: ${e.message}`, 'error'));
    if (!m) return;

    const filter = (interaction) => interaction.user.id === message.author.id;
    const collector = m.createMessageComponentCollector({ filter, time: 20000, idle: 10000 });

    collector.on("collect", async (interaction) => {
      if (!interaction.isButton()) return;
      try { await interaction.deferUpdate(); } catch { return; }

      const clickedButtonDetails = buttonData[interaction.customId];
      if (!clickedButtonDetails) return;

      const bandToChange = clickedButtonDetails.band;
      const newGain = clickedButtonDetails.gain;

      // Update buttonData: set new active button for the band, reset others for that band
      Object.values(buttonData).forEach((btn) => {
        if (btn.band === bandToChange) {
          btn.disabled = (btn.gain === newGain);
          btn.style = (btn.gain === newGain) ? "SUCCESS" : "SECONDARY";
        }
      });
      
      const updatedButtonsForEdit = generateButtons(buttonData);
      const updatedRowsForEdit = [];
       for (let i = 0; i < gainSteps.length; i++) {
            const row = new ActionRowBuilder();
            for (let j = 0; j < bandsToControl.length; j++) {
                const targetLabel = gainSteps[i].label;
                const targetBand = bandsToControl[j];
                const btnDetailKey = Object.keys(buttonData).find(key => buttonData[key].band === targetBand && buttonData[key].label === targetLabel);
                 if (btnDetailKey) {
                    const btn = buttonData[btnDetailKey];
                    row.addComponents(new client.button()[btn.style.toLowerCase()](btn.customId, btn.label, "", btn.disabled));
                }
            }
            updatedRowsForEdit.push(row);
        }
      await m.edit({ components: updatedRowsForEdit }).catch((e)=> client.log(`EQ edit fail: ${e.message}`, 'warn'));
    });

    collector.on("end", async (collected, reason) => {
      let finalEQSettings = [];
      bandsToControl.forEach(bandValue => {
          const selectedButton = Object.values(buttonData).find(btn => btn.band === bandValue && (btn.style === "SUCCESS" || btn.disabled === true));
          if (selectedButton) {
              finalEQSettings.push({ band: selectedButton.band, gain: selectedButton.gain });
          } else {
              finalEQSettings.push({ band: bandValue, gain: 0 }); // Default to 0 if no explicit selection for a band
          }
      });
      
      // Ensure all 15 Lavalink bands are provided, setting unmanaged ones to 0
      const fullLavalinkEQPayload = Array.from({ length: 15 }, (_, i) => {
          const userBand = finalEQSettings.find(b => b.band === i);
          return userBand ? { band: i, gain: userBand.gain } : { band: i, gain: 0 };
      });

      if (collected.size === 0 && (reason === "time" || reason === "idle")) {
        try {
            if (player.shoukaku) await player.shoukaku.setFilters({ equalizer: Array.from({length: 15}, (_, i) => ({ band: i, gain: 0 })) });
            client.log("EQ timed out, no selection. Set to flat.", "info", `EQ[${message.guild.id}]`);
            await m.edit({ embeds: [new client.embed(client.color).desc(`${emoji.warn || '⚠️'} **EQ selection timed out. Equalizer reset to flat.**`)], components: [] }).catch(() => {});
        } catch (e) { client.log(`Error resetting EQ on timeout: ${e.message}`, 'error', `EQ[${message.guild.id}]`);}
        return;
      }
      
      try {
        if (player.shoukaku) {
            await player.shoukaku.setFilters({ equalizer: fullLavalinkEQPayload });
            client.log(`Applied custom EQ for guild ${message.guild.id}: ${JSON.stringify(finalEQSettings)}`, "info", "EnhanceCmd");

            const gainsForGraph = finalEQSettings.map(eq => eq.gain); // genGraph needs an array of gain values
            
            // Ensure gainsForGraph has 5 values for your genGraph, padding with 0 if necessary
            // Or adjust genGraph to take the bands it should graph. For now, assuming it expects 5.
            const graphInputGains = bandsToControl.map(bandValue => {
                const setting = finalEQSettings.find(s => s.band === bandValue);
                return setting ? setting.gain : 0;
            });


            const graphImageURL = await genGraph(graphInputGains).catch(e => { // Use corrected gains
                client.log(`Failed to generate EQ graph: ${e.message}`, 'warn'); return null;
            });

            const successEmbed = new client.embed(client.color)
                .setDescription(`${emoji.yes} **Successfully applied selected equalizer settings!**`);
            if (graphImageURL) {
                successEmbed.setImage(graphImageURL); // CORRECTED
            } else {
                successEmbed.addFields({name: "Visualizer", value: "Could not generate graph."});
            }
            await m.edit({ embeds: [successEmbed], components: [] }).catch(() => {});
        } else {
            await m.edit({ embeds: [new client.embed(client.color).error("Failed to apply EQ: Player filter system not available.")], components: [] }).catch(() => {});
        }
      } catch (e) {
        client.log(`Error applying final EQ: ${e.message}`, "error", `EQ[${message.guild.id}]`);
        console.error("EQ Apply Error:", e);
        await m.edit({ embeds: [new client.embed(client.color).error(`Failed to apply equalizer: ${e.message}`)], components: [] }).catch(() => {});
      }
    });
  },
};