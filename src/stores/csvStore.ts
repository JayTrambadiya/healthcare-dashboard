import { makeObservable, observable, action, computed } from "mobx";

export class CsvStoreClass {
  csvFile: File | null = null;
  csvHeaders: string[] = [];
  columnTypes: Record<string, string> = {};
  parseError: string | null = null;
  isLoading = false;

  totalRows = 0;
  isDbReady = false;
  gridKey = 0;

  currentStep = 0;

  uploadProgress = 0;
  uploadError: string | null = null;
  s3Url: string | null = null;
  isGenerating = false;

  constructor() {
    makeObservable(this, {
      csvFile: observable,
      csvHeaders: observable,
      columnTypes: observable,
      parseError: observable,
      isLoading: observable,
      totalRows: observable,
      isDbReady: observable,
      gridKey: observable,
      currentStep: observable,
      uploadProgress: observable,
      uploadError: observable,
      s3Url: observable,
      isGenerating: observable,

      setCSVFile: action,
      setCsvHeaders: action,
      setColumnTypes: action,
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
      setIsGenerating: action,
      nextStep: action,
      previousStep: action,
      goToStep: action,
      resetStore: action,

      rowCount: computed,
      hasData: computed,
    });
  }

  setCSVFile(file: File | null) {
    this.csvFile = file;
  }

  setCsvHeaders(headers: string[]) {
    this.csvHeaders = headers;
  }

  setColumnTypes(types: Record<string, string>) {
    this.columnTypes = types;
  }

  setParseError(error: string | null) {
    this.parseError = error;
  }

  setIsLoading(value: boolean) {
    this.isLoading = value;
  }

  setTotalRows(count: number) {
    this.totalRows = count;
  }

  incrementTotalRows(by: number) {
    this.totalRows += by;
  }

  decrementTotalRows(by = 1) {
    this.totalRows = Math.max(0, this.totalRows - by);
  }

  setIsDbReady(value: boolean) {
    this.isDbReady = value;
  }

  refreshGrid() {
    this.gridKey += 1;
  }

  setUploadProgress(progress: number) {
    this.uploadProgress = Math.max(0, Math.min(100, progress));
  }

  setUploadError(error: string | null) {
    this.uploadError = error;
  }

  setS3Url(url: string | null) {
    this.s3Url = url;
  }

  setIsGenerating(value: boolean) {
    this.isGenerating = value;
  }

  nextStep() {
    if (this.currentStep < 2) this.currentStep += 1;
  }

  previousStep() {
    if (this.currentStep > 0) this.currentStep -= 1;
  }

  goToStep(step: number) {
    this.currentStep = Math.max(0, Math.min(2, step));
  }

  resetStore() {
    this.csvFile = null;
    this.csvHeaders = [];
    this.columnTypes = {};
    this.parseError = null;
    this.isLoading = false;
    this.totalRows = 0;
    this.isDbReady = false;
    this.gridKey = 0;
    this.currentStep = 0;
    this.uploadProgress = 0;
    this.uploadError = null;
    this.s3Url = null;
    this.isGenerating = false;
  }

  get rowCount() {
    return this.totalRows;
  }

  get hasData() {
    return this.isDbReady && this.totalRows > 0;
  }
}

export const csvStore = new CsvStoreClass();
