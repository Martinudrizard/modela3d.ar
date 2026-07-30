const STORAGE_KEYS = {
  products: "modela3d_products_v1",
  cart: "modela3d_cart_v1",
  waNumber: "modela3d_wa_number_v1",
  heroSlides: "modela3d_hero_slides_v1",
};

const CLOUD_ENDPOINT = "/.netlify/functions/store";
const CLOUD_KEYS = {
  products: "products",
  heroSlides: "heroSlides",
  waNumber: "waNumber",
};

const CLOUD_TIMEOUT_MS = 45000;
const HERO_MAX_IMAGES = 6;

const IMAGE_UPLOAD_CONFIG = {
  product: {
    maxWidth: 1400,
    maxHeight: 1400,
    quality: 0.82,
  },
  hero: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.72,
  },
};

const SHOP_SECTIONS = ["Productos", "Insumos", "Impresoras"];

const SECTION_SUBSECTIONS = {
  Productos: ["Llaveros", "Decoracion", "Organizacion", "Hogar", "Juguetes", "Accesorios"],
  Insumos: ["Filamentos", "Resinas", "Boquillas", "Adhesivos", "Repuestos"],
  Impresoras: ["Impresoras FDM", "Impresoras Resina", "Kits", "Upgrades"],
};

const DEMO_PRODUCTS = [
  {
    id: createId(),
    name: "Llavero Pixel Corazon",
    section: "Productos",
    category: "Llaveros",
    description: "Llavero impreso en PLA con acabado brillante.",
    price: 3200,
    images: [
      "https://images.unsplash.com/photo-1614018453562-77f6180c6f39?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1581306483635-9fca2b8f3f9f?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    id: createId(),
    name: "Maceta Geometrica Mini",
    section: "Productos",
    category: "Decoracion",
    description: "Ideal para suculentas. Base estable y diseno moderno.",
    price: 5800,
    images: [
      "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    id: createId(),
    name: "Filamento PLA 1kg Rojo",
    section: "Insumos",
    category: "Filamentos",
    description: "Bobina de filamento PLA 1.75mm para impresiones de alta calidad.",
    price: 18900,
    images: [
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    id: createId(),
    name: "Impresora 3D Starter Pro",
    section: "Impresoras",
    category: "Impresoras FDM",
    description: "Equipo de entrada con cama caliente y volumen compacto para hogar.",
    price: 459000,
    images: [
      "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=900&q=80",
    ],
  },
];

const state = {
  products: loadFromStorage(STORAGE_KEYS.products, []),
  cart: loadFromStorage(STORAGE_KEYS.cart, {}),
  activeView: "shop",
  activeSection: "Productos",
  activeCategory: "Todas",
  imageIndexByProduct: {},
  heroSlides: loadFromStorage(STORAGE_KEYS.heroSlides, []),
  heroSlideIndex: 0,
  heroTimerId: null,
  pendingProductFiles: [],
  waNumber: localStorage.getItem(STORAGE_KEYS.waNumber) || "",
  cloudWarningShown: false,
};

const el = {
  viewButtons: Array.from(document.querySelectorAll(".view-btn")),
  views: {
    shop: document.getElementById("shop-view"),
    admin: document.getElementById("admin-view"),
  },
  sectionChips: document.getElementById("section-chips"),
  categoryChips: document.getElementById("category-chips"),
  productsSections: document.getElementById("products-sections"),
  productCardTemplate: document.getElementById("product-card-template"),
  heroCarouselImage: document.getElementById("hero-carousel-image"),
  heroPrev: document.getElementById("hero-prev"),
  heroNext: document.getElementById("hero-next"),
  heroDots: document.getElementById("hero-dots"),
  heroMedia: document.querySelector(".hero-media"),
  cartPanel: document.querySelector(".cart-panel"),
  cartToggle: document.getElementById("cart-toggle"),
  cartClose: document.getElementById("cart-close"),
  cartItems: document.getElementById("cart-items"),
  cartTotal: document.getElementById("cart-total"),
  cartCountBadge: document.getElementById("cart-count-badge"),
  cartToggleCount: document.getElementById("cart-toggle-count"),
  checkoutBtn: document.getElementById("checkout-btn"),
  waNumber: document.getElementById("wa-number"),
  saveWaBtn: document.getElementById("save-wa"),
  productForm: document.getElementById("product-form"),
  productSection: document.getElementById("product-section"),
  productCategory: document.getElementById("product-category"),
  productImagesInput: document.getElementById("product-images"),
  productImagePreview: document.getElementById("product-image-preview"),
  productImageCount: document.getElementById("product-image-count"),
  clearProductImagesBtn: document.getElementById("clear-product-images"),
  publishProductBtn: document.getElementById("publish-product-btn"),
  heroImagesInput: document.getElementById("hero-images"),
  heroImagePreview: document.getElementById("hero-image-preview"),
  saveHeroImagesBtn: document.getElementById("save-hero-images"),
  syncUploadBtn: document.getElementById("sync-upload"),
  syncDownloadBtn: document.getElementById("sync-download"),
  adminProductList: document.getElementById("admin-product-list"),
  resetDemoBtn: document.getElementById("reset-demo"),
};

void init();

async function init() {
  if (!state.products.length) {
    state.products = [...DEMO_PRODUCTS];
    persistProducts();
  }

  state.products = state.products.map(normalizeProduct);
  persistProducts();

  state.heroSlides = normalizeHeroSlides(state.heroSlides);
  if (!state.heroSlides.length) {
    state.heroSlides = buildDefaultHeroSlides(state.products);
    persistHeroSlides();
  }

  el.waNumber.value = state.waNumber;
  populateAdminSubsections(normalizeSection(el.productSection.value));
  renderProductImageCount();
  setCartOpen(false);

  bindEvents();
  renderAll();

  await hydrateFromCloud();
}

function bindEvents() {
  el.viewButtons.forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  el.cartToggle.addEventListener("click", () => {
    setCartOpen(!el.cartPanel.classList.contains("open"));
  });

  el.cartClose.addEventListener("click", () => {
    setCartOpen(false);
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    const isClickInsideCart = el.cartPanel.contains(target);
    const isClickOnToggle = el.cartToggle.contains(target);

    if (!isClickInsideCart && !isClickOnToggle) {
      setCartOpen(false);
    }
  });

  el.checkoutBtn.addEventListener("click", handleCheckout);

  el.heroPrev.addEventListener("click", () => {
    if (!state.heroSlides.length) {
      return;
    }
    setHeroSlide(state.heroSlideIndex - 1);
  });

  el.heroNext.addEventListener("click", () => {
    if (!state.heroSlides.length) {
      return;
    }
    setHeroSlide(state.heroSlideIndex + 1);
  });

  el.heroDots.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.matches(".hero-dot")) {
      const index = Number(target.dataset.heroIndex);
      if (Number.isFinite(index)) {
        setHeroSlide(index);
      }
    }
  });

  el.heroMedia.addEventListener("mouseenter", stopHeroAutoplay);
  el.heroMedia.addEventListener("mouseleave", startHeroAutoplay);

  el.productSection.addEventListener("change", () => {
    populateAdminSubsections(el.productSection.value);
  });

  el.productImagesInput.addEventListener("change", () => {
    const selected = Array.from(el.productImagesInput.files || []);
    if (!selected.length) {
      return;
    }

    state.pendingProductFiles = mergeUniqueFiles(state.pendingProductFiles, selected);
    renderLocalImagePreview(state.pendingProductFiles, el.productImagePreview);
    renderProductImageCount();

    // Permite volver a abrir el selector y sumar mas imagenes.
    el.productImagesInput.value = "";
  });

  el.clearProductImagesBtn.addEventListener("click", () => {
    state.pendingProductFiles = [];
    el.productImagesInput.value = "";
    el.productImagePreview.innerHTML = "";
    renderProductImageCount();
  });

  el.heroImagesInput.addEventListener("change", () => {
    renderLocalImagePreview(el.heroImagesInput.files, el.heroImagePreview);
  });

  el.saveWaBtn.addEventListener("click", async () => {
    const cleanNumber = sanitizeWaNumber(el.waNumber.value);
    if (!cleanNumber) {
      alert("Ingresa un numero de WhatsApp valido.");
      return;
    }

    state.waNumber = cleanNumber;
    localStorage.setItem(STORAGE_KEYS.waNumber, cleanNumber);
    await syncStateToCloud(CLOUD_KEYS.waNumber, cleanNumber);
    alert("Numero de WhatsApp guardado.");
  });

  el.productForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(el.productForm);
    const name = String(formData.get("product-name") || "").trim();
    const section = normalizeSection(String(formData.get("product-section") || ""));
    const category = String(formData.get("product-category") || "").trim();
    const description = String(formData.get("product-description") || "").trim();
    const priceValue = Number(formData.get("product-price"));

    const files = [...state.pendingProductFiles];

    if (!name || !section || !category || !description || !Number.isFinite(priceValue) || priceValue <= 0) {
      alert("Completa nombre, seccion, categoria, descripcion y precio correctamente.");
      return;
    }

    if (!files.length) {
      alert("Subi al menos una foto.");
      return;
    }

    setProductSubmitLoading(true);

    try {
      let images;
      images = await Promise.all(
        files.map((file) =>
          processImageFile(file, {
            maxWidth: IMAGE_UPLOAD_CONFIG.product.maxWidth,
            maxHeight: IMAGE_UPLOAD_CONFIG.product.maxHeight,
            quality: IMAGE_UPLOAD_CONFIG.product.quality,
          })
        )
      );
      const product = {
        id: createId(),
        name,
        section,
        category: normalizeSubsection(section, category),
        description,
        price: Math.round(priceValue),
        images,
      };

      state.products.unshift(product);
      if (!persistProducts()) {
        return;
      }

      await syncStateToCloud(CLOUD_KEYS.products, state.products);

      el.productForm.reset();
      populateAdminSubsections(normalizeSection(el.productSection.value));
      state.pendingProductFiles = [];
      renderProductImageCount();
      el.productImagePreview.innerHTML = "";
      renderAll();
      switchView("shop");
    } catch {
      alert("No se pudieron procesar o sincronizar las imagenes. Intenta con fotos mas livianas.");
    } finally {
      setProductSubmitLoading(false);
    }
  });

  el.saveHeroImagesBtn.addEventListener("click", async () => {
    const files = Array.from(el.heroImagesInput.files || []);
    if (!files.length) {
      alert("Subi al menos una imagen para el carrusel.");
      return;
    }

    if (files.length > HERO_MAX_IMAGES) {
      alert(`Para que funcione bien en celular, el carrusel permite hasta ${HERO_MAX_IMAGES} imagenes por vez.`);
      return;
    }

    setHeroSubmitLoading(true);

    try {
      let images;
      images = await Promise.all(
        files.map((file) =>
          processImageFile(file, {
            maxWidth: IMAGE_UPLOAD_CONFIG.hero.maxWidth,
            maxHeight: IMAGE_UPLOAD_CONFIG.hero.maxHeight,
            quality: IMAGE_UPLOAD_CONFIG.hero.quality,
          })
        )
      );
      const normalized = normalizeHeroSlides(images);

      if (!normalized.length) {
        alert("No se pudieron procesar las imagenes.");
        return;
      }

      state.heroSlides = normalized;
      state.heroSlideIndex = 0;
      if (!persistHeroSlides()) {
        return;
      }

      await syncStateToCloud(CLOUD_KEYS.heroSlides, state.heroSlides);

      renderHeroCarousel();
      startHeroAutoplay();
      el.heroImagesInput.value = "";
      el.heroImagePreview.innerHTML = "";
      alert("Carrusel actualizado.");
    } catch {
      alert("No se pudieron procesar o sincronizar las imagenes del carrusel.");
    } finally {
      setHeroSubmitLoading(false);
    }
  });

  el.syncUploadBtn.addEventListener("click", async () => {
    const [productsOk, heroOk, waOk] = await Promise.all([
      syncStateToCloud(CLOUD_KEYS.products, state.products),
      syncStateToCloud(CLOUD_KEYS.heroSlides, state.heroSlides),
      syncStateToCloud(CLOUD_KEYS.waNumber, state.waNumber),
    ]);

    if (productsOk && heroOk && waOk) {
      alert("Datos subidos a la nube. Ahora recarga el otro dispositivo.");
      return;
    }

    alert("No se pudo completar la sincronizacion. Revisa conexion e intenta de nuevo.");
  });

  el.syncDownloadBtn.addEventListener("click", async () => {
    await hydrateFromCloud();
    alert("Datos actualizados desde la nube.");
  });

  el.resetDemoBtn.addEventListener("click", () => {
    const accepted = confirm("Esto reemplazara tus productos actuales por productos demo. Deseas continuar?");
    if (!accepted) {
      return;
    }

    state.products = [...DEMO_PRODUCTS.map((product) => ({ ...product, id: createId() }))];
    persistProducts();
    void syncStateToCloud(CLOUD_KEYS.products, state.products);
    renderAll();
  });

  el.adminProductList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.matches("[data-delete-id]")) {
      const productId = target.dataset.deleteId;
      state.products = state.products.filter((product) => product.id !== productId);
      persistProducts();

      // Limpia productos borrados del carrito para evitar referencias invalidas.
      Object.keys(state.cart).forEach((id) => {
        if (!state.products.some((product) => product.id === id)) {
          delete state.cart[id];
        }
      });

      persistCart();
      void syncStateToCloud(CLOUD_KEYS.products, state.products);
      renderAll();
    }
  });

  el.productsSections.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.matches(".btn-add")) {
      const productId = target.dataset.productId;
      changeQty(productId, 1);
      return;
    }

    if (target.matches(".dot")) {
      const productId = target.dataset.productId;
      const index = Number(target.dataset.imageIndex);
      state.imageIndexByProduct[productId] = index;
      renderProducts();
      return;
    }

    if (target.matches(".product-prev")) {
      const productId = target.dataset.productId;
      moveProductImage(productId, -1);
      return;
    }

    if (target.matches(".product-next")) {
      const productId = target.dataset.productId;
      moveProductImage(productId, 1);
      return;
    }
  });

  el.cartItems.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.matches("[data-inc-id]")) {
      changeQty(target.dataset.incId, 1);
      return;
    }

    if (target.matches("[data-dec-id]")) {
      changeQty(target.dataset.decId, -1);
      return;
    }

    if (target.matches("[data-remove-id]")) {
      removeFromCart(target.dataset.removeId);
    }
  });
}

