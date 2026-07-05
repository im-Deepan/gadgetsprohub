export interface LocalUserType {
  _id: string;
  email: string;
  password?: string;
  name: string;
  role: string;
  wishlist: any[];
  recentlyViewed: any[];
  district?: string;
  createdAt: Date;
  isVerified?: boolean;
  verificationToken?: string;
  pendingEmail?: string;
  pendingEmailToken?: string;
}

export const seedOrders = [
  {
    _id: "665a0008bc93ef2d8c000080",
    userId: "665a0006bc93ef2d8c000060", // Admin Strator
    items: [
      {
        product: "665a0002bc93ef2d8c000010", // Premium Wireless Headphones
        quantity: 1,
        price: 149.99
      },
      {
        product: "665a0002bc93ef2d8c000011", // Smart Watch Pro
        quantity: 1,
        price: 299.99
      }
    ],
    totalAmount: 449.98,
    status: 'In Transit',
    trackingNumber: 'TRK9928371556',
    carrier: 'FedEx Express',
    estimatedDelivery: new Date("2026-06-05"),
    createdAt: new Date("2026-05-30T10:00:00Z")
  },
  {
    _id: "665a0008bc93ef2d8c000081",
    userId: "665a0006bc93ef2d8c000060", // Admin Strator
    items: [
      {
        product: "665a0002bc93ef2d8c000010", // Premium Wireless Headphones
        quantity: 1,
        price: 149.99
      }
    ],
    totalAmount: 149.99,
    status: 'Delivered',
    trackingNumber: 'TRK1122334412',
    carrier: 'DHL Express',
    estimatedDelivery: new Date("2026-05-29"),
    createdAt: new Date("2026-05-27T14:30:00Z")
  },
  {
    _id: "665a0008bc93ef2d8c000082",
    userId: "665a0006bc93ef2d8c000061", // API Tester / tester@example.com
    items: [
      {
        product: "665a0002bc93ef2d8c000011", // Smart Watch Pro
        quantity: 2,
        price: 299.99
      }
    ],
    totalAmount: 599.98,
    status: 'Processing',
    trackingNumber: 'TRK4481923011',
    carrier: 'UPS Ground',
    estimatedDelivery: new Date("2026-06-03"),
    createdAt: new Date("2026-05-31T01:15:00Z")
  }
];

export const seedCategories = [
  {
    _id: "665a0001bc93ef2d8c000001",
    name: 'Electronics',
    slug: 'electronics',
    description: 'Latest high-fidelity electronics, devices & smart tech gadgets.',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    icon: '📱',
    subcategories: ['Mobile Phones', 'Chargers', 'Headphones', 'Laptops', 'Wearables', 'Accessories'],
    createdAt: new Date("2026-05-30")
  },
  {
    _id: "665a0001bc93ef2d8c000002",
    name: 'Fashion',
    slug: 'fashion',
    description: 'Trendy wear, stylish shoes, watches & high-grade apparel lifestyle essentials.',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    icon: '👔',
    subcategories: ['Shirts', 'Shoes', 'Watches', 'Bags', 'Accessories'],
    createdAt: new Date("2026-05-30")
  },
  {
    _id: "665a0001bc93ef2d8c000003",
    name: 'Home & Garden',
    slug: 'home-garden',
    description: 'Elegant home improvement tools, kitchen assistants & beautiful outdoor setups.',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800',
    icon: '🏡',
    subcategories: ['Kitchen tools', 'Outdoor setups', 'Furniture', 'Plants'],
    createdAt: new Date("2026-05-30")
  },
  {
    _id: "665a0001bc93ef2d8c000004",
    name: 'Sports',
    slug: 'sports',
    description: 'Professional-grade athletic wear, gym workout machinery & outdoor exploration gear.',
    image: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800',
    icon: '⚽',
    subcategories: ['Fitness Equipment', 'Footwear', 'Apparel', 'Camping Gear'],
    createdAt: new Date("2026-05-30")
  }
];

