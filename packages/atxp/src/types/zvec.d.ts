declare module '@zvec/zvec' {
  export const ZVecDataType: {
    STRING: number;
    BOOL: number;
    INT32: number;
    INT64: number;
    UINT32: number;
    UINT64: number;
    FLOAT: number;
    DOUBLE: number;
    VECTOR_FP16: number;
    VECTOR_FP32: number;
    VECTOR_FP64: number;
    VECTOR_INT8: number;
    SPARSE_VECTOR_FP16: number;
    SPARSE_VECTOR_FP32: number;
    ARRAY_STRING: number;
    ARRAY_BOOL: number;
    ARRAY_INT32: number;
    ARRAY_INT64: number;
    ARRAY_UINT32: number;
    ARRAY_UINT64: number;
    ARRAY_FLOAT: number;
    ARRAY_DOUBLE: number;
  };

  export const ZVecIndexType: {
    FLAT: number;
    HNSW: number;
    IVF: number;
  };

  export interface ZVecFieldSchema {
    readonly name: string;
    readonly dataType: number;
    readonly nullable?: boolean;
    readonly indexParams?: Record<string, unknown>;
  }

  export interface ZVecVectorSchema {
    readonly name: string;
    readonly dataType: number;
    readonly dimension?: number;
    readonly indexParams?: { type: number; [key: string]: unknown };
  }

  export class ZVecCollectionSchema {
    constructor(params: {
      name: string;
      vectors: ZVecVectorSchema | ZVecVectorSchema[];
      fields?: ZVecFieldSchema | ZVecFieldSchema[];
    });
    readonly name: string;
    field(fieldName: string): ZVecFieldSchema;
    vector(vectorName: string): ZVecVectorSchema;
    fields(): ZVecFieldSchema[];
    vectors(): ZVecVectorSchema[];
  }

  export interface ZVecDocInput {
    id: string;
    vectors?: Record<string, number[] | Float32Array>;
    fields?: Record<string, unknown>;
  }

  export interface ZVecDoc {
    readonly id: string;
    readonly vectors: Record<string, number[] | Float32Array>;
    readonly fields: Record<string, unknown>;
    readonly score: number;
  }

  export interface ZVecQuery {
    fieldName?: string;
    topk?: number;
    vector?: number[] | Float32Array;
    filter?: string;
    includeVector?: boolean;
    outputFields?: string[];
    params?: Record<string, unknown>;
  }

  export interface ZVecStatus {
    id: string;
    success: boolean;
    message?: string;
  }

  export interface ZVecCollectionOptions {
    [key: string]: unknown;
  }

  export interface ZVecOptimizeOptions {
    [key: string]: unknown;
  }

  export class ZVecCollection {
    readonly path: string;
    readonly schema: ZVecCollectionSchema;
    readonly stats: { docCount: number; indexCompleteness: Record<string, number> };
    insertSync(docs: ZVecDocInput | ZVecDocInput[]): ZVecStatus | ZVecStatus[];
    upsertSync(docs: ZVecDocInput | ZVecDocInput[]): ZVecStatus | ZVecStatus[];
    updateSync(docs: ZVecDocInput | ZVecDocInput[]): ZVecStatus | ZVecStatus[];
    deleteSync(ids: string | string[]): ZVecStatus | ZVecStatus[];
    deleteByFilterSync(filter: string): ZVecStatus;
    querySync(params: ZVecQuery): ZVecDoc[];
    fetchSync(ids: string | string[]): Record<string, ZVecDoc>;
    optimizeSync(options?: ZVecOptimizeOptions): void;
    closeSync(): void;
    destroySync(): void;
  }

  export function ZVecCreateAndOpen(
    path: string,
    schema: ZVecCollectionSchema,
    options?: ZVecCollectionOptions
  ): ZVecCollection;

  export function ZVecOpen(
    path: string,
    options?: ZVecCollectionOptions
  ): ZVecCollection;
}
