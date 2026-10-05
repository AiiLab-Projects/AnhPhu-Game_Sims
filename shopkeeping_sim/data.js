// Items, Upgrades, Staff, Marketing, and Random Events Database

const GAME_ITEMS = [
  // Đồ uống (Drink)
  {
    id: 'drink_water',
    name: 'Nước Suối Tinh Khiết',
    category: 'drink',
    icon: '💧',
    baseCost: 5000,
    basePrice: 8000,
    maxPerShelf: 20,
    description: 'Nước uống giải khát cơ bản cho mọi người.',
    popularity: 1.2
  },
  {
    id: 'drink_soda',
    name: 'Nước Ngọt Có Ga',
    category: 'drink',
    icon: '🥤',
    baseCost: 8000,
    basePrice: 12000,
    maxPerShelf: 16,
    description: 'Hương vị thơm ngon sảng khoái, giới trẻ rất chuộng.',
    popularity: 1.1
  },
  {
    id: 'drink_milktea',
    name: 'Trà Sữa Trân Châu',
    category: 'drink',
    icon: '🧋',
    baseCost: 15000,
    basePrice: 25000,
    maxPerShelf: 12,
    description: 'Trà sữa ngọt ngào béo ngậy, học sinh sinh viên mê tít.',
    popularity: 1.3
  },
  {
    id: 'drink_coffee',
    name: 'Cà Phê Sữa Lon',
    category: 'drink',
    icon: '☕',
    baseCost: 12000,
    basePrice: 18000,
    maxPerShelf: 15,
    description: 'Cứu tinh tỉnh táo buổi sáng cho dân văn phòng.',
    popularity: 1.0
  },

  // Bánh kẹo & Snack (Snack)
  {
    id: 'snack_chips',
    name: 'Snack Khoai Tây Giòn',
    category: 'snack',
    icon: '🥔',
    baseCost: 7000,
    basePrice: 12000,
    maxPerShelf: 15,
    description: 'Snack khoai tây lát mỏng giòn rụm vị phô mai.',
    popularity: 1.15
  },
  {
    id: 'snack_cookies',
    name: 'Bánh Quy Bơ Hoàng Gia',
    category: 'snack',
    icon: '🍪',
    baseCost: 18000,
    basePrice: 28000,
    maxPerShelf: 12,
    description: 'Hộp bánh quy bơ thơm phức cao cấp.',
    popularity: 0.95
  },
  {
    id: 'snack_gummy',
    name: 'Kẹo Dẻo Trái Cây',
    category: 'snack',
    icon: '🍬',
    baseCost: 6000,
    basePrice: 10000,
    maxPerShelf: 20,
    description: 'Kẹo dẻo hoa quả chua ngọt trẻ em rất thích.',
    popularity: 1.1
  },
  {
    id: 'snack_chocolate',
    name: 'Chocolate Hạnh Nhân',
    category: 'snack',
    icon: '🍫',
    baseCost: 25000,
    basePrice: 42000,
    maxPerShelf: 10,
    description: 'Socola đen nguyên chất mix hạt hạnh nhân giòn.',
    popularity: 0.85
  },

  // Đồ ăn nhanh & Mì gói (Food)
  {
    id: 'food_noodles',
    name: 'Mì Ly Cay Hàn Quốc',
    category: 'food',
    icon: '🍜',
    baseCost: 10000,
    basePrice: 16000,
    maxPerShelf: 18,
    description: 'Mì cốc ăn liền thơm cay đậm đà, bán siêu chạy.',
    popularity: 1.25
  },
  {
    id: 'food_sandwich',
    name: 'Bánh Mì Tam Giác',
    category: 'food',
    icon: '🥪',
    baseCost: 14000,
    basePrice: 22000,
    maxPerShelf: 12,
    description: 'Bánh mì sandwich kẹp jambon trứng phô mai tươi ngon.',
    popularity: 1.05
  },
  {
    id: 'food_sausage',
    name: 'Xúc Xích Nướng Phô Mai',
    category: 'food',
    icon: '🌭',
    baseCost: 11000,
    basePrice: 18000,
    maxPerShelf: 15,
    description: 'Xúc xích xiên que béo ngậy tiện lợi.',
    popularity: 1.1
  },
  {
    id: 'food_onigiri',
    name: 'Cơm Nắm Cá Hồi',
    category: 'food',
    icon: '🍙',
    baseCost: 12000,
    basePrice: 20000,
    maxPerShelf: 14,
    description: 'Cơm nắm tam giác rong biển giòn nhân sốt mayonnaise.',
    popularity: 1.15
  },

  // Nhu yếu phẩm (Daily)
  {
    id: 'daily_tissue',
    name: 'Khăn Giấy Lụa Cao Cấp',
    category: 'daily',
    icon: '🧻',
    baseCost: 12000,
    basePrice: 20000,
    maxPerShelf: 15,
    description: 'Khăn giấy mềm mịn dùng trong gia đình.',
    popularity: 0.9
  },
  {
    id: 'daily_soap',
    name: 'Sữa Tắm Thảo Mộc',
    category: 'daily',
    icon: '🧴',
    baseCost: 45000,
    basePrice: 70000,
    maxPerShelf: 8,
    description: 'Chăm sóc da hương hoa dịu mát.',
    popularity: 0.8
  },
  {
    id: 'daily_battery',
    name: 'Vỉ Pin Siêu Năng Lượng',
    category: 'daily',
    icon: '🔋',
    baseCost: 22000,
    basePrice: 35000,
    maxPerShelf: 12,
    description: 'Pin tiểu kiềm bền bỉ cho đồ gia dụng.',
    popularity: 0.75
  },

  // Hàng điện tử mini (Tech)
  {
    id: 'tech_earphone',
    name: 'Tai Nghe Bluetooth TWS',
    category: 'tech',
    icon: '🎧',
    baseCost: 95000,
    basePrice: 160000,
    maxPerShelf: 6,
    description: 'Tai nghe không dây chống ồn mini giá cực hời.',
    popularity: 0.65
  },
  {
    id: 'tech_powerbank',
    name: 'Sạc Dự Phòng 10000mAh',
    category: 'tech',
    icon: '⚡',
    baseCost: 140000,
    basePrice: 240000,
    maxPerShelf: 5,
    description: 'Pin sạc nhanh tiện lợi đi du lịch.',
    popularity: 0.6
  }
];

