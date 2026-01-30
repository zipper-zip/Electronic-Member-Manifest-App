module.exports = {
  port: 4900,

  // Discord OAuth2 app credentials
  discord: {
    clientID: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    callbackURL: "http://localhost:4900/auth/discord/callback",
  },

  // Where to redirect after submit
  redirectDiscordMessageUrl: "https://discord.com/channels/SERVER_ID/CHANNEL_ID/MESSAGE_ID",

  session: {
    secret: "replace-me-with-a-long-random-string",
  },
};
