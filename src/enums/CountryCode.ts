// Function to parse phone number and find country flag
export const parsePhoneCountryCode = (fullPhone: string) => {
  // Import country codes from phone-input component
  const countryCodes = [
    {
      name: "Afghanistan",
      code: "93",
      flag: "AF",
    },
    {
      name: "Aland Islands",
      code: "358",
      flag: "AX",
    },
    {
      name: "Albania",
      code: "355",
      flag: "AL",
    },
    {
      name: "Algeria",
      code: "213",
      flag: "DZ",
    },
    {
      name: "AmericanSamoa",
      code: "1684",
      flag: "AS",
    },
    {
      name: "Andorra",
      code: "376",
      flag: "AD",
    },
    {
      name: "Angola",
      code: "244",
      flag: "AO",
    },
    {
      name: "Anguilla",
      code: "1264",
      flag: "AI",
    },
    {
      name: "Antarctica",
      code: "672",
      flag: "AQ",
    },
    {
      name: "Antigua and Barbuda",
      code: "1268",
      flag: "AG",
    },
    {
      name: "Argentina",
      code: "54",
      flag: "AR",
    },
    {
      name: "Armenia",
      code: "374",
      flag: "AM",
    },
    {
      name: "Aruba",
      code: "297",
      flag: "AW",
    },
    {
      name: "Australia",
      code: "61",
      flag: "AU",
    },
    {
      name: "Austria",
      code: "43",
      flag: "AT",
    },
    {
      name: "Azerbaijan",
      code: "994",
      flag: "AZ",
    },
    {
      name: "Bahamas",
      code: "1242",
      flag: "BS",
    },
    {
      name: "Bahrain",
      code: "973",
      flag: "BH",
    },
    {
      name: "Bangladesh",
      code: "880",
      flag: "BD",
    },
    {
      name: "Barbados",
      code: "1246",
      flag: "BB",
    },
    {
      name: "Belarus",
      code: "375",
      flag: "BY",
    },
    {
      name: "Belgium",
      code: "32",
      flag: "BE",
    },
    {
      name: "Belize",
      code: "501",
      flag: "BZ",
    },
    {
      name: "Benin",
      code: "229",
      flag: "BJ",
    },
    {
      name: "Bermuda",
      code: "1441",
      flag: "BM",
    },
    {
      name: "Bhutan",
      code: "975",
      flag: "BT",
    },
    {
      name: "Bolivia, Plurinational State of",
      code: "591",
      flag: "BO",
    },
    {
      name: "Bosnia and Herzegovina",
      code: "387",
      flag: "BA",
    },
    {
      name: "Botswana",
      code: "267",
      flag: "BW",
    },
    {
      name: "Brazil",
      code: "55",
      flag: "BR",
    },
    {
      name: "British Indian Ocean Territory",
      code: "246",
      flag: "IO",
    },
    {
      name: "Brunei Darussalam",
      code: "673",
      flag: "BN",
    },
    {
      name: "Bulgaria",
      code: "359",
      flag: "BG",
    },
    {
      name: "Burkina Faso",
      code: "226",
      flag: "BF",
    },
    {
      name: "Burundi",
      code: "257",
      flag: "BI",
    },
    {
      name: "Cambodia",
      code: "855",
      flag: "KH",
    },
    {
      name: "Cameroon",
      code: "237",
      flag: "CM",
    },
    {
      name: "Canada",
      code: "1",
      flag: "CA",
    },
    {
      name: "Cape Verde",
      code: "238",
      flag: "CV",
    },
    {
      name: "Cayman Islands",
      code: " 345",
      flag: "KY",
    },
    {
      name: "Central African Republic",
      code: "236",
      flag: "CF",
    },
    {
      name: "Chad",
      code: "235",
      flag: "TD",
    },
    {
      name: "Chile",
      code: "56",
      flag: "CL",
    },
    {
      name: "China",
      code: "86",
      flag: "CN",
    },
    {
      name: "Christmas Island",
      code: "61",
      flag: "CX",
    },
    {
      name: "Cocos (Keeling) Islands",
      code: "61",
      flag: "CC",
    },
    {
      name: "Colombia",
      code: "57",
      flag: "CO",
    },
    {
      name: "Comoros",
      code: "269",
      flag: "KM",
    },
    {
      name: "Congo",
      code: "242",
      flag: "CG",
    },
    {
      name: "Congo, The Democratic Republic of the Congo",
      code: "243",
      flag: "CD",
    },
    {
      name: "Cook Islands",
      code: "682",
      flag: "CK",
    },
    {
      name: "Costa Rica",
      code: "506",
      flag: "CR",
    },
    {
      name: "Cote d'Ivoire",
      code: "225",
      flag: "CI",
    },
    {
      name: "Croatia",
      code: "385",
      flag: "HR",
    },
    {
      name: "Cuba",
      code: "53",
      flag: "CU",
    },
    {
      name: "Cyprus",
      code: "357",
      flag: "CY",
    },
    {
      name: "Czech Republic",
      code: "420",
      flag: "CZ",
    },
    {
      name: "Denmark",
      code: "45",
      flag: "DK",
    },
    {
      name: "Djibouti",
      code: "253",
      flag: "DJ",
    },
    {
      name: "Dominica",
      code: "1767",
      flag: "DM",
    },
    {
      name: "Dominican Republic",
      code: "1849",
      flag: "DO",
    },
    {
      name: "Ecuador",
      code: "593",
      flag: "EC",
    },
    {
      name: "Egypt",
      code: "20",
      flag: "EG",
    },
    {
      name: "El Salvador",
      code: "503",
      flag: "SV",
    },
    {
      name: "Equatorial Guinea",
      code: "240",
      flag: "GQ",
    },
    {
      name: "Eritrea",
      code: "291",
      flag: "ER",
    },
    {
      name: "Estonia",
      code: "372",
      flag: "EE",
    },
    {
      name: "Ethiopia",
      code: "251",
      flag: "ET",
    },
    {
      name: "Falkland Islands (Malvinas)",
      code: "500",
      flag: "FK",
    },
    {
      name: "Faroe Islands",
      code: "298",
      flag: "FO",
    },
    {
      name: "Fiji",
      code: "679",
      flag: "FJ",
    },
    {
      name: "Finland",
      code: "358",
      flag: "FI",
    },
    {
      name: "France",
      code: "33",
      flag: "FR",
    },
    {
      name: "French Guiana",
      code: "594",
      flag: "GF",
    },
    {
      name: "French Polynesia",
      code: "689",
      flag: "PF",
    },
    {
      name: "Gabon",
      code: "241",
      flag: "GA",
    },
    {
      name: "Gambia",
      code: "220",
      flag: "GM",
    },
    {
      name: "Georgia",
      code: "995",
      flag: "GE",
    },
    {
      name: "Germany",
      code: "49",
      flag: "DE",
    },
    {
      name: "Ghana",
      code: "233",
      flag: "GH",
    },
    {
      name: "Gibraltar",
      code: "350",
      flag: "GI",
    },
    {
      name: "Greece",
      code: "30",
      flag: "GR",
    },
    {
      name: "Greenland",
      code: "299",
      flag: "GL",
    },
    {
      name: "Grenada",
      code: "1473",
      flag: "GD",
    },
    {
      name: "Guadeloupe",
      code: "590",
      flag: "GP",
    },
    {
      name: "Guam",
      code: "1671",
      flag: "GU",
    },
    {
      name: "Guatemala",
      code: "502",
      flag: "GT",
    },
    {
      name: "Guernsey",
      code: "44",
      flag: "GG",
    },
    {
      name: "Guinea",
      code: "224",
      flag: "GN",
    },
    {
      name: "Guinea-Bissau",
      code: "245",
      flag: "GW",
    },
    {
      name: "Guyana",
      code: "595",
      flag: "GY",
    },
    {
      name: "Haiti",
      code: "509",
      flag: "HT",
    },
    {
      name: "Holy See (Vatican City State)",
      code: "379",
      flag: "VA",
    },
    {
      name: "Honduras",
      code: "504",
      flag: "HN",
    },
    {
      name: "Hong Kong",
      code: "852",
      flag: "HK",
    },
    {
      name: "Hungary",
      code: "36",
      flag: "HU",
    },
    {
      name: "Iceland",
      code: "354",
      flag: "IS",
    },
    {
      name: "India",
      code: "91",
      flag: "IN",
    },
    {
      name: "Indonesia",
      code: "62",
      flag: "ID",
    },
    {
      name: "Iran, Islamic Republic of Persian Gulf",
      code: "98",
      flag: "IR",
    },
    {
      name: "Iraq",
      code: "964",
      flag: "IQ",
    },
    {
      name: "Ireland",
      code: "353",
      flag: "IE",
    },
    {
      name: "Isle of Man",
      code: "44",
      flag: "IM",
    },
    {
      name: "Israel",
      code: "972",
      flag: "IL",
    },
    {
      name: "Italy",
      code: "39",
      flag: "IT",
    },
    {
      name: "Jamaica",
      code: "1876",
      flag: "JM",
    },
    {
      name: "Japan",
      code: "81",
      flag: "JP",
    },
    {
      name: "Jersey",
      code: "44",
      flag: "JE",
    },
    {
      name: "Jordan",
      code: "962",
      flag: "JO",
    },
    {
      name: "Kazakhstan",
      code: "77",
      flag: "KZ",
    },
    {
      name: "Kenya",
      code: "254",
      flag: "KE",
    },
    {
      name: "Kiribati",
      code: "686",
      flag: "KI",
    },
    {
      name: "Korea, Democratic People's Republic of Korea",
      code: "850",
      flag: "KP",
    },
    {
      name: "Korea, Republic of South Korea",
      code: "82",
      flag: "KR",
    },
    {
      name: "Kuwait",
      code: "965",
      flag: "KW",
    },
    {
      name: "Kyrgyzstan",
      code: "996",
      flag: "KG",
    },
    {
      name: "Laos",
      code: "856",
      flag: "LA",
    },
    {
      name: "Latvia",
      code: "371",
      flag: "LV",
    },
    {
      name: "Lebanon",
      code: "961",
      flag: "LB",
    },
    {
      name: "Lesotho",
      code: "266",
      flag: "LS",
    },
    {
      name: "Liberia",
      code: "231",
      flag: "LR",
    },
    {
      name: "Libyan Arab Jamahiriya",
      code: "218",
      flag: "LY",
    },
    {
      name: "Liechtenstein",
      code: "423",
      flag: "LI",
    },
    {
      name: "Lithuania",
      code: "370",
      flag: "LT",
    },
    {
      name: "Luxembourg",
      code: "352",
      flag: "LU",
    },
    {
      name: "Macao",
      code: "853",
      flag: "MO",
    },
    {
      name: "Macedonia",
      code: "389",
      flag: "MK",
    },
    {
      name: "Madagascar",
      code: "261",
      flag: "MG",
    },
    {
      name: "Malawi",
      code: "265",
      flag: "MW",
    },
    {
      name: "Malaysia",
      code: "60",
      flag: "MY",
    },
    {
      name: "Maldives",
      code: "960",
      flag: "MV",
    },
    {
      name: "Mali",
      code: "223",
      flag: "ML",
    },
    {
      name: "Malta",
      code: "356",
      flag: "MT",
    },
    {
      name: "Marshall Islands",
      code: "692",
      flag: "MH",
    },
    {
      name: "Martinique",
      code: "596",
      flag: "MQ",
    },
    {
      name: "Mauritania",
      code: "222",
      flag: "MR",
    },
    {
      name: "Mauritius",
      code: "230",
      flag: "MU",
    },
    {
      name: "Mayotte",
      code: "262",
      flag: "YT",
    },
    {
      name: "Mexico",
      code: "52",
      flag: "MX",
    },
    {
      name: "Micronesia, Federated States of Micronesia",
      code: "691",
      flag: "FM",
    },
    {
      name: "Moldova",
      code: "373",
      flag: "MD",
    },
    {
      name: "Monaco",
      code: "377",
      flag: "MC",
    },
    {
      name: "Mongolia",
      code: "976",
      flag: "MN",
    },
    {
      name: "Montenegro",
      code: "382",
      flag: "ME",
    },
    {
      name: "Montserrat",
      code: "1664",
      flag: "MS",
    },
    {
      name: "Morocco",
      code: "212",
      flag: "MA",
    },
    {
      name: "Mozambique",
      code: "258",
      flag: "MZ",
    },
    {
      name: "Myanmar",
      code: "95",
      flag: "MM",
    },
    {
      name: "Namibia",
      code: "264",
      flag: "NA",
    },
    {
      name: "Nauru",
      code: "674",
      flag: "NR",
    },
    {
      name: "Nepal",
      code: "977",
      flag: "NP",
    },
    {
      name: "Netherlands",
      code: "31",
      flag: "NL",
    },
    {
      name: "Netherlands Antilles",
      code: "599",
      flag: "AN",
    },
    {
      name: "New Caledonia",
      code: "687",
      flag: "NC",
    },
    {
      name: "New Zealand",
      code: "64",
      flag: "NZ",
    },
    {
      name: "Nicaragua",
      code: "505",
      flag: "NI",
    },
    {
      name: "Niger",
      code: "227",
      flag: "NE",
    },
    {
      name: "Nigeria",
      code: "234",
      flag: "NG",
    },
    {
      name: "Niue",
      code: "683",
      flag: "NU",
    },
    {
      name: "Norfolk Island",
      code: "672",
      flag: "NF",
    },
    {
      name: "Northern Mariana Islands",
      code: "1670",
      flag: "MP",
    },
    {
      name: "Norway",
      code: "47",
      flag: "NO",
    },
    {
      name: "Oman",
      code: "968",
      flag: "OM",
    },
    {
      name: "Pakistan",
      code: "92",
      flag: "PK",
    },
    {
      name: "Palau",
      code: "680",
      flag: "PW",
    },
    {
      name: "Palestinian Territory, Occupied",
      code: "970",
      flag: "PS",
    },
    {
      name: "Panama",
      code: "507",
      flag: "PA",
    },
    {
      name: "Papua New Guinea",
      code: "675",
      flag: "PG",
    },
    {
      name: "Paraguay",
      code: "595",
      flag: "PY",
    },
    {
      name: "Peru",
      code: "51",
      flag: "PE",
    },
    {
      name: "Philippines",
      code: "63",
      flag: "PH",
    },
    {
      name: "Pitcairn",
      code: "872",
      flag: "PN",
    },
    {
      name: "Poland",
      code: "48",
      flag: "PL",
    },
    {
      name: "Portugal",
      code: "351",
      flag: "PT",
    },
    {
      name: "Puerto Rico",
      code: "1939",
      flag: "PR",
    },
    {
      name: "Qatar",
      code: "974",
      flag: "QA",
    },
    {
      name: "Romania",
      code: "40",
      flag: "RO",
    },
    {
      name: "Russia",
      code: "7",
      flag: "RU",
    },
    {
      name: "Rwanda",
      code: "250",
      flag: "RW",
    },
    {
      name: "Reunion",
      code: "262",
      flag: "RE",
    },
    {
      name: "Saint Barthelemy",
      code: "590",
      flag: "BL",
    },
    {
      name: "Saint Helena, Ascension and Tristan Da Cunha",
      code: "290",
      flag: "SH",
    },
    {
      name: "Saint Kitts and Nevis",
      code: "1869",
      flag: "KN",
    },
    {
      name: "Saint Lucia",
      code: "1758",
      flag: "LC",
    },
    {
      name: "Saint Martin",
      code: "590",
      flag: "MF",
    },
    {
      name: "Saint Pierre and Miquelon",
      code: "508",
      flag: "PM",
    },
    {
      name: "Saint Vincent and the Grenadines",
      code: "1784",
      flag: "VC",
    },
    {
      name: "Samoa",
      code: "685",
      flag: "WS",
    },
    {
      name: "San Marino",
      code: "378",
      flag: "SM",
    },
    {
      name: "Sao Tome and Principe",
      code: "239",
      flag: "ST",
    },
    {
      name: "Saudi Arabia",
      code: "966",
      flag: "SA",
    },
    {
      name: "Senegal",
      code: "221",
      flag: "SN",
    },
    {
      name: "Serbia",
      code: "381",
      flag: "RS",
    },
    {
      name: "Seychelles",
      code: "248",
      flag: "SC",
    },
    {
      name: "Sierra Leone",
      code: "232",
      flag: "SL",
    },
    {
      name: "Singapore",
      code: "65",
      flag: "SG",
    },
    {
      name: "Slovakia",
      code: "421",
      flag: "SK",
    },
    {
      name: "Slovenia",
      code: "386",
      flag: "SI",
    },
    {
      name: "Solomon Islands",
      code: "677",
      flag: "SB",
    },
    {
      name: "Somalia",
      code: "252",
      flag: "SO",
    },
    {
      name: "South Africa",
      code: "27",
      flag: "ZA",
    },
    {
      name: "South Sudan",
      code: "211",
      flag: "SS",
    },
    {
      name: "South Georgia and the South Sandwich Islands",
      code: "500",
      flag: "GS",
    },
    {
      name: "Spain",
      code: "34",
      flag: "ES",
    },
    {
      name: "Sri Lanka",
      code: "94",
      flag: "LK",
    },
    {
      name: "Sudan",
      code: "249",
      flag: "SD",
    },
    {
      name: "Suriname",
      code: "597",
      flag: "SR",
    },
    {
      name: "Svalbard and Jan Mayen",
      code: "47",
      flag: "SJ",
    },
    {
      name: "Swaziland",
      code: "268",
      flag: "SZ",
    },
    {
      name: "Sweden",
      code: "46",
      flag: "SE",
    },
    {
      name: "Switzerland",
      code: "41",
      flag: "CH",
    },
    {
      name: "Syrian Arab Republic",
      code: "963",
      flag: "SY",
    },
    {
      name: "Taiwan",
      code: "886",
      flag: "TW",
    },
    {
      name: "Tajikistan",
      code: "992",
      flag: "TJ",
    },
    {
      name: "Tanzania, United Republic of Tanzania",
      code: "255",
      flag: "TZ",
    },
    {
      name: "Thailand",
      code: "66",
      flag: "TH",
    },
    {
      name: "Timor-Leste",
      code: "670",
      flag: "TL",
    },
    {
      name: "Togo",
      code: "228",
      flag: "TG",
    },
    {
      name: "Tokelau",
      code: "690",
      flag: "TK",
    },
    {
      name: "Tonga",
      code: "676",
      flag: "TO",
    },
    {
      name: "Trinidad and Tobago",
      code: "1868",
      flag: "TT",
    },
    {
      name: "Tunisia",
      code: "216",
      flag: "TN",
    },
    {
      name: "Turkey",
      code: "90",
      flag: "TR",
    },
    {
      name: "Turkmenistan",
      code: "993",
      flag: "TM",
    },
    {
      name: "Turks and Caicos Islands",
      code: "1649",
      flag: "TC",
    },
    {
      name: "Tuvalu",
      code: "688",
      flag: "TV",
    },
    {
      name: "Uganda",
      code: "256",
      flag: "UG",
    },
    {
      name: "Ukraine",
      code: "380",
      flag: "UA",
    },
    {
      name: "United Arab Emirates",
      code: "971",
      flag: "AE",
    },
    {
      name: "United Kingdom",
      code: "44",
      flag: "GB",
    },
    {
      name: "United States",
      code: "1",
      flag: "US",
    },
    {
      name: "Uruguay",
      code: "598",
      flag: "UY",
    },
    {
      name: "Uzbekistan",
      code: "998",
      flag: "UZ",
    },
    {
      name: "Vanuatu",
      code: "678",
      flag: "VU",
    },
    {
      name: "Venezuela, Bolivarian Republic of Venezuela",
      code: "58",
      flag: "VE",
    },
    {
      name: "Vietnam",
      code: "84",
      flag: "VN",
    },
    {
      name: "Virgin Islands, British",
      code: "1284",
      flag: "VG",
    },
    {
      name: "Virgin Islands, U.S.",
      code: "1340",
      flag: "VI",
    },
    {
      name: "Wallis and Futuna",
      code: "681",
      flag: "WF",
    },
    {
      name: "Yemen",
      code: "967",
      flag: "YE",
    },
    {
      name: "Zambia",
      code: "260",
      flag: "ZM",
    },
    {
      name: "Zimbabwe",
      code: "263",
      flag: "ZW",
    },
  ];

  // Find the matching country flag (starting with the longest ones to avoid partial matches)
  const sortedCodes = [...countryCodes].sort(
    (a, b) => b.flag.length - a.flag.length
  );
  return sortedCodes.find((country) => fullPhone.startsWith(country.code));
};