function setCartOpen(isOpen) {
  el.cartPanel.classList.toggle("open", isOpen);
  el.cartToggle.setAttribute("aria-expanded", String(isOpen));
}

function switchView(viewName) {
  state.activeView = viewName;

  el.viewButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });

  Object.entries(el.views).forEach(([name, view]) => {
    view.classList.toggle("active", name === viewName);
  });
}

function renderAll() {
  renderHeroCarousel();
  renderSectionChips();
  renderCategoryChips();
  renderProducts();
  renderCart();
  renderAdminProducts();
  startHeroAutoplay();
}

async function hydrateFromCloud() {
  if (isLocalFileMode()) {
    return;
  }

  const [cloudProductsResult, cloudHeroSlidesResult, cloudWaNumberResult] = await Promise.all([
    fetchCloudState(CLOUD_KEYS.products),
    fetchCloudState(CLOUD_KEYS.heroSlides),
    fetchCloudState(CLOUD_KEYS.waNumber),
  ]);

  if (cloudProductsResult.ok) {
    if (Array.isArray(cloudProductsResult.data)) {
      state.products = cloudProductsResult.data.map(normalizeProduct);
      persistProducts();
    } else if (cloudProductsResult.data === null && state.products.length) {
      await syncStateToCloud(CLOUD_KEYS.products, state.products);
    }
  }

  if (cloudHeroSlidesResult.ok) {
    if (Array.isArray(cloudHeroSlidesResult.data)) {
      state.heroSlides = normalizeHeroSlides(cloudHeroSlidesResult.data);
      persistHeroSlides();
    } else if (cloudHeroSlidesResult.data === null && state.heroSlides.length) {
      await syncStateToCloud(CLOUD_KEYS.heroSlides, state.heroSlides);
    }
  }

  if (cloudWaNumberResult.ok) {
    if (typeof cloudWaNumberResult.data === "string") {
      state.waNumber = sanitizeWaNumber(cloudWaNumberResult.data);
      localStorage.setItem(STORAGE_KEYS.waNumber, state.waNumber);
      el.waNumber.value = state.waNumber;
    } else if (cloudWaNumberResult.data === null && state.waNumber) {
      await syncStateToCloud(CLOUD_KEYS.waNumber, state.waNumber);
    }
  }

  renderAll();
}

