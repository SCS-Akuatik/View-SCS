import { supabaseClient } from './supabase.js';

let currentEvent = null; // Menyimpan data master event
let isKlubLoggedIn = false; // Status VVIP
let loggedInClubData = null; // Data klub

document.addEventListener('DOMContentLoaded', async () => {
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];
    // const subdomain = 'preco1'; // Buka komen buat test lokal

    if (!subdomain || subdomain === 'funswimming' || subdomain === 'localhost') return; 

    try {
        const { data: eventData, error } = await supabaseClient
            .from('events')
            .select('*')
            .eq('subdomain', subdomain)
            .single();

        if (error || !eventData) throw new Error("Event tidak ditemukan.");
        currentEvent = eventData;

        // Render Header & Bg
        const config = eventData.config || {};
        document.getElementById('pageTitle').innerText = `${eventData.event_name} | Pendaftaran Resmi`;
        document.getElementById('publicEventName').innerText = eventData.event_name;

        if (config.header_url) document.getElementById('headerBannerContainer').style.backgroundImage = `url('${config.header_url}')`;
        if (config.bg_url) {
            const bgOverlay = document.getElementById('bgOverlay');
            bgOverlay.style.backgroundImage = `url('${config.bg_url}')`;
            bgOverlay.classList.remove('hidden');
        }

        // Render Info Biaya
        const normalPrice = Number(config.biaya_normal || 0).toLocaleString('id-ID');
        document.getElementById('infoBiayaNormal').innerText = `Biaya per nomor: Rp ${normalPrice}`;
        
        if (config.min_diskon && config.biaya_diskon) {
            const diskonPrice = Number(config.biaya_diskon).toLocaleString('id-ID');
            document.getElementById('infoDiskon').innerText = `🔥 Diskon spesial: Ambil minimal ${config.min_diskon} nomor, harga per nomor jadi Rp ${diskonPrice}!`;
        }

        // Auto KU Logic
        const kuList = eventData.config_ku || [];
        document.getElementById('inputTglLahir').addEventListener('change', (e) => {
            const tahunLahir = new Date(e.target.value).getFullYear();
            if (isNaN(tahunLahir)) return;

            const matchedKU = kuList.find(ku => tahunLahir >= Number(ku.tahunMulai) && tahunLahir <= Number(ku.tahunAkhir));
            document.getElementById('inputAutoKU').value = matchedKU ? matchedKU.nama : "Di Luar Rentang KU";
        });

        // Render Pilihan Nomor Lomba
        const gayaList = eventData.config_gaya || [];
        const containerGaya = document.getElementById('containerNomorLomba');
        containerGaya.innerHTML = '';

        gayaList.forEach(gaya => {
            let jarakHTML = '';
            (gaya.jarak || []).forEach(jrk => {
                if(jrk.aktif) {
                    jarakHTML += `
                        <label class="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-blue-50 transition-colors">
                            <input type="checkbox" name="nomor_lomba" value="${gaya.nama} ${jrk.nama}" class="w-4 h-4 text-blue-600 rounded">
                            ${jrk.nama}
                        </label>
                    `;
                }
            });

            if(jarakHTML) {
                containerGaya.innerHTML += `
                    <div class="border border-slate-100 p-3 rounded-xl bg-slate-50/50">
                        <p class="font-extrabold text-blue-900 text-xs mb-2">${gaya.nama}</p>
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">${jarakHTML}</div>
                    </div>
                `;
            }
        });

    } catch (err) {
        alert(err.message);
    }

    // ==========================================
    // LOGIKA LOGIN KLUB & MUNCULIN LOGO
    // ==========================================
    document.getElementById('btnToggleLogin').addEventListener('click', () => {
        document.getElementById('areaLogin').classList.toggle('hidden');
    });

    document.getElementById('btnProsesLogin').addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const btnLogin = document.getElementById('btnProsesLogin');

        if(!email || !password) return alert("Email dan Password wajib diisi!");
        btnLogin.innerText = "Mengecek data..."; btnLogin.disabled = true;

        try {
            // 1. Auth Login
            const { error: authError } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (authError) throw authError;

            // 2. Tarik Master Club
            const { data: clubData, error: clubErr } = await supabaseClient.from('clubs').select('*').limit(1).single();
            if (clubErr) throw clubErr;
            
            isKlubLoggedIn = true;
            loggedInClubData = clubData;

            // 3. Tarik Data Atlet
            const { data: athletes } = await supabaseClient.from('athletes').select('*').order('full_name', { ascending: true });

            // 4. TRANSISI UI: Munculin Logo Klub & Ganti Emblem
            document.getElementById('areaLogin').classList.add('hidden'); 
            document.getElementById('areaKlubManual').classList.add('hidden'); // Bunuh input klub manual
            
            const namaKlub = clubData.club_name || clubData.nama_klub || "Klub Terdaftar SCS";
            // Jika logo kosong, pakai Avatar Inisial
            const avatarUrl = clubData.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(namaKlub)}&background=1e3a8a&color=fff`;

            const loginBar = document.getElementById('loginBar');
            loginBar.className = "flex items-center gap-4 bg-gradient-to-r from-slate-900 to-blue-900 text-white p-4 rounded-xl shadow-lg border-0";
            loginBar.innerHTML = `
                <div class="w-12 h-12 bg-white rounded-full overflow-hidden border-2 border-yellow-400 shrink-0">
                    <img src="${avatarUrl}" alt="Logo Klub" class="w-full h-full object-cover">
                </div>
                <div>
                    <p class="text-[9px] text-emerald-400 uppercase tracking-widest font-bold mb-0.5">✅ VERIFIED CLUB</p>
                    <p class="text-base font-extrabold text-white tracking-tight">${namaKlub}</p>
                </div>
            `;
            
            // 5. Ganti Input Manual jadi Dropdown
            document.getElementById('inputCariAtlet').classList.add('hidden');
            const dropdown = document.getElementById('dropdownAtlet');
            dropdown.classList.remove('hidden');

            dropdown.innerHTML = '<option value="">-- Pilih Atlet dari Data Kamu --</option>';
            (athletes || []).forEach(atlet => {
                const tgl = atlet.dob || ''; const jk = atlet.gender || ''; const akta = atlet.akta_url || ''; 
                dropdown.innerHTML += `<option value="${atlet.f1_id}" data-name="${atlet.full_name}" data-tgl="${tgl}" data-gender="${jk}" data-akta="${akta}">${atlet.full_name} (${atlet.f1_id})</option>`;
            });

        } catch (err) {
            alert("Gagal login: " + err.message);
        } finally {
            btnLogin.innerText = "Masuk & Sinkronisasi Data"; btnLogin.disabled = false;
        }
    });

    // ==========================================
    // LOGIKA AUTO-FILL & MUNCULIN KOTAK AKTA
    // ==========================================
    document.getElementById('dropdownAtlet').addEventListener('change', (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        const inputTgl = document.getElementById('inputTglLahir');
        const inputGender = document.getElementById('inputGender');
        const areaAkta = document.getElementById('areaAkta');

        if(opt.value !== "") {
            inputTgl.value = opt.getAttribute('data-tgl');
            inputGender.value = opt.getAttribute('data-gender');
            
            inputTgl.readOnly = true; inputTgl.classList.add('bg-slate-200', 'pointer-events-none');
            inputGender.classList.add('bg-slate-200', 'pointer-events-none');

            // Logika Akta: Jika F1 ID ini belum punya akta, Wajib Upload (Kotak Akta Muncul)
            const aktaUrl = opt.getAttribute('data-akta');
            if (!aktaUrl || aktaUrl === 'null' || aktaUrl.trim() === '') {
                areaAkta.classList.remove('hidden'); 
            } else {
                areaAkta.classList.add('hidden'); 
            }

            inputTgl.dispatchEvent(new Event('change')); // Trigger KU
        } else {
            // Reset ke kosong
            inputTgl.value = ""; inputGender.value = "";
            inputTgl.readOnly = false; inputTgl.classList.remove('bg-slate-200', 'pointer-events-none');
            inputGender.classList.remove('bg-slate-200', 'pointer-events-none');
            areaAkta.classList.add('hidden'); // Kalau milih kosong, sembunyiin dulu
        }
    });

    // ==========================================
    // FINAL BOSS: LOGIKA KIRIM PENDAFTARAN & UPLOAD
    // ==========================================
    document.getElementById('btnKirimPendaftaran').addEventListener('click', async () => {
        const btn = document.getElementById('btnKirimPendaftaran');
        
        // Kumpulin Data Form
        const inputKlubManual = document.getElementById('inputKlubManual').value.trim();
        const inputManualName = document.getElementById('inputCariAtlet').value.trim();
        const dropdownAtlet = document.getElementById('dropdownAtlet');
        
        // Tentukan siapa yang daftar (VVIP atau Tamu)
        let f1_id = null;
        let nama_peserta = "";
        let klub_asal = "";
        let requiresAktaUpload = false;

        if (isKlubLoggedIn) {
            // Jalur VVIP
            if(dropdownAtlet.value === "") return alert("Pilih atlet terlebih dahulu!");
            f1_id = dropdownAtlet.value;
            nama_peserta = dropdownAtlet.options[dropdownAtlet.selectedIndex].getAttribute('data-name');
            klub_asal = loggedInClubData.club_name || loggedInClubData.nama_klub;
            
            // Cek apakah akta dibutuhin
            if (!document.getElementById('areaAkta').classList.contains('hidden')) {
                requiresAktaUpload = true;
            }
        } else {
            // Jalur Tamu
            if(!inputKlubManual) return alert("Nama Klub/Sekolah wajib diisi!");
            if(!inputManualName) return alert("Nama Atlet wajib diisi!");
            klub_asal = inputKlubManual;
            nama_peserta = inputManualName;
            requiresAktaUpload = true; // Tamu WAJIB upload akta
        }

        const tanggal_lahir = document.getElementById('inputTglLahir').value;
        const kelompok_umur = document.getElementById('inputAutoKU').value;
        const gender = document.getElementById('inputGender').value;
        
        if(!tanggal_lahir || !gender) return alert("Lengkapi Tanggal Lahir dan Jenis Kelamin!");
        if(kelompok_umur === "Di Luar Rentang KU") return alert("Usia atlet tidak masuk kelompok umur yang dilombakan.");

        // Tarik checkbox nomor lomba yang dipilih
        const selectedNomor = Array.from(document.querySelectorAll('input[name="nomor_lomba"]:checked')).map(cb => cb.value);
        if(selectedNomor.length === 0) return alert("Pilih minimal 1 nomor lomba!");

        // Validasi Upload Akta
        const fileAkta = document.getElementById('inputAkta').files[0];
        if (requiresAktaUpload && !fileAkta) {
            return alert("Anda wajib mengunggah foto Akta Kelahiran!");
        }

        // Kalkulasi Harga berdasarkan config event
        const config = currentEvent.config || {};
        let totalBiaya = 0;
        const normalPrice = Number(config.biaya_normal || 0);
        const minDiskon = Number(config.min_diskon || 999);
        const diskonPrice = Number(config.biaya_diskon || 0);

        if (selectedNomor.length >= minDiskon) {
            totalBiaya = selectedNomor.length * diskonPrice;
        } else {
            totalBiaya = selectedNomor.length * normalPrice;
        }

        const isConfirm = confirm(`Pendaftaran untuk ${nama_peserta}\nTotal ${selectedNomor.length} nomor lomba\nEstimasi Tagihan: Rp ${totalBiaya.toLocaleString('id-ID')}\nLanjutkan?`);
        if(!isConfirm) return;

        btn.innerHTML = "Memproses Data...⏳"; btn.disabled = true;

        try {
            let finalAktaUrl = null;

            // Jika butuh upload akta, lempar ke Supabase Storage
            if (requiresAktaUpload && fileAkta) {
                const fileExt = fileAkta.name.split('.').pop();
                const fileName = `akta_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                
                const { error: uploadError } = await supabaseClient.storage.from('verifikasi-akta').upload(fileName, fileAkta);
                if (uploadError) throw uploadError;

                const { data: urlData } = supabaseClient.storage.from('verifikasi-akta').getPublicUrl(fileName);
                finalAktaUrl = urlData.publicUrl;

                // SKENARIO UPDATE MASTER DATA: Jika VVIP upload akta baru, tembak ke tabel athletes
                if (isKlubLoggedIn && f1_id) {
                    await supabaseClient.from('athletes').update({ akta_url: finalAktaUrl }).eq('f1_id', f1_id);
                }
            } else if (isKlubLoggedIn) {
                // Jika VVIP dan nggak butuh upload, berarti ambil dari DB yang udah ada
                finalAktaUrl = dropdownAtlet.options[dropdownAtlet.selectedIndex].getAttribute('data-akta');
            }

            // TEMBAK KE TABEL TRANSAKSI (Semuanya masuk sini, VVIP maupun Tamu)
            const { error: insertError } = await supabaseClient.from('event_registrations').insert([{
                event_id: currentEvent.id,
                f1_id: f1_id, // Bakal null kalau tamu
                klub_asal: klub_asal,
                nama_peserta: nama_peserta,
                tanggal_lahir: tanggal_lahir,
                gender: gender,
                kelompok_umur: kelompok_umur,
                nomor_lomba: selectedNomor,
                akta_url: finalAktaUrl,
                total_biaya: totalBiaya,
                status_pembayaran: 'Menunggu Konfirmasi'
            }]);

            if (insertError) throw insertError;

            alert("✅ Pendaftaran berhasil dikirim! Silakan selesaikan pembayaran ke panitia.");
            window.location.reload(); // Refresh form biar bisa daftar anak berikutnya

        } catch (err) {
            alert("Terjadi kesalahan sistem: " + err.message);
            btn.innerHTML = "Kirim Pendaftaran"; btn.disabled = false;
        }
    });
});
