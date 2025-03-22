const { EmbedBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(interaction, client) {
        // Only handle button interactions
        if (!interaction.isButton()) return;
        
        // Check if this is for the birthday navigation
        if (interaction.customId !== 'previous' && interaction.customId !== 'next') return;
        
        try {
            // Check if we have stored birthday data
            const guildId = interaction.guild.id;
            if (!interaction.client.birthdayPages || 
                !interaction.client.birthdayPages[guildId] || 
                interaction.client.birthdayPages[guildId].length === 0) {
                
                return interaction.update({
                    content: 'Birthday data is no longer available. Please run the command again.',
                    embeds: [],
                    components: [],
                    files: []
                });
            }
            
            // Get the original message embed
            const message = interaction.message;
            const embed = message.embeds[0];
            
            if (!embed || !embed.footer || !embed.footer.text) return;
            
            // Extract current page and total pages from footer
            const footerMatch = embed.footer.text.match(/(\d+)\/(\d+)/);
            if (!footerMatch) return;
            
            let currentPage = parseInt(footerMatch[1]);
            const totalPages = parseInt(footerMatch[2]);
            
            // Update current page based on which button was clicked
            if (interaction.customId === 'previous') {
                currentPage--;
            } else if (interaction.customId === 'next') {
                currentPage++;
            }
            
            // Ensure page is within bounds
            if (currentPage < 1) currentPage = 1;
            if (currentPage > totalPages) currentPage = totalPages;
            
            // Get birthday data for the current page
            const nextBirthdays = interaction.client.birthdayPages[guildId];
            const pageIndex = currentPage - 1;
            const currentBirthday = nextBirthdays[pageIndex];
            
            // Function to render text with background
            function renderTextWithBackground(ctx, text, x, y, options = {}) {
                const {
                    font = '30px sans-serif',
                    fillStyle = '#000000',
                    backgroundColor = 'rgba(255, 255, 255, 0.7)',
                    padding = 10,
                    borderRadius = 5
                } = options;

                // Shift x-coordinate 50 pixels to the left
                x -= 50;

                // Measure text
                ctx.font = font;
                const textMetrics = ctx.measureText(text);
                const textHeight = parseInt(font, 10);

                // Calculate text box dimensions
                const textWidth = textMetrics.width;
                const boxHeight = textHeight + padding * 2;
                const boxWidth = textWidth + padding * 2;

                // Draw background with slight transparency
                ctx.fillStyle = backgroundColor;
                ctx.beginPath();
                ctx.roundRect(x - textWidth / 2 - padding, y - textHeight / 2, boxWidth, boxHeight, borderRadius);
                ctx.fill();

                // Render text
                ctx.fillStyle = options.fillStyle || '#000000';
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'center';
                ctx.fillText(text, x, y);
            }
            
            // Function to create Canvas for birthday
            async function createBirthdayCard(birthday) {
                const canvas = createCanvas(800, 400);
                const ctx = canvas.getContext('2d');
                
                try {
                    // Load and draw custom background image
                    const backgroundPath = path.resolve(__dirname, '../Images/birthdaybg.png');
                    const backgroundImage = await loadImage(backgroundPath);
                    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
                } catch (error) {
                    console.error('Error loading background image:', error);
                    // Fallback to solid color background if image fails to load
                    ctx.fillStyle = '#FF69B4';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Add decorative elements
                    ctx.fillStyle = '#FFC0CB';
                    ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);
                }
                
                // Draw header with improved text rendering
                renderTextWithBackground(ctx, 'Upcoming Birthday!', canvas.width / 2, 70, {
                    font: 'bold 40px sans-serif',
                    fillStyle: '#FF1493',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)'
                });
                
                // Process display name with more comprehensive handling for special characters
                let displayName = birthday.displayName;
                let processedName = '';
                
                // Go through each character in the display name
                for (let i = 0; i < displayName.length; i++) {
                    const char = displayName.charAt(i);
                    const code = displayName.charCodeAt(i);
                    
                    // Handle standard ASCII characters (0-127) directly
                    if (code >= 32 && code <= 126) {
                        processedName += char;
                    }
                    // Handle some common emoji and symbols
                    else if (/\p{Emoji}/u.test(char)) {
                        // Keep emoji characters if possible
                        try {
                            const testCanvas = createCanvas(50, 50);
                            const testCtx = testCanvas.getContext('2d');
                            testCtx.font = '20px sans-serif';
                            testCtx.fillText(char, 10, 10);
                            processedName += char;  // If we get here, it rendered ok
                        } catch (e) {
                            processedName += '😊'; // Fallback emoji
                        }
                    }
                    // For other Unicode ranges, convert to closest ASCII equivalent
                    else {
                        // Attempt to normalize
                        try {
                            const normalized = char.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
                            if (normalized && normalized.match(/[a-zA-Z0-9\s\.,!?]/)) {
                                processedName += normalized;
                            }
                        } catch (e) {
                            // Skip problematic character
                        }
                    }
                }
                
                // Clean up and ensure display name
                processedName = processedName.trim();
                displayName = processedName || `User ${birthday.userId.slice(0, 4)}`;
                
                // Draw name with improved text rendering
                renderTextWithBackground(ctx, displayName, canvas.width / 2, 140, {
                    font: 'bold 50px sans-serif',
                    fillStyle: '#FF1493',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)'
                });
                
                // Render birthday information with improved text backgrounds
                renderTextWithBackground(ctx, `Full Birthdate: ${birthday.originalBirthday.replace(/-/g, '-')}`, 
                    canvas.width / 2, 190);
                
                renderTextWithBackground(ctx, 
                    `Birthday: ${birthday.birthday.toLocaleString('default', { month: 'long' })} ${birthday.birthday.getDate()}`, 
                    canvas.width / 2, 230
                );
                
                // Days until message with special handling
                let daysMessage = '';
                let daysColor = '#000000';
                
                if (birthday.daysUntil === 0) {
                    daysMessage = 'TODAY!';
                    daysColor = '#FF0000';
                } else if (birthday.daysUntil === 1) {
                    daysMessage = 'Tomorrow!';
                    daysColor = '#FF4500';
                } else {
                    daysMessage = `${birthday.daysUntil} days until birthday`;
                }
                
                renderTextWithBackground(ctx, daysMessage, canvas.width / 2, 270, {
                    fillStyle: daysColor
                });
                
                // Age message
                renderTextWithBackground(ctx, `Turning: ${birthday.age}`, canvas.width / 2, 310);
                
                // Add user avatar if available
                if (birthday.avatarURL) {
                    try {
                        const avatar = await loadImage(birthday.avatarURL);
                        
                        // Create circular clipping path
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(canvas.width - 120, 120, 80, 0, Math.PI * 2, true);
                        ctx.closePath();
                        ctx.clip();
                        
                        // Draw avatar
                        ctx.drawImage(avatar, canvas.width - 200, 40, 160, 160);
                        ctx.restore();
                    } catch (error) {
                        console.error('Error loading avatar:', error);
                    }
                }
                
                return canvas.toBuffer();
            }
            
            // Defer the update to avoid interaction timeouts
            await interaction.deferUpdate().catch(console.error);
            
            // Create birthday card for current page
            const birthdayCard = await createBirthdayCard(currentBirthday);
            const attachment = new AttachmentBuilder(birthdayCard, { name: 'birthday-card.png' });
            
            // Create updated embed
            const updatedEmbed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('🎂 Upcoming Birthdays 🎂')
                .setDescription(`Here's the next birthday to celebrate!`)
                .setImage('attachment://birthday-card.png')
                .setFooter({ 
                    text: `Don't forget to wish them a happy birthday! 🎉 • ${currentPage}/${nextBirthdays.length}` 
                })
                .setTimestamp();
            
            // Create updated buttons
            const row = new ActionRowBuilder();
            
            // Previous button
            const previousButton = new ButtonBuilder()
                .setCustomId('previous')
                .setLabel('◀️ Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 1);
            
            // Next button
            const nextButton = new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next ▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === nextBirthdays.length);
            
            row.addComponents(previousButton, nextButton);
            
            // Update the message
            await interaction.editReply({
                embeds: [updatedEmbed],
                files: [attachment],
                components: [row]
            }).catch(console.error);
            
        } catch (error) {
            console.error('Error handling birthday navigation:', error);
            
            // Try to respond even if there's an error
            try {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.reply({ 
                        content: 'There was an error navigating the birthdays. Please try again later.', 
                        ephemeral: true 
                    });
                } else {
                    await interaction.followUp({ 
                        content: 'There was an error navigating the birthdays. Please try again later.', 
                        ephemeral: true 
                    });
                }
            } catch (replyError) {
                console.error('Error sending error message:', replyError);
            }
        }
    },
};