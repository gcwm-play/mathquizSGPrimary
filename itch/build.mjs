// npm run build:itch → itch/lion-city-mayor-itch.zip (upload as an HTML game)
import { build } from "vite";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
await build({ configFile: here("./vite.config.js"), logLevel: "warn" });

const css = readFileSync(here("./build/game.css"), "utf8");
const js = readFileSync(here("./build/game.js"), "utf8").replaceAll("</script", "<\\/script");
// reuse the page head (meta tags, title, icon, fonts) without the dev entry script
const page = readFileSync(here("../mayor.html"), "utf8");
const head = page
  .slice(page.indexOf("<head>") + 6, page.indexOf("</head>"))
  .split("\n")
  .filter((l) => !l.includes('type="module"') && !l.includes("/src/"))
  .join("\n");

rmSync(here("./out"), { recursive: true, force: true });
mkdirSync(here("./out"));
writeFileSync(
  here("./out/index.html"),
  `<!doctype html>\n<html lang="en">\n<head>${head}\n<style>\n${css}\n</style>\n</head>\n<body>\n<div id="root"></div>\n<script>\n${js}\n</script>\n</body>\n</html>\n`,
);
rmSync(here("./lion-city-mayor-itch.zip"), { force: true });
execFileSync("zip", ["-j", "-q", here("./lion-city-mayor-itch.zip"), here("./out/index.html")]);
console.log("itch/lion-city-mayor-itch.zip ready");
