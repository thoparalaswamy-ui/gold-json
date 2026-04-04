// ================= LOAD ENV =================
require("dotenv").config(); // auto loads .env from same folder

// ================= IMPORTS =================
const axios = require("axios");
const { Octokit } = require("@octokit/rest");

// ================= CONFIG =================
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSf-NvJRWrauaNgrorLP_vUv0olLy72EHSuxyfsV54-1gQ5yXpDwg1Z_MCet8DbdpAeGB-2THEp-8JS/pub?gid=1776037993&single=true&output=csv";

const OWNER = "thoparalaswamy-ui";
const REPO = "gold-json";
const FILE_PATH = "gold-data.json";
const BRANCH = "main";

// ================= TOKEN =================
const GITHUB_TOKEN = process.env.GITHUB_TOKEN?.trim();

// ✅ Debug (remove later if you want)
console.log("🔑 TOKEN CHECK:", GITHUB_TOKEN ? "Loaded ✅" : "Missing ❌");

if (!GITHUB_TOKEN) {
  throw new Error("❌ GITHUB_TOKEN not found. Check your .env file");
}

// ================= DATE FORMAT FIX =================
function formatDate(dateStr) {
  try {
    const parts = dateStr.split("/");

    if (parts.length !== 3) throw new Error("Invalid date format");

    let [day, month, year] = parts.map((p) => parseInt(p, 10));

    // Fix swapped formats
    if (month > 12) {
      [day, month] = [month, day];
    }

    const dateObj = new Date(Date.UTC(year, month - 1, day));

    if (isNaN(dateObj.getTime())) {
      throw new Error("Invalid date: " + dateStr);
    }

    return dateObj.toISOString();
  } catch {
    throw new Error("Invalid formatted date: " + dateStr);
  }
}

// ================= CSV PARSER =================
function parseCSV(csv) {
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    let obj = {};

    headers.forEach((h, i) => {
      obj[h] = values[i]?.trim();
    });

    return obj;
  });
}

// ================= BUILD JSON =================
function buildJSON(rows) {
  const cityMap = {};

  rows.forEach((row) => {
    const city = row.city;

    if (!cityMap[city]) {
      cityMap[city] = {};
    }

    // keep latest per date
    cityMap[city][row.date] = row;
  });

  const final = {};

  Object.keys(cityMap).forEach((city) => {
    const uniqueRows = Object.values(cityMap[city]);

    const sorted = uniqueRows.sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    const last7 = sorted.slice(-7);

    final[city] = {
      last7Days: last7,
      today: last7[last7.length - 1],
    };
  });

  return final;
}

// ================= GITHUB UPDATE =================
async function updateGitHub(data) {
  const octokit = new Octokit({
    auth: GITHUB_TOKEN,
  });

  let sha = null;

  try {
    const res = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: FILE_PATH,
      ref: BRANCH,
    });

    sha = res.data.sha;
    console.log("📄 Updating existing file...");
  } catch {
    console.log("📄 Creating new file...");
  }

  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path: FILE_PATH,
    message: "Auto update gold price",
    content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
    branch: BRANCH,
    sha: sha || undefined,
  });
}

// ================= MAIN =================
async function run() {
  try {
    console.log("📥 Fetching CSV...");
    const res = await axios.get(CSV_URL);

    console.log("⚙️ Processing CSV...");
    const parsed = parseCSV(res.data);

    console.log("📊 Sample rows:", parsed.slice(0, 3));

    const rows = parsed.map((row) => ({
      date: formatDate(row.date),
      city: row.city.toLowerCase().trim(),
      gold24: parseFloat(row.gold24),
      gold22: parseFloat(row.gold22),
      silver: parseFloat(row.silver),
    }));

    console.log("📅 First valid date:", rows[0].date);

    const finalJSON = {
      updatedAt: new Date().toISOString(),
      data: buildJSON(rows),
    };

    console.log("🏙 Cities processed:", Object.keys(finalJSON.data));

    console.log("🚀 Updating GitHub...");
    await updateGitHub(finalJSON);

    console.log("✅ GitHub JSON updated successfully!");
  } catch (err) {
    console.error("❌ ERROR:", err.message);
  }
}

// ================= RUN =================
run();