// APEX ADMIN SUITE v2.0 - FRONTEND ENGINE

let onlinePlayers = [];
let allItems = [];
let selectedItemsCart = {}; // { [itemName]: { name, label, image, count } }
let selectedPlayerForModal = null;
let activeTab = 'players';
let currentCategory = 'all';

// State for toggles
const toggleStates = {
  noclip: false,
  godmode: false,
  invisible: false,
  names: false,
  blips: false,
  infiniteammo: false,
};

// Safe NUI POST Helper
function postNUI(event, data = {}) {
  const resourceName = typeof GetParentResourceName === 'function' ? GetParentResourceName() : 'qbx_adminmenu';
  return fetch(`https://${resourceName}/${event}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(data),
  }).catch(() => {});
}

// ----------------------------------------------------
// NUI MESSAGE LISTENER
// ----------------------------------------------------
window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.action === 'open') {
    openAdminMenu(data);
  } else if (data.action === 'close') {
    closeAdminMenu();
  } else if (data.action === 'updatePlayers') {
    renderPlayers(data.players || []);
  } else if (data.action === 'updateItems') {
    allItems = data.items || [];
    renderItemsCatalog();
  } else if (data.action === 'updateToggles') {
    updateToggleStates(data.toggles || {});
  }
});

function openAdminMenu(data) {
  const app = document.getElementById('admin-app');
  if (app) app.style.display = 'flex';

  try {
    if (data.players) renderPlayers(data.players);
    if (data.toggles) updateToggleStates(data.toggles);

    if (data.items && data.items.length > 0) {
      allItems = data.items;
      renderItemsCatalog();
    } else if (allItems.length === 0) {
      loadItemsFromBackend();
    } else {
      renderItemsCatalog();
    }
  } catch (err) {
    console.error('[Admin NUI Render Error]', err);
  }
}

function loadItemsFromBackend() {
  postNUI('requestItems')
    .then((res) => res && res.json ? res.json() : [])
    .then((items) => {
      if (items && Array.isArray(items)) {
        allItems = items;
        renderItemsCatalog();
      }
    })
    .catch(() => {});
}

function closeAdminMenu() {
  const app = document.getElementById('admin-app');
  if (app) app.style.display = 'none';
  closePlayerModal();
  postNUI('close');
}

// ESC Key to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('player-modal');
    if (modal && modal.style.display === 'flex') {
      closePlayerModal();
    } else {
      closeAdminMenu();
    }
  }
});

document.getElementById('btn-close').addEventListener('click', closeAdminMenu);
const topCloseBtn = document.getElementById('btn-top-close');
if (topCloseBtn) topCloseBtn.addEventListener('click', closeAdminMenu);

// ----------------------------------------------------
// TAB SWITCHING
// ----------------------------------------------------
const tabTitles = {
  players: { title: '👥 จัดการผู้เล่นออนไลน์', desc: 'ส่องดู วาร์ป จัดการ และควบคุมผู้เล่นในเซิร์ฟเวอร์' },
  giveitems: { title: '📦 เสกไอเทม (Give Items)', desc: 'เลือกหลายไอเทมพร้อมกัน กำหนดจำนวน แล้วเสกในคลิกเดียว' },
  vehicles: { title: '🏎️ ระบบยานพาหนะ', desc: 'เสกรถด่วน ซ่อม บันทึกความเป็นเจ้าของ และปรับแต่ง' },
  admintools: { title: '⚡ เครื่องมือแอดมิน', desc: 'โหมดผี อมตะ ล่องหน เรดาร์ และคำสั่งพิเศษ' },
  server: { title: '🌦️ จัดการเซิร์ฟเวอร์ & สภาพอากาศ', desc: 'ปรับสภาพอากาศ ปรับเวลา และประกาศข้อความระบบ' },
};

document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));

    btn.classList.add('active');
    activeTab = btn.getAttribute('data-tab');

    const pane = document.getElementById(`tab-${activeTab}`);
    if (pane) pane.classList.add('active');

    const info = tabTitles[activeTab];
    if (info) {
      document.getElementById('current-tab-title').textContent = info.title;
      document.getElementById('current-tab-desc').textContent = info.desc;
    }
  });
});

// ----------------------------------------------------
// TAB 1: PLAYERS MANAGEMENT
// ----------------------------------------------------
function renderPlayers(players) {
  onlinePlayers = players || [];
  document.getElementById('player-count').textContent = onlinePlayers.length;

  const targetSelect = document.getElementById('target-player-select');
  targetSelect.innerHTML = '<option value="me">ตัวฉันเอง (Self)</option>';

  const grid = document.getElementById('players-list');
  grid.innerHTML = '';

  if (onlinePlayers.length === 0) {
    grid.innerHTML = '<div style="color: #64748b; font-size: 13px;">ไม่พบผู้เล่นออนไลน์</div>';
    return;
  }

  onlinePlayers.forEach((p) => {
    // Add to target select in Give Items
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `[ID: ${p.id}] ${p.name} (${p.charName || 'ไม่มีชื่อตัวละคร'})`;
    targetSelect.appendChild(opt);

    // Render Player Card
    const card = document.createElement('div');
    card.className = 'player-card';
    card.innerHTML = `
      <div class="player-card-header">
        <span class="player-id-pill">ID: ${p.id}</span>
        <span style="font-size: 11px; color: #10b981;"><i class="fa-solid fa-signal"></i> ${p.ping || 0}ms</span>
      </div>
      <div>
        <div class="player-card-name">${escapeHtml(p.name)}</div>
        <div class="player-card-sub">${escapeHtml(p.charName || '')} | CID: ${p.cid || '-'}</div>
      </div>
      <div class="player-card-actions">
        <button class="p-btn" onclick="quickPlayerAction(${p.id}, 'goto')">วาร์ปไปหา</button>
        <button class="p-btn" onclick="quickPlayerAction(${p.id}, 'bring')">ดึงมาหา</button>
        <button class="p-btn" onclick="quickPlayerAction(${p.id}, 'revive')">ชุบ</button>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.tagName.toLowerCase() === 'button') return;
      openPlayerModal(p);
    });

    grid.appendChild(card);
  });
}

