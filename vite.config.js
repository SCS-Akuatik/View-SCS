import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        auth: resolve(__dirname, 'auth.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        register: resolve(__dirname, 'register.html'),
        eventDashboard: resolve(__dirname, 'event-dashboard.html'),
        settingsLomba: resolve(__dirname, 'settings-lomba.html'),
        pricing: resolve(__dirname, 'pricing.html'),
        event: resolve(__dirname, 'event.html'),     
        rank: resolve(__dirname, 'rank.html'),       
        promosi: resolve(__dirname, 'promosi.html'), 
        f1Profile: resolve(__dirname, 'f1-profile.html'), 
        eventPublic: resolve(__dirname, 'event-public.html'),
        eventPeserta: resolve(__dirname, 'event-peserta.html'),
        
        // MODULE BUKU ACARA & HASIL LOMBA
        eventBook: resolve(__dirname, 'book/book.html'),
        eventResult: resolve(__dirname, 'book/event-result.html'),
        
        liveResult: resolve(__dirname, 'live-result.html'),
        result: resolve(__dirname, 'result.html'),
        admin: resolve(__dirname, 'admin.html'),
      }
    }
  },
  server: {
    proxy: {},
  },
  appType: 'mpa',
});
