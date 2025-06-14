
import { db } from './firebase';
import { ref, get, set, push, child, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import type { Student, Seat, PaymentType, FeePayment, DashboardSummary, LibraryMetadata, UserMetadata } from '@/types';

// Helper function to convert Firebase snapshot to array
const snapshotToAray = <T>(snapshot: any): T[] => {
  const items: T[] = [];
  snapshot.forEach((childSnapshot: any) => {
    items.push({ id: childSnapshot.key, ...childSnapshot.val() } as T);
  });
  return items;
};

// --- User Metadata Operations ---
export const getUserMetadata = async (userId: string): Promise<UserMetadata | null> => {
  const userMetaRef = ref(db, `users_metadata/${userId}`);
  const snapshot = await get(userMetaRef);
  if (snapshot.exists()) {
    return { id: snapshot.key, ...snapshot.val() } as UserMetadata;
  }
  return null;
};

export const getUsersMetadata = async (): Promise<UserMetadata[]> => {
  const usersMetaRef = ref(db, `users_metadata`);
  const snapshot = await get(usersMetaRef);
  if (snapshot.exists()) {
    return snapshotToAray<UserMetadata>(snapshot);
  }
  return [];
};

export const setUserMetadata = async (userId: string, metadata: Omit<UserMetadata, 'id'>): Promise<UserMetadata> => {
  const userMetaRef = ref(db, `users_metadata/${userId}`);
  const dataToSet: UserMetadata = { id: userId, ...metadata };
  await set(userMetaRef, dataToSet);
  return dataToSet;
};


// --- Library Metadata Operations ---
export const getLibrariesMetadata = async (): Promise<LibraryMetadata[]> => {
  const librariesMetaRef = ref(db, `libraries_metadata`);
  const snapshot = await get(librariesMetaRef);
  if (snapshot.exists()) {
    return snapshotToAray<LibraryMetadata>(snapshot).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return [];
};

export const getLibraryById = async (libraryId: string): Promise<LibraryMetadata | null> => {
  const libRef = ref(db, `libraries_metadata/${libraryId}`);
  const snapshot = await get(libRef);
  if (snapshot.exists()) {
    return { id: snapshot.key, ...snapshot.val() } as LibraryMetadata;
  }
  return null;
};

export const addLibraryMetadata = async (name: string): Promise<LibraryMetadata> => {
  const newLibraryMetaRef = push(ref(db, `libraries_metadata`));
  const newLibraryId = newLibraryMetaRef.key;
  if (!newLibraryId) throw new Error("Failed to generate library ID.");

  const newLibrary: LibraryMetadata = {
    id: newLibraryId,
    name: name,
    createdAt: new Date().toISOString(),
  };
  
  const updates: Record<string, any> = {};
  updates[`libraries_metadata/${newLibraryId}`] = newLibrary;
  updates[`libraries/${newLibraryId}/students`] = {};
  updates[`libraries/${newLibraryId}/seats`] = {};
  updates[`libraries/${newLibraryId}/paymentTypes`] = {};
  updates[`libraries/${newLibraryId}/payments`] = {};
  
  await update(ref(db), updates);
  return newLibrary;
};

export const deleteLibrary = async (libraryIdToDelete: string): Promise<void> => {
  const updates: Record<string, any> = {};

  updates[`libraries_metadata/${libraryIdToDelete}`] = null;
  updates[`libraries/${libraryIdToDelete}`] = null;

  const allUsers = await getUsersMetadata();
  allUsers.forEach(user => {
    if (user.role === 'manager' && user.assignedLibraryId === libraryIdToDelete) {
      updates[`users_metadata/${user.id}/assignedLibraryId`] = null;
      updates[`users_metadata/${user.id}/assignedLibraryName`] = null;
    }
  });

  await update(ref(db), updates);
};


// --- Library-Specific Data Operations ---
const ensureSingleLibraryId = (libraryId: string | null): string => {
  if (!libraryId) {
    console.error("Attempted data operation requiring a single libraryId without one.");
    throw new Error("A specific library context is required for this operation.");
  }
  return libraryId;
};

// Student Operations
export const getStudents = async (libraryId: string | null): Promise<Student[]> => {
  if (libraryId === null) { 
    const allLibsMeta = await getLibrariesMetadata();
    if (allLibsMeta.length === 0) return [];
    let combinedStudents: Student[] = [];
    for (const libMeta of allLibsMeta) {
      const studentsRef = ref(db, `libraries/${libMeta.id}/students`);
      const snapshot = await get(studentsRef);
      if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
          combinedStudents.push({ id: childSnapshot.key, ...childSnapshot.val(), libraryName: libMeta.name } as Student);
        });
      }
    }
    return combinedStudents;
  } else {
    const studentsRef = ref(db, `libraries/${libraryId}/students`);
    const snapshot = await get(studentsRef);
    if (snapshot.exists()) {
      return snapshotToAray<Student>(snapshot);
    }
    return [];
  }
};