// Customer Archetypes & Behavior
const CUSTOMER_TYPES = [
  {
    type: 'student',
    name: 'Học sinh / Sinh viên',
    emoji: '🎒',
    color: '#38bdf8',
    budgetMultiplier: 0.85,
    priceSensitivity: 1.4, // very sensitive to overpriced items
    preferredCategories: ['drink', 'snack', 'food'],
    speed: 1.3,
    patience: 18, // seconds
    buyCount: [1, 3],
    tipChance: 0.15,
    tipRange: [2000, 5000]
  },
  {
    type: 'office',
    name: 'Dân văn phòng',
    emoji: '💼',
    color: '#818cf8',
    budgetMultiplier: 1.3,
    priceSensitivity: 0.9,
    preferredCategories: ['drink', 'food', 'daily'],
    speed: 1.5,
    patience: 14,
    buyCount: [1, 2],
    tipChance: 0.30,
    tipRange: [5000, 15000]
  },
  {
    type: 'housewife',
    name: 'Bà nội trợ',
    emoji: '🧺',
    color: '#fb923c',
    budgetMultiplier: 1.5,
    priceSensitivity: 1.2,
    preferredCategories: ['daily', 'food', 'snack'],
    speed: 1.0,
    patience: 25,
    buyCount: [2, 5],
    tipChance: 0.25,
    tipRange: [5000, 20000]
  },
  {
    type: 'vip',
    name: 'Đại gia / Khách VIP',
    emoji: '👑',
    color: '#fbbf24',
    budgetMultiplier: 3.5,
    priceSensitivity: 0.4, // buys almost anything even if expensive
    preferredCategories: ['tech', 'snack', 'drink', 'daily'],
    speed: 1.1,
    patience: 20,
    buyCount: [2, 6],
    tipChance: 0.80,
    tipRange: [25000, 100000]
  },
  {
    type: 'tiktoker',
    name: 'Tiktoker Reviewer',
    emoji: '📱',
    color: '#f43f5e',
    budgetMultiplier: 1.6,
    priceSensitivity: 0.8,
    preferredCategories: ['drink', 'snack', 'tech'],
    speed: 1.2,
    patience: 16,
    buyCount: [1, 3],
    bonusRep: 5, // gives big reputation if served happily
    tipChance: 0.65,
    tipRange: [15000, 50000]
  },
  {
    type: 'thief',
    name: 'Kẻ trộm vặt',
    emoji: '🥷',
    color: '#ef4444',
    isSpecial: true,
    speed: 1.6,
    patience: 10,
    tipChance: 0,
    tipRange: [0, 0]
  }
];

