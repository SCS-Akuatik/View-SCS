import { supabaseClient } from './supabase.js';

// ==========================================
// STATE & DOM ELEMENTS
// ==========================================
let currentEventId = 'TRIAL-001'; // Default ID sementara, idealnya ditarik dari URL Parameter
let autoRefreshTimer;
let countdownInterval;
let secondsLeft = 30;

const headerEventName = document.getElementById('headerEventName');
const partnerWrapper = document.getElementById('partnerWrapper');
const selectEvent = document.getElementById('selectEvent');
const btnShowAll = document.getElementById('btnShowAll');
const resultContainer = document.getElementById('resultContainer');
const btnRefresh = document.getElementById('btnRefresh');
const countdownText = document.getElementById('countdownText');
const refreshProgressBar = document.getElementById('refreshProgressBar');

document.addEventListener('DOMContentLoaded', () => {
    // Tangkap URL param misal: ?event_id=EVT-123
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('event_id')) {
        currentEventId = urlParams.get('event_id');
    }

    initApp();

    // Event Listeners
    selectEvent.addEventListener('change', fetchAndRenderResults);
    btnShowAll.addEventListener('click', () => {
        selectEvent.value = "";
        fetchAndRenderResults();
    });
    btnRefresh.addEventListener('click', manualRefresh);
});

async function initApp() {
    await fetchEventHeaderAndSponsors();
    await fetchEventList();
    await fetchAndRenderResults();
    startAutoRefresh();
}

// ==========================================
// 1. TOP BANNER & HEADER (EVENT SPONSORS)
// ==========================================
async function fetchEventHeaderAndSponsors() {
    try {
        // Ambil Nama Event
        const { data: eventData } = await supabaseClient
            .from('events')
            .select('*')
            .eq('id', currentEventId)
            .single();

        if (eventData) {
            headerEventName.innerText = eventData.name || "Live Result";
        }

        // Ambil Sponsor Utama Event
        const { data: sponsors } = await supabaseClient
            .from('event_sponsors')
            .select('name, logo_url')
            .eq('event_id', currentEventId);

        if (sponsors && sponsors.length > 0) {
            renderTopSponsors(sponsors);
        }
    } catch (error) {
        console.error("Error fetching header:", error);
    }
}

// STANDARD RENDERING BARU (Anti Pecah, Anti Melar, Anti Gagal)
function renderTopSponsors(sponsors) {
    if (!sponsors || sponsors.length === 0) return;
    
    let html = `
    <div class="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 text-center mb-6">
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">This Event Supported By:</p>
        <div class="flex flex-wrap justify-center items-center gap-4 md:gap-6">
    `;
    
    sponsors.forEach(sponsor => {
        // ATURAN BOS: Bg Putih, Aspect Ratio 16:9, Object-Fit Contain, Error Fallback
        html += `
            <div class="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex items-center justify-center shrink-0 transition-transform hover:scale-105" style="aspect-ratio: 16/9; width: 120px; max-width: 100%;">
                <img
                    src="${sponsor.logo_url}"
                    srcset="${sponsor.logo_url} 1x"
                    alt="${sponsor.name}"
                    class="w-full h-full object-contain"
                    loading="lazy"
                    onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'text-xs font-black text-slate-400 text-center uppercase\\'>${sponsor.name}</span>';"
                >
            </div>
        `;
    });
    
    html += `</div></div>`;
    partnerWrapper.innerHTML = html;
}

// ==========================================
// 2. DROPDOWN LOMBA (NOMOR EVENT)
// ==========================================
async function fetchEventList() {
    try {
        const { data, error } = await supabaseClient
            .from('event_heats')
            .select('race_number, race_name')
            .eq('event_id', currentEventId);
        
        if (error) throw error;

        // Hilangkan duplikat race_number
        const uniqueRaces = Array.from(new Set(data.map(a => a.race_number)))
            .map(race_number => {
                return data.find(a => a.race_number === race_number)
            }).sort((a,b) => a.race_number - b.race_number);

        let options = '<option value="">-- Pilih Nomor Lomba --</option>';
        uniqueRaces.forEach(race => {
            options += `<option value="${race.race_number}">Event #${race.race_number}: ${race.race_name}</option>`;
        });
        
        selectEvent.innerHTML = options;
    } catch (error) {
        console.error("Error fetching races:", error);
        selectEvent.innerHTML = '<option value="">Gagal memuat lomba</option>';
    }
}

