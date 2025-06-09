
import { db } from './firebase';
import { ref, get, set, push, child, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import type { Student, Seat, PaymentType, FeePayment, DashboardSummary } from '@/types';

// Helper function to convert Firebase snapshot to array
const snapshotToAray = (snapshot: any) => {
  const items: any[] = [];
  snapshot.forEach((childSnapshot: any) => {
    items.push({ id: childSnapshot.key, ...childSnapshot.val() });
  });
  return items;
};


// Student Operations
export const getStudents = async (): Promise<Student[]> => {
  const studentsRef = ref(db, 'students');
  const snapshot = await get(studentsRef);
  if (snapshot.exists()) {
    return snapshotToAray(snapshot);
  }
  return [];
};

export const getStudentById = async (id: string): Promise<Student | undefined> => {
  const studentRef = ref(db, `students/${id}`);
  const snapshot = await get(studentRef);
  if (snapshot.exists()) {
    return { id: snapshot.key, ...snapshot.val() } as Student;
  }
  return undefined;
};

interface StudentDataInput {
  fullName: string;
  contactDetails: string;
  notes?: string;
  seatId?: string;
  status: 'enrolled' | 'owing' | 'inactive';
  feesDue: number;
  enrollmentDate: string;
  paymentTypeId?: string;
  photo?: File | string;
  idProof?: File | string;
}

export const addStudent = async (studentData: StudentDataInput): Promise<Student> => {
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
  
  const newStudentRef = push(ref(db, 'students'));
  const studentId = newStudentRef.key;
  if (!studentId) throw new Error("Failed to generate student ID.");

  const newStudentData = { 
    ...restStudentData,
    id: studentId, // Store ID within the student object as well
    photoUrl: finalPhotoUrl,
    idProofUrl: finalIdProofUrl,
  };

  const updates: Record<string, any> = {};
  updates[`/students/${studentId}`] = newStudentData;

  if (newStudentData.seatId) {
    const seatSnapshot = await get(ref(db, `seats/${newStudentData.seatId}`));
    if (seatSnapshot.exists()) {
        const seatVal = seatSnapshot.val();
        if (seatVal.isOccupied) {
            throw new Error(`Seat ${seatVal.seatNumber} (${seatVal.floor}) is already taken.`);
        }
        updates[`/seats/${newStudentData.seatId}/isOccupied`] = true;
        updates[`/seats/${newStudentData.seatId}/studentId`] = studentId;
        updates[`/seats/${newStudentData.seatId}/studentName`] = newStudentData.fullName;
    } else {
        newStudentData.seatId = undefined; // Seat not found
        updates[`/students/${studentId}/seatId`] = null; // Remove invalid seatId
    }
  }
  await update(ref(db), updates);
  return newStudentData as Student;
};

export const updateStudent = async (id: string, updates: Partial<StudentDataInput>): Promise<Student | undefined> => {
  const studentRef = ref(db, `students/${id}`);
  const studentSnapshot = await get(studentRef);
  if (!studentSnapshot.exists()) return undefined;

  const originalStudentData = { id, ...studentSnapshot.val() } as Student;
  
  let finalPhotoUrl: string | undefined = originalStudentData.photoUrl;
  if (updates.hasOwnProperty('photo')) {
    if (typeof updates.photo === 'string') finalPhotoUrl = updates.photo || undefined; // Allow clearing
    else if (updates.photo instanceof File) finalPhotoUrl = `https://placehold.co/100x100.png?text=${encodeURIComponent(updates.photo.name.substring(0,10) || 'Photo')}`;
    else finalPhotoUrl = undefined;
  }

  let finalIdProofUrl: string | undefined = originalStudentData.idProofUrl;
  if (updates.hasOwnProperty('idProof')) {
    if (typeof updates.idProof === 'string') finalIdProofUrl = updates.idProof || undefined; // Allow clearing
    else if (updates.idProof instanceof File) finalIdProofUrl = `https://placehold.co/200x150.png?text=${encodeURIComponent(updates.idProof.name.substring(0,10) || 'ID')}_ID`;
    else finalIdProofUrl = undefined;
  }

  const { photo, idProof, ...restUpdates } = updates;
  
  const updatedStudentData = { 
    ...originalStudentData, 
    ...restUpdates,
    photoUrl: finalPhotoUrl,
    idProofUrl: finalIdProofUrl,
  };

  const dbUpdates: Record<string, any> = {};
  dbUpdates[`/students/${id}`] = updatedStudentData;

  const newSeatId = updatedStudentData.seatId === 'NONE_SELECT_VALUE' ? undefined : updatedStudentData.seatId;
  const oldSeatId = originalStudentData.seatId;

  if (newSeatId !== oldSeatId) {
    if (oldSeatId) {
      dbUpdates[`/seats/${oldSeatId}/isOccupied`] = false;
      dbUpdates[`/seats/${oldSeatId}/studentId`] = null;
      dbUpdates[`/seats/${oldSeatId}/studentName`] = null;
    }
    if (newSeatId) {
      const newSeatSnapshot = await get(ref(db, `seats/${newSeatId}`));
      if (newSeatSnapshot.exists()) {
        const newSeatVal = newSeatSnapshot.val();
        if (newSeatVal.isOccupied && newSeatVal.studentId !== id) {
          throw new Error(`Seat ${newSeatVal.seatNumber} (${newSeatVal.floor}) is already taken by ${newSeatVal.studentName}.`);
        }
        dbUpdates[`/seats/${newSeatId}/isOccupied`] = true;
        dbUpdates[`/seats/${newSeatId}/studentId`] = id;
        dbUpdates[`/seats/${newSeatId}/studentName`] = updatedStudentData.fullName;
        dbUpdates[`/students/${id}/seatId`] = newSeatId;
      } else {
         dbUpdates[`/students/${id}/seatId`] = null; // New seat not found
      }
    } else {
        dbUpdates[`/students/${id}/seatId`] = null; // Unassigning seat
    }
  } else if (updates.fullName && originalStudentData.seatId) {
    // If only name changed and student has a seat, update studentName on seat
    dbUpdates[`/seats/${originalStudentData.seatId}/studentName`] = updatedStudentData.fullName;
  }
  
  await update(ref(db), dbUpdates);
  return updatedStudentData;
};


// Seat Operations
export const getSeats = async (): Promise<Seat[]> => {
  const seatsRef = ref(db, 'seats');
  const snapshot = await get(seatsRef);
  if (snapshot.exists()) {
    const seatsArray = snapshotToAray(snapshot);
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

export const getSeatById = async (id: string): Promise<Seat | undefined> => {
  const seatRef = ref(db, `seats/${id}`);
  const snapshot = await get(seatRef);
  if (snapshot.exists()) {
    return { id: snapshot.key, ...snapshot.val() } as Seat;
  }
  return undefined;
};

export const addSeat = async (seatData: { seatNumber: string; floor: string }): Promise<Seat> => {
  const seatsQuery = query(ref(db, 'seats'), orderByChild('floor'), equalTo(seatData.floor));
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

  const newSeatRef = push(ref(db, 'seats'));
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

export const updateSeatDetails = async (id: string, updates: { seatNumber?: string; floor?: string }): Promise<Seat | undefined> => {
  const seatRef = ref(db, `seats/${id}`);
  const seatSnapshot = await get(seatRef);
  if (!seatSnapshot.exists()) return undefined;

  const currentSeat = { id, ...seatSnapshot.val() } as Seat;
  const newSeatNumber = updates.seatNumber || currentSeat.seatNumber;
  const newFloor = updates.floor || currentSeat.floor;

  if (newSeatNumber !== currentSeat.seatNumber || newFloor !== currentSeat.floor) {
    const seatsQuery = query(ref(db, 'seats'), orderByChild('floor'), equalTo(newFloor));
    const snapshot = await get(seatsQuery);
    if (snapshot.exists()) {
        let seatExists = false;
        snapshot.forEach(childSnap => {
            if (childSnap.key !== id && childSnap.val().seatNumber === newSeatNumber) {
            seatExists = true;
            }
        });
        if (seatExists) {
            throw new Error(`Another seat with number ${newSeatNumber} already exists on ${newFloor}.`);
        }
    }
  }

  const finalUpdates = { ...currentSeat, ...updates };
  await set(seatRef, finalUpdates);
  return finalUpdates;
};

export const deleteSeat = async (id: string): Promise<boolean> => {
  const seatRef = ref(db, `seats/${id}`);
  const seatSnapshot = await get(seatRef);
  if (!seatSnapshot.exists()) return false;
  
  const seatToDelete = seatSnapshot.val() as Seat;
  const updates: Record<string, any> = {};
  updates[`/seats/${id}`] = null; // Delete seat

  if (seatToDelete.isOccupied && seatToDelete.studentId) {
    updates[`/students/${seatToDelete.studentId}/seatId`] = null; // Unassign student
  }
  await update(ref(db), updates);
  return true;
};

export const assignSeat = async (studentId: string, newSeatId: string): Promise<boolean> => {
  const studentRef = ref(db, `students/${studentId}`);
  const newSeatRef = ref(db, `seats/${newSeatId}`);

  const studentSnap = await get(studentRef);
  const newSeatSnap = await get(newSeatRef);

  if (!studentSnap.exists() || !newSeatSnap.exists()) return false;

  const student = {id: studentSnap.key, ...studentSnap.val()} as Student;
  const newSeat = {id: newSeatSnap.key, ...newSeatSnap.val()} as Seat;

  if (newSeat.isOccupied && newSeat.studentId !== studentId) { 
      throw new Error(`Seat ${newSeat.seatNumber} (${newSeat.floor}) is already taken by ${newSeat.studentName}.`);
  }

  const updates: Record<string, any> = {};
  if (student.seatId && student.seatId !== newSeatId) { // Student had an old seat
    updates[`/seats/${student.seatId}/isOccupied`] = false;
    updates[`/seats/${student.seatId}/studentId`] = null;
    updates[`/seats/${student.seatId}/studentName`] = null;
  }
  
  updates[`/seats/${newSeatId}/isOccupied`] = true;
  updates[`/seats/${newSeatId}/studentId`] = studentId;
  updates[`/seats/${newSeatId}/studentName`] = student.fullName;
  updates[`/students/${studentId}/seatId`] = newSeatId;
  
  await update(ref(db), updates);
  return true;
};

export const unassignSeat = async (seatId: string): Promise<boolean> => {
  const seatRef = ref(db, `seats/${seatId}`);
  const seatSnapshot = await get(seatRef);
  if (!seatSnapshot.exists()) return false;

  const seat = {id: seatSnapshot.key, ...seatSnapshot.val()} as Seat;
  if (!seat.isOccupied || !seat.studentId) return false; // Already vacant or no student assigned

  const updates: Record<string, any> = {};
  updates[`/seats/${seatId}/isOccupied`] = false;
  updates[`/seats/${seatId}/studentId`] = null;
  updates[`/seats/${seatId}/studentName`] = null;
  updates[`/students/${seat.studentId}/seatId`] = null;

  await update(ref(db), updates);
  return true;
};

// Payment Type Operations
export const getPaymentTypes = async (): Promise<PaymentType[]> => {
  const paymentTypesRef = ref(db, 'paymentTypes');
  const snapshot = await get(paymentTypesRef);
  if (snapshot.exists()) {
    return snapshotToAray(snapshot);
  }
  return [];
}

export const getPaymentTypeById = async (id: string): Promise<PaymentType | undefined> => {
    const ptRef = ref(db, `paymentTypes/${id}`);
    const snapshot = await get(ptRef);
    if (snapshot.exists()) {
        return { id: snapshot.key, ...snapshot.val() } as PaymentType;
    }
    return undefined;
};

export const addPaymentType = async (planData: Omit<PaymentType, 'id'>): Promise<PaymentType> => {
  const newPaymentTypeRef = push(ref(db, 'paymentTypes'));
  const newId = newPaymentTypeRef.key;
  if (!newId) throw new Error("Failed to generate payment type ID.");
  const newPlan : PaymentType = {...planData, id: newId};
  await set(newPaymentTypeRef, newPlan);
  return newPlan;
}

export const updatePaymentType = async (id: string, updates: Partial<PaymentType>): Promise<PaymentType | undefined> => {
  const ptRef = ref(db, `paymentTypes/${id}`);
  const snapshot = await get(ptRef);
  if (!snapshot.exists()) return undefined;
  const updatedData = { ...snapshot.val(), ...updates, id: id };
  await set(ptRef, updatedData);
  return updatedData as PaymentType;
}

// Fee Payment Operations
export const getPayments = async (): Promise<FeePayment[]> => {
  const paymentsRef = ref(db, 'payments');
  const snapshot = await get(paymentsRef);
  if (snapshot.exists()) {
    return snapshotToAray(snapshot);
  }
  return [];
}

export const addPayment = async (paymentData: Omit<FeePayment, 'id' | 'studentName'>): Promise<FeePayment> => {
  const studentRef = ref(db, `students/${paymentData.studentId}`);
  const studentSnapshot = await get(studentRef);
  if (!studentSnapshot.exists()) throw new Error("Student not found");
  
  const student = {id: studentSnapshot.key, ...studentSnapshot.val()} as Student;

  const newPaymentRef = push(ref(db, 'payments'));
  const newPaymentId = newPaymentRef.key;
  if (!newPaymentId) throw new Error("Failed to generate payment ID.");

  const newPayment: FeePayment = { ...paymentData, id: newPaymentId, studentName: student.fullName };
  
  const updates: Record<string, any> = {};
  updates[`/payments/${newPaymentId}`] = newPayment;
  
  const newFeesDue = Math.max(0, student.feesDue - paymentData.amount);
  updates[`/students/${student.id}/feesDue`] = newFeesDue;
  updates[`/students/${student.id}/lastPaymentDate`] = paymentData.paymentDate;
  if (newFeesDue === 0 && student.status === 'owing') {
    updates[`/students/${student.id}/status`] = 'enrolled';
  }
  
  await update(ref(db), updates);
  return newPayment;
}

export const markFeesAsPaid = async (studentId: string): Promise<boolean> => {
  const studentRef = ref(db, `students/${studentId}`);
  const studentSnapshot = await get(studentRef);
  if (!studentSnapshot.exists()) return false;

  const student = {id: studentSnapshot.key, ...studentSnapshot.val()} as Student;
  const updates: Record<string, any> = {};
  updates[`/students/${studentId}/feesDue`] = 0;
  updates[`/students/${studentId}/lastPaymentDate`] = new Date().toISOString().split('T')[0];
  if (student.status === 'owing') {
    updates[`/students/${studentId}/status`] = 'enrolled';
  }
  
  await update(ref(db), updates);
  return true;
}

// Dashboard Summary
export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const students = await getStudents();
  const seats = await getSeats();
  const payments = await getPayments();

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
  };
};
