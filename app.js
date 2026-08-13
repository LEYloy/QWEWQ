const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ⚠️ ВАЖНО: впиши сюда адрес своего бэкенда (Railway/Render/VPS), например:
// const API_URL = 'https://my-bot-backend.up.railway.app';
// Если фронт и бэкенд на одном домене (не GitHub Pages) — оставь пустую строку ''
const API_URL = 'https://qweqwrqwrq-production.up.railway.app';

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
  if (!data.invoiceUrl) {
    setStatus(data.error || 'Ошибка создания счёта');
    return;
  }

  // Открываем чат с @CryptoBot напрямую — оплата происходит там, не в мини-аппе
  tg.openTelegramLink(data.invoiceUrl);
  setStatus('Открыт чат с CryptoBot — заверши оплату там, потом вернись сюда');

  const poll = setInterval(async () => {
    const check = await fetch(API_URL + '/api/pay/cryptobot/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: data.invoiceId }),
    });
    const result = await check.json();
    if (result.status === 'paid') {
      setStatus('Оплачено ✅');
      clearInterval(poll);
    }
  }, 3000);
});

loadProfile();
