import { query } from "@/lib/query-client";
import { NextRequest } from "next/server";

const handler = query.handler;

export const POST = async (req: NextRequest) => handler(req);
export const PATCH = async (req: NextRequest) => handler(req);
export const DELETE = async (req: NextRequest) => handler(req);
export const GET = handler;