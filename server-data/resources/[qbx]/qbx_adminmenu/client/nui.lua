local isMenuOpen = false
local togglesState = {
    noclip = false,
    godmode = false,
    invisible = false,
    names = false,
    blips = false,
    infiniteammo = false,
}

local function closeModernAdminMenu()
    isMenuOpen = false
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false)
    SendNUIMessage({ action = 'close' })
end

local function openModernAdminMenu()
    if isMenuOpen then
        closeModernAdminMenu()
        return
    end

    isMenuOpen = true
    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(false)

    -- สั่งเปิดหน้าต่าง NUI ทันที 0ms ป้องกันหน้าจอค้าง
    SendNUIMessage({
        action = 'open',
        toggles = togglesState
    })

    -- ดึงข้อมูลผู้เล่นแบบ Asynchronous
    CreateThread(function()
        local success, players = pcall(function()
            return lib.callback.await('qbx_admin:server:getNuiPlayers', false)
        end)
        if success and players and isMenuOpen then
            SendNUIMessage({
                action = 'updatePlayers',
                players = players
            })
        end
    end)
end

RegisterNetEvent('qbx_admin:client:openModernMenu', function()
    openModernAdminMenu()
end)

-- NUI CALLBACKS
RegisterNUICallback('close', function(_, cb)
    closeModernAdminMenu()
    if cb then cb('ok') end
end)

RegisterCommand('closeadmin', function()
    closeModernAdminMenu()
    exports.qbx_core:Notify('ปลดล็อกหน้าจอแอดมินเรียบร้อยแล้ว', 'inform')
end, false)

RegisterNUICallback('requestPlayers', function(_, cb)
    CreateThread(function()
        local players = lib.callback.await('qbx_admin:server:getNuiPlayers', false)
        cb(players or {})
    end)
end)

RegisterNUICallback('requestItems', function(_, cb)
    local rawItems = exports.ox_inventory:Items() or {}
    local formatted = {}
    for name, item in pairs(rawItems) do
        local imgName
        if item.client and item.client.image then
            imgName = item.client.image
        elseif name:sub(1, 7):lower() == 'weapon_' then
            imgName = name:upper() .. '.png'
        else
            imgName = name:lower() .. '.png'
        end

        local category = item.category
        if not category then
            local n = name:lower()
            if n:sub(1, 7) == 'weapon_' then category = 'weapons'
            elseif n:sub(1, 5) == 'ammo-' then category = 'ammo'
            elseif n:find('burger') or n:find('water') or n:find('coffee') or n:find('sandwich') or n:find('cola') then category = 'food'
            elseif n:find('bandage') or n:find('firstaid') or n:find('med') then category = 'medical'
            elseif n:find('kit') or n:find('lockpick') or n:find('drill') then category = 'tools'
            else category = 'general' end
        end

        formatted[#formatted + 1] = {
            name = name,
            label = item.label or name,
            weight = item.weight or 0,
            image = imgName,
            category = category
        }
    end
    table.sort(formatted, function(a, b)
        return (a.label or a.name) < (b.label or b.name)
    end)
    cb(formatted)
end)

RegisterNUICallback('giveMultipleItems', function(data, cb)
    TriggerServerEvent('qbx_admin:server:giveMultipleItems', data)
    cb('ok')
end)

RegisterNUICallback('playerAction', function(data, cb)
    TriggerServerEvent('qbx_admin:server:nuiPlayerAction', data)
    cb('ok')
end)

RegisterNUICallback('spawnVehicle', function(data, cb)
    if not data.model then return cb('err') end
    TriggerServerEvent('qbx_admin:server:nuiSpawnVehicle', data.model)
    cb('ok')
end)

RegisterNUICallback('changePlate', function(data, cb)
    if not cache.vehicle then
        exports.qbx_core:Notify('คุณต้องนั่งอยู่ในรถก่อนจึงจะเปลี่ยนป้ายทะเบียนได้', 'error')
        return cb('err')
    end
    TriggerServerEvent('qbx_admin:server:nuiChangePlate', VehToNet(cache.vehicle), data.plate)
    cb('ok')
end)

RegisterNUICallback('vehAction', function(data, cb)
    local action = data.action
    if action == 'fix' then
        ExecuteCommand('fix')
    elseif action == 'save' then
        ExecuteCommand('admincar')
    elseif action == 'tune' then
        if cache.vehicle then
            exports.qbx_customs:OpenMenu()
        else
            exports.qbx_core:Notify('คุณต้องนั่งอยู่ในรถก่อน', 'error')
        end
    elseif action == 'dv' then
        ExecuteCommand('dv')
    end
    cb('ok')
end)

RegisterNUICallback('toggleTool', function(data, cb)
    local tool = data.tool
    if tool == 'noclip' then
        ExecuteCommand('noclip')
        togglesState.noclip = not togglesState.noclip
    elseif tool == 'godmode' then
        local isInvincible = not GetPlayerInvincible(cache.playerId)
        SetPlayerInvincible(cache.playerId, isInvincible)
        togglesState.godmode = isInvincible
        exports.qbx_core:Notify(isInvincible and 'เปิดโหมดอมตะแล้ว' or 'ปิดโหมดอมตะแล้ว', 'inform')
    elseif tool == 'invisible' then
        local isVis = IsEntityVisible(cache.ped)
        SetEntityVisible(cache.ped, not isVis, false)
        togglesState.invisible = isVis
        exports.qbx_core:Notify(isVis and 'เปิดโหมดล่องหนแล้ว' or 'ปิดโหมดล่องหนแล้ว', 'inform')
    elseif tool == 'names' then
        ExecuteCommand('names')
        togglesState.names = not togglesState.names
    elseif tool == 'blips' then
        ExecuteCommand('blips')
        togglesState.blips = not togglesState.blips
    elseif tool == 'infiniteammo' then
        local state = not GetPedConfigFlag(cache.ped, 9, false)
        SetPedInfiniteAmmoClip(cache.ped, state)
        togglesState.infiniteammo = state
        exports.qbx_core:Notify(state and 'เปิดกระสุนไม่จำกัดแล้ว' or 'ปิดกระสุนไม่จำกัดแล้ว', 'inform')
    end

    SendNUIMessage({
        action = 'updateToggles',
        toggles = togglesState
    })
    cb('ok')
end)

RegisterNUICallback('setWeather', function(data, cb)
    TriggerServerEvent('qbx_admin:server:nuiSetWeather', data.weather)
    cb('ok')
end)

RegisterNUICallback('setTime', function(data, cb)
    TriggerServerEvent('qbx_admin:server:nuiSetTime', data.hour)
    cb('ok')
end)

RegisterNUICallback('sendAnnouncement', function(data, cb)
    TriggerServerEvent('qbx_admin:server:nuiAnnouncement', data.message)
    cb('ok')
end)
