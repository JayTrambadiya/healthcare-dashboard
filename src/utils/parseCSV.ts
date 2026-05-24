import Papa from "papaparse";

export interface ParseResult {
  data: Array<Record<string, string | number | boolean | null>>;
  headers: string[];
}

export interface ChunkResult {
  data: Array<Record<string, string | number | boolean | null>>;
  errors: Papa.ParseError[];
  pageNumber: number;
}

/**
 * Parse CSV file with chunked processing and web workers
 * @param file - CSV file to parse
 * @param onChunk - Callback fired for each chunk
 * @param onComplete - Callback when parsing completes
 * @param onError - Callback when error occurs
 */

export const parseCSVWithChunks = (
    file: File,
    onChunk?: (result: ChunkResult) => void| Promise<void>,
    onComplete?: (result: ParseResult) => void,
    onError?: (error: string) => void,
): void => {
  const allData: Array<Record<string, string | number | boolean | null>> = [];
  let headers: string[] = [];
  let chunkCount = 0;
  let headersParsed = false;

  Papa.parse(file, {
    // Config for chunked parsing
    chunk: (results,parser) => {
      chunkCount++;

      // Extract headers from first chunk
      if (!headersParsed && results.data && results.data.length > 0) {
        const firstRow = results.data[0] || {};
        if (Array.isArray(firstRow)) {
          headers = firstRow as string[];
        } else if (typeof firstRow === "object") {
          headers = Object.keys(firstRow);
        }
        headersParsed = true;
      }

      // Convert results to array of objects with headers
      const chunkObjects = results.data.map((row: any) => {
        if (Array.isArray(row)) {
          return headers.reduce(
              (obj, header, index) => {
                obj[header] = row[index] ?? null;
                return obj;
              },
              {} as Record<string, string | number | boolean | null>,
          );
        }
        return row;
      });

      allData.push(...chunkObjects);

      // Fire chunk callback for progress tracking
      if (onChunk) {
        parser.pause();
        Promise.resolve(onChunk({
          data: chunkObjects,
          errors: results.errors,
          pageNumber: chunkCount,
        })).then(() => parser.resume())          // ← resume after IDB write done
            .catch(() => parser.abort());
      }
    },


    // Skip empty lines
    skipEmptyLines: true,

    // Use header row
    header: true,

    // Dynamically determine delimiter
    delimiter: "",

    // Max chunk size (in bytes) - adjust based on memory constraints
    chunkSize: 1 * 512 * 1024, // 512KB chunks


    dynamicTyping: true,// auto-converts "123" → 123, "true" → true

    // Callbacks
    complete: () => {
      if (onComplete) {
        onComplete({
          data: allData as Array<
              Record<string, string | number | boolean | null>
          >,
          headers: headers,
        });
      }
    },

    error: (error) => {
      const errorMessage = `CSV parsing failed: ${error.message}`;
      if (onError) onError(errorMessage);
    },
  });
};
