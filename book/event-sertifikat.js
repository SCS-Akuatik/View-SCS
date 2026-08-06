import { supabaseClient } from '../src/supabase.js';

let currentEventId = null;
let uploadedImage = null; 
let currentMode = 'peserta'; // default

// DUMMY DATA UNTUK PREVIEW (Sesuaikan request)
const DUMMY_PESERTA = {
    nama: "Nama lengkap Peserta"
};

const DUMMY_JUARA = {
    nama: "Nama lengkap Peserta",
    juara: "1 (Satu)",
    nomor: "25m Gaya Bebas",
    ku: "KU A (200x - 200x)"
};

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentEventId = urlParams.get('id');

    if (!currentEventId) {
        alert("ID Event tidak ditemukan!");
        window.history.back();
        return;
    }

    const tabPeserta = document.getElementById('tabPeserta');
    const tabJuara = document.getElementById('tabJuara');
    const winnerFieldsBox = document.getElementById('winnerFieldsBox');

    function setActiveTab(tab, mode) {
        currentMode = mode;
        // Reset tabs style
        [tabPeserta, tabJuara].forEach(t => {
            t.className = "px-6 py-2.5 rounded-full font-bold text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all shrink-0";
        });
        // Set active style
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
                
                // Set default posisi teks tepat di tengah gambar (X)
                document.getElementById('coordNameX').value = img.width / 2;
                if (currentMode === 'juara') {
                    document.getElementById('coordPreddX').value = img.width / 2;
                    document.getElementById('coordNomorX').value = img.width / 2;
                    document.getElementById('coordKUX').value = img.width / 2;
                }
                
                panelKoordinat.style.display = 'block';
                placeholder.classList.add('hidden');
                canvas.classList.remove('hidden');
                
                // Pastikan font custom diload browser sebelum di-render ke canvas
                document.fonts.ready.then(function () {
                    drawPreview();
                });
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    });

    // FUNCTION UNTUK MENGGAMBAR SATU FIELD TEKS
    function drawTextField(ctx, text, xId, yId, sizeId, fontType, fontColor) {
        const x = parseInt(document.getElementById(xId).value);
        const y = parseInt(document.getElementById(yId).value);
        const fontSize = document.getElementById(sizeId).value;

        ctx.textAlign = "center"; 
        if (fontType.includes('Great Vibes')) {
            ctx.font = `${fontSize}px ${fontType}`; // Font Latin Mewah nggak perlu "bold"
        } else {
            ctx.font = `bold ${fontSize}px ${fontType}`; // Arial/TNRoman boleh bold.
        }
        ctx.fillStyle = fontColor; 
        ctx.fillText(text, x, y);
    }

    function drawPreview() {
        if (!uploadedImage) return;

        // Bersihkan canvas dan gambar ulang template dasar
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);

        // Ambil Nilai SHARED Style EO
        const fontColor = document.getElementById('sharedColor').value;
        const fontType = document.getElementById('sharedFont').value;

        // Render Teks sesuai Mode
        if (currentMode === 'peserta') {
            drawTextField(ctx, DUMMY_PESERTA.nama, 'coordNameX', 'coordNameY', 'sizeName', fontType, fontColor);
        } else {
            // Mode Juara (4 IsianEditable)
            drawTextField(ctx, DUMMY_JUARA.nama, 'coordNameX', 'coordNameY', 'sizeName', fontType, fontColor);
            drawTextField(ctx, DUMMY_JUARA.juara, 'coordPreddX', 'coordPreddY', 'sizePredd', fontType, fontColor);
            drawTextField(ctx, DUMMY_JUARA.nomor, 'coordNomorX', 'coordNomorY', 'sizeNomor', fontType, fontColor);
            drawTextField(ctx, DUMMY_JUARA.ku, 'coordKUX', 'coordKUY', 'sizeKU', fontType, fontColor);
        }
    }

    // --- AUTO-REFRESH LOGIC (Request user) ---
    // Tambahkan event listener 'input' dan 'change' ke semua box input
    const inputsToAutoRefresh = panelKoordinat.querySelectorAll('input, select');
    inputsToAutoRefresh.forEach(input => {
        const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
        input.addEventListener(eventType, drawPreview);
    });

    // Tombol Manual Refresh tetap ada buat jaga-jaga
    document.getElementById('btnRefreshPreview').addEventListener('click', drawPreview);

    // Tombol Auto-Center X
    document.getElementById('btnAutoCenter').addEventListener('click', () => {
        if (!uploadedImage) return;
        const centerX = uploadedImage.width / 2;
        document.getElementById('coordNameX').value = centerX;
        if (currentMode === 'juara') {
            document.getElementById('coordPreddX').value = centerX;
            document.getElementById('coordNomorX').value = centerX;
            document.getElementById('coordKUX').value = centerX;
        }
        drawPreview(); // Refresh otomatis setelah center
    });

    // LOGIC PENYIMPANAN TEMPLATE (Multi-field Juara)
    document.getElementById('btnSaveConfig').addEventListener('click', async () => {
        const file = uploadInput.files[0];
        const statusMsg = document.getElementById('statusMsg');

        if (!uploadedImage || !file) {
            alert("Pilih template image dulu Bos!");
            return;
        }

        const btn = document.getElementById('btnSaveConfig');
        btn.innerText = "Processing...";
        btn.disabled = true;
        statusMsg.classList.remove('hidden');
        statusMsg.innerText = "Mengunggah template ke server...";
        statusMsg.className = "text-xs text-center mt-3 font-bold text-blue-600";

        try {
            const fileExt = file.name.split('.').pop();
            // Buat nama file unik: eventId_mode_timestamp.ext
            const fileName = `${currentEventId}_${currentMode}_${Date.now()}.${fileExt}`;
            
            // 1. Upload file ke storage bucket 'sertifikat-template'
            const { error: uploadError } = await supabaseClient.storage.from('sertifikat-template').upload(fileName, file);
            if (uploadError) throw uploadError;

            // 2. Dapatkan Public URL
            const { data: urlData } = supabaseClient.storage.from('sertifikat-template').getPublicUrl(fileName);
            const publicUrl = urlData.publicUrl;

            // 3. Susun Struktur JSON yang Kompleks (Terutama untuk Mode Juara)
            let configJson = {
                // Shared Style
                sharedStyle: {
                    color: document.getElementById('sharedColor').value,
                    font: document.getElementById('sharedFont').value
                },
                // Koordinat Nama (Wajib ada di kedua mode)
                nama: { 
                    x: document.getElementById('coordNameX').value, 
                    y: document.getElementById('coordNameY').value,
                    size: document.getElementById('sizeName').value
                }
            };

            // Tambahkan koordinat extra jika mode Juara
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

            // 4. Simpan ke Database
            const { error: dbError } = await supabaseClient
                .from('event_certificates')
                .insert([{
                    event_id: currentEventId,
                    tipe: currentMode, // 'peserta' atau 'juara'
                    template_url: publicUrl,
                    config_json: configJson
                }]);

            if (dbError) throw dbError;

            const modeText = currentMode === 'juara' ? 'Juara' : 'Peserta';
            statusMsg.innerText = `✅ Template Sertifikat ${modeText} berhasil disimpan!`;
            statusMsg.className = "text-xs text-center mt-3 font-bold text-emerald-600";
            
        } catch (err) {
            console.error(err);
            statusMsg.innerText = "❌ Gagal: " + err.message;
            statusMsg.className = "text-xs text-center mt-3 font-bold text-red-600";
        } finally {
            btn.innerHTML = "<span>💾</span> Simpan Template ke Server";
            btn.disabled = false;
        }
    });
});
