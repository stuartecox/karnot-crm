// ============================================
// PINCH ANALYSIS - UTILITY INTEGRATION ENGINE
// For dairy/food processing utility networks
// ============================================

// ============================================
// CONFIGURATION (USD defaults for US market)
// ============================================
export const PINCH_CONFIG = {
    DEFAULT_DT_MIN: 10,
    DEFAULT_OPERATING_HOURS: 8000,
    DEFAULT_BOILER_EFFICIENCY: 0.85,
    DEFAULT_CHILLER_COP: 2.5,
    DEFAULT_HP_COP: 3.5,
    // US utility rates (USD)
    DEFAULT_GAS_RATE: 0.04,       // $/kWh (natural gas ~$4/MMBtu)
    DEFAULT_ELEC_RATE: 0.10,      // $/kWh (US industrial average)
    // Emission factors
    CO2_FACTOR_GAS: 0.205,        // kgCO2/kWh (natural gas combustion)
    CO2_FACTOR_ELEC: 0.417,       // kgCO2/kWh (US grid average 2024)
    // CO2 heat pump utility temperatures (dairy defaults)
    DEFAULT_SOURCE_TEMP: 4,       // deg C - chilled water return (evaporator inlet)
    DEFAULT_SINK_TEMP: 90,        // deg C - hot water supply (gas cooler outlet)
};

// ============================================
// DAIRY PROCESS TEMPLATES
// ============================================
export const PROCESS_TEMPLATES = {
    general_dairy: {
        name: 'General Dairy Plant',
        description: 'Typical mid-size dairy with pasteurization, cream processing, and evaporation.',
        streams: [
            { name: 'Raw Milk Reception Cooling', supplyTemp: 35, targetTemp: 4, load: 150, type: 'hot' },
            { name: 'Pasteurisation Preheating', supplyTemp: 4, targetTemp: 66, load: 250, type: 'cold' },
            { name: 'Pasteurisation (Milk)', supplyTemp: 66, targetTemp: 90, load: 120, type: 'cold' },
            { name: 'Pasteurisation Cooling', supplyTemp: 90, targetTemp: 4, load: 350, type: 'hot' },
            { name: 'Cream Pasteurisation', supplyTemp: 66, targetTemp: 98, load: 80, type: 'cold' },
            { name: 'Cream Cooling', supplyTemp: 98, targetTemp: 4, load: 120, type: 'hot' },
            { name: 'Evaporation Preheating', supplyTemp: 4, targetTemp: 70, load: 180, type: 'cold' },
        ]
    },
    yogurt_production: {
        name: 'Yogurt Production',
        description: 'Full yogurt line: preheating, homogenization, pasteurization, incubation, cold fill.',
        streams: [
            { name: 'Milk Preheating', supplyTemp: 4, targetTemp: 45, load: 120, type: 'cold' },
            { name: 'Homogenization Heating', supplyTemp: 45, targetTemp: 65, load: 80, type: 'cold' },
            { name: 'Pasteurisation (95°C hold)', supplyTemp: 65, targetTemp: 95, load: 150, type: 'cold' },
            { name: 'Cooling to Incubation', supplyTemp: 95, targetTemp: 43, load: 200, type: 'hot' },
            { name: 'Post-Incubation Cooling', supplyTemp: 43, targetTemp: 4, load: 160, type: 'hot' },
            { name: 'CIP Hot Water', supplyTemp: 15, targetTemp: 80, load: 90, type: 'cold' },
        ]
    },
    milk_pasteurization: {
        name: 'Milk Pasteurization (HTST)',
        description: 'Standard HTST pasteurization with CIP cycle.',
        streams: [
            { name: 'Raw Milk Reception Cooling', supplyTemp: 35, targetTemp: 4, load: 150, type: 'hot' },
            { name: 'Pasteurizer Preheating', supplyTemp: 4, targetTemp: 65, load: 200, type: 'cold' },
            { name: 'Pasteurisation (72°C)', supplyTemp: 65, targetTemp: 72, load: 50, type: 'cold' },
            { name: 'Post-Pasteurisation Cooling', supplyTemp: 72, targetTemp: 4, load: 250, type: 'hot' },
            { name: 'CIP Hot Water Heating', supplyTemp: 15, targetTemp: 85, load: 100, type: 'cold' },
        ]
    },
    cheese_production: {
        name: 'Cheese Production',
        description: 'Cheese making with whey processing and brine cooling.',
        streams: [
            { name: 'Milk Pasteurisation Heating', supplyTemp: 4, targetTemp: 72, load: 220, type: 'cold' },
            { name: 'Post-Pasteurisation Cooling', supplyTemp: 72, targetTemp: 32, load: 130, type: 'hot' },
            { name: 'Whey Concentration Preheating', supplyTemp: 32, targetTemp: 70, load: 100, type: 'cold' },
            { name: 'Whey Cooling', supplyTemp: 70, targetTemp: 4, load: 180, type: 'hot' },
            { name: 'Brine Cooling', supplyTemp: 15, targetTemp: 2, load: 60, type: 'hot' },
            { name: 'CIP Hot Water', supplyTemp: 15, targetTemp: 80, load: 80, type: 'cold' },
        ]
    },
    custom: {
        name: 'Custom (Empty)',
        description: 'Start with a blank slate and enter your own process streams.',
        streams: []
    }
};

