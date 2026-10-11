local DEATH_STATE_STATE_BAG = 'deathState'
local DEATH_STATE = {
    ALIVE = 1,
    LAST_STAND = 2,
    DEAD = 3
}

local isDeathUiOpen = false
local deathTimerMs = 300000 -- 5 นาที (Bleedout)
local earlyRespawnTimerMs = 30000 -- 30 วินาที (Early Respawn)
local deathStartMs = 0
local lastBumpTime = 0
local isBumping = false

-- ฟังก์ชันเปิดหน้าจอ Next Death
local function OpenNextDeathUI()
    if isDeathUiOpen then return end
    isDeathUiOpen = true
    deathStartMs = GetGameTimer()

    SendNUIMessage({
        action = 'open',
        allowEarly = true,
        locale = 'th'
    })

    CreateThread(function()
        while isDeathUiOpen do
            local elapsed = GetGameTimer() - deathStartMs
            local remainBleed = math.max(0, deathTimerMs - elapsed)
            local remainEarly = math.max(0, earlyRespawnTimerMs - elapsed)

            SendNUIMessage({
                action = 'update',
                remainBleed = remainBleed,
                bleedoutMs = deathTimerMs,
                remainEarly = remainEarly,
                earlyMs = earlyRespawnTimerMs
            })

            Wait(1000)
        end
    end)
end

-- ฟังก์ชันปิดหน้าจอ Next Death
local function CloseNextDeathUI()
    if not isDeathUiOpen then return end
    isDeathUiOpen = false
    SendNUIMessage({
        action = 'close'
    })
end

