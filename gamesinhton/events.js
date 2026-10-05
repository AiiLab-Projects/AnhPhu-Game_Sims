// Random Events, Encounters, and Story Milestones for Island 30 Days

const SHELTER_LEVELS = [
  { level: 0, name: "Không nơi trú ẩn", icon: "⛺", hpProtect: 0, req: null },
  { level: 1, name: "Lều Lá & Cành Khô", icon: "🏕️", hpProtect: 5, req: { wood: 6, rope: 2 }, desc: "Giảm 50% ảnh hưởng gió lạnh ban đêm." },
  { level: 2, name: "Nhà Chòi Gỗ Cao Ráo", icon: "🛖", hpProtect: 15, req: { wood: 14, stone: 8, rope: 4 }, desc: "Chống chọi tốt với mưa bão nhiệt đới." },
  { level: 3, name: "Nhà Gỗ Kiên Cố Đá Tảng", icon: "🏡", hpProtect: 25, req: { wood: 25, stone: 18, metal: 3 }, desc: "An toàn tuyệt đối trước thú dữ và bão lớn." }
];

const WEATHER_TYPES = [
  { id: 'sunny', name: 'Trời Nắng Đẹp', icon: '☀️', thirstMultiplier: 1.2, bonusWood: 1 },
  { id: 'cloudy', name: 'Nhiều Mây Dịu Mát', icon: '⛅', thirstMultiplier: 1.0, bonusWood: 0 },
  { id: 'rain', name: 'Mưa Nhiệt Đới', icon: '🌧️', thirstMultiplier: 0.8, freeWater: 1 },
  { id: 'storm', name: 'Bão Biển Gầm Thét', icon: '⛈️', thirstMultiplier: 1.0, dangerMultiplier: 1.5 },
  { id: 'heatwave', name: 'Nắng Nóng Gay Gắt', icon: '🔥', thirstMultiplier: 1.6, energyDrain: 1 }
];

