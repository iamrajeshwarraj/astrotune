// launcher.js
process.on("unhandledRejection", (...args) => {
  console.log("Unhandled Rejection at:", args[0] instanceof Error ? args[0].stack : args[0]);
  if (args[0] && typeof args[0] === 'object' && args[0].headers) { 
    console.log("Headers:", args[0].headers);
  }
});

const launch = async () => {
  require("dotenv").config();
  require("module-alias/register");

  // Launcher might load config if it needs parameters like ANIMATE from config.yml directly
  // For now, assuming sharder.js and client files load their own specific configs.
  let launcherConfig = {}; // Placeholder if launcher has specific settings
  try {
      const fs = require("fs");
      const yaml = require("js-yaml");
      const path = require("path");
      const configPath = path.resolve(__dirname, './config.yml');
      const fileContents = fs.readFileSync(configPath, 'utf8');
      launcherConfig = yaml.load(fileContents);
      console.log("[Launcher] Config.yml loaded for launcher.");
  } catch(e) {
      console.warn("[Launcher] Could not load config.yml for launcher, proceeding with defaults/env if possible.", e.message);
  }


  if (launcherConfig.ANIMATE === true || process.env.ANIMATE === 'true') { 
    try {
      await require("@utils/animate.js")(`
███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗
████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝
██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗
██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║
██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║
╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝`); 
    } catch (animError) {
      console.warn("[Launcher] Animation failed:", animError.message);
    }
  }

  // Sharder will load its own config needed for tokens, shard counts etc.
  require("@main/sharder.js"); 
  // If you had a non-sharded manager client run by launcher, it would also load its own config:
  // require("@root/clients/manager/index.js"); 
};
launch();