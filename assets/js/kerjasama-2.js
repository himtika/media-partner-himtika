(() => {
  // ================== KONFIGURASI ==================
  // Angka-angka ini dipisah biar gampang diubah nanti tanpa bongkar logic.
  const MAX_IMAGE_SIZE_MB = 3;   // limit per gambar bukti follow (TikTok/Instagram)
  const MAX_DOC_SIZE_MB   = 3;   // limit dokumen MoU (disamakan sesuai permintaan)
  const REQUIRED_FOLLOW_COUNT = 10; // jumlah wajib gambar per kategori

  const MAX_IMAGE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
  const MAX_DOC_BYTES   = MAX_DOC_SIZE_MB * 1024 * 1024;

  // ================== STATE ==================
  // Simpan file asli (bukan base64) di memory. Base64 baru dihitung nanti
  // pas logika submit dibuat (di luar scope saat ini).
  const state = {
    tiktok: [],     // array of File
    instagram: [],  // array of File
    mou: null,      // single File | null
  };

  // ================== HELPER ==================
  const $ = (id) => document.getElementById(id);

  function formatSize(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function showError(message) {
    const popup = $('errorPopup');
    const text = $('errorPopupText');
    text.textContent = message;
    popup.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
    clearTimeout(showError._t);
    showError._t = setTimeout(() => {
      popup.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
    }, 3000);
  }

  function showSuccess() {
    const popup = $('successPopup');
    popup.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
    clearTimeout(showSuccess._t);
    showSuccess._t = setTimeout(() => {
      popup.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
    }, 3000);
  }

  // ================== LIGHTBOX (preview foto full-size) ==================
  let lightboxEl = null;
  let lightboxImgEl = null;

  function setupLightbox() {
    lightboxEl = document.createElement('div');
    lightboxEl.id = 'lightboxOverlay';
    lightboxEl.className =
      'fixed inset-0 z-[9999] hidden items-center justify-center bg-black/80 p-4 sm:p-8';

    lightboxEl.innerHTML = `
      <button type="button" id="lightboxClose"
        class="absolute top-4 right-4 sm:top-6 sm:right-6 h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center text-lg hover:bg-white/20 transition-colors">
        &times;
      </button>
      <img id="lightboxImg" src="" alt="Preview foto"
        class="max-h-full max-w-full rounded-lg object-contain shadow-2xl">
    `;

    document.body.appendChild(lightboxEl);
    lightboxImgEl = $('lightboxImg');

    // Klik di area gelap (bukan di gambar) -> tutup
    lightboxEl.addEventListener('click', (e) => {
      if (e.target === lightboxEl) closeLightbox();
    });
    $('lightboxClose').addEventListener('click', closeLightbox);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
  }

  function openLightbox(url) {
    lightboxImgEl.src = url;
    lightboxEl.classList.remove('hidden');
    lightboxEl.classList.add('flex');
  }

  function closeLightbox() {
    lightboxEl.classList.add('hidden');
    lightboxEl.classList.remove('flex');
    lightboxImgEl.src = '';
  }

  // ================== UPLOAD GAMBAR (TikTok / Instagram) ==================
  function setupImageUploader(category, areaId, gridId, counterId) {
    const area = $(areaId);
    const grid = $(gridId);
    const counter = $(counterId);

    // input file tersembunyi, khusus kategori ini
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png';
    input.multiple = true;
    input.style.display = 'none';
    document.body.appendChild(input);

    function render() {
      grid.innerHTML = '';
      state[category].forEach((file, index) => {
        const url = URL.createObjectURL(file);

        const cell = document.createElement('div');
        cell.className = 'relative group aspect-square rounded-lg overflow-hidden bg-white/10 border border-white/10';

        cell.innerHTML = `
          <img src="${url}" alt="${file.name}" class="w-full h-full object-cover cursor-zoom-in">
          <span class="absolute bottom-0 left-0 right-0 truncate bg-black/60 text-white text-[10px] px-1 py-0.5">${file.name}</span>
          <button type="button" data-remove="${index}"
            class="remove-btn absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white flex items-center justify-center text-xs
                   opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-rose-500 transition-opacity">
            &times;
          </button>
        `;

        // Klik gambar (bukan tombol hapus) -> buka lightbox
        cell.querySelector('img').addEventListener('click', (e) => {
          e.stopPropagation();
          openLightbox(url);
        });

        cell.querySelector('[data-remove]').addEventListener('click', (e) => {
          e.stopPropagation();
          state[category].splice(index, 1);
          render();
        });

        grid.appendChild(cell);
      });

      const count = state[category].length;
      if (count >= REQUIRED_FOLLOW_COUNT) {
        counter.textContent = `Lengkap (${count}/${REQUIRED_FOLLOW_COUNT})`;
        counter.classList.remove('text-pink-400');
        counter.classList.add('text-emerald-400');
      } else {
        counter.textContent = `Upload ${REQUIRED_FOLLOW_COUNT - count} gambar lagi (${count}/${REQUIRED_FOLLOW_COUNT})`;
        counter.classList.remove('text-emerald-400');
        counter.classList.add('text-pink-400');
      }

      validateForm();
    }

    function addFiles(fileList) {
      const files = Array.from(fileList);
      for (const file of files) {
        if (state[category].length >= REQUIRED_FOLLOW_COUNT) {
          showError(`Maksimal ${REQUIRED_FOLLOW_COUNT} gambar untuk kategori ini.`);
          break;
        }
        if (!file.type.startsWith('image/')) {
          showError(`${file.name} bukan file gambar yang didukung.`);
          continue;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          showError(`${file.name} melebihi batas ${MAX_IMAGE_SIZE_MB}MB.`);
          continue;
        }
        state[category].push(file);
      }
      render();
    }

    area.addEventListener('click', (e) => {
      if (e.target.closest('.remove-btn')) return;
      input.click();
    });

    input.addEventListener('change', (e) => {
      addFiles(e.target.files);
      input.value = ''; // reset supaya file yang sama bisa dipilih ulang
    });

    ['dragenter', 'dragover'].forEach((evt) => {
      area.addEventListener(evt, (e) => {
        e.preventDefault();
        area.classList.add('bg-white/10', 'border-indigo-300');
      });
    });
    ['dragleave', 'drop'].forEach((evt) => {
      area.addEventListener(evt, (e) => {
        e.preventDefault();
        area.classList.remove('bg-white/10', 'border-indigo-300');
      });
    });
    area.addEventListener('drop', (e) => {
      addFiles(e.dataTransfer.files);
    });

    render(); // render awal (kosong)
  }

  // ================== UPLOAD DOKUMEN (MoU) ==================
  function setupMouUploader() {
    const area = $('uploadAreaMou');
    const preview = $('previewMou');

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
    input.style.display = 'none';
    document.body.appendChild(input);

    function render() {
      preview.innerHTML = '';
      if (!state.mou) return;

      const file = state.mou;
      const chip = document.createElement('div');
      chip.className = 'flex items-center gap-3 rounded-lg bg-white/10 border border-white/10 px-4 py-3';

      chip.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="h-6 w-6 text-indigo-200 shrink-0">
          <path d="M4 4h10l6 6v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M14 4v6h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm text-white font-medium">${file.name}</p>
          <p class="text-xs text-indigo-300">${formatSize(file.size)}</p>
        </div>
        <button type="button" data-remove-mou
          class="h-7 w-7 rounded-full bg-black/40 text-white flex items-center justify-center text-sm hover:bg-rose-500 transition-colors shrink-0">
          &times;
        </button>
      `;

      chip.querySelector('[data-remove-mou]').addEventListener('click', (e) => {
        e.stopPropagation();
        state.mou = null;
        render();
      });

      preview.appendChild(chip);
      validateForm();
    }

    function setFile(file) {
      if (!file) return;
      if (file.size > MAX_DOC_BYTES) {
        showError(`${file.name} melebihi batas ${MAX_DOC_SIZE_MB}MB.`);
        return;
      }
      state.mou = file;
      render();
    }

    area.addEventListener('click', (e) => {
      if (e.target.closest('[data-remove-mou]')) return;
      input.click();
    });

    input.addEventListener('change', (e) => {
      setFile(e.target.files[0]);
      input.value = '';
    });

    ['dragenter', 'dragover'].forEach((evt) => {
      area.addEventListener(evt, (e) => {
        e.preventDefault();
        area.classList.add('bg-white/10', 'border-indigo-300');
      });
    });
    ['dragleave', 'drop'].forEach((evt) => {
      area.addEventListener(evt, (e) => {
        e.preventDefault();
        area.classList.remove('bg-white/10', 'border-indigo-300');
      });
    });
    area.addEventListener('drop', (e) => {
      setFile(e.dataTransfer.files[0]);
    });

    render();
  }

  // ================== VALIDASI FORM (UI only) ==================
  function validateForm() {
    const instansi = $('instansi').value.trim();
    const email = $('email').value.trim();
    const telepon = $('telepon').value.trim();
    const alamat = $('alamat').value.trim();
    const linkdrive = $('linkdrive').value.trim();

    const textOk = instansi && email && telepon && alamat && linkdrive;
    const filesOk =
      state.tiktok.length === REQUIRED_FOLLOW_COUNT &&
      state.instagram.length === REQUIRED_FOLLOW_COUNT &&
      state.mou !== null;

    $('submitBtn').disabled = !(textOk && filesOk);
  }

  // ================== INIT ==================
  document.addEventListener('DOMContentLoaded', () => {
    ['instansi', 'email', 'telepon', 'alamat', 'linkdrive'].forEach((id) => {
      $(id).addEventListener('input', validateForm);
    });

    setupLightbox();
    setupImageUploader('tiktok', 'uploadAreaTiktok', 'previewGridTiktok', 'counterTiktok');
    setupImageUploader('instagram', 'uploadAreaInstagram', 'previewGridInstagram', 'counterInstagram');
    setupMouUploader();

    // NOTE: logika submit ke Apps Script BELUM diimplementasikan di sini —
    // sesuai instruksi, fokus saat ini hanya tampilan & interaksi upload.
    // Submit di bawah ini hanya placeholder validasi UI.
    document.querySelector('.form-container form').addEventListener('submit', (e) => {
      e.preventDefault();
      validateForm();
      if ($('submitBtn').disabled) {
        showError('Lengkapi semua data dan file sebelum mengirim.');
        return;
      }
      // TODO: bangun payload & fetch ke SCRIPT_URL di sini (menyusul).
      showSuccess();
    });
  });
})();
