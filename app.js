const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ⚠️ ВАЖНО: впиши сюда адрес своего бэкенда (Railway/Render/VPS), например:
// const API_URL = 'https://my-bot-backend.up.railway.app';
// Если фронт и бэкенд на одном домене (не GitHub Pages) — оставь пустую строку ''
const API_URL = 'https://ВПИШИ-СЮДА-АДРЕС-БЭКЕНДА.up.railway.app';

const initData = tg.initData; // сырая строка, подписанная Telegram — именно она "связывает" апп с профилем

let currentProduct = null;

async function loadProfile() {
  const res = await fetch(API_URL + '/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData }),
  });

  if (!res.ok) {
    document.getElementById('profile').innerHTML = '<div class="loader">Открой это через кнопку в боте, не в браузере отдельно</div>';
    return;
  }

  const { user, product } = await res.json();
  currentProduct = product;

  const photo = user.photo_url || '';
  document.getElementById('profile').innerHTML = `
    ${photo ? `<img src="${photo}">` : ''}
    <div>
      <div class="name">${user.first_name || ''} ${user.last_name || ''}</div>
      <div class="username">${user.username ? '@' + user.username : 'id ' + user.id}</div>
    </div>
  `;

  document.getElementById('p-title').textContent = product.title;
  document.getElementById('p-desc').textContent = product.description;
  document.getElementById('p-price-ton').textContent = `${product.priceTon} TON`;
  document.getElementById('p-price-stars').textContent = `${product.priceStars} ⭐`;
  document.getElementById('product').style.display = 'block';
}

function setStatus(text) {
  document.getElementById('status').textContent = text;
}

document.getElementById('buy-stars').addEventListener('click', async () => {
  setStatus('Создаём счёт…');
  const res = await fetch(API_URL + '/api/pay/stars', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData }),
  });
  const data = await res.json();
  if (!data.invoiceLink) {
    setStatus('Ошибка создания счёта');
    return;
  }

  // openInvoice открывает окно оплаты Stars ПРЯМО ВНУТРИ мини-аппа, никуда не выходя
  tg.openInvoice(data.invoiceLink, (status) => {
    if (status === 'paid') {
      setStatus('Оплачено ✅');
      tg.HapticFeedback.notificationOccurred('success');
    } else {
      setStatus(`Статус: ${status}`);
    }
  });
});

document.getElementById('buy-crypto').addEventListener('click', async () => {
  setStatus('Создаём счёт в CryptoBot…');
  const res = await fetch(API_URL + '/api/pay/cryptobot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData }),
  });
  const data = await res.json();
  if (!data.miniAppInvoiceUrl) {
    setStatus(data.error || 'Ошибка создания счёта');
    return;
  }

  // Открываем окно оплаты CryptoBot, не покидая Telegram
  tg.openInvoice(data.miniAppInvoiceUrl, async (status) => {
    setStatus('Проверяем оплату…');
    const check = await fetch(API_URL + '/api/pay/cryptobot/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: data.invoiceId }),
    });
    const result = await check.json();
    setStatus(result.status === 'paid' ? 'Оплачено ✅' : `Статус: ${result.status}`);
  });
});

loadProfile();