export const seedProducts = [
  {
    "_id": "665a0002bc93ef2d8c000010",
    "name": "Premium Wireless Headphones",
    "slug": "premium-wireless-headphones",
    "description": "High-quality wireless headphones with active hybrid noise cancellation.",
    "longDescription": "Experience crystal clear audio with our signature wireless headphones. Features premium custom dynamic audio drivers, Hybrid Active Noise Cancellation, high fidelity 30-hour battery stamina, comfortable over-ear design, memory foam padding, and ultra-crisp calling microphones.",
    "category": "665a0001bc93ef2d8c000001",
    "brand": "AudioPro",
    "price": 149.99,
    "originalPrice": 199.99,
    "discount": 25,
    "images": [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=850",
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=850"
    ],
    "videoUrl": "https://assets.mixkit.co/videos/preview/mixkit-rotating-tech-product-display-42023-large.mp4",
    "features": [
      "Hybrid Noise Cancellation",
      "Wireless Bluetooth 5.2 Multipoint",
      "30hr Continuous Playback",
      "High Fidelity Spatial Sound"
    ],
    "specifications": {
      "Battery Life": "30 hours duration",
      "Connectivity": "Bluetooth 5.2 / USB-C",
      "Weight": "250 grams lightweight",
      "Warranty": "2 years robust manufacturer support"
    },
    "rating": 4.5,
    "totalReviews": 128,
    "affiliateLink": "https://amazon.com/dp/B000EXAMPLE1",
    "affiliateCode": "AUDIO001",
    "inStock": true,
    "sku": "AUDIO-ANC-W2026",
    "tags": [
      "audio",
      "wireless",
      "headphones",
      "premium"
    ],
    "trending": false,
    "featured": true,
    "clicks": 142,
    "conversions": 35,
    "pros": [
      "Excellent deep baseline",
      "Superb adaptive hybrid ANC",
      "Generous comfortable earmuffs"
    ],
    "cons": [
      "Somewhat bulky hard case",
      "Requires custom app for full equalizer tuning"
    ],
    "reviews": [
      {
        "_id": "665a0003bc93ef2d8c000020",
        "userId": {
          "_id": "665a0004bc93ef2d8c000030",
          "name": "David K.",
          "profileImage": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"
        },
        "rating": 5,
        "title": "Absolute Masterpiece",
        "content": "I have used these headphones for three weeks now. The noise cancellation easily matches brand names twice the price! Highly recommended.",
        "helpful": 12,
        "createdAt": "2026-05-28T00:00:00.000Z"
      }
    ],
    "seoTitle": "Best Premium Wireless ANC Headphones 2026 Review",
    "seoDescription": "Find our exhaustive reviews and custom discount links for the AudioPro Premium Wireless ANC Headphones.",
    "seoKeywords": [
      "anc headphones",
      "bluetooth earphones",
      "best budget audio"
    ],
    "createdAt": "2026-05-29T00:00:00.000Z",
    "trendingStartedAt": "2026-05-29T00:00:00.000Z"
  },
  {
    "_id": "665a0002bc93ef2d8c000011",
    "name": "Smart Watch Pro",
    "slug": "smart-watch-pro",
    "description": "Advanced sports smartwatch with holistic health tracking diagnostics.",
    "longDescription": "Stay connected on every mile with our robust Smart Watch Pro. Built with high durable aluminum materials, clear customizable always-on AMOLED displays, live built-in multi-channel GPS tracking, cardiac diagnostics, blood oxygen diagnostics, sleeping quality scoring indices, and comprehensive weather forecast widgets.",
    "category": "665a0001bc93ef2d8c000001",
    "brand": "TechBrand",
    "price": 299.99,
    "originalPrice": 399.99,
    "discount": 25,
    "images": [
      "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=850",
      "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=850"
    ],
    "videoUrl": "https://assets.mixkit.co/videos/preview/mixkit-photo-camera-on-a-table-in-a-studio-41710-large.mp4",
    "features": [
      "Cardiac & SpO2 live Diagnostics",
      "Multi-band Autonomous GPS",
      "Water Resistant up to 5ATM",
      "7-day active battery storage"
    ],
    "specifications": {
      "Display": "1.43\" Always-on AMOLED",
      "Battery": "Up to 7 days smart operation",
      "Water Resistance": "5ATM (Swimming appropriate)",
      "OS": "WearOS Custom Edition"
    },
    "rating": 4.7,
    "totalReviews": 95,
    "affiliateLink": "https://amazon.com/dp/B000EXAMPLE2",
    "affiliateCode": "WATCH001",
    "inStock": true,
    "sku": "SMART-WATCH-PRO-V2",
    "tags": [
      "smartwatch",
      "wearable",
      "fitness",
      "tracker"
    ],
    "trending": false,
    "featured": true,
    "clicks": 212,
    "conversions": 48,
    "pros": [
      "Beautiful always-on glass",
      "Extremely accurate GPS positioning",
      "Substantial smart battery duration"
    ],
    "cons": [
      "Somewhat expensive premium catalog item",
      "Lacks native integration with certain smart security devices"
    ],
    "reviews": [
      {
        "_id": "665a0003bc93ef2d8c000021",
        "userId": {
          "_id": "665a0004bc93ef2d8c000031",
          "name": "Helena S.",
          "profileImage": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100"
        },
        "rating": 4,
        "title": "Very responsive and reliable",
        "content": "Track workouts perfectly and handles sweaty active sessions like a breeze. The heart monitor readings coordinate closely with medical straps.",
        "helpful": 8,
        "createdAt": "2026-05-27T00:00:00.000Z"
      }
    ],
    "seoTitle": "Smart Watch Pro Exercise Wearable Review",
    "seoDescription": "Find out why athletes are praising the Smart Watch Pro for outdoor cardiac and sleep metrics.",
    "seoKeywords": [
      "wearable gps",
      "fitness sensor watch",
      "AMOLED sport watch"
    ],
    "createdAt": "2026-05-29T00:00:00.000Z",
    "trendingStartedAt": "2026-05-29T00:00:00.000Z"
  },
  {
    "_id": "665a0002bc93ef2d8c000012",
    "name": "Comfortable Trail Running Shoes",
    "slug": "comfortable-trail-running-shoes",
    "description": "Professional-grade high-cushioned running shoes for rough mountain terrains.",
    "longDescription": "Conquer the steep mountain trails or local asphalt paths with the Comfortable Trail Running Shoes. Formulated with breathable, ultra-light mesh material and heavy-duty, multi-pattern high traction rubber soles for superior traction control under wet or gravel trail situations.",
    "category": "665a0001bc93ef2d8c000004",
    "brand": "SportGear",
    "price": 89.99,
    "originalPrice": 119.99,
    "discount": 25,
    "images": [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=850",
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=850"
    ],
    "features": [
      "High cushioned foam sole",
      "Featherlight mesh composite fabric",
      "High traction rubber spikes",
      "Reinforced toe bump protection"
    ],
    "specifications": {
      "Material": "Breathable Composite Mesh / Organic Rubber",
      "Weight": "280g/pair extremely light",
      "Sole Tech": "High responsive recovery foam",
      "Sizes Available": "US Mens 6 to 14"
    },
    "rating": 4.6,
    "totalReviews": 87,
    "affiliateLink": "https://amazon.com/dp/B000EXAMPLE3",
    "affiliateCode": "SHOES001",
    "inStock": true,
    "sku": "SHOE-TRAIL-RUN-2026",
    "tags": [
      "shoes",
      "running",
      "trail",
      "sports"
    ],
    "trending": false,
    "featured": true,
    "clicks": 98,
    "conversions": 18,
    "pros": [
      "Phenomenal responsive springback cushioning",
      "Wide stable toe box prevents pinching",
      "Superb muddy/gravel traction"
    ],
    "cons": [
      "Not completely waterproofed (mesh absorbs fast)",
      "Sizes scale somewhat smaller than industrial averages"
    ],
    "reviews": [] as any[],
    "createdAt": "2026-05-25T00:00:00.000Z"
  },
  {
    "_id": "665a0002bc93ef2d8c000021",
    "name": "Mechanical Gaming Keyboard RGB",
    "slug": "mechanical-gaming-keyboard-rgb",
    "description": "Hot-swappable mechanical gaming keyboard with customizable linear red switches.",
    "longDescription": "Dominate your games with our Mechanical Gaming Keyboard. Constructed with elegant anodized aluminum, customizable dual-shot PBT keycaps, linear red switches, vibrant per-key programmable RGB backlight profiles, dynamic dial knobs, and silent foam dampening filters.",
    "category": "665a0001bc93ef2d8c000001",
    "brand": "TechBrand",
    "price": 119.99,
    "originalPrice": 149.99,
    "discount": 20,
    "images": [
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=850"
    ],
    "features": [
      "Hot-swappable red switches",
      "Full per-key RGB backlighting",
      "Custom metal control dial",
      "Anodized aluminum framing"
    ],
    "specifications": {
      "Interface": "USB-C Detachable wire",
      "Form Factor": "75% compact profile",
      "Switch Lifespan": "80 million keypresses",
      "Polling Rate": "1000Hz ultra-low latency"
    },
    "rating": 4.8,
    "totalReviews": 142,
    "affiliateLink": "https://amazon.com/dp/B000EXAMPLE21",
    "affiliateCode": "KEYBOARD101",
    "inStock": true,
    "sku": "KEY-MECH-RGB-75",
    "tags": [
      "electronics",
      "gaming",
      "accessories",
      "keyboard"
    ],
    "trending": false,
    "featured": true,
    "clicks": 320,
    "conversions": 55,
    "pros": [
      "Crisp linear keyfeel",
      "Satisfying silent sound acoustic profile",
      "Space-saving desk footprint"
    ],
    "cons": [
      "Requires typing adaptation if used to dome membranes",
      "Configuration software is currently Windows only"
    ],
    "reviews": [] as any[],
    "createdAt": "2026-06-01T12:00:00.000Z",
    "trendingStartedAt": "2026-06-01T12:00:00.000Z"
  },
  {
    "_id": "665a0002bc93ef2d8c000022",
    "name": "Minimalist Leather Cardholder",
    "slug": "minimalist-leather-cardholder",
    "description": "Slim top-grain genuine leather cardholder crafted for modern wallets.",
    "longDescription": "Declutter your everyday carry with our beautifully tanned Minimalist Leather Cardholder. Features four precision card slots, one hidden central cash compartment, robust RFID blocking lining protection, and hand-stitched premium wax thread durability.",
    "category": "665a0001bc93ef2d8c000002",
    "brand": "ClassicGoods",
    "price": 34.99,
    "originalPrice": 44.99,
    "discount": 22,
    "images": [
      "https://images.unsplash.com/photo-1627123424574-724758594e93?w=850"
    ],
    "features": [
      "Top-grain cowhide leather",
      "Secure RFID blocking lining",
      "Four quick access slots",
      "Ultra comfort pocket thickness"
    ],
    "specifications": {
      "Material": "Genuine full-grain leather",
      "Dimensions": "10cm x 7cm compact",
      "Weight": "45 grams featherweight",
      "Thread": "Seared heavy wax yarn"
    },
    "rating": 4.4,
    "totalReviews": 76,
    "affiliateLink": "https://amazon.com/dp/B000EXAMPLE22",
    "affiliateCode": "WALLET02",
    "inStock": true,
    "sku": "WALL-MIN-LEA-02",
    "tags": [
      "fashion",
      "wallet",
      "leather",
      "classic"
    ],
    "trending": false,
    "featured": false,
    "clicks": 64,
    "conversions": 10,
    "pros": [
      "Fits perfectly inside any front pocket",
      "Aromatic premium leather scent",
      "Stitches do not fray easily"
    ],
    "cons": [
      "Tightly holds cards initially (requires brief break-in)",
      "Not suitable if you carry lots of metallic coins"
    ],
    "reviews": [] as any[],
    "createdAt": "2026-06-02T10:00:00.000Z"
  },
  {
    "_id": "665a0002bc93ef2d8c000023",
    "name": "Smart LED Table Lamp",
    "slug": "smart-led-table-lamp",
    "description": "Eye-care ambient warm bedside lamp with adjustable smart routines.",
    "longDescription": "Elevate your nightstand aesthetic with the Smart LED Table Lamp. Seamlessly pairs with local smart home setups, providing flicker-free visual illumination, infinite color spectrums, dimming ranges down to 1%, and custom sleep routines.",
    "category": "665a0001bc93ef2d8c000003",
    "brand": "TechBrand",
    "price": 45.99,
    "originalPrice": 59.99,
    "discount": 23,
    "images": [
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=850"
    ],
    "features": [
      "16 Million RGB Options",
      "Eye-Comfort Dimming",
      "Timers & Sleeping Routines",
      "Siri / Assistant pairing integration"
    ],
    "specifications": {
      "Luminous Flux": "450 lumens maximum",
      "Interface": "Wi-Fi 2.4Ghz / BLE",
      "Power consumption": "10W energy saver",
      "Lifespan": "25000 burning hours"
    },
    "rating": 4.6,
    "totalReviews": 91,
    "affiliateLink": "https://amazon.com/dp/B000EXAMPLE23",
    "affiliateCode": "LAMP01",
    "inStock": true,
    "sku": "HOME-SMART-LAMP-RGB",
    "tags": [
      "home-garden",
      "lamp",
      "lighting",
      "gadget"
    ],
    "trending": false,
    "featured": false,
    "clicks": 180,
    "conversions": 34,
    "pros": [
      "Flicker-free eye-care technology",
      "Excellent color rendering index",
      "Very simple setup via app"
    ],
    "cons": [
      "Does not support older 5GHz Wi-Fi directly",
      "Plug cord is somewhat short (1.2m)"
    ],
    "reviews": [],
    "createdAt": "2026-06-03T15:00:00.000Z",
    "trendingStartedAt": "2026-06-03T15:00:00.000Z"
  },
  {
    "_id": "665a0002bc93ef2d8c000024",
    "name": "Waterproof Climbing Backpack",
    "slug": "waterproof-climbing-backpack",
    "description": "Heavy-duty outdoor exploration pack with rain protection hood.",
    "longDescription": "Conquer extreme weather trails with the Waterproof Climbing Backpack. Built for mountain terrain, it boasts tear-resistant ripstop nylon, multi-point ergonomic heavy weight-loading shoulder suspensions, and dedicated trekking lock setups.",
    "category": "665a0001bc93ef2d8c000004",
    "brand": "SportGear",
    "price": 79.99,
    "originalPrice": 99.99,
    "discount": 20,
    "images": [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=850"
    ],
    "features": [
      "65L Large Capacity Cabin",
      "Detachable Waterproof Cover",
      "Zero-G Balance Suspension",
      "Laptop & Camelbak chambers"
    ],
    "specifications": {
      "Material": "900D Tear-proof military Nylon",
      "Volume": "65 Liters expandability",
      "Hardware": "Heavy-duty YKK zippers",
      "Dimensions": "62cm x 35cm x 22cm"
    },
    "rating": 4.7,
    "totalReviews": 110,
    "affiliateLink": "https://amazon.com/dp/B000EXAMPLE24",
    "affiliateCode": "PACK65",
    "inStock": true,
    "sku": "SPORTS-BAG-PACK-65",
    "tags": [
      "sports",
      "backpack",
      "trail",
      "gear"
    ],
    "trending": false,
    "featured": true,
    "clicks": 210,
    "conversions": 42,
    "pros": [
      "Immense room for sleeping bags",
      "Remarkably comfortable hip pads reduce fatigue",
      "Highly secure lock harnesses"
    ],
    "cons": [
      "Comes in bulk packaging (no custom decorative gift case)",
      "Weight feels substantial when empty (1.4kg)"
    ],
    "reviews": [],
    "createdAt": "2026-06-04T08:00:00.000Z"
  },
  {
    "_id": "665a0002bc93ef2d8c000025",
    "name": "High-Precision Ergonomic Mouse",
    "slug": "high-precision-ergonomic-mouse",
    "description": "Ergonomic vertical wireless mouse designed to reduce wrist stress.",
    "longDescription": "Reduce workflow tension using our High-Precision Ergonomic Mouse. Offers a neutral handshake angle of 57 degrees, 4000 DPI adjustable optical cursor precision, and dual wireless modes.",
    "category": "665a0001bc93ef2d8c000001",
    "brand": "TechBrand",
    "price": 59.99,
    "originalPrice": 69.99,
    "discount": 14,
    "images": [
      "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=850"
    ],
    "features": [
      "57-Degree Ergonomic Lift",
      "High Optical Tracking Precision",
      "Silent Click Technology",
      "Bluetooth & Logi Bolt wireless combo"
    ],
    "specifications": {
      "Battery Type": "Rechargeable internal battery",
      "Charge Port": "Modern USB-C charging",
      "DPI Metric": "400 to 4000 fully adjustable",
      "Buttons count": "6 customizable switches"
    },
    "rating": 4.5,
    "totalReviews": 82,
    "affiliateLink": "https://amazon.com/dp/B000EXAMPLE25",
    "affiliateCode": "MOUSE002",
    "inStock": true,
    "sku": "TECH-ERGO-MOUSE-W",
    "tags": [
      "electronics",
      "mouse",
      "ergonomics",
      "office"
    ],
    "trending": false,
    "featured": false,
    "clicks": 115,
    "conversions": 22,
    "pros": [
      "Instant wrist fatigue relief",
      "Battery lasts up to 4 months on single charge",
      "Clicks are remarkably quiet"
    ],
    "cons": [
      "Requires a day or two to adapt to vertical grip",
      "Left-handed models require custom separate catalog order"
    ],
    "reviews": [],
    "createdAt": "2026-06-05T09:00:00.000Z"
  },
  {
    "_id": "665a0002bc93ef2d8c000026",
    "name": "Polarized Classic Sunglasses",
    "slug": "polarized-classic-sunglasses",
    "description": "Shatterproof polarization shades with UV400 maximum outdoor protection.",
    "longDescription": "Shield your vision with our Polarized Classic Sunglasses. Hand-polished acetate frames pair elegantly with triacetate cellulose lenses to block glare during driving or beach sessions.",
    "category": "665a0001bc93ef2d8c000002",
    "brand": "ClassicGoods",
    "price": 49.99,
    "originalPrice": 64.99,
    "discount": 23,
    "images": [
      "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=850"
    ],
    "features": [
      "Premium Polarized TAC Lenses",
      "UV400 Solar Ray Shielding",
      "Featherweight Acetate frame",
      "Corrosion-resistant steel hinge joints"
    ],
    "specifications": {
      "Lens category": "Shatterproof TAC Polarized",
      "Frame Material": "Handmade Gloss Acetate",
      "Bridge Width": "18mm standard nose spacing",
      "Temple length": "145mm fits most head styles"
    },
    "rating": 4.5,
    "totalReviews": 59,
    "affiliateLink": "https://amazon.com/dp/B000EXAMPLE26",
    "affiliateCode": "GLASSES01",
    "inStock": true,
    "sku": "FASH-GLASS-POL-01",
    "tags": [
      "fashion",
      "sunglasses",
      "eyewear",
      "summer"
    ],
    "trending": false,
    "featured": false,
    "clicks": 90,
    "conversions": 16,
    "pros": [
      "Drastically reduces snow & water glare reflections",
      "Extremely light on nose bridge",
      "Includes real high-grade fiber pouch"
    ],
    "cons": [
      "Cannot be worn directly at night",
      "May cause slight rainbow visual noise on gas station LCD monitors"
    ],
    "reviews": [],
    "createdAt": "2026-06-05T16:00:00.000Z",
    "trendingStartedAt": "2026-06-05T16:00:00.000Z"
  },
  {
    "_id": "665a0002bc93ef2d8c000027",
    "name": "Non-Stick Ceramic Frying Pan",
    "slug": "non-stick-ceramic-frying-pan",
    "description": "Heavy-gauge ceramic skillet free of toxic PFAS and engineered for safety.",
    "longDescription": "Elevate your morning frying with our Non-Stick Ceramic Frying Pan. Features a heavy-gauge hard-anodized aluminum base that prevents hot spots, and a hard ceramic coating that permits healthy cooking with minimal oil.",
    "category": "665a0001bc93ef2d8c000003",
    "brand": "ClassicGoods",
    "price": 39.99,
    "originalPrice": 49.99,
    "discount": 20,
    "images": [
      "https://images.unsplash.com/photo-1543083477-4f7f010a6675?w=850"
    ],
    "features": [
      "PFAS / PFOA-Free Ceramic",
      "Tri-ply heat conduction",
      "Scratch-resistant matrix",
      "Riveted cold-touch steel handle"
    ],
    "specifications": {
      "Diameter": "10 Inches sizing",
      "Base Tech": "Induction-ready magnetic ring",
      "Oven Limit": "Up to 450 degrees Fahrenheit safety",
      "Thickness": "3.5mm thick build"
    },
    "rating": 4.3,
    "totalReviews": 64,
    "affiliateLink": "https://amazon.com/dp/B000EXAMPLE27",
    "affiliateCode": "PAN01",
    "inStock": true,
    "sku": "HOME-PAN-CER-10",
    "tags": [
      "home-garden",
      "kitchen",
      "cookware",
      "pan"
    ],
    "trending": false,
    "featured": false,
    "clicks": 73,
    "conversions": 11,
    "pros": [
      "Food slides off with zero scrubbing",
      "Zero chemical composite outgassing",
      "Heats evenly on gas or induction"
    ],
    "cons": [
      "Avoid metal utensils to keep cooking coating pristine",
      "Dishwasher is OK but manual gentle wash preserves lifespan best"
    ],
    "reviews": [],
    "createdAt": "2026-06-06T11:00:00.000Z"
  },
  {
    "_id": "665a0002bc93ef2d8c000028",
    "name": "Adjustable Yoga Foam Block Roller",
    "slug": "adjustable-yoga-foam-block-roller",
    "description": "High-density EVA foam block and roller set for deep muscle recovery.",
    "longDescription": "Soothe your muscle aches after heavy gym sessions with the Adjustable Yoga Foam Block Roller. Includes physical massage grids, custom density EVA material, and lightweight durability.",
    "category": "665a0001bc93ef2d8c000004",
    "brand": "SportGear",
    "price": 24.99,
    "originalPrice": 29.99,
    "discount": 16,
    "images": [
      "https://images.unsplash.com/photo-1600881333168-2ef49b341f30?w=850"
    ],
    "features": [
      "Anti-bacterial EVA matrix",
      "3-in-1 space saver bundle",
      "Deep-kneading textured grid",
      "350 lbs maximum load support"
    ],
    "specifications": {
      "Inner Core": "Reinforced solid PVC pipe",
      "Foam tech": "High density closed-cell EVA",
      "Width Dimension": "13 Inches roller profile",
      "Weight Capacity": "Tested for heavy loads"
    },
    "rating": 4.6,
    "totalReviews": 50,
    "affiliateLink": "https://amazon.com/dp/B000EXAMPLE28",
    "affiliateCode": "ROLLER01",
    "inStock": true,
    "sku": "SPORTS-ROLLER-EVA-01",
    "tags": [
      "sports",
      "yoga",
      "fitness",
      "therapy"
    ],
    "trending": false,
    "featured": false,
    "clicks": 82,
    "conversions": 13,
    "pros": [
      "Perfect back spine alignment cracking",
      "Easily washable with simple wet wipes",
      "Very durable inner support pipe"
    ],
    "cons": [
      "Texturing feels very stiff initially on sore muscles",
      "Bright color scheme shows dirt quickly if used outdoors"
    ],
    "reviews": [],
    "createdAt": "2026-06-06T15:00:00.000Z"
  },
  {
    "_id": "665a0002bc93ef2d8c000029",
    "name": "ANC In-Ear Wireless Earbuds",
    "slug": "anc-in-ear-wireless-earbuds",
    "description": "Waterproof smart active noise-canceling in-ear Bluetooth buds.",
    "longDescription": "Enjoy your gym soundtracks with our high-grade ANC In-Ear Wireless Earbuds. Features robust IPX7 sweat-resistant sealing, smart gesture control pads, deep bass audio drivers, and rapid wireless case charging.",
    "category": "665a0001bc93ef2d8c000001",
    "brand": "AudioPro",
    "price": 89.99,
    "originalPrice": 109.99,
    "discount": 18,
    "images": [
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=850"
    ],
    "features": [
      "IPX7 Absolute Waterproofing",
      "Adaptive ANC & Hear-Through Modes",
      "Dual microphones for clear calling",
      "6 hours bud battery, 24 hours total charging box"
    ],
    "specifications": {
      "Waterproofing": "IPX7 certified rain & sweat shield",
      "Bluetooth spec": "Latest Low Energy Bluetooth 5.3",
      "Drivers": "8mm Custom Carbon Nanotube dynamic",
      "Charging": "Rapid Qi wireless charging support"
    },
    "rating": 4.4,
    "totalReviews": 99,
    "affiliateLink": "https://amazon.com/dp/B000EXAMPLE29",
    "affiliateCode": "BUDS001",
    "inStock": true,
    "sku": "AUDIO-EAR-BUDS-X7",
    "tags": [
      "electronics",
      "audio",
      "wireless",
      "earbud"
    ],
    "trending": false,
    "featured": true,
    "clicks": 252,
    "conversions": 43,
    "pros": [
      "Excellent sweat resilience in gym sessions",
      "Snug custom fit tips do not loosen",
      "Punchy performance acoustics"
    ],
    "cons": [
      "Touch gestures are sometimes sensitive to wet hair strands",
      "Equalizer software requires profile registration login"
    ],
    "reviews": [],
    "createdAt": "2026-06-07T10:00:00.000Z",
    "trendingStartedAt": "2026-06-07T10:00:00.000Z"
  },
  {
    "_id": "665a0002bc93ef2d8c000030",
    "name": "Classic Oxford Cotton Shirt",
    "slug": "classic-oxford-cotton-shirt",
    "description": "Elegant premium breathable woven shirt for semi-formal dinners.",
    "longDescription": "Refine your wardrobe with the Classic Oxford Cotton Shirt. Cut from 100% fine long-staple organic cotton yarn, featuring double-needle stitch seams, an elegant modern collar, and high durability buttons.",
    "category": "665a0001bc93ef2d8c000002",
    "brand": "ClassicGoods",
    "price": 54.99,
    "originalPrice": 69.99,
    "discount": 21,
    "images": [
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=850"
    ],
    "features": [
      "100% Cotton Organic Yarn",
      "Charming Semi-Slim tailoring",
      "Natural premium horn details",
      "Breathable high-density weave"
    ],
    "specifications": {
      "Fabric tech": "Long-staple double-ply Oxford weave",
      "Cut Fit": "Standard modern semi-slim",
      "Sizes": "S, M, L, XL, XXL",
      "Care Guide": "Machine cold wash recommended"
    },
    "rating": 4.3,
    "totalReviews": 45,
    "affiliateLink": "https://amazon.com/dp/B000EXAMPLE30",
    "affiliateCode": "SHIRT01",
    "inStock": true,
    "sku": "FASH-SHIRT-OXF-01",
    "tags": [
      "fashion",
      "clothing",
      "menswear",
      "classic"
    ],
    "trending": false,
    "featured": false,
    "clicks": 58,
    "conversions": 8,
    "pros": [
      "Fabric softens gracefully over multiple cycles",
      "Very robust seams do not fray or unravel",
      "Looks polished tucked or untucked"
    ],
    "cons": [
      "Requires gentle ironing to remove typical storage creases",
      "May shrink slightly if hot heat-dried"
    ],
    "reviews": [],
    "createdAt": "2026-06-07T14:00:00.000Z"
  },
  {
    "_id": "665a0002bc93ef2d8c000031",
    "name": "Stainless Steel Espresso Maker",
    "slug": "stainless-steel-espresso-maker",
    "description": "Double-walled premium mechanical moka pot for high espresso extracts.",
    "longDescription": "Brew rich coffee extracts using the Stainless Steel Espresso Maker. Designed with thick food-grade stainless steel housings, visual copper pressure safety valves, and high-quality cold-feel plastic handles.",
    "category": "665a0001bc93ef2d8c000003",
    "brand": "ClassicGoods",
    "price": 49.99,
    "originalPrice": 59.99,
    "discount": 16,
    "images": [
      "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=850"
    ],
    "features": [
      "Professional Food-grade 18/8 Steel",
      "Leak-proof safety valves",
      "Compatible on gas, electric, and induction",
      "Dense mesh filtering"
    ],
    "specifications": {
      "Extract volume": "6 espresso demitasse cups",
      "Steel alloy": "Dual-ply 304 food-grade stainless",
      "Height profile": "21cm kitchen showcase",
      "Filter mesh": "Double micro-pore stainless sieve"
    },
    "rating": 4.7,
    "totalReviews": 73,
    "affiliateLink": "https://amazon.com/dp/B000EXAMPLE31",
    "affiliateCode": "COFFEE01",
    "inStock": true,
    "sku": "HOME-COFFEE-MOKA-06",
    "tags": [
      "home-garden",
      "kitchen",
      "coffee",
      "maker"
    ],
    "trending": false,
    "featured": true,
    "clicks": 165,
    "conversions": 31,
    "pros": [
      "Extracts a remarkably thick, chocolatey espresso cream",
      "Super easy to disassemble and rinse without complexity",
      "Will not rust over decades"
    ],
    "cons": [
      "Handle can warm slightly if centered over open gas flame",
      "Requires extra-fine espresso grounds for ideal pressure build"
    ],
    "reviews": [],
    "createdAt": "2026-06-07T16:00:00.000Z",
    "trendingStartedAt": "2026-06-07T16:00:00.000Z"
  },
  {
    "_id": "665a0002bc93ef2d8c000032",
    "name": "Adjustable Heavy Dumbbell Set",
    "slug": "adjustable-heavy-dumbbell-set",
    "description": "Steel adjustable dial weight hand dumbbell set for home gym workouts.",
    "longDescription": "Optimize space inside your health setup with the Adjustable Heavy Dumbbell Set. Instantly switch weight from 5 lbs up to 52.5 lbs using a fast turn-of-a-dial selector lock.",
    "category": "665a0001bc93ef2d8c000004",
    "brand": "SportGear",
    "price": 199.99,
    "originalPrice": 249.99,
    "discount": 20,
    "images": [
      "https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=850"
    ],
    "features": [
      "Dial Weight Selector Indexing",
      "Includes space-saving storage trays",
      "Soft slip-proof rubber handles",
      "Interconnected durable safety plate lock"
    ],
    "specifications": {
      "Weight Range": "5 lbs to 52.5 lbs per hand",
      "Plate material": "Thick powder coated heavy cast iron",
      "Dial Increments": "2.5 lbs fine-tuned changes",
      "Grip technology": "Curved stainless steel wrap-around"
    },
    "rating": 4.8,
    "totalReviews": 134,
    "affiliateLink": "https://amazon.com/dp/B000EXAMPLE32",
    "affiliateCode": "DUMBBELL02",
    "inStock": true,
    "sku": "SPORTS-DB-DIAL-52",
    "tags": [
      "sports",
      "fitness",
      "dumbbell",
      "weights"
    ],
    "trending": false,
    "featured": true,
    "clicks": 288,
    "conversions": 52,
    "pros": [
      "Replaces up to 15 separate pairs of weights",
      "Durable plates do not rattle or clang during lifts",
      "Extremely tight safety lock mechanism"
    ],
    "cons": [
      "Sold as a single dumbbell (requires quantity 2 for a full pair)",
      "Size footprint is wider than non-adjustable dumbbells"
    ],
    "reviews": [],
    "createdAt": "2026-06-08T08:00:00.000Z",
    "trendingStartedAt": "2026-06-08T08:00:00.000Z"
  },
  {
    "_id": "665a0002bc93ef2d8c000033",
    "name": "Bluetooth Smart Blood Scale",
    "slug": "bluetooth-smart-blood-scale",
    "description": "Smart body weight and composition analyzer scale with automatic app sync.",
    "longDescription": "Track your healthy milestones with our Bluetooth Smart scale. Employs 4 high-precision metal bio-impedance sensors to map weight, BMI, body fat ratio, muscle density, water ratio, and bone weight directly to your device.",
    "category": "665a0001bc93ef2d8c000001",
    "brand": "TechBrand",
    "price": 39.99,
    "originalPrice": 49.99,
    "discount": 20,
    "images": [
      "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=850"
    ],
    "features": [
      "13 Crucial Body Markers",
      "Polished safety tempered glass base",
      "Accommodates up to 8 user profiles on sync",
      "Full integration with Apple Health & Fitbit"
    ],
    "specifications": {
      "Scale accuracy": "Sensors measure down to 0.1 lbs precision",
      "Battery specs": "3 Standard AAA batteries included",
      "Glass strength": "6mm thick impact-resistant tempered",
      "Connection mode": "Auto-pairing BLE 5.0"
    },
    "rating": 4.5,
    "totalReviews": 65,
    "affiliateLink": "https://amazon.com/dp/B000EXAMPLE33",
    "affiliateCode": "SCALE01",
    "inStock": true,
    "sku": "TECH-SCALE-BLE",
    "tags": [
      "electronics",
      "fitness",
      "scale",
      "sensor"
    ],
    "trending": false,
    "featured": false,
    "clicks": 95,
    "conversions": 15,
    "pros": [
      "Beautiful clear high-contrast white LED display",
      "Instant automatic app syncing without manual clicks",
      "Allows export of monthly weight graphs to CSV"
    ],
    "cons": [
      "Requires bare dry feet for fat measurement metrics",
      "Not suitable for individuals with active electronic pacemakers"
    ],
    "reviews": [],
    "createdAt": "2026-06-08T10:00:00.000Z"
  },
  {
    "_id": "665a0002bc93ef2d8c000034",
    "name": "Heavy-Duty Kitchen Blender",
    "slug": "heavy-duty-kitchen-blender",
    "description": "Professional high-speed countertop blender with pulse control.",
    "longDescription": "Crush ice and fibrous vegetables with the Heavy-Duty Kitchen Blender. Features a 1400W pure copper motor, 6 aircraft-grade laser-cut steel blades, and variable intuitive speed dials for smoothies or soup preparations.",
    "category": "665a0001bc93ef2d8c000003",
    "brand": "TechBrand",
    "price": 129.99,
    "originalPrice": 159.99,
    "discount": 18,
    "images": [
      "https://images.unsplash.com/photo-1578643463396-0997cb5328c1?w=850"
    ],
    "features": [
      "1400 Watts peak power",
      "Aircraft-grade Stainless Steel Blades",
      "64 oz BPA-free heavy pitcher container",
      "Auto-clean cycle self blend"
    ],
    "specifications": {
      "Motor construction": "100% thick thermal copper coil",
      "RPM scale": "Up to 28000 rotations/min",
      "Pitcher Capacity": "64 oz container with measurement indicators",
      "Protection limits": "Dual automatic thermal defense sensors"
    },
    "rating": 4.6,
    "totalReviews": 84,
    "affiliateLink": "https://amazon.com/dp/B000EXAMPLE34",
    "affiliateCode": "BLENDER01",
    "inStock": true,
    "sku": "HOME-BLEND-PRO-14",
    "tags": [
      "home-garden",
      "kitchen",
      "blender",
      "smoothie"
    ],
    "trending": false,
    "featured": true,
    "clicks": 132,
    "conversions": 25,
    "pros": [
      "Crushes ice cubes to snow in 5 seconds flat",
      "Extremely solid heavy base won't slide",
      "Automatic cleaning mode works very well"
    ],
    "cons": [
      "Decibel level is loud at highest setting",
      "Will not fit under extra-low cabinet heights"
    ],
    "reviews": [],
    "createdAt": "2026-06-08T12:00:00.000Z"
  },
  {
    "_id": "665a0002bc93ef2d8c000035",
    "name": "Adjustable Ergonomic Gaming Desk",
    "slug": "adjustable-ergonomic-gaming-desk",
    "description": "Ergonomic gaming desk with cup holder and clean headphone hook accessories.",
    "longDescription": "Upgrade your desk battling station with the Adjustable Ergonomic Gaming Desk. Employs a dense steel frame supporting heavy set rigs, textured wrap-around carbon fiber surfaces, a clean controller stand, cup holder, and a side hook for headphones.",
    "category": "665a0001bc93ef2d8c000001",
    "brand": "SportGear",
    "price": 149.99,
    "originalPrice": 189.99,
    "discount": 21,
    "images": [
      "https://images.unsplash.com/photo-1598550476439-6847785fce6e?w=850"
    ],
    "features": [
      "Textured Carbon Fiber table",
      "Side Headphone hook & Drink holder",
      "T-shaped reinforced steel legs",
      "Dual grommet cord channels"
    ],
    "specifications": {
      "Leg frame": "High grade industrial carbon steel",
      "Max weight support": "Holds up to 220 lbs load safety",
      "Surface size": "44 Inches length, 24 Inches depth",
      "Covering type": "Splashproof carbon fiber layer"
    },
    "rating": 4.6,
    "totalReviews": 72,
    "affiliateLink": "https://amazon.com/dp/B000EXAMPLE35",
    "affiliateCode": "DESK01",
    "inStock": true,
    "sku": "TECH-DESK-GAMER-44",
    "tags": [
      "electronics",
      "desk",
      "gaming",
      "furniture"
    ],
    "trending": false,
    "featured": false,
    "clicks": 108,
    "conversions": 19,
    "pros": [
      "Textured carbon surface is completely splashproof",
      "Zero wobble layout framing keeps dual monitors safe",
      "Integrated cup holder prevents dangerous spills"
    ],
    "cons": [
      "Takes approximately 45 minutes to assemble",
      "Surface shows fingerprints over continuous use"
    ],
    "reviews": [],
    "createdAt": "2026-06-08T13:00:00.000Z",
    "trendingStartedAt": "2026-06-08T13:00:00.000Z"
  }
];

