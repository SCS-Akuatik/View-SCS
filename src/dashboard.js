import { supabaseClient } from './supabase.js';

// ==========================================
// STATE GLOBAL UNTUK APLIKASI
// ==========================================
let allAthletes = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentClubId = null; // Menyimpan ID Klub yang sedang login

document.addEventListener('DOMContentLoaded', async () => {
    // Tombol Keluar
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = '/auth.html';
        });
    }

    // Logic Klik Tombol Pagination (Geser Kanan Kiri)
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
            const totalPages = Math.ceil(allAthletes.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderAthleteTable();
            }
        });
    }

    // Jalankan fungsi tarik data utama!
    fetchDashboardData();
});

// ==========================================
// 1. FUNGSI TARIK DATA DASHBOARD (FULL DINAMIS)
// ==========================================
async function fetchDashboardData() {
    try {
        // --- A. CEK SESI LOGIN ---
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError || !session) {
            window.location.href = '/auth.html';
            return;
        }

        const userId = session.user.id; 

        // --- B. CARI KLUB MILIK USER INI ---
        const { data: clubData, error: clubError } = await supabaseClient
            .from('clubs')
            .select('*')
            .eq('owner_id', userId)
            .single();

        if (clubError || !clubData) {
            document.getElementById('athleteTableBody').innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500 font-bold">Akun Anda belum terhubung dengan klub manapun. Hubungi Admin.</td></tr>`;
            return;
        }

        currentClubId = clubData.id; // SET GLOBAL VARIABEL

        // --- C. RENDER PROFIL KLUB DI ATAS ---
        const clubNameEl = document.getElementById('clubNameDisplay');
        if (clubNameEl) clubNameEl.innerText = clubData.club_name;

        const badgesContainer = document.getElementById('clubBadges');
        let badgesHTML = '';
        if (clubData.is_verified) badgesHTML += `<span class="bg-green-100 text-green-700 text-[9px] font-extrabold px-2 py-0.5 rounded-sm tracking-wider uppercase border border-green-200">Verified</span>`;
        if (clubData.tier && clubData.tier !== 'Basic') badgesHTML += `<span class="bg-scsGold text-blue-900 text-[9px] font-extrabold px-2 py-0.5 rounded-sm tracking-wider uppercase">${clubData.tier} Tier</span>`;
        if (badgesContainer) badgesContainer.innerHTML = badgesHTML;

        const logoEl = document.getElementById('clubLogoDisplay');
        const tooltipEl = document.getElementById('logoTooltip');
        if (logoEl && tooltipEl) {
            if (clubData.logo_url) {
                logoEl.src = clubData.logo_url;
                tooltipEl.innerText = "Ganti Logo Klub";
            } else {
                const encodedName = encodeURIComponent(clubData.short_name || clubData.club_name);
                logoEl.src = `https://ui-avatars.com/api/?name=${encodedName}&background=1e3a8a&color=fff&bold=true`;
                tooltipEl.innerHTML = `Upload emblem/logo club <div class="absolute -top-2 right-4 w-4 h-4 bg-gray-900 transform rotate-45"></div>`;
            }
        }

        // --- D. TARIK DATA EVENT MILIK KLUB INI ---
        const { data: eventsData, error: eventsErr } = await supabaseClient
            .from('events')
            .select('*')
            .eq('club_id', currentClubId);
        
        const totalEventEl = document.getElementById('valEventAktif');
        if (totalEventEl) totalEventEl.innerText = eventsData ? eventsData.length : 0;

        // Render Card Event Lomba
        const eventContainer = document.getElementById('eventListContainer');
        if (eventContainer) {
            if (!eventsData || eventsData.length === 0) {
                eventContainer.innerHTML = `<p class="text-sm text-gray-500 italic col-span-full">Belum ada event lomba yang dibuat. Silakan klik 'Buat Event' di menu Aksi Cepat.</p>`;
            } else {
                let evHTML = '';
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
                eventContainer.innerHTML = evHTML;
            }
        }

        // --- E. TARIK DATA ATLET MILIK KLUB INI ---
        const { data: athletesData, error: athletesError } = await supabaseClient
            .from('athletes')
            .select('*')
            .eq('club_id', currentClubId);

        if (athletesError) throw athletesError;

        const totalAtletEl = document.getElementById('valTotalAtlet');
        if (totalAtletEl) totalAtletEl.innerText = athletesData.length;

        // Render Dropdown Verifikasi
        const selectVerify = document.getElementById('inputVerifyAthlete');
        if (selectVerify) {
            selectVerify.innerHTML = '<option value="">-- Pilih Atlet (Hanya yang belum lengkap) --</option>';
            let pendingCount = 0;
            athletesData.forEach(atlet => {
                if (!atlet.foto_url || !atlet.akta_url) {
                    selectVerify.innerHTML += `<option value="${atlet.f1_id}">${atlet.full_name} (${atlet.f1_id})</option>`;
                    pendingCount++;
                }
            });
            const pendingEl = document.getElementById('valF1Pending');
            if (pendingEl) pendingEl.innerText = pendingCount;
        }

        // F. URUTKAN ALFABET, SIMPAN KE MEMORI, LALU RENDER HALAMAN 1
        allAthletes = athletesData.sort((a, b) => a.full_name.localeCompare(b.full_name));
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
// 3. FUNGSI RENDER TABEL & PAGINATION
// ==========================================
function renderAthleteTable() {
    const tbody = document.getElementById('athleteTableBody');
    const pageInd = document.getElementById('pageIndicator');
    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');
    
    if (!tbody) return;
    tbody.innerHTML = ''; 

    if (allAthletes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500">Belum ada atlet yang terdaftar di klub ini.</td></tr>`;
        if(pageInd) pageInd.innerText = `Hal 1 / 1`;
        if(btnPrev) btnPrev.disabled = true;
        if(btnNext) btnNext.disabled = true;
        return;
    }

    // Hitung Slice per Halaman
    const totalPages = Math.ceil(allAthletes.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const athletesToShow = allAthletes.slice(startIndex, endIndex);

    athletesToShow.forEach((atlet, idx) => {
        const actualIndex = startIndex + idx + 1; // Nomor urut lanjut terus
        const genderIcon = atlet.gender === 'Putra' ? '👦 Putra' : '👧 Putri';
        const avatarUrl = atlet.foto_url ? atlet.foto_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(atlet.full_name)}&background=f3f4f6&color=374151`;
        const statusDokumen = (atlet.foto_url && atlet.akta_url) ? '<span class="text-green-500 text-xs ml-1" title="Terverifikasi">✅</span>' : '';

        const row = `
            <tr class="hover:bg-blue-50/50 transition-colors group border-b border-gray-50">
                <td class="p-4 text-center font-bold text-gray-400">${actualIndex}</td>
                <td class="p-4">
                    <div class="flex items-center gap-3">
                        <img src="${avatarUrl}" class="w-10 h-10 rounded-lg object-cover border border-gray-200 shadow-sm">
                        <div>
                            <p class="font-extrabold text-gray-800">${atlet.full_name} ${statusDokumen}</p>
                            <p class="text-xs text-gray-500">${genderIcon}</p>
                        </div>
                    </div>
                </td>
                <td class="p-4">
                    <div class="flex flex-col items-start gap-1">
                        <span class="inline-flex items-center gap-1 bg-blue-50 text-scsBlue border border-blue-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm">
                            <span class="text-blue-500">🌊</span> F1 ID
                        </span>
                        <span class="font-mono font-bold text-gray-700 text-xs">${atlet.f1_id}</span>
                    </div>
                </td>
                <td class="p-4">
                    <p class="font-bold text-gray-700">${atlet.dob}</p>
                </td>
                <td class="p-4 text-center">
                    <div class="flex items-center justify-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <a href="/f1-profile.html" class="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition" title="Lihat Profil">👁️</a>
                    </div>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    // Update Tombol Kiri Kanan
    if(pageInd) pageInd.innerText = `Hal ${currentPage} / ${totalPages}`;
    if(btnPrev) btnPrev.disabled = currentPage === 1;
    if(btnNext) btnNext.disabled = currentPage === totalPages;
}

// ==========================================
// 4. LOGIC MODAL (TAMBAH, VERIFIKASI, EVENT)
// ==========================================

const btnAddAthlete = document.getElementById('btnAddAthlete');
const modalAddAthlete = document.getElementById('modalAddAthlete');
const closeModalBtn = document.getElementById('closeModalBtn');
const btnSaveAthlete = document.getElementById('btnSaveAthlete');
const btnProsesExcel = document.getElementById('btnProsesExcel');

const btnVerify = document.getElementById('btnVerify');
const modalVerifyAthlete = document.getElementById('modalVerifyAthlete');
const closeModalVerifyBtn = document.getElementById('closeModalVerifyBtn');
const btnSubmitVerify = document.getElementById('btnSubmitVerify');

const btnCreateEvent = document.getElementById('btnCreateEvent');
const modalCreateEvent = document.getElementById('modalCreateEvent');
const closeModalEventBtn = document.getElementById('closeModalEventBtn');
const btnSaveEvent = document.getElementById('btnSaveEvent');

// --- A. LOGIC TAMBAH ATLET (Tab Switcher & Upload) ---
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

// 1. Simpan Manual
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

        if (!currentClubId) {
            statusMsg.innerText = "Kesalahan Sistem: ID Klub tidak ditemukan.";
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block";
            return;
        }

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
                    club_id: currentClubId // SEKARANG MENGGUNAKAN ID KLUB AKTIF
                }]);

            if (error) throw error;

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
            console.error(err);
            statusMsg.innerText = "Gagal menyimpan data: " + err.message;
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block";
            btnSaveAthlete.innerText = "Simpan & Generate F1 ID";
            btnSaveAthlete.disabled = false;
        }
    });
}