// ============================================
// CORE PINCH ANALYSIS
// ============================================

/**
 * Problem Table Algorithm — the heart of pinch analysis.
 *
 * 1. Shift temperatures (hot down by dTmin/2, cold up by dTmin/2)
 * 2. Create temperature intervals from all shifted temperatures
 * 3. Calculate net heat deficit/surplus in each interval
 * 4. Cascade heat flows to find QH_min and QC_min
 * 5. Identify pinch point
 */
export function problemTableAlgorithm(streams, dTmin) {
    if (!streams || streams.length < 2) return null;

    const hotStreams = streams.filter(s => s.type === 'hot');
    const coldStreams = streams.filter(s => s.type === 'cold');
    if (hotStreams.length === 0 || coldStreams.length === 0) return null;

    const halfDT = dTmin / 2;

    // Compute CP (heat capacity flow rate) for each stream
    const withCP = streams.map(s => {
        const dT = Math.abs(s.supplyTemp - s.targetTemp);
        const cp = dT > 0 ? s.load / dT : 0;
        const isHot = s.type === 'hot';
        return {
            ...s,
            cp,
            shiftedHigh: Math.max(s.supplyTemp, s.targetTemp) - (isHot ? halfDT : -halfDT),
            shiftedLow: Math.min(s.supplyTemp, s.targetTemp) - (isHot ? halfDT : -halfDT),
        };
    });

    // Collect all unique shifted temperature boundaries
    const tempSet = new Set();
    withCP.forEach(s => {
        tempSet.add(s.shiftedHigh);
        tempSet.add(s.shiftedLow);
    });
    const temps = Array.from(tempSet).sort((a, b) => b - a); // descending

    if (temps.length < 2) return null;

    // For each temperature interval, calculate net heat
    const intervals = [];
    for (let i = 0; i < temps.length - 1; i++) {
        const tHigh = temps[i];
        const tLow = temps[i + 1];
        const dT = tHigh - tLow;

        let hotCP = 0;
        let coldCP = 0;

        withCP.forEach(s => {
            if (s.shiftedHigh >= tHigh && s.shiftedLow <= tLow) {
                if (s.type === 'hot') hotCP += s.cp;
                else coldCP += s.cp;
            }
        });

        // Positive = heat surplus (hot dominates), negative = heat deficit
        const netHeat = (hotCP - coldCP) * dT;
        intervals.push({ tHigh, tLow, dT, hotCP, coldCP, netHeat });
    }

    // Cascade: start from zero at the top
    const cascade = [0];
    intervals.forEach((interval, i) => {
        cascade.push(cascade[i] + interval.netHeat);
    });

    // QH_min = make the most negative cascade value zero
    const minCascade = Math.min(...cascade);
    const qHMin = minCascade < 0 ? Math.abs(minCascade) : 0;

    // Corrected cascade
    const correctedCascade = cascade.map(v => v + qHMin);

    // QC_min = last value of corrected cascade
    const qCMin = correctedCascade[correctedCascade.length - 1];

    // Pinch temperature (where corrected cascade = 0)
    let pinchIndex = correctedCascade.findIndex(v => Math.abs(v) < 0.01);
    if (pinchIndex === -1) {
        let minVal = Infinity;
        correctedCascade.forEach((v, i) => {
            if (v < minVal) { minVal = v; pinchIndex = i; }
        });
    }
    const pinchTempShifted = temps[pinchIndex] !== undefined ? temps[pinchIndex] : temps[0];
    const pinchTempHot = pinchTempShifted + halfDT;
    const pinchTempCold = pinchTempShifted - halfDT;

    // Total loads
    const totalHotLoad = hotStreams.reduce((sum, s) => sum + s.load, 0);
    const totalColdLoad = coldStreams.reduce((sum, s) => sum + s.load, 0);
    const maxRecovery = Math.max(0, Math.min(totalHotLoad, totalColdLoad) - Math.max(qHMin, qCMin) + Math.min(qHMin, qCMin));

    return {
        intervals,
        temps,
        cascade,
        correctedCascade,
        qHMin,
        qCMin,
        pinchTempShifted,
        pinchTempHot,
        pinchTempCold,
        maxRecovery: totalHotLoad - qCMin,
        totalHotLoad,
        totalColdLoad
    };
}

