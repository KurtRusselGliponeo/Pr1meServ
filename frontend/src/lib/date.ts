import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

// Default timezone for PRU Life UK Philippines operations
export const PH_TIMEZONE = 'Asia/Manila';

export const formatDate = (date: string | Date, format = 'MMM D, YYYY') =>
  dayjs(date).tz(PH_TIMEZONE).format(format);

export const formatDateTime = (date: string | Date) =>
  dayjs(date).tz(PH_TIMEZONE).format('MMM D, YYYY h:mm A');

export const fromNow = (date: string | Date) =>
  dayjs(date).tz(PH_TIMEZONE).fromNow();

export default dayjs;
