import { supabaseClient } from './supabase.js';

let currentEventId = null;
let currentEvent = null;
let allRegistrations = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cek User Session
    const { data: sessionData } = await supabaseClient.auth.getSession();
    if (!sessionData.session) {
        alert("Akses ditolak. Anda harus login sebagai Panitia.");
        window.location.href = '/auth.html'; 
        return;
    }

    // 2. Deteksi Event ID dari URL
    const urlParams = new URLSearchParams(window.location.search);
    currentEventId = urlParams.get('id');

    if (!currentEventId) {
        alert("ID Event tidak ditemukan di URL! Kembali ke Dashboard.");
        window.location.href = '/dashboard.html';
        return;
    }

    // Ubah link tombol Back
    document.getElementById('btnBack').href = `/event-dashboard.html?id=${currentEventId}`;

    try {
        const { data: eventData, error: eventErr } = await supabaseClient
            .from('events')
            .select('*')
            .eq('id', currentEventId)
            .single();

        if (eventErr || !eventData) throw new Error("Event tidak ditemukan.");
        currentEvent = eventData;
        
        document.getElementById('adminEventName').innerText = eventData.event_name;
        fetchData();

    } catch (err) {
        alert(err.message);
        document.getElementById('loadingState').innerText = "Gagal memuat data.";
    }

    document.getElementById('inputSearch').addEventListener('input', renderTable);
    document.getElementById('filterStatus').addEventListener('change', renderTable);
    document.getElementById('btnCloseModal').addEventListener('click', () => {
        document.getElementById('imageModal').classList.add('hidden');
    });
});

async function fetchData() {
    document.getElementById('loadingState').classList.remove('hidden');
    document.getElementById('tableDataBody').innerHTML = '';

    const { data, error } = await supabaseClient
        .from('event_registrations')
        .select('*')
        .eq('event_id', currentEventId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        alert("Gagal menarik data peserta.");
        return;
    }

    allRegistrations = data || [];
    document.getElementById('loadingState').classList.add('hidden');
    
    updateStats();
    renderTable();
}

function updateStats() {
    const total = allRegistrations.length;
    const menunggu = allRegistrations.filter(r => r.status_pembayaran === 'Menunggu Konfirmasi').length;
    const lunas = allRegistrations.filter(r => r.status_pembayaran === 'Lunas').length;
    
    const pendapatan = allRegistrations
        .filter(r => r.status_pembayaran === 'Lunas')
        .reduce((sum, r) => sum + Number(r.total_biaya), 0);

    document.getElementById('statTotal').innerText = total;
    document.getElementById('statMenunggu').innerText = menunggu;
    document.getElementById('statLunas').innerText = lunas;
    document.getElementById('statPendapatan').innerText = `Rp ${pendapatan.toLocaleString('id-ID')}`;
}

