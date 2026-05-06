// ============================
// データ管理
// ============================
function loadData() {
  const data = localStorage.getItem('goshuinList');
  return data ? JSON.parse(data) : [];
}

function saveData(list) {
  try {
    localStorage.setItem('goshuinList', JSON.stringify(list));
    return true;
  } catch (e) {
    alert('保存できませんでした。写真のサイズが大きすぎる可能性があります。');
    return false;
  }
}

// ============================
// タブ切り替え
// ============================
function showTab(tabName, e) {
  document.getElementById('tab-list').classList.add('hidden');
  document.getElementById('tab-map').classList.add('hidden');
  document.getElementById('tab-form').classList.add('hidden');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.remove('hidden');
  e.target.classList.add('active');
  if (tabName === 'map') {
    setTimeout(() => {
      renderMap();
      if (mapInstance) mapInstance.invalidateSize();
    }, 300);
  }
}

// ============================
// 並び替え
// ============================
let currentSort = 'date-desc';

function sortList(sortType, e) {
  currentSort = sortType;
  document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
  if (e) e.target.classList.add('active');
  renderList();
}

function getSortedList(list) {
  const sorted = [...list];
  const dateVal = (d) => (d === '要確認' || !d) ? '0000-00-00' : d;
  switch (currentSort) {
    case 'date-desc': return sorted.sort((a, b) => dateVal(b.visitDate).localeCompare(dateVal(a.visitDate)));
    case 'date-asc':  return sorted.sort((a, b) => dateVal(a.visitDate).localeCompare(dateVal(b.visitDate)));
    case 'name':      return sorted.sort((a, b) => a.shrineName.localeCompare(b.shrineName, 'ja'));
    case 'location':  return sorted.sort((a, b) => (a.location || '').localeCompare(b.location || '', 'ja'));
    default: return sorted;
  }
}

