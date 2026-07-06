import { ImageResponse } from "next/og";
import { LAUNCH_AREA } from "@/lib/constants";

export const runtime = "edge";
export const alt =
  "VettedPages — help us build the local list of pros your neighbors actually trust.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const brand = "#4a8474";
const ink = "#f1ede4";
const inkDim = "#b6c3bd";

function Shield() {
  return (
    <svg width="72" height="72" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill="rgba(74,132,116,0.18)" />
      <path
        d="M16 5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V8l8-3z"
        fill="none"
        stroke={brand}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 15.5l2.8 2.8L20 13"
        fill="none"
        stroke={brand}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Check() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24">
      <path
        d="M5 12l5 5L20 7"
        fill="none"
        stroke={brand}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: "#0a1411",
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(74,132,116,0.35), transparent 70%), radial-gradient(ellipse 60% 50% at 90% 110%, rgba(108,138,156,0.25), transparent 70%)",
          color: ink,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Shield />
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
            <span>Vetted</span>
            <span style={{ color: brand }}>Pages</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              alignItems: "center",
              padding: "10px 22px",
              borderRadius: 999,
              border: "1px solid rgba(165,195,180,0.3)",
              backgroundColor: "rgba(20,36,32,0.9)",
              color: inkDim,
              fontSize: 26,
            }}
          >
            Now building: {LAUNCH_AREA}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: -2,
              maxWidth: 980,
            }}
          >
            The local list of pros your neighbors actually trust.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: inkDim,
            fontSize: 28,
          }}
        >
          <Check />
          <span style={{ marginRight: 22 }}>Every business screened</span>
          <Check />
          <span style={{ marginRight: 22 }}>Every review verified</span>
          <Check />
          <span>Built for your area</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
