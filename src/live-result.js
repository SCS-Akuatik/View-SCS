import { supabaseClient } from './supabase.js';

let currentEventId = null;
let allHeats = []; // Menyimpan semua data dari event_heats
let currentSelectedHeat = null;

document.addEventListener('DOMContentLoaded', async () => {
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
        alert("Gagal memuat data Start List dari Database.");
    }
}

function populateEventDropdown() {
    const selectEvent = document.getElementById('selectEvent');
    selectEvent.innerHTML = '<option value="">-- Pilih Nomor Lomba --</option>';

    // Ekstrak event_number unik
    const uniqueEvents = [...new Map(allHeats.map(item => [item.event_number, item])).values()];

    uniqueEvents.forEach(ev => {
        let label = `Event #${ev.event_number}: ${ev.nomor_lomba} - ${ev.gender} - ${ev.kelompok_umur}`;
        selectEvent.innerHTML += `<option value="${ev.event_number}">${label}</option>`;
    });

    selectEvent.addEventListener('change', (e) => {
        populateHeatDropdown(e.target.value);
    });
}

function populateHeatDropdown(eventNumber) {
    const selectHeat = document.getElementById('selectHeat');
    
    if (!eventNumber) {
        selectHeat.innerHTML = '<option value="">Pilih Lomba Terlebih Dahulu</option>';
        selectHeat.disabled = true;
        document.getElementById('formContainer').classList.add('hidden');
        return;
    }

    selectHeat.disabled = false;
    selectHeat.innerHTML = '<option value="">-- Pilih Heat --</option>';

    const heatsForEvent = allHeats.filter(h => h.event_number == eventNumber);
    heatsForEvent.forEach(h => {
        selectHeat.innerHTML += `<option value="${h.id}">Heat ${h.heat_number} of ${h.total_heats}</option>`;
    });

    selectHeat.addEventListener('change', (e) => {
        renderInputForm(e.target.value);
    });
}

function renderInputForm(heatId) {
    const container = document.getElementById('formContainer');
    const lanesContainer = document.getElementById('lanesContainer');

    if (!heatId) {
        container.classList.add('hidden');
        return;
    }

    currentSelectedHeat = allHeats.find(h => h.id == heatId);
    
    document.getElementById('judulLomba').innerText = `Event #${currentSelectedHeat.event_number}: ${currentSelectedHeat.nomor_lomba} - ${currentSelectedHeat.gender}`;
    document.getElementById('judulHeat').innerText = `HEAT ${currentSelectedHeat.heat_number} (Dari ${currentSelectedHeat.total_heats})`;
    
    lanesContainer.innerHTML = '';

    // Render kotak input per lintasan dari JSONB
    currentSelectedHeat.lanes_data.forEach((atlet, index) => {
        if (!atlet.nama) {
            // Lintasan Kosong
            lanesContainer.innerHTML += `
            <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 opacity-50">
                <div class="w-8 h-8 rounded bg-slate-200 text-slate-500 font-bold flex items-center justify-center shrink-0">${atlet.lane}</div>
                <div class="flex-1"><p class="text-sm font-bold text-slate-400 italic">--- Kosong ---</p></div>
            </div>`;
            return;
        }

        // Pecah waktu jika sudah pernah diinput sebelumnya (format mm:ss.ms)
        let mm = '', ss = '', ms = '';
        if (atlet.waktu_tempuh && atlet.waktu_tempuh !== 'NT' && atlet.waktu_tempuh !== 'DQ') {
            const parts = atlet.waktu_tempuh.split(/[:.]/); // Pisah by colon or dot
            if(parts.length === 3) {
                mm = parts[0]; ss = parts[1]; ms = parts[2];
            }
        }

        lanesContainer.innerHTML += `
        <div class="flex flex-col md:flex-row md:items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-red-300 transition-colors">
            <!-- Info Atlet -->
            <div class="flex items-center gap-3 flex-1">
                <div class="w-8 h-8 rounded bg-slate-800 text-white font-bold flex items-center justify-center shrink-0">${atlet.lane}</div>
                <div>
                    <p class="text-sm font-black text-slate-900 leading-tight uppercase">${atlet.nama}</p>
                    <p class="text-[10px] font-bold text-slate-500 uppercase">${atlet.klub}</p>
                </div>
            </div>
            
            <!-- Kotak Input Waktu (Min : Sec . MS) -->
            <div class="flex items-center gap-1 shrink-0 mt-2 md:mt-0">
                <input type="number" id="min_${index}" value="${mm}" placeholder="00" min="0" max="59" class="w-12 text-center py-2 bg-slate-100 border border-slate-300 rounded focus:ring-2 focus:ring-red-500 font-mono text-sm font-bold outline-none input-waktu">
                <span class="font-black text-slate-400">:</span>
                <input type="number" id="sec_${index}" value="${ss}" placeholder="00" min="0" max="59" class="w-12 text-center py-2 bg-slate-100 border border-slate-300 rounded focus:ring-2 focus:ring-red-500 font-mono text-sm font-bold outline-none input-waktu">
                <span class="font-black text-slate-400">.</span>
                <input type="number" id="ms_${index}" value="${ms}" placeholder="00" min="0" max="99" class="w-12 text-center py-2 bg-slate-100 border border-slate-300 rounded focus:ring-2 focus:ring-red-500 font-mono text-sm font-bold outline-none input-waktu">
                
                <!-- Tombol DQ (Diskualifikasi) opsional -->
                <button onclick="setDQ(${index})" class="ml-2 px-2 py-2 bg-red-100 text-red-600 rounded text-xs font-bold hover:bg-red-200">DQ</button>
            </div>
        </div>`;
    });

    container.classList.remove('hidden');

    // Auto-focus logic (Pindah kotak otomatis kalau udah 2 digit)
    document.querySelectorAll('.input-waktu').forEach(input => {
        input.addEventListener('input', function() {
            if (this.value.length >= 2) {
                let next = this.nextElementSibling;
                while (next && next.tagName !== 'INPUT') next = next.nextElementSibling;
                if (next) next.focus();
            }
        });
    });
}