function isLocalFileMode() {
  return window.location.protocol === "file:";
}

async function fetchCloudState(key) {
  if (isLocalFileMode()) {
    return { ok: false, data: null };
  }

  try {
    const response = await fetchWithTimeout(
      `${CLOUD_ENDPOINT}?key=${encodeURIComponent(key)}`,
      {},
      CLOUD_TIMEOUT_MS
    );
    if (!response.ok) {
      return { ok: false, data: null };
    }

    const payload = await response.json();
    if (!payload?.ok) {
      return { ok: false, data: null };
    }

    return { ok: true, data: payload.data ?? null };
  } catch {
    return { ok: false, data: null };
  }
}

async function syncStateToCloud(key, data) {
  if (isLocalFileMode()) {
    return false;
  }

  try {
    const response = await fetchWithTimeout(CLOUD_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key, data }),
    }, CLOUD_TIMEOUT_MS);

    const ok = response.ok;
    if (!ok) {
      showCloudSyncWarning();
    }
    return ok;
  } catch {
    showCloudSyncWarning();
    return false;
  }
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function showCloudSyncWarning() {
  if (state.cloudWarningShown) {
    return;
  }

  state.cloudWarningShown = true;
  alert(
    "No se pudo sincronizar con la nube en este momento. Los cambios quedaron guardados solo en este dispositivo por ahora."
  );
}

