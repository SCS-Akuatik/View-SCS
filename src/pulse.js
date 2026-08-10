import { supabaseClient } from './supabase.js';

let currentF1Count = 0;
let currentClubCount = 0;
let currentEventCount = 0;

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. TARIK DATA BENERAN DARI SUPABASE (AWAL LOAD)
    // Kita panggil fungsi khusus buat narik total row dari database
    await fetchRealCounts();

    // 2. KONEKSI SUPABASE REALTIME (Mantau Pendaftar Asli)
    try {
        const channel = supabaseClient.channel('realtime-f1-id')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'profiles' }, 
                (payload) => {
                    // Tarik info nama dari database pas ada yang daftar beneran!
                    const namaAtlet = payload.new.full_name || 'Atlet Baru';
                    const namaKlub = payload.new.club_name || 'Klub Renang Indonesia';
                    
                    triggerNewRegistration(namaAtlet, namaKlub);
                }
            )
            .subscribe();
    } catch(err) { console.log("Realtime error:", err); }

});

// ==========================================
// FUNGSI PENARIKAN DATA ASLI (SUPABASE)
// ==========================================
async function fetchRealCounts() {
    try {
        // Tampilkan status loading di feed
        addLiveFeed("Menghubungkan ke pusat data SCS...");

        // A. Hitung total Profil (F1 ID) - Pakai { count: 'exact', head: true } biar query-nya super ringan
        const { count: f1Count, error: errF1 } = await supabaseClient
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        if (!errF1 && f1Count !== null) currentF1Count = f1Count;

        // B. Hitung total Klub
        const { count: clubCount, error: errClub } = await supabaseClient
            .from('clubs')
            .select('*', { count: 'exact', head: true });
        if (!errClub && clubCount !== null) currentClubCount = clubCount;

        // C. Hitung total Event
        const { count: eventCount, error: errEvent } = await supabaseClient
            .from('events')
            .select('*', { count: 'exact', head: true });
        if (!errEvent && eventCount !== null) currentEventCount = eventCount;

        // Update ke Layar Utama
        updateCounterDisplay();
        document.getElementById('clubCounter').innerText = currentClubCount;
        document.getElementById('eventCounter').innerText = currentEventCount;
        
        addLiveFeed("🟢 Sinkronisasi data real-time berhasil.");

    } catch (error) {
        console.error("Gagal menarik data real:", error);
        addLiveFeed("🔴 Gagal terhubung ke Database SCS.");
    }
}

// ==========================================
// FUNGSI ANIMASI COUNTER & FEED
// ==========================================
function updateCounterDisplay() {
    const counterEl = document.getElementById('mainCounter');
    const formattedNum = currentF1Count.toLocaleString('en-US');
    
    counterEl.innerText = formattedNum;
    counterEl.style.textShadow = "0 0 60px rgba(245,158,11,1)"; 
    counterEl.classList.replace('text-white', 'text-amber-100');
    counterEl.style.transform = "scale(1.05)";
    counterEl.style.transition = "all 0.1s ease-out";
    
    setTimeout(() => {
        counterEl.style.textShadow = "0 0 40px rgba(59,130,246,0.6)"; 
        counterEl.classList.replace('text-amber-100', 'text-white');
        counterEl.style.transform = "scale(1)";
    }, 250);
}

function addLiveFeed(message) {
    const feedContainer = document.getElementById('liveFeedContainer');
    const feedItem = document.createElement('div');
    feedItem.className = 'feed-enter flex items-center gap-3 text-xs md:text-sm font-mono border-l-2 border-emerald-500 pl-3 bg-white/5 py-1.5 rounded-r-md w-max max-w-full truncate';
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', { hour12: false });

    feedItem.innerHTML = `
        <span class="text-emerald-500 font-bold shrink-0">[${timeString}]</span>
        <span class="text-slate-300 truncate">${message}</span>
    `;

    feedContainer.appendChild(feedItem);

    if (feedContainer.children.length > 4) {
        feedContainer.removeChild(feedContainer.firstElementChild);
    }
}

// Ter-trigger HANYA KETIKA ada data beneran masuk ke Supabase
function triggerNewRegistration(namaAtlet, namaKlub) {
    currentF1Count += 1;
    updateCounterDisplay();

    const msgs = [
        `Realtime: F1 ID resmi diterbitkan untuk <span class="text-white font-bold uppercase">${namaAtlet}</span>`,
        `<span class="text-white font-bold uppercase">${namaAtlet}</span> bergabung ke jaringan dari klub ${namaKlub}`,
    ];
    const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
    addLiveFeed(randomMsg);
}
