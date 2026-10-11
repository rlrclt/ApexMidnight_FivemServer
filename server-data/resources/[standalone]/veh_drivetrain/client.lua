--[[
    Mechanical Drivetrain & Gearbox Dynamic Physics
    - Speed-Coupled RPM: ผูกรอบเครื่องยนต์เข้ากับความเร็วจริงของรถตามสัดส่วน gearRatios
    - Dynamic Torque Curve: ปรับ fInitialDriveForce รายเกียร์ตาม torqueMultipliers (ต้นจัด/ปลายไหล)
    - Handling Sync: อิงฐานจาก fInitialDriveMaxFlatVel และ fInitialDriveForce โดยตรง
]]

local currentVeh = nil
local currentSpec = nil
local baseMaxFlatVel = 200.0
local origMaxFlatVel = nil
local baseDriveForce = 0.35
local currentTorqueMult = 1.0
local simulatedRpm = 1000.0
local controlledGear = 1
local maxVehicleGears = 6
local lastShiftTime = 0
local appliedGear = -1
local appliedHighGear = -1
local appliedMaxSpeed = -1
local isManualMode = false
local manualGear = 1

local function GetVehicleSpec(veh)
    local model = GetEntityModel(veh)
    if Config.Vehicles[model] then
        return Config.Vehicles[model]
    end
    for k, v in pairs(Config.Vehicles) do
        local h = (type(k) == "string") and GetHashKey(k) or k
        if h == model or ((h & 0xFFFFFFFF) == (model & 0xFFFFFFFF)) then
            return v
        end
    end
    return Config.DefaultFallback
end

local function ApplyGearTorque(veh, gear, force)
    if not currentSpec then return end
    if not force and appliedGear == gear then return end
    local targetForce = nil
    local base = (baseDriveForce and baseDriveForce > 0.01) and baseDriveForce or 0.35

    if currentSpec.gearDriveForce and currentSpec.gearDriveForce[gear] then
        targetForce = currentSpec.gearDriveForce[gear] + 0.0
        currentTorqueMult = targetForce / base
    elseif currentSpec.torqueMultipliers and currentSpec.torqueMultipliers[gear] then
        currentTorqueMult = currentSpec.torqueMultipliers[gear] + 0.0
        targetForce = base * currentTorqueMult
    else
        currentTorqueMult = 1.0
        targetForce = base
    end

    if targetForce then
        SetVehicleHandlingFloat(veh, "CHandlingData", "fInitialDriveForce", targetForce)
        ModifyVehicleTopSpeed(veh, 1.0)
        appliedGear = gear
    end
end

local function GetGearMaxSpeed(spec, gear, maxG, baseFlatVel)
    if not spec or not gear or gear <= 0 then return 30.0 end
    if spec.gearMaxSpeeds and spec.gearMaxSpeeds[gear] then
        return spec.gearMaxSpeeds[gear] + 0.0
    end
    local ratio = (spec.gearRatios and spec.gearRatios[gear]) or (gear / maxG)
    return math.max(10.0, baseFlatVel * ratio)
end

local function RestoreBaseHandling(veh)
    if DoesEntityExist(veh) then
        if baseDriveForce then
            SetVehicleHandlingFloat(veh, "CHandlingData", "fInitialDriveForce", baseDriveForce)
        end
        if origMaxFlatVel then
            SetVehicleHandlingFloat(veh, "CHandlingData", "fInitialDriveMaxFlatVel", origMaxFlatVel)
        end
        SetVehicleEnginePowerMultiplier(veh, 1.0)
        SetVehicleEngineTorqueMultiplier(veh, 1.0)
        SetVehicleMaxSpeed(veh, ((origMaxFlatVel or baseMaxFlatVel) / 3.6) + 10.0)
        SetVehicleHighGear(veh, maxVehicleGears or 6)
        SetVehicleNextGear(veh, 1)
        pcall(function() Entity(veh).state:set("isManual", false, false) end)
    end
    appliedGear = -1
    appliedHighGear = -1
    appliedMaxSpeed = -1
end

