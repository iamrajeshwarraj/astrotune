// utils/antiCrash.js
const Logger = require("@plugins/logger"); 

module.exports = (client) => { 
  const clientName = client?.config?.FUEGO?.CLIENT_NAME || client?.user?.username || "AntiCrash";

  Logger.log(`Loaded Anti-Crash Error Handler (UR, UE)`, "ready", clientName);

  process.on("unhandledRejection", (reason, promise) => {
    const reasonStr = String(reason);
    if (reasonStr.includes("Player is already destroyed") || (reason instanceof Error && reason.message.includes("Player is already destroyed"))) return;
    Logger.log(`Unhandled Rejection at: ${promise}\nReason: ${reason instanceof Error ? reason.stack : reason}`, "error", clientName);
    console.error("Unhandled Rejection:", reason); 
  });
  process.on("uncaughtException", (err, origin) => {
    Logger.log(`Uncaught Exception at: ${origin}\nError: ${err.stack || err}`, "error", clientName);
    console.error("Uncaught Exception:", err, "Origin:", origin); 
  });
  process.on('uncaughtExceptionMonitor', (err, origin) => { 
    Logger.log(`Uncaught Exception Monitor at: ${origin}\nError: ${err.stack || err}`, "warn", `${clientName}-Mon`);
  });
};