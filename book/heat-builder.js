import { supabaseClient } from '../src/supabase.js';

let currentEventId = null;

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

    // 3. Trigger Load Button (BULK LOAD)
    document.getElementById('btnLoadHeat').addEventListener('click', renderAllDynamicHeats);

    // 4. Trigger Save Button (BULK SAVE)
    document.getElementById('btnSaveFormasi').addEventListener('click', saveSemuaFormasiToSupabase);

    // 5. Init Sortable buat Gudang Kosong & Gudang Atlet
    Sortable.create(document.getElementById('gudangKosong'), {
        group: { name: 'shared-heats', pull: 'clone', put: false },
        animation: 200,
        sort: false
    });

    Sortable.create(document.getElementById('gudangAtlet'), {
        group: { name: 'shared-heats', pull: true, put: true },
        animation: 200,
        ghostClass: 'ghost-drop'
    });
});

// ==========================================
// FUNGSI UTAMA: LOAD SEMUA DATA
// ==========================================
async function renderAllDynamicHeats() {
    const container = document.getElementById('heatContainerMain');
    const loading = document.getElementById('loadingState');

    loading.classList.remove('hidden');
    container.innerHTML = '';

    try {
        // Tarik SELURUH Heat untuk EVENT INI sekaligus!
        const { data, error } = await supabaseClient
            .from('event_heats')
            .select('*')
            .eq('event_id', currentEventId)
            .order('event_number', { ascending: true })
            .order('heat_number', { ascending: true });

        if (error) throw error;

        if(!data || data.length === 0) {
            container.innerHTML = `<p class="text-slate-500 p-5 text-center bg-white rounded-xl shadow-sm border border-slate-200">Belum ada heat yang di-generate. Silakan 'Simpan & Kunci Start List' dari halaman Buku Acara terlebih dahulu.</p>`;
            loading.classList.add('hidden');
            return;
        }

        // OTOMATIS DETEKSI MAX LINTASAN DARI DATABASE (TIDAK PERLU INPUT MANUAL)
        let autoMaxLanes = 8; // Default jaga-jaga
        if (data[0] && data[0].lanes_data) {
            autoMaxLanes = data[0].lanes_data.length; 
        }

        // Kelompokkan berdasarkan event_number (Nomor Lomba)
        const groupedByEvent = {};
        data.forEach(heat => {
            if(!groupedByEvent[heat.event_number]) {
                groupedByEvent[heat.event_number] = [];
            }
            groupedByEvent[heat.event_number].push(heat);
        });

        let html = '';
        
        // Loop setiap Kelompok Lomba
        Object.keys(groupedByEvent).forEach(eventNumber => {
            let heatsInEvent = groupedByEvent[eventNumber];
            
            // Render Header Lomba
            html += `
            <div class="event-group bg-slate-100 rounded-3xl p-4 md:p-6 border border-slate-200 shadow-inner">
                <div class="event-header bg-slate-900 text-white rounded-xl p-4 shadow-lg mb-6 flex justify-between items-center">
                    <div>
                        <h2 class="text-sm md:text-base font-black uppercase tracking-widest text-emerald-400">EVENT #${eventNumber}</h2>
                        <p class="text-xs md:text-sm font-bold text-slate-300 mt-1">${heatsInEvent[0].nomor_lomba} • ${heatsInEvent[0].gender} • ${heatsInEvent[0].kelompok_umur}</p>
                    </div>
                    <div class="text-right">
                        <span class="bg-slate-700 px-3 py-1 rounded-lg text-xs font-bold font-mono">${heatsInEvent.length} Heats</span>
                    </div>
                </div>
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
            `;

            // Render ember (Heats) di dalam lomba tersebut dengan Max Lintasan yang terdeteksi otomatis
            heatsInEvent.forEach(heat => {
                html += generateHeatHTML(heat.id, heat.heat_number, heat.lanes_data, autoMaxLanes);
            });

            html += `</div></div>`; // Tutup grid & event-group
        });

        container.innerHTML = html;

        // Aktifkan SortableJS untuk semua Ember Heat yang baru dirender
        document.querySelectorAll('.heat-sortable-list').forEach(el => {
            Sortable.create(el, {
                group: 'shared-heats', // Kunci universal, bisa drag kemana aja
                animation: 200,
                ghostClass: 'ghost-drop', 
                delay: 150, // Delay touch HP
                delayOnTouchOnly: true,
                onEnd: function () {
                    recalculateLanes(); // Recalculate setiap kali geser
                }
            });
        });

        // Hitung label L1, L2 pertama kali
        recalculateLanes();

    } catch (err) {
        alert("Gagal memuat formasi Heat: " + err.message);
    } finally {
        loading.classList.add('hidden');
    }
}

