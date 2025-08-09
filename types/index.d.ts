declare module '@0dep/piso' {
	/** @module piso */
	/**
	 * ISO 8601 interval parser
	 * @param source interval source string
	 * @param enforceUTC enforce UTC if source lacks timezone offset
	 */
	export function ISOInterval(source: string, enforceUTC?: boolean): void;
	export class ISOInterval {
		/** @module piso */
		/**
		 * ISO 8601 interval parser
		 * @param source interval source string
		 * @param enforceUTC enforce UTC if source lacks timezone offset
		 */
		constructor(source: string, enforceUTC?: boolean);
		/** @internal Interval source string */
		source: string;
		
		c: string;
		
		parsed: string;
		
		idx: number;
		
		repeat: number | undefined;
		
		start: ISODate | undefined;
		
		duration: ISODuration | undefined;
		
		end: ISODate | undefined;
		
		type: ISOIntervalType;
		enforceUTC: boolean;
		get startDate(): Date;
		get endDate(): Date;
		/**
		 * ISO 8601 interval parser
		 */
		parse(): this;
		/**
		 * Get expire at
		 * @param compareDate optional compare date, defaults to now
		 * @param startDate optional start date, duration without start or end defaults to now
		 * @param enforceUTC enforce UTC if source lacks timezone offset
		 */
		getExpireAt(compareDate?: Date, startDate?: Date, enforceUTC?: boolean): Date;
		/**
		 * Get start at date
		 * @param compareDate optional compare date, defaults to now
		 * @param endDate optional end date, defaults to now
		 * @param enforceUTC enforce UTC if source lacks timezone offset
		 */
		getStartAt(compareDate?: Date, endDate?: Date, enforceUTC?: boolean): Date;
		toJSON(): string;
		toISOString(): string;
		toString(): string;
		consumeRepeat(): string;
		consumeStartDate(): ISODate;
		consumeDuration(): ISODuration;
		/**
		 * Consume partial end date
		 * */
		consumePartialEndDate(start: ISODate): ISODate;
		/**
		 * Consume date
		 * 
		 */
		consumeDate(enforceSeparators?: boolean, endChars?: string): ISODate;
		read(): string;
		current(): string;
		peek(): string;
		
		[kIsParsed]: boolean;
	}
	/**
	 * ISO 8601 date parser
	 * @param source ISO 8601 date time source
	 * @param options parse options
	 */
	export function ISODate(source: string, options?: ISODateOptions): void;
	export class ISODate {
		/**
		 * ISO 8601 date parser
		 * @param source ISO 8601 date time source
		 * @param options parse options
		 */
		constructor(source: string, options?: ISODateOptions);
		source: string;
		
		offset: number;
		idx: number;
		enforceSeparators: boolean;
		enforceUTC: boolean;
		c: string;
		parsed: string;
		endChars: string;
		
		result: Partial<ISODateParts>;
		/**
		 * ISO Date to Date
		 * @param enforceUTC enforce UTC if source lacks timezone offset
		 */
		toDate(enforceUTC?: boolean): Date;
		/**
		 * Parse passed source as ISO 8601 date time
		 */
		parse(): this;
		/**
		 * Get ISO date as string
		 * @returns date as JSON string
		 */
		toISOString(): string;
		/**
		 * Get ISO date as JSON
		 * @returns date as JSON string
		 */
		toJSON(): string | null;
		toString(): string;
		/**
		 * Parse partial relative date
		 * @param Y Year if year is not defined
		 * @param M JavaScript month if month is not defined
		 * @param D Date if date is not defined
		 * @param W Weeknumber
		 */
		parsePartialDate(Y: number, M: number, D?: number, W?: number): this;
		/**
		 * @internal Parse relative date
		 * @param Y Year if year is not defined
		 * @param M JavaScript month if month is not defined
		 * @param D Date if date is not defined
		 * @param W Weeknumber
		 */
		_parseRelativeDate(Y: number, M: number, D?: number, W?: number): this;
		/**
		 * Consume as ISO date
		 * @param Y year
		 */
		continueDatePrecision(Y: number): this;
		/**
		 * Continue ordinal date precision
		 * @param Y year
		 * @param D ordinal day
		 * @param next next char if any
		 */
		continueOrdinalDatePrecision(Y: number, D: number, next?: string): this;
		/**
		 * Continue from week instruciton
		 * @param Y year
		 */
		continueFromWeekInstruction(Y: number): this;
		/**
		 * Continue from time instruction
		 */
		continueFromTimeInstruction(): this;
		/**
		 * Consume minutes and seconds and so forth
		 * @param H from hour
		 */
		continueTimePrecision(H: number): this;
		/**
		 * Continue timezone offset parsing
		 * @param instruction timezone offset instruction
		 */
		continueTimeZonePrecision(instruction: string): this;
		consume(): string;
		/**
		 * Consume next char
		 * @param valid defaults to number char
		 */
		consumeChar(valid?: string): string;
		peek(): string;
		end(): this;
		/**
		 * Consume char or end
		 * @param valid Valid chars, defaults to 0-9
		 * */
		consumeCharOrEnd(valid?: string): string | undefined;
		createUnexpectedError(): RangeError;
		[kIsParsed]: boolean;
	}
	export namespace ISODate {
		/**
		 * Parse ISO 8601 date string
		 * @param source ISO 8601 duration
		 * @param offset source column offset
		 */
		function parse(source: string, offset?: number | null): Partial<ISODateParts>;
	}
	/**
	 * ISO 8601 duration parser
	 * 
	 */
	export function ISODuration(source: string, offset?: number): void;
	export class ISODuration {
		/**
		 * ISO 8601 duration parser
		 * 
		 */
		constructor(source: string, offset?: number);
		source: string;
		idx: number;
		type: string;
		parsed: string;
		
		designator: keyof ISOParts | undefined;
		value: string;
		usedFractions: boolean;
		fractionedDesignator: string;
		designators: string;
		usedDesignators: string;
		
		result: Partial<ISOParts>;
		isDateIndifferent: boolean;
		parse(): this;
		toISOString(): string;
		toJSON(): string;
		toString(): string;
		/**
		 * Write
		 * @param c ISO 8601 character
		 * @param column Current column
		 */
		write(c: string | undefined, column: number): void;
		/**
		 * @internal
		 * Set duration designator and value
		 * */
		setDesignatorValue(designator: string, value: string): void;
		/**
		 * Parse completed, no more chars
		 * @param column Current column
		 */
		end(column: number): void;
		/**
		 * Get duration expire at date
		 * @param startDate start ticking from date, defaults to now
		 * @param repetition repetition
		 */
		getExpireAt(startDate?: Date, repetition?: number): Date;
		/**
		 * Get duration start date
		 * @param endDate optional end date, defaults to now
		 * @param repetition number of repetitions
		 */
		getStartAt(endDate?: Date, repetition?: number): Date;
		/**
		 * Get duration in milliseconds from optional start date
		 * @param startDate start date, defaults to 1971-01-01T00:00:00Z since it's not a leap year
		 * @param repetition repetition
		 * @returns duration in milliseconds from start date
		 */
		toMilliseconds(startDate?: Date, repetition?: number): number;
		/**
		 * Get duration in milliseconds until optional end date
		 * @param endDate end date, defaults to epoch start 1970-01-01T00:00:00Z
		 * @param repetition repetition
		 * @returns duration in milliseconds from end date
		 */
		untilMilliseconds(endDate?: Date, repetition?: number): number;
		/**
		 * Calculate date indifferent duration milliseconds
		 * @param repetitions repetitions
		 * @returns number of date indifferent milliseconds
		 */
		getDateIndifferentMilliseconds(repetitions?: number): number;
		/**
		 * Create unexpected error
		 * */
		createUnexpectedError(c: string | undefined, column: number): RangeError;
		/**
		 *
		 * @param useUtc UTC
		 * @returns new date with applied duration
		 */
		applyDuration(date?: Date, repetitions?: number, useUtc?: boolean): Date;
		/**
		 * Apply date duration
		 * @param fromDate apply to date
		 * @param repetitions repetitions
		 * @param useUtc UTC
		 * @returns new date with applied duration
		 */
		applyDateDuration(fromDate: Date, repetitions?: number, useUtc?: boolean): Date;
		/**
		 * Get date designator getter and setter;
		 * */
		_getDateFns(designator: string, useUtc: boolean): any;
		
		[kIsParsed]: boolean;
	}
	export namespace ISODuration {
		/**
		 * Parse ISO 8601 duration string
		 * @param source ISO 8601 duration
		 * @param offset Column offset
		 */
		function parse(source: string, offset?: number): Partial<ISOParts>;
	}
	/**
	 * Parse ISO 8601 interval
	 * @param isoInterval ISO 8601 interval
	 * @param enforceUTC enforce UTC if source lacks timezone offset
	 */
	export function parseInterval(isoInterval: string, enforceUTC?: boolean): ISOInterval;
	/**
	 * Parse ISO 8601 duration or interval to get duration
	 * @param isoDuration ISO 8601 duration or interval
	 */
	export function parseDuration(isoDuration: string): ISODuration;
	/**
	 * Parse ISO 8601 date
	 * @param isoDateSource ISO 8601 date
	 * @param enforceUTC enforce UTC if source lacks timezone offset
	 */
	export function getDate(isoDateSource: string | Date | number, enforceUTC?: boolean): Date;
	/**
	 * Interval expire at date
	 * @param isoInterval ISO 8601 interval
	 * @param compareDate optional compare date, defaults to now
	 * @param startDate optional start date for use when only duration is present
	 * @param enforceUTC enforce UTC if source lacks timezone offset
	 */
	export function getExpireAt(isoInterval: string, compareDate?: Date, startDate?: Date, enforceUTC?: boolean): Date;
	/**
	 * Interval start at date
	 * @param isoInterval ISO 8601 interval
	 * @param compareDate optional compare date, defaults to now
	 * @param endDate optional end date for use when only duration is present
	 * @param enforceUTC enforce UTC if source lacks timezone offset
	 */
	export function getStartAt(isoInterval: string, compareDate?: Date, endDate?: Date, enforceUTC?: boolean): Date;
	/**
	 * Get last week of UTC year
	 * @param Y UTC full year
	 */
	export function getUTCLastWeekOfYear(Y: number): 53 | 52;
	/**
	 * Get Monday week one date
	 * @param Y UTC full year
	 */
	export function getUTCWeekOneDate(Y: number): Date;
	/**
	 * Get UTC week from date
	 * */
	export function getUTCWeekNumber(date?: Date | number | string): ISOWeekParts;
	/**
	 * Get date expressed as ISO week string
	 * 
	 */
	export function getISOWeekString(date?: Date | number | string): string;
	const kIsParsed: unique symbol;
  interface ISOParts {
	isValid?: boolean;
	/** Year designator that follows the value for the number of calendar years. */
	Y: number;
	/** Month designator that follows the value for the number of calendar months */
	M: number;
	/** Week designator that follows the value for the number of weeks */
	W: number;
	/** Day designator that follows the value for the number of calendar days, or weekday if week designator is used */
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

  interface ISODateParts extends ISOParts {
	/** Timezone offset char */
	Z?: string;
	/** Hours offset */
	OH?: number;
	/** Minutes offset */
	Om?: number;
	/** Seconds offset as of ISO 8601-2:2019 */
	OS?: number;
  }

  enum ISOWeekday {
	Monday = 1,
	Tuesday = 2,
	Wednesday = 3,
	Thursday = 4,
	Friday = 5,
	Saturday = 6,
	Sunday = 7,
  }

  interface ISOWeekParts {
	/** Year */
	Y: number;
	/** Weeknumber */
	W: number;
	/** ISO weekday */
	weekday: ISOWeekday;
  }

  enum ISOIntervalType {
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

  interface ISODateOptions {
	/** source string offset column number, -1 is default */
	offset?: number;
	/** string with optional characters that mark the end of the ISO date, e.g. `/` */
	endChars?: string;
	/** require time part separators such as `-` and `:` */
	enforceSeparators?: boolean;
	/** enforce UTC if source lacks time zone offset, defaults to false */
	enforceUTC?: boolean;
  }

	export {};
}

//# sourceMappingURL=index.d.ts.map