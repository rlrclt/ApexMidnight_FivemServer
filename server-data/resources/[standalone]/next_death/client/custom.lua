local DEATH_STATE_STATE_BAG = 'qbx_medical:deathState'
local lastBumpTime = 0
local isBumping = false
local cursorActive = false
local canRespawnEarly = false
local remainEarlyMs = 0

-- ตรวจสอบว่าผู้เล่นอยู่ในสถานะตาย/หมดสติหรือไม่
local function IsPlayerDownedOrDead()
    local deathState = LocalPlayer.state[DEATH_STATE_STATE_BAG] or 1
    if deathState == 2 or deathState == 3 then
        return true
    end
    if LocalPlayer.state.isDead then
        return true
    end
    local ped = PlayerPedId()
    if IsEntityDead(ped) or GetEntityHealth(ped) <= 0 then
        return true
    end
    return false
end

-- 1. ฟังก์ชันเกิดตำแหน่งเดิมที่ตาย (Respawn Here)
local function DoRespawnHere()
    if not IsPlayerDownedOrDead() then return end

    -- ตรวจสอบคูลดาวน์ก่อนอนุญาตให้เกิด
    if not canRespawnEarly then
        local secWait = math.max(1, math.ceil(remainEarlyMs / 1000))
        if exports.qbx_core then
            exports.qbx_core:Notify(('ยังไม่ถึงเวลาเกิด กรุณารออีก %d วินาที'):format(secWait), 'error', 3000)
        end
        return
    end

    -- ปิด NUI และ Vignette ทันที
    SendNUIMessage({ action = 'close' })
    SendNUIMessage({ action = 'forceStopBlinking' })
    SetNuiFocus(false, false)
    cursorActive = false

    -- เรียก Server เพื่อใช้ระบบ Revive ทางการของ qbx_medical
    -- ให้ qbx_medical เป็นตัวรีเซ็ตสถานะและส่ง event ชุบชีวิตอย่างสมบูรณ์
    TriggerServerEvent('next_death:server:respawnHere')

    -- ปลดล็อก Ped tasks และ ragdoll เพื่อให้ตัวละครลุกขึ้นยืนได้อย่างเป็นธรรมชาติ
    CreateThread(function()
        Wait(150)
        local ped = PlayerPedId()
        ClearPedTasksImmediately(ped)
        ClearPedSecondaryTask(ped)
        SetPedToRagdoll(ped, 0, 0, 0, false, false, false)
        ResetPedMovementClipset(ped, 0.0)
    end)

    if exports.qbx_core then
        exports.qbx_core:Notify('ฟื้นคืนชีพตรงตำแหน่งเดิมเรียบร้อยแล้ว!', 'success', 4000)
    end
end

-- 2. ฟังก์ชันเด้งศพ (Corpse Physics Bump & Area Resync)
-- ใช้ได้เฉพาะตอนตาย/หมดสติเท่านั้น (HP <= 0 หรือ deathState 2/3)
local function DoCorpseBump()
    if not IsPlayerDownedOrDead() then return end
    local pedCheck = PlayerPedId()
    local hpCheck = GetEntityHealth(pedCheck)
    local dsCheck = LocalPlayer.state[DEATH_STATE_STATE_BAG] or 1
    if hpCheck > 0 and dsCheck == 1 and not LocalPlayer.state.isDead then return end
    if isBumping then return end
    local curTime = GetGameTimer()
    if curTime - lastBumpTime < 5000 then return end

    lastBumpTime = curTime
    isBumping = true

    local ped = PlayerPedId()
    local coords = GetEntityCoords(ped)

    -- 1. ตัดแอนิเมชันล็อกเดิมออก
    ClearPedTasksImmediately(ped)

    -- 2. ดึงตัวละครลอยขึ้นจากพื้น 35 ซม. แก้ปัญหาจมพื้นหรือติด Prop
    SetEntityCoords(ped, coords.x, coords.y, coords.z + 0.35, true, true, true, false)

    -- 3. เปิดระบบ Ragdoll และดีดแรงขึ้นในแนวแกน Z เพื่อให้เห็นโมเดลเด้งกระตุกจริง ๆ
    SetPedToRagdoll(ped, 1200, 1200, 0, false, false, false)
    ApplyForceToEntityCenterOfMass(ped, 1, 0.0, 0.0, 4.2, true, true, true, true)

    -- 4. ส่งบอก NUI ให้ขึ้นสถานะ Cooldown
    SendNUIMessage({
        action = 'bumpTriggered',
        cooldown = 5
    })

    -- 5. ส่งบอก Server ให้ซิงค์พิกัดศพกับหมอและผู้เล่นในบริเวณใกล้เคียง
    TriggerServerEvent('next_death:server:syncCorpse', coords)

    if exports.qbx_core then
        exports.qbx_core:Notify('เด้งศพสำเร็จ! (รีเฟรชตำแหน่งให้หมอและคนรอบข้างเห็นศพแล้ว)', 'success', 3500)
    end

    -- 6. เมื่อโมเดลตกลงสู่พื้น ให้กลับเข้าสู่ท่านอนตายอย่างเรียบร้อย
    CreateThread(function()
        Wait(1200)
        if IsPlayerDownedOrDead() then
            RequestAnimDict('dead')
            local timeout = 0
            while not HasAnimDictLoaded('dead') and timeout < 50 do
                Wait(10)
                timeout = timeout + 1
            end
            TaskPlayAnim(ped, 'dead', 'dead_a', 8.0, -8.0, -1, 1, 0, false, false, false)
        end
        isBumping = false
    end)
