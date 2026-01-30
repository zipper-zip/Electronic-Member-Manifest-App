# Electronic-Member-Manifest-App
A simple demo management app named EMMA for short.

Uses **Express** and **Passport (Discord OAuth2)** to authenticate users, restrict access via an allowlist, collect a short form submission, and redirect users to a specific Discord message after submission.

No frontend frameworks are used — just basic HTML, CSS, and vanilla JS.

---

## Features

- Discord OAuth2 login using `passport-discord`
- Allowlist-based access control via `allowed_logins.json`
- Simple form that collects:
  - Discord username (read-only)
  - Discord global display name (read-only, if available)
  - Favorite color
  - Short message
- Submissions stored in `submissions.json`
- Redirects users to a predefined Discord message after submit
- Right-hand panel showing:
  - Live preview of current input
  - Most recent submission
- Minimal, responsive layout (no Bootstrap or UI frameworks)

---

## Project Structure
discord-form-app/ 
├── config.js 
├── server.js 
├── allowed_logins.json 
├── submissions.json 
├── package.json 
├── views/ 
│   └── index.ejs 
└── public/ 
    └── index.ejs 

---

## Requirements

- Node.js 18+ recommended
- A Discord application with OAuth2 enabled

---

## Installation

1. Clone or copy the project files
2. Install dependencies:

```bash
npm install
```

---

Dependencies used:
- express
- express-session
- passport
- passport-discord
- ejs

---

## Discord Application Setup
1. Go to the Discord Developer Portal
2. Create a new application
3. Under OAuth2:
 - Add a redirect URI: `http://localhost:4900/auth/discord/callback`
4. Copy:
 - Client ID
 - Client Secret
5. Update the `config.js` file with:
 - Your callback url
 - The Client ID 
 - The Client Secret
 - The `redirectDiscordMessageUrl` should contain a url to a discodd message you wish to direct to afrer submission
 - The `secret` should contain a random string of characters.