export const getStudentById = async (libraryId: string, studentId: string): Promise<Student | undefined> => {
  const currentLibraryId = ensureSingleLibraryId(libraryId);
  const studentRef = ref(db, `libraries/${currentLibraryId}/students/${studentId}`);
  const snapshot = await get(studentRef);
  if (snapshot.exists()) {
    return { id: snapshot.key, ...snapshot.val() } as Student;
  }
  return undefined;
};

interface StudentDataInput {
  fullName: string;
  aadhaarNumber?: string;
  mobileNumber?: string;
  fatherName?: string;
  address?: string;
  notes?: string;
  seatId?: string;
  status: 'enrolled' | 'owing' | 'inactive';
  amountPaidNow: number; 
  feesDue?: number; 
  enrollmentDate: string;
  paymentTypeId?: string;
  photo?: File | string;
  idProof?: File | string;
}

export const addStudent = async (libraryId: string, studentData: StudentDataInput): Promise<Student> => {
  const currentLibraryId = ensureSingleLibraryId(libraryId);
  let finalPhotoUrl: string | undefined = undefined;
  if (typeof studentData.photo === 'string' && studentData.photo) {
    finalPhotoUrl = studentData.photo;
  } else if (studentData.photo instanceof File) {
    finalPhotoUrl = `https://placehold.co/100x100.png?text=${encodeURIComponent(studentData.photo.name.substring(0,10) || 'Photo')}`;
  }

  let finalIdProofUrl: string | undefined = undefined;
  if (typeof studentData.idProof === 'string' && studentData.idProof) {
    finalIdProofUrl = studentData.idProof;
  } else if (studentData.idProof instanceof File) {
    finalIdProofUrl = `https://placehold.co/200x150.png?text=${encodeURIComponent(studentData.idProof.name.substring(0,10) || 'ID')}_ID`;
  }
  
  const { photo, idProof, amountPaidNow } = studentData;
  
  const newStudentRef = push(ref(db, `libraries/${currentLibraryId}/students`));
  const newStudentId = newStudentRef.key;
  if (!newStudentId) throw new Error("Failed to generate student ID.");

  let paymentTypeCharge = 0;
  if (studentData.paymentTypeId && studentData.paymentTypeId !== '__NONE__') {
    const pt = await getPaymentTypeById(currentLibraryId, studentData.paymentTypeId);
    if (pt) paymentTypeCharge = pt.amount;
  }

  const netBalance = paymentTypeCharge - amountPaidNow;
  let finalStatus = studentData.status;
  if (studentData.status !== 'inactive') {
    finalStatus = netBalance > 0 ? 'owing' : 'enrolled';
  }

  const newStudentData: Omit<Student, 'id' | 'feesDue' | 'status'> & { id?: string; feesDue: number; status: Student['status'] } = {
    fullName: studentData.fullName,
    aadhaarNumber: studentData.aadhaarNumber || undefined,
    mobileNumber: studentData.mobileNumber || undefined,
    fatherName: studentData.fatherName || undefined,
    address: studentData.address || undefined,
    notes: studentData.notes || undefined,
    seatId: studentData.seatId === '__NONE__' ? undefined : studentData.seatId,
    enrollmentDate: studentData.enrollmentDate,
    paymentTypeId: studentData.paymentTypeId === '__NONE__' ? undefined : studentData.paymentTypeId,
    photoUrl: finalPhotoUrl,
    idProofUrl: finalIdProofUrl,
    feesDue: netBalance,
    status: finalStatus,
    lastPaymentDate: amountPaidNow > 0 ? new Date().toISOString().split('T')[0] : undefined,
  };
  
  const studentToSave: Student = {
    ...newStudentData,
    id: newStudentId,
  } as Student;

  const updates: Record<string, any> = {};
  updates[`libraries/${currentLibraryId}/students/${newStudentId}`] = studentToSave;

  if (studentToSave.seatId && studentToSave.seatId !== '__NONE__') {
    const seatSnapshot = await get(ref(db, `libraries/${currentLibraryId}/seats/${studentToSave.seatId}`));
    if (seatSnapshot.exists()) {
        const seatVal = seatSnapshot.val();
        if (seatVal.isOccupied) {
            throw new Error(`Seat ${seatVal.seatNumber} (${seatVal.floor}) is already taken.`);
        }
        updates[`libraries/${currentLibraryId}/seats/${studentToSave.seatId}/isOccupied`] = true;
        updates[`libraries/${currentLibraryId}/seats/${studentToSave.seatId}/studentId`] = newStudentId;
        updates[`libraries/${currentLibraryId}/seats/${studentToSave.seatId}/studentName`] = studentToSave.fullName;
    } else {
        studentToSave.seatId = undefined; 
        updates[`libraries/${currentLibraryId}/students/${newStudentId}/seatId`] = null; 
    }
  } else {
     studentToSave.seatId = undefined; 
     updates[`libraries/${currentLibraryId}/students/${newStudentId}/seatId`] = null;
  }

  if (amountPaidNow > 0) {
    const paymentRecord: Omit<FeePayment, 'id' | 'studentName'> = {
      studentId: newStudentId,
      amount: amountPaidNow,
      paymentDate: new Date().toISOString().split('T')[0],
      notes: `Initial payment on enrollment. Plan charge: ${paymentTypeCharge}. Paid: ${amountPaidNow}.`,
    };
    await addPayment(currentLibraryId, paymentRecord, studentToSave.fullName, false);
  }
  
  await update(ref(db), updates); 
  return studentToSave;
};

