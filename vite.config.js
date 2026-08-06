import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // --- 1. MAIN & PUBLIC PAGES ---
        main: resolve(__dirname, 'index.html'),
        auth: resolve(__dirname, 'auth.html'),
        register: resolve(__dirname, 'register.html'),
        pricing: resolve(__dirname, 'pricing.html'),
        promosi: resolve(__dirname, 'promosi.html'),
        eventPublic: resolve(__dirname, 'event-public.html'), // Halaman publik untuk 1 event
        liveResult: resolve(__dirname, 'live-result.html'), // Live scoreboard publik
        eventLeaderboard: resolve(__dirname, 'event-leaderboard.html'), // List juara publik
        rank: resolve(__dirname, 'rank.html'), // Peringkat klub/atlet
        result: resolve(__dirname, 'result.html'), // Hasil perlombaan

        // --- 2. USER/ATLET DASHBOARD ---
        dashboard: resolve(__dirname, 'dashboard.html'),
        f1Profile: resolve(__dirname, 'f1-profile.html'),
        cetakSertifikat: resolve(__dirname, 'cetak-sertifikat.html'), // Halaman peserta cetak serti

        // --- 3. PANITIA (ADMIN PUSAT) DASHBOARD ---
        admin: resolve(__dirname, 'admin.html'), // Super admin dashboard

        // --- 4. EO (EVENT ORGANIZER) DASHBOARD ---
        event: resolve(__dirname, 'event.html'), // List semua event EO
        eventDashboard: resolve(__dirname, 'event-dashboard.html'), // Panel utama 1 event
        eventPeserta: resolve(__dirname, 'event-peserta.html'), // List peserta & KU
        settingsLomba: resolve(__dirname, 'settings-lomba.html'), // Nomor lomba & KU
        
        // --- 5. MODULE PUSAT CETAK & HEAT BUILDER ---
        book: resolve(__dirname, 'book/book.html'), // Dashboard Book Module
        heatBuilder: resolve(__dirname, 'book/heat-builder.html'), // Seed heat/seri
        printStartList: resolve(__dirname, 'book/print-startlist.html'), // Print buku startlist
        eventResult: resolve(__dirname, 'book/event-result.html'), // Hasil resmi per nomor
        eventSertifikatSetup: resolve(__dirname, 'book/event-sertifikat.html'), // Admin setup serti
      }
    }
  },
  server: {
    port: 3000,
    open: true,
  },
  appType: 'mpa',
});
