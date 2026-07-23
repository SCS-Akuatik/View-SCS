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
        settingsLomba: resolve(__dirname, 'settings-lomba.html') /* 👈 INI JAHITANNYA */
      }
    }
  }
});
