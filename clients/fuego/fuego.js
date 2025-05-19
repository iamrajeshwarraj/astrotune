// clients/fuego/fuego.js
/** @format ... */

require("module-alias/register"); 
const path = require("path");

const ExtendedClient = require(path.resolve(__dirname, "../../main/extendedClient.js")); 

const client = new ExtendedClient(); 

require("@utils/antiCrash.js")(client); 

const fuegoconfig = client.config.FUEGO || {}; 

client.connect(
  fuegoconfig.TOKEN,
  fuegoconfig.PREFIX,
  fuegoconfig.EMOJIS,
  fuegoconfig.COLOR,
  fuegoconfig.TOPGGAUTH,
  fuegoconfig.VOTEURI
);

module.exports = client; 