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
// --- ELEMEN MODAL BUAT EVENT ---
const modalBuatEvent = document.getElementById('modalBuatEvent');
const modalContent = document.getElementById('modalContent');
const closeModalBtn = document.getElementById('closeModalBtn');
const btnBuatEvent = document.getElementById('btnBuatEvent');

const inputNamaEvent = document.getElementById('inputNamaEvent');
const inputSubdomain = document.getElementById('inputSubdomain');
const btnCekDomain = document.getElementById('btnCekDomain');
const subdomainStatus = document.getElementById('subdomainStatus');
const btnSubmitEvent = document.getElementById('btnSubmitEvent');

let isSubdomainValid = false;

// Buka Modal
btnBuatEvent?.addEventListener('click', () => {
    modalBuatEvent.classList.remove('hidden');
    setTimeout(() => modalContent.classList.remove('scale-95'), 10);
    // Reset Form
    inputNamaEvent.value = '';
    inputSubdomain.value = '';
    isSubdomainValid = false;
    btnSubmitEvent.disabled = true;
    updateStatus('Belum dicek', 'gray');
});

// Tutup Modal
closeModalBtn?.addEventListener('click', () => {
    modalContent.classList.add('scale-95');
    setTimeout(() => modalBuatEvent.classList.add('hidden'), 200);
});

// Validasi ketikan subdomain (huruf kecil, angka, tanpa spasi)
inputSubdomain?.addEventListener('input', function() {
    this.value = this.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    isSubdomainValid = false;
    btnSubmitEvent.disabled = true;
    updateStatus('Belum dicek', 'gray');
});

// Fungsi Update Status UI
function updateStatus(text, color) {
    const colorMap = {
        'gray': 'bg-gray-400 text-gray-500',
        'green': 'bg-green-500 text-green-600',
        'red': 'bg-red-500 text-red-600',
        'yellow': 'bg-yellow-500 text-yellow-600'
    };
    
    // Ambil base class warna
    const dotColor = colorMap[color].split(' ')[0];
    const textColor = colorMap[color].split(' ')[1];

    subdomainStatus.innerHTML = `<span class="w-2 h-2 rounded-full ${dotColor}"></span> <span class="${textColor}">${text}</span>`;
}

// LOGIKA CEK KETERSEDIAAN SUBDOMAIN KE SUPABASE
btnCekDomain?.addEventListener('click', async () => {
    const sub = inputSubdomain.value.trim();
    if (sub.length < 4) {
        return updateStatus('Minimal 4 karakter bro', 'red');
    }

    updateStatus('Mengecek server...', 'yellow');
    btnCekDomain.disabled = true;

    try {
        // Cek ke tabel events apakah subdomain sudah ada
        const { data, error } = await supabaseClient
            .from('events')
            .select('subdomain')
            .eq('subdomain', sub);

        if (error) throw error;

        if (data.length > 0) {
            updateStatus('Sudah digunakan ❌', 'red');
            isSubdomainValid = false;
            btnSubmitEvent.disabled = true;
        } else {
            updateStatus('Tersedia ✅', 'green');
            isSubdomainValid = true;
            if (inputNamaEvent.value.trim().length > 0) {
                btnSubmitEvent.disabled = false;
            }
        }
    } catch (err) {
        updateStatus('Gagal koneksi', 'red');
    } finally {
        btnCekDomain.disabled = false;
    }
});

// Buka kunci tombol Submit kalau Nama Event diisi setelah Cek Domain
inputNamaEvent?.addEventListener('input', () => {
    if (isSubdomainValid && inputNamaEvent.value.trim().length > 0) {
        btnSubmitEvent.disabled = false;
    } else {
        btnSubmitEvent.disabled = true;
    }
});

// ==========================================
// EKSEKUSI BUAT EVENT & SIMULASI LOADING SAAS
// ==========================================
btnSubmitEvent?.addEventListener('click', async () => {
    const eventName = inputNamaEvent.value.trim();
    const subdomain = inputSubdomain.value.trim();
    
    // 1. Tutup modal, tampilkan Loading Layar Penuh
    modalBuatEvent.classList.add('hidden');
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');

    const steps = [
        document.getElementById('loadStep1'),
        document.getElementById('loadStep2'),
        document.getElementById('loadStep3'),
        document.getElementById('loadStep4')
    ];

    // Fungsi Animasi Loading (UX Delight)
    const runSim = async () => {
        for (let i = 0; i < steps.length; i++) {
            await new Promise(r => setTimeout(r, 800)); // Jeda 0.8 detik tiap baris
            steps[i].classList.remove('opacity-50');
            steps[i].innerHTML = steps[i].innerHTML.replace('⏳', '✅');
        }
    };

    try {
        // Mulai animasi loading di background
        const simPromise = runSim();

        // 2. Eksekusi asli ke Database Supabase
        const { data, error } = await supabaseClient
            .from('events')
            .insert([
                { 
                    event_name: eventName, 
                    subdomain: subdomain, 
                    client_id: currentProfile.id // <-- UBAH DI SINI: pakai client_id
                }
            ])
            .select();


        if (error) throw error;
        
        // Tunggu animasi loading selesai biar user puas ngeliatnya
        await simPromise;
        await new Promise(r => setTimeout(r, 500));

        // 3. Arahkan ke Dashboard Event Khusus
        // Data[0].id adalah UUID event yang baru terbuat
        window.location.replace(`/event-dashboard.html?id=${data[0].id}`);

    } catch (err) {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        alert("Gagal membangun event: " + err.message);
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
