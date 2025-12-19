
export type Status = 'Pending' | 'In Progress' | 'Completed' | 'Overdue' | 'Drop' | 'On Proses' | 'DONE' | 'Hold' | 'Cancel';

export interface Job {
  id: string;
  category: string;
  subCategory: string;
  dateInput: string;
  branchDept: string;
  jobType: string;
  status: Status;
  deadline: string;
  activationDate?: string;
  keterangan?: string;
  notes?: string;
  createdBy?: string;
  
  // Field untuk validasi sesuai gambar di menu Penyesuaian
  konfirmasiCabang?: boolean;
  disposisi?: boolean;
  approve?: boolean;

  customData?: {
    picUser?: string;
    jenisPengajuan?: string;
    picRepd?: string;
    nomorSurat?: string;
    klasifikasi?: string;
    tanggalUpdate?: string;
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
        lampiran?: boolean;
        linkAktifasi?: boolean;
        linkUrl?: string;
    };
    socialization?: {
        cabang?: boolean;
        it?: boolean;
    };
    // Field baru untuk Produksi Master Data
    masterDataSources?: {
        server?: boolean;
        it?: boolean;
        others?: boolean;
        othersText?: string;
    };
  };
}

export interface CompetitorRow {
    id: string;
    regional: string;
    origin: string;
    destination: string;
    weight: number;
    jneRegPrice: number;
    jneRegSla: string;
    jntEzPrice: number;
    jntEzSla: string;
    lionRegPrice: number;
    lionRegSla: string;
    sicepatRegPrice: number;
    sicepatRegSla: string;
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
    serviceMaster: string;
    tarifMaster: number;
    slaFormMaster: number;
    slaThruMaster: number;
    serviceIT: string;
    tarifIT: number;
    slaFormIT: number;
    slaThruIT: number;
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