function renderHeroCarousel() {
  const slides = normalizeHeroSlides(state.heroSlides);

  if (!slides.length) {
    el.heroCarouselImage.removeAttribute("src");
    el.heroCarouselImage.alt = "Sin imagenes destacadas";
    el.heroDots.innerHTML = "";
    el.heroPrev.disabled = true;
    el.heroNext.disabled = true;
    return;
  }

  if (state.heroSlideIndex >= slides.length) {
    state.heroSlideIndex = 0;
  }
  if (state.heroSlideIndex < 0) {
    state.heroSlideIndex = slides.length - 1;
  }

  el.heroCarouselImage.src = slides[state.heroSlideIndex];
  el.heroCarouselImage.alt = `Producto destacado ${state.heroSlideIndex + 1}`;
  el.heroPrev.disabled = slides.length <= 1;
  el.heroNext.disabled = slides.length <= 1;

  el.heroDots.innerHTML = "";
  slides.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.className = "hero-dot";
    dot.type = "button";
    dot.dataset.heroIndex = String(index);
    dot.setAttribute("aria-label", `Ir a imagen ${index + 1}`);
    dot.classList.toggle("active", index === state.heroSlideIndex);
    el.heroDots.appendChild(dot);
  });
}

function setHeroSlide(nextIndex) {
  const slides = normalizeHeroSlides(state.heroSlides);
  if (!slides.length) {
    return;
  }

  state.heroSlideIndex = (nextIndex + slides.length) % slides.length;
  renderHeroCarousel();
}

