import { supabaseClient } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Deteksi Subdomain
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];

    // Tes Lokal
    // const subdomain = 'preco1'; 

    if (!subdomain || subdomain === 'funswimming' || subdomain === 'localhost') {
        return; 
    }

    try {
        const { data: eventData, error } = await supabaseClient
            .from('events')
            .select('*')
            .eq('subdomain', subdomain)
            .single();

        if (error || !eventData) {
            alert("Maaf, event dengan subdomain ini tidak ditemukan.");
            window.location.replace('/');
            return;
        }

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

        // Auto KU
        const kuList = eventData.config_ku || [];
        const inputTgl = document.getElementById('inputTglLahir');
        const inputKU = document.getElementById('inputAutoKU');

        inputTgl.addEventListener('change', (e) => {
            const tahunLahir = new Date(e.target.value).getFullYear();
            if (isNaN(tahunLahir)) return;

            const matchedKU = kuList.find(ku => tahunLahir >= Number(ku.tahunMulai) && tahunLahir <= Number(ku.tahunAkhir));
            if (matchedKU) {
                inputKU.value = matchedKU.nama;
            } else {
                inputKU.value = "Di Luar Rentang KU";
            }
        });

        // Render Pilihan Gaya
        const gayaList = eventData.config_gaya || [];
        const containerGaya = document.getElementById('containerNomorLomba');
        containerGaya.innerHTML = '';

        gayaList.forEach(gaya => {
            let jarakHTML = '';
            (gaya.jarak || []).forEach(jrk => {
                if(jrk.aktif) {
                    jarakHTML += `
                        <label class="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-blue-50">
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
        console.error(err);
        alert("Gagal memuat halaman pendaftaran.");
    }

    // ==========================================
    // LOGIKA LOGIN KLUB & UX TRANSFORMATION
    // ==========================================
    const btnToggleLogin = document.getElementById('btnToggleLogin');
    const areaLogin = document.getElementById('areaLogin');
    const btnProsesLogin = document.getElementById('btnProsesLogin');
    
    if(btnToggleLogin) {
        btnToggleLogin.addEventListener('click', () => areaLogin.classList.toggle('hidden'));
    }

    if(btnProsesLogin) {
        btnProsesLogin.addEventListener('click', async () => {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            if(!email || !password) return alert("Email dan Password wajib diisi!");

            btnProsesLogin.innerText = "Mengecek data...";
            btnProsesLogin.disabled = true;

            try {
                // A. Login
                const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                    email: email, password: password
                });
                if (authError) throw authError;

                // B. Tarik Profil Klub (Untuk Emblem)
                const { data: clubData } = await supabaseClient.from('clubs').select('*').limit(1).single();
                const namaKlub = (clubData && (clubData.nama_klub || clubData.nama)) ? (clubData.nama_klub || clubData.nama) : "Klub Terdaftar SCS";

                // C. Tarik Data Atlet
                const { data: athletes, error: athError } = await supabaseClient
                    .from('athletes')
                    .select('*')
                    .order('full_name', { ascending: true });
                if (athError) throw athError;

                // D. UBAH UI SECARA DRASTIS (Sesuai Konsep Baru)
                areaLogin.classList.add('hidden'); 
                document.getElementById('areaKlubManual').classList.add('hidden'); // Hilangkan input manual klub

                // Sulap Bar Login Jadi Emblem Mewah
                const loginBar = document.getElementById('loginBar');
                loginBar.className = "flex items-center gap-4 bg-gradient-to-br from-slate-800 to-blue-900 text-white p-4 rounded-xl shadow-lg border-0 transition-all";
                loginBar.innerHTML = `
                    <div class="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20 shadow-inner">
                        <svg class="w-7 h-7 text-yellow-400 drop-shadow-md" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.642 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.358-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clip-rule="evenodd"></path></svg>
                    </div>
                    <div>
                        <p class="text-[9px] text-blue-200 uppercase tracking-widest font-bold mb-0.5 opacity-80">✅ TERVERIFIKASI SCS</p>
                        <p class="text-base font-extrabold text-white tracking-tight drop-shadow-sm">${namaKlub}</p>
                    </div>
                `;
                
                // Munculin Dropdown Atlet
                const inputManual = document.getElementById('inputCariAtlet');
                const dropdown = document.getElementById('dropdownAtlet');
                inputManual.classList.add('hidden'); // Kalau udah login, nggak perlu ngetik nama atlet manual lagi
                dropdown.classList.remove('hidden');

                // E. Isi Dropdown + Titip status Akta
                dropdown.innerHTML = '<option value="">-- Pilih Atlet dari Data Kamu --</option>';
                athletes.forEach(atlet => {
                    const tgl = atlet.dob || '';
                    const jk = atlet.gender || '';
                    const akta = atlet.akta_url || ''; 
                    dropdown.innerHTML += `<option value="${atlet.f1_id}" data-name="${atlet.full_name}" data-tgl="${tgl}" data-gender="${jk}" data-akta="${akta}">${atlet.full_name} (${atlet.f1_id})</option>`;
                });

            } catch (err) {
                alert("Gagal login: " + err.message);
            } finally {
                btnProsesLogin.innerText = "Masuk & Sinkronisasi Data";
                btnProsesLogin.disabled = false;
            }
        });
    }

    // ==========================================
    // LOGIKA AUTO-FILL & MUNCULIN AKTA
    // ==========================================
    const dropdown = document.getElementById('dropdownAtlet');
    if(dropdown) {
        dropdown.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const inputTgl = document.getElementById('inputTglLahir');
            const inputGender = document.getElementById('inputGender');
            const areaAkta = document.getElementById('areaAkta');

            if(selectedOption.value !== "") {
                const tglLahir = selectedOption.getAttribute('data-tgl');
                const gender = selectedOption.getAttribute('data-gender');
                const aktaUrl = selectedOption.getAttribute('data-akta');

                inputTgl.value = tglLahir;
                inputGender.value = gender;

                // Kunci Kolom
                inputTgl.readOnly = true;
                inputTgl.classList.add('bg-slate-200', 'cursor-not-allowed', 'pointer-events-none');
                inputGender.classList.add('bg-slate-200', 'cursor-not-allowed', 'pointer-events-none');

                // Logika Akta (Unverified = Munculin Kotak Kuning Peringatan)
                if (areaAkta) {
                    if (!aktaUrl || aktaUrl === 'null' || aktaUrl.trim() === '') {
                        areaAkta.classList.remove('hidden'); 
                    } else {
                        areaAkta.classList.add('hidden'); 
                    }
                }

                // Trigger deteksi KU
                inputTgl.dispatchEvent(new Event('change'));
            } else {
                // Reset
                inputTgl.value = "";
                inputGender.value = "";

                inputTgl.readOnly = false;
                inputTgl.classList.remove('bg-slate-200', 'cursor-not-allowed', 'pointer-events-none');
                inputGender.classList.remove('bg-slate-200', 'cursor-not-allowed', 'pointer-events-none');
                
                if (areaAkta) areaAkta.classList.add('hidden');
            }
        });
    }
});
