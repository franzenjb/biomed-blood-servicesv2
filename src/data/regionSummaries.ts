// AUTO-GENERATED from region-story-mockup/data.js (FSRSMOTradeAreas aggregates).
// Real: donors, sites, population, drive distance, per-site donor counts.
// Placeholder: monthly curve, donor mix, goal%, growth, no-show, units, satisfaction.

export interface RegionSite { name: string; donors: number; rbc: number; }
export interface RegionKpi { goalPct: number; growth: number; noShow: number; unitsToHospitals: number; satisfaction: number; }
export interface RegionSummary {
  region: string; division: string; siteCount: number; districtCount: number;
  totalDonors: number; rbcDonors: number; mobileDonors: number; population: number; avgDrive: number;
  topSites: RegionSite[];
  monthly: { labels: string[]; data: number[] };
  donorMix: { label: string; value: number }[];
  kpi: RegionKpi; narrative: string;
}

export const DIVISIONS: string[] = ["Central Atlantic", "North Central", "Northeast", "Pacific", "Southeast and Caribbean", "Southwest and Rocky Mountain"];

export const REGION_SUMMARIES: RegionSummary[] = [
  {
    "region": "Central and Southern Ohio",
    "division": "Central Atlantic",
    "siteCount": 7,
    "districtCount": 3,
    "totalDonors": 10171,
    "rbcDonors": 7218,
    "mobileDonors": 27279,
    "population": 3418404,
    "avgDrive": 4.0,
    "topSites": [
      {
        "name": "Carriage Place Blood Donation Center",
        "donors": 2455,
        "rbc": 1755
      },
      {
        "name": "Stone Ridge Blood Donation Center",
        "donors": 2224,
        "rbc": 1617
      },
      {
        "name": "Polaris Blood Donation Center",
        "donors": 1699,
        "rbc": 1001
      },
      {
        "name": "Newark OH Blood Donation Center",
        "donors": 1159,
        "rbc": 919
      },
      {
        "name": "Lancaster OH Blood Donation Center",
        "donors": 1125,
        "rbc": 827
      },
      {
        "name": "Delaware OH Blood Donor Center",
        "donors": 966,
        "rbc": 637
      },
      {
        "name": "Cincinnati OH Blood Donation Center",
        "donors": 543,
        "rbc": 462
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        939,
        816,
        976,
        816,
        854,
        665,
        713,
        708,
        921,
        886,
        1039,
        837
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 26
      },
      {
        "label": "First-time",
        "value": 18
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 11
      }
    ],
    "kpi": {
      "goalPct": 91,
      "growth": 6.4,
      "noShow": 12.2,
      "unitsToHospitals": 7230,
      "satisfaction": 83
    },
    "narrative": "Central and Southern Ohio spans 7 fixed donation centers across the Central Atlantic Division, serving a trade-area population of roughly 3,418,404. In CY24 the region welcomed 10,171 donors, with the typical donor traveling about 4.0 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Kentucky",
    "division": "Central Atlantic",
    "siteCount": 3,
    "districtCount": 1,
    "totalDonors": 6397,
    "rbcDonors": 4662,
    "mobileDonors": 16997,
    "population": 1264965,
    "avgDrive": 7.1,
    "topSites": [
      {
        "name": "East End Louisville Blood Donation Center",
        "donors": 3274,
        "rbc": 2632
      },
      {
        "name": "Downtown Louisville Blood Donation Center",
        "donors": 1731,
        "rbc": 987
      },
      {
        "name": "Paducah KY Blood Donation Center",
        "donors": 1392,
        "rbc": 1043
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        538,
        558,
        488,
        643,
        503,
        468,
        441,
        459,
        547,
        627,
        541,
        584
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 24
      },
      {
        "label": "First-time",
        "value": 20
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 11
      }
    ],
    "kpi": {
      "goalPct": 89,
      "growth": 2.6,
      "noShow": 17.6,
      "unitsToHospitals": 5660,
      "satisfaction": 81
    },
    "narrative": "Kentucky spans 3 fixed donation centers across the Central Atlantic Division, serving a trade-area population of roughly 1,264,965. In CY24 the region welcomed 6,397 donors, with the typical donor traveling about 7.1 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "National Capital and Greater Chesapeake",
    "division": "Central Atlantic",
    "siteCount": 13,
    "districtCount": 2,
    "totalDonors": 34357,
    "rbcDonors": 25356,
    "mobileDonors": 37181,
    "population": 8226055,
    "avgDrive": 4.8,
    "topSites": [
      {
        "name": "Fairfax VA Blood Donation Center",
        "donors": 5024,
        "rbc": 4011
      },
      {
        "name": "Rockville MD Blood Donation Center",
        "donors": 4418,
        "rbc": 3662
      },
      {
        "name": "Dr. Charles Drew Blood Donation Center",
        "donors": 4036,
        "rbc": 2652
      },
      {
        "name": "Columbia MD Blood Donation Center",
        "donors": 4015,
        "rbc": 3246
      },
      {
        "name": "Timonium MD Blood Donation Center",
        "donors": 2786,
        "rbc": 2075
      },
      {
        "name": "White Marsh Blood Donation Center",
        "donors": 2461,
        "rbc": 1970
      },
      {
        "name": "Glen Burnie MD Blood Donation Center",
        "donors": 2358,
        "rbc": 1705
      },
      {
        "name": "Frederick MD Blood Donation Center",
        "donors": 2252,
        "rbc": 1749
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        3219,
        2673,
        2945,
        2818,
        2980,
        2374,
        2399,
        2495,
        2704,
        3355,
        3157,
        3239
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 18
      },
      {
        "label": "First-time",
        "value": 24
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 13
      }
    ],
    "kpi": {
      "goalPct": 97,
      "growth": 6.2,
      "noShow": 17.5,
      "unitsToHospitals": 24637,
      "satisfaction": 85
    },
    "narrative": "National Capital and Greater Chesapeake spans 13 fixed donation centers across the Central Atlantic Division, serving a trade-area population of roughly 8,226,055. In CY24 the region welcomed 34,357 donors, with the typical donor traveling about 4.8 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Northern Ohio",
    "division": "Central Atlantic",
    "siteCount": 5,
    "districtCount": 3,
    "totalDonors": 8150,
    "rbcDonors": 6431,
    "mobileDonors": 30795,
    "population": 2755048,
    "avgDrive": 5.5,
    "topSites": [
      {
        "name": "Toledo OH Blood Donation Center",
        "donors": 3023,
        "rbc": 2551
      },
      {
        "name": "Parma OH Blood Donation Center",
        "donors": 2027,
        "rbc": 1535
      },
      {
        "name": "Summit Blood Donation Center",
        "donors": 1939,
        "rbc": 1616
      },
      {
        "name": "Warzel Blood Donation Center",
        "donors": 1161,
        "rbc": 729
      },
      {
        "name": "Willoughby OH Blood Donation Center",
        "donors": 0,
        "rbc": 0
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        664,
        601,
        652,
        791,
        647,
        678,
        665,
        667,
        647,
        715,
        734,
        688
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 27
      },
      {
        "label": "First-time",
        "value": 19
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 9
      }
    ],
    "kpi": {
      "goalPct": 105,
      "growth": 2.0,
      "noShow": 9.8,
      "unitsToHospitals": 5809,
      "satisfaction": 70
    },
    "narrative": "Northern Ohio spans 5 fixed donation centers across the Central Atlantic Division, serving a trade-area population of roughly 2,755,048. In CY24 the region welcomed 8,150 donors, with the typical donor traveling about 5.5 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Virginia",
    "division": "Central Atlantic",
    "siteCount": 9,
    "districtCount": 3,
    "totalDonors": 17411,
    "rbcDonors": 12883,
    "mobileDonors": 32351,
    "population": 3315154,
    "avgDrive": 6.2,
    "topSites": [
      {
        "name": "Virginia Beach VA Blood Donation Center",
        "donors": 3851,
        "rbc": 3121
      },
      {
        "name": "Emerywood Blood Donation Center",
        "donors": 2796,
        "rbc": 1805
      },
      {
        "name": "Charlottesville VA Blood Donation Center",
        "donors": 2210,
        "rbc": 1793
      },
      {
        "name": "Innsbrook Blood Donation Center",
        "donors": 2104,
        "rbc": 1224
      },
      {
        "name": "New River Valley Blood Donation Center",
        "donors": 1414,
        "rbc": 1010
      },
      {
        "name": "Norfolk VA Blood Donation Center",
        "donors": 1292,
        "rbc": 873
      },
      {
        "name": "Lynchburg VA Donation Center",
        "donors": 1273,
        "rbc": 1058
      },
      {
        "name": "Roanoke VA Blood Donation Center",
        "donors": 1268,
        "rbc": 1046
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        1344,
        1479,
        1486,
        1749,
        1255,
        1143,
        1155,
        1304,
        1751,
        1424,
        1471,
        1849
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 23
      },
      {
        "label": "First-time",
        "value": 21
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 11
      }
    ],
    "kpi": {
      "goalPct": 99,
      "growth": 9.7,
      "noShow": 17.3,
      "unitsToHospitals": 14304,
      "satisfaction": 87
    },
    "narrative": "Virginia spans 9 fixed donation centers across the Central Atlantic Division, serving a trade-area population of roughly 3,315,154. In CY24 the region welcomed 17,411 donors, with the typical donor traveling about 6.2 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Illinois",
    "division": "North Central",
    "siteCount": 7,
    "districtCount": 2,
    "totalDonors": 10331,
    "rbcDonors": 8313,
    "mobileDonors": 29197,
    "population": 6413796,
    "avgDrive": 5.6,
    "topSites": [
      {
        "name": "The R. Scott Falk Family Blood Donation Site",
        "donors": 2102,
        "rbc": 1731
      },
      {
        "name": "Schaumburg IL Blood and Platelet Donation Center",
        "donors": 2019,
        "rbc": 1647
      },
      {
        "name": "Bloomington IL Blood Donation Center",
        "donors": 1696,
        "rbc": 1291
      },
      {
        "name": "Orland Park IL Blood Donation Center",
        "donors": 1650,
        "rbc": 1339
      },
      {
        "name": "Peoria IL Blood Donation Center",
        "donors": 1594,
        "rbc": 1354
      },
      {
        "name": "Quincy IL Blood Donation Center",
        "donors": 739,
        "rbc": 580
      },
      {
        "name": "Effingham IL Blood Donation Center",
        "donors": 531,
        "rbc": 371
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        836,
        883,
        850,
        942,
        863,
        803,
        861,
        756,
        896,
        875,
        932,
        836
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 25
      },
      {
        "label": "First-time",
        "value": 22
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 9
      }
    ],
    "kpi": {
      "goalPct": 106,
      "growth": 7.4,
      "noShow": 11.9,
      "unitsToHospitals": 9522,
      "satisfaction": 67
    },
    "narrative": "Illinois spans 7 fixed donation centers across the North Central Division, serving a trade-area population of roughly 6,413,796. In CY24 the region welcomed 10,331 donors, with the typical donor traveling about 5.6 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Indiana",
    "division": "North Central",
    "siteCount": 6,
    "districtCount": 3,
    "totalDonors": 6347,
    "rbcDonors": 4825,
    "mobileDonors": 16020,
    "population": 3015746,
    "avgDrive": 6.0,
    "topSites": [
      {
        "name": "Fort Wayne IN Blood Donation Center",
        "donors": 2433,
        "rbc": 1769
      },
      {
        "name": "Evansville IN Blood Donation Center",
        "donors": 1817,
        "rbc": 1489
      },
      {
        "name": "Lutheran Hospital Blood Donation Center",
        "donors": 1142,
        "rbc": 811
      },
      {
        "name": "Goshen IN Blood Donation Center",
        "donors": 955,
        "rbc": 756
      },
      {
        "name": "Indianapolis IN Blood Donation Center",
        "donors": 0,
        "rbc": 0
      },
      {
        "name": "Noblesville IN Blood Donation Center",
        "donors": 0,
        "rbc": 0
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        573,
        455,
        529,
        523,
        491,
        552,
        526,
        477,
        508,
        583,
        575,
        555
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 24
      },
      {
        "label": "First-time",
        "value": 21
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 10
      }
    ],
    "kpi": {
      "goalPct": 98,
      "growth": 8.7,
      "noShow": 14.4,
      "unitsToHospitals": 4552,
      "satisfaction": 72
    },
    "narrative": "Indiana spans 6 fixed donation centers across the North Central Division, serving a trade-area population of roughly 3,015,746. In CY24 the region welcomed 6,347 donors, with the typical donor traveling about 6.0 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Michigan",
    "division": "North Central",
    "siteCount": 8,
    "districtCount": 2,
    "totalDonors": 17933,
    "rbcDonors": 14161,
    "mobileDonors": 34936,
    "population": 4206635,
    "avgDrive": 5.7,
    "topSites": [
      {
        "name": "Livonia MI Blood Donation Center",
        "donors": 2900,
        "rbc": 2251
      },
      {
        "name": "Bloomfield MI Blood Donation Center",
        "donors": 2657,
        "rbc": 2132
      },
      {
        "name": "Ann Arbor MI Blood Donation Center",
        "donors": 2398,
        "rbc": 1939
      },
      {
        "name": "Warren MI Blood Donation Center",
        "donors": 2312,
        "rbc": 1851
      },
      {
        "name": "Lansing MI Blood Donation Center",
        "donors": 2239,
        "rbc": 1860
      },
      {
        "name": "Farmington Hills MI Blood Donation Center",
        "donors": 1930,
        "rbc": 1222
      },
      {
        "name": "Riverview MI Blood Donation Center",
        "donors": 1891,
        "rbc": 1602
      },
      {
        "name": "Brighton MI Blood Donation Center",
        "donors": 1606,
        "rbc": 1304
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        1631,
        1241,
        1758,
        1360,
        1176,
        1246,
        1190,
        1478,
        1795,
        1631,
        1672,
        1754
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 27
      },
      {
        "label": "First-time",
        "value": 19
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 10
      }
    ],
    "kpi": {
      "goalPct": 99,
      "growth": -3.6,
      "noShow": 9.0,
      "unitsToHospitals": 13232,
      "satisfaction": 84
    },
    "narrative": "Michigan spans 8 fixed donation centers across the North Central Division, serving a trade-area population of roughly 4,206,635. In CY24 the region welcomed 17,933 donors, with the typical donor traveling about 5.7 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Minnesota Dakotas",
    "division": "North Central",
    "siteCount": 6,
    "districtCount": 2,
    "totalDonors": 14889,
    "rbcDonors": 10453,
    "mobileDonors": 34367,
    "population": 3040688,
    "avgDrive": 4.9,
    "topSites": [
      {
        "name": "Mary Coultrap Johnson Blood and Platelet Donation Center",
        "donors": 3880,
        "rbc": 2957
      },
      {
        "name": "Arden Hills MN Blood Donation Center",
        "donors": 2599,
        "rbc": 1648
      },
      {
        "name": "Bloomington MN Blood Donation Center",
        "donors": 2551,
        "rbc": 1957
      },
      {
        "name": "Minneapolis MN Blood Donation Center",
        "donors": 2190,
        "rbc": 1427
      },
      {
        "name": "St Cloud MN Blood Donation Center",
        "donors": 1912,
        "rbc": 1487
      },
      {
        "name": "Blaine MN Blood Donation Center",
        "donors": 1757,
        "rbc": 977
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        1392,
        1003,
        1430,
        1165,
        1259,
        1058,
        941,
        1034,
        1405,
        1331,
        1233,
        1639
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 26
      },
      {
        "label": "First-time",
        "value": 18
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 11
      }
    ],
    "kpi": {
      "goalPct": 106,
      "growth": 0.3,
      "noShow": 9.6,
      "unitsToHospitals": 11511,
      "satisfaction": 83
    },
    "narrative": "Minnesota Dakotas spans 6 fixed donation centers across the North Central Division, serving a trade-area population of roughly 3,040,688. In CY24 the region welcomed 14,889 donors, with the typical donor traveling about 4.9 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Nebraska Iowa",
    "division": "North Central",
    "siteCount": 3,
    "districtCount": 2,
    "totalDonors": 8152,
    "rbcDonors": 6207,
    "mobileDonors": 12972,
    "population": 1064492,
    "avgDrive": 5.6,
    "topSites": [
      {
        "name": "West Omaha NE Blood Donation Center",
        "donors": 5313,
        "rbc": 4114
      },
      {
        "name": "Dewey Blood Donation Center",
        "donors": 2049,
        "rbc": 1446
      },
      {
        "name": "Dubuque IA Blood Donation Center",
        "donors": 790,
        "rbc": 647
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        700,
        677,
        750,
        679,
        719,
        633,
        530,
        651,
        812,
        653,
        642,
        707
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 22
      },
      {
        "label": "First-time",
        "value": 24
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 9
      }
    ],
    "kpi": {
      "goalPct": 105,
      "growth": 6.4,
      "noShow": 8.3,
      "unitsToHospitals": 8141,
      "satisfaction": 74
    },
    "narrative": "Nebraska Iowa spans 3 fixed donation centers across the North Central Division, serving a trade-area population of roughly 1,064,492. In CY24 the region welcomed 8,152 donors, with the typical donor traveling about 5.6 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Wisconsin",
    "division": "North Central",
    "siteCount": 7,
    "districtCount": 3,
    "totalDonors": 12090,
    "rbcDonors": 9387,
    "mobileDonors": 27622,
    "population": 1992834,
    "avgDrive": 6.1,
    "topSites": [
      {
        "name": "Madison West Blood Donation Center",
        "donors": 3956,
        "rbc": 3106
      },
      {
        "name": "Madison East Blood Donation Center",
        "donors": 2460,
        "rbc": 1813
      },
      {
        "name": "Green Bay WI Blood Donation Center",
        "donors": 1639,
        "rbc": 1279
      },
      {
        "name": "Chippewa Valley Blood Donation Center",
        "donors": 1533,
        "rbc": 1250
      },
      {
        "name": "Waukesha Blood Donation Center",
        "donors": 1204,
        "rbc": 942
      },
      {
        "name": "La Crosse WI Blood Donation Center",
        "donors": 710,
        "rbc": 554
      },
      {
        "name": "Stevens Point WI Blood Donation Center",
        "donors": 588,
        "rbc": 443
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        901,
        823,
        911,
        1103,
        1042,
        811,
        956,
        1091,
        1034,
        1292,
        935,
        1191
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 19
      },
      {
        "label": "First-time",
        "value": 26
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 10
      }
    ],
    "kpi": {
      "goalPct": 92,
      "growth": 3.3,
      "noShow": 12.5,
      "unitsToHospitals": 9079,
      "satisfaction": 63
    },
    "narrative": "Wisconsin spans 7 fixed donation centers across the North Central Division, serving a trade-area population of roughly 1,992,834. In CY24 the region welcomed 12,090 donors, with the typical donor traveling about 6.1 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Connecticut Rhode Island",
    "division": "Northeast",
    "siteCount": 3,
    "districtCount": 1,
    "totalDonors": 5182,
    "rbcDonors": 3288,
    "mobileDonors": 11815,
    "population": 1193525,
    "avgDrive": 4.8,
    "topSites": [
      {
        "name": "Milford CT Blood Donation Center",
        "donors": 1952,
        "rbc": 1422
      },
      {
        "name": "Farmington CT Blood Donation Center",
        "donors": 1849,
        "rbc": 875
      },
      {
        "name": "Greenwich CT Blood Donation Center",
        "donors": 1381,
        "rbc": 991
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        397,
        450,
        449,
        479,
        413,
        426,
        377,
        391,
        488,
        413,
        461,
        439
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 27
      },
      {
        "label": "First-time",
        "value": 18
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 10
      }
    ],
    "kpi": {
      "goalPct": 101,
      "growth": 0.9,
      "noShow": 14.8,
      "unitsToHospitals": 5026,
      "satisfaction": 87
    },
    "narrative": "Connecticut Rhode Island spans 3 fixed donation centers across the Northeast Division, serving a trade-area population of roughly 1,193,525. In CY24 the region welcomed 5,182 donors, with the typical donor traveling about 4.8 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Eastern New York",
    "division": "Northeast",
    "siteCount": 3,
    "districtCount": 2,
    "totalDonors": 6867,
    "rbcDonors": 5654,
    "mobileDonors": 18036,
    "population": 1376321,
    "avgDrive": 6.4,
    "topSites": [
      {
        "name": "Everett Road Blood Donation Center",
        "donors": 3077,
        "rbc": 2567
      },
      {
        "name": "Liverpool NY Blood Donation Center",
        "donors": 2749,
        "rbc": 2227
      },
      {
        "name": "Utica Blood Donation Center",
        "donors": 1041,
        "rbc": 860
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        608,
        490,
        559,
        649,
        474,
        544,
        484,
        523,
        589,
        708,
        594,
        644
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 23
      },
      {
        "label": "First-time",
        "value": 21
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 11
      }
    ],
    "kpi": {
      "goalPct": 102,
      "growth": 0.7,
      "noShow": 10.5,
      "unitsToHospitals": 5256,
      "satisfaction": 80
    },
    "narrative": "Eastern New York spans 3 fixed donation centers across the Northeast Division, serving a trade-area population of roughly 1,376,321. In CY24 the region welcomed 6,867 donors, with the typical donor traveling about 6.4 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Greater Pennsylvania",
    "division": "Northeast",
    "siteCount": 3,
    "districtCount": 2,
    "totalDonors": 1986,
    "rbcDonors": 1615,
    "mobileDonors": 3902,
    "population": 517470,
    "avgDrive": 6.4,
    "topSites": [
      {
        "name": "Ashley PA Blood Donation Center",
        "donors": 961,
        "rbc": 804
      },
      {
        "name": "Johnstown PA Blood Donation Center",
        "donors": 524,
        "rbc": 424
      },
      {
        "name": "Altoona PA Blood Donation Center",
        "donors": 501,
        "rbc": 387
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        173,
        149,
        156,
        161,
        163,
        154,
        128,
        184,
        201,
        174,
        167,
        176
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 22
      },
      {
        "label": "First-time",
        "value": 21
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 12
      }
    ],
    "kpi": {
      "goalPct": 101,
      "growth": -1.0,
      "noShow": 16.4,
      "unitsToHospitals": 1937,
      "satisfaction": 59
    },
    "narrative": "Greater Pennsylvania spans 3 fixed donation centers across the Northeast Division, serving a trade-area population of roughly 517,470. In CY24 the region welcomed 1,986 donors, with the typical donor traveling about 6.4 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Massachusetts",
    "division": "Northeast",
    "siteCount": 10,
    "districtCount": 1,
    "totalDonors": 21306,
    "rbcDonors": 15974,
    "mobileDonors": 30916,
    "population": 6006116,
    "avgDrive": 5.7,
    "topSites": [
      {
        "name": "Worcester MA Blood Donation Center",
        "donors": 3000,
        "rbc": 2529
      },
      {
        "name": "Boston MA Blood Donation Center",
        "donors": 2965,
        "rbc": 1900
      },
      {
        "name": "Dedham MA Blood Donation Center",
        "donors": 2444,
        "rbc": 1787
      },
      {
        "name": "Weymouth MA Blood Donation Center",
        "donors": 2423,
        "rbc": 1915
      },
      {
        "name": "Springfield MA Blood Donation Center",
        "donors": 2393,
        "rbc": 1959
      },
      {
        "name": "Danvers MA Blood Donation Center",
        "donors": 2032,
        "rbc": 1640
      },
      {
        "name": "Framingham MA Blood Donation Center",
        "donors": 2032,
        "rbc": 1236
      },
      {
        "name": "Raynham MA Blood Donation Center",
        "donors": 1956,
        "rbc": 1527
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        1682,
        1669,
        1685,
        1598,
        1709,
        1623,
        1585,
        1825,
        2089,
        2122,
        1952,
        1768
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 15
      },
      {
        "label": "First-time",
        "value": 26
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 15
      }
    ],
    "kpi": {
      "goalPct": 106,
      "growth": 2.8,
      "noShow": 13.9,
      "unitsToHospitals": 17731,
      "satisfaction": 60
    },
    "narrative": "Massachusetts spans 10 fixed donation centers across the Northeast Division, serving a trade-area population of roughly 6,006,116. In CY24 the region welcomed 21,306 donors, with the typical donor traveling about 5.7 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Northern New England",
    "division": "Northeast",
    "siteCount": 6,
    "districtCount": 2,
    "totalDonors": 12334,
    "rbcDonors": 9182,
    "mobileDonors": 14387,
    "population": 1332322,
    "avgDrive": 6.0,
    "topSites": [
      {
        "name": "Manchester NH Blood Donation Center",
        "donors": 3037,
        "rbc": 2249
      },
      {
        "name": "Portland ME Blood Donation Center",
        "donors": 2687,
        "rbc": 2128
      },
      {
        "name": "Burlington VT Blood Donation Center",
        "donors": 2573,
        "rbc": 1969
      },
      {
        "name": "Amherst NH Blood Donation Center",
        "donors": 1794,
        "rbc": 1148
      },
      {
        "name": "Bangor ME Blood Donation Center",
        "donors": 1402,
        "rbc": 1015
      },
      {
        "name": "Twin Cities Blood Donation Center",
        "donors": 841,
        "rbc": 673
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        1047,
        936,
        1177,
        985,
        1058,
        1022,
        774,
        914,
        1188,
        1064,
        1017,
        1153
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 21
      },
      {
        "label": "First-time",
        "value": 23
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 11
      }
    ],
    "kpi": {
      "goalPct": 97,
      "growth": 5.0,
      "noShow": 8.1,
      "unitsToHospitals": 9762,
      "satisfaction": 77
    },
    "narrative": "Northern New England spans 6 fixed donation centers across the Northeast Division, serving a trade-area population of roughly 1,332,322. In CY24 the region welcomed 12,334 donors, with the typical donor traveling about 6.0 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Southeastern Pennsylvania",
    "division": "Northeast",
    "siteCount": 12,
    "districtCount": 4,
    "totalDonors": 20743,
    "rbcDonors": 15571,
    "mobileDonors": 60492,
    "population": 8503505,
    "avgDrive": 4.6,
    "topSites": [
      {
        "name": "West Chester PA Blood Donation Center",
        "donors": 2484,
        "rbc": 2054
      },
      {
        "name": "Philadelphia PA Blood Donation Center",
        "donors": 2345,
        "rbc": 1837
      },
      {
        "name": "Horsham PA Blood Donation Center",
        "donors": 2252,
        "rbc": 1745
      },
      {
        "name": "Princeton NJ Blood Donation Center",
        "donors": 2110,
        "rbc": 1698
      },
      {
        "name": "Langhorne PA Blood Donation Center",
        "donors": 1860,
        "rbc": 1104
      },
      {
        "name": "East Norriton PA Blood Donation Center",
        "donors": 1749,
        "rbc": 971
      },
      {
        "name": "Fairfield NJ Blood Donation Center",
        "donors": 1732,
        "rbc": 1490
      },
      {
        "name": "Pennsauken NJ Blood Donation Center",
        "donors": 1654,
        "rbc": 1320
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        1626,
        1634,
        1916,
        1941,
        1683,
        1615,
        1434,
        1800,
        1862,
        1958,
        1587,
        1687
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 14
      },
      {
        "label": "First-time",
        "value": 28
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 13
      }
    ],
    "kpi": {
      "goalPct": 106,
      "growth": 6.2,
      "noShow": 15.1,
      "unitsToHospitals": 20329,
      "satisfaction": 79
    },
    "narrative": "Southeastern Pennsylvania spans 12 fixed donation centers across the Northeast Division, serving a trade-area population of roughly 8,503,505. In CY24 the region welcomed 20,743 donors, with the typical donor traveling about 4.6 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Western New York",
    "division": "Northeast",
    "siteCount": 5,
    "districtCount": 2,
    "totalDonors": 10021,
    "rbcDonors": 7665,
    "mobileDonors": 15344,
    "population": 1907532,
    "avgDrive": 5.5,
    "topSites": [
      {
        "name": "Union Road Blood Donation Center",
        "donors": 2575,
        "rbc": 2078
      },
      {
        "name": "Fairport NY Blood Donation Center",
        "donors": 2208,
        "rbc": 1873
      },
      {
        "name": "West Henrietta NY Blood Donation Center",
        "donors": 2022,
        "rbc": 1268
      },
      {
        "name": "Greece Blood Donation Center",
        "donors": 1995,
        "rbc": 1462
      },
      {
        "name": "Johnson City NY Blood Donation Center",
        "donors": 1221,
        "rbc": 984
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        806,
        809,
        790,
        965,
        735,
        678,
        659,
        847,
        831,
        906,
        974,
        1021
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 20
      },
      {
        "label": "First-time",
        "value": 23
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 12
      }
    ],
    "kpi": {
      "goalPct": 99,
      "growth": -1.7,
      "noShow": 14.8,
      "unitsToHospitals": 7231,
      "satisfaction": 64
    },
    "narrative": "Western New York spans 5 fixed donation centers across the Northeast Division, serving a trade-area population of roughly 1,907,532. In CY24 the region welcomed 10,021 donors, with the typical donor traveling about 5.5 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Idaho Montana",
    "division": "Pacific",
    "siteCount": 4,
    "districtCount": 2,
    "totalDonors": 9390,
    "rbcDonors": 7454,
    "mobileDonors": 13437,
    "population": 1029753,
    "avgDrive": 6.4,
    "topSites": [
      {
        "name": "Boise ID Blood Donation Center",
        "donors": 4596,
        "rbc": 3745
      },
      {
        "name": "Nampa ID Blood Donation Center",
        "donors": 2773,
        "rbc": 2049
      },
      {
        "name": "Missoula MT Blood Donation Center",
        "donors": 1288,
        "rbc": 1050
      },
      {
        "name": "Great Falls MT Blood Donation Center",
        "donors": 733,
        "rbc": 610
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        788,
        731,
        918,
        739,
        654,
        779,
        583,
        689,
        848,
        881,
        831,
        949
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 26
      },
      {
        "label": "First-time",
        "value": 19
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 10
      }
    ],
    "kpi": {
      "goalPct": 100,
      "growth": 1.3,
      "noShow": 17.2,
      "unitsToHospitals": 8641,
      "satisfaction": 77
    },
    "narrative": "Idaho Montana spans 4 fixed donation centers across the Pacific Division, serving a trade-area population of roughly 1,029,753. In CY24 the region welcomed 9,390 donors, with the typical donor traveling about 6.4 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Northern California Coastal",
    "division": "Pacific",
    "siteCount": 9,
    "districtCount": 1,
    "totalDonors": 26247,
    "rbcDonors": 20755,
    "mobileDonors": 15590,
    "population": 7440795,
    "avgDrive": 5.4,
    "topSites": [
      {
        "name": "Contra Costa Blood Donation Center",
        "donors": 4667,
        "rbc": 3882
      },
      {
        "name": "San Jose CA Blood Donation Center",
        "donors": 4537,
        "rbc": 3425
      },
      {
        "name": "Oakland CA Blood Donation Center",
        "donors": 4341,
        "rbc": 3555
      },
      {
        "name": "Pleasanton CA Blood Donation Center",
        "donors": 3336,
        "rbc": 2668
      },
      {
        "name": "San Francisco CA Blood Donation Center",
        "donors": 2340,
        "rbc": 1858
      },
      {
        "name": "Modesto CA Blood Donation Center",
        "donors": 2287,
        "rbc": 1827
      },
      {
        "name": "Fremont - Newark Blood Donation Center",
        "donors": 1911,
        "rbc": 1473
      },
      {
        "name": "North Stockton CA Blood Donation Center",
        "donors": 1778,
        "rbc": 1306
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        2120,
        2207,
        1987,
        2374,
        1973,
        1967,
        1722,
        2338,
        2604,
        2320,
        2159,
        2476
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 29
      },
      {
        "label": "First-time",
        "value": 24
      },
      {
        "label": "Mobile drive",
        "value": 37
      },
      {
        "label": "Apheresis / Power Red",
        "value": 9
      }
    ],
    "kpi": {
      "goalPct": 91,
      "growth": 5.8,
      "noShow": 12.5,
      "unitsToHospitals": 22226,
      "satisfaction": 61
    },
    "narrative": "Northern California Coastal spans 9 fixed donation centers across the Pacific Division, serving a trade-area population of roughly 7,440,795. In CY24 the region welcomed 26,247 donors, with the typical donor traveling about 5.4 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Northwest",
    "division": "Pacific",
    "siteCount": 8,
    "districtCount": 3,
    "totalDonors": 20919,
    "rbcDonors": 16213,
    "mobileDonors": 36655,
    "population": 4860419,
    "avgDrive": 6.3,
    "topSites": [
      {
        "name": "Portland OR Blood Donation Center",
        "donors": 4057,
        "rbc": 3079
      },
      {
        "name": "Vancouver WA Blood Donation Center",
        "donors": 3542,
        "rbc": 3103
      },
      {
        "name": "Salem OR Blood Donation Center",
        "donors": 2979,
        "rbc": 2515
      },
      {
        "name": "Bend OR Blood Donation Center",
        "donors": 2877,
        "rbc": 2493
      },
      {
        "name": "Beaverton OR Blood Donation Center",
        "donors": 2403,
        "rbc": 756
      },
      {
        "name": "Kennewick WA Blood Donation Center",
        "donors": 2132,
        "rbc": 1882
      },
      {
        "name": "Wood Village OR Blood Donor Center",
        "donors": 1674,
        "rbc": 1366
      },
      {
        "name": "Seattle WA Blood Donation Center",
        "donors": 1255,
        "rbc": 1019
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        1669,
        1798,
        1919,
        1686,
        1745,
        1607,
        1383,
        1597,
        1804,
        2027,
        1709,
        1975
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 19
      },
      {
        "label": "First-time",
        "value": 23
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 12
      }
    ],
    "kpi": {
      "goalPct": 91,
      "growth": 2.8,
      "noShow": 12.0,
      "unitsToHospitals": 20701,
      "satisfaction": 82
    },
    "narrative": "Northwest spans 8 fixed donation centers across the Pacific Division, serving a trade-area population of roughly 4,860,419. In CY24 the region welcomed 20,919 donors, with the typical donor traveling about 6.3 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Southern California",
    "division": "Pacific",
    "siteCount": 14,
    "districtCount": 4,
    "totalDonors": 48238,
    "rbcDonors": 37129,
    "mobileDonors": 82337,
    "population": 16169796,
    "avgDrive": 5.0,
    "topSites": [
      {
        "name": "Laguna Hills CA Blood Donation Center",
        "donors": 4555,
        "rbc": 3785
      },
      {
        "name": "Burbank CA Blood Donation Center",
        "donors": 4395,
        "rbc": 3213
      },
      {
        "name": "Woodland Hills CA Blood Donation Center",
        "donors": 4106,
        "rbc": 3243
      },
      {
        "name": "Torrance CA Blood Donation Center",
        "donors": 4084,
        "rbc": 3222
      },
      {
        "name": "Fullerton CA Blood Donation Center",
        "donors": 3863,
        "rbc": 2998
      },
      {
        "name": "Pasadena CA Blood Donation Center",
        "donors": 3786,
        "rbc": 2970
      },
      {
        "name": "Pomona CA Blood Donation Center",
        "donors": 3751,
        "rbc": 2798
      },
      {
        "name": "Culver City CA Blood Donation Center",
        "donors": 3646,
        "rbc": 2840
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        4365,
        4011,
        3707,
        4653,
        3458,
        3449,
        3406,
        3837,
        4386,
        4874,
        4210,
        3882
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 25
      },
      {
        "label": "First-time",
        "value": 21
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 9
      }
    ],
    "kpi": {
      "goalPct": 101,
      "growth": 4.8,
      "noShow": 15.0,
      "unitsToHospitals": 38003,
      "satisfaction": 86
    },
    "narrative": "Southern California spans 14 fixed donation centers across the Pacific Division, serving a trade-area population of roughly 16,169,796. In CY24 the region welcomed 48,238 donors, with the typical donor traveling about 5.0 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Alabama Mississippi",
    "division": "Southeast and Caribbean",
    "siteCount": 2,
    "districtCount": 1,
    "totalDonors": 3428,
    "rbcDonors": 2733,
    "mobileDonors": 4656,
    "population": 1054075,
    "avgDrive": 7.4,
    "topSites": [
      {
        "name": "Birmingham AL Blood Donation Center",
        "donors": 2053,
        "rbc": 1626
      },
      {
        "name": "Huntsville AL Blood Donation Center",
        "donors": 1375,
        "rbc": 1107
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        304,
        242,
        312,
        260,
        249,
        246,
        253,
        243,
        333,
        340,
        280,
        365
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 25
      },
      {
        "label": "First-time",
        "value": 22
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 8
      }
    ],
    "kpi": {
      "goalPct": 98,
      "growth": 7.6,
      "noShow": 14.0,
      "unitsToHospitals": 3151,
      "satisfaction": 85
    },
    "narrative": "Alabama Mississippi spans 2 fixed donation centers across the Southeast and Caribbean Division, serving a trade-area population of roughly 1,054,075. In CY24 the region welcomed 3,428 donors, with the typical donor traveling about 7.4 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Eastern North Carolina",
    "division": "Southeast and Caribbean",
    "siteCount": 5,
    "districtCount": 2,
    "totalDonors": 13779,
    "rbcDonors": 11000,
    "mobileDonors": 17046,
    "population": 2324838,
    "avgDrive": 6.2,
    "topSites": [
      {
        "name": "Cary NC Blood Donation Center",
        "donors": 4127,
        "rbc": 3315
      },
      {
        "name": "Wilmington NC Blood Donation Center",
        "donors": 2982,
        "rbc": 2419
      },
      {
        "name": "North Raleigh NC Blood Donation Center",
        "donors": 2916,
        "rbc": 2370
      },
      {
        "name": "Durham NC Blood Donation Center",
        "donors": 2824,
        "rbc": 2158
      },
      {
        "name": "Greenville NC Blood Donation Center",
        "donors": 930,
        "rbc": 738
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        1156,
        1070,
        1259,
        1070,
        1086,
        1014,
        1008,
        1041,
        1210,
        1176,
        1256,
        1432
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 25
      },
      {
        "label": "First-time",
        "value": 21
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 9
      }
    ],
    "kpi": {
      "goalPct": 96,
      "growth": 8.8,
      "noShow": 10.0,
      "unitsToHospitals": 12163,
      "satisfaction": 86
    },
    "narrative": "Eastern North Carolina spans 5 fixed donation centers across the Southeast and Caribbean Division, serving a trade-area population of roughly 2,324,838. In CY24 the region welcomed 13,779 donors, with the typical donor traveling about 6.2 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Georgia",
    "division": "Southeast and Caribbean",
    "siteCount": 9,
    "districtCount": 3,
    "totalDonors": 22631,
    "rbcDonors": 17490,
    "mobileDonors": 40586,
    "population": 6205785,
    "avgDrive": 7.0,
    "topSites": [
      {
        "name": "Midtown Blood Donation Center",
        "donors": 4174,
        "rbc": 3226
      },
      {
        "name": "Cobb Blood Donation Center",
        "donors": 3828,
        "rbc": 2961
      },
      {
        "name": "Alpharetta GA Blood Donation Center",
        "donors": 3712,
        "rbc": 2672
      },
      {
        "name": "Duluth GA Blood Donation Center",
        "donors": 3266,
        "rbc": 2605
      },
      {
        "name": "Savannah GA Blood Donation Center",
        "donors": 2073,
        "rbc": 1603
      },
      {
        "name": "Athens GA Blood Donation Center",
        "donors": 2069,
        "rbc": 1578
      },
      {
        "name": "Columbus GA Blood Donation Center",
        "donors": 1387,
        "rbc": 1095
      },
      {
        "name": "Fayetteville GA Blood Donation Center",
        "donors": 1227,
        "rbc": 1044
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        1652,
        1726,
        2278,
        1811,
        1627,
        1737,
        1507,
        1713,
        1943,
        2387,
        1883,
        2369
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 20
      },
      {
        "label": "First-time",
        "value": 22
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 13
      }
    ],
    "kpi": {
      "goalPct": 98,
      "growth": 1.1,
      "noShow": 8.1,
      "unitsToHospitals": 20555,
      "satisfaction": 69
    },
    "narrative": "Georgia spans 9 fixed donation centers across the Southeast and Caribbean Division, serving a trade-area population of roughly 6,205,785. In CY24 the region welcomed 22,631 donors, with the typical donor traveling about 7.0 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Greater Carolinas",
    "division": "Southeast and Caribbean",
    "siteCount": 7,
    "districtCount": 3,
    "totalDonors": 15912,
    "rbcDonors": 12752,
    "mobileDonors": 27836,
    "population": 3625723,
    "avgDrive": 6.5,
    "topSites": [
      {
        "name": "Winston Salem NC Blood Donation Center",
        "donors": 3279,
        "rbc": 2761
      },
      {
        "name": "Charlotte NC Blood Donation Center",
        "donors": 2965,
        "rbc": 2137
      },
      {
        "name": "Greensboro NC Blood Donation Center",
        "donors": 2715,
        "rbc": 2186
      },
      {
        "name": "Huntersville NC Blood Donation Center",
        "donors": 2415,
        "rbc": 1910
      },
      {
        "name": "Asheville NC Blood Donation Center",
        "donors": 1961,
        "rbc": 1608
      },
      {
        "name": "Rock Hill SC Blood Donation Center",
        "donors": 1290,
        "rbc": 1125
      },
      {
        "name": "Indian Trail NC Blood Donor Center",
        "donors": 1287,
        "rbc": 1025
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        1270,
        1238,
        1174,
        1437,
        1326,
        1223,
        1164,
        1060,
        1566,
        1573,
        1278,
        1603
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 18
      },
      {
        "label": "First-time",
        "value": 27
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 10
      }
    ],
    "kpi": {
      "goalPct": 93,
      "growth": -1.6,
      "noShow": 17.3,
      "unitsToHospitals": 13869,
      "satisfaction": 69
    },
    "narrative": "Greater Carolinas spans 7 fixed donation centers across the Southeast and Caribbean Division, serving a trade-area population of roughly 3,625,723. In CY24 the region welcomed 15,912 donors, with the typical donor traveling about 6.5 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "South Carolina",
    "division": "Southeast and Caribbean",
    "siteCount": 4,
    "districtCount": 1,
    "totalDonors": 8303,
    "rbcDonors": 6635,
    "mobileDonors": 13875,
    "population": 1855762,
    "avgDrive": 7.4,
    "topSites": [
      {
        "name": "Columbia SC Blood Donation Center",
        "donors": 2851,
        "rbc": 2301
      },
      {
        "name": "Myrtle Beach SC Blood Donation Center",
        "donors": 2220,
        "rbc": 1761
      },
      {
        "name": "West Ashley Blood Donation Center",
        "donors": 1898,
        "rbc": 1552
      },
      {
        "name": "Mt Pleasant SC Blood Donation Center",
        "donors": 1334,
        "rbc": 1021
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        704,
        709,
        706,
        728,
        742,
        576,
        542,
        692,
        697,
        843,
        651,
        712
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 23
      },
      {
        "label": "First-time",
        "value": 22
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 10
      }
    ],
    "kpi": {
      "goalPct": 90,
      "growth": 5.7,
      "noShow": 12.4,
      "unitsToHospitals": 6463,
      "satisfaction": 66
    },
    "narrative": "South Carolina spans 4 fixed donation centers across the Southeast and Caribbean Division, serving a trade-area population of roughly 1,855,762. In CY24 the region welcomed 8,303 donors, with the typical donor traveling about 7.4 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Tennessee",
    "division": "Southeast and Caribbean",
    "siteCount": 4,
    "districtCount": 1,
    "totalDonors": 11634,
    "rbcDonors": 8613,
    "mobileDonors": 12754,
    "population": 1712269,
    "avgDrive": 6.2,
    "topSites": [
      {
        "name": "Nashville TN Blood Donation Center",
        "donors": 4212,
        "rbc": 2735
      },
      {
        "name": "Brentwood TN Blood Donation Center",
        "donors": 2686,
        "rbc": 2110
      },
      {
        "name": "Murfreesboro TN Blood Donation Center",
        "donors": 2679,
        "rbc": 2109
      },
      {
        "name": "Hendersonville TN Blood Donation Center",
        "donors": 2057,
        "rbc": 1659
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        830,
        812,
        1170,
        1085,
        822,
        831,
        766,
        953,
        967,
        959,
        1146,
        1291
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 18
      },
      {
        "label": "First-time",
        "value": 25
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 12
      }
    ],
    "kpi": {
      "goalPct": 89,
      "growth": 6.4,
      "noShow": 13.7,
      "unitsToHospitals": 10965,
      "satisfaction": 82
    },
    "narrative": "Tennessee spans 4 fixed donation centers across the Southeast and Caribbean Division, serving a trade-area population of roughly 1,712,269. In CY24 the region welcomed 11,634 donors, with the typical donor traveling about 6.2 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Arizona New Mexico",
    "division": "Southwest and Rocky Mountain",
    "siteCount": 5,
    "districtCount": 2,
    "totalDonors": 15156,
    "rbcDonors": 12211,
    "mobileDonors": 20816,
    "population": 6616331,
    "avgDrive": 7.1,
    "topSites": [
      {
        "name": "Broadway Blood Donation Center Tucson",
        "donors": 4380,
        "rbc": 3471
      },
      {
        "name": "Foothills Blood Donation Center",
        "donors": 3960,
        "rbc": 3197
      },
      {
        "name": "Gilbert AZ Red Cross Blood and Platelet Donation Center",
        "donors": 2742,
        "rbc": 2199
      },
      {
        "name": "Glendale AZ Red Cross Blood and Platelet Donation Center",
        "donors": 2212,
        "rbc": 1767
      },
      {
        "name": "Denver CO Blood Donation Center",
        "donors": 1862,
        "rbc": 1577
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        1098,
        1161,
        1366,
        1205,
        1346,
        1254,
        1117,
        1294,
        1543,
        1213,
        1242,
        1319
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 22
      },
      {
        "label": "First-time",
        "value": 24
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 10
      }
    ],
    "kpi": {
      "goalPct": 91,
      "growth": 3.7,
      "noShow": 16.6,
      "unitsToHospitals": 10644,
      "satisfaction": 81
    },
    "narrative": "Arizona New Mexico spans 5 fixed donation centers across the Southwest and Rocky Mountain Division, serving a trade-area population of roughly 6,616,331. In CY24 the region welcomed 15,156 donors, with the typical donor traveling about 7.1 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Kansas Oklahoma",
    "division": "Southwest and Rocky Mountain",
    "siteCount": 3,
    "districtCount": 2,
    "totalDonors": 7541,
    "rbcDonors": 6261,
    "mobileDonors": 9714,
    "population": 1527225,
    "avgDrive": 6.7,
    "topSites": [
      {
        "name": "Wichita KS Blood Donation Center",
        "donors": 3829,
        "rbc": 3209
      },
      {
        "name": "Tulsa OK Blood Donation Center",
        "donors": 3014,
        "rbc": 2510
      },
      {
        "name": "Salina KS Blood Donation Center",
        "donors": 698,
        "rbc": 542
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        678,
        650,
        573,
        726,
        584,
        579,
        595,
        550,
        593,
        674,
        685,
        655
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 15
      },
      {
        "label": "First-time",
        "value": 25
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 14
      }
    ],
    "kpi": {
      "goalPct": 91,
      "growth": 5.7,
      "noShow": 8.0,
      "unitsToHospitals": 6172,
      "satisfaction": 68
    },
    "narrative": "Kansas Oklahoma spans 3 fixed donation centers across the Southwest and Rocky Mountain Division, serving a trade-area population of roughly 1,527,225. In CY24 the region welcomed 7,541 donors, with the typical donor traveling about 6.7 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Missouri Arkansas",
    "division": "Southwest and Rocky Mountain",
    "siteCount": 10,
    "districtCount": 3,
    "totalDonors": 16788,
    "rbcDonors": 13294,
    "mobileDonors": 35625,
    "population": 3912162,
    "avgDrive": 6.4,
    "topSites": [
      {
        "name": "South County Blood Donation Center",
        "donors": 3517,
        "rbc": 2901
      },
      {
        "name": "West County Blood Donation Center",
        "donors": 2648,
        "rbc": 1974
      },
      {
        "name": "St Charles County Blood Donation Center",
        "donors": 2450,
        "rbc": 1998
      },
      {
        "name": "Columbia MO Blood Donation Center",
        "donors": 1675,
        "rbc": 1330
      },
      {
        "name": "Fairview Heights IL Blood Donation Center",
        "donors": 1463,
        "rbc": 1221
      },
      {
        "name": "Jefferson City MO Blood Donation Center",
        "donors": 1223,
        "rbc": 1000
      },
      {
        "name": "Overland Park KS Blood Donation Center",
        "donors": 1127,
        "rbc": 977
      },
      {
        "name": "Cape Girardeau MO Blood Donation Center",
        "donors": 1008,
        "rbc": 730
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        1485,
        1219,
        1502,
        1469,
        1445,
        1379,
        1029,
        1437,
        1312,
        1516,
        1592,
        1403
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 22
      },
      {
        "label": "First-time",
        "value": 25
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 8
      }
    ],
    "kpi": {
      "goalPct": 98,
      "growth": -2.4,
      "noShow": 8.6,
      "unitsToHospitals": 15723,
      "satisfaction": 67
    },
    "narrative": "Missouri Arkansas spans 10 fixed donation centers across the Southwest and Rocky Mountain Division, serving a trade-area population of roughly 3,912,162. In CY24 the region welcomed 16,788 donors, with the typical donor traveling about 6.4 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "North Texas",
    "division": "Southwest and Rocky Mountain",
    "siteCount": 2,
    "districtCount": 1,
    "totalDonors": 5581,
    "rbcDonors": 4271,
    "mobileDonors": 10830,
    "population": 5077143,
    "avgDrive": 8.6,
    "topSites": [
      {
        "name": "Plano TX Blood Donation Center",
        "donors": 3231,
        "rbc": 2571
      },
      {
        "name": "Irving TX Blood Donation Center",
        "donors": 2350,
        "rbc": 1700
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        493,
        356,
        536,
        440,
        453,
        360,
        381,
        467,
        525,
        540,
        535,
        496
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 22
      },
      {
        "label": "First-time",
        "value": 22
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 11
      }
    ],
    "kpi": {
      "goalPct": 89,
      "growth": 4.6,
      "noShow": 10.2,
      "unitsToHospitals": 4650,
      "satisfaction": 84
    },
    "narrative": "North Texas spans 2 fixed donation centers across the Southwest and Rocky Mountain Division, serving a trade-area population of roughly 5,077,143. In CY24 the region welcomed 5,581 donors, with the typical donor traveling about 8.6 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  },
  {
    "region": "Utah Nevada",
    "division": "Southwest and Rocky Mountain",
    "siteCount": 3,
    "districtCount": 2,
    "totalDonors": 16839,
    "rbcDonors": 13815,
    "mobileDonors": 29990,
    "population": 2421768,
    "avgDrive": 6.2,
    "topSites": [
      {
        "name": "Salt Lake City UT Blood Donation Center",
        "donors": 6546,
        "rbc": 5203
      },
      {
        "name": "Layton UT Blood Donation Center",
        "donors": 5176,
        "rbc": 4734
      },
      {
        "name": "Lehi UT Blood Donation Center",
        "donors": 5117,
        "rbc": 3878
      }
    ],
    "monthly": {
      "labels": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      "data": [
        1411,
        1255,
        1454,
        1552,
        1416,
        1308,
        1110,
        1113,
        1535,
        1647,
        1536,
        1503
      ]
    },
    "donorMix": [
      {
        "label": "Repeat whole blood",
        "value": 21
      },
      {
        "label": "First-time",
        "value": 25
      },
      {
        "label": "Mobile drive",
        "value": 45
      },
      {
        "label": "Apheresis / Power Red",
        "value": 9
      }
    ],
    "kpi": {
      "goalPct": 99,
      "growth": -2.4,
      "noShow": 11.2,
      "unitsToHospitals": 14522,
      "satisfaction": 83
    },
    "narrative": "Utah Nevada spans 3 fixed donation centers across the Southwest and Rocky Mountain Division, serving a trade-area population of roughly 2,421,768. In CY24 the region welcomed 16,839 donors, with the typical donor traveling about 6.2 miles to give. Mobile drives remain a critical channel, and first-time donor conversion is a key growth lever heading into the next fiscal year."
  }
];

export const REGION_BY_NAME: Record<string, RegionSummary> =
  Object.fromEntries(REGION_SUMMARIES.map((r) => [r.region, r]));
