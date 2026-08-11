import { supabaseClient } from './supabase.js';

let currentF1Count = 0;
let currentClubCount = 0;
let currentEventCount = 0;

// ==========================================
// 💡 DUMMY DATA SPONSOR (Bodi Mustang GT)
// Nanti ini bisa diganti fetch() dari Supabase tabel 'master_sponsors'
// ==========================================
let floatingSponsors = [
    { id: 1, name: "Joss Printer", logo: "https://ui-avatars.com/api/?name=Joss+Printer&background=ffffff&color=0f172a&font-size=0.33&bold=true", clicks: 1450, position: { top: '20%', left: '10%' } },
    { id: 2, name: "Speedo Aquatics", logo: "https://ui-avatars.com/api/?name=Speedo&background=ffffff&color=dc2626&font-size=0.33&bold=true", clicks: 890, position: { top: '50%', right: '15%' } },
    { id: 3, name: "Milo Energy", logo: "https://ui-avatars.com/api/?name=MILO&background=16a34a&color=ffffff&font-size=0.33&bold=true", clicks: 3200, position: { bottom: '25%', left: '20%' } },
    { id: 4, name: "Arena Swim", logo: "https://ui-avatars.com/api/?name=Arena&background=000000&color=ffffff&font-size=0.33&bold=true", clicks: 512, position: { top: '10%', right: '25%' } }
];

document.addEventListener('DOMContentLoaded', async () => {
    
    await fetchRealCounts();

    // Render Bodi Sponsor Melayang
    renderFloatingSponsors();

    try {
        const channel = supabaseClient.channel('realtime-f1-id')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'athletes' }, 
                (payload) => {
                    const namaAtlet = payload.new.full_name || 'Atlet Baru';
                    const namaKlub = payload.new.club_name || 'Jaringan F1 ID'; 
                    triggerNewRegistration(namaAtlet, namaKlub, true); 
                }
            )
            .subscribe();
    } catch(err) { console.log("Realtime error:", err); }

    // 🚨 SAKLAR SIMULATOR TRAFFIC 🚨
    startPitchingSimulator();       // Simulator Atlet
    startSponsorClickSimulator();   // Simulator Klik Iklan
});

// ==========================================
// MESIN RENDER SPONSOR MELAYANG
// ==========================================
function renderFloatingSponsors() {
    const area = document.getElementById('floatingSponsorsArea');
    area.innerHTML = '';

    floatingSponsors.forEach(sp => {
        const el = document.createElement('div');
        // pointer-events-auto penting biar bisa diklik walau bungkusnya pointer-events-none
        el.className = 'absolute pointer-events-auto float-anim flex flex-col items-center justify-center group cursor-pointer';
        Object.assign(el.style, sp.position);

        el.innerHTML = `
            <div class="relative bg-white/10 backdrop-blur-md p-3 md:p-4 rounded-3xl border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-transform hover:scale-110 hover:bg-white/20">
                <img src="${sp.logo}" alt="${sp.name}" class="h-8 md:h-12 w-auto object-contain opacity-60 group-hover:opacity-100 transition-opacity drop-shadow-md rounded">
                
                <!-- BADGE COUNTER KLIK -->
                <div class="absolute -top-3 -right-3 bg-amber-400 text-black text-[10px] md:text-xs font-black px-2.5 py-1 rounded-full shadow-lg border border-amber-300 transition-colors" id="sp-count-${sp.id}">
                    ${sp.clicks.toLocaleString()}
                </div>
            </div>
            <span class="text-[9px] font-mono text-slate-500 mt-2 bg-black/60 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">Click To Visit</span>
        `;

        // Event Listener Manual Klik (Biar Lu Bisa Nge-klik Langsung Pakai Mouse)
        el.addEventListener('click', () => {
            triggerSponsorClick(sp.id, sp.name, true);
        });

        area.appendChild(el);
    });
}

// ==========================================
// LOGIKA INTERAKSI IKLAN (MESIN V8 NYA DISINI NANTI)
// ==========================================
window.triggerSponsorClick = function(id, name, isReal = false) {
    const sp = floatingSponsors.find(s => s.id === id);
    if (!sp) return;

    // 1. Naikkan Counter Lokal
    sp.clicks++;
    
    // 2. Update UI Angka
    const counterEl = document.getElementById(`sp-count-${id}`);
    if (counterEl) {
        counterEl.innerText = sp.clicks.toLocaleString();
        
        // 3. Reset dan Mainkan Animasi Ping/Kedip
        counterEl.classList.remove('click-ping');
        void counterEl.offsetWidth; // Hack JS buat ngereset animasi CSS
        counterEl.classList.add('click-ping');
    }

    // 4. Masukin ke Live Feed Log
    // Kalau ini klik asli dari mouse lu, teksnya beda sama klik simulator
    const feedMsg = isReal 
        ? `🔥 User mengunjungi <span class="text-amber-400 font-bold uppercase">${name}</span>`
        : `⚡ Ad Traffic: <span class="text-amber-400 font-bold uppercase">${name}</span> mendapat klik`;
    
    addLiveFeed(feedMsg, isReal);

    // 5. MASA DEPAN: TEMPAT MANGGIL SUPABASE
    if (isReal) {
        // Contoh kode masa depan:
        // supabaseClient.rpc('increment_sponsor_click', { sponsor_id: id });
        console.log(`Menyimpan klik asli untuk ${name} ke database...`);
    }
};

