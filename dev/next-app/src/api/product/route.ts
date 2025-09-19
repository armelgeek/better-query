import { NextRequest, NextResponse } from "next/server";
import { productSchema, Product } from "@/models/product";
import { DBAdapter } from "@/db/adapter";
import { randomUUID } from "crypto";

const db = new DBAdapter<Product>("product");

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = productSchema.parse({ ...body, id: randomUUID() });
  const created = await db.create(parsed);
  return NextResponse.json(created);
}

export async function GET() {
  const products = await db.findMany();
  return NextResponse.json(products);
}