export const updateStudent = async (libraryId: string, studentId: string, updatesIn: StudentDataInput): Promise<Student | undefined> => {
  const currentLibraryId = ensureSingleLibraryId(libraryId);
  const studentRef = ref(db, `libraries/${currentLibraryId}/students/${studentId}`);
  const studentSnapshot = await get(studentRef);
  if (!studentSnapshot.exists()) return undefined;

  const originalStudentData = { id: studentId, ...studentSnapshot.val() } as Student;
  
  let finalPhotoUrl: string | undefined = originalStudentData.photoUrl;
  if (updatesIn.hasOwnProperty('photo')) {
    if (typeof updatesIn.photo === 'string') finalPhotoUrl = updatesIn.photo || undefined;
    else if (updatesIn.photo instanceof File) finalPhotoUrl = `https://placehold.co/100x100.png?text=${encodeURIComponent(updatesIn.photo.name.substring(0,10) || 'Photo')}`;
    else finalPhotoUrl = undefined;
  }

  let finalIdProofUrl: string | undefined = originalStudentData.idProofUrl;
  if (updatesIn.hasOwnProperty('idProof')) {
    if (typeof updatesIn.idProof === 'string') finalIdProofUrl = updatesIn.idProof || undefined;
    else if (updatesIn.idProof instanceof File) finalIdProofUrl = `https://placehold.co/200x150.png?text=${encodeURIComponent(updatesIn.idProof.name.substring(0,10) || 'ID')}_ID`;
    else finalIdProofUrl = undefined;
  }

  const { photo, idProof, amountPaidNow, feesDue: currentFeesDueFromForm } = updatesIn;
  
  let paymentTypeChargeDelta = 0;
  const newPaymentTypeId = updatesIn.paymentTypeId === '__NONE__' ? undefined : updatesIn.paymentTypeId;

  if (newPaymentTypeId && newPaymentTypeId !== originalStudentData.paymentTypeId) {
    const pt = await getPaymentTypeById(currentLibraryId, newPaymentTypeId);
    if (pt) paymentTypeChargeDelta = pt.amount; 
  } else if (!newPaymentTypeId && originalStudentData.paymentTypeId) {
    // If payment type is removed, we might need to consider if a refund/adjustment is implied
    // For now, this doesn't add a negative charge. It just means no *new* plan charge.
  }


  const currentBalance = currentFeesDueFromForm ?? originalStudentData.feesDue; 
  const netBalance = currentBalance + paymentTypeChargeDelta - amountPaidNow;
  
  let finalStatus = updatesIn.status;
  if (updatesIn.status !== 'inactive') {
    finalStatus = netBalance > 0 ? 'owing' : 'enrolled';
  }

  const updatedStudentData: Student = { 
    ...originalStudentData, 
    fullName: updatesIn.fullName,
    aadhaarNumber: updatesIn.aadhaarNumber === "" ? undefined : (updatesIn.aadhaarNumber ?? originalStudentData.aadhaarNumber),
    mobileNumber: updatesIn.mobileNumber === "" ? undefined : (updatesIn.mobileNumber ?? originalStudentData.mobileNumber),
    fatherName: updatesIn.fatherName === "" ? undefined : (updatesIn.fatherName ?? originalStudentData.fatherName),
    address: updatesIn.address === "" ? undefined : (updatesIn.address ?? originalStudentData.address),
    notes: updatesIn.notes === "" ? undefined : (updatesIn.notes ?? originalStudentData.notes),
    enrollmentDate: updatesIn.enrollmentDate,
    status: finalStatus,
    photoUrl: finalPhotoUrl,
    idProofUrl: finalIdProofUrl,
    feesDue: netBalance,
    lastPaymentDate: amountPaidNow > 0 ? new Date().toISOString().split('T')[0] : originalStudentData.lastPaymentDate,
    paymentTypeId: newPaymentTypeId, // This allows clearing the paymentTypeId
    seatId: updatesIn.seatId === '__NONE__' ? undefined : (updatesIn.seatId ?? originalStudentData.seatId),
  };

  const dbUpdates: Record<string, any> = {};
  dbUpdates[`libraries/${currentLibraryId}/students/${studentId}`] = updatedStudentData;

  const newSeatIdForUpdate = updatedStudentData.seatId;
  const oldSeatId = originalStudentData.seatId;

  if (newSeatIdForUpdate !== oldSeatId) {
    if (oldSeatId) {
      dbUpdates[`libraries/${currentLibraryId}/seats/${oldSeatId}/isOccupied`] = false;
      dbUpdates[`libraries/${currentLibraryId}/seats/${oldSeatId}/studentId`] = null;
      dbUpdates[`libraries/${currentLibraryId}/seats/${oldSeatId}/studentName`] = null;
    }
    if (newSeatIdForUpdate) {
      const newSeatSnapshot = await get(ref(db, `libraries/${currentLibraryId}/seats/${newSeatIdForUpdate}`));
      if (newSeatSnapshot.exists()) {
        const newSeatVal = newSeatSnapshot.val();
        if (newSeatVal.isOccupied && newSeatVal.studentId !== studentId) {
          throw new Error(`Seat ${newSeatVal.seatNumber} (${newSeatVal.floor}) is already taken by ${newSeatVal.studentName}.`);
        }
        dbUpdates[`libraries/${currentLibraryId}/seats/${newSeatIdForUpdate}/isOccupied`] = true;
        dbUpdates[`libraries/${currentLibraryId}/seats/${newSeatIdForUpdate}/studentId`] = studentId;
        dbUpdates[`libraries/${currentLibraryId}/seats/${newSeatIdForUpdate}/studentName`] = updatedStudentData.fullName;
        // updatedStudentData.seatId = newSeatIdForUpdate; // No need to re-assign, already done above
        // dbUpdates[`libraries/${currentLibraryId}/students/${studentId}/seatId`] = newSeatIdForUpdate; // Already part of updatedStudentData
      } else {
         updatedStudentData.seatId = undefined; // Ensure it's undefined if seat doesn't exist
         dbUpdates[`libraries/${currentLibraryId}/students/${studentId}/seatId`] = null; 
      }
    } else {
        updatedStudentData.seatId = undefined; // Ensure it's undefined if no seat
        dbUpdates[`libraries/${currentLibraryId}/students/${studentId}/seatId`] = null; 
    }
  } else if (newSeatIdForUpdate && updatesIn.fullName !== originalStudentData.fullName) { 
    // If seat is the same, but student name changed, update seat's studentName
    dbUpdates[`libraries/${currentLibraryId}/seats/${newSeatIdForUpdate}/studentName`] = updatedStudentData.fullName;
  }
  
  if (amountPaidNow > 0) {
     const paymentRecord: Omit<FeePayment, 'id' | 'studentName'> = {
      studentId: studentId,
      amount: amountPaidNow,
      paymentDate: new Date().toISOString().split('T')[0],
      notes: `Payment during update. Plan charge delta: ${paymentTypeChargeDelta}. Paid: ${amountPaidNow}.`,
    };
    await addPayment(currentLibraryId, paymentRecord, updatedStudentData.fullName, false);
  }
  
  await update(ref(db), dbUpdates);
  return updatedStudentData;
};

