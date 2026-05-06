import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

/**
 * CONFIGURATION
 */
const CONFIG = {
  NOTIFICATION_TIME: '00 10 * * *', // Every day at 10:00 AM
  TYPING_DELAY: 5000,
  MIN_MSG_DELAY: 60000,
  MAX_MSG_DELAY: 180000,
  LOG_FILE: path.resolve('notifications_log.json'),
};

/**
 * DATABASE PROVIDER PATTERN
 * Replace getMembersToNotify with your actual database logic.
 */
async function getMembersToNotify() {
  /**
   * PLACEHOLDER: Integrate your DB here (PostgreSQL, MySQL, JSON, etc.)
   * Expected return: Array<{ id, name, phone, expirationDate, daysRemaining }>
   */
  console.log('[Provider] Fetching members from database...');
  
  // Example mock data
  return [
    { id: 1, name: 'Ahmed', phone: '212600000000', expirationDate: '2026-04-25', daysRemaining: 2 },
    { id: 2, name: 'Sara', phone: '212611111111', expirationDate: '2026-04-23', daysRemaining: 0 }
  ];
}

/**
 * DUPLICATE PREVENTION SYSTEM
 */
function hasBeenNotifiedToday(memberId) {
  if (!fs.existsSync(CONFIG.LOG_FILE)) return false;
  const logs = JSON.parse(fs.readFileSync(CONFIG.LOG_FILE, 'utf8'));
  const today = new Date().toISOString().split('T')[0];
  return logs.some(log => log.id === memberId && log.date === today);
}

function logNotification(memberId) {
  let logs = [];
  if (fs.existsSync(CONFIG.LOG_FILE)) {
    logs = JSON.parse(fs.readFileSync(CONFIG.LOG_FILE, 'utf8'));
  }
  logs.push({ id: memberId, date: new Date().toISOString().split('T')[0] });
  fs.writeFileSync(CONFIG.LOG_FILE, JSON.stringify(logs, null, 2));
}

/**
 * WHATSAPP CLIENT SETUP
 */
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './whatsapp_session' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', (qr) => {
  console.log('[WhatsApp] QR Code received. Please scan:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('[WhatsApp] Client is ready!');
});

/**
 * AUTOMATION ENGINE
 */
async function processNotifications() {
  console.log('[Engine] Starting daily notification check...');
  
  try {
    const members = await getMembersToNotify();
    
    for (const member of members) {
      if (hasBeenNotifiedToday(member.id)) {
        console.log(`[Skip] ${member.name} already notified today.`);
        continue;
      }

      console.log(`[Engine] Preparing message for ${member.name}...`);
      
      try {
        const chatId = `${member.phone}@c.us`;
        const message = member.daysRemaining === 0 
          ? `Bonjour ${member.name}, votre abonnement expire AUJOURD'HUI (${member.expirationDate}). Pensez à renouveler !`
          : `Bonjour ${member.name}, votre abonnement expire dans 2 jours (${member.expirationDate}). Pensez à renouveler !`;

        const chat = await client.getChatById(chatId);
        
        // Human-like typing simulation
        await chat.sendStateTyping();
        await new Promise(resolve => setTimeout(resolve, CONFIG.TYPING_DELAY));
        
        await client.sendMessage(chatId, message);
        console.log(`[Success] Message sent to ${member.name}`);
        
        logNotification(member.id);

        // Anti-ban random delay
        const delay = Math.floor(Math.random() * (CONFIG.MAX_MSG_DELAY - CONFIG.MIN_MSG_DELAY + 1)) + CONFIG.MIN_MSG_DELAY;
        console.log(`[Anti-Ban] Waiting ${Math.round(delay/1000)}s before next message...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        console.error(`[Error] Failed to notify ${member.name}:`, error.message);
      }
    }
    
    console.log('[Engine] Notification cycle complete.');
  } catch (err) {
    console.error('[Critical] Engine failure:', err);
  }
}

/**
 * SCHEDULER
 */
cron.schedule(CONFIG.NOTIFICATION_TIME, () => {
  processNotifications();
});

client.initialize();
