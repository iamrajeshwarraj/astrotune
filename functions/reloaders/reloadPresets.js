module.exports = async (client) => {
  let functionFile = Object.keys(require.cache).filter(
    (f) => f.includes("presets") && !f.includes("node_modules"),
  );

  for (key of functionFile) {
    try {
      delete require.cache[require.resolve(key)];
    } catch (e) {}
  }

  return `Re-Loaded Presets`;
};
