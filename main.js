/**
 * 팝업나우 (PUN) — main.js
 * Vanilla JS · LocalStorage CRUD · Geolocation API
 */

'use strict';

/* ══════════════════════════════════════
   1. 초기 데이터 (샘플 매장 5개)
   ══════════════════════════════════════ */
const INITIAL_STORES = [
  {
    id: 's1',
    name: '마르디 메크르디\nPOP-UP',
    address: '성수동 1가',
    lat: 37.5444,
    lng: 127.0557,
    crowd: '보통',
    waitTeams: 8,
    soldout: false,
    updatedAt: Date.now(),
  },
  {
    id: 's2',
    name: '뉴진스 ✕ MCM\nPOP-UP',
    address: '홍대 어울마당로',
    lat: 37.5519,
    lng: 126.9228,
    crowd: '혼잡',
    waitTeams: 23,
    soldout: true,
    updatedAt: Date.now(),
  },
  {
    id: 's3',
    name: '노티드 도넛\n한남 팝업',
    address: '이태원로 27나길',
    lat: 37.5347,
    lng: 126.9958,
    crowd: '여유',
    waitTeams: 2,
    soldout: false,
    updatedAt: Date.now(),
  },
  {
    id: 's4',
    name: '이솝 강남\n한정 컬렉션',
    address: '강남구 청담동',
    lat: 37.5232,
    lng: 127.0473,
    crowd: '보통',
    waitTeams: 11,
    soldout: false,
    updatedAt: Date.now(),
  },
  {
    id: 's5',
    name: '무신사 스탠다드\n성수 팝업',
    address: '성수동 2가',
    lat: 37.5448,
    lng: 127.0561,
    crowd: '혼잡',
    waitTeams: 35,
    soldout: true,
    updatedAt: Date.now(),
  },
];

const LS_KEY = 'pun_stores_v1';

/* ══════════════════════════════════════
   2. LocalStorage CRUD 헬퍼
   ══════════════════════════════════════ */
