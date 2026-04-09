/**
 * Convert HH:MM string to total minutes since midnight.
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert total minutes to HH:MM string.
 */
export const minutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Add minutes to a HH:MM time string.
 */
export const addMinutesToTime = (time: string, minutesToAdd: number): string => {
  const total = timeToMinutes(time) + minutesToAdd;
  return minutesToTime(total);
};

/**
 * Check if two time ranges overlap.
 * Handles overnight ranges (e.g., 23:00 → 01:00) by normalizing
 * end times that are less than or equal to their start times.
 */
export const timeRangesOverlap = (
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean => {
  const s1 = timeToMinutes(start1);
  let e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  let e2 = timeToMinutes(end2);

  // Handle overnight ranges (e.g., 23:00 → 01:00)
  if (e1 <= s1) e1 += 24 * 60;
  if (e2 <= s2) e2 += 24 * 60;

  return s1 < e2 && s2 < e1;
};

/**
 * Get today's date in YYYY-MM-DD format, optionally in a specific timezone.
 * Defaults to UTC if no timezone is provided or if the environment doesn't support it.
 */
export const getTodayDate = (timezone?: string): string => {
  if (timezone) {
    try {
      // Use Intl.DateTimeFormat to get the date in the specific timezone
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(new Date());
    } catch (err) {
      console.error(`Invalid timezone provided: ${timezone}. Falling back to UTC.`);
    }
  }
  return new Date().toISOString().split('T')[0];
};
