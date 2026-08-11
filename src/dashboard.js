import { supabaseClient } from './supabase.js';

// ==========================================
// STATE GLOBAL UNTUK APLIKASI
// ==========================================
let allAthletes = [];
let filteredAthletes = []; 
let currentPage = 1;
const itemsPerPage = 10;
let currentClubId = null; 
let currentClubData = null; 

document.addEventListener('DOMContentLoaded', async () => {
    const logoutAction = async () => {
        await supabaseClient.auth.signOut();
        window.location.href = '/auth.html';
    };
    
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logoutAction);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', logoutAction);

    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');
    
    if(btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderAthleteTable();
            }
        });
    }
    
    if(btnNext) {
        btnNext.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredAthletes.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderAthleteTable();
            }
        });
    }

    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileMenuPanel = document.getElementById('mobileMenuPanel');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const closeMobileMenu = document.getElementById('closeMobileMenu');

    function toggleMobileMenu() {
        if (!mobileMenuPanel) return;
        const isClosed = mobileMenuPanel.classList.contains('translate-x-full');
        if (isClosed) {
            mobileMenuPanel.classList.remove('translate-x-full');
            mobileMenuOverlay.classList.remove('hidden');
        } else {
            mobileMenuPanel.classList.add('translate-x-full');
            mobileMenuOverlay.classList.add('hidden');
        }
    }
    
    if (mobileMenuToggle) mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    if (closeMobileMenu) closeMobileMenu.addEventListener('click', toggleMobileMenu);
    if (mobileMenuOverlay) mobileMenuOverlay.addEventListener('click', toggleMobileMenu);

    const searchInput = document.getElementById('searchKlubAtlet');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            filteredAthletes = allAthletes.filter(atlet => 
                atlet.full_name.toLowerCase().includes(query) || 
                atlet.f1_id.toLowerCase().includes(query)
            );
            currentPage = 1;
            renderAthleteTable();
        });
    }

    fetchDashboardData();
});

