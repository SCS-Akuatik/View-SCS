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
    await fetchHeatsData(true); 

    startAutoRefresh();
});

async function fetchEventName() {
    try {
        const { data, error } = await supabaseClient
            .from('events')
            .select('event_name, config')
            .eq('id', currentEventId)
            .single();
            
        if (data) {
            // ==========================================
            // KAMERA PENGINTAI 1: CEK APAKAH JS BARU JALAN
            // ==========================================
            // Kalau di layar HP lu judulnya TETAP "JR TIME TRIAL VOL. 1" tanpa tulisan V3, 
            // berarti fix 100% server hosting lu belum update file-nya!
            document.getElementById('headerEventName').innerText = data.event_name + " (✅ V3)";
            
            // ==========================================
            // KAMERA PENGINTAI 2: INJEKSI IKLAN BRUTAL
            // ==========================================
            let configObj = data.config;
            if (typeof configObj === 'string') {
                try { configObj = JSON.parse(configObj); } catch(e) {}
            }

            const resultContainer = document.getElementById('resultContainer');

            if (configObj && configObj.ads_sponsor_name) {
                const partnerLogo = configObj.ads_sponsor_logo || '/images/logo.png';
                const partnerLink = configObj.ads_link_url || '#';
                
                // Tembak paksa di atas hasil lomba, tanpa butuh div khusus dari HTML
                if (resultContainer && !document.getElementById('scs-box-utama')) {
                    const infoHtml = `
                        <div id="scs-box-utama" class="w-full bg-slate-900 rounded-2xl border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] mb-6 py-3 px-4 flex justify-center items-center">
                            <a href="${partnerLink}" target="_blank" class="flex items-center gap-4">
                                <span class="text-xs font-black text-amber-500 tracking-widest uppercase">Official Partner</span>
                                <img src="${partnerLogo}" class="h-10 md:h-12 object-contain bg-white p-1 rounded-lg">
                            </a>
                        </div>
                    `;
                    resultContainer.insertAdjacentHTML('beforebegin', infoHtml);
                }
            } else {
                // Kalau ternyata config-nya kosong dari Supabase, munculkan peringatan MERAH!
                if (resultContainer && !document.getElementById('error-ads')) {
                    resultContainer.insertAdjacentHTML('beforebegin', `
                        <div id="error-ads" class="w-full bg-red-900/80 text-red-100 text-xs font-bold rounded-xl p-4 mb-6 text-center border-2 border-red-500 shadow-md">
                            ❌ DATABASE CONFIG KOSONG.<br>Sponsor belum ter-injeksi di event ini lewat Admin Panel.
                        </div>
                    `);
                }
            }
        }
    } catch (err) { console.error(err); }
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
