import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvFilePath = path.join(__dirname, "theo.csv");
const jsonFilePath = path.join(__dirname, "..", "public", "theo.json");

try {
  const csvContent = fs.readFileSync(csvFilePath, "utf-8");

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const urlData = {};

  for (const record of records) {
    const url = record.url;
    if (!url) continue;

    if (!urlData[url]) {
      urlData[url] = {
        title: record.title || "",
        visits: 0,
        bookmarked: false,
        lastVisitTime: null,
      };
    }

    urlData[url].visits++;

    if (record.title) {
      urlData[url].title = record.title;
    }

    if (record.visit_description === "From Bookmark") {
      urlData[url].bookmarked = true;
    }

    const visitTime = record.visit_time;
    if (!urlData[url].lastVisitTime || visitTime > urlData[url].lastVisitTime) {
      urlData[url].lastVisitTime = visitTime;
    }
  }

  fs.writeFileSync(jsonFilePath, JSON.stringify(urlData, null, 2));

  const uniqueUrls = Object.keys(urlData).length;
  const totalVisits = Object.values(urlData).reduce(
    (sum, data) => sum + data.visits,
    0,
  );

  console.log(
    `Successfully converted ${totalVisits} visits across ${uniqueUrls} unique URLs`,
  );
  console.log(`Output saved to: ${jsonFilePath}`);
} catch (error) {
  console.error("Error converting CSV to JSON:", error.message);
  process.exit(1);
}
