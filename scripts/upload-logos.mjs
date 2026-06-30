import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const SUPABASE_URL = "https://rmrcfardaoeoykxtxfzs.supabase.co";
const SERVICE_KEY = "sb_secret_vW8QGIa6j43c4rxWB5WRGQ_UTGgmrJf";
const BUCKET = "team-logos";
const LOGOS_DIR = "/Users/saransparkee/Downloads/Battlegrounds Mobile India Pro Series 2026 - Liquipedia PUBG Mobile Wiki";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Map filename keywords → exact team name in DB
const FILE_TO_TEAM = {
  "K9_Esports":           "K9 Esports",
  "Team_Versatile":       "Team Versatile",
  "Learn_From_Past":      "Learn From Past",
  "EvoX_Esports_allmode": "EvoX Esports",
  "NONX_Esports":         "NoNx Esports",
  "Sinewy_Esports":       "Sinewy Esports",
  "Phoenix_Esports":      "Phoenix Esports",
  "Troy_Tamilans":        "Troy Tamilans Esports",
  "4Wolf_x_DoD":          "4Wolf x DoD",
  "Madkings_Esports":     "Madkings Esports",
  "GodLike":              "GodLike Esports",
  "Divine_Gaming":        "Divine Gaming",
  "Victores_Sumus":       "Victores Sumus",
  "Gods_Reign":           "Gods Reign",
  "Orangutan":            "Orangutan",
  "Team_Tamilas":         "Team Tamilas",
  "Vasista_Esports":      "Vasista Esports",
  "Reckoning_Esports":    "Reckoning Esports",
  "Nebula_Esports":       "Nebula Esports",
  "8bit":                 "8Bit",
  "Genesis_Esports":      "Genesis Esports",
  "Team_Soul":            "Team SouL",
  "Revenant_XSpark":      "Revenant XSpark",
  "MYTH_Esports":         "Myth Official",
  "Autobotz_Esports":     "Autobotz Esports",
  "Rapid_Chaos":          "Rapid Chaos",
  "Zero_Ark":             "Zero Ark",
  "Wingod_Esports":       "WindGod Esports",
  "Lastade_Esports":      "Lastade Esports",
  "4TR_Official":         "4TR Official",
  "Higgboson_Esports":    "Higgboson Esports",
  "Meta_Ninza":           "Meta Ninza",
  "True_Rippers":         "True Rippers",
  "Welt_Esports":         "Welt Esports",
  "Wyld_Fangs":           "Wyld Fangs",
  "Team_Aryan":           "Team Aryan",
  "MYSTERIOUS_4":         "MYSTERIOUS 4",
  "Rising_Esports":       "Rising Esports",
  "White_Walkers":        "White Walkers",
  "Team_Apex_Gaming":     "Apex Gaming",
};

function matchTeam(filename) {
  for (const [key, team] of Object.entries(FILE_TO_TEAM)) {
    if (filename.includes(key)) return team;
  }
  return null;
}

async function main() {
  // Create bucket if it doesn't exist
  const { error: bucketError } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (bucketError && !bucketError.message.includes("already exists")) {
    console.error("Bucket error:", bucketError.message);
    process.exit(1);
  }
  console.log(`✓ Bucket "${BUCKET}" ready`);

  const files = readdirSync(LOGOS_DIR).filter(f => f.endsWith(".jpeg") || f.endsWith(".png"));
  const seen = new Set(); // avoid uploading duplicate teams

  for (const file of files) {
    const teamName = matchTeam(file);
    if (!teamName || seen.has(teamName)) continue;
    seen.add(teamName);

    const filePath = join(LOGOS_DIR, file);
    const fileData = readFileSync(filePath);
    const storagePath = `${teamName.replace(/[^a-zA-Z0-9]/g, "_")}.jpeg`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileData, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      console.error(`✗ Upload failed for ${teamName}:`, uploadError.message);
      continue;
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    const { error: updateError } = await supabase
      .from("bgmi_teams")
      .update({ logo_url: publicUrl })
      .eq("name", teamName);

    if (updateError) {
      console.error(`✗ DB update failed for ${teamName}:`, updateError.message);
    } else {
      console.log(`✓ ${teamName}`);
    }
  }

  console.log("\nDone!");
}

main();
