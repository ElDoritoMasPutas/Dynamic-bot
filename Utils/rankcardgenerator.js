const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');

class EnhancedRankCard {
  constructor() {
    // Register custom fonts
    try {
      registerFont(path.join(process.cwd(), 'src', 'Images', 'DancingScript-Regular.ttf'), { family: 'Dancing Script' });
      const poppinsRegularPath = path.join(process.cwd(), 'src', 'Images', 'Poppins-Regular.ttf');
      const poppinsBoldPath = path.join(process.cwd(), 'src', 'Images', 'Poppins-Bold.ttf');
      if (fs.existsSync(poppinsRegularPath)) {
        registerFont(poppinsRegularPath, { family: 'Poppins' });
      }
      if (fs.existsSync(poppinsBoldPath)) {
        registerFont(poppinsBoldPath, { family: 'Poppins Bold' });
      }
    } catch (error) {
      console.error('Error registering fonts:', error);
    }
    
    // Card dimensions
    this.width = 934;
    this.height = 282;
    
    // Default theme (will be merged with user theme)
    this.theme = {
      primary: '#5865F2',
      secondary: '#36393F',
      tertiary: '#2F3136',
      quaternary: '#202225',
      text: '#FFFFFF',
      subtext: '#B9BBBE',
      displayNameColor: '#FFFFFF',
      usernameColor: '#B9BBBE', // default fallback
      levelColor: '#00FF00',
      levelText: 'LEVEL',
      rankColor: '#FFFFFF',
      progressBarColor: '#5865F2',
      progressBackground: '#484B51',
      progressFillStart: '#5865F2',
      progressFillEnd: '#5865F2',
      xpTextColor: '#FFFFFF',
      useProgressGradient: false
    };
    
    // Card data defaults
    this.username = 'User';
    this.displayName = 'User';
    this.avatar = null;
    this.status = 'online';
    this.level = 1;
    this.rank = 1;
    this.currentXP = 0;
    this.requiredXP = 100;
    this.background = null;
    this.customBadges = [];
  }
  
  // Setters for customization
  setUsername(username) {
    this.username = username;
    return this;
  }
  
  setDisplayName(displayName) {
    this.displayName = displayName;
    return this;
  }
  
  setAvatar(avatarURL) {
    this.avatar = avatarURL;
    return this;
  }
  
  setStatus(status) {
    this.status = status;
    return this;
  }
  
  setLevel(level) {
    this.level = level;
    return this;
  }
  
  setRank(rank) {
    this.rank = rank;
    return this;
  }
  
  setCurrentXP(xp) {
    this.currentXP = xp;
    return this;
  }
  
  setRequiredXP(xp) {
    this.requiredXP = xp;
    return this;
  }
  
  setBackground(backgroundURL) {
    this.background = backgroundURL;
    return this;
  }
  
  setTheme(theme) {
    // Merge the new theme with defaults and log for debugging.
    this.theme = { ...this.theme, ...theme };
    console.log("Merged theme:", this.theme);
    return this;
  }
  
  addBadge(badgeURL, tooltip) {
    this.customBadges.push({ url: badgeURL, tooltip });
    return this;
  }
  
  // Helper function to load an image safely
  async loadImageSafely(url) {
    try {
      return await loadImage(url);
    } catch (error) {
      console.error(`Error loading image from ${url}:`, error);
      const canvas = createCanvas(1, 1);
      return canvas;
    }
  }
  
  roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  
  // Generate the rank card image
  async build() {
    const canvas = createCanvas(this.width, this.height);
    const ctx = canvas.getContext('2d');
    
    // Draw base background
    ctx.fillStyle = this.theme.quaternary;
    ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw background image if available with overlay for contrast
    if (this.background) {
      try {
        const bgImage = await this.loadImageSafely(this.background);
        ctx.save();
        ctx.globalAlpha = 0.7; // 70% opacity for the background image
        ctx.drawImage(bgImage, 0, 0, this.width, this.height);
        ctx.restore();
        
        ctx.save();
        ctx.fillStyle = this.theme.quaternary;
        ctx.globalAlpha = 0.4; // 40% overlay for contrast
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
      } catch (error) {
        console.error('Error loading background image:', error);
      }
    }
    
    // Draw the main card area with 80% opacity for extra transparency
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = this.theme.tertiary;
    this.roundedRect(ctx, 20, 20, this.width - 40, this.height - 40, 20);
    ctx.fill();
    ctx.restore();
    
    // Load avatar image (or default if not provided)
    let avatarImage;
    if (this.avatar) {
      avatarImage = await this.loadImageSafely(this.avatar);
    } else {
      avatarImage = await this.loadImageSafely('https://cdn.discordapp.com/embed/avatars/0.png');
    }
    
    // Draw avatar container
    ctx.fillStyle = this.theme.quaternary;
    ctx.beginPath();
    ctx.arc(140, 141, 90, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw circular avatar image
    ctx.save();
    ctx.beginPath();
    ctx.arc(140, 141, 80, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImage, 60, 61, 160, 160);
    ctx.restore();
    
    // Draw status indicator
    const statusColors = {
      online: '#43B581',
      idle: '#FAA61A',
      dnd: '#F04747',
      offline: '#747F8D'
    };
    ctx.beginPath();
    ctx.arc(208, 210, 20, 0, Math.PI * 2);
    ctx.fillStyle = this.theme.tertiary;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(208, 210, 15, 0, Math.PI * 2);
    ctx.fillStyle = statusColors[this.status.toLowerCase()] || statusColors.offline;
    ctx.fill();
    
    // Define fonts
    const mainFont = "'Poppins Bold', 'Arial Bold', 'Helvetica Bold', sans-serif";
    const subFont = "'Poppins', Arial, Helvetica, sans-serif";
    
    // Draw display name
    ctx.fillStyle = this.theme.displayNameColor || this.theme.text;
    ctx.font = `32px ${mainFont}`;
    ctx.textAlign = 'left';
    ctx.fillText(this.displayName, 260, 100);
    
    // Add a subtle text shadow for the username to improve contrast
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    // Draw username using the merged theme's usernameColor
    console.log("Drawing username with usernameColor:", this.theme.usernameColor);
    ctx.fillStyle = this.theme.usernameColor || this.theme.subtext;
    ctx.font = `20px ${subFont}`;
    ctx.fillText(`@${this.username}`, 260, 130);
    ctx.restore();
    
    // Draw divider
    ctx.fillStyle = this.theme.quaternary;
    ctx.fillRect(260, 145, this.width - 260 - 20, 2);
    
    // Draw rank text
    ctx.fillStyle = this.theme.rankColor || this.theme.text;
    ctx.font = `38px ${mainFont}`;
    ctx.textAlign = 'right';
    ctx.fillText(`RANK #${this.rank}`, this.width - 20, 90);
    
    // Draw level text
    ctx.fillStyle = this.theme.levelColor || this.theme.primary;
    ctx.font = `32px ${mainFont}`;
    ctx.textAlign = 'left';
    ctx.fillText(`${this.theme.levelText || 'LEVEL'} ${this.level}`, 260, 190);
    
    // Draw XP progress bar
    const barWidth = 640;
    const barHeight = 30;
    const barX = 260;
    const barY = 200;
    ctx.fillStyle = this.theme.progressBackground;
    this.roundedRect(ctx, barX, barY, barWidth, barHeight, barHeight / 2);
    ctx.fill();
    
    const progress = Math.min(this.currentXP / this.requiredXP, 1);
    const progressWidth = Math.max(barWidth * progress, 10);
    if (this.theme.useProgressGradient) {
      const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
      gradient.addColorStop(0, this.theme.progressFillStart || this.theme.primary);
      gradient.addColorStop(1, this.theme.progressFillEnd || this.theme.primary);
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = this.theme.progressBarColor || this.theme.primary;
    }
    if (progressWidth > barHeight / 2) {
      this.roundedRect(ctx, barX, barY, progressWidth, barHeight, barHeight / 2);
    } else {
      ctx.beginPath();
      ctx.arc(barX + barHeight / 2, barY + barHeight / 2, barHeight / 2, 0, Math.PI * 2);
    }
    ctx.fill();
    
    // Draw XP text
    ctx.fillStyle = this.theme.xpTextColor || this.theme.text;
    ctx.font = `18px ${subFont}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${this.currentXP.toLocaleString()} / ${this.requiredXP.toLocaleString()} XP`, barX + barWidth, barY + barHeight + 25);
    
    // Draw badges if available
    if (this.customBadges.length > 0) {
      const badgeSize = 40;
      const badgeSpacing = 10;
      const badgeStartX = barX;
      const badgeY = barY + barHeight + 35;
      for (let i = 0; i < Math.min(this.customBadges.length, 5); i++) {
        const badgeImage = await this.loadImageSafely(this.customBadges[i].url);
        ctx.drawImage(badgeImage, badgeStartX + (badgeSize + badgeSpacing) * i, badgeY, badgeSize, badgeSize);
      }
    }
    
    return canvas.toBuffer('image/png');
  }
}

module.exports = EnhancedRankCard;
