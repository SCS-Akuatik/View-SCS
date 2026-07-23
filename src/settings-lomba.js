// File: src/settings-lomba.js

// 1. STATE MANAGEMENT
let dataKU = [
    { id: 1, nama: 'KU Senior', tahunMulai: 1900, tahunAkhir: 2007, aktif: false },
    { id: 2, nama: 'KU 1', tahunMulai: 2008, tahunAkhir: 2010, aktif: true },
    { id: 3, nama: 'KU 2', tahunMulai: 2011, tahunAkhir: 2012, aktif: true },
    { id: 4, nama: 'KU Fun Swimming', tahunMulai: 2017, tahunAkhir: 2018, aktif: true }
];

let dataGaya = [
    {
        id: 1, nama: 'Gaya Bebas (Freestyle)', icon: '🏊‍♂️',
        jarak: [
            { id: 101, nama: '25m', aktif: true },
            { id: 102, nama: '50m', aktif: true }
        ]
    },
    {
        id: 2, nama: 'Gaya Dada (Breaststroke)', icon: '🐸',
        jarak: [
            { id: 201, nama: '25m', aktif: true }
        ]
    }
];

// 2. RENDER FUNCTIONS
window.renderKU = function() {
    const container = document.getElementById('kuContainer');
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
                    <button onclick="editKU(${ku.id})" class="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors" title="Edit KU"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                    <button onclick="deleteKU(${ku.id})" class="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors" title="Hapus KU"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </div>
                <label class="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" class="sr-only peer" ${checked} onchange="toggleKU(${ku.id})">
                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
            </div>
        </div>`;
    });
}

window.renderGaya = function() {
    const container = document.getElementById('gayaContainer');
    container.innerHTML = '';
    
    dataGaya.forEach(gaya => {
        let jarakHTML = '';
        gaya.jarak.forEach(jrk => {
            const checked = jrk.aktif ? 'checked' : '';
            jarakHTML += `
            <div class="flex items-center justify-between p-2.5 border border-slate-200 rounded-lg bg-white group/item hover:border-blue-200 transition-colors">
                <div class="flex flex-col">
                    <span class="font-bold text-slate-600 text-xs flex items-center gap-1">
                        ${jrk.nama}
                        <button onclick="editJarak(${gaya.id}, ${jrk.id})" class="text-slate-300 hover:text-blue-500 opacity-0 group-hover/item:opacity-100 transition-opacity ml-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                        <button onclick="deleteJarak(${gaya.id}, ${jrk.id})" class="text-slate-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </span>
                </div>
                <label class="cursor-pointer shrink-0">
                    <input type="checkbox" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" ${checked} onchange="toggleJarak(${gaya.id}, ${jrk.id})">
                </label>
            </div>`;
        });

        container.innerHTML += `
        <div class="mb-6 p-4 border border-slate-100 rounded-xl bg-slate-50/50 group/cat">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <h3 class="font-bold text-slate-700 text-sm">${gaya.icon} ${gaya.nama}</h3>
                    <div class="hidden sm:flex items-center gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity ml-2">
                        <button onclick="editGaya(${gaya.id})" class="p-1 text-slate-400 hover:text-blue-600 rounded" title="Edit Kategori"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                        <button onclick="deleteGaya(${gaya.id})" class="p-1 text-slate-400 hover:text-red-600 rounded" title="Hapus Kategori"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    </div>
                </div>
                <button onclick="openModalJarak(${gaya.id})" class="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-md hover:bg-blue-200 flex items-center gap-1 transition-colors">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg> Jarak
                </button>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                ${jarakHTML}
            </div>
        </div>`;
    });
}

// 3. FUNGSI MODAL
window.openModal = function(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}
window.closeModal = function(id) {
    const modal = document.getElementById(id);
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// --- KU LOGIC ---
window.openModalKU = function() {
    document.getElementById('modalKUTitle').innerText = 'Buat KU Baru';
    document.getElementById('kuId').value = '';
    document.getElementById('kuNama').value = '';
    document.getElementById('kuTahunMulai').value = '';
    document.getElementById('kuTahunAkhir').value = '';
    window.openModal('modalKU');
}
window.editKU = function(id) {
    const ku = dataKU.find(k => k.id === id);
    document.getElementById('modalKUTitle').innerText = 'Edit Kelompok Umur';
    document.getElementById('kuId').value = ku.id;
    document.getElementById('kuNama').value = ku.nama;
    document.getElementById('kuTahunMulai').value = ku.tahunMulai;
    document.getElementById('kuTahunAkhir').value = ku.tahunAkhir;
    window.openModal('modalKU');
}
window.saveKU = function() {
    const id = document.getElementById('kuId').value;
    const nama = document.getElementById('kuNama').value;
    const tahunMulai = document.getElementById('kuTahunMulai').value;
    const tahunAkhir = document.getElementById('kuTahunAkhir').value;
    
    if(!nama) return alert('Nama KU harus diisi!');

    if(id) {
        const index = dataKU.findIndex(k => k.id == id);
        dataKU[index] = { ...dataKU[index], nama, tahunMulai, tahunAkhir };
    } else {
        dataKU.push({ id: Date.now(), nama, tahunMulai, tahunAkhir, aktif: true });
    }
    window.renderKU();
    window.closeModal('modalKU');
}
window.deleteKU = function(id) {
    if(confirm('Yakin ingin menghapus Kelompok Umur ini?')) {
        dataKU = dataKU.filter(k => k.id !== id);
        window.renderKU();
    }
}
window.toggleKU = function(id) {
    const index = dataKU.findIndex(k => k.id == id);
    dataKU[index].aktif = !dataKU[index].aktif;
}

// --- GAYA LOGIC ---
window.openModalGaya = function() {
    document.getElementById('modalGayaTitle').innerText = 'Kategori Gaya Baru';
    document.getElementById('gayaId').value = '';
    document.getElementById('gayaNama').value = '';
    document.getElementById('gayaIcon').value = '';
    window.openModal('modalGaya');
}
window.editGaya = function(id) {
    const gaya = dataGaya.find(g => g.id === id);
    document.getElementById('modalGayaTitle').innerText = 'Edit Kategori Gaya';
    document.getElementById('gayaId').value = gaya.id;
    document.getElementById('gayaNama').value = gaya.nama;
    document.getElementById('gayaIcon').value = gaya.icon;
    window.openModal('modalGaya');
}
window.saveGaya = function() {
    const id = document.getElementById('gayaId').value;
    const nama = document.getElementById('gayaNama').value;
    const icon = document.getElementById('gayaIcon').value || '🏊';
    
    if(!nama) return alert('Nama Kategori harus diisi!');

    if(id) {
        const index = dataGaya.findIndex(g => g.id == id);
        dataGaya[index].nama = nama;
        dataGaya[index].icon = icon;
    } else {
        dataGaya.push({ id: Date.now(), nama, icon, jarak: [] });
    }
    window.renderGaya();
    window.closeModal('modalGaya');
}
window.deleteGaya = function(id) {
    if(confirm('Yakin hapus kategori gaya ini beserta semua jarak di dalamnya?')) {
        dataGaya = dataGaya.filter(g => g.id !== id);
        window.renderGaya();
    }
}

// --- JARAK LOGIC ---
window.openModalJarak = function(gayaId) {
    document.getElementById('modalJarakTitle').innerText = 'Tambah Variasi Jarak';
    document.getElementById('jarakParentId').value = gayaId;
    document.getElementById('jarakId').value = '';
    document.getElementById('jarakNama').value = '';
    window.openModal('modalJarak');
}
window.editJarak = function(gayaId, jarakId) {
    const gaya = dataGaya.find(g => g.id === gayaId);
    const jarak = gaya.jarak.find(j => j.id === jarakId);
    
    document.getElementById('modalJarakTitle').innerText = 'Edit Jarak';
    document.getElementById('jarakParentId').value = gayaId;
    document.getElementById('jarakId').value = jarak.id;
    
    let namaEdit = jarak.nama.replace(/m$/i, '');
    document.getElementById('jarakNama').value = namaEdit;
    window.openModal('modalJarak');
}
window.saveJarak = function() {
    const gayaId = document.getElementById('jarakParentId').value;
    const jarakId = document.getElementById('jarakId').value;
    let nama = document.getElementById('jarakNama').value;
    
    if(!nama) return alert('Variasi jarak harus diisi!');

    nama = nama.trim().toLowerCase();
    nama = nama.replace(/\s*meter\s*$/i, ''); 
    if (!nama.endsWith('m')) {
        nama += 'm'; 
    }

    const gayaIndex = dataGaya.findIndex(g => g.id == gayaId);

    if(jarakId) {
        const jarakIndex = dataGaya[gayaIndex].jarak.findIndex(j => j.id == jarakId);
        dataGaya[gayaIndex].jarak[jarakIndex].nama = nama;
    } else {
        dataGaya[gayaIndex].jarak.push({ id: Date.now(), nama, aktif: true });
    }
    window.renderGaya();
    window.closeModal('modalJarak');
}
window.deleteJarak = function(gayaId, jarakId) {
    if(confirm('Hapus variasi jarak ini?')) {
        const gayaIndex = dataGaya.findIndex(g => g.id == gayaId);
        dataGaya[gayaIndex].jarak = dataGaya[gayaIndex].jarak.filter(j => j.id !== jarakId);
        window.renderGaya();
    }
}
window.toggleJarak = function(gayaId, jarakId) {
    const gayaIndex = dataGaya.findIndex(g => g.id == gayaId);
    const jarakIndex = dataGaya[gayaIndex].jarak.findIndex(j => j.id == jarakId);
    dataGaya[gayaIndex].jarak[jarakIndex].aktif = !dataGaya[gayaIndex].jarak[jarakIndex].aktif;
}

// 4. KUMPULKAN DATA UNTUK DATABASE
window.simpanKeDatabase = function() {
    const payload = {
        kelompok_umur: dataKU,
        nomor_lomba: dataGaya
    };
    console.log("JSON Siap Kirim ke Supabase:", JSON.stringify(payload, null, 2));
    alert("Data berhasil dibungkus! Cek Console Browser (F12) buat lihat hasil JSON Master Data-nya.");
}

// Initialize Render saat Halaman Dimuat
document.addEventListener('DOMContentLoaded', () => {
    window.renderKU();
    window.renderGaya();
});
