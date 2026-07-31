import { supabaseClient } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cek Login & Pastikan dia Admin
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) {
        window.location.replace('/auth.html');
        return;
    }

    // Proteksi UI: Kalau bukan email lu, tendang balik ke dashboard biasa!
    if (session.user.email !== 'radityaraja@gmail.com') {
        alert("Akses Ditolak! Anda bukan Super Admin.");
        window.location.replace('/dashboard.html');
        return;
    }

    // Tombol Logout
    document.getElementById('btnAdminLogout').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.replace('/auth.html');
    });

    // Load Data
    loadAdminData();
});

async function loadAdminData() {
    try {
        // --- A. TARIK DATA ANTREAN VERIFIKASI (Atlet yang foto & akta nya udh diupload tapi belum di-acc) ---
        const { data: queues, error: errQ } = await supabaseClient
            .from('athletes')
            .select('*, clubs(club_name)')
            .eq('is_verified', false)
            .not('foto_url', 'is', null) // Cari yang udah upload foto
            .not('akta_url', 'is', null); // Cari yang udah upload akta

        if (errQ) throw errQ;

        renderQueues(queues);

        // --- B. TARIK DATA FULL CLUB MANAGER ---
        const { data: clubs, error: errC } = await supabaseClient
            .from('clubs')
            .select('*')
            .order('id', { ascending: false }); // <--- Ganti 'created_at' jadi 'id'


        if (errC) throw errC;

        renderClubs(clubs);

    } catch (error) {
        console.error("Gagal memuat admin:", error);
        alert("Gagal memuat data admin: " + error.message);
    }
}

function renderQueues(queues) {
    const tbody = document.getElementById('queueTableBody');
    document.getElementById('badgeQueue').innerText = `${queues.length} Pending`;

    if (queues.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-500 font-bold">Tidak ada antrian verifikasi. Server aman! ☕</td></tr>`;
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

function renderClubs(clubs) {
    const tbody = document.getElementById('clubTableBody');
    
    if (clubs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">Belum ada klub yang mendaftar.</td></tr>`;
        return;
    }

    let html = '';
    clubs.forEach((c, index) => {
        // Logika Provinsi TBD sesuai arahan lu
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
                <td class="p-4 text-center">
                    <span class="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs font-bold font-mono">TBD</span>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// Fungsi global untuk di-klik dari HTML
window.approveAthlete = async (f1_id) => {
    if (!confirm(`Yakin ingin ACC aktivasi F1 ID: ${f1_id}?`)) return;

    try {
        const { error } = await supabaseClient
            .from('athletes')
            .update({ is_verified: true })
            .eq('f1_id', f1_id);

        if (error) throw error;
        
        alert("Boom! F1 ID berhasil diaktifkan. Foto profil AA akan otomatis terganti!");
        loadAdminData(); // Refresh UI

    } catch (err) {
        console.error(err);
        alert("Gagal ACC: " + err.message);
    }
}
