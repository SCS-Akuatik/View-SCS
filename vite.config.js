import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // MAIN PAGES
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        auth: resolve(__dirname, 'auth.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        event: resolve(__dirname, 'event.html'),     
        eventDashboard: resolve(__dirname, 'event-dashboard.html'),
        eventPeserta: resolve(__dirname, 'event-peserta.html'),
        eventPublic: resolve(__dirname, 'event-public.html'),
        f1Profile: resolve(__dirname, 'f1-profile.html'), 
        liveResult: resolve(__dirname, 'live-result.html'),
        pricing: resolve(__dirname, 'pricing.html'),
        promosi: resolve(__dirname, 'promosi.html'), 
        rank: resolve(__dirname, 'rank.html'),       
        register: resolve(__dirname, 'register.html'),
        result: resolve(__dirname, 'result.html'),
        settingsLomba: resolve(__dirname, 'settings-lomba.html'),
        
        // MODULE PUSAT CETAK & HEAT BUILDER
        book: resolve(__dirname, 'book/book.html'),
        eventResult: resolve(__dirname, 'book/event-result.html'),
        heatBuilder: resolve(__dirname, 'book/heat-builder.html'),
        printStartList: resolve(__dirname, 'book/print-startlist.html'),
        eventSertifikat: resolve(__dirname, 'book/event-sertifikat.html'),
        eventSertifikat: resolve(__dirname, 'cetak-sertifikat.html'),
      }
    }
  },
  server: {
    proxy: {},
  },
  appType: 'mpa',
});