-- ฟังก์ชันกระตุก/เด้งโมเดลศพ (Corpse Physics Bump & Resync)
local function DoCorpseBump()
    if isBumping then return end
    local curTime = GetGameTimer()
    if curTime - lastBumpTime < 5000 then
        local secWait = math.ceil((5000 - (curTime - lastBumpTime)) / 1000)
        exports.qbx_core:Notify(('กรุณารออีก %d วินาที ก่อนเด้งศพอีกครั้ง'):format(secWait), 'error', 2000)
        return
    end

    lastBumpTime = curTime
    isBumping = true

    local ped = PlayerPedId()
    local coords = GetEntityCoords(ped)

    -- 1. ตัด Task เดิมที่ล็อกตัวละครออก
    ClearPedTasksImmediately(ped)

    -- 2. ยกพิกัดตัวละครลอยขึ้นจากพื้นเล็กน้อย เพื่อไม่ให้ติดพื้น/จมฟุตบาท
    SetEntityCoords(ped, coords.x, coords.y, coords.z + 0.35, true, true, true, false)

    -- 3. เปิด Ragdoll ฟิสิกส์และส่งแรงดีดโมเดลขึ้นด้านบน (ให้เห็นตัวละครเด้งจริง ๆ)
    SetPedToRagdoll(ped, 1200, 1200, 0, false, false, false)
    ApplyForceToEntityCenterOfMass(ped, 1, 0.0, 0.0, 3.8, true, true, true, true)

    -- 4. ส่งบอก NUI ให้อัปเดตสถานะปุ่ม
    SendNUIMessage({
        action = 'bumpTriggered',
        cooldown = 5
    })

    -- 5. ส่งพิกัดบอก Server ซิงค์ให้หมอและผู้เล่นทุกคนในบริเวณรอบข้างเห็นโมเดลศพชัดเจน
    TriggerServerEvent('next_death:server:syncCorpse', coords)

    exports.qbx_core:Notify('เด้งศพสำเร็จ! (รีเฟรชโมเดลและพิกัดให้หมอเห็นแล้ว)', 'success', 3500)

    -- 6. เมื่อโมเดลตกถึงพื้น ให้กลับเข้าสู่ท่าทางนอนตายอย่างสวยงาม
    CreateThread(function()
        Wait(1200)
        local state = LocalPlayer.state.deathState
        if state == DEATH_STATE.DEAD or state == DEATH_STATE.LAST_STAND or isDeathUiOpen then
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

-- Key Mapping และ Command สำหรับปุ่ม B
RegisterCommand('bumpcorpse', function()
    if isDeathUiOpen then
        DoCorpseBump()
    end
end, false)
RegisterKeyMapping('bumpcorpse', 'เด้งศพเมื่อนอนตาย (Next Death)', 'keyboard', 'B')

-- Loop ดักจับปุ่มกดบนคีย์บอร์ดในเกมโดยตรง (B, G, E, R)
CreateThread(function()
    while true do
        local sleep = 350
        if isDeathUiOpen then
            sleep = 0
            -- ปลดล็อกปุ่มจำเป็นให้ผู้เล่นกดและหมุนมุมกล้องได้
            DisableAllControlActions(0)
            EnableControlAction(0, 1, true)   -- Look LR
            EnableControlAction(0, 2, true)   -- Look UD
            EnableControlAction(0, 245, true) -- Chat (T)

            -- ปุ่ม B = เด้งศพ (Control 29)
            if IsDisabledControlJustPressed(0, 29) or IsControlJustPressed(0, 29) then
                DoCorpseBump()
            end

            -- ปุ่ม G = เกิดตำแหน่งเดิม (Control 47)
            if IsDisabledControlJustPressed(0, 47) or IsControlJustPressed(0, 47) then
                CloseNextDeathUI()
                TriggerServerEvent('next_death:server:respawnHere')
            end

            -- ปุ่ม E = เรียกหมอ (Control 38)
            if IsDisabledControlJustPressed(0, 38) or IsControlJustPressed(0, 38) then
                TriggerServerEvent('hospital:server:ambulanceAlert', 'มีประชาชนหมดสติ/ต้องการความช่วยเหลือด่วน')
                SendNUIMessage({ action = 'called' })
                exports.qbx_core:Notify('ส่งสัญญาณเรียกหน่วยกู้ชีพ (EMS) เรียบร้อยแล้ว', 'success', 4000)
            end

            -- ปุ่ม R = เกิดโรงพยาบาล (Control 45)
            if IsDisabledControlJustPressed(0, 45) or IsControlJustPressed(0, 45) then
                local elapsed = GetGameTimer() - deathStartMs
                if elapsed >= earlyRespawnTimerMs then
                    CloseNextDeathUI()
                    TriggerServerEvent('next_death:server:respawnHospital')
                else
                    local waitSec = math.ceil((earlyRespawnTimerMs - elapsed) / 1000)
                    exports.qbx_core:Notify(('ต้องรออีก %d วินาทีจึงจะเกิดที่โรงพยาบาลได้'):format(waitSec), 'error', 3000)
                end
            end
        end
        Wait(sleep)
    end
end)

-- 1. NUI Callback: เรียกหมอ (Call EMS)
RegisterNUICallback('callEMS', function(_, cb)
    TriggerServerEvent('hospital:server:ambulanceAlert', 'มีประชาชนหมดสติ/ต้องการความช่วยเหลือด่วน')
    SendNUIMessage({ action = 'called' })
    exports.qbx_core:Notify('ส่งสัญญาณเรียกหน่วยกู้ชีพ (EMS) เรียบร้อยแล้ว', 'success', 5000)
    cb('ok')
end)

-- 2. NUI Callback: เกิดที่โรงพยาบาล (Respawn Hospital)
RegisterNUICallback('respawn', function(_, cb)
    local elapsed = GetGameTimer() - deathStartMs
    if elapsed < earlyRespawnTimerMs then
        local waitSec = math.ceil((earlyRespawnTimerMs - elapsed) / 1000)
        exports.qbx_core:Notify(('ต้องรออีก %d วินาทีจึงจะเกิดที่โรงพยาบาลได้'):format(waitSec), 'error', 3000)
        cb('not_ready')
        return
    end
    CloseNextDeathUI()
    TriggerServerEvent('next_death:server:respawnHospital')
    cb('ok')
end)

-- 3. NUI Callback: เกิดตำแหน่งเดิมที่ตาย (Respawn Here)
RegisterNUICallback('respawnHere', function(_, cb)
    CloseNextDeathUI()
    TriggerServerEvent('next_death:server:respawnHere')
    cb('ok')
end)

-- 4. NUI Callback: เด้งศพ (Sync/Bump Corpse จากการคลิก NUI)
RegisterNUICallback('bumpCorpse', function(_, cb)
    DoCorpseBump()
    cb('ok')
end)

-- Client Event รับคำสั่งให้รีเฟรชโมเดลของคนที่เด้งศพ (หมอและผู้เล่นใกล้เคียงจะเห็นศพทันที)
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

-- Event เมื่อผู้เล่นได้รับการชุบชีวิต
RegisterNetEvent('qbx_medical:client:playerRevived', function()
    CloseNextDeathUI()
end)

-- Event เมื่อผู้เล่นตาย
RegisterNetEvent('qbx_medical:client:onPlayerDied', function()
    OpenNextDeathUI()
end)

-- ตรวจสอบ State Bag การตายของ qbx_medical
AddStateBagChangeHandler(DEATH_STATE_STATE_BAG, ('player:%s'):format(GetPlayerServerId(PlayerId())), function(_, _, value)
    if value == DEATH_STATE.DEAD or value == DEATH_STATE.LAST_STAND then
        OpenNextDeathUI()
    elseif value == DEATH_STATE.ALIVE then
        CloseNextDeathUI()
    end
end)

exports('OpenDeathUI', OpenNextDeathUI)
exports('CloseDeathUI', CloseNextDeathUI)
exports('DoCorpseBump', DoCorpseBump)
