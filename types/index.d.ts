declare module 'piso' {
	/**
	 * ISO 8601 interval parser
	 * */
	export function ISOInterval(source: string): void;
	export class ISOInterval {
		/**
		 * ISO 8601 interval parser
		 * */
		constructor(source: string);
		source: string;
		c: string;
		parsed: string;
		idx: number;
		repeat: number;
		
		start: Partial<ISODateParts> | undefined;
		
		duration: Partial<ISOParts> | undefined;
		
		end: Partial<ISODateParts> | undefined;
		/**
		 * ISO 8601 interval next run
		 * @param startDate optional start date
		 * */
		next(startDate?: Date | undefined): Date | null;
		/**
		 * ISO 8601 interval parser
		 * */
		parse(): ISOInterval;
		consumeRepeat(): string | undefined;
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
	export function ISODateParser(source: string, offset?: number | null | undefined, endChars?: string | null | undefined, enforceSeparators?: boolean | undefined): void;
	export class ISODateParser {
		/**
		 * ISO 8601 date parser
		 * @param source ISO 8601 date time source
		 * @param offset-1] Source column offset
		 * @param endChars Optional end chars
		 * @param enforceSeparatorsfalse] Enforce separators between IS0 8601 parts
		 */
		constructor(source: string, offset?: number | null | undefined, endChars?: string | null | undefined, enforceSeparators?: boolean | undefined);
		source: string;
		
		idx: number;
		enforceSeparators: boolean;
		c: string;
		parsed: string;
		endChars: string | null;
		
		result: Partial<ISODateParts>;
		/**
		 * Parse passed source as ISO 8601 date time
		 * */
		parse(): ISODateParser;
		/**
		 * Parse partial relative date
		 * @param Y Year if year is not defined
		 * @param M JavaScript month if month is not defined
		 * */
		parsePartialDate(Y: number, M: number): ISODateParser;
		/**
		 * Consume as ISO date
		 * @param Y year
		 * */
		continueDatePrecision(Y: number): ISODateParser;
		/**
		 * Consume minutes and seconds and so forth
		 * @param H from hour
		 * @param useSeparator time separator
		 * */
		continueTimePrecision(H: number, useSeparator: boolean): ISODateParser;
		/**
		 * Continue timezone offset parsing
		 * @param instruction timezone offset instruction
		 * */
		continueISOTimeZonePrecision(instruction: string): ISODateParser;
		consume(): string;
		consumeChar(valid?: string): string;
		peek(): string;
		/**
		 * Consume char or end
		 * @param valid Valid chars, defaults to 0-9
		 * */
		consumeCharOrEnd(valid?: string | undefined): string | undefined;
		createUnexpectedError(): RangeError;
	}
	export namespace ISODateParser {
		/**
		 * Parse ISO 8601 date string
		 * @param source ISO 8601 duration
		 * @param offset source column offset
		 */
		function parse(source: string, offset?: number | null | undefined): Partial<ISODateParts>;
	}

	export function ISODurationParser(source: string, offset?: number | undefined): void;
	export class ISODurationParser {
		
		constructor(source: string, offset?: number | undefined);
		source: string;
		idx: number;
		type: string;
		parsed: string;
		
		entity: keyof ISOParts | undefined;
		value: string;
		usedFractions: boolean;
		entities: string;
		
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
		 * Set duration entity type and value
		 * */
		setEntity(entity: string, value: string): void;
		/**
		 * Parse completed, no more chars
		 * @param column Current column
		 */
		end(column: number): void;
	}
	export namespace ISODurationParser {
		/**
		 * Parse ISO 8601 duration string
		 * @param source ISO 8601 duration
		 * @param offset0] Column offset
		 */
		function parse(source: string, offset?: number | undefined): Partial<ISOParts>;
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
	 * @returns next date point
	 */
	export function next(isoInterval: string): Date | null;
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
  }

  interface ISODateParts extends ISOParts {
	/** Timezone offset char */
	Z?: string;
	/** Hours offset */
	OH?: number;
	/** Minutes offset */
	Om?: number;
  }
}

//# sourceMappingURL=index.d.ts.map