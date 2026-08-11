import { supabaseClient } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    // ==========================================
    // 🪤 1. THE AZTEC SECRET (JEBAKAN BATMAN)
    // ==========================================
    if (sessionStorage.getItem('aztec_key') !== 'buka_sesame') {
        document.body.innerHTML = `
            <div style="height:100vh;width:100vw;display:flex;flex-direction:column;align-items:center;justify-content:center;background-color:#0f172a;color:#f87171;font-family:sans-serif;text-align:center;position:fixed;top:0;left:0;z-index:999999;">
                <span style="font-size:6rem;margin-bottom:20px;">🗿</span>
                <h1 style="font-size:3rem;font-weight:900;text-transform:uppercase;">Boss Pintunya ga disini 🤣</h1>
            </div>`;
        setTimeout(() => window.location.replace('/dashboard.html'), 2500);
        return;
    }

    // ==========================================
    // 2. CEK SESI LOGIN SUPABASE
    // ==========================================
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) {
        window.location.replace('/auth.html');
        return;
    }

    // Logout
    document.getElementById('btnAdminLogout').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.replace('/auth.html');
    });

    loadAdminData();
});

async function loadAdminData() {
    try {
        // --- A. TARIK DATA ANTREAN VERIFIKASI AWAL ---
        const { data: queues, error: errQ } = await supabaseClient
            .from('athletes')
            .select('*, clubs(club_name)')
            .eq('is_verified', false)
            .not('foto_url', 'is', null)
            .not('akta_url', 'is', null);
        if (errQ) throw errQ;
        renderQueues(queues);

        // --- B. TARIK DATA EDIT REQUESTS (MAKER-CHECKER) ---
        const { data: edits, error: errEdits } = await supabaseClient
            .from('f1_edit_requests')
            .select('*, athletes (full_name, dob, gender, clubs(club_name))')
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false });
        if (errEdits) throw errEdits;
        renderEditQueues(edits);

        // --- C. TARIK DATA FULL CLUB MANAGER ---
        const { data: clubs, error: errC } = await supabaseClient
            .from('clubs')
            .select('*')
            .order('id', { ascending: false });
        if (errC) throw errC;
        renderClubs(clubs);

    } catch (error) {
        console.error("Gagal memuat admin:", error);
        alert("Gagal memuat data admin: " + error.message);
    }
}

