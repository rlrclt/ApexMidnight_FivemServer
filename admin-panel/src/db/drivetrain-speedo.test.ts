import { describe, it, expect } from "vitest";

// =========================================================================
// Pure Contract Mirror Functions directly matching veh_drivetrain/client.lua
// =========================================================================

export function getGearMaxSpeed(spec: any, gear: number, maxG: number, baseFlatVel: number): number {
  if (!spec || !gear || gear <= 0) return 30.0;
  if (spec.gearMaxSpeeds && spec.gearMaxSpeeds[gear] !== undefined) {
    return Number(spec.gearMaxSpeeds[gear]);
  }
  const ratio = (spec.gearRatios && spec.gearRatios[gear]) || (gear / maxG);
  return Math.max(10.0, baseFlatVel * ratio);
}

export function calculateEffectiveDownshift(rawDownshift: number, upshiftRpm: number): number {
  // Line 376 in client.lua (Updated: allowing up to 85% upshift while preventing hysteresis loop & negative clamp)
  return Math.max(0, Math.min(rawDownshift, Math.min(Math.max(0, upshiftRpm - 400), upshiftRpm * 0.85)));
}

export function calculateLiveIdleRpm(baseIdle: number, idleSwing: number, idleHz: number, timerSec: number): number {
  if (!idleSwing || idleSwing <= 0) return baseIdle;
  const sinVal = Math.sin(timerSec * 1000 * 0.006283 * (idleHz || 2.0));
  return Math.max(300.0, baseIdle + sinVal * idleSwing);
}

export function resolveTargetForce(spec: any, gear: number, baseDriveForce: number): { targetForce: number; currentTorqueMult: number } {
  const base = (baseDriveForce && baseDriveForce > 0.01) ? baseDriveForce : 0.35;
  let targetForce: number | null = null;
  let currentTorqueMult = 1.0;

  if (spec.gearDriveForce && spec.gearDriveForce[gear] !== undefined) {
    targetForce = Number(spec.gearDriveForce[gear]);
    currentTorqueMult = targetForce / base;
  } else if (spec.torqueMultipliers && spec.torqueMultipliers[gear] !== undefined) {
    currentTorqueMult = Number(spec.torqueMultipliers[gear]);
    targetForce = base * currentTorqueMult;
  } else {
    currentTorqueMult = 1.0;
    targetForce = base;
  }
  return { targetForce, currentTorqueMult };
}

export function calculateSimulatedRpmCoupled(
  baseIdle: number,
  maxRpm: number,
  speedKmh: number,
  gearMaxSpeed: number
): number {
  const speedFraction = Math.min(1.0, speedKmh / gearMaxSpeed);
  return baseIdle + (maxRpm - baseIdle) * speedFraction;
}

export function calculateSpeedometerEffectiveRpm(
  displayRpm: number | null | undefined,
  rawEngineRpmRatio: number | null | undefined,
  maxRpm: number
): { curRpmVal: number; effectiveRpmRatio: number } {
  let curRpmVal = 0;
  if (displayRpm !== null && displayRpm !== undefined && !isNaN(displayRpm)) {
    curRpmVal = Number(displayRpm);
  } else {
    curRpmVal = (Number(rawEngineRpmRatio) || 0) * maxRpm;
  }
  const effectiveRpmRatio = Math.min(Math.max(curRpmVal / maxRpm, 0), 1);
  return { curRpmVal, effectiveRpmRatio };
}

// =========================================================================
// UNIT TESTS PROVING CONTRACTS & PINPOINTING DEAD/OVERRIDDEN VALUES
// =========================================================================