// 2. Import Excel
if (btnProsesExcel) {
    btnProsesExcel.addEventListener('click', async () => {
        const fileInput = document.getElementById('inputExcel');
        const statusMsg = document.getElementById('statusMsg');

        if (!fileInput.files.length) {
            statusMsg.innerText = "Pilih file Excel/CSV terlebih dahulu!";
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block mt-3";
            return;
        }

        if (!currentClubId) {
            statusMsg.innerText = "Kesalahan Sistem: ID Klub tidak ditemukan.";
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block mt-3";
            return;
        }

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
                                club_id: currentClubId // MENGGUNAKAN ID KLUB AKTIF
                            });
                        }
                    }
                });

                if (athletesToInsert.length === 0) throw new Error("Data kosong atau format tabel salah.");

                btnProsesExcel.innerHTML = `Menyuntik ${athletesToInsert.length} atlet ke Database...`;

                const { error } = await supabaseClient
                    .from('athletes')
                    .insert(athletesToInsert);

                if (error) throw error;

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
                console.error(err);
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

// --- B. LOGIC VERIFIKASI ---
if (btnVerify && modalVerifyAthlete && closeModalVerifyBtn) {
    btnVerify.addEventListener('click', () => {
        modalVerifyAthlete.classList.remove('hidden');
        setTimeout(() => modalVerifyAthlete.firstElementChild.classList.remove('scale-95'), 10);
    });

    closeModalVerifyBtn.addEventListener('click', () => {
        modalVerifyAthlete.firstElementChild.classList.add('scale-95');
        setTimeout(() => modalVerifyAthlete.classList.add('hidden'), 200);
    });
}

