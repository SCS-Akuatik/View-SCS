import { supabaseClient } from './supabase.js';

let dataKU = [];
let dataGaya = [];
let currentEventId = null;

// State untuk Form Desain
let configForm = {
    header_url: '',
    bg_url: '',
    enable_estafet: false,
    biaya_normal: '',
    min_diskon: '',
    biaya_diskon: ''
};

async function loadDataLomba() {
    const urlParams = new URLSearchParams(window.location.search);
    currentEventId = urlParams.get('id');

    if (!currentEventId) {
        alert("ID Event tidak ditemukan!");
        window.location.replace('/dashboard.html');
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('events')
            .select('config_ku, config_gaya, config')
            .eq('id', currentEventId)
            .single();

        if (error) throw error;

        dataKU = data?.config_ku || [];
        dataGaya = data?.config_gaya || [];
        
        // Load data Config Form
        const eventConfig = data?.config || {};
        configForm.header_url = eventConfig.header_url || '';
        configForm.bg_url = eventConfig.bg_url || '';
        configForm.enable_estafet = eventConfig.enable_estafet || false;
        configForm.biaya_normal = eventConfig.biaya_normal || '';
        configForm.min_diskon = eventConfig.min_diskon || '';
        configForm.biaya_diskon = eventConfig.biaya_diskon || '';

        // Pasang Default jika kosong
        if (dataKU.length === 0) dataKU = [{ id: 1, nama: 'KU 1', tahunMulai: 2008, tahunAkhir: 2010, aktif: true }];
        if (dataGaya.length === 0) dataGaya = [{ id: 1, nama: 'Gaya Bebas', icon: '🏊‍♂️', jarak: [{ id: 101, nama: '50m', aktif: true }] }];

        window.renderKU();
        window.renderGaya();
        renderFormConfig();

    } catch (err) {
        console.error(err);
        alert("Gagal memuat konfigurasi lomba.");
    }
}

// Render UI Form Desain & Harga
function renderFormConfig() {
    document.getElementById('toggleEstafet').checked = configForm.enable_estafet;
    document.getElementById('inputBiayaNormal').value = configForm.biaya_normal;
    document.getElementById('inputMinDiskon').value = configForm.min_diskon;
    document.getElementById('inputBiayaDiskon').value = configForm.biaya_diskon;

    if (configForm.header_url) {
        const imgH = document.getElementById('previewHeader');
        imgH.src = configForm.header_url;
        imgH.classList.remove('hidden');
    }
    if (configForm.bg_url) {
        const imgB = document.getElementById('previewBg');
        imgB.src = configForm.bg_url;
        imgB.classList.remove('hidden');
    }
}