function startHeroAutoplay() {
  stopHeroAutoplay();
  const slides = normalizeHeroSlides(state.heroSlides);
  if (slides.length <= 1) {
    return;
  }

  state.heroTimerId = window.setInterval(() => {
    setHeroSlide(state.heroSlideIndex + 1);
  }, 4200);
}

function stopHeroAutoplay() {
  if (state.heroTimerId) {
    window.clearInterval(state.heroTimerId);
    state.heroTimerId = null;
  }
}

function renderSectionChips() {
  el.sectionChips.innerHTML = "";

  SHOP_SECTIONS.forEach((section) => {
    const button = document.createElement("button");
    button.className = "chip";
    button.textContent = section;
    button.classList.toggle("active", section === state.activeSection);

    button.addEventListener("click", () => {
      state.activeSection = section;
      state.activeCategory = "Todas";
      renderSectionChips();
      renderCategoryChips();
      renderProducts();
    });

    el.sectionChips.appendChild(button);
  });
}

function getCategories() {
  const dynamic = [
    ...new Set(
      state.products
        .filter((p) => normalizeSection(p.section) === state.activeSection)
        .map((p) => p.category)
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));
  return ["Todas", ...dynamic];
}

function renderCategoryChips() {
  const categories = getCategories();

  if (!categories.includes(state.activeCategory)) {
    state.activeCategory = "Todas";
  }

  el.categoryChips.innerHTML = "";

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.className = "chip";
    button.textContent = category;
    button.classList.toggle("active", category === state.activeCategory);

    button.addEventListener("click", () => {
      state.activeCategory = category;
      renderProducts();
      renderCategoryChips();
    });

    el.categoryChips.appendChild(button);
  });
}

