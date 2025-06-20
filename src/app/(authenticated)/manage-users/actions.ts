
'use server';

import * as admin from 'firebase-admin';
import { z } from 'zod';
import type { UserMetadata } from '@/types';

// Function to initialize Firebase Admin SDK if not already initialized
function ensureFirebaseAdminInitialized() {
  if (admin.apps.length === 0) {
    console.log("ensureFirebaseAdminInitialized: No Firebase Admin app detected. Attempting to initialize.");
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

    if (!projectId || !clientEmail || !privateKey || !databaseURL) {
      console.error("ensureFirebaseAdminInitialized: CRITICAL - Missing one or more environment variables for Firebase Admin SDK initialization.");
      console.error(`Env Var Status - FIREBASE_PROJECT_ID: ${!!projectId}, FIREBASE_CLIENT_EMAIL: ${!!clientEmail}, FIREBASE_PRIVATE_KEY: ${!!privateKey}, NEXT_PUBLIC_FIREBASE_DATABASE_URL: ${!!databaseURL}`);
      throw new Error("Server configuration error: Missing Firebase Admin credentials. Please check server logs and environment variable setup.");
    }

    try {
      console.log("ensureFirebaseAdminInitialized: Initializing with provided credentials...");
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
        databaseURL,
      });
      console.log("ensureFirebaseAdminInitialized: Firebase Admin SDK initialized successfully in this context.");
    } catch (error: any) {
      console.error('ensureFirebaseAdminInitialized: Firebase Admin SDK initialization FAILED.', error.message, error.stack);
      // Re-throw the error to be caught by the action's main try-catch
      throw new Error(`Firebase Admin SDK failed to initialize: ${error.message}`);
    }
  } else {
    console.log("ensureFirebaseAdminInitialized: Firebase Admin SDK already initialized. Apps count:", admin.apps.length);
  }
}


const CreateManagerSchema = z.object({
  email: z.string().email({ message: "Valid email is required." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  displayName: z.string().min(2, { message: "Full name must be at least 2 characters." }).max(100),
  mobileNumber: z.string().optional().or(z.literal('')).refine(val => !val || /^\d{10}$/.test(val), {
    message: "Mobile number must be 10 digits if provided.",
  }),
  role: z.literal("manager"), 
  assignedLibraries: z.record(z.string()).optional(),
});

export type CreateManagerFormValues = z.infer<typeof CreateManagerSchema>;

export async function createManagerAction(values: CreateManagerFormValues): Promise<{ success: boolean; message: string; userId?: string }> {
  console.log("createManagerAction: Called with values:", JSON.stringify(values, null, 2));

  try {
    // Ensure Firebase Admin is initialized before any Firebase Admin operations
    ensureFirebaseAdminInitialized();
  } catch (initError: any) {
    // This catch block will now receive more specific errors from ensureFirebaseAdminInitialized
    console.error("createManagerAction: Firebase Admin initialization process failed.", initError.message);
    return { success: false, message: initError.message }; 
  }

  const validation = CreateManagerSchema.safeParse(values);
  if (!validation.success) {
    const errorMessage = validation.error.errors.map(e => e.message).join(', ');
    console.error("createManagerAction: Validation failed:", errorMessage);
    return { success: false, message: errorMessage };
  }

  const { email, password, displayName, mobileNumber, assignedLibraries, role } = validation.data;

  try {
    // At this point, admin SDK should be initialized.
    console.log(`createManagerAction: Attempting to create user in Firebase Auth for email: ${email}`);
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      disabled: false, 
    });
    const uid = userRecord.uid;
    console.log(`createManagerAction: User created successfully in Firebase Auth. UID: ${uid}`);
    
    const userMetadata: UserMetadata = {
      id: uid,
      email,
      displayName,
      mobileNumber: mobileNumber || undefined,
      role,
      assignedLibraries: assignedLibraries || {},
    };
    console.log(`createManagerAction: Attempting to set user metadata in RTDB for UID ${uid}:`, JSON.stringify(userMetadata, null, 2));

    await admin.database().ref(`users_metadata/${uid}`).set(userMetadata);
    console.log(`createManagerAction: User metadata set successfully in RTDB for UID ${uid}.`);

    return { success: true, message: `Manager ${displayName} created successfully.`, userId: uid };

  } catch (error: any) {
    // This will catch errors from admin.auth().createUser() or admin.database().ref().set()
    console.error("createManagerAction: Error during Firebase operation:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    let errorMessage = "Failed to create manager.";
    if (error.code === 'auth/email-already-exists') {
      errorMessage = "This email address is already in use by another account.";
    } else if (error.code === 'auth/invalid-password') {
      errorMessage = "The password must be a string with at least six characters.";
    } else if (error.code === 'auth/sdk-create-user-failed-credential-already-in-use') { // More specific error
      errorMessage = "This email address is already in use by another account.";
    } else if (error.code) { 
        errorMessage = `Firebase error (${error.code}): ${error.message}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return { success: false, message: errorMessage };
  }
}