Citizen.CreateThread(function()
    while true do
        local ped = PlayerPedId()
        local inVeh = IsPedInAnyVehicle(ped, false)

        if inVeh then
            local veh = GetVehiclePedIsIn(ped, false)
            local isDriver = (GetPedInVehicleSeat(veh, -1) == ped)

            if isDriver and GetIsVehicleEngineRunning(veh) then
                if veh ~= currentVeh then
                    -- Reset รถคันเก่าก่อนเปลี่ยนคัน
                    if currentVeh and currentVeh ~= veh then
                        RestoreBaseHandling(currentVeh)
                    end

                    currentVeh = veh
                    currentSpec = GetVehicleSpec(veh)
                    origMaxFlatVel = GetVehicleHandlingFloat(veh, "CHandlingData", "fInitialDriveMaxFlatVel") or 200.0
                    baseMaxFlatVel = origMaxFlatVel
                    baseDriveForce = GetVehicleHandlingFloat(veh, "CHandlingData", "fInitialDriveForce") or 0.35
                    local rawGears = GetVehicleHandlingInt(veh, "CHandlingData", "nInitialDriveGears") or 6
                    -- ตรวจสอบจำนวนเกียร์แท้จริง:
                    -- 1. ยึดตาม spec.maxGears หรือ spec.gearMaxSpeeds หรือ spec.gearRatios ก่อนเสมอถ้ามีการกำหนดไว้
                    -- 2. ใน GTA V การแต่งเกียร์ (Transmission Mod 13) เกมจะบวกเพิ่ม nInitialDriveGears ไปอีก 1 อัตโนมัติ
                    --    ถ้ามีของแต่งเกียร์ จึงหักออก 1 เพื่อให้ตรงกับ nInitialDriveGears ใน handling.meta เป๊ะๆ
                    local specGears = nil
                    if currentSpec and currentSpec.maxGears then
                        specGears = currentSpec.maxGears
                    elseif currentSpec and currentSpec.gearMaxSpeeds then
                        local maxK = 0
                        for k, _ in pairs(currentSpec.gearMaxSpeeds) do
                            if type(k) == "number" and k > maxK then maxK = k end
                        end
                        if maxK > 0 then specGears = maxK end
                    elseif currentSpec and currentSpec.gearRatios then
                        local maxK = 0
                        for k, _ in pairs(currentSpec.gearRatios) do
                            if type(k) == "number" and k > maxK then maxK = k end
                        end
                        if maxK > 0 then specGears = maxK end
                    end

                    if specGears and specGears > 0 then
                        maxVehicleGears = specGears
                    else
                        local hasTransMod = GetVehicleMod(veh, 13) >= 0
                        maxVehicleGears = hasTransMod and math.max(1, rawGears - 1) or rawGears
                    end

                    isManualMode = (Config.DefaultMode == "MANUAL")
                    manualGear = 1
                    controlledGear = 1
                    simulatedRpm = currentSpec.idleRpm + 0.0
                    lastShiftTime = GetGameTimer()
                    appliedGear = -1
                    appliedHighGear = -1
                    appliedMaxSpeed = -1

                    Entity(veh).state:set("maxRpm", currentSpec.maxRpm, false)
                    Entity(veh).state:set("isManual", isManualMode, false)
                    ApplyGearTorque(veh, 1, true)
                    SetVehicleCurrentGear(veh, 1)
                    SetVehicleNextGear(veh, 1)

                    -- ตัดระบบเปลี่ยนเกียร์อัตโนมัติของ GTA V (CF_GEARBOX_MANUAL 0x400)
                    pcall(function()
                        local flags = GetVehicleHandlingInt(veh, "CCarHandlingData", "strAdvancedFlags") or 0
                        if (flags & 0x400) == 0 then
                            SetVehicleHandlingInt(veh, "CCarHandlingData", "strAdvancedFlags", flags | 0x400)
                        end
                    end)
                end

                local isBrakeOrReverse = IsControlPressed(0, 72) or IsDisabledControlPressed(0, 72)
                local speedKmh = GetEntitySpeed(veh) * 3.6
                local isThrottle = IsControlPressed(0, 71) or IsDisabledControlPressed(0, 71)
                local throttleVal = GetControlNormal(0, 71)
                if throttleVal == 0.0 and isThrottle then throttleVal = 1.0 end

                local forwardSpeed = 0.0
                if GetEntitySpeedVector then
                    forwardSpeed = GetEntitySpeedVector(veh, true).y
                else
                    local fwdVec = GetEntityForwardVector(veh)
                    local vel = GetEntityVelocity(veh)
                    forwardSpeed = (fwdVec.x * vel.x) + (fwdVec.y * vel.y) + (fwdVec.z * vel.z)
                end

                local isReverse = false
                local isNeutral = false
                local isRevLimiterBouncing = false

                if isManualMode then
                    isReverse = (manualGear == -1)
                    isNeutral = (manualGear == 0)
                    if not isReverse and not isNeutral then
                        controlledGear = manualGear
                    else
                        controlledGear = 0
                    end
                    -- ในเกียร์ R แบบ Manual: หากเหยียบคันเร่ง (W) ให้แปลงเป็นคำสั่งถอยหลังอัตโนมัติ
                    if isReverse and isThrottle and not isBrakeOrReverse then
                        SetControlNormal(0, 72, throttleVal)
                        isBrakeOrReverse = true
                    end
                else
                    if controlledGear == 0 then
                        -- เกียร์ R ปัจจุบัน: สลับกลับเป็นเดินหน้าเมื่อกดคันเร่ง หรือตัวรถพุ่งไปข้างหน้า
                        if (isThrottle and not isBrakeOrReverse) or forwardSpeed > 1.0 then
                            isReverse = false
                            controlledGear = 1
                        else
                            isReverse = true
                        end
                    else
                        -- เกียร์เดินหน้า (1-6): จะเข้าเกียร์ R ได้ "ต้องตั้งใจถอยหลังเท่านั้น"
                        -- คือรถต้องชะลอจนเกือบหยุด (< 4.0 km/h) และกดปุ่มเบรก/ถอยหลังแช่ไว้ (isBrakeOrReverse and not isThrottle)
                        -- รถสบัด/หมุนคว้างกลางทาง (forwardSpeed < 0) จะไม่เด้งเข้าเกียร์ R เด็ดขาด
                        if speedKmh < 4.0 and isBrakeOrReverse and not isThrottle then
                            isReverse = true
                            controlledGear = 0
                        else
                            isReverse = false
                        end
                    end

                    -- Anti-Stall: สับกลับเกียร์ 1 อัตโนมัติเมื่อชะลอจนหยุดนิ่ง
                    if not isReverse and speedKmh < 3.0 and controlledGear > 1 then
                        controlledGear = 1
                        ApplyGearTorque(veh, 1, true)
                        SetVehicleCurrentGear(veh, 1)
                        SetVehicleNextGear(veh, 1)
                    end
                end

                -- 1. ความเร็วตัดสูงสุดของเกียร์ปัจจุบัน (km/h)
                local currentGearMaxSpeed = GetGearMaxSpeed(currentSpec, controlledGear, maxVehicleGears, baseMaxFlatVel)
                local isTopGear = (controlledGear >= maxVehicleGears) or
                    ((not currentSpec.gearMaxSpeeds or not currentSpec.gearMaxSpeeds[controlledGear + 1]) and
                     (not currentSpec.gearRatios or not currentSpec.gearRatios[controlledGear + 1]))

                -- 2. Engine RPM Simulation: คำนวณตามความเร็วจริง (Speed-Coupled)
                -- baseIdle: รอบเดินเบาแท้จริงคงที่ (สำหรับคำนวณรอบขณะรถวิ่ง เพื่อไม่ให้รอบแกว่ง/สวิงตอนขับ)
                -- liveIdle: รอบเดินเบาสวิงคลื่นเสียง Cam Lope (ทำงานเฉพาะตอนรถจอดนิ่ง/เดินเบาจริงๆ)
                local baseIdle = currentSpec.idleRpm + 0.0
                local liveIdle = baseIdle
                if currentSpec.idleSwing and currentSpec.idleSwing > 0 then
                    liveIdle = math.max(300.0, baseIdle + math.sin(GetGameTimer() * 0.006283 * (currentSpec.idleHz or 2.0)) * currentSpec.idleSwing)
                end

                if isNeutral then
                    controlledGear = 0
                    if appliedGear ~= -99 then
                        SetVehicleHandlingFloat(veh, "CHandlingData", "fInitialDriveForce", 0.0)
                        SetVehicleEnginePowerMultiplier(veh, 0.0)
                        SetVehicleCurrentGear(veh, 0)
                        SetVehicleNextGear(veh, 0)
                        appliedGear = -99
                    end

                    -- Free-Rev ในเกียร์ว่าง N:
                    if isThrottle then
                        local revTarget = baseIdle + (currentSpec.maxRpm - baseIdle) * throttleVal
                        simulatedRpm = simulatedRpm + (revTarget - simulatedRpm) * 0.25
                        if simulatedRpm >= (currentSpec.maxRpm - 50) then
                            simulatedRpm = currentSpec.maxRpm - math.random(150, 300)
                        end
                    else
                        if simulatedRpm > (liveIdle + 150) then
                            simulatedRpm = simulatedRpm + (liveIdle - simulatedRpm) * 0.12
                        else
                            simulatedRpm = liveIdle
                        end
                    end
                elseif isReverse then
                    controlledGear = 0
                    if appliedGear ~= 0 then
                        if baseDriveForce then
                            SetVehicleHandlingFloat(veh, "CHandlingData", "fInitialDriveForce", baseDriveForce)
                        end
                        appliedGear = 0
                    end

                    if isBrakeOrReverse then
                        -- กำลังเหยียบคันเร่งถอยหลัง: รอบกวาดขึ้นจาก baseIdle ต่อเนื่องตามแรงเหยียบ
                        local revBrakeThrottle = GetControlNormal(0, 72)
                        if revBrakeThrottle == 0.0 then revBrakeThrottle = 1.0 end
                        local revTarget = baseIdle + (currentSpec.maxRpm - baseIdle) * (0.20 + 0.60 * revBrakeThrottle * math.min(1.0, speedKmh / 35.0))
                        simulatedRpm = simulatedRpm + (revTarget - simulatedRpm) * 0.25
                    else
                        -- ปล่อยคันเร่งถอยหลัง หรือจอดนิ่งในเกียร์ R
                        if speedKmh < 3.0 then
                            -- จอดนิ่ง: เดินเบาสวิงตาม Cam Lope
                            if simulatedRpm > (liveIdle + 150) then
                                simulatedRpm = simulatedRpm + (liveIdle - simulatedRpm) * 0.15
                            else
                                simulatedRpm = liveIdle
                            end
                        else
                            -- รถกำลังไหลถอยหลัง: หน่วงลงหา baseIdle นิ่งๆ ไม่สวิง
                            if simulatedRpm > (baseIdle + 150) then
                                simulatedRpm = simulatedRpm + (baseIdle - simulatedRpm) * 0.15
                            else
                                simulatedRpm = baseIdle
                            end
                        end
                    end
                else
                    if controlledGear == 0 then
                        controlledGear = 1
                        ApplyGearTorque(veh, 1, true)
                    end

                    -- คำนวณรอบเป้าหมายจากความเร็วรถจริงเทียบกับเพดานเกียร์ (Mechanical Coupling)
                    -- ใช้ baseIdle นิ่งๆ เพื่อให้รอบขณะขับขี่เรียบเนียน ไม่กระตุกหรือสวิงตาม Cam Lope
                    local speedFraction = math.min(1.0, speedKmh / currentGearMaxSpeed)
                    local coupledRpm = baseIdle + (currentSpec.maxRpm - baseIdle) * speedFraction

                    if isThrottle then
                        -- ขับเคลื่อน: รอบเครื่องยนต์ผูกตรงกับความเร็วรถและเกียร์ (Speed-Coupled) ราบเรียบไม่มีสวิง
                        if speedKmh < 8.0 then
                            -- ช่วงออกตัว: กวาดรอบเครื่องขึ้นตามคันเร่งจริงทันที ไม่อืดคาอยู่ที่รอบเดินเบา
                            local nativeRpmScale = GetVehicleCurrentRpm(veh) * currentSpec.maxRpm
                            simulatedRpm = math.max(simulatedRpm, math.max(coupledRpm, nativeRpmScale))
                        else
                            simulatedRpm = coupledRpm
                        end

                        -- Rev Limiter & Hard Speed Cut ประจำเกียร์ (เกียร์สุดท้ายปลดล็อกความเร็ว ตัดเฉพาะรอบ maxRpm)
                        local isRedline = (coupledRpm >= (currentSpec.maxRpm - 50)) or (simulatedRpm >= (currentSpec.maxRpm - 50))
                        local isGearSpeedLocked = (currentSpec.lockGearSpeed ~= false) and not isTopGear and (speedKmh >= (currentGearMaxSpeed * 0.98))

                        if isRedline or isGearSpeedLocked then
                            isRevLimiterBouncing = true
                            simulatedRpm = currentSpec.maxRpm - math.random(120, 280)
                        end
                    else
                        local inertia = currentSpec.engineBrakingInertia or 0.85
                        local decayRate = math.max(0.08, (1.0 - inertia) * 0.40)

                        if speedKmh < 3.0 then
                            -- ชะลอจนหยุดหรือจอดนิ่ง: เดินเบาสวิงตาม Cam Lope (liveIdle)
                            if simulatedRpm > (liveIdle + 150) then
                                simulatedRpm = simulatedRpm + (liveIdle - simulatedRpm) * decayRate
                            else
                                simulatedRpm = liveIdle
                            end
                        else
                            -- รถยังวิ่งอยู่ (Coasting): หน่วงรอบลงหาความเร็วรถจริง (coupledRpm) เรียบเนียน ไม่สวิง
                            if simulatedRpm > coupledRpm then
                                simulatedRpm = simulatedRpm + (coupledRpm - simulatedRpm) * decayRate
                            else
                                simulatedRpm = coupledRpm
                            end
                        end
                    end
                end

                -- คุมความเร็วสูงสุด (Speed Governor):
                -- เกียร์ 1 ถึง N-1: ถ้าเปิด lockGearSpeed จะล็อกความเร็วไว้ที่เพดานเกียร์ (currentGearMaxSpeed) ป้องกันความเร็วทะลุเกียร์
                -- เกียร์สุดท้าย (Top Gear) หรือเกียร์ R: ปลดล็อก Native Max Speed ให้วิ่งได้เต็มกำลังเครื่อง ไม่บีบตัดความเร็ว
                local freeLimitMs = (baseMaxFlatVel / 3.6) + 150.0
                local targetMaxSpeedMs = freeLimitMs
                local shouldLockSpeed = (currentSpec.lockGearSpeed ~= false) and not isTopGear and not isReverse and not isNeutral and (controlledGear > 0)
                if shouldLockSpeed then
                    targetMaxSpeedMs = (currentGearMaxSpeed / 3.6)
                end

                if appliedMaxSpeed ~= targetMaxSpeedMs then
                    SetVehicleMaxSpeed(veh, targetMaxSpeedMs)
                    appliedMaxSpeed = targetMaxSpeedMs
                end

                local minFloorRpm = math.max(200.0, (currentSpec.idleSwing and currentSpec.idleSwing > 0) and (currentSpec.idleRpm - currentSpec.idleSwing - 20) or currentSpec.idleRpm)
                simulatedRpm = math.max(minFloorRpm, math.min(currentSpec.maxRpm, simulatedRpm))

                -- 3. ระบบเปลี่ยนเกียร์อัตโนมัติ (Transmission Shift Manager - ทำงานเฉพาะโหมด Auto)
                local now = GetGameTimer()
                local shiftCooldown = (isBrakeOrReverse and speedKmh > 5.0) and 200 or 500
                if not isManualMode and not isReverse and (now - lastShiftTime) > shiftCooldown then
                    -- รองรับทั้งใส่ตัวเลขเดียว (ทุกเกียร์) หรือใส่ตารางแยกรายเกียร์ { [1]=8500, [2]=8800 }
                    local upshiftRpm = (type(currentSpec.upshiftRpm) == "table" and currentSpec.upshiftRpm[controlledGear]) or (type(currentSpec.upshiftRpm) == "number" and currentSpec.upshiftRpm) or (currentSpec.maxRpm * 0.94)
                    local rawDownshift = (type(currentSpec.downshiftRpm) == "table" and currentSpec.downshiftRpm[controlledGear]) or (type(currentSpec.downshiftRpm) == "number" and currentSpec.downshiftRpm) or (currentSpec.idleRpm + (currentSpec.maxRpm - currentSpec.idleRpm) * 0.38)
                    -- Hysteresis Guard: downshiftRpm ต้องต่ำกว่าจุดสับขึ้นเสมอ (ไม่เกิน 65% ของ upshift) ป้องกันเกียร์เด้งวนลูป
                    local downshiftRpm = math.min(rawDownshift, upshiftRpm * 0.65)

                    -- Upshift: เมื่อรอบลากจนถึงจุดตัดรอบ (ต้องกดคันเร่งและไม่ได้เหยียบเบรก)
                    if simulatedRpm >= upshiftRpm and controlledGear < maxVehicleGears and speedKmh > 5.0 and isThrottle and not isBrakeOrReverse then
                        controlledGear = controlledGear + 1
                        lastShiftTime = now

                        -- ปรับแรงดึง (Torque) ประจำเกียร์ใหม่ทันที
                        ApplyGearTorque(veh, controlledGear, true)
                        SetVehicleCurrentGear(veh, controlledGear)
                        SetVehicleNextGear(veh, controlledGear)

                        -- คำนวณรอบตกตอนเข้าเกียร์ใหม่
                        local nextGearMaxSpeed = GetGearMaxSpeed(currentSpec, controlledGear, maxVehicleGears, baseMaxFlatVel)
                        local nextSpeedFraction = math.min(1.0, speedKmh / nextGearMaxSpeed)
                        simulatedRpm = currentSpec.idleRpm + (currentSpec.maxRpm - currentSpec.idleRpm) * nextSpeedFraction

                    -- Downshift (แยกชัดเจนระหว่างยกคันเร่ง/เบรกชะลอรถ กับเหยียบคันเร่งแต่ความเร็วตกฮวบ):
                    elseif controlledGear > 1 and (
                        ((not isThrottle or isBrakeOrReverse) and simulatedRpm < downshiftRpm) or
                        (isThrottle and not isBrakeOrReverse and (speedKmh < (currentGearMaxSpeed * 0.30) or simulatedRpm < (currentSpec.idleRpm + 500)))
                    ) then
                        -- คำนวณหาเกียร์ที่เหมาะสมที่สุดกับความเร็วปัจจุบันโดยตรง (ข้ามเกียร์ได้ทันที ไม่ต้องรอไต่ทีละขั้น)
                        local targetGear = controlledGear - 1
                        for g = controlledGear - 1, 1, -1 do
                            local gMaxSpeed = GetGearMaxSpeed(currentSpec, g, maxVehicleGears, baseMaxFlatVel)
                            local gPredictedRpm = currentSpec.idleRpm + (currentSpec.maxRpm - currentSpec.idleRpm) * math.min(1.0, speedKmh / gMaxSpeed)
                            local gUpshift = (type(currentSpec.upshiftRpm) == "table" and currentSpec.upshiftRpm[g]) or (type(currentSpec.upshiftRpm) == "number" and currentSpec.upshiftRpm) or (currentSpec.maxRpm * 0.94)

                            if gPredictedRpm < (gUpshift - 400) and speedKmh < (gMaxSpeed * 0.92) then
                                targetGear = g
                            else
                                break
                            end
                        end

                        controlledGear = targetGear
                        lastShiftTime = now

                        ApplyGearTorque(veh, controlledGear, true)
                        SetVehicleCurrentGear(veh, controlledGear)
                        SetVehicleNextGear(veh, controlledGear)

                        -- รอบกวาดขึ้นรับเกียร์ต่ำ (Rev-match)
                        local prevGearMaxSpeed = GetGearMaxSpeed(currentSpec, controlledGear, maxVehicleGears, baseMaxFlatVel)
                        local prevSpeedFraction = math.min(1.0, speedKmh / prevGearMaxSpeed)
                        simulatedRpm = math.min(currentSpec.maxRpm - 200, currentSpec.idleRpm + (currentSpec.maxRpm - currentSpec.idleRpm) * prevSpeedFraction)
                    end
                end

                -- 3.1 คุมเกียร์เกม (GTA V Transmission Integration):
                if isNeutral then
                    controlledGear = 0
                    if GetVehicleCurrentGear(veh) ~= 0 then
                        SetVehicleCurrentGear(veh, 0)
                        SetVehicleNextGear(veh, 0)
                    end
                elseif isReverse then
                    controlledGear = 0
                    if appliedHighGear ~= maxVehicleGears then
                        SetVehicleHighGear(veh, maxVehicleGears)
                        appliedHighGear = maxVehicleGears
                    end
                    if GetVehicleCurrentGear(veh) ~= 0 then
                        SetVehicleCurrentGear(veh, 0)
                        SetVehicleNextGear(veh, 0)
                    end
                else
                    if controlledGear == 0 then controlledGear = 1 end

                    -- ปลดล็อก HighGear ให้เปิดสุดเพดานเกียร์รถเสมอ (maxVehicleGears)
                    if appliedHighGear ~= maxVehicleGears then
                        SetVehicleHighGear(veh, maxVehicleGears)
                        appliedHighGear = maxVehicleGears
                    end

                    -- ซิงก์เกียร์ Native ให้ตรงกับ controlledGear
                    -- เมื่อมี CF_GEARBOX_MANUAL (0x400) ใน strAdvancedFlags ตัวเกมจะไม่สับเกียร์เองเด็ดขาด
                    if GetVehicleCurrentGear(veh) ~= controlledGear then
                        SetVehicleCurrentGear(veh, controlledGear)
                        SetVehicleNextGear(veh, controlledGear)
                    end
                end

                -- 4. ส่งค่าสถานะไปยัง State Bag & บังคับรอบเครื่องยนต์เกมจริง (GTA V Engine Native)
                Entity(veh).state:set("isManual", isManualMode, false)
                Entity(veh).state:set("simRpm", math.floor(simulatedRpm), false)
                Entity(veh).state:set("maxRpm", currentSpec.maxRpm, false)
                local displayGear = isNeutral and "N" or (isReverse and "R" or controlledGear)
                Entity(veh).state:set("controlledGear", displayGear, false)

                -- แปลงรอบจริง (simulatedRpm) เข้าสเกลเกม GTA V (0.2 idle - 1.0 redline)
                -- ผูกตามสัดส่วน simulatedRpm / maxRpm ตรงๆ ถ้าตั้ง idleRpm ไว้ 5000 ก็จะเริ่มคำรามและออกตัวจาก 5000 ทันที
                local normalizedRpm = math.max(0.20, math.min(1.0, simulatedRpm / currentSpec.maxRpm))

                if isThrottle then
                    -- ตอนออกตัว (speedKmh < 8.0) ปล่อยให้คลัตช์และรอบเครื่องทำงานอิสระเต็มที่ ไม่ override ให้หนืดค้าง ยกเว้นรอบตั้งเดินเบาสูงกว่า native
                    if speedKmh < 8.0 then
                        local nativeRpm = GetVehicleCurrentRpm(veh)
                        if normalizedRpm > (nativeRpm + 0.05) then
                            SetVehicleCurrentRpm(veh, normalizedRpm)
                        end
                    else
                        -- เมื่อวิ่งด้วยความเร็ว (speedKmh >= 8.0): ส่งรอบเครื่องตาม normalizedRpm ตรงๆ
                        -- รอบต้องตกลงทันทีเมื่อสับเกียร์ขึ้น เพื่อให้คลัตช์เกมจับสนิท 100% ส่งกำลังเต็มที่ ไม่มีอาการกำลังวูบหาย
                        SetVehicleCurrentRpm(veh, normalizedRpm)
                    end
                else
                    SetVehicleCurrentRpm(veh, normalizedRpm)
                end

                -- 5. คุม Fuel Cut ตอนรอบตัด / ชนเพดานเกียร์
                local shouldFuelCut = false
                if isThrottle and speedKmh > 5.0 then
                    shouldFuelCut = isRevLimiterBouncing or (simulatedRpm >= (currentSpec.maxRpm - 100))
                end

                if isNeutral then
                    SetVehicleEnginePowerMultiplier(veh, 0.0)
                elseif shouldFuelCut then
                    SetVehicleEnginePowerMultiplier(veh, 0.0)
                else
                    SetVehicleEnginePowerMultiplier(veh, 1.0)
                end

                -- ส่งผ่านตัวคูณแรงบิด (ไม่ดร็อปต่ำกว่า 1.0 เพื่อไม่ให้เกียร์สูงโดนลดกำลังซ้ำซ้อนจนรถหมดแรง)
                SetVehicleEngineTorqueMultiplier(veh, isReverse and 1.0 or math.max(1.0, currentTorqueMult or 1.0))
            else
                if currentVeh then
                    RestoreBaseHandling(currentVeh)
                    currentVeh = nil
                end
                Citizen.Wait(250)
            end

            -- ต้อง Wait(0) ทุกเฟรมตอนขับ เพื่อ override ฟิสิกส์เครื่องยนต์ของ GTA V ให้รอบและเสียงนิ่ง
            Citizen.Wait(0)
        else
            if currentVeh then
                RestoreBaseHandling(currentVeh)
                currentVeh = nil
            end
            controlledGear = 1
            Citizen.Wait(1000)
        end
    end
end)

