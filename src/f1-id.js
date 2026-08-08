import { supabaseClient } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Tangkap ID dari URL (contoh: ?id=F1-2608123)
    const urlParams = new URLSearchParams(window.location.search);
    let f1IdParams = urlParams.get('id');

    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const profileData = document.getElementById('profileData');

    if (!f1IdParams) {
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        return;
    }

    // Bersihkan spasi kalau ada
    f1IdParams = f1IdParams.trim().toUpperCase();

    try {
        // 2. Tarik Data Atlet dari tabel 'athletes', sekalian Join ke tabel 'clubs' buat ngambil nama klubnya
        const { data: atlet, error } = await supabaseClient
            .from('athletes')
            .select(`
                *,
                clubs (
                    club_name
                )
            `)
            .eq('f1_id', f1IdParams)
            .single();

        if (error || !atlet) throw new Error("Data tidak ditemukan");

        // 3. Eksekusi Render UI
        renderProfile(atlet);

        // Transisi Halus
        loadingState.classList.add('hidden');
        profileData.classList.remove('hidden');

    } catch (err) {
        console.error("Gagal load profil:", err);
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
    }
});

function renderProfile(atlet) {
    // Render Teks & Info Dasar
    document.getElementById('atletName').innerText = atlet.full_name;
    document.getElementById('atletF1Id').innerText = atlet.f1_id;
    
    // Render Nama Klub (Hasil Join dari tabel clubs)
    document.getElementById('atletKlub').innerText = atlet.clubs?.club_name || 'Independen / Sekolah';

    // Render Foto (Pakai inisial nama kalau belum upload)
    const avatarUrl = atlet.foto_url ? atlet.foto_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(atlet.full_name)}&background=f8fafc&color=1e293b&size=256&bold=true`;
    document.getElementById('atletFoto').src = avatarUrl;

    // Render Umur dari Tanggal Lahir
    if (atlet.dob) {
        const dob = new Date(atlet.dob);
        const diff_ms = Date.now() - dob.getTime();
        const age_dt = new Date(diff_ms); 
        const umur = Math.abs(age_dt.getUTCFullYear() - 1970);
        document.getElementById('atletUsia').innerText = `${umur} Thn`;
    }

    // Render Icon Gender
    const genderIconEl = document.getElementById('atletGenderIcon');
    if (atlet.gender === 'Putra') {
        genderIconEl.innerHTML = '👦';
        genderIconEl.className = 'absolute -bottom-3 -right-3 w-10 h-10 bg-sky-400 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-lg text-lg';
    } else {
        genderIconEl.innerHTML = '👧';
        genderIconEl.className = 'absolute -bottom-3 -right-3 w-10 h-10 bg-pink-400 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-lg text-lg';
    }

    // Render Status Verifikasi (Emas vs Biru Biasa)
    const badgeEl = document.getElementById('badgeVerifikasi');
    if (atlet.is_verified) {
        badgeEl.innerHTML = `
            <div class="flex items-center gap-1.5 bg-gradient-to-r from-amber-200 to-yellow-400 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.3)] border border-amber-300">
                <span class="text-sm">👑</span>
                <span class="text-[10px] font-black text-amber-900 uppercase tracking-widest">Verified</span>
            </div>
        `;
    } else {
        badgeEl.innerHTML = `
            <div class="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/20 backdrop-blur-md">
                <span class="text-sm">⏳</span>
                <span class="text-[10px] font-bold text-slate-200 uppercase tracking-widest">Pending</span>
            </div>
        `;
    }
}