// Fungsi tombol DQ (Diskualifikasi)
window.setDQ = function(index) {
    document.getElementById(`min_${index}`).value = 'DQ';
    document.getElementById(`sec_${index}`).value = '';
    document.getElementById(`ms_${index}`).value = '';
}

// ==========================================
// PROSES SUBMIT & SIMPAN WAKTU
// ==========================================
document.getElementById('btnSubmitWaktu').addEventListener('click', async () => {
    const btn = document.getElementById('btnSubmitWaktu');
    btn.innerText = "⏳ MENYIMPAN...";
    btn.disabled = true;

    // Duplikasi array JSONB lanes_data untuk diupdate
    let updatedLanes = [...currentSelectedHeat.lanes_data];

    updatedLanes.forEach((atlet, index) => {
        if (!atlet.nama) return; // Skip kosong

        let min = document.getElementById(`min_${index}`).value.padStart(2, '0');
        let sec = document.getElementById(`sec_${index}`).value.padStart(2, '0');
        let ms = document.getElementById(`ms_${index}`).value.padStart(2, '0');

        if (document.getElementById(`min_${index}`).value === 'DQ') {
            atlet.waktu_tempuh = 'DQ';
        } else if (document.getElementById(`min_${index}`).value !== '' && document.getElementById(`sec_${index}`).value !== '') {
            // Gabung jadi format waktu
            atlet.waktu_tempuh = `${min}:${sec}.${ms}`;
        } else {
            atlet.waktu_tempuh = 'NT'; // Belum diinput
        }
    });

    try {
        const { error } = await supabaseClient
            .from('event_heats')
            .update({ lanes_data: updatedLanes })
            .eq('id', currentSelectedHeat.id);

        if (error) throw error;

        // Update local memory
        currentSelectedHeat.lanes_data = updatedLanes;

        alert("✅ Hasil Heat berhasil disimpan! Live Result orang tua sudah terupdate.");
        
    } catch (err) {
        console.error(err);
        alert("Gagal menyimpan waktu!");
    } finally {
        btn.innerText = "💾 SUBMIT HASIL HEAT INI";
        btn.disabled = false;
    }
});
