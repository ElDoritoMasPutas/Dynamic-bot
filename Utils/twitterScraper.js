// ----------------- TWITTER SCRAPING INTEGRATION (RESILIENT VERSION) -----------------
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { WebhookClient, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// File paths for persistent storage
const JSON_DIR = path.join(process.cwd(), 'src', 'Json');
const TWITTER_PROCESSED_TWEETS_PATH = path.join(JSON_DIR, 'twitter_processed_tweets.json');
const TWITTER_LAST_TWEETS_PATH = path.join(JSON_DIR, 'twitter_last_tweets.json');
const TWITTER_CONFIG_PATH = path.join(JSON_DIR, 'twitter_config.json');

// Ensure JSON directory exists
if (!fs.existsSync(JSON_DIR)) {
  try {
    fs.mkdirSync(JSON_DIR, { recursive: true });
    console.log(`Created JSON directory at: ${JSON_DIR}`);
  } catch (error) {
    console.error(`Failed to create JSON directory: ${error.message}`);
  }
}

// Default configuration
let TWITTER_CONFIG = {
  accounts: [
    { 
      username: 'SerebiiNet',
      priority: 1
    },
    { 
      username: 'Pokemon',
      priority: 2
    }
  ],
  webhooks: {
    'SerebiiNet': 'https://discord.com/api/webhooks/1350763485583249438/wDT8mb_NUZgs1qCC5v2QoqLZfXlbib32qDhFysVtXXJSts1lz-IoulWa3t4mCQ1ylvZr',
    'Pokemon': 'https://discord.com/api/webhooks/1350818098844008458/pYkGgFpTf7xrXwTkpKD4QXZelLV4dpK4DLarbWMUfdotgYvQvQ5bXrhKXTmPjZe4Ho5s'
  },
  checkInterval: 35, // minutes between checks
  jitterAmount: 15,  // random variation in minutes to appear more human-like
  maxRetries: 5,     // max number of retries for scraping
  webhookUsername: 'Nurse Joy',
  webhookAvatarURL: 'https://cdn.discordapp.com/avatars/1278780112598335580/e5b8ac8063d82a8196507675bfec2950.webp?size=1024&format=webp',
  rotationStrategy: 'random', // random, sequential, priority
  useHeadlessBrowsers: true,
  browserMaxLifetime: 20 // minutes before recycling browser instances
};

// Multiple Twitter frontends to try (with rotation)
const TWITTER_FRONTENDS = [
  // Primary frontends - Twitter alternatives/proxies
  {
    name: 'nitter.privacydev.net',
    baseUrl: 'https://nitter.privacydev.net',
    type: 'html',
    parser: 'nitter',
    active: true,
    lastUsed: 0,
    failCount: 0,
    maxFails: 5,
    priority: 1
  },
  {
    name: 'bird.froth.zone',
    baseUrl: 'https://bird.froth.zone',
    type: 'html',
    parser: 'birdfroth',
    active: true,
    lastUsed: 0,
    failCount: 0,
    maxFails: 5,
    priority: 2
  },
  {
    name: 'nitter.poast.org',
    baseUrl: 'https://nitter.poast.org',
    type: 'html',
    parser: 'nitter',
    active: true,
    lastUsed: 0,
    failCount: 0,
    maxFails: 5,
    priority: 3
  },
  {
    name: 'nitter.1d4.us',
    baseUrl: 'https://nitter.1d4.us',
    type: 'html',
    parser: 'nitter',
    active: true,
    lastUsed: 0,
    failCount: 0,
    maxFails: 5,
    priority: 4
  },
  {
    name: 'twitter.censors.us',
    baseUrl: 'https://twitter.censors.us',
    type: 'html',
    parser: 'nitter',
    active: true,
    lastUsed: 0,
    failCount: 0,
    maxFails: 5,
    priority: 5
  },
  // Direct browser approach - most resilient but resource-intensive
  {
    name: 'direct-browser',
    baseUrl: 'https://twitter.com',
    type: 'browser',
    parser: 'twitter_direct',
    active: true,
    lastUsed: 0,
    failCount: 0,
    maxFails: 3,
    priority: 7,
    options: {
      headless: true,
      waitForSelector: '[data-testid="tweet"]'
    }
  }
];

// Enhanced Browser Profiles with tracking evasion
const BROWSER_PROFILES = [
  {
    name: 'Windows Chrome',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    headers: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Ch-Ua': '"Not.A/Brand";v="8", "Chromium";v="119", "Google Chrome";v="119"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    },
    viewport: { width: 1920, height: 1080 }
  },
  {
    name: 'MacOS Safari',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    headers: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    },
    viewport: { width: 1680, height: 1050 }
  },
  {
    name: 'Windows Edge',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    headers: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Ch-Ua': '"Not.A/Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    },
    viewport: { width: 1440, height: 900 }
  },
  {
    name: 'Linux Firefox',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'DNT': '1',
      'Upgrade-Insecure-Requests': '1'
    },
    viewport: { width: 1600, height: 900 }
  }
];

