import { NextRequest, NextResponse } from "next/server";
import type { PlanId } from "@/types";

const GUMROAD_API = "https://api.gumroad.com/v2/licenses/verify";

/* Map Gumroad product permalink → plan id.
   Add more products here when you create Elite, etc. */
const PERMALINK_TO_PLAN: Record<string, PlanId> = {
  profileproplan: "pro",
};

export async function POST(req: NextRequest) {
  try {
    const { licenseKey } = (await req.json()) as { licenseKey: string };

    if (!licenseKey?.trim()) {
      return NextResponse.json({ error: "License key is required." }, { status: 400 });
    }

    const key = licenseKey.trim().toUpperCase();

    /* Try each known product permalink */
    for (const [permalink, plan] of Object.entries(PERMALINK_TO_PLAN)) {
      const body = new URLSearchParams({
        product_permalink: permalink,
        license_key: key,
        increment_uses_count: "false",
      });

      const res = await fetch(GUMROAD_API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      const data = (await res.json()) as {
        success: boolean;
        purchase?: {
          refunded?: boolean;
          chargebacked?: boolean;
          email?: string;
        };
      };

      if (
        data.success &&
        !data.purchase?.refunded &&
        !data.purchase?.chargebacked
      ) {
        return NextResponse.json({
          plan,
          email: data.purchase?.email ?? "",
          licenseKey: key,
        });
      }
    }

    return NextResponse.json(
      { error: "Invalid license key. Please check and try again." },
      { status: 400 },
    );
  } catch (err) {
    console.error("[gumroad/verify]", err);
    return NextResponse.json({ error: "Verification failed. Try again." }, { status: 500 });
  }
}
