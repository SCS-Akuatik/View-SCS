import { supabaseClient } from './supabase.js';

let currentEventId = null;
let allHeats = []; 
let currentSelectedEventNumber = null;

// Timer Auto Refresh
let refreshInterval = 30; // 30 detik
let timeLeft = refreshInterval;
let timerId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentEventId = urlParams.get('id');

    if (!currentEventId) return alert("Halaman tidak valid. ID Event tidak ditemukan!");

    await fetchEventName();
    await fetchHeatsData(true); // true = First load (build dropdown)

    startAutoRefresh();
});

// Ambil Nama Lomba untuk Header
async function fetchEventName() {
    try {
        const { data, error } = await supabaseClient
            .from('events')
            .select('event_name')
            .eq('id', currentEventId)
            .single();
        if (data) {
            document.getElementById('headerEventName').innerText = data.event_name;
        }
    } catch (err) {
        console.error(err);
    }
}

// Tarik data Heat terbaru dari Supabase
async function fetchHeatsData(isFirstLoad = false) {
    const icon = document.getElementById('iconRefresh');
    icon.classList.add('spin-anim');

    try {
        const { data, error } = await supabaseClient
            .from('event_heats')
            .select('*')
            .eq('event_id', currentEventId)
            .order('event_number', { ascending: true })
            .order('heat_number', { ascending: true });

        if (error) throw error;
        allHeats = data || [];

        if (isFirstLoad) {
            populateEventDropdown();
        } else {
            // Jika ini dari auto-refresh, langsung update UI lomba yang sedang dibuka
            if (currentSelectedEventNumber) {
                renderResults(currentSelectedEventNumber);
            }
        }
    } catch (err) {
        console.error("Gagal memuat data Live Result:", err);
    } finally {
        setTimeout(() => icon.classList.remove('spin-anim'), 500); // Stop animasi muter
    }
}

// Isi Dropdown Lomba
function populateEventDropdown() {
    const selectEvent = document.getElementById('selectEvent');
    selectEvent.innerHTML = '<option value="">-- Pilih Nomor Lomba --</option>';

    const uniqueEvents = [...new Map(allHeats.map(item => [item.event_number, item])).values()];

    uniqueEvents.forEach(ev => {
        let label = `Event #${ev.event_number}: ${ev.nomor_lomba} - ${ev.gender} - ${ev.kelompok_umur}`;
        selectEvent.innerHTML += `<option value="${ev.event_number}">${label}</option>`;
    });

    selectEvent.addEventListener('change', (e) => {
        currentSelectedEventNumber = e.target.value;
        renderResults(currentSelectedEventNumber);
    });
}

// Render Hasil ke Layar
function renderResults(eventNumber) {
    const container = document.getElementById('resultContainer');
    
    if (!eventNumber) {
        container.innerHTML = `
        <div class="text-center py-10 opacity-50">
            <div class="text-4xl mb-3">🏊‍♂️</div>
            <h3 class="text-sm font-bold text-slate-600">Pilih lomba di atas untuk melihat hasil Heat.</h3>
        </div>`;
        return;
    }

    const heatsToShow = allHeats.filter(h => h.event_number == eventNumber);
    let htmlContent = '';

    heatsToShow.forEach(heat => {
        let lanesHtml = '';

        heat.lanes_data.forEach(atlet => {
            if (!atlet.nama) return; // Skip lintasan kosong

            // Logika Warna Status Waktu
            let timeDisplay = atlet.waktu_tempuh || 'NT';
            let timeColorClass = "text-slate-400"; // Default (NT)
            let timeBgClass = "bg-slate-100";

            if (timeDisplay !== 'NT' && timeDisplay !== 'DQ') {
                timeColorClass = "text-emerald-700"; // Udah ada waktunya
                timeBgClass = "bg-emerald-50 border border-emerald-200";
            } else if (timeDisplay === 'DQ') {
                timeColorClass = "text-red-600"; // Diskualifikasi
                timeBgClass = "bg-red-50 border border-red-200";
            }

            lanesHtml += `
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 mb-2">
                <div class="flex items-center gap-3">
                    <div class="w-7 h-7 rounded bg-slate-300 text-slate-700 text-xs font-black flex items-center justify-center shrink-0">${atlet.lane}</div>
                    <div>
                        <p class="text-sm font-black text-slate-900 leading-tight uppercase">${atlet.nama}</p>
                        <p class="text-[10px] font-bold text-slate-500 uppercase">${atlet.klub}</p>
                    </div>
                </div>
                <div class="shrink-0 pl-2">
                    <span class="inline-block px-3 py-1.5 rounded-lg font-mono text-sm font-black tracking-wider ${timeColorClass} ${timeBgClass}">
                        ${timeDisplay}
                    </span>
                </div>
            </div>`;
        });

        if(lanesHtml === '') {
            lanesHtml = `<p class="text-xs text-slate-400 italic text-center py-2">Tidak ada data atlet di Heat ini.</p>`;
        }

        htmlContent += `
        <div class="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
            <!-- Pita Penanda Heat -->
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-slate-300"></div>
            
            <div class="pl-2 mb-4 flex justify-between items-end border-b border-slate-100 pb-2">
                <div>
                    <h3 class="text-sm font-black text-slate-800 uppercase">HEAT ${heat.heat_number} <span class="text-[10px] text-slate-400 font-bold">(Dari ${heat.total_heats})</span></h3>
                </div>
            </div>
            
            <div>
                ${lanesHtml}
            </div>
        </div>`;
    });

    container.innerHTML = htmlContent;
}

// ==========================================
// LOGIKA AUTO REFRESH & PROGRESS BAR
// ==========================================
function startAutoRefresh() {
    const textEl = document.getElementById('countdownText');
    const barEl = document.getElementById('refreshProgressBar');

    timerId = setInterval(() => {
        timeLeft--;
        textEl.innerText = `${timeLeft}s`;
        
        // Update Progress Bar
        const percent = (timeLeft / refreshInterval) * 100;
        barEl.style.width = `${percent}%`;

        if (timeLeft <= 0) {
            triggerManualRefresh();
        }
    }, 1000);
}

// Tombol Refresh Manual
document.getElementById('btnRefresh').addEventListener('click', () => {
    triggerManualRefresh();
});

function triggerManualRefresh() {
    fetchHeatsData(false); // Ambil data baru di background
    
    // Reset Timer
    timeLeft = refreshInterval;
    document.getElementById('countdownText').innerText = `${timeLeft}s`;
    document.getElementById('refreshProgressBar').style.width = `100%`;
}
