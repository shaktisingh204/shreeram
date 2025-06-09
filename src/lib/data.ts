
import type { Student, Seat, PaymentType, FeePayment, DashboardSummary } from '@/types'; // Renamed FeePlan to PaymentType

// Initial mock students - seatId will be populated after seats are defined
export const mockStudentsInitial: Omit<Student, 'id' | 'seatId'> & { tempSeatNumber?: string, id: string}[] = [
  { id: '1', fullName: 'Alice Wonderland', contactDetails: 'alice@example.com', tempSeatNumber: 'F1-S1', status: 'enrolled', feesDue: 0, enrollmentDate: '2023-01-15', paymentTypeId: 'pt1', photoUrl: 'https://placehold.co/100x100', idProofUrl: 'https://placehold.co/200x150' }, // Renamed feePlanId to paymentTypeId
  { id: '2', fullName: 'Bob The Builder', contactDetails: 'bob@example.com', tempSeatNumber: 'F1-S2', status: 'owing', feesDue: 5000, enrollmentDate: '2023-02-01', paymentTypeId: 'pt2', lastPaymentDate: '2024-06-01' }, // Renamed feePlanId
  { id: '3', fullName: 'Charlie Brown', contactDetails: 'charlie@example.com', status: 'inactive', feesDue: 0, enrollmentDate: '2022-11-10' },
  { id: '4', fullName: 'Diana Prince', contactDetails: 'diana@example.com', tempSeatNumber: 'F2-S1', status: 'enrolled', feesDue: 0, enrollmentDate: '2023-03-20', paymentTypeId: 'pt1' }, // Renamed feePlanId
];

export const mockSeats: Seat[] = Array.from({ length: 12 }, (_, i) => {
  const floorNumber = Math.floor(i / 6) + 1;
  const seatInFloor = (i % 6) + 1;
  const seatNumber = `S${seatInFloor}`;
  const studentAssigned = mockStudentsInitial.find(s => s.tempSeatNumber === `F${floorNumber}-${seatNumber}`);
  return {
    id: `seat-f${floorNumber}-s${seatInFloor}`,
    seatNumber,
    floor: `Floor ${floorNumber}`,
    isOccupied: !!studentAssigned,
    studentId: studentAssigned?.id,
    studentName: studentAssigned?.fullName,
  };
});

export const mockStudents: Student[] = mockStudentsInitial.map(sInit => {
    const assignedSeat = mockSeats.find(seat => seat.studentId === sInit.id);
    const { tempSeatNumber, ...studentData } = sInit;
    return {
        ...studentData,
        seatId: assignedSeat?.id,
    };
});


export const mockPaymentTypes: PaymentType[] = [ // Renamed from mockFeePlans
  { id: 'pt1', name: 'Standard Monthly', amount: 7500, frequency: 'monthly' }, // Updated amounts
  { id: 'pt2', name: 'Premium Monthly', amount: 11000, frequency: 'monthly' },
  { id: 'pt3', name: 'Basic Quarterly', amount: 20000, frequency: 'quarterly' },
];

export const mockPayments: FeePayment[] = [
  { id: 'payment1', studentId: '1', studentName: 'Alice Wonderland', amount: 7500, paymentDate: '2024-07-01', notes: 'July payment' },
  { id: 'payment2', studentId: '2', studentName: 'Bob The Builder', amount: 5000, paymentDate: '2024-06-01', notes: 'June partial payment' },
  { id: 'payment3', studentId: '4', studentName: 'Diana Prince', amount: 7500, paymentDate: '2024-07-05', notes: 'July payment' },
];


// Simulate database operations
export const getStudents = async (): Promise<Student[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockStudents.map(s => ({...s})); 
};

export const getStudentById = async (id: string): Promise<Student | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const student = mockStudents.find(s => s.id === id);
  return student ? {...student} : undefined;
};

export const addStudent = async (studentData: Omit<Student, 'id'>): Promise<Student> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const newStudent: Student = { ...studentData, id: String(Date.now()) };
  mockStudents.push(newStudent);
  
  if (newStudent.seatId) {
    const seat = mockSeats.find(s => s.id === newStudent.seatId);
    if (seat) {
      if (seat.isOccupied) throw new Error(`Seat ${seat.seatNumber} (${seat.floor}) is already taken.`);
      seat.isOccupied = true;
      seat.studentId = newStudent.id;
      seat.studentName = newStudent.fullName;
    } else {
      newStudent.seatId = undefined; 
    }
  }
  return {...newStudent};
};

