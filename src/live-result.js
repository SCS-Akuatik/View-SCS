import { supabaseClient } from './supabase.js';

let currentEventId = null;
let allHeats = []; 
let currentEventHeats = []; 

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session }, error: authError } = await supabaseClient.auth.getSession();
    if (authError || !session) {
        alert("⚠️ Akses Ditolak! Anda belum login.");
        window.location.replace('/auth.html');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    currentEventId = urlParams.get('id');
    if (!currentEventId) return alert("ID Event tidak ditemukan!");
    await loadDataHeats();
});

async function loadDataHeats() {
    try {
        const { data, error } = await supabaseClient
            .from('event_heats')
            .select('*')
            .eq('event_id', currentEventId)
            .order('event_number', { ascending: true })
            .order('heat_number', { ascending: true });

        if (error) throw error;
        allHeats = data || [];
        populateEventDropdown();
    } catch (err) {
        console.error(err);
        alert("Gagal memuat data Start List.");
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
        renderAllHeats(e.target.value);
    });

    document.getElementById('btnShowAll').addEventListener('click', () => {
        selectEvent.value = ""; 
        renderAllHeats('ALL');
    });
}

function renderAllHeats(eventNumber) {
    const container = document.getElementById('allHeatsContainer');
    if (!eventNumber) {
        container.classList.add('hidden');
        return;
    }

    currentEventHeats = eventNumber === 'ALL' ? allHeats : allHeats.filter(h => h.event_number == eventNumber);
    container.innerHTML = ''; 

    currentEventHeats.forEach((heat, heatIndex) => {
        let lanesHtml = '';

        heat.lanes_data.forEach((atlet, laneIndex) => {
            if (!atlet.nama) {
                lanesHtml += `
                <div class="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-200 opacity-50">
                    <div class="w-8 h-8 rounded bg-slate-200 text-slate-500 font-bold flex items-center justify-center shrink-0">${atlet.lane}</div>
                    <div class="flex-1"><p class="text-sm font-bold text-slate-400 italic">--- Kosong ---</p></div>
                </div>`;
                return;
            }

            let mm = '', ss = '', ms = '';
            
            // LOGIKA BARU: Tampilkan DQ aja. Kalau NT biarkan kotaknya kosong biar gampang diketik
            if (atlet.waktu_tempuh) {
                if (atlet.waktu_tempuh === 'DQ') {
                    mm = 'DQ';
                } else if (atlet.waktu_tempuh !== 'NT') {
                    const parts = atlet.waktu_tempuh.split(/[:.]/);
                    if(parts.length === 3) { mm = parts[0]; ss = parts[1]; ms = parts[2]; }
                }
            }

            lanesHtml += `
            <div class="flex flex-col md:flex-row md:items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-red-300 transition-colors">
                <div class="flex items-center gap-3 flex-1">
                    <div class="w-8 h-8 rounded bg-slate-800 text-white font-bold flex items-center justify-center shrink-0">${atlet.lane}</div>
                    <div>
                        <p class="text-sm font-black text-slate-900 leading-tight uppercase">${atlet.nama}</p>
                        <p class="text-[10px] font-bold text-slate-500 uppercase">${atlet.klub}</p>
                    </div>
                </div>
                
                <div class="flex items-center gap-1 shrink-0 mt-2 md:mt-0">
                    <input type="text" inputmode="numeric" maxlength="2" id="min_${heatIndex}_${laneIndex}" value="${mm}" placeholder="00" class="w-12 text-center py-2 bg-slate-100 border border-slate-300 rounded focus:ring-2 focus:ring-red-500 font-mono text-sm font-bold outline-none input-waktu">
                    <span class="font-black text-slate-400">:</span>
                    <input type="text" inputmode="numeric" maxlength="2" id="sec_${heatIndex}_${laneIndex}" value="${ss}" placeholder="00" class="w-12 text-center py-2 bg-slate-100 border border-slate-300 rounded focus:ring-2 focus:ring-red-500 font-mono text-sm font-bold outline-none input-waktu">
                    <span class="font-black text-slate-400">.</span>
                    <input type="text" inputmode="numeric" maxlength="2" id="ms_${heatIndex}_${laneIndex}" value="${ms}" placeholder="00" class="w-12 text-center py-2 bg-slate-100 border border-slate-300 rounded focus:ring-2 focus:ring-red-500 font-mono text-sm font-bold outline-none input-waktu">
                    
                    <button onclick="setDQ(${heatIndex}, ${laneIndex})" class="ml-2 px-2 py-2 bg-red-100 text-red-600 rounded text-xs font-bold hover:bg-red-200 transition-colors">DQ</button>
                </div>
            </div>`;
        });

        container.innerHTML += `
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div class="flex justify-between items-end mb-4 border-b border-slate-200 pb-4">
                <div>
                    <h2 class="text-lg font-black text-slate-900 uppercase">Event #${heat.event_number}: ${heat.nomor_lomba} - ${heat.gender}</h2>
                    <p class="text-sm font-bold text-red-600 mt-1">HEAT ${heat.heat_number} (Dari ${heat.total_heats})</p>
                </div>
            </div>
            <div class="space-y-3 mb-4">
                ${lanesHtml}
            </div>
            <button id="btnSubmit_${heatIndex}" onclick="submitHeatData(${heatIndex}, '${heat.id}')" class="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm py-3 rounded-xl shadow transition-transform active:scale-95 flex items-center justify-center gap-2">
                💾 Simpan Waktu Heat ${heat.heat_number}
            </button>
        </div>`;
    });

    container.classList.remove('hidden');
    setupAutoFocus();
}

