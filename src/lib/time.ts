
export function formatTime(time: string): string {
  // If time is already in 12-hour format, return it as is
  if (time.includes('am') || time.includes('pm')) {
    return time;
  }

  // Convert 24-hour format to 12-hour format
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
}

export function parseTime(timeString: string): { hours: number; minutes: number } {
  // Remove any AM/PM indicator and split into hours and minutes
  const time = timeString.toLowerCase().replace(/[ap]m/, '');
  let [hours, minutes] = time.split(':').map(Number);

  // Adjust hours for PM times
  if (timeString.toLowerCase().includes('pm') && hours !== 12) {
    hours += 12;
  }
  // Adjust for 12 AM
  if (timeString.toLowerCase().includes('am') && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${minutes} min`;
  } else if (remainingMinutes === 0) {
    return `${hours} hr`;
  } else {
    return `${hours} hr ${remainingMinutes} min`;
  }
}
