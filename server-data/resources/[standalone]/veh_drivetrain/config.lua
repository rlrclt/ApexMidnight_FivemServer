Config = {}

-- Transmission Mode & Key Mapping Configuration
Config.DefaultMode = "AUTO" -- โหมดเริ่มต้นเมื่อขึ้นรถ ("AUTO" หรือ "MANUAL")
Config.Keybinds = {
    toggleMode = "M",       -- ปุ่มสลับโหมด AUTO / MANUAL
    shiftUp = "LSHIFT",     -- ปุ่มสับเกียร์ขึ้น (Shift Up)
    shiftDown = "LCONTROL", -- ปุ่มสับเกียร์ลง (Shift Down)
}

-- Mechanical Transmission Specs
-- gearRatios: สัดส่วนความเร็วตัดเกียร์เทียบกับ fInitialDriveMaxFlatVel (1.0 = 100%)
-- torqueMultipliers: ตัวคูณแรงบิดของแต่ละเกียร์เทียบกับ fInitialDriveForce ใน handling.meta
local elegySpec = {
    name = "Elegy Retro / Sport Spec",
    idleRpm = 1500,
    idleSwing =2880,   -- ระยะรอบสวิง ±RPM (1200 ± 80 = 1120-1280)
    idleHz = 6.5,     -- ความถี่การสวิง (Hz: รอบต่อวินาที)
    maxRpm = 9000,
    lockGearSpeed = true, -- ล็อกความเร็วไม่ให้ทะลุเพดานเกียร์ (ยกเว้นเกียร์สุดท้ายที่ปล่อยให้ไหลตามแรงเครื่อง)
    upshiftRpm = {
        [1] = 8800,   -- เกียร์ 1 สับขึ้นที่ 7800
        [2] = 8200,   -- เกียร์ 2 สับขึ้นที่ 8200
        [3] = 8800,   -- เกียร์ 3
        [4] = 8700,   -- เกียร์ 4
        [5] = 8900,   -- เกียร์ 5
    },
    downshiftRpm = {
        [2] = 7200,   -- ยกคันเร่งไหลช้า รอบตกแตะ 3200 ค่อยสับลง 1
        [3] = 7500,   -- สับลง 2
        [4] = 7800,   -- สับลง 3
        [5] = 7000,   -- สับลง 4
        [6] = 7000,   -- สับลง 5
    },
    engineBrakingInertia = 0.85, -- แรงเฉื่อยตอนยกคันเร่ง (0.50 = ตกไว, 0.85 = หน่วงนุ่มนวล)
    -- กำหนดความเร็วตัดเกียร์ได้ 2 แบบ (ถ้ามี gearMaxSpeeds จะใช้ก่อน):
    -- แบบที่ 1 (แนะนำ): ล็อกความเร็วตันรายเกียร์เป็นตัวเลข km/h ตรงๆ
    gearMaxSpeeds = {
            [1] = 72, -- เกียร์ 1 ล็อกความเร็วที่ 72 กม./ชม.
            [2] = 110, -- เกียร์ 2 ล็อกความเร็วที่ 110 กม./ชม.
            [3] = 149, -- เกียร์ 3 ล็อกความเร็วที่ 149 กม./ชม.
            [4] = 193, -- เกียร์ 4 ล็อกความเร็วที่ 187 กม./ชม.
            [5] = 221, -- เกียร์ 5 ล็อกความเร็วที่ 221 กม./ชม.
            [6] = 252, -- เกียร์ 6 ล็อกความเร็วที่ 252 กม./ชม.
        },
    -- แบบที่ 2: gearRatios สัดส่วนเทียบกับ fInitialDriveMaxFlatVel ของ handling.meta
    gearRatios = {
          [1] = 0.30, -- สัดส่วนเกียร์ 1
          [2] = 0.66, -- สัดส่วนเกียร์ 2
          [3] = 0.82, -- สัดส่วนเกียร์ 3
          [4] = 0.99, -- สัดส่วนเกียร์ 4
          [5] = 1.22, -- สัดส่วนเกียร์ 5
          [6] = 1.55, -- สัดส่วนเกียร์ 6
      },
      -- กำหนดค่า fInitialDriveForce รายเกียร์โดยตรง
      gearDriveForce = {
          [1] = 0.43, -- เกียร์ 1 แรงดึง 0.48
          [2] = 0.37, -- เกียร์ 2 แรงดึง 0.42
          [3] = 0.3, -- เกียร์ 3 แรงดึง 0.38
          [4] = 0.32, -- เกียร์ 4 แรงดึง 0.35
          [5] = 0.31, -- เกียร์ 5 แรงดึง 0.32
          [6] = 0.32, -- เกียร์ 6 แรงดึง 0.30
      }
}