// ==========================================
// 1. FUNGSI TARIK DATA DASHBOARD
// ==========================================
async function fetchDashboardData() {
    try {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError || !session) {
            window.location.href = '/auth.html';
            return;
        }

        const userId = session.user.id; 
        const userEmail = session.user.email;

        const { data: clubData, error: clubError } = await supabaseClient
            .from('clubs')
            .select('*')
            .eq('owner_id', userId)
            .single();

        if (clubError || !clubData) {
            const modalOnboard = document.getElementById('modalOnboarding');
            modalOnboard.classList.remove('hidden'); 
            
            const btnSaveOnboard = document.getElementById('btnSaveOnboarding');
            
            btnSaveOnboard.onclick = async () => {
                const cName = document.getElementById('onboardClubName').value.trim();
                const cCoach = document.getElementById('onboardCoachName').value.trim();
                const onboardMsg = document.getElementById('onboardMsg');

                if (!cName || !cCoach) {
                    onboardMsg.innerText = "Nama Klub dan Nama Pelatih wajib diisi!";
                    onboardMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block";
                    return;
                }

                btnSaveOnboard.innerText = "Membangun Klub...";
                btnSaveOnboard.disabled = true;

                try {
                    const { error: insertErr } = await supabaseClient
                        .from('clubs')
                        .insert([{
                            club_name: cName,
                            coach_name: cCoach,
                            owner_id: userId,
                            admin_email: userEmail
                        }]);

                    if (insertErr) throw insertErr;

                    onboardMsg.innerText = "✅ Klub berhasil dibangun! Memuat Command Center...";
                    onboardMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-green-100 text-green-600 block";
                    
                    setTimeout(() => {
                        modalOnboard.classList.add('hidden');
                        fetchDashboardData(); 
                    }, 1500);

                } catch (err) {
                    onboardMsg.innerText = "Gagal: " + err.message;
                    onboardMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block";
                    btnSaveOnboard.innerText = "Buat Klub & Mulai 🚀";
                    btnSaveOnboard.disabled = false;
                }
            };
            return; 
        }

        currentClubId = clubData.id; 
        currentClubData = clubData; 

        // RENDER PROFIL KLUB
        const displayName = clubData.short_name || clubData.club_name;
        
        const clubNameEl = document.getElementById('clubNameDisplay');
        const mobileClubNameEl = document.getElementById('mobileClubNameDisplay');
        if (clubNameEl) clubNameEl.innerText = displayName;
        if (mobileClubNameEl) mobileClubNameEl.innerText = displayName;

        const badgesContainer = document.getElementById('clubBadges');
        const mobileBadgesContainer = document.getElementById('mobileClubBadges');
        let badgesHTML = '';
        if (clubData.is_verified) badgesHTML += `<span class="bg-green-100 text-green-700 text-[9px] font-extrabold px-2 py-0.5 rounded-sm tracking-wider uppercase border border-green-200">Verified</span>`;
        if (clubData.tier && clubData.tier !== 'Basic') badgesHTML += `<span class="bg-scsGold text-blue-900 text-[9px] font-extrabold px-2 py-0.5 rounded-sm tracking-wider uppercase">${clubData.tier} Tier</span>`;
        
        if (badgesContainer) badgesContainer.innerHTML = badgesHTML;
        if (mobileBadgesContainer) mobileBadgesContainer.innerHTML = badgesHTML;

        const logoEl = document.getElementById('clubLogoDisplay');
        const mobileLogoEl = document.getElementById('mobileClubLogoDisplay');
        const editLogoPreview = document.getElementById('editLogoPreview'); 
        
        const fallbackLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1e3a8a&color=fff&bold=true`;
        const finalLogo = clubData.logo_url || fallbackLogo;

        if (logoEl) logoEl.src = finalLogo;
        if (mobileLogoEl) mobileLogoEl.src = finalLogo;
        if (editLogoPreview) editLogoPreview.src = finalLogo;

        // TARIK DATA EVENT
        const { data: eventsData, error: eventsErr } = await supabaseClient
            .from('events')
            .select('*')
            .eq('club_id', currentClubId);
        
        const totalEventEl = document.getElementById('valEventAktif');
        if (totalEventEl) totalEventEl.innerText = eventsData ? eventsData.length : 0;

        const eventContainer = document.getElementById('eventListContainer');
        if (eventContainer) {
            let evHTML = '';
            
            // 1. Tampilkan Event Milik Klub
            if (eventsData && eventsData.length > 0) {
                eventsData.forEach(ev => {
                    evHTML += `
                        <div class="border border-emerald-100 bg-white p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-300 transition-all group flex flex-col justify-between">
                            <div>
                                <h3 class="font-extrabold text-emerald-900 text-lg group-hover:text-emerald-700 transition">${ev.event_name}</h3>
                                <p class="text-xs text-gray-500 mt-1 font-mono">🔗 ${ev.subdomain}.funswimming.my.id</p>
                                <p class="text-xs text-gray-500 mt-1">📅 ${ev.event_date} s/d ${ev.end_date}</p>
                            </div>
                            <a href="/event-dashboard.html?id=${ev.id}" class="mt-4 bg-emerald-50 text-emerald-700 text-center text-xs font-bold py-2 rounded-lg hover:bg-emerald-600 hover:text-white transition">Masuk Panel Panitia &raquo;</a>
                        </div>
                    `;
                });
            } else {
                evHTML += `<p class="text-sm text-gray-500 italic">Belum ada event lomba yang dibuat.</p>`;
            }

            // 2. Tambahkan "Trik Hybrid" (Card Pintasan Kalender Publik)
            evHTML += `
                <div class="border-2 border-dashed border-blue-200 bg-blue-50/50 p-4 rounded-2xl hover:border-blue-400 transition-all group flex flex-col justify-center items-center text-center">
                    <span class="text-3xl mb-2 group-hover:scale-110 transition-transform">🌍</span>
                    <h3 class="font-bold text-blue-900 text-base">Jelajahi Kalender Event</h3>
                    <p class="text-xs text-gray-600 mt-1 mb-4">Cari kejuaraan renang terdekat di Provinsi / Kota Anda atau pantau event lainnya.</p>
                    <a href="/event.html" class="bg-blue-600 text-white text-xs font-bold py-2 px-6 rounded-full shadow-md hover:bg-blue-700 transition">Buka Kalender Lomba &raquo;</a>
                </div>
            `;
            
            eventContainer.innerHTML = evHTML;
        }

        // TARIK DATA ATLET
        const { data: athletesData, error: athletesError } = await supabaseClient
            .from('athletes')
            .select('*')
            .eq('club_id', currentClubId);

        if (athletesError) throw athletesError;

        const totalAtletEl = document.getElementById('valTotalAtlet');
        if (totalAtletEl) totalAtletEl.innerText = athletesData.length;

        // Hitung Pending F1 ID
        let pendingCount = athletesData.filter(a => a.is_verified === false).length;
        const pendingEl = document.getElementById('valF1Pending');
        if (pendingEl) pendingEl.innerText = pendingCount;

        // URUTKAN ALFABET DAN RESET FILTER
        allAthletes = athletesData.sort((a, b) => a.full_name.localeCompare(b.full_name));
        filteredAthletes = [...allAthletes]; 
        currentPage = 1;
        renderAthleteTable();

    } catch (error) {
        console.error('Gagal menarik data:', error.message);
        document.getElementById('athleteTableBody').innerHTML = `
            <tr><td colspan="5" class="p-8 text-center text-red-500 font-bold">Gagal memuat data: ${error.message}</td></tr>
        `;
    }
}

// ==========================================
// 2. FUNGSI RENDER TABEL & PAGINATION (LOGIKA F1 ID EMAS)
// ==========================================
function renderAthleteTable() {
    const tbody = document.getElementById('athleteTableBody');
    const pageInd = document.getElementById('pageIndicator');
    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');
    
    if (!tbody) return;
    tbody.innerHTML = ''; 

    if (filteredAthletes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500">Tidak ada atlet yang cocok dengan pencarian.</td></tr>`;
        if(pageInd) pageInd.innerText = `Hal 1 / 1`;
        if(btnPrev) btnPrev.disabled = true;
        if(btnNext) btnNext.disabled = true;
        return;
    }

    const totalPages = Math.ceil(filteredAthletes.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const athletesToShow = filteredAthletes.slice(startIndex, endIndex);

    athletesToShow.forEach((atlet, idx) => {
        const actualIndex = startIndex + idx + 1; 
        const genderIcon = atlet.gender === 'Putra' ? '👦 Putra' : '👧 Putri';
        const avatarUrl = atlet.foto_url ? atlet.foto_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(atlet.full_name)}&background=f3f4f6&color=374151`;
        
        // ✨ LOGIKA EMAS UNTUK F1 ID & STATUS
        const isEmas = atlet.is_verified;
        
        const statusDokumen = isEmas 
            ? '<span class="text-amber-500 text-xs ml-1 drop-shadow-sm" title="Terverifikasi">✅</span>' 
            : '<span class="text-gray-400 text-xs ml-1" title="Menunggu Verifikasi Pusat">⏳</span>';
        
        const f1BadgeClass = isEmas
            ? "inline-flex items-center gap-1 bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-300 text-amber-700 hover:from-amber-200 hover:to-amber-100 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors cursor-pointer group"
            : "inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 hover:border-blue-300 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm transition-colors cursor-pointer group";

        const f1Icon = isEmas 
            ? '<span class="text-amber-500 group-hover:scale-110 transition-transform">👑</span>' 
            : '<span class="text-blue-500 group-hover:scale-110 transition-transform">🌊</span>';

        const f1TextClass = isEmas
            ? "font-mono font-black text-amber-500 hover:text-amber-400 transition-colors cursor-pointer drop-shadow-[0_0_2px_rgba(245,158,11,0.3)]"
            : "font-mono font-bold text-gray-700 hover:text-blue-600 transition-colors cursor-pointer";

        // MENGUBAH URL DARI f1-profile.html KE f1-id.html
        const row = `
            <tr class="hover:bg-blue-50/50 transition-colors group border-b border-gray-50">
                <td class="p-4 text-center font-bold text-gray-400">${actualIndex}</td>
                <td class="p-4">
                    <div class="flex items-center gap-3">
                        <a href="/f1-id.html?id=${atlet.f1_id}" title="Lihat Profil" class="shrink-0">
                            <img src="${avatarUrl}" class="w-10 h-10 rounded-lg object-cover border border-gray-200 shadow-sm hover:scale-105 transition-transform">
                        </a>
                        <div>
                            <a href="/f1-id.html?id=${atlet.f1_id}" class="font-extrabold text-gray-800 hover:text-blue-600 transition-colors" title="Lihat Profil">
                                ${atlet.full_name} 
                            </a>
                            ${statusDokumen}
                            <p class="text-xs text-gray-500">${genderIcon}</p>
                        </div>
                    </div>
                </td>
                <td class="p-4">
                    <div class="flex flex-col items-start gap-1">
                        <a href="/f1-id.html?id=${atlet.f1_id}" class="${f1BadgeClass}" title="Lihat Profil">
                            ${f1Icon} F1 ID
                        </a>
                        <a href="/f1-id.html?id=${atlet.f1_id}" class="${f1TextClass}" title="Lihat Profil">${atlet.f1_id}</a>
                    </div>
                </td>
                <td class="p-4">
                    <p class="font-bold text-gray-700">${atlet.dob}</p>
                </td>
                <td class="p-4 text-center">
                    <div class="flex items-center justify-center gap-4">
                        <button onclick="window.openEditVerify('${atlet.f1_id}')" class="text-blue-600 font-bold text-xs hover:underline flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                            ✏️ Edit / Verif
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    if(pageInd) pageInd.innerText = `Hal ${currentPage} / ${totalPages}`;
    if(btnPrev) btnPrev.disabled = currentPage === 1;
    if(btnNext) btnNext.disabled = currentPage === totalPages;
}


// ==========================================
// 2.5 LOGIKA UNIFIED: EDIT & VERIFIKASI (MAKER-CHECKER)
// ==========================================
const modalEditVerify = document.getElementById('modalEditVerify');
const closeModalEditVerifyBtn = document.getElementById('closeModalEditVerifyBtn');
const btnSaveEditVerify = document.getElementById('btnSaveEditVerify');
const btnQuickVerify = document.getElementById('btnQuickVerify');

if (btnQuickVerify) {
    btnQuickVerify.addEventListener('click', () => {
        filteredAthletes = allAthletes.filter(a => a.is_verified === false);
        currentPage = 1;
        renderAthleteTable();
        document.getElementById('searchKlubAtlet').scrollIntoView({ behavior: 'smooth' });
        alert(`Ditemukan ${filteredAthletes.length} atlet yang belum diverifikasi. Silakan klik tombol 'Edit / Verif' di tabel.`);
    });
}

window.openEditVerify = function(f1_id) {
    const atlet = allAthletes.find(a => a.f1_id === f1_id);
    if (!atlet) return;

    document.getElementById('evF1Id').value = atlet.f1_id;
    document.getElementById('evName').value = atlet.full_name;
    document.getElementById('evDOB').value = atlet.dob;
    document.getElementById('evGender').value = atlet.gender;
    
    document.getElementById('evFoto').value = '';
    document.getElementById('evAkta').value = '';
    
    document.getElementById('evStatusMsg').classList.add('hidden');

    modalEditVerify.classList.remove('hidden');
    setTimeout(() => modalEditVerify.firstElementChild.classList.remove('scale-95'), 10);
};

if(closeModalEditVerifyBtn) {
    closeModalEditVerifyBtn.addEventListener('click', () => {
        modalEditVerify.firstElementChild.classList.add('scale-95');
        setTimeout(() => modalEditVerify.classList.add('hidden'), 200);
    });
}

if(btnSaveEditVerify) {
    btnSaveEditVerify.addEventListener('click', async () => {
        const f1Id = document.getElementById('evF1Id').value;
        const newName = document.getElementById('evName').value.trim();
        const newDOB = document.getElementById('evDOB').value;
        const newGender = document.getElementById('evGender').value;
        
        const fotoFile = document.getElementById('evFoto').files[0];
        const aktaFile = document.getElementById('evAkta').files[0];
        
        const statusMsg = document.getElementById('evStatusMsg');
        const atlet = allAthletes.find(a => a.f1_id === f1Id);

        if (!newName || !newDOB || !newGender) {
            statusMsg.innerText = "Nama, Tanggal Lahir, dan Gender wajib diisi!";
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block mt-2";
            return;
        }

        // Cek apakah ada perubahan data krusial
        const dataBerubah = (newName !== atlet.full_name) || (newDOB !== atlet.dob) || (newGender !== atlet.gender);
        
        if ((!atlet.akta_url && !aktaFile) || (dataBerubah && !aktaFile && !atlet.akta_url)) {
            statusMsg.innerText = "Wajib upload Akta Kelahiran untuk pengajuan verifikasi / perubahan data!";
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block mt-2";
            return;
        }

        btnSaveEditVerify.innerText = "Mengunggah Data...";
        btnSaveEditVerify.disabled = true;
        btnSaveEditVerify.classList.add('opacity-70');
        
        statusMsg.innerText = "Mohon tunggu, sedang mengirim berkas ke server pusat...";
        statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-blue-50 text-blue-600 block mt-2";

        try {
            const timeStamp = Date.now();
            let finalFotoUrl = atlet.foto_url;
            let finalAktaUrl = atlet.akta_url;

            if (fotoFile) {
                const fotoExt = fotoFile.name.split('.').pop();
                const fotoPath = `foto/${f1Id}_${timeStamp}.${fotoExt}`;
                const { error: fotoError } = await supabaseClient.storage.from('berkas-atlet').upload(fotoPath, fotoFile);
                if (fotoError) throw fotoError;
                const { data: fotoUrlData } = supabaseClient.storage.from('berkas-atlet').getPublicUrl(fotoPath);
                finalFotoUrl = fotoUrlData.publicUrl;
            }

            if (aktaFile) {
                const aktaExt = aktaFile.name.split('.').pop();
                const aktaPath = `akta/${f1Id}_${timeStamp}.${aktaExt}`;
                const { error: aktaError } = await supabaseClient.storage.from('berkas-atlet').upload(aktaPath, aktaFile);
                if (aktaError) throw aktaError;
                const { data: aktaUrlData } = supabaseClient.storage.from('berkas-atlet').getPublicUrl(aktaPath);
                finalAktaUrl = aktaUrlData.publicUrl;
            }

            if (dataBerubah) {
                // MASUK ANTRIAN MAKER-CHECKER (f1_edit_requests)
                const { error: editErr } = await supabaseClient
                    .from('f1_edit_requests')
                    .insert({
                        f1_id: f1Id,
                        new_name: newName,
                        new_dob: newDOB,
                        new_gender: newGender,
                        new_foto_url: finalFotoUrl,
                        new_akta_url: finalAktaUrl,
                        status: 'PENDING'
                    });

                if (editErr) throw editErr;

                statusMsg.innerHTML = "✅ <strong>Usulan Edit Terkirim!</strong><br><span class='text-xs font-normal'>Menunggu persetujuan Admin Pusat. Data di layar belum berubah hingga di-ACC.</span>";
                statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-amber-100 text-amber-700 block mt-2";
            } else {
                // UPDATE BIASA (CUMA NAMBAH FOTO/AKTA PERTAMA KALI)
                const { error: updateError } = await supabaseClient
                    .from('athletes')
                    .update({ 
                        foto_url: finalFotoUrl,
                        akta_url: finalAktaUrl,
                        is_verified: false 
                    })
                    .eq('f1_id', f1Id);

                if (updateError) throw updateError;

                statusMsg.innerHTML = "✅ <strong>Berkas berhasil dikirim!</strong><br><span class='text-xs font-normal'>Menunggu verifikasi awal Admin Pusat untuk mengaktifkan F1 ID.</span>";
                statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-green-100 text-green-700 block mt-2";
            }

            setTimeout(() => {
                closeModalEditVerifyBtn.click();
                btnSaveEditVerify.innerText = "Kirim Pengajuan ke Admin";
                btnSaveEditVerify.disabled = false;
                btnSaveEditVerify.classList.remove('opacity-70');
                
                document.getElementById('searchKlubAtlet').value = '';
                fetchDashboardData();
            }, 2500);

        } catch (err) {
            console.error(err);
            statusMsg.innerText = "Gagal memproses: " + err.message;
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block mt-2";
            btnSaveEditVerify.innerText = "Kirim Pengajuan ke Admin";
            btnSaveEditVerify.disabled = false;
            btnSaveEditVerify.classList.remove('opacity-70');
        }
    });
}

// ==========================================
// 3. LOGIC MODAL PENGATURAN KLUB & AKUN
// ==========================================
const btnEditProfilKlub = document.getElementById('btnEditProfilKlub');
const mobileBtnEditProfil = document.getElementById('mobileBtnEditProfil');
const modalEditProfile = document.getElementById('modalEditProfile');
const closeModalProfileBtn = document.getElementById('closeModalProfileBtn');

const tabProfilKlubBtn = document.getElementById('tabProfilKlubBtn');
const tabAkunBtn = document.getElementById('tabAkunBtn');
const formProfilKlub = document.getElementById('formProfilKlub');
const formAkun = document.getElementById('formAkun');

const elProvinsi = document.getElementById('editProvinsi');
const elKota = document.getElementById('editKota');
const eventProvinsi = document.getElementById('inputEventProvinsi');
const eventKota = document.getElementById('inputEventKota');

async function loadProvinsi() {
    try {
        const response = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json');
        const provinces = await response.json();
        
        const defaultOption = '<option value="">-- Pilih Provinsi --</option>';
        if (elProvinsi) elProvinsi.innerHTML = defaultOption;
        if (eventProvinsi) eventProvinsi.innerHTML = defaultOption;

        provinces.forEach(prov => {
            const opt = `<option value="${prov.name}" data-id="${prov.id}">${prov.name}</option>`;
            if (elProvinsi) elProvinsi.innerHTML += opt;
            if (eventProvinsi) eventProvinsi.innerHTML += opt;
        });
    } catch (error) {
        if (elProvinsi) elProvinsi.innerHTML = '<option value="">Gagal memuat API</option>';
        if (eventProvinsi) eventProvinsi.innerHTML = '<option value="">Gagal memuat API</option>';
    }
}
loadProvinsi(); 

// Logika change untuk Form Profil Klub
if (elProvinsi) {
    elProvinsi.addEventListener('change', async function() {
        handleProvinsiChange(this, elKota);
    });
}

// Logika change untuk Form Buat Event
if (eventProvinsi) {
    eventProvinsi.addEventListener('change', async function() {
        handleProvinsiChange(this, eventKota);
    });
}

// Fungsi reusable untuk narik data Kota berdasarkan Provinsi yang dipilih
async function handleProvinsiChange(provElement, kotaElement) {
    const selectedOption = provElement.options[provElement.selectedIndex];
    const provId = selectedOption.getAttribute('data-id');
    
    if (!provId) {
        kotaElement.innerHTML = '<option value="">Pilih Provinsi Dulu</option>';
        kotaElement.disabled = true;
        return;
    }

    kotaElement.innerHTML = '<option value="">Memuat Kota...</option>';
    kotaElement.disabled = true;

    try {
        const response = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provId}.json`);
        const cities = await response.json();
        
        kotaElement.innerHTML = '<option value="">-- Pilih Kota/Kab --</option>';
        cities.forEach(city => {
            kotaElement.innerHTML += `<option value="${city.name}">${city.name}</option>`;
        });
        kotaElement.disabled = false;
    } catch (error) {
        console.error("Gagal load API Kota");
    }
}

function openProfileModal() {
    if (!currentClubData) return;
    
    document.getElementById('editClubName').value = currentClubData.club_name || '';
    document.getElementById('editShortName').value = currentClubData.short_name || '';
    document.getElementById('editCoachName').value = currentClubData.coach_name || '';
    document.getElementById('editContactWa').value = currentClubData.contact_wa || '';
    document.getElementById('editProvinsi').value = currentClubData.provinsi || '';
    
    if(currentClubData.provinsi) {
        document.getElementById('editKota').innerHTML = `<option value="${currentClubData.kota_asal}">${currentClubData.kota_asal}</option>`;
        document.getElementById('editKota').disabled = false;
    }
    
    supabaseClient.auth.getUser().then(({data}) => {
        if(data.user) document.getElementById('editAuthEmail').value = data.user.email;
    });

    document.getElementById('statusProfilMsg').classList.add('hidden');
    document.getElementById('statusAkunMsg').classList.add('hidden');
    
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    if(mobileMenuOverlay && !mobileMenuOverlay.classList.contains('hidden')) {
        document.getElementById('mobileMenuToggle').click(); 
    }

    modalEditProfile.classList.remove('hidden');
    setTimeout(() => modalEditProfile.firstElementChild.classList.remove('scale-95'), 10);
}

if (btnEditProfilKlub) btnEditProfilKlub.addEventListener('click', openProfileModal);
if (mobileBtnEditProfil) mobileBtnEditProfil.addEventListener('click', openProfileModal);

if (closeModalProfileBtn) {
    closeModalProfileBtn.addEventListener('click', () => {
        modalEditProfile.firstElementChild.classList.add('scale-95');
        setTimeout(() => modalEditProfile.classList.add('hidden'), 200);
    });
}

if (tabProfilKlubBtn && tabAkunBtn) {
    tabProfilKlubBtn.addEventListener('click', () => {
        tabProfilKlubBtn.className = "flex-1 py-3 text-sm font-bold text-blue-900 border-b-2 border-blue-900 bg-white";
        tabAkunBtn.className = "flex-1 py-3 text-sm font-bold text-gray-500 border-b-2 border-transparent bg-gray-50 hover:bg-gray-100 transition-colors";
        formProfilKlub.classList.remove('hidden');
        formAkun.classList.add('hidden');
    });
    tabAkunBtn.addEventListener('click', () => {
        tabAkunBtn.className = "flex-1 py-3 text-sm font-bold text-blue-900 border-b-2 border-blue-900 bg-white";
        tabProfilKlubBtn.className = "flex-1 py-3 text-sm font-bold text-gray-500 border-b-2 border-transparent bg-gray-50 hover:bg-gray-100 transition-colors";
        formAkun.classList.remove('hidden');
        formProfilKlub.classList.add('hidden');
    });
}

const btnSaveProfileInfo = document.getElementById('btnSaveProfileInfo');
if (btnSaveProfileInfo) {
    btnSaveProfileInfo.addEventListener('click', async () => {
        const cName = document.getElementById('editClubName').value.trim();
        const cShort = document.getElementById('editShortName').value.trim().toUpperCase();
        const cCoach = document.getElementById('editCoachName').value.trim();
        const cWa = document.getElementById('editContactWa').value.trim();
        const fileLogo = document.getElementById('inputEditLogo').files[0];
        const statusMsg = document.getElementById('statusProfilMsg');
        const cProv = document.getElementById('editProvinsi').value;
        const cKota = document.getElementById('editKota').value;

        if (!cName) {
            statusMsg.innerText = "Nama Klub wajib diisi!";
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block mt-4";
            return;
        }

        btnSaveProfileInfo.innerText = "Menyimpan...";
        btnSaveProfileInfo.disabled = true;

        try {
            let newLogoUrl = currentClubData.logo_url;

            if (fileLogo) {
                const fileExt = fileLogo.name.split('.').pop();
                const fileName = `logo_${currentClubId}_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabaseClient.storage.from('logo-klub').upload(fileName, fileLogo);
                if (uploadError) throw uploadError;
                
                const { data: urlData } = supabaseClient.storage.from('logo-klub').getPublicUrl(fileName);
                newLogoUrl = urlData.publicUrl;
            }

            const { error: updateError } = await supabaseClient
                .from('clubs')
                .update({
                    club_name: cName,
                    short_name: cShort,
                    coach_name: cCoach,
                    contact_wa: cWa,
                    logo_url: newLogoUrl,
                    provinsi: cProv, 
                    kota_asal: cKota 
                })
                .eq('id', currentClubId);

            if (updateError) throw updateError;

            statusMsg.innerText = "✅ Profil klub berhasil diperbarui!";
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-green-100 text-green-600 block mt-4";
            
            setTimeout(() => {
                fetchDashboardData(); 
                closeModalProfileBtn.click();
                btnSaveProfileInfo.innerText = "Simpan Profil Klub";
                btnSaveProfileInfo.disabled = false;
            }, 1500);

        } catch (err) {
            statusMsg.innerText = "Gagal menyimpan: " + err.message;
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block mt-4";
            btnSaveProfileInfo.innerText = "Simpan Profil Klub";
            btnSaveProfileInfo.disabled = false;
        }
    });
}