// ============================================
// COMPOSITE CURVES FOR CHARTING
// ============================================

/**
 * Build a single composite curve from a set of same-type streams.
 * Returns array of {Q, T} points sorted ascending by temperature.
 */
function buildCurveFromStreams(streams) {
    if (streams.length === 0) return [];

    const tempSet = new Set();
    streams.forEach(s => {
        tempSet.add(s.supplyTemp);
        tempSet.add(s.targetTemp);
    });
    const temps = Array.from(tempSet).sort((a, b) => a - b);

    const points = [{ Q: 0, T: temps[0] }];
    let cumQ = 0;

    for (let i = 0; i < temps.length - 1; i++) {
        const tLow = temps[i];
        const tHigh = temps[i + 1];
        const dT = tHigh - tLow;

        let totalCP = 0;
        streams.forEach(s => {
            const sLow = Math.min(s.supplyTemp, s.targetTemp);
            const sHigh = Math.max(s.supplyTemp, s.targetTemp);
            if (sLow <= tLow && sHigh >= tHigh) {
                const streamDT = sHigh - sLow;
                totalCP += streamDT > 0 ? s.load / streamDT : 0;
            }
        });

        cumQ += totalCP * dT;
        points.push({ Q: Math.round(cumQ * 100) / 100, T: tHigh });
    }

    return points;
}

/**
 * Build both composite curves, shifting the cold curve right by QC_min
 * so the curves touch at the pinch point.
 */
export function buildCompositeCurves(streams, dTmin) {
    const result = problemTableAlgorithm(streams, dTmin);
    if (!result) return null;

    const hotStreams = streams.filter(s => s.type === 'hot');
    const coldStreams = streams.filter(s => s.type === 'cold');

    const hotCurve = buildCurveFromStreams(hotStreams);
    const coldCurveRaw = buildCurveFromStreams(coldStreams);

    // Shift cold curve right by QC_min so curves touch at pinch
    const coldCurve = coldCurveRaw.map(p => ({
        Q: Math.round((p.Q + result.qCMin) * 100) / 100,
        T: p.T
    }));

    return {
        hotCurve,
        coldCurve,
        qHMin: result.qHMin,
        qCMin: result.qCMin,
    };
}

/**
 * Build Grand Composite Curve (shifted temperature vs net heat flow).
 */
export function buildGrandCompositeCurve(streams, dTmin) {
    const result = problemTableAlgorithm(streams, dTmin);
    if (!result) return [];

    return result.temps.map((temp, i) => ({
        Q: Math.round(result.correctedCascade[i] * 100) / 100,
        T: temp
    }));
}

/**
 * Merge hot and cold composite curves into a single dataset for Recharts.
 * Each point has { Q, hotT?, coldT? }. Null values are used for gaps.
 */