// Store Upgrades
const STORE_UPGRADES = [
  {
    id: 'shelf_expand_1',
    name: 'Thêm Kệ Trưng Bày 4 & 5',
    category: 'space',
    icon: '🛒',
    cost: 400000,
    requiredLevel: 1,
    description: 'Lắp thêm 2 kệ hàng mới để bày được nhiều loại sản phẩm hơn cùng lúc.',
    effect: 'Tăng tổng số kệ lên 5'
  },
  {
    id: 'shelf_expand_2',
    name: 'Thêm Kệ Trưng Bày 6 & 7',
    category: 'space',
    icon: '🛒',
    cost: 1200000,
    requiredLevel: 2,
    description: 'Nâng cấp dãy kệ đôi sang trọng, tăng thêm 2 kệ trưng bày.',
    effect: 'Tăng tổng số kệ lên 7'
  },
  {
    id: 'shelf_expand_3',
    name: 'Khu Trưng Bày Đẳng Cấp (Kệ 8, 9, 10)',
    category: 'space',
    icon: '🛒',
    cost: 3000000,
    requiredLevel: 3,
    description: 'Biến tiệm thành đại siêu thị với tối đa 10 kệ hàng!',
    effect: 'Tăng tổng số kệ lên 10'
  },
  {
    id: 'warehouse_1',
    name: 'Mở Rộng Nhà Kho Cấp 1',
    category: 'warehouse',
    icon: '📦',
    cost: 300000,
    requiredLevel: 1,
    description: 'Xếp lại kho bãi, lắp thêm giá để hàng chịu lực.',
    effect: 'Sức chứa kho tăng từ 50 lên 120 món'
  },
  {
    id: 'warehouse_2',
    name: 'Mở Rộng Nhà Kho Cấp 2',
    category: 'warehouse',
    icon: '🏬',
    cost: 1000000,
    requiredLevel: 2,
    description: 'Thuê thêm mặt bằng kho phụ phía sau nhà.',
    effect: 'Sức chứa kho tăng lên 300 món'
  },
  {
    id: 'pos_scanner',
    name: 'Máy Quét Mã Vạch Siêu Tốc',
    category: 'pos',
    icon: '📟',
    cost: 350000,
    requiredLevel: 1,
    description: 'Máy tính tiền laser quét cực nhạy, giảm thời gian thanh toán 50%.',
    effect: 'Tăng gấp đôi tốc độ thanh toán tại quầy'
  },
  {
    id: 'air_conditioner',
    name: 'Hệ Thống Điều Hòa Không Khí',
    category: 'decor',
    icon: '❄️',
    cost: 600000,
    requiredLevel: 1,
    description: 'Cửa hàng luôn mát rượi 24°C, khách kiên nhẫn hơn 40% và mua nhiều hơn.',
    effect: 'Tăng độ kiên nhẫn và sức mua của khách'
  },
  {
    id: 'maneki_neko',
    name: 'Mèo Thần Tài Phong Thủy May Mắn',
    category: 'decor',
    icon: '🐱',
    cost: 500000,
    requiredLevel: 1,
    description: 'Mèo vẫy tay mạ vàng chiêu tài hút lộc, tăng 25% tỷ lệ khách VIP ghé tiệm.',
    effect: '+25% tỷ lệ xuất hiện khách VIP'
  },
  {
    id: 'tip_jar',
    name: 'Hũ Tiền Tip May Mắn (Gốm Bát Tràng)',
    category: 'decor',
    icon: '🏺',
    cost: 450000,
    requiredLevel: 1,
    description: 'Hũ gốm phong thủy đặt ngay cạnh máy tính tiền, khuyến khích khách hàng vui vẻ boa thêm tiền tip hào phóng!',
    effect: '+50% tỷ lệ khách boa Tip & Tăng gấp đôi tiền Tip'
  },
  {
    id: 'cctv_security',
    name: 'Hệ Thống Camera & Báo Động',
    category: 'security',
    icon: '📹',
    cost: 800000,
    requiredLevel: 2,
    description: 'Tự động phát hiện kẻ trộm vặt và cảnh báo tức thì, tăng độ uy tín an ninh.',
    effect: 'Báo động trộm tự động & +10 Uy tín'
  }
];

