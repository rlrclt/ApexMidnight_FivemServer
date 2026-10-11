-- SERVER-SIDE NUI BACKEND HANDLERS

-- Callback: ดึงรายชื่อผู้เล่นออนไลน์พร้อมชื่อตัวละครและ CitizenID
lib.callback.register('qbx_admin:server:getNuiPlayers', function(source)
    local players = {}
    local onlinePlayers = exports.qbx_core:GetQBPlayers()
    for src, p in pairs(onlinePlayers) do
        players[#players + 1] = {
            id = src,
            name = GetPlayerName(src),
            charName = (p.PlayerData.charinfo.firstname or '') .. ' ' .. (p.PlayerData.charinfo.lastname or ''),
            cid = p.PlayerData.citizenid,
            ping = GetPlayerPing(src)
        }
    end
    table.sort(players, function(a, b) return a.id < b.id end)
    return players
end)

-- Event: เสกไอเทมหลายชิ้นพร้อมกันในคลิกเดียว (Multi-Select Give Items)
RegisterNetEvent('qbx_admin:server:giveMultipleItems', function(data)
    local src = source
    if not IsPlayerAceAllowed(src, 'command.admin') and not IsPlayerAceAllowed(src, 'group.admin') then
        return exports.qbx_core:Notify(src, 'คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้', 'error')
    end

    local target = data.target == 'me' and src or tonumber(data.target)
    if not target or not exports.qbx_core:GetPlayer(target) then
        return exports.qbx_core:Notify(src, 'ไม่พบผู้เล่นเป้าหมาย', 'error')
    end

    local items = data.items
    if not items or #items == 0 then return end

    local totalCount = 0
    local itemNames = {}

    for i = 1, #items do
        local item = items[i]
        local count = tonumber(item.count) or 1
        local success = exports.ox_inventory:AddItem(target, item.name, count)
        if success then
            totalCount += count
            itemNames[#itemNames + 1] = item.name .. ' x' .. count
        end
    end

    local targetName = GetPlayerName(target)
    exports.qbx_core:Notify(src, ('เสกไอเทมสำเร็จ %s รายการ ให้กับ %s'):format(#itemNames, targetName), 'success')
    if target ~= src then
        exports.qbx_core:Notify(target, ('แอดมินมอบไอเทมให้คุณ: %s รายการ'):format(#itemNames), 'inform')
    end
end)

-- Event: การกระทำกับผู้เล่น (Player Action)
RegisterNetEvent('qbx_admin:server:nuiPlayerAction', function(data)
    local src = source
    if not IsPlayerAceAllowed(src, 'command.admin') and not IsPlayerAceAllowed(src, 'group.admin') then
        return exports.qbx_core:Notify(src, 'คุณไม่มีสิทธิ์ใช้งาน', 'error')
    end

    local target = data.target == 'me' and src or tonumber(data.target)
    if not target or not exports.qbx_core:GetPlayer(target) then
        return exports.qbx_core:Notify(src, 'ไม่พบผู้เล่น', 'error')
    end

    local action = data.action
    local ped = GetPlayerPed(src)
    local targetPed = GetPlayerPed(target)

    if action == 'goto' then
        local coords = GetEntityCoords(targetPed)
        SetEntityCoords(ped, coords.x, coords.y, coords.z)
        exports.qbx_core:Notify(src, 'วาร์ปไปหา ' .. GetPlayerName(target) .. ' แล้ว', 'success')
    elseif action == 'bring' then
        local coords = GetEntityCoords(ped)
        SetEntityCoords(targetPed, coords.x, coords.y, coords.z)
        exports.qbx_core:Notify(src, 'ดึงตัว ' .. GetPlayerName(target) .. ' มาหาแล้ว', 'success')
    elseif action == 'revive' then
        if GetResourceState('qbx_medical') == 'started' then
            exports.qbx_medical:Revive(target)
        else
            TriggerClientEvent('qbx_medical:client:playerRevived', target)
            TriggerClientEvent('hospital:client:Revive', target)
        end
        exports.qbx_core:Notify(src, 'ชุบชีวิต ' .. GetPlayerName(target) .. ' เรียบร้อยแล้ว', 'success')
    elseif action == 'kill' then
        TriggerClientEvent('qbx_admin:client:killPlayer', target)
        exports.qbx_core:Notify(src, 'สังหาร ' .. GetPlayerName(target) .. ' แล้ว', 'success')
    elseif action == 'freeze' then
        local isFrozen = Entity(targetPed).state.isFrozen or false
        Entity(targetPed).state:set('isFrozen', not isFrozen, true)
        FreezeEntityPosition(targetPed, not isFrozen)
        exports.qbx_core:Notify(src, not isFrozen and 'แช่แข็งตัวแล้ว' or 'ปลดแช่แข็งแล้ว', 'inform')
    elseif action == 'clothing' then
        TriggerClientEvent('qb-clothing:client:openMenu', target)
        exports.qbx_core:Notify(src, 'เปิดเมนูแต่งตัวให้ ' .. GetPlayerName(target) .. ' แล้ว', 'success')
    elseif action == 'kick' then
        DropPlayer(target, 'คุณถูกเตะออกจากเซิร์ฟเวอร์โดยแอดมิน')
        exports.qbx_core:Notify(src, 'เตะผู้เล่นออกจากเซิร์ฟเวอร์แล้ว', 'inform')
    elseif action == 'ban' then
        local reason = 'ถูกแบนโดยแอดมินผ่านเมนูควบคุม'
        local banDuration = 86400
        DropPlayer(target, reason)
        MySQL.Async.insert('INSERT INTO bans (name, license, discord, ip, reason, expire, bannedby) VALUES (?, ?, ?, ?, ?, ?, ?)', {
            GetPlayerName(target),
            GetPlayerIdentifierByType(target, 'license'),
            GetPlayerIdentifierByType(target, 'discord'),
            GetPlayerIdentifierByType(target, 'ip'),
            reason,
            os.time() + banDuration,
            GetPlayerName(src)
        })
        exports.qbx_core:Notify(src, 'แบนผู้เล่นเรียบร้อยแล้ว', 'success')
    end
end)

-- Event: เสกรถ (NUI Spawn Vehicle)
RegisterNetEvent('qbx_admin:server:nuiSpawnVehicle', function(model)
    local src = source
    if not IsPlayerAceAllowed(src, 'command.admin') and not IsPlayerAceAllowed(src, 'group.admin') then return end

    local ped = GetPlayerPed(src)
    local coords = GetEntityCoords(ped)
    local heading = GetEntityHeading(ped)

    local veh = CreateVehicle(joaat(model), coords.x, coords.y, coords.z, heading, true, true)
    local timeout = 0
    while not DoesEntityExist(veh) and timeout < 30 do
        Wait(50)
        timeout = timeout + 1
    end

    if not DoesEntityExist(veh) then
        return exports.qbx_core:Notify(src, 'ไม่สามารถเสกรถได้ (ชื่อโมเดลรถไม่ถูกต้อง)', 'error')
    end

    SetPedIntoVehicle(ped, veh, -1)
    local plate = GetVehicleNumberPlateText(veh)

    if GetResourceState('qbx_vehiclekeys') == 'started' then
        exports.qbx_vehiclekeys:GiveKeys(src, veh)
    end
    TriggerClientEvent('qb-vehiclekeys:client:AddKeys', src, plate)
    exports.qbx_core:Notify(src, 'เสกรถ ' .. model .. ' สำเร็จ (ทะเบียน: ' .. plate .. ')', 'success')
end)

-- Event: เปลี่ยนป้ายทะเบียน
RegisterNetEvent('qbx_admin:server:nuiChangePlate', function(vehNetId, newPlate)
    local src = source
    local veh = NetworkGetEntityFromNetworkId(vehNetId)
    if not DoesEntityExist(veh) then return end

    SetVehicleNumberPlateText(veh, newPlate)
    if GetResourceState('qbx_vehiclekeys') == 'started' then
        exports.qbx_vehiclekeys:GiveKeys(src, veh)
    end
    TriggerClientEvent('qb-vehiclekeys:client:AddKeys', src, newPlate)
    exports.qbx_core:Notify(src, 'เปลี่ยนป้ายทะเบียนเป็น: ' .. newPlate .. ' สำเร็จ', 'success')
end)

-- Event: ปรับสภาพอากาศและเวลา
RegisterNetEvent('qbx_admin:server:nuiSetWeather', function(weather)
    local src = source
    if not IsPlayerAceAllowed(src, 'command.admin') and not IsPlayerAceAllowed(src, 'group.admin') then return end
    if type(weather) ~= 'string' then return end

    if GetResourceState('Renewed-Weathersync') == 'started' then
        pcall(function() exports['qb-weathersync']:setWeather(weather) end)
        TriggerEvent('qb-weathersync:server:setWeather', weather)
    end
    exports.qbx_core:Notify(src, 'เปลี่ยนสภาพอากาศเป็น: ' .. weather, 'inform')
end)

RegisterNetEvent('qbx_admin:server:nuiSetTime', function(hour)
    local src = source
    if not IsPlayerAceAllowed(src, 'command.admin') and not IsPlayerAceAllowed(src, 'group.admin') then return end
    hour = tonumber(hour)
    if not hour or hour < 0 or hour > 23 then return end

    if GetResourceState('Renewed-Weathersync') == 'started' then
        pcall(function() exports['qb-weathersync']:setTime(hour, 0) end)
        TriggerEvent('qb-weathersync:server:setTime', hour, 0)
    end
    exports.qbx_core:Notify(src, ('เปลี่ยนเวลาเป็น: %02d:00 น.'):format(hour), 'inform')
end)

RegisterNetEvent('qbx_admin:server:nuiAnnouncement', function(msg)
    local src = source
    TriggerClientEvent('chat:addMessage', -1, {
        color = {255, 60, 60},
        multiline = true,
        args = {'📢 ประกาศจากแอดมิน [' .. GetPlayerName(src) .. ']', msg}
    })
    exports.qbx_core:Notify(src, 'ส่งข้อความประกาศเรียบร้อยแล้ว', 'success')
end)
