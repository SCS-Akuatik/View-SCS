import { supabaseClient } from './supabase.js';

let currentUser = null;
let currentProfile = null;

// 1. PROTEKSI HALAMAN (Harus Login)
async function checkSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error || !session) {
        alert("Sesi habis bray, silakan login dulu!");
        window.location.href = "/auth.html";
        return;
    }
    
    currentUser = session.user;
    await loadProfile();
    await loadEvents();
}

// 2. AMBIL DATA PROFIL UTAMA
async function loadProfile() {
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('club_name')
            .eq('email', currentUser.email)
            .single();

        const displayEl = document.getElementById('clubNameDisplay');
        if (data && data.club_name) {
            currentProfile = data;
            displayEl.innerHTML = `Halo, Coach <strong>${data.club_name}</strong>!`;
        } else {
            displayEl.innerHTML = `Halo, Coach!`;
        }
    } catch (err) {
        console.error("Gagal memuat profil:", err);
    }
}

// 3. AMBIL DAFTAR EVENT DARI DATABASE
async function loadEvents() {
    try {
        const { data: events, error } = await supabaseClient
            .from('events')
            .select('*')
            .order('created_at', { ascending: false });

        const container = document.getElementById('eventContainer');
        container.innerHTML = '';

        if (error || !events || events.length === 0) {
            container.innerHTML = `
                <div class="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-400">
                    <span class="text-5xl block mb-4">📭</span>
                    <h3 class="text-lg font-bold text-gray-700">Belum ada event</h3>
                    <p class="text-gray-500 mt-2">Klik tombol "Buat Event Baru" di atas untuk memulai kompetisi Anda.</p>
                </div>`;
            return;
        }

        events.forEach(ev => {
            const card = document.createElement('div');
            card.className = "bg-white border border-gray-100 p-6 rounded-xl shadow-sm relative overflow-hidden";
            card.innerHTML = `
                <div class="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">LIVE</div>
                <h3 class="text-2xl font-extrabold text-blue-900 mb-2">${ev.event_name}</h3>
                <p class="text-gray-500 text-sm mb-4">Biaya Tiket: Rp ${Number(ev.ticket_price).toLocaleString('id-ID')}</p>
                
                <div class="bg-gray-50 border border-gray-200 p-4 rounded-lg flex items-center justify-between">
                    <div class="flex-1 overflow-hidden">
                        <p class="text-xs text-gray-500 font-bold mb-1 uppercase">Link Pendaftaran Publik:</p>
                        <span class="text-blue-600 font-bold text-lg truncate block">https://${ev.subdomain}.scs-akuatik.my.id</span>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error("Gagal memuat event:", err);
        document.getElementById('eventContainer').innerHTML = `<p class="text-red-500 text-center py-10">Gagal memuat data event.</p>`;
    }
}

// 4. EKSEKUSI TOMBOL BUAT EVENT
document.getElementById('btnBuatEvent')?.addEventListener('click', async () => {
    let eventName = prompt("Masukkan NAMA LOMBA Anda:\n(Contoh: Fun Swimming Jago Renang 2026)");
    if (!eventName) return;

    let subDomain = prompt("Masukkan NAMA LINK (Subdomain) yang diinginkan:\n(Contoh: jagorenang-lomba)\n*Gunakan huruf kecil tanpa spasi");
    if (!subDomain) return;
    subDomain = subDomain.toLowerCase().replace(/\s+/g, '-');

    let price = prompt("Masukkan harga pendaftaran per atlet (Rupiah):\n(Contoh: 50000)");
    if (!price) price = 0;

    try {
        const { data, error } = await supabaseClient
            .from('events')
            .insert([
                { 
                    event_name: eventName, 
                    subdomain: subDomain, 
                    ticket_price: parseInt(price)
                }
            ]);

        if (error) throw error;

        alert("BOOM! 🚀 Kompetisi lu sukses terdaftar di server!");
        await loadEvents();
    } catch (err) {
        alert("Gagal membuat event: " + err.message);
    }
});

// 5. TOMBOL LAINNYA
document.getElementById('btnSponsor')?.addEventListener('click', () => {
    alert('Fitur Sponsor Premium segera hadir bray!');
});

document.getElementById('btnJuri')?.addEventListener('click', () => {
    alert('Database juri bersertifikat sedang disiapkan bray!');
});

// 6. TOMBOL LOGOUT
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "/auth.html";
});

// Jalankan proteksi saat halaman dibuka
checkSession();