// ============================
// 一覧表示
// ============================
function renderList() {
  const keyword = (document.getElementById('search-input')?.value || '').trim();
  let list = getSortedList(loadData());
  if (keyword) list = list.filter(item => item.shrineName.includes(keyword));

  document.getElementById('count').textContent = list.length;
  const container = document.getElementById('goshuin-list');
  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = '<p style="color:#999;text-align:center;padding:24px;">まだ登録がありません</p>';
    return;
  }

  list.forEach(item => {
    const card = document.createElement('div');
    card.className = 'goshuin-card';

    // 複数写真対応：最初の1枚をメイン表示
    const photos = item.photos || (item.photo ? [item.photo] : []);
    const photoHtml = photos.length > 0
      ? `<div class="card-photo-wrap">
           <img src="${photos[0]}" alt="御朱印写真">
           ${photos.length > 1 ? `<span class="photo-badge">+${photos.length - 1}</span>` : ''}
         </div>`
      : `<div class="no-photo">⛩️</div>`;

    const locationText = [item.location, item.city].filter(Boolean).join(' ');
    const coordsHtml = item.lat
      ? `<p>🗺️ <a href="https://maps.google.com/?q=${item.lat},${item.lng}" target="_blank">地図で見る</a></p>`
      : '';
    const reviewBadge = item.needsReview
      ? '<span class="review-badge">⚠️ 要確認</span>'
      : '';

    card.innerHTML = `
      ${photoHtml}
      <div class="card-info">
        <h3>${reviewBadge}${item.shrineName}</h3>
        <p>📅 ${item.visitDate === '要確認' ? '⚠️ 日付未確認' : item.visitDate}</p>
        <p>📍 ${locationText || '場所未登録'}</p>
        ${coordsHtml}
        <p>${item.memo || ''}</p>
      </div>
      <div class="card-actions">
        <button class="edit-btn" onclick="openEditModal('${item.id}')">✏️</button>
        <button class="delete-btn" onclick="deleteGoshuin('${item.id}')">🗑️</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// ============================
// 参拝マップ
// ============================
let mapInstance = null;

function renderMap() {
  const list = loadData().filter(item => item.lat && item.lng);

  if (!mapInstance) {
    mapInstance = L.map('map').setView([36.5, 136.0], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance);
  } else {
    mapInstance.eachLayer(layer => {
      if (layer instanceof L.Marker) mapInstance.removeLayer(layer);
    });
  }

  setTimeout(() => mapInstance.invalidateSize(), 200);

  if (list.length === 0) return;

  list.forEach(item => {
    L.marker([item.lat, item.lng])
      .addTo(mapInstance)
      .bindPopup(`<strong>${item.shrineName}</strong><br>📅 ${item.visitDate}<br>📍 ${item.location || ''}`);
  });

  mapInstance.fitBounds(list.map(item => [item.lat, item.lng]), { padding: [40, 40] });
}

// ============================
// 場所プレビューマップ（登録）
// ============================
let previewMapInstance = null;
let previewMarker = null;

function updatePreviewMap(lat, lng, label) {
  const mapDiv = document.getElementById('register-map-preview');
  mapDiv.classList.remove('hidden');
  if (!previewMapInstance) {
    previewMapInstance = L.map('register-map-preview').setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(previewMapInstance);
  } else {
    previewMapInstance.setView([lat, lng], 15);
    if (previewMarker) previewMapInstance.removeLayer(previewMarker);
  }
  previewMarker = L.marker([lat, lng]).addTo(previewMapInstance).bindPopup(label).openPopup();
  setTimeout(() => previewMapInstance.invalidateSize(), 100);
}

// ============================
// 場所プレビューマップ（編集）
// ============================
let editPreviewMapInstance = null;
let editPreviewMarker = null;

function updateEditPreviewMap(lat, lng, label) {
  const mapDiv = document.getElementById('edit-map-preview');
  mapDiv.classList.remove('hidden');
  if (!editPreviewMapInstance) {
    editPreviewMapInstance = L.map('edit-map-preview').setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(editPreviewMapInstance);
  } else {
    editPreviewMapInstance.setView([lat, lng], 15);
    if (editPreviewMarker) editPreviewMapInstance.removeLayer(editPreviewMarker);
  }
  editPreviewMarker = L.marker([lat, lng]).addTo(editPreviewMapInstance).bindPopup(label).openPopup();
  setTimeout(() => editPreviewMapInstance.invalidateSize(), 100);
}

// ============================
// 住所→座標変換
// ============================
async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) {}
  return null;
}

// ============================
// 位置情報（登録）
// ============================
let currentLat = null;
let currentLng = null;

document.getElementById('geocode-btn').addEventListener('click', async () => {
  const address = document.getElementById('address-input').value.trim();
  if (!address) { alert('住所や神社名を入力してください'); return; }
  const status = document.getElementById('location-status');
  status.textContent = '検索中...';
  const result = await geocodeAddress(address);
  if (result) {
    currentLat = result.lat; currentLng = result.lng;
    status.textContent = '✅ 場所を取得しました';
    updatePreviewMap(currentLat, currentLng, address);
  } else {
    status.textContent = '❌ 場所が見つかりませんでした';
  }
});

document.getElementById('get-location-btn').addEventListener('click', () => {
  const status = document.getElementById('location-status');
  status.textContent = '取得中...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      currentLat = pos.coords.latitude; currentLng = pos.coords.longitude;
      status.textContent = '✅ 現在地を取得しました';
      updatePreviewMap(currentLat, currentLng, '現在地');
    },
    () => { status.textContent = '❌ 取得できませんでした'; }
  );
});

// ============================
// 位置情報（編集）
// ============================
let editLat = null;
let editLng = null;

document.getElementById('edit-geocode-btn').addEventListener('click', async () => {
  const address = document.getElementById('edit-address-input').value.trim();
  if (!address) { alert('住所や神社名を入力してください'); return; }
  const status = document.getElementById('edit-location-status');
  status.textContent = '検索中...';
  const result = await geocodeAddress(address);
  if (result) {
    editLat = result.lat; editLng = result.lng;
    status.textContent = '✅ 場所を取得しました';
    updateEditPreviewMap(editLat, editLng, address);
  } else {
    status.textContent = '❌ 場所が見つかりませんでした';
  }
});

document.getElementById('edit-get-location-btn').addEventListener('click', () => {
  const status = document.getElementById('edit-location-status');
  status.textContent = '取得中...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      editLat = pos.coords.latitude; editLng = pos.coords.longitude;
      status.textContent = '✅ 現在地を取得しました';
      updateEditPreviewMap(editLat, editLng, '現在地');
    },
    () => { status.textContent = '❌ 取得できませんでした'; }
  );
});

// ============================
// 写真リサイズ
// ============================
function resizeImage(file, maxSize, quality) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width, h = img.height;
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
        else { w = Math.round(w * maxSize / h); h = maxSize; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = url;
  });
}

// ============================
// 写真選択（複数対応・最大3枚）
// ============================
let selectedPhotos = [];
let editPhotos = [];

function renderPhotoPreview() {
  const container = document.getElementById('photo-preview');
  const msg = document.getElementById('photo-count-msg');
  container.innerHTML = '';
  msg.textContent = selectedPhotos.length > 0 ? `${selectedPhotos.length}/3枚` : '';
  selectedPhotos.forEach((photo, i) => {
    const div = document.createElement('div');
    div.className = 'photo-thumb';
    div.innerHTML = `<img src="${photo}" alt="写真${i+1}">
      <button type="button" class="remove-photo-btn" onclick="removePhoto(${i})">✕</button>`;
    container.appendChild(div);
  });
}

function removePhoto(index) {
  selectedPhotos.splice(index, 1);
  renderPhotoPreview();
}

function renderEditPhotoPreview() {
  const container = document.getElementById('edit-photo-preview');
  const msg = document.getElementById('edit-photo-count-msg');
  container.innerHTML = '';
  msg.textContent = editPhotos.length > 0 ? `${editPhotos.length}/3枚` : '';
  editPhotos.forEach((photo, i) => {
    const div = document.createElement('div');
    div.className = 'photo-thumb';
    div.innerHTML = `<img src="${photo}" alt="写真${i+1}">
      <button type="button" class="remove-photo-btn" onclick="removeEditPhoto(${i})">✕</button>`;
    container.appendChild(div);
  });
}

function removeEditPhoto(index) {
  editPhotos.splice(index, 1);
  renderEditPhotoPreview();
}

async function handlePhotoSelect(file, isEdit) {
  if (!file) return;
  const photos = isEdit ? editPhotos : selectedPhotos;
  if (photos.length >= 3) { alert('写真は最大3枚まで登録できます'); return; }
  const resized = await resizeImage(file, 800, 0.75);
  photos.push(resized);
  isEdit ? renderEditPhotoPreview() : renderPhotoPreview();
}

document.getElementById('camera-btn').addEventListener('click', () => document.getElementById('photo-camera').click());
document.getElementById('gallery-btn').addEventListener('click', () => document.getElementById('photo').click());
document.getElementById('photo').addEventListener('change', (e) => { handlePhotoSelect(e.target.files[0], false); e.target.value = ''; });
document.getElementById('photo-camera').addEventListener('change', (e) => { handlePhotoSelect(e.target.files[0], false); e.target.value = ''; });
document.getElementById('edit-camera-btn').addEventListener('click', () => document.getElementById('edit-photo-camera').click());
document.getElementById('edit-gallery-btn').addEventListener('click', () => document.getElementById('edit-photo').click());
document.getElementById('edit-photo').addEventListener('change', (e) => { handlePhotoSelect(e.target.files[0], true); e.target.value = ''; });
document.getElementById('edit-photo-camera').addEventListener('change', (e) => { handlePhotoSelect(e.target.files[0], true); e.target.value = ''; });

// ============================
// 登録フォーム
// ============================
document.getElementById('goshuin-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const shrineName = document.getElementById('shrine-name').value.trim();
  const visitDate  = document.getElementById('visit-date').value;
  const location   = document.getElementById('location').value.trim();
  const city       = document.getElementById('city').value.trim();
  const memo       = document.getElementById('memo').value.trim();

  const list = loadData();
  const duplicate = list.find(item => item.shrineName === shrineName);
  if (duplicate) {
    if (!confirm(`「${shrineName}」はすでに登録されています。\n（${duplicate.visitDate}）\n\nそれでも登録しますか？`)) return;
  }

  list.push({
    id: Date.now(),
    shrineName, visitDate, location, city, memo,
    photos: [...selectedPhotos],
    lat: currentLat,
    lng: currentLng
  });

  if (!saveData(list)) return;

  document.getElementById('goshuin-form').reset();
  document.getElementById('location-status').textContent = '';
  document.getElementById('address-input').value = '';
  document.getElementById('register-map-preview').classList.add('hidden');
  selectedPhotos = [];
  renderPhotoPreview();
  currentLat = null;
  currentLng = null;

  renderList();
  alert(`「${shrineName}」を登録しました！`);
});

// ============================
// 削除
// ============================
function deleteGoshuin(id) {
  if (!confirm('この御朱印を削除しますか？')) return;
  saveData(loadData().filter(item => String(item.id) !== String(id)));
  renderList();
}

// ============================
// 編集モーダル
// ============================
let currentEditId = null;

function openEditModal(id) {
  const list = loadData();
  const item = list.find(item => String(item.id) === String(id));
  if (!item) return;

  currentEditId = item.id;
  editLat = item.lat || null;
  editLng = item.lng || null;

  // 既存写真をeditPhotosにロード（新旧データ両対応）
  editPhotos = item.photos ? [...item.photos] : (item.photo ? [item.photo] : []);

  document.getElementById('edit-shrine-name').value = item.shrineName === '要確認' ? '' : item.shrineName;
  document.getElementById('edit-visit-date').value = (item.visitDate === '要確認' || !item.visitDate) ? '' : item.visitDate;
  document.getElementById('edit-location').value = item.location || '';
  document.getElementById('edit-city').value = item.city || '';
  document.getElementById('edit-memo').value = item.memo || '';
  document.getElementById('edit-address-input').value = '';
  document.getElementById('edit-location-status').textContent = '';
  document.getElementById('edit-map-preview').classList.add('hidden');

  renderEditPhotoPreview();
  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  currentEditId = null;
  editLat = null;
  editLng = null;
  editPhotos = [];
}

document.getElementById('edit-cancel-btn').addEventListener('click', closeEditModal);
document.getElementById('edit-modal').addEventListener('click', function(e) {
  if (e.target === this) closeEditModal();
});

document.getElementById('edit-form').addEventListener('submit', function(e) {
  e.preventDefault();
  if (!currentEditId) return;

  const list = loadData();
  const index = list.findIndex(item => String(item.id) === String(currentEditId));
  if (index === -1) return;

  const newName = document.getElementById('edit-shrine-name').value.trim();
  const newDate = document.getElementById('edit-visit-date').value;
  list[index].shrineName = newName || '要確認';
  list[index].visitDate  = newDate || '要確認';
  list[index].location   = document.getElementById('edit-location').value.trim();
  list[index].city       = document.getElementById('edit-city').value.trim();
  list[index].memo       = document.getElementById('edit-memo').value.trim();
  list[index].photos     = [...editPhotos];
  list[index].needsReview = !newName || !newDate;
  if (editLat) { list[index].lat = editLat; list[index].lng = editLng; }

  saveData(list);
  closeEditModal();
  renderList();
  alert('更新しました！');
});

// ============================
// インポート機能
// ============================
document.getElementById('import-btn').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) { alert('JSONの形式が正しくありません。\n配列形式のJSONファイルを選択してください。'); return; }

      const list = loadData();
      let count = 0;
      let reviewCount = 0;

      data.forEach(entry => {
        const shrineName = (entry.shrineName && entry.shrineName.trim()) ? entry.shrineName.trim() : '要確認';
        const visitDate  = (entry.visitDate  && entry.visitDate.trim())  ? entry.visitDate.trim()  : '要確認';
        const needsReview = (shrineName === '要確認' || visitDate === '要確認');
        if (needsReview) reviewCount++;

        list.push({
          id: Date.now() + Math.floor(Math.random() * 100000),
          shrineName,
          visitDate,
          location: entry.location || '',
          city:     entry.city     || '',
          memo:     entry.memo     || '',
          photos:   Array.isArray(entry.photos) ? entry.photos : [],
          lat:      entry.lat  || null,
          lng:      entry.lng  || null,
          needsReview
        });
        count++;
      });

      if (!saveData(list)) return;
      renderList();

      const msg = reviewCount > 0
        ? `${count}件をインポートしました！\n⚠️ ${reviewCount}件は「要確認」があります。\n編集ボタン（✏️）で内容を修正してください。`
        : `${count}件をインポートしました！`;
      alert(msg);
    } catch (err) {
      alert('ファイルの読み込みに失敗しました。\nJSONファイルの形式を確認してください。');
    }
    e.target.value = '';
  };
  reader.readAsText(file, 'UTF-8');
});

// ============================
// 初期表示
// ============================
renderList();