function renderTable() {
    const tbody = document.getElementById('tableDataBody');
    tbody.innerHTML = '';
    
    const searchQuery = document.getElementById('inputSearch').value.toLowerCase();
    const filterStatus = document.getElementById('filterStatus').value;

    let filteredData = allRegistrations.filter(item => {
        const matchSearch = item.nama_peserta.toLowerCase().includes(searchQuery) || item.klub_asal.toLowerCase().includes(searchQuery);
        const matchStatus = filterStatus === 'ALL' || item.status_pembayaran === filterStatus;
        return matchSearch && matchStatus;
    });

    if(filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-slate-400 font-bold">Tidak ada data ditemukan.</td></tr>`;
        return;
    }

    filteredData.forEach((item) => {
        const dateObj = new Date(item.created_at);
        const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        let statusBadge = '';
        if(item.status_pembayaran === 'Lunas') statusBadge = `<span class="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Lunas</span>`;
        else if(item.status_pembayaran === 'Menunggu Konfirmasi') statusBadge = `<span class="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Menunggu Konfirmasi</span>`;
        else statusBadge = `<span class="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Keranjang</span>`;

        const aktaBtn = item.akta_url ? `<button onclick="window.viewImage('${item.akta_url}', 'Akta: ${item.nama_peserta}')" class="text-blue-500 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded text-xs font-bold transition-colors shadow-sm">📄 Akta</button>` : `<span class="text-slate-300 text-xs">-</span>`;
        const strukBtn = item.bukti_transfer_url ? `<button onclick="window.viewImage('${item.bukti_transfer_url}', 'Struk: ${item.nama_peserta}')" class="text-emerald-500 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded text-xs font-bold transition-colors shadow-sm mt-1">💳 Struk</button>` : `<span class="text-slate-300 text-xs">-</span>`;

        let waLink = "#";
        let waButtonClass = "opacity-50 cursor-not-allowed grayscale";
        if (item.whatsapp_tamu) {
            let waClean = item.whatsapp_tamu.replace(/\D/g, '');
            if(waClean.startsWith('0')) waClean = '62' + waClean.substring(1);
            const waPesan = `Halo PIC ${item.klub_asal}, kami dari Panitia ${currentEvent.event_name}. Menginfokan terkait pendaftaran atlet a.n *${item.nama_peserta}*...`;
            waLink = `https://wa.me/${waClean}?text=${encodeURIComponent(waPesan)}`;
            waButtonClass = "hover:scale-105 hover:shadow-md";
        }

        // ========================================================
        // UX BARU: RENDER NOMOR LOMBA + SEED TIME DI DALAM CHIPS
        // ========================================================
        let nomorLombaHtml = '';
        if (Array.isArray(item.nomor_lomba)) {
            item.nomor_lomba.forEach(nomor => {
                // Misal format data nomor lomba json = {kategori: "KU 1", gaya: "Gaya Bebas 50m", seed_time: "00:35.12"}
                let namaGaya = nomor.gaya || nomor; // Jaga-jaga kalau data lama cuma string biasa
                let waktuSeed = nomor.seed_time ? nomor.seed_time : 'NT';
                let warnaTeks = nomor.seed_time ? 'text-indigo-600 font-black' : 'text-slate-400 font-bold';
                
                nomorLombaHtml += `
                <div class="flex justify-between items-center px-2 py-1 bg-slate-50 rounded border border-slate-200 mb-1 shadow-sm w-full">
                    <span class="text-[9px] font-bold text-slate-600">${namaGaya}</span>
                    <span class="text-[9px] font-mono ${warnaTeks} bg-white px-1.5 py-0.5 rounded border border-slate-100 ml-2">${waktuSeed}</span>
                </div>`;
            });
        }

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/80 transition-colors group";
        tr.innerHTML = `
            <td class="p-4 align-top">
                <p class="font-extrabold text-slate-700 text-xs">#${item.id.split('-')[0].toUpperCase()}</p>
                <p class="text-[10px] text-slate-400 mt-1">${dateStr} • ${timeStr}</p>
            </td>
            <td class="p-4 align-top">
                <p class="font-bold text-slate-800">${item.nama_peserta}</p>
                <div class="flex items-center gap-1.5 mt-1">
                    <span class="bg-indigo-50 text-indigo-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-widest">${item.f1_id ? 'VVIP' : 'TAMU'}</span>
                    <span class="text-[10px] text-slate-500 font-medium">${item.klub_asal}</span>
                </div>
            </td>
            <td class="p-4 align-top">
                <p class="text-xs font-bold text-slate-700 mb-1.5">${item.kelompok_umur} • ${item.gender}</p>
                <div class="flex flex-col gap-1 max-w-[200px]">
                    ${nomorLombaHtml}
                </div>
            </td>
            <td class="p-4 align-top text-center flex flex-col items-center gap-1">
                ${aktaBtn}
                ${strukBtn}
            </td>
            <td class="p-4 align-top">
                <div class="mb-1.5">${statusBadge}</div>
                <p class="text-xs font-black text-slate-700">Rp ${Number(item.total_biaya).toLocaleString('id-ID')}</p>
            </td>
            <td class="p-4 align-top text-right">
                <div class="flex items-center justify-end gap-2">
                    <a href="${waLink}" target="_blank" class="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center transition-all ${waButtonClass}" title="Chat WA">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </a>
                    <!-- TOMBOL EDIT MULTI SEED TIME -->
                    <button onclick="window.openModalSeedTime('${item.id}')" class="bg-white hover:bg-blue-50 border border-slate-200 text-slate-400 hover:text-blue-600 px-2.5 py-1.5 rounded-lg text-xs transition-colors shadow-sm" title="Edit Seed Time">✏️</button>
                    
                    ${item.status_pembayaran !== 'Lunas' ? `<button onclick="window.verifikasiLunas('${item.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> Lunas</button>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// FUNGSI GLOBAL (Dipanggil dari HTML onclick)
// ==========================================
window.viewImage = function(url, title) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalImage').src = url;
    document.getElementById('btnDownloadImage').href = url;
    document.getElementById('imageModal').classList.remove('hidden');
}

window.verifikasiLunas = async function(id) {
    if(!confirm("Yakin ingin mengubah status pendaftaran ini menjadi LUNAS?")) return;
    try {
        const { error } = await supabaseClient.from('event_registrations').update({ status_pembayaran: 'Lunas' }).eq('id', id);
        if (error) throw error;
        alert("✅ Status berhasil diubah menjadi Lunas!");
        fetchData(); 
    } catch (err) { alert("Gagal update status: " + err.message); }
}

window.bukaModalBukuAcara = function() {
    document.getElementById('modalBukuAcara').classList.remove('hidden');
    document.getElementById('modalBukuAcara').classList.add('flex');
}

window.tutupModalBukuAcara = function() {
    document.getElementById('modalBukuAcara').classList.add('hidden');
    document.getElementById('modalBukuAcara').classList.remove('flex');
}

window.generateBukuAcara = function() {
    const lintasan = document.getElementById('inputLintasan').value;
    window.location.href = `/book/book.html?id=${currentEventId}&lanes=${lintasan}`;
}

// ==========================================
// LOGIKA EDIT SEED TIME MULTIPLE GAYA (JSONB)
// ==========================================
window.openModalSeedTime = function(regId) {
    const reg = allRegistrations.find(r => r.id === regId);
    if (!reg) return;

    document.getElementById('editRegId').value = regId;
    document.getElementById('seedTimeAthleteName').innerText = `${reg.nama_peserta} - ${reg.klub_asal}`;
    
    const container = document.getElementById('seedTimeListContainer');
    container.innerHTML = ''; // Bersihkan isi form sebelumnya

    // Buat input form sesuai gaya yang diikutin
    if (Array.isArray(reg.nomor_lomba)) {
        reg.nomor_lomba.forEach((nomor, index) => {
            let namaGaya = nomor.gaya || nomor;
            let currentST = nomor.seed_time || '';
            
            container.innerHTML += `
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                    <label class="block text-xs font-bold text-slate-700 mb-2 uppercase">${namaGaya}</label>
                    <input type="text" id="seed_time_${index}" value="${currentST}" placeholder="Kosongkan jika NT (Contoh: 00:35.50)" class="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm font-bold font-mono focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                </div>
            `;
        });
    }
    
    document.getElementById('modalSeedTime').classList.remove('hidden');
}

// Proses Simpan numpuk data ke JSONB Supabase
document.getElementById('btnSaveSeedTime').addEventListener('click', async () => {
    const regId = document.getElementById('editRegId').value;
    const reg = allRegistrations.find(r => r.id === regId);
    if (!reg) return;

    const btn = document.getElementById('btnSaveSeedTime');
    btn.innerText = 'Menyimpan...';
    btn.disabled = true;

    // Kloning array lama buat dimodifikasi
    let updatedNomorLomba = [...reg.nomor_lomba];

    updatedNomorLomba.forEach((nomor, index) => {
        const inputEl = document.getElementById(`seed_time_${index}`);
        if (inputEl) {
            let inputVal = inputEl.value.trim();
            
            // Konversi dari string biasa jadi object (kalau datanya masih format lama)
            if (typeof nomor === 'string') {
                nomor = { gaya: nomor };
                updatedNomorLomba[index] = nomor;
            }

            if (inputVal === '') {
                delete nomor.seed_time; // Hapus properti kalau kosong (Berarti NT)
            } else {
                nomor.seed_time = inputVal; // Isi waktu baru
            }
        }
    });

    try {
        const { error } = await supabaseClient
            .from('event_registrations')
            .update({ nomor_lomba: updatedNomorLomba })
            .eq('id', regId);

        if (error) throw error;
        
        document.getElementById('modalSeedTime').classList.add('hidden');
        fetchData(); // Refresh data supaya tabel update

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
        await new Promise(r => setTimeout(r, 1500)); 
        alert("Sync Selesai! (Saat ini dalam mode simulasi, fitur pencarian histori akan aktif di tahap selanjutnya).");
    } catch (err) {
        console.error(err);
        alert("Gagal melakukan sinkronisasi.");
    } finally {
        btn.innerHTML = '🔄 Auto-Sync F1';
        btn.disabled = false;
        fetchData();
    }
});