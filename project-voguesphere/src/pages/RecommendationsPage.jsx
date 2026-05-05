import React, { useState, useEffect } from "react";

import { Link, useNavigate, useLocation } from "react-router-dom";
import { UserCircleIcon, Bars3Icon, XMarkIcon, FunnelIcon } from "@heroicons/react/24/solid";
import supabase from "../supabase/supabaseClient";

let PRODUCTS_CACHE = null;
let PRODUCTS_LOADED_ONCE = false;
// ---------------- COLORS MASTER LIST ----------------
const COLOR_LIST = [
  "black", "navy", "maroon", "indigo", "charcoal", "denim blue", "purple", "brown", "olive", "rust", "teal", "blue", "green",
  "red", "orange", "gold", "mustard", "pink", "lavender", "sky blue", "dark blue", "light blue", "mint", "peach", "beige", "cream", "off white", "white", "silver"
];

// ---------------- COLOR MAP ----------------
const COLOR_MAP = {
  red: "#FF0000",
  blue: "#0000FF",
  green: "#008000",
  black: "#000000",
  white: "#FFFFFF",
  yellow: "#FFFF00",
  pink: "#FFC0CB",
  purple: "#800080",
  orange: "#FFA500",
  brown: "#A52A2A",
  grey: "#808080",
  navy: "#000080",
  maroon: "#800000",
  beige: "#F5F5DC",
  teal: "#008080",
  gold: "#FFD700",
  silver: "#C0C0C0",
  "light blue": "#ADD8E6",
  "dark blue": "#00008B",
  "sky blue": "#87CEEB",
  indigo: "#4B0082",
  "denim blue": "#1560BD",
  olive: "#808000",
  khaki: "#C3B091",
  mustard: "#FFDB58",
  cream: "#FFFDD0",
  "off white": "#F8F8FF",
  rust: "#B7410E",
  charcoal: "#36454F",
  mint: "#98FF98",
  peach: "#FFE5B4",
  lavender: "#E6E6FA"
};


// ---------------- HELPER: Extract colors ----------------
const extractColors = (labels = [], title = "") => {
  const foundColors = [];
  const allText = [...labels, title].join(" ").toLowerCase();
  COLOR_LIST.forEach((c) => {
    if (allText.includes(c.toLowerCase())) foundColors.push(c.toLowerCase());
  });
  return [...new Set(foundColors)];
};

// ---------------- CLOTHING TYPE KEYWORDS ----------------
const CLOTHING_KEYWORDS = {

  // ----------------- WESTERN -----------------
  western: [
    "t-shirt", "casual shirt", "formal shirt", "tank top", "blouse", "collar shirt",
    "half sleeves shirt", "full sleeves shirt", "button down shirt", "top",
    "hoodie", "sweater", "cardigan", "blazer", "jacket", "coat", "denim jacket",
    "shirt dress", "skirt", "jumpsuit", "romper", "western dress", "pants", "jeans",
    "playsuit", "sweatshirt", "zipper hoodie", "pullover", "crewneck",
    , "long a-line dress", "maxi dress",
    "two piece skirt set", "co-ord set", "top and skirt"
  ],

  // ----------------- EASTERN -----------------
  eastern: [
    "embroidered shalwar kameez",
    "printed kurti",
    "maxi dress",
    "dress",
    "kurta",
    "shalwar kameez",
    "frock",
    "shalwar kameez with duppata",
    "embroidered shalwar kameez with duppata",
    "long frock",
    "long a-line dress",
    "long dress",
    "anarkali",
    "maxi",
    "heavy maxi",
    "wedding maxi",
    "long maxifrock"
  ],



  // ----------------- PANTS / DENIM -----------------
  pants: [
    "skinny jeans", "straight jeans", "wide leg jeans", "bootcut jeans",
    "high waisted jeans", "ripped jeans", "cropped jeans", "jeans", "denims",
    "trousers", "pants"
  ],

  // ----------------- WEDDING / FORMAL -----------------
  wedding: [
    "lehenga choli",
    "anarkali dress",
    "floor length gown",
    "lehenga",
    "saree",
    "embroidered maxi",
    "handworked gown",
    // "party wear dress",
    "embroidered frock",
    // "formal frock",
    // "embroidered dress",
    "wedding dress",
    "sharara suit",
    "gharara suit",
    "angrakha style dress",
    // "embroidered shalwar kameez",
    // "embroidered kurti",
    // "embroidered suit",
    // "maxi dress",
    "long kameez with lehenga",
    "embroidered long dress",
    // "shalwar kameez",
    "embroidered shalwar kameez with duppata",
    "maxi",
    "heavy maxi",
    "wedding maxi",
    // "long maxifrock",
    "anarkali",
    // "frock",
    // "long dress"
  ],

  // ----------------- SAREE -----------------
  saree: [
    "saree", "sari"
  ]
};


