import { supabaseClient } from './supabase.js';

async function initPublicEvent() {
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const mainContent = document.getElementById('mainContent');

    // 1. TANGKAP "SUBDOMAIN" DARI URL (Simulasi)
    // Contoh URL: view-scs.vercel.app/register.html?sub=surabayacup
    const urlParams = new URLSearchParams(window.location.search);
    const subParam = urlParams.get('sub');

    if (!subParam) {
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        errorState.classList.add('flex');
        return;
    }

    try {
        // 2. CARI DATA EVENT BERDASARKAN SUBDOMAIN
        const { data: eventData, error: eventError } = await supabaseClient
            .from('events')
            .select(`
                *,
                profiles ( club_name )
            `)
            .eq('subdomain', subParam)
            .single();

        if (eventError || !eventData) {
            throw new Error("Event tidak ditemukan");
        }

        // 3. INJEKSI DATA KE DALAM HTML (Perubahan Wujud)
        document.getElementById('pageTitle').innerText = `${eventData.event_name} | SCS`;
        document.getElementById('eventTitle').innerText = eventData.event_name;
        
        // Cek apakah ada data harga tiket
        const price = eventData.ticket_price ? eventData.ticket_price : 0;
        document.getElementById('eventPrice').innerText = `Rp ${Number(price).toLocaleString('id-ID')}`;
        
        // Cek data relasi nama klub
        if (eventData.profiles && eventData.profiles.club_name) {
            document.getElementById('eventOrganizer').innerText = eventData.profiles.club_name;
        } else {
            document.getElementById('eventOrganizer').innerText = "Panitia Mandiri";
        }

        // Tampilkan konten utama, sembunyikan loading
        loadingState.classList.add('hidden');
        mainContent.classList.remove('hidden');

    } catch (err) {
        console.error("Gagal memuat event:", err);
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        errorState.classList.add('flex');
    }
}

// Jalankan saat halaman dibuka
initPublicEvent();
