import { supabaseClient } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const searchResults = document.getElementById('searchResults');
    const searchStatus = document.getElementById('searchStatus');
    const searchList = document.getElementById('searchList');

    let debounceTimer;

    // Fungsi Utama Pencarian
    async function performSearch(query) {
        query = query.trim();
        
        if (!query) {
            searchResults.classList.add('hidden');
            return;
        }

        searchResults.classList.remove('hidden');
        searchList.innerHTML = '';
        searchStatus.classList.remove('hidden');
        searchStatus.innerText = 'Mencari atlet... ⏳';

        try {
            // MAGIC: Kita join tabel 'athletes' dan 'clubs', lalu nyari di 3 kolom sekaligus!
            const { data, error } = await supabaseClient
                .from('athletes')
                .select(`
                    *,
                    clubs (club_name)
                `)
                .or(`full_name.ilike.%${query}%,f1_id.ilike.%${query}%,clubs.club_name.ilike.%${query}%`)
                .limit(10); // Batisin 10 biar ga berat

            if (error) throw error;

            searchStatus.classList.add('hidden');

            if (data.length === 0) {
                searchStatus.classList.remove('hidden');
                searchStatus.innerHTML = `<span class="text-4xl block mb-2">🕵️‍♂️</span>Tidak ada atlet yang cocok dengan "<b>${query}</b>"`;
                return;
            }

            // Kalau ketemu, render ke list
            data.forEach(atlet => {
                const isEmas = atlet.is_verified;
                const statusIcon = isEmas ? '<span class="text-amber-500 text-xs" title="Verified">👑</span>' : '';
                const namaKlub = atlet.clubs?.club_name || 'Independen / Sekolah';
                const avatarUrl = atlet.foto_url ? atlet.foto_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(atlet.full_name)}&background=f8fafc&color=1e293b&bold=true`;

                const li = document.createElement('li');
                // Link langsung mengarah ke Brankas (f1-id.html)
                li.innerHTML = `
                    <a href="/f1-id.html?id=${atlet.f1_id}" class="flex items-center gap-4 p-4 hover:bg-blue-50 transition-colors cursor-pointer group">
                        <img src="${avatarUrl}" class="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm group-hover:scale-105 transition-transform shrink-0">
                        <div class="flex-1 min-w-0">
                            <h4 class="font-extrabold text-slate-800 text-sm truncate">${atlet.full_name} ${statusIcon}</h4>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate mb-1">🏠 ${namaKlub}</p>
                            <span class="inline-block bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-mono px-2 py-0.5 rounded tracking-widest">${atlet.f1_id}</span>
                        </div>
                        <div class="shrink-0 text-slate-300 group-hover:text-blue-500 transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                        </div>
                    </a>
                `;
                searchList.appendChild(li);
            });

        } catch (err) {
            console.error("Search error:", err);
            searchStatus.classList.remove('hidden');
            searchStatus.innerHTML = `<span class="text-red-500 font-bold">Terjadi kesalahan sistem. Coba lagi.</span>`;
        }
    }

    // Event Listener buat Tombol "Cari Atlet"
    searchBtn.addEventListener('click', () => {
        performSearch(searchInput.value);
    });

    // Event Listener (Auto Search pas ngetik, pakai delay 500ms biar ga spam Supabase)
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            performSearch(e.target.value);
        }, 500);
    });

    // Tutup dropdown kalau klik di luar
    document.addEventListener('click', (e) => {
        if (!searchResults.contains(e.target) && e.target !== searchInput && e.target !== searchBtn) {
            searchResults.classList.add('hidden');
        }
    });

    // Buka lagi dropdown kalau input diklik
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim() !== '') {
            searchResults.classList.remove('hidden');
        }
    });
});
