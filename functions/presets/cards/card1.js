/** @format
 *
 * Fuego By Painfuego
 * Version: 6.0.0-beta
 * © 2024 Aero-Services
 */

const { AttachmentBuilder } = require("discord.js");
const genButtons = require("@gen/playerButtons.js"); 
const { createCanvas, loadImage, registerFont } = require("canvas");

// Ensure the font path is correct relative to where your bot process runs
try {
    registerFont(`${process.cwd()}/assets/fonts/alka.ttf`, { // Main font
        family: "customFont",
    });
    registerFont(`${process.cwd()}/assets/fonts/whitney.ttf`, { // Example: A common Discord-like bold font
        family: "WhitneyBold",
    });
    registerFont(`${process.cwd()}/assets/fonts/whitney.ttf`, { // Example: A common Discord-like medium font
        family: "WhitneyMedium",
    });
} catch (fontError) {
    console.error(`[Card1Preset] Failed to register font(s): ${fontError.message}.`);
}


module.exports = async (data, client, player) => {
  const baseColor = data.color || client.color || client.config?.FUEGO?.COLOR || client.config?.EMBED_COLOR || "#fae50a"; 
  const title = data.title || "Unknown Title";
  const author = data.author || "Unknown Artist";
  const duration = data.duration || "00:00";
  const thumbnailURL = data.thumbnail; 
  const progress = data.progress || 0;
  const requester = data.requester; 
  const sourceName = data.source || "Unknown";

  let botLogoImage = null;
  try {
      botLogoImage = await loadImage(`${process.cwd()}/assets/cards/input_file_0.png`); // Adjust path if logo is elsewhere
  } catch (e) {
      console.warn(`[Card1Preset] Bot logo  not found or failed to load: ${e.message}`);
  }

  let thumbnailBuffer;
  let jimpError = false;
  try {
    if (!thumbnailURL) throw new Error("Thumbnail URL is missing.");
    const Jimp = require("jimp"); 
    const image = await Jimp.read(thumbnailURL); 
    await image.cover(500, 500, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE); 
    await image.quality(85);
    thumbnailBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
  } catch (e) {
    console.error(`[Card1Preset] Jimp/Thumbnail processing error: ${e.message}.`);
    jimpError = true;
  }

  const cardWidth = 1280;
  const cardHeight = 450;
  const card = createCanvas(cardWidth, cardHeight);
  const ctx = card.getContext("2d");

  try {
    const background = await loadImage(`${process.cwd()}/assets/cards/cardBg1.png`);
    ctx.drawImage(background, 0, 0, cardWidth, cardHeight);
  } catch (e) {
    console.warn(`[Card1Preset] Failed to load background image, using solid color. ${e.message}`);
    ctx.fillStyle = "#23272A"; 
    ctx.fillRect(0, 0, cardWidth, cardHeight);
  }
  
  const thumbSize = 380; 
  const thumbX = cardWidth - thumbSize - 35; 
  const thumbY = (cardHeight - thumbSize) / 2;
  const cornerRadiusThumb = 35;

  if (thumbnailBuffer && !jimpError) {
    try {
        const thumbnailImage = await loadImage(thumbnailBuffer);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(thumbX + cornerRadiusThumb, thumbY);
        ctx.lineTo(thumbX + thumbSize - cornerRadiusThumb, thumbY);
        ctx.arcTo(thumbX + thumbSize, thumbY, thumbX + thumbSize, thumbY + cornerRadiusThumb, cornerRadiusThumb);
        ctx.lineTo(thumbX + thumbSize, thumbY + thumbSize - cornerRadiusThumb);
        ctx.arcTo(thumbX + thumbSize, thumbY + thumbSize, thumbX + thumbSize - cornerRadiusThumb, thumbY + thumbSize, cornerRadiusThumb);
        ctx.lineTo(thumbX + cornerRadiusThumb, thumbY + thumbSize);
        ctx.arcTo(thumbX, thumbY + thumbSize, thumbX, thumbY + thumbSize - cornerRadiusThumb, cornerRadiusThumb);
        ctx.lineTo(thumbX, thumbY + cornerRadiusThumb);
        ctx.arcTo(thumbX, thumbY, thumbX + cornerRadiusThumb, thumbY, cornerRadiusThumb);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(thumbnailImage, thumbX, thumbY, thumbSize, thumbSize);
        ctx.restore();
    } catch (e) {
        console.error(`[Card1Preset] Failed to draw thumbnail: ${e.message}`);
    }
  } else if (thumbnailURL && !jimpError) { 
      try {
        const fallbackThumb = await loadImage(thumbnailURL);
        // Draw fallback with rounded corners too for consistency
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(thumbX + cornerRadiusThumb, thumbY);
        ctx.lineTo(thumbX + thumbSize - cornerRadiusThumb, thumbY);
        ctx.arcTo(thumbX + thumbSize, thumbY, thumbX + thumbSize, thumbY + cornerRadiusThumb, cornerRadiusThumb);
        ctx.lineTo(thumbX + thumbSize, thumbY + thumbSize - cornerRadiusThumb);
        ctx.arcTo(thumbX + thumbSize, thumbY + thumbSize, thumbX + thumbSize - cornerRadiusThumb, thumbY + thumbSize, cornerRadiusThumb);
        ctx.lineTo(thumbX + cornerRadiusThumb, thumbY + thumbSize);
        ctx.arcTo(thumbX, thumbY + thumbSize, thumbX, thumbY + thumbSize - cornerRadiusThumb, cornerRadiusThumb);
        ctx.lineTo(thumbX, thumbY + cornerRadiusThumb);
        ctx.arcTo(thumbX, thumbY, thumbX + cornerRadiusThumb, thumbY, cornerRadiusThumb);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(fallbackThumb, thumbX, thumbY, thumbSize, thumbSize);
        ctx.restore();
      } catch (e) { console.error(`[Card1Preset] Failed to draw fallback thumbnail: ${e.message}`);}
  }

  const textAreaX = 40;
  const textAreaWidth = cardWidth - thumbSize - textAreaX - 80; 

  ctx.fillStyle = baseColor; 
  ctx.font = "bold 60px WhitneyBold, customFont, sans-serif"; 
  ctx.textAlign = "left";
  ctx.fillText(title, textAreaX, 100, textAreaWidth);

  ctx.fillStyle = "#DCDEF1"; 
  ctx.font = "45px WhitneyMedium, customFont, sans-serif";
  ctx.fillText(author, textAreaX, 170, textAreaWidth);
  
  if (requester) {
    const requesterName = typeof requester === 'string' ? (client.users.cache.get(requester)?.username || "Unknown User") : (requester.username || "Unknown User");
    ctx.fillStyle = "#B0B8BF"; 
    ctx.font = "30px WhitneyMedium, customFont, sans-serif";
    ctx.fillText(`Requested by: ${requesterName}`, textAreaX, 220, textAreaWidth);
  }

  // --- Progress Bar (MOVED UP) ---
  const progressBarTotalWidth = textAreaWidth - 20; 
  const progressBarHeight = 20; 
  const progressBarX = textAreaX;
  const progressBarY = cardHeight - 140; // MOVED UP (was cardHeight - 100)
  const currentProgressWidth = Math.max(0, (parseFloat(progress) / 100) * progressBarTotalWidth);
  const cornerRadiusProgress = progressBarHeight / 2;

  ctx.fillStyle = "rgba(255, 255, 255, 0.2)"; 
  ctx.beginPath();
  ctx.moveTo(progressBarX + cornerRadiusProgress, progressBarY);
  ctx.lineTo(progressBarX + progressBarTotalWidth - cornerRadiusProgress, progressBarY);
  ctx.arcTo(progressBarX + progressBarTotalWidth, progressBarY, progressBarX + progressBarTotalWidth, progressBarY + progressBarHeight, cornerRadiusProgress);
  ctx.lineTo(progressBarX + progressBarTotalWidth, progressBarY + progressBarHeight - cornerRadiusProgress);
  ctx.arcTo(progressBarX + progressBarTotalWidth, progressBarY + progressBarHeight, progressBarX + progressBarTotalWidth - cornerRadiusProgress, progressBarY + progressBarHeight, cornerRadiusProgress);
  ctx.lineTo(progressBarX + cornerRadiusProgress, progressBarY + progressBarHeight);
  ctx.arcTo(progressBarX, progressBarY + progressBarHeight, progressBarX, progressBarY + progressBarHeight - cornerRadiusProgress, cornerRadiusProgress);
  ctx.lineTo(progressBarX, progressBarY + cornerRadiusProgress);
  ctx.arcTo(progressBarX, progressBarY, progressBarX + cornerRadiusProgress, progressBarY, cornerRadiusProgress);
  ctx.closePath();
  ctx.fill();

  if (currentProgressWidth > 0) {
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    const effectiveBarWidth = Math.max(currentProgressWidth, cornerRadiusProgress * 2); 
    ctx.moveTo(progressBarX + cornerRadiusProgress, progressBarY);
    ctx.lineTo(progressBarX + effectiveBarWidth - cornerRadiusProgress, progressBarY);
    if (effectiveBarWidth > cornerRadiusProgress) { 
        ctx.arcTo(progressBarX + effectiveBarWidth, progressBarY, progressBarX + effectiveBarWidth, progressBarY + progressBarHeight, cornerRadiusProgress);
        ctx.lineTo(progressBarX + effectiveBarWidth, progressBarY + progressBarHeight - cornerRadiusProgress);
        ctx.arcTo(progressBarX + effectiveBarWidth, progressBarY + progressBarHeight, progressBarX + effectiveBarWidth - cornerRadiusProgress, progressBarY + progressBarHeight, cornerRadiusProgress);
    } else { 
        ctx.lineTo(progressBarX + effectiveBarWidth, progressBarY + progressBarHeight); // Simplified for very short progress
    }
    ctx.lineTo(progressBarX + cornerRadiusProgress, progressBarY + progressBarHeight);
    ctx.arcTo(progressBarX, progressBarY + progressBarHeight, progressBarX, progressBarY + progressBarHeight - cornerRadiusProgress, cornerRadiusProgress);
    ctx.lineTo(progressBarX, progressBarY + cornerRadiusProgress);
    ctx.arcTo(progressBarX, progressBarY, progressBarX + cornerRadiusProgress, progressBarY, cornerRadiusProgress);
    ctx.closePath();
    ctx.fill();
  }
  
  const circleRadius = progressBarHeight / 1.5; // Slightly larger circle for better visibility
  const circleY = progressBarY + progressBarHeight / 2; 
  const circleX = progressBarX + Math.max(circleRadius, Math.min(currentProgressWidth, progressBarTotalWidth - circleRadius)); // Clamp circle X within bar bounds

  ctx.beginPath();
  ctx.arc(circleX, circleY, circleRadius, 0, 2 * Math.PI);
  ctx.fillStyle = baseColor;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(circleX, circleY, circleRadius, 0, 2 * Math.PI);
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Time Stamps (MOVED UP with progress bar)
  const timeY = progressBarY + progressBarHeight + 30; // Adjusted spacing from bar
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 28px WhitneyBold, customFont, sans-serif";
  ctx.textAlign = "left";
  const currentTimeFormatted = client.formatTime ? client.formatTime(player?.position || 0) : "0:00";
  ctx.fillText(currentTimeFormatted, progressBarX, timeY);

  ctx.textAlign = "right";
  ctx.fillText(duration, progressBarX + progressBarTotalWidth, timeY);

  // --- Bot Logo and Footer (MOVED UP) ---
  const footerY = cardHeight - 30; 
  if (botLogoImage) {
    const logoSize = 40;
    ctx.drawImage(botLogoImage, textAreaX, footerY - logoSize + 5 , logoSize, logoSize); 
    ctx.fillStyle = "#B0B8BF";
    ctx.font = "24px WhitneyMedium, customFont, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(client.user.username, textAreaX + logoSize + 10, footerY); 
  } else { 
    ctx.fillStyle = "#B0B8BF";
    ctx.font = "24px WhitneyMedium, customFont, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Playing on ${client.user.username}`, textAreaX, footerY); 
  }
  
  ctx.fillStyle = "#B0B8BF";
  ctx.font = "italic 24px WhitneyMedium, customFont, sans-serif";
  ctx.textAlign = "right";
  const sourceNameX = cardWidth - 35; // Position from right edge of card
  const sourceNameMaxWidth = textAreaWidth - (botLogoImage ? (textAreaX + 40 + 10 + ctx.measureText(client.user.username).width + 20) : (textAreaX + ctx.measureText(`Playing on ${client.user.username}`).width + 20));
  ctx.fillText(`via ${sourceName}`, sourceNameX , footerY, sourceNameMaxWidth > 50 ? sourceNameMaxWidth : undefined);


  const buffer = card.toBuffer("image/png");
  const attachment = new AttachmentBuilder(buffer, { name: "nowplaying_card.png" });
  
  const embedInstance = new client.embed(baseColor); 
  embedInstance
    .setImage(`attachment://${attachment.name}`); // Only image in the embed

  return [[embedInstance], [attachment], [genButtons(client, player)[0]]]; 
};