// ========== Глобальные переменные для данных ==========
let allProducts = [];
let allReviews = [];

// ========== Конфигурация ==========
let BTC_RATE = 9700000; // Default fallback value
const BTC_ADDRESS = "bc1qaxcanfh53hj449n890dm2f9c5ftswk1lxt3s38";

// ====== Загрузка данных и инициализация приложения ======
async function initializeApp() {
  try {
    // Fetch the current Bitcoin price in RUB
    try {
      const btcResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=rub');
      if (btcResponse.ok) {
        const btcData = await btcResponse.json();
        if (btcData.bitcoin && btcData.bitcoin.rub) {
          BTC_RATE = btcData.bitcoin.rub;
          console.log(`Курс BTC обновлен: ${BTC_RATE} RUB`);
        }
      }
    } catch (e) {
      console.error("Не удалось загрузить курс BTC, используется значение по умолчанию.", e);
    }

    // Загружаем продукты и отзывы одновременно
    const [productsResponse, reviewsResponse] = await Promise.all([
      fetch('products.json'),
      fetch('reviews.json')
    ]);

    if (!productsResponse.ok || !reviewsResponse.ok) {
      throw new Error('Не удалось загрузить данные.');
    }

    allProducts = await productsResponse.json();
    allReviews = await reviewsResponse.json();

    // Запускаем остальную логику только после загрузки данных
    if (document.getElementById("product-list")) {
      setupFilterListeners();
      updateFilterDisplay();
      applyFilters();
    }
    if (document.getElementById("detail-name")) {
      loadProductPage();
    }
    setupFilterToggle();
    setupAuthToggle();
    updateProfile();
    updateBalanceDisplay();

  } catch (error) {
    console.error("Ошибка при инициализации:", error);
    showToast("Не удалось загрузить данные магазина.");
  }
}


// ====== Утилиты ======
function showToast(msg, ms = 2500) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), ms);
}

// НОВАЯ ЛОГИКА РАСЧЕТА РЕЙТИНГА
function calculateProductRating(productId) {
  const reviewsForProduct = allReviews.filter(r => r.productId === productId);
  if (reviewsForProduct.length === 0) {
    // Если отзывов нет, возвращаем случайный рейтинг
    return (4.4 + Math.random() * 0.6).toFixed(1);
  } else {
    // Иначе считаем среднее арифметическое
    const sum = reviewsForProduct.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviewsForProduct.length).toFixed(1);
  }
}


// ====== Навигация / Страницы ======
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}
function goHome(evt) {
  evt && evt.preventDefault && evt.preventDefault();
  if (document.getElementById("product-list")) {
    localStorage.removeItem("selectedProduct");
    showPage("products");
    applyFilters();
  } else {
    localStorage.removeItem("selectedProduct");
    window.location.href = "index.html";
  }
}

// ====== Авторизация / регистрация / профиль (без изменений) ======
function setupAuthToggle() {
  const loginCard = document.getElementById('login-card');
  const registerCard = document.getElementById('register-card');
  const showRegisterLink = document.getElementById('show-register-link');
  const showLoginLink = document.getElementById('show-login-link');

  if (!loginCard || !registerCard || !showRegisterLink || !showLoginLink) return;

  showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginCard.style.display = 'none';
    registerCard.style.display = 'block';
  });

  showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerCard.style.display = 'none';
    loginCard.style.display = 'block';
  });
}
function loginUser() {
  const username = (document.getElementById("login-username")?.value || "").trim();
  const password = (document.getElementById("login-password")?.value || "").trim();
  const users = JSON.parse(localStorage.getItem("users") || "{}");
  if (!users[username] || users[username].password !== password) return showToast("Неверный логин или пароль!");
  localStorage.setItem("currentUser", username);
  updateProfile();
  updateBalanceDisplay();
  document.getElementById("auth-link") && (document.getElementById("auth-link").style.display = "none");
  document.getElementById("profile-link") && (document.getElementById("profile-link").style.display = "block");
  showPage("products");
  showToast(`Добро пожаловать, ${username}!`);
}
function logoutUser() {
  localStorage.removeItem("currentUser");
  document.getElementById("auth-link") && (document.getElementById("auth-link").style.display = "block");
  document.getElementById("profile-link") && (document.getElementById("profile-link").style.display = "none");
  updateProfile();
  updateBalanceDisplay();
  showPage("auth");
  showToast("Вы вышли");
}
function updateProfile() {
  const cur = localStorage.getItem("currentUser");
  if (!cur) return;
  const users = JSON.parse(localStorage.getItem("users") || "{}");
  const u = users[cur] || { balance: 0, purchased: [], avatar: "" };
  const nameEl = document.getElementById("profile-username");
  const balEl = document.getElementById("profile-balance");
  const purEl = document.getElementById("profile-purchases");
  const avatarEl = document.getElementById("profile-avatar");
  if (nameEl) nameEl.textContent = cur;
  if (balEl) balEl.textContent = `${(u.balance || 0).toLocaleString("ru-RU")} ₽`;
  if (purEl) purEl.textContent = (u.purchased || []).length;
  if (avatarEl && u.avatar) avatarEl.src = u.avatar;
}
function updateAvatar() {
  const input = document.getElementById("avatar-input");
  if (!input || !input.files || !input.files[0]) return showToast("Файл не выбран");
  const reader = new FileReader();
  reader.onload = () => {
    const cur = localStorage.getItem("currentUser");
    if (!cur) return showToast("Сначала войдите");
    let users = JSON.parse(localStorage.getItem("users") || "{}");
    users[cur] = users[cur] || { password: "", balance: 0, purchased: [], avatar: "" };
    users[cur].avatar = reader.result;
    localStorage.setItem("users", JSON.stringify(users));
    updateProfile();
    showToast("Аватар обновлён");
  };
  reader.readAsDataURL(input.files[0]);
}
function copyBTC() {
  navigator.clipboard.writeText(BTC_ADDRESS).then(() => showToast("BTC-адрес скопирован"));
}