// Seat Operations
export const getSeats = async (libraryId: string | null): Promise<Seat[]> => {
  if (libraryId === null) { 
    const allLibsMeta = await getLibrariesMetadata();
    if (allLibsMeta.length === 0) return [];
    let combinedSeats: Seat[] = [];
    for (const libMeta of allLibsMeta) {
      const seatsRef = ref(db, `libraries/${libMeta.id}/seats`);
      const snapshot = await get(seatsRef);
      if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
          combinedSeats.push({ id: childSnapshot.key, ...childSnapshot.val(), libraryName: libMeta.name } as Seat); 
        });
      }
    }
    combinedSeats.sort((a, b) => {
        if ((a.libraryName || '') < (b.libraryName || '')) return -1;
        if ((a.libraryName || '') > (b.libraryName || '')) return 1;
        if (a.floor < b.floor) return -1;
        if (a.floor > b.floor) return 1;
        const aNum = parseInt(a.seatNumber.replace(/[^0-9]/g, ''), 10);
        const bNum = parseInt(b.seatNumber.replace(/[^0-9]/g, ''), 10);
        const aPrefix = a.seatNumber.replace(/[0-9]/g, '');
        const bPrefix = b.seatNumber.replace(/[0-9]/g, '');
        if (aPrefix === bPrefix && !isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return a.seatNumber.localeCompare(b.seatNumber);
    });
    return combinedSeats;
  } else {
    const seatsRef = ref(db, `libraries/${libraryId}/seats`);
    const snapshot = await get(seatsRef);
    if (snapshot.exists()) {
      const seatsArray = snapshotToAray<Seat>(snapshot);
      seatsArray.sort((a, b) => {
          if (a.floor < b.floor) return -1;
          if (a.floor > b.floor) return 1;
          const aNum = parseInt(a.seatNumber.replace(/[^0-9]/g, ''), 10);
          const bNum = parseInt(b.seatNumber.replace(/[^0-9]/g, ''), 10);
          const aPrefix = a.seatNumber.replace(/[0-9]/g, '');
          const bPrefix = b.seatNumber.replace(/[0-9]/g, '');
          if (aPrefix === bPrefix && !isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
          return a.seatNumber.localeCompare(b.seatNumber);
      });
      return seatsArray;
    }
    return [];
  }
};

