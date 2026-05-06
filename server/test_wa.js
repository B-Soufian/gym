import { initWhatsApp } from './src/services/whatsapp.js';
console.log('Testing initWhatsApp...');
initWhatsApp().then(() => {
  console.log('Done testing.');
  setTimeout(() => process.exit(0), 10000);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
