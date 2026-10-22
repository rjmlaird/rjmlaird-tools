export type ErrorCode =
  | "invalid_json"
  | "unsupported_media_type"
  | "payload_too_large"
  | "validation_error"
  | "result_not_representable"
  | "method_not_allowed"
  | "not_found"
  | "internal_error";

export type FieldErrorCode =
  | "required"
  | "invalid_type"
  | "not_finite"
  | "not_positive"
  | "unknown_field"
  | "conflict"
  | "unknown_body";

export interface FieldError {
  /** Request field the error refers to; "$" means the whole body. */
  field: string;
  code: FieldErrorCode;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    fields?: FieldError[];
  };
}

export function errorBody(code: ErrorCode, message: string, fields?: FieldError[]): ApiErrorBody {
  return { error: { code, message, ...(fields ? { fields } : {}) } };
}