const Store = {
  /** 전체 조회 */
  getAll() {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  /** 초기 데이터 세팅 (최초 1회) */
  init() {
    if (!this.getAll()) {
      localStorage.setItem(LS_KEY, JSON.stringify(INITIAL_STORES));
    }
  },

  /** 단일 매장 업데이트 */
  update(id, patch) {
    const stores = this.getAll();
    const idx = stores.findIndex(s => s.id === id);
    if (idx === -1) return false;
    stores[idx] = { ...stores[idx], ...patch, updatedAt: Date.now() };
    localStorage.setItem(LS_KEY, JSON.stringify(stores));
    return stores[idx];
  },

  /** 전체 저장 */
  saveAll(stores) {
    localStorage.setItem(LS_KEY, JSON.stringify(stores));
  },
};

/* ══════════════════════════════════════
   3. 유틸리티
   ══════════════════════════════════════ */

/** 두 좌표 사이 거리 (미터) — Haversine */
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 상대 시간 포맷 */
function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

/** 현재 시각 HH:MM 포맷 */
function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 토스트 메시지 */
function showToast(msg) {
  let t = document.getElementById('_toast');
  if (!t) {
    t = document.createElement('div');
    t.id = '_toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ══════════════════════════════════════
   4. 대시보드 렌더링
   ══════════════════════════════════════ */
function renderDashboard() {
  const stores = Store.getAll() || [];
  const grid = document.getElementById('cardGrid');
  grid.innerHTML = '';

  // 통계 업데이트
  document.getElementById('statTotal').textContent = stores.length;
  document.getElementById('statCrowded').textContent =
    stores.filter(s => s.crowd === '혼잡').length;
  document.getElementById('statSoldout').textContent =
    stores.filter(s => s.soldout).length;
  document.getElementById('lastUpdated').textContent = `업데이트 ${nowHHMM()}`;

  if (!stores.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📍</div>
        <p>등록된 팝업 매장이 없습니다</p>
      </div>`;
    return;
  }

  stores.forEach((store, i) => {
    const card = document.createElement('div');
    card.className = `store-card crowd-${store.crowd}`;
    card.style.animationDelay = `${i * 0.06}s`;

    const crowdEmoji = { 여유: '🟢', 보통: '🟡', 혼잡: '🔴' }[store.crowd] ?? '⚪';
    const goodsClass = store.soldout ? 'sold-out' : 'in-stock';
    const goodsText = store.soldout ? '품절' : '재고 있음';

    card.innerHTML = `
      <div class="card-top">
        <div class="store-name">${store.name.replace('\n', '<br>')}</div>
        <div class="crowd-badge ${store.crowd}">${crowdEmoji} ${store.crowd}</div>
      </div>
      <div class="card-wait">
        <span class="wait-num">${store.waitTeams}</span>
        <span class="wait-unit">팀 대기</span>
      </div>
      <div class="card-bottom">
        <div>
          <div class="goods-label">굿즈 재고</div>
          <div class="goods-status ${goodsClass}">${goodsText}</div>
        </div>
        <button class="btn-toggle-goods" data-id="${store.id}">
          ${store.soldout ? '재고 복구' : '품절 처리'}
        </button>
      </div>
      <div class="card-updated">📍 ${store.address} · ${timeAgo(store.updatedAt)}</div>
    `;

    // 굿즈 토글 버튼 이벤트
    card.querySelector('.btn-toggle-goods').addEventListener('click', () => {
      Store.update(store.id, { soldout: !store.soldout });
      renderDashboard();
      showToast(store.soldout ? '✅ 재고 복구 완료' : '🚫 품절 처리 완료');
    });

    grid.appendChild(card);
  });
}

/* ══════════════════════════════════════
   5. Geolocation 로직
   ══════════════════════════════════════ */
const GPS_RADIUS = 500; // 미터

let userLat = null;
let userLng = null;
let selectedStoreId = null;
let selectedCrowd = null;
let waitCount = 0;

function requestLocation() {
  const gpsEl = document.getElementById('gpsStatus');
  const gpsMsg = document.getElementById('gpsMsg');

  if (!navigator.geolocation) {
    gpsEl.className = 'gps-status error';
    gpsMsg.textContent = 'GPS를 지원하지 않는 브라우저입니다.';
    return;
  }

  gpsEl.className = 'gps-status';
  gpsMsg.textContent = '위치 확인 중…';

  navigator.geolocation.getCurrentPosition(
    pos => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;
      gpsEl.className = 'gps-status ok';
      gpsMsg.textContent = `GPS 확인됨 (정확도 ±${Math.round(pos.coords.accuracy)}m)`;
      updateSubmitState();
    },
    err => {
      gpsEl.className = 'gps-status error';
      const msgs = {
        1: '위치 권한이 거부되었습니다.',
        2: '위치를 가져올 수 없습니다.',
        3: '위치 요청이 시간 초과되었습니다.',
      };
      gpsMsg.textContent = msgs[err.code] ?? '위치 오류 발생';
    },
    { timeout: 8000, maximumAge: 60000 }
  );
}

/** 제출 버튼 활성화 조건 체크 */
function updateSubmitState() {
  const btn = document.getElementById('btnSubmit');
  const notice = document.getElementById('modalNotice');

  if (!selectedStoreId) {
    btn.disabled = true;
    notice.textContent = '';
    return;
  }
  if (!selectedCrowd) {
    btn.disabled = true;
    notice.textContent = '';
    return;
  }
  if (userLat === null) {
    btn.disabled = true;
    notice.textContent = 'GPS 위치 확인 후 제보할 수 있습니다.';
    return;
  }

  // 선택된 매장과의 거리 계산
  const stores = Store.getAll();
  const store = stores.find(s => s.id === selectedStoreId);
  if (!store) return;

  const dist = getDistance(userLat, userLng, store.lat, store.lng);

  if (dist > GPS_RADIUS) {
    btn.disabled = true;
    notice.textContent = `📍 매장까지 ${Math.round(dist)}m — 500m 이내에서만 제보 가능합니다.`;
  } else {
    btn.disabled = false;
    notice.textContent = `✅ 매장 ${Math.round(dist)}m 근처 — 제보 가능합니다.`;
  }
}

/* ══════════════════════════════════════
   6. 모달 UI 이벤트
   ══════════════════════════════════════ */
function initModal() {
  const overlay = document.getElementById('modalOverlay');
  const fab = document.getElementById('fabReport');
  const closeBtn = document.getElementById('modalClose');
  const selectStore = document.getElementById('selectStore');
  const crowdBtns = document.querySelectorAll('.crowd-btn');
  const numMinus = document.getElementById('numMinus');
  const numPlus = document.getElementById('numPlus');
  const numDisplay = document.getElementById('numDisplay');
  const soldoutToggle = document.getElementById('soldoutToggle');
  const toggleText = document.getElementById('toggleText');
  const btnSubmit = document.getElementById('btnSubmit');

  /** 모달 열기 */
  function openModal() {
    // 매장 목록 채우기
    const stores = Store.getAll() || [];
    selectStore.innerHTML = '<option value="">— 매장을 선택하세요 —</option>';
    stores.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name.replace('\n', ' ');
      selectStore.appendChild(opt);
    });

    // 상태 초기화
    selectedStoreId = null;
    selectedCrowd = null;
    waitCount = 0;
    numDisplay.textContent = '0';
    soldoutToggle.checked = false;
    toggleText.textContent = '재고 있음';
    crowdBtns.forEach(b => b.classList.remove('selected'));
    document.getElementById('btnSubmit').disabled = true;
    document.getElementById('modalNotice').textContent = '';

    overlay.classList.add('open');
    requestLocation();
  }

  /** 모달 닫기 */
  function closeModal() {
    overlay.classList.remove('open');
  }

  fab.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });

  // 매장 선택
  selectStore.addEventListener('change', e => {
    selectedStoreId = e.target.value || null;
    updateSubmitState();
  });

  // 혼잡도 버튼
  crowdBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      crowdBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedCrowd = btn.dataset.value;
      updateSubmitState();
    });
  });

  // 대기 팀수
  numMinus.addEventListener('click', () => {
    if (waitCount > 0) waitCount--;
    numDisplay.textContent = waitCount;
  });
  numPlus.addEventListener('click', () => {
    if (waitCount < 99) waitCount++;
    numDisplay.textContent = waitCount;
  });

  // 품절 토글
  soldoutToggle.addEventListener('change', () => {
    toggleText.textContent = soldoutToggle.checked ? '품절 상태' : '재고 있음';
  });

  // 제보 제출
  btnSubmit.addEventListener('click', () => {
    if (!selectedStoreId || !selectedCrowd) return;

    Store.update(selectedStoreId, {
      crowd: selectedCrowd,
      waitTeams: waitCount,
      soldout: soldoutToggle.checked,
    });

    closeModal();
    renderDashboard();
    showToast('🎉 제보가 반영되었습니다!');
  });
}

/* ══════════════════════════════════════
   7. 새로고침 버튼
   ══════════════════════════════════════ */
document.getElementById('btnRefresh').addEventListener('click', () => {
  renderDashboard();
  showToast('🔄 데이터를 새로고침 했습니다.');
});

/* ══════════════════════════════════════
   8. 초기화
   ══════════════════════════════════════ */
Store.init();
renderDashboard();
initModal();
