const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const configData = require('../../config.json');

module.exports = {
    token: process.env.DISCORD_TOKEN,
    prefix: configData.prefix || '+',
    automod: {
        enabled: configData.automod?.enabled ?? true,
        logChannelId: configData.automod?.logChannelId || '',
        preservedRoleId: configData.automod?.preservedRoleId || '',
        maxWarnings: configData.automod?.maxWarnings || 4,
        monitoredChannels: (configData.automod?.monitoredChannels || []).filter(id => Boolean(id && id.trim())),
        warnRoleIds: configData.automod?.warnRoleIds || {},
        keywords: configData.automod?.keywords || []
    },
    obfuscator: {
        replacements: configData.obfuscator?.replacements || []
    },
    tickets: {
        ordersChannelId: configData.tickets?.ordersChannelId || '',
        ticketCategoryId: configData.tickets?.ticketCategoryId || '',
        sellersRoleId: configData.tickets?.sellersRoleId || '',
        logChannelId: configData.tickets?.logChannelId || '',
        closeCountdownSeconds: configData.tickets?.closeCountdownSeconds || 10
    },
    roles: {
        buttonRoleId: configData.roles?.buttonRoleId || '',
        emojiId: configData.roles?.emojiId || ''
    }
};
