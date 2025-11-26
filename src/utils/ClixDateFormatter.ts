export class ClixDateFormatter {
  static format(date: Date): string {
    const pad = (num: number) => num.toString().padStart(2, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    const offsetMinutes = date.getTimezoneOffset();
    const offsetSign = offsetMinutes <= 0 ? '+' : '-';
    const offsetHours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
    const offsetMinutesPart = pad(Math.abs(offsetMinutes) % 60);

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutesPart}`;
  }
}