const btnSaveAuthInfo = document.getElementById('btnSaveAuthInfo');
if (btnSaveAuthInfo) {
    btnSaveAuthInfo.addEventListener('click', async () => {
        const newEmail = document.getElementById('editAuthEmail').value.trim();
        const newPass = document.getElementById('editAuthPassword').value.trim();
        const statusMsg = document.getElementById('statusAkunMsg');

        if (!newEmail && !newPass) return;

        btnSaveAuthInfo.innerText = "Memproses...";
        btnSaveAuthInfo.disabled = true;

        try {
            let updates = {};
            if (newEmail) updates.email = newEmail;
            if (newPass) updates.password = newPass;

            const { data, error } = await supabaseClient.auth.updateUser(updates);
            if (error) throw error;

            statusMsg.innerHTML = "✅ <strong>Berhasil!</strong><br><span class='font-normal text-xs'>Jika Anda mengubah email, silakan cek inbox email lama dan email baru Anda untuk konfirmasi.</span>";
            statusMsg.className = "text-sm text-center rounded-lg p-3 bg-green-100 text-green-700 block mt-4";
            document.getElementById('editAuthPassword').value = '';

            setTimeout(() => {
                btnSaveAuthInfo.innerText = "Terapkan Perubahan Akun";
                btnSaveAuthInfo.disabled = false;
            }, 3000);

        } catch (err) {
            statusMsg.innerText = "Gagal mengubah: " + err.message;
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block mt-4";
            btnSaveAuthInfo.innerText = "Terapkan Perubahan Akun";
            btnSaveAuthInfo.disabled = false;
        }
    });
}