function setupAutoFocus() {
    document.querySelectorAll('.input-waktu').forEach(input => {
        input.addEventListener('input', function() {
            if (this.value.length >= 2 && this.value.toUpperCase() !== 'DQ') {
                let next = this.nextElementSibling;
                while (next && next.tagName !== 'INPUT') next = next.nextElementSibling;
                if (next) next.focus();
            }
        });
    });
}

window.setDQ = function(heatIndex, laneIndex) {
    document.getElementById(`min_${heatIndex}_${laneIndex}`).value = 'DQ';
    document.getElementById(`sec_${heatIndex}_${laneIndex}`).value = '';
    document.getElementById(`ms_${heatIndex}_${laneIndex}`).value = '';
}

window.submitHeatData = async function(heatIndex, heatDatabaseId) {
    const btn = document.getElementById(`btnSubmit_${heatIndex}`);
    const originalText = btn.innerHTML;
    btn.innerText = "⏳ Menyimpan...";
    btn.disabled = true;

    let targetHeat = currentEventHeats[heatIndex];
    let updatedLanes = [...targetHeat.lanes_data];

    updatedLanes.forEach((atlet, laneIndex) => {
        if (!atlet.nama) return; 

        let minEl = document.getElementById(`min_${heatIndex}_${laneIndex}`);
        let secEl = document.getElementById(`sec_${heatIndex}_${laneIndex}`);
        let msEl = document.getElementById(`ms_${heatIndex}_${laneIndex}`);

        let rawMin = minEl.value.trim().toUpperCase();
        let rawSec = secEl.value.trim();
        let rawMs = msEl.value.trim();

        // Cek apakah semua kotak bener-bener kosong
        let isAllEmpty = (rawMin === '' && rawSec === '' && rawMs === '');

        if (rawMin === 'DQ') {
            atlet.waktu_tempuh = 'DQ';
        } else if (rawMin === 'NT' || isAllEmpty) {
            atlet.waktu_tempuh = 'NT'; 
        } else {
            // LOGIKA BARU: Kalau kosong, otomatis diubah jadi '00'
            let min = rawMin === '' ? '00' : rawMin.padStart(2, '0');
            let sec = rawSec === '' ? '00' : rawSec.padStart(2, '0');
            let ms = rawMs === '' ? '00' : rawMs.padStart(2, '0');
            atlet.waktu_tempuh = `${min}:${sec}.${ms}`;
        }
    });

    try {
        const { data, error } = await supabaseClient
            .from('event_heats')
            .update({ lanes_data: updatedLanes })
            .eq('id', heatDatabaseId)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Gagal menyimpan! Anda tidak memiliki Hak Akses (RLS).");

        targetHeat.lanes_data = updatedLanes;
        btn.classList.replace('bg-slate-800', 'bg-green-600');
        btn.innerText = "✅ Tersimpan!";
        setTimeout(() => {
            btn.classList.replace('bg-green-600', 'bg-slate-800');
            btn.innerHTML = originalText;
        }, 2000);
        
    } catch (err) {
        console.error(err);
        alert(err.message || "Gagal menyimpan waktu!");
    } finally {
        btn.disabled = false;
    }
}
