import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // --- 1. MAIN & PUBLIC PAGES (Akses Tanpa Login) ---
        main: resolve(__dirname, 'index.html'), // Homepage
        auth: resolve(__dirname, 'auth.html'), // Login & Register System
        register: resolve(__dirname, 'register.html'), // Form Registrasi
        pricing: resolve(__dirname, 'pricing.html'), // Halaman Harga SCS
        promosi: resolve(__dirname, 'promosi.html'), // Halaman Promosi
        event: resolve(__dirname, 'event.html'), // Kalender Event Publik Nasional
        pulse: resolve(__dirname, 'pulse.html'),
        eventPublic: resolve(__dirname, 'event-public.html'), // Landing page spesifik 1 event
        liveResult: resolve(__dirname, 'live-result.html'), // Live scoreboard pertandingan
        eventLeaderboard: resolve(__dirname, 'event-leaderboard.html'), // Halaman Cetak Piagam Juara
        rank: resolve(__dirname, 'rank.html'), // Leaderboard Peringkat Klub/Atlet
        result: resolve(__dirname, 'result.html'), // Hasil resmi perlombaan
        cetakSertifikat: resolve(__dirname, 'cetak-sertifikat.html'), // Halaman Cetak Sertifikat Peserta
        sponsorship: resolve(__dirname, 'sponsorship.html'),

        // --- 2. DASHBOARD KLUB / PELATIH ---
        dashboard: resolve(__dirname, 'dashboard.html'), // Command Center Manajemen Klub
        f1Profile: resolve(__dirname, 'f1-profile.html'), // Landing Page F1 ID / Edukasi
        f1Id: resolve(__dirname, 'f1-id.html'), // <--- TAMBAHAN BARU: Brankas Profil F1 ID

        // --- 3. DASHBOARD EO / PANITIA LOMBA ---
        eventDashboard: resolve(__dirname, 'event-dashboard.html'), // Panel Utama Command Center 1 Event
        eventPeserta: resolve(__dirname, 'event-peserta.html'), // List & Verifikasi Peserta Lomba
        settingsLomba: resolve(__dirname, 'settings-lomba.html'), // Setup Nomor Lomba, Usia & Gaya

        // --- 4. MODULE PUSAT CETAK & HEAT BUILDER (PRO) ---
        book: resolve(__dirname, 'book/book.html'), // Dashboard Modul Buku Acara
        heatBuilder: resolve(__dirname, 'book/heat-builder.html'), // Editor Drag & Drop Seed/Seri
        printStartList: resolve(__dirname, 'book/print-startlist.html'), // Cetak PDF Buku Startlist (A4)
        eventResult: resolve(__dirname, 'book/event-result.html'), // Hasil Resmi Per Nomor Lomba
        eventSertifikatSetup: resolve(__dirname, 'book/event-sertifikat.html'), // Dapur Admin Setup Koordinat Sertifikat

        // --- 5. SUPER ADMIN PUSAT ---
        admin: resolve(__dirname, 'admin.html'), // Panel Kontrol Super Admin SCS
        adminAds: resolve(__dirname, 'admin-ads.html'),
        sponsorPreview: resolve(__dirname, 'sponsor-preview.html'),
      }
    }
  },
  server: {
    port: 3000,
    open: true,
  },
  appType: 'mpa', // Multi-Page Application
});