// ====== Баланс (руб + BTC) ======
function updateBalanceDisplay() {
  const cur = localStorage.getItem("currentUser");
  let rub = 0;
  if (cur) {
    const users = JSON.parse(localStorage.getItem("users") || "{}");
    rub = users[cur]?.balance ?? 0;
  }
  const btc = (rub / BTC_RATE).toFixed(8);
  document.querySelectorAll("#balance-rub").forEach(el => el.textContent = `${rub.toLocaleString("ru-RU")} ₽`);
  document.querySelectorAll("#balance-btc").forEach(el => el.textContent = `${btc} BTC`);
  const pb = document.getElementById("profile-balance");
  if (pb && cur) pb.textContent = `${rub.toLocaleString("ru-RU")} ₽`;
}

// ====== Продукты: список, фильтры, открыть товар ======
function setCity() {
  applyFilters();
}
function renderProducts(productsToRender) {
  const container = document.getElementById("product-list");
  if (!container) return;
  container.innerHTML = "";
  if (productsToRender.length === 0) {
      container.innerHTML = `<p style="grid-column: 1 / -1; text-align: center;">Товары не найдены.</p>`;
      return;
  }
  productsToRender.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    const rating = calculateProductRating(p.id); // ИСПОЛЬЗУЕМ НОВУЮ ФУНКЦИЮ
    card.innerHTML = `
      <img src="${p.image}" alt="${p.name}">
      <h4>${p.name} <span class="product-weight">(${p.weight} г)</span></h4>
      <div class="rating">${rating} ⭐⭐⭐⭐⭐</div>
      <div class="price">${p.price.toLocaleString("ru-RU")} ₽</div>
      <button class="btn btn-primary">Подробнее</button>
    `;
    card.querySelector("button").addEventListener("click", () => openProduct(p.id));
    container.appendChild(card);
  });
}
function openProduct(productId) {
  const p = allProducts.find(prod => prod.id === productId);
  if (!p) return showToast("Товар не найден");
  localStorage.setItem("selectedProduct", JSON.stringify(p));
  window.location.href = "product.html";
}

// --- Sidebar Filter Logic ---
function setupFilterListeners() {
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) { applyFiltersBtn.addEventListener('click', applyFilters); }
    const sliders = document.querySelectorAll('.sidebar input[type="range"], .sidebar input[type="checkbox"]');
    sliders.forEach(slider => { slider.addEventListener('input', updateFilterDisplay); });
}
function updateFilterDisplay() {
    const weightMinSlider = document.getElementById('weight-min'), weightMaxSlider = document.getElementById('weight-max'), weightMinVal = document.getElementById('weight-min-val'), weightMaxVal = document.getElementById('weight-max-val');
    updateRangeValues(weightMinSlider, weightMaxSlider, weightMinVal, weightMaxVal, 'г');
    const priceMinSlider = document.getElementById('price-min'), priceMaxSlider = document.getElementById('price-max'), priceMinVal = document.getElementById('price-min-val'), priceMaxVal = document.getElementById('price-max-val');
    updateRangeValues(priceMinSlider, priceMaxSlider, priceMinVal, priceMaxVal, '₽');
}
const updateRangeValues = (minSlider, maxSlider, minValElem, maxValElem, unit) => {
    let min = parseFloat(minSlider.value), max = parseFloat(maxSlider.value);
    if (min > max) { maxSlider.value = min; max = min; }
    minValElem.textContent = `${min} ${unit}`;
    maxValElem.textContent = `${max} ${unit}`;
};
function applyFilters() {
    const selectedCity = document.getElementById('city').value;
    const checkedBoxes = document.querySelectorAll('.category-item input[type="checkbox"]:checked');
    const selectedSubcategories = Array.from(checkedBoxes).map(cb => cb.value);
    const minWeight = parseFloat(document.getElementById('weight-min').value);
    const maxWeight = parseFloat(document.getElementById('weight-max').value);
    const minPrice = parseFloat(document.getElementById('price-min').value);
    const maxPrice = parseFloat(document.getElementById('price-max').value);
    const filteredProducts = allProducts.filter(product => {
      const cityMatch = product.city === selectedCity;
      const categoryMatch = selectedSubcategories.length === 0 || selectedSubcategories.includes(product.subtype);
      const weightMatch = product.weight >= minWeight && product.weight <= maxWeight;
      const priceMatch = product.price >= minPrice && product.price <= maxPrice;
      return cityMatch && categoryMatch && weightMatch && priceMatch;
    });
    renderProducts(filteredProducts);
}
function setupFilterToggle() {
    const toggleBtn = document.getElementById('toggle-filters-btn');
    const sidebar = document.querySelector('.sidebar');

    if (!toggleBtn || !sidebar) return;

    toggleBtn.addEventListener('click', () => {
        const isOpen = sidebar.classList.toggle('is-open');
        // Меняем текст на кнопке
        toggleBtn.textContent = isOpen ? 'Скрыть фильтры' : 'Показать фильтры';
    });
}