AddEventHandler('onClientResourceStop', function(resourceName)
    if resourceName == GetCurrentResourceName() and currentVeh then
        RestoreBaseHandling(currentVeh)
    end
end)

AddEventHandler('onResourceStop', function(resourceName)
    if resourceName == GetCurrentResourceName() and currentVeh then
        RestoreBaseHandling(currentVeh)
    end
end)

exports("GetVehicleSimRpm", function(veh)
    if not veh or not DoesEntityExist(veh) then return nil end
    local st = Entity(veh).state.simRpm
    return st or simulatedRpm
end)

exports("GetVehicleMaxRpm", function(veh)
    if not veh or not DoesEntityExist(veh) then return nil end
    local spec = GetVehicleSpec(veh)
    return spec and spec.maxRpm or nil
end)

-- =====================================================================
-- Manual Transmission Key Mappings, Commands & Exports
-- =====================================================================
local function PlayShiftSound()
    PlaySoundFrontend(-1, "NAV_UP_DOWN", "HUD_FRONTEND_DEFAULT_SOUNDSET", true)
end

RegisterCommand("+toggletrans", function()
    local ped = PlayerPedId()
    local veh = GetVehiclePedIsIn(ped, false)
    if not veh or veh == 0 or GetPedInVehicleSeat(veh, -1) ~= ped then return end

    isManualMode = not isManualMode
    if isManualMode then
        manualGear = (controlledGear and controlledGear > 0) and controlledGear or 1
    else
        if manualGear <= 0 then
            controlledGear = 1
        end
    end
    PlayShiftSound()
    if lib and lib.notify then
        lib.notify({
            title = "Transmission",
            description = isManualMode and "Mode: MANUAL (Sequential / Paddle Shift)" or "Mode: AUTO",
            type = "info",
            duration = 2000
        })
    end
end, false)
RegisterCommand("-toggletrans", function() end, false)