// ==========================================
// 4. LOGIC MODAL TAMBAH ATLET & BUAT EVENT
// ==========================================
const btnAddAthlete = document.getElementById('btnAddAthlete');
const modalAddAthlete = document.getElementById('modalAddAthlete');
const closeModalBtn = document.getElementById('closeModalBtn');
const btnSaveAthlete = document.getElementById('btnSaveAthlete');
const btnProsesExcel = document.getElementById('btnProsesExcel');

const btnCreateEvent = document.getElementById('btnCreateEvent');
const modalCreateEvent = document.getElementById('modalCreateEvent');
const closeModalEventBtn = document.getElementById('closeModalEventBtn');
const btnSaveEvent = document.getElementById('btnSaveEvent');

if (btnAddAthlete && modalAddAthlete && closeModalBtn) {
    btnAddAthlete.addEventListener('click', () => {
        modalAddAthlete.classList.remove('hidden');
        setTimeout(() => modalAddAthlete.firstElementChild.classList.remove('scale-95'), 10);
    });

    closeModalBtn.addEventListener('click', () => {
        modalAddAthlete.firstElementChild.classList.add('scale-95');
        setTimeout(() => modalAddAthlete.classList.add('hidden'), 200);
    });

    const tabManualBtn = document.getElementById('tabManualBtn');
    const tabExcelBtn = document.getElementById('tabExcelBtn');
    const sectionManual = document.getElementById('sectionManual');
    const sectionExcel = document.getElementById('sectionExcel');
    const statusMsg = document.getElementById('statusMsg');

    if(tabManualBtn && tabExcelBtn) {
        tabManualBtn.addEventListener('click', () => {
            tabManualBtn.className = "flex-1 py-1.5 bg-white shadow-sm rounded-md text-sm font-bold text-blue-900 transition-all";
            tabExcelBtn.className = "flex-1 py-1.5 text-gray-500 text-sm font-bold hover:text-blue-900 transition-all";
            sectionManual.classList.remove('hidden');
            sectionExcel.classList.add('hidden');
            btnSaveAthlete.classList.remove('hidden');
            btnProsesExcel.classList.add('hidden');
            statusMsg.classList.add('hidden');
        });

        tabExcelBtn.addEventListener('click', () => {
            tabExcelBtn.className = "flex-1 py-1.5 bg-white shadow-sm rounded-md text-sm font-bold text-blue-900 transition-all";
            tabManualBtn.className = "flex-1 py-1.5 text-gray-500 text-sm font-bold hover:text-blue-900 transition-all";
            sectionExcel.classList.remove('hidden');
            sectionManual.classList.add('hidden');
            btnProsesExcel.classList.remove('hidden');
            btnProsesExcel.style.display = 'flex';
            btnSaveAthlete.classList.add('hidden');
            statusMsg.classList.add('hidden');
        });
    }
}

