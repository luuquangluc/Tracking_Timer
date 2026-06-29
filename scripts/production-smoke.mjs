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
const button = read("src/components/ui/button.jsx");
const card = read("src/components/ui/card.jsx");
const styles = read("src/index.css");
const index = read("index.html");
const staticServer = read("scripts/static-server.cjs");
const designSystem = fs.existsSync(path.join(root, "docs", "design-system.md")) ? read("docs/design-system.md") : "";
const uxSpec = fs.existsSync(path.join(root, "docs", "ux-spec.md")) ? read("docs/ux-spec.md") : "";
const distIndex = fs.existsSync(path.join(root, "dist", "index.html"));
const distRobots = fs.existsSync(path.join(root, "dist", "robots.txt"));

check("dist build exists", distIndex);
check("mobile tab shell exists", app.includes("MobileTabBar") && app.includes("data-mobile-pane"));
check("focus cockpit shell exists", app.includes("function AppShell") && app.includes("routine-cockpit-shell"));
check("desktop routine rail exists", app.includes("function RoutineRail") && app.includes("Playlists"));
check("desktop insight rail exists", app.includes("function InsightRail") && app.includes("This routine"));
check("selected routine progress copy exists", app.includes("Progress for the selected routine") && app.includes("Awards for this routine"));
check("apple music inspiration exists", app.includes("function NowPlayingArtwork") && app.includes("Now Playing") && styles.includes("--music-red"));
check("routine album art exists", app.includes("routine-album-art") && app.includes("Dolby Focus"));
check("music mini player exists", app.includes("music-mini-player") && app.includes("Up next"));
check("timer action bar sits above mobile tabs", app.includes("bottom-[76px]"));
check("duplicate routine action exists", app.includes("function duplicateRoutine") && app.includes("Routine duplicated."));
check("duplicate step action exists", app.includes("Duplicate") && app.includes("flatMap"));
check("zero-duration validation uses raw duration", app.includes("rawDurationSeconds(item) > 0"));
check("reset confirmation exists", app.includes("Reset this timer session?"));
check("storage wrappers exist", app.includes("safeGetItem") && app.includes("safeSetItem") && app.includes("safeRemoveItem"));
check("storage recovery banner exists", app.includes("Local storage is unavailable"));
check("timer normalization exists", app.includes("normalizeTimerByRoutineElapsed"));
check("step completion chime exists", app.includes("function playTimerChime") && app.includes('playTimerChime("step")'));
check("editor avoids horizontal overflow", app.includes("overflow-x-hidden") && app.includes("minmax(0,1fr)"));
check("design system doc exists", designSystem.includes("# Routine Grove Design System") && designSystem.includes("44px"));
check("bmad ux spec exists", uxSpec.includes("# UX Specification: Routine Grove") && uxSpec.includes("BMAD UX"));
check("design tokens exist", styles.includes("--touch-target") && styles.includes("--safe-area-bottom") && styles.includes(".dark"));
check("core UI uses design tokens", button.includes("min-h-[var(--touch-target)]") && card.includes("bg-surface") && dialog.includes("bg-surface"));
check("ui ux pro max rules documented", designSystem.includes("UI/UX Pro Max Application") && designSystem.includes("prefers-reduced-motion"));
check("timer hero has session focus panel", app.includes("Session focus") && app.includes("Create routine"));
check("desktop nav includes awards", app.includes('<a href="#awards">Awards</a>'));
check("routine gallery uses semantic surfaces", !app.includes('bg-[#272729]') && !app.includes('bg-[#2a2a2c]'));
check("touch and reduced motion guards exist", styles.includes("touch-action: manipulation") && styles.includes("prefers-reduced-motion"));
check("timer and toast accessibility exists", app.includes("timer-figure") && app.includes('aria-live="polite"') && app.includes('aria-atomic="true"'));
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
