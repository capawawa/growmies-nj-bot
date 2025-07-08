const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`🚀 Bot is ready! Logged in as ${client.user.tag}`);
        console.log(`📊 Connected to ${client.guilds.cache.size} guild(s)`);
        console.log(`👥 Serving ${client.users.cache.size} user(s)`);
        console.log(`📝 Loaded ${client.commands.size} command(s)`);
        
        // Set bot status
        client.user.setActivity('Growmies NJ Community 🌿', { type: 'WATCHING' });
        
        console.log('✅ Growmies NJ Bot initialization complete!');
    },
};