import { supabaseClient } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 1. LOGIKA CEK LOGIN UNTUK NAVBAR ---
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const floatBtn = document.getElementById('floatingAuthBtn');
        const floatText = document.getElementById('floatingAuthText');
        
        if (session) {
            floatBtn.href = '/dashboard.html';
            floatBtn.classList.replace('bg-blue-700', 'bg-emerald-600');
            floatBtn.classList.replace('border-blue-800', 'border-emerald-700');
            floatBtn.classList.replace('hover:bg-blue-800', 'hover:bg-emerald-700');
            floatText.innerText = 'Ke Dashboard';
        }
    } catch (err) {
        console.error("Gagal cek auth:", err);
    }

    // --- 2. LOGIKA BURGER MENU ---
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const closeMobileBtn = document.getElementById('closeMobileBtn');

    function toggleMobile() {
        if (mobileMenu.classList.contains('hidden')) {
            mobileMenu.classList.remove('hidden');
            mobileMenu.classList.add('flex');
        } else {
            mobileMenu.classList.add('hidden');
            mobileMenu.classList.remove('flex');
        }
    }

    if(mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobile);
    if(closeMobileBtn) closeMobileBtn.addEventListener('click', toggleMobile);

    // --- 3. LOGIKA RENDER GRID EVENT ---
    const gridContainer = document.getElementById('eventGrid');
    
    if (!gridContainer) return;
    gridContainer.innerHTML = `
        <div class="col-span-full py-20 text-center">
            <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p class="text-slate-500 font-bold animate-pulse">Memuat data event seluruh Indonesia...</p>
        </div>`;

    try {
        // Tarik semua event, urutkan dari yang terbaru
        const { data: events, error } = await supabaseClient
            .from('events')
            .select('*')
            .order('event_date', { ascending: false });

        if (error) throw error;

        if (!events || events.length === 0) {
            gridContainer.innerHTML = `<div class="col-span-full text-center py-20"><p class="text-gray-500 font-bold text-lg mb-2">Belum ada event perlombaan terdaftar.</p><p class="text-sm text-gray-400">Jadilah yang pertama menyelenggarakan event dengan SCS!</p></div>`;
            return;
        }

        let html = '';
        events.forEach(ev => {
            const today = new Date();
            const startDate = new Date(ev.event_date);
            const endDate = new Date(ev.end_date);
            
            let badgeHTML = '';
            let btnHTML = '';
            let filterClass = '';

            // Tentukan Status Event
            if (today > endDate) {
                // Selesai
                badgeHTML = `<div class="absolute top-4 left-4 bg-gray-600 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg shadow-sm">SELESAI</div>`;
                btnHTML = `<a href="https://${ev.subdomain}.funswimming.my.id/result?id=${ev.id}" class="block text-center w-full border-2 border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl hover:bg-slate-50 transition">Lihat Hasil Akhir</a>`;
                filterClass = 'selesai';
            } else if (today >= startDate && today <= endDate) {
                // Sedang Berjalan (LIVE)
                badgeHTML = `<div class="absolute top-4 left-4 bg-red-500 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> LIVE RESULT
                    </div>`;
                btnHTML = `<a href="https://${ev.subdomain}.funswimming.my.id/result?id=${ev.id}" class="block text-center w-full bg-red-50 text-red-700 font-bold py-2.5 rounded-xl hover:bg-red-100 transition">Pantau Hasil Pertandingan</a>`;
                filterClass = 'live';
            } else {
                // Masih Buka (Pendaftaran)
                badgeHTML = `<div class="absolute top-4 left-4 bg-green-500 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg shadow-sm">PENDAFTARAN DIBUKA</div>`;
                btnHTML = `<a href="https://${ev.subdomain}.funswimming.my.id?id=${ev.id}" class="block text-center w-full bg-blue-50 text-blue-700 font-bold py-2.5 rounded-xl hover:bg-blue-100 transition">Lihat Detail & Daftar</a>`;
                filterClass = 'buka'; // Supaya tetap masuk di logic awal
            }

            // Lokasi
            const lokasiText = (ev.kota && ev.provinsi) ? `${ev.kota}, ${ev.provinsi}` : 'Lokasi Belum Ditentukan';
            
            // Format Tanggal
            const dateText = (ev.event_date === ev.end_date) 
                ? ev.event_date 
                : `${ev.event_date} s/d ${ev.end_date}`;

            // LOGIKA GAMBAR DARI CONFIG
            let bgImage = "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80"; 
            if (ev.config && ev.config.header_url) {
                bgImage = ev.config.header_url;
            }

            html += `
            <div class="bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-shadow border border-gray-100 group event-card ${filterClass}">
                <div class="h-48 overflow-hidden relative bg-blue-900 flex items-center justify-center">
                    <img src="${bgImage}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 mix-blend-overlay" alt="${ev.event_name}">
                    <h2 class="absolute text-white/40 font-black text-4xl uppercase tracking-tighter mix-blend-overlay pointer-events-none text-center px-4 leading-none">${ev.event_name}</h2>
                    ${badgeHTML}
                </div>
                <div class="p-6">
                    <p class="text-xs font-bold text-amber-500 mb-1 flex items-center gap-1.5">🏆 ${dateText}</p>
                    <h3 class="text-xl font-extrabold text-slate-800 mb-2 truncate" title="${ev.event_name}">${ev.event_name}</h3>
                    <p class="text-xs text-slate-500 mb-5 font-bold flex items-center gap-1.5"><span class="text-red-400 text-sm">📍</span> ${lokasiText}</p>
                    ${btnHTML}
                </div>
            </div>
            `;
        });

        gridContainer.innerHTML = html;

        // ==========================================
        // 4. LOGIKA FILTER & BANNER REKAPITULASI
        // ==========================================
        const filterBtns = document.querySelectorAll('.filter-btn');
        const rekapBanner = document.getElementById('rekapBanner');
        const allCards = document.querySelectorAll('.event-card');

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // 1. Reset warna semua tombol jadi abu-abu/putih
                filterBtns.forEach(b => {
                    b.classList.remove('bg-blue-900', 'text-white', 'shadow-md');
                    b.classList.add('bg-white', 'text-slate-600', 'border', 'border-slate-200');
                });
                
                // 2. Warnain tombol yang lagi diklik jadi biru
                btn.classList.remove('bg-white', 'text-slate-600', 'border', 'border-slate-200');
                btn.classList.add('bg-blue-900', 'text-white', 'shadow-md');

                const filterType = btn.getAttribute('data-filter');

                // 3. Logika munculin/hilangin teks "Server merekapitulasi..."
                if (filterType === 'semua' || filterType === 'selesai') {
                    rekapBanner.classList.remove('hidden');
                } else {
                    rekapBanner.classList.add('hidden');
                }

                // 4. Logika filter sembunyiin/munculin kartu event
                allCards.forEach(card => {
                    if (filterType === 'semua') {
                        card.style.display = 'block'; // Tampilkan semua
                    } else if (filterType === 'live' && card.classList.contains('live')) {
                        card.style.display = 'block'; // Tampilkan yang sedang berjalan
                    } else if (filterType === 'selesai' && card.classList.contains('selesai')) {
                        card.style.display = 'block'; // Tampilkan yang sudah selesai
                    } else {
                        card.style.display = 'none'; // Sembunyikan sisanya
                    }
                });
            });
        });

    } catch (err) {
        console.error(err);
        gridContainer.innerHTML = `<p class="text-center text-red-500 col-span-full py-10 font-bold">Gagal memuat kalender: ${err.message}</p>`;
    }
});
