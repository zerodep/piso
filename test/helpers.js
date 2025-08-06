/**
 * Get date from date parts
 * @param {Partial<import('../types/interfaces.js').ISODateParts>} parts
 * @returns
 */
export function getDateFromParts(parts) {
  const args = [parts.Y, parts.M, parts.D, parts.H, parts.m, parts.S, parts.F].filter((p) => p !== undefined);

  let setFullYear;
  if (parts.Y < 100) {
    setFullYear = true;
  }

  let dt;
  if (parts.Z === 'Z') {
    dt = new Date(Date.UTC(...args));
  } else if (parts.Z === '-' || parts.Z === '−') {
    args[3] += parts.OH ?? 0;
    args[4] += parts.Om ?? 0;
    args[5] = (args[5] ?? 0) + (parts.OS ?? 0);
    dt = new Date(Date.UTC(...args));
  } else if (parts.Z === '+') {
    args[3] -= parts.OH ?? 0;
    args[4] -= parts.Om ?? 0;
    args[5] = (args[5] ?? 0) - (parts.OS ?? 0);
    dt = new Date(Date.UTC(...args));
  } else {
    dt = new Date(...args);
  }

  if (setFullYear) {
    dt = new Date(dt.setUTCFullYear(parts.Y));
  }

  return dt;
}
