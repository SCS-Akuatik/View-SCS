import { supabaseClient } from './supabase.js';

let currentEvent = null; 
let isKlubLoggedIn = false; 
let loggedInClubData = null; 
let dataTagihan = []; 
let selectedTagihanIds = new Set(); 

document.addEventListener('DOMContentLoaded', async () => {
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];
    
    // Jangan lupa komen baris di bawah ini kalau sudah online!
    // const subdomain = 'fs-samawa'; 

    if (!subdomain || subdomain === 'funswimming' || subdomain === 'localhost') return; 

    try {
        const { data: eventData, error } = await supabaseClient
            .from('events')
            .select('*')
            .eq('subdomain', subdomain)
            .single();

        if (error || !eventData) throw new Error("Event tidak ditemukan.");
        currentEvent = eventData;

        // =========================================================
        // LOGIKA FOMO "BEDA REGION" 
        // =========================================================
        if (currentEvent.provinsi && !currentEvent.provinsi.toUpperCase().includes('JAWA TIMUR')) {
            const modalWarn = document.getElementById('modalRegionWarning');
            if (modalWarn) {
                document.getElementById('warnEventName').innerText = currentEvent.event_name;
                document.getElementById('warnEventLocation').innerText = `${currentEvent.kota || ''}, ${currentEvent.provinsi}`;
                
                setTimeout(() => {
                    modalWarn.classList.remove('hidden');
                    setTimeout(() => modalWarn.firstElementChild.classList.remove('scale-95'), 50);
                }, 1000); 

                document.getElementById('btnTutupWarningRegion').addEventListener('click', () => {
                    modalWarn.firstElementChild.classList.add('scale-95');
                    setTimeout(() => modalWarn.classList.add('hidden'), 300);
                });
            }
        }

        const config = eventData.config || {};
        document.getElementById('pageTitle').innerText = `${eventData.event_name} | Pendaftaran Resmi`;
        document.getElementById('publicEventName').innerText = eventData.event_name;

        // =========================================================
        // 📅 INJEK TANGGAL LOMBA
        // =========================================================
        let formattedDate = 'Tanggal belum ditentukan';
        const rawDate = eventData.start_date || eventData.event_date || eventData.tanggal;
        if (rawDate) {
            try {
                const dateObj = new Date(rawDate);
                if (!isNaN(dateObj.getTime())) {
                    formattedDate = dateObj.toLocaleDateString('id-ID', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    });
                }
            } catch (e) { console.error("Gagal memformat tanggal:", e); }
        }
        
        const elTextTanggal = document.getElementById('textTanggal');
        if (elTextTanggal) elTextTanggal.innerText = formattedDate;

        // =========================================================
        // 📍 INJEK LOKASI LOMBA
        // =========================================================
        const namaKota = eventData.kota || '';
        const namaProvinsi = eventData.provinsi || '';
        const namaKolam = config.nama_kolam || '';
        
        let teksLokasiLengkap = '';
        if (namaKolam) teksLokasiLengkap += `${namaKolam} - `;
        if (namaKota && namaProvinsi) {
            teksLokasiLengkap += `${namaKota}, ${namaProvinsi}`;
        } else if (namaKota || namaProvinsi) {
            teksLokasiLengkap += `${namaKota}${namaProvinsi}`;
        } else {
            teksLokasiLengkap = 'Lokasi belum ditentukan';
        }
        
        const elTextLokasi = document.getElementById('textLokasi');
        if (elTextLokasi) elTextLokasi.innerText = teksLokasiLengkap;

        // =========================================================
        // RENDER BACKGROUND & BIAYA
        // =========================================================
        if (config.header_url) {
            document.getElementById('headerBannerContainer').style.backgroundImage = `url('${config.header_url}')`;
        }
        
        if (config.bg_url) {
            const bgOverlay = document.getElementById('bgOverlay');
            bgOverlay.style.backgroundImage = `url('${config.bg_url}')`;
            bgOverlay.classList.remove('hidden');
        }

        const normalPrice = Number(config.biaya_normal || 0).toLocaleString('id-ID');
        document.getElementById('infoBiayaNormal').innerText = `Biaya per nomor: Rp ${normalPrice}`;
        
        if (config.min_diskon && config.biaya_diskon) {
            const diskonPrice = Number(config.biaya_diskon).toLocaleString('id-ID');
            document.getElementById('infoDiskon').innerText = `🔥 Diskon spesial: Ambil minimal ${config.min_diskon} nomor, harga per nomor jadi Rp ${diskonPrice}!`;
        }

        // =========================================================
        // 1. FLOATING WHATSAPP BUTTON (DARI BRANKAS CONFIG)
        // =========================================================
        const btnToggleMenu = document.getElementById('btnToggleWAMenu');
        const waMenuOptions = document.getElementById('waMenuOptions');
        const btnWA1 = document.getElementById('btnWA_Admin1');
        const btnWA2 = document.getElementById('btnWA_Admin2');

        let hasWA = false;

        function formatWANumber(num) {
            let cleanNum = num.replace(/\D/g, '');
            if (cleanNum.startsWith('0')) cleanNum = '62' + cleanNum.substring(1);
            return cleanNum;
        }

        if (config.admin_wa_1) {
            hasWA = true;
            btnWA1.href = `https://wa.me/${formatWANumber(config.admin_wa_1)}?text=Halo%20Admin%201%20${encodeURIComponent(eventData.event_name)},%20saya%20mau%20tanya...`;
            btnWA1.classList.remove('hidden');
            btnWA1.classList.add('flex'); 
        }

        if (config.admin_wa_2) {
            hasWA = true;
            btnWA2.href = `https://wa.me/${formatWANumber(config.admin_wa_2)}?text=Halo%20Admin%202%20${encodeURIComponent(eventData.event_name)},%20saya%20mau%20tanya...`;
            btnWA2.classList.remove('hidden');
            btnWA2.classList.add('flex'); 
        }

        if (hasWA && btnToggleMenu) {
            btnToggleMenu.classList.remove('hidden');
            btnToggleMenu.addEventListener('click', (e) => {
                e.preventDefault();
                waMenuOptions.classList.toggle('hidden');
                waMenuOptions.classList.toggle('flex');
            });
        }

        // =========================================================
        // MANGGIL INFO PEMBAYARAN & QRIS KE KERANJANG BAWAH
        // =========================================================
        if (config.info_pembayaran || config.qris_url) {
            document.getElementById('boxInfoPembayaran').classList.remove('hidden');
            
            if (config.info_pembayaran) {
                document.getElementById('teksInfoPembayaran').innerText = config.info_pembayaran;
                document.getElementById('teksInfoPembayaran').classList.remove('hidden');
            } else {
                document.getElementById('teksInfoPembayaran').classList.add('hidden');
            }

            if (config.qris_url) {
                document.getElementById('boxQris').classList.remove('hidden');
                document.getElementById('boxQris').classList.add('flex'); 
                document.getElementById('imgQris').src = config.qris_url;
            }
        }

        // =========================================================
        // 2. STATISTIK REAL DARI DATABASE
        // =========================================================
        try {
            const { count: countPeserta, error: errPeserta } = await supabaseClient
                .from('event_registrations')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', currentEvent.id);
                
            if (!errPeserta) {
                document.getElementById('statPesertaPublik').innerText = `${countPeserta || 0} Terdaftar`;
            }

            const { data: heatsData, error: errHeats } = await supabaseClient
                .from('event_heats')
                .select('event_number')
                .eq('event_id', currentEvent.id);

            let heatCount = (heatsData && !errHeats) ? heatsData.length : 0;
            
            if (heatCount === 0 && countPeserta > 0) {
                heatCount = Math.ceil((countPeserta * 2) / 8); 
                document.getElementById('statHeatPublik').innerText = `${heatCount} Heat Est.`;
            } else {
                document.getElementById('statHeatPublik').innerText = `${heatCount} Heat`;
            }
        } catch (statsError) {
            console.error("Gagal menarik data statistik:", statsError);
        }

        // =========================================================
        // RENDER KELOMPOK UMUR & GAYA
        // =========================================================
        const kuList = eventData.config_ku || [];
        document.getElementById('inputTglLahir').addEventListener('change', (e) => {
            const tahunLahir = new Date(e.target.value).getFullYear();
            if (isNaN(tahunLahir)) return;
            
            const matchedKU = kuList.find(ku => tahunLahir >= Number(ku.tahunMulai) && tahunLahir <= Number(ku.tahunAkhir));
            document.getElementById('inputAutoKU').value = matchedKU ? matchedKU.nama : "Di Luar Rentang KU";
        });

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

        loadTagihan();

    } catch (err) {
        alert(err.message);
    }

    // ==========================================
    // LOGIKA LOGIN VVIP (KLUB)
    // ==========================================
    document.getElementById('btnToggleLogin').addEventListener('click', () => {
        document.getElementById('areaLogin').classList.toggle('hidden');
    });

    document.getElementById('btnProsesLogin').addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const btnLogin = document.getElementById('btnProsesLogin');

        if(!email || !password) return alert("Email dan Password wajib diisi!");
        
        btnLogin.innerText = "Mengecek data..."; 
        btnLogin.disabled = true;

        try {
            const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (authError) throw authError;

            const userId = authData.user.id;
            const { data: clubData, error: clubErr } = await supabaseClient
                .from('clubs')
                .select('*')
                .eq('owner_id', userId)
                .single();
                
            if (clubErr) throw new Error("Data profil klub tidak ditemukan untuk akun ini.");
            
            isKlubLoggedIn = true;
            loggedInClubData = clubData;

            const { data: athletes, error: athErr } = await supabaseClient
                .from('athletes')
                .select('*')
                .eq('club_id', clubData.id)
                .order('full_name', { ascending: true });
                
            if (athErr) throw athErr;

            document.getElementById('areaLogin').classList.add('hidden'); 
            document.getElementById('areaGuestOnly').classList.add('hidden'); 
            document.getElementById('areaAkta').classList.add('hidden');
            
            const namaKlub = clubData.club_name || clubData.nama_klub || "Klub Terdaftar SCS";
            const avatarUrl = clubData.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(namaKlub)}&background=1e3a8a&color=fff`;

            const loginBar = document.getElementById('loginBar');
            loginBar.className = "flex items-center gap-4 bg-gradient-to-r from-slate-900 to-blue-900 text-white p-4 rounded-xl shadow-lg border-0";
            loginBar.innerHTML = `
                <div class="w-12 h-12 bg-white rounded-full overflow-hidden border-2 border-yellow-400 shrink-0">
                    <img src="${avatarUrl}" alt="Logo Klub" class="w-full h-full object-cover">
                </div>
                <div>
                    <p class="text-[9px] text-emerald-400 uppercase tracking-widest font-bold mb-0.5">✅ VERIFIED CLUB</p>
                    <p class="text-base font-extrabold text-white tracking-tight drop-shadow-sm">${namaKlub}</p>
                </div>
            `;
            
            document.getElementById('inputCariAtlet').classList.add('hidden');
            const dropdown = document.getElementById('dropdownAtlet');
            dropdown.classList.remove('hidden');

            dropdown.innerHTML = '<option value="">-- Pilih Atlet dari Data Kamu --</option>';
            (athletes || []).forEach(atlet => {
                const tgl = atlet.dob || ''; 
                const jk = atlet.gender || ''; 
                const akta = atlet.akta_url || ''; 
                dropdown.innerHTML += `<option value="${atlet.f1_id}" data-name="${atlet.full_name}" data-tgl="${tgl}" data-gender="${jk}" data-akta="${akta}">${atlet.full_name} (${atlet.f1_id})</option>`;
            });

            loadTagihan();

        } catch (err) {
            alert("Gagal login: " + err.message);
        } finally {
            btnLogin.innerText = "Masuk & Sinkronisasi Data"; 
            btnLogin.disabled = false;
        }
    });

    document.getElementById('dropdownAtlet').addEventListener('change', (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        const inputTgl = document.getElementById('inputTglLahir');
        const inputGender = document.getElementById('inputGender');
        const areaAkta = document.getElementById('areaAkta');

        if(opt.value !== "") {
            inputTgl.value = opt.getAttribute('data-tgl'); 
            inputGender.value = opt.getAttribute('data-gender');
            inputTgl.readOnly = true; 
            inputTgl.classList.add('bg-slate-200', 'pointer-events-none');
            inputGender.classList.add('bg-slate-200', 'pointer-events-none');

            const aktaUrl = opt.getAttribute('data-akta');
            if (!aktaUrl || aktaUrl === 'null' || aktaUrl.trim() === '') { 
                areaAkta.classList.remove('hidden'); 
            } else { 
                areaAkta.classList.add('hidden'); 
            }
            
            inputTgl.dispatchEvent(new Event('change'));
        } else {
            resetFormAtlet();
        }
    });

    // ==========================================
    // LOGIKA PENDAFTARAN & KERANJANG LOKAL
    // ==========================================
    document.getElementById('btnKirimPendaftaran').addEventListener('click', async () => {
        const btn = document.getElementById('btnKirimPendaftaran');
        const inputKlubManual = document.getElementById('inputKlubManual').value.trim();
        const inputWhatsapp = document.getElementById('inputWhatsapp').value.trim();
        const inputManualName = document.getElementById('inputCariAtlet').value.trim();
        const dropdownAtlet = document.getElementById('dropdownAtlet');
        
        let f1_id = null; 
        let nama_peserta = ""; 
        let klub_asal = ""; 
        let nomor_wa_pic = null; 
        let requiresAktaUpload = false;

        const turnstileResp = document.querySelector('[name="cf-turnstile-response"]');
        if (turnstileResp && !turnstileResp.value) {
            return alert("Mohon selesaikan Captcha (centang kotak keamanan) terlebih dahulu!");
        }

        if (isKlubLoggedIn) {
            if(dropdownAtlet.value === "") return alert("Pilih atlet terlebih dahulu!");
            
            f1_id = dropdownAtlet.value;
            nama_peserta = dropdownAtlet.options[dropdownAtlet.selectedIndex].getAttribute('data-name');
            klub_asal = loggedInClubData.club_name || loggedInClubData.nama_klub;
            nomor_wa_pic = loggedInClubData.contact_wa || "Belum Diatur di Profil Klub";
            
            if (!document.getElementById('areaAkta').classList.contains('hidden')) {
                requiresAktaUpload = true;
            }
        } else {
            if(!inputKlubManual) return alert("Nama Klub/Sekolah wajib diisi!");
            if(!inputWhatsapp) return alert("Nomor WhatsApp wajib diisi agar panitia bisa menghubungi Anda!");
            if(!inputManualName) return alert("Nama Atlet wajib diisi!");
            
            klub_asal = inputKlubManual; 
            nomor_wa_pic = inputWhatsapp; 
            nama_peserta = inputManualName; 
            requiresAktaUpload = true; 
        }

        const tanggal_lahir = document.getElementById('inputTglLahir').value;
        const kelompok_umur = document.getElementById('inputAutoKU').value;
        const gender = document.getElementById('inputGender').value;
        
        if(!tanggal_lahir || !gender) return alert("Lengkapi Tanggal Lahir dan Jenis Kelamin!");
        if(kelompok_umur === "Di Luar Rentang KU") return alert("Usia atlet tidak masuk kelompok umur yang dilombakan.");

        const checkboxesNomor = Array.from(document.querySelectorAll('input[name="nomor_lomba"]:checked'));
        const selectedNomor = checkboxesNomor.map(cb => cb.value);
        if(selectedNomor.length === 0) return alert("Pilih minimal 1 nomor lomba!");

        const fileAkta = document.getElementById('inputAkta').files[0];
        if (requiresAktaUpload && !fileAkta) {
            return alert("Anda wajib mengunggah foto Akta Kelahiran!");
        }

        const config = currentEvent.config || {};
        let totalBiaya = selectedNomor.length >= Number(config.min_diskon || 999) 
            ? selectedNomor.length * Number(config.biaya_diskon || 0) 
            : selectedNomor.length * Number(config.biaya_normal || 0);

        btn.innerHTML = "Menambahkan... ⏳"; 
        btn.disabled = true;

        try {
            let finalAktaUrl = null;
            
            if (requiresAktaUpload && fileAkta) {
                const fileExt = fileAkta.name.split('.').pop();
                const fileName = `akta_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                
                const { error: uploadError } = await supabaseClient.storage.from('verifikasi-akta').upload(fileName, fileAkta);
                if (uploadError) throw uploadError;
                
                const { data: urlData } = supabaseClient.storage.from('verifikasi-akta').getPublicUrl(fileName);
                finalAktaUrl = urlData.publicUrl;
                
                if (isKlubLoggedIn && f1_id) {
                    await supabaseClient.from('athletes').update({ akta_url: finalAktaUrl }).eq('f1_id', f1_id);
                }
            } else if (isKlubLoggedIn) {
                finalAktaUrl = dropdownAtlet.options[dropdownAtlet.selectedIndex].getAttribute('data-akta');
            }

            const { data: insertedData, error: insertError } = await supabaseClient.from('event_registrations').insert([{
                event_id: currentEvent.id, 
                f1_id: f1_id, 
                klub_asal: klub_asal, 
                nama_peserta: nama_peserta,
                tanggal_lahir: tanggal_lahir, 
                gender: gender, 
                kelompok_umur: kelompok_umur,
                nomor_lomba: selectedNomor, 
                akta_url: finalAktaUrl, 
                total_biaya: totalBiaya, 
                status_pembayaran: 'Belum Bayar', 
                whatsapp_tamu: nomor_wa_pic
            }]).select();

            if (insertError) throw insertError;

            if (window.turnstile) turnstile.reset();

            if (!isKlubLoggedIn && insertedData && insertedData.length > 0) {
                let guestIds = JSON.parse(localStorage.getItem(`scs_guest_${currentEvent.id}`) || '[]');
                guestIds.push(insertedData[0].id);
                localStorage.setItem(`scs_guest_${currentEvent.id}`, JSON.stringify(guestIds));
            }

            resetFormAtlet();
            checkboxesNomor.forEach(cb => cb.checked = false);
            alert("✅ Berhasil dimasukkan ke Daftar Tagihan di bawah!");
            
            const { count } = await supabaseClient.from('event_registrations').select('*', { count: 'exact', head: true }).eq('event_id', currentEvent.id);
            document.getElementById('statPesertaPublik').innerText = `${count || 0} Terdaftar`;

            loadTagihan();

        } catch (err) {
            alert("Terjadi kesalahan sistem: " + err.message);
        } finally {
            btn.innerHTML = "Daftar, Bayar di Antrian"; 
            btn.disabled = false;
        }
    });

    function resetFormAtlet() {
        document.getElementById('inputCariAtlet').value = "";
        document.getElementById('inputTglLahir').value = "";
        document.getElementById('inputAutoKU').value = "";
        document.getElementById('inputGender').value = "";
        document.getElementById('inputAkta').value = "";
        document.getElementById('areaAkta').classList.add('hidden'); 
        
        if(isKlubLoggedIn) {
            document.getElementById('dropdownAtlet').value = "";
        }
        
        if(!isKlubLoggedIn) {
            document.getElementById('inputTglLahir').readOnly = false;
            document.getElementById('inputTglLahir').classList.remove('bg-slate-200', 'pointer-events-none');
            document.getElementById('inputGender').classList.remove('bg-slate-200', 'pointer-events-none');
            document.getElementById('areaAkta').classList.remove('hidden'); 
        }
    }

    // ==========================================
    // SISTEM KERANJANG & PEMBAYARAN KOLEKTIF
    // ==========================================
    async function loadTagihan() {
        if (!currentEvent) return;

        let query = supabaseClient
            .from('event_registrations')
            .select('*')
            .eq('event_id', currentEvent.id)
            .eq('status_pembayaran', 'Belum Bayar');
        
        if (isKlubLoggedIn) {
            const namaKlub = loggedInClubData.club_name || loggedInClubData.nama_klub;
            query = query.eq('klub_asal', namaKlub);
        } else {
            const guestIds = JSON.parse(localStorage.getItem(`scs_guest_${currentEvent.id}`) || '[]');
            if (guestIds.length === 0) {
                document.getElementById('areaPembayaran').classList.add('hidden');
                return;
            }
            query = query.in('id', guestIds);
        }

        const { data, error } = await query;
        if (error) return console.error(error);

        dataTagihan = data || [];
        renderTabelTagihan();
    }

    function renderTabelTagihan() {
        const area = document.getElementById('areaPembayaran');
        const tbody = document.getElementById('tableTagihanBody');
        tbody.innerHTML = '';
        selectedTagihanIds.clear(); 
        kalkulasiTotalBayar();

        if (dataTagihan.length === 0) {
            area.classList.add('hidden'); 
            return;
        }

        area.classList.remove('hidden');

        dataTagihan.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-slate-100 hover:bg-slate-50 transition-colors";
            tr.innerHTML = `
                <td class="p-3 text-center">
                    <input type="checkbox" value="${item.id}" class="chk-tagihan w-4 h-4 rounded text-blue-600 cursor-pointer">
                </td>
                <td class="p-3">
                    <p class="font-bold text-slate-700 text-xs">${item.nama_peserta}</p>
                    <p class="text-[10px] text-slate-400 mt-0.5">${item.klub_asal}</p>
                </td>
                <td class="p-3 text-center">
                    <span class="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-1 rounded">${item.nomor_lomba.length} Nomor</span>
                </td>
                <td class="p-3 text-right font-bold text-slate-700 text-xs">
                    Rp ${Number(item.total_biaya).toLocaleString('id-ID')}
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.chk-tagihan').forEach(chk => {
            chk.addEventListener('change', (e) => {
                if(e.target.checked) selectedTagihanIds.add(e.target.value);
                else selectedTagihanIds.delete(e.target.value);
                kalkulasiTotalBayar();
            });
        });

        document.getElementById('checkAllTagihan').checked = false;
        document.getElementById('checkAllTagihan').addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            document.querySelectorAll('.chk-tagihan').forEach(chk => {
                chk.checked = isChecked;
                if(isChecked) selectedTagihanIds.add(chk.value);
                else selectedTagihanIds.delete(chk.value);
            });
            kalkulasiTotalBayar();
        });
    }

    function kalkulasiTotalBayar() {
        let total = 0;
        dataTagihan.forEach(item => {
            if (selectedTagihanIds.has(item.id)) {
                total += Number(item.total_biaya);
            }
        });
        document.getElementById('teksTotalTagihan').innerText = `Rp ${total.toLocaleString('id-ID')}`;
        document.getElementById('btnKonfirmasiBayar').disabled = selectedTagihanIds.size === 0;
    }

    document.getElementById('btnKonfirmasiBayar').addEventListener('click', async () => {
        const fileStruk = document.getElementById('inputBuktiTransfer').files[0];
        if (!fileStruk) return alert("Wajib mengunggah foto Bukti Transfer!");

        const btn = document.getElementById('btnKonfirmasiBayar');
        btn.innerText = "Mengunggah Struk... ⏳"; 
        btn.disabled = true;

        try {
            const fileExt = fileStruk.name.split('.').pop();
            const fileName = `struk_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { error: uploadError } = await supabaseClient.storage.from('bukti-transfer').upload(fileName, fileStruk);
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabaseClient.storage.from('bukti-transfer').getPublicUrl(fileName);
            const strukUrl = urlData.publicUrl;

            const listIds = Array.from(selectedTagihanIds);
            const { error: updateError } = await supabaseClient
                .from('event_registrations')
                .update({ 
                    status_pembayaran: 'Menunggu Konfirmasi', 
                    bukti_transfer_url: strukUrl 
                })
                .in('id', listIds);

            if (updateError) throw updateError;

            alert("✅ Pembayaran berhasil dikirim! Silakan tunggu konfirmasi panitia.");
            document.getElementById('inputBuktiTransfer').value = "";
            loadTagihan(); 

        } catch (err) {
            alert("Gagal mengirim pembayaran: " + err.message);
        } finally {
            btn.innerText = "Konfirmasi Pembayaran"; 
            btn.disabled = false;
        }
    });
});