export const seedBlogs = [
  {
    _id: "665a0005bc93ef2d8c000050",
    title: 'Top 5 Wireless ANC Headphones to Consider in 2026',
    slug: 'top-5-wireless-headphones-2026',
    content: 'In this comprehensive electronics guide, we review and break down the top 5 high-fidelity wireless headphones available on the market today. Hybrid active noise cancellation technology has democratized, making it possible to acquire premium room silencing without paying luxury price markups. Brand offerings like AudioPro feature spectacular 30 hours smart battery playback, personalized hearing EQ profiles, and high definition calling microphones ideal for work from home scenarios.',
    excerpt: 'Discover the top-performing silence-inducing wireless headphones of 2026. Compare battery lifespans, bass outputs, and smart codecs.',
    featured_image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    author: 'John Tech',
    category: 'Electronics',
    tags: ['headphones', 'audio', 'wireless', 'deals'],
    views: 1234,
    published: true,
    seoTitle: 'Top 5 Silence-Inducing ANC Wireless Headphones 2026',
    seoDescription: 'Find your absolute ideal headphones for working, sleeping, or flying with detailed sound stage analysis.',
    seoKeywords: ['headphones guide', 'audio fidelity', 'best gadget sales'],
    createdAt: new Date("2026-05-27")
  },
  {
    _id: "665a0005bc93ef2d8c000051",
    title: 'How to Choose Your Perfect Adventure Trail Running Shoes',
    slug: 'how-to-choose-right-running-shoes',
    content: 'Selecting appropriate outdoor sports shoes represents the single most important choice for your performance and knee preservation. Your shoe profile dictates shock deflection indices and general ankle stability. Understanding pronation tendencies, trail wetness, and rubber lug depth can prevent accidental slips. Learn the exact differences between road flats and trail grip lugs inside this in-depth manual.',
    excerpt: 'Step outdoor with absolute confidence. Discover sizing secrets, wet track grip analysis, and joint protection cushioning.',
    featured_image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
    author: 'Sarah Sports',
    category: 'Sports',
    tags: ['running', 'shoes', 'fitness', 'outdoor'],
    views: 856,
    published: true,
    seoTitle: 'Professional Trail Running Shoe Selection Guide',
    seoDescription: 'Durable composite mesh, traction rubber soles, and arch support parameters demystified.',
    seoKeywords: ['trail shoes', 'marathon equipment', 'pronation support'],
    createdAt: new Date("2026-05-28")
  }
];

export const seedUsers: LocalUserType[] = [
  {
    _id: "665a0006bc93ef2d8c000060",
    email: 'admin@affiliate.com',
    password: 'adminSecretPass',
    name: 'Admin Strator',
    role: 'user',
    wishlist: [] as any[],
    recentlyViewed: [] as any[],
    district: 'Chennai',
    createdAt: new Date()
  },
  {
    _id: "665a0006bc93ef2d8c000061",
    email: 'tester@example.com',
    password: 'securePassword123',
    name: 'API Tester',
    role: 'user',
    wishlist: [] as any[],
    recentlyViewed: [] as any[],
    district: 'Chennai',
    createdAt: new Date()
  }
];

export const seedMessages = [
  {
    _id: "665a0007bc93ef2d8c000070",
    name: 'Jane Tester',
    email: 'jane@example.com',
    phone: '+1 555-0199',
    subject: 'Affiliate Collaboration Invitation',
    message: 'Hello! We represent a high-end luxury audio manufacturer and would love to propose listing our spatial sound systems on your curated tech portal. Please share your commission guidelines!',
    read: false,
    createdAt: new Date("2026-05-29")
  }
];
