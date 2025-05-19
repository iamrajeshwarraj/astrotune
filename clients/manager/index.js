// clients/manager/index.js
/** @format
 *
 * Manager By Painfuego (Assumed to be the Fuego client from sharder config)
 * Version: 6.0.0-beta
 * © 2024 Aero-Services
 */

require("module-alias/register");
const dokdo = require("dokdo");
const Discord = require("discord.js");
const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path"); 

const client = new Discord.Client({ intents: 3276799 }); // Use all intents for broad compatibility

// --- Load config.yml for this client instance ---
try {
    // Path relative to this file (clients/manager/index.js) to root config.yml
    const configPath = path.resolve(__dirname, '../../config.yml'); 
    const fileContents = fs.readFileSync(configPath, "utf8"); 
    client.config = yaml.load(fileContents); 
    console.log(`[Client: ${client.config.FUEGO?.CLIENT_NAME || 'Manager'}] Config.yml loaded.`);
} catch (e) {
    console.error(`[Client: Main] CRITICAL ERROR: Failed to load or parse config.yml:`, e);
    process.exit(1); 
}
// --- End Config Loading ---

client.guildTrackMessages = new Map(); 
client.LoggerClass = require("@plugins/logger"); // Store the Logger CLASS
client.embed = require("@plugins/embed");     // Store the Embed CLASS/Factory

// Use client.log which uses client.LoggerClass.log internally
const log = (message, type = "log") => {
    if (client.LoggerClass) {
        client.LoggerClass.log(message, type, client.config.FUEGO?.CLIENT_NAME || client.user?.username || "ClientProcess");
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
};


if (!client.config.FUEGO || !client.config.FUEGO.OWNERS || !client.config.FUEGO.OWNERS.length) { // Assuming FUEGO.OWNERS
    log("CRITICAL ERROR: FUEGO.OWNERS not found in config! Check config.yml structure.", "error");
    process.exit(1);
}
client.Jsk = new dokdo.Client(client, {
    prefix: client.config.FUEGO.PREFIX || ".", 
    aliases: client.config.FUEGO.JSK_ALIASES || ["jsk"], 
    owners: client.config.FUEGO.OWNERS, // Directly use FUEGO.OWNERS
});

// Initialize Kazagumo player manager
if (!client.manager) { 
    require("@plugins/player.js")(client); // Pass client with .config
}

// Require other essential parts that depend on client being set up
require("./func.js")(client);       // This sets up client.log, client.send etc.
require("./events/backup.js")(client); // Example event
require("./events/dbCheck.js")(client); // Example event
// Require your command handler
// require('@handlers/command.js')(client); // Example path, adjust to your structure

client.once("ready", async () => {
    log(`Client Ready! Logged in as ${client.user.tag}. Shard ID: ${client.shard?.ids?.join(',') || 'N/A'}`, "ready");
});

client.on("messageCreate", (message) => {
    if (!message.guild || message.author.bot) return;
    
    // JSK Handling (ensure prefix and aliases are from client.config.FUEGO if that's intended for this client)
    const jskPrefix = client.config.FUEGO?.JSK_PREFIX || client.Jsk?.prefix || "."; 
    const jskAliases = client.config.FUEGO?.JSK_ALIASES || client.Jsk?.aliases || ["jsk"]; 

    if (message.content.startsWith(jskPrefix)) {
        const commandPart = message.content.substring(jskPrefix.length).toLowerCase(); 
        if (jskAliases.some(alias => commandPart.startsWith(alias))) {
             client.Jsk.run(message);
        }
    }
    // Your main command handler invocation would go here
    // e.g., if (message.content.startsWith(client.config.FUEGO.PREFIX)) { /* call command handler */ }
});

require("@utils/antiCrash.js")(client); 

if (!client.config.FUEGO || !client.config.FUEGO.TOKEN) {
    log("CRITICAL ERROR: FUEGO.TOKEN not found in config! Check config.yml structure.", "error");
    process.exit(1);
}
client.login(client.config.FUEGO.TOKEN);