end

-- สลับเปิด/ปิด Mouse Cursor สำหรับคลิกปุ่มบนหน้าจอ NUI
local function ToggleCursor()
    cursorActive = not cursorActive
    SetNuiFocus(cursorActive, cursorActive)
    if exports.qbx_core then
        local msg = cursorActive and 'เปิดเมาส์ (คลิกปุ่มบนหน้าจอได้แล้ว)' or 'ปิดเมาส์ (ควบคุมมุมกล้อง)'
        exports.qbx_core:Notify(msg, 'inform', 1500)
    end
end

-- คำสั่งพิมพ์ใน Chat เผื่อกดปุ่มไม่ติด
RegisterCommand('bump', DoCorpseBump, false)
RegisterCommand('bumpcorpse', DoCorpseBump, false)
RegisterCommand('respawnhere', DoRespawnHere, false)
RegisterCommand('deathcursor', ToggleCursor, false)

-- ลงทะเบียน Key Mapping สำหรับปุ่มคีย์บอร์ด
RegisterKeyMapping('bumpcorpse', 'เด้งศพเมื่อนอนตาย', 'keyboard', 'X')
RegisterKeyMapping('respawnhere', 'เกิดตำแหน่งเดิมเมื่อนอนตาย', 'keyboard', 'G')

-- Main Thread: ดักจับปุ่มกด X, G, E, R และคลิกขวาตลอดเวลาที่ผู้เล่นนอนตาย
CreateThread(function()
    while true do
        local sleep = 250
        if IsPlayerDownedOrDead() then
            sleep = 0

            -- ปลดล็อกการหมุนมุมกล้องและการแชท
            EnableControlAction(0, 1, true)   -- Look LR
            EnableControlAction(0, 2, true)   -- Look UD
            EnableControlAction(0, 245, true) -- Chat (T)

            -- ปุ่ม X = เด้งศพ (INPUT_VEH_DUCK / 73)
            if IsDisabledControlJustPressed(0, 73) or IsControlJustPressed(0, 73) then
                DoCorpseBump()
            end

            -- ปุ่ม G = เกิดตำแหน่งเดิม (INPUT_DETONATE / 47)
            if IsDisabledControlJustPressed(0, 47) or IsControlJustPressed(0, 47) then
                DoRespawnHere()
            end

            -- ปุ่ม E = เรียกหมอ (INPUT_CONTEXT / 38)
            if IsDisabledControlJustPressed(0, 38) or IsControlJustPressed(0, 38) then
                TriggerServerEvent('hospital:server:ambulanceAlert', 'มีประชาชนหมดสติ/ต้องการความช่วยเหลือด่วน')
                SendNUIMessage({ action = 'called' })
                if exports.qbx_core then
                    exports.qbx_core:Notify('ส่งสัญญาณเรียกหน่วยกู้ชีพ (EMS) เรียบร้อยแล้ว', 'success', 4000)
                end
            end

            -- กดคลิกขวา (Aim / 25) เพื่อสลับ Mouse Cursor ให้คลิกปุ่มบนหน้าจอได้
            if IsDisabledControlJustPressed(0, 25) or IsControlJustPressed(0, 25) then
                ToggleCursor()
            end
        else
            if cursorActive then
                SetNuiFocus(false, false)
                cursorActive = false
            end
        end
        Wait(sleep)
    end
end)

-- NUI Callbacks เมื่อคลิกจากหน้าจอ
RegisterNUICallback('syncRespawnState', function(data, cb)
    canRespawnEarly = data and data.canRespawn or false
    remainEarlyMs = data and data.remainEarly or 0
    cb('ok')
end)

RegisterNUICallback('respawnHere', function(_, cb)
    DoRespawnHere()
    cb('ok')
end)

RegisterNUICallback('bumpCorpse', function(_, cb)
    DoCorpseBump()
    cb('ok')
end)

RegisterNUICallback('closeCursor', function(_, cb)
    SetNuiFocus(false, false)
    cursorActive = false
    cb('ok')
end)

-- ซิงค์ให้หมอและผู้เล่นใกล้เคียงเห็นโมเดลศพชัดเจนขึ้น
RegisterNetEvent('next_death:client:onCorpseBumped', function(targetCoords, targetNetId)
    local myCoords = GetEntityCoords(PlayerPedId())
    local dist = #(myCoords - targetCoords)
    if dist < 200.0 then
        if targetNetId and NetworkDoesNetworkIdExist(targetNetId) then
            local targetPed = NetworkGetEntityFromNetworkId(targetNetId)
            if DoesEntityExist(targetPed) then
                SetEntityAlpha(targetPed, 255, false)
                ResetEntityAlpha(targetPed)
            end
        end
        SetFocusArea(targetCoords.x, targetCoords.y, targetCoords.z, 0.0, 0.0, 0.0)
        Wait(50)
        ClearFocus()
    end
end)

-- ปิด NUI เมื่อได้รับการชุบชีวิต
RegisterNetEvent('qbx_medical:client:playerRevived', function()
    SendNUIMessage({ action = 'close' })
    SetNuiFocus(false, false)
    cursorActive = false
end)

exports('DoCorpseBump', DoCorpseBump)
exports('DoRespawnHere', DoRespawnHere)
