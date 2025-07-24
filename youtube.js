// youtube.js
// Provides YouTube search & audio playback fallback (visualiser will not animate)

(function(){
  const API_KEY = window.YT_API_KEY;
  const YT_BASE_SEARCH = "https://www.googleapis.com/youtube/v3/search";
  let ytPlayer;

  function loadYTSDK() {
    return new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve();
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
      window.onYouTubeIframeAPIReady = resolve;
    });
  }

  window.searchYouTube = async function(query) {
    const params = new URLSearchParams({
      key: API_KEY,
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: 5
    });
    const resp = await fetch(`${YT_BASE_SEARCH}?${params}`);
    const data = await resp.json();
    return data.items || [];
  };

  window.playYouTube = async function(videoId) {
    await loadYTSDK();
    if (!ytPlayer) {
      const container = document.createElement('div');
      container.id = 'yt-player';
      container.style.display = 'none';
      document.body.appendChild(container);
      ytPlayer = new YT.Player('yt-player', {
        height: '0', width: '0', videoId,
        playerVars: { autoplay: 1 },
        events: {
          onReady: (e) => {
            e.target.setVolume(80);
            e.target.playVideo();
          }
        }
      });
    } else {
      ytPlayer.loadVideoById(videoId);
      ytPlayer.playVideo();
    }
  };
})();
// Provides fallback audio playback via YouTube IFrame API when Spotify preview is unavailable.
import { YT_API_KEY } from "./config.js";

const YT_BASE_SEARCH = "https://www.googleapis.com/youtube/v3/search";
let ytPlayer, ytReady = false;

function loadYTSDK() {
  return new Promise((res) => {
    if (window.YT && window.YT.Player) return res();
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => res();
  });
}

export async function searchYouTube(query) {
  const params = new URLSearchParams({
    key: YT_API_KEY,
    part: "snippet",
    q: query,
    type: "video",
    maxResults: 5
  });
  const resp = await fetch(`${YT_BASE_SEARCH}?${params}`);
  const data = await resp.json();
  return data.items || [];
}

export async function playYouTube(videoId, onReady) {
  await loadYTSDK();
  if (!ytPlayer) {
    const iframe = document.createElement('div');
    iframe.id = "yt-player";
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    ytPlayer = new YT.Player('yt-player', {
      videoId,
      events: {
        'onReady': (e) => {
          ytReady = true;
          e.target.setVolume(80);
          e.target.playVideo();
          if (onReady) onReady(e);
        }
      }
    });
  } else {
    ytPlayer.loadVideoById(videoId);
    ytPlayer.playVideo();
    if (onReady) onReady();
  }
}