export const getSeatById = async (libraryId: string, seatId: string): Promise<Seat | undefined> => {
  const currentLibraryId = ensureSingleLibraryId(libraryId);
  const seatRef = ref(db, `libraries/${currentLibraryId}/seats/${seatId}`);
  const snapshot = await get(seatRef);
  if (snapshot.exists()) {
    return { id: snapshot.key, ...snapshot.val() } as Seat;
  }
  return undefined;
};

export const addSeat = async (libraryId: string, seatData: { seatNumber: string; floor: string }): Promise<Seat> => {
  const currentLibraryId = ensureSingleLibraryId(libraryId);
  const seatsQuery = query(ref(db, `libraries/${currentLibraryId}/seats`), orderByChild('floor'), equalTo(seatData.floor));
  const snapshot = await get(seatsQuery);
  if (snapshot.exists()) {
    let seatExists = false;
    snapshot.forEach(childSnap => {
      if (childSnap.val().seatNumber === seatData.seatNumber) {
        seatExists = true;
      }
    });
    if (seatExists) {
      throw new Error(`Seat ${seatData.seatNumber} already exists on ${seatData.floor} in this library.`);
    }
  }

  const newSeatRef = push(ref(db, `libraries/${currentLibraryId}/seats`));
  const newSeatId = newSeatRef.key;
  if (!newSeatId) throw new Error("Failed to generate seat ID.");

  const newSeat: Seat = {
    id: newSeatId,
    seatNumber: seatData.seatNumber,
    floor: seatData.floor,
    isOccupied: false,
  };
  await set(newSeatRef, newSeat);
  return newSeat;
};

export const updateSeatDetails = async (libraryId: string, seatId: string, updates: { seatNumber?: string; floor?: string }): Promise<Seat | undefined> => {
  const currentLibraryId = ensureSingleLibraryId(libraryId);
  const seatRef = ref(db, `libraries/${currentLibraryId}/seats/${seatId}`);
  const seatSnapshot = await get(seatRef);
  if (!seatSnapshot.exists()) return undefined;

  const currentSeat = { id: seatId, ...seatSnapshot.val() } as Seat;
  const newSeatNumber = updates.seatNumber || currentSeat.seatNumber;
  const newFloor = updates.floor || currentSeat.floor;

  if (newSeatNumber !== currentSeat.seatNumber || newFloor !== currentSeat.floor) {
    const seatsQuery = query(ref(db, `libraries/${currentLibraryId}/seats`), orderByChild('floor'), equalTo(newFloor));
    const snapshot = await get(seatsQuery);
    if (snapshot.exists()) {
        let seatExists = false;
        snapshot.forEach(childSnap => {
            if (childSnap.key !== seatId && childSnap.val().seatNumber === newSeatNumber) {
            seatExists = true;
            }
        });
        if (seatExists) {
            throw new Error(`Another seat with number ${newSeatNumber} already exists on ${newFloor} in this library.`);
        }
    }
  }

  const finalUpdates = { ...currentSeat, ...updates }; 
  const seatToSave: Seat = {
      id: currentSeat.id,
      seatNumber: finalUpdates.seatNumber,
      floor: finalUpdates.floor,
      isOccupied: currentSeat.isOccupied,
      studentId: currentSeat.studentId,
      studentName: currentSeat.studentName,
  };

  await set(seatRef, seatToSave);
  return seatToSave;
};

