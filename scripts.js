// ========== Конфигурация ==========
const BTC_RATE = 9700000; // курс (статичный, можно обновлять)
const BTC_ADDRESS = "bc1qaxcanfh53hj449n890dm2f9c5ftswk1lxt3s38";

// ====== Данные товаров (по городам) ======
const productsByCity = {
  "Новосибирск": [
    { name: "Сибирский лёд", desc: "Чистота и свежесть Сибири.", weight: 1, price: 2500, img: "images/product1.jpg" },
    { name: "Белая свежесть", desc: "Лёгкость и сила холода.", weight: 1.5, price: 3200, img: "images/product2.jpg" },
    { name: "Хрустальный поток", desc: "Идеальное сочетание аромата и силы.", weight: 2, price: 4100, img: "images/product3.jpg" },
    { name: "Полярная чистота", desc: "Роскошь северного холода.", weight: 1, price: 3000, img: "images/product4.jpg" }
  ],
  "Кемерово": [
    { name: "Северный бриз", desc: "Аромат холодного утра.", weight: 1, price: 2700, img: "images/product5.jpg" },
    { name: "Кристалл", desc: "Чистейший блеск льда.", weight: 2, price: 3500, img: "images/product6.jpg" },
    { name: "Морозная свежесть", desc: "Пробуждает и заряжает энергией.", weight: 1.5, price: 3200, img: "images/product7.jpg" },
    { name: "Северный свет", desc: "Яркий и насыщенный аромат холода.", weight: 1, price: 3100, img: "images/product8.jpg" }
  ],
  "Томск": [
    { name: "Снежная сила", desc: "Мощь зимней свежести.", weight: 1.2, price: 2900, img: "images/product9.jpg" },
    { name: "Ледяная роскошь", desc: "Роскошь в каждом вдохе.", weight: 1.8, price: 4100, img: "images/product10.jpg" },
    { name: "Зимняя прохлада", desc: "Освежающее дыхание северного ветра.", weight: 1, price: 2700, img: "images/product11.jpg" },
    { name: "Сибирский бриз", desc: "Нежная прохлада и аромат свежести.", weight: 1.5, price: 3100, img: "images/product12.jpg" }
  ]
};

// ====== Утилиты ======
function showToast(msg, ms = 2500) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), ms);
}

function getRandomRating() {
  return (4.4 + Math.random() * 0.6).toFixed(1);
}

// ====== Навигация / Страницы ======
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

// если пользователь кликает по логотипу — домой
function goHome(evt) {
  evt && evt.preventDefault && evt.preventDefault();
  // если мы уже на index (есть product-list), просто показать страницу
  if (document.getElementById("product-list")) {
    localStorage.removeItem("selectedProduct");
    showPage("products");
    const sel = document.getElementById("city");
    renderProducts(sel ? sel.value : "Новосибирск");
  } else {
    // мы на product.html — переходим на index.html
    localStorage.removeItem("selectedProduct");
    window.location.href = "index.html";
  }
}

// ====== Авторизация / регистрация / профиль ======
function registerUser() {
  const username = (document.getElementById("register-username")?.value || "").trim();
  const password = (document.getElementById("register-password")?.value || "").trim();
  const confirm = (document.getElementById("register-confirm")?.value || "").trim();
  if (!username || !password) return showToast("Введите логин и пароль!");
  if (password !== confirm) return showToast("Пароли не совпадают!");

  let users = JSON.parse(localStorage.getItem("users") || "{}");
  if (users[username]) return showToast("Пользователь уже существует!");
  users[username] = { password, balance: 5000, purchased: [], reviews: {}, avatar: "" };
  localStorage.setItem("users", JSON.stringify(users));
  showToast("Регистрация успешна — войдите");
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
    users[cur] = users[cur] || { password: "", balance: 0, purchased: [], reviews: {}, avatar: "" };
    users[cur].avatar = reader.result;
    localStorage.setItem("users", JSON.stringify(users));
    updateProfile();
    showToast("Аватар обновлён");
  };
  reader.readAsDataURL(input.files[0]);
}

// копировать BTC-адрес
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
  const btc = (rub / BTC_RATE).toFixed(6);
  document.querySelectorAll("#balance-rub").forEach(el => el.textContent = `${rub.toLocaleString("ru-RU")} ₽`);
  document.querySelectorAll("#balance-btc").forEach(el => el.textContent = `${btc} BTC`);
  const pb = document.getElementById("profile-balance");
  if (pb && cur) pb.textContent = `${rub.toLocaleString("ru-RU")} ₽`;
}

// ====== Продукты: список, фильтры, открыть товар ======
function setCity() {
  const sel = document.getElementById("city");
  const city = sel ? sel.value : "Новосибирск";
  const info = document.getElementById("city-info");
  if (info) info.textContent = `Ваш город: ${city}`;
  renderProducts(city);
}

