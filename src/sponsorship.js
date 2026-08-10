document.addEventListener('DOMContentLoaded', () => {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 1. Reset semua button ke state non-aktif
            tabBtns.forEach(b => {
                b.classList.remove('bg-amber-500', 'text-black', 'shadow-md');
                b.classList.add('text-slate-400');
            });
            
            // 2. Sembunyikan semua konten
            tabContents.forEach(content => {
                content.classList.add('hidden');
                content.classList.remove('block');
            });

            // 3. Aktifkan button yang di-klik
            btn.classList.add('bg-amber-500', 'text-black', 'shadow-md');
            btn.classList.remove('text-slate-400');

            // 4. Tampilkan konten yang sesuai target
            const targetId = btn.getAttribute('data-target');
            const targetContent = document.getElementById(targetId);
            if(targetContent) {
                targetContent.classList.remove('hidden');
                targetContent.classList.add('block');
            }
        });
    });
});
