const fs = require("fs");
const path = require("path");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;

const config = require("./config");

const app = express();

const ALLOWED_PATH = path.join(__dirname, "allowed_logins.json");
const SUBMISSIONS_PATH = path.join(__dirname, "submissions.json");

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function writeJsonSafe(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function getAllowedSet() {
  const allowed = readJsonSafe(ALLOWED_PATH, { allowed_ids: [] });
  const ids = Array.isArray(allowed.allowed_ids) ? allowed.allowed_ids : [];
  return new Set(ids.map(String));
}

function ensureFilesExist() {
  if (!fs.existsSync(ALLOWED_PATH)) {
    writeJsonSafe(ALLOWED_PATH, { allowed_ids: [] });
  }
  if (!fs.existsSync(SUBMISSIONS_PATH)) {
    writeJsonSafe(SUBMISSIONS_PATH, { submissions: [] });
  }
}

ensureFilesExist();

// ---- Express setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
  })
);

// ---- Passport setup
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new DiscordStrategy(
    {
      clientID: config.discord.clientID,
      clientSecret: config.discord.clientSecret,
      callbackURL: config.discord.callbackURL,
      scope: ["identify"],
    },
    (accessToken, refreshToken, profile, done) => done(null, profile)
  )
);

app.use(passport.initialize());
app.use(passport.session());

// ---- Helpers
function requireAuth(req, res, next) {
  if (req.isAuthenticated?.() && req.user) return next();
  return res.redirect("/login");
}

function requireAllowed(req, res, next) {
  const allowed = getAllowedSet();
  const id = String(req.user?.id || "");
  if (allowed.has(id)) return next();

  // Not allowed
  req.logout?.(() => {});
  return res
    .status(403)
    .send(
      `Not authorized. Your Discord ID (${id || "unknown"}) is not in allowed_logins.json`
    );
}

function getDiscordNames(profile) {
  // profile fields vary; passport-discord typically provides username + discriminator
  // and may include global_name depending on API / lib version.
  const username = profile?.username || "Unknown";
  const globalName =
    profile?.global_name ||
    profile?.globalName ||
    profile?.displayName ||
    "";
  return { username, globalName };
}

function loadSubmissions() {
  const data = readJsonSafe(SUBMISSIONS_PATH, { submissions: [] });
  if (!Array.isArray(data.submissions)) data.submissions = [];
  return data;
}

function appendSubmission(entry) {
  const data = loadSubmissions();
  data.submissions.push(entry);
  writeJsonSafe(SUBMISSIONS_PATH, data);
  return entry;
}

// ---- Routes
app.get("/", requireAuth, requireAllowed, (req, res) => {
  const { username, globalName } = getDiscordNames(req.user);
  const data = loadSubmissions();
  const last = data.submissions.length
    ? data.submissions[data.submissions.length - 1]
    : null;

  res.render("index", {
    user: {
      id: req.user.id,
      username,
      globalName,
    },
    lastSubmission: last,
    redirectUrl: config.redirectDiscordMessageUrl,
  });
});

app.get("/login", (req, res) => {
  res.send(`
    <html>
      <head><meta charset="utf-8"><title>Login</title></head>
      <body>
        <h2>Discord Login Required</h2>
        <p><a href="/auth/discord">Login with Discord</a></p>
      </body>
    </html>
  `);
});

app.get("/logout", (req, res) => {
  req.logout?.(() => {});
  res.redirect("/login");
});

app.get("/auth/discord", passport.authenticate("discord"));

app.get(
  "/auth/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/login" }),
  (req, res) => {
    // Enforce allowlist immediately after auth
    const allowed = getAllowedSet();
    const id = String(req.user?.id || "");
    if (!allowed.has(id)) {
      req.logout?.(() => {});
      return res
        .status(403)
        .send(
          `Not authorized. Your Discord ID (${id || "unknown"}) is not in allowed_logins.json`
        );
    }
    res.redirect("/");
  }
);

app.post("/submit", requireAuth, requireAllowed, (req, res) => {
  const { username, globalName } = getDiscordNames(req.user);

  const favoriteColor = String(req.body.favoriteColor || "").trim();
  const message = String(req.body.message || "").trim();

  // Minimal validation
  if (!favoriteColor || !message) {
    return res.status(400).send("favoriteColor and message are required.");
  }
  if (favoriteColor.length > 50) {
    return res.status(400).send("favoriteColor too long (max 50).");
  }
  if (message.length > 500) {
    return res.status(400).send("message too long (max 500).");
  }

  appendSubmission({
    submitted_at: new Date().toISOString(),
    discord_id: String(req.user.id),
    discord_username: username,
    discord_global_name: globalName,
    favorite_color: favoriteColor,
    message,
  });

  res.redirect(config.redirectDiscordMessageUrl);
});

// Simple view endpoint if you want to see raw JSON locally
app.get("/submissions", requireAuth, requireAllowed, (req, res) => {
  res.json(loadSubmissions());
});

app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});
