import { supabaseClient } from './supabase.js';

let currentEventId = null;
let allRegistrations = [];

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentEventId = urlParams.get('id');

    if (!currentEventId) {
        alert("ID Event tidak ditemukan!");
        window.location.href = '/dashboard.html';
        return;
    }

    // Tombol Back ke Dashboard Event
    const btnBack = document.getElementById('btnBack');
    if (btnBack) btnBack.href = `/event-dashboard.html?id=${currentEventId}`;

    fetchEventDetails();
    fetchRegistrations();
});

async function fetchEventDetails() {
    try {
        const { data, error } = await supabaseClient.from('events').select('*').eq('id', currentEventId).single();
        if (data) document.getElementById('adminEventName').innerText = data.event_name;
    } catch (err) { console.error(err); }
}

async function fetchRegistrations() {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) loadingState.style.display = 'block';

    try {
        const { data, error } = await supabaseClient
            .from('event_registrations')
            .select('*')
            .eq('event_id', currentEventId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        allRegistrations = data || [];
        updateStats();
        renderTableData(allRegistrations);

    } catch (err) {
        console.error(err);
        document.getElementById('tableDataBody').innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-500 font-bold">Gagal memuat data.</td></tr>`;
    } finally {
        if (loadingState) loadingState.style.display = 'none';
    }
}

function updateStats() {
    document.getElementById('statTotal').innerText = allRegistrations.length;
    document.getElementById('statMenunggu').innerText = allRegistrations.filter(r => r.status_pembayaran === 'Menunggu Konfirmasi').length;
    
    const lunasData = allRegistrations.filter(r => r.status_pembayaran === 'Lunas');
    document.getElementById('statLunas').innerText = lunasData.length;

    const totalPendapatan = lunasData.reduce((acc, curr) => acc + (parseInt(curr.total_biaya) || 0), 0);
    document.getElementById('statPendapatan').innerText = `Rp ${totalPendapatan.toLocaleString('id-ID')}`;
}

function renderTableData(dataArray) {
    const tbody = document.getElementById('tableDataBody');
    tbody.innerHTML = '';

    if (dataArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-500">Belum ada data pendaftar.</td></tr>`;
        return;
    }

    dataArray.forEach(reg => {
        const dateObj = new Date(reg.created_at);
        const dateStr = `${dateObj.getDate()}/${dateObj.getMonth()+1}/${dateObj.getFullYear()} ${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
        
        let statusBadge = '';
        if (reg.status_pembayaran === 'Lunas') statusBadge = `<span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">LUNAS</span>`;
        else statusBadge = `<span class="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">MENUNGGU</span>`;

        // Logika Tampilan Seed Time
        let seedTimeDisplay = reg.seed_time ? reg.seed_time : 'NT';
        let seedTimeColor = reg.seed_time ? 'text-indigo-700 bg-indigo-50 border-indigo-200' : 'text-slate-400 bg-slate-100 border-slate-200';

        let f1Badge = reg.f1_id ? `<span class="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold ml-2">${reg.f1_id}</span>` : '';

        // Tampilkan daftar lomba (karena JSON)
        let lombaList = '';
        if(reg.nomor_lomba && Array.isArray(reg.nomor_lomba)) {
             lombaList = reg.nomor_lomba.map(l => `<span class="block text-xs font-bold text-slate-600 mb-1 border-l-2 border-indigo-400 pl-2">${l.kategori} - ${l.gaya}</span>`).join('');
        }

        const row = `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-4 text-xs font-mono text-slate-500">${dateStr}</td>
                <td class="p-4">
                    <p class="font-extrabold text-slate-800 text-sm flex items-center">${reg.nama_atlet} ${f1Badge}</p>
                    <p class="text-[10px] font-bold text-slate-500 uppercase mt-1">${reg.asal_klub}</p>
                </td>
                <td class="p-4">${lombaList}</td>
                <td class="p-4 text-center">
                    <!-- Tampilan Seed Time -->
                    <span class="inline-block px-3 py-1 border rounded-lg font-mono text-xs font-black tracking-wider ${seedTimeColor}">
                        ${seedTimeDisplay}
                    </span>
                </td>
                <td class="p-4 text-center">${statusBadge}</td>
                <td class="p-4 text-right">
                    <!-- Tombol Edit Manual Seed Time -->
                    <button onclick="openModalSeedTime('${reg.id}', '${reg.nama_atlet}', '${reg.seed_time || ''}')" class="p-2 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-lg transition-colors text-slate-400 shadow-sm" title="Edit Seed Time">
                        ✏️
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// ==========================================
// LOGIKA EDIT SEED TIME MANUAL
// ==========================================
window.openModalSeedTime = function(regId, namaAtlet, currentSeedTime) {
    document.getElementById('editRegId').value = regId;
    document.getElementById('seedTimeAthleteName').innerText = namaAtlet;
    document.getElementById('inputSeedTime').value = currentSeedTime === 'NT' ? '' : currentSeedTime;
    document.getElementById('modalSeedTime').classList.remove('hidden');
}

document.getElementById('btnSaveSeedTime').addEventListener('click', async () => {
    const regId = document.getElementById('editRegId').value;
    let newTime = document.getElementById('inputSeedTime').value.trim();
    const btn = document.getElementById('btnSaveSeedTime');

    if (newTime === '') newTime = null; // Kosong = NT

    btn.innerText = 'Menyimpan...';
    btn.disabled = true;

    try {
        const { error } = await supabaseClient
            .from('event_registrations')
            .update({ seed_time: newTime })
            .eq('id', regId);

        if (error) throw error;
        
        document.getElementById('modalSeedTime').classList.add('hidden');
        fetchRegistrations(); // Refresh data

    } catch (err) {
        alert("Gagal menyimpan waktu: " + err.message);
    } finally {
        btn.innerText = 'Simpan Waktu';
        btn.disabled = false;
    }
});

// ==========================================
// LOGIKA AUTO-SYNC F1
// ==========================================
document.getElementById('btnSyncF1').addEventListener('click', async () => {
    const btn = document.getElementById('btnSyncF1');
    btn.innerHTML = '⏳ Menyinkronkan...';
    btn.disabled = true;

    try {
        // Simulasi tarik data (nanti bisa diganti dengan logic fetch tabel records)
        // Saat ini, anggap berhasil tapi belum ada tabel records
        await new Promise(r => setTimeout(r, 1500)); 
        alert("Sync Selesai! (Fitur pencarian histori aktif di tahap selanjutnya setelah tabel Records tersedia).");
        
    } catch (err) {
        console.error(err);
        alert("Gagal melakukan sinkronisasi.");
    } finally {
        btn.innerHTML = '🔄 Auto-Sync F1';
        btn.disabled = false;
        fetchRegistrations();
    }
});
