const express = require('express');
const Canvas = require('canvas'); // Using Canvas directly
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const axios = require('axios');
const { google } = require('googleapis');
const { TwitterApi } = require('twitter-api-v2');
const schedule = require('node-schedule');
const { 
  WebhookClient, 
  ButtonBuilder, 
  ActionRowBuilder, 
  ButtonStyle, 
  EmbedBuilder 
} = require('discord.js');
const xml2js = require('xml2js');

const EnhancedRankCard = require('./src/Utils/rankcardgenerator.js');

const app = express();
const port = 8104;
const ip = '0.0.0.0';
require('dotenv').config();

// Paths and tokens
const usersFilePath = path.join(process.cwd(), 'src', 'Json', 'users.json');
const fontPath = path.join(__dirname, 'src', 'Images', 'DancingScript-Regular.ttf');
const achievementsFilePath = path.join(__dirname, 'achievements.json');
const botToken = process.env.BOT_TOKEN;

// Express middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  })
);
app.use(express.static(__dirname));

// Simple authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session.isLoggedIn) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

// Utility: Calculate XP required for a given level
function getTotalXPForLevel(level) {
  return 100 * Math.pow(1.5, level - 1);
}

// ----------------- RANK CARD ENDPOINTS -----------------

// Fetch a user's avatar from Discord API
async function fetchUserAvatar(userId) {
  const url = `https://discord.com/api/v10/users/${userId}`;
  try {
    const response = await fetch(url, { headers: { Authorization: `Bot ${botToken}` } });
    if (!response.ok) throw new Error(`Failed to fetch avatar: ${response.statusText}`);
    const data = await response.json();
    return data.avatar 
      ? `https://cdn.discordapp.com/avatars/${userId}/${data.avatar}.png?size=256`
      : null;
  } catch (error) {
    console.error(`Error fetching user avatar: ${error.message}`);
    return null;
  }
}

// Get user rank based on leveling data
function getUserRank(userId) {
  try {
    const data = fs.readFileSync(usersFilePath, 'utf8');
    const usersData = JSON.parse(data);
    const sortedUsers = Object.entries(usersData)
      .map(([id, userData]) => ({ id, ...userData }))
      .sort((a, b) => b.level - a.level);
    return sortedUsers.findIndex(user => user.id === userId) + 1;
  } catch (error) {
    console.error('Error calculating user rank:', error);
    return null;
  }
}

// Build and return a rank card image buffer
async function generateRankCard(userId, userData, avatarUrl) {
  try {
    const rank = getUserRank(userId);
    const rankCard = new EnhancedRankCard()
      .setUsername(userData.username || userId)
      .setDisplayName(userData.displayName || userData.username || userId)
      .setAvatar(avatarUrl)
      .setCurrentXP(userData.xp || 0)
      .setRequiredXP(getTotalXPForLevel(userData.level + 1))
      .setLevel(userData.level || 1)
      .setRank(rank || 1)
      .setStatus(userData.status || 'online');

    if (userData.background) {
      rankCard.setBackground(userData.background);
    } else {
      rankCard.setBackground('https://www.pngkit.com/png/full/132-1322393_mega-charizard-x-by-mrmagikman-on-deviantart-picture.png');
    }

    if (userData.badges && Array.isArray(userData.badges)) {
      userData.badges.forEach(badge => rankCard.addBadge(badge.url, badge.name));
    }
    
    if (userData.theme) {
      rankCard.setTheme(userData.theme);
    }
    
    return await rankCard.build();
  } catch (error) {
    console.error('Error generating rank card:', error);
    throw error;
  }
}

// GET rank card endpoint
app.get('/api/rank-card/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const data = fs.readFileSync(usersFilePath, 'utf8');
    const usersData = JSON.parse(data);
    const user = usersData[userId];
    if (!user) return res.status(404).send('User not found');
    const avatarUrl = await fetchUserAvatar(userId);
    if (!avatarUrl) return res.status(500).send('Error fetching avatar');
    const pngBuffer = await generateRankCard(userId, user, avatarUrl);
    res.set('Content-Type', 'image/png');
    res.send(pngBuffer);
  } catch (error) {
    console.error('Error generating rank card:', error);
    res.status(500).send('Error generating rank card');
  }
});

// POST endpoint for customizing rank card
app.post('/api/customize-rank-card', isAuthenticated, async (req, res) => {
  const { userId, background, theme } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });
  try {
    const data = fs.readFileSync(usersFilePath, 'utf8');
    let usersData = JSON.parse(data);
    if (!usersData[userId]) return res.status(404).json({ error: 'User not found' });
    if (background) usersData[userId].background = background;
    if (theme) usersData[userId].theme = theme;
    fs.writeFileSync(usersFilePath, JSON.stringify(usersData, null, 2), 'utf8');
    res.json({ success: true, message: 'Rank card customization updated' });
  } catch (error) {
    console.error('Error customizing rank card:', error);
    res.status(500).json({ error: 'Error customizing rank card' });
  }
});

// POST endpoint for awarding badges
app.post('/api/award-badge', isAuthenticated, async (req, res) => {
  const { userId, badge } = req.body;
  if (!userId || !badge || !badge.url || !badge.name) {
    return res.status(400).json({ error: 'User ID and badge details are required' });
  }
  try {
    const data = fs.readFileSync(usersFilePath, 'utf8');
    let usersData = JSON.parse(data);
    if (!usersData[userId]) return res.status(404).json({ error: 'User not found' });
    if (!usersData[userId].badges) usersData[userId].badges = [];
    usersData[userId].badges.push({
      url: badge.url,
      name: badge.name,
      awarded: new Date().toISOString()
    });
    fs.writeFileSync(usersFilePath, JSON.stringify(usersData, null, 2), 'utf8');
    res.json({ success: true, message: 'Badge awarded successfully' });
  } catch (error) {
    console.error('Error awarding badge:', error);
    res.status(500).json({ error: 'Error awarding badge' });
  }
});

