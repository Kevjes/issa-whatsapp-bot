"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomWelcomeImage = getRandomWelcomeImage;
exports.isValidImageUrl = isValidImageUrl;
const config_1 = require("../config");
function getRandomWelcomeImage() {
    const images = config_1.config.welcome.images;
    if (!images || images.length === 0) {
        return 'https://i.ibb.co/60XL01BH/Chat-GPT-Image-Jul-23-2025-11-05-00-PM.png';
    }
    const randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex];
}
function isValidImageUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=imageUtils.js.map