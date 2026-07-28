import { supabaseClient } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Deteksi Subdomain dari URL (Misal: preco1.funswimming.my.id -> "preco1")
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];

    // Buat ngetes lokal kalau bukan di subdomain (opsional)
    // const subdomain = 'preco1'; 

    if (!subdomain || subdomain === 'funswimming' || subdomain === 'localhost') {
        // Kalau dibuka dari domain utama, lempar ke landing page biasa
        return; 
    }

    try {
        // 2. Tembak Supabase berdasarkan Subdomain
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

        // 3. Render Header & Background dari Config JSONB
        const config = eventData.config || {};
        document.getElementById('pageTitle').innerText = `${eventData.event_name} | Pendaftaran Resmi`;
        document.getElementById('publicEventName').innerText = eventData.event_name;

        // Render Header Banner
        if (config.header_url) {
            document.getElementById('headerBannerContainer').style.backgroundImage = `url('${config.header_url}')`;
        }
        
        // Render Background (Tembak ke elemen overlay yang baru)
        if (config.bg_url) {
            const bgOverlay = document.getElementById('bgOverlay');
            bgOverlay.style.backgroundImage = `url('${config.bg_url}')`;
            bgOverlay.classList.remove('hidden'); // Munculkan background
        }


        // 4. Render Info Biaya & Diskon
        const normalPrice = Number(config.biaya_normal || 0).toLocaleString('id-ID');
        document.getElementById('infoBiayaNormal').innerText = `Biaya per nomor: Rp ${normalPrice}`;
        
        if (config.min_diskon && config.biaya_diskon) {
            const diskonPrice = Number(config.biaya_diskon).toLocaleString('id-ID');
            document.getElementById('infoDiskon').innerText = `🔥 Diskon spesial: Ambil minimal ${config.min_diskon} nomor, harga per nomor jadi Rp ${diskonPrice}!`;
        }

        // 5. Render Pilihan Kelompok Umur (KU) dan Auto-Lock Tanggal Lahir
        const kuList = eventData.config_ku || [];
        const inputTgl = document.getElementById('inputTglLahir');
        const inputKU = document.getElementById('inputAutoKU');

        inputTgl.addEventListener('change', (e) => {
            const tahunLahir = new Date(e.target.value).getFullYear();
            if (isNaN(tahunLahir)) return;

            // Cari KU yang cocok dengan tahun lahir peserta
            const matchedKU = kuList.find(ku => tahunLahir >= Number(ku.tahunMulai) && tahunLahir <= Number(ku.tahunAkhir));
            
            if (matchedKU) {
                inputKU.value = matchedKU.nama;
            } else {
                inputKU.value = "Tidak masuk rentang KU manapun";
            }
        });

        // 6. Render Pilihan Gaya & Jarak dari config_gaya
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
                        <p class="font-extrabold text-blue-900 text-xs mb-2">${gaya.icon || '🏊'} ${gaya.nama}</p>
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
        // FITUR LOGIN KLUB & DROPDOWN ATLET
        // ==========================================
        const btnToggleLogin = document.getElementById('btnToggleLogin');
        const areaLogin = document.getElementById('areaLogin');
        const btnProsesLogin = document.getElementById('btnProsesLogin');
        
        // 1. Munculin form login kalau ditekan
        if(btnToggleLogin) {
            btnToggleLogin.addEventListener('click', () => {
                areaLogin.classList.toggle('hidden');
            });
        }

        // 2. Proses Login ke Supabase
        if(btnProsesLogin) {
            btnProsesLogin.addEventListener('click', async () => {
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;

                if(!email || !password) return alert("Email dan Password wajib diisi!");

                btnProsesLogin.innerText = "Mengecek data...";
                btnProsesLogin.disabled = true;

                try {
                    // A. Login Auth Supabase
                    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                        email: email,
                        password: password
                    });

                    if (authError) throw authError;

                    // B. Tarik data atlet milik klub ini (Berdasarkan RLS owner_id)
                    const { data: athletes, error: athError } = await supabaseClient
                        .from('athletes')
                        .select('*')
                        .order('full_name', { ascending: true });

                    if (athError) throw athError;

                    // C. Ubah Tampilan UI
                    areaLogin.classList.add('hidden'); // Sembunyikan form login
                    document.getElementById('loginBar').innerHTML = `<span class="text-emerald-700 font-bold text-sm">✅ Login sukses! Silakan pilih atletmu di bawah.</span>`;
                    
                    // D. Ubah Tampilan UI
                    areaLogin.classList.add('hidden');
                    document.getElementById('loginBar').innerHTML = `<span class="text-emerald-700 font-bold text-sm">✅ Login sukses! Silakan pilih atletmu di bawah.</span>`;
                    
                    const inputManual = document.getElementById('inputCariAtlet');
                    const dropdown = document.getElementById('dropdownAtlet');
                    
                    // Munculkan dropdown, TAPI biarkan input manual tetap tampil
                    dropdown.classList.remove('hidden');
                    dropdown.classList.add('mb-3'); // Tambah jarak margin bawah sedikit

                    // E. Isi Dropdown dengan daftar atlet (tambahkan data-name)
                    dropdown.innerHTML = '<option value="">-- Pilih Atlet dari Klub Kamu --</option>'; // Reset opsi
                    athletes.forEach(atlet => {
                        dropdown.innerHTML += `<option value="${atlet.f1_id}" data-name="${atlet.full_name}" data-tgl="${atlet.tanggal_lahir}" data-gender="${atlet.jenis_kelamin}">${atlet.full_name} (${atlet.f1_id})</option>`;
                    });

                    alert(`Berhasil menarik ${athletes.length} data atlet!`);

                } catch (err) {
                    alert("Gagal login: " + err.message);
                } finally {
                    btnProsesLogin.innerText = "Masuk & Tarik Data Atlet";
                    btnProsesLogin.disabled = false;
                }
            });
        }

        // 3. Efek Auto-Fill ketika Dropdown dipilih!
        const dropdown = document.getElementById('dropdownAtlet');
        if(dropdown) {
            dropdown.addEventListener('change', (e) => {
                const selectedOption = e.target.options[e.target.selectedIndex];
                const inputManual = document.getElementById('inputCariAtlet');
                const inputTgl = document.getElementById('inputTglLahir');
                const inputGender = document.getElementById('inputGender');

                if(selectedOption.value !== "") {
                    // Tarik data yang dititipkan
                    const nama = selectedOption.getAttribute('data-name');
                    const f1Id = selectedOption.value;
                    const tglLahir = selectedOption.getAttribute('data-tgl');
                    const gender = selectedOption.getAttribute('data-gender');

                    // Auto-fill ke kolom manual
                    inputManual.value = `${nama} (${f1Id})`;
                    inputTgl.value = tglLahir;
                    inputGender.value = gender;

                    // Kunci kolom biar elegan dan nggak terhapus tak sengaja
                    inputManual.readOnly = true;
                    inputManual.classList.add('bg-slate-200', 'cursor-not-allowed');

                    // Pancing event 'change' biar satpam KU otomatis mendeteksi tahun lahir
                    inputTgl.dispatchEvent(new Event('change'));
                } else {
                    // Kalau milih "-- Pilih Atlet --" (kosong), reset dan buka lagi kuncinya
                    inputManual.value = "";
                    inputManual.readOnly = false;
                    inputManual.classList.remove('bg-slate-200', 'cursor-not-allowed');
                }
            });
        }
});
