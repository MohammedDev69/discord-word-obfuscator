const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    PermissionsBitField,
    ChannelType
} = require('discord.js');
const config = require('../config');

async function sendOrderPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('🛒 Request a Product or Service')
        .setDescription(
            'Looking for a product, account, or service?\n\n' +
            'Click the button below to submit your request details. Certified sellers will be alerted and can open a private ticket with you.'
        )
        .setThumbnail(channel.guild?.iconURL() || null)
        .setFooter({ text: 'Secure Orders & Ticket System' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('request_product')
            .setLabel('Submit Request')
            .setEmoji('📦')
            .setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [embed], components: [row] });
}

async function handleTicketInteraction(interaction) {
    if (interaction.isButton() && interaction.customId === 'request_product') {
        const modal = new ModalBuilder()
            .setCustomId('product_request')
            .setTitle('Product / Service Request');

        const productName = new TextInputBuilder()
            .setCustomId('product_name')
            .setLabel('Product or service name')
            .setPlaceholder('e.g., Netflix subscription, Discord Nitro, Design...')
            .setMaxLength(100)
            .setRequired(true)
            .setStyle(TextInputStyle.Short);

        const productDetails = new TextInputBuilder()
            .setCustomId('product_details')
            .setLabel('Additional details or budget (Optional)')
            .setPlaceholder('Enter any details, preferences, or budget...')
            .setMaxLength(500)
            .setRequired(false)
            .setStyle(TextInputStyle.Paragraph);

        modal.addComponents(
            new ActionRowBuilder().addComponents(productName),
            new ActionRowBuilder().addComponents(productDetails)
        );

        await interaction.showModal(modal);
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'product_request') {
        const productName = interaction.fields.getTextInputValue('product_name');
        const productDetails = interaction.fields.getTextInputValue('product_details') || 'No additional details provided';

        const ordersChannelId = config.tickets.ordersChannelId;
        const channel = interaction.guild.channels.cache.get(ordersChannelId) || 
                        await interaction.client.channels.fetch(ordersChannelId).catch(() => null);

        if (!channel) {
            return interaction.reply({
                content: '❌ Orders channel not found. Please contact administration.',
                ephemeral: true
            });
        }

        const sellersRoleId = config.tickets.sellersRoleId;
        const sellersRole = interaction.guild.roles.cache.get(sellersRoleId);

        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('📦 New Product Request!')
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: 'Requested Item:', value: `**${productName}**`, inline: false },
                { name: 'Details:', value: productDetails, inline: false },
                { name: 'Requested By:', value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: true },
                { name: 'Sellers Notification:', value: sellersRole ? `<@&${sellersRole.id}>` : 'Sellers', inline: true }
            )
            .setFooter({ text: 'Click "Open Ticket" below to start dealing.' })
            .setTimestamp();

        const ticketButton = new ButtonBuilder()
            .setCustomId(`ticket_${interaction.user.id}`)
            .setLabel('Open Ticket')
            .setEmoji('🎫')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(ticketButton);

        await channel.send({ 
            content: sellersRole ? `<@&${sellersRole.id}>` : undefined, 
            embeds: [embed], 
            components: [row] 
        });

        await interaction.reply({
            content: '✅ Your request has been posted to our sellers! A private ticket will be opened for you shortly.',
            ephemeral: true
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('ticket_')) {
        const buyerId = interaction.customId.split('_')[1];
        
        let buyerMember;
        try {
            buyerMember = await interaction.guild.members.fetch(buyerId);
        } catch {
            return interaction.reply({
                content: '❌ Could not find buyer (they may have left the server).',
                ephemeral: true
            });
        }

        const categoryId = config.tickets.ticketCategoryId;
        const category = categoryId ? interaction.guild.channels.cache.get(categoryId) : null;

        try {
            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${buyerMember.user.username}`.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
                type: ChannelType.GuildText,
                parent: category ? category.id : undefined,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: buyerMember.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.AttachFiles,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ],
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.AttachFiles,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ],
                    },
                ],
            });

            const closeButton = new ButtonBuilder()
                .setCustomId(`close_ticket_${ticketChannel.id}`)
                .setLabel('Close Ticket')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(closeButton);

            const welcomeEmbed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('🎫 Order Ticket')
                .setDescription(
                    `Welcome to your private transaction ticket!\n\n` +
                    `👤 **Buyer:** ${buyerMember}\n` +
                    `💼 **Seller:** ${interaction.user}\n\n` +
                    `Please communicate clearly and follow server rules.\n` +
                    `When finished, click **Close Ticket** below.`
                )
                .setThumbnail(buyerMember.user.displayAvatarURL())
                .setTimestamp();

            await ticketChannel.send({
                content: `${buyerMember} | ${interaction.user}`,
                embeds: [welcomeEmbed],
                components: [row]
            });

            await interaction.reply({
                content: `✅ Ticket created successfully: ${ticketChannel}`,
                ephemeral: true
            });
        } catch (err) {
            console.error('[Tickets] Error creating ticket:', err);
            await interaction.reply({
                content: '❌ An error occurred while creating the ticket channel. Ensure bot has Manage Channels permission.',
                ephemeral: true
            });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('close_ticket_')) {
        const ticketChannelId = interaction.customId.split('_')[2];
        const ticketChannel = interaction.guild.channels.cache.get(ticketChannelId);

        if (!ticketChannel) {
            return interaction.reply({ content: '❌ Channel not found.', ephemeral: true });
        }

        const countdown = config.tickets.closeCountdownSeconds || 10;

        await interaction.reply({
            content: `🔒 Ticket closure requested by ${interaction.user}. This channel will be deleted in **${countdown} seconds**...`
        });

        try {
            const logChannelId = config.tickets.logChannelId;
            if (logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(logChannelId) ||
                                   await interaction.client.channels.fetch(logChannelId).catch(() => null);

                if (logChannel) {
                    const closeEmbed = new EmbedBuilder()
                        .setColor('#e67e22')
                        .setTitle('📁 Ticket Closed')
                        .setDescription(`Ticket **${ticketChannel.name}** was closed.`)
                        .addFields(
                            { name: 'Closed By:', value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: true },
                            { name: 'Closed At:', value: new Date().toUTCString(), inline: true }
                        )
                        .setTimestamp();

                    await logChannel.send({ embeds: [closeEmbed] });
                }
            }
        } catch (err) {
            console.error('[Tickets] Failed to send ticket close log:', err.message);
        }

        setTimeout(async () => {
            try {
                await ticketChannel.delete('Ticket closed by user request');
            } catch (err) {
                console.error('[Tickets] Failed to delete ticket channel:', err.message);
            }
        }, countdown * 1000);

        return true;
    }

    return false;
}

module.exports = {
    sendOrderPanel,
    handleTicketInteraction
};
