/**
 * Formats a phone number string into a readable format
 * @param phone - The phone number string to format
 * @returns Formatted phone number or the original string if it can't be formatted
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // Handle different phone number lengths
  if (digits.length === 10) {
    // US format: (XXX) XXX-XXXX
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    // US format with country code: 1 (XXX) XXX-XXXX
    return `1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 7) {
    // Local format: XXX-XXXX
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  } else if (digits.length > 11) {
    // International format: +XX XXX XXX XXXX
    const countryCode = digits.slice(0, digits.length - 10);
    const areaCode = digits.slice(digits.length - 10, digits.length - 7);
    const prefix = digits.slice(digits.length - 7, digits.length - 4);
    const lineNumber = digits.slice(digits.length - 4);
    return `+${countryCode} ${areaCode} ${prefix} ${lineNumber}`;
  }

  // If we can't format it nicely, return the original with some basic formatting
  // Add spaces every 3-4 digits for readability
  if (digits.length > 4) {
    const chunks = [];
    for (let i = 0; i < digits.length; i += 4) {
      chunks.push(digits.slice(i, i + 4));
    }
    return chunks.join(" ");
  }

  return phone;
}