// Random Story Encounters triggered during exploration or night sleep
const RANDOM_ENCOUNTERS = [
  {
    id: 'mysterious_chest',
    title: 'Rương Gỗ Cổ Trôi Dạt',
    icon: '📦',
    text: 'Sóng biển dạt vào bờ một chiếc rương bọc đồng đã phủ đầy rong rêu. Ổ khóa bằng sắt đã rỉ sét nặng.',
    choices: [
      {
        text: '🔨 Dùng đá đập vỡ ổ khóa',
        effect: (state) => {
          if (Math.random() > 0.3) {
            state.res.metal += 2;
            state.res.rope += 2;
            state.res.cookedFood += 1;
            return { msg: 'Bạn mở rương thành công! Nhận được: +2 Kim loại, +2 Dây thừng, +1 Đồ hộp ăn liền.', type: 'success' };
          } else {
            state.hp = Math.max(0, state.hp - 10);
            return { msg: 'Mảnh sắt gỉ bắn vào tay khiến bạn bị rách da sâu (-10 HP)! Nhưng bạn lấy được 1 Kim loại.', type: 'danger' };
          }
        }
      },
      {
        text: '🔍 Cẩn thận cạy then cài',
        effect: (state) => {
          state.res.rope += 1;
          state.sanity = Math.min(100, state.sanity + 5);
          return { msg: 'Bạn cẩn thận cạy được chốt rương! Thu được +1 Dây bạt tốt.', type: 'success' };
        }
      }
    ]
  },
  {
    id: 'wild_boar_encounter',
    title: 'Lợn Rừng Đột Kích',
    icon: '🐗',
    text: 'Một con lợn rừng hung dữ với cặp nanh sắc nhọn bất ngờ xông ra từ bụi rậm chắn đường bạn!',
    choices: [
      {
        text: '🏹 Dùng cung tên / gậy chiến đấu',
        req: (state) => true,
        effect: (state) => {
          if (state.crafted.bow) {
            state.res.rawFood += 3;
            state.sanity += 10;
            return { msg: 'Với cây cung sắc bén, bạn đã hạ gục lợn rừng! Thu hoạch được +3 Thịt tươi!', type: 'success' };
          } else if (Math.random() > 0.45) {
            state.res.rawFood += 2;
            state.hp = Math.max(0, state.hp - 15);
            return { msg: 'Bạn dùng cành cây xua đuổi và hạ được nó nhưng bị húc bầm dập (-15 HP, +2 Thịt tươi)!', type: 'warning' };
          } else {
            state.hp = Math.max(0, state.hp - 25);
            state.sanity = Math.max(0, state.sanity - 10);
            return { msg: 'Con lợn rừng húc bạn ngã nhào (-25 HP, -10 Tinh thần) rồi bỏ chạy vào rừng sâu!', type: 'danger' };
          }
        }
      },
      {
        text: '🏃‍♂️ Trèo vội lên cây cao lánh nạn',
        effect: (state) => {
          state.stamina = Math.max(0, state.stamina - 1);
          return { msg: 'Bạn nhanh chân trèo lên cây dừa. Thoát nạn nhưng tốn mất 1 Thể lực.', type: 'warning' };
        }
      }
    ]
  },
  {
    id: 'bottle_message',
    title: 'Thông Điệp Trong Chai Thủy Tinh',
    icon: '📜',
    text: 'Bạn tìm thấy một chai thủy tinh bịt sáp kín. Bên trong có tấm bản đồ đánh dấu kho báu hoang đảo!',
    choices: [
      {
        text: '🗺️ Đọc bản đồ và lần theo dấu vết',
        effect: (state) => {
          state.res.stone += 3;
          state.res.metal += 1;
          state.sanity = Math.min(100, state.sanity + 15);
          return { msg: 'Lần theo chỉ dẫn, bạn đào được kho chứa khoáng sản (+3 Đá, +1 Kim loại, +15 Tinh thần)!', type: 'special' };
        }
      },
      {
        text: '🍶 Giữ chai lại để đựng nước',
        effect: (state) => {
          state.res.water += 2;
          return { msg: 'Bạn rửa sạch chai và có thêm dụng cụ đựng +2 Nước ngọt.', type: 'success' };
        }
      }
    ]
  },
  {
    id: 'fever_sickness',
    title: 'Cơn Sốt Rừng Bất Ngờ',
    icon: '🤒',
    text: 'Cơn gió độc ban đêm khiến bạn tỉnh dậy với đầu óc choáng váng và thân nhiệt tăng cao.',
    choices: [
      {
        text: '🌿 Dùng 1 Thảo Dược nấu trà hạ sốt',
        req: (state) => state.res.herb >= 1,
        effect: (state) => {
          if (state.res.herb >= 1) {
            state.res.herb -= 1;
            state.sanity = Math.min(100, state.sanity + 10);
            return { msg: 'Trà thảo dược đắng ngắt giúp bạn xua tan cơn sốt. Bạn cảm thấy sảng khoái hơn!', type: 'success' };
          } else {
            state.hp = Math.max(0, state.hp - 20);
            return { msg: 'Bạn không có đủ thảo dược! Cơn sốt hành hạ làm bạn mất 20 HP.', type: 'danger' };
          }
        }
      },
      {
        text: '😴 Cắn răng chịu đựng nghỉ ngơi',
        effect: (state) => {
          state.hp = Math.max(0, state.hp - 18);
          state.sanity = Math.max(0, state.sanity - 15);
          return { msg: 'Cơn sốt dai dẳng khiến bạn kiệt quệ (-18 HP, -15 Tinh thần).', type: 'danger' };
        }
      }
    ]
  },
  {
    id: 'distant_ship',
    title: 'Bóng Tàu Phía Chân Trời!',
    icon: '🚢',
    text: 'Phía xa ngoài khơi xuất hiện một vệt khói và bóng dáng của tàu chở hàng đang di chuyển!',
    choices: [
      {
        text: '🔥 Đốt đuốc tín hiệu & Lửa trại',
        effect: (state) => {
          if (state.crafted.sosTower) {
            state.rescuedEarly = true;
            return { msg: 'Ngọn Hải Đăng SOS của bạn rực sáng! Con tàu đã nhìn thấy tín hiệu và quay đầu cứu viện!', type: 'special' };
          } else if (state.res.wood >= 4) {
            state.res.wood -= 4;
            if (Math.random() > 0.6) {
              state.rescuedEarly = true;
              return { msg: 'KỲ TÍCH! Khói lửa dày đặc đã thu hút thuyền cứu sinh của con tàu! Bạn được giải cứu!', type: 'special' };
            } else {
              state.sanity = Math.max(0, state.sanity - 5);
              return { msg: 'Con tàu ở quá xa nên không nhìn thấy cột khói nhỏ và dần khuất bóng (-4 Gỗ, -5 Tinh thần).', type: 'warning' };
            }
          } else {
            return { msg: 'Bạn không có đủ củi gỗ để tạo cột khói lớn. Con tàu dần biến mất nơi đường chân trời...', type: 'warning' };
          }
        }
      },
      {
        text: '👀 Ghi nhớ hướng đi của tàu',
        effect: (state) => {
          state.sanity = Math.min(100, state.sanity + 5);
          return { msg: 'Bạn hy vọng tuyến hải trình này sẽ có tàu qua lại thường xuyên (+5 Tinh thần).', type: 'success' };
        }
      }
    ]
  }
];
