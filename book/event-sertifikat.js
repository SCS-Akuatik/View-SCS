import { supabaseClient } from '../src/supabase.js';

let currentEventId = null;
let uploadedImage = null; 
let currentMode = 'peserta'; 

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

    function setActiveTab(tab, mode) {
        currentMode = mode;
        [tabPeserta, tabJuara].forEach(t => {
            t.className = "px-6 py-2.5 rounded-full font-bold text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all shrink-0";
        });
        tab.className = "px-6 py-2.5 rounded-full font-bold text-sm bg-blue-900 text-white shadow transition-all shrink-0";
        
        if (mode === 'juara') {
            alert("Fokus ke Sertifikat Peserta dulu ya Bos! Sesuai request.");
            setActiveTab(tabPeserta, 'peserta');
            return;
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
                
                // Set default posisi teks tepat di tengah gambar
                document.getElementById('coordNameX').value = img.width / 2;
                document.getElementById('coordNameY').value = img.height / 2;
                
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

    function drawPreview() {
        if (!uploadedImage) return;

        // Bersihkan canvas dan gambar ulang template dasar
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);

        // Ambil Nilai dari Inputan EO
        const nX = parseInt(document.getElementById('coordNameX').value);
        const nY = parseInt(document.getElementById('coordNameY').value);
        const fontColor = document.getElementById('colorName').value;
        const fontSize = document.getElementById('sizeName').value;
        const fontType = document.getElementById('fontName').value;

        // Atur Style Teks
        ctx.textAlign = "center"; 
        
        // Font Latin Mewah nggak perlu dibikin "bold", kalau Arial boleh bold.
        if (fontType.includes('Great Vibes')) {
            ctx.font = `${fontSize}px ${fontType}`;
        } else {
            ctx.font = `bold ${fontSize}px ${fontType}`;
        }
        
        ctx.fillStyle = fontColor; 
        
        // Render Teks Dummy
        ctx.fillText("Richard Zane Tandoyo", nX, nY);
    }

    // Listener tiap kali EO merubah pengaturan, otomatis ter-refresh!
    document.getElementById('btnRenderPreview').addEventListener('click', drawPreview);
    document.getElementById('colorName').addEventListener('input', drawPreview);
    document.getElementById('fontName').addEventListener('change', drawPreview);
    document.getElementById('sizeName').addEventListener('input', drawPreview);

    document.getElementById('btnSaveConfig').addEventListener('click', async () => {
        const file = uploadInput.files[0];
        const statusMsg = document.getElementById('statusMsg');

        if (!file) return;

        const btn = document.getElementById('btnSaveConfig');
        btn.innerText = "Processing...";
        btn.disabled = true;
        statusMsg.classList.remove('hidden');
        statusMsg.innerText = "Mengunggah template ke server...";
        statusMsg.className = "text-xs text-center mt-3 font-bold text-blue-600";

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentEventId}_${currentMode}_${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabaseClient.storage.from('sertifikat-template').upload(fileName, file);
            if (uploadError) throw uploadError;

            const { data: urlData } = supabaseClient.storage.from('sertifikat-template').getPublicUrl(fileName);
            const publicUrl = urlData.publicUrl;

            // Simpan Koordinat, Warna, Ukuran, dan Jenis Font!
            const configJson = {
                nama: { 
                    x: document.getElementById('coordNameX').value, 
                    y: document.getElementById('coordNameY').value,
                    color: document.getElementById('colorName').value,
                    size: document.getElementById('sizeName').value,
                    font: document.getElementById('fontName').value
                }
            };

            const { error: dbError } = await supabaseClient
                .from('event_certificates')
                .insert([{
                    event_id: currentEventId,
                    tipe: currentMode,
                    kelompok_umur: null, 
                    template_url: publicUrl,
                    config_json: configJson
                }]);

            if (dbError) throw dbError;

            statusMsg.innerText = `✅ Template Sertifikat Peserta berhasil disimpan!`;
            statusMsg.className = "text-xs text-center mt-3 font-bold text-emerald-600";
            
        } catch (err) {
            console.error(err);
            statusMsg.innerText = "❌ Gagal: " + err.message;
            statusMsg.className = "text-xs text-center mt-3 font-bold text-red-600";
        } finally {
            btn.innerText = "💾 Simpan Template ke Server";
            btn.disabled = false;
        }
    });
});
