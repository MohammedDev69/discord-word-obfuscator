const { 
    Client, 
    GatewayIntentBits, 
    Events, 
    ActivityType, 
    EmbedBuilder, 
    PermissionsBitField 
} = require('discord.js');

const config = require('./src/config');
const { sendObfuscatorPanel, handleObfuscatorInteraction } = require('./src/features/obfuscator');
const { handleAutoModMessage, handleWarnCommands, getWarningsEmbed, clearUserWarnings } = require('./src/features/automod');
const { sendOrderPanel, handleTicketInteraction } = require('./src/features/tickets');
const { sendRolePanel, handleRoleInteraction } = require('./src/features/roles');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Error] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('[Error] Uncaught Exception:', error);
});

const slashCommands = [
    {
        name: 'help',
        description: 'Display all commands and usage guide'
    },
    {
        name: 'ping',
        description: 'Check bot latency and Discord API ping'
    },
    {
        name: 'encode',
        description: 'Send the text obfuscation panel to this channel',
        default_member_permissions: PermissionsBitField.Flags.ManageMessages.toString()
    },
    {
        name: 'order',
        description: 'Send the product order panel to this channel',
        default_member_permissions: PermissionsBitField.Flags.ManageMessages.toString()
    },
    {
        name: 'role',
        description: 'Send the button role panel to this channel',
        default_member_permissions: PermissionsBitField.Flags.ManageRoles.toString()
    },
    {
        name: 'warnings',
        description: 'Check active warnings for a user',
        options: [
            {
                name: 'user',
                description: 'The user to check warnings for',
                type: 6,
                required: false
            }
        ]
    },
    {
        name: 'clearwarns',
        description: 'Reset warnings for a user (Admin only)',
        default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString(),
        options: [
            {
                name: 'user',
                description: 'The user to reset warnings for',
                type: 6,
                required: true
            }
        ]
    }
];

function getHelpEmbed(prefix) {
    return new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('📖 Bot Commands & Features')
        .setDescription(`This bot supports both **Slash Commands** (\`/\`) and **Prefix Commands** (\`${prefix}\` or \`!\`).`)
        .addFields(
            {
                name: '🛡️ Admin Panels:',
                value: 
                    `• \`/encode\` or \`${prefix}encode\`: Send post obfuscator panel.\n` +
                    `• \`/order\` or \`${prefix}order\`: Send product request panel.\n` +
                    `• \`/role\` or \`${prefix}role\`: Send self-role claim button.`
            },
            {
                name: '🚨 Moderation & Warnings:',
                value: 
                    `• \`/warnings [user]\` or \`${prefix}warnings [@user]\`: View user warnings.\n` +
                    `• \`/clearwarns <user>\` or \`${prefix}clearwarns <@user>\`: Reset user warnings (Manage Server).`
            },
            {
                name: '⚡ Utility:',
                value: 
                    `• \`/ping\` or \`${prefix}ping\`: Measure bot and API latency.\n` +
                    `• \`/help\` or \`${prefix}help\`: Show this help guide.`
            }
        )
        .setFooter({ text: `Configured prefix: ${prefix}` })
        .setTimestamp();
}

