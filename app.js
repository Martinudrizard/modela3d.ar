const STORAGE_KEYS = {
  products: "modela3d_products_v1",
  cart: "modela3d_cart_v1",
  waNumber: "modela3d_wa_number_v1",
  heroSlides: "modela3d_hero_slides_v1",
  adminSessionKey: "modela3d_admin_session_key_v1",
};

const CLOUD_ENDPOINT = "/.netlify/functions/store";
const CLOUD_KEYS = {
  products: "products",
  heroSlides: "heroSlides",
  waNumber: "waNumber",
};
const CLOUD_PRODUCT_MUTATION_KEY = "__products_mutation";

const CLOUD_TIMEOUT_MS = 90000;
const HERO_MAX_IMAGES = 6;

const IMAGE_UPLOAD_CONFIG = {
  product: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.72,
  },
  hero: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.72,
  },
};

const SHOP_SECTIONS = ["Productos", "Insumos", "Impresoras 3D"];
const PRODUCT_SUBSECTIONS = ["Llaveros", "Jarras", "Hogar", "Soportes"];
const INSUMO_SUBSECTIONS = ["Filamento", "Resina", "Repuesto", "Accesorio"];
const IMPRESORAS_SUBSECTIONS = ["Impresora 3D"];
const JARRA_SIZES = ["500ml", "1 litro"];

