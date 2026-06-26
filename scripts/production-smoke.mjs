import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];

function check(name, condition) {
  checks.push({ name, pass: Boolean(condition) });
}

const app = read("src/App.jsx");
const pkg = JSON.parse(read("package.json"));
const progress = read("src/components/ui/progress.jsx");
const dialog = read("src/components/ui/dialog.jsx");
const index = read("index.html");
const staticServer = read("scripts/static-server.cjs");
const distIndex = fs.existsSync(path.join(root, "dist", "index.html"));
const distRobots = fs.existsSync(path.join(root, "dist", "robots.txt"));

check("dist build exists", distIndex);
check("mobile tab shell exists", app.includes("MobileTabBar") && app.includes("data-mobile-pane"));
check("timer action bar sits above mobile tabs", app.includes("bottom-[76px]"));
check("duplicate routine action exists", app.includes("function duplicateRoutine") && app.includes("Routine duplicated."));
check("duplicate step action exists", app.includes("Duplicate") && app.includes("flatMap"));
check("zero-duration validation uses raw duration", app.includes("rawDurationSeconds(item) > 0"));
check("reset confirmation exists", app.includes("Reset this timer session?"));
check("storage wrappers exist", app.includes("safeGetItem") && app.includes("safeSetItem") && app.includes("safeRemoveItem"));
check("storage recovery banner exists", app.includes("Local storage is unavailable"));
check("timer normalization exists", app.includes("normalizeTimerByRoutineElapsed"));
check("progressbar aria exists", progress.includes('role="progressbar"') && progress.includes("aria-valuenow"));
check("progressbar accessible name fallback exists", progress.includes('aria-label={ariaLabel}'));
check("dialog labels exist", dialog.includes("aria-labelledby") && dialog.includes("aria-describedby"));
check("seo meta description exists", index.includes('name="description"'));
check("robots.txt ships in dist", distRobots);
check("static server caches hashed assets", staticServer.includes("max-age=31536000") && staticServer.includes("immutable"));
check("static server avoids asset fallback", staticServer.includes("isNavigationFallback") && staticServer.includes("res.writeHead(404"));
check("serve dist script exists", pkg.scripts?.["serve:dist"]);

const failed = checks.filter((item) => !item.pass);
for (const item of checks) {
  console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}`);
}

if (failed.length) {
  console.error(`\n${failed.length} smoke checks failed.`);
  process.exit(1);
}

console.log(`\n${checks.length} smoke checks passed.`);