export function mergeCompositeCurvesForChart(hotCurve, coldCurve) {
    const allQ = new Set();
    hotCurve.forEach(p => allQ.add(p.Q));
    coldCurve.forEach(p => allQ.add(p.Q));
    const sortedQ = Array.from(allQ).sort((a, b) => a - b);

    // Interpolation helper
    const interpolate = (curve, q) => {
        if (curve.length === 0) return null;
        if (q < curve[0].Q || q > curve[curve.length - 1].Q) return null;
        for (let i = 0; i < curve.length - 1; i++) {
            if (q >= curve[i].Q && q <= curve[i + 1].Q) {
                const frac = (curve[i + 1].Q - curve[i].Q) === 0 ? 0 :
                    (q - curve[i].Q) / (curve[i + 1].Q - curve[i].Q);
                return Math.round((curve[i].T + frac * (curve[i + 1].T - curve[i].T)) * 100) / 100;
            }
        }
        return null;
    };

    return sortedQ.map(q => ({
        Q: q,
        hotT: interpolate(hotCurve, q),
        coldT: interpolate(coldCurve, q),
    }));
}

// ============================================
// HEAT PUMP SIZING & SAVINGS
// ============================================

/**
 * Calculate heat pump economics for utility integration.
 * The heat pump sits across the pinch: evaporator on cooling network,
 * condenser on heating network.
 */
export function calculateHeatPumpSizing(pinchResult, params) {
    const {
        hpDutyKW,
        hpCOP = PINCH_CONFIG.DEFAULT_HP_COP,
        operatingHours = PINCH_CONFIG.DEFAULT_OPERATING_HOURS,
        boilerEfficiency = PINCH_CONFIG.DEFAULT_BOILER_EFFICIENCY,
        chillerCOP = PINCH_CONFIG.DEFAULT_CHILLER_COP,
        elecRate = PINCH_CONFIG.DEFAULT_ELEC_RATE,
        gasRate = PINCH_CONFIG.DEFAULT_GAS_RATE,
        sourceTemp = PINCH_CONFIG.DEFAULT_SOURCE_TEMP,
        sinkTemp = PINCH_CONFIG.DEFAULT_SINK_TEMP,
    } = params;

    if (!pinchResult || !hpDutyKW || hpDutyKW <= 0) return null;

    // Heat pump duty capped at QH_min
    const effectiveDuty = Math.min(hpDutyKW, pinchResult.qHMin);

    // Compressor electrical input
    const hpElecInput = effectiveDuty / hpCOP;

    // Evaporator duty (cooling provided by HP)
    const evapDuty = effectiveDuty - hpElecInput;

    // === BASELINE (no heat pump) ===
    const baseHeatingFuel = (pinchResult.qHMin / boilerEfficiency) * operatingHours;     // kWh fuel
    const baseCoolingElec = (pinchResult.qCMin / chillerCOP) * operatingHours;            // kWh elec
    const baseHeatingCost = baseHeatingFuel * gasRate;
    const baseCoolingCost = baseCoolingElec * elecRate;
    const baseTotalCost = baseHeatingCost + baseCoolingCost;

    const baseCO2 = (baseHeatingFuel * PINCH_CONFIG.CO2_FACTOR_GAS +
                     baseCoolingElec * PINCH_CONFIG.CO2_FACTOR_ELEC) / 1000; // tonnes

    // === WITH HEAT PUMP ===
    const remainingHeating = Math.max(0, pinchResult.qHMin - effectiveDuty);
    const remainingCooling = Math.max(0, pinchResult.qCMin - evapDuty);

    const newHeatingFuel = (remainingHeating / boilerEfficiency) * operatingHours;
    const newCoolingElec = (remainingCooling / chillerCOP) * operatingHours;
    const hpElecConsumption = hpElecInput * operatingHours;

    const newHeatingCost = newHeatingFuel * gasRate;
    const newCoolingCost = newCoolingElec * elecRate;
    const hpRunningCost = hpElecConsumption * elecRate;
    const newTotalCost = newHeatingCost + newCoolingCost + hpRunningCost;

    const newCO2 = ((newHeatingFuel * PINCH_CONFIG.CO2_FACTOR_GAS) +
                    ((newCoolingElec + hpElecConsumption) * PINCH_CONFIG.CO2_FACTOR_ELEC)) / 1000;

    const annualSavings = baseTotalCost - newTotalCost;
    const savingsPercent = baseTotalCost > 0 ? (annualSavings / baseTotalCost) * 100 : 0;
    const co2Reduction = baseCO2 - newCO2;

    // Utility ring operating temperatures (user-defined, not pinch-derived)
    // CO2 transcritical heat pumps can lift from 4C chilled water to 90C hot water
    const temperatureLift = sinkTemp - sourceTemp;

    return {
        effectiveDuty,
        hpElecInput: Math.round(hpElecInput * 10) / 10,
        evapDuty: Math.round(evapDuty * 10) / 10,
        sourceTemp,
        sinkTemp,
        temperatureLift,

        // Baseline
        baseHeatingFuel: Math.round(baseHeatingFuel),
        baseCoolingElec: Math.round(baseCoolingElec),
        baseHeatingCost: Math.round(baseHeatingCost),
        baseCoolingCost: Math.round(baseCoolingCost),
        baseTotalCost: Math.round(baseTotalCost),
        baseCO2: Math.round(baseCO2 * 10) / 10,

        // With HP
        newHeatingCost: Math.round(newHeatingCost),
        newCoolingCost: Math.round(newCoolingCost),
        hpRunningCost: Math.round(hpRunningCost),
        newTotalCost: Math.round(newTotalCost),
        newCO2: Math.round(newCO2 * 10) / 10,

        // Savings
        annualSavings: Math.round(annualSavings),
        savingsPercent: Math.round(savingsPercent * 10) / 10,
        co2Reduction: Math.round(co2Reduction * 10) / 10,

        // ROI helpers
        hpElecConsumption: Math.round(hpElecConsumption),
        remainingHeating: Math.round(remainingHeating * 10) / 10,
        remainingCooling: Math.round(remainingCooling * 10) / 10,
    };
}

