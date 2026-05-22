// import { makeObservable, observable, action, computed } from "mobx";

// /**
//  * CSV Upload Store - Centralized MobX state management for CSV upload workflow
//  * Manages: parsed data, current step, upload progress, errors, and final S3 URL
//  */

// export interface CsvRow {
//   [key: string]: string | number | boolean | null;
// }

// export interface CsvState {
//   csvData: CsvRow[];
//   originalCsvData: CsvRow[];
//   currentStep: number;
//   uploadProgress: number;
//   parseError: string | null;
//   uploadError: string | null;
//   isLoading: boolean;
// }

// class csvStoreClass {
//   csvFile: File | null = null;
//   csvData: CsvRow[] = [];
//   currentStep: number = 0;
//   uploadProgress: number = 0;
//   parseError: string | null = null;
//   uploadError: string | null = null;
//   isLoading: boolean = false;
//   s3Url: string | null = null;
//   csvHeaders: string[] = [];

//   constructor() {
//     makeObservable(this, {
//       // Observables
//       csvFile: observable,
//       csvData: observable.shallow,
//       currentStep: observable,
//       uploadProgress: observable,
//       parseError: observable,
//       uploadError: observable,
//       isLoading: observable,
//       s3Url: observable,
//       csvHeaders: observable,

//       // Actions
//       setCsvData: action,
//       setCurrentStep: action,
//       setUploadProgress: action,
//       setParseError: action,
//       setUploadError: action,
//       setIsLoading: action,
//       setS3Url: action,
//       setCsvHeaders: action,
//       updateRow: action,
//       deleteRow: action,
//       resetStore: action,
//       nextStep: action,
//       previousStep: action,
//       goToStep: action,

//       // Computed
//       rowCount: computed,
//     });
//   }

//   /**
//    * Set parsed CSV data and store original for comparison
//    */
//   setCsvData(data: CsvRow[]) {
//     this.csvData = data;
//   }

//   setCSVFile(file: File | null) {
//     this.csvFile = file;
//   }
//   /**
//    * Set current step in stepper
//    */
//   setCurrentStep(step: number) {
//     this.currentStep = Math.max(0, Math.min(step, 2)); // Clamp between 0-2
//   }

//   /**
//    * Update upload progress (0-100)
//    */
//   setUploadProgress(progress: number) {
//     this.uploadProgress = Math.max(0, Math.min(progress, 100));
//   }

//   /**
//    * Set parse error message
//    */
//   setParseError(error: string | null) {
//     this.parseError = error;
//   }

//   /**
//    * Set upload error message
//    */
//   setUploadError(error: string | null) {
//     this.uploadError = error;
//   }

//   /**
//    * Set loading state
//    */
//   setIsLoading(loading: boolean) {
//     this.isLoading = loading;
//   }

//   /**
//    * Set final S3 URL after successful upload
//    */
//   setS3Url(url: string | null) {
//     this.s3Url = url;
//   }

//   /**
//    * Set CSV headers extracted from first row
//    */
//   setCsvHeaders(headers: string[]) {
//     this.csvHeaders = headers;
//   }

//   /**
//    * Update a specific cell in a row
//    */
//   updateRow(rowIndex: number, updates: Partial<CsvRow>) {
//     if (rowIndex >= 0 && rowIndex < this.csvData.length) {
//       this.csvData[rowIndex] = {
//         ...this.csvData[rowIndex],
//         ...updates,
//       };
//       // Ensure reactivity by creating new array
//     }
//   }

//   /**
//    * Delete a row by index
//    */
//   deleteRow(rowIndex: number) {
//     if (rowIndex >= 0 && rowIndex < this.csvData.length) {
//       this.csvData.splice(rowIndex, 1);
//     }
//   }

//   /**
//    * Navigate to next step
//    */
//   nextStep() {
//     console.log(this.currentStep);
//     if (this.currentStep < 2) {
//       this.currentStep++;
//     }
//   }

//   /**
//    * Navigate to previous step
//    */
//   previousStep() {
//     console.log(this.currentStep);
//     if (this.currentStep > 0) {
//       this.currentStep--;
//     }
//   }

//   /**
//    * Navigate to specific step
//    */
//   goToStep(step: number) {
//     this.setCurrentStep(step);
//   }

//   /**
//    * Reset entire store to initial state
//    */
//   resetStore() {
//     this.csvFile = null;
//     this.csvData = [];
//     this.currentStep = 0;
//     this.uploadProgress = 0;
//     this.parseError = null;
//     this.uploadError = null;
//     this.isLoading = false;
//     this.s3Url = null;
//     this.csvHeaders = [];
//   }

