import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const key = (env.match(/OPENAI_API_KEY=(.+)/) || [])[1]?.trim();
if (!key) {
  console.error("No OPENAI_API_KEY in .env.local");
  process.exit(1);
}

const STYLE =
  "Editorial, cinematic, photographic, dark moody background, American Red Cross humanitarian tone, " +
  "deep blacks with surgical red accents, high quality, no text, no words, no logos, no watermark.";

const jobs = [
  {
    id: "blood-101",
    prompt:
      "A close, cinematic image of a blood donation bag and tubing with warm light, conveying that blood cannot be manufactured. " +
      STYLE,
  },
  {
    id: "biomed-collections",
    prompt:
      "A community blood drive: a mobile donation setup with welcoming volunteers in daylight, hopeful and human. " +
      STYLE,
  },
  {
    id: "blood-journey",
    prompt:
      "Macro view of blood component vials and a cold-chain cooler moving through a processing lab, steel and red tones, sense of urgent careful logistics. " +
      STYLE,
  },
  {
    id: "hospital-distribution",
    prompt:
      "A hospital corridor with a blood cooler being delivered to a care team, motion and purpose, life-saving stakes. " +
      STYLE,
  },
  {
    id: "future-demand",
    prompt:
      "An abstract data visualization of a demographic hourglass and a fragile blood-supply network of glowing red lines on black, futuristic and ominous. " +
      STYLE,
  },
];

fs.mkdirSync(new URL("../public/ai", import.meta.url), { recursive: true });

for (const job of jobs) {
  process.stdout.write(`generating ${job.id} ... `);
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-image-1", prompt: job.prompt, size: "1536x1024", n: 1 }),
    });
    const data = await res.json();
    if (data.error) {
      console.log("ERROR:", data.error.message);
      continue;
    }
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      console.log("no image returned");
      continue;
    }
    fs.writeFileSync(new URL(`../public/ai/${job.id}.png`, import.meta.url), Buffer.from(b64, "base64"));
    console.log("ok");
  } catch (e) {
    console.log("FAILED:", e.message);
  }
}
