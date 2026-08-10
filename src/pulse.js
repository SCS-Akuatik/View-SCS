import { supabaseClient } from './supabase.js';

let currentF1Count = 124058; // Angka awal (Base F1 ID)
let currentClubCount = 24;
let currentEventCount = 42;

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Inisialisasi Layar Awal
    updateCounterDisplay();

    // 2. KONEKSI SUPABASE REALTIME (Tarik Data Beneran)
    // Subscribe ke perubahan tabel 'profiles' (atau tabel F1 ID lu)
    const channel = supabaseClient.channel('realtime-f1-id')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'profiles' }, 
            (payload) => {
                // Tiap ada data asli masuk ke database:
                triggerNewRegistration(payload.new.full_name || 'Atlet Baru', payload.new.club_name || 'Klub Renang Indonesia');
            }
        )
        .subscribe();

    // 3. HACKER PITCHING MODE (Tekan SPASI buat nyimulasiin pendaftar masuk!)
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            simulateLiveTraffic();
        }
    });
});

// ==========================================
// FUNGSI ANIMASI COUNTER & FEED
// ==========================================

function updateCounterDisplay() {
    const counterEl = document.getElementById('mainCounter');
    
    // Format angka pakai koma: 1,000,000
    const formattedNum = currentF1Count.toLocaleString('en-US');
    
    // Bikin efek kedip/glow dikit tiap angkanya ganti
    counterEl.innerText = formattedNum;
    counterEl.style.textShadow = "0 0 60px rgba(245,158,11,1)"; // Glow Emas (SCS Gold)
    counterEl.classList.replace('text-white', 'text-amber-100');
    
    setTimeout(() => {
        counterEl.style.textShadow = "0 0 40px rgba(59,130,246,0.6)"; // Balik ke Glow Biru
        counterEl.classList.replace('text-amber-100', 'text-white');
    }, 300);
}

function addLiveFeed(message) {
    const feedContainer = document.getElementById('liveFeedContainer');
    
    const feedItem = document.createElement('div');
    feedItem.className = 'feed-enter flex items-center gap-3 text-sm font-mono border-l-2 border-emerald-500 pl-3 bg-white/5 py-1.5 rounded-r-md w-max';
    
    // Timestamp (Jam:Menit:Detik)
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', { hour12: false });

    feedItem.innerHTML = `
        <span class="text-emerald-500 font-bold">[${timeString}]</span>
        <span class="text-slate-300">${message}</span>
    `;

    feedContainer.appendChild(feedItem);

    // Hapus feed paling lama biar gak numpuk kepanjangan (Max 4 feed di layar)
    if (feedContainer.children.length > 5) {
        feedContainer.removeChild(feedContainer.firstElementChild);
    }
}

function triggerNewRegistration(namaAtlet, namaKlub) {
    // 1. Tambah Angka Counter
    currentF1Count += 1;
    updateCounterDisplay();

    // 2. Munculkan Teks di Feed
    const msgs = [
        `Verified: F1 ID diterbitkan untuk <span class="text-white font-bold uppercase">${namaAtlet}</span>`,
        `<span class="text-white font-bold uppercase">${namaAtlet}</span> terhubung ke jaringan F1 ID via ${namaKlub}`,
        `Ping: Sinkronisasi data atlet <span class="text-white font-bold uppercase">${namaAtlet}</span> berhasil.`
    ];
    // Pilih pesan acak
    const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
    addLiveFeed(randomMsg);
}

// ==========================================
// DATA DUMMY UNTUK SIMULASI SAAT PITCHING
// ==========================================
const dummyNames = ["Aditya Fajar", "Bima Sakti", "Citra Kirana", "Dian Sastro", "Eko Yuli", "Kevin Sanjaya", "Lalu Muhammad Zohri"];
const dummyClubs = ["Jago Renang Academy", "Sidoarjo Aquatic", "Surabaya Swim Club", "Petrokimia Gresik", "Millenium Aquatic"];

function simulateLiveTraffic() {
    const randomName = dummyNames[Math.floor(Math.random() * dummyNames.length)];
    const randomClub = dummyClubs[Math.floor(Math.random() * dummyClubs.length)];
    
    triggerNewRegistration(randomName, randomClub);
    
    // Acak juga naik event/klub sesekali
    if (Math.random() > 0.8) {
        currentClubCount++;
        document.getElementById('clubCounter').innerText = currentClubCount;
    }
}
