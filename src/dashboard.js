import { supabaseClient } from './supabase.js';

let currentUser = null;
let currentProfile = null;

// ==========================================
// 1. PROTEKSI HALAMAN (Harus Login)
// ==========================================
async function checkSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error || !session) {
        window.location.href = "/auth.html";
        return;
    }
    
    currentUser = session.user;
    await loadProfile();
    await loadEvents();
}

// ==========================================
// 2. AMBIL DATA PROFIL UTAMA
// ==========================================
async function loadProfile() {
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('id, club_name')
            .eq('id', currentUser.id)
            .single();

        const displayEl = document.getElementById('clubNameDisplay');
        if (data) {
            currentProfile = data;
            displayEl.innerHTML = `Halo, Coach <strong>${data.club_name || 'Coach'}</strong>!`;
        } else {
            displayEl.innerHTML = `Halo, Coach!`;
        }
    } catch (err) {
        console.error("Gagal memuat profil:", err);
    }
}

// ==========================================
// 3. AMBIL DAFTAR EVENT & RENDER KARTU UI
// ==========================================
async function loadEvents() {
    const container = document.getElementById('eventListContainer'); // Pastikan ID ini ada di HTML-mu
    
    if (!container) {
        // Fallback jika ID lama yang dipakai
        console.warn("Mencari fallback container...");
    }
    
    const targetContainer = container || document.getElementById('eventContainer');

    targetContainer.innerHTML = `
        <div class="col-span-full flex justify-center py-10">
            <span class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
        </div>
    `;

    try {
        const { data: events, error } = await supabaseClient
            .from('events')
            .select('*')
            .eq('owner_id', currentUser.id) // Filter event milik user ini saja
            .order('created_at', { ascending: false });

        targetContainer.innerHTML = '';

        if (error || !events || events.length === 0) {
            targetContainer.innerHTML = `
                <div class="col-span-full bg-white p-10 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-400">
                    <span class="text-5xl block mb-4">📭</span>
                    <h3 class="text-lg font-bold text-gray-700">Belum ada event</h3>
                    <p class="text-gray-500 mt-2">Klik tombol "Buat Event Baru" di atas untuk memulai kompetisi Anda.</p>
                </div>`;
            return;
        }

        events.forEach(ev => {
            // DOMAIN LIVE: Format URL otomatis pakai funswimming.my.id
            const publicUrl = `https://${ev.subdomain}.funswimming.my.id`;
            
            // Meta Info (Bisa disesuaikan nanti dengan relasi DB)
            const tanggalLomba = ev.start_date || "Segera Hadir"; 
            const jumlahAtlet = ev.total_peserta || 0; 
            const hargaTiket = ev.ticket_price || 0;

            const card = document.createElement('div');
            card.className = "bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden relative cursor-pointer group";
            
            // Klik card -> masuk ke Ruang Kendali (Dashboard Event)
            card.onclick = () => {
                window.location.href = `/event-dashboard.html?id=${ev.id}`;
            };

            card.innerHTML = `
                <!-- Status Badge -->
                <div class="absolute top-0 right-0 bg-green-500 text-white text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-bl-xl shadow-sm flex items-center gap-1.5 z-10">
                    <span class="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                    AKTIF
                </div>
                
                <div class="p-5 sm:p-6">
                    <h3 class="text-lg sm:text-xl font-extrabold text-blue-900 mb-1 pr-16 group-hover:text-blue-700 transition line-clamp-1">
                        ${ev.event_name}
                    </h3>
                    
                    <p class="text-xs sm:text-sm text-gray-500 font-medium mb-5 flex items-center gap-2">
                        <span>📅 ${tanggalLomba}</span> 
                        <span class="text-gray-300">•</span> 
                        <span class="text-green-600 font-bold">🎟️ Rp ${Number(hargaTiket).toLocaleString('id-ID')}</span>
                    </p>
                    
                    <!-- Tombol Aksi Buka Halaman -->
                    <div class="pt-4 border-t border-gray-100">
                        <button 
                            onclick="event.stopPropagation(); window.open('${publicUrl}', '_blank')" 
                            class="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2.5 sm:py-3 px-4 rounded-xl transition flex justify-center items-center gap-2 text-xs sm:text-sm"
                        >
                            <span>🌐</span> Kunjungi Halaman Event
                        </button>
                    </div>
                </div>
            `;
            targetContainer.appendChild(card);
        });
    } catch (err) {
        console.error("Gagal memuat event:", err);
        targetContainer.innerHTML = `<p class="text-red-500 col-span-full text-center py-10">Gagal memuat data event.</p>`;
    }
}

// ==========================================
// 4. EKSEKUSI TOMBOL BUAT EVENT (MODAL)
// ==========================================
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

// Format Subdomain saat diketik
inputSubdomain?.addEventListener('input', function() {
    this.value = this.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    isSubdomainValid = false;
    btnSubmitEvent.disabled = true;
    updateStatus('Belum dicek', 'gray');
});

// Helper Status Visual UI
function updateStatus(text, color) {
    const colorMap = {
        'gray': 'bg-gray-400 text-gray-500',
        'green': 'bg-green-500 text-green-600',
        'red': 'bg-red-500 text-red-600',
        'yellow': 'bg-yellow-500 text-yellow-600'
    };
    const dotColor = colorMap[color].split(' ')[0];
    const textColor = colorMap[color].split(' ')[1];
    subdomainStatus.innerHTML = `<span class="w-2 h-2 rounded-full ${dotColor}"></span> <span class="${textColor}">${text}</span>`;
}

// Cek Ketersediaan Subdomain ke DB
btnCekDomain?.addEventListener('click', async () => {
    const sub = inputSubdomain.value.trim();
    if (sub.length < 4) {
        return updateStatus('Minimal 4 karakter bro', 'red');
    }

    updateStatus('Mengecek server...', 'yellow');
    btnCekDomain.disabled = true;

    try {
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

// Validasi Form sebelum Submit
inputNamaEvent?.addEventListener('input', () => {
    if (isSubdomainValid && inputNamaEvent.value.trim().length > 0) {
        btnSubmitEvent.disabled = false;
    } else {
        btnSubmitEvent.disabled = true;
    }
});

// Eksekusi Submit Event Baru
btnSubmitEvent?.addEventListener('click', async () => {
    const eventName = inputNamaEvent.value.trim();
    const subdomain = inputSubdomain.value.trim();
    
    if (!eventName || !isSubdomainValid) return alert("Data belum lengkap!");

    modalBuatEvent.classList.add('hidden');
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
    }

    try {
        const { data, error } = await supabaseClient
            .from('events')
            .insert([{ 
                event_name: eventName, 
                subdomain: subdomain, 
                owner_id: currentUser.id // Pakai ID User yang login langsung
            }])
            .select();

        if (error) throw error;
        
        // Jeda bentar biar animasi loadingnya kerasa elegan
        await new Promise(r => setTimeout(r, 800));
        
        // Lemparkan ke halaman kelola event yang baru dibuat
        window.location.replace(`/event-dashboard.html?id=${data[0].id}`);

    } catch (err) {
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }
        alert("Gagal membangun event: " + err.message);
    }
});

// ==========================================
// 5. TOMBOL MENU LAINNYA
// ==========================================
document.getElementById('btnSponsor')?.addEventListener('click', () => {
    alert('Fitur Sponsor Premium segera hadir bray!');
});

document.getElementById('btnJuri')?.addEventListener('click', () => {
    alert('Database juri bersertifikat sedang disiapkan bray!');
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "/auth.html";
});

// JALANKAN SAAT HALAMAN DIBUKA
checkSession();
