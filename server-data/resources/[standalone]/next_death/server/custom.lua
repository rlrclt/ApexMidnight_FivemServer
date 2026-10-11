-- เกิดตำแหน่งเดิมที่ตาย (Respawn Here)
RegisterNetEvent('next_death:server:respawnHere', function()
    local src = source
    local player = exports.qbx_core:GetPlayer(src)
    if player then
        player.Functions.SetMetaData('isdead', false)
        player.Functions.SetMetaData('inlaststand', false)
    end

    if exports.qbx_medical then
        pcall(function()
            exports.qbx_medical:Revive(src)
        end)
    end
    TriggerClientEvent('qbx_medical:client:playerRevived', src)
end)

-- เกิดที่โรงพยาบาล (Respawn Hospital)
RegisterNetEvent('next_death:server:respawnHospital', function()
    local src = source
    local hospitalCoords = vector4(298.44, -584.89, 43.26, 70.0)

    local player = exports.qbx_core:GetPlayer(src)
    if player then
        player.Functions.SetMetaData('isdead', false)
        player.Functions.SetMetaData('inlaststand', false)
    end

    if exports.qbx_medical then
        pcall(function()
            exports.qbx_medical:Revive(src)
        end)
    end
    TriggerClientEvent('qbx_medical:client:playerRevived', src)

    Wait(250)
    local ped = GetPlayerPed(src)
    if DoesEntityExist(ped) then
        SetEntityCoords(ped, hospitalCoords.x, hospitalCoords.y, hospitalCoords.z, false, false, false, false)
        SetEntityHeading(ped, hospitalCoords.w)
    end
end)

-- ซิงค์การเด้งศพไปยังผู้เล่นรอบข้าง
RegisterNetEvent('next_death:server:syncCorpse', function(coords)
    local src = source
    local ped = GetPlayerPed(src)
    local netId = NetworkGetNetworkIdFromEntity(ped)
    TriggerClientEvent('next_death:client:onCorpseBumped', -1, coords, netId)
end)
