
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

// --- Library-Specific Data Operations ---
// Helper to ensure libraryId is present for operations
const ensureLibraryId = (libraryId: string | null): string => {
  if (!libraryId) {
    console.error("Attempted data operation without a libraryId context.");
    throw new Error("Library context is not set. Cannot perform data operation.");
  }
  return libraryId;
};

// Student Operations
export const getStudents = async (libraryId: string): Promise<Student[]> => {
  const currentLibraryId = ensureLibraryId(libraryId);
  const studentsRef = ref(db, `libraries/${currentLibraryId}/students`);
  const snapshot = await get(studentsRef);
  if (snapshot.exists()) {
    return snapshotToAray<Student>(snapshot);
  }
  return [];
};

export const getStudentById = async (libraryId: string, studentId: string): Promise<Student | undefined> => {
  const currentLibraryId = ensureLibraryId(libraryId);
  const studentRef = ref(db, `libraries/${currentLibraryId}/students/${studentId}`);
  const snapshot = await get(studentRef);
  if (snapshot.exists()) {
    return { id: snapshot.key, ...snapshot.val() } as Student;
  }
  return undefined;
};

interface StudentDataInput {
  fullName: string;
  contactDetails: string; // Email
  mobileNumber?: string;
  fatherName?: string;
  address?: string;
  notes?: string;
  seatId?: string;
  status: 'enrolled' | 'owing' | 'inactive';
  feesDue: number;
  enrollmentDate: string;
  paymentTypeId?: string;
  photo?: File | string;
  idProof?: File | string;
}

export const addStudent = async (libraryId: string, studentData: StudentDataInput): Promise<Student> => {
  const currentLibraryId = ensureLibraryId(libraryId);
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
  
  const { photo, idProof, ...restStudentData } = studentData;
  
  const newStudentRef = push(ref(db, `libraries/${currentLibraryId}/students`));
  const newStudentId = newStudentRef.key;
  if (!newStudentId) throw new Error("Failed to generate student ID.");

  const newStudentData: Omit<Student, 'id'> & { id?: string } = {
    ...restStudentData,
    photoUrl: finalPhotoUrl,
    idProofUrl: finalIdProofUrl,
    mobileNumber: studentData.mobileNumber || undefined,
    fatherName: studentData.fatherName || undefined,
    address: studentData.address || undefined,
  };
  
  const studentToSave: Student = {
    ...newStudentData,
    id: newStudentId,
  } as Student;

  const updates: Record<string, any> = {};
  updates[`libraries/${currentLibraryId}/students/${newStudentId}`] = studentToSave;

  if (studentToSave.seatId && studentToSave.seatId !== 'NONE_SELECT_VALUE') {
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
  await update(ref(db), updates);
  return studentToSave;
};

export const updateStudent = async (libraryId: string, studentId: string, updatesIn: Partial<StudentDataInput>): Promise<Student | undefined> => {
  const currentLibraryId = ensureLibraryId(libraryId);
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

  const { photo, idProof, ...restUpdates } = updatesIn;
  
  const updatedStudentData = { 
    ...originalStudentData, 
    ...restUpdates,
    photoUrl: finalPhotoUrl,
    idProofUrl: finalIdProofUrl,
    mobileNumber: updatesIn.mobileNumber === "" ? undefined : (updatesIn.mobileNumber ?? originalStudentData.mobileNumber),
    fatherName: updatesIn.fatherName === "" ? undefined : (updatesIn.fatherName ?? originalStudentData.fatherName),
    address: updatesIn.address === "" ? undefined : (updatesIn.address ?? originalStudentData.address),
  };

  const dbUpdates: Record<string, any> = {};
  dbUpdates[`libraries/${currentLibraryId}/students/${studentId}`] = updatedStudentData;

  const newSeatId = updatedStudentData.seatId === 'NONE_SELECT_VALUE' ? undefined : updatedStudentData.seatId;
  const oldSeatId = originalStudentData.seatId;

  if (newSeatId !== oldSeatId) {
    if (oldSeatId) {
      dbUpdates[`libraries/${currentLibraryId}/seats/${oldSeatId}/isOccupied`] = false;
      dbUpdates[`libraries/${currentLibraryId}/seats/${oldSeatId}/studentId`] = null;
      dbUpdates[`libraries/${currentLibraryId}/seats/${oldSeatId}/studentName`] = null;
    }
    if (newSeatId) {
      const newSeatSnapshot = await get(ref(db, `libraries/${currentLibraryId}/seats/${newSeatId}`));
      if (newSeatSnapshot.exists()) {
        const newSeatVal = newSeatSnapshot.val();
        if (newSeatVal.isOccupied && newSeatVal.studentId !== studentId) {
          throw new Error(`Seat ${newSeatVal.seatNumber} (${newSeatVal.floor}) is already taken by ${newSeatVal.studentName}.`);
        }
        dbUpdates[`libraries/${currentLibraryId}/seats/${newSeatId}/isOccupied`] = true;
        dbUpdates[`libraries/${currentLibraryId}/seats/${newSeatId}/studentId`] = studentId;
        dbUpdates[`libraries/${currentLibraryId}/seats/${newSeatId}/studentName`] = updatedStudentData.fullName;
        dbUpdates[`libraries/${currentLibraryId}/students/${studentId}/seatId`] = newSeatId;
      } else {
         dbUpdates[`libraries/${currentLibraryId}/students/${studentId}/seatId`] = null; 
      }
    } else {
        dbUpdates[`libraries/${currentLibraryId}/students/${studentId}/seatId`] = null; 
    }
  } else if (updatesIn.fullName && originalStudentData.seatId) {
    dbUpdates[`libraries/${currentLibraryId}/seats/${originalStudentData.seatId}/studentName`] = updatedStudentData.fullName;
  }
  
  await update(ref(db), dbUpdates);
  return updatedStudentData;
};

// Seat Operations
export const getSeats = async (libraryId: string): Promise<Seat[]> => {
  const currentLibraryId = ensureLibraryId(libraryId);
  const seatsRef = ref(db, `libraries/${currentLibraryId}/seats`);
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

        if (aPrefix === bPrefix && !isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
        }
        return a.seatNumber.localeCompare(b.seatNumber);
    });
    return seatsArray;
  }
  return [];
};

