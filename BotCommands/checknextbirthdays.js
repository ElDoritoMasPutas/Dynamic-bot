const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checknextbirthdays')
        .setDescription('Check upcoming birthdays in the server'),
    
    async execute(interaction) {
        // Check if command is used in the birthday channel
        const birthdayChannelId = interaction.guild.channels.cache.find(channel => 
            channel.name === '🥳🎂birthdays🎂🥳')?.id;
        
        if (!birthdayChannelId) {
            return interaction.reply({ 
                content: 'Birthday channel not found. Please set up a channel named 🥳🎂birthdays🎂🥳', 
                ephemeral: true 
            });
        }
        
        if (interaction.channelId !== birthdayChannelId) {
            return interaction.reply({ 
                content: `Please run this command in the channel <#${birthdayChannelId}> please`, 
                ephemeral: true 
            });
        }
        
        await interaction.deferReply();
        
        try {
            // Read the birthdays JSON file
            const birthdaysPath = path.resolve(__dirname, '../Json/birthdays.json');
            const birthdayData = JSON.parse(fs.readFileSync(birthdaysPath, 'utf8'));
            
            // Process birthdays
            const today = new Date();
            const upcomingBirthdays = [];
            const currentGuildId = interaction.guild.id;
            
            // First check if the current guild exists in the data
            if (birthdayData[currentGuildId]) {
                // Iterate through users in this guild
                for (const userId in birthdayData[currentGuildId]) {
                    // Check if user has birthday data
                    if (birthdayData[currentGuildId][userId] && 
                        birthdayData[currentGuildId][userId].birthday) {
                        
                        const birthdayString = birthdayData[currentGuildId][userId].birthday;
                        const [year, month, day] = birthdayString.split('-').map(num => parseInt(num));
                        
                        // Create date objects for this year and next year's birthday
                        const thisYearBirthday = new Date(today.getFullYear(), month - 1, day);
                        const nextYearBirthday = new Date(today.getFullYear() + 1, month - 1, day);
                        
                        // Calculate days until birthday
                        let birthdayDate = thisYearBirthday;
                        if (thisYearBirthday < today) {
                            birthdayDate = nextYearBirthday;
                        }
                        
                        const daysUntil = Math.ceil((birthdayDate - today) / (1000 * 60 * 60 * 24));
                        
                        // Calculate age
                        const birthYear = year;
                        const age = birthdayDate.getFullYear() - birthYear;
                        
                        // Try to fetch member to get their information
                        try {
                            const member = await interaction.guild.members.fetch(userId);
                            
                            upcomingBirthdays.push({
                                userId,
                                displayName: member.displayName,
                                avatarURL: member.displayAvatarURL({ extension: 'png', size: 256 }),
                                birthday: birthdayDate,
                                originalBirthday: birthdayString, // Store full original date
                                daysUntil,
                                age,
                                month,
                                day
                            });
                        } catch (error) {
                            console.warn(`Could not fetch member ${userId}: ${error.message}`);
                            
                            // Still add to list even if can't fetch member now
                            upcomingBirthdays.push({
                                userId,
                                displayName: `User (ID: ${userId.slice(0, 4)}...)`,
                                avatarURL: null,
                                birthday: birthdayDate,
                                originalBirthday: birthdayString, // Store full original date
                                daysUntil,
                                age,
                                month,
                                day
                            });
                        }
                    }
                }
            } else {
                // If guild not found in data
                return interaction.editReply('No birthday data found for this server.');
            }
            
            // Sort birthdays by days until
            upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);
            
            // Get the next 5 birthdays
            const nextBirthdays = upcomingBirthdays.slice(0, 5);
            
            if (nextBirthdays.length === 0) {
                return interaction.editReply('No upcoming birthdays found in the server.');
            }
            
            // Set current page to 1 (first birthday)
            const currentPage = 1;
            const pageIndex = currentPage - 1;
            
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
            
            // Create initial birthday card
            const birthdayCard = await createBirthdayCard(nextBirthdays[pageIndex]);
            const attachment = new AttachmentBuilder(birthdayCard, { name: 'birthday-card.png' });
            
            // Create embed for the birthday
            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('🎂 Upcoming Birthdays 🎂')
                .setDescription(`Here's the next birthday to celebrate!`)
                .setImage('attachment://birthday-card.png')
                .setFooter({ 
                    text: `Don't forget to wish them a happy birthday! 🎉 • ${currentPage}/${nextBirthdays.length}` 
                })
                .setTimestamp();
            
            // Create navigation buttons
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
            
            // Store birthday data for button handler
            if (!interaction.client.birthdayPages) {
                interaction.client.birthdayPages = {};
            }
            interaction.client.birthdayPages[interaction.guild.id] = nextBirthdays;
            
            // Send the initial message with the first birthday
            await interaction.editReply({
                embeds: [embed],
                files: [attachment],
                components: [row]
            });
            
        } catch (error) {
            console.error('Error in checknextbirthdays command:', error);
            return interaction.editReply({ 
                content: 'There was an error checking birthdays. Please try again later.'
            });
        }
    },
};

function getNextBirthday(birthDate) {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Create date for this year's birthday
    const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
    
    // If birthday has already occurred this year, use next year's birthday
    if (thisYearBirthday < today) {
        return new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate());
    }
    
    return thisYearBirthday;
};