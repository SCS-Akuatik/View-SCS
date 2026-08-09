import { supabaseClient } from './supabase.js';

let dataKU = [];
let dataGaya = [];
let dataEstafet = []; 
let currentEventId = null;

// State JSONB Config (Termasuk WA Admin & Nama Kolam)
let configForm = {
    header_url: '',
    bg_url: '',
    biaya_normal: '',
    min_diskon: '',
    biaya_diskon: '',
    admin_wa_1: '', 
    admin_wa_2: '', 
    info_pembayaran: '',
    qris_url: '',
    nama_kolam: '' // <-- INIT NAMA KOLAM BARU
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
            .select('config_ku, config_gaya, config_estafet, config')
            .eq('id', currentEventId)
            .single();

        if (error) throw error;

        dataKU = data?.config_ku || [];
        dataGaya = data?.config_gaya || [];
        dataEstafet = data?.config_estafet || [];
        
        // Tarik data dari brankas JSONB config
        const eventConfig = data?.config || {};
        configForm.header_url = eventConfig.header_url || '';
        configForm.bg_url = eventConfig.bg_url || '';
        configForm.biaya_normal = eventConfig.biaya_normal || '';
        configForm.min_diskon = eventConfig.min_diskon || '';
        configForm.biaya_diskon = eventConfig.biaya_diskon || '';
        configForm.admin_wa_1 = eventConfig.admin_wa_1 || ''; 
        configForm.admin_wa_2 = eventConfig.admin_wa_2 || ''; 
        configForm.info_pembayaran = eventConfig.info_pembayaran || ''; 
        configForm.qris_url = eventConfig.qris_url || ''; 
        configForm.nama_kolam = eventConfig.nama_kolam || ''; // <-- LOAD NAMA KOLAM BARU

        // Default Data jika kosong
        if (dataKU.length === 0) dataKU = [{ id: 1, nama: 'KU A', tahunMulai: 2011, tahunAkhir: 2012, aktif: true }];
        if (dataGaya.length === 0) dataGaya = [{ id: 1, nama: 'Gaya Bebas', jarak: [{ id: 101, nama: '50m', aktif: true }] }];
        if (dataEstafet.length === 0) dataEstafet = [{ id: 1, nama: 'Estafet Gaya Bebas', list: [{ id: 101, jarak: '4x50m', jenis: 'Mix', aktif: true }] }];

        window.renderKU();
        window.renderGaya();
        window.renderEstafet();
        renderFormConfig();

    } catch (err) {
        console.error(err);
        alert("Gagal memuat konfigurasi lomba.");
    }
}

function renderFormConfig() {
    document.getElementById('inputBiayaNormal').value = configForm.biaya_normal;
    document.getElementById('inputMinDiskon').value = configForm.min_diskon;
    document.getElementById('inputBiayaDiskon').value = configForm.biaya_diskon;
    
    // Tulis WA ke Input Box
    if (document.getElementById('inputAdminWA1')) document.getElementById('inputAdminWA1').value = configForm.admin_wa_1;
    if (document.getElementById('inputAdminWA2')) document.getElementById('inputAdminWA2').value = configForm.admin_wa_2;
    if (document.getElementById('inputInfoPembayaran')) document.getElementById('inputInfoPembayaran').value = configForm.info_pembayaran; 
    
    // RENDER NAMA KOLAM BARU
    if (document.getElementById('inputNamaKolam')) document.getElementById('inputNamaKolam').value = configForm.nama_kolam;

    if (configForm.header_url) {
        const imgH = document.getElementById('previewHeader');
        if (imgH) { imgH.src = configForm.header_url; imgH.classList.remove('hidden'); }
    }
    if (configForm.bg_url) {
        const imgB = document.getElementById('previewBg');
        if (imgB) { imgB.src = configForm.bg_url; imgB.classList.remove('hidden'); }
    }
    if (configForm.qris_url) {
        const imgQ = document.getElementById('previewQris');
        if (imgQ) { imgQ.src = configForm.qris_url; imgQ.classList.remove('hidden'); }
    }
}