window.quickPlayerAction = function (targetId, action) {
  postNUI('playerAction', { target: targetId, action: action });
};

document.getElementById('btn-refresh-players').addEventListener('click', () => {
  postNUI('requestPlayers');
});
// ----------------------------------------------------
// TAB 2: GIVE ITEMS (MULTI-SELECT CATALOG & BASKET)
// ----------------------------------------------------
function renderItemsCatalog() {
  const grid = document.getElementById('items-catalog-grid');
  grid.innerHTML = '';

  const searchKeyword = document.getElementById('global-search-input').value.toLowerCase().trim();

  const filtered = allItems.filter((item) => {
    // Filter Category
    if (currentCategory !== 'all') {
      const cat = (item.category || item.type || '').toLowerCase();
      const itemName = (item.name || '').toLowerCase();
      if (currentCategory === 'weapons' && !itemName.startsWith('weapon_') && cat !== 'weapon') return false;
      if (currentCategory === 'ammo' && !itemName.startsWith('ammo-') && cat !== 'ammo') return false;
      if (currentCategory === 'food' && cat !== 'food' && cat !== 'drinks' && !itemName.includes('burger') && !itemName.includes('water')) return false;
      if (currentCategory === 'medical' && cat !== 'medical' && !itemName.includes('bandage') && !itemName.includes('firstaid')) return false;
      if (currentCategory === 'tools' && cat !== 'tools' && !itemName.includes('kit') && !itemName.includes('lockpick')) return false;
    }

    // Filter Search
    if (searchKeyword) {
      const matchName = (item.name || '').toLowerCase().includes(searchKeyword);
      const matchLabel = (item.label || '').toLowerCase().includes(searchKeyword);
      if (!matchName && !matchLabel) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<div style="color: #64748b; font-size: 13px; grid-column: 1/-1; text-align: center; padding: 40px;">ไม่พบไอเทมที่ค้นหา</div>';
    return;
  }

  filtered.forEach((item) => {
    const isSelected = !!selectedItemsCart[item.name];
    const card = document.createElement('div');
    card.className = `item-card ${isSelected ? 'selected' : ''}`;
    
    // Fallback image url: ox_inventory web images or generic
    const imgUrl = item.image ? (item.image.startsWith('http') ? item.image : `nui://ox_inventory/web/images/${item.image}`) : `nui://ox_inventory/web/images/${item.name}.png`;

    card.innerHTML = `
      <div class="item-img-wrap">
        <img src="${imgUrl}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="item-img-fallback" style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center;">
          <i class="fa-solid fa-box" style="font-size: 26px; color: rgba(255,255,255,0.35);"></i>
        </div>
      </div>
      <div class="item-info">
        <span class="item-name" title="${escapeHtml(item.label || item.name)}">${escapeHtml(item.label || item.name)}</span>
        <span class="item-id">${escapeHtml(item.name)}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      toggleItemInCart(item);
      card.classList.toggle('selected', !!selectedItemsCart[item.name]);
    });

    grid.appendChild(card);
  });
}

// Category Pill click
document.querySelectorAll('.pill-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pill-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.getAttribute('data-cat');
    renderItemsCatalog();
  });
});

// Search input debounce
document.getElementById('global-search-input').addEventListener('input', () => {
  if (activeTab === 'giveitems') {
    renderItemsCatalog();
  }
});

// Toggle Add/Remove from Basket
function toggleItemInCart(item) {
  if (selectedItemsCart[item.name]) {
    delete selectedItemsCart[item.name];
  } else {
    selectedItemsCart[item.name] = {
      name: item.name,
      label: item.label || item.name,
      image: item.image || `${item.name}.png`,
      count: 1,
    };
  }
  renderCart();
}

function renderCart() {
  const list = document.getElementById('cart-items-list');
  const cartKeys = Object.keys(selectedItemsCart);
  document.getElementById('cart-count').textContent = cartKeys.length;

  if (cartKeys.length === 0) {
    list.innerHTML = `
      <div class="empty-cart-msg">
        <i class="fa-solid fa-box-open"></i>
        <p>คลิกเลือกไอเทมจากรายการทางซ้าย<br>เพื่อเพิ่มลงในรายการที่ต้องการเสก</p>
      </div>
    `;
    document.getElementById('btn-submit-give').disabled = true;
    return;
  }

  document.getElementById('btn-submit-give').disabled = false;
  list.innerHTML = '';

  cartKeys.forEach((key) => {
    const item = selectedItemsCart[key];
    const row = document.createElement('div');
    row.className = 'cart-row';

    const imgUrl = item.image.startsWith('http') ? item.image : `nui://ox_inventory/web/images/${item.image}`;

    row.innerHTML = `
      <div class="cart-row-left">
        <img class="cart-row-img" src="${imgUrl}" onerror="this.onerror=null; this.src='nui://ox_inventory/web/images/keys.png';">
        <div class="cart-row-title" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</div>
      </div>
      <div class="cart-qty-ctrl">
        <button class="btn-qty" onclick="changeCartQty('${item.name}', -1)">-</button>
        <input class="cart-qty-input" type="number" min="1" max="9999" value="${item.count}" onchange="setCartQty('${item.name}', this.value)">
        <button class="btn-qty" onclick="changeCartQty('${item.name}', 1)">+</button>
        <button class="btn-del-row" onclick="removeCartItem('${item.name}')" title="ลบออก"><i class="fa-solid fa-xmark"></i></button>
      </div>
    `;

    list.appendChild(row);
  });
}

window.changeCartQty = function (name, delta) {
  if (!selectedItemsCart[name]) return;
  selectedItemsCart[name].count = Math.max(1, (selectedItemsCart[name].count || 1) + delta);
  renderCart();
};

window.setCartQty = function (name, val) {
  if (!selectedItemsCart[name]) return;
  selectedItemsCart[name].count = Math.max(1, parseInt(val) || 1);
  renderCart();
};

window.removeCartItem = function (name) {
  delete selectedItemsCart[name];
  renderCart();
  renderItemsCatalog();
};

document.getElementById('btn-clear-cart').addEventListener('click', () => {
  selectedItemsCart = {};
  renderCart();
  renderItemsCatalog();
});

// SUBMIT GIVE ALL ITEMS
document.getElementById('btn-submit-give').addEventListener('click', () => {
  const target = document.getElementById('target-player-select').value;
  const itemsToSend = Object.values(selectedItemsCart).map((i) => ({
    name: i.name,
    count: i.count,
  }));

  if (itemsToSend.length === 0) return;

  postNUI('giveMultipleItems', {
    target: target,
    items: itemsToSend,
  });

  // Clear cart after give
  selectedItemsCart = {};
  renderCart();
  renderItemsCatalog();
});

// ----------------------------------------------------
// TAB 3: VEHICLES
// ----------------------------------------------------
document.getElementById('btn-spawn-veh').addEventListener('click', () => {
  const model = document.getElementById('veh-spawn-input').value.trim();
  if (!model) return;
  postNUI('spawnVehicle', { model: model });
});

document.getElementById('btn-change-plate').addEventListener('click', () => {
  const plate = document.getElementById('veh-plate-input').value.trim();
  if (!plate) return;
  postNUI('changePlate', { plate: plate });
});

document.querySelectorAll('.card-btn-action').forEach((btn) => {
  btn.addEventListener('click', () => {
    const action = btn.getAttribute('data-action');
    if (action === 'veh-fix') postNUI('vehAction', { action: 'fix' });
    if (action === 'veh-save') postNUI('vehAction', { action: 'save' });
    if (action === 'veh-tune') postNUI('vehAction', { action: 'tune' });
    if (action === 'veh-dv') postNUI('vehAction', { action: 'dv' });
  });
});

// ----------------------------------------------------
// TAB 4: ADMIN TOOLS (TOGGLES)
// ----------------------------------------------------
document.querySelectorAll('.tool-card[data-toggle]').forEach((card) => {
  card.addEventListener('click', () => {
    const toggleName = card.getAttribute('data-toggle');
    postNUI('toggleTool', { tool: toggleName });
  });
});

document.querySelector('[data-action="revive-self"]').addEventListener('click', () => {
  postNUI('playerAction', { target: 'me', action: 'revive' });
});

function updateToggleStates(toggles) {
  Object.keys(toggles).forEach((key) => {
    toggleStates[key] = toggles[key];
    const card = document.getElementById(`card-${key}`);
    if (card) {
      card.classList.toggle('active', !!toggleStates[key]);
      const pill = card.querySelector('.toggle-pill');
      if (pill) pill.textContent = toggleStates[key] ? 'เปิด' : 'ปิด';
    }
  });
}

// ----------------------------------------------------
// TAB 5: SERVER & WEATHER
// ----------------------------------------------------
document.querySelectorAll('.weather-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const weather = btn.getAttribute('data-weather');
    postNUI('setWeather', { weather: weather });
  });
});

