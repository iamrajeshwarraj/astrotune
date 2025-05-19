// plugins/embed.js
const { EmbedBuilder } = require("discord.js");

module.exports = class CustomEmbed extends EmbedBuilder {
    constructor(color = "#3d16ca") {
        super();
        if (color) {
            this.setColor(color);
        }
    }

    desc(description) {
        this.setDescription(description);
        return this;
    }

    success(description) {
        this.setColor("#00FF00");
        this.setDescription(`✅ ${description}`);
        return this;
    }

    error(description) {
        this.setColor("#FF0000");
        this.setDescription(`❌ ${description}`);
        return this;
    }

    thumb(url) {
        if (url) this.setThumbnail(url);
        return this;
    }

    // ADDING ALIAS:
    title(title) {
        return this.setTitle(title); // Call the actual setTitle method
    }
}