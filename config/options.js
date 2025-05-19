// config/options.js
const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");

const configYmlPath = path.resolve(__dirname, "../config.yml"); 

let YML = {}; 
try {
    const fileContents = fs.readFileSync(configYmlPath, "utf8");
    YML = yaml.load(fileContents);
} catch (e) {
    console.error("[options.js] FAILED to load config.yml from path:", configYmlPath, "\nError:", e.message);
    YML = { SPOTIFY: {}, BOT: {}, LINKS: {}, WEBHOOKS: {}, FUEGO: {}, MANAGER: {}, NODES: [] }; 
}

const ymlSpotify = YML.SPOTIFY || {};
const ymlBot = YML.BOT || { OWNERS: [], ADMINS: [] };
const ymlLinks = YML.LINKS || {};
const ymlWebhooks = YML.WEBHOOKS || {};
const ymlFuego = YML.FUEGO || { OWNERS: ymlBot.OWNERS };
const ymlManager = YML.MANAGER || {}; 
const ymlNodes = YML.NODES || []; 

module.exports = {
  spotify: { 
    id: ymlSpotify.ID,       
    secret: ymlSpotify.Secret, 
    searchMarket: ymlSpotify.SEARCHMARKET || "US" 
  },
  bot: { owners: ymlBot.OWNERS || [], admins: ymlBot.ADMINS || [] },
  links: { support: ymlLinks.SUPPORT, mongoURI: ymlLinks.MONGO_URI },
  webhooks: { 
    error: ymlWebhooks.ERROR, static: ymlWebhooks.STATIC, server: ymlWebhooks.SERVER,
    player: ymlWebhooks.PLAYER, command: ymlWebhooks.COMMAND,
  },
  FUEGO: { 
    TOKEN: ymlFuego.TOKEN, PREFIX: ymlFuego.PREFIX || "!", EMOJIS: ymlFuego.EMOJIS || "black",
    COLOR: ymlFuego.COLOR || "#3d16ca", SHARDS: ymlFuego.SHARDS || "auto",
    PER_CLUSTER: parseInt(ymlFuego.PER_CLUSTER) || 2, TOPGGAUTH: ymlFuego.TOPGGAUTH,
    VOTEURI: ymlFuego.VOTEURI, OWNERS: ymlFuego.OWNERS || ymlBot.OWNERS || [], 
    JSK_PREFIX: ymlFuego.JSK_PREFIX || ".", JSK_ALIASES: ymlFuego.JSK_ALIASES || ["jsk"], 
    DEFAULT_SEARCH_ENGINE: ymlFuego.DEFAULT_SEARCH_ENGINE || "ytmsearch" 
  },
  MANAGER: { TOKEN: ymlManager.TOKEN, OWNER: ymlManager.OWNER },
  NODES: ymlNodes.length > 0 ? ymlNodes : [{ name: 'Fallback-options.js', url: 'localhost:2333', auth: 'youshallnotpass', secure: false }],
  EMBED_COLOR: YML.EMBED_COLOR || ymlFuego.COLOR || "#3d16ca", 
  TOPGGAUTH: YML.TOPGGAUTH || ymlFuego.TOPGGAUTH,
  VOTEURI: YML.VOTEURI || ymlFuego.VOTEURI,     
  ANIMATE: YML.ANIMATE === true 
};