if (btnSaveAthlete) {
    btnSaveAthlete.addEventListener('click', async () => {
        const inputNama = document.getElementById('inputNama').value.trim();
        const inputDOB = document.getElementById('inputDOB').value;
        const inputGender = document.getElementById('inputGender').value;
        const statusMsg = document.getElementById('statusMsg');

        if (!inputNama || !inputDOB) {
            statusMsg.innerText = "Nama dan Tanggal Lahir wajib diisi!";
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block";
            return;
        }

        if (!currentClubId) return;

        btnSaveAthlete.innerText = "Memproses...";
        btnSaveAthlete.disabled = true;

        try {
            const dateObj = new Date(inputDOB);
            const yy = dateObj.getFullYear().toString().slice(-2);
            const mm = ('0' + (dateObj.getMonth() + 1)).slice(-2);
            const random3 = Math.floor(Math.random() * 900) + 100;
            const generatedF1Id = `F1-${yy}${mm}${random3}`;

            const { error } = await supabaseClient
                .from('athletes')
                .insert([{
                    f1_id: generatedF1Id,
                    full_name: inputNama,
                    dob: inputDOB,
                    gender: inputGender,
                    club_id: currentClubId 
                }]);

            if (error) {
                if (error.code === '23505') throw new Error("Gagal! Atlet dengan Nama dan Tanggal Lahir tersebut sudah terdaftar di database.");
                throw error;
            }

            statusMsg.innerText = `Berhasil! F1 ID: ${generatedF1Id}`;
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-green-100 text-green-600 block";

            document.getElementById('inputNama').value = '';
            document.getElementById('inputDOB').value = '';

            setTimeout(() => {
                closeModalBtn.click();
                btnSaveAthlete.innerText = "Simpan & Generate F1 ID";
                btnSaveAthlete.disabled = false;
                statusMsg.classList.add('hidden');
                fetchDashboardData();
            }, 1500);

        } catch (err) {
            statusMsg.innerText = err.message;
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block";
            btnSaveAthlete.innerText = "Simpan & Generate F1 ID";
            btnSaveAthlete.disabled = false;
        }
    });
}

if (btnProsesExcel) {
    btnProsesExcel.addEventListener('click', async () => {
        const fileInput = document.getElementById('inputExcel');
        const statusMsg = document.getElementById('statusMsg');

        if (!fileInput.files.length) {
            statusMsg.innerText = "Pilih file Excel/CSV terlebih dahulu!";
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block mt-3";
            return;
        }

        if (!currentClubId) return;

        const file = fileInput.files[0];
        btnProsesExcel.innerHTML = "Membaca data file...";
        btnProsesExcel.disabled = true;
        btnProsesExcel.classList.add('opacity-70');

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheet = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheet];
                const excelData = XLSX.utils.sheet_to_json(worksheet, {header: 1});

                excelData.shift();

                const athletesToInsert = [];

                excelData.forEach(row => {
                    if (row.length >= 2) {
                        const nama = row[0];
                        let dob = row[1];
                        let gender = row[2] || 'Putra';

                        if (typeof dob === 'number') {
                            const dateObj = new Date(Math.round((dob - 25569) * 86400 * 1000));
                            dob = dateObj.toISOString().split('T')[0];
                        }

                        if (nama && dob) {
                            const dateD = new Date(dob);
                            const yy = dateD.getFullYear().toString().slice(-2);
                            const mm = ('0' + (dateD.getMonth() + 1)).slice(-2);
                            const random3 = Math.floor(Math.random() * 900) + 100;
                            const generatedF1Id = `F1-${yy}${mm}${random3}`;

                            athletesToInsert.push({
                                f1_id: generatedF1Id,
                                full_name: nama,
                                dob: dob,
                                gender: gender,
                                club_id: currentClubId 
                            });
                        }
                    }
                });

                if (athletesToInsert.length === 0) throw new Error("Data kosong atau format tabel salah.");

                btnProsesExcel.innerHTML = `Menyuntik ${athletesToInsert.length} atlet ke Database...`;

                const { error } = await supabaseClient
                    .from('athletes')
                    .insert(athletesToInsert);

                if (error) {
                    if (error.code === '23505') throw new Error("Gagal! Terdapat atlet duplikat di dalam file Excel Anda.");
                    throw error;
                }

                statusMsg.innerText = `BOOM! Berhasil import ${athletesToInsert.length} atlet baru!`;
                statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-green-100 text-green-600 block mt-3";

                document.getElementById('inputExcel').value = '';

                setTimeout(() => {
                    closeModalBtn.click();
                    btnProsesExcel.innerHTML = "Mulai Import Data";
                    btnProsesExcel.disabled = false;
                    btnProsesExcel.classList.remove('opacity-70');
                    statusMsg.classList.add('hidden');
                    fetchDashboardData();
                }, 2000);

            } catch (err) {
                statusMsg.innerText = "Gagal import: " + err.message;
                statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block mt-3";
                btnProsesExcel.innerHTML = "Mulai Import Data";
                btnProsesExcel.disabled = false;
                btnProsesExcel.classList.remove('opacity-70');
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

if (btnCreateEvent && modalCreateEvent && closeModalEventBtn) {
    btnCreateEvent.addEventListener('click', () => {
        modalCreateEvent.classList.remove('hidden');
        setTimeout(() => modalCreateEvent.firstElementChild.classList.remove('scale-95'), 10);
    });

    closeModalEventBtn.addEventListener('click', () => {
        modalCreateEvent.firstElementChild.classList.add('scale-95');
        setTimeout(() => modalCreateEvent.classList.add('hidden'), 200);
    });
}

if (btnSaveEvent) {
    btnSaveEvent.addEventListener('click', async () => {
        const inputEventName = document.getElementById('inputEventName').value.trim();
        let inputSubdomain = document.getElementById('inputSubdomain').value.trim().toLowerCase();
        const inputEventStartDate = document.getElementById('inputEventStartDate').value;
        const inputEventEndDate = document.getElementById('inputEventEndDate').value;
        const inputProvinsi = document.getElementById('inputEventProvinsi').value; 
        const inputKota = document.getElementById('inputEventKota').value; 
        const statusMsg = document.getElementById('eventStatusMsg');

        inputSubdomain = inputSubdomain.replace(/[^a-z0-9-]/g, '');

        if (!inputEventName || !inputSubdomain || !inputEventStartDate || !inputEventEndDate || !inputProvinsi || !inputKota) {
            statusMsg.innerText = "Semua kolom wajib diisi, termasuk Provinsi & Kota!";
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block";
            return;
        }

        if (!currentClubId) return;

        if (new Date(inputEventEndDate) < new Date(inputEventStartDate)) {
            statusMsg.innerText = "Tanggal Selesai tidak boleh mendahului Tanggal Mulai!";
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block";
            return;
        }

        btnSaveEvent.innerText = "Memproses...";
        btnSaveEvent.disabled = true;

        try {
            const { data, error } = await supabaseClient
                .from('events')
                .insert([{
                    event_name: inputEventName,
                    subdomain: inputSubdomain,
                    event_date: inputEventStartDate,
                    end_date: inputEventEndDate,
                    provinsi: inputProvinsi, 
                    kota: inputKota,         
                    club_id: currentClubId 
                }])
                .select()
                .single();

            if (error) throw error;

            statusMsg.innerText = "Event berhasil dibuat! Mengalihkan ke Dashboard Event...";
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-green-100 text-green-600 block";

            setTimeout(() => {
                window.location.href = `/event-dashboard.html?id=${data.id}`;
            }, 1500);

        } catch (err) {
            statusMsg.innerText = "Gagal membuat event: " + err.message;
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block";
            btnSaveEvent.innerText = "Buat Event Sekarang";
            btnSaveEvent.disabled = false;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    let clickCount = 0;
    let clickTimer;

    const secretBtn = document.getElementById('secretAdminTrigger');
    
    if(secretBtn) {
        secretBtn.addEventListener('click', () => {
            clickCount++;
            clearTimeout(clickTimer);
            
            if (clickCount === 1) {
                secretBtn.style.color = "#3b82f6"; 
                secretBtn.style.transform = "scale(1.05)";
            } 
            else if (clickCount === 2) {
                secretBtn.style.color = "#f59e0b"; 
                secretBtn.style.transform = "scale(1.1)";
            } 
            else if (clickCount === 3) {
                secretBtn.style.color = "#ef4444"; // Merah
                secretBtn.style.textShadow = "0 0 15px rgba(239,68,68,0.8)";
                secretBtn.style.transform = "scale(1.2)";
                

                sessionStorage.setItem('aztec_key', 'buka_sesame');


                setTimeout(() => {
                    window.location.href = '/admin.html';
                }, 500);
                
                clickCount = 0;
                return;
            }


            clickTimer = setTimeout(() => {
                clickCount = 0;
                secretBtn.style.color = ""; 
                secretBtn.style.transform = "scale(1)";
                secretBtn.style.textShadow = "none";
            }, 2000);
        });
    }
});
