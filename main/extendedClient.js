// main/extendedClient.js
const Jishaku = require("dokdo");
require("module-alias/register");
const { ClusterClient, getInfo } = require("discord-hybrid-sharding");
const {
  Collection,
  Partials,
  Client,
  WebhookClient,
  GatewayIntentBits,
} = require("discord.js");
const path = require("path");
const fs = require("fs");

module.exports = class ExtendedClient extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
      ],
      failIfNotExists: false,
      restRequestTimeout: 60000,
      rest: { timeout: 60000 },
      sweepers: { messages: { interval: 1800, lifetime: 1800 } },
      allowedMentions: { repliedUser: false, parse: ["users", "roles"] },
      partials: [
        Partials.User,
        Partials.Channel,
        Partials.Message,
        Partials.GuildMember,
      ],
      shards: getInfo().SHARD_LIST,
      shardCount: getInfo().TOTAL_SHARDS,
    });

    this.setMaxListeners(25);
    this.manager = null;
    this.cluster = new ClusterClient(this);
    this.aliases = new Collection();
    this.commands = new Collection();
    this.cooldowns = new Collection();
    this.guildTrackMessages = new Map();

    try {
      this.config = require(path.resolve(__dirname, "../config/options.js"));
      // console.log(`[ExtendedClient ${process.pid}] Loaded config from options.js`);
    } catch (e) {
      console.error(
        `[ExtendedClient ${process.pid}] CRITICAL: Failed to load config from options.js`,
        e
      );
      process.exit(1);
    }

    this.owners = this.config.bot?.owners || [];
    this.admins = this.config.bot?.admins || [];
    this.support = this.config.links?.support;

    this.button = require("@plugins/button.js");
    this.LoggerClass = require("@plugins/logger.js");
    this.embed = require("@plugins/embed.js"); // Assigns the CLASS exported by @plugins/embed.js

    this.db = {
      pfx: require("@db/prefix.js"),
      coins: require("@db/coins.js"),
      preset: require("@db/preset.js"),
      ignore: require("@db/ignore.js"),
      premium: require("@db/premium.js"),
      vouchers: require("@db/vouchers.js"),
      blacklist: require("@db/blacklist.js"),
      twoFourSeven: require("@db/twoFourSeven.js"),
    };
    this.formatTime = require("@formatters/formatTime.js");
    this.formatBytes = require("@formatters/formatBytes.js");

    try {
      this.categories = fs.readdirSync(path.resolve(__dirname, "../commands"));
    } catch (e) {
      this.log(
        `CRITICAL: Failed to load command categories. Path: ${path.resolve(__dirname, "../commands")}. Error: ${e.message}`,
        "error"
      );
      this.categories = [];
    }

    this.once("ready", async () => {
      if (typeof require("@functions/handleReadyEvent.js") === "function") {
        await require("@functions/handleReadyEvent.js")(this);
      } else {
        this.log(
          "handleReadyEvent.js not found or not a function.",
          "warn",
          "EventHandler"
        );
      }
    });

    if (!this.manager && this.config) {
      require("@plugins/player.js")(this);
    }
  }

  log = (message, type = "log", clientNameParam) => {
    const clientName =
      clientNameParam ||
      this.user?.username ||
      this.config?.FUEGO?.CLIENT_NAME ||
      `ExtClient[${this.shard?.ids?.join(",") || "S"}]`;
    if (this.LoggerClass && typeof this.LoggerClass.log === "function") {
      return this.LoggerClass.log(message, type, clientName);
    }
    console.log(
      `[NoLogger/Fallback][${type.toUpperCase()}] (${clientName}) ${message}`
    );
  };
  sleep = (t) => new Promise((r) => setTimeout(r, t));
  getPlayer = async (id) => this.manager?.getPlayer(id) || null;

  connect = async (token, prefix, emojiSet, color, topggauth, voteUri) => {
    this.prefix = prefix || this.config?.FUEGO?.PREFIX || "!";
    this.emojiSet = emojiSet || this.config?.FUEGO?.EMOJIS || "black";
    this.color =
      color ||
      this.config?.FUEGO?.COLOR ||
      this.config?.EMBED_COLOR ||
      "#2c2d31";
    this.topGgAuth =
      topggauth || this.config?.FUEGO?.TOPGGAUTH || this.config?.TOPGGAUTH;
    this.vote = voteUri || this.config?.FUEGO?.VOTEURI || this.config?.VOTEURI;
    try {
      this.emoji = require("@assets/emoji.js")[this.emojiSet];
    } catch (e) {
      this.log(
        `Failed to load emoji set '${this.emojiSet}'. Error: ${e.message}`,
        "warn"
      );
      this.emoji = {};
    }
    this.webhooks = {};
    if (this.config.webhooks) {
      Object.keys(this.config.webhooks).forEach((key) => {
        if (this.config.webhooks[key])
          this.webhooks[key] = new WebhookClient({
            url: this.config.webhooks[key],
          });
      });
    }
    const jskOwners = this.config.FUEGO?.OWNERS || this.owners || [];
    if (jskOwners.length === 0)
      this.log("Warning: No JSK owners defined.", "warn");
    this.jsk = new Jishaku.Client(this, {
      aliases: this.config.FUEGO?.JSK_ALIASES || ["jsk"],
      prefix: this.config.FUEGO?.JSK_PREFIX || this.prefix,
      owners: jskOwners,
    });

    // Load your actual command and event handlers here
    // e.g., require('@handlers/commandHandler.js')(this);
    // e.g., require('@handlers/eventHandler.js')(this);

    this.log(`Attempting to connect with token...`, "info", "ClientConnect");
    await super.login(token).catch((error) => {
      this.log(`Client login FAILED: ${error.message}`, `error`);
      console.error("LOGIN FAILED:", error);
      process.exit(1);
    });
  };
};