const SECTION_SUBSECTIONS = {
  Productos: PRODUCT_SUBSECTIONS,
  Insumos: INSUMO_SUBSECTIONS,
  "Impresoras 3D": IMPRESORAS_SUBSECTIONS,
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
    name: "Jarra Personalizada 500ml",
    section: "Productos",
    category: "Jarras",
    description: "Jarra personalizada con acabado resistente y gran detalle.",
    price: 16500,
    images: [
      "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    id: createId(),
    name: "Maceta Geometrica Mini",
    section: "Productos",
    category: "Hogar",
    description: "Ideal para suculentas. Base estable y diseno moderno.",
    price: 5800,
    images: [
      "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    id: createId(),
    name: "Soporte de Celular Articulado",
    section: "Productos",
    category: "Soportes",
    description: "Soporte firme y plegable para escritorio o mesa de luz.",
    price: 9200,
    images: [
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    id: createId(),
    name: "Filamento PLA Recarga 1kg",
    section: "Insumos",
    category: "Filamento",
    description: "Recarga PLA 1.75mm para impresion cotidiana con excelente terminacion.",
    price: 21900,
    brand: "Hellbot",
    material: "PLA",
    insumoType: "Filamento",
    images: [
      "https://images.unsplash.com/photo-1610147594469-fda5f31e38dd?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    id: createId(),
    name: "Resina UV Gris 1kg",
    section: "Insumos",
    category: "Resina",
    description: "Resina para impresoras UV con curado rapido y gran definicion.",
    price: 28900,
    brand: "Anycubic",
    material: "Resina",
    insumoType: "Resina",
    images: [
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    id: createId(),
    name: "Impresora 3D FDM Pro 220",
    section: "Impresoras 3D",
    category: "FDM",
    description: "Impresora 3D lista para taller con volumen 220x220x250 mm.",
    price: 489000,
    images: [
      "https://images.unsplash.com/photo-1581091215367-59ab6dcefef0?auto=format&fit=crop&w=900&q=80",
    ],
  },
];

const state = {
  products: loadFromStorage(STORAGE_KEYS.products, []),
  cart: loadFromStorage(STORAGE_KEYS.cart, {}),
  activeView: "shop",
  activeSection: "Productos",
  activeCategory: "Llaveros",
  activeJarraSize: "Todas",
  insumosFilters: {
    query: "",
    sort: "relevancia",
    brands: [],
    materials: [],
  },
  imageIndexByProduct: {},
  heroSlides: loadFromStorage(STORAGE_KEYS.heroSlides, []),
  heroSlideIndex: 0,
  heroTimerId: null,
  pendingProductFiles: [],
  pendingHeroFiles: [],
  editingProductId: "",
  waNumber: localStorage.getItem(STORAGE_KEYS.waNumber) || "",
  adminKey: sessionStorage.getItem(STORAGE_KEYS.adminSessionKey) || "",
  adminUnlocked: Boolean(sessionStorage.getItem(STORAGE_KEYS.adminSessionKey)),
  logoTapCount: 0,
  logoTapTimerId: null,
  cloudWarningShown: false,
  productImageById: {},
  productImageFetchInFlight: {},
  lightbox: {
    images: [],
    index: 0,
    label: "",
    open: false,
  },
  catalogMenuOpen: false,
  catalogDrawerMode: "root",
  catalogDrawerSection: "",
  toastTimerById: {},
};

const el = {
  viewButtons: Array.from(document.querySelectorAll(".view-btn[data-view]")),
  adminViewButton: document.querySelector('.view-btn[data-view="admin"]'),
  brandLogo: document.getElementById("brand-logo"),
  views: {
    shop: document.getElementById("shop-view"),
    admin: document.getElementById("admin-view"),
  },
  catalogMenuToggle: document.getElementById("catalog-menu-toggle"),
  catalogMenuBack: document.getElementById("catalog-menu-back"),
  catalogMenuTitle: document.getElementById("catalog-menu-title"),
  catalogMenuClose: document.getElementById("catalog-menu-close"),
  catalogMenuBackdrop: document.getElementById("catalog-menu-backdrop"),
  catalogMenuPanel: document.getElementById("catalog-menu-panel"),
  catalogMenuSummary: document.getElementById("catalog-menu-summary"),
  catalogDrawerList: document.getElementById("catalog-drawer-list"),
  sectionChips: document.getElementById("section-chips"),
  productSubsectionFilter: document.getElementById("product-subsection-filter"),
  productSubsectionTitle: document.getElementById("product-subsection-title"),
  productSubsectionChips: document.getElementById("product-subsection-chips"),
  jarraSizeFilter: document.getElementById("jarra-size-filter"),
  jarraSizeChips: document.getElementById("jarra-size-chips"),
  insumosShell: document.getElementById("insumos-shell"),
  insumosResultsGrid: document.getElementById("insumos-results-grid"),
  insumosSearch: document.getElementById("insumos-search"),
  insumosSort: document.getElementById("insumos-sort"),
  insumosCount: document.getElementById("insumos-count"),
  insumosBrandFilters: document.getElementById("insumos-brand-filters"),
  insumosMaterialFilters: document.getElementById("insumos-material-filters"),
  productsSections: document.getElementById("products-sections"),
  productCardTemplate: document.getElementById("product-card-template"),
  heroCarouselImage: document.getElementById("hero-carousel-image"),
  heroPrev: document.getElementById("hero-prev"),
  heroNext: document.getElementById("hero-next"),
  heroDots: document.getElementById("hero-dots"),
  heroMedia: document.querySelector(".hero-media"),
  lightbox: document.getElementById("image-lightbox"),
  lightboxClose: document.getElementById("lightbox-close"),
  lightboxPrev: document.getElementById("lightbox-prev"),
  lightboxNext: document.getElementById("lightbox-next"),
  lightboxImage: document.getElementById("lightbox-image"),
  lightboxCounter: document.getElementById("lightbox-counter"),
  toastStack: document.getElementById("toast-stack"),
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
  productName: document.getElementById("product-name"),
  productSection: document.getElementById("product-section"),
  productCategory: document.getElementById("product-category"),
  productDescription: document.getElementById("product-description"),
  productPrice: document.getElementById("product-price"),
  jarraExtraFields: document.getElementById("jarra-extra-fields"),
  jarraSize: document.getElementById("jarra-size"),
  insumoExtraFields: document.getElementById("insumo-extra-fields"),
  insumoBrand: document.getElementById("insumo-brand"),
  insumoMaterial: document.getElementById("insumo-material"),
  productImagesInput: document.getElementById("product-images"),
  productPasteTarget: document.getElementById("product-paste-target"),
  productImagePreview: document.getElementById("product-image-preview"),
  productImageCount: document.getElementById("product-image-count"),
  clearProductImagesBtn: document.getElementById("clear-product-images"),
  publishProductBtn: document.getElementById("publish-product-btn"),
  cancelEditProductBtn: document.getElementById("cancel-edit-product"),
  heroImagesInput: document.getElementById("hero-images"),
  heroPasteTarget: document.getElementById("hero-paste-target"),
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
  toggleJarraExtraFields(normalizeSection(el.productSection.value) === "Productos" && el.productCategory.value === "Jarras");
  toggleInsumoExtraFields(normalizeSection(el.productSection.value) === "Insumos");
  toggleProductPriceMode(normalizeSection(el.productSection.value));
  renderProductImageCount();
  updateProductFormMode();
  updateAdminVisibility();
  setCartOpen(false);

  bindEvents();
  setCatalogMenuOpen(false, true);
  renderAll();

  await hydrateFromCloud();
}

function bindEvents() {
  el.viewButtons.forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  el.brandLogo.addEventListener("click", () => {
    scrollToHeader();
    handleHiddenAdminTap();
  });

  el.catalogMenuToggle?.addEventListener("click", () => {
    if (state.activeView !== "shop") {
      switchView("shop");
    }
    setCatalogMenuOpen(!state.catalogMenuOpen);
  });

  el.catalogMenuClose?.addEventListener("click", () => {
    setCatalogMenuOpen(false);
  });

  el.catalogMenuBack?.addEventListener("click", () => {
    navigateCatalogDrawerBack();
  });

  el.catalogMenuBackdrop?.addEventListener("click", () => {
    setCatalogMenuOpen(false);
  });

  el.catalogDrawerList?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest("button[data-menu-action]");
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const action = button.dataset.menuAction;
    if (action === "section") {
      handleCatalogSectionSelection(button.dataset.section);
      return;
    }

    if (action === "subsection") {
      handleCatalogSubsectionSelection(button.dataset.subsection);
      return;
    }

    if (action === "jarra-size") {
      handleCatalogJarraSizeSelection(button.dataset.jarraSize);
      return;
    }

    if (action === "quote") {
      handleCatalogQuoteRequest();
    }
  });

  window.addEventListener("resize", () => {
    setCatalogMenuOpen(state.catalogMenuOpen, true);
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

  el.heroCarouselImage.addEventListener("click", () => {
    if (!isMobileViewport()) {
      return;
    }

    openImageLightbox(state.heroSlides, state.heroSlideIndex, "Producto destacado");
  });

  el.lightbox.addEventListener("click", (event) => {
    if (event.target === el.lightbox) {
      closeImageLightbox();
    }
  });

  el.lightboxClose.addEventListener("click", closeImageLightbox);
  el.lightboxPrev.addEventListener("click", () => stepLightbox(-1));
  el.lightboxNext.addEventListener("click", () => stepLightbox(1));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.catalogMenuOpen) {
      if (state.catalogDrawerMode !== "root") {
        navigateCatalogDrawerBack();
      } else {
        setCatalogMenuOpen(false);
      }
      return;
    }

    if (!state.lightbox.open) {
      return;
    }

    if (event.key === "Escape") {
      closeImageLightbox();
      return;
    }

    if (event.key === "ArrowLeft") {
      stepLightbox(-1);
      return;
    }

    if (event.key === "ArrowRight") {
      stepLightbox(1);
    }
  });

  el.productSection.addEventListener("change", () => {
    const normalizedSection = normalizeSection(el.productSection.value);
    populateAdminSubsections(normalizedSection);
    toggleInsumoExtraFields(normalizedSection === "Insumos");
    toggleJarraExtraFields(normalizedSection === "Productos" && el.productCategory.value === "Jarras");
    toggleProductPriceMode(normalizedSection);
  });

  el.productCategory.addEventListener("change", () => {
    const normalizedSection = normalizeSection(el.productSection.value);
    toggleJarraExtraFields(normalizedSection === "Productos" && el.productCategory.value === "Jarras");
  });

  el.insumosSearch.addEventListener("input", () => {
    state.insumosFilters.query = String(el.insumosSearch.value || "").trim();
    renderProducts();
  });

  el.insumosSort.addEventListener("change", () => {
    state.insumosFilters.sort = el.insumosSort.value || "relevancia";
    renderProducts();
  });

  el.insumosBrandFilters.addEventListener("change", handleInsumosCheckboxFilters);
  el.insumosMaterialFilters.addEventListener("change", handleInsumosCheckboxFilters);

  el.productImagesInput.addEventListener("change", () => {
    addProductFiles(Array.from(el.productImagesInput.files || []));
    el.productImagesInput.value = "";
  });

  el.productPasteTarget.addEventListener("paste", (event) => {
    handlePasteUpload(event, "product");
  });

  el.clearProductImagesBtn.addEventListener("click", () => {
    state.pendingProductFiles = [];
    el.productImagesInput.value = "";
    el.productImagePreview.innerHTML = "";
    renderProductImageCount();
  });

  el.cancelEditProductBtn.addEventListener("click", () => {
    resetProductForm();
  });

  el.heroImagesInput.addEventListener("change", () => {
    addHeroFiles(Array.from(el.heroImagesInput.files || []));
    el.heroImagesInput.value = "";
  });

  el.heroPasteTarget.addEventListener("paste", (event) => {
    handlePasteUpload(event, "hero");
  });

  el.saveWaBtn.addEventListener("click", async () => {
    if (!ensureAdminAccess()) {
      return;
    }

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

    if (!ensureAdminAccess()) {
      return;
    }

    const formData = new FormData(el.productForm);
    const editingProductId = state.editingProductId;
    const editingProduct = editingProductId
      ? state.products.find((product) => product.id === editingProductId)
      : null;

    if (editingProductId && !editingProduct) {
      alert("No encontramos el producto a editar. Intenta nuevamente.");
      resetProductForm();
      return;
    }

    const name = String(formData.get("product-name") || "").trim();
    const section = normalizeSection(String(formData.get("product-section") || ""));
    const category = String(formData.get("product-category") || "").trim();
    const description = String(formData.get("product-description") || "").trim();
    const priceValue = Number(formData.get("product-price"));
    const isPrinterSection = section === "Impresoras 3D";
    const jarraSize = String(formData.get("jarra-size") || "").trim();
    const brand = String(formData.get("insumo-brand") || "").trim();
    const material = String(formData.get("insumo-material") || "").trim();

    const files = [...state.pendingProductFiles];

    if (!name || !section || !category || !description) {
      alert("Completa nombre, seccion, categoria, descripcion y precio correctamente.");
      return;
    }

    if (!isPrinterSection && (!Number.isFinite(priceValue) || priceValue <= 0)) {
      alert("Completa nombre, seccion, categoria, descripcion y precio correctamente.");
      return;
    }

    if (!editingProduct && !files.length) {
      alert("Subi al menos una foto.");
      return;
    }

    setProductSubmitLoading(true);

    try {
      const normalizedCategory = normalizeSubsection(section, category);
      let images = editingProduct?.images || [];

      if (files.length) {
        images = await Promise.all(
          files.map((file) =>
            processImageFile(file, {
              maxWidth: IMAGE_UPLOAD_CONFIG.product.maxWidth,
              maxHeight: IMAGE_UPLOAD_CONFIG.product.maxHeight,
              quality: IMAGE_UPLOAD_CONFIG.product.quality,
            })
          )
        );
      }

      const product = {
        id: editingProduct?.id || createId(),
        name,
        section,
        category: normalizedCategory,
        jarraSize: section === "Productos" && normalizedCategory === "Jarras" ? normalizeJarraSize(jarraSize) : "",
        description,
        price: isPrinterSection ? 0 : Math.round(priceValue),
        images,
        brand: section === "Insumos" ? brand : "",
        material: section === "Insumos" ? material : "",
        insumoType: section === "Insumos" ? normalizeInsumoType(category) : "",
      };

      state.activeSection = section;
      state.activeCategory = product.category;
      state.activeJarraSize = product.category === "Jarras" ? product.jarraSize || "Todas" : "Todas";
      const previousProducts = [...state.products];

      if (editingProduct) {
        state.products = state.products.map((item) => (item.id === editingProduct.id ? product : item));
      } else {
        state.products.unshift(product);
      }

      const cloudSaved = await upsertProductInCloud(product);
      if (!cloudSaved) {
        state.products = previousProducts;
        renderAll();
        if (state.adminUnlocked && state.adminKey) {
          alert("No se pudo guardar el producto en la base de datos. Revisa la conexion e intenta de nuevo.");
        }
        return;
      }

      persistProducts();

      resetProductForm();
      renderAll();
      switchView("shop");
    } catch {
      alert("No se pudieron procesar o sincronizar las imagenes. Intenta con fotos mas livianas.");
    } finally {
      setProductSubmitLoading(false);
    }
  });

  el.saveHeroImagesBtn.addEventListener("click", async () => {
    if (!ensureAdminAccess()) {
      return;
    }

    const files = [...state.pendingHeroFiles];
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
      state.pendingHeroFiles = [];
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
    if (!ensureAdminAccess()) {
      return;
    }

    const [productsOk, heroOk, waOk] = await Promise.all([
      replaceProductsInCloud(state.products),
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

  el.resetDemoBtn.addEventListener("click", async () => {
    const accepted = confirm("Esto reemplazara tus productos actuales por productos demo. Deseas continuar?");
    if (!accepted) {
      return;
    }

    const previousProducts = [...state.products];
    state.products = [...DEMO_PRODUCTS.map((product) => ({ ...product, id: createId() }))];
    const cloudSaved = await replaceProductsInCloud(state.products);
    if (!cloudSaved) {
      state.products = previousProducts;
      renderAll();
      if (state.adminUnlocked && state.adminKey) {
        alert("No se pudo restaurar demo en la base de datos.");
      }
      return;
    }

    persistProducts();
    renderAll();
  });

  el.adminProductList.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.matches("[data-delete-id]")) {
      const productId = target.dataset.deleteId;
      if (state.editingProductId && state.editingProductId === productId) {
        resetProductForm();
      }
      const previousProducts = [...state.products];
      state.products = state.products.filter((product) => product.id !== productId);

      // Limpia productos borrados del carrito para evitar referencias invalidas.
      Object.keys(state.cart).forEach((id) => {
        if (!state.products.some((product) => product.id === id)) {
          delete state.cart[id];
        }
      });

      const cloudSaved = await deleteProductInCloud(productId);
      if (!cloudSaved) {
        state.products = previousProducts;
        renderAll();
        if (state.adminUnlocked && state.adminKey) {
          alert("No se pudo eliminar en la base de datos. Intenta nuevamente.");
        }
        return;
      }

      persistProducts();
      persistCart();
      renderAll();
      return;
    }

    if (target.matches("[data-edit-id]")) {
      startProductEdit(target.dataset.editId);
    }
  });

  el.productsSections.addEventListener("click", (event) => {
    handleProductGridClick(event);
  });

  el.insumosResultsGrid.addEventListener("click", (event) => {
    handleProductGridClick(event);
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
  if (viewName === "admin" && !ensureAdminAccess()) {
    return;
  }

  state.activeView = viewName;

  el.viewButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });

  Object.entries(el.views).forEach(([name, view]) => {
    view.classList.toggle("active", name === viewName);
  });
}

function updateAdminVisibility() {
  if (!el.adminViewButton) {
    return;
  }

  el.adminViewButton.style.display = state.adminUnlocked ? "" : "none";
}

function handleHiddenAdminTap() {
  state.logoTapCount += 1;

  if (state.logoTapTimerId) {
    window.clearTimeout(state.logoTapTimerId);
  }

  state.logoTapTimerId = window.setTimeout(() => {
    state.logoTapCount = 0;
    state.logoTapTimerId = null;
  }, 1800);

  if (state.logoTapCount >= 5) {
    state.logoTapCount = 0;
    window.clearTimeout(state.logoTapTimerId);
    state.logoTapTimerId = null;
    void attemptAdminUnlock();
  }
}

function scrollToHeader() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

async function attemptAdminUnlock() {
  const typed = window.prompt("Acceso privado: ingresa clave Admin", "");
  if (!typed || !typed.trim()) {
    return;
  }

  state.adminKey = typed.trim();
  sessionStorage.setItem(STORAGE_KEYS.adminSessionKey, state.adminKey);

  const valid = await validateAdminKey();
  if (!valid) {
    clearAdminSession();
    alert("Clave invalida.");
    return;
  }

  state.adminUnlocked = true;
  updateAdminVisibility();
  switchView("admin");
}

async function validateAdminKey() {
  if (isLocalFileMode()) {
    return true;
  }

  if (!state.adminKey) {
    return false;
  }

  try {
    const response = await fetchWithTimeout(
      CLOUD_ENDPOINT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": state.adminKey,
        },
        body: JSON.stringify({ key: "__auth", data: true }),
      },
      CLOUD_TIMEOUT_MS
    );

    return response.ok;
  } catch {
    return false;
  }
}