export const deleteSeat = async (libraryId: string, seatId: string): Promise<boolean> => {
  const currentLibraryId = ensureSingleLibraryId(libraryId);
  const seatRef = ref(db, `libraries/${currentLibraryId}/seats/${seatId}`);
  const seatSnapshot = await get(seatRef);
  if (!seatSnapshot.exists()) return false;
  
  const seatToDelete = seatSnapshot.val() as Seat;
  const updates: Record<string, any> = {};
  updates[`libraries/${currentLibraryId}/seats/${seatId}`] = null; 

  if (seatToDelete.isOccupied && seatToDelete.studentId) {
    updates[`libraries/${currentLibraryId}/students/${seatToDelete.studentId}/seatId`] = null; 
  }
  await update(ref(db), updates);
  return true;
};

export const assignSeat = async (libraryId: string, studentId: string, newSeatId: string): Promise<boolean> => {
  const currentLibraryId = ensureSingleLibraryId(libraryId);
  const studentRef = ref(db, `libraries/${currentLibraryId}/students/${studentId}`);
  const newSeatRef = ref(db, `libraries/${currentLibraryId}/seats/${newSeatId}`);

  const studentSnap = await get(studentRef);
  const newSeatSnap = await get(newSeatRef);

  if (!studentSnap.exists() || !newSeatSnap.exists()) return false;

  const student = {id: studentSnap.key, ...studentSnap.val()} as Student;
  const newSeat = {id: newSeatSnap.key, ...newSeatSnap.val()} as Seat;

  if (newSeat.isOccupied && newSeat.studentId !== studentId) { 
      throw new Error(`Seat ${newSeat.seatNumber} (${newSeat.floor}) is already taken by ${newSeat.studentName}.`);
  }

  const updates: Record<string, any> = {};
  if (student.seatId && student.seatId !== newSeatId) { 
    updates[`libraries/${currentLibraryId}/seats/${student.seatId}/isOccupied`] = false;
    updates[`libraries/${currentLibraryId}/seats/${student.seatId}/studentId`] = null;
    updates[`libraries/${currentLibraryId}/seats/${student.seatId}/studentName`] = null;
  }
  
  updates[`libraries/${currentLibraryId}/seats/${newSeatId}/isOccupied`] = true;
  updates[`libraries/${currentLibraryId}/seats/${newSeatId}/studentId`] = studentId;
  updates[`libraries/${currentLibraryId}/seats/${newSeatId}/studentName`] = student.fullName;
  updates[`libraries/${currentLibraryId}/students/${studentId}/seatId`] = newSeatId;
  
  await update(ref(db), updates);
  return true;
};

export const unassignSeat = async (libraryId: string, seatId: string): Promise<boolean> => {
  const currentLibraryId = ensureSingleLibraryId(libraryId);
  const seatRef = ref(db, `libraries/${currentLibraryId}/seats/${seatId}`);
  const seatSnapshot = await get(seatRef);
  if (!seatSnapshot.exists()) return false;

  const seat = {id: seatSnapshot.key, ...seatSnapshot.val()} as Seat;
  if (!seat.isOccupied || !seat.studentId) return false; 

  const updates: Record<string, any> = {};
  updates[`libraries/${currentLibraryId}/seats/${seatId}/isOccupied`] = false;
  updates[`libraries/${currentLibraryId}/seats/${seatId}/studentId`] = null;
  updates[`libraries/${currentLibraryId}/seats/${seatId}/studentName`] = null;
  updates[`libraries/${currentLibraryId}/students/${seat.studentId}/seatId`] = null;

  await update(ref(db), updates);
  return true;
};