// ====== Страница товара: загрузка, покупка, отзывы ======
function loadProductPage() {
  const raw = localStorage.getItem("selectedProduct");
  if (!raw) {
    showToast("Товар не выбран — возвращаем на главную");
    setTimeout(() => window.location.href = "index.html", 800);
    return;
  }
  const product = JSON.parse(raw);
  document.getElementById("detail-img").src = product.image;
  document.getElementById("detail-name").textContent = product.name;
  document.getElementById("detail-desc").textContent = product.desc;
  document.getElementById("detail-weight").textContent = product.weight;
  
  // Display RUB and BTC prices
  const priceRub = product.price;
  const priceBtc = (priceRub / BTC_RATE).toFixed(8);
  document.getElementById("detail-price").textContent = priceRub.toLocaleString("ru-RU");
  document.getElementById("detail-price-btc").textContent = priceBtc;


  updateBalanceDisplay();
  renderReviews(); // Запускаем рендер отзывов
}


function buySelectedProduct() {
  const cur = localStorage.getItem("currentUser");
  if (!cur) return showToast("Сначала войдите в аккаунт");
  let users = JSON.parse(localStorage.getItem("users") || "{}");
  const product = JSON.parse(localStorage.getItem("selectedProduct") || "null");
  if (!product) return showToast("Товар не выбран");
  const price = Number(product.price || 0);
  if (users[cur].balance < price) return showToast("Недостаточно средств");
  users[cur].balance -= price;
  users[cur].purchased.push(product.id); // Сохраняем ID товара, а не имя
  localStorage.setItem("users", JSON.stringify(users));
  updateBalanceDisplay();
  updateProfile();
  showToast("Покупка успешна");
  document.getElementById("review-form").style.display = "block";
}

// ПОЛНОСТЬЮ ПЕРЕПИСАННАЯ ЛОГИКА ОТЗЫВОВ
function renderReviews() {
  const product = JSON.parse(localStorage.getItem("selectedProduct") || "null");
  if (!product) return;
  const list = document.getElementById("reviews-list");
  if (!list) return;

  const reviewsForProduct = allReviews.filter(r => r.productId === product.id);
  list.innerHTML = ""; // Очищаем список
  if (reviewsForProduct.length > 0) {
    reviewsForProduct.forEach(review => {
      const d = document.createElement("div");
      d.className = "review";
      const reviewDate = new Date(review.datetime).toLocaleDateString('ru-RU');
      d.innerHTML = `<strong>${review.user}</strong> (Оценка: ${review.rating}/5) <span class="review-date">${reviewDate}</span><p>${review.text}</p>`;
      list.appendChild(d);
    });
  } else {
    list.innerHTML = "<p>Отзывов пока нет. Станьте первым!</p>";
  }

  // Показываем форму отзыва, если пользователь купил этот товар
  const cur = localStorage.getItem("currentUser");
  if (cur) {
    const users = JSON.parse(localStorage.getItem("users") || "{}");
    if (users[cur]?.purchased?.includes(product.id)) {
      document.getElementById("review-form").style.display = "block";
    }
  }
}
function addReview() {
  const text = (document.getElementById("review-text")?.value || "").trim();
  if (!text) return showToast("Введите текст отзыва");
  const cur = localStorage.getItem("currentUser");
  if (!cur) return showToast("Войдите чтобы оставить отзыв");
  const product = JSON.parse(localStorage.getItem("selectedProduct") || "null");
  if (!product) return showToast("Товар не выбран");

  // TODO: Добавить выбор оценки (звёздочки) на странице
  const MOCK_RATING = 5;

  const newReview = {
    id: Date.now(), // Уникальный ID на основе времени
    productId: product.id,
    user: cur,
    rating: MOCK_RATING,
    text: text,
    datetime: new Date().toISOString()
  };

  // Добавляем отзыв в наш массив в памяти
  allReviews.push(newReview);
  // В реальном приложении здесь был бы запрос на сервер
  // Для простоты мы можем сохранять отзывы в localStorage, чтобы они не пропадали при перезагрузке
  // localStorage.setItem('allReviews', JSON.stringify(allReviews));

  document.getElementById("review-text").value = "";
  showToast("Спасибо за отзыв");
  renderReviews(); // Перерисовываем отзывы с учётом нового
}

// ====== Инициализация страницы ======
window.addEventListener("DOMContentLoaded", initializeApp);