import ids from './analytics.json' with {type:'json'};

// Measurement IDs are public identifiers. Empty means analytics is not enabled.
// Build-time overrides allow hosting configuration without storing credentials.
export function measurementId(brand, env=process.env) {
  const value=String(env[`GA4_${brand.toUpperCase()}_MEASUREMENT_ID`] ?? ids[brand] ?? '').trim();
  if(value && !/^G-[A-Z0-9]{6,20}$/.test(value)) throw new Error(`Invalid GA4 measurement ID for ${brand}`);
  return value;
}
