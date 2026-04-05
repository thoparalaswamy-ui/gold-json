// ===============================
// ✅ IMPORT
// ===============================
const fs = require("fs");

// ===============================
// ✅ CONFIG (ALL YOUR CITIES)
// ===============================
const cities = [
  "visakhapatnam","vijayawada","tirupati","guntur","kurnool",
  "hyderabad","warangal","nizamabad","karimnagar",
  "chennai","coimbatore","madurai","trichy","salem",
  "bangalore","mysore","mangalore","hubli",
  "kochi","trivandrum","kozhikode","thrissur",
  "new delhi","lucknow","kanpur","varanasi","noida","ghaziabad",
  "amritsar","ludhiana","jalandhar","gurgaon","faridabad",
  "shimla","dehradun",
  "mumbai","pune","nagpur","nashik",
  "ahmedabad","surat","vadodara","rajkot",
  "jaipur","udaipur","jodhpur",
  "kolkata","patna","ranchi","bhubaneswar",
  "guwahati","shillong"
];

// ===============================
// ✅ BASE PRICE (UPDATE SOURCE)
// ===============================
function getBasePrice() {
  return {
    gold24: 152922.276,
    gold22: 140176.22,
    silver: 248740.6
  };
}

// ===============================
// ✅ FORMAT DATE
// ===============================
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

// ===============================
// ✅ LAST 7 DAYS DATES
// ===============================
function getLast7Days() {
  const dates = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(formatDate(d));
  }

  return dates;
}

// ===============================
// ✅ LOAD OLD DATA (IMPORTANT)
// ===============================
let oldData = {};

try {
  oldData = JSON.parse(fs.readFileSync("gold-data.json"));
} catch {
  oldData = {};
}

// ===============================
// ✅ BUILD LAST 7 DAYS CORRECTLY
// ===============================
function buildLast7Days(city, basePrice) {
  const dates = getLast7Days();
  const oldCity = oldData.data?.[city]?.last7Days || [];

  return dates.map((date) => {
    const existing = oldCity.find(d => d.date === date);

    // ✅ keep old historical data
    if (existing) {
      return existing;
    }

    // ✅ only today's new value
    if (date === formatDate(new Date())) {
      return {
        date,
        city,
        gold24: basePrice.gold24,
        gold22: basePrice.gold22,
        silver: basePrice.silver
      };
    }

    // fallback (rare case)
    return {
      date,
      city,
      gold24: basePrice.gold24,
      gold22: basePrice.gold22,
      silver: basePrice.silver
    };
  });
}

// ===============================
// ✅ GENERATE FINAL DATA
// ===============================
function generateData() {
  const result = {
    updatedAt: new Date().toISOString(),
    data: {}
  };

  const basePrice = getBasePrice();

  cities.forEach((city) => {
    const last7Days = buildLast7Days(city, basePrice);

    result.data[city] = {
      today: last7Days[last7Days.length - 1],
      last7Days
    };
  });

  return result;
}

// ===============================
// ✅ WRITE FILE
// ===============================
const finalData = generateData();

fs.writeFileSync("gold-data.json", JSON.stringify(finalData, null, 2));

console.log("✅ Gold data updated correctly (history preserved)!");