-- Truffade Thrax (Bugatti Divo W16 7-Speed Dual-Clutch Spec)
local thraxSpec = {
    name = "Truffade Thrax (Bugatti Divo W16 Spec)",
    idleRpm = 1500,
    idleSwing =1535,      -- เดินเบานิ่งละเอียดแบบ W16 สวิงเบาๆ ±35 RPM
    idleHz = 5.0,
    maxRpm = 8000,    -- W16 Quad-Turbo Redline ~7,500 RPM
    lockGearSpeed = true,
    upshiftRpm = {
        [1] = 7000,
        [2] = 7400,
        [3] = 7400,
        [4] = 7400,
        [5] = 7400,
        [6] = 7400,
    },
    downshiftRpm = {
        [2] = 2800,
        [3] = 3000,
        [4] = 3200,
        [5] = 3400,
        [6] = 3600,
    },
    engineBrakingInertia = 0.68,   -- เสถียรภาพความเร็วสูง
    gearMaxSpeeds = {
        [1] = 69,   -- เกียร์ 1 ตันที่ ~89 km/h
        [2] = 122,  -- เกียร์ 2 ตันที่ ~132 km/h
        [3] = 154,  -- เกียร์ 3 ตันที่ ~174 km/h
        [4] = 179,  -- เกียร์ 4 ตันที่ ~207 km/h
        [5] = 200,  -- เกียร์ 5 ตันที่ ~230 km/h
        [6] = 269,  -- เกียร์ 6 ปลายไหล
    },
    gearRatios = {
        [1] = 0.58,
        [2] = 0.76,
        [3] = 0.84,
        [4] = 0.98,
        [5] = 1.38,
        [6] = 1.58,
    },
    gearDriveForce = {
        [1] = 0.28, -- AWD ออกตัวพุ่งดึงหนัก ล้อไม่ปั่นฟรีทิ้ง
        [2] = 0.27,
        [3] = 0.25,
        [4] = 0.25,
        [5] = 0.24,
        [6] = 0.24,
    }
}

Config.Vehicles = {
    [`elegy`] = elegySpec,
    [`elegy2`] = elegySpec,
    ["elegy"] = elegySpec,
    ["elegy2"] = elegySpec,
    [`thrax`] = thraxSpec,
    ["thrax"] = thraxSpec,
}

-- Default generic fallback สำหรับรถที่ไม่ได้ระบุไว้ใน Config.Vehicles
Config.DefaultFallback = {
    idleRpm = 900,
    idleSwing = 0,
    idleHz = 1.0,
    maxRpm = 7500,
    engineBrakingInertia = 0.80,
    -- อัตราทดสัดส่วนความเร็วมาตรฐาน 6 เกียร์
    gearRatios = {
        [1] = 0.30,
        [2] = 0.50,
        [3] = 0.70,
        [4] = 0.85,
        [5] = 0.96,
        [6] = 1.05
    },
    -- ค่า fInitialDriveForce รายเกียร์
    gearDriveForce = {
        [1] = 0.38,
        [2] = 0.35,
        [3] = 0.32,
        [4] = 0.29,
        [5] = 0.26,
        [6] = 0.23
    }
}