//   /**
//    * Get current row count
//    */
//   get rowCount(): number {
//     return this.csvData.length;
//   }
// }

// // Create singleton instance
// export const csvStore = new csvStoreClass();

/**
 * csvStore.ts  (updated)
 * ─────────────────────────────────────────────────────────────────
 * MobX store holds ONLY UI metadata.
 * All row data lives in IndexedDB via csvService.ts.
 *
 * Removed:  csvData, originalCsvData  (were the RAM killers)
 * Added:    totalRows, isDbReady, gridKey (force AG Grid refresh)
 */

import { makeObservable, observable, action, computed } from "mobx";

export class CsvStoreClass {
  // ── File & parsing ──────────────────────────────────────────────
  csvFile: File | null = null;
  csvHeaders: string[] = [];
  parseError: string | null = null;
  isLoading: boolean = false;

  // ── Row metadata (counts only — no actual row data in RAM) ──────
  totalRows: number = 0; // kept in sync after each chunk / delete
  isDbReady: boolean = false; // true once first chunk committed to IDB

  // ── Grid refresh token ──────────────────────────────────────────
  // Increment this to force AG Grid to re-run getRows from scratch
  // (e.g. after a delete or external filter change)
  gridKey: number = 0;

  // ── Stepper ─────────────────────────────────────────────────────
  currentStep: number = 0;

  // ── Upload ──────────────────────────────────────────────────────
  uploadProgress: number = 0;
  uploadError: string | null = null;
  s3Url: string | null = null;

  constructor() {
    makeObservable(this, {
      csvFile: observable,
      csvHeaders: observable,
      parseError: observable,
      isLoading: observable,
      totalRows: observable,
      isDbReady: observable,
      gridKey: observable,
      currentStep: observable,
      uploadProgress: observable,
      uploadError: observable,
      s3Url: observable,

      setCSVFile: action,
      setCsvHeaders: action,
      setParseError: action,
      setIsLoading: action,
      setTotalRows: action,
      incrementTotalRows: action,
      decrementTotalRows: action,
      setIsDbReady: action,
      refreshGrid: action,
      setUploadProgress: action,
      setUploadError: action,
      setS3Url: action,
      nextStep: action,
      previousStep: action,
      goToStep: action,
      resetStore: action,

      rowCount: computed,
      hasData: computed,
    });
  }

  // ── File & parse actions ────────────────────────────────────────

  setCSVFile(file: File | null) {
    this.csvFile = file;
  }
  setCsvHeaders(headers: string[]) {
    this.csvHeaders = headers;
  }
  setParseError(error: string | null) {
    this.parseError = error;
  }
  setIsLoading(v: boolean) {
    this.isLoading = v;
  }

  // ── Row count actions ───────────────────────────────────────────

  setTotalRows(n: number) {
    this.totalRows = n;
  }
  incrementTotalRows(by: number) {
    this.totalRows += by;
  }
  decrementTotalRows(by = 1) {
    this.totalRows = Math.max(0, this.totalRows - by);
  }

  setIsDbReady(v: boolean) {
    this.isDbReady = v;
  }

  // ── Grid refresh ────────────────────────────────────────────────
  // Call after any write that should invalidate the visible grid rows.

  refreshGrid() {
    this.gridKey++;
  }

  // ── Upload actions ──────────────────────────────────────────────

  setUploadProgress(p: number) {
    this.uploadProgress = Math.max(0, Math.min(100, p));
  }
  setUploadError(e: string | null) {
    this.uploadError = e;
  }
  setS3Url(url: string | null) {
    this.s3Url = url;
  }

  // ── Stepper ─────────────────────────────────────────────────────

  nextStep() {
    if (this.currentStep < 2) this.currentStep++;
  }
  previousStep() {
    if (this.currentStep > 0) this.currentStep--;
  }
  goToStep(step: number) {
    this.currentStep = Math.max(0, Math.min(2, step));
  }

  // ── Reset ────────────────────────────────────────────────────────

  resetStore() {
    this.csvFile = null;
    this.csvHeaders = [];
    this.parseError = null;
    this.isLoading = false;
    this.totalRows = 0;
    this.isDbReady = false;
    this.gridKey = 0;
    this.currentStep = 0;
    this.uploadProgress = 0;
    this.uploadError = null;
    this.s3Url = null;
  }

  // ── Computed ─────────────────────────────────────────────────────

  get rowCount() {
    return this.totalRows;
  }
  get hasData() {
    return this.isDbReady && this.totalRows > 0;
  }
}

export const csvStore = new CsvStoreClass();