// Browser pool for reusing browser instances
let browserPool = [];

// State for tracking 
let twitterProcessedTweetIds = new Set();
let twitterLastKnownTweets = {};
const circuitBreaker = {
  failures: 0,
  failureThreshold: 15,
  resetTimeout: 30 * 60 * 1000, // 30 minutes
  lastFailure: 0,
  isOpen: false
};

// Helper function for delay with jitter
function delay(ms, jitter = 0.3) {
  const jitterMs = ms * jitter;
  const actualDelay = ms + (Math.random() * 2 - 1) * jitterMs;
  return new Promise(resolve => setTimeout(resolve, actualDelay));
}

// Get a random item from an array
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Get a browser profile with randomized fingerprints
function getBrowserProfile() {
  const profile = getRandomItem(BROWSER_PROFILES);
  
  // Add randomized headers to avoid fingerprinting
  const headers = { ...profile.headers };
  
  // Add a unique client identifier that changes regularly
  headers['X-Client-ID'] = Math.random().toString(36).substring(2, 15);
  
  // Randomize accept header slightly
  headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
  
  // Add cache control with random max-age
  headers['Cache-Control'] = `max-age=${Math.floor(Math.random() * 600)}`;
  
  // Add random viewport dimensions within reasonable bounds
  const viewportWidth = profile.viewport.width + (Math.floor(Math.random() * 100) - 50);
  const viewportHeight = profile.viewport.height + (Math.floor(Math.random() * 100) - 50);
  
  return {
    ...profile,
    headers,
    viewport: {
      width: viewportWidth,
      height: viewportHeight
    }
  };
}

// Load Twitter configuration from disk
function loadTwitterConfig() {
  try {
    if (fs.existsSync(TWITTER_CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(TWITTER_CONFIG_PATH, 'utf8'));
      if (data) {
        TWITTER_CONFIG = { ...TWITTER_CONFIG, ...data };
        console.log(`Loaded Twitter config with ${TWITTER_CONFIG.accounts.length} accounts`);
      }
    } else {
      saveTwitterConfig();
    }
  } catch (error) {
    console.error(`Error loading Twitter config: ${error.message}`);
  }
}

// Save Twitter configuration to disk
function saveTwitterConfig() {
  try {
    fs.writeFileSync(TWITTER_CONFIG_PATH, JSON.stringify(TWITTER_CONFIG, null, 2));
  } catch (error) {
    console.error(`Error saving Twitter config: ${error.message}`);
  }
}

// Load processed tweet IDs from disk
function loadProcessedTweetIds() {
  try {
    if (fs.existsSync(TWITTER_PROCESSED_TWEETS_PATH)) {
      const data = JSON.parse(fs.readFileSync(TWITTER_PROCESSED_TWEETS_PATH, 'utf8'));
      if (Array.isArray(data)) {
        twitterProcessedTweetIds = new Set(data);
        console.log(`Loaded ${twitterProcessedTweetIds.size} processed tweet IDs`);
      }
    }
  } catch (error) {
    console.error(`Error loading processed tweet IDs: ${error.message}`);
    twitterProcessedTweetIds = new Set();
  }
}

// Save processed tweet IDs to disk
function saveProcessedTweetIds() {
  try {
    const data = Array.from(twitterProcessedTweetIds);
    // Keep only the most recent 2000 tweets to manage file size
    const recentTweets = data.slice(-2000);
    
    // Use atomic write pattern
    const tempPath = `${TWITTER_PROCESSED_TWEETS_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(recentTweets));
    fs.renameSync(tempPath, TWITTER_PROCESSED_TWEETS_PATH);
  } catch (error) {
    console.error(`Error saving processed tweet IDs: ${error.message}`);
  }
}

// Load last known tweets for each account
function loadLastKnownTweets() {
  try {
    if (fs.existsSync(TWITTER_LAST_TWEETS_PATH)) {
      const data = JSON.parse(fs.readFileSync(TWITTER_LAST_TWEETS_PATH, 'utf8'));
      if (data) {
        twitterLastKnownTweets = data;
        console.log(`Loaded last known tweets for ${Object.keys(twitterLastKnownTweets).length} accounts`);
      }
    }
  } catch (error) {
    console.error(`Error loading last known tweets: ${error.message}`);
    twitterLastKnownTweets = {};
  }
}

// Save last known tweets for each account
function saveLastKnownTweets() {
  try {
    const tempPath = `${TWITTER_LAST_TWEETS_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(twitterLastKnownTweets));
    fs.renameSync(tempPath, TWITTER_LAST_TWEETS_PATH);
  } catch (error) {
    console.error(`Error saving last known tweets: ${error.message}`);
  }
}

