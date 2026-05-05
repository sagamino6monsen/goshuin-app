// ============================
// データ管理
// ============================
function loadData() {
  const data = localStorage.getItem('goshuinList');
  return data ? JSON.parse(data) : [];
}
function saveData(list) {
  localStorage.setItem('goshuinList', JSON.stringify(list));
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
  if (tabName === 'map') setTimeout(() => renderMap(), 100);
}

// ============================
// 一覧表示
// ============================
function renderList() {
  const list = loadData();
  document.getElementById('count').textContent = list.length;
  const container = document.getElementById('goshuin-list');
  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = '<p style="color:#999;text-align:center;padding:24px;">まだ登録がありません</p>';
    return;
  }

  [...list].reverse().forEach(item => {
    const card = document.createElement('div');
    card.className = 'goshuin-card';

    const photoHtml = item.photo
      ? `<img src="${item.photo}" alt="御朱印写真">`
      : `<div class="no-photo">⛩️</div>`;

    const coordsHtml = item.lat
      ? `<p>🗺️ <a href="https://maps.google.com/?q=${item.lat},${item.lng}" target="_blank">地図で見る</a></p>`
      : '';

    card.innerHTML = `
      ${photoHtml}
      <div class="card-info">
        <h3>${item.shrineName}</h3>
        <p>📅 ${item.visitDate}</p>
        <p>📍 ${item.location || '場所未登録'}</p>
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
// 地図表示
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

  if (list.length === 0) {
    alert('地図に表示できる場所がありません。\n登録時に場所を取得してください。');
    return;
  }

  list.forEach(item => {
    L.marker([item.lat, item.lng])
      .addTo(mapInstance)
      .bindPopup(`<strong>${item.shrineName}</strong><br>📅 ${item.visitDate}<br>📍 ${item.location || ''}`);
  });

  mapInstance.fitBounds(list.map(item => [item.lat, item.lng]), { padding: [40, 40] });
}

// ============================
// 住所→座標変換（Nominatim）
// ============================
async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {}
  return null;
}

// ============================
// 位置情報
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
    currentLat = result.lat;
    currentLng = result.lng;
    status.textContent = `✅ 取得完了（${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}）`;
  } else {
    status.textContent = '❌ 場所が見つかりませんでした';
  }
});

document.getElementById('get-location-btn').addEventListener('click', () => {
  const status = document.getElementById('location-status');
  status.textContent = '取得中...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      currentLat = pos.coords.latitude;
      currentLng = pos.coords.longitude;
      status.textContent = `✅ 現在地を取得しました`;
    },
    () => { status.textContent = '❌ 取得できませんでした'; }
  );
});

// ============================
// 写真選択（グローバル変数で管理）
// ============================
let selectedPhotoData = null;
let editPhotoData = null;

function handlePhotoSelect(file, previewId, isEdit) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    if (isEdit) {
      editPhotoData = e.target.result;
    } else {
      selectedPhotoData = e.target.result;
    }
    document.getElementById(previewId).innerHTML =
      `<img src="${e.target.result}" alt="プレビュー">`;
  };
  reader.readAsDataURL(file);
}

document.getElementById('camera-btn').addEventListener('click', () => {
  document.getElementById('photo-camera').click();
});
document.getElementById('gallery-btn').addEventListener('click', () => {
  document.getElementById('photo').click();
});
document.getElementById('photo').addEventListener('change', (e) => {
  handlePhotoSelect(e.target.files[0], 'photo-preview', false);
});
document.getElementById('photo-camera').addEventListener('change', (e) => {
  handlePhotoSelect(e.target.files[0], 'photo-preview', false);
});

document.getElementById('edit-camera-btn').addEventListener('click', () => {
  document.getElementById('edit-photo-camera').click();
});
document.getElementById('edit-gallery-btn').addEventListener('click', () => {
  document.getElementById('edit-photo').click();
});
document.getElementById('edit-photo').addEventListener('change', (e) => {
  handlePhotoSelect(e.target.files[0], 'edit-photo-preview', true);
});
document.getElementById('edit-photo-camera').addEventListener('change', (e) => {
  handlePhotoSelect(e.target.files[0], 'edit-photo-preview', true);
});

// ============================
// 登録フォーム
// ============================
document.getElementById('goshuin-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const shrineName = document.getElementById('shrine-name').value.trim();
  const visitDate  = document.getElementById('visit-date').value;
  const location   = document.getElementById('location').value.trim();
  const memo       = document.getElementById('memo').value.trim();

  const list = loadData();
  const duplicate = list.find(item => item.shrineName === shrineName);
  if (duplicate) {
    if (!confirm(`「${shrineName}」はすでに登録されています。\n（${duplicate.visitDate}）\n\nそれでも登録しますか？`)) return;
  }

  const newItem = {
    id: Date.now(),
    shrineName, visitDate, location, memo,
    photo: selectedPhotoData,
    lat: currentLat,
    lng: currentLng
  };

  list.push(newItem);
  saveData(list);

  // リセット
  document.getElementById('goshuin-form').reset();
  document.getElementById('location-status').textContent = '';
  document.getElementById('photo-preview').innerHTML = '';
  document.getElementById('address-input').value = '';
  selectedPhotoData = null;
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
  editPhotoData = null;

  document.getElementById('edit-shrine-name').value = item.shrineName;
  document.getElementById('edit-visit-date').value = item.visitDate;
  document.getElementById('edit-location').value = item.location || '';
  document.getElementById('edit-memo').value = item.memo || '';
  document.getElementById('edit-photo-preview').innerHTML = item.photo
    ? `<img src="${item.photo}" alt="現在の写真">`
    : '';

  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  currentEditId = null;
  editPhotoData = null;
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

  list[index].shrineName = document.getElementById('edit-shrine-name').value.trim();
  list[index].visitDate  = document.getElementById('edit-visit-date').value;
  list[index].location   = document.getElementById('edit-location').value.trim();
  list[index].memo       = document.getElementById('edit-memo').value.trim();
  if (editPhotoData) list[index].photo = editPhotoData;

  saveData(list);
  closeEditModal();
  renderList();
  alert('更新しました！');
});

// ============================
// 初期表示
// ============================
renderList();