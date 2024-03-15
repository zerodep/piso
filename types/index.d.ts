declare module 'piso' {
	/** @module piso */
	/**
	 * ISO 8601 interval parser
	 * @param source interval source string
	 */
	export function ISOInterval(source: string): void;
	export class ISOInterval {
		/** @module piso */
		/**
		 * ISO 8601 interval parser
		 * @param source interval source string
		 */
		constructor(source: string);
		source: string;
		c: string;
		parsed: string;
		idx: number;
		repeat: number;
		
		start: ISODate | undefined;
		
		duration: ISODuration | undefined;
		
		end: ISODate | undefined;
		
		type: ISOIntervalType;
		get startDate(): Date;
		get endDate(): Date;
		/**
		 * Opinionated function that attempts to figure out the closest date in the interval
		 * @param fromDate optional compare date, kind of required if repeat is present, defaults to now
		 * */
		next(fromDate?: Date): Date | null;
		/**
		 * ISO 8601 interval parser
		 * */
		parse(): ISOInterval;
		consumeRepeat(): string;
		read(): string;
		current(): string;
		peek(): string;
		[kIsParsed]: boolean;
	}
	/**
	 * ISO 8601 date parser
	 * @param source ISO 8601 date time source
	 * @param offset-1] Source column offset
	 * @param endChars Optional end chars
	 * @param enforceSeparatorsfalse] Enforce separators between IS0 8601 parts
	 */
	export function ISODate(source: string, offset?: number | null, endChars?: string | null, enforceSeparators?: boolean): void;
	export class ISODate {
		/**
		 * ISO 8601 date parser
		 * @param source ISO 8601 date time source
		 * @param offset-1] Source column offset
		 * @param endChars Optional end chars
		 * @param enforceSeparatorsfalse] Enforce separators between IS0 8601 parts
		 */
		constructor(source: string, offset?: number | null, endChars?: string | null, enforceSeparators?: boolean);
		source: string;
		
		idx: number;
		enforceSeparators: boolean;
		c: string;
		parsed: string;
		endChars: string;
		
		result: Partial<ISODateParts>;
		toUTCDate(): Date;
		/**
		 * Parse passed source as ISO 8601 date time
		 * */
		parse(): ISODate;
		/**
		 * Parse partial relative date
		 * @param Y Year if year is not defined
		 * @param M JavaScript month if month is not defined
		 * @param D JavaScript date if date is not defined
		 * */
		parsePartialDate(Y: number, M: number, D?: number): ISODate;
		/**
		 * Consume as ISO date
		 * @param Y year
		 * */
		continueDatePrecision(Y: number): ISODate;
		/**
		 * Consume minutes and seconds and so forth
		 * @param H from hour
		 * @param useSeparator time separator
		 * */
		continueTimePrecision(H: number, useSeparator: boolean): ISODate;
		/**
		 * Continue timezone offset parsing
		 * @param instruction timezone offset instruction
		 * */
		continueTimeZonePrecision(instruction: string): ISODate;
		consume(): string;
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
		function parse(source: string, offset?: number): Partial<ISODateParts>;
	}

	export function ISODuration(source: string, offset?: number): void;
	export class ISODuration {
		
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
		parse(): this;
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
		 * Get duration in milliseconds from optional start date
		 * @param startDate start date, defaults to epoch start 1970-01-01T00:00:00Z
		 * @returns duration in milliseconds from start date
		 */
		toMilliseconds(startDate?: Date): number;
		/**
		 * Get duration in milliseconds from optional end date
		 * @param endDate end date, defaults to epoch start 1970-01-01T00:00:00Z
		 * @returns duration in milliseconds from end date
		 */
		untilMilliseconds(endDate?: Date): number;
	}
	export namespace ISODuration {
		/**
		 * Parse ISO 8601 duration string
		 * @param source ISO 8601 duration
		 * @param offset0] Column offset
		 */
		function parse(source: string, offset?: number): Partial<ISOParts>;
	}
	/**
	 * Parse ISO 8601 interval
	 * @param isoInterval ISO 8601 interval
	 * */
	export function parseInterval(isoInterval: string): ISOInterval;
	/**
	 * Parse ISO 8601 duration
	 * @param isoDuration ISO 8601 interval and/or duration
	 * */
	export function parseDuration(isoDuration: string): Partial<ISOParts> | undefined;
	/**
	 * Parse ISO 8601 interval
	 * @param fromDate optional from date, defaults to now
	 * @returns next date point
	 */
	export function next(isoInterval: string, fromDate?: Date): Date | null;
	const kIsParsed: unique symbol;
  interface ISOParts {
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

  enum ISOIntervalType {
	None = 0,
	Repeat = 1,
	StartDate = 2,
	Duration = 4,
	EndDate = 8,
	RepeatAndStartDate = 3,
	RepeatAndDuration = 5,
	StartDateAndDuration = 6,
	RepeatStartAndDuration = 7,
	RepeatAndEndDate = 9,
	StartDateAndEndDate = 10,
	DurationAndEndDate = 12,
	RepeatDurationAndEndDate = 13,
  }
}

//# sourceMappingURL=index.d.ts.map