import { getHalaqas, createHalaqa } from './halaqas';
import { getStudents, createStudent, getStudentById, updateStudent, deleteStudent } from './students';
import { getAttendance, saveAttendance, getAttendanceSummary, getAttendanceHistory, getAttendanceStats, getDeductedCountForMonth } from './attendance';
import { getSessions, createSession } from './sessions';
import { getPayments, getPaymentsByStudent, getPaymentsSummary, createPayment, markPaymentPaid } from './payments';
import { getEvents, getEventsForDateRange, getUpcomingEventsForStudent, createEvent, createRecurringWeeklyEvents, deleteEvent, deleteEventSeriesFrom } from './events';

const api = {
  // Halaqas
  getHalaqas,
  createHalaqa,
  // Students
  getStudents,
  createStudent,
  getStudentById,
  updateStudent,
  deleteStudent,
  // Attendance
  getAttendance,
  saveAttendance,
  getAttendanceSummary,
  getAttendanceHistory,
  getAttendanceStats,
  getDeductedCountForMonth,
  // Memorization sessions
  getSessions,
  createSession,
  // Payments
  getPayments,
  getPaymentsByStudent,
  getPaymentsSummary,
  createPayment,
  markPaymentPaid,
  // Events / calendar
  getEvents,
  getEventsForDateRange,
  getUpcomingEventsForStudent,
  createEvent,
  createRecurringWeeklyEvents,
  deleteEvent,
  deleteEventSeriesFrom,
};

export default api;
