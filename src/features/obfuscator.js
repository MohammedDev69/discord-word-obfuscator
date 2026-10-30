const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} = require('discord.js');
const config = require('../config');

function obfuscateText(text) {
    let result = text;
    const replacements = [...config.obfuscator.replacements].sort(
        (a, b) => (b.word?.length || 0) - (a.word?.length || 0)
    );

    replacements.forEach(item => {
        if (!item.word || !item.replace) return;
        const escapedWord = item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedWord, 'gi');
        result = result.replace(regex, item.replace);
    });

    return result;
}

async function sendObfuscatorPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('🛡️ Text Obfuscation System')
        .setDescription(
            'Click the button below to encode your post and safely bypass automod filters across servers.\n\n' +
            '✨ **Features:**\n' +
            '• Instant camouflage for trade, sale, and exchange terms.\n' +
            '• Protects your post from automatic deletion.\n' +
            '• The result is private and only visible to you.'
        )
        .setFooter({ text: 'Automated Post Obfuscator' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('replace')
            .setLabel('Encode Your Post')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Success)
    );

    await channel.send({ embeds: [embed], components: [row] });
}

async function handleObfuscatorInteraction(interaction) {
    if (interaction.isButton() && interaction.customId === 'replace') {
        const modal = new ModalBuilder()
            .setTitle('Encode Your Post')
            .setCustomId('rep');

        const replacer = new TextInputBuilder()
            .setCustomId('replacetext')
            .setLabel('Enter text to encode')
            .setPlaceholder('Type or paste your post content here...')
            .setMaxLength(2000)
            .setRequired(true)
            .setStyle(TextInputStyle.Paragraph);

        const row = new ActionRowBuilder().addComponents(replacer);
        modal.addComponents(row);

        await interaction.showModal(modal);
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'rep') {
        try {
            const rawText = interaction.fields.getTextInputValue('replacetext');
            const encodedText = obfuscateText(rawText);

            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('✅ Post Encoded Successfully!')
                .setDescription('You can copy your encoded text from the box below:')
                .addFields(
                    { name: '📝 Encoded Text:', value: `\`\`\`text\n${encodedText}\n\`\`\`` }
                )
                .setFooter({ text: 'Your text is never stored.' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        } catch (error) {
            console.error('[Obfuscator] Error encoding text:', error);
            await interaction.reply({
                content: '⚠️ An error occurred while processing your request. Please try again.',
                ephemeral: true
            });
        }
        return true;
    }

    return false;
}

module.exports = {
    obfuscateText,
    sendObfuscatorPanel,
    handleObfuscatorInteraction
};
