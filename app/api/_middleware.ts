
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const API_KEY = process.env.API_KEY

export function middleware(request: NextRequest) {
  const authorization = request.headers.get("Authorization")

  if (authorization !== `Bearer ${API_KEY}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/api/game/:path*",
}
