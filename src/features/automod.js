const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../config');
const { warningsStorage } = require('../utils/storage');

async function handleAutoModMessage(message) {
    if (!config.automod.enabled) return false;
    if (message.author.bot) return false;
    if (!message.guild) return false;

    if (!config.automod.monitoredChannels.includes(message.channel.id)) {
        return false;
    }

    const contentLower = message.content.toLowerCase();
    const sortedKeywords = [...config.automod.keywords].sort((a, b) => b.length - a.length);
    const matchedKeyword = sortedKeywords.find(kw => 
        contentLower.includes(kw.toLowerCase())
    );

    if (!matchedKeyword) return false;

    const userId = message.author.id;
    const userWarnings = warningsStorage.get(userId, { count: 0, history: [] });

    userWarnings.count += 1;
    userWarnings.history.push({
        keyword: matchedKeyword,
        channelId: message.channel.id,
        timestamp: new Date().toISOString()
    });
    warningsStorage.set(userId, userWarnings);

    const warnLevel = userWarnings.count;

    try {
        const roleId = config.automod.warnRoleIds[warnLevel];
        if (roleId) {
            const role = message.guild.roles.cache.get(roleId);
            if (role) {
                await message.member.roles.add(role);
            }
        }
    } catch (err) {
        console.error('[AutoMod] Failed to add warning role:', err.message);
    }

    try {
        const dmEmbed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('⚠️ Warning Issued')
            .setDescription(`You used a prohibited keyword in **${message.guild.name}**.`)
            .addFields(
                { name: 'Prohibited Keyword:', value: `\`${matchedKeyword}\``, inline: true },
                { name: 'Your Warnings:', value: `${warnLevel}/${config.automod.maxWarnings}`, inline: true },
                { name: 'Channel:', value: `<#${message.channel.id}>`, inline: true }
            )
            .setFooter({ text: 'Please adhere to server rules to avoid punishment.' })
            .setTimestamp();

        await message.author.send({ embeds: [dmEmbed] });
    } catch {
    }

    try {
        if (config.automod.logChannelId) {
            const logChannel = message.guild.channels.cache.get(config.automod.logChannelId) || 
                               await message.client.channels.fetch(config.automod.logChannelId).catch(() => null);

            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('🚨 Prohibited Content Deleted')
                    .setDescription(`User ${message.author} (\`${message.author.id}\`) triggered the keyword filter.`)
                    .addFields(
                        { name: 'Deleted Content:', value: message.content ? `\`\`\`${message.content.slice(0, 1000)}\`\`\`` : 'No text' },
                        { name: 'Keyword Found:', value: `\`${matchedKeyword}\``, inline: true },
                        { name: 'Channel:', value: `${message.channel}`, inline: true },
                        { name: 'Warning Level:', value: `**${warnLevel} / ${config.automod.maxWarnings}**`, inline: true }
                    )
                    .setThumbnail(message.author.displayAvatarURL())
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }
        }
    } catch (err) {
        console.error('[AutoMod] Failed to send log:', err.message);
    }

    try {
        if (message.deletable) {
            await message.delete();
        }
    } catch (err) {
        console.error('[AutoMod] Failed to delete message:', err.message);
    }

    if (userWarnings.count >= config.automod.maxWarnings) {
        try {
            const member = message.member;
            if (member && config.automod.preservedRoleId) {
                const rolesToRemove = member.roles.cache.filter(role => 
                    role.id !== config.automod.preservedRoleId && 
                    role.id !== message.guild.id &&
                    !role.managed
                );

                await member.roles.remove(rolesToRemove);
                const preservedRole = message.guild.roles.cache.get(config.automod.preservedRoleId);
                if (preservedRole) {
                    await member.roles.add(preservedRole);
                }

                if (config.automod.logChannelId) {
                    const logChannel = message.guild.channels.cache.get(config.automod.logChannelId);
                    if (logChannel) {
                        const punishEmbed = new EmbedBuilder()
                            .setColor('#c0392b')
                            .setTitle('⛔ Max Warnings Reached')
                            .setDescription(`User ${message.author} reached ${config.automod.maxWarnings} warnings. All roles were stripped and the preserved role was assigned.`)
                            .setTimestamp();
                        await logChannel.send({ embeds: [punishEmbed] });
                    }
                }

                userWarnings.count = 0;
                warningsStorage.set(userId, userWarnings);
            }
        } catch (err) {
            console.error('[AutoMod] Error applying maximum punishment:', err.message);
        }
    }

    return true;
}

function getWarningsEmbed(targetUser) {
    const data = warningsStorage.get(targetUser.id, { count: 0, history: [] });
    return new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`📋 Warning Records: ${targetUser.tag}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
            { name: 'Active Warnings:', value: `**${data.count} / ${config.automod.maxWarnings}**`, inline: true },
            { name: 'Total Infractions Recorded:', value: `**${data.history ? data.history.length : 0}**`, inline: true }
        )
        .setFooter({ text: `User ID: ${targetUser.id}` })
        .setTimestamp();
}

async function clearUserWarnings(guild, targetUser) {
    warningsStorage.set(targetUser.id, { count: 0, history: [] });

    try {
        const member = await guild.members.fetch(targetUser.id).catch(() => null);
        if (member) {
            const warnRoleIds = Object.values(config.automod.warnRoleIds);
            for (const rId of warnRoleIds) {
                if (member.roles.cache.has(rId)) {
                    await member.roles.remove(rId).catch(() => null);
                }
            }
        }
    } catch (err) {
        console.error('[AutoMod] Error removing warning roles:', err.message);
    }

    return new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('✅ Warnings Cleared')
        .setDescription(`Successfully cleared all warnings and reset roles for ${targetUser}.`)
        .setTimestamp();
}

async function handleWarnCommands(message, command, args) {
    if (['تحذيرات', 'warnings'].includes(command)) {
        const targetUser = message.mentions.users.first() || 
                           (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : message.author);

        if (!targetUser) {
            return message.reply('❌ Could not find that user.');
        }

        return message.reply({ embeds: [getWarningsEmbed(targetUser)] });
    }

    if (['مسح-تحذيرات', 'clearwarns', 'resetwarns'].includes(command)) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return message.reply('⛔ You do not have Manage Server permission to use this command.');
        }

        const targetUser = message.mentions.users.first() || 
                           (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

        if (!targetUser) {
            return message.reply('❌ Please mention a user or provide their ID to clear their warnings.');
        }

        const embed = await clearUserWarnings(message.guild, targetUser);
        return message.reply({ embeds: [embed] });
    }

    return false;
}

module.exports = {
    handleAutoModMessage,
    handleWarnCommands,
    getWarningsEmbed,
    clearUserWarnings
};