// Record failure in circuit breaker
function recordFailure() {
  const now = Date.now();
  if (now - circuitBreaker.lastFailure > circuitBreaker.resetTimeout) {
    circuitBreaker.failures = 0;
  }
  
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = now;
  
  if (circuitBreaker.failures >= circuitBreaker.failureThreshold) {
    circuitBreaker.isOpen = true;
    console.log('Circuit breaker opened - pausing Twitter requests');
    
    // Auto-reset after timeout
    setTimeout(() => {
      console.log('Circuit breaker reset');
      circuitBreaker.isOpen = false;
      circuitBreaker.failures = 0;
    }, circuitBreaker.resetTimeout);
  }
}

// Record frontend failure
function markFrontendFailed(frontendName) {
  const index = TWITTER_FRONTENDS.findIndex(f => f.name === frontendName);
  if (index === -1) return;
  
  TWITTER_FRONTENDS[index].failCount++;
  console.log(`Frontend ${frontendName} failed (count: ${TWITTER_FRONTENDS[index].failCount})`);
  
  // Deactivate if reached max failures
  if (TWITTER_FRONTENDS[index].failCount >= TWITTER_FRONTENDS[index].maxFails) {
    TWITTER_FRONTENDS[index].active = false;
    console.log(`Frontend ${frontendName} temporarily deactivated due to too many failures`);
    
    // Reactivate after cooldown period (10-30 minutes)
    const cooldownMinutes = 10 + Math.floor(Math.random() * 20);
    setTimeout(() => {
      if (index < TWITTER_FRONTENDS.length) { // Check if the frontend still exists
        TWITTER_FRONTENDS[index].active = true;
        TWITTER_FRONTENDS[index].failCount = Math.floor(TWITTER_FRONTENDS[index].failCount / 2);
        console.log(`Frontend ${frontendName} reactivated after ${cooldownMinutes} minutes cooldown`);
      }
    }, cooldownMinutes * 60 * 1000);
  }
}

// Record frontend success
function markFrontendSuccess(frontendName) {
  const index = TWITTER_FRONTENDS.findIndex(f => f.name === frontendName);
  if (index === -1) return;
  
  // Reduce failure count on success (but not below 0)
  if (TWITTER_FRONTENDS[index].failCount > 0) {
    TWITTER_FRONTENDS[index].failCount--;
  }
  
  TWITTER_FRONTENDS[index].lastUsed = Date.now();
}

// Get next frontend to use based on strategy
function getNextFrontend() {
  // Filter to only active frontends
  const activeFrontends = TWITTER_FRONTENDS.filter(f => f.active);
  
  if (activeFrontends.length === 0) {
    // If all are inactive, reset a random subset to try again
    const randomSubset = TWITTER_FRONTENDS
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.ceil(TWITTER_FRONTENDS.length / 3));
    
    for (const frontend of randomSubset) {
      frontend.active = true;
      frontend.failCount = Math.floor(frontend.failCount / 2);
      console.log(`Reactivated frontend ${frontend.name} as all were inactive`);
    }
    
    return getRandomItem(randomSubset);
  }
  
  // Choose based on strategy
  if (TWITTER_CONFIG.rotationStrategy === 'random') {
    return getRandomItem(activeFrontends);
  } 
  else if (TWITTER_CONFIG.rotationStrategy === 'priority') {
    // Sort by priority (lowest first)
    return [...activeFrontends].sort((a, b) => a.priority - b.priority)[0];
  }
  else {
    // Sequential/least recently used
    return [...activeFrontends].sort((a, b) => a.lastUsed - b.lastUsed)[0];
  }
}

// Get or create a browser from the pool
async function getBrowser() {
  // Clean expired browsers first
  const now = Date.now();
  const maxLifetimeMs = TWITTER_CONFIG.browserMaxLifetime * 60 * 1000;
  
  browserPool = browserPool.filter(item => {
    if (now - item.createdAt > maxLifetimeMs) {
      console.log(`Closing expired browser instance (${Math.round((now - item.createdAt) / 60000)}m old)`);
      item.browser.close().catch(err => console.error('Error closing browser:', err));
      return false;
    }
    return true;
  });
  
  // Return existing browser if available and not at capacity
  if (browserPool.length > 0 && browserPool.length < 3) {
    return browserPool[0].browser;
  }
  
  // Launch new browser
  console.log('Launching new browser instance for Twitter scraping');
  
  const browser = await puppeteer.launch({
    headless: TWITTER_CONFIG.useHeadlessBrowsers ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-notifications',
      '--disable-extensions',
      '--disable-blink-features=AutomationControlled'
    ],
    ignoreHTTPSErrors: true,
    defaultViewport: null
  });
  
  // Add to pool with timestamp
  browserPool.push({
    browser,
    createdAt: Date.now()
  });
  
  return browser;
}