function renderProducts() {
  const bySection = state.products.filter(
    (product) => normalizeSection(product.section) === state.activeSection
  );

  const sourceProducts =
    state.activeCategory === "Todas"
      ? bySection
      : bySection.filter((product) => product.category === state.activeCategory);

  const grouped = sourceProducts.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {});

  el.productsSections.innerHTML = "";

  const categoryEntries = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0], "es"));

  if (!categoryEntries.length) {
    el.productsSections.innerHTML = `<p class=\"empty\">No hay productos para mostrar en ${state.activeSection}.</p>`;
    return;
  }

  categoryEntries.forEach(([category, products]) => {
    const block = document.createElement("section");
    block.className = "category-block";

    const title = document.createElement("h3");
    title.textContent = category;

    const grid = document.createElement("div");
    grid.className = "products-grid";

    products.forEach((product) => {
      grid.appendChild(buildProductCard(product));
    });

    block.appendChild(title);
    block.appendChild(grid);
    el.productsSections.appendChild(block);
  });
}

function buildProductCard(product) {
  const fragment = el.productCardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".product-card");
  const image = fragment.querySelector(".product-image");
  const prevButton = fragment.querySelector(".product-prev");
  const nextButton = fragment.querySelector(".product-next");
  const controls = fragment.querySelector(".image-controls");
  const title = fragment.querySelector(".product-title");
  const desc = fragment.querySelector(".product-desc");
  const price = fragment.querySelector(".product-price");
  const addButton = fragment.querySelector(".btn-add");

  const selectedImageIndex = state.imageIndexByProduct[product.id] || 0;
  const validIndex = Math.min(selectedImageIndex, product.images.length - 1);

  image.src = product.images[validIndex] || "";
  image.alt = product.name;
  title.textContent = product.name;
  desc.textContent = product.description;
  price.textContent = formatCurrency(product.price);

  addButton.dataset.productId = product.id;

  prevButton.dataset.productId = product.id;
  nextButton.dataset.productId = product.id;

  const hasMultipleImages = product.images.length > 1;
  prevButton.classList.toggle("hidden", !hasMultipleImages);
  nextButton.classList.toggle("hidden", !hasMultipleImages);

  controls.innerHTML = "";
  if (hasMultipleImages) {
    product.images.forEach((_, index) => {
      const dot = document.createElement("button");
      dot.className = "dot";
      dot.type = "button";
      dot.dataset.productId = product.id;
      dot.dataset.imageIndex = String(index);
      dot.classList.toggle("active", index === validIndex);
      dot.setAttribute("aria-label", `Ver foto ${index + 1} de ${product.name}`);
      controls.appendChild(dot);
    });
  }

  return card;
}

function moveProductImage(productId, delta) {
  if (!productId) {
    return;
  }

  const product = state.products.find((item) => item.id === productId);
  if (!product || !Array.isArray(product.images) || product.images.length <= 1) {
    return;
  }

  const currentIndex = Number(state.imageIndexByProduct[productId] || 0);
  const nextIndex = (currentIndex + delta + product.images.length) % product.images.length;
  state.imageIndexByProduct[productId] = nextIndex;
  renderProducts();
}

function renderCart() {
  const entries = Object.entries(state.cart)
    .map(([productId, quantity]) => {
      const product = state.products.find((item) => item.id === productId);
      if (!product) {
        return null;
      }
      return { product, quantity };
    })
    .filter(Boolean);

  const totalItems = entries.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = entries.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  el.cartCountBadge.textContent = String(totalItems);
  el.cartToggleCount.textContent = String(totalItems);
  el.cartTotal.textContent = formatCurrency(totalAmount);

  if (!entries.length) {
    el.cartItems.innerHTML = "<p class=\"empty\">Tu carrito esta vacio.</p>";
    return;
  }

  el.cartItems.innerHTML = "";

  entries.forEach(({ product, quantity }) => {
    const item = document.createElement("article");
    item.className = "cart-item";

    item.innerHTML = `
      <div class="cart-item-head">
        <p class="cart-item-name">${escapeHtml(product.name)}</p>
        <strong>${formatCurrency(product.price * quantity)}</strong>
      </div>
      <p class="cart-item-sub">${formatCurrency(product.price)} c/u</p>
      <div class="qty-controls">
        <button class="qty-btn" data-dec-id="${product.id}" type="button">-</button>
        <span>${quantity}</span>
        <button class="qty-btn" data-inc-id="${product.id}" type="button">+</button>
        <button class="remove-link" data-remove-id="${product.id}" type="button">Quitar</button>
      </div>
    `;

    el.cartItems.appendChild(item);
  });
}

function renderAdminProducts() {
  if (!state.products.length) {
    el.adminProductList.innerHTML = "<p class=\"empty\">No hay productos cargados.</p>";
    return;
  }

  const sorted = [...state.products].sort((a, b) => {
    const bySection = normalizeSection(a.section).localeCompare(normalizeSection(b.section), "es");
    if (bySection !== 0) {
      return bySection;
    }
    return a.category.localeCompare(b.category, "es");
  });
  el.adminProductList.innerHTML = "";

  sorted.forEach((product) => {
    const row = document.createElement("article");
    row.className = "admin-product-item";

    const imageSrc = product.images[0] || "";
    row.innerHTML = `
      <img src="${imageSrc}" alt="${escapeHtml(product.name)}" />
      <div>
        <h4>${escapeHtml(product.name)}</h4>
        <p>${escapeHtml(normalizeSection(product.section))} · ${escapeHtml(product.category)} · ${formatCurrency(product.price)} · ${product.images.length} foto(s)</p>
      </div>
      <button class="delete-btn" data-delete-id="${product.id}" type="button">Eliminar</button>
    `;

    el.adminProductList.appendChild(row);
  });
}

function handleCheckout() {
  const cleanNumber = sanitizeWaNumber(state.waNumber || el.waNumber.value);
  if (!cleanNumber) {
    switchView("admin");
    alert("Primero guarda un numero de WhatsApp en Admin.");
    return;
  }

  const entries = Object.entries(state.cart)
    .map(([productId, quantity]) => {
      const product = state.products.find((item) => item.id === productId);
      if (!product) {
        return null;
      }
      return { product, quantity };
    })
    .filter(Boolean);

  if (!entries.length) {
    alert("Agrega al menos un producto al carrito.");
    return;
  }

  const total = entries.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const lines = entries.map(
    (item) =>
      `- ${item.product.name} x${item.quantity} = ${formatCurrency(item.product.price * item.quantity)}`
  );

  const message = [
    "Hola queria realizar la compra de los siguientes productos:",
    "",
    ...lines,
    "",
    `Total: ${formatCurrency(total)}`,
  ].join("\n");

  const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function changeQty(productId, delta) {
  if (!productId) {
    return;
  }

  const current = Number(state.cart[productId] || 0);
  const next = current + delta;

  if (next <= 0) {
    delete state.cart[productId];
  } else {
    state.cart[productId] = next;
  }

  persistCart();
  renderCart();
}

function removeFromCart(productId) {
  delete state.cart[productId];
  persistCart();
  renderCart();
}

function persistProducts() {
  return safeSetStorage(
    STORAGE_KEYS.products,
    JSON.stringify(state.products),
    "No se pudieron guardar los productos. Prueba con menos fotos o fotos mas livianas."
  );
}

function persistCart() {
  return safeSetStorage(STORAGE_KEYS.cart, JSON.stringify(state.cart));
}

function persistHeroSlides() {
  return safeSetStorage(
    STORAGE_KEYS.heroSlides,
    JSON.stringify(state.heroSlides),
    "No se pudo guardar el carrusel. Intenta con menos imagenes o menor peso."
  );
}

function safeSetStorage(key, value, errorMessage = "No se pudieron guardar datos en este dispositivo.") {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    alert(errorMessage);
    return false;
  }
}

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function sanitizeWaNumber(number) {
  return String(number || "").replace(/\D/g, "");
}

function formatCategory(category) {
  const clean = category.trim().toLowerCase();
  if (!clean) {
    return "Sin categoria";
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function normalizeSection(section) {
  const clean = String(section || "").trim().toLowerCase();
  if (clean === "insumos") {
    return "Insumos";
  }
  if (clean === "impresoras") {
    return "Impresoras";
  }
  return "Productos";
}

function getSubsectionsBySection(section) {
  const normalizedSection = normalizeSection(section);
  const options = SECTION_SUBSECTIONS[normalizedSection];
  if (!Array.isArray(options)) {
    return [];
  }
  return options;
}

function populateAdminSubsections(section, preferredSubsection = "") {
  const subsectionOptions = getSubsectionsBySection(section);
  const preferredClean = String(preferredSubsection || "").trim().toLowerCase();
  let selectedValue = "";

  el.productCategory.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Selecciona una subseccion";
  placeholder.disabled = true;
  placeholder.selected = true;
  el.productCategory.appendChild(placeholder);

  subsectionOptions.forEach((subsection) => {
    const option = document.createElement("option");
    option.value = subsection;
    option.textContent = subsection;

    if (preferredClean && subsection.toLowerCase() === preferredClean) {
      selectedValue = subsection;
    }

    el.productCategory.appendChild(option);
  });

  if (selectedValue) {
    el.productCategory.value = selectedValue;
  }
}

function normalizeSubsection(section, subsection) {
  const options = getSubsectionsBySection(section);
  const clean = String(subsection || "").trim().toLowerCase();
  const match = options.find((option) => option.toLowerCase() === clean);
  if (match) {
    return match;
  }
  return formatCategory(subsection);
}

function normalizeProduct(product) {
  const normalizedSection = normalizeSection(product.section);
  return {
    ...product,
    section: normalizedSection,
    category: normalizeSubsection(normalizedSection, product.category),
  };
}

function normalizeHeroSlides(slides) {
  if (!Array.isArray(slides)) {
    return [];
  }

  return slides
    .filter((slide) => typeof slide === "string")
    .map((slide) => slide.trim())
    .filter((slide) => slide.length > 0);
}

function buildDefaultHeroSlides(products) {
  const fromProducts = products
    .flatMap((product) => (Array.isArray(product.images) ? product.images : []))
    .filter((image) => typeof image === "string" && image.trim())
    .slice(0, 6);

  return normalizeHeroSlides(fromProducts);
}

function createId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function setProductSubmitLoading(isLoading) {
  el.publishProductBtn.disabled = isLoading;
  el.publishProductBtn.textContent = isLoading ? "Publicando..." : "Publicar producto";
}

function renderProductImageCount() {
  const total = state.pendingProductFiles.length;
  el.productImageCount.textContent = `${total} foto(s) seleccionada(s)`;
}

function setHeroSubmitLoading(isLoading) {
  el.saveHeroImagesBtn.disabled = isLoading;
  el.saveHeroImagesBtn.textContent = isLoading ? "Guardando..." : "Guardar carrusel";
}

function renderLocalImagePreview(fileList, container) {
  const files = Array.from(fileList || []);
  container.innerHTML = "";

  if (!files.length) {
    return;
  }

  files.slice(0, 8).forEach((file) => {
    const img = document.createElement("img");
    img.className = "image-preview-thumb";
    img.alt = file.name || "Vista previa";
    img.src = URL.createObjectURL(file);
    img.addEventListener("load", () => {
      URL.revokeObjectURL(img.src);
    });
    container.appendChild(img);
  });

  if (files.length > 8) {
    const more = document.createElement("span");
    more.className = "image-preview-more";
    more.textContent = `+${files.length - 8} mas`;
    container.appendChild(more);
  }
}

function mergeUniqueFiles(current, incoming) {
  const list = [...current];
  const seen = new Set(list.map((file) => `${file.name}_${file.size}_${file.lastModified}`));

  incoming.forEach((file) => {
    const signature = `${file.name}_${file.size}_${file.lastModified}`;
    if (seen.has(signature)) {
      return;
    }

    seen.add(signature);
    list.push(file);
  });

  return list;
}

async function processImageFile(file, config) {
  const dataUrl = await readFileAsDataURL(file);
  return resizeImageDataUrl(dataUrl, config);
}

function resizeImageDataUrl(dataUrl, { maxWidth, maxHeight, quality }) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const { width, height } = fitInside(image.width, image.height, maxWidth, maxHeight);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("No se pudo preparar la imagen"));
        return;
      }

      ctx.drawImage(image, 0, 0, width, height);
      const optimized = canvas.toDataURL("image/jpeg", quality);
      resolve(optimized);
    };
    image.onerror = () => reject(new Error("No se pudo procesar la imagen"));
    image.src = dataUrl;
  });
}

function fitInside(width, height, maxWidth, maxHeight) {
  if (!width || !height) {
    return { width: maxWidth, height: maxHeight };
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer una imagen"));
    reader.readAsDataURL(file);
  });
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