function renderProducts(city = "Новосибирск") {
  const container = document.getElementById("product-list");
  if (!container) return;
  container.innerHTML = "";
  const items = productsByCity[city] || [];
  items.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "product-card";
    const rating = getRandomRating();
    card.innerHTML = `
      <img src="${p.img}" alt="${p.name}">
      <h4>${p.name}</h4>
      <div class="rating">${rating} ⭐⭐⭐⭐⭐</div>
      <div class="price">${p.price.toLocaleString("ru-RU")} ₽</div>
      <button class="btn btn-primary">Подробнее</button>
    `;
    card.querySelector("button").addEventListener("click", () => openProduct(city, i));
    container.appendChild(card);
  });
}

function applyWeightFilter() {
  // простой демонстрационный фильтр: пока не изменяет набор (реализовать при желании)
  showToast("Фильтр применён (демо)");
}

// переход на страницу товара
function openProduct(city, index) {
  const p = (productsByCity[city] || [])[index];
  if (!p) return showToast("Товар не найден");
  const clone = Object.assign({}, p, { rating: getRandomRating(), city });
  localStorage.setItem("selectedProduct", JSON.stringify(clone));
  window.location.href = "product.html";
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
  const img = document.getElementById("detail-img");
  const name = document.getElementById("detail-name");
  const desc = document.getElementById("detail-desc");
  const weight = document.getElementById("detail-weight");
  const price = document.getElementById("detail-price");
  const rating = document.getElementById("detail-rating");
  if (img) { img.src = product.img || ""; img.alt = product.name || "Товар"; }
  if (name) name.textContent = product.name || "";
  if (desc) desc.textContent = product.desc || "";
  if (weight) weight.textContent = product.weight ?? "";
  if (price) price.textContent = product.price ?? "";
  if (rating) rating.textContent = "⭐ " + (product.rating ?? getRandomRating());

  const rf = document.getElementById("review-form");
  if (rf) rf.style.display = "none";

  updateBalanceDisplay();
  renderReviews();
}

function buySelectedProduct() {
  const cur = localStorage.getItem("currentUser");
  if (!cur) return showToast("Сначала войдите в аккаунт");
  let users = JSON.parse(localStorage.getItem("users") || "{}");
  users[cur] = users[cur] || { password: "", balance: 0, purchased: [], reviews: {}, avatar: "" };
  const product = JSON.parse(localStorage.getItem("selectedProduct") || "null");
  if (!product) return showToast("Товар не выбран");
  const price = Number(product.price || 0);
  if (users[cur].balance < price) return showToast("Недостаточно средств");
  users[cur].balance -= price;
  users[cur].purchased = users[cur].purchased || [];
  users[cur].purchased.push(product.name);
  localStorage.setItem("users", JSON.stringify(users));
  updateBalanceDisplay();
  updateProfile();
  showToast("Покупка успешна");
  const rf = document.getElementById("review-form");
  if (rf) rf.style.display = "block";
  renderReviews();
}

function renderReviews() {
  const product = JSON.parse(localStorage.getItem("selectedProduct") || "null");
  if (!product) return;
  const users = JSON.parse(localStorage.getItem("users") || "{}");
  const list = document.getElementById("reviews-list");
  if (!list) return;
  list.innerHTML = "";
  Object.entries(users).forEach(([uname, data]) => {
    if (data.reviews && data.reviews[product.name]) {
      const d = document.createElement("div");
      d.className = "review";
      d.textContent = `${uname}: ${data.reviews[product.name]}`;
      list.appendChild(d);
    }
  });
  const cur = localStorage.getItem("currentUser");
  if (cur && users[cur] && users[cur].purchased && users[cur].purchased.includes(product.name)) {
    const rf = document.getElementById("review-form");
    if (rf) rf.style.display = "block";
  }
}

function addReview() {
  const text = (document.getElementById("review-text")?.value || "").trim();
  if (!text) return showToast("Введите текст отзыва");
  const cur = localStorage.getItem("currentUser");
  if (!cur) return showToast("Войдите чтобы оставить отзыв");
  const product = JSON.parse(localStorage.getItem("selectedProduct") || "null");
  if (!product) return showToast("Товар не выбран");
  let users = JSON.parse(localStorage.getItem("users") || "{}");
  users[cur] = users[cur] || { password: "", balance: 0, purchased: [], reviews: {}, avatar: "" };
  users[cur].reviews = users[cur].reviews || {};
  users[cur].reviews[product.name] = text;
  localStorage.setItem("users", JSON.stringify(users));
  document.getElementById("review-text").value = "";
  showToast("Спасибо за отзыв");
  renderReviews();
}

// ====== Инициализация страницы ======
window.addEventListener("DOMContentLoaded", () => {
  // index page: render products if product-list exists
  if (document.getElementById("product-list")) {
    const sel = document.getElementById("city");
    const city = sel ? sel.value : "Новосибирск";
    renderProducts(city);
  }
  // product page: load product if detail element exists
  if (document.getElementById("detail-name")) loadProductPage();

  updateProfile();
  updateBalanceDisplay();
});
