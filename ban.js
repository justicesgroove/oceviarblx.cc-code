const permissionManager = require('../utils/permissions');

module.exports = {
    name: 'ban',
    description: 'Ban a user from the server',
    usage: ',ban <user> [reason]',
    
    async execute(message, args, client) {
        // Check permissions
        if (!permissionManager.canUseCommand(message.member, 'ban', permissionManager.getRequiredPermission('ban'))) {
            const embed = new EmbedBuilder()
                .setColor(client.config.colors.error)
                .setTitle('❌ No Permission')
                .setDescription('You do not have permission to use this command.');
            return message.reply({ embeds: [embed] });
        }

        // Check bot permissions
        if (!permissionManager.botHasPermission(message.guild, PermissionFlagsBits.BanMembers)) {
            const embed = new EmbedBuilder()
                .setColor(client.config.colors.error)
                .setTitle('❌ Bot Missing Permissions')
                .setDescription('I do not have permission to ban members.');
            return message.reply({ embeds: [embed] });
        }

        if (args.length < 1) {
            const embed = new EmbedBuilder()
                .setColor(client.config.colors.error)
                .setTitle('❌ Invalid Usage')
                .setDescription(`Usage: ${this.usage}`);
            return message.reply({ embeds: [embed] });
        }

        // Get target user (can be member or user ID for non-members)
        let target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        let targetUser = target?.user;

        // If not a member, try to get user by ID
        if (!target) {
            try {
                targetUser = await client.users.fetch(args[0]);
            } catch (error) {
                const embed = new EmbedBuilder()
                    .setColor(client.config.colors.error)
                    .setTitle('❌ User Not Found')
                    .setDescription('Please mention a valid user or provide a valid user ID.');
                return message.reply({ embeds: [embed] });
            }
        }

        // Check if target is self
        if (targetUser.id === message.author.id) {
            const embed = new EmbedBuilder()
                .setColor(client.config.colors.error)
                .setTitle('❌ Invalid Target')
                .setDescription('You cannot ban yourself.');
            return message.reply({ embeds: [embed] });
        }

        // Check if target is bot
        if (targetUser.bot && targetUser.id === client.user.id) {
            const embed = new EmbedBuilder()
                .setColor(client.config.colors.error)
                .setTitle('❌ Invalid Target')
                .setDescription('I cannot ban myself.');
            return message.reply({ embeds: [embed] });
        }

        // Check hierarchy (only if target is a member)
        if (target && target.roles.highest.position >= message.member.roles.highest.position) {
            const embed = new EmbedBuilder()
                .setColor(client.config.colors.error)
                .setTitle('❌ Insufficient Permissions')
                .setDescription('You cannot ban someone with equal or higher roles.');
            return message.reply({ embeds: [embed] });
        }

        // Check if bot can ban target (only if target is a member)
        if (target && target.roles.highest.position >= message.guild.members.me.roles.highest.position) {
            const embed = new EmbedBuilder()
                .setColor(client.config.colors.error)
                .setTitle('❌ Cannot Ban User')
                .setDescription('I cannot ban someone with equal or higher roles than me.');
            return message.reply({ embeds: [embed] });
        }

        // Check if user is already banned
        try {
            const bans = await message.guild.bans.fetch();
            if (bans.has(targetUser.id)) {
                const embed = new EmbedBuilder()
                    .setColor(client.config.colors.error)
                    .setTitle('❌ Already Banned')
                    .setDescription('This user is already banned.');
                return message.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error checking bans:', error);
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            // Send DM to banned user (only if they're a member)
            if (target) {
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setColor(client.config.colors.error)
                        .setTitle('🔨 Banned from Server')
                        .setDescription(`You have been banned from **${message.guild.name}**`)
                        .addFields(
                            { name: 'Reason', value: reason },
                            { name: 'Moderator', value: message.author.tag }
                        )
                        .setTimestamp();

                    await target.send({ embeds: [dmEmbed] });
                } catch (error) {
                    console.log(`Could not send DM to ${targetUser.tag}`);
                }
            }

            // Ban the user
            await message.guild.members.ban(targetUser.id, { 
                reason: `${reason} | Moderator: ${message.author.tag}`,
                deleteMessageDays: 1
            });

            // Send confirmation
            const embed = new EmbedBuilder()
                .setColor(client.config.colors.error)
                .setTitle('🔨 User Banned')
                .setDescription(`Successfully banned ${targetUser.tag}`)
                .addFields(
                    { name: 'Reason', value: reason },
                    { name: 'Moderator', value: message.author.tag }
                )
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error banning user:', error);
            const embed = new EmbedBuilder()
                .setColor(client.config.colors.error)
                .setTitle('❌ Error')
                .setDescription('An error occurred while banning the user.');
            await message.reply({ embeds: [embed] });
        }
    }
