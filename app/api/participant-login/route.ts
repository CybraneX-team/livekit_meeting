import { NextRequest, NextResponse } from 'next/server';

// Dummy participant data - in production, this would come from a database
const dummyParticipants = [
  {
    id: 'participant-001',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    role: 'participant',
    permissions: ['join', 'speak', 'video']
  },
  {
    id: 'participant-002',
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'password456',
    role: 'participant',
    permissions: ['join', 'speak', 'video']
  },
  {
    id: 'participant-003',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    password: 'password789',
    role: 'participant',
    permissions: ['join', 'speak']
  }
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find participant
    const participant = dummyParticipants.find(
      p => p.email === email && p.password === password
    );

    if (!participant) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate a simple token (in production, use JWT)
    const token = `participant_${participant.id}_${Date.now()}`;

    // Return success response
    return NextResponse.json({
      success: true,
      participant: {
        id: participant.id,
        name: participant.name,
        email: participant.email,
        role: participant.role,
        permissions: participant.permissions
      },
      token,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Participant login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Participant login endpoint' },
    { status: 200 }
  );
} 