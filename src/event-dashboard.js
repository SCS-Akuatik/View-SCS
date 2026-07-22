import { supabaseClient } from './supabase.js';

async function loadEventDashboard() {
    // 1. Ambil ID Lomba dari URL
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

        // 3. Update UI dengan data asli (FIXED: Tambah .my.id)
        document.getElementById('headerEventName').innerText = eventData.event_name;
        document.getElementById('headerSubdomain').innerText = `${eventData.subdomain}.funswimming.my.id`;

        // 4. Buat Link Publik yang Benar (FIXED: Langsung nembak ke Subdomain Vercel)
        const publicLink = `https://${eventData.subdomain}.funswimming.my.id`;
        
        const linkInput = document.getElementById('publicLinkInput');
        if (linkInput) {
            linkInput.value = publicLink;
        }

        // 5. Fitur Copy Link
        const btnCopyLink = document.getElementById('btnCopyLink');
        if (btnCopyLink) {
            btnCopyLink.addEventListener('click', () => {
                linkInput.select();
                document.execCommand('copy'); 
                
                const originalText = btnCopyLink.innerText;
                btnCopyLink.innerText = "Tersalin! ✅";
                btnCopyLink.classList.replace('bg-blue-600', 'bg-green-500');
                
                setTimeout(() => {
                    btnCopyLink.innerText = originalText;
                    btnCopyLink.classList.replace('bg-green-500', 'bg-blue-600');
                }, 2000);
            });
        }

    } catch (err) {
        console.error("Gagal memuat dashboard event:", err);
        alert("Gagal memuat data event.");
    }
}

// Eksekusi saat halaman dimuat
loadEventDashboard();
