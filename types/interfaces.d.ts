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
}

export interface ISODateParts extends ISOParts {
  /** Timezone offset char */
  Z?: string;
  /** Hours offset */
  OH?: number;
  /** Minutes offset */
  Om?: number;
}

export interface ISOInterval extends ISOParts {
  repeat: number;
  startDate?: string;
  endDate?: string;
}
