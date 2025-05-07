export const countryCodes = [
  { name: "India", code: "+91", flag: "🇮🇳" },
  { name: "United States", code: "+1", flag: "🇺🇸" },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧" },
  { name: "Canada", code: "+1", flag: "🇨🇦" },
  { name: "Australia", code: "+61", flag: "🇦🇺" },
  { name: "Afghanistan", code: "+93", flag: "🇦🇫" },
  { name: "Albania", code: "+355", flag: "🇦🇱" },
  { name: "Algeria", code: "+213", flag: "🇩🇿" },
  { name: "Argentina", code: "+54", flag: "🇦🇷" },
  { name: "Austria", code: "+43", flag: "🇦🇹" },
  { name: "Bahrain", code: "+973", flag: "🇧🇭" },
  { name: "Bangladesh", code: "+880", flag: "🇧🇩" },
  { name: "Belgium", code: "+32", flag: "🇧🇪" },
  { name: "Brazil", code: "+55", flag: "🇧🇷" },
  { name: "China", code: "+86", flag: "🇨🇳" },
  { name: "Egypt", code: "+20", flag: "🇪🇬" },
  { name: "France", code: "+33", flag: "🇫🇷" },
  { name: "Germany", code: "+49", flag: "🇩🇪" },
  { name: "Indonesia", code: "+62", flag: "🇮🇩" },
  { name: "Iran", code: "+98", flag: "🇮🇷" },
  { name: "Iraq", code: "+964", flag: "🇮🇶" },
  { name: "Ireland", code: "+353", flag: "🇮🇪" },
  { name: "Italy", code: "+39", flag: "🇮🇹" },
  { name: "Japan", code: "+81", flag: "🇯🇵" },
  { name: "Kuwait", code: "+965", flag: "🇰🇼" },
  { name: "Malaysia", code: "+60", flag: "🇲🇾" },
  { name: "Mexico", code: "+52", flag: "🇲🇽" },
  { name: "Netherlands", code: "+31", flag: "🇳🇱" },
  { name: "New Zealand", code: "+64", flag: "🇳🇿" },
  { name: "Norway", code: "+47", flag: "🇳🇴" },
  { name: "Oman", code: "+968", flag: "🇴🇲" },
  { name: "Pakistan", code: "+92", flag: "🇵🇰" },
  { name: "Philippines", code: "+63", flag: "🇵🇭" },
  { name: "Qatar", code: "+974", flag: "🇶🇦" },
  { name: "Russia", code: "+7", flag: "🇷🇺" },
  { name: "Saudi Arabia", code: "+966", flag: "🇸🇦" },
  { name: "Singapore", code: "+65", flag: "🇸🇬" },
  { name: "South Africa", code: "+27", flag: "🇿🇦" },
  { name: "South Korea", code: "+82", flag: "🇰🇷" },
  { name: "Spain", code: "+34", flag: "🇪🇸" },
  { name: "Sweden", code: "+46", flag: "🇸🇪" },
  { name: "Switzerland", code: "+41", flag: "🇨🇭" },
  { name: "Syria", code: "+963", flag: "🇸🇾" },
  { name: "Thailand", code: "+66", flag: "🇹🇭" },
  { name: "Turkey", code: "+90", flag: "🇹🇷" },
  { name: "United Arab Emirates", code: "+971", flag: "🇦🇪" },
  { name: "Vietnam", code: "+84", flag: "🇻🇳" },
];

export type CountryCode = {
  name: string;
  code: string;
  flag: string;
};

// Helper function to find country code from a full phone number
export function parsePhoneCountryCode(fullPhone: string): CountryCode | undefined {
  
  // Sort codes by length (longest first) to avoid partial matches
  const sortedCodes = [...countryCodes].sort((a, b) => b.code.length - a.code.length);
  return sortedCodes.find(country => fullPhone.startsWith(country.code));
}

// Helper function to extract phone number without country code
export function extractPhoneWithoutCode(fullPhone: string): string {
  const countryCode = parsePhoneCountryCode(fullPhone);
  if (!countryCode) return fullPhone;
  return fullPhone.substring(countryCode.code.length);
}

// Parse phone to separate country code and phone number parts
export function parsePhoneNumber(fullPhone: string): { countryCode: string; phoneNumber: string } {
  // Add + prefix if not already there for proper parsing
  const phoneWithPlus = fullPhone.startsWith('+') ? fullPhone : '+' + fullPhone;
  
  // Sort country codes by length (longest first) to avoid partial matches
  const sortedCodes = [...countryCodes].sort((a, b) => b.code.length - a.code.length);
  
  // Try to find matching country code
  for (const country of sortedCodes) {
    if (phoneWithPlus.startsWith(country.code)) {
      return {
        countryCode: country.code,
        phoneNumber: phoneWithPlus.substring(country.code.length)
      };
    }
  }
  
  // If no match found, default to returning the whole string as phone number
  return {
    countryCode: '+91', // Default to India code
    phoneNumber: fullPhone.replace(/^\+/, '') // Remove + if present in the original string
  };
}
