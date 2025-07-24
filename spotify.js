// spotify.js
// Handles Spotify authentication (PKCE), searching, and playback integration
// Requires script.js exposing window.setAudioSource(url)

const CLIENT_ID = "149d1486759143098b62ee98ddade209";
const REDIRECT_URI = "https://synesthesia-music.netlify.app/";
const SCOPES = [
  "user-read-private",
  "streaming",
  "user-read-playback-state",
  "user-modify-playback-state"
].join(" ");

const connectBtn = document.getElementById("connect-spotify");
const searchArea = document.getElementById("search-area");
const toggleBtn = document.getElementById("toggle-lyrics");
const searchInput = document.getElementById("search-input");
const resultsList = document.getElementById("results");
const lyricsContainer = document.getElementById("lyrics-container");

// ---------- PKCE Helper Functions ----------
function generateRandomString(length) {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest("SHA-256", data);
}

function base64urlencode(a) {
  let str = "";
  const bytes = new Uint8Array(a);
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateCodeChallenge(codeVerifier) {
  const hashed = await sha256(codeVerifier);
  return base64urlencode(hashed);
}

// ---------- Auth Flow ----------
async function redirectToAuth() {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  localStorage.setItem("spotify_code_verifier", codeVerifier);

  const args = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  });
  window.location = "https://accounts.spotify.com/authorize?" + args.toString();
}

async function exchangeToken(code) {
  const codeVerifier = localStorage.getItem("spotify_code_verifier");
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "authorization_code",
    code: code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });
  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await resp.json();
  if (data.access_token) {
    const expiresAt = Date.now() + data.expires_in * 1000;
    localStorage.setItem("spotify_access_token", data.access_token);
    localStorage.setItem("spotify_expires_at", expiresAt);
  }
}

function getToken() {
  const token = localStorage.getItem("spotify_access_token");
  const expiresAt = localStorage.getItem("spotify_expires_at");
  if (token && expiresAt && Date.now() < Number(expiresAt)) return token;
  return null;
}

// ---------- Search & Playback ----------
async function searchTracks(query) {
  const token = getToken();
  if (!token) return;
  const qs = new URLSearchParams({ q: query, type: "track", limit: 10 });
  const resp = await fetch(`https://api.spotify.com/v1/search?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  return data.tracks?.items || [];
}

function renderResults(tracks) {
  resultsList.innerHTML = "";
  if (!tracks.length) {
    resultsList.innerHTML = "<li>No tracks found.</li>";
    return;
  }
  resultsList.innerHTML = "";
  tracks.forEach((t) => {
    const li = document.createElement("li");
    li.textContent = `${t.name} – ${t.artists[0].name}`;
    if (t.preview_url) {
      li.className = "result-item";
      li.addEventListener("click", () => {
        window.setAudioSource(t.preview_url);
        fetchLyrics(t.artists[0].name, t.name);
      });
    } else {
      li.className = "result-item no-preview";
      li.title = "Preview not available (requires Spotify Premium).";
    }
    resultsList.appendChild(li);
  });
}

// ---------- Lyrics ----------
async function fetchLyrics(artist, title) {
  lyricsContainer.textContent = "Loading lyrics...";
  try {
    const resp = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    const data = await resp.json();
    if (data.lyrics) {
      displayPseudoTimedLyrics(data.lyrics);
    } else {
      lyricsContainer.textContent = "No lyrics found.";
    }
  } catch (e) {
    lyricsContainer.textContent = "Error fetching lyrics.";
  }
}

function displayPseudoTimedLyrics(text) {
  const lines = text.split("\n").filter(Boolean);
  lyricsContainer.innerHTML = lines.map((l) => `<p class="lyric-line">${l}</p>`).join("");
  const audio = document.querySelector("audio");
  if (!audio) return;
  audio.addEventListener("timeupdate", () => {
    const idx = Math.floor((audio.currentTime / audio.duration) * lines.length);
    const children = lyricsContainer.children;
    for (let i = 0; i < children.length; i++) {
      children[i].classList.toggle("active", i === idx);
    }
  });
}

// ---------- Event Listeners ----------
connectBtn.addEventListener("click", async () => {
  if (getToken()) {
    spotifyUI.classList.toggle("hidden");
  } else {
    await redirectToAuth();
  }
});

searchInput.addEventListener("keyup", async (e) => {
  const q = e.target.value.trim();
  if (q.length < 3) {
    resultsList.innerHTML = "";
    resultsList.style.animation = "fadeIn 0.4s ease";
    return;
  }
  const tracks = await searchTracks(q);
  renderResults(tracks);
});

// ---------- Web Playback SDK ----------
let player;
let deviceId;
function initPlaybackSDK(token) {
  if (player) return; // already
  if (!window.Spotify) return; // SDK not yet loaded
  player = new Spotify.Player({
    name: "Synesthesia Player",
    getOAuthToken: (cb) => cb(token),
    volume: 0.8,
  });
  player.addListener('ready', ({ device_id }) => {
    deviceId = device_id;
    console.log('Player ready with device', device_id);
  });
  player.addListener('not_ready', ({ device_id }) => {
    console.log('Device ID has gone offline', device_id);
  });
  player.connect();
}

function playFullTrack(uri) {
  const token = getToken();
  if (!token || !deviceId) {
    alert('Full track playback requires Spotify Premium and a connected player.');
    return;
  }
  fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uris: [uri] })
  });
}

// ---------- Init on load ----------
(async () => {
  // If redirected back with code
  const params = new URLSearchParams(window.location.search);
  if (params.has("code")) {
    await exchangeToken(params.get("code"));
    // Remove query params from URL
    window.history.replaceState({}, document.title, REDIRECT_URI);
  }
  // Show UI if already authed
  if (getToken()) {
    connectBtn.textContent = "Spotify Connected";
    spotifyUI.classList.remove("hidden");
  }
})();
