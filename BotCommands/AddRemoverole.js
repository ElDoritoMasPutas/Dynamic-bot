const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Adds or removes a role from a user.')
        .addSubcommand(subcommand => 
            subcommand.setName('add')
                .setDescription('Adds a role to a user.')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('The user to assign the role to')
                        .setRequired(true)
                )
                .addRoleOption(option => 
                    option.setName('role')
                        .setDescription('The role to assign')
                        .setRequired(true)
                )
                .addStringOption(option => 
                    option.setName('reason')
                        .setDescription('Reason for adding the role')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand => 
            subcommand.setName('remove')
                .setDescription('Removes a role from a user.')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('The user to remove the role from')
                        .setRequired(true)
                )
                .addRoleOption(option => 
                    option.setName('role')
                        .setDescription('The role to remove')
                        .setRequired(true)
                )
                .addStringOption(option => 
                    option.setName('reason')
                        .setDescription('Reason for removing the role')
                        .setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');
        const reason = interaction.options.getString('reason');
        const member = await interaction.guild.members.fetch(user.id);
        const botUser = interaction.client.user;
        const guild = interaction.guild;

        if (!member) {
            return interaction.reply({ content: 'User not found.', ephemeral: true });
        }

        try {
            let action, actionColor;
            if (subcommand === 'add') {
                if (member.roles.cache.has(role.id)) {
                    return interaction.reply({ content: `${user.tag} already has the role **${role.name}**.`, ephemeral: true });
                }
                await member.roles.add(role, reason);
                action = 'Role Added';
                actionColor = 0x00ff00;
            } else if (subcommand === 'remove') {
                if (!member.roles.cache.has(role.id)) {
                    return interaction.reply({ content: `${user.tag} does not have the role **${role.name}**.`, ephemeral: true });
                }
                await member.roles.remove(role, reason);
                action = 'Role Removed';
                actionColor = 0xff0000;
            }

            const roleEmbed = new EmbedBuilder()
                .setColor(0x000000)
                .setTitle(action)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setAuthor({ name: botUser.username, iconURL: botUser.displayAvatarURL() })
                .setDescription(`**<@${user.id}>** has been updated.`)
                .addFields(
                    { name: 'Responsible Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Role Chosen', value: role.name, inline: true },
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'User ID', value: user.id, inline: true }
                )
                .setImage('https://media.tenor.com/srI_Rpi-Y6IAAAAi/arceus-pok%C3%A9mon.gif')
                .setFooter({ text: guild.name, iconURL: botUser.displayAvatarURL() });

            let logChannel = guild.channels.cache.find(ch => ch.name === 'role-logs' && ch.isTextBased());
            if (!logChannel) {
                try {
                    logChannel = await guild.channels.create({
                        name: 'role-logs',
                        type: 0,
                        permissionOverwrites: [
                            {
                                id: guild.id,
                                deny: [PermissionFlagsBits.ViewChannel],
                            }
                        ]
                    });
                } catch (error) {
                    console.log('Failed to create log channel:', error);
                }
            }

            if (logChannel) {
                await logChannel.send({ embeds: [roleEmbed] });
            } else {
                console.log('Log channel not found or could not be created. Sending log to the command channel.');
                await interaction.channel.send({ embeds: [roleEmbed] });
            }

            await interaction.reply({ content: `**${user.tag} has been updated successfully.**`, ephemeral: true });
        } catch (error) {
            console.error(`Error modifying role: ${error}`);
            await interaction.reply({ content: 'There was an error trying to modify the role.', ephemeral: true });
        }
    }
};