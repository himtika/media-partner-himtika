(() => {
  // Ganti URL ini dengan URL Web App hasil deploy Apps Script kamu (Kode.gs)
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz9Lr6yqfYwAh4ztrsYVPxTpGiPybdsv79x-zYGekJV2XqWhLYAxE9RPPj3AHwzzzHA/exec';
  // const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxh2_Z-usbV-cblTwdWhNXw7nsj5-ykzrOWmSKIs3mPEHBUZptyM_itAD3nBgIysoY/exec';

  // Timestamp saat script ini dimuat (dipakai server untuk cek minimum
  // time-on-page). Murni variable JS, TIDAK butuh hidden input di HTML.
  const FORM_LOADED_AT = Date.now();

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
    $('errorPopupText').textContent = message;
    popup.classList.remove('hidden');
    popup.classList.add('flex');
  }

  function hideError() {
    $('errorPopup').classList.add('hidden');
    $('errorPopup').classList.remove('flex');
  }

  function showSuccess() {
    const popup = $('successPopup');
    popup.classList.remove('hidden');
    popup.classList.add('flex');
  }

  function hideSuccess() {
    $('successPopup').classList.add('hidden');
    $('successPopup').classList.remove('flex');
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
        class="absolute top-4 right-4 sm:top-6 sm:right-6 h-9 w-9 p-1 rounded-full bg-white/10 text-white flex items-center justify-center text-lg hover:bg-white/20 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="white"><path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/></svg>
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
            class="remove-btn absolute top-1 right-1 h-5 w-5 p-0.5 rounded-full bg-black/70 text-white flex items-center justify-center text-xs opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-rose-500 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="white"><path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/></svg>
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
          class="h-7 w-7 p-1 rounded-full bg-black/40 text-white flex items-center justify-center text-sm hover:bg-rose-500 transition-colors shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="white"><path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/></svg>
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

  // ================== KONVERSI FILE KE BASE64 ==================
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Batas total payload MENTAH (sebelum base64) sebagai pengaman tambahan.
  // Base64 encoding menambah ~37% ukuran, jadi ini bukan angka final request,
  // tapi cukup untuk gagal cepat sebelum coba kirim payload yang berpotensi
  // ditolak/timeout oleh Apps Script.
  const MAX_TOTAL_PAYLOAD_BYTES = 40 * 1024 * 1024; // 40MB mentah

  function getTotalPayloadBytes() {
    const imagesTotal = [...state.tiktok, ...state.instagram]
      .reduce((sum, f) => sum + f.size, 0);
    const mouTotal = state.mou ? state.mou.size : 0;
    return imagesTotal + mouTotal;
  }


  // ================== ENCODE FILE DENGAN PROGRESS ASLI (client-side, aman) ==================
  // Base64 encoding 100% terjadi di browser, tidak menyentuh network,
  // jadi persentase di fase ini genuine dan tidak berisiko CORS.
  async function encodeAllWithProgress(onProgress) {
    const total = state.tiktok.length + state.instagram.length + (state.mou ? 1 : 0);
    let done = 0;
    const tick = () => {
      done++;
      onProgress(total ? Math.round((done / total) * 100) : 100);
    };
 
    const tiktokEncoded = [];
    for (const f of state.tiktok) {
      tiktokEncoded.push({ name: f.name, data: await readFileAsDataURL(f) });
      tick();
    }
    const instagramEncoded = [];
    for (const f of state.instagram) {
      instagramEncoded.push({ name: f.name, data: await readFileAsDataURL(f) });
      tick();
    }
    let mouEncoded = '';
    if (state.mou) {
      mouEncoded = await readFileAsDataURL(state.mou);
      tick();
    }
    return { tiktokEncoded, instagramEncoded, mouEncoded };
  }

    // ================== SUBMIT KE APPS SCRIPT ==================
  // Pakai fetch() — sudah terbukti jalan sebelumnya. Dilengkapi AbortController
  // sebagai timeout pengaman: kalau server tidak respon dalam waktu wajar,
  // request dibatalkan otomatis daripada modal loading macet selamanya.
  const SUBMIT_TIMEOUT_MS = 90 * 1000; // 90 detik
 
  // async function postForm(url, body) {
  //   const controller = new AbortController();
  //   const timeoutId = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
  //   try {
  //     const response = await fetch(url, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
  //       body,
  //       signal: controller.signal,
  //     });
  //     return await response.text();
  //   } finally {
  //     clearTimeout(timeoutId);
  //   }
  // }

  async function postForm(url, body) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body,
        redirect: 'follow',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.text();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ================== MODAL LOADING ==================
  let loadingTimerInterval = null;
  let loadingStartedAt = 0;

  function showLoadingModal() {
    const popup = $('loadingPopup');
    popup.classList.remove('hidden');
    popup.classList.add('flex');
    setLoadingProgress(0, 'Menyiapkan file...', 'Mohon tunggu sebentar');
  }
  function hideLoadingModal() {
    const popup = $('loadingPopup');
    popup.classList.add('hidden');
    popup.classList.remove('flex');
    stopLoadingTimer();
  }
  function setLoadingProgress(percent, title, subtitle) {
    $('loadingPopupBar').style.width = percent + '%';
    $('loadingPopupTitle').textContent = title;
    if (subtitle !== undefined) $('loadingPopupSubtitle').textContent = subtitle;
  }
  function startLoadingTimer() {
    loadingStartedAt = Date.now();
    stopLoadingTimer();
    loadingTimerInterval = setInterval(() => {
      const seconds = Math.floor((Date.now() - loadingStartedAt) / 1000);
      $('loadingPopupSubtitle').textContent = `Sedang mengirim ke server... ${seconds} detik`;
    }, 1000);
  }
  function stopLoadingTimer() {
    if (loadingTimerInterval) {
      clearInterval(loadingTimerInterval);
      loadingTimerInterval = null;
    }
  }


  // ================== INIT ==================
  document.addEventListener('DOMContentLoaded', () => {
    // Tutup modal: klik tombol "Kembali"
    $('successPopupClose').addEventListener('click', hideSuccess);
    $('errorPopupClose').addEventListener('click', hideError);

    // Tutup modal: klik area gelap di luar card
    $('successPopup').addEventListener('click', (e) => {
      if (e.target === $('successPopup')) hideSuccess();
    });
    $('errorPopup').addEventListener('click', (e) => {
      if (e.target === $('errorPopup')) hideError();
    });

    // Tutup modal: tekan Escape
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      hideSuccess();
      hideError();
    });

    ['instansi', 'email', 'telepon', 'alamat', 'linkdrive'].forEach((id) => {
      $(id).addEventListener('input', validateForm);
    });

    setupLightbox();
    setupImageUploader('tiktok', 'uploadAreaTiktok', 'previewGridTiktok', 'counterTiktok');
    setupImageUploader('instagram', 'uploadAreaInstagram', 'previewGridInstagram', 'counterInstagram');
    setupMouUploader();

    const form = document.querySelector('.form-container form');
    const submitBtn = $('submitBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      validateForm();
      if (submitBtn.disabled) {
        showError('Lengkapi semua data dan file sebelum mengirim.');
        return;
      }

      if (getTotalPayloadBytes() > MAX_TOTAL_PAYLOAD_BYTES) {
        showError('Total ukuran file terlalu besar untuk dikirim sekaligus. Kompres/kurangi ukuran file.');
        return;
      }

      submitBtn.disabled = true;
      showLoadingModal();
      // const originalLabel = submitBtn.textContent;
      // submitBtn.textContent = 'Mengirim...';

      try {
        const { tiktokEncoded, instagramEncoded, mouEncoded } = await encodeAllWithProgress((percent) => {
          setLoadingProgress(percent, 'Menyiapkan file...', `Meng-encode file... ${percent}%`);
        });

        const payload = new URLSearchParams();
        payload.append('nama_instansi', $('instansi').value.trim());
        payload.append('email', $('email').value.trim());
        payload.append('no_telepon', $('telepon').value.trim());
        payload.append('alamat_instansi', $('alamat').value.trim());
        payload.append('link_drive', $('linkdrive').value.trim());
        payload.append('form_loaded_at', FORM_LOADED_AT);
        // Honeypot: aman dipanggil walau elemennya belum ada di HTML (opsional
        // chaining) — begitu kamu tempel snippet-nya, ini otomatis aktif.
        payload.append('website_hp', document.getElementById('website_hp')?.value || '');
        payload.append('bukti_tiktok', JSON.stringify(tiktokEncoded));
        payload.append('bukti_instagram', JSON.stringify(instagramEncoded));
        if (state.mou) {
          payload.append('mou_file', mouEncoded);
          payload.append('mou_file_filename', state.mou.name);
        }

        setLoadingProgress(100, 'Mengirim ke server...', 'Sedang mengirim ke server... 0 detik');
        startLoadingTimer();
 
        const text = await postForm(SCRIPT_URL, payload.toString());
        const result = JSON.parse(text);
 
        hideLoadingModal();

        if (result.result === 'success') {
          showSuccess();
          form.reset();
          state.tiktok = [];
          state.instagram = [];
          state.mou = null;
          document.getElementById('previewGridTiktok').innerHTML = '';
          document.getElementById('previewGridInstagram').innerHTML = '';
          document.getElementById('previewMou').innerHTML = '';
          $('counterTiktok').textContent = `Upload ${REQUIRED_FOLLOW_COUNT} gambar lagi (0/${REQUIRED_FOLLOW_COUNT})`;
          $('counterInstagram').textContent = `Upload ${REQUIRED_FOLLOW_COUNT} gambar lagi (0/${REQUIRED_FOLLOW_COUNT})`;
          $('counterTiktok').classList.remove('text-emerald-400');
          $('counterTiktok').classList.add('text-pink-400');
          $('counterInstagram').classList.remove('text-emerald-400');
          $('counterInstagram').classList.add('text-pink-400');
        } else {
          showError(result.message || 'Gagal mengirim, silakan coba lagi.');
        }
      } catch (err) {
        // console.error('Error:', err);
        // showError('Terjadi kesalahan saat mengirim. Cek koneksi internet lalu coba lagi.');

        hideLoadingModal();
        console.error('Error:', err);
        if (err.name === 'AbortError') {
          showError('Pengiriman memakan waktu terlalu lama. Periksa koneksi internet lalu coba lagi.');
        } else {
          showError('Pengajuan mungkin sudah berhasil dikirim, tetapi sistem belum dapat menerima konfirmasi dari server. Jangan langsung mengirim ulang. Silakan periksa email atau hubungi admin untuk memastikan status pengajuanmu.');
        }
      } finally {
        submitBtn.disabled = false;
        validateForm();

        // submitBtn.textContent = originalLabel;
        // validateForm();
      }
    });
  });
})();