
export type Status = 'Pending' | 'In Progress' | 'Completed' | 'Overdue' | 'Drop' | 'On Proses' | 'DONE' | 'Hold' | 'Cancel';

export interface Job {
  id: string;
  category: string;
  subCategory: string;
  dateInput: string;
  branchDept: string;
  jobType: string; // Used as "Deskripsi" or "Subject Email" in new reports
  status: Status;
  deadline: string; // Used as "Tanggal Update" for Email Masuk
  activationDate?: string;
  keterangan?: string;
  notes?: string;
  createdBy?: string;
  
  // New flexible field for Report Surat specific data
  customData?: {
    // Common / Email Masuk
    picUser?: string;
    jenisPengajuan?: string;
    picRepd?: string;
    
    // Disposisi & Internal Memo Common
    nomorSurat?: string; // No Disposisi / No Internal Memo
    klasifikasi?: string;
    
    // Checkboxes (Stored as simple booleans)
    approvals?: {
        headDept?: boolean;
        headDiv?: boolean;
        regional?: boolean;
        vp?: boolean;
        bod?: boolean;
    };
    
    documents?: {
        softCopy?: boolean;
        hardCopy?: boolean;
        lampiran?: boolean; // Disposisi only
        link?: string; // Internal Memo (This is text, not bool)
    };
    
    socialization?: {
        cabang?: boolean;
        it?: boolean;
    };
  };
}

export interface CompetitorRow {
    id: string;
    regional: string;
    origin: string;
    destination: string;
    weight: number;
    
    // Regular
    jneRegPrice: number;
    jneRegSla: string;
    jntEzPrice: number;
    jntEzSla: string;
    lionRegPrice: number;
    lionRegSla: string;
    sicepatRegPrice: number;
    sicepatRegSla: string;

    // Cargo/Trucking
    jneJtrPrice: number;
    jneJtrSla: string;
    jntCargoPrice: number;
    jntCargoSla: string;
    lionBigPrice: number;
    lionBigSla: string;
    wahanaCargoPrice: number;
    wahanaCargoSla: string;
}

export interface MenuItem {
  name: string;
  submenus: string[];
}

export interface MenuStructure {
  [key: string]: MenuItem;
}

export type ViewMode = 'dashboard' | 'category';

export type UserRole = 'Admin' | 'User';

export interface User {
  email: string;
  name: string;
  role: UserRole;
  password?: string;
}

export interface ValidationLog {
  id: string;
  timestamp: string;
  user: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'BULK_IMPORT' | 'RESET_PASSWORD' | 'VALIDATION';
  description: string;
  category?: string;
}

export type ValidationCategory = 'TARIF' | 'BIAYA';

export interface ValidationDetail {
    column: string;
    itValue: string | number;
    masterValue: string | number;
    isMatch: boolean;
}

export interface ValidationMismatch {
    rowId: number;
    reasons: string[];
    details: ValidationDetail[];
}

export interface FullValidationRow {
    origin: string;
    dest: string;
    sysCode: string;
    
    // Tarif Fields
    serviceMaster: string;
    tarifMaster: number;
    slaFormMaster: number;
    slaThruMaster: number;
    serviceIT: string;
    tarifIT: number;
    slaFormIT: number;
    slaThruIT: number;

    // Biaya Fields
    bpMaster?: number;
    bpNextMaster?: number;
    btMaster?: number;
    bdMaster?: number;
    bdNextMaster?: number;
    
    bpIT?: number;
    bpNextIT?: number;
    btIT?: number;
    bdIT?: number;
    bdNextIT?: number;

    keterangan: string;
}

export interface ValidationResult {
    totalRows: number;
    matches: number;
    blanks: number;
    mismatches: ValidationMismatch[];
    fullReport: FullValidationRow[];
}

export interface ValidationHistoryItem {
    id: string;
    timestamp: string;
    fileNameIT: string;
    fileNameMaster: string;
    result: ValidationResult;
    category: ValidationCategory;
}
