import { empty, } from 'sql-string-ts';
import type { Schema, Columns, ColumnMeta } from 'sql-string-ts';

type Fragment = typeof empty;

type EnumType = Record<string, string | number>;

type TableColumns<T> = Record<keyof T, ColumnMeta<T>>;

type ColumnInput = Fragment | ColumnMeta<Columns>;

type ColumnsInput = ColumnInput | ColumnInput[];

type AnySchema = Schema<any>;

type Tables = AnySchema | readonly AnySchema[];

type Join = {
    table: Schema<EnumType>;
    primaryKey?: ColumnMeta<EnumType> | Fragment;
    operator?: string;
    join?: string;
    foreignkey: ColumnMeta<EnumType> | Fragment;
    useFindInSet?: boolean;
};

type SearchFilter = {
    property: string;
    value: string | number;
};

type SortColumn = {
    column: ColumnMeta<Columns> | Fragment;
    direction?: 'ASC' | 'DESC';
};

type AppendQuery = (fragment: Fragment) => void;

export type {
    EnumType,
    TableColumns,
    ColumnInput,
    ColumnsInput,
    Join,
    Tables,
    Fragment,
    SearchFilter,
    SortColumn,
    AppendQuery,
    ColumnMeta,
    Columns
};