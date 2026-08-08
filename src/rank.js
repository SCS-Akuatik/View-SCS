import { supabaseClient } from './supabase.js';

let allRaceResults = [];
let uniqueEvents = [];
let currentGender = 'Putra';
let currentEvent = '';

document.addEventListener('DOMContentLoaded', async () => {
    await fetchNationalData();
    setupGenderToggle();
});

async function fetchNationalData() {
    const filterContainer = document.getElementById('filterContainer');
    const loadingState = document.getElementById('loadingState');

    loadingState.classList.remove('hidden');

    try {
        // Tarik HANYA waktu yang valid (bukan DQ/DNS) dari seluruh event
        const { data, error } = await supabaseClient
            .from('race_results')
            .select('*')
            .not('time_seconds', 'is', null)
            .lt('time_seconds', 9999); // Abaikan DQ/DNS yang kita set 9999

        if (error) throw error;
        allRaceResults = data || [];

        // Kumpulkan daftar Nomor Lomba yang unik (Misal: 50m Gaya Bebas)
        const eventSet = new Set();
        allRaceResults.forEach(r => {
            if(r.nomor_lomba) eventSet.add(r.nomor_lomba);
        });
        uniqueEvents = Array.from(eventSet).sort();

        // Render Tombol Filter Lomba
        renderFilters();

    } catch (err) {
        console.error("Gagal load data nasional:", err);
        filterContainer.innerHTML = `<p class="text-red-500 font-bold text-sm py-2">Gagal memuat database SCS.</p>`;
    } finally {
        loadingState.classList.add('hidden');
    }
}

function renderFilters() {
    const container = document.getElementById('filterContainer');
    container.innerHTML = '';

    if (uniqueEvents.length === 0) {
        container.innerHTML = `<p class="text-sm font-bold text-slate-400 py-2">Belum ada data lomba.</p>`;
        return;
    }

    // Set lomba pertama sebagai default
    if (!currentEvent) currentEvent = uniqueEvents[0];

    uniqueEvents.forEach(ev => {
        const btn = document.createElement('button');
        
        if (ev === currentEvent) {
            btn.className = "bg-blue-900 text-white px-6 py-2 rounded-full font-bold text-sm shrink-0 shadow-md transition-all";
        } else {
            btn.className = "bg-white text-slate-500 border border-slate-200 px-6 py-2 rounded-full font-bold text-sm shrink-0 hover:bg-slate-50 hover:text-slate-800 transition-all";
        }
        
        btn.innerText = ev;
        btn.onclick = () => {
            currentEvent = ev;
            renderFilters(); // Re-render buat ganti warna tombol
        };
        
        container.appendChild(btn);
    });

    // Setelah filter jadi, jalankan perhitungan ranking
    processAndRenderLeaderboard();
}

function setupGenderToggle() {
    const btns = document.querySelectorAll('.gender-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Ubah Warna Toggle
            btns.forEach(b => {
                b.classList.remove('bg-blue-900', 'text-white', 'shadow-md', 'font-black');
                b.classList.add('text-slate-500', 'font-bold');
            });
            const clickedBtn = e.target;
            clickedBtn.classList.remove('text-slate-500', 'font-bold');
            clickedBtn.classList.add('bg-blue-900', 'text-white', 'shadow-md', 'font-black');

            // Ganti State & Re-render
            currentGender = clickedBtn.getAttribute('data-gender');
            processAndRenderLeaderboard();
        });
    });
}

