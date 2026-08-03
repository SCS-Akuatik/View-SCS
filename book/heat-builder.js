import { supabaseClient } from './supabase.js';

let currentEventId = null;
let currentHeatsData = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cek Sesi
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) {
        window.location.href = '/auth.html';
        return;
    }

    // 2. Ambil ID Event dari URL
    const urlParams = new URLSearchParams(window.location.search);
    currentEventId = urlParams.get('id');

    if (!currentEventId) {
        alert("ID Event tidak ditemukan!");
        return;
    }

    // Set tombol back
    document.getElementById('btnBack').href = `/event-dashboard.html?id=${currentEventId}`;

    // 3. Tarik Daftar Event Number (Nomor Lomba) yang ada di tabel event_heats
    await loadEventNumbers();

    // 4. Trigger Load Button
    document.getElementById('btnLoadHeat').addEventListener('click', renderDynamicHeats);

    // 5. Trigger Add Heat Button
    document.getElementById('btnAddHeat').addEventListener('click', addNewHeatContainer);

    // 6. Trigger Save Button
    document.getElementById('btnSaveFormasi').addEventListener('click', saveFormasiToSupabase);

    // 7. Init Sortable buat Gudang Kosong & Gudang Atlet
    initSortable(document.getElementById('gudangKosong'));
    initSortable(document.getElementById('gudangAtlet'));
});

// ==========================================
// FUNGSI UTAMA
// ==========================================

async function loadEventNumbers() {
    const selectEl = document.getElementById('selectEventNumber');
    selectEl.innerHTML = '<option value="">Sedang memuat...</option>';

    try {
        const { data, error } = await supabaseClient
            .from('event_heats')
            .select('event_number')
            .eq('event_id', currentEventId);

        if (error) throw error;

        // Ambil nama lomba yang unik
        const uniqueEvents = [...new Set(data.map(item => item.event_number))];
        
        if(uniqueEvents.length === 0) {
            selectEl.innerHTML = '<option value="">Belum ada Heat di-generate</option>';
            return;
        }

        selectEl.innerHTML = '<option value="">-- Pilih Lomba --</option>';
        uniqueEvents.forEach(evName => {
            selectEl.innerHTML += `<option value="${evName}">${evName}</option>`;
        });

    } catch (err) {
        alert("Gagal memuat daftar lomba.");
    }
}

async function renderDynamicHeats() {
    const selectedEvent = document.getElementById('selectEventNumber').value;
    const maxLanes = parseInt(document.getElementById('inputMaxLanes').value) || 8;
    const container = document.getElementById('heatContainerMain');
    const loading = document.getElementById('loadingState');

    if (!selectedEvent) {
        alert("Pilih nomor lomba dulu, Bos!");
        return;
    }

    loading.classList.remove('hidden');
    container.innerHTML = '';

    try {
        // Tarik Heat untuk lomba ini
        const { data, error } = await supabaseClient
            .from('event_heats')
            .select('*')
            .eq('event_id', currentEventId)
            .eq('event_number', selectedEvent)
            .order('heat_number', { ascending: true });

        if (error) throw error;
        currentHeatsData = data;

        if(data.length === 0) {
            container.innerHTML = `<p class="text-slate-500 p-5">Belum ada heat untuk lomba ini.</p>`;
            loading.classList.add('hidden');
            return;
        }

        let html = '';
        data.forEach(heat => {
            html += generateHeatHTML(heat.id, heat.heat_number, heat.lanes_data, maxLanes);
        });

        container.innerHTML = html;

        // Aktifkan SortableJS untuk semua Ember Heat yang baru dirender
        document.querySelectorAll('.heat-sortable-list').forEach(el => {
            initSortable(el);
        });

        // Recalculate label L1, L2 pertama kali
        recalculateLanes();

    } catch (err) {
        alert("Gagal memuat isi Heat.");
    } finally {
        loading.classList.add('hidden');
    }
}

