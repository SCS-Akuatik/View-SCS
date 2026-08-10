import { supabaseClient } from './supabase.js';

let currentEventId = null;
let allHeats = []; 
let currentSelectedEventNumber = null;

let refreshInterval = 30; 
let timeLeft = refreshInterval;
let timerId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentEventId = urlParams.get('id');

    if (!currentEventId) return alert("Halaman tidak valid. ID Event tidak ditemukan!");

    await fetchEventName();
    await fetchSponsors(); // <-- TRIGGER JALAN TOL SPONSOR BARU LU!
    await fetchHeatsData(true); 

    startAutoRefresh();
});

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
    } catch (err) { console.error(err); }
}

// ==========================================
// NEW: SISTEM PENARIKAN MULTI-SPONSOR
// ==========================================
async function fetchSponsors() {
    const wrapper = document.getElementById('partnerWrapper');
    if (!wrapper) return;

    try {
        // 1. Cek jembatan event_sponsors
        const { data: linkData, error: linkErr } = await supabaseClient
            .from('event_sponsors')
            .select('sponsor_ids')
            .eq('event_id', currentEventId)
            .single();

        // Kalau belum ada sponsor disuntik, biarin kosong (gak usah error merah lagi)
        if (linkErr || !linkData || !linkData.sponsor_ids || linkData.sponsor_ids.length === 0) return;

        // 2. Tarik data asli dari Master Bank pakai array ID
        const { data: sponsors, error: spErr } = await supabaseClient
            .from('master_sponsors')
            .select('*')
            .in('id', linkData.sponsor_ids);

        if (spErr || !sponsors || sponsors.length === 0) return;

        // 3. Render ke layar (Bisa nampung 1 atau banyak sponsor sekaligus)
        let html = `
            <div class="w-full bg-slate-900 rounded-2xl border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)] mb-6 py-4 px-4 overflow-hidden relative">
                <!-- Aksen Cahaya -->
                <div class="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-amber-500 rounded-b-full shadow-[0_0_10px_rgba(245,158,11,0.8)]"></div>
                
                <div class="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center mb-3">Official Partners</div>
                
                <div class="flex items-center justify-center gap-6 md:gap-8 flex-wrap">
        `;

        sponsors.forEach(sp => {
            const logo = sp.logo_url || '/images/logo.png';
            const link = sp.link_url || '#';
            html += `
                <a href="${link}" target="_blank" rel="noopener noreferrer" class="group block transition-transform hover:scale-110 hover:-translate-y-1">
                    <img src="${logo}" alt="${sp.sponsor_name}" title="${sp.sponsor_name}" class="h-8 md:h-10 object-contain drop-shadow-md opacity-80 group-hover:opacity-100 transition-all duration-300">
                </a>
            `;
        });

        html += `
                </div>
            </div>
        `;

        wrapper.innerHTML = html;

    } catch (err) {
        console.error("Gagal menarik data sponsor:", err);
    }
}

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
            if (currentSelectedEventNumber) {
                renderResults(currentSelectedEventNumber);
            }
        }
    } catch (err) {
        console.error("Gagal memuat data Live Result:", err);
    } finally {
        setTimeout(() => icon.classList.remove('spin-anim'), 500); 
    }
}

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

    document.getElementById('btnShowAll').addEventListener('click', () => {
        selectEvent.value = ""; 
        currentSelectedEventNumber = 'ALL';
        renderResults('ALL');
    });
}

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

    let heatsToShow = [];
    if (eventNumber === 'ALL') {
        heatsToShow = allHeats;
    } else {
        heatsToShow = allHeats.filter(h => h.event_number == eventNumber);
    }
    
    let htmlContent = '';

    heatsToShow.forEach(heat => {
        let lanesHtml = '';

        heat.lanes_data.forEach(atlet => {
            if (!atlet.nama) return; 

            let timeDisplay = atlet.waktu_tempuh || 'NT';
            let timeColorClass = "text-slate-400"; 
            let timeBgClass = "bg-slate-100";

            if (timeDisplay !== 'NT' && timeDisplay !== 'DQ') {
                timeColorClass = "text-emerald-700"; 
                timeBgClass = "bg-emerald-50 border border-emerald-200";
            } else if (timeDisplay === 'DQ') {
                timeColorClass = "text-red-600"; 
                timeBgClass = "bg-red-50 border border-red-200";
            }

            lanesHtml += `
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 mb-2 hover:bg-slate-100 transition-colors">
                <div class="flex items-center gap-3">
                    <div class="w-7 h-7 rounded bg-slate-300 text-slate-700 text-xs font-black flex items-center justify-center shrink-0">${atlet.lane}</div>
                    <div>
                        <p class="text-sm font-black text-slate-900 leading-tight uppercase">${atlet.nama}</p>
                        <p class="text-[10px] font-bold text-slate-500 uppercase">${atlet.klub}</p>
                    </div>
                </div>
                <div class="shrink-0 pl-2">
                    <span class="inline-block px-3 py-1.5 rounded-lg font-mono text-sm font-black tracking-wider ${timeColorClass} ${timeBgClass} shadow-sm">
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
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-slate-300"></div>
            <div class="pl-2 mb-4 flex justify-between items-end border-b border-slate-100 pb-2">
                <div>
                    <h3 class="text-sm font-black text-slate-800 uppercase">Event #${heat.event_number}: ${heat.nomor_lomba} - ${heat.gender}</h3>
                    <p class="text-[10px] text-slate-400 font-bold mt-0.5">HEAT ${heat.heat_number} (Dari ${heat.total_heats})</p>
                </div>
            </div>
            <div>${lanesHtml}</div>
        </div>`;
    });

    container.innerHTML = htmlContent;
}

function startAutoRefresh() {
    const textEl = document.getElementById('countdownText');
    const barEl = document.getElementById('refreshProgressBar');

    timerId = setInterval(() => {
        timeLeft--;
        textEl.innerText = `${timeLeft}s`;
        
        const percent = (timeLeft / refreshInterval) * 100;
        barEl.style.width = `${percent}%`;

        if (timeLeft <= 0) {
            triggerManualRefresh();
        }
    }, 1000);
}

document.getElementById('btnRefresh').addEventListener('click', () => {
    triggerManualRefresh();
});

function triggerManualRefresh() {
    fetchHeatsData(false); 
    
    timeLeft = refreshInterval;
    document.getElementById('countdownText').innerText = `${timeLeft}s`;
    document.getElementById('refreshProgressBar').style.width = `100%`;
}