const timeSlider = document.getElementById('time-slider');
timeSlider.addEventListener('input', () => {
  document.getElementById('time-val').textContent = timeSlider.value;
});

document.getElementById('btn-apply-time').addEventListener('click', () => {
  postNUI('setTime', { hour: parseInt(timeSlider.value) });
});

document.getElementById('btn-send-announce').addEventListener('click', () => {
  const msg = document.getElementById('announce-input').value.trim();
  if (!msg) return;
  postNUI('sendAnnouncement', { message: msg });
  document.getElementById('announce-input').value = '';
});

// ----------------------------------------------------
// MODAL: PLAYER ACTIONS
// ----------------------------------------------------
function openPlayerModal(p) {
  selectedPlayerForModal = p;
  document.getElementById('modal-player-title').textContent = `จัดการผู้เล่น: ${p.name}`;
  document.getElementById('modal-player-info').innerHTML = `
    <strong>ชื่อในเกม:</strong> ${escapeHtml(p.charName || '-')}<br>
    <strong>CitizenID:</strong> ${escapeHtml(p.cid || '-')}<br>
    <strong>Server ID:</strong> ${p.id} | <strong>Ping:</strong> ${p.ping || 0} ms
  `;

  document.getElementById('player-modal').style.display = 'flex';
}

function closePlayerModal() {
  selectedPlayerForModal = null;
  document.getElementById('player-modal').style.display = 'none';
}

document.getElementById('btn-close-modal').addEventListener('click', closePlayerModal);

document.querySelectorAll('[data-paction]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!selectedPlayerForModal) return;
    const action = btn.getAttribute('data-paction');
    postNUI('playerAction', { target: selectedPlayerForModal.id, action: action });
  });
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
