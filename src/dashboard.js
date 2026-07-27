import { supabaseClient } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Tombol Keluar
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = '/auth.html';
        });
    }

    // Jalankan fungsi tarik data!
    fetchDashboardData();
});

// ==========================================
// ==========================================
// 1. FUNGSI TARIK DATA DASHBOARD
// ==========================================
async function fetchDashboardData() {
    try {
        const dummyClubId = 1;

        // TARIK DATA KLUB (Logo, Tier, & Verifikasi)
        const { data: clubData, error: clubError } = await supabaseClient
            .from('clubs')
            .select('*')
            .eq('id', dummyClubId)
            .single();

        if (clubError) throw clubError;
        
        const clubNameEl = document.getElementById('clubNameDisplay');
        if (clubNameEl) clubNameEl.innerText = clubData.club_name;

        // --- Logic Badge Dinamis ---
        const badgesContainer = document.getElementById('clubBadges');
        let badgesHTML = '';
        if (clubData.is_verified) {
            badgesHTML += `<span class="bg-green-100 text-green-700 text-[9px] font-extrabold px-2 py-0.5 rounded-sm tracking-wider uppercase border border-green-200">Verified</span>`;
        }
        if (clubData.tier && clubData.tier !== 'Basic') {
            badgesHTML += `<span class="bg-scsGold text-blue-900 text-[9px] font-extrabold px-2 py-0.5 rounded-sm tracking-wider uppercase">${clubData.tier} Tier</span>`;
        }
        if (badgesContainer) badgesContainer.innerHTML = badgesHTML;

        // --- Logic Logo Klub Dinamis ---
        const logoEl = document.getElementById('clubLogoDisplay');
        const tooltipEl = document.getElementById('logoTooltip');
        if (logoEl && tooltipEl) {
            if (clubData.logo_url) {
                logoEl.src = clubData.logo_url;
                tooltipEl.innerText = "Ganti Logo Klub"; 
            } else {
                const encodedName = encodeURIComponent(clubData.club_name);
                logoEl.src = `https://ui-avatars.com/api/?name=${encodedName}&background=1e3a8a&color=fff&bold=true`;
                tooltipEl.innerHTML = `Upload emblem/logo club <div class="absolute -top-2 right-4 w-4 h-4 bg-gray-900 transform rotate-45"></div>`;
            }
        }

        // HITUNG & TARIK DATA ATLET
        const { data: athletesData, error: athletesError } = await supabaseClient
            .from('athletes')
            .select('*')
            .eq('club_id', dummyClubId);

        if (athletesError) throw athletesError;

        const totalAtletEl = document.getElementById('valTotalAtlet');
        if (totalAtletEl) totalAtletEl.innerText = athletesData.length;

        // TARIK JUMLAH EVENT
        const { count: eventCount } = await supabaseClient
            .from('events')
            .select('*', { count: 'exact', head: true });
        
        const totalEventEl = document.getElementById('valEventAktif');
        if (totalEventEl) totalEventEl.innerText = eventCount || 0;

        // --- INJEKSI DROPDOWN VERIFIKASI ---
        const selectVerify = document.getElementById('inputVerifyAthlete');
        if (selectVerify) {
            // Kosongkan dulu lalu beri opsi default
            selectVerify.innerHTML = '<option value="">-- Pilih Atlet (Hanya yang belum lengkap) --</option>';
            
            // Looping data atlet, filter yang belum punya foto ATAU akta
            let pendingCount = 0;
            athletesData.forEach(atlet => {
                if (!atlet.foto_url || !atlet.akta_url) {
                    selectVerify.innerHTML += `<option value="${atlet.f1_id}">${atlet.full_name} (${atlet.f1_id})</option>`;
                    pendingCount++;
                }
            });

            // Update angka "F1 ID Pending" di statistik atas (bonus UX!)
            const pendingEl = document.getElementById('valF1Pending');
            if (pendingEl) pendingEl.innerText = pendingCount;
        }

        // RENDER TABEL (Di-reverse agar data yang baru masuk tampil di atas)
        renderAthleteTable(athletesData.reverse());

    } catch (error) {
        console.error('Gagal menarik data dari Supabase:', error.message);
        document.getElementById('athleteTableBody').innerHTML = `
            <tr><td colspan="5" class="p-8 text-center text-red-500 font-bold">Gagal memuat data: ${error.message}</td></tr>
        `;
    }
}


        // HITUNG & TARIK DATA ATLET
        const { data: athletesData, error: athletesError } = await supabaseClient
            .from('athletes')
            .select('*')
            .eq('club_id', dummyClubId);

        if (athletesError) throw athletesError;

        const totalAtletEl = document.getElementById('valTotalAtlet');
        if (totalAtletEl) totalAtletEl.innerText = athletesData.length;

        // TARIK JUMLAH EVENT
        const { count: eventCount } = await supabaseClient
            .from('events')
            .select('*', { count: 'exact', head: true });
        
        const totalEventEl = document.getElementById('valEventAktif');
        if (totalEventEl) totalEventEl.innerText = eventCount || 0;

        // RENDER TABEL (Di-reverse agar data yang baru masuk tampil di atas)
        renderAthleteTable(athletesData.reverse());

    } catch (error) {
        console.error('Gagal menarik data dari Supabase:', error.message);
        document.getElementById('athleteTableBody').innerHTML = `
            <tr><td colspan="5" class="p-8 text-center text-red-500 font-bold">Gagal memuat data: ${error.message}</td></tr>
        `;
    }
}