function generateHeatHTML(dbId, heatNum, lanesDataArr, maxLanes) {
    let listHTML = '';
    
    // Sort array asli by lane (jaga-jaga)
    lanesDataArr.sort((a, b) => a.lane - b.lane);

    // Kita bikin slot sebanyak maxLanes (Contoh 8 atau 10)
    for (let i = 1; i <= maxLanes; i++) {
        let athlete = lanesDataArr.find(a => a.lane == i);

        if (athlete) {
            // Render Atlet
            let st = athlete.seed_time ? athlete.seed_time : 'NT';
            let stClass = athlete.seed_time ? 'text-indigo-600 bg-indigo-50 border-indigo-200' : 'text-slate-400 bg-white border-slate-200';

            listHTML += `
            <div class="item bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between cursor-move hover:border-indigo-400 hover:shadow-md transition-all mb-2" 
                 data-f1="${athlete.f1_id}" 
                 data-name="${athlete.name}" 
                 data-club="${athlete.club}" 
                 data-time="${athlete.seed_time || ''}">
                <div class="flex items-center gap-3 w-full">
                    <div class="text-slate-300 font-black cursor-grab">⣿</div>
                    <!-- Label L1, L2 ini yang akan diupdate dinamis -->
                    <span class="lane-label w-7 h-7 shrink-0 bg-slate-800 text-white rounded-lg flex items-center justify-center text-[10px] font-black font-mono">L${i}</span>
                    <div class="overflow-hidden">
                        <p class="text-xs md:text-sm font-bold text-slate-800 uppercase truncate">${athlete.name}</p>
                        <p class="text-[9px] font-bold text-slate-400 uppercase truncate">${athlete.club}</p>
                    </div>
                </div>
                <span class="text-[10px] font-mono font-bold px-2 py-1 rounded border shrink-0 ml-2 ${stClass}">${st}</span>
            </div>`;
        } else {
            // Render Blok Kosong
            listHTML += `
            <div class="item border border-dashed border-slate-300 bg-slate-50/50 rounded-xl p-3 flex items-center gap-3 cursor-move mb-2" data-f1="EMPTY">
                <div class="text-slate-300 font-black cursor-grab">⣿</div>
                <span class="lane-label w-7 h-7 shrink-0 bg-slate-300 text-slate-500 rounded-lg flex items-center justify-center text-[10px] font-black font-mono">L${i}</span>
                <span class="text-xs font-bold text-slate-400 italic">[ LINTASAN KOSONG ]</span>
            </div>`;
        }
    }

    return `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 relative" data-db-id="${dbId}">
        <div class="absolute -top-3 -left-3 w-8 h-8 bg-amber-400 text-white rounded-full flex items-center justify-center font-black text-sm border-2 border-white shadow-sm">${heatNum}</div>
        <h3 class="text-sm font-black text-slate-700 border-b border-slate-100 pb-2 mb-3 pl-6 uppercase tracking-widest">Ember Heat ${heatNum}</h3>
        <div class="heat-sortable-list min-h-[100px]" data-heat-number="${heatNum}">
            ${listHTML}
        </div>
    </div>`;
}

// ==========================================
// OTAK MAGIC: SORTABLE & AUTO-LANE
// ==========================================

function initSortable(element) {
    if (!element) return;
    Sortable.create(element, {
        group: 'shared-heats', // Kunci biar bisa lompat antar ember!
        animation: 200,
        ghostClass: 'ghost-drop', // Style pas di-drag
        delay: 150, // Delay HP
        delayOnTouchOnly: true,
        onEnd: function () {
            // Begitu dilepas, langsung itung ulang nomor Lane L1, L2 nya!
            recalculateLanes();
            
            // Refill Gudang Kosong biar gak kehabisan
            refillGudangKosong();
        }
    });
}

function recalculateLanes() {
    // Cari semua Ember Heat
    const allHeats = document.querySelectorAll('.heat-sortable-list');
    
    allHeats.forEach(heatList => {
        // Ambil semua item (atlet/kosong) yang ada di dalam ember ini
        const items = heatList.querySelectorAll('.item');
        
        // Loop dan ubah teks L1, L2, L3 sesuai index posisinya dari atas ke bawah!
        items.forEach((item, index) => {
            const label = item.querySelector('.lane-label');
            if (label) {
                label.innerText = `L${index + 1}`;
            }
        });
    });
}