// Payment Type Operations
export const getPaymentTypes = async (libraryId: string | null): Promise<PaymentType[]> => {
  if (libraryId === null) { 
    const allLibsMeta = await getLibrariesMetadata();
    if (allLibsMeta.length === 0) return [];
    let combinedPaymentTypes: PaymentType[] = [];
    for (const libMeta of allLibsMeta) {
      const paymentTypesRef = ref(db, `libraries/${libMeta.id}/paymentTypes`);
      const snapshot = await get(paymentTypesRef);
      if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
          combinedPaymentTypes.push({ id: childSnapshot.key, ...childSnapshot.val(), libraryName: libMeta.name } as PaymentType); 
        });
      }
    }
    return combinedPaymentTypes;
  } else {
    const paymentTypesRef = ref(db, `libraries/${libraryId}/paymentTypes`);
    const snapshot = await get(paymentTypesRef);
    if (snapshot.exists()) {
      return snapshotToAray<PaymentType>(snapshot);
    }
    return [];
  }
}

export const getPaymentTypeById = async (libraryId: string, paymentTypeId: string): Promise<PaymentType | undefined> => {
  const currentLibraryId = ensureSingleLibraryId(libraryId);
  const ptRef = ref(db, `libraries/${currentLibraryId}/paymentTypes/${paymentTypeId}`);
  const snapshot = await get(ptRef);
  if (snapshot.exists()) {
      return { id: snapshot.key, ...snapshot.val() } as PaymentType;
  }
  return undefined;
};

export const addPaymentType = async (libraryId: string, planData: Omit<PaymentType, 'id'>): Promise<PaymentType> => {
  const currentLibraryId = ensureSingleLibraryId(libraryId);
  const newPaymentTypeRef = push(ref(db, `libraries/${currentLibraryId}/paymentTypes`));
  const newId = newPaymentTypeRef.key;
  if (!newId) throw new Error("Failed to generate payment type ID.");
  const newPlan : PaymentType = {...planData, id: newId};
  await set(newPaymentTypeRef, newPlan);
  return newPlan;
}

export const updatePaymentType = async (libraryId: string, paymentTypeId: string, updates: Partial<PaymentType>): Promise<PaymentType | undefined> => {
  const currentLibraryId = ensureSingleLibraryId(libraryId);
  const ptRef = ref(db, `libraries/${currentLibraryId}/paymentTypes/${paymentTypeId}`);
  const snapshot = await get(ptRef);
  if (!snapshot.exists()) return undefined;
  const updatedData = { ...snapshot.val(), ...updates, id: paymentTypeId }; 
  await set(ptRef, updatedData);
  return updatedData as PaymentType;
}

// Fee Payment Operations
export const getPayments = async (libraryId: string | null): Promise<FeePayment[]> => {
  if (libraryId === null) { 
    const allLibsMeta = await getLibrariesMetadata();
    if (allLibsMeta.length === 0) return [];
    let combinedPayments: FeePayment[] = [];
    for (const libMeta of allLibsMeta) {
      const paymentsRef = ref(db, `libraries/${libMeta.id}/payments`);
      const snapshot = await get(paymentsRef);
      if (snapshot.exists()) {
         snapshot.forEach(childSnapshot => {
          combinedPayments.push({ id: childSnapshot.key, ...childSnapshot.val(), libraryName: libMeta.name } as FeePayment);
        });
      }
    }
    return combinedPayments;
  } else {
    const paymentsRef = ref(db, `libraries/${libraryId}/payments`);
    const snapshot = await get(paymentsRef);
    if (snapshot.exists()) {
      return snapshotToAray<FeePayment>(snapshot);
    }
    return [];
  }
}

export const addPayment = async (
  libraryId: string, 
  paymentData: Omit<FeePayment, 'id' | 'studentName'>,
  studentFullName?: string, 
  updateStudentBalance: boolean = true 
): Promise<FeePayment> => {
  const currentLibraryId = ensureSingleLibraryId(libraryId);
  
  let finalStudentName = studentFullName;
  if (!finalStudentName) {
    const studentRefForName = ref(db, `libraries/${currentLibraryId}/students/${paymentData.studentId}`);
    const studentSnapshotForName = await get(studentRefForName);
    if (!studentSnapshotForName.exists()) throw new Error("Student not found for payment.");
    finalStudentName = (studentSnapshotForName.val() as Student).fullName;
  }

  const newPaymentRef = push(ref(db, `libraries/${currentLibraryId}/payments`));
  const newPaymentId = newPaymentRef.key;
  if (!newPaymentId) throw new Error("Failed to generate payment ID.");

  const newPayment: FeePayment = { ...paymentData, id: newPaymentId, studentName: finalStudentName };
  
  const updates: Record<string, any> = {};
  updates[`libraries/${currentLibraryId}/payments/${newPaymentId}`] = newPayment;
  
  if (updateStudentBalance) {
    const studentRef = ref(db, `libraries/${currentLibraryId}/students/${paymentData.studentId}`);
    const studentSnapshot = await get(studentRef);
    if (!studentSnapshot.exists()) throw new Error("Student not found to update balance.");
    const student = {id: studentSnapshot.key, ...studentSnapshot.val()} as Student;
    
    const newFeesDue = student.feesDue - paymentData.amount; 
    updates[`libraries/${currentLibraryId}/students/${student.id}/feesDue`] = newFeesDue;
    updates[`libraries/${currentLibraryId}/students/${student.id}/lastPaymentDate`] = paymentData.paymentDate;
    if (student.status !== 'inactive') {
      updates[`libraries/${currentLibraryId}/students/${student.id}/status`] = newFeesDue > 0 ? 'owing' : 'enrolled';
    }
  }
  
  await update(ref(db), updates);
  return newPayment;
}