// ==========================================
// RENDER HTML EMBER HEAT
// ==========================================
function generateHeatHTML(dbId, heatNum, lanesDataArr, maxLanes) {
    let listHTML = '';
    
    // Pastikan terurut by lane asli
    lanesDataArr.sort((a, b) => a.lane - b.lane);

    // Bikin slot sebanyak maxLanes hasil deteksi otomatis
    for (let i = 1; i <= maxLanes; i++) {
        let athlete = lanesDataArr.find(a => a.lane == i);

        if (athlete && athlete.f1_id && athlete.nama) { // Pastikan datanya ada
            let st = athlete.seed_time ? athlete.seed_time : 'NT';
            let stClass = athlete.seed_time !== 'NT' ? 'text-indigo-600 bg-indigo-50 border-indigo-200' : 'text-slate-400 bg-slate-100 border-slate-200';

            listHTML += `
            <div class="item bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between cursor-move hover:border-indigo-400 hover:shadow-md transition-all mb-2" 
                 data-f1="${athlete.f1_id}" 
                 data-idreg="${athlete.id_pendaftaran}" 
                 data-name="${athlete.nama}" 
                 data-club="${athlete.klub}" 
                 data-time="${athlete.seed_time || 'NT'}">
                <div class="flex items-center gap-3 w-full">
                    <div class="text-slate-300 font-black cursor-grab">⣿</div>
                    <span class="lane-label w-7 h-7 shrink-0 bg-slate-800 text-white rounded-lg flex items-center justify-center text-[10px] font-black font-mono shadow-sm">L${i}</span>
                    <div class="overflow-hidden">
                        <p class="text-[11px] md:text-xs font-bold text-slate-800 uppercase truncate leading-tight">${athlete.nama}</p>
                        <p class="text-[9px] font-bold text-slate-400 uppercase truncate">${athlete.klub}</p>
                    </div>
                </div>
                <span class="text-[10px] font-mono font-bold px-2 py-1 rounded border shrink-0 ml-2 ${stClass}">${st}</span>
            </div>`;
        } else {
            // Render Blok Kosong buat tambalan jika lintasan kosong
            listHTML += `
            <div class="item border border-dashed border-slate-300 bg-slate-50/50 rounded-xl p-3 flex items-center gap-3 cursor-move mb-2" data-f1="EMPTY">
                <div class="text-slate-300 font-black cursor-grab">⣿</div>
                <span class="lane-label w-7 h-7 shrink-0 bg-slate-300 text-slate-500 rounded-lg flex items-center justify-center text-[10px] font-black font-mono">L${i}</span>
                <span class="text-xs font-bold text-slate-400 italic">[ LINTASAN KOSONG ]</span>
            </div>`;
        }
    }

    return `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5 relative" data-db-id="${dbId}">
        <div class="absolute -top-3 -left-3 w-8 h-8 bg-amber-400 text-white rounded-full flex items-center justify-center font-black text-sm border-2 border-white shadow-sm">${heatNum}</div>
        <h3 class="text-xs font-black text-slate-700 border-b border-slate-100 pb-2 mb-4 pl-6 uppercase tracking-widest flex justify-between items-center">
            Heat ${heatNum}
        </h3>
        <div class="heat-sortable-list min-h-[50px]" data-heat-number="${heatNum}">
            ${listHTML}
        </div>
    </div>`;
}

// ==========================================
// OTAK MAGIC: REKALKULASI LANE
// ==========================================
function recalculateLanes() {
    const allHeats = document.querySelectorAll('.heat-sortable-list');
    
    allHeats.forEach(heatList => {
        const items = heatList.querySelectorAll('.item');
        
        items.forEach((item, index) => {
            const label = item.querySelector('.lane-label');
            if (label) {
                label.innerText = `L${index + 1}`;
            }
        });
    });
}

// ==========================================
// BULK SAVE KE SUPABASE
// ==========================================
async function saveSemuaFormasiToSupabase() {
    const btn = document.getElementById('btnSaveFormasi');
    const heatContainers = document.querySelectorAll('#heatContainerMain > div > div > div[data-db-id]'); 
    
    if (heatContainers.length === 0) return alert("Belum ada data yang di-load.");
    if (!confirm("Peringatan: Aksi ini akan menimpa SELURUH formasi lomba di Database. Lanjutkan?")) return;

    btn.innerHTML = '<span class="animate-spin">⏳</span> Menyimpan Semua...';
    btn.disabled = true;

    try {
        const updatePromises = [];

        heatContainers.forEach(container => {
            const dbId = container.getAttribute('data-db-id');
            let newLanesData = [];
            
            // Ambil anak-anak di dalam ember heat tersebut
            const items = container.querySelectorAll('.heat-sortable-list .item');
            
            items.forEach((item, index) => {
                let f1Id = item.getAttribute('data-f1');
                
                // Kalau slot tersebut bukan KOSONG, masukin datanya
                if (f1Id && f1Id !== 'EMPTY') {
                    newLanesData.push({
                        lane: index + 1, 
                        f1_id: f1Id,
                        id_pendaftaran: item.getAttribute('data-idreg'),
                        nama: item.getAttribute('data-name'),
                        klub: item.getAttribute('data-club'),
                        seed_time: item.getAttribute('data-time') !== 'NT' ? item.getAttribute('data-time') : null
                    });
                }
            });

            // Siapkan instruksi UPDATE untuk dieksekusi barengan
            updatePromises.push(
                supabaseClient
                    .from('event_heats')
                    .update({ lanes_data: newLanesData })
                    .eq('id', dbId)
            );
        });

        // EKSEKUSI MASAL!
        await Promise.all(updatePromises);

        alert("🔥 BOOM! Seluruh Formasi Lomba Berhasil Disimpan Massal! Siap Cetak!");
        
    } catch (err) {
        alert("Gagal menyimpan formasi secara massal: " + err.message);
    } finally {
        btn.innerHTML = '<span>💾</span> Simpan Semua Formasi';
        btn.disabled = false;
    }
}
