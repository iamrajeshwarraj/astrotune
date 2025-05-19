// main/sharder.js
/** @format ... */

const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");
const { ClusterManager } = require("discord-hybrid-sharding");
const Logger = require("@plugins/logger"); 

let sharderLevelConfig; // Config specifically for sharder (e.g., which clients to run, their tokens)
try {
    const configPath = path.resolve(__dirname, '../config.yml'); 
    const fileContents = fs.readFileSync(configPath, 'utf8');
    sharderLevelConfig = yaml.load(fileContents);
    Logger.log("Config.yml loaded for Sharder process.", "info", "SharderSetup");
} catch (e) {
    console.error("CRITICAL ERROR [Sharder]: Failed to load or parse config.yml:", e);
    Logger.log(`Sharder: Failed to load config.yml: ${e.message}`, "error", "SharderSetup");
    process.exit(1); 
}

// Define client configurations based on sharderLevelConfig
// This array should contain objects describing each client type you want to shard
const clientProcessConfigs = [
  {
    file: path.resolve(__dirname, "../clients/fuego/fuego.js"), // Path to the main file for your "Fuego" client
    token: sharderLevelConfig.FUEGO?.TOKEN, // FUEGO specific token from config.yml
    shards: sharderLevelConfig.FUEGO?.SHARDS || "auto",
    perCluster: sharderLevelConfig.FUEGO?.PER_CLUSTER || 2,
    name: "FuegoClient" // A name for this client type for logging
  },
  // If you have another type of client (e.g., a "Manager" client that's different from "Fuego")
  // {
  //   file: path.resolve(__dirname, "../clients/manager/index.js"), 
  //   token: sharderLevelConfig.MANAGER?.TOKEN, 
  //   // ... other settings for manager client ...
  //   name: "ManagerClient" 
  // }
];

clientProcessConfigs.forEach((clientSettings) => {
  if (!clientSettings.token) {
      Logger.log(`Token missing for client configuration: ${clientSettings.name}. Skipping this client.`, "error", "Sharder");
      return; 
  }
  const manager = new ClusterManager(clientSettings.file, {
    totalShards: clientSettings.shards,
    shardsPerClusters: parseInt(clientSettings.perCluster) || 2,
    mode: "process", 
    token: clientSettings.token, // This token is used by discord-hybrid-sharding for its internal work
    restarts: { max: 5, interval: 60000 }, 
    respawn: true,
  });

  manager.on("clusterCreate", (cluster) => Logger.log(`Launched Cluster ${cluster.id} for ${clientSettings.name}`, "cluster", "Sharder"));
  manager.on("debug", (info) => {
    if (typeof info === 'string' && (info.includes('[Heartbeat]') || info.includes('Triggering Shard Respawn'))) return;
    Logger.log(String(info), "debug", `Sharder[CM]-${clientSettings.name}`);
  });
  manager.spawn({ timeout: -1 })
    .then(() => Logger.log(`All clusters for ${clientSettings.name} spawned.`, "info", "Sharder"))
    .catch(err => Logger.log(`Error spawning for ${clientSettings.name}: ${err.message || err}`, "error", "Sharder"));
});

// Lavalink (run separately or manage with PM2 for better reliability)
// const { exec } = require("child_process");
// exec("java -jar Lavalink.jar", (error, stdout, stderr) => {
//   if (error) Logger.log(`Lavalink exec error: ${error.message}`, "error", "LavaProc");
//   if (stderr) Logger.log(`Lavalink stderr: ${stderr}`, "error", "LavaProcErr");
//   // stdout will contain Lavalink logs
// });
// Logger.log("Attempted to start Lavalink process (if exec is uncommented).", "info", "Sharder");

console.log("[Sharder] Sharder setup processing complete.");