function renderAll() {
  renderHeroCarousel();
  renderSectionChips();
  renderProductSubsectionChips();
  renderJarraSizeChips();
  renderInsumosFilterPanel();
  updateCatalogVisibility();
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
      const localById = new Map(
        state.products.map((product) => [String(product.id || "").trim(), product])
      );

      state.products = cloudProductsResult.data.map((rawProduct) => {
        const normalized = normalizeProduct(rawProduct);
        const local = localById.get(String(normalized.id || "").trim());
        const hasCloudImages = Array.isArray(normalized.images) && normalized.images.length > 0;
        const hasLocalImages = Array.isArray(local?.images) && local.images.length > 0;

        if (!hasCloudImages && hasLocalImages) {
          return {
            ...normalized,
            images: local.images,
          };
        }

        return normalized;
      });
      persistProducts();
    } else if (cloudProductsResult.data === null && state.products.length && state.adminKey) {
      await syncStateToCloud(CLOUD_KEYS.products, state.products);
    }
  }

  if (cloudHeroSlidesResult.ok) {
    if (Array.isArray(cloudHeroSlidesResult.data)) {
      state.heroSlides = normalizeHeroSlides(cloudHeroSlidesResult.data);
      persistHeroSlides();
    } else if (cloudHeroSlidesResult.data === null && state.heroSlides.length && state.adminKey) {
      await syncStateToCloud(CLOUD_KEYS.heroSlides, state.heroSlides);
    }
  }

  if (cloudWaNumberResult.ok) {
    if (typeof cloudWaNumberResult.data === "string") {
      state.waNumber = sanitizeWaNumber(cloudWaNumberResult.data);
      localStorage.setItem(STORAGE_KEYS.waNumber, state.waNumber);
      el.waNumber.value = state.waNumber;
    } else if (cloudWaNumberResult.data === null && state.waNumber && state.adminKey) {
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

  if (!state.adminKey) {
    showAdminAccessRequired();
    return false;
  }

  try {
    const response = await fetchWithTimeout(CLOUD_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": state.adminKey,
      },
      body: JSON.stringify({ key, data }),
    }, CLOUD_TIMEOUT_MS);

    const ok = response.ok;
    if (!ok) {
      if (response.status === 401) {
        clearAdminSession();
        showAdminAccessRequired();
        return false;
      }
      showCloudSyncWarning();
    }
    return ok;
  } catch {
    showCloudSyncWarning();
    return false;
  }
}

