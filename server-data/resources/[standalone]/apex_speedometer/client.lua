local isInVehicle = false
local currentVeh = nil
local cachedMaxRpm = 8000
local cachedSeatbeltRequired = true

-- Cache Max RPM per vehicle (no heavy native calls in loop)
local function GetVehicleRealisticMaxRpm(veh)
    if GetResourceState("veh_drivetrain") == "started" then
        local ok, dtMax = pcall(function() return exports["veh_drivetrain"]:GetVehicleMaxRpm(veh) end)
        if ok and dtMax and dtMax > 2000 then return math.floor(dtMax) end
    end

    local stMaxRpm = Entity(veh).state.maxRpm
    if stMaxRpm and stMaxRpm > 2000 then return math.floor(stMaxRpm) end

    local gears = GetVehicleHandlingInt(veh, "CHandlingData", "nInitialDriveGears") or 5
    local driveForce = GetVehicleHandlingFloat(veh, "CHandlingData", "fInitialDriveForce") or 0.35
    local maxFlatVel = GetVehicleHandlingFloat(veh, "CHandlingData", "fInitialDriveMaxFlatVel") or 160.0
    local calculatedRpm = math.floor((maxFlatVel * 28.0) + (driveForce * 4200.0) + (gears * 250.0))

    return math.max(5000, math.min(13000, calculatedRpm))
end

-- Cached resource state checks
local hasDrivetrain = GetResourceState("veh_drivetrain") == "started"
local hasManualGearbox = GetResourceState("manual_gearbox") == "started"
local hasOxFuel = GetResourceState("ox_fuel") == "started"

AddEventHandler('onClientResourceStart', function(res)
    if res == "veh_drivetrain" then hasDrivetrain = true
    elseif res == "manual_gearbox" then hasManualGearbox = true
    elseif res == "ox_fuel" then hasOxFuel = true end
end)

AddEventHandler('onClientResourceStop', function(res)
    if res == "veh_drivetrain" then hasDrivetrain = false
    elseif res == "manual_gearbox" then hasManualGearbox = false
    elseif res == "ox_fuel" then hasOxFuel = false end
end)

-- Pure Passive HUD Display Thread (Zero interference with vehicle physics/handling)
Citizen.CreateThread(function()
    while true do
        local ped = cache.ped
        local veh = cache.vehicle
        local inVeh = veh ~= nil and veh ~= 0 and DoesEntityExist(veh)

        if inVeh then
            local isDriver = (cache.seat == -1)

            -- Vehicle change: cache static vehicle properties
            if veh ~= currentVeh then
                currentVeh = veh
                cachedMaxRpm = GetVehicleRealisticMaxRpm(veh)
                local vehClass = GetVehicleClass(veh)
                cachedSeatbeltRequired = (vehClass ~= 8 and vehClass ~= 13)
            end

            -- Speed & RPM (Passive read-only)
            local speedMs = GetEntitySpeed(veh)
            local speedKmh = speedMs * 3.6
            local rpm = GetVehicleCurrentRpm(veh)

            -- Gear & Transmission Mode
            local gear = GetVehicleCurrentGear(veh)
            local isManual = false

            -- Check Drivetrain State Bag
            local cGear = Entity(veh).state.controlledGear
            if cGear ~= nil then gear = cGear end

            local cManual = Entity(veh).state.isManual
            if cManual ~= nil then isManual = cManual end

            -- Check Manual Gearbox if active
            if hasManualGearbox then
                pcall(function()
                    local mg = exports["manual_gearbox"]:GetCurrentGear()
                    if mg ~= nil then
                        isManual = true
                        if mg == -1 then gear = 0
                        elseif mg == 0 then gear = "N"
                        else gear = mg end
                    end
                end)
            end

            -- Fuel
            local fuelLevel = GetVehicleFuelLevel(veh)
            if hasOxFuel then
                local stFuel = Entity(veh).state.fuel
                if stFuel ~= nil then fuelLevel = stFuel end
            end

            -- Vehicle Virtual Health (อิงตาม fMass)
            local st = Entity(veh).state
            local maxEngineHp = st.virtualMaxHp or math.floor(GetVehicleHandlingFloat(veh, "CHandlingData", "fMass") or 1000.0)
            local engineHealth = st.virtualEngineHp
            if not engineHealth then
                engineHealth = math.floor((math.max(0.0, GetVehicleEngineHealth(veh)) / 1000.0) * maxEngineHp)
            end
            local bodyHealth = (GetVehicleBodyHealth(veh) / 1000.0) * 100
            local handbrake = GetVehicleHandbrake(veh)

            -- Throttle & Brake (Pure input reading, no artificial lag)
            local rawThr = GetControlNormal(0, 71)
            if rawThr == 0 and (IsControlPressed(0, 71) or IsDisabledControlPressed(0, 71)) then
                rawThr = 1.0
            end
            local throttlePct = math.floor(rawThr * 100.0)

            local rawBrk1 = GetControlNormal(0, 72)
            if rawBrk1 == 0 and IsControlPressed(0, 72) then rawBrk1 = 1.0 end
            local rawBrk2 = GetControlNormal(0, 76)
            if rawBrk2 == 0 and IsControlPressed(0, 76) then rawBrk2 = 1.0 end
            local brakePct = math.floor(math.max(rawBrk1, rawBrk2) * 100.0)

            -- Steering Angle
            local steerAngle = math.floor(GetVehicleSteeringAngle(veh))
            if steerAngle == 0 and isDriver then
                local steerInput = GetControlNormal(0, 59)
                if math.abs(steerInput) > 0.02 then
                    steerAngle = math.floor(-steerInput * 35.0)
                end
            end

            -- Seatbelt state
            local isSeatbeltBuckled = LocalPlayer.state.seatbelt == true

            -- RPM display sync
            local liveSimRpm = nil
            local liveMaxRpm = nil

            if hasDrivetrain or GetResourceState("veh_drivetrain") == "started" then
                hasDrivetrain = true
                pcall(function()
                    liveSimRpm = exports["veh_drivetrain"]:GetVehicleSimRpm(veh)
                    liveMaxRpm = exports["veh_drivetrain"]:GetVehicleMaxRpm(veh)
                end)
            end

            if not liveSimRpm then
                liveSimRpm = Entity(veh).state.simRpm
            end
            if not liveMaxRpm then
                liveMaxRpm = Entity(veh).state.maxRpm
            end

            local effectiveMaxRpm = liveMaxRpm or cachedMaxRpm

            -- Send UI update
            SendNUIMessage({
                action = "update",
                speed = speedKmh,
                rpm = rpm,
                displayRpm = liveSimRpm,
                maxRpm = effectiveMaxRpm,
                gear = gear,
                isManual = isManual,
                throttle = throttlePct,
                brake = brakePct,
                steerAngle = steerAngle,
                fuel = fuelLevel,
                engineHealth = engineHealth,
                maxEngineHealth = maxEngineHp,
                bodyHealth = bodyHealth,
                handbrake = handbrake,
                seatbelt = isSeatbeltBuckled,
                seatbeltRequired = cachedSeatbeltRequired
            })

            isInVehicle = true
            Citizen.Wait(20) -- 50 FPS: กวาดรอบและเข็มความเร็วลื่นเนียน ไม่กระตุก
        else
            if isInVehicle then
                isInVehicle = false
                currentVeh = nil
                SendNUIMessage({
                    action = "hide"
                })
            end
            Citizen.Wait(500)
        end
    end
end)