// ==========================================
// 3. RENDER HASIL HEAT & SPONSOR SPESIFIK
// ==========================================
async function fetchAndRenderResults() {
    const selectedRace = selectEvent.value;
    resultContainer.innerHTML = '<div class="text-center py-10"><span class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin inline-block"></span><p class="text-xs font-bold text-slate-400 mt-3">Mengambil data live...</p></div>';

    try {
        let query = supabaseClient
            .from('event_heats')
            .select(`
                id, race_number, race_name, heat_number, total_heats, sponsor_name, sponsor_logo,
                race_results ( lane, athlete_name, club_name, time, rank )
            `)
            .eq('event_id', currentEventId)
            .order('race_number', { ascending: true })
            .order('heat_number', { ascending: true });

        if (selectedRace) {
            query = query.eq('race_number', selectedRace);
        }

        const { data: heats, error } = await query;
        
        if (error) throw error;
        if (!heats || heats.length === 0) {
            resultContainer.innerHTML = '<div class="text-center py-10 opacity-50"><div class="text-4xl mb-3">📭</div><h3 class="text-sm font-bold text-slate-600">Belum ada hasil pertandingan.</h3></div>';
            return;
        }

        renderHeats(heats);
    } catch (error) {
        console.error("Error fetching results:", error);
        resultContainer.innerHTML = '<div class="text-center text-red-500 font-bold py-10">Gagal memuat data.</div>';
    }
}

function renderHeats(heats) {
    let html = '';
    heats.forEach(heat => {
        
        // --- HEADER SPONSOR (ANTI-MELAR) ---
        let sponsorHtml = '';
        if (heat.sponsor_name && heat.sponsor_logo) {
            sponsorHtml = `
            <div class="bg-slate-50 border-b border-slate-100 p-3 flex justify-between items-center rounded-t-2xl">
                <div>
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Supported By:</p>
                    <p class="text-xs font-bold text-blue-900">${heat.sponsor_name}</p>
                </div>
                <!-- ATURAN BOS: Bg Putih, Aspect Ratio Fixed 16:9, Object-Fit Contain -->
                <div class="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-center shrink-0 transition-transform hover:scale-105" style="aspect-ratio: 16/9; width: 64px;">
                    <img
                        src="${heat.sponsor_logo}"
                        srcset="${heat.sponsor_logo} 1x"
                        alt="${heat.sponsor_name}"
                        class="w-full h-full object-contain"
                        loading="lazy"
                        onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'text-[8px] font-bold text-slate-400 text-center leading-tight uppercase\\'>${heat.sponsor_name}</span>';"
                    >
                </div>
            </div>
            `;
        }

        // --- ROWS ATLET ---
        const athletes = heat.race_results ? heat.race_results.sort((a,b) => a.lane - b.lane) : [];
        let athletesHtml = '';
        
        athletes.forEach(atl => {
            const isNT = !atl.time || atl.time === 'NT' || atl.time === '';
            const timeColor = isNT ? 'text-slate-400' : 'text-emerald-500 font-mono';
            
            athletesHtml += `
            <div class="flex items-center gap-4 p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 font-black text-sm flex items-center justify-center shrink-0 border border-slate-200">${atl.lane}</div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-black text-slate-800 truncate uppercase">${atl.athlete_name}</p>
                    <p class="text-[10px] text-slate-400 font-bold truncate uppercase">${atl.club_name}</p>
                </div>
                <div class="text-right shrink-0">
                    <p class="text-sm font-bold ${timeColor}">${atl.time || 'NT'}</p>
                </div>
            </div>
            `;
        });

        // --- BUILD HEAT CARD ---
        html += `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            ${sponsorHtml}
            <div class="p-4 border-b border-slate-100 bg-white">
                <h2 class="text-sm font-black text-slate-800 uppercase leading-tight">EVENT #${heat.race_number}: ${heat.race_name}</h2>
                <p class="text-[10px] text-slate-400 font-bold tracking-wider uppercase mt-1">HEAT ${heat.heat_number} <span class="mx-1">|</span> DARI ${heat.total_heats}</p>
            </div>
            <div class="p-4 bg-white">
                <div class="flex text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-2 px-3">
                    <div class="w-8 shrink-0 text-center">LN</div>
                    <div class="flex-1 px-4">ATLET & KLUB</div>
                    <div class="text-right w-16 shrink-0">WAKTU</div>
                </div>
                <div class="flex flex-col">
                    ${athletesHtml}
                </div>
            </div>
        </div>
        `;
    });

    resultContainer.innerHTML = html;
}

// ==========================================
// 4. SISTEM REFRESH OTOMATIS
// ==========================================
function startAutoRefresh() {
    clearInterval(autoRefreshTimer);
    clearInterval(countdownInterval);
    
    secondsLeft = 30;
    countdownText.innerText = `${secondsLeft}s`;
    refreshProgressBar.style.width = '100%';

    countdownInterval = setInterval(() => {
        secondsLeft--;
        countdownText.innerText = `${secondsLeft}s`;
        refreshProgressBar.style.width = `${(secondsLeft / 30) * 100}%`;

        if (secondsLeft <= 0) {
            manualRefresh();
        }
    }, 1000);
}

function manualRefresh() {
    const icon = document.getElementById('iconRefresh');
    icon.classList.add('spin-anim');
    
    fetchAndRenderResults().then(() => {
        icon.classList.remove('spin-anim');
        startAutoRefresh();
    });
}