export const getSeatById = async (libraryId: string, seatId: string): Promise<Seat | undefined> => {
  const currentLibraryId = ensureLibraryId(libraryId);
  const seatRef = ref(db, `libraries/${currentLibraryId}/seats/${seatId}`);
  const snapshot = await get(seatRef);
  if (snapshot.exists()) {
    return { id: snapshot.key, ...snapshot.val() } as Seat;
  }
  return undefined;
};

export const addSeat = async (libraryId: string, seatData: { seatNumber: string; floor: string }): Promise<Seat> => {
  const currentLibraryId = ensureLibraryId(libraryId);
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
      throw new Error(`Seat ${seatData.seatNumber} already exists on ${seatData.floor}.`);
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
  const currentLibraryId = ensureLibraryId(libraryId);
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
            throw new Error(`Another seat with number ${newSeatNumber} already exists on ${newFloor}.`);
        }
    }
  }

  const finalUpdates = { ...currentSeat, ...updates };
  await set(seatRef, finalUpdates); // Using set to overwrite with potentially partial updates
  return finalUpdates;
};

export const deleteSeat = async (libraryId: string, seatId: string): Promise<boolean> => {
  const currentLibraryId = ensureLibraryId(libraryId);
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
  const currentLibraryId = ensureLibraryId(libraryId);
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
  const currentLibraryId = ensureLibraryId(libraryId);
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
export const getPaymentTypes = async (libraryId: string): Promise<PaymentType[]> => {
  const currentLibraryId = ensureLibraryId(libraryId);
  const paymentTypesRef = ref(db, `libraries/${currentLibraryId}/paymentTypes`);
  const snapshot = await get(paymentTypesRef);
  if (snapshot.exists()) {
    return snapshotToAray<PaymentType>(snapshot);
  }
  return [];
}

export const getPaymentTypeById = async (libraryId: string, paymentTypeId: string): Promise<PaymentType | undefined> => {
  const currentLibraryId = ensureLibraryId(libraryId);
  const ptRef = ref(db, `libraries/${currentLibraryId}/paymentTypes/${paymentTypeId}`);
  const snapshot = await get(ptRef);
  if (snapshot.exists()) {
      return { id: snapshot.key, ...snapshot.val() } as PaymentType;
  }
  return undefined;
};

export const addPaymentType = async (libraryId: string, planData: Omit<PaymentType, 'id'>): Promise<PaymentType> => {
  const currentLibraryId = ensureLibraryId(libraryId);
  const newPaymentTypeRef = push(ref(db, `libraries/${currentLibraryId}/paymentTypes`));
  const newId = newPaymentTypeRef.key;
  if (!newId) throw new Error("Failed to generate payment type ID.");
  const newPlan : PaymentType = {...planData, id: newId};
  await set(newPaymentTypeRef, newPlan);
  return newPlan;
}

export const updatePaymentType = async (libraryId: string, paymentTypeId: string, updates: Partial<PaymentType>): Promise<PaymentType | undefined> => {
  const currentLibraryId = ensureLibraryId(libraryId);
  const ptRef = ref(db, `libraries/${currentLibraryId}/paymentTypes/${paymentTypeId}`);
  const snapshot = await get(ptRef);
  if (!snapshot.exists()) return undefined;
  const updatedData = { ...snapshot.val(), ...updates, id: paymentTypeId };
  await set(ptRef, updatedData);
  return updatedData as PaymentType;
}

// Fee Payment Operations
export const getPayments = async (libraryId: string): Promise<FeePayment[]> => {
  const currentLibraryId = ensureLibraryId(libraryId);
  const paymentsRef = ref(db, `libraries/${currentLibraryId}/payments`);
  const snapshot = await get(paymentsRef);
  if (snapshot.exists()) {
    return snapshotToAray<FeePayment>(snapshot);
  }
  return [];
}

export const addPayment = async (libraryId: string, paymentData: Omit<FeePayment, 'id' | 'studentName'>): Promise<FeePayment> => {
  const currentLibraryId = ensureLibraryId(libraryId);
  const studentRef = ref(db, `libraries/${currentLibraryId}/students/${paymentData.studentId}`);
  const studentSnapshot = await get(studentRef);
  if (!studentSnapshot.exists()) throw new Error("Student not found");
  
  const student = {id: studentSnapshot.key, ...studentSnapshot.val()} as Student;

  const newPaymentRef = push(ref(db, `libraries/${currentLibraryId}/payments`));
  const newPaymentId = newPaymentRef.key;
  if (!newPaymentId) throw new Error("Failed to generate payment ID.");

  const newPayment: FeePayment = { ...paymentData, id: newPaymentId, studentName: student.fullName };
  
  const updates: Record<string, any> = {};
  updates[`libraries/${currentLibraryId}/payments/${newPaymentId}`] = newPayment;
  
  const newFeesDue = Math.max(0, student.feesDue - paymentData.amount);
  updates[`libraries/${currentLibraryId}/students/${student.id}/feesDue`] = newFeesDue;
  updates[`libraries/${currentLibraryId}/students/${student.id}/lastPaymentDate`] = paymentData.paymentDate;
  if (newFeesDue === 0 && student.status === 'owing') {
    updates[`libraries/${currentLibraryId}/students/${student.id}/status`] = 'enrolled';
  }
  
  await update(ref(db), updates);
  return newPayment;
}

export const markFeesAsPaid = async (libraryId: string, studentId: string): Promise<boolean> => {
  const currentLibraryId = ensureLibraryId(libraryId);
  const studentRef = ref(db, `libraries/${currentLibraryId}/students/${studentId}`);
  const studentSnapshot = await get(studentRef);
  if (!studentSnapshot.exists()) return false;

  const student = {id: studentSnapshot.key, ...studentSnapshot.val()} as Student;
  const updates: Record<string, any> = {};
  updates[`libraries/${currentLibraryId}/students/${studentId}/feesDue`] = 0;
  updates[`libraries/${currentLibraryId}/students/${studentId}/lastPaymentDate`] = new Date().toISOString().split('T')[0];
  if (student.status === 'owing') {
    updates[`libraries/${currentLibraryId}/students/${studentId}/status`] = 'enrolled';
  }
  
  await update(ref(db), updates);
  return true;
}

// Dashboard Summary
export const getDashboardSummary = async (libraryId: string): Promise<DashboardSummary> => {
  const currentLibraryId = ensureLibraryId(libraryId);
  const students = await getStudents(currentLibraryId);
  const seats = await getSeats(currentLibraryId);
  const payments = await getPayments(currentLibraryId);
  const libraryInfo = await getLibraryById(currentLibraryId);

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
};