/// ---------------- FILTER COMPONENT ----------------
const Filters = ({ filters, setFilters, open, setOpen }) => {
  return (
    <>
      {/* Overlay for small & medium screens */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-72 sm:w-80 bg-white shadow-2xl transform transition-transform duration-300 z-50 flex flex-col
    ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b flex-shrink-0">
          <h2 className="text-lg font-bold text-pink-700">Filter Options</h2>
          <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-pink-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable filter content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-8">
          {/* Clothing Type */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Clothing Type</h3>
            <div className="flex flex-wrap gap-2">
              {["Western", "Eastern", "Pants", "Wedding", "Saree"].map((type) => (
                <button
                  key={type}
                  onClick={() =>
                    setFilters({
                      ...filters,
                      clothingType:
                        filters.clothingType === type.toLowerCase() ? "" : type.toLowerCase(),
                    })
                  }
                  className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${filters.clothingType === type.toLowerCase()
                    ? "bg-pink-600 text-white border-pink-600"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Color Filter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Choose Color</h3>
            <div className="grid grid-cols-6 gap-3">
              {COLOR_LIST.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setFilters({ ...filters, color: filters.color === c ? "" : c })}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${filters.color === c
                    ? "border-pink-500 scale-110 shadow-md"
                    : "border-gray-300 hover:scale-105"
                    }`}
                  style={{ backgroundColor: COLOR_MAP[c] }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Price Filter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Price Range</h3>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setFilters({ ...filters, priceRange: filters.priceRange === "low" ? "" : "low" })
                }
                className={`px-4 py-2 rounded-full border font-medium ${filters.priceRange === "low"
                  ? "bg-pink-600 text-white border-pink-600"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
              >
                Low
              </button>
              <button
                onClick={() =>
                  setFilters({ ...filters, priceRange: filters.priceRange === "high" ? "" : "high" })
                }
                className={`px-4 py-2 rounded-full border font-medium ${filters.priceRange === "high"
                  ? "bg-pink-600 text-white border-pink-600"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
              >
                High
              </button>
            </div>
          </div>


          {/* Sticky Clear Button */}
          <div className="p-5 border-t flex-shrink-0 bg-white">
            <button
              onClick={() => setFilters({ color: "", priceRange: "", clothingType: "" })}
              className="w-full bg-gray-100 text-gray-700 py-2 rounded-full hover:bg-pink-100 hover:text-pink-700 transition-all"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

// ---------------- FILTER FUNCTION ----------------
const filterProducts = (products, filters) => {
  return products.filter((p) => {
    let matchesColor = true;
    let matchesPrice = true;
    let matchesClothingType = true;

    const allLabels = (p.labels || []).join(" ").toLowerCase();
    const titleText = (p.title || "").toLowerCase();
    const combinedText = `${allLabels} ${titleText}`;

    // COLOR
    if (filters.color) matchesColor = p.colors?.includes(filters.color.toLowerCase());

    // PRICE FILTER
    if (filters.priceRange) {

      let matchesPrice = false;
      const rawPrice = p.price || "";

      // Remove Rs, RS, PKR (case-insensitive), dots, commas, spaces, etc
      const cleaned = rawPrice
        .toString()
        .replace(/(Rs|RS|PKR)\.?\s*/gi, "") // remove currency prefix
        .replace(/,/g, "")                   // remove commas
        .trim();

      // Convert to number
      const priceNumber = cleaned ? Number(cleaned) : null;

      // Skip invalid prices
      if (!priceNumber || priceNumber <= 0) return false;

      // Apply filter
      if (filters.priceRange === "low") {
        matchesPrice = priceNumber <= 10000;
      } else if (filters.priceRange === "high") {
        matchesPrice = priceNumber > 10000;
      }

      if (!matchesPrice) return false;
    }



    // CLOTHING TYPE
    if (filters.clothingType) {
      const keywords = CLOTHING_KEYWORDS[filters.clothingType] || [];
      // Only match if the product's labels array contains at least one keyword
      matchesClothingType = (p.labels || []).some(label => keywords.includes(label.toLowerCase()));
    }


    return matchesColor && matchesPrice && matchesClothingType;
  });
};

// ---------------- MAIN PAGE ----------------
const RecommendationsPage = () => {
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("discover");
  const [productsByBrand, setProductsByBrand] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [filters, setFilters] = useState({ color: "", priceRange: "", clothingType: "" });
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  useEffect(() => {
    if (PRODUCTS_LOADED_ONCE && PRODUCTS_CACHE) {
      setProductsByBrand(PRODUCTS_CACHE);
      setLoadedOnce(true);
      setLoading(false);
      return;
    }

    const fetchProductsFromJSON = async () => {
      setLoading(true);
      try {
        const { data: files } = await supabase.storage
          .from("scrape-data")
          .list("", { limit: 500, offset: 0 });

        const jsonFiles = (files || []).filter(f => f.name.endsWith(".json"));

        // Download all files in parallel
        const filePromises = jsonFiles.map(async (file) => {
          const brandName = file.name.replace(".json", "").replace(/[-_]/g, " ");
          const formattedBrand = brandName.charAt(0).toUpperCase() + brandName.slice(1);

          const { data: fileData } = await supabase.storage
            .from("scrape-data")
            .download(file.name);

          const text = await fileData.text();
          const json = JSON.parse(text);

          const cleanedProducts = (json.products || []).map((p) => ({
            title: p.title,
            price: p.price,
            image: p.image,
            url: p.url || p.link || "#",
            labels: p.labels || [],
            colors: extractColors(p.labels, p.title),
          }));

          return { brand: formattedBrand, products: cleanedProducts };
        });

        const allBrands = await Promise.all(filePromises);

        // Merge results into brandMap
        const brandMap = {};
        allBrands.forEach(({ brand, products }) => {
          if (!brandMap[brand]) brandMap[brand] = [];
          brandMap[brand].push(...products);
        });

        PRODUCTS_CACHE = brandMap;
        PRODUCTS_LOADED_ONCE = true;
        setProductsByBrand(brandMap);
        setLoadedOnce(true);
      } catch (error) {
        console.error(error);
      }
      setLoading(false);
    };


    fetchProductsFromJSON();
  }, []);

  // Root container classes:
  // - when filterOpen AND screen is lg+, we add margin-left to push content.
  // - on small/medium screens we DO NOT push content (overlay is used instead).
  const rootClasses = `font-serif min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pt-[140px] transition-all duration-300
    ${filterOpen ? "lg:ml-72 lg:pl-6" : ""}`;

  return (
    <div className={rootClasses}>
      {/* NAVBAR (kept exactly as before; responsive) */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 py-4 md:py-5 shadow-2xl border-b border-pink-350 bg-gradient-to-r from-pink-100 via-white to-pink-200 font-serif">
        <Link
          to="/"
          className="text-2xl md:text-3xl font-extrabold tracking-tight hover:opacity-90 transition-all duration-300"
        >
          VogueSphere
        </Link>

        {/* Desktop Menu */}
        <ul className="hidden md:flex gap-8 font-medium">
          <li><Link to="/" className="hover:text-pink-700 transition-colors">Home</Link></li>
          <li><Link to="/recommendations" className="hover:text-pink-700 transition-colors">Trendy Fits</Link></li>
          <li><Link to="/ai-feedback" className="hover:text-pink-700 transition-colors">AI Feedback</Link></li>
          <li><Link to="/community" className="hover:text-pink-700 transition-colors">Community</Link></li>
          <li><Link to="/about-us" className="hover:text-pink-700 transition-colors">About Us</Link></li>
        </ul>

        {/* Right Icons */}
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="hidden md:inline-flex bg-white text-pink-600 px-4 py-2 rounded-full font-semibold shadow-md hover:bg-pink-100 transition-all duration-300"
          >
            Join Now
          </Link>

          <Link
            to="/UserProfile"
            className="text-pink-700 hover:text-pink-900 transition-transform duration-300 hover:scale-110"
          >
            <UserCircleIcon className="h-8 w-8" />
          </Link>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-pink-700 hover:text-pink-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <XMarkIcon className="h-8 w-8" /> : <Bars3Icon className="h-8 w-8" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <ul className="absolute top-full left-0 w-full bg-white text-pink-700 flex flex-col items-center gap-6 py-6 shadow-lg md:hidden border-t border-pink-200">
            <li><Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link></li>
            <li><Link to="/recommendations" onClick={() => setMobileMenuOpen(false)}>Trendy Fits</Link></li>

            <li><Link to="/ai-feedback" onClick={() => setMobileMenuOpen(false)}>AI Feedback</Link></li>
            <li><Link to="/community" onClick={() => setMobileMenuOpen(false)}>Community</Link></li>
            <li><Link to="/about-us" onClick={() => setMobileMenuOpen(false)}>About Us</Link></li>
            <li>
              <Link
                to="/login"
                className="bg-pink-100 text-pink-700 px-6 py-2 rounded-full font-semibold shadow-md hover:bg-pink-200 transition-all duration-300"
                onClick={() => setMobileMenuOpen(false)}
              >
                Join Now
              </Link>
            </li>
          </ul>
        )}
      </nav>

      {/* Filters component - overlay on small/medium, slide/push on large */}
      <Filters filters={filters} setFilters={setFilters} open={filterOpen} setOpen={setFilterOpen} />

      {/* Header + Tabs Section */}
      <header className="relative bg-gradient-to-br from-pink-100 via-rose-50 to-pink-100 text-center py-24 shadow-inner mt-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.5),transparent_60%)] animate-pulse" />
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-pink-200 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-0 right-0 w-56 h-56 bg-rose-200 rounded-full blur-3xl opacity-50" />

        <h1 className="relative text-4xl sm:text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 bg-clip-text text-transparent tracking-tight drop-shadow-md">
          Discover Trendy Outfits
        </h1>
        <p className="relative text-gray-700 mt-4 text-base sm:text-lg md:text-xl max-w-2xl mx-auto font-medium">
          Find fashion inspiration tailored perfectly to your personal style.
        </p>

        <div className="relative mt-10 flex justify-center space-x-4 sm:space-x-6">
          {["discover", "personalize"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                if (tab === "personalize") {
                  if (user) {
                    setActiveTab(tab);
                  } else {
                    navigate("/login", { state: { from: "/recommendations", tab: "personalize" } });
                  }
                } else {
                  setActiveTab(tab);
                }
              }}

              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-semibold transition-all duration-300 transform hover:scale-105 backdrop-blur-sm ${activeTab === tab
                ? "bg-pink-600 text-white shadow-lg shadow-pink-300/50 border-2 border-pink-600"
                : "bg-white/70 text-gray-700 border border-gray-300 hover:bg-pink-50 hover:border-pink-400"
                }`}
            >
              {tab === "discover" ? "Discover Outfits" : "Personalize Recommendations"}
            </button>
          ))}
        </div>

      </header>

      {/* Main content wrapper - For push behavior on large screens we add lg:ml-72 (same width as sidebar) */}
      <main className={`transition-all duration-300 px-4 md:px-6 lg:px-8 pb-16`}>
        {/* Filter + discover */}
        {activeTab === "discover" && (
          <section className="mt-10 space-y-8">
            {/* Filter Button - always visible */}
            {/* Filter Button — hidden when sidebar is open */}
            {!filterOpen && (
              <div className="flex justify-start mb-6 -mt-6">
                <button
                  onClick={() => setFilterOpen(true)}
                  className="flex items-center gap-2 bg-pink-600 text-white px-5 py-2 rounded-full shadow-md hover:bg-pink-700 transition-all"
                >
                  <FunnelIcon className="h-5 w-5" />
                  <span className="font-medium">Filters</span>
                </button>
              </div>
            )}

            {/* Products / Brands */}
            {loading && !loadedOnce ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <div className="flex space-x-3">
                  <div
                    className="w-5 h-5 rounded-full bg-gradient-to-r from-pink-400 to-pink-600 animate-bounce-slow"
                    style={{ animationDelay: '0s' }}
                  ></div>
                  <div
                    className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 animate-bounce-slow"
                    style={{ animationDelay: '0.15s' }}
                  ></div>
                  <div
                    className="w-5 h-5 rounded-full bg-gradient-to-r from-pink-500 to-red-400 animate-bounce-slow"
                    style={{ animationDelay: '0.3s' }}
                  ></div>
                </div>
                {/* Stylish Loading Text */}
                <p className="bg-gradient-to-r from-pink-600 via-purple-700 to-pink-800 text-transparent bg-clip-text text-base sm:text-lg font-bold tracking-wide animate-pulse">
                  Loading outfits...
                </p>


              </div>

            ) : (
              Object.entries(productsByBrand).map(([brand, products]) => {
                const filtered = filterProducts(products, filters);
                if (filtered.length === 0) return null;

                return (
                  <div key={brand} className="mb-8">
                    <h2 className="text-center text-2xl md:text-3xl font-bold mb-4 mt-0 text-gray-800 border-b pb-2">
                      <span className="text-pink-600">{brand}</span>
                    </h2>
                    <div className="flex overflow-x-auto space-x-4 pb-4 custom-scrollbar snap-x snap-mandatory">
                      {filtered.map((product, idx) => (
                        <a
                          key={idx}
                          href={product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-40 sm:w-44 md:w-52 flex-shrink-0 bg-white border rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition transform hover:-translate-y-1 snap-start"
                        >
                          <img
                            src={product.image}
                            alt={product.title}
                            className="w-full h-52 sm:h-56 md:h-60 object-contain bg-white p-3"
                          />
                          <div className="p-3 sm:p-4 bg-white">
                            <p className="text-sm font-semibold truncate">{product.title}</p>
                            <p className="text-xs text-gray-500">{product.price}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })
            )}

          </section>
        )}

        {/* Personalize Tab */}
        {activeTab === "personalize" && (
          <section className="flex flex-col items-center mt-16 mb-24 px-4 sm:px-6 w-full">
            {/* Header Box */}
            <div className="p-10 sm:p-12 w-full max-w-3xl text-center rounded-3xl shadow-2xl bg-gradient-to-r from-pink-50 via-rose-50 to-amber-50 border border-pink-100 transition-all duration-700 hover:shadow-pink-100">
              <h2 className="font-extrabold text-4xl sm:text-5xl text-gray-800 leading-snug transition-all duration-700 hover:scale-[1.02]">
                Define Your Unique Fashion Identity
              </h2>
              <p className="text-gray-600 mt-4 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                Experience AI-powered style recommendations crafted just for you.
                Take a quick quiz or upload an outfit photo to discover looks that express your individuality.
              </p>
            </div>

            {/* Option Cards */}
            <div className="flex flex-col md:flex-row gap-10 mt-14 w-full justify-center max-w-6xl">
              {/* Style Quiz Card */}
              <div className="flex-1 bg-gradient-to-br from-pink-50 via-white to-rose-50 rounded-2xl p-8 sm:p-10 text-center shadow-md hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] transition-all duration-700 border border-pink-100">
                <div className="flex justify-center mb-5">
                  <img
                    src="https://cdn-icons-png.flaticon.com/128/7838/7838676.png"
                    alt="Style Quiz Icon"
                    className="w-16 h-16 transition-transform duration-700 hover:scale-110"
                  />
                </div>
                <h3 className="font-semibold text-2xl text-gray-800 mb-2">
                  Take the Style Quiz
                </h3>
                <p className="text-gray-600 mb-6 text-sm sm:text-base leading-relaxed">
                  Answer a few quick questions and let AI curate looks that match your personality and taste.
                </p>
                <button
                  onClick={() => navigate("/quiz")}
                  className="px-8 py-3 bg-pink-500 text-white rounded-full font-semibold shadow-md hover:bg-pink-600 hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  Start Quiz
                </button>
              </div>

              {/* Upload Image Card */}
              <div className="flex-1 bg-gradient-to-br from-rose-50 via-white to-pink-50 rounded-2xl p-8 sm:p-10 text-center shadow-md hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] transition-all duration-700 border border-pink-100">
                <div className="flex justify-center mb-5">
                  <img
                    src="https://cdn-icons-png.flaticon.com/128/5175/5175601.png"
                    alt="Upload Outfit Icon"
                    className="w-16 h-16 transition-transform duration-700 hover:scale-110"
                  />
                </div>
                <h3 className="font-semibold text-2xl text-gray-800 mb-2">
                  Upload an Outfit Image
                </h3>
                <p className="text-gray-600 mb-6 text-sm sm:text-base leading-relaxed">
                  Upload your outfit and get instant AI feedback along with curated outfit inspirations just for you.
                </p>
                <button
                  onClick={() => navigate("/upload-match")}
                  className="px-8 py-3 bg-pink-500 text-white rounded-full font-semibold shadow-md hover:bg-pink-600 hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  Upload Image
                </button>
              </div>
            </div>
          </section>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-pink-50 via-white to-pink-50 border-t border-pink-200 py-4 px-4 mt-12 text-gray-700">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center gap-2">



          {/* Copyright */}
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} <span className="font-semibold text-pink-500">VogueSphere</span>. All rights reserved.
          </p>
        </div>
      </footer>
      <style>
        {`
      @keyframes bounce-slow {
        0%, 100% { transform: translateY(0); opacity: 0.7; }
        50% { transform: translateY(-20px) scale(1.2); opacity: 1; }
      }

      .animate-bounce-slow {
        animation: bounce-slow 0.8s infinite ease-in-out;
      }

      .custom-scrollbar::-webkit-scrollbar {
        height: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #fdf2f8; 
        border-radius: 10px;
        margin-block: 2px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #db2777; 
        border-radius: 10px;
        border: 2px solid #fdf2f8;
        min-width: 50px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #be185d;
      }
      
      /* Firefox */
      .custom-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: #db2777 #fdf2f8;
      }
    `}
      </style>
    </div>

  );


};


export default RecommendationsPage;