if (btnSubmitVerify) {
    btnSubmitVerify.addEventListener('click', async () => {
        const f1Id = document.getElementById('inputVerifyAthlete').value;
        const fotoFile = document.getElementById('inputFoto').files[0];
        const aktaFile = document.getElementById('inputAkta').files[0];
        const statusMsg = document.getElementById('verifyStatusMsg');

        if (!f1Id || !fotoFile || !aktaFile) {
            statusMsg.innerText = "Atlet, Foto, dan Akta Kelahiran wajib dilengkapi!";
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block";
            return;
        }

        btnSubmitVerify.innerText = "Mengunggah Dokumen...";
        btnSubmitVerify.disabled = true;
        btnSubmitVerify.classList.add('opacity-70');
        statusMsg.innerText = "Mohon tunggu, sedang mengirim berkas ke server...";
        statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-blue-50 text-blue-600 block";

        try {
            const timeStamp = Date.now();

            const fotoExt = fotoFile.name.split('.').pop();
            const fotoPath = `foto/${f1Id}_${timeStamp}.${fotoExt}`;
            const { error: fotoError } = await supabaseClient.storage.from('berkas-atlet').upload(fotoPath, fotoFile);
            if (fotoError) throw fotoError;
            const { data: fotoUrlData } = supabaseClient.storage.from('berkas-atlet').getPublicUrl(fotoPath);

            const aktaExt = aktaFile.name.split('.').pop();
            const aktaPath = `akta/${f1Id}_${timeStamp}.${aktaExt}`;
            const { error: aktaError } = await supabaseClient.storage.from('berkas-atlet').upload(aktaPath, aktaFile);
            if (aktaError) throw aktaError;
            const { data: aktaUrlData } = supabaseClient.storage.from('berkas-atlet').getPublicUrl(aktaPath);

            const { error: updateError } = await supabaseClient
                .from('athletes')
                .update({ foto_url: fotoUrlData.publicUrl, akta_url: aktaUrlData.publicUrl })
                .eq('f1_id', f1Id);

            if (updateError) throw updateError;

            statusMsg.innerHTML = "✅ <strong>Berkas berhasil diunggah!</strong><br><br><span class='font-normal text-[11px] leading-relaxed block mt-1'>Tim Verifikator akan melakukan peninjauan. Status atlet akan otomatis aktif setelah disetujui.</span>";
            statusMsg.className = "text-sm text-center rounded-lg p-4 bg-amber-50 border border-amber-200 text-amber-800 block";

            document.getElementById('inputVerifyAthlete').value = '';
            document.getElementById('inputFoto').value = '';
            document.getElementById('inputAkta').value = '';

            fetchDashboardData();

            setTimeout(() => {
                modalVerifyAthlete.firstElementChild.classList.add('scale-95');
                setTimeout(() => {
                    modalVerifyAthlete.classList.add('hidden');
                    btnSubmitVerify.innerText = "Kirim Dokumen Verifikasi";
                    btnSubmitVerify.disabled = false;
                    btnSubmitVerify.classList.remove('opacity-70');
                    statusMsg.classList.add('hidden');
                }, 200);
            }, 5000);

        } catch (err) {
            console.error(err);
            statusMsg.innerText = "Gagal mengunggah dokumen: " + err.message;
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block";
            btnSubmitVerify.innerText = "Kirim Dokumen Verifikasi";
            btnSubmitVerify.disabled = false;
            btnSubmitVerify.classList.remove('opacity-70');
        }
    });
}

