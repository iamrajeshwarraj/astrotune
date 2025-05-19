// plugins/embed.js
const { EmbedBuilder } = require("discord.js");

module.exports = class CustomEmbed extends EmbedBuilder {
    constructor(color = "#3d16ca") { // Default color, can be overridden
        super();
        if (color) { // Ensure color is provided before setting
            this.setColor(color);
        }
        // this.setTimestamp(); // Optional: add timestamp to all embeds by default
    }

    // Your custom '.desc()' method
    desc(description) {
        this.setDescription(description);
        return this; // Return 'this' for chaining
    }

    // Standard EmbedBuilder methods are inherited, like:
    // setTitle(title)
    // setThumbnail(url)
    // setImage(url)
    // setAuthor(options)
    // setFooter(options)
    // addFields(fields)

    // You can add other custom helper methods if you wish
    success(description) {
        this.setColor("#00FF00"); // Green for success
        this.setDescription(`✅ ${description}`);
        return this;
    }

    error(description) {
        this.setColor("#FF0000"); // Red for error
        this.setDescription(`❌ ${description}`);
        return this;
    }

    thumb(url) { // If you used .thumb() and meant setThumbnail
        if (url) this.setThumbnail(url);
        return this;
    }
}