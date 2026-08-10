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
    await fetchSponsors(); 
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

async function fetchSponsors() {
    const wrapper = document.getElementById('partnerWrapper');
    if (!wrapper) return;

    try {
        const { data: linkData, error: linkErr } = await supabaseClient
            .from('event_sponsors')
            .select('sponsor_ids')
            .eq('event_id', currentEventId)
            .single();

        if (linkErr || !linkData || !linkData.sponsor_ids || linkData.sponsor_ids.length === 0) return;

        const { data: sponsors, error: spErr } = await supabaseClient
            .from('master_sponsors')
            .select('*')
            .in('id', linkData.sponsor_ids);

        if (spErr || !sponsors || sponsors.length === 0) return;

        // UI Sponsor: Comfort View, No Border, Floating Look
        let html = `
            <div class="w-full mb-5 flex flex-col items-center justify-center">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">This event supported by:</span>
                <div class="flex items-center justify-center gap-4 md:gap-6 flex-wrap w-full max-w-sm mx-auto">
        `;

        // Atur dimensi beda kalau cuma 1 sponsor (biar agak manjang/besar) atau >1 sponsor
        const imgClass = sponsors.length === 1 
            ? "h-10 md:h-12 w-auto max-w-[200px] object-contain opacity-90 hover:opacity-100 transition-opacity" 
            : "h-8 md:h-9 w-auto max-w-[120px] object-contain opacity-80 hover:opacity-100 transition-opacity";

        sponsors.forEach(sp => {
            const logo = sp.logo_url || '/images/logo.png';
            const link = sp.link_url || '#';
            html += `
                <a href="${link}" target="_blank" rel="noopener noreferrer" class="block">
                    <img src="${logo}" alt="${sp.sponsor_name}" title="${sp.sponsor_name}" class="${imgClass}">
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

        // Header Tabel Heat (Kecil & Rapi)
        lanesHtml += `
            <div class="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mb-2 px-1">
                <div class="w-8 text-center">LN</div>
                <div class="flex-1 pl-2">ATLET & KLUB</div>
                <div class="w-20 text-right pr-1">WAKTU</div>
            </div>
        `;

        heat.lanes_data.forEach(atlet => {
            if (!atlet.nama) return; 

            let timeDisplay = atlet.waktu_tempuh || 'NT';
            let timeColorClass = "text-slate-400"; 
            
            if (timeDisplay !== 'NT' && timeDisplay !== 'DQ') {
                timeColorClass = "text-emerald-600"; 
            } else if (timeDisplay === 'DQ') {
                timeColorClass = "text-red-500"; 
            }

            // ROW 1 BARIS: Lane | Nama - Klub | Waktu
            lanesHtml += `
            <div class="flex items-center py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors px-1">
                
                <!-- Nomor Lintasan (Lane) -->
                <div class="w-8 flex justify-center shrink-0">
                    <div class="w-5 h-5 rounded bg-slate-200 text-slate-600 text-[10px] font-black flex items-center justify-center">${atlet.lane}</div>
                </div>
                
                <!-- Nama & Klub (Gabung 1 baris di layar lebar, numpuk rapi di HP) -->
                <div class="flex-1 pl-2 flex flex-col sm:flex-row sm:items-center min-w-0">
                    <p class="text-xs font-black text-slate-800 uppercase truncate mr-2">${atlet.nama}</p>
                    <p class="text-[9px] font-bold text-slate-400 uppercase truncate sm:border-l sm:border-slate-300 sm:pl-2 mt-0.5 sm:mt-0">${atlet.klub}</p>
                </div>
                
                <!-- Waktu -->
                <div class="w-20 shrink-0 text-right pr-1">
                    <span class="font-mono text-xs font-black tracking-wider ${timeColorClass}">
                        ${timeDisplay}
                    </span>
                </div>

            </div>`;
        });

        if (heat.lanes_data.length === 0 || !heat.lanes_data.some(a => a.nama)) {
            lanesHtml += `<p class="text-[10px] text-slate-400 italic text-center py-3">Tidak ada data atlet di Heat ini.</p>`;
        }

        htmlContent += `
        <div class="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-200 mb-4 overflow-hidden relative">
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-slate-300"></div>
            <div class="pl-2 mb-3">
                <h3 class="text-xs font-black text-slate-800 uppercase leading-tight">Event #${heat.event_number}: ${heat.nomor_lomba} - ${heat.gender}</h3>
                <p class="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">HEAT ${heat.heat_number} <span class="text-slate-300 mx-1">|</span> Dari ${heat.total_heats}</p>
            </div>
            <div class="bg-slate-50/50 rounded-lg p-2 border border-slate-100">
                ${lanesHtml}
            </div>
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