async function handleImageUpload(event, keyName, previewId) {
    const file = event.target.files[0];
    if (!file) return;

    const preview = document.getElementById(previewId);
    if (preview) {
        preview.classList.remove('hidden');
        preview.src = 'https://media.tenor.com/On7kvXhzmV4AAAAj/loading-gif.gif'; 
    }

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `event_${currentEventId}_${keyName}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabaseClient.storage.from('event-assets').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseClient.storage.from('event-assets').getPublicUrl(fileName);
        configForm[keyName] = urlData.publicUrl;
        
        if (preview) preview.src = urlData.publicUrl;

    } catch (err) {
        console.error(err);
        alert("Gagal upload gambar!");
        if (preview) preview.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadDataLomba();
    
    const inputHeader = document.getElementById('inputHeader');
    if(inputHeader) inputHeader.addEventListener('change', (e) => handleImageUpload(e, 'header_url', 'previewHeader'));
    
    const inputBg = document.getElementById('inputBg');
    if(inputBg) inputBg.addEventListener('change', (e) => handleImageUpload(e, 'bg_url', 'previewBg'));
    
    const inputQris = document.getElementById('inputQris');
    if (inputQris) inputQris.addEventListener('change', (e) => handleImageUpload(e, 'qris_url', 'previewQris'));
});

// ==========================================
// RENDER KU, GAYA, ESTAFET
// ==========================================
window.renderKU = function() { 
    const container = document.getElementById('kuContainer'); 
    if (!container) return; 
    container.innerHTML = ''; 
    dataKU.forEach(ku => { 
        const checked = ku.aktif ? 'checked' : ''; 
        container.innerHTML += `
        <div class="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors group shadow-sm">
            <div class="flex flex-col">
                <span class="font-bold text-slate-700 text-sm">${ku.nama}</span>
                <span class="text-[11px] font-semibold text-slate-500 mt-0.5">Tahun: ${ku.tahunMulai} - ${ku.tahunAkhir}</span>
            </div>
            <div class="flex items-center gap-4">
                <div class="hidden sm:flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="editKU(${ku.id})" class="text-blue-600 font-bold hover:text-blue-800 text-[11px] transition-colors">Edit</button>
                    <button onclick="deleteKU(${ku.id})" class="text-slate-400 font-bold hover:text-red-600 text-[11px] transition-colors">Hapus</button>
                </div>
                <label class="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" class="sr-only peer" ${checked} onchange="toggleKU(${ku.id})">
                    <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
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
            <div class="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white group/item hover:border-blue-200 transition-colors shadow-sm">
                <div class="flex flex-col">
                    <span class="font-bold text-slate-700 text-xs flex items-center gap-2">${jrk.nama} 
                        <button onclick="deleteJarak(${gaya.id}, ${jrk.id})" class="text-slate-400 hover:text-red-500 font-bold text-[10px] opacity-0 group-hover/item:opacity-100 transition-opacity">Hapus</button>
                    </span>
                </div>
                <input type="checkbox" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" ${checked} onchange="toggleJarak(${gaya.id}, ${jrk.id})">
            </div>`; 
        }); 
        
        container.innerHTML += `
        <div class="mb-6 p-5 border border-slate-200 rounded-xl bg-slate-50 group/cat">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                <div class="flex items-center gap-3">
                    <h3 class="font-extrabold text-slate-800 text-sm tracking-wide uppercase">${gaya.nama}</h3>
                    <button onclick="deleteGaya(${gaya.id})" class="text-[10px] font-bold text-slate-400 hover:text-red-600 opacity-0 group-hover/cat:opacity-100 transition-opacity">Hapus Kategori</button>
                </div>
                <button onclick="openModalJarak(${gaya.id})" class="text-[10px] font-bold text-blue-600 bg-blue-100 px-3 py-1.5 rounded-md hover:bg-blue-200 transition-colors">Tambah Jarak</button>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">${jarakHTML}</div>
        </div>`; 
    }); 
}

window.renderEstafet = function() { 
    const container = document.getElementById('estafetContainer'); 
    if (!container) return; 
    container.innerHTML = ''; 
    dataEstafet.forEach(estafet => { 
        let listHTML = ''; 
        estafet.list.forEach(item => { 
            const checked = item.aktif ? 'checked' : ''; 
            let badgeColor = 'bg-gray-100 text-gray-600'; 
            if(item.jenis === 'Putra') badgeColor = 'bg-blue-100 text-blue-700'; 
            if(item.jenis === 'Putri') badgeColor = 'bg-pink-100 text-pink-700'; 
            if(item.jenis === 'Mix') badgeColor = 'bg-purple-100 text-purple-700'; 
            
            listHTML += `
            <div class="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white group/item hover:border-purple-200 transition-colors shadow-sm">
                <div class="flex flex-col gap-1">
                    <span class="font-bold text-slate-700 text-xs">${item.jarak}</span>
                    <div class="flex items-center gap-2">
                        <span class="text-[9px] font-bold px-2 py-0.5 rounded ${badgeColor} uppercase tracking-wider">${item.jenis}</span>
                        <button onclick="deleteItemEstafet(${estafet.id}, ${item.id})" class="text-slate-400 hover:text-red-500 font-bold text-[10px] opacity-0 group-hover/item:opacity-100 transition-opacity">Hapus</button>
                    </div>
                </div>
                <input type="checkbox" class="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500" ${checked} onchange="toggleItemEstafet(${estafet.id}, ${item.id})">
            </div>`; 
        }); 
        
        container.innerHTML += `
        <div class="mb-6 p-5 border border-purple-100 rounded-xl bg-purple-50/30 group/cat">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-purple-200/50">
                <div class="flex items-center gap-3">
                    <h3 class="font-extrabold text-slate-800 text-sm tracking-wide uppercase">${estafet.nama}</h3>
                    <button onclick="deleteEstafet(${estafet.id})" class="text-[10px] font-bold text-slate-400 hover:text-red-600 opacity-0 group-hover/cat:opacity-100 transition-opacity">Hapus Kategori</button>
                </div>
                <button onclick="openModalItemEstafet(${estafet.id})" class="text-[10px] font-bold text-purple-700 bg-purple-100 px-3 py-1.5 rounded-md hover:bg-purple-200 transition-colors">Tambah Nomor</button>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">${listHTML}</div>
        </div>`; 
    }); 
}

// ==========================================
// SEMUA LOGIKA MODAL
// ==========================================
window.openModal = (id) => { const el = document.getElementById(id); if(el) { el.classList.remove('hidden'); el.classList.add('flex'); } }
window.closeModal = (id) => { const el = document.getElementById(id); if(el) { el.classList.add('hidden'); el.classList.remove('flex'); } }

window.openModalKU = () => { 
    document.getElementById('kuId').value = ''; 
    document.getElementById('kuNama').value = ''; 
    document.getElementById('kuTahunMulai').value = ''; 
    document.getElementById('kuTahunAkhir').value = ''; 
    document.getElementById('modalKUTitle').innerText = 'Buat KU Baru'; 
    const btnSave = document.getElementById('btnSaveKU'); 
    btnSave.innerText = 'Simpan'; 
    btnSave.className = 'w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm mt-2 transition-colors'; 
    window.openModal('modalKU'); 
}

window.editKU = (id) => { 
    const ku = dataKU.find(k => k.id === id); 
    document.getElementById('kuId').value = ku.id; 
    document.getElementById('kuNama').value = ku.nama; 
    document.getElementById('kuTahunMulai').value = ku.tahunMulai; 
    document.getElementById('kuTahunAkhir').value = ku.tahunAkhir; 
    document.getElementById('modalKUTitle').innerText = 'Edit Kelompok Umur'; 
    const btnSave = document.getElementById('btnSaveKU'); 
    btnSave.innerText = 'Simpan Perubahan'; 
    btnSave.className = 'w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm mt-2 transition-colors'; 
    window.openModal('modalKU'); 
}

window.saveKU = () => { 
    const id = document.getElementById('kuId').value; 
    const nama = document.getElementById('kuNama').value; 
    const tahunMulai = document.getElementById('kuTahunMulai').value; 
    const tahunAkhir = document.getElementById('kuTahunAkhir').value; 
    if(!nama) return alert('Nama KU wajib diisi!'); 
    if(id) { 
        const index = dataKU.findIndex(k => k.id == id); 
        dataKU[index] = { ...dataKU[index], nama, tahunMulai, tahunAkhir }; 
    } else { 
        dataKU.push({ id: Date.now(), nama, tahunMulai, tahunAkhir, aktif: true }); 
    } 
    window.renderKU(); 
    window.closeModal('modalKU'); 
}

window.deleteKU = (id) => { if(confirm('Yakin hapus Kelompok Umur ini?')) { dataKU = dataKU.filter(k => k.id !== id); window.renderKU(); } }
window.toggleKU = (id) => { const index = dataKU.findIndex(k => k.id == id); dataKU[index].aktif = !dataKU[index].aktif; }

window.openModalGaya = () => { document.getElementById('gayaId').value = ''; document.getElementById('gayaNama').value = ''; window.openModal('modalGaya'); }
window.saveGaya = () => { 
    const id = document.getElementById('gayaId').value; 
    const nama = document.getElementById('gayaNama').value; 
    if(!nama) return alert('Nama Gaya wajib diisi!'); 
    if(id) { const index = dataGaya.findIndex(g => g.id == id); dataGaya[index].nama = nama; } 
    else { dataGaya.push({ id: Date.now(), nama, jarak: [] }); } 
    window.renderGaya(); 
    window.closeModal('modalGaya'); 
}
window.deleteGaya = (id) => { if(confirm('Hapus Kategori Gaya ini?')) { dataGaya = dataGaya.filter(g => g.id !== id); window.renderGaya(); } }

window.openModalJarak = (gayaId) => { document.getElementById('jarakParentId').value = gayaId; document.getElementById('jarakId').value = ''; document.getElementById('jarakNama').value = ''; window.openModal('modalJarak'); }
window.saveJarak = () => { 
    const gayaId = document.getElementById('jarakParentId').value; 
    let nama = document.getElementById('jarakNama').value; 
    if(!nama) return; 
    nama = nama.trim().toLowerCase().replace(/\s*meter\s*$/i, ''); 
    if (!nama.endsWith('m')) nama += 'm'; 
    const gayaIndex = dataGaya.findIndex(g => g.id == gayaId); 
    dataGaya[gayaIndex].jarak.push({ id: Date.now(), nama, aktif: true }); 
    window.renderGaya(); 
    window.closeModal('modalJarak'); 
}
window.deleteJarak = (gayaId, jarakId) => { if(confirm('Hapus jarak ini?')) { const gayaIndex = dataGaya.findIndex(g => g.id == gayaId); dataGaya[gayaIndex].jarak = dataGaya[gayaIndex].jarak.filter(j => j.id !== jarakId); window.renderGaya(); } }
window.toggleJarak = (gayaId, jarakId) => { const gayaIndex = dataGaya.findIndex(g => g.id == gayaId); const jarakIndex = dataGaya[gayaIndex].jarak.findIndex(j => j.id == jarakId); dataGaya[gayaIndex].jarak[jarakIndex].aktif = !dataGaya[gayaIndex].jarak[jarakIndex].aktif; }

window.openModalEstafet = () => { document.getElementById('estafetId').value = ''; document.getElementById('estafetNama').value = ''; window.openModal('modalEstafet'); }
window.saveEstafet = () => { const nama = document.getElementById('estafetNama').value; if(!nama) return alert('Nama Kategori Estafet wajib diisi!'); dataEstafet.push({ id: Date.now(), nama, list: [] }); window.renderEstafet(); window.closeModal('modalEstafet'); }
window.deleteEstafet = (id) => { if(confirm('Hapus Kategori Estafet ini?')) { dataEstafet = dataEstafet.filter(e => e.id !== id); window.renderEstafet(); } }

window.openModalItemEstafet = (estafetId) => { document.getElementById('itemEstafetParentId').value = estafetId; document.getElementById('itemEstafetJarak').value = ''; document.getElementById('itemEstafetJenis').value = 'Putra'; window.openModal('modalItemEstafet'); }
window.saveItemEstafet = () => { 
    const parentId = document.getElementById('itemEstafetParentId').value; 
    let jarak = document.getElementById('itemEstafetJarak').value; 
    const jenis = document.getElementById('itemEstafetJenis').value; 
    if(!jarak) return alert('Jarak wajib diisi!'); 
    jarak = jarak.trim().toLowerCase().replace(/\s*meter\s*$/i, ''); 
    if (!jarak.endsWith('m')) jarak += 'm'; 
    const index = dataEstafet.findIndex(e => e.id == parentId); 
    dataEstafet[index].list.push({ id: Date.now(), jarak, jenis, aktif: true }); 
    window.renderEstafet(); 
    window.closeModal('modalItemEstafet'); 
}
window.deleteItemEstafet = (parentId, itemId) => { if(confirm('Hapus Nomor Estafet ini?')) { const index = dataEstafet.findIndex(e => e.id == parentId); dataEstafet[index].list = dataEstafet[index].list.filter(i => i.id !== itemId); window.renderEstafet(); } }
window.toggleItemEstafet = (parentId, itemId) => { const parentIndex = dataEstafet.findIndex(e => e.id == parentId); const itemIndex = dataEstafet[parentIndex].list.findIndex(i => i.id == itemId); dataEstafet[parentIndex].list[itemIndex].aktif = !dataEstafet[parentIndex].list[itemIndex].aktif; }

// ==========================================
// SIMPAN SEMUA KE DATABASE
// ==========================================
window.simpanKeDatabase = async function() {
    const btnSave = document.querySelector('button[onclick="simpanKeDatabase()"]');
    btnSave.innerHTML = "Menyimpan...";
    btnSave.disabled = true;

    configForm.biaya_normal = document.getElementById('inputBiayaNormal').value;
    configForm.min_diskon = document.getElementById('inputMinDiskon').value;
    configForm.biaya_diskon = document.getElementById('inputBiayaDiskon').value;
    
    // MASUKIN WA & NAMA KOLAM KE DALAM CONFIG JSONB
    if (document.getElementById('inputAdminWA1')) configForm.admin_wa_1 = document.getElementById('inputAdminWA1').value;
    if (document.getElementById('inputAdminWA2')) configForm.admin_wa_2 = document.getElementById('inputAdminWA2').value;
    if (document.getElementById('inputInfoPembayaran')) configForm.info_pembayaran = document.getElementById('inputInfoPembayaran').value;
    if (document.getElementById('inputNamaKolam')) configForm.nama_kolam = document.getElementById('inputNamaKolam').value; // <-- SAVE NAMA KOLAM BARU

    try {
        const { data: oldData } = await supabaseClient.from('events').select('config').eq('id', currentEventId).single();
        const mergedConfig = { ...(oldData?.config || {}), ...configForm };

        const { error } = await supabaseClient
            .from('events')
            .update({ 
                config_ku: dataKU, 
                config_gaya: dataGaya,
                config_estafet: dataEstafet, 
                config: mergedConfig
            })
            .eq('id', currentEventId);

        if (error) throw error;
        
        alert("Konfigurasi Lomba & Informasi Pendaftaran berhasil disimpan!");
        window.location.href = `/event-dashboard.html?id=${currentEventId}`;

    } catch (err) {
        console.error(err);
        alert("Gagal menyimpan: Cek koneksi internet Anda.");
    } finally {
        btnSave.innerHTML = "Simpan Pengaturan";
        btnSave.disabled = false;
    }
}