async function upsertProductInCloud(product) {
  return syncProductMutationToCloud({
    action: "upsert",
    product,
  });
}

async function deleteProductInCloud(productId) {
  return syncProductMutationToCloud({
    action: "delete",
    productId,
  });
}

async function replaceProductsInCloud(products) {
  const safeProducts = Array.isArray(products) ? products : [];
  const ids = safeProducts.map((product) => String(product.id || "").trim()).filter(Boolean);

  const setIdsOk = await syncProductMutationToCloud({
    action: "set-ids",
    productIds: ids,
  });

  if (!setIdsOk) {
    return false;
  }

  for (const product of safeProducts) {
    const ok = await upsertProductInCloud(product);
    if (!ok) {
      return false;
    }
  }

  return true;
}

async function syncProductMutationToCloud(data) {
  if (isLocalFileMode()) {
    return false;
  }

  if (!state.adminKey) {
    showAdminAccessRequired();
    return false;
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        CLOUD_ENDPOINT,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Key": state.adminKey,
          },
          body: JSON.stringify({ key: CLOUD_PRODUCT_MUTATION_KEY, data }),
        },
        CLOUD_TIMEOUT_MS
      );

      if (response.ok) {
        return true;
      }

      if (response.status === 401) {
        clearAdminSession();
        showAdminAccessRequired();
        return false;
      }

      if (response.status === 400 || response.status === 404 || response.status === 405) {
        const legacyOk = await syncStateToCloud(CLOUD_KEYS.products, state.products);
        if (legacyOk) {
          return true;
        }
      }
    } catch {
      // Reintenta una vez ante fallos transitorios de red.
    }
  }

  showCloudSyncWarning();
  return false;
}

function ensureAdminAccess() {
  if (state.adminUnlocked && state.adminKey) {
    return true;
  }

  showAdminAccessRequired();
  return false;
}

function clearAdminSession() {
  state.adminKey = "";
  state.adminUnlocked = false;
  sessionStorage.removeItem(STORAGE_KEYS.adminSessionKey);
  updateAdminVisibility();
}

function showAdminAccessRequired() {
  alert("Admin oculto: toca 5 veces el logo y luego ingresa la clave.");
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
      const subsectionOptions = getSubsectionsBySection(section);
      state.activeCategory = section === "Insumos" ? "Todas" : subsectionOptions[0] || "Todas";
      state.activeJarraSize = "Todas";
      renderSectionChips();
      renderProductSubsectionChips();
      renderJarraSizeChips();
      renderInsumosFilterPanel();
      updateCatalogVisibility();
      renderProducts();
      closeCatalogMenuAfterFilterSelect();
    });

    el.sectionChips.appendChild(button);
  });

  updateCatalogMenuSummary();
  renderCatalogDrawerMenu();
}

function renderProductSubsectionChips() {
  const isCategorySection = state.activeSection !== "Insumos";
  el.productSubsectionFilter.classList.toggle("hidden-block", !isCategorySection);

  if (!isCategorySection) {
    return;
  }

  el.productSubsectionTitle.textContent = state.activeSection;
  const subsectionOptions = getSubsectionsBySection(state.activeSection);

  if (!subsectionOptions.includes(state.activeCategory)) {
    state.activeCategory = subsectionOptions[0] || "Todas";
  }

  el.productSubsectionChips.innerHTML = "";
  subsectionOptions.forEach((subsection) => {
    const button = document.createElement("button");
    button.className = "chip";
    button.textContent = subsection;
    button.classList.toggle("active", subsection === state.activeCategory);
    button.addEventListener("click", () => {
      state.activeCategory = subsection;
      state.activeJarraSize = "Todas";
      renderProductSubsectionChips();
      renderJarraSizeChips();
      renderProducts();
      closeCatalogMenuAfterFilterSelect();
    });
    el.productSubsectionChips.appendChild(button);
  });

  updateCatalogMenuSummary();
  renderCatalogDrawerMenu();
}

function renderJarraSizeChips() {
  const show = state.activeSection === "Productos" && state.activeCategory === "Jarras";
  el.jarraSizeFilter.classList.toggle("hidden-block", !show);

  if (!show) {
    return;
  }

  const options = ["Todas", ...JARRA_SIZES];
  if (!options.includes(state.activeJarraSize)) {
    state.activeJarraSize = "Todas";
  }

  el.jarraSizeChips.innerHTML = "";
  options.forEach((size) => {
    const button = document.createElement("button");
    button.className = "chip";
    button.textContent = size === "500ml" ? "500 ml" : size;
    button.classList.toggle("active", size === state.activeJarraSize);
    button.addEventListener("click", () => {
      state.activeJarraSize = size;
      renderJarraSizeChips();
      renderProducts();
      closeCatalogMenuAfterFilterSelect();
    });
    el.jarraSizeChips.appendChild(button);
  });

  updateCatalogMenuSummary();
  renderCatalogDrawerMenu();
}

function updateCatalogVisibility() {
  const isInsumos = state.activeSection === "Insumos";
  el.productsSections.classList.toggle("hidden-block", isInsumos);
  el.insumosShell.classList.toggle("hidden-block", !isInsumos);
}

function renderProducts() {
  if (state.activeSection === "Insumos") {
    renderInsumosCatalog();
    return;
  }

  renderProductCatalog();
}

function renderProductCatalog() {
  let sourceProducts = state.products.filter(
    (product) => product.section === state.activeSection && product.category === state.activeCategory
  );

  if (state.activeCategory === "Jarras" && state.activeJarraSize !== "Todas") {
    sourceProducts = sourceProducts.filter((product) => normalizeJarraSize(product.jarraSize) === state.activeJarraSize);
  }

  el.productsSections.innerHTML = "";

  if (!sourceProducts.length) {
    el.productsSections.innerHTML = `<p class="empty">No hay productos para mostrar en ${state.activeCategory}.</p>`;
    return;
  }

  const block = document.createElement("section");
  block.className = "category-block";

  const title = document.createElement("h3");
  title.textContent = state.activeCategory;

  const grid = document.createElement("div");
  grid.className = "products-grid";

  sourceProducts.forEach((product) => {
    grid.appendChild(buildProductCard(product));
  });

  block.appendChild(title);
  block.appendChild(grid);
  el.productsSections.appendChild(block);
}

function renderInsumosCatalog() {
  const sourceProducts = getFilteredInsumosProducts();

  el.insumosResultsGrid.innerHTML = "";
  el.insumosCount.textContent = `${sourceProducts.length} producto(s)`;

  if (!sourceProducts.length) {
    el.insumosResultsGrid.innerHTML = '<p class="empty">No encontramos insumos con esos filtros.</p>';
    return;
  }

  const block = document.createElement("section");
  block.className = "category-block";

  const title = document.createElement("h3");
  title.textContent = "Insumos";

  const grid = document.createElement("div");
  grid.className = "products-grid";

  sourceProducts.forEach((product) => {
    grid.appendChild(buildProductCard(product));
  });

  block.appendChild(title);
  block.appendChild(grid);
  el.insumosResultsGrid.appendChild(block);
}

