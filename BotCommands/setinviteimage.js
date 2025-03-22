// src/commands/setinviteimage.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setinviteimage')
    .setDescription('Set the image for the invite tracker.')
    .addStringOption((option) =>
      option
        .setName('image_url')
        .setDescription('The URL of the image.')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const imageUrl = interaction.options.getString('image_url');

    // Validate that the URL ends with an image extension (case-insensitive)
    if (!imageUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
      return interaction.reply({
        content:
          'Please provide a valid image URL ending with `.jpeg`, `.jpg`, `.png`, `.gif`, or `.webp`.',
        ephemeral: true,
      });
    }

    const inviteImagesDir = path.join(__dirname, '../Json');
    const inviteImagesPath = path.join(inviteImagesDir, 'inviteImages.json');

    // Ensure the directory exists
    if (!fs.existsSync(inviteImagesDir)) {
      fs.mkdirSync(inviteImagesDir, { recursive: true });
    }

    let inviteImages = {};
    if (fs.existsSync(inviteImagesPath)) {
      try {
        inviteImages = JSON.parse(fs.readFileSync(inviteImagesPath, 'utf-8'));
      } catch (error) {
        console.error('Error reading inviteImages.json:', error);
        return interaction.reply({
          content: '❌ An error occurred while accessing the configuration file.',
          ephemeral: true,
        });
      }
    }

    inviteImages[interaction.guild.id] = imageUrl;

    try {
      fs.writeFileSync(inviteImagesPath, JSON.stringify(inviteImages, null, 2));
      await interaction.reply({
        content: '✅ Welcome image has been set successfully!',
        ephemeral: true,
      });
    } catch (error) {
      console.error('Error writing inviteImages.json:', error);
      await interaction.reply({
        content: '❌ An error occurred while saving the welcome image.',
        ephemeral: true,
      });
    }
  },
};
