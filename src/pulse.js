import { supabaseClient } from './supabase.js';

let currentF1Count = 124058; // Angka awal (Base F1 ID)
let currentClubCount = 24;
let currentEventCount = 42;

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Inisialisasi Layar Awal
    updateCounterDisplay();

    // 2. KONEKSI SUPABASE REALTIME (Tarik Data Beneran)
    try {
        const channel = supabaseClient.channel('realtime-f1-id')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'profiles' }, 
                (payload) => {
                    triggerNewRegistration(payload.new.full_name || 'Atlet Baru', payload.new.club_name || 'Klub Renang Indonesia');
                }
            )
            .subscribe();
    } catch(err) { console.log("Realtime standby..."); }

    // ==========================================
    // 3. AUTO-PILOT MODE (Simulasi Natural)
    // ==========================================
    function autoPilot() {
        // Jeda waktu acak antara 2.5 sampai 6 detik biar kelihatan nyata
        const randomDelay = Math.floor(Math.random() * 3500) + 2500;
        
        setTimeout(() => {
            simulateLiveTraffic();
            autoPilot(); // Muter terus tanpa henti
        }, randomDelay);
    }
    
    // Mulai auto-pilot 2 detik setelah halaman dibuka
    setTimeout(autoPilot, 2000);

    // ==========================================
    // 4. HACKER PITCHING MODE (Manual Trigger)
    // ==========================================
    
    // Lewat Keyboard (Spasi) - Buat Desktop
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            simulateLiveTraffic();
        }
    });

    // Lewat Ketukan Layar (Tap/Click) - Buat HP!
    document.addEventListener('click', () => {
        simulateLiveTraffic();
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
    
    // Efek scale membesar sedikit
    counterEl.style.transform = "scale(1.05)";
    counterEl.style.transition = "all 0.1s ease-out";
    
    setTimeout(() => {
        counterEl.style.textShadow = "0 0 40px rgba(59,130,246,0.6)"; // Balik ke Glow Biru
        counterEl.classList.replace('text-amber-100', 'text-white');
        counterEl.style.transform = "scale(1)";
    }, 250);
}

function addLiveFeed(message) {
    const feedContainer = document.getElementById('liveFeedContainer');
    
    const feedItem = document.createElement('div');
    feedItem.className = 'feed-enter flex items-center gap-3 text-xs md:text-sm font-mono border-l-2 border-emerald-500 pl-3 bg-white/5 py-1.5 rounded-r-md w-max max-w-full truncate';
    
    // Timestamp (Jam:Menit:Detik)
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', { hour12: false });

    feedItem.innerHTML = `
        <span class="text-emerald-500 font-bold shrink-0">[${timeString}]</span>
        <span class="text-slate-300 truncate">${message}</span>
    `;

    feedContainer.appendChild(feedItem);

    // Hapus feed paling lama biar gak numpuk (Max 4 baris di layar)
    if (feedContainer.children.length > 4) {
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
        `<span class="text-white font-bold uppercase">${namaAtlet}</span> terhubung ke jaringan via ${namaKlub}`,
        `Ping: Sinkronisasi data atlet <span class="text-white font-bold uppercase">${namaAtlet}</span> berhasil.`
    ];
    // Pilih pesan acak
    const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
    addLiveFeed(randomMsg);
}

// ==========================================
// DATA DUMMY UNTUK SIMULASI SAAT PITCHING
// ==========================================
const dummyNames = [
    "Aditya Fajar", "Bima Sakti", "Citra Kirana", "Dian Sastro", "Eko Yuli", 
    "Kevin Sanjaya", "Lalu M. Zohri", "Azzahra Permata", "I Gede Siman", "Glenn Victor", 
    "Fellicia Angelica", "Aflah Fadlan"
];
const dummyClubs = [
    "Jago Renang Academy", "Sidoarjo Aquatic", "Surabaya Swim Club", "Petrokimia Gresik", 
    "Millenium Aquatic", "HIU Surabaya", "Suryanaga", "Tirta Taruna", "Bali Pari"
];

function simulateLiveTraffic() {
    const randomName = dummyNames[Math.floor(Math.random() * dummyNames.length)];
    const randomClub = dummyClubs[Math.floor(Math.random() * dummyClubs.length)];
    
    triggerNewRegistration(randomName, randomClub);
    
    // Acak naik event/klub (probabilitas kecil)
    if (Math.random() > 0.85) {
        currentClubCount++;
        const el = document.getElementById('clubCounter');
        if(el) {
            el.innerText = currentClubCount;
            el.style.color = "#fff";
            setTimeout(() => el.style.color = "#34d399", 300);
        }
    }
}