/**
 * Simple payback period calculator.
 */
export function calculatePayback(annualSavings, capitalCost) {
    if (!annualSavings || annualSavings <= 0 || !capitalCost || capitalCost <= 0) return null;
    return Math.round((capitalCost / annualSavings) * 10) / 10;
}

/**
 * Find best matching Karnot CO2 heat pump from Firebase product inventory.
 */
export function findMatchingProduct(products, requiredDutyKW) {
    if (!products || products.length === 0 || !requiredDutyKW) return null;

    // Filter to heat pump products
    const heatPumps = products.filter(p => {
        const name = (p.name || '').toUpperCase();
        const cat = (p.category || '').toUpperCase();
        return name.includes('IHEAT') || name.includes('HEAT PUMP') ||
               name.includes('CO2') || name.includes('R744') ||
               cat.includes('HEAT PUMP') || cat.includes('IHEAT');
    });

    if (heatPumps.length === 0) return null;

    // Try to extract kW rating from product name
    const withKW = heatPumps.map(p => {
        const match = (p.name || '').match(/(\d+\.?\d*)\s*kW/i);
        const kw = match ? parseFloat(match[1]) : (p.heatingCapacity || p.capacity || 0);
        return { ...p, extractedKW: kw };
    }).filter(p => p.extractedKW > 0);

    if (withKW.length === 0) return heatPumps[0];

    // Find smallest unit that meets or exceeds requirement
    withKW.sort((a, b) => a.extractedKW - b.extractedKW);

    // Can we meet with a single unit?
    const singleMatch = withKW.find(p => p.extractedKW >= requiredDutyKW);
    if (singleMatch) {
        return { ...singleMatch, quantity: 1, totalCapacity: singleMatch.extractedKW };
    }

    // Otherwise recommend largest unit with quantity needed
    const largest = withKW[withKW.length - 1];
    const qty = Math.ceil(requiredDutyKW / largest.extractedKW);
    return { ...largest, quantity: qty, totalCapacity: largest.extractedKW * qty };
}
