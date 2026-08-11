import { supabaseClient } from './supabase.js';

let currentF1Count = 0;
let currentClubCount = 0;
let currentEventCount = 0;

// Wadah untuk menyimpan data asli dari Database
let realSponsors = [];

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. TARIK DATA STATISTIK ASLI
    await fetchRealCounts();

    // 2. TARIK DATA SPONSOR ASLI DARI DATABASE
    await fetchRealSponsors();

    // 3. KONEKSI SUPABASE REALTIME (Mantau Pendaftar Baru)
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

    // 4. SAKLAR SIMULATOR PITCHING (Visual Only)
    startPitchingSimulator();       
    startSponsorClickSimulator();   
});


// ==========================================
// MESIN TARIK DATA SPONSOR ASLI
// ==========================================
async function fetchRealSponsors() {
    try {
        const { data, error } = await supabaseClient
            .from('master_sponsors')
            .select('*');
            
        if (error) throw error;
        
        if (data && data.length > 0) {
            realSponsors = data.map(sp => {
                // Algoritma Pintar: Sebar posisi logo di pinggir layar (hindari area tengah)
                const isLeft = Math.random() > 0.5;
                const randomX = isLeft ? Math.floor(Math.random() * 15) + 5 : Math.floor(Math.random() * 15) + 80; // 5-20% atau 80-95%
                const randomY = Math.floor(Math.random() * 70) + 15; // 15-85% tinggi layar
                
                const pos = isLeft 
                    ? { top: `${randomY}%`, left: `${randomX}%` } 
                    : { top: `${randomY}%`, right: `${100 - randomX}%` };

                return {
                    id: sp.id,
                    name: sp.sponsor_name,
                    logo: sp.logo_url,
                    clicks: sp.clicks || 0, // Ambil total klik dari DB
                    position: pos
                };
            });
            
            renderFloatingSponsors();
        }
    } catch (err) {
        console.error("Gagal menarik data Master Sponsor:", err);
    }
}


// ==========================================
// MESIN RENDER SPONSOR MELAYANG (Vaksin Anti Gepeng)
// ==========================================
function renderFloatingSponsors() {
    const area = document.getElementById('floatingSponsorsArea');
    area.innerHTML = '';

    realSponsors.forEach(sp => {
        const el = document.createElement('div');
        el.className = 'absolute pointer-events-auto float-anim flex flex-col items-center justify-center group cursor-pointer';
        Object.assign(el.style, sp.position);

        el.innerHTML = `
            <div class="relative bg-white p-2 md:p-3 rounded-2xl border border-slate-200 shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-transform hover:scale-110 hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] flex items-center justify-center" style="aspect-ratio: 16/9; width: 100px; max-width: 120px;">
                <img src="${sp.logo}" alt="${sp.name}" class="w-full h-full object-contain drop-shadow-sm transition-opacity" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'text-[9px] font-black text-slate-400 text-center uppercase\\'>${sp.name}</span>';">
                
                <!-- BADGE COUNTER KLIK -->
                <div class="absolute -top-3 -right-3 bg-amber-400 text-black text-[10px] md:text-xs font-black px-2.5 py-1 rounded-full shadow-lg border border-amber-300 transition-colors" id="sp-count-${sp.id}">
                    ${sp.clicks.toLocaleString()}
                </div>
            </div>
            <span class="text-[9px] font-mono text-slate-500 mt-2 bg-black/60 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">Click To Visit</span>
        `;

        // Event Listener Manual Klik (Klik Beneran pakai Mouse = Update DB)
        el.addEventListener('click', () => {
            triggerSponsorClick(sp.id, sp.name, true);
        });

        area.appendChild(el);
    });
}


// ==========================================
// LOGIKA INTERAKSI IKLAN (UPDATE DATABASE)
// ==========================================
window.triggerSponsorClick = async function(id, name, isReal = false) {
    const sp = realSponsors.find(s => s.id === id);
    if (!sp) return;

    // 1. Naikkan Counter Lokal (Frontend)
    sp.clicks++;
    
    // 2. Update UI Angka
    const counterEl = document.getElementById(`sp-count-${id}`);
    if (counterEl) {
        counterEl.innerText = sp.clicks.toLocaleString();
        counterEl.classList.remove('click-ping');
        void counterEl.offsetWidth; 
        counterEl.classList.add('click-ping');
    }

    // 3. Masukin ke Live Feed Log
    const feedMsg = isReal 
        ? `🔥 User mengunjungi <span class="text-amber-400 font-bold uppercase">${name}</span>`
        : `⚡ Ad Traffic: <span class="text-amber-400 font-bold uppercase">${name}</span> mendapat klik`;
    addLiveFeed(feedMsg, isReal);

    // 4. 🔥 EKSEKUSI DATABASE (Hanya Jika Klik Asli dari Mouse) 🔥
    if (isReal) {
        try {
            const { error } = await supabaseClient
                .from('master_sponsors')
                .update({ clicks: sp.clicks })
                .eq('id', id);
                
            if (error) throw error;
            console.log(`[BERHASIL] 1 Klik asli disimpan ke DB untuk sponsor: ${name}`);
        } catch (err) {
            console.error("Gagal mengupdate klik di DB:", err);
        }
    }
};


// ==========================================
// 🚨 SIMULATOR KLIK IKLAN (PITCHING MODE) 🚨
// ==========================================
function startSponsorClickSimulator() {
    function simulateClick() {
        if (realSponsors.length === 0) return; // Tunggu data ditarik
        
        // Pilih 1 sponsor acak
        const randomSp = realSponsors[Math.floor(Math.random() * realSponsors.length)];
        
        // Panggil fungsi klik dengan isReal = FALSE (TIDAK MASUK DATABASE)
        triggerSponsorClick(randomSp.id, randomSp.name, false);

        // Interval acak 2-6 detik
        const nextClickPing = Math.floor(Math.random() * (6000 - 2000 + 1)) + 2000;
        setTimeout(simulateClick, nextClickPing);
    }

    setTimeout(simulateClick, 4000);
}


// ==========================================
// FUNGSI LAINNYA (PENARIKAN DATA ATLET, DLL)
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
