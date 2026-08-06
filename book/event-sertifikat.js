import { supabaseClient } from '../src/supabase.js';

let currentEventId = null;
let uploadedImage = null; 
let currentMode = 'peserta'; // default

// DUMMY TEXT disesuaikan biar nggak numpuk sama teks background template
const DUMMY_PESERTA = {
    nama: "Kenzo Liman"
};

const DUMMY_JUARA = {
    nama: "Kenzo Liman",
    juara: "1", 
    nomor: "50 M Gaya Bebas Putra KU C",
    ku: "00:32.45" 
};

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentEventId = urlParams.get('id');

    if (!currentEventId) {
        alert("ID Event tidak ditemukan!");
        window.history.back();
        return;
    }

    // Load Event Name
    const { data: evData } = await supabaseClient.from('events').select('event_name').eq('id', currentEventId).single();
    if(evData) document.getElementById('eventName').innerText = evData.event_name;

    const tabPeserta = document.getElementById('tabPeserta');
    const tabJuara = document.getElementById('tabJuara');
    const winnerFieldsBox = document.getElementById('winnerFieldsBox');

    function setActiveTab(tab, mode) {
        currentMode = mode;
        [tabPeserta, tabJuara].forEach(t => {
            t.className = "px-6 py-2.5 rounded-full font-bold text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all shrink-0";
        });
        tab.className = "px-6 py-2.5 rounded-full font-bold text-sm bg-blue-900 text-white shadow transition-all shrink-0";
        
        if (mode === 'juara') {
            winnerFieldsBox.classList.remove('hidden');
        } else {
            winnerFieldsBox.classList.add('hidden');
        }
        drawPreview();
    }

    tabPeserta.onclick = () => setActiveTab(tabPeserta, 'peserta');
    tabJuara.onclick = () => setActiveTab(tabJuara, 'juara');

    const uploadInput = document.getElementById('uploadTemplate');
    const canvas = document.getElementById('certCanvas');
    const ctx = canvas.getContext('2d');
    const placeholder = document.getElementById('placeholderCanvas');
    const panelKoordinat = document.getElementById('panelKoordinat');

    // KETIKA EO PILIH GAMBAR BARU DARI LAPTOP
    uploadInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                uploadedImage = img;
                canvas.width = img.width;
                canvas.height = img.height;
                
                const centerX = img.width / 2;
                document.getElementById('coordNameX').value = centerX;
                document.getElementById('coordNameY').value = 400;

                if (currentMode === 'juara') {
                    document.getElementById('coordPreddX').value = centerX;
                    document.getElementById('coordPreddY').value = 500;
                    document.getElementById('coordNomorX').value = centerX;
                    document.getElementById('coordNomorY').value = 600;
                    document.getElementById('coordKUX').value = centerX;
                    document.getElementById('coordKUY').value = 700;
                }
                
                panelKoordinat.style.display = 'block';
                placeholder.classList.add('hidden');
                canvas.classList.remove('hidden');
                
                document.fonts.ready.then(() => drawPreview());
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    });

    function drawTextField(ctx, text, xId, yId, sizeId, fontType, fontColor) {
        const x = parseInt(document.getElementById(xId).value);
        const y = parseInt(document.getElementById(yId).value);
        const fontSize = document.getElementById(sizeId).value;

        ctx.textAlign = "center"; 
        if (fontType.includes('Great Vibes')) {
            ctx.font = `${fontSize}px ${fontType}`;
        } else {
            ctx.font = `bold ${fontSize}px ${fontType}`; 
        }
        ctx.fillStyle = fontColor; 
        ctx.fillText(text, x, y);
    }

    function drawPreview() {
        if (!uploadedImage) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);

        const fontColor = document.getElementById('sharedColor').value;
        const fontType = document.getElementById('sharedFont').value;

        if (currentMode === 'peserta') {
            drawTextField(ctx, DUMMY_PESERTA.nama, 'coordNameX', 'coordNameY', 'sizeName', fontType, fontColor);
        } else {
            drawTextField(ctx, DUMMY_JUARA.nama, 'coordNameX', 'coordNameY', 'sizeName', fontType, fontColor);
            drawTextField(ctx, DUMMY_JUARA.juara, 'coordPreddX', 'coordPreddY', 'sizePredd', fontType, fontColor);
            drawTextField(ctx, DUMMY_JUARA.nomor, 'coordNomorX', 'coordNomorY', 'sizeNomor', fontType, fontColor);
            drawTextField(ctx, DUMMY_JUARA.ku, 'coordKUX', 'coordKUY', 'sizeKU', fontType, fontColor);
        }
    }

    // AUTO-REFRESH LISTENER
    const inputsToAutoRefresh = document.querySelectorAll('#panelKoordinat input, #panelKoordinat select');
    inputsToAutoRefresh.forEach(input => {
        const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
        input.addEventListener(eventType, drawPreview);
    });

    document.getElementById('btnRefreshPreview').addEventListener('click', drawPreview);

    document.getElementById('btnAutoCenter').addEventListener('click', () => {
        if (!uploadedImage) return;
        const centerX = uploadedImage.width / 2;
        document.getElementById('coordNameX').value = centerX;
        if (currentMode === 'juara') {
            document.getElementById('coordPreddX').value = centerX;
            document.getElementById('coordNomorX').value = centerX;
            document.getElementById('coordKUX').value = centerX;
        }
        drawPreview();
    });

    // FITUR COPY LINK
    document.getElementById('btnCopyLink').addEventListener('click', () => {
        const urlParamsLink = new URLSearchParams(window.location.search);
        const link = `${window.location.origin}/cetak-sertifikat.html?id=${urlParamsLink.get('id')}`;
        navigator.clipboard.writeText(link).then(() => {
            alert(`Link Cetak Sertifikat Peserta berhasil disalin!\n\n${link}`);
        }).catch(err => {
            alert(`Gagal menyalin link. Silakan copy manual:\n${link}`);
        });
    });

    // FITUR LOAD CONFIG DATABASE
    document.getElementById('btnLoadConfig').addEventListener('click', async () => {
        const btn = document.getElementById('btnLoadConfig');
        btn.innerText = "⏳ Loading...";
        
        try {
            const { data, error } = await supabaseClient
                .from('event_certificates')
                .select('*')
                .eq('event_id', currentEventId)
                .eq('tipe', currentMode)
                .single();

            if (error || !data) {
                alert(`Belum ada template tersimpan untuk tipe: ${currentMode.toUpperCase()}`);
                btn.innerHTML = "<span>🔄</span> Load Template Tersimpan";
                return;
            }

            const config = data.config_json;
            
            // Set Style Bawaan
            document.getElementById('sharedColor').value = config.sharedStyle?.color || '#1e293b';
            document.getElementById('sharedFont').value = config.sharedStyle?.font || 'Arial, sans-serif';
            
            // Set Koordinat Nama
            document.getElementById('coordNameX').value = config.nama?.x || 1000;
            document.getElementById('coordNameY').value = config.nama?.y || 400;
            document.getElementById('sizeName').value = config.nama?.size || 95;

            // Set Koordinat Juara
            if (currentMode === 'juara' && config.extra) {
                document.getElementById('coordPreddX').value = config.extra.juara?.x || 1000;
                document.getElementById('coordPreddY').value = config.extra.juara?.y || 500;
                document.getElementById('sizePredd').value = config.extra.juara?.size || 45;

                document.getElementById('coordNomorX').value = config.extra.nomorLomba?.x || 1000;
                document.getElementById('coordNomorY').value = config.extra.nomorLomba?.y || 600;
                document.getElementById('sizeNomor').value = config.extra.nomorLomba?.size || 35;

                document.getElementById('coordKUX').value = config.extra.kelompokUmur?.x || 1000;
                document.getElementById('coordKUY').value = config.extra.kelompokUmur?.y || 700;
                document.getElementById('sizeKU').value = config.extra.kelompokUmur?.size || 45;
            }

            // Load Gambar
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                uploadedImage = img;
                canvas.width = img.width;
                canvas.height = img.height;
                panelKoordinat.style.display = 'block';
                placeholder.classList.add('hidden');
                canvas.classList.remove('hidden');
                drawPreview();
            };
            img.src = data.template_url + "?t=" + new Date().getTime(); // bypass cache
            
            alert(`✅ Konfigurasi ${currentMode.toUpperCase()} berhasil di-load!`);

        } catch (err) {
            alert("Terjadi kesalahan saat memuat template.");
        } finally {
            btn.innerHTML = "<span>🔄</span> Load Template Tersimpan";
        }
    });

    // LOGIC UPSERT (TIMPA DATA)
    document.getElementById('btnSaveConfig').addEventListener('click', async () => {
        // Cek kalau EO cuma nge-load dan ngedit koordinat aja tanpa upload file baru
        let publicUrl = null;
        let isUploadingNewImage = false;
        const file = uploadInput.files[0];

        if (file) {
            isUploadingNewImage = true;
        } else if (uploadedImage) {
            // Berarti pake gambar dari load database
            publicUrl = uploadedImage.src.split('?')[0]; // buang parameter anti-cache
        } else {
            alert("Pilih template image atau Load konfigurasi lama dulu Bos!");
            return;
        }

        const btn = document.getElementById('btnSaveConfig');
        const statusMsg = document.getElementById('statusMsg');
        btn.innerText = "Processing...";
        btn.disabled = true;
        statusMsg.classList.remove('hidden');
        statusMsg.innerText = "Menyimpan konfigurasi...";
        statusMsg.className = "text-xs text-center mt-3 font-bold text-blue-600";

        try {
            // 1. Upload File (Hanya jika EO pilih gambar baru dari laptop)
            if (isUploadingNewImage) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${currentEventId}_${currentMode}_${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabaseClient.storage.from('sertifikat-template').upload(fileName, file);
                if (uploadError) throw uploadError;

                const { data: urlData } = supabaseClient.storage.from('sertifikat-template').getPublicUrl(fileName);
                publicUrl = urlData.publicUrl;
            }

            // 2. Susun JSON Config Baru
            let configJson = {
                sharedStyle: {
                    color: document.getElementById('sharedColor').value,
                    font: document.getElementById('sharedFont').value
                },
                nama: { 
                    x: document.getElementById('coordNameX').value, 
                    y: document.getElementById('coordNameY').value,
                    size: document.getElementById('sizeName').value
                }
            };

            if (currentMode === 'juara') {
                configJson.extra = {
                    juara: {
                        x: document.getElementById('coordPreddX').value,
                        y: document.getElementById('coordPreddY').value,
                        size: document.getElementById('sizePredd').value
                    },
                    nomorLomba: {
                        x: document.getElementById('coordNomorX').value,
                        y: document.getElementById('coordNomorY').value,
                        size: document.getElementById('sizeNomor').value
                    },
                    kelompokUmur: {
                        x: document.getElementById('coordKUX').value,
                        y: document.getElementById('coordKUY').value,
                        size: document.getElementById('sizeKU').value
                    }
                };
            }

            // 3. Cek apakah di database sudah ada baris untuk event ini dan tipe ini
            const { data: existingRow } = await supabaseClient
                .from('event_certificates')
                .select('id')
                .eq('event_id', currentEventId)
                .eq('tipe', currentMode)
                .single();

            // 4. UPSERT MANUAL (Update jika ada, Insert jika tidak ada)
            if (existingRow) {
                const { error: updateError } = await supabaseClient
                    .from('event_certificates')
                    .update({
                        template_url: publicUrl,
                        config_json: configJson
                    })
                    .eq('id', existingRow.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabaseClient
                    .from('event_certificates')
                    .insert([{
                        event_id: currentEventId,
                        tipe: currentMode,
                        template_url: publicUrl,
                        config_json: configJson
                    }]);
                if (insertError) throw insertError;
            }

            statusMsg.innerText = `✅ Tersimpan! Halaman akan dimuat ulang...`;
            statusMsg.className = "text-xs text-center mt-3 font-bold text-emerald-600";
            
            // Auto Refresh supaya mode-nya kereset bersih
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            
        } catch (err) {
            console.error(err);
            statusMsg.innerText = "❌ Gagal: " + err.message;
            statusMsg.className = "text-xs text-center mt-3 font-bold text-red-600";
            btn.innerHTML = "<span>💾</span> Simpan & Timpa Template";
            btn.disabled = false;
        }
    });
});