// Staff Types & Hiring
const STAFF_TYPES = [
  {
    id: 'staff_cashier',
    name: 'Thu Ngân Chuyên Nghiệp',
    icon: '👩‍💼',
    hireCost: 250000,
    dailyWage: 80000,
    description: 'Tự động thanh toán cho khách hàng đến quầy, bạn không cần phải click bấm máy tính tiền thủ công!',
    effect: 'Tự động hóa 100% quầy thu ngân'
  },
  {
    id: 'staff_restocker',
    name: 'Nhân Viên Tiếp Hàng (Restocker)',
    icon: '👨‍🔧',
    hireCost: 350000,
    dailyWage: 90000,
    description: 'Tự động mang hàng từ kho bãi lên kệ trưng bày ngay khi kệ bị vơi hoặc hết hàng.',
    effect: 'Tự động hóa việc châm hàng lên kệ'
  },
  {
    id: 'staff_janitor',
    name: 'Lao Công Tận Tụy',
    icon: '🧹',
    hireCost: 200000,
    dailyWage: 60000,
    description: 'Liên tục lau chùi sàn nhà, dọn rác, giữ cho cửa hàng luôn đạt độ sạch sẽ 100%.',
    effect: 'Duy trì vệ sinh cửa hàng mức hoàn hảo'
  },
  {
    id: 'staff_security',
    name: 'Bảo Vệ Đô Con',
    icon: '👮',
    hireCost: 300000,
    dailyWage: 85000,
    description: 'Đứng canh cửa, tự động tóm gọn bất kỳ tên trộm nào và thu hồi 100% hàng bị lấy cắp.',
    effect: 'Triệt tiêu 100% nguy cơ mất trộm'
  }
];

// Marketing Campaigns
const MARKETING_CAMPAIGNS = [
  {
    id: 'mkt_flyers',
    name: 'Phát Tờ Rơi Khu Phố',
    icon: '📄',
    cost: 60000,
    durationDays: 1,
    bonusVisitors: 4,
    description: 'Thuê học sinh phát tờ rơi giảm giá tại các ngã tư gần tiệm.',
    effect: '+4 khách ghé thăm mỗi ngày'
  },
  {
    id: 'mkt_social',
    name: 'Chạy Ads Facebook & TikTok',
    icon: '📱',
    cost: 200000,
    durationDays: 2,
    bonusVisitors: 10,
    bonusRep: 8,
    description: 'Chạy bài quảng cáo hình ảnh đẹp mắt tiếp cận cư dân trong bán kính 3km.',
    effect: '+10 khách/ngày & +8 Uy tín'
  },
  {
    id: 'mkt_influencer',
    name: 'Mời Food Reviewer Nổi Tiếng',
    icon: '🌟',
    cost: 600000,
    durationDays: 3,
    bonusVisitors: 20,
    bonusRep: 18,
    description: 'Food vlogger triệu view quay clip review đồ ăn vặt tại cửa hàng.',
    effect: '+20 khách/ngày, +18 Uy tín & Tăng khách VIP'
  }
];