// Parse tweets from HTML content (Nitter parser)
function parseNitterPage($) {
  const tweets = [];
  
  $('.timeline-item, .tweet, .tweet-card').each((_, element) => {
    try {
      // Tweet URL/permalink which contains the ID
      const permalink = $(element).find('.tweet-link, .tweet-permalink').attr('href');
      if (!permalink) return;
      
      // Extract tweet ID
      const tweetId = permalink.split('/').pop()?.split('?')[0];
      if (!tweetId || !/^\d+$/.test(tweetId)) return;
      
      // Username
      const usernameElement = $(element).find('.username');
      const username = usernameElement.text().trim().replace('@', '');
      
      // Tweet content
      const contentElement = $(element).find('.tweet-content');
      const content = contentElement.text().trim();
      
      // Timestamp/date
      let createdAt = new Date().toISOString();
      const timestampElement = $(element).find('.tweet-date a');
      if (timestampElement.length) {
        const timestampText = timestampElement.attr('title');
        if (timestampText) {
          try {
            createdAt = new Date(timestampText).toISOString();
          } catch (e) {
            // Use default timestamp if parsing fails
          }
        }
      }
      
      // Images
      const images = [];
      $(element).find('.attachment-image img, .still-image, .media-image').each((_, img) => {
        const src = $(img).attr('src');
        if (src) images.push(src);
      });
      
      tweets.push({
        id: tweetId,
        username,
        content,
        created_at: createdAt,
        images,
        url: `https://twitter.com/${username}/status/${tweetId}`
      });
    } catch (error) {
      console.error('Error parsing Nitter tweet:', error.message);
    }
  });
  
  return tweets;
}

