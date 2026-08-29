import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { systemPrisma } from "@/lib/prisma";
import { getWidgetData, type WidgetData } from "@/lib/widget-data";
import {
  parseWidgetConfig, parseSize, WIDGET_SIZES, WIDGET_PALETTE,
  type WidgetBlock, type WidgetConfig,
} from "@/lib/widget-config";

/**
 * The home-screen widget, drawn in the app's own hand.
 *
 * Neither platform lets a web app place a widget, but both have hosts that
 * will show an image from a URL — Scriptable on iOS, any image-widget app on
 * Android. So this renders the Reading Room look to a PNG and serves it at a
 * URL those hosts can poll.
 *
 * Public, authenticated by the token in the path, exactly like the .ics feed:
 * the hosts fetch it with no session and cannot send headers.
 */
export const runtime = "nodejs"; // reads font files from disk
export const dynamic = "force-dynamic";

// Loaded once per instance; Satori needs the bytes, not a CSS family name.
const fontDir = join(process.cwd(), "src/lib/fonts");
let fonts: { display: Buffer; ui: Buffer } | null = null;
function loadFonts() {
  if (!fonts) {
    fonts = {
      display: readFileSync(join(fontDir, "CormorantGaramond-SemiBold.ttf")),
      ui: readFileSync(join(fontDir, "Karla-Regular.ttf")),
    };
  }
  return fonts;
}

const DISPLAY = "Cormorant Garamond";
const UI = "Karla";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token: raw } = await params;
  const token = raw.replace(/\.png$/i, "");

  const feed = await systemPrisma.feedToken.findUnique({ where: { token } });
  if (!feed) return new NextResponse("Not found", { status: 404 });

  const url = new URL(request.url);
  const size = parseSize(url.searchParams.get("size"));
  const config = parseWidgetConfig(feed.widgetConfig);
  // The host knows the phone's appearance; the config's "auto" defers to it.
  const asked = url.searchParams.get("theme");
  const dark =
    config.theme === "dark" ||
    (config.theme === "auto" && asked === "dark");

  const data = await getWidgetData(feed.coupleId, feed.userId, config.rows);
  const { width, height } = WIDGET_SIZES[size];
  const c = dark ? WIDGET_PALETTE.dark : WIDGET_PALETTE.light;
  const { display, ui } = loadFonts();

  systemPrisma.feedToken
    .update({ where: { id: feed.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return new ImageResponse(
    render({ data, config, c, size, compact: size === "small" }),
    {
      width,
      height,
      fonts: [
        { name: DISPLAY, data: display, style: "normal", weight: 600 },
        { name: UI, data: ui, style: "normal", weight: 400 },
      ],
      headers: {
        // The URL is a credential, and the content changes through the day.
        "Cache-Control": "private, max-age=0, no-store",
      },
    },
  );
}

type Palette = typeof WIDGET_PALETTE.light | typeof WIDGET_PALETTE.dark;

function render({
  data, config, c, compact,
}: {
  data: WidgetData;
  config: WidgetConfig;
  c: Palette;
  size: string;
  compact: boolean;
}) {
  const s = compact ? 0.72 : 1; // small widgets get less of everything
  // A small widget is 480px wide with padding, so a fixed time column plus a
  // full title runs off the edge. Compact stacks tighter and cuts sooner.
  const timeCol = compact ? 62 : 96;
  const cut = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
  const titleMax = compact ? 17 : 34;
  const label = (text: string) => (
    <div
      style={{
        display: "flex", fontFamily: UI, fontSize: 15 * s, letterSpacing: 2.4 * s,
        textTransform: "uppercase", color: c.faint,
      }}
    >
      {text}
    </div>
  );

  const blocks: Record<WidgetBlock, () => React.ReactElement | null> = {
    date: () => (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 * s }}>
        <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 44 * s, color: c.ink }}>
          {compact ? data.dateLine.replace(/^(\w{3})\w*/, "$1") : data.dateLine}
        </div>
        {data.hijri ? (
          <div style={{ display: "flex", fontFamily: UI, fontSize: 20 * s, color: c.faint }}>
            {data.hijri}
          </div>
        ) : null}
      </div>
    ),

    volume: () => (
      <div style={{ display: "flex", fontFamily: UI, fontSize: 17 * s, letterSpacing: 2 * s, color: c.muted }}>
        {`VOL. ${data.volume} · PAGE ${data.page}`}
      </div>
    ),

    today: () =>
      data.today.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 * s }}>
          {label("Today")}
          <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 30 * s, color: c.faint, fontStyle: "italic" }}>
            the page is blank
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 * s }}>
          {label("Today")}
          {data.today.map((e, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 14 * s }}>
              <div
                style={{
                  display: "flex", fontFamily: UI, fontSize: 19 * s, color: c.gold,
                  width: timeCol * s, flexShrink: 0,
                }}
              >
                {e.time}
              </div>
              <div
                style={{
                  display: "flex", fontFamily: DISPLAY, fontSize: 32 * s,
                  color: e.tentative ? c.faint : c.ink,
                }}
              >
                {cut(e.title, titleMax)}
              </div>
            </div>
          ))}
        </div>
      ),

    upcoming: () =>
      data.upcoming.length === 0 ? null : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 * s }}>
          {label("Coming up")}
          {data.upcoming.map((e, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 14 * s }}>
              <div
                style={{
                  display: "flex", fontFamily: UI, fontSize: 18 * s, color: c.muted,
                  width: timeCol * s, flexShrink: 0,
                }}
              >
                {e.when}
              </div>
              <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 28 * s, color: c.ink }}>
                {cut(e.title, titleMax)}
              </div>
            </div>
          ))}
        </div>
      ),

    special: () =>
      !data.special ? null : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 * s }}>
          {label("Next occasion")}
          <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 30 * s, color: c.ink }}>
            {cut(data.special.title, compact ? 20 : 40)}
          </div>
          <div style={{ display: "flex", fontFamily: UI, fontSize: 18 * s, color: c.terracotta }}>
            {data.special.daysLeft === 0
              ? "today"
              : data.special.daysLeft === 1
                ? "tomorrow"
                : `in ${data.special.daysLeft} days`}
          </div>
        </div>
      ),

    streak: () => (
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 * s }}>
        <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 40 * s, color: c.ink }}>
          {String(data.streak)}
        </div>
        <div style={{ display: "flex", fontFamily: UI, fontSize: 17 * s, letterSpacing: 2 * s, color: c.faint }}>
          {data.streak === 1 ? "WEEK KEPT" : "WEEKS KEPT"}
        </div>
      </div>
    ),
  };

  const chosen = config.blocks.map((id) => blocks[id]()).filter(Boolean);

  return (
    <div
      style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        background: c.paper, padding: 36 * s, gap: 22 * s,
        // Satori has no default font resolution, so it is set once here.
        fontFamily: UI,
      }}
    >
      {chosen.map((el, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column" }}>
          {el}
        </div>
      ))}

      {/* The gold shelf edge, so the widget is recognisably this app. */}
      <div style={{ display: "flex", flex: 1 }} />
      <div style={{ display: "flex", height: 6 * s, background: c.gold, width: "100%" }} />
    </div>
  );
}
