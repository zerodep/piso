export interface ISOParts {
  /** Year designator that follows the value for the number of calendar years. */
  Y: number;
  /** Month designator that follows the value for the number of calendar months */
  M: number;
  /** Week designator that follows the value for the number of weeks */
  W: number;
  /** Day designator that follows the value for the number of calendar days */
  D: number;
  /** Hour designator that follows the value for the number of hours */
  H: number;
  /** Minute designator that follows the value for the number of minutes */
  m: number;
  /** Second designator that follows the value for the number of seconds */
  S: number;
  /** Millisecond designator that follows the value for the number of milliseconds */
  F: number;
}

export interface ISODateParts extends ISOParts {
  /** Timezone offset char */
  Z?: string;
  /** Hours offset */
  OH?: number;
  /** Minutes offset */
  Om?: number;
  /** Seconds offset as of ISO 8601-2:2019 */
  OS?: number;
}

export interface ISOInterval extends ISOParts {
  repeat: number;
  startDate?: string;
  endDate?: string;
}

export enum ISOIntervalType {
  None = 0,
  Repeat = 1,
  StartDate = 2,
  Duration = 4,
  EndDate = 8,
  RepeatAndStartDate = 3,
  RepeatAndDuration = 5,
  StartDateAndDuration = 6,
  RepeatStartDateAndDuration = 7,
  StartDateAndEndDate = 10,
  DurationAndEndDate = 12,
  RepeatDurationAndEndDate = 13,
}
