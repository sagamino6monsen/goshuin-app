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
function showTab(tabName) {
  document.getElementById('tab-list').classList.add('hidden');
  document.getElementById('tab-map').classList.add('hidden');
  document.getElementById('tab-form').classList.add('hidden');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.remove('hidden');
  event.target.classList.add('active');
  if (tabName === 'map') setTimeout(() => renderMap(), 100);
}

// ============================
// 一覧表示
// ============================
function renderList() {
  const list = loadData();
  const container = document.getElementById('goshuin-list');
  const countEl = document.getElementById('count');

  countEl.textContent = list.length;
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
    alert('地図に表示できる場所がありません。\n登録時に「現在地を取得」してください。');
    return;
  }

  list.forEach(item => {
    L.marker([item.lat, item.lng])
      .addTo(mapInstance)
      .bindPopup(`
        <strong>${item.shrineName}</strong><br>
        📅 ${item.visitDate}<br>
        📍 ${item.location || ''}
      `);
  });

  const bounds = list.map(item => [item.lat, item.lng]);
  mapInstance.fitBounds(bounds, { padding: [40, 40] });
}

// ============================
// 現在地取得
// ============================
let currentLat = null;
let currentLng = null;

document.getElementById('get-location-btn').addEventListener('click', () => {
  const status = document.getElementById('location-status');
  status.textContent = '取得中...';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      currentLat = pos.coords.latitude;
      currentLng = pos.coords.longitude;
      status.textContent = `✅ 取得完了（${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}）`;
    },
    () => {
      status.textContent = '❌ 取得できませんでした';
    }
  );
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
  const photoFile = document.getElementById('photo').files[0]
    || document.getElementById('photo-camera').files[0];
  const list = loadData();
  const duplicate = list.find(item => item.shrineName === shrineName);
  if (duplicate) {
    if (!confirm(`「${shrineName}」はすでに登録されています。\n（${duplicate.visitDate}）\n\nそれでも登録しますか？`)) return;
  }

  if (photoFile) {
    const reader = new FileReader();
    reader.onload = (event) => saveGoshuin(shrineName, visitDate, location, memo, event.target.result);
    reader.readAsDataURL(photoFile);
  } else {
    saveGoshuin(shrineName, visitDate, location, memo, null);
  }
});

function saveGoshuin(shrineName, visitDate, location, memo, photo) {
  const list = loadData();
  list.push({
    id: Date.now(),
    shrineName, visitDate, location, memo, photo,
    lat: currentLat,
    lng: currentLng
  });
  saveData(list);
  document.getElementById('goshuin-form').reset();
  document.getElementById('location-status').textContent = '';
  currentLat = null;
  currentLng = null;
  renderList();
  alert(`「${shrineName}」を登録しました！`);
}

// ============================
// 削除
// ============================
function deleteGoshuin(id) {
  if (!confirm('この御朱印を削除しますか？')) return;
  const list = loadData().filter(item => String(item.id) !== String(id));
  saveData(list);
  renderList();
}

// ============================
// 編集モーダル（変数でID管理）
// ============================
let currentEditId = null;  // ← 隠しフィールドの代わりに変数で管理

function openEditModal(id) {
  const list = loadData();
  const item = list.find(item => String(item.id) === String(id));
  if (!item) return;

  currentEditId = item.id;  // ← 変数に保存

  document.getElementById('edit-shrine-name').value = item.shrineName;
  document.getElementById('edit-visit-date').value = item.visitDate;
  document.getElementById('edit-location').value = item.location || '';
  document.getElementById('edit-memo').value = item.memo || '';

  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  currentEditId = null;
}

document.getElementById('edit-cancel-btn').addEventListener('click', closeEditModal);

document.getElementById('edit-modal').addEventListener('click', function(e) {
  if (e.target === this) closeEditModal();
});

document.getElementById('edit-form').addEventListener('submit', function(e) {
  e.preventDefault();

  if (!currentEditId) {
    alert('エラー：編集対象が不明です。もう一度✏️を押してください。');
    return;
  }

  const list = loadData();
  const index = list.findIndex(item => String(item.id) === String(currentEditId));
  if (index === -1) return;

  list[index].shrineName = document.getElementById('edit-shrine-name').value.trim();
  list[index].visitDate  = document.getElementById('edit-visit-date').value;
  list[index].location   = document.getElementById('edit-location').value.trim();
  list[index].memo       = document.getElementById('edit-memo').value.trim();

  saveData(list);
  closeEditModal();
  renderList();
  alert('更新しました！');
});

// ============================
// ============================
// カメラ・ギャラリーボタン
// ============================
document.getElementById('camera-btn').addEventListener('click', () => {
  document.getElementById('photo-camera').click();
});

document.getElementById('gallery-btn').addEventListener('click', () => {
  document.getElementById('photo').click();
});

function handlePhotoSelect(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('photo-preview').innerHTML =
      `<img src="${e.target.result}" alt="プレビュー">`;
  };
  reader.readAsDataURL(file);
}

document.getElementById('photo').addEventListener('change', (e) => {
  handlePhotoSelect(e.target.files[0]);
});

document.getElementById('photo-camera').addEventListener('change', (e) => {
  handlePhotoSelect(e.target.files[0]);
});
// 初期表示
// ============================
renderList();