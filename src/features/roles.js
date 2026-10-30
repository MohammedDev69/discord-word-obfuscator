const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

async function sendRolePanel(channel) {
    const roleId = config.roles.buttonRoleId;
    const role = channel.guild.roles.cache.get(roleId);

    const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('🎖️ Self Role Assignment')
        .setDescription(
            `Click the button below to get the ${role ? `<@&${role.id}>` : '**designated**'} role.\n` +
            `If you already have this role, clicking again will automatically remove it.`
        )
        .setFooter({ text: 'Automated Role Assignment' })
        .setTimestamp();

    const button = new ButtonBuilder()
        .setCustomId('give_role')
        .setLabel('Claim / Remove Role')
        .setEmoji('✨')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await channel.send({ embeds: [embed], components: [row] });
}

async function handleRoleInteraction(interaction) {
    if (!interaction.isButton() || interaction.customId !== 'give_role') {
        return false;
    }

    const roleId = config.roles.buttonRoleId;
    if (!roleId) {
        return interaction.reply({ content: '❌ Role ID is not configured.', ephemeral: true });
    }

    const member = interaction.member;
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role) {
        return interaction.reply({ content: '❌ Could not find the role in this server.', ephemeral: true });
    }

    const botMember = interaction.guild.members.me;
    if (!botMember.permissions.has('ManageRoles') || role.position >= botMember.roles.highest.position) {
        return interaction.reply({
            content: '❌ The bot lacks permission to manage this role. Please ensure the bot role is placed above this role in Server Settings.',
            ephemeral: true
        });
    }

    try {
        if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role);
            await interaction.reply({
                content: `🗑️ Removed **${role.name}** role from you.`,
                ephemeral: true
            });
        } else {
            await member.roles.add(role);
            await interaction.reply({
                content: `🎉 Granted you **${role.name}** role!`,
                ephemeral: true
            });

            try {
                await member.send(`🎉 You received the **${role.name}** role in **${interaction.guild.name}**.`);
            } catch {
            }
        }
    } catch (err) {
        console.error('[Roles] Error toggling role:', err.message);
        await interaction.reply({
            content: '⚠️ An error occurred while modifying your role. Please contact an admin.',
            ephemeral: true
        });
    }

    return true;
}

module.exports = {
    sendRolePanel,
    handleRoleInteraction
};