// Random Events
const RANDOM_EVENTS = [
  {
    id: 'event_heatwave',
    title: 'Đợt Nắng Nóng Kỷ Lục! ☀️',
    icon: '🔥',
    desc: 'Thời tiết ngoài trời lên đến 40°C! Mọi người đổ xô đi tìm đồ uống giải khát.',
    choices: [
      {
        text: 'Nhập gấp nước giải khát & tăng nhẹ giá (Nhu cầu nước x2)',
        action: (state) => {
          state.activeBuffs['boost_drink'] = 1;
          state.log('🔥 Đợt nóng kỷ lục: Nhu cầu nước ngọt, trà sữa tăng gấp đôi!');
        }
      }
    ]
  },
  {
    id: 'event_vip_visit',
    title: 'Đoàn Khách VIP Ghé Thăm! 👑',
    icon: '✨',
    desc: 'Một vị đại gia và bạn bè đang dạo phố và muốn ghé tiệm bạn mua sắm thoải mái.',
    choices: [
      {
        text: 'Nhiệt tình tiếp đón chu đáo (+50.000₫ tiền bo, +5 Uy tín)',
        action: (state) => {
          state.money += 50000;
          state.reputation = Math.min(100, state.reputation + 5);
          state.log('👑 Khách VIP hài lòng và thưởng 50.000₫ tiền bo!');
          gameAudio.playChaChing();
        }
      }
    ]
  },
  {
    id: 'event_inspection',
    title: 'Thanh Tra Vệ Sinh An Toàn Thực Phẩm 📋',
    icon: '🕵️',
    desc: 'Đoàn kiểm tra liên ngành đến kiểm tra độ sạch sẽ và nguồn gốc hàng hóa của cửa hàng.',
    choices: [
      {
        text: 'Mời đoàn vào kiểm tra nghiêm túc',
        action: (state) => {
          if (state.cleanliness >= 80) {
            state.reputation = Math.min(100, state.reputation + 10);
            state.money += 150000;
            state.log('🏆 Cửa hàng đạt chuẩn vệ sinh xuất sắc! Nhận giấy khen và thưởng 150.000₫.');
            gameAudio.playUpgrade();
          } else {
            const fine = 100000;
            state.money = Math.max(0, state.money - fine);
            state.reputation = Math.max(10, state.reputation - 8);
            state.log('⚠️ Cửa hàng chưa đủ sạch sẽ! Bị nhắc nhở và phạt 100.000₫.');
            gameAudio.playAngry();
          }
        }
      }
    ]
  },
  {
    id: 'event_supplier_discount',
    title: 'Nhà Cung Cấp Xả Kho Giảm Giá! 🏷️',
    icon: '🎉',
    desc: 'Nhà phân phối sỉ đang có chương trình flash sale giảm giá 30% toàn bộ mặt hàng hôm nay!',
    choices: [
      {
        text: 'Tuyệt vời! Cơ hội gom hàng giá rẻ',
        action: (state) => {
          state.activeBuffs['market_discount'] = 0.7;
          state.log('🎉 Flash sale: Giá sỉ hôm nay được giảm 30%!');
        }
      }
    ]
  },
  {
    id: 'event_power_outage',
    title: 'Sự Cố Điện Lưới Cục Bộ ⚡',
    icon: '⚠️',
    desc: 'Điện bị chập chờn! Cần gọi thợ sửa chữa gấp để bảo vệ hàng hóa.',
    choices: [
      {
        text: 'Thuê thợ sửa chữa khẩn cấp (Chi phí 80.000₫)',
        action: (state) => {
          state.money = Math.max(0, state.money - 80000);
          state.log('🔧 Đã khắc phục sự cố điện kịp thời!');
        }
      },
      {
        text: 'Tự mày mò sửa (Có nguy cơ hỏng 3 món hàng)',
        action: (state) => {
          let spoiled = 0;
          for (let shelf of state.shelves) {
            if (shelf.quantity > 0 && Math.random() < 0.5) {
              const loss = Math.min(shelf.quantity, 2);
              shelf.quantity -= loss;
              spoiled += loss;
            }
          }
          state.log(`⚡ Sửa chậm khiến ${spoiled} món hàng bị ảnh hưởng chất lượng.`);
        }
      }
    ]
  }
];
