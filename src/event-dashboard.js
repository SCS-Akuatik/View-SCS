import { supabaseClient } from './supabase.js';

async function loadEventDashboard() {
    // 1. Ambil ID Lomba dari URL (contoh: ?id=uuid-panjang-sekali)
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (!eventId) {
        alert("ID Event tidak ditemukan! Mengembalikan ke Dashboard Utama.");
        window.location.replace('/dashboard.html');
        return;
    }

    try {
        // 2. Tarik data event dari Supabase
        const { data: eventData, error } = await supabaseClient
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (error || !eventData) throw error;

        // 3. Update UI dengan data asli
        document.getElementById('headerEventName').innerText = eventData.event_name;
        document.getElementById('headerSubdomain').innerText = `${eventData.subdomain}.funswimming.id`;

        // 4. Buat Link Simulasi Publik
        // Karena kita simulasi di vercel, linknya mengarah ke register.html?sub=namasubdomain
        const domainURL = window.location.origin; // Mengambil otomatis https://view-scs.vercel.app atau localhost
        const publicLink = `${domainURL}/register.html?sub=${eventData.subdomain}`;
        
        const linkInput = document.getElementById('publicLinkInput');
        linkInput.value = publicLink;

        // 5. Fitur Copy Link
        document.getElementById('btnCopyLink').addEventListener('click', () => {
            linkInput.select();
            document.execCommand('copy'); // Jalur aman untuk semua browser
            
            const btn = document.getElementById('btnCopyLink');
            const originalText = btn.innerText;
            btn.innerText = "Tersalin! ✅";
            btn.classList.replace('bg-blue-600', 'bg-green-500');
            
            setTimeout(() => {
                btn.innerText = originalText;
                btn.classList.replace('bg-green-500', 'bg-blue-600');
            }, 2000);
        });

    } catch (err) {
        console.error("Gagal memuat dashboard event:", err);
        alert("Gagal memuat data event.");
    }
}

// Eksekusi saat halaman dimuat
loadEventDashboard();