// Fungsi Render Tabel HTML
function renderAthleteTable(athletes) {
    const tbody = document.getElementById('athleteTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = ''; 

    if (athletes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500">Belum ada atlet yang terdaftar di klub ini.</td></tr>`;
        return;
    }

    athletes.forEach((atlet, index) => {
        const genderIcon = atlet.gender === 'Putra' ? '👦 Putra' : '👧 Putri';
        const avatarUrl = atlet.foto_url ? atlet.foto_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(atlet.full_name)}&background=f3f4f6&color=374151`;
        const statusDokumen = (atlet.foto_url && atlet.akta_url) ? '<span class="text-green-500 text-xs ml-1" title="Terverifikasi">✅</span>' : '';

        const row = `
            <tr class="hover:bg-blue-50/50 transition-colors group border-b border-gray-50">
                <td class="p-4 text-center font-bold text-gray-400">${index + 1}</td>
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
}

// ==========================================
// 2. LOGIC TOMBOL & MODAL
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

    // Toggle Tabs UI
    const tabManualBtn = document.getElementById('tabManualBtn');
    const tabExcelBtn = document.getElementById('tabExcelBtn');
    const sectionManual = document.getElementById('sectionManual');
    const sectionExcel = document.getElementById('sectionExcel');
    const statusMsg = document.getElementById('statusMsg');

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
        btnProsesExcel.style.display = 'flex'; // Paksa tampil sebagai flex
        btnSaveAthlete.classList.add('hidden');
        statusMsg.classList.add('hidden');
    });
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

        btnSaveAthlete.innerText = "Memproses...";
        btnSaveAthlete.disabled = true;

        try {
            const dateObj = new Date(inputDOB);
            const yy = dateObj.getFullYear().toString().slice(-2);
            const mm = ('0' + (dateObj.getMonth() + 1)).slice(-2);
            const random3 = Math.floor(Math.random() * 900) + 100;
            const generatedF1Id = `F1-${yy}${mm}${random3}`;

            const dummyClubId = 1; 

            const { error } = await supabaseClient
                .from('athletes')
                .insert([{
                    f1_id: generatedF1Id,
                    full_name: inputNama,
                    dob: inputDOB,
                    gender: inputGender,
                    club_id: dummyClubId
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

// 2. Mesin Ajaib Import Excel (SheetJS)
if (btnProsesExcel) {
    btnProsesExcel.addEventListener('click', async () => {
        const fileInput = document.getElementById('inputExcel');
        const statusMsg = document.getElementById('statusMsg');

        if (!fileInput.files.length) {
            statusMsg.innerText = "Pilih file Excel/CSV terlebih dahulu!";
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
                // Baca file pakai SheetJS
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheet = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheet];
                // Convert ke JSON (Array)
                const excelData = XLSX.utils.sheet_to_json(worksheet, {header: 1});

                // Hapus baris pertama (Header kolom)
                excelData.shift();

                const dummyClubId = 1;
                const athletesToInsert = [];

                excelData.forEach(row => {
                    // Pastikan baris nggak kosong (minimal ada Nama & TglLahir)
                    if (row.length >= 2) {
                        const nama = row[0];
                        let dob = row[1];
                        let gender = row[2] || 'Putra'; // Default ke Putra kalau kosong

                        // Trik mengatasi Format Tanggal aneh dari Excel Serial Date
                        if (typeof dob === 'number') {
                            const dateObj = new Date(Math.round((dob - 25569) * 86400 * 1000));
                            dob = dateObj.toISOString().split('T')[0]; // Format ke YYYY-MM-DD
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
                                club_id: dummyClubId
                            });
                        }
                    }
                });

                if (athletesToInsert.length === 0) throw new Error("Data kosong atau format tabel salah.");

                btnProsesExcel.innerHTML = `Menyuntik ${athletesToInsert.length} atlet ke Database...`;

                // Tembak massal ke Supabase
                const { error } = await supabaseClient
                    .from('athletes')
                    .insert(athletesToInsert);

                if (error) throw error;

                // Sukses!
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

// --- B. LOGIC VERIFIKASI (REAL STORAGE UPLOAD) ---
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
            
            // 1. Upload Foto
            const fotoExt = fotoFile.name.split('.').pop();
            const fotoPath = `foto/${f1Id}_${timeStamp}.${fotoExt}`;
            const { error: fotoError } = await supabaseClient.storage
                .from('berkas-atlet')
                .upload(fotoPath, fotoFile);
            
            if (fotoError) throw fotoError;
            const { data: fotoUrlData } = supabaseClient.storage.from('berkas-atlet').getPublicUrl(fotoPath);

            // 2. Upload Akta
            const aktaExt = aktaFile.name.split('.').pop();
            const aktaPath = `akta/${f1Id}_${timeStamp}.${aktaExt}`;
            const { error: aktaError } = await supabaseClient.storage
                .from('berkas-atlet')
                .upload(aktaPath, aktaFile);
            
            if (aktaError) throw aktaError;
            const { data: aktaUrlData } = supabaseClient.storage.from('berkas-atlet').getPublicUrl(aktaPath);

            // 3. Update Tabel
            const { error: updateError } = await supabaseClient
                .from('athletes')
                .update({ 
                    foto_url: fotoUrlData.publicUrl,
                    akta_url: aktaUrlData.publicUrl 
                })
                .eq('f1_id', f1Id);

            if (updateError) throw updateError;

            // 4. Sukses
            statusMsg.innerHTML = "✅ <strong>Berkas berhasil diunggah!</strong><br><br><span class='font-normal text-[11px] leading-relaxed block mt-1'>Tim Verifikator SCS akan melakukan peninjauan dan validasi keabsahan data dalam estimasi waktu <strong>1x24 jam operasional</strong>. Status atlet akan otomatis aktif setelah disetujui.</span>";
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

        if (new Date(inputEventEndDate) < new Date(inputEventStartDate)) {
            statusMsg.innerText = "Tanggal Selesai tidak boleh mendahului Tanggal Mulai!";
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block";
            return;
        }

        btnSaveEvent.innerText = "Memproses...";
        btnSaveEvent.disabled = true;

        try {
            const dummyClubId = 1;

            const { data, error } = await supabaseClient
                .from('events')
                .insert([{
                    event_name: inputEventName,
                    subdomain: inputSubdomain,
                    event_date: inputEventStartDate,
                    end_date: inputEventEndDate,
                    club_id: dummyClubId
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