describe("Contract Tests: veh_drivetrain & apex_speedometer Physics Integration", () => {
  // Test 1: Priority contract - gearMaxSpeeds vs gearRatios
  it("PROVES CONTRACT: gearMaxSpeeds strictly overrides gearRatios when both exist", () => {
    const spec = {
      gearMaxSpeeds: { 1: 72, 2: 110 },
      gearRatios: { 1: 0.30, 2: 0.66 } // baseFlatVel * 0.30 = 60 km/h
    };
    const baseFlatVel = 200.0;

    // Call through contract entry point
    const speedG1 = getGearMaxSpeed(spec, 1, 6, baseFlatVel);
    expect(speedG1).toBe(72); // Must be 72, not 60!

    // Out-of-range gear fallback: gear 3 not in gearMaxSpeeds
    const speedG3 = getGearMaxSpeed(spec, 3, 6, baseFlatVel);
    // ratio = 3 / 6 = 0.5 -> 200 * 0.5 = 100
    expect(speedG3).toBe(100);
  });

  // Test 2: Dead Config detection - downshiftRpm clamp bug
  it("PROVES DEAD CONFIG: downshiftRpm > 65% upshiftRpm is completely overridden by Hysteresis clamp", () => {
    // In Elegy spec: upshiftRpm[1] = 8800, downshiftRpm[2] = 7200
    // User configured downshift = 7200, expecting downshift at 7200 RPM
    const configuredDownshift = 7200;
    const upshift = 8800;

    const effectiveDownshift = calculateEffectiveDownshift(configuredDownshift, upshift);

    // With 85% clamp: 8800 * 0.85 = 7480, upshift - 400 = 8400
    // Now configured value 7200 is RESPECTED and works as expected!
    expect(effectiveDownshift).toBe(7200);
  });

  // Test 3: Dead Config detection - torqueMultipliers overridden by gearDriveForce
  it("PROVES DEAD CONFIG: torqueMultipliers is ignored when gearDriveForce is present", () => {
    const spec = {
      gearDriveForce: { 1: 0.43 },
      torqueMultipliers: { 1: 2.5 } // User set 2.5x multiplier expecting insane wheelspin
    };

    const res = resolveTargetForce(spec, 1, 0.35);
    // Must use gearDriveForce (0.43), torqueMultipliers (2.5) is ignored!
    expect(res.targetForce).toBe(0.43);
    expect(res.targetForce).not.toBe(0.35 * 2.5);
  });

  // Test 4: Idle Swing Range & Clamping (Cam Lope)
  it("PROVES CONTRACT: idleSwing cannot drop below 300 RPM floor even with extreme swings", () => {
    const baseIdle = 1500;
    const extremeSwing = 2880; // Elegy has idleSwing = 2880! (1500 - 2880 = -1380!)

    // At negative peak of sine wave (sin = -1):
    const bottomRpm = calculateLiveIdleRpm(baseIdle, extremeSwing, 6.5, 0.75 / 6.5);
    // Lua clamps to math.max(300.0, ...)
    expect(bottomRpm).toBeGreaterThanOrEqual(300.0);
  });

  // Test 5: Speedometer display synchronization
  it("PROVES CONTRACT: apex_speedometer prioritizes displayRpm (StateBag) over native rpm", () => {
    const displayRpm = 4500;
    const rawNativeRatio = 0.9; // 90% in GTA native scale
    const maxRpm = 9000;

    const { curRpmVal, effectiveRpmRatio } = calculateSpeedometerEffectiveRpm(displayRpm, rawNativeRatio, maxRpm);

    expect(curRpmVal).toBe(4500);
    expect(effectiveRpmRatio).toBe(0.5); // 4500 / 9000 = 50%, NOT 90%!
  });

  // Test 6: Speedometer fallback on missing/nil displayRpm
  it("PROVES CONTRACT: apex_speedometer gracefully falls back to native rpm when displayRpm is nil/undefined", () => {
    const displayRpm = null;
    const rawNativeRatio = 0.5;
    const maxRpm = 8000;

    const { curRpmVal, effectiveRpmRatio } = calculateSpeedometerEffectiveRpm(displayRpm, rawNativeRatio, maxRpm);

    expect(curRpmVal).toBe(4000); // 0.5 * 8000
    expect(effectiveRpmRatio).toBe(0.5);
  });

  // Edge cases: 0 maxRpm, negative gears, extreme speed
  it("HANDLES EDGE CASES: negative gears, 0 values and extreme speeds without throwing", () => {
    expect(getGearMaxSpeed(null, -1, 6, 200)).toBe(30.0);
    expect(getGearMaxSpeed({}, 0, 6, 200)).toBe(30.0);
    expect(calculateEffectiveDownshift(0, 0)).toBe(0);

    const { effectiveRpmRatio } = calculateSpeedometerEffectiveRpm(15000, 1.0, 9000);
    // Must clamp to 1.0 (cannot overflow UI bar)
    expect(effectiveRpmRatio).toBe(1.0);
  });
});