function buildProductCard(product) {
  const fragment = el.productCardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".product-card");
  const image = fragment.querySelector(".product-image");
  const prevButton = fragment.querySelector(".product-prev");
  const nextButton = fragment.querySelector(".product-next");
  const controls = fragment.querySelector(".image-controls");
  const sectionTag = fragment.querySelector(".product-tag-section");
  const categoryTag = fragment.querySelector(".product-tag-category");
  const title = fragment.querySelector(".product-title");
  const desc = fragment.querySelector(".product-desc");
  const price = fragment.querySelector(".product-price");
  const addButton = fragment.querySelector(".btn-add");

  const productImages = Array.isArray(product.images) ? product.images : [];
  const selectedImageIndex = state.imageIndexByProduct[product.id] || 0;
  const validIndex = Math.min(selectedImageIndex, Math.max(productImages.length - 1, 0));
  const resolvedImage = getRenderableProductImage(product, validIndex);

  image.src = resolvedImage || buildMissingImagePlaceholder(product.name);
  image.addEventListener("error", () => {
    image.src = buildMissingImagePlaceholder(product.name);
  });

  if (!resolvedImage) {
    void ensureProductImageLoaded(product.id);
  }

  image.alt = product.name;
  image.dataset.productId = product.id;
  image.dataset.imageIndex = String(validIndex);
  sectionTag.textContent = normalizeSection(product.section);
  categoryTag.textContent = product.category || "Catalogo";
  title.textContent = product.name;
  desc.textContent = product.description;
  const isPrinter = normalizeSection(product.section) === "Impresoras 3D";
  price.classList.remove("product-price-inquiry");
  if (isPrinter) {
    price.textContent = "Solicitar precio y promociones";
    price.classList.add("product-price-inquiry");
    addButton.textContent = "Consultar";
    addButton.dataset.productInquiry = "printer";
  } else {
    price.textContent = formatCurrency(product.price);
    addButton.textContent = "Agregar";
    delete addButton.dataset.productInquiry;
  }

  addButton.dataset.productId = product.id;

  prevButton.dataset.productId = product.id;
  nextButton.dataset.productId = product.id;

  const hasMultipleImages = productImages.length > 1;
  prevButton.classList.toggle("hidden", !hasMultipleImages);
  nextButton.classList.toggle("hidden", !hasMultipleImages);

  controls.innerHTML = "";
  if (hasMultipleImages) {
    productImages.forEach((_, index) => {
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

function getRenderableProductImage(product, index) {
  const productImages = Array.isArray(product?.images) ? product.images : [];
  const imageFromProduct = productImages[index] || productImages[0] || "";
  if (typeof imageFromProduct === "string" && imageFromProduct.trim()) {
    return imageFromProduct;
  }

  const cachedImage = state.productImageById[String(product?.id || "").trim()];
  if (typeof cachedImage === "string" && cachedImage.trim()) {
    return cachedImage;
  }

  return "";
}

async function ensureProductImageLoaded(productId) {
  const id = String(productId || "").trim();
  if (!id) {
    return;
  }

  if (Object.prototype.hasOwnProperty.call(state.productImageById, id)) {
    return;
  }

  if (state.productImageFetchInFlight[id]) {
    return;
  }

  state.productImageFetchInFlight[id] = true;
  try {
    const image = await fetchProductImageFromCloud(id);
    state.productImageById[id] = image || null;
    if (image) {
      const target = state.products.find((product) => product.id === id);
      if (target && (!Array.isArray(target.images) || !target.images.length)) {
        target.images = [image];
        persistProducts();
      }
    }
    renderProducts();
  } finally {
    delete state.productImageFetchInFlight[id];
  }
}

async function fetchProductImageFromCloud(productId) {
  if (isLocalFileMode()) {
    return "";
  }

  try {
    const response = await fetchWithTimeout(
      `${CLOUD_ENDPOINT}?key=productImage&id=${encodeURIComponent(productId)}`,
      {},
      CLOUD_TIMEOUT_MS
    );

    if (!response.ok) {
      return "";
    }

    const payload = await response.json();
    if (!payload?.ok || typeof payload.data !== "string") {
      return "";
    }

    return payload.data.trim();
  } catch {
    return "";
  }
}

function buildMissingImagePlaceholder(name) {
  const text = encodeURIComponent(String(name || "Producto"));
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'><rect width='800' height='800' fill='%23ececec'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23666' font-size='34' font-family='Arial, sans-serif'>${text}</text></svg>`;
}

function handleProductGridClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const clickedImage = target.closest(".product-image");
  if (clickedImage instanceof HTMLImageElement && isMobileViewport()) {
    const productId = String(clickedImage.dataset.productId || "").trim();
    const product = state.products.find((item) => item.id === productId);
    if (product) {
      const images = Array.isArray(product.images) ? product.images : [];
      const index = Number(clickedImage.dataset.imageIndex || 0);
      openImageLightbox(images, index, product.name);
      return;
    }
  }

  if (target.matches(".btn-add")) {
    const productId = target.dataset.productId;
    if (target.dataset.productInquiry === "printer") {
      const product = state.products.find((item) => item.id === productId);
      if (product) {
        const message = `Hola quiero solicitar precio y promociones de ${product.name}.`;
        const opened = openWhatsAppWithMessage(message);
        if (opened) {
          showToast("Te llevamos a WhatsApp para consultar esta impresora", "info");
        }
      }
      return;
    }

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
  }
}

function getInsumosSourceProducts() {
  return state.products.filter((product) => product.section === "Insumos");
}

function renderInsumosFilterPanel() {
  const products = getInsumosSourceProducts();
  const brands = uniqueSorted(products.map((p) => p.brand));
  const materials = uniqueSorted(products.map((p) => p.material));

  syncFilterSelectionsWithOptions(brands, materials);
  renderCheckboxGroup(el.insumosBrandFilters, "brand", brands, state.insumosFilters.brands);
  renderCheckboxGroup(el.insumosMaterialFilters, "material", materials, state.insumosFilters.materials);

  el.insumosSearch.value = state.insumosFilters.query;
  el.insumosSort.value = state.insumosFilters.sort;
}

function syncFilterSelectionsWithOptions(brands, materials) {
  state.insumosFilters.brands = state.insumosFilters.brands.filter((value) => brands.includes(value));
  state.insumosFilters.materials = state.insumosFilters.materials.filter((value) =>
    materials.includes(value)
  );
}

function renderCheckboxGroup(container, filterType, options, selectedValues) {
  container.innerHTML = "";

  if (!options.length) {
    container.innerHTML = '<p class="empty">Sin opciones</p>';
    return;
  }

  options.forEach((value) => {
    const label = document.createElement("label");
    label.className = "insumo-check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.filterType = filterType;
    input.value = value;
    input.checked = selectedValues.includes(value);

    const text = document.createElement("span");
    text.textContent = value;

    label.appendChild(input);
    label.appendChild(text);
    container.appendChild(label);
  });
}

function handleInsumosCheckboxFilters() {
  state.insumosFilters.brands = getCheckedValues(el.insumosBrandFilters);
  state.insumosFilters.materials = getCheckedValues(el.insumosMaterialFilters);
  renderProducts();
}

function getCheckedValues(container) {
  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map((input) =>
    String(input.value || "").trim()
  );
}

function getFilteredInsumosProducts() {
  const query = state.insumosFilters.query.toLowerCase();
  const byText = getInsumosSourceProducts().filter((product) => {
    if (!query) {
      return true;
    }

    const text = [product.name, product.description, product.brand, product.material, product.insumoType]
      .join(" ")
      .toLowerCase();
    return text.includes(query);
  });

  const byBrand =
    state.insumosFilters.brands.length > 0
      ? byText.filter((product) => state.insumosFilters.brands.includes(product.brand))
      : byText;

  const byMaterial =
    state.insumosFilters.materials.length > 0
      ? byBrand.filter((product) => state.insumosFilters.materials.includes(product.material))
      : byBrand;

  return sortInsumosProducts(byMaterial, state.insumosFilters.sort);
}

function sortInsumosProducts(products, sortKey) {
  const sorted = [...products];

  if (sortKey === "precio-asc") {
    sorted.sort((a, b) => a.price - b.price);
    return sorted;
  }

  if (sortKey === "precio-desc") {
    sorted.sort((a, b) => b.price - a.price);
    return sorted;
  }

  sorted.sort((a, b) => a.name.localeCompare(b.name, "es"));
  return sorted;
}

function uniqueSorted(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es")
  );
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
    const isPrinter = normalizeSection(product.section) === "Impresoras 3D";
    const priceLabel = isPrinter ? "Solicitar precio y promociones" : formatCurrency(product.price);
    row.innerHTML = `
      <img src="${imageSrc}" alt="${escapeHtml(product.name)}" />
      <div>
        <h4>${escapeHtml(product.name)}</h4>
        <p>${escapeHtml(normalizeSection(product.section))} · ${escapeHtml(product.category)} · ${escapeHtml(priceLabel)} · ${product.images.length} foto(s)</p>
      </div>
      <div class="admin-item-actions">
        <button class="edit-btn" data-edit-id="${product.id}" type="button">Editar</button>
        <button class="delete-btn" data-delete-id="${product.id}" type="button">Eliminar</button>
      </div>
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

function openWhatsAppWithMessage(message) {
  const cleanNumber = sanitizeWaNumber(state.waNumber || el.waNumber.value);
  if (!cleanNumber) {
    switchView("admin");
    alert("Primero guarda un numero de WhatsApp en Admin.");
    return false;
  }

  const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

function changeQty(productId, delta) {
  if (!productId) {
    return;
  }

  const product = state.products.find((item) => item.id === productId);
  if (!product) {
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

  if (delta > 0) {
    if (current === 0) {
      showToast(`${product.name} agregado al carrito`, "success");
    } else {
      showToast(`Se sumo otra unidad de ${product.name}`, "info");
    }
    return;
  }

  if (current > 0 && next <= 0) {
    showToast(`${product.name} eliminado del carrito`, "warning");
  }
}

function removeFromCart(productId) {
  const product = state.products.find((item) => item.id === productId);
  const hadProduct = Number(state.cart[productId] || 0) > 0;
  delete state.cart[productId];
  persistCart();
  renderCart();

  if (hadProduct && product) {
    showToast(`${product.name} eliminado del carrito`, "warning");
  }
}

function openImageLightbox(images, startIndex = 0, label = "") {
  const safeImages = Array.isArray(images)
    ? images.filter((image) => typeof image === "string" && image.trim())
    : [];

  if (!safeImages.length) {
    return;
  }

  const maxIndex = safeImages.length - 1;
  const normalizedIndex = Number.isFinite(startIndex)
    ? Math.max(0, Math.min(startIndex, maxIndex))
    : 0;

  state.lightbox.images = safeImages;
  state.lightbox.index = normalizedIndex;
  state.lightbox.label = String(label || "").trim();
  state.lightbox.open = true;

  renderLightboxFrame();
  el.lightbox.classList.add("open");
  el.lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeImageLightbox() {
  state.lightbox.open = false;
  el.lightbox.classList.remove("open");
  el.lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function stepLightbox(delta) {
  const images = state.lightbox.images;
  if (!Array.isArray(images) || images.length <= 1) {
    return;
  }

  const nextIndex = (state.lightbox.index + delta + images.length) % images.length;
  state.lightbox.index = nextIndex;
  renderLightboxFrame();
}

function renderLightboxFrame() {
  const images = state.lightbox.images;
  if (!Array.isArray(images) || !images.length) {
    return;
  }

  const current = images[state.lightbox.index] || images[0];
  el.lightboxImage.src = current;
  const label = state.lightbox.label || "Imagen";
  el.lightboxImage.alt = `${label} ampliada`;
  el.lightboxCounter.textContent = `${state.lightbox.index + 1} / ${images.length}`;

  const hasMany = images.length > 1;
  el.lightboxPrev.classList.toggle("hidden-block", !hasMany);
  el.lightboxNext.classList.toggle("hidden-block", !hasMany);
}

function showToast(message, type = "info") {
  if (!el.toastStack) {
    return;
  }

  const metaByType = {
    success: { icon: "✓", title: "Listo" },
    info: { icon: "i", title: "Actualizacion" },
    warning: { icon: "!", title: "Atencion" },
  };

  const meta = metaByType[type] || metaByType.info;

  const toast = document.createElement("article");
  const toastId = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  toast.className = `toast toast-${type}`;
  toast.dataset.toastId = toastId;

  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${meta.icon}</span>
    <div class="toast-body">
      <strong class="toast-title">${meta.title}</strong>
      <p>${escapeHtml(message)}</p>
    </div>
    <button type="button" class="toast-close" aria-label="Cerrar aviso">x</button>
  `;

  const closeButton = toast.querySelector(".toast-close");
  closeButton?.addEventListener("click", () => removeToast(toastId));

  el.toastStack.appendChild(toast);

  state.toastTimerById[toastId] = window.setTimeout(() => {
    removeToast(toastId);
  }, 2600);
}

function removeToast(toastId) {
  const node = el.toastStack.querySelector(`[data-toast-id="${toastId}"]`);
  if (!node) {
    return;
  }

  node.classList.add("toast-out");
  window.setTimeout(() => {
    node.remove();
  }, 180);

  const timerId = state.toastTimerById[toastId];
  if (timerId) {
    window.clearTimeout(timerId);
    delete state.toastTimerById[toastId];
  }
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function setCatalogMenuOpen(isOpen, force = false) {
  if (!el.catalogMenuPanel || !el.catalogMenuToggle) {
    return;
  }

  const shouldCollapse = isMobileViewport();
  state.catalogMenuOpen = shouldCollapse ? Boolean(isOpen) : true;

  if (shouldCollapse && state.catalogMenuOpen) {
    state.catalogDrawerMode = "root";
    state.catalogDrawerSection = "";
  }

  const isExpanded = state.catalogMenuOpen;
  el.catalogMenuPanel.classList.toggle("open", isExpanded);
  el.catalogMenuPanel.classList.toggle("collapsed", shouldCollapse && !isExpanded);
  el.catalogMenuToggle.classList.toggle("open", isExpanded);
  el.catalogMenuBackdrop?.classList.toggle("open", shouldCollapse && isExpanded);
  el.catalogMenuToggle.setAttribute("aria-expanded", String(isExpanded));
  el.catalogMenuToggle.hidden = !shouldCollapse;
  document.body.classList.toggle("catalog-menu-open", shouldCollapse && isExpanded);
  updateCatalogMenuSummary();
  renderCatalogDrawerMenu();
}

function closeCatalogMenuAfterFilterSelect() {
  if (!isMobileViewport()) {
    return;
  }

  setCatalogMenuOpen(false);
}

function updateCatalogMenuSummary() {
  if (!el.catalogMenuSummary) {
    return;
  }

  let summary = "Tienda";
  if (state.activeSection === "Insumos") {
    summary = "Tienda · Insumos";
  } else {
    summary = `Tienda · ${state.activeCategory}`;
    if (state.activeCategory === "Jarras" && state.activeJarraSize !== "Todas") {
      summary = `${summary} · ${state.activeJarraSize}`;
    }
  }

  el.catalogMenuSummary.textContent = summary;
}

function navigateCatalogDrawerBack() {
  if (state.catalogDrawerMode === "jarra-size") {
    state.catalogDrawerMode = "subsections";
    renderCatalogDrawerMenu();
    return;
  }

  if (state.catalogDrawerMode === "subsections") {
    state.catalogDrawerMode = "root";
    state.catalogDrawerSection = "";
    renderCatalogDrawerMenu();
    return;
  }

  setCatalogMenuOpen(false);
}

function handleCatalogSectionSelection(rawSection) {
  const section = normalizeSection(rawSection);
  state.activeSection = section;
  state.activeJarraSize = "Todas";
  state.catalogDrawerSection = section;

  if (section === "Insumos") {
    state.activeCategory = "Todas";
    renderSectionChips();
    renderProductSubsectionChips();
    renderJarraSizeChips();
    renderInsumosFilterPanel();
    updateCatalogVisibility();
    renderProducts();
    closeCatalogMenuAfterFilterSelect();
    return;
  }

  const subsectionOptions = getSubsectionsBySection(section);
  state.activeCategory = subsectionOptions[0] || "Todas";
  state.catalogDrawerMode = "subsections";
  renderSectionChips();
  renderProductSubsectionChips();
  renderJarraSizeChips();
  updateCatalogVisibility();
  renderProducts();
  renderCatalogDrawerMenu();
}

function handleCatalogSubsectionSelection(subsection) {
  const section = normalizeSection(state.catalogDrawerSection || state.activeSection);
  state.activeSection = section;
  state.activeCategory = subsection;
  state.activeJarraSize = "Todas";

  if (section === "Productos" && subsection === "Jarras") {
    state.catalogDrawerMode = "jarra-size";
    renderSectionChips();
    renderProductSubsectionChips();
    renderJarraSizeChips();
    updateCatalogVisibility();
    renderProducts();
    renderCatalogDrawerMenu();
    return;
  }

  renderSectionChips();
  renderProductSubsectionChips();
  renderJarraSizeChips();
  updateCatalogVisibility();
  renderProducts();
  closeCatalogMenuAfterFilterSelect();
}

function handleCatalogJarraSizeSelection(size) {
  state.activeSection = "Productos";
  state.activeCategory = "Jarras";
  state.activeJarraSize = size || "Todas";
  renderSectionChips();
  renderProductSubsectionChips();
  renderJarraSizeChips();
  updateCatalogVisibility();
  renderProducts();
  closeCatalogMenuAfterFilterSelect();
}

function renderCatalogDrawerMenu() {
  if (!el.catalogDrawerList || !el.catalogMenuTitle || !el.catalogMenuBack) {
    return;
  }

  const isMobile = isMobileViewport();
  el.catalogMenuBack.classList.toggle("hidden-block", !isMobile || state.catalogDrawerMode === "root");

  if (state.catalogDrawerMode === "root") {
    el.catalogMenuTitle.textContent = "Menu";
    el.catalogDrawerList.innerHTML = "";

    SHOP_SECTIONS.forEach((section) => {
      const row = buildCatalogDrawerRow(section, "section", { section });
      row.classList.toggle("active", state.activeSection === section);
      el.catalogDrawerList.appendChild(row);
    });

    const quoteRow = buildCatalogDrawerRow("Solicitar cotizacion", "quote", {}, false);
    quoteRow.classList.add("catalog-drawer-item-cta");
    el.catalogDrawerList.appendChild(quoteRow);
    return;
  }

  if (state.catalogDrawerMode === "subsections") {
    const section = normalizeSection(state.catalogDrawerSection || state.activeSection);
    el.catalogMenuTitle.textContent = section;
    el.catalogDrawerList.innerHTML = "";

    const subsectionOptions = getSubsectionsBySection(section);
    subsectionOptions.forEach((subsection) => {
      const row = buildCatalogDrawerRow(subsection, "subsection", { subsection });
      row.classList.toggle("active", state.activeSection === section && state.activeCategory === subsection);
      el.catalogDrawerList.appendChild(row);
    });
    return;
  }

  el.catalogMenuTitle.textContent = "Capacidad";
  el.catalogDrawerList.innerHTML = "";

  ["Todas", ...JARRA_SIZES].forEach((size) => {
    const label = size === "500ml" ? "500 ml" : size;
    const row = buildCatalogDrawerRow(label, "jarra-size", { jarraSize: size }, false);
    row.classList.toggle("active", state.activeJarraSize === size);
    el.catalogDrawerList.appendChild(row);
  });
}

function buildCatalogDrawerRow(label, action, data = {}, showChevron = true) {
  const button = document.createElement("button");
  button.className = "catalog-drawer-item";
  button.type = "button";
  button.dataset.menuAction = action;
  if (data.section) {
    button.dataset.section = data.section;
  }
  if (data.subsection) {
    button.dataset.subsection = data.subsection;
  }
  if (data.jarraSize) {
    button.dataset.jarraSize = data.jarraSize;
  }

  const text = document.createElement("span");
  text.className = "catalog-drawer-text";
  text.textContent = label;
  button.appendChild(text);

  if (showChevron) {
    const chevron = document.createElement("span");
    chevron.className = "catalog-drawer-chevron";
    chevron.textContent = "›";
    chevron.setAttribute("aria-hidden", "true");
    button.appendChild(chevron);
  }

  return button;
}

function handleCatalogQuoteRequest() {
  const opened = openWhatsAppWithMessage("Hola quiero solicitar una cotizacion sobre...");
  if (opened) {
    closeCatalogMenuAfterFilterSelect();
    showToast("Abrimos WhatsApp para tu cotizacion", "success");
  }
}

function persistProducts() {
  return safeSetStorage(
    STORAGE_KEYS.products,
    JSON.stringify(state.products),
    "",
    false
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

function safeSetStorage(key, value, errorMessage = "No se pudieron guardar datos en este dispositivo.", showAlert = true) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    if (showAlert && errorMessage) {
      alert(errorMessage);
    }
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

  if (clean === "productos") {
    return "Productos";
  }
  if (clean === "insumos") {
    return "Insumos";
  }
  if (clean === "impresoras" || clean === "impresoras 3d" || clean === "impresora 3d") {
    return "Impresoras 3D";
  }

  if (PRODUCT_SUBSECTIONS.some((option) => option.toLowerCase() === clean)) {
    return "Productos";
  }

  if (IMPRESORAS_SUBSECTIONS.some((option) => option.toLowerCase() === clean)) {
    return "Impresoras 3D";
  }

  return "Productos";
}

function getSubsectionsBySection(section) {
  const normalizedSection = normalizeSection(section);
  const options = SECTION_SUBSECTIONS[normalizedSection] || [];
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
  placeholder.textContent = "Selecciona una opcion";
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

function toggleInsumoExtraFields(show) {
  el.insumoExtraFields.classList.toggle("show", show);
  el.insumoBrand.required = false;
  el.insumoMaterial.required = false;

  if (!show) {
    el.insumoBrand.value = "";
    el.insumoMaterial.value = "";
  }
}

function toggleJarraExtraFields(show) {
  el.jarraExtraFields.classList.toggle("show", show);
  el.jarraSize.required = false;

  if (!show) {
    el.jarraSize.value = "500ml";
  }
}

function toggleProductPriceMode(section) {
  const isPrinter = normalizeSection(section) === "Impresoras 3D";
  el.productPrice.required = !isPrinter;
  el.productPrice.min = isPrinter ? "0" : "1";
  el.productPrice.placeholder = isPrinter ? "Solicitar precio y promociones" : "";

  if (isPrinter && el.productPrice.value === "0") {
    el.productPrice.value = "";
  }
}

function normalizeSubsection(section, subsection) {
  const normalizedSection = normalizeSection(section);
  const options = getSubsectionsBySection(section);
  const clean = String(subsection || "").trim().toLowerCase();
  const match = options.find((option) => option.toLowerCase() === clean);
  if (match) {
    return match;
  }

  if (normalizedSection === "Insumos") {
    return normalizeInsumoType(subsection);
  }

  if (options.length > 0) {
    return options[0];
  }

  return formatCategory(subsection);
}

function normalizeInsumoType(value) {
  const clean = String(value || "").trim().toLowerCase();
  const match = INSUMO_SUBSECTIONS.find((option) => option.toLowerCase() === clean);
  return match || "Filamento";
}

function normalizeJarraSize(value) {
  const clean = String(value || "").trim().toLowerCase();
  if (clean === "500ml" || clean === "500 ml" || clean === "0.5l" || clean === "medio litro") {
    return "500ml";
  }
  if (clean === "1 litro" || clean === "1l" || clean === "1000ml" || clean === "1 litro") {
    return "1 litro";
  }
  return "500ml";
}

function normalizeProduct(product) {
  const rawSection = String(product.section || "").trim();
  const rawCategory = String(product.category || "").trim();
  const normalizedSection = normalizeSection(rawSection);
  const isLegacyProductSubsection = PRODUCT_SUBSECTIONS.includes(formatCategory(rawSection));
  const isLegacyPrinterSubsection = IMPRESORAS_SUBSECTIONS.includes(formatCategory(rawSection));

  const rawCategoryLower = rawCategory.toLowerCase();
  const legacyJarraSizeCategory =
    rawCategoryLower.includes("500") || rawCategoryLower.includes("1 litro") || rawCategoryLower.includes("1l");

  const normalizedCategory = isLegacyProductSubsection
    ? formatCategory(rawSection)
    : isLegacyPrinterSubsection
      ? formatCategory(rawSection)
    : rawSection.trim().toLowerCase() === "jarras" || legacyJarraSizeCategory
      ? "Jarras"
    : normalizeSubsection(normalizedSection, product.category);

  return {
    ...product,
    section: normalizedSection,
    category: normalizedCategory,
    jarraSize:
      normalizedSection === "Productos" && normalizedCategory === "Jarras"
        ? normalizeJarraSize(product.jarraSize || rawCategory)
        : "",
    brand: String(product.brand || "").trim(),
    material: String(product.material || "").trim(),
    insumoType:
      normalizedSection === "Insumos"
        ? normalizeInsumoType(product.insumoType || product.category)
        : "",
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
  if (isLoading) {
    el.publishProductBtn.textContent = state.editingProductId ? "Guardando cambios..." : "Publicando...";
    return;
  }

  updateProductFormMode();
}

function updateProductFormMode() {
  const isEditing = Boolean(state.editingProductId);
  el.publishProductBtn.textContent = isEditing ? "Guardar cambios" : "Publicar producto";
  el.cancelEditProductBtn.classList.toggle("hidden-block", !isEditing);
}

function resetProductForm() {
  state.editingProductId = "";
  state.pendingProductFiles = [];
  el.productForm.reset();
  el.productImagesInput.value = "";
  el.productImagePreview.innerHTML = "";
  populateAdminSubsections(normalizeSection(el.productSection.value));
  toggleJarraExtraFields(false);
  toggleInsumoExtraFields(normalizeSection(el.productSection.value) === "Insumos");
  toggleProductPriceMode(normalizeSection(el.productSection.value));
  renderProductImageCount();
  updateProductFormMode();
}

function startProductEdit(productId) {
  const targetProduct = state.products.find((item) => item.id === productId);
  if (!targetProduct) {
    alert("No encontramos ese producto para editar.");
    return;
  }

  state.editingProductId = targetProduct.id;
  state.pendingProductFiles = [];

  el.productName.value = targetProduct.name;
  el.productSection.value = targetProduct.section;
  populateAdminSubsections(targetProduct.section, targetProduct.category);
  el.productDescription.value = targetProduct.description;
  el.productPrice.value =
    normalizeSection(targetProduct.section) === "Impresoras 3D"
      ? ""
      : String(targetProduct.price);
  el.insumoBrand.value = targetProduct.brand || "";
  el.insumoMaterial.value = targetProduct.material || "";
  el.jarraSize.value = normalizeJarraSize(targetProduct.jarraSize || "500ml");

  toggleInsumoExtraFields(targetProduct.section === "Insumos");
  toggleJarraExtraFields(targetProduct.section === "Productos" && targetProduct.category === "Jarras");
  toggleProductPriceMode(targetProduct.section);

  el.productImagePreview.innerHTML = "";
  renderImagePreviewFromUrls(targetProduct.images, el.productImagePreview);
  renderProductImageCount();
  updateProductFormMode();

  el.productForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderImagePreviewFromUrls(images, container) {
  const urls = Array.isArray(images) ? images : [];

  urls.slice(0, 8).forEach((src) => {
    const img = document.createElement("img");
    img.className = "image-preview-thumb";
    img.alt = "Imagen actual";
    img.src = src;
    container.appendChild(img);
  });

  if (urls.length > 8) {
    const more = document.createElement("span");
    more.className = "image-preview-more";
    more.textContent = `+${urls.length - 8} mas`;
    container.appendChild(more);
  }
}

function renderProductImageCount() {
  const total = state.pendingProductFiles.length;
  el.productImageCount.textContent = `${total} foto(s) seleccionada(s)`;
}

function addProductFiles(files) {
  if (!Array.isArray(files) || !files.length) {
    return;
  }

  state.pendingProductFiles = mergeUniqueFiles(state.pendingProductFiles, files);
  renderLocalImagePreview(state.pendingProductFiles, el.productImagePreview);
  renderProductImageCount();
}

function addHeroFiles(files) {
  if (!Array.isArray(files) || !files.length) {
    return;
  }

  state.pendingHeroFiles = mergeUniqueFiles(state.pendingHeroFiles, files);
  renderLocalImagePreview(state.pendingHeroFiles, el.heroImagePreview);
}

function handlePasteUpload(event, targetType) {
  const files = extractClipboardImageFiles(event.clipboardData);
  if (!files.length) {
    return;
  }

  event.preventDefault();

  if (targetType === "hero") {
    addHeroFiles(files);
    return;
  }

  addProductFiles(files);
}

function extractClipboardImageFiles(clipboardData) {
  if (!clipboardData?.items) {
    return [];
  }

  return Array.from(clipboardData.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item, index) => {
      const file = item.getAsFile();
      if (!file) {
        return null;
      }

      const extension = file.type.split("/")[1] || "png";
      return new File([file], `pegada_${Date.now()}_${index}.${extension}`, { type: file.type });
    })
    .filter(Boolean);
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