function refillGudangKosong() {
    const gudang = document.getElementById('gudangKosong');
    if (gudang.children.length < 2) {
        gudang.innerHTML += `
        <div class="item border border-slate-200 bg-slate-100 rounded-xl p-3 flex items-center gap-3 cursor-move" data-f1="EMPTY">
            <div class="text-slate-300 font-black">⣿</div>
            <span class="text-xs font-bold text-slate-400">[ LINTASAN KOSONG ]</span>
        </div>`;
    }
}

// Tambah Heat Manual (Kalau tiba-tiba butuh Heat tambahan di lapangan)
function addNewHeatContainer() {
    const container = document.getElementById('heatContainerMain');
    const allHeats = document.querySelectorAll('.heat-sortable-list');
    const newHeatNum = allHeats.length + 1;
    const maxLanes = parseInt(document.getElementById('inputMaxLanes').value) || 8;
    
    // Bikin DB ID dummy biar pas disave tau ini heat baru
    const html = generateHeatHTML('NEW', newHeatNum, [], maxLanes); 
    container.insertAdjacentHTML('beforeend', html);
    
    const newList = container.lastElementChild.querySelector('.heat-sortable-list');
    initSortable(newList);
    recalculateLanes();
}

// ==========================================
// SIMPAN KE SUPABASE (UPDATE JSONB)
// ==========================================
async function saveFormasiToSupabase() {
    const btn = document.getElementById('btnSaveFormasi');
    const selectedEvent = document.getElementById('selectEventNumber').value;
    
    if (!selectedEvent) return alert("Belum ada data yang di-load.");
    if (!confirm("Yakin ingin menimpa formasi heat untuk lomba ini?")) return;

    btn.innerHTML = 'Menyimpan... ⏳';
    btn.disabled = true;

    try {
        const heatContainers = document.querySelectorAll('#heatContainerMain > div[data-db-id]');
        
        for (let i = 0; i < heatContainers.length; i++) {
            const container = heatContainers[i];
            const dbId = container.getAttribute('data-db-id');
            const heatNum = container.querySelector('.heat-sortable-list').getAttribute('data-heat-number');
            
            let newLanesData = [];
            
            // Loop setiap item di dalam ember
            const items = container.querySelectorAll('.item');
            items.forEach((item, index) => {
                let f1Id = item.getAttribute('data-f1');
                
                // Kalau bukan KOSONG, masukin ke array JSONB
                if (f1Id && f1Id !== 'EMPTY') {
                    newLanesData.push({
                        lane: index + 1, // Kunci utama: Index array + 1 jadi Lane!
                        f1_id: f1Id,
                        name: item.getAttribute('data-name'),
                        club: item.getAttribute('data-club'),
                        seed_time: item.getAttribute('data-time') || null
                    });
                }
            });

            // Tembak Update ke Supabase per Heat
            if (dbId !== 'NEW') {
                const { error } = await supabaseClient
                    .from('event_heats')
                    .update({ lanes_data: newLanesData })
                    .eq('id', dbId);
                if (error) throw error;
            } else {
                // Kalau Heat Tambahan (Insert Baru)
                const { error } = await supabaseClient
                    .from('event_heats')
                    .insert([{
                        event_id: currentEventId,
                        event_number: selectedEvent,
                        heat_number: heatNum,
                        lanes_data: newLanesData
                    }]);
                if (error) throw error;
            }
        }

        alert("🔥 BOOM! Formasi Heat Baru Berhasil Dikunci! Siap Cetak Buku Acara!");
        
    } catch (err) {
        alert("Gagal menyimpan formasi: " + err.message);
    } finally {
        btn.innerHTML = '<span>💾</span> Simpan Formasi';
        btn.disabled = false;
    }
}
