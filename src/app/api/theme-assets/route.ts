import { NextRequest, NextResponse } from "next/server";
import { readdirSync, existsSync } from "fs";
import { join } from "path";

const VALID_THEMES = ["luxury","glass","emerald","violet","hotpink","rose","light","blush","azure","goddess","imperial","chrome","walnut","argentum","alchemist","slate","ivory","carbon","alabaster","obsidian","jade","grove","lotus","evolution","abyss","riviera","glacial","peak","tectonic","altitude","future","medieval"];
const VALID_TYPES  = ["backgrounds","sidebar","cards"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const theme = searchParams.get("theme") ?? "";
  const type  = searchParams.get("type")  ?? "backgrounds";

  if (!VALID_THEMES.includes(theme) || !VALID_TYPES.includes(type)) {
    return NextResponse.json([]);
  }

  const dir = join(process.cwd(), "public", "themes", theme, type);
  if (!existsSync(dir)) return NextResponse.json([]);

  const files = readdirSync(dir).filter(f =>
    /\.(jpg|jpeg|png|webp|avif|gif)$/i.test(f)
  );

  return NextResponse.json(
    files.map(f => `/themes/${theme}/${type}/${f}`)
  );
}