// ----------------- TWITCH STREAM MONITORING -----------------

const discordWebhook = new WebhookClient({
  url: 'https://discord.com/api/webhooks/1350757751856304201/eszB7dDvf3LTPycFm9HMaV5hJg3ZwKUNuOVKQpobElUQ0JlmGjAPES85desM9SU6beW0'
});
const twitchClientId = 'iwfo8cvgcsi1e632e2mplxnxmhv5la';
const twitchClientSecret = 'fjuu3ahahe42ysokn661j633d9nz68';

const streamers = [
  'CodecCrypton', 'prncessdiana', 'Demon_lord'
];
let liveStreamers = new Set();

async function getTwitchAccessToken() {
  try {
    const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: twitchClientId,
        client_secret: twitchClientSecret,
        grant_type: 'client_credentials'
      }
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Twitch access token:', error);
    throw error;
  }
}

async function getStreamerDetails(usernames, accessToken) {
  try {
    const response = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': twitchClientId,
        'Authorization': `Bearer ${accessToken}`
      },
      params: { login: usernames }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error getting streamer details:', error);
    throw error;
  }
}

async function getLiveStreams(userIds, accessToken) {
  try {
    const response = await axios.get('https://api.twitch.tv/helix/streams', {
      headers: {
        'Client-ID': twitchClientId,
        'Authorization': `Bearer ${accessToken}`
      },
      params: { user_id: userIds }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error getting live streams:', error);
    throw error;
  }
}

async function sendDiscordEmbed(streamer, streamData) {
  const button = new ButtonBuilder()
    .setLabel('Watch Stream')
    .setStyle(ButtonStyle.Link)
    .setURL(`https://twitch.tv/${streamer.login}`);
  const row = new ActionRowBuilder().addComponents(button);

  const thumbnailUrl = streamData.thumbnail_url
    .replace('{width}', '1280')
    .replace('{height}', '720') + `?t=${Date.now()}`;

  const webhookUsername = 'Nurse Joy';
  const webhookAvatarURL = 'https://cdn.discordapp.com/avatars/1350763485583249438/3fa1b9916d6f5a48113062e11723c088.webp?size=1024&format=webp';

  const embed = new EmbedBuilder()
    .setColor(0x9146FF)
    .setTitle(`${streamer.display_name} is now live!`)
    .setURL(`https://twitch.tv/${streamer.login}`)
    .setDescription(`**${streamData.title}**\nPlaying: **${streamData.game_name}**`)
    .setThumbnail(streamer.profile_image_url)
    .setImage(thumbnailUrl)
    .setAuthor({
      name: streamer.display_name,
      iconURL: streamer.profile_image_url,
      url: `https://twitch.tv/${streamer.login}`
    })
    .setFooter({
      text: webhookUsername,
      iconURL: webhookAvatarURL
    })
    .setTimestamp();

  try {
    await discordWebhook.send({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error('Error sending Twitch embed:', error);
  }
}

async function checkStreams() {
  try {
    const accessToken = await getTwitchAccessToken();
    const streamerDetails = await getStreamerDetails(streamers, accessToken);
    const userIds = streamerDetails.map(streamer => streamer.id);
    const liveStreams = await getLiveStreams(userIds, accessToken);

    for (const stream of liveStreams) {
      if (!liveStreamers.has(stream.user_id)) {
        liveStreamers.add(stream.user_id);
        const streamer = streamerDetails.find(s => s.id === stream.user_id);
        sendDiscordEmbed(streamer, stream);
      }
    }
    // Remove streamers that are no longer live
    const liveStreamIds = new Set(liveStreams.map(stream => stream.user_id));
    liveStreamers = new Set([...liveStreamers].filter(id => liveStreamIds.has(id)));
  } catch (error) {
    console.error('Error checking streams:', error);
  }
}

async function startStreamMonitoring() {
  await checkStreams();
  // Check Twitch streams every 5 minutes
  setInterval(checkStreams, 5 * 60 * 1000);
}

startStreamMonitoring();

// ----------------- YOUTUBE RSS MONITORING -----------------

// YouTube webhook configuration
const youtubeWebhook = new WebhookClient({
  url: 'https://discord.com/api/webhooks/1350578151104708670/w218MdklYWFI3IMfuqkVn0C2AQ2owTSVbp2TFSIGDjJzxiZo-eeCnawlEdQFA0eCha9m'
});

// Channel IDs to monitor
const channelIds = ['UCDIc543xkK_mscNGFHEt3fg', 'UCXhj8ks0S5aPq2HysRUdd0g', 'UCkEmfIXOxdRsG_3EDU7UFCQ'];

// File path for persistent storage in the same Json directory
const JSON_DIR = path.join(process.cwd(), 'src', 'Json');
const PROCESSED_VIDEOS_PATH = path.join(JSON_DIR, 'processed_videos.json');
const CHANNEL_DATA_PATH = path.join(JSON_DIR, 'youtube_channel_data.json');

// Ensure JSON directory exists
if (!fs.existsSync(JSON_DIR)) {
  console.log(`Creating JSON directory at: ${JSON_DIR}`);
  try {
    fs.mkdirSync(JSON_DIR, { recursive: true });
    console.log(`Successfully created JSON directory at: ${JSON_DIR}`);
  } catch (error) {
    console.error(`Failed to create JSON directory: ${error.message}`);
  }
}

// Set of processed video IDs to avoid duplicates
let processedVideoIds = new Set();

// Last known videos per channel
let channelData = {};

// Load processed video IDs from disk with improved error handling
function loadProcessedVideoIds() {
  try {
    if (fs.existsSync(PROCESSED_VIDEOS_PATH)) {
      const fileContent = fs.readFileSync(PROCESSED_VIDEOS_PATH, 'utf8');
      
      // Check if file content is valid
      if (!fileContent || fileContent.trim() === '') {
        console.warn(`Empty processed videos file found at: ${PROCESSED_VIDEOS_PATH}`);
        processedVideoIds = new Set();
        return;
      }
      
      const data = JSON.parse(fileContent);
      
      if (!Array.isArray(data)) {
        console.error('Processed videos data is not an array, resetting');
        processedVideoIds = new Set();
        return;
      }
      
      processedVideoIds = new Set(data);
    
      if (processedVideoIds.size > 0) {
      }
    } else {
      console.warn(`No processed videos file found at: ${PROCESSED_VIDEOS_PATH}`);
      processedVideoIds = new Set();
    }
  } catch (error) {
    console.error(`Error loading processed video IDs from ${PROCESSED_VIDEOS_PATH}:`, error);
    processedVideoIds = new Set();
  }
}

// Save processed video IDs to disk with verification
function saveProcessedVideoIds() {
  try {
    const data = Array.from(processedVideoIds);
    // Limit to most recent 1000 videos to manage file size
    const recentVideos = data.slice(Math.max(0, data.length - 1000));
    
    // Create a temporary file first to avoid corruption
    const tempFilePath = `${PROCESSED_VIDEOS_PATH}.tmp`;
    fs.writeFileSync(tempFilePath, JSON.stringify(recentVideos), 'utf8');
    
    // Verify the temp file was written correctly
    if (!fs.existsSync(tempFilePath)) {
      throw new Error('Failed to write temporary file');
    }
    
    // Rename temp file to actual file (atomic operation)
    fs.renameSync(tempFilePath, PROCESSED_VIDEOS_PATH);
    
    // Final verification
    if (fs.existsSync(PROCESSED_VIDEOS_PATH)) {
    } else {
      console.error(`Failed to verify video ID file was saved at: ${PROCESSED_VIDEOS_PATH}`);
    }
  } catch (error) {
    console.error(`Error saving processed video IDs to ${PROCESSED_VIDEOS_PATH}:`, error);
  }
}

// Load channel data
function loadChannelData() {
  try {
    if (fs.existsSync(CHANNEL_DATA_PATH)) {
      const fileContent = fs.readFileSync(CHANNEL_DATA_PATH, 'utf8');
      
      // Check if file content is valid
      if (!fileContent || fileContent.trim() === '') {
        console.warn(`Empty channel data file found at: ${CHANNEL_DATA_PATH}`);
        channelData = {};
        return;
      }
      
      channelData = JSON.parse(fileContent);
      
      // Show sample of loaded data
      for (const [channelId, videos] of Object.entries(channelData)) {
        if (Array.isArray(videos) && videos.length > 0) {
        }
      }
    } else {
      console.warn(`No channel data file found at: ${CHANNEL_DATA_PATH}`);
      channelData = {};
    }
  } catch (error) {
    console.error(`Error loading channel data from ${CHANNEL_DATA_PATH}:`, error);
    channelData = {};
  }
}

// Save channel data
function saveChannelData() {
  try {
    const tempFilePath = `${CHANNEL_DATA_PATH}.tmp`;
    fs.writeFileSync(tempFilePath, JSON.stringify(channelData), 'utf8');
    
    // Verify the temp file was written correctly
    if (!fs.existsSync(tempFilePath)) {
      throw new Error('Failed to write temporary file');
    }
    
    // Rename temp file to actual file (atomic operation)
    fs.renameSync(tempFilePath, CHANNEL_DATA_PATH);
    
    // Final verification
    if (!fs.existsSync(CHANNEL_DATA_PATH)) {
      console.error(`Failed to verify channel data file was saved at: ${CHANNEL_DATA_PATH}`);
    }
  } catch (error) {
    console.error(`Error saving channel data to ${CHANNEL_DATA_PATH}:`, error);
  }
}

// Fetch and process RSS feed for a YouTube channel
async function fetchRSSFeed(channelId) {
  try {
    const response = await axios.get(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DiscordBot/1.0)'
      }
    });
    
    const xml = response.data;
    const videoEntries = await parseRSS(xml);
    
    // Store latest videos for this channel
    channelData[channelId] = videoEntries;
    saveChannelData();
    
    // Process new videos
    let newVideoCount = 0;
    
    for (const video of videoEntries) {
      // Check if already processed with detailed logging
      const isProcessed = processedVideoIds.has(video.id);
      
      if (isProcessed) {
        continue;
      }
      
      // Send to Discord
      const success = await sendYoutubeEmbed(video);
      
      if (success) {
        // Mark as processed and save immediately
        processedVideoIds.add(video.id);
        saveProcessedVideoIds();
        newVideoCount++;
        
        // Add a delay between videos to avoid Discord rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Log summary
    if (newVideoCount > 0) {
    } else {
    }
    
  } catch (error) {
    console.error(`Error fetching RSS feed for channel ${channelId}:`, error.message);
    // If we have cached data, log that we're using it
    if (channelData[channelId]) {
    }
  }
}

// Parse RSS feed with improved error handling
async function parseRSS(xml) {
  const parser = new xml2js.Parser({ explicitArray: false });
  let result;
  
  try {
    result = await parser.parseStringPromise(xml);
  } catch (error) {
    console.error("Error parsing XML:", error);
    return [];
  }
  
  if (!result || !result.feed) {
    console.error("Invalid RSS feed format - missing feed element");
    return [];
  }
  
  let entries = result.feed.entry;
  if (!entries) {
    console.log("No entries found in RSS feed");
    return [];
  }
  
  if (!Array.isArray(entries)) {
    console.log("Single entry found in RSS feed, converting to array");
    entries = [entries];
  }
  
  return entries.map(entry => {
    // Extract video ID - important for tracking
    const id = entry.id || '';
    
    // Extract video link
    let link = '';
    try {
      if (Array.isArray(entry.link)) {
        const alternateLink = entry.link.find(l => l.$ && l.$.rel === 'alternate');
        link = alternateLink ? alternateLink.$.href : (entry.link[0].$ ? entry.link[0].$.href : '');
      } else if (entry.link && entry.link.$) {
        link = entry.link.$.href;
      }
    } catch (err) {
      console.error(`Error extracting link for video ${id}:`, err.message);
    }
    
    // Extract thumbnail URL
    let thumbnailUrl = '';
    try {
      if (entry['media:group'] && entry['media:group']['media:thumbnail']) {
        thumbnailUrl = Array.isArray(entry['media:group']['media:thumbnail'])
          ? entry['media:group']['media:thumbnail'][0].$.url
          : entry['media:group']['media:thumbnail'].$.url;
      }
    } catch (err) {
      console.error(`Error extracting thumbnail for video ${id}:`, err.message);
    }
    
    // Get author info safely
    const author = entry.author && entry.author.name ? entry.author.name : 'Unknown';
    
    // Get title safely
    const title = entry.title || 'Untitled Video';
    
    return {
      id,
      title,
      url: link,
      author,
      thumbnailUrl,
      publishDate: entry.published || new Date().toISOString()
    };
  });
}

// Send a YouTube video embed to Discord with improved error handling
async function sendYoutubeEmbed(video) {
  
  // Double-check if already processed
  if (processedVideoIds.has(video.id)) {
    return false;
  }
  
  try {
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle(`New video: ${video.title}`)
      .setURL(video.url)
      .setDescription(`Check out the latest video: ${video.title}`)
      .setThumbnail(video.thumbnailUrl || 'https://www.youtube.com/favicon.ico')
      .setAuthor({
        name: video.author,
        iconURL: 'https://cdn.discordapp.com/avatars/1278780112598335580/e5b8ac8063d82a8196507675bfec2950.webp?size=1024&format=webp',
        url: `https://www.youtube.com/channel/${video.id.split(':')[0]}`
      })
      .setFooter({ 
        text: 'Nurse Joy', 
        iconURL: 'https://cdn.discordapp.com/avatars/1350763485583249438/3fa1b9916d6f5a48113062e11723c088.webp?size=1024&format=webp' 
      })
      .setTimestamp();
    
    await youtubeWebhook.send({ embeds: [embed] });
    return true;
  } catch (err) {
    console.error(`Error sending YouTube embed for video ${video.id}:`, err);
    return false;
  }
}

// Monitor all YouTube channels
async function monitorChannels() {
  console.log('Starting periodic YouTube channel monitoring');
  console.log(`Currently tracking ${processedVideoIds.size} processed video IDs`);
  
  try {
    for (const channelId of channelIds) {
      await fetchRSSFeed(channelId);
      
      // Add a delay between channels to prevent rate limiting
      if (channelIds.indexOf(channelId) < channelIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  } catch (error) {
    console.error('Error in YouTube channel monitoring:', error);
  }
}

// Initialize YouTube monitoring
async function initializeYoutubeMonitoring() {
  console.log('Initializing YouTube monitoring...');
  
  // Load saved state
  loadProcessedVideoIds();
  loadChannelData();
  
  // Perform initial check
  await monitorChannels();
  
  // Set up periodic monitoring - every 5 minutes (more reasonable than every minute)
  console.log('Setting up periodic YouTube monitoring every 5 minutes');
  setInterval(monitorChannels, 5 * 60 * 1000);
  
  console.log('YouTube monitoring initialized successfully');
}

// Start YouTube monitoring
initializeYoutubeMonitoring();

// ----------------- TWITTER URL EMBEDDING INTEGRATION -----------------

// Twitter API Configuration
const TWITTER_CONFIG = {
  bearerToken: 'AAAAAAAAAAAAAAAAAAAAAEAD0AEAAAAA8Q97Pivs9%2FNywriIOz0QRe3nEwo%3DMkL14lIBiKIaqlav0PvLWr4IxSrWyjM5jWBvbRLMuJ2biIVPZE'
};

// Discord Webhook Configuration
const DISCORD_WEBHOOKS = {
  'SerebiiNet': 'https://discord.com/api/webhooks/1350763485583249438/wDT8mb_NUZgs1qCC5v2QoqLZfXlbib32qDhFysVtXXJSts1lz-IoulWa3t4mCQ1ylvZr',
  'Pokemon': 'https://discord.com/api/webhooks/1350818098844008458/pYkGgFpTf7xrXwTkpKD4QXZelLV4dpK4DLarbWMUfdotgYvQvQ5bXrhKXTmPjZe4Ho5s'
};

// Accounts to monitor
const ACCOUNTS_TO_MONITOR = [
  { 
    username: 'SerebiiNet',
    id: '38857814',
    priority: 1
  },
  { 
    username: 'Pokemon',
    id: '96879107',
    priority: 2
  }
];

// File paths for persistent storage - consolidated in src/Json directory
const PROCESSED_TWEETS_PATH = path.join(JSON_DIR, 'processed_tweets.json');
const LAST_TWEETS_PATH = path.join(JSON_DIR, 'last_tweets.json');
const RATE_LIMIT_PATH = path.join(JSON_DIR, 'rate_limits.json');

// Global Twitter client that will be initialized
let twitterClient = null;
let twitterClientV2 = null;

// Set of processed tweet IDs to avoid duplicates
let processedTweetIds = new Set();

// Last known tweets per account
let lastKnownTweets = {};

// Rate limit tracking
let rateLimitState = {
  reset: 0,
  next_account: 0,
  scheduledJob: null,
  inProgress: false
};

// Initialize Twitter API client
function initializeTwitterClient() {
  try {
    console.log('Initializing Twitter API client...');
    twitterClient = new TwitterApi(TWITTER_CONFIG.bearerToken);
    twitterClientV2 = twitterClient.v2;
    console.log('Twitter API client successfully initialized');
    return true;
  } catch (error) {
    console.error(`Failed to initialize Twitter API client: ${error.message}`);
    return false;
  }
}

// Ensure JSON directory and files exist
function ensureTwitterFilesExist() {
  console.log('Ensuring Twitter files exist...');
  console.log(`Current working directory: ${process.cwd()}`);
  console.log(`Full JSON directory path: ${JSON_DIR}`);
  
  // First, ensure the directory exists
  try {
    if (!fs.existsSync(JSON_DIR)) {
      fs.mkdirSync(JSON_DIR, { recursive: true });
      console.log(`Created JSON directory at: ${JSON_DIR}`);
    } else {
      console.log(`JSON directory already exists at: ${JSON_DIR}`);
    }
  } catch (error) {
    console.error(`Error creating JSON directory: ${error.code} - ${error.message}`);
    // Try to create with different permissions
    try {
      fs.mkdirSync(JSON_DIR, { recursive: true, mode: 0o777 });
      console.log(`Created JSON directory with full permissions at: ${JSON_DIR}`);
    } catch (innerError) {
      console.error(`Critical error creating JSON directory: ${innerError.code} - ${innerError.message}`);
    }
  }
  
  // Create processed tweets file if it doesn't exist
  try {
    if (!fs.existsSync(PROCESSED_TWEETS_PATH)) {
      fs.writeFileSync(PROCESSED_TWEETS_PATH, '[]', 'utf8');
      console.log(`Created empty processed tweets file at: ${PROCESSED_TWEETS_PATH}`);
    } else {
      console.log(`Processed tweets file already exists at: ${PROCESSED_TWEETS_PATH}`);
    }
  } catch (error) {
    console.error(`Error creating processed tweets file: ${error.code} - ${error.message}`);
  }
  
  // Create last tweets file if it doesn't exist
  try {
    if (!fs.existsSync(LAST_TWEETS_PATH)) {
      fs.writeFileSync(LAST_TWEETS_PATH, '{}', 'utf8');
      console.log(`Created empty last tweets file at: ${LAST_TWEETS_PATH}`);
    } else {
      console.log(`Last tweets file already exists at: ${LAST_TWEETS_PATH}`);
    }
  } catch (error) {
    console.error(`Error creating last tweets file: ${error.code} - ${error.message}`);
  }
  
  // Create rate limit file if it doesn't exist
  try {
    if (!fs.existsSync(RATE_LIMIT_PATH)) {
      fs.writeFileSync(RATE_LIMIT_PATH, '{"reset":0,"next_account":0}', 'utf8');
      console.log(`Created empty rate limit file at: ${RATE_LIMIT_PATH}`);
    } else {
      console.log(`Rate limit file already exists at: ${RATE_LIMIT_PATH}`);
    }
  } catch (error) {
    console.error(`Error creating rate limit file: ${error.code} - ${error.message}`);
  }
}

// Generic function to safely write JSON data to file
async function safeWriteJsonToFile(filePath, data, description) {
  return new Promise((resolve, reject) => {
    try {
      const tempFilePath = `${filePath}.tmp`;
      const jsonData = JSON.stringify(data);
      
      // Write to temp file first
      fs.writeFile(tempFilePath, jsonData, 'utf8', (writeErr) => {
        if (writeErr) {
          console.error(`Error writing temp ${description} file: ${writeErr.code} - ${writeErr.message}`);
          return reject(writeErr);
        }
        
        // Rename temp file to actual file (atomic operation)
        fs.rename(tempFilePath, filePath, (renameErr) => {
          if (renameErr) {
            console.error(`Error renaming temp ${description} file: ${renameErr.code} - ${renameErr.message}`);
            return reject(renameErr);
          }
          
          // Verify file exists after saving
          fs.access(filePath, fs.constants.F_OK, (accessErr) => {
            if (accessErr) {
              console.error(`Error verifying ${description} file: ${accessErr.code} - ${accessErr.message}`);
              return reject(accessErr);
            }
            resolve(true);
          });
        });
      });
    } catch (error) {
      console.error(`Unexpected error saving ${description}: ${error.message}`);
      reject(error);
    }
  });
}

// Load processed tweet IDs from disk with improved error handling
function loadProcessedTweetIds() {
  try {
    if (fs.existsSync(PROCESSED_TWEETS_PATH)) {
      const fileContent = fs.readFileSync(PROCESSED_TWEETS_PATH, 'utf8');
      
      // Check if file content is valid
      if (!fileContent || fileContent.trim() === '') {
        console.warn(`Empty processed tweets file found at: ${PROCESSED_TWEETS_PATH}`);
        processedTweetIds = new Set();
        return;
      }
      
      const data = JSON.parse(fileContent);
      
      if (!Array.isArray(data)) {
        console.error('Processed tweets data is not an array, resetting');
        processedTweetIds = new Set();
        return;
      }
      
      processedTweetIds = new Set(data);
      
      console.log(`Successfully loaded ${processedTweetIds.size} processed tweet IDs from disk`);
      if (processedTweetIds.size > 0) {
        console.log(`Sample IDs: ${Array.from(processedTweetIds).slice(0, 3).join(', ')}`);
      }
    } else {
      console.warn(`No processed tweets file found at: ${PROCESSED_TWEETS_PATH}, creating empty file`);
      fs.writeFileSync(PROCESSED_TWEETS_PATH, '[]', 'utf8');
      processedTweetIds = new Set();
    }
  } catch (error) {
    console.error(`Error loading processed tweet IDs from ${PROCESSED_TWEETS_PATH}: ${error.code} - ${error.message}`);
    // Try to create the file if it doesn't exist
    try {
      fs.writeFileSync(PROCESSED_TWEETS_PATH, '[]', 'utf8');
      console.log(`Created new empty processed tweets file at: ${PROCESSED_TWEETS_PATH}`);
      processedTweetIds = new Set();
    } catch (writeError) {
      console.error(`Failed to create processed tweets file: ${writeError.code} - ${writeError.message}`);
      processedTweetIds = new Set();
    }
  }
}

// Save processed tweet IDs to disk with verification
async function saveProcessedTweetIds() {
  
  try {
    const data = Array.from(processedTweetIds);
    // Limit to most recent 1000 tweets to manage file size
    const recentTweets = data.slice(Math.max(0, data.length - 1000));
    
    await safeWriteJsonToFile(PROCESSED_TWEETS_PATH, recentTweets, `${recentTweets.length} processed tweet IDs`);
    return true;
  } catch (error) {
    console.error(`Error saving processed tweet IDs to ${PROCESSED_TWEETS_PATH}: ${error.message}`);
    return false;
  }
}

// Load last known tweets with improved error handling
function loadLastKnownTweets() {
  console.log(`Attempting to load last known tweets from: ${LAST_TWEETS_PATH}`);
  try {
    if (fs.existsSync(LAST_TWEETS_PATH)) {
      const fileContent = fs.readFileSync(LAST_TWEETS_PATH, 'utf8');
      
      // Check if file content is valid
      if (!fileContent || fileContent.trim() === '') {
        console.warn(`Empty last known tweets file found at: ${LAST_TWEETS_PATH}`);
        lastKnownTweets = {};
        return;
      }
      
      lastKnownTweets = JSON.parse(fileContent);
      
      // Show sample of loaded data
      for (const [username, tweets] of Object.entries(lastKnownTweets)) {
        if (Array.isArray(tweets) && tweets.length > 0) {
        }
      }
    } else {
      console.warn(`No last known tweets file found at: ${LAST_TWEETS_PATH}, creating empty file`);
      fs.writeFileSync(LAST_TWEETS_PATH, '{}', 'utf8');
      lastKnownTweets = {};
    }
  } catch (error) {
    console.error(`Error loading last known tweets from ${LAST_TWEETS_PATH}: ${error.code} - ${error.message}`);
    // Try to create the file if it doesn't exist
    try {
      fs.writeFileSync(LAST_TWEETS_PATH, '{}', 'utf8');
      console.log(`Created new empty last known tweets file at: ${LAST_TWEETS_PATH}`);
      lastKnownTweets = {};
    } catch (writeError) {
      console.error(`Failed to create last known tweets file: ${writeError.code} - ${writeError.message}`);
      lastKnownTweets = {};
    }
  }
}

// Save last known tweets with verification
async function saveLastKnownTweets() {
  
  try {
    await safeWriteJsonToFile(LAST_TWEETS_PATH, lastKnownTweets, 'last known tweets');
    return true;
  } catch (error) {
    console.error(`Error saving last known tweets to ${LAST_TWEETS_PATH}: ${error.message}`);
    return false;
  }
}

// Load rate limit state with improved error handling
function loadRateLimitState() {
  console.log(`Attempting to load rate limit state from: ${RATE_LIMIT_PATH}`);
  try {
    if (fs.existsSync(RATE_LIMIT_PATH)) {
      const fileContent = fs.readFileSync(RATE_LIMIT_PATH, 'utf8');
      
      // Check if file content is valid
      if (!fileContent || fileContent.trim() === '') {
        console.warn(`Empty rate limit state file found at: ${RATE_LIMIT_PATH}`);
        return;
      }
      
      const savedState = JSON.parse(fileContent);
      rateLimitState.reset = savedState.reset || 0;
      rateLimitState.next_account = savedState.next_account || 0;
    } else {
      console.warn(`No rate limit state file found at: ${RATE_LIMIT_PATH}, creating empty file`);
      const defaultState = {reset: 0, next_account: 0};
      fs.writeFileSync(RATE_LIMIT_PATH, JSON.stringify(defaultState), 'utf8');
    }
  } catch (error) {
    console.error(`Error loading rate limit state from ${RATE_LIMIT_PATH}: ${error.code} - ${error.message}`);
    // Try to create the file if it doesn't exist
    try {
      const defaultState = {reset: 0, next_account: 0};
      fs.writeFileSync(RATE_LIMIT_PATH, JSON.stringify(defaultState), 'utf8');
      console.log(`Created new empty rate limit state file at: ${RATE_LIMIT_PATH}`);
    } catch (writeError) {
      console.error(`Failed to create rate limit state file: ${writeError.code} - ${writeError.message}`);
    }
  }
}

// Save rate limit state with verification
async function saveRateLimitState() {
  try {
    const stateToSave = {
      reset: rateLimitState.reset,
      next_account: rateLimitState.next_account
    };
    
    await safeWriteJsonToFile(RATE_LIMIT_PATH, stateToSave, 'rate limit state');
    return true;
  } catch (error) {
    console.error(`Error saving rate limit state to ${RATE_LIMIT_PATH}: ${error.message}`);
    return false;
  }
}

// Get the next account to check
function getNextAccount() {
  const accountIndex = rateLimitState.next_account % ACCOUNTS_TO_MONITOR.length;
  rateLimitState.next_account = (rateLimitState.next_account + 1) % ACCOUNTS_TO_MONITOR.length;
  saveRateLimitState();
  return ACCOUNTS_TO_MONITOR[accountIndex];
}

// Get latest tweets for an account with improved error handling
async function getLatestTweets(account) {
  // Ensure Twitter client is initialized
  if (!twitterClient || !twitterClientV2) {
    console.log('Twitter client not initialized, attempting to initialize...');
    if (!initializeTwitterClient()) {
      console.error('Failed to initialize Twitter client, cannot fetch tweets');
      return [];
    }
  }

  try {
    const { username, id } = account;
    console.log(`Fetching latest tweets for ${username} (ID: ${id})`);
    
    // Twitter requires at least 5 results
    const queryParams = {
      'max_results': 5,  // Minimum allowed by Twitter
      'tweet.fields': 'created_at'
    };
    
    // Execute the timeline query
    const timeline = await twitterClientV2.userTimeline(id, queryParams);
    
    // Extract tweet IDs and creation times
    const tweets = (timeline.data?.data || []).map(tweet => ({
      id: tweet.id,
      created_at: tweet.created_at
    }));
    
    // Log each retrieved tweet for debugging
    tweets.forEach((tweet, index) => {
    });
    
    // Handle rate limit information
    if (timeline.rateLimit) {
      const resetTimestamp = parseInt(timeline.rateLimit.reset) * 1000;
      console.log(`Rate limit: ${timeline.rateLimit.remaining}/${timeline.rateLimit.limit} requests remaining, reset at ${new Date(resetTimestamp).toLocaleString()}`);
      
      // Update rate limit state
      rateLimitState.reset = resetTimestamp;
      saveRateLimitState();
    }
    
    // Store current tweets (even if not new)
    lastKnownTweets[username] = tweets;
    saveLastKnownTweets();
    
    return tweets;
  } catch (error) {
    console.error(`Error fetching tweets for ${account.username}:`, error);
    
    if (error.rateLimit) {
      const resetTimestamp = error.rateLimit.reset * 1000;
      console.log(`Rate limit exceeded. Reset at ${new Date(resetTimestamp).toLocaleString()}`);
      
      rateLimitState.reset = resetTimestamp;
      saveRateLimitState();
    }
    
    // Use cached tweets as fallback
    if (lastKnownTweets[account.username]) {
      return lastKnownTweets[account.username];
    }
    
    return [];
  }
}

// Send a tweet URL to Discord with improved error handling
async function sendTweetToDiscord(account, tweetId) {
  
  // Double-check if already processed
  if (processedTweetIds.has(tweetId)) {
    return false;
  }
  
  try {
    // Construct the tweet URL
    const tweetUrl = `https://twitter.com/${account.username}/status/${tweetId}`;
    
    // Verify webhook exists for this account
    if (!DISCORD_WEBHOOKS[account.username]) {
      console.error(`No webhook configured for ${account.username}`);
      return false;
    }
    
    // Create the webhook client
    const webhookClient = new WebhookClient({ 
      url: DISCORD_WEBHOOKS[account.username] 
    });
    
    // Send the message with just the URL - Discord will handle embedding
    await webhookClient.send({
      content: `Hey, ${account.username} just posted a new Tweet!\n${tweetUrl}`
    });
    
    // Mark as processed and save immediately
    processedTweetIds.add(tweetId);
    saveProcessedTweetIds();
    
    return true;
  } catch (error) {
    console.error(`Error sending tweet URL to Discord:`, error);
    return false;
  }
}

// Check an account for new tweets with improved verification
async function checkAccountForTweets(account) {
  if (rateLimitState.inProgress) {
    return;
  }
  
  rateLimitState.inProgress = true;
  
  try {
    const { username } = account;
    
    // Get latest tweets
    const tweets = await getLatestTweets(account);
    
    if (tweets.length === 0) {
      rateLimitState.inProgress = false;
      scheduleNextCheck();
      return;
    }
    
    // Process each tweet, starting with the most recent
    let newTweetCount = 0;
    
    // Sort by creation time (most recent first)
    const sortedTweets = tweets.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    for (const tweet of sortedTweets) {
      // Check if already processed with detailed logging
      const isProcessed = processedTweetIds.has(tweet.id);
      
      if (isProcessed) {
        continue;
      }
      
      // Send to Discord
      const success = await sendTweetToDiscord(account, tweet.id);
      
      if (success) {
        newTweetCount++;
        
        // Add a delay between tweets to avoid Discord rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Log summary
    if (newTweetCount > 0) {
    } else {
    }
  } catch (error) {
    console.error(`Error checking tweets for ${account.username}:`, error);
  } finally {
    rateLimitState.inProgress = false;
    scheduleNextCheck();
  }
}

// Schedule the next account check
function scheduleNextCheck() {
  // Cancel any existing scheduled job
  if (rateLimitState.scheduledJob) {
    rateLimitState.scheduledJob.cancel();
    rateLimitState.scheduledJob = null;
  }
  
  const now = Date.now();
  let nextCheckTime;
  
  // Significant minimum interval to avoid rate limits
  const minimumInterval = 30 * 60 * 1000; // 30 minutes minimum
  
  if (now >= rateLimitState.reset) {
    // Even after reset, ensure minimum interval
    nextCheckTime = new Date(now + minimumInterval);
  } else {
    // Wait until rate limit reset plus buffer
    nextCheckTime = new Date(Math.max(rateLimitState.reset + 5000, now + minimumInterval));
  }
  
  const nextAccount = getNextAccount();
  console.log(`Scheduling next check for ${nextAccount.username} at ${nextCheckTime.toLocaleString()}`);
  
  rateLimitState.scheduledJob = schedule.scheduleJob(nextCheckTime, function() {
    checkAccountForTweets(nextAccount);
  });
}

// Redundant checking mechanism for resilience
function setupRedundantChecking() {
  // Reduced frequency - check once every 12 hours as backup
  const redundantCheckInterval = 12 * 60 * 60 * 1000; // 12 hours
  
  console.log(`Setting up redundant checks every ${redundantCheckInterval/3600000} hours`);
  
  setInterval(() => {
    if (!rateLimitState.scheduledJob && !rateLimitState.inProgress) {
      console.log('Running redundant check due to extended inactivity');
      
      // Start with highest priority account
      const priorityAccounts = [...ACCOUNTS_TO_MONITOR].sort((a, b) => a.priority - b.priority);
      if (priorityAccounts.length > 0) {
        checkAccountForTweets(priorityAccounts[0]);
      }
    }
  }, redundantCheckInterval);
}

// Initialize Twitter monitoring with improved error handling
async function initializeTwitterMonitoring() {
  console.log('Starting Twitter monitoring initialization...');
  
  try {
    // First, ensure files and directories exist
    ensureTwitterFilesExist();
    
    // Initialize Twitter client
    if (!initializeTwitterClient()) {
      console.error('Failed to initialize Twitter client, aborting initialization');
      return false;
    }
    
    // Check if we can authenticate with Twitter
    console.log('Validating Twitter API credentials...');
    try {
      // Test with a minimal query to verify credentials
      await twitterClientV2.get('users/me');
      console.log('Twitter API credentials are valid');
    } catch (authError) {
      console.error(`Twitter API authentication failed: ${authError.message}`);
      if (authError.code === 401) {
        console.error('Invalid or expired bearer token. Please update your token.');
        return false;
      }
    }
    
    // Load saved state - important to load before any tweet checking
    console.log('Loading saved state from disk...');
    loadProcessedTweetIds();
    loadLastKnownTweets();
    loadRateLimitState();
    
    // Initial check or schedule based on rate limit state
    const now = Date.now();
    if (now > rateLimitState.reset) {
      // Get next account in queue
      const nextAccount = getNextAccount();
      console.log(`Starting with check for ${nextAccount.username}`);
      await checkAccountForTweets(nextAccount);
    } else {
      // Schedule after rate limit reset
      scheduleNextCheck();
    }
    
    // Set up redundant checking
    setupRedundantChecking();
    
    console.log('Twitter URL embedding integration initialized successfully');
    return true;
  } catch (error) {
    console.error(`Error initializing Twitter integration: ${error.message}`);
    console.error(error.stack);
    // Schedule retry in 30 minutes
    setTimeout(initializeTwitterMonitoring, 30 * 60 * 1000);
    return false;
  }
}

// Graceful shutdown handler for Twitter integration
function shutdownTwitterIntegration() {
  console.log('Shutting down Twitter integration...');
  if (rateLimitState.scheduledJob) {
    rateLimitState.scheduledJob.cancel();
  }
  saveProcessedTweetIds();
  saveLastKnownTweets();
  saveRateLimitState();
}

// API endpoint to check Twitter file status
app.get('/api/twitter-status', (req, res) => {
  const status = {
    directoryStatus: {
      path: JSON_DIR,
      exists: fs.existsSync(JSON_DIR)
    },
    files: {
      processedTweets: {
        path: PROCESSED_TWEETS_PATH,
        exists: fs.existsSync(PROCESSED_TWEETS_PATH)
      },
      lastTweets: {
        path: LAST_TWEETS_PATH,
        exists: fs.existsSync(LAST_TWEETS_PATH)
      },
      rateLimit: {
        path: RATE_LIMIT_PATH,
        exists: fs.existsSync(RATE_LIMIT_PATH)
      }
    },
    memory: {
      processedTweetIds: processedTweetIds.size,
      lastKnownTweets: Object.keys(lastKnownTweets).length,
      rateLimitState: {
        reset: rateLimitState.reset,
        next_account: rateLimitState.next_account,
        inProgress: rateLimitState.inProgress
      }
    },
    client: {
      initialized: twitterClient !== null && twitterClientV2 !== null
    }
  };
  
  // If files exist, add file stats
  if (status.files.processedTweets.exists) {
    try {
      const stats = fs.statSync(PROCESSED_TWEETS_PATH);
      status.files.processedTweets.size = stats.size;
      status.files.processedTweets.modified = stats.mtime;
      
      if (stats.size > 0) {
        const data = JSON.parse(fs.readFileSync(PROCESSED_TWEETS_PATH, 'utf8'));
        status.files.processedTweets.content = Array.isArray(data) ? 
          `Array with ${data.length} items` : 'Invalid format';
      } else {
        status.files.processedTweets.content = 'Empty file';
      }
    } catch (error) {
      status.files.processedTweets.error = error.message;
    }
  }
  
  res.json(status);
});

// Initialize Twitter integration
initializeTwitterMonitoring().then(success => {
  if (!success) {
    console.warn('Twitter integration initialized with warnings - check logs for details');
  }
});

// Add Twitter shutdown to process exit handler
const originalSigintHandler = process.listeners('SIGINT')[0];
process.removeAllListeners('SIGINT');
process.on('SIGINT', () => {
  shutdownTwitterIntegration();
  if (typeof originalSigintHandler === 'function') {
    originalSigintHandler();
  } else {
    process.exit(0);
  }
});

// ----------------- START THE EXPRESS SERVER -----------------

app.listen(port, ip, () => {
  console.log(`Dashboard is running at http://${ip}:${port}`);
});