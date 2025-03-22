const reactionRolesUtil = require('../Utils/reactionRolesUtil');

module.exports = {
  name: 'messageReactionAdd',  // Discord event name
  async execute(reaction, user, client) {
    if (user.bot) return;
    // Handle partials: if the reaction is partial, try to fetch full data.
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Failed to fetch reaction:', error);
        return;
      }
    }

    const pairs = reactionRolesUtil.getMapping(reaction.message.id);
    if (!pairs) return;

    // Loop through each stored pair and check if the reaction matches.
    for (const pair of pairs) {
      if (pair.isCustom) {
        if (reaction.emoji.id === pair.emojiId) {
          const role = reaction.message.guild.roles.cache.get(pair.roleId);
          const member = reaction.message.guild.members.cache.get(user.id);
          if (role && member) {
            try {
              await member.roles.add(role);
              console.log(`Added role ${role.name} to ${user.tag}`);
            } catch (error) {
              console.error('Error adding role:', error);
            }
          }
        }
      } else {
        if (reaction.emoji.name === pair.emojiName) {
          const role = reaction.message.guild.roles.cache.get(pair.roleId);
          const member = reaction.message.guild.members.cache.get(user.id);
          if (role && member) {
            try {
              await member.roles.add(role);
              console.log(`Added role ${role.name} to ${user.tag}`);
            } catch (error) {
              console.error('Error adding role:', error);
            }
          }
        }
      }
    }
  }
};