function processAndRenderLeaderboard() {
    const emptyState = document.getElementById('emptyState');
    const contentBox = document.getElementById('leaderboardContent');
    const podiumContainer = document.getElementById('podiumContainer');
    const listContainer = document.getElementById('listContainer');

    podiumContainer.innerHTML = '';
    listContainer.innerHTML = '';

    // 1. Saring berdasarkan Filter Saat Ini
    const filtered = allRaceResults.filter(r => r.gender === currentGender && r.nomor_lomba === currentEvent);

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        contentBox.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    contentBox.classList.remove('hidden');

    // 2. Mencegah 1 Anak Muncul 2 Kali di Kategori yang Sama (Ambil Personal Best Saja)
    const bestTimesMap = new Map();
    filtered.forEach(r => {
        const key = r.nama_peserta.toLowerCase().trim();
        if (!bestTimesMap.has(key)) {
            bestTimesMap.set(key, r);
        } else {
            // Kalau udah ada, cek apakah waktu yang baru lebih cepat
            const existing = bestTimesMap.get(key);
            if (r.time_seconds < existing.time_seconds) {
                bestTimesMap.set(key, r);
            }
        }
    });

    // 3. Urutkan Waktu Tercepat ke Terlambat
    const sortedAthletes = Array.from(bestTimesMap.values()).sort((a, b) => a.time_seconds - b.time_seconds);

    // 4. RENDER PODIUM (TOP 3)
    // Ingat Urutan Podium CSS: Rank 2 (Kiri), Rank 1 (Tengah), Rank 3 (Kanan)
    const p1 = sortedAthletes[0];
    const p2 = sortedAthletes[1];
    const p3 = sortedAthletes[2];

    let podiumHTML = '';

    // Render Rank 2 (Jika Ada)
    if (p2) {
        podiumHTML += `
            <div class="bg-white rounded-t-2xl shadow-lg w-28 md:w-36 flex flex-col items-center p-4 border-t-4 border-slate-300 relative h-36 justify-end hover:-translate-y-2 transition-transform cursor-pointer" onclick="window.location.href='/f1-id.html?id=${p2.athlete_f1_id}'">
                <div class="absolute -top-6 w-12 h-12 bg-slate-100 rounded-full border-2 border-white flex items-center justify-center font-black text-slate-500 shadow-sm">#2</div>
                <p class="font-bold text-xs md:text-sm text-center text-slate-800 line-clamp-1">${p2.nama_peserta}</p>
                <p class="text-slate-400 text-[9px] uppercase tracking-wider truncate w-full text-center mt-0.5">${p2.klub_asal}</p>
                <p class="font-black text-blue-900 mt-2">${p2.waktu_string}</p>
            </div>
        `;
    }

    // Render Rank 1 (Selalu Ada Jika Data > 0)
    if (p1) {
        podiumHTML += `
            <div class="bg-white rounded-t-2xl shadow-2xl w-32 md:w-44 flex flex-col items-center p-4 border-t-4 border-amber-400 relative h-44 justify-end z-10 transform scale-105 hover:scale-110 transition-transform cursor-pointer" onclick="window.location.href='/f1-id.html?id=${p1.athlete_f1_id}'">
                <div class="absolute -top-8 w-16 h-16 bg-gradient-to-br from-amber-300 to-yellow-500 rounded-full border-4 border-white flex items-center justify-center font-black text-white shadow-md text-xl">#1</div>
                <p class="font-black text-sm md:text-base text-center text-slate-900 line-clamp-2 leading-tight">${p1.nama_peserta}</p>
                <p class="text-slate-500 text-[10px] uppercase tracking-wider truncate w-full text-center mt-1">${p1.klub_asal}</p>
                <p class="font-black text-2xl text-blue-900 mt-2">${p1.waktu_string}</p>
            </div>
        `;
    }

    // Render Rank 3 (Jika Ada)
    if (p3) {
        podiumHTML += `
            <div class="bg-white rounded-t-2xl shadow-lg w-28 md:w-36 flex flex-col items-center p-4 border-t-4 border-orange-600 relative h-32 justify-end hover:-translate-y-2 transition-transform cursor-pointer" onclick="window.location.href='/f1-id.html?id=${p3.athlete_f1_id}'">
                <div class="absolute -top-6 w-12 h-12 bg-orange-50 rounded-full border-2 border-white flex items-center justify-center font-black text-orange-700 shadow-sm">#3</div>
                <p class="font-bold text-xs md:text-sm text-center text-slate-800 line-clamp-1">${p3.nama_peserta}</p>
                <p class="text-slate-400 text-[9px] uppercase tracking-wider truncate w-full text-center mt-0.5">${p3.klub_asal}</p>
                <p class="font-black text-blue-900 mt-2">${p3.waktu_string}</p>
            </div>
        `;
    }

    podiumContainer.innerHTML = podiumHTML;

    // 5. RENDER SISANYA (RANK 4 KE ATAS)
    if (sortedAthletes.length > 3) {
        let listHTML = '';
        for (let i = 3; i < sortedAthletes.length; i++) {
            const rank = i + 1;
            const athlete = sortedAthletes[i];
            
            listHTML += `
                <div class="flex items-center justify-between p-4 md:p-5 hover:bg-blue-50 transition-colors cursor-pointer group" onclick="window.location.href='/f1-id.html?id=${athlete.athlete_f1_id}'">
                    <div class="flex items-center gap-4 min-w-0">
                        <span class="font-black text-slate-300 w-6 text-center text-lg group-hover:text-blue-400 transition-colors">${rank}</span>
                        <div class="min-w-0">
                            <p class="font-extrabold text-slate-800 truncate">${athlete.nama_peserta}</p>
                            <p class="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider truncate mt-0.5">🏠 ${athlete.klub_asal}</p>
                        </div>
                    </div>
                    <div class="font-mono font-black text-blue-900 text-lg shrink-0 ml-4">
                        ${athlete.waktu_string}
                    </div>
                </div>
            `;
        }
        listContainer.innerHTML = listHTML;
        listContainer.parentElement.classList.remove('hidden');
    } else {
        listContainer.parentElement.classList.add('hidden');
    }
}
