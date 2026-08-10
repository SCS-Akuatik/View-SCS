import { supabaseClient } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    
    // ==========================================
    // 1. SECURITY LOCK: HANYA SUPER ADMIN
    // ==========================================
    try {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError || !session) {
            window.location.replace('/auth.html');
            return;
        }

        if (session.user.email !== 'radityaraja@gmail.com') {
            alert('Akses Ditolak! Halaman ini adalah area VIP khusus Super Admin SCS.');
            window.location.replace('/dashboard.html');
            return;
        }
    } catch (authErr) {
        console.error("Auth Check Error:", authErr);
        window.location.replace('/auth.html');
        return;
    }

    const grid = document.getElementById('sponsorGrid');
    const loading = document.getElementById('loadingState');

    try {
        // 2. Tarik murni dari database master_sponsors (Diurutkan dari yang terbaru)
        const { data, error } = await supabaseClient
            .from('master_sponsors')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        // 3. Matikan loading, tampilkan Grid
        loading.classList.add('hidden');
        grid.classList.remove('hidden');

        // 4. Jika Database Kosong
        if (!data || data.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-10">
                    <p class="text-slate-500 font-bold">Database Master Sponsor masih kosong.</p>
                </div>
            `;
            return;
        }

        // 5. Rakit Kartu HTML
        let htmlContent = '';
        data.forEach(sponsor => {
            const logo = sponsor.logo_url || '/images/logo.png';
            const link = sponsor.link_url || '#';
            
            // Indikator kecil buat ngasih tau ada file Sampul A4 atau nggak
            const coverBadge = sponsor.cover_url 
                ? `<span class="bg-emerald-900/50 text-emerald-400 text-[9px] px-2 py-0.5 rounded border border-emerald-500/30 uppercase font-black tracking-wider">A4 Ready</span>` 
                : `<span class="bg-slate-800 text-slate-500 text-[9px] px-2 py-0.5 rounded border border-slate-700 uppercase font-black tracking-wider">No Cover</span>`;

            htmlContent += `
                <div class="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 shadow-lg hover:border-amber-500 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all group flex flex-col">
                    
                    <!-- Kotak Gambar Logo -->
                    <div class="h-28 w-full bg-white rounded-xl mb-4 flex items-center justify-center p-2 relative overflow-hidden border border-slate-600">
                        <img src="${logo}" class="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-300">
                    </div>
                    
                    <!-- Info Sponsor -->
                    <div class="flex-1">
                        <h3 class="font-black text-white text-sm truncate mb-1" title="${sponsor.sponsor_name}">
                            ${sponsor.sponsor_name}
                        </h3>
                        <a href="${link}" target="_blank" class="text-[10px] text-blue-400 font-mono truncate block mb-4 hover:underline">
                            ${link !== '#' ? link : 'Tidak ada URL link'}
                        </a>
                    </div>
                    
                    <!-- Footer Card -->
                    <div class="flex justify-between items-center border-t border-slate-700/50 pt-3 mt-auto">
                        ${coverBadge}
                        <span class="text-[9px] text-slate-500 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-700">ID: ${sponsor.id}</span>
                    </div>

                </div>
            `;
        });

        // Tembak ke layar!
        grid.innerHTML = htmlContent;

    } catch (err) {
        console.error("Gagal menarik data:", err);
        loading.innerHTML = `
            <span class="text-4xl block mb-4">❌</span>
            <p class="text-red-500 font-bold uppercase text-sm">Error: ${err.message}</p>
        `;
        loading.classList.remove('animate-pulse');
    }
});
