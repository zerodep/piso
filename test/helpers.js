/**
 * Get date from date parts
 * @param {Partial<import('../types/interfaces.js').ISODateParts>} parts
 * @returns
 */
export function getDateFromParts(parts) {
  const args = [parts.Y, parts.M, parts.D, parts.H, parts.m, parts.S, parts.F].filter((p) => p !== undefined);
  if (parts.Z) {
    return new Date(Date.UTC(...args));
  }
  return new Date(...args);
}