// --- C. LOGIC BUAT EVENT ---
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
        const statusMsg = document.getElementById('eventStatusMsg');

        inputSubdomain = inputSubdomain.replace(/[^a-z0-9-]/g, '');

        if (!inputEventName || !inputSubdomain || !inputEventStartDate || !inputEventEndDate) {
            statusMsg.innerText = "Semua kolom wajib diisi!";
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block";
            return;
        }

        if (!currentClubId) {
            statusMsg.innerText = "Kesalahan Sistem: ID Klub tidak ditemukan.";
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block";
            return;
        }

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
                    club_id: currentClubId // MENGGUNAKAN ID KLUB AKTIF
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
            console.error(err);
            statusMsg.innerText = "Gagal membuat event: " + err.message;
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block";
            btnSaveEvent.innerText = "Buat Event Sekarang";
            btnSaveEvent.disabled = false;
        }
    });
}
// ==========================================
// 5. LOGIC UPLOAD LOGO KLUB (AKAL-AKALAN DEVELOPER)
// ==========================================
const logoUploadContainer = document.getElementById('logoUploadContainer');
const inputLogoKlub = document.getElementById('inputLogoKlub');
const logoTooltip = document.getElementById('logoTooltip');

if (logoUploadContainer && inputLogoKlub) {
    // 1. Saat foto/avatar diklik, buka file picker
    logoUploadContainer.addEventListener('click', () => {
        if (!currentClubId) {
            alert("Sistem belum selesai memuat ID Klub. Silakan tunggu sebentar.");
            return;
        }
        inputLogoKlub.click();
    });

    // 2. Saat user selesai milih file gambar
    inputLogoKlub.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Ganti teks tooltip biar ada indikator loading
        const originalTooltip = logoTooltip.innerHTML;
        logoTooltip.innerHTML = "Mengunggah... ⏳";
        
        try {
            // A. Upload ke Storage Supabase
            const fileExt = file.name.split('.').pop();
            const fileName = `logo_${currentClubId}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`; // Simpan langsung di root bucket logo-klub

            const { error: uploadError } = await supabaseClient.storage
                .from('logo-klub')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // B. Dapatkan URL Public-nya
            const { data: urlData } = supabaseClient.storage
                .from('logo-klub')
                .getPublicUrl(filePath);

            // C. Update kolom logo_url di tabel clubs
            const { error: updateError } = await supabaseClient
                .from('clubs')
                .update({ logo_url: urlData.publicUrl })
                .eq('id', currentClubId);

            if (updateError) throw updateError;

            // D. Sukses! Refresh tampilan biar logo baru langsung nongol
            logoTooltip.innerHTML = "Berhasil! ✅";
            setTimeout(() => {
                fetchDashboardData(); 
                logoTooltip.innerHTML = originalTooltip;
            }, 1000);

        } catch (error) {
            console.error(error);
            alert("Gagal mengunggah logo: " + error.message);
            logoTooltip.innerHTML = originalTooltip;
        }
        
        // Reset input file biar bisa upload foto yang sama lagi kalau mau
        inputLogoKlub.value = '';
    });
}
