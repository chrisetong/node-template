import type { CommonColumn } from "./CommonTable.vue";
import type { CommonField } from "./CommonForm.vue";

type SafeParseResult =
  | { success: true; data: any }
  | {
      success: false;
      error: {
        flatten: () => {
          fieldErrors: Record<string, string[] | undefined>;
          formErrors: string[];
        };
      };
    };

export type CrudSchema = {
  safeParse: (value: unknown) => SafeParseResult;
  parse: (value: unknown) => any;
};

export type CrudMessages = {
  createSuccess?: string;
  updateSuccess?: string;
  deleteSuccess?: string;
  saveSuccessTitle?: string;
  deleteSuccessTitle?: string;
};

export type CrudRowAction<
  Row extends Record<string, any> = Record<string, any>,
> = {
  key: string;
  label: string;
  permission?: string;
  variant?: "secondary" | "ghost" | "default";
  openInNewTab?: boolean;
  to?: (row: Row) => {
    path: string;
    query?: Record<string, string | number | boolean>;
  };
  onClick?: (row: Row) => void | Promise<void>;
  confirm?: {
    title?: string;
    message: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
  };
  successMessage?: string;
};

export type AdvancedSearchField =
  | {
      name: string;
      label: string;
      type: "input";
      placeholder?: string;
    }
  | {
      name: string;
      label: string;
      type: "select";
      options: { label: string; value: string | number }[];
    }
  | {
      name: string;
      label: string;
      type: "datetime";
    };

export type AdvancedSearchConfig = {
  fields: AdvancedSearchField[];
  initialModel: () => Record<string, any>;
};

export type GenericCrudMeta<
  Row extends Record<string, any> = Record<string, any>,
> = {
  title: string;
  description?: string;
  columns: CommonColumn[];
  searchFields?: string[];
  validationRules?: string[];
  createPermission?: string;
  deletePermission?: string;
  rowActions?: CrudRowAction<Row>[];
  advancedSearch?: AdvancedSearchConfig;
  formTitleCreate?: string;
  formTitleEdit?: string;
  iconColumnKey?: string;
  valueLabels?: Record<string, Record<string, string>>;
  fields: (ctx: {
    model: Record<string, any>;
    editing: boolean;
  }) => CommonField[];
  schema: CrudSchema;
  initialModel: () => Record<string, any>;
  mapRowToModel: (row: Row) => Record<string, any>;
  load: (
    params: { q: string; page: number; pageSize: number } & Record<string, any>,
  ) => Promise<{ items: Row[]; total: number }>;
  create: (payload: any) => Promise<void>;
  update: (id: number, payload: any) => Promise<void>;
  remove: (row: Row) => Promise<void>;
  messages?: CrudMessages;
};