// Render Antrian Awal
function renderQueues(queues) {
    const tbody = document.getElementById('queueTableBody');
    document.getElementById('badgeQueue').innerText = `${queues.length} Pending`;

    if (queues.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-500 font-bold">Tidak ada antrian verifikasi awal.</td></tr>`;
        return;
    }

    let html = '';
    queues.forEach(q => {
        const clubName = q.clubs?.club_name || 'Tanpa Klub';
        html += `
            <tr class="hover:bg-slate-800 transition-colors">
                <td class="p-4">
                    <p class="font-extrabold text-white">${q.full_name}</p>
                    <p class="text-xs font-mono text-emerald-400 mt-0.5">${q.f1_id}</p>
                </td>
                <td class="p-4 text-slate-300 font-medium">${clubName}</td>
                <td class="p-4">
                    <div class="flex gap-2">
                        <a href="${q.foto_url}" target="_blank" class="px-2 py-1 bg-blue-900/50 text-blue-400 rounded text-[10px] font-bold hover:bg-blue-900 transition border border-blue-800">📸 Lihat Foto</a>
                        <a href="${q.akta_url}" target="_blank" class="px-2 py-1 bg-purple-900/50 text-purple-400 rounded text-[10px] font-bold hover:bg-purple-900 transition border border-purple-800">📄 Lihat Akta</a>
                    </div>
                </td>
                <td class="p-4 text-center">
                    <button onclick="approveAthlete('${q.f1_id}')" class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-lg transition transform hover:scale-105">✅ APPROVE</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// Render Edit Requests (Before vs After)
function renderEditQueues(edits) {
    const tbody = document.getElementById('editQueueTableBody');
    document.getElementById('badgeEditQueue').innerText = `${edits.length} Pending`;

    if (edits.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500 font-bold">Tidak ada usulan perubahan data. Server aman! ☕</td></tr>`;
        return;
    }

    let html = '';
    edits.forEach(e => {
        const oldData = e.athletes;
        const clubName = oldData?.clubs?.club_name || 'Tanpa Klub';
        
        html += `
            <tr class="hover:bg-slate-800 transition-colors">
                <td class="p-4">
                    <p class="font-mono font-bold text-amber-400">${e.f1_id}</p>
                    <p class="text-[10px] text-slate-500 mt-1">${clubName}</p>
                </td>
                <td class="p-4 bg-red-950/20 border-r border-slate-700">
                    <p class="text-sm font-bold text-slate-300 line-through">${oldData.full_name}</p>
                    <p class="text-xs text-slate-500 mt-0.5">${oldData.gender} • ${oldData.dob}</p>
                </td>
                <td class="p-4 bg-emerald-950/20">
                    <p class="text-sm font-extrabold text-emerald-400">${e.new_name}</p>
                    <p class="text-xs text-emerald-600 mt-0.5">${e.new_gender} • ${e.new_dob}</p>
                </td>
                <td class="p-4">
                    <a href="${e.new_akta_url}" target="_blank" class="px-3 py-1.5 bg-purple-900/50 text-purple-400 rounded text-[10px] font-bold hover:bg-purple-900 transition border border-purple-800 inline-block">📄 Cek Akta</a>
                </td>
                <td class="p-4 text-center space-x-2">
                    <button onclick="rejectEdit(${e.id})" class="px-3 py-1.5 bg-slate-700 hover:bg-red-600 text-white font-bold rounded-lg text-xs shadow-lg transition">TOLAK</button>
                    <button onclick="approveEdit(${e.id}, '${e.f1_id}', '${e.new_name}', '${e.new_dob}', '${e.new_gender}', '${e.new_foto_url}', '${e.new_akta_url}')" class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-lg transition transform hover:scale-105">✅ ACC</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// Render Clubs
function renderClubs(clubs) {
    const tbody = document.getElementById('clubTableBody');
    if (clubs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">Belum ada klub.</td></tr>`;
        return;
    }
    let html = '';
    clubs.forEach((c, index) => {
        const location = c.provinsi ? `${c.kota_asal || ''}, ${c.provinsi}` : (c.kota_asal || 'Belum diatur');
        html += `
            <tr class="hover:bg-slate-800 transition-colors">
                <td class="p-4 text-center text-slate-500 font-bold">${index + 1}</td>
                <td class="p-4">
                    <p class="font-extrabold text-white">${c.club_name}</p>
                    <p class="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">${c.short_name || 'NO-TAG'}</p>
                </td>
                <td class="p-4 text-slate-300 font-bold flex items-center gap-2">
                    <span class="text-lg">👤</span> ${c.coach_name || 'Belum diisi'}
                </td>
                <td class="p-4 text-slate-400 text-xs">${location}</td>
                <td class="p-4 text-center"><span class="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs font-bold font-mono">TBD</span></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// Fungsi ACC Awal
window.approveAthlete = async (f1_id) => {
    if (!confirm(`Yakin ingin ACC aktivasi F1 ID: ${f1_id}?`)) return;
    try {
        const { error } = await supabaseClient.from('athletes').update({ is_verified: true }).eq('f1_id', f1_id);
        if (error) throw error;
        alert("Boom! F1 ID berhasil diaktifkan.");
        loadAdminData(); 
    } catch (err) {
        alert("Gagal ACC: " + err.message);
    }
}

// =========================================================
// Fungsi ACC Usulan Edit (Auto-Fix F1 ID & Suntik Crown 👑)
// =========================================================
window.approveEdit = async (id, f1_id, new_name, new_dob, new_gender, new_foto_url, new_akta_url) => {
    if (!confirm(`Yakin ACC revisi untuk ${f1_id}? Sistem akan DITIMPA & F1 ID akan di-update otomatis!`)) return;

    try {
        // 1. ALGORITMA BEDAH F1 ID (AUTO-FIX TAHUN)
        let updated_f1_id = f1_id; 
        const newYearStr = new_dob.split('-')[0]; // Misal: "2021"
        
        if (newYearStr && newYearStr.length === 4) {
            const newYearCode = newYearStr.substring(2, 4); // Ambil "21"
            const uniqueSuffix = f1_id.substring(5); // Ambil buntutnya, misal "12345"
            updated_f1_id = `F1-${newYearCode}${uniqueSuffix}`; // Jahit jadi "F1-2112345"
        }

        // 2. SUNTIK EMAS CROWN 👑
        const namaSultan = `${new_name} 👑`;

        // 3. SHOOT TO DATABASE (GOD MODE)
        const { error: errUpdate } = await supabaseClient
            .from('athletes')
            .update({
                f1_id: updated_f1_id,  // Update F1 ID baru
                full_name: namaSultan, // Update nama + crown
                dob: new_dob,
                gender: new_gender,
                foto_url: new_foto_url,
                akta_url: new_akta_url,
                is_verified: true
            })
            .eq('f1_id', f1_id); // Target baris pakai f1_id yang lama

        if (errUpdate) throw errUpdate;

        // 4. Ganti Status Queue Jadi APPROVED
        const { error: errQueue } = await supabaseClient
            .from('f1_edit_requests')
            .update({ status: 'APPROVED' })
            .eq('id', id);

        if (errQueue) throw errQueue;

        alert(`BAM! Data berhasil diubah!\nF1 ID otomatis di-update menjadi: ${updated_f1_id} 👑`);
        loadAdminData(); // Refresh UI
    } catch (err) {
        console.error(err);
        alert("Gagal ACC Edit: " + err.message);
    }
}

// Fungsi Tolak Usulan Edit
window.rejectEdit = async (id) => {
    if (!confirm(`Tolak pengajuan perubahan data ini?`)) return;
    try {
        const { error } = await supabaseClient.from('f1_edit_requests').update({ status: 'REJECTED' }).eq('id', id);
        if (error) throw error;
        loadAdminData();
    } catch (err) {
        alert("Gagal menolak: " + err.message);
    }
}
