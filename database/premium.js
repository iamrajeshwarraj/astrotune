/** @format
 *
 * Fuego By Painfuego
 * Version: 6.0.0-beta
 * © 2024 Aero-Services
 */

const JOSH = require("@joshdb/core");
const JSON = require("@joshdb/json");

module.exports = new JOSH({
  name: "premium",
  provider: JSON,
  providerOptions: {
    cleanupEmpty: true,
    dataDir: "./josh-data/premium",
  },
});