client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Bot logged in as ${readyClient.user.tag}`);
    console.log(`Connected to ${readyClient.guilds.cache.size} server(s)`);
    console.log(`Command prefix: ${config.prefix}`);

    readyClient.user.setActivity('Automod & Obfuscation | /help', {
        type: ActivityType.Watching
    });

    try {
        await readyClient.application.commands.set(slashCommands);
        console.log('[Slash Commands] Registered global slash commands.');
    } catch (err) {
        console.error('[Slash Commands] Registration failed:', err);
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;

    const isAutoModTriggered = await handleAutoModMessage(message);
    if (isAutoModTriggered) return;

    const prefix = config.prefix;
    let usedPrefix = null;

    if (message.content.startsWith(prefix)) {
        usedPrefix = prefix;
    } else if (message.content.startsWith('!')) {
        usedPrefix = '!';
    }

    if (!usedPrefix) return;

    const args = message.content.slice(usedPrefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (['تحذيرات', 'warnings', 'مسح-تحذيرات', 'clearwarns', 'resetwarns'].includes(command)) {
        return handleWarnCommands(message, command, args);
    }

    if (['help', 'مساعدة', 'اوامر'].includes(command)) {
        return message.reply({ embeds: [getHelpEmbed(prefix)] });
    }

    if (command === 'ping') {
        const sent = await message.reply('🏓 Pinging...');
        const latency = sent.createdTimestamp - message.createdTimestamp;
        return sent.edit(`🏓 Pong! Latency: **${latency}ms** | WebSocket API: **${Math.round(client.ws.ping)}ms**`);
    }

    if (['encode', 'تشفير', 'بنل-تشفير'].includes(command)) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('⛔ You need Manage Messages permission to send this panel.');
        }
        await message.delete().catch(() => null);
        return sendObfuscatorPanel(message.channel);
    }

    if (['order', 'طلب'].includes(command)) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('⛔ You need Manage Messages permission to send this panel.');
        }
        await message.delete().catch(() => null);
        return sendOrderPanel(message.channel);
    }

    if (['role', 'button', 'رتبة'].includes(command)) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return message.reply('⛔ You need Manage Roles permission to send this panel.');
        }
        await message.delete().catch(() => null);
        return sendRolePanel(message.channel);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const { commandName } = interaction;

            if (commandName === 'help') {
                return interaction.reply({ embeds: [getHelpEmbed(config.prefix)], ephemeral: true });
            }

            if (commandName === 'ping') {
                const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });
                const latency = sent.createdTimestamp - interaction.createdTimestamp;
                return interaction.editReply(`🏓 Pong! Latency: **${latency}ms** | WebSocket API: **${Math.round(client.ws.ping)}ms**`);
            }

            if (commandName === 'encode') {
                if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageMessages)) {
                    return interaction.reply({ content: '⛔ You need Manage Messages permission to use this command.', ephemeral: true });
                }
                await sendObfuscatorPanel(interaction.channel);
                return interaction.reply({ content: '✅ Obfuscator panel sent successfully.', ephemeral: true });
            }

            if (commandName === 'order') {
                if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageMessages)) {
                    return interaction.reply({ content: '⛔ You need Manage Messages permission to use this command.', ephemeral: true });
                }
                await sendOrderPanel(interaction.channel);
                return interaction.reply({ content: '✅ Order panel sent successfully.', ephemeral: true });
            }

            if (commandName === 'role') {
                if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageRoles)) {
                    return interaction.reply({ content: '⛔ You need Manage Roles permission to use this command.', ephemeral: true });
                }
                await sendRolePanel(interaction.channel);
                return interaction.reply({ content: '✅ Role panel sent successfully.', ephemeral: true });
            }

            if (commandName === 'warnings') {
                const targetUser = interaction.options.getUser('user') || interaction.user;
                return interaction.reply({ embeds: [getWarningsEmbed(targetUser)] });
            }

            if (commandName === 'clearwarns') {
                if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageGuild)) {
                    return interaction.reply({ content: '⛔ You need Manage Server permission to use this command.', ephemeral: true });
                }
                const targetUser = interaction.options.getUser('user');
                const embed = await clearUserWarnings(interaction.guild, targetUser);
                return interaction.reply({ embeds: [embed] });
            }

            return;
        }

        if (await handleObfuscatorInteraction(interaction)) return;
        if (await handleTicketInteraction(interaction)) return;
        if (await handleRoleInteraction(interaction)) return;
    } catch (error) {
        console.error('[Interaction] Error executing interaction:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '⚠️ An unexpected error occurred while executing this action.',
                ephemeral: true
            }).catch(() => null);
        }
    }
});

if (!config.token || config.token === 'your_bot_token_here') {
    console.error('Error: DISCORD_TOKEN is missing in .env file.');
    process.exit(1);
}

client.login(config.token);