// ==========================================
// 🚨 SIMULATOR KLIK IKLAN (PITCHING MODE) 🚨
// ==========================================
function startSponsorClickSimulator() {
    function simulateClick() {
        // Pilih 1 sponsor acak
        const randomSp = floatingSponsors[Math.floor(Math.random() * floatingSponsors.length)];
        
        // Panggil fungsi klik tapi set isReal = false (cuma jalan di UI)
        triggerSponsorClick(randomSp.id, randomSp.name, false);

        // Atur waktu acak untuk klik selanjutnya (antara 2 sampai 6 detik)
        const nextClickPing = Math.floor(Math.random() * (6000 - 2000 + 1)) + 2000;
        setTimeout(simulateClick, nextClickPing);
    }

    // Mulai simulasi iklan setelah jeda 3 detik
    setTimeout(simulateClick, 3000);
}


// ==========================================
// FUNGSI LAMA (PENARIKAN DATA, COUNTER ATLET) TETAP UTUH
// ==========================================
async function fetchRealCounts() {
    try {
        addLiveFeed("Menghubungkan ke pusat data SCS...");
        const { count: f1Count } = await supabaseClient.from('athletes').select('*', { count: 'exact', head: true });
        if (f1Count !== null) currentF1Count = f1Count;

        const { count: clubCount } = await supabaseClient.from('clubs').select('*', { count: 'exact', head: true });
        if (clubCount !== null) currentClubCount = clubCount;

        const { count: eventCount } = await supabaseClient.from('events').select('*', { count: 'exact', head: true });
        if (eventCount !== null) currentEventCount = eventCount;

        updateCounterDisplay();
        document.getElementById('clubCounter').innerText = currentClubCount;
        document.getElementById('eventCounter').innerText = currentEventCount;
        addLiveFeed("🟢 Sinkronisasi data real-time berhasil.", true);
    } catch (error) { console.error(error); }
}

function updateCounterDisplay() {
    const counterEl = document.getElementById('mainCounter');
    counterEl.innerText = currentF1Count.toLocaleString('en-US');
    counterEl.style.textShadow = "0 0 60px rgba(245,158,11,1)"; 
    counterEl.classList.replace('text-white', 'text-amber-100');
    counterEl.style.transform = "scale(1.05)";
    
    setTimeout(() => {
        counterEl.style.textShadow = "0 0 40px rgba(59,130,246,0.6)"; 
        counterEl.classList.replace('text-amber-100', 'text-white');
        counterEl.style.transform = "scale(1)";
    }, 250);
}

function addLiveFeed(message, isReal = false) {
    const feedContainer = document.getElementById('liveFeedContainer');
    const feedItem = document.createElement('div');
    const borderColor = isReal ? 'border-emerald-500' : 'border-sky-500';
    const timeColor = isReal ? 'text-emerald-500' : 'text-sky-500';

    feedItem.className = `feed-enter flex items-center gap-3 text-xs md:text-sm font-mono border-l-2 ${borderColor} pl-3 bg-white/5 py-1.5 rounded-r-md w-max max-w-full truncate`;
    const timeString = new Date().toLocaleTimeString('id-ID', { hour12: false });

    feedItem.innerHTML = `<span class="${timeColor} font-bold shrink-0">[${timeString}]</span><span class="text-slate-300 truncate">${message}</span>`;
    feedContainer.appendChild(feedItem);
    if (feedContainer.children.length > 4) feedContainer.removeChild(feedContainer.firstElementChild);
}

function triggerNewRegistration(namaAtlet, namaKlub, isReal = false) {
    currentF1Count += 1;
    updateCounterDisplay();
    const msgs = [
        `Registrasi Atlet: <span class="text-white font-bold uppercase">${namaAtlet}</span>`,
        `<span class="text-white font-bold uppercase">${namaAtlet}</span> bergabung dengan jaringan.`,
    ];
    addLiveFeed(msgs[Math.floor(Math.random() * msgs.length)], isReal);
}

function startPitchingSimulator() {
    const fNames = ["Bima", "Aditya", "Kevin", "Rizky", "Fajar", "Dion", "Alif", "Putra", "Naufal", "Arjuna"];
    const lNames = ["Saputra", "Wicaksono", "Pratama", "Hidayat", "Wijaya", "Kusuma", "Nugroho", "Setiawan"];
    const clubs = ["Jago Renang Academy", "Surabaya SC", "Aquatic Club", "Elite Swim", "Sidoarjo Aquatic"];

    function simulateTraffic() {
        triggerNewRegistration(`${fNames[Math.floor(Math.random() * fNames.length)]} ${lNames[Math.floor(Math.random() * lNames.length)]}`, clubs[Math.floor(Math.random() * clubs.length)], false);
        setTimeout(simulateTraffic, Math.floor(Math.random() * (15000 - 4000 + 1)) + 4000);
    }
    setTimeout(simulateTraffic, 5000);
}
