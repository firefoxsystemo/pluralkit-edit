// ADAPTED FROM https://github.com/RayzrDev/bot-base
// LICENSED UNDER MIT

// Built-in libraries from Node.JS
const path = require("path");
const fs = require("fs");
const util = require("util");
// Only import the Client class from Discord.js
const { Client, Intents, MessageCollector, APIMessage } = require("discord.js");



// import node-fetch
const fetch = require("node-fetch");

require("dotenv").config();

// Super fancy config loader/validator
const config = (() => {
  const token = process.env.BOT_TOKEN;

  // If there isn't a token, the bot won't start, but if there is then
  // we want to make sure it's a valid bot token
  if (!token) {
    console.error("Missing BOT_TOKEN environment variable");
    process.exit(1);
  }

  if (!/^[a-zA-Z0-9_.-]{59}$/.test(token)) {
    console.error("Invalid bot token!");
    process.exit(1);
  }


})();


// Define gateway intents
const intents = new Intents([
  Intents.NON_PRIVILEGED, // include all non-privileged intents, would be better to specify which ones you actually need
  "GUILD_MEMBERS", // lets you request guild members
]);
// Create the client
const bot = new Client({
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
  ws: { intents },
  fetchAllMembers: true,
  disableEveryone: true,
});

// Store the config
bot.config = config;

bot.on("ready", () => {
  console.log(`Logged in as ${bot.user.tag} (ID: ${bot.user.id})`);
});

bot.on("message", (message) => {
  // Ignore messages from bots and from DMs (non-guild channels)
  if (message.author.bot || !message.guild) {
    return;
  }

  // Just a shorthand variable
  let { content } = message;
  
});

// watch for the two reactions allowed (:pencil:, :pencil2:)

bot.on("messageReactionAdd", async (reaction, user) => {
  var reactedMessage = await reaction.message.channel.messages.fetch(
    reaction.message.id
  );
  var id = reaction.message.id;

  if (reactedMessage.webhookID) {
    if (reaction.emoji.name === "📝" | "✏️") {
      if (user.bot) return;
      
      var users = await reaction.users.fetch();
      var userID = users.keys().next().value;
      // bad code but i worked on this for hours so idgaf
      var userReacted = bot.users.cache.get(userID);
      // fetches the info from pk api

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
                time: 30000,
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
                      body: JSON.stringify({"content": `${collected.first().content}`})
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

// Only run the bot if the token was provided
config.token && bot.login(config.token);