export const markFeesAsPaid = async (libraryId: string, studentId: string): Promise<boolean> => {
  const currentLibraryId = ensureSingleLibraryId(libraryId);
  const studentRef = ref(db, `libraries/${currentLibraryId}/students/${studentId}`);
  const studentSnapshot = await get(studentRef);
  if (!studentSnapshot.exists()) return false;

  const student = {id: studentSnapshot.key, ...studentSnapshot.val()} as Student;
  const updates: Record<string, any> = {};
  updates[`libraries/${currentLibraryId}/students/${studentId}/feesDue`] = 0;
  updates[`libraries/${currentLibraryId}/students/${studentId}/lastPaymentDate`] = new Date().toISOString().split('T')[0];
  if (student.status !== 'inactive') { 
    updates[`libraries/${currentLibraryId}/students/${studentId}/status`] = 'enrolled';
  }
  
  await update(ref(db), updates);
  return true;
}

// Dashboard Summary
export const getDashboardSummary = async (libraryId: string | null): Promise<DashboardSummary> => {
  if (libraryId === null) { 
    const allLibsMeta = await getLibrariesMetadata();
    if (allLibsMeta.length === 0) {
        return { totalStudents: 0, totalSeats: 0, availableSeats: 0, monthlyIncome: 0, studentsWithDues: 0, libraryName: "All Libraries (None Found)" };
    }
    let totalStudents = 0;
    let totalSeats = 0;
    let availableSeats = 0;
    let monthlyIncome = 0;
    let studentsWithDues = 0;

    for (const libMeta of allLibsMeta) {
      const libStudents = await getStudents(libMeta.id);
      const libSeats = await getSeats(libMeta.id);
      const libPayments = await getPayments(libMeta.id);
      
      const activeLibStudents = libStudents.filter(s => s.status !== 'inactive');
      totalStudents += activeLibStudents.length;
      totalSeats += libSeats.length;
      availableSeats += libSeats.filter(s => !s.isOccupied).length;
      studentsWithDues += activeLibStudents.filter(s => s.feesDue > 0).length;

      monthlyIncome += libPayments.reduce((sum, p) => {
          const paymentDate = new Date(p.paymentDate);
          const currentDate = new Date();
          if (paymentDate.getFullYear() === currentDate.getFullYear() && paymentDate.getMonth() === currentDate.getMonth()) {
            return sum + p.amount;
          }
          return sum;
        }, 0);
    }
    return { totalStudents, totalSeats, availableSeats, monthlyIncome, studentsWithDues, libraryName: "All Libraries Overview" };

  } else { 
    const students = await getStudents(libraryId);
    const seats = await getSeats(libraryId);
    const payments = await getPayments(libraryId);
    const libraryInfo = await getLibraryById(libraryId);

    const activeStudents = students.filter(s => s.status !== 'inactive');
    const totalIncomeThisMonth = payments.reduce((sum, p) => {
        const paymentDate = new Date(p.paymentDate);
        const currentDate = new Date();
        if (paymentDate.getFullYear() === currentDate.getFullYear() && paymentDate.getMonth() === currentDate.getMonth()) {
          return sum + p.amount;
        }
        return sum;
      }, 0);

    return {
      totalStudents: activeStudents.length,
      totalSeats: seats.length,
      availableSeats: seats.filter(s => !s.isOccupied).length,
      monthlyIncome: totalIncomeThisMonth,
      studentsWithDues: activeStudents.filter(s => s.feesDue > 0).length,
      libraryName: libraryInfo?.name || 'Current Library',
    };
  }
};
