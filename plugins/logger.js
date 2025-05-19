// plugins/logger.js
const chalk = require("chalk");
const moment = require("moment");

module.exports = class Logger {
  static log(content, type = "log", clientName = "Process") {
    const date = moment().format("DD-MM-YYYY hh:mm:ss");
    const logTypeColors = {
      log: { headingColor: (text) => chalk.hex("#ffffff")(text), display: "Log" },
      warn: { headingColor: (text) => chalk.hex("#ffaa00")(text), display: "Warning" },
      error: { headingColor: (text) => chalk.hex("#ff2200")(text), display: "Error" },
      debug: { headingColor: (text) => chalk.hex("#dddd55")(text), display: "Debug" },
      cmd: { headingColor: (text) => chalk.hex("#ff2277")(text), display: "Command" },
      event: { headingColor: (text) => chalk.hex("#0088cc")(text), display: "Event" },
      ready: { headingColor: (text) => chalk.hex("#77ee55")(text), display: "Ready" },
      database: { headingColor: (text) => chalk.hex("#55cc22")(text), display: "Database" },
      cluster: { headingColor: (text) => chalk.hex("#00cccc")(text), display: "Cluster" },
      player: { headingColor: (text) => chalk.hex("#22aaff")(text), display: "Player" },
      lavalink: { headingColor: (text) => chalk.hex("#ff8800")(text), display: "Lavalink" },
    };
    const logStyle = logTypeColors[type] || logTypeColors.log; 
    const clientToDisplay = String(clientName).length > 15 ? String(clientName).substring(0, 15) : String(clientName);
    const logMessage =
      chalk.bold(
        `${chalk.hex("#2222FF")(date)} -   ` +
          `${chalk.hex("#222255")(clientToDisplay)} ` +
          `${" ".repeat(Math.max(0, 17 - clientToDisplay.length))}=>   ` + 
          `${logStyle.headingColor(
            logStyle.display + " ".repeat(Math.max(0, 8 - logStyle.display.length)),
          )} - `,
      ) + `${chalk.hex("#880088")(content)}`;
    console.log(logMessage);
  }
};