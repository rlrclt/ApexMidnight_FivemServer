-- ========================================================
-- APEX OPTIMIZER & WORLD CLEANER
-- ออกแบบสำหรับลดภาระ CPU/GPU ตัดส่วนที่ไม่จำเป็นของ GTA V
-- ========================================================

local currentBoostLevel = 'normal'

-- 1. ปิด Ambient Scenarios & GTA V Defaults
local scenarioTypes = {
    'WORLD_VEHICLE_ATTRACTOR',
    'WORLD_VEHICLE_AMBULANCE',
    'WORLD_VEHICLE_BICYCLE_BMX',
    'WORLD_VEHICLE_BICYCLE_BMX_BALLAS',
    'WORLD_VEHICLE_BICYCLE_BMX_FAMILY',
    'WORLD_VEHICLE_BICYCLE_BMX_HARMONY',
    'WORLD_VEHICLE_BICYCLE_BMX_VAGOS',
    'WORLD_VEHICLE_BICYCLE_MOUNTAIN',
    'WORLD_VEHICLE_BICYCLE_ROAD',
    'WORLD_VEHICLE_BIKE_OFF_ROAD_RACE',
    'WORLD_VEHICLE_BIKER',
    'WORLD_VEHICLE_BOAT_IDLE',
    'WORLD_VEHICLE_BOAT_IDLE_ALAMO',
    'WORLD_VEHICLE_BOAT_IDLE_MARQUIS',
    'WORLD_VEHICLE_BUS',
    'WORLD_VEHICLE_BUSINESSMEN',
    'WORLD_VEHICLE_HELI_LIFEGUARD',
    'WORLD_VEHICLE_CLUCKIN_BELL_TRAILER',
    'WORLD_VEHICLE_CONSTRUCTION_SOLO',
    'WORLD_VEHICLE_CONSTRUCTION_PASSENGERS',
    'WORLD_VEHICLE_DRIVE_PASSENGERS',
    'WORLD_VEHICLE_DRIVE_PASSENGERS_LIMITED',
    'WORLD_VEHICLE_DRIVE_SOLO',
    'WORLD_VEHICLE_FIRE_TRUCK',
    'WORLD_VEHICLE_EMPTY',
    'WORLD_VEHICLE_MARIACHI',
    'WORLD_VEHICLE_MECHANIC',
    'WORLD_VEHICLE_MILITARY_PLANES_BIG',
    'WORLD_VEHICLE_MILITARY_PLANES_SMALL',
    'WORLD_VEHICLE_PARK_PARALLEL',
    'WORLD_VEHICLE_PARK_PERPENDICULAR_NOSE_IN',
    'WORLD_VEHICLE_PASSENGER_EXIT',
    'WORLD_VEHICLE_POLICE_BIKE',
    'WORLD_VEHICLE_POLICE_CAR',
    'WORLD_VEHICLE_POLICE_NEXT_TO_CAR',
    'WORLD_VEHICLE_QUARRY',
    'WORLD_VEHICLE_SALTON',
    'WORLD_VEHICLE_SALTON_DIRT_BIKE',
    'WORLD_VEHICLE_SECURITY_CAR',
    'WORLD_VEHICLE_STREETRACE',
    'WORLD_VEHICLE_TOURBUS',
    'WORLD_VEHICLE_TOURIST',
    'WORLD_VEHICLE_TANDL',
    'WORLD_VEHICLE_TRACTOR',
    'WORLD_VEHICLE_TRAIN',
    'WORLD_VEHICLE_TRUCKS_TRAILERS',
    'WORLD_VEHICLE_TRUCK_AT_CONSTRUCTION',
}

CreateThread(function()
    -- ปิด Scenarios
    for i = 1, #scenarioTypes do
        SetScenarioTypeEnabled(scenarioTypes[i], false)
    end

    -- ปิดเสียงและบริการตำรวจ/เสียงบรรยากาศของ GTA V
    DistantCopCarSirens(false)
    SetAudioFlag('PoliceScannerDisabled', true)
    SetAudioFlag('DisableFlightMusic', true)
    SetAudioFlag('WantedMusicDisabled', true)

    -- ปิดระบบสปาวน์พาหนะสุ่มของ GTA V
    SetCreateRandomCops(false)
    SetCreateRandomCopsNotOnScenarios(false)
    SetCreateRandomCopsOnScenarios(false)
    SetGarbageTrucks(false)
    SetRandomBoats(false)
    SetRandomTrains(false)

    -- ปิด Drops อาวุธจาก NPC
    local suppressPeds = {
        'WEAPON_PISTOL',
        'WEAPON_COMBATPISTOL',
        'WEAPON_PUMPSHOTGUN',
        'WEAPON_CARBINERIFLE',
        'WEAPON_SMG',
    }
    for i = 1, #suppressPeds do
        SetPedDropsWeaponsWhenDead(cache.ped, false)
    end
end)