// Parse bird.froth.zone frontend
function parseBirdFrothPage($) {
  const tweets = [];
  
  $('.tweet, .status-container, .post-container').each((_, element) => {
    try {
      // Try to extract tweet ID
      const tweetId = $(element).attr('data-id') || 
                      $(element).attr('id')?.replace('status-', '') || 
                      $(element).find('a[href*="/status/"]').first().attr('href')?.split('/status/').pop()?.split(/[#?]/)[0];
      
      if (!tweetId) return;
      
      // Extract content
      const content = $(element).find('.status-content, .tweet-text, .post-content').text().trim();
      
      // Extract username
      const username = $(element).find('.user-name, .username, .handle, .author').text().trim().replace('@', '');
      
      // Extract images
      const images = [];
      $(element).find('.media-item img, .attachment img, .gallery img').each((_, img) => {
        const src = $(img).attr('src');
        if (src) images.push(src);
      });
      
      tweets.push({
        id: tweetId,
        username,
        content,
        created_at: new Date().toISOString(),
        images,
        url: `https://twitter.com/${username}/status/${tweetId}`
      });
    } catch (error) {
      console.error('Error parsing bird.froth.zone tweet:', error.message);
    }
  });
  
  return tweets;
}

// Main scraping function with multiple fallback strategies
async function scrapeTwitterUser(username, retryCount = 0) {
  if (retryCount >= TWITTER_CONFIG.maxRetries) {
    console.log(`Maximum retries reached for ${username}`);
    recordFailure();
    return null;
  }
  
  // Add delay between retries
  if (retryCount > 0) {
    const delayMs = Math.min(5000 * Math.pow(1.5, retryCount), 30000);
    await delay(delayMs);
  }
  
  // If circuit breaker is open, don't attempt scraping
  if (circuitBreaker.isOpen) {
    console.log('Circuit breaker is open, skipping scrape attempt');
    return null;
  }
  
  // Get the next frontend to try
  const frontend = getNextFrontend();
  console.log(`Attempting to scrape @${username} using ${frontend.name} (attempt ${retryCount + 1}/${TWITTER_CONFIG.maxRetries})`);
  
  try {
    // Different handling based on frontend type
    if (frontend.type === 'html') {
      // HTML scraping with axios + cheerio
      const url = `${frontend.baseUrl}/${username}`;
      
      // Get browser profile
      const profile = getBrowserProfile();
      
      // Setup axios request config
      const axiosConfig = {
        headers: profile.headers,
        timeout: 20000,
        validateStatus: status => status >= 200 && status < 500
      };
      
      // Make the request
      const response = await axios.get(url, axiosConfig);
      
      // Check response
      if (response.status !== 200) {
        console.log(`Got status ${response.status} from ${frontend.name}`);
        markFrontendFailed(frontend.name);
        return scrapeTwitterUser(username, retryCount + 1);
      }
      
      // Parse HTML
      const $ = cheerio.load(response.data);
      
      // Use appropriate parser based on frontend type
      let tweets = [];
      if (frontend.parser === 'nitter') {
        tweets = parseNitterPage($);
      } else if (frontend.parser === 'birdfroth') {
        tweets = parseBirdFrothPage($);
      }
      
      if (tweets.length > 0) {
        console.log(`Found ${tweets.length} tweets for @${username} using ${frontend.name}`);
        markFrontendSuccess(frontend.name);
        return tweets;
      }
      
      console.log(`No tweets found for @${username} on ${frontend.name}`);
      markFrontendFailed(frontend.name);
    }
    else if (frontend.type === 'browser') {
      // Direct browser approach
      try {
        const tweets = await scrapeTweetsWithPuppeteer(username);
        if (tweets && tweets.length > 0) {
          markFrontendSuccess(frontend.name);
          return tweets;
        }
        markFrontendFailed(frontend.name);
      } catch (error) {
        console.error(`Browser scraping error:`, error.message);
        markFrontendFailed(frontend.name);
      }
    }
    
    // If we're here, the current approach failed
    return scrapeTwitterUser(username, retryCount + 1);
  } catch (error) {
    console.error(`Error scraping tweets for @${username} using ${frontend.name}:`, error.message);
    markFrontendFailed(frontend.name);
    return scrapeTwitterUser(username, retryCount + 1);
  }
}

// Send tweets to Discord via webhook
async function sendTweetsToDiscord(tweets, account) {
  if (!tweets || tweets.length === 0) {
    console.log(`No new tweets to send for @${account.username}`);
    return;
  }
  
  const webhookUrl = TWITTER_CONFIG.webhooks[account.username];
  if (!webhookUrl) {
    console.error(`No webhook configured for @${account.username}`);
    return;
  }
  
  // Create webhook client
  const webhook = new WebhookClient({ url: webhookUrl });
  
  // Process each tweet
  for (const tweet of tweets) {
    // Check if already processed
    if (twitterProcessedTweetIds.has(tweet.id)) {
      continue;
    }
    
    try {
      // Create embed
      const embed = new EmbedBuilder()
        .setColor(0x1DA1F2)
        .setTitle(`New Tweet from @${tweet.username}`)
        .setURL(tweet.url)
        .setDescription(tweet.content || '(No text)')
        .setFooter({
          text: TWITTER_CONFIG.webhookUsername || 'Twitter Monitor',
          iconURL: TWITTER_CONFIG.webhookAvatarURL
        })
        .setTimestamp(new Date(tweet.created_at));
      
      // Add image if available
      if (tweet.images && tweet.images.length > 0) {
        embed.setImage(tweet.images[0]);
      }
      
      // Add button to view tweet
      const button = new ButtonBuilder()
        .setLabel('View on Twitter')
        .setStyle(ButtonStyle.Link)
        .setURL(tweet.url);
      
      const row = new ActionRowBuilder().addComponents(button);
      
      // Send to Discord
      await webhook.send({
        embeds: [embed],
        components: [row],
        username: TWITTER_CONFIG.webhookUsername,
        avatarURL: TWITTER_CONFIG.webhookAvatarURL
      });
      
      console.log(`Sent tweet ${tweet.id} from @${tweet.username} to Discord`);
      
      // Mark as processed
      twitterProcessedTweetIds.add(tweet.id);
      saveProcessedTweetIds();
      
      // Add delay between webhook requests to avoid rate limits
      await delay(2000);
    } catch (error) {
      console.error(`Error sending tweet ${tweet.id} to Discord:`, error.message);
    }
  }
}

// Check for new tweets from an account
async function checkNewTweets(account) {
  console.log(`Checking for new tweets from @${account.username}`);
  
  try {
    // Get tweets for this account
    const tweets = await scrapeTwitterUser(account.username);
    
    if (!tweets || tweets.length === 0) {
      console.log(`No tweets found for @${account.username}`);
      return;
    }
    
    // Sort tweets by date (newest first)
    tweets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Store the latest tweets for this account
    twitterLastKnownTweets[account.username] = tweets;
    saveLastKnownTweets();
    
    // Find new tweets (not seen before)
    const knownTweetIds = new Set(Array.from(twitterProcessedTweetIds));
    const newTweets = tweets.filter(tweet => !knownTweetIds.has(tweet.id));
    
    if (newTweets.length > 0) {
      console.log(`Found ${newTweets.length} new tweets from @${account.username}`);
      await sendTweetsToDiscord(newTweets, account);
    } else {
      console.log(`No new tweets found for @${account.username}`);
    }
    
    return newTweets;
  } catch (error) {
    console.error(`Error checking tweets for @${account.username}:`, error.message);
    return null;
  }
}

// Check accounts in random order to avoid patterns
async function checkAccountsRandomly() {
  // Get accounts in priority order
  const accounts = [...TWITTER_CONFIG.accounts].sort((a, b) => a.priority - b.priority);
  
  // Process accounts
  for (const account of accounts) {
    // Skip if circuit breaker is open
    if (circuitBreaker.isOpen) {
      console.log('Circuit breaker is open, skipping remaining accounts');
      break;
    }
    
    await checkNewTweets(account);
    
    // Add variable delay between account checks
    if (accounts.indexOf(account) < accounts.length - 1) {
      const jitteredDelay = 5000 + (Math.random() * 10000);
      await delay(jitteredDelay);
    }
  }
}

// Initialize the Twitter monitoring system
async function initializeTwitterMonitoring() {
  console.log('Initializing Twitter monitoring system...');
  
  // Load saved state
  loadTwitterConfig();
  loadProcessedTweetIds();
  loadLastKnownTweets();
  
  // Setup frontend rotation every 6 hours
  setInterval(() => {
    console.log('Rotating Twitter frontends...');
    
    // Reset failure counts partially
    TWITTER_FRONTENDS.forEach(frontend => {
      if (frontend.failCount > 0) {
        frontend.failCount = Math.max(0, frontend.failCount - 1);
      }
      
      // Reactive any inactive frontends
      if (!frontend.active) {
        frontend.active = true;
        frontend.failCount = Math.floor(frontend.failCount / 2);
        console.log(`Reactivated frontend: ${frontend.name}`);
      }
    });
  }, 6 * 60 * 60 * 1000); // Every 6 hours
  
  // Schedule the first check with a random delay
  const initialDelay = Math.random() * 60 * 1000; // Random delay up to 1 minute
  setTimeout(async () => {
    await checkAccountsRandomly();
    
    // Schedule subsequent checks with variable timing
    scheduleNextCheck();
  }, initialDelay);
  
  console.log(`Twitter monitoring initialized - first check in ${Math.round(initialDelay / 1000)} seconds`);
}

// Schedule next check with variable timing
function scheduleNextCheck() {
  // Base interval with jitter
  const baseMinutes = TWITTER_CONFIG.checkInterval;
  const jitterMinutes = TWITTER_CONFIG.jitterAmount;
  
  // Calculate minutes for next check (with randomness)
  const nextCheckMinutes = baseMinutes + (Math.random() * 2 - 1) * jitterMinutes;
  const nextCheckMs = nextCheckMinutes * 60 * 1000;
  
  console.log(`Next Twitter check scheduled in ${Math.round(nextCheckMinutes)} minutes`);
  
  // Schedule the check
  setTimeout(async () => {
    await checkAccountsRandomly();
    scheduleNextCheck();
  }, nextCheckMs);
}

// Clean up resources when exiting
process.on('SIGINT', async () => {
  console.log('Shutting down Twitter monitoring...');
  
  // Save state
  saveProcessedTweetIds();
  saveLastKnownTweets();
  
  // Close all browser instances
  for (const { browser } of browserPool) {
    try {
      await browser.close();
    } catch (error) {
      console.error('Error closing browser:', error.message);
    }
  }
  
  console.log('Twitter monitoring shut down');
  process.exit(0);
});

// REST API endpoints for Twitter management
function setupTwitterApiRoutes(app, isAuthenticated) {
  // Get status of Twitter monitoring
  app.get('/api/twitter/status', (req, res) => {
    const frontendStatus = TWITTER_FRONTENDS.map(f => ({
      name: f.name,
      active: f.active,
      failCount: f.failCount,
      type: f.type
    }));
    
    res.json({
      status: circuitBreaker.isOpen ? 'paused' : 'running',
      accounts: TWITTER_CONFIG.accounts.map(a => a.username),
      processedTweets: twitterProcessedTweetIds.size,
      frontends: frontendStatus
    });
  });
  
  // Manually check a specific account
  app.get('/api/twitter/check/:username', isAuthenticated, async (req, res) => {
    const { username } = req.params;
    
    // Find the account
    const account = TWITTER_CONFIG.accounts.find(a => 
      a.username.toLowerCase() === username.toLowerCase()
    );
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found in monitoring list' });
    }
    
    try {
      await checkNewTweets(account);
      res.json({ success: true, message: `Checked tweets for @${username}` });
    } catch (error) {
      res.status(500).json({ error: `Error checking tweets: ${error.message}` });
    }
  });
  
  // Add a new account to monitor
  app.post('/api/twitter/add-account', isAuthenticated, (req, res) => {
    const { username, webhookUrl, priority } = req.body;
    
    if (!username || !webhookUrl) {
      return res.status(400).json({ error: 'Username and webhook URL are required' });
    }
    
    // Check if account already exists
    if (TWITTER_CONFIG.accounts.some(a => a.username.toLowerCase() === username.toLowerCase())) {
      return res.status(400).json({ error: 'Account already being monitored' });
    }
    
    // Add to monitoring list
    TWITTER_CONFIG.accounts.push({
      username,
      priority: priority || TWITTER_CONFIG.accounts.length + 1
    });
    
    // Add webhook
    TWITTER_CONFIG.webhooks[username] = webhookUrl;
    
    // Save configuration
    saveTwitterConfig();
    
    res.json({ 
      success: true, 
      message: `Added @${username} to monitoring list`,
      accounts: TWITTER_CONFIG.accounts
    });
  });
  
  // Remove an account from monitoring
  app.delete('/api/twitter/remove-account/:username', isAuthenticated, (req, res) => {
    const { username } = req.params;
    
    // Find the account
    const accountIndex = TWITTER_CONFIG.accounts.findIndex(a => 
      a.username.toLowerCase() === username.toLowerCase()
    );
    
    if (accountIndex === -1) {
      return res.status(404).json({ error: 'Account not found in monitoring list' });
    }
    
    // Remove from accounts list
    TWITTER_CONFIG.accounts.splice(accountIndex, 1);
    
    // Remove webhook
    delete TWITTER_CONFIG.webhooks[username];
    
    // Save configuration
    saveTwitterConfig();
    
    res.json({ 
      success: true, 
      message: `Removed @${username} from monitoring list`,
      accounts: TWITTER_CONFIG.accounts
    });
  });
  
  // Reset circuit breaker
  app.post('/api/twitter/reset-circuit-breaker', isAuthenticated, (req, res) => {
    circuitBreaker.isOpen = false;
    circuitBreaker.failures = 0;
    circuitBreaker.lastFailure = 0;
    
    res.json({ 
      success: true, 
      message: 'Circuit breaker reset' 
    });
  });
  
  // Update configuration
  app.post('/api/twitter/update-config', isAuthenticated, (req, res) => {
    const { checkInterval, jitterAmount, rotationStrategy, useHeadlessBrowsers } = req.body;
    
    // Update config with validation
    if (checkInterval !== undefined && checkInterval >= 5) {
      TWITTER_CONFIG.checkInterval = checkInterval;
    }
    
    if (jitterAmount !== undefined && jitterAmount >= 0) {
      TWITTER_CONFIG.jitterAmount = jitterAmount;
    }
    
    if (rotationStrategy !== undefined && 
        ['random', 'sequential', 'priority'].includes(rotationStrategy)) {
      TWITTER_CONFIG.rotationStrategy = rotationStrategy;
    }
    
    if (useHeadlessBrowsers !== undefined) {
      TWITTER_CONFIG.useHeadlessBrowsers = !!useHeadlessBrowsers;
    }
    
    // Save updated config
    saveTwitterConfig();
    
    res.json({
      success: true,
      message: 'Configuration updated',
      config: {
        checkInterval: TWITTER_CONFIG.checkInterval,
        jitterAmount: TWITTER_CONFIG.jitterAmount,
        rotationStrategy: TWITTER_CONFIG.rotationStrategy,
        useHeadlessBrowsers: TWITTER_CONFIG.useHeadlessBrowsers
      }
    });
  });
}

// Export the functions for use in the main application
module.exports = {
  initializeTwitterMonitoring,
  setupTwitterApiRoutes,
  checkNewTweets
};

// Scrape tweets using puppeteer directly on Twitter
async function scrapeTweetsWithPuppeteer(username) {
  console.log(`Attempting to scrape @${username} using puppeteer directly`);
  
  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    
    // Get a random browser profile
    const profile = getBrowserProfile();
    
    // Set user agent
    await page.setUserAgent(profile.userAgent);
    
    // Set viewport
    await page.setViewport(profile.viewport);
    
    // Set extra headers
    await page.setExtraHTTPHeaders(profile.headers);
    
    // Add evasion scripts to avoid detection
    await page.evaluateOnNewDocument(() => {
      // Overwrite the navigator properties to avoid detection
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      
      // Overwrite permissions
      const originalQuery = navigator.permissions.query;
      navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' 
          ? Promise.resolve({ state: Notification.permission }) 
          : originalQuery(parameters)
      );
      
      // Add Canvas fingerprint spoofing
      const getImageData = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
        const imageData = getImageData.call(this, x, y, w, h);
        const n = Math.floor(Math.random() * 10);
        imageData.data[0] = imageData.data[0] + n;
        return imageData;
      };
      
      // Add plugins to appear more like a real browser
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: {type: "application/pdf"},
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "PDF Viewer"
          },
          {
            0: {type: "application/x-google-chrome-pdf"},
            description: "Chrome PDF Viewer",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Viewer"
          }
        ]
      });
    });
    
    // Visit the profile page
    await page.goto(`https://twitter.com/${username}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for tweets to load
    try {
      await page.waitForSelector('[data-testid="tweet"]', { timeout: 15000 });
    } catch (e) {
      console.log('Could not find tweets, checking for login requirement...');
      
      // Check if we hit a login wall
      const loginRequired = await page.evaluate(() => {
        return document.body.textContent.includes('Sign in') || 
               document.body.textContent.includes('Log in');
      });
      
      if (loginRequired) {
        console.log('Login wall detected, using alternative strategy');
        
        // Try a different approach - x.com URL
        await page.goto(`https://x.com/${username}`, {
          waitUntil: 'networkidle2',
          timeout: 20000
        });
        
        // Try to close any popups
        try {
          await page.evaluate(() => {
            const closeButtons = Array.from(document.querySelectorAll('button')).filter(el => 
              el.textContent.includes('Not now') || 
              el.textContent.includes('Close') ||
              el.textContent.includes('✕') ||
              el.textContent.includes('×')
            );
            closeButtons.forEach(btn => btn.click());
          });
          await delay(1000);
        } catch (e) {
          console.log('Error trying to close popups:', e);
        }
        
        // Wait again for tweets
        await page.waitForSelector('[data-testid="tweet"]', { timeout: 10000 }).catch(() => null);
      }
    } catch (timeoutError) {
      console.log(`Timeout waiting for tweets for @${username}`);
    }
    
    // Add random scrolling to simulate human behavior
    await page.evaluate(async () => {
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const randBetween = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
      
      // Random scrolls with variable speed and pauses
      for (let i = 0; i < randBetween(2, 5); i++) {
        const scrollDistance = randBetween(300, 800);
        window.scrollBy({ top: scrollDistance, behavior: 'smooth' });
        await delay(randBetween(500, 2000));
      }
    });
    
    // Wait a bit to let lazy content load
    await delay(2000);
    
    // Extract tweets from the page
    const tweets = await page.evaluate(() => {
      const tweetElements = Array.from(document.querySelectorAll('[data-testid="tweet"]'));
      
      return tweetElements.map(element => {
        try {
          // Get tweet URL which contains the ID
          const tweetLink = element.querySelector('a[href*="/status/"]');
          if (!tweetLink) return null;
          
          const href = tweetLink.href;
          const statusMatch = href.match(/\/status(?:es)?\/(\d+)/i);
          if (!statusMatch) return null;
          
          const tweetId = statusMatch[1];
          
          // Extract username from the link
          const userMatch = href.match(/\/([^/]+)\/status(?:es)?\/\d+/i);
          const username = userMatch ? userMatch[1] : '';
          
          // Get the tweet content
          const tweetText = element.querySelector('[data-testid="tweetText"]');
          const content = tweetText ? tweetText.textContent : '';
          
          // Get the timestamp if available
          const timeElement = element.querySelector('time');
          let createdAt = new Date().toISOString();
          if (timeElement && timeElement.dateTime) {
            createdAt = new Date(timeElement.dateTime).toISOString();
          }
          
          // Get images
          const images = [];
          const photoElements = element.querySelectorAll('[data-testid="tweetPhoto"] img');
          photoElements.forEach(img => {
            if (img.src) images.push(img.src);
          });
          
          return {
            id: tweetId,
            username,
            content,
            created_at: createdAt,
            images,
            url: `https://twitter.com/${username}/status/${tweetId}`
          };
        } catch (e) {
          console.error('Error extracting tweet data:', e);
          return null;
        }
      }).filter(Boolean); // Remove any nulls
    });
    
    console.log(`Found ${tweets.length} tweets for @${username} using direct browser`);
    return tweets;
  } catch (error) {
    console.error(`Error scraping tweets with puppeteer for @${username}:`, error.message);
    throw error;
  }
}