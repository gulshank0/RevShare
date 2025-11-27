import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
    });

    return NextResponse.json({ message: "User stored successfully.", user }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/users:", error);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, image } = await request.json();

    // Update user in the database
    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(image && { image }),
      },
    });

    return NextResponse.json({ message: "Profile updated successfully.", user }, { status: 200 });
  } catch (error) {
    console.error("Error in PATCH /api/users:", error);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}