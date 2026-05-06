import { initWhatsApp } from '../server/src/services/whatsapp.js';
console.log('Testing initWhatsApp...');
initWhatsApp().then(() => {
  console.log('Done testing.');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
