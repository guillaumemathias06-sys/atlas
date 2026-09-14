// Calendrier interne (section 20) — détection de conflit avec les dates bloquées.
export interface BlockedRange {
  startDate: Date;
  endDate: Date;
  blocking: boolean;
}

/** true si [tripStart, tripEnd] chevauche au moins un CalendarBlock bloquant. */
export function hasCalendarConflict(tripStart: Date, tripEnd: Date, blocks: BlockedRange[]): boolean {
  return blocks.some((b) => b.blocking && tripStart <= b.endDate && tripEnd >= b.startDate);
}
