import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { name, email } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists." }, { status: 409 });
    }
    // Store user in the database
    const user = await prisma.user.create({
      data: { name, email },
    } 
  );

    return NextResponse.json({ message: "User stored successfully.", user }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/users:", error);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}