export const updateStudent = async (id: string, updates: Partial<Omit<Student, 'id'>>): Promise<Student | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const studentIndex = mockStudents.findIndex(s => s.id === id);
  if (studentIndex === -1) return undefined;

  const originalStudentData = { ...mockStudents[studentIndex] };
  
  const newSeatId = updates.hasOwnProperty('seatId') ? updates.seatId : originalStudentData.seatId;
  const oldSeatId = originalStudentData.seatId;

  if (newSeatId !== oldSeatId) {
    if (oldSeatId) {
      const oldSeat = mockSeats.find(s => s.id === oldSeatId);
      if (oldSeat) {
        oldSeat.isOccupied = false;
        oldSeat.studentId = undefined;
        oldSeat.studentName = undefined;
      }
    }
    if (newSeatId) {
      const newSeat = mockSeats.find(s => s.id === newSeatId);
      if (!newSeat) {
        console.error(`Seat with ID ${newSeatId} not found during student update. Student ${id} will not be assigned to this seat.`);
        if (updates.hasOwnProperty('seatId')) {
             updates.seatId = oldSeatId; 
        }
      } else if (newSeat.isOccupied && newSeat.studentId !== id) {
        throw new Error(`Seat ${newSeat.seatNumber} (${newSeat.floor}) is already taken by ${newSeat.studentName}.`);
      } else {
        newSeat.isOccupied = true;
        newSeat.studentId = id;
        newSeat.studentName = updates.fullName || originalStudentData.fullName;
      }
    }
  }

  mockStudents[studentIndex] = { ...originalStudentData, ...updates };

  return { ...mockStudents[studentIndex] };
};


export const getSeats = async (): Promise<Seat[]> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  mockSeats.sort((a, b) => {
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
  return mockSeats.map(s => ({...s}));
};

export const getSeatById = async (id: string): Promise<Seat | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const seat = mockSeats.find(s => s.id === id);
  return seat ? {...seat} : undefined;
};

