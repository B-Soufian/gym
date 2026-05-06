// ============================================
// tamesna Gym v9.0 — WhatsApp Smart Engine
// QR code served to frontend UI for easy scanning
// ============================================

import fs from 'fs';

let client = null;
let clientReady = false;
let initAttempted = false;
let currentQR = null;       // base64 data URL of QR code
let authStatus = 'idle';    // idle | initializing | qr_pending | authenticated | ready | failed | disconnected
let lastError = null;

/**
 * Initialize the WhatsApp Client
 */
export async function initWhatsApp() {
  if (initAttempted && authStatus !== 'failed') return;
  initAttempted = true;
  authStatus = 'initializing';
  lastError = null;

  try {
    const wwjs = await import('whatsapp-web.js');
    const QRCode = await import('qrcode');
    const { Client, LocalAuth } = wwjs.default;

    console.log('🚀 Initializing WhatsApp Engine...');

    // Cleanup previous client if retrying
    if (client) {
      try { await client.destroy(); } catch (e) { /* ignore */ }
      client = null;
    }

    client = new Client({
      authStrategy: new LocalAuth({ dataPath: './whatsapp_session' }),
      puppeteer: {
        headless: true,
        executablePath: '/usr/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--disable-gpu'
        ]
      },
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
      }
    });

    client.on('qr', async (qr) => {
      console.log('📱 WhatsApp QR Code generated — scan from web UI');
      authStatus = 'qr_pending';
      try {
        currentQR = await QRCode.default.toDataURL(qr, {
          width: 500,
          margin: 3,
          errorCorrectionLevel: 'H',
          color: { dark: '#000000', light: '#ffffff' }
        });
      } catch (err) {
        console.error('Failed to generate QR image:', err.message);
      }
    });

    client.on('authenticated', () => {
      console.log('🛡️ WhatsApp Authenticated');
      authStatus = 'authenticated';
      currentQR = null;
    });

    client.on('ready', () => {
      console.log('✅ WhatsApp Engine is READY!');
      clientReady = true;
      authStatus = 'ready';
      currentQR = null;
    });

    client.on('auth_failure', (msg) => {
      console.error('❌ WhatsApp Auth Failure:', msg);
      authStatus = 'failed';
      lastError = 'Échec d\'authentification: ' + msg;
      clientReady = false;
    });

    client.on('disconnected', (reason) => {
      console.warn('🔌 WhatsApp Disconnected:', reason);
      authStatus = 'disconnected';
      clientReady = false;
      currentQR = null;
    });

    client.on('loading_screen', (percent, message) => {
      console.log(`⏳ WhatsApp Loading: ${percent}% - ${message}`);
    });

    await client.initialize();
  } catch (err) {
    console.warn('⚠️ WhatsApp Engine initialization failed:', err.message);
    authStatus = 'failed';
    lastError = err.message;
    clientReady = false;
  }
}

/**
 * Retry initialization (called from API)
 */
export async function retryWhatsApp() {
  authStatus = 'idle';
  clientReady = false;
  currentQR = null;
  lastError = null;
  initAttempted = false;

  // Small delay then re-init
  setTimeout(() => initWhatsApp(), 500);
  return { message: 'Reconnexion en cours...' };
}

/**
 * Disconnect WhatsApp and wipe session so next init shows a fresh QR
 */
export async function disconnectWhatsApp() {
  try {
    if (client) {
      try { await client.logout(); } catch (e) { /* ignore */ }
      try { await client.destroy(); } catch (e) { /* ignore */ }
      client = null;
    }

    // Remove session so next init triggers QR again
    if (fs.existsSync('./whatsapp_session')) {
      fs.rmSync('./whatsapp_session', { recursive: true, force: true });
    }
  } catch (err) {
    console.error('⚠️ Error during WhatsApp disconnect:', err.message);
  } finally {
    clientReady = false;
    authStatus = 'disconnected';
    currentQR = null;
    lastError = null;
    initAttempted = false;
  }
  return { message: 'WhatsApp déconnecté avec succès' };
}

/**
 * Send a message with human-like behavior
 */
export async function sendSmartMessage(phone, body) {
  if (!clientReady || !client) throw new Error('WhatsApp Engine is not ready');

  const cleanPhone = phone.replace(/\D/g, '');
  const chatId = `${cleanPhone}@c.us`;

  const chat = await client.getChatById(chatId);

  // 1. Simulate typing
  await chat.sendStateTyping();
  await new Promise(r => setTimeout(r, 5000)); // 5s typing

  // 2. Send message
  await client.sendMessage(chatId, body);

  // 3. Random delay (60-180s) to avoid ban
  const delay = Math.floor(Math.random() * (180000 - 60000 + 1)) + 60000;
  return delay;
}

/**
 * Get the full WhatsApp status for the frontend
 */
export function getWhatsAppStatus() {
  return {
    ready: clientReady,
    initialized: initAttempted,
    status: authStatus,
    hasQR: !!currentQR,
    error: lastError
  };
}

/**
 * Get the current QR code as a base64 data URL image
 */
export function getQRCode() {
  return currentQR;
}

export { client };
