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

        if (config.header_url) {
            document.getElementById('headerBannerContainer').style.backgroundImage = `url('${config.header_url}')`;
        }
        if (config.bg_url) {
            document.getElementById('pageBody').style.backgroundImage = `url('${config.bg_url}')`;
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
});
