import { NextRequest, NextResponse } from 'next/server';
import { validateInviteCode } from '@/lib/organizations';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { isValid: false, error: 'Invite code is required' },
        { status: 400 }
      );
    }

    if (code.length !== 64) {
      return NextResponse.json(
        { isValid: false, error: 'Invalid invite code format' },
        { status: 400 }
      );
    }

    const result = await validateInviteCode(code);

    return NextResponse.json({
      isValid: result.isValid,
      organizationId: result.organizationId,
      organizationName: result.organizationName,
      role: result.role,
      error: result.error
    });
  } catch (error: any) {
    console.error('Error validating invite code:', error);
    return NextResponse.json(
      { isValid: false, error: 'Failed to validate invite code' },
      { status: 500 }
    );
  }
}