// Logic Upload Gambar langsung ke Supabase Storage
async function handleImageUpload(event, keyName, previewId) {
    const file = event.target.files[0];
    if (!file) return;

    const preview = document.getElementById(previewId);
    preview.classList.remove('hidden');
    preview.src = 'https://media.tenor.com/On7kvXhzmV4AAAAj/loading-gif.gif'; // Animasi loading

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `event_${currentEventId}_${keyName}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabaseClient.storage
            .from('event-assets')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseClient.storage
            .from('event-assets')
            .getPublicUrl(fileName);

        // Simpan URL ke state sementara
        configForm[keyName] = urlData.publicUrl;
        preview.src = urlData.publicUrl;

    } catch (err) {
        console.error(err);
        alert("Gagal upload gambar!");
        preview.classList.add('hidden');
    }
}

// Pasang Listener Upload
document.addEventListener('DOMContentLoaded', () => {
    loadDataLomba();

    document.getElementById('inputHeader').addEventListener('change', (e) => handleImageUpload(e, 'header_url', 'previewHeader'));
    document.getElementById('inputBg').addEventListener('change', (e) => handleImageUpload(e, 'bg_url', 'previewBg'));
});


// ==========================================
// RENDER KU & GAYA (TIDAK BERUBAH)
// ==========================================
window.renderKU = function() {
    const container = document.getElementById('kuContainer');
    if (!container) return;
    container.innerHTML = ''; 
    dataKU.forEach(ku => {
        const checked = ku.aktif ? 'checked' : '';
        container.innerHTML += `
        <div class="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group">
            <div class="flex flex-col">
                <span class="font-bold text-slate-700 text-sm">${ku.nama}</span>
                <span class="text-[10px] text-slate-400">Lahir: ${ku.tahunMulai} - ${ku.tahunAkhir}</span>
            </div>
            <div class="flex items-center gap-3">
                <div class="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="editKU(${ku.id})" class="p-1.5 text-slate-400 hover:text-blue-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                    <button onclick="deleteKU(${ku.id})" class="p-1.5 text-slate-400 hover:text-red-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </div>
                <label class="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" class="sr-only peer" ${checked} onchange="toggleKU(${ku.id})">
                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
            </div>
        </div>`;
    });
}
window.renderGaya = function() {
    const container = document.getElementById('gayaContainer');
    if (!container) return;
    container.innerHTML = '';
    dataGaya.forEach(gaya => {
        let jarakHTML = '';
        gaya.jarak.forEach(jrk => {
            const checked = jrk.aktif ? 'checked' : '';
            jarakHTML += `
            <div class="flex items-center justify-between p-2.5 border border-slate-200 rounded-lg bg-white group/item hover:border-blue-200 transition-colors">
                <div class="flex flex-col">
                    <span class="font-bold text-slate-600 text-xs flex items-center gap-1">${jrk.nama}
                        <button onclick="deleteJarak(${gaya.id}, ${jrk.id})" class="text-slate-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 ml-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </span>
                </div>
                <input type="checkbox" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" ${checked} onchange="toggleJarak(${gaya.id}, ${jrk.id})">
            </div>`;
        });
        container.innerHTML += `
        <div class="mb-6 p-4 border border-slate-100 rounded-xl bg-slate-50/50 group/cat">
            <div class="flex items-center justify-between mb-3">
                <h3 class="font-bold text-slate-700 text-sm">${gaya.icon} ${gaya.nama}</h3>
                <button onclick="openModalJarak(${gaya.id})" class="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-md hover:bg-blue-200 flex items-center gap-1">➕ Jarak</button>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">${jarakHTML}</div>
        </div>`;
    });
}

// MODALS LOGIC
window.openModal = (id) => { document.getElementById(id).classList.remove('hidden'); document.getElementById(id).classList.add('flex'); }
window.closeModal = (id) => { document.getElementById(id).classList.add('hidden'); document.getElementById(id).classList.remove('flex'); }

window.openModalKU = () => { document.getElementById('kuId').value = ''; document.getElementById('kuNama').value = ''; document.getElementById('kuTahunMulai').value = ''; document.getElementById('kuTahunAkhir').value = ''; window.openModal('modalKU'); }
window.editKU = (id) => { const ku = dataKU.find(k => k.id === id); document.getElementById('kuId').value = ku.id; document.getElementById('kuNama').value = ku.nama; document.getElementById('kuTahunMulai').value = ku.tahunMulai; document.getElementById('kuTahunAkhir').value = ku.tahunAkhir; window.openModal('modalKU'); }
window.saveKU = () => { const id = document.getElementById('kuId').value; const nama = document.getElementById('kuNama').value; const tahunMulai = document.getElementById('kuTahunMulai').value; const tahunAkhir = document.getElementById('kuTahunAkhir').value; if(!nama) return alert('Kosong!'); if(id) { const index = dataKU.findIndex(k => k.id == id); dataKU[index] = { ...dataKU[index], nama, tahunMulai, tahunAkhir }; } else { dataKU.push({ id: Date.now(), nama, tahunMulai, tahunAkhir, aktif: true }); } window.renderKU(); window.closeModal('modalKU'); }
window.deleteKU = (id) => { if(confirm('Hapus?')) { dataKU = dataKU.filter(k => k.id !== id); window.renderKU(); } }
window.toggleKU = (id) => { const index = dataKU.findIndex(k => k.id == id); dataKU[index].aktif = !dataKU[index].aktif; }

window.openModalGaya = () => { document.getElementById('gayaId').value = ''; document.getElementById('gayaNama').value = ''; document.getElementById('gayaIcon').value = ''; window.openModal('modalGaya'); }
window.saveGaya = () => { const id = document.getElementById('gayaId').value; const nama = document.getElementById('gayaNama').value; const icon = document.getElementById('gayaIcon').value || '🏊'; if(!nama) return alert('Kosong!'); if(id) { const index = dataGaya.findIndex(g => g.id == id); dataGaya[index].nama = nama; dataGaya[index].icon = icon; } else { dataGaya.push({ id: Date.now(), nama, icon, jarak: [] }); } window.renderGaya(); window.closeModal('modalGaya'); }
window.openModalJarak = (gayaId) => { document.getElementById('jarakParentId').value = gayaId; document.getElementById('jarakId').value = ''; document.getElementById('jarakNama').value = ''; window.openModal('modalJarak'); }
window.saveJarak = () => { const gayaId = document.getElementById('jarakParentId').value; let nama = document.getElementById('jarakNama').value; if(!nama) return; nama = nama.trim().toLowerCase().replace(/\s*meter\s*$/i, ''); if (!nama.endsWith('m')) nama += 'm'; const gayaIndex = dataGaya.findIndex(g => g.id == gayaId); dataGaya[gayaIndex].jarak.push({ id: Date.now(), nama, aktif: true }); window.renderGaya(); window.closeModal('modalJarak'); }
window.deleteJarak = (gayaId, jarakId) => { if(confirm('Hapus jarak?')) { const gayaIndex = dataGaya.findIndex(g => g.id == gayaId); dataGaya[gayaIndex].jarak = dataGaya[gayaIndex].jarak.filter(j => j.id !== jarakId); window.renderGaya(); } }
window.toggleJarak = (gayaId, jarakId) => { const gayaIndex = dataGaya.findIndex(g => g.id == gayaId); const jarakIndex = dataGaya[gayaIndex].jarak.findIndex(j => j.id == jarakId); dataGaya[gayaIndex].jarak[jarakIndex].aktif = !dataGaya[gayaIndex].jarak[jarakIndex].aktif; }

// ==========================================
// SIMPAN SEMUA KE DATABASE
// ==========================================
window.simpanKeDatabase = async function() {
    const btnSave = document.querySelector('button[onclick="simpanKeDatabase()"]');
    btnSave.innerHTML = "Menyimpan...";
    btnSave.disabled = true;

    // Kumpulkan data Desain Form & Harga
    configForm.enable_estafet = document.getElementById('toggleEstafet').checked;
    configForm.biaya_normal = document.getElementById('inputBiayaNormal').value;
    configForm.min_diskon = document.getElementById('inputMinDiskon').value;
    configForm.biaya_diskon = document.getElementById('inputBiayaDiskon').value;

    try {
        // Gabungkan config lama dengan configForm baru
        const { data: oldData } = await supabaseClient.from('events').select('config').eq('id', currentEventId).single();
        const mergedConfig = { ...(oldData.config || {}), ...configForm };

        const { error } = await supabaseClient
            .from('events')
            .update({ 
                config_ku: dataKU, 
                config_gaya: dataGaya,
                config: mergedConfig // JSONB Sakti!
            })
            .eq('id', currentEventId);

        if (error) throw error;
        alert("Konfigurasi Form Lomba berhasil disimpan!");
        window.location.href = `/event-dashboard.html?id=${currentEventId}`;

    } catch (err) {
        console.error(err);
        alert("Gagal menyimpan: " + err.message);
    } finally {
        btnSave.innerHTML = "Simpan Pengaturan";
        btnSave.disabled = false;
    }
}