RegisterCommand("+shiftup", function()
    local ped = PlayerPedId()
    local veh = GetVehiclePedIsIn(ped, false)
    if not veh or veh == 0 or GetPedInVehicleSeat(veh, -1) ~= ped then return end
    if not isManualMode then return end

    local maxGears = GetVehicleHandlingInt(veh, "CHandlingData", "nInitialDriveGears") or 6
    if manualGear == -1 then
        manualGear = 0 -- R -> N
        PlayShiftSound()
    elseif manualGear == 0 then
        manualGear = 1 -- N -> 1
        ApplyGearTorque(veh, 1, true)
        SetVehicleCurrentGear(veh, 1)
        SetVehicleNextGear(veh, 1)
        PlayShiftSound()
    elseif manualGear < maxGears then
        manualGear = manualGear + 1
        ApplyGearTorque(veh, manualGear, true)
        SetVehicleCurrentGear(veh, manualGear)
        SetVehicleNextGear(veh, manualGear)
        PlayShiftSound()
    end
end, false)
RegisterCommand("-shiftup", function() end, false)

RegisterCommand("+shiftdown", function()
    local ped = PlayerPedId()
    local veh = GetVehiclePedIsIn(ped, false)
    if not veh or veh == 0 or GetPedInVehicleSeat(veh, -1) ~= ped then return end
    if not isManualMode then return end

    local speedKmh = GetEntitySpeed(veh) * 3.6
    if manualGear > 1 then
        manualGear = manualGear - 1
        ApplyGearTorque(veh, manualGear, true)
        SetVehicleCurrentGear(veh, manualGear)
        SetVehicleNextGear(veh, manualGear)
        PlayShiftSound()
    elseif manualGear == 1 then
        manualGear = 0 -- 1 -> N
        PlayShiftSound()
    elseif manualGear == 0 then
        if speedKmh < 15.0 then
            manualGear = -1 -- N -> R (เฉพาะความเร็วต่ำกว่า 15 km/h)
            PlayShiftSound()
        end
    end
end, false)
RegisterCommand("-shiftdown", function() end, false)

local keyToggle = (Config.Keybinds and Config.Keybinds.toggleMode) or "M"
local keyUp = (Config.Keybinds and Config.Keybinds.shiftUp) or "LSHIFT"
local keyDown = (Config.Keybinds and Config.Keybinds.shiftDown) or "LCONTROL"

RegisterKeyMapping("+toggletrans", "Toggle Transmission Mode (Auto/Manual)", "keyboard", keyToggle)
RegisterKeyMapping("+shiftup", "Transmission Shift Up", "keyboard", keyUp)
RegisterKeyMapping("+shiftdown", "Transmission Shift Down", "keyboard", keyDown)

exports("GetTransmissionMode", function()
    return isManualMode and "MANUAL" or "AUTO"
end)

exports("SetTransmissionMode", function(mode)
    if mode == "MANUAL" then
        isManualMode = true
        if manualGear <= 0 then manualGear = 1 end
    elseif mode == "AUTO" then
        isManualMode = false
    end
end)

exports("GetCurrentGear", function()
    if isManualMode then
        return manualGear == -1 and "R" or (manualGear == 0 and "N" or manualGear)
    end
    return controlledGear == 0 and "R" or controlledGear
end)
