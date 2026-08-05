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
    const tabMVS = document.getElementById('tabMVS');
    const panelJuaraExtra = document.getElementById('panelJuaraExtra');

    function setActiveTab(tab, mode) {
        currentMode = mode;
        [tabPeserta, tabJuara, tabMVS].forEach(t => {
            t.className = "px-6 py-2.5 rounded-full font-bold text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all shrink-0";
        });
        tab.className = "px-6 py-2.5 rounded-full font-bold text-sm bg-blue-900 text-white shadow transition-all shrink-0";
        
        if (mode === 'juara') panelJuaraExtra.classList.remove('hidden');
        else panelJuaraExtra.classList.add('hidden');

        if (mode === 'mvs') {
            alert("Sertifikat MVS segera hadir.");
            setActiveTab(tabPeserta, 'peserta');
            return;
        }
        drawPreview();
    }

    tabPeserta.onclick = () => setActiveTab(tabPeserta, 'peserta');
    tabJuara.onclick = () => setActiveTab(tabJuara, 'juara');
    tabMVS.onclick = () => setActiveTab(tabMVS, 'mvs');

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
                
                document.getElementById('coordNameX').value = img.width / 2;
                document.getElementById('coordNameY').value = img.height / 2;
                document.getElementById('coordClubX').value = img.width / 2;
                document.getElementById('coordClubY').value = (img.height / 2) + 100;
                
                panelKoordinat.style.display = 'block';
                placeholder.classList.add('hidden');
                canvas.classList.remove('hidden');
                
                drawPreview();
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    });

    function drawPreview() {
        if (!uploadedImage) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);

        ctx.textAlign = "center"; 
        const nX = parseInt(document.getElementById('coordNameX').value);
        const nY = parseInt(document.getElementById('coordNameY').value);
        const cX = parseInt(document.getElementById('coordClubX').value);
        const cY = parseInt(document.getElementById('coordClubY').value);

        ctx.font = "bold 80px Arial";
        ctx.fillStyle = "#1e293b"; 
        ctx.fillText("RICHARD ZANE TANDOYO", nX, nY);

        ctx.font = "italic 40px Arial";
        ctx.fillStyle = "#64748b"; 
        ctx.fillText("Jago Renang Academy", cX, cY);

        if (currentMode === 'juara') {
            const eX = parseInt(document.getElementById('coordEventX').value);
            const eY = parseInt(document.getElementById('coordEventY').value);
            const tX = parseInt(document.getElementById('coordTimeX').value);
            const tY = parseInt(document.getElementById('coordTimeY').value);

            ctx.font = "bold 50px Arial";
            ctx.fillStyle = "#b45309"; 
            ctx.fillText("50 M Gaya Bebas Putra KU A", eX, eY);

            ctx.font = "bold 60px monospace";
            ctx.fillStyle = "#047857"; 
            ctx.fillText("⏱️ 00:28.45", tX, tY);
        }
    }

    document.getElementById('btnRenderPreview').addEventListener('click', drawPreview);

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

            const configJson = {
                nama: { x: document.getElementById('coordNameX').value, y: document.getElementById('coordNameY').value },
                klub: { x: document.getElementById('coordClubX').value, y: document.getElementById('coordClubY').value }
            };

            if (currentMode === 'juara') {
                configJson.event = { x: document.getElementById('coordEventX').value, y: document.getElementById('coordEventY').value };
                configJson.waktu = { x: document.getElementById('coordTimeX').value, y: document.getElementById('coordTimeY').value };
            }

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

            statusMsg.innerText = `✅ Template ${currentMode.toUpperCase()} berhasil disimpan!`;
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
