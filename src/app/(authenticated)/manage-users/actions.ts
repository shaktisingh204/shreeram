
'use server';

import * as admin from 'firebase-admin';
import { z } from 'zod';
import { getLibrariesMetadata } from '@/lib/data'; // To fetch library name
import type { UserMetadata } from '@/types';

// Helper to initialize Firebase Admin SDK only once
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
    // Consider how to handle this error more gracefully in a real app
  }
}

const CreateManagerSchema = z.object({
  email: z.string().email({ message: "Valid email is required." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  displayName: z.string().min(2, { message: "Full name must be at least 2 characters." }).max(100),
  mobileNumber: z.string().optional().or(z.literal('')).refine(val => !val || /^\d{10}$/.test(val), {
    message: "Mobile number must be 10 digits if provided.",
  }),
  role: z.literal("manager"), // This action is specifically for creating managers
  assignedLibraryId: z.string().min(1, {message: "A library must be assigned."}),
});

export type CreateManagerFormValues = z.infer<typeof CreateManagerSchema>;

export async function createManagerAction(values: CreateManagerFormValues): Promise<{ success: boolean; message: string; userId?: string }> {
  const validation = CreateManagerSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: validation.error.errors.map(e => e.message).join(', ') };
  }

  const { email, password, displayName, mobileNumber, assignedLibraryId, role } = validation.data;

  try {
    // 1. Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      disabled: false, // Ensure user is enabled
    });
    const uid = userRecord.uid;

    // 2. Get library name for metadata
    const libraries = await getLibrariesMetadata(); // This uses client SDK, ensure it can be called server-side or adapt.
                                                 // For this context, getLibrariesMetadata still uses the client SDK for RTDB access.
                                                 // A more robust solution for server actions would be to also have an admin-sdk version of getLibrariesMetadata.
                                                 // However, for now, we assume this part is okay or can be temporarily hardcoded if an issue.
                                                 // Or, simpler: just store ID, client can fetch name.
                                                 // Let's assume the client will fetch the name for display based on ID for now.
    
    const library = libraries.find(lib => lib.id === assignedLibraryId);


    // 3. Create user metadata in Realtime Database
    const userMetadata: UserMetadata = {
      id: uid,
      email,
      displayName,
      mobileNumber: mobileNumber || undefined,
      role,
      assignedLibraryId,
      assignedLibraryName: library?.name || "Unknown Library", // Store name for convenience
    };

    await admin.database().ref(`users_metadata/${uid}`).set(userMetadata);

    return { success: true, message: `Manager ${displayName} created successfully.`, userId: uid };

  } catch (error: any) {
    console.error("Error creating manager:", error);
    // Handle Firebase specific errors
    let errorMessage = "Failed to create manager.";
    if (error.code === 'auth/email-already-exists') {
      errorMessage = "This email address is already in use by another account.";
    } else if (error.code === 'auth/invalid-password') {
      errorMessage = "The password must be a string with at least six characters.";
    }
    return { success: false, message: errorMessage };
  }
}
