const Discord = require('discord.js');
const bot = new Discord.Client();
const fetch = require('node-fetch')

bot.on("ready", () => {
    console.log(`Logged in as ${bot.user.tag} (ID: ${bot.user.id})`);
    bot.user.setStatus('online')
    bot.user.setPresence({ activity: { name: 'pke!help' }, status: 'online' })
});



bot.on("message", async (message) => {
    if (message.author.bot || !message.guild) {
        return;
    }

    if (message.content === 'pke!help') {

        // This will be added again when bot is verified, but for now, it messes things up.
        // if (!message.guild.member('466378653216014359')) {
        // const embedContent = `This is a bot to edit PluralKit messages. You don't currently have the PluralKit bot in this server, so this bot is obsolete. There are no other commands.`
        // const helpEmbed = new Discord.MessageEmbed().setTitle(embedContent);
        // message.channel.send(helpEmbed)
        // } else {
        const embedContent = `This is a bot to edit PluralKit messages. Simply react with :pencil: or :pencil2: to a proxied PluralKit message that you'd like to edit, and I'll DM you for the new message content. You can also edit messages using the command \`pke!edit <message ID or link> <new content>\`. If you'd like to invite this bot, [click here!](https://discord.com/api/oauth2/authorize?client_id=815113578381443103&permissions=536882176&scope=bot) The PluralKit bot itself can be invited with [this link.](https://discord.com/oauth2/authorize?client_id=466378653216014359&scope=bot%20applications.commands&permissions=536995904)`
        const helpEmbed = new Discord.MessageEmbed().setTitle(embedContent);
        message.channel.send(helpEmbed)
        // }
    } else if (message.content.startsWith('pke!edit')) {
        const args = message.content.trim().replace(/\s+/g, ' ').slice(9).split(' ');
        const linkregex = /https?:\/\/[^:\/\s]*discord\.com\/channels\/([0-9]+)\/([0-9]+)\/([0-9]+)/i
        const linkmatch = args[0].match(linkregex)
        if (args.length < 2) {
            message.channel.send('You need to supply both a message link and the new message content.')
            return;
        } else if (linkmatch === null) {
            message.channel.send('That\'s not a message link. Please try again.')
        } else {
            try {
                const editmsg = bot.guilds.cache.get(linkmatch[1]).channels.cache.get(linkmatch[2]).messages.cache.get(linkmatch[3])
                if (!editmsg.webhookID) {
                    message.channel.send('That message was not proxied.') // TODO: change this to actually check with pk api
                    return;
                }
                var msgJson = await fetchMsgJson(editmsg.id);

                if (msgJson.sender == message.author.id) {
                    await bot.fetchWebhook(editmsg.webhookID)
                        .then(async (webhook) => {

                            await fetch(`https://discord.com/api/webhooks/${webhook.id}/${webhook.token}/messages/${editmsg.id}`, {
                                method: 'PATCH',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ "content": `${args.slice(1).join(' ')}` })
                            });
                        }).then(() => {if (message.deletable) message.delete()})
                } else {
                    message.channel.send('You didn\'t send that message.')
                }
            } catch (e) {
                message.channel.send('There was an error. It\'s likely the link is invalid. If you\'re sure it\'s valid, it\'s an eror with the bot\'s cache. Use the reaction to edit the message.')
            }
        }
    }

});

async function fetchMsgJson(id) {
    try {
        const response = await fetch(
            "https://api.pluralkit.me/v1/msg/" + id,
            {
                method: "GET",
                credentials: "same-origin",
            }
        );
        const json = await response.json();
        return json;
    } catch (error) {
        console.error(error);
    }
}



// watch for the two reactions allowed (:pencil:, :pencil2:)

bot.on("messageReactionAdd", async (reaction, user) => {
    var reactedMessage = await reaction.message.channel.messages.fetch(
        reaction.message.id
    );
    var id = reaction.message.id;

    if (reactedMessage.webhookID) {
        if (reaction.emoji.name === "📝" || reaction.emoji.name === "✏️") {
            if (user.bot) return;

            var users = await reaction.users.fetch();
            var userID = users.keys().next().value;
            var userReacted = bot.users.cache.get(userID);

            var msgJson = await fetchMsgJson(id);

            if (msgJson.sender == userID) {
                reaction.remove()
                userReacted
                    .send(
                        "What would you like to change your message to? This will cancel in 30 seconds."
                    )
                    .then((msg) => {
                        msg.channel
                            .awaitMessages((response) => response.author.id == userID, {
                                max: 1,
                                time: 90000,
                                errors: ["time"],
                            })
                            .then(async (collected) => {
                                userReacted.send(
                                    `The collected message was: ${collected.first().content}`);

                                await bot.fetchWebhook(reactedMessage.webhookID)
                                    .then(async (webhook) => {

                                        await fetch(`https://discord.com/api/webhooks/${webhook.id}/${webhook.token}/messages/${reactedMessage.id}`, {
                                            method: 'PATCH',
                                            headers: {
                                                'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({ "content": `${collected.first().content}` })
                                        });
                                    })





                            })



                            .catch((msg) => {
                                console.log(msg)
                                userReacted.send("The function timed out.");
                            });
                    });
            }
        }
    }
});




bot.login(process.env.BOT_TOKEN);