export const addSeat = async (seatData: { seatNumber: string; floor: string }): Promise<Seat> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const existing = mockSeats.find(s => s.seatNumber === seatData.seatNumber && s.floor === seatData.floor);
  if (existing) {
    throw new Error(`Seat ${seatData.seatNumber} already exists on ${seatData.floor}.`);
  }
  const newSeat: Seat = {
    id: `seat-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
    seatNumber: seatData.seatNumber,
    floor: seatData.floor,
    isOccupied: false,
  };
  mockSeats.push(newSeat);
  return {...newSeat};
};

export const updateSeatDetails = async (id: string, updates: { seatNumber?: string; floor?: string }): Promise<Seat | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const seatIndex = mockSeats.findIndex(s => s.id === id);
  if (seatIndex === -1) return undefined;

  const currentSeat = mockSeats[seatIndex];
  const newSeatNumber = updates.seatNumber || currentSeat.seatNumber;
  const newFloor = updates.floor || currentSeat.floor;

  if (newSeatNumber !== currentSeat.seatNumber || newFloor !== currentSeat.floor) {
    const existing = mockSeats.find(s => s.id !== id && s.seatNumber === newSeatNumber && s.floor === newFloor);
    if (existing) {
      throw new Error(`Another seat with number ${newSeatNumber} already exists on ${newFloor}.`);
    }
  }
  
  mockSeats[seatIndex] = { ...currentSeat, ...updates };
  if (mockSeats[seatIndex].isOccupied && mockSeats[seatIndex].studentId) {
      const student = mockStudents.find(s => s.id === mockSeats[seatIndex].studentId);
      if (student) {
          mockSeats[seatIndex].studentName = student.fullName;
      }
  }
  return {...mockSeats[seatIndex]};
};

export const deleteSeat = async (id: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const seatIndex = mockSeats.findIndex(s => s.id === id);
  if (seatIndex === -1) return false;
  
  const seatToDelete = mockSeats[seatIndex];
  if (seatToDelete.isOccupied && seatToDelete.studentId) {
    const student = mockStudents.find(s => s.id === seatToDelete.studentId);
    if (student) {
      student.seatId = undefined;
    }
  }
  mockSeats.splice(seatIndex, 1);
  return true;
};

export const assignSeat = async (studentId: string, newSeatId: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const student = mockStudents.find(s => s.id === studentId);
  const newSeat = mockSeats.find(s => s.id === newSeatId);

  if (!student || !newSeat) return false;
  if (newSeat.isOccupied && newSeat.studentId !== studentId) { 
      throw new Error(`Seat ${newSeat.seatNumber} (${newSeat.floor}) is already taken by ${newSeat.studentName}.`);
  }

  if (student.seatId && student.seatId !== newSeatId) {
    const oldSeat = mockSeats.find(s => s.id === student.seatId);
    if (oldSeat) {
      oldSeat.isOccupied = false;
      oldSeat.studentId = undefined;
      oldSeat.studentName = undefined;
    }
  }
  
  newSeat.isOccupied = true;
  newSeat.studentId = studentId;
  newSeat.studentName = student.fullName;
  student.seatId = newSeat.id;
  return true;
};

export const unassignSeat = async (seatId: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const seat = mockSeats.find(s => s.id === seatId);
  if (!seat || !seat.isOccupied || !seat.studentId) return false;

  const student = mockStudents.find(s => s.id === seat.studentId);
  if (student) {
    student.seatId = undefined;
  }

  seat.isOccupied = false;
  seat.studentId = undefined;
  seat.studentName = undefined;
  return true;
};


export const getPaymentTypes = async (): Promise<PaymentType[]> => { // Renamed from getFeePlans
  await new Promise(resolve => setTimeout(resolve, 200));
  return mockPaymentTypes.map(fp => ({...fp}));
}

export const getPaymentTypeById = async (id: string): Promise<PaymentType | undefined> => { // Renamed from getFeePlanById
    await new Promise(resolve => setTimeout(resolve, 100));
    const plan = mockPaymentTypes.find(p => p.id === id);
    return plan ? {...plan} : undefined;
};

export const addPaymentType = async (plan: Omit<PaymentType, 'id'>): Promise<PaymentType> => { // Renamed from addFeePlan
  await new Promise(resolve => setTimeout(resolve, 300));
  const newPlan : PaymentType = {...plan, id: String(Date.now())};
  mockPaymentTypes.push(newPlan);
  return {...newPlan};
}

export const updatePaymentType = async (id: string, updates: Partial<PaymentType>): Promise<PaymentType | undefined> => { // Renamed from updateFeePlan
  await new Promise(resolve => setTimeout(resolve, 300));
  const planIndex = mockPaymentTypes.findIndex(p => p.id === id);
  if (planIndex === -1) return undefined;
  mockPaymentTypes[planIndex] = {...mockPaymentTypes[planIndex], ...updates};
  return {...mockPaymentTypes[planIndex]};
}

export const getPayments = async (): Promise<FeePayment[]> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return mockPayments.map(p => ({...p}));
}

export const addPayment = async (payment: Omit<FeePayment, 'id' | 'studentName'>): Promise<FeePayment> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const student = mockStudents.find(s => s.id === payment.studentId);
  if (!student) throw new Error("Student not found");

  const newPayment: FeePayment = { ...payment, id: String(Date.now()), studentName: student.fullName };
  mockPayments.push(newPayment);
  
  student.feesDue = Math.max(0, student.feesDue - payment.amount);
  if (student.feesDue === 0 && student.status === 'owing') {
    student.status = 'enrolled'; // 'enrolled' implies active and paid up
  }
  student.lastPaymentDate = newPayment.paymentDate;
  return {...newPayment};
}

export const markFeesAsPaid = async (studentId: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const student = mockStudents.find(s => s.id === studentId);
  if (!student) return false;
  student.feesDue = 0;
  if (student.status === 'owing') {
    student.status = 'enrolled'; // 'enrolled' implies active and paid up
  }
  student.lastPaymentDate = new Date().toISOString().split('T')[0]; 
  return true;
}


export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return {
    totalStudents: mockStudents.filter(s => s.status !== 'inactive').length,
    totalSeats: mockSeats.length,
    availableSeats: mockSeats.filter(s => !s.isOccupied).length,
    monthlyIncome: mockPayments.reduce((sum, p) => {
      const paymentDate = new Date(p.paymentDate);
      const currentDate = new Date();
      if (paymentDate.getFullYear() === currentDate.getFullYear() && paymentDate.getMonth() === currentDate.getMonth()) {
        return sum + p.amount;
      }
      return sum;
    }, 0),
    studentsWithDues: mockStudents.filter(s => s.status === 'owing' && s.feesDue > 0).length, // Renamed from feesDueToday
  };
}
