import { NextResponse } from "next/server";
import { redisPing } from "@/utils/redis";

export async function GET() {
  try {
    const pong = await redisPing();
    return NextResponse.json({ ok: true, pong });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Unknown error" }, { status: 500 });
  }
}