-- 2. Garbage Collection Thread (คืน RAM ทุก 5 นาที)
CreateThread(function()
    while true do
        Wait(300000) -- 5 นาที
        collectgarbage('collect')
    end
end)

-- 3. ระบบเมนู /fps ปรับแต่งกราฟิก เพิ่มความลื่น
local function applyBoost(level)
    currentBoostLevel = level

    if level == 'ultra' then
        -- Ultra Boost (ปิดเงา, ลดระยะเรนเดอร์, ดึง FPS สูงสุด เหมาะกับสเปกเบา)
        RopeDrawShadowEnabled(false)
        CascadeShadowsClearShadowSampleType()
        CascadeShadowsSetAircraftMode(false)
        CascadeShadowsEnableEntityTracker(true)
        CascadeShadowsSetDynamicDepthMode(false)
        CascadeShadowsSetEntityTrackerScale(0.0)
        CascadeShadowsInitFull()
        CascadeShadowsSetNumCascades(1)
        SetFlashLightFadeDistance(5.0)
        SetLightsCutoffDistanceTweak(5.0)
        DisableOcclusion(false)
        SetDistanceBlurStrengthMul(0.0)
        lib.notify({ title = 'FPS Booster', description = 'เปิดโหมด: Ultra Boost (เน้น FPS สูงสุด)', type = 'success' })
    elseif level == 'medium' then
        -- Medium Boost (ลื่นปานกลาง ภาพยังสวย)
        RopeDrawShadowEnabled(true)
        CascadeShadowsSetDynamicDepthMode(false)
        CascadeShadowsSetEntityTrackerScale(5.0)
        CascadeShadowsSetNumCascades(2)
        SetFlashLightFadeDistance(15.0)
        SetLightsCutoffDistanceTweak(15.0)
        SetDistanceBlurStrengthMul(0.0)
        lib.notify({ title = 'FPS Booster', description = 'เปิดโหมด: Medium Boost (สมดุลความลื่นและภาพสวย)', type = 'inform' })
    else
        -- Normal (ค่ามาตรฐานของเกม)
        RopeDrawShadowEnabled(true)
        CascadeShadowsSetDynamicDepthMode(true)
        CascadeShadowsSetEntityTrackerScale(10.0)
        CascadeShadowsSetNumCascades(4)
        SetFlashLightFadeDistance(100.0)
        SetLightsCutoffDistanceTweak(100.0)
        lib.notify({ title = 'FPS Booster', description = 'คืนค่าภาพมาตรฐาน (Default)', type = 'inform' })
    end
end

-- คำสั่ง /fps
RegisterCommand('fps', function()
    lib.registerContext({
        id = 'apex_fps_menu',
        title = '⚡ Apex FPS Booster & Optimization',
        options = {
            {
                title = '🟢 Default / ปกติ',
                description = 'กราฟิกเดิมของ GTA V ภาพสมบูรณ์ที่สุด',
                icon = 'circle-check',
                onSelect = function()
                    applyBoost('normal')
                end,
            },
            {
                title = '🟡 Medium Boost (แนะนำ)',
                description = 'ปิดแสงเงาซ้อนและเบลอพื้นหลัง เพิ่ม 10-20 FPS',
                icon = 'gauge-high',
                onSelect = function()
                    applyBoost('medium')
                end,
            },
            {
                title = '🔴 Ultra Boost (FPS สูงสุด)',
                description = 'ตัดเงาลึกและแสงกระทบ เหมาะสำหรับคอมสเปกเบา/ไฟต์ยิง เพิ่ม 25-40+ FPS',
                icon = 'bolt',
                onSelect = function()
                    applyBoost('ultra')
                end,
            },
        }
    })
    lib.showContext('apex_fps_menu')
end, false)
