(function () {
  const PRODUCT_SUBSECTIONS = ["Llaveros", "Jarras", "Hogar", "Lamparas", "Soportes"];
  const LANDING_CATEGORIES = [
    { category: "Llaveros", label: "Llaveros", caption: "Regalos con nombre" },
    { category: "Jarras", label: "Jarras", caption: "Para tu mate y tu mesa" },
    { category: "Hogar", label: "Hogar", caption: "Detalles que ordenan" },
    { category: "Lamparas", label: "Lamparas", caption: "Luz y estilo para cada rincón" },
    { category: "Soportes", label: "Soportes", caption: "Para tu setup" },
  ];

  function normalizeCatalogText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function remapHogarProductsToLamparas(products) {
    if (!Array.isArray(products)) {
      return [];
    }

    return products.map((product) => {
      if (!product || typeof product !== "object") {
        return product;
      }

      const nextProduct = { ...product };
      const category = String(nextProduct.category || "").trim();
      const name = String(nextProduct.name || "").trim();
      const normalizedName = normalizeCatalogText(name);
      const isHogarProduct = category === "Hogar";
      const hasLamparaMatch = /(^|[^a-z])lamparas?([^a-z]|$)/.test(normalizedName);

      if (isHogarProduct && hasLamparaMatch) {
        nextProduct.category = "Lamparas";
      }

      return nextProduct;
    });
  }

  const exported = {
    PRODUCT_SUBSECTIONS,
    LANDING_CATEGORIES,
    remapHogarProductsToLamparas,
  };

  if (typeof window !== "undefined") {
    window.Modela3dCatalogUtils = exported;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }
})();
