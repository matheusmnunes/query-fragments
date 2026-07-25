import type {
    ColumnMeta,
    Columns,
    ColumnsInput,
    EnumType,
    Fragment,
    Join,
    SortColumn,
    TableColumns,
    Tables,
    SearchFilter
} from './types.js';

export type SelectBuilder = {
    select(...columns: ColumnsInput[]): SelectBuilder;
    from(table: TableColumns<Columns> | Fragment): SelectBuilder;
    joins(joins?: Join[]): SelectJoinBuilder;

    where<T>(
        tables: Tables,
        filters?: EnumType,
        op?: string
    ): WhereBuilder<SelectBuilder>;

    having(fragment: Fragment): SelectBuilder;
    groupBy(...columns: Array<ColumnMeta<Columns> | Fragment>): SelectBuilder;
    sort(...sorts: SortColumn[]): SelectBuilder;
    pagination(start?: number, limit?: number): SelectBuilder;
    build(): Fragment;
};

export type SelectJoinBuilder = {
    raw(fragment: Fragment): SelectJoinBuilder;
    end(): SelectBuilder;
};

export type WhereBuilder<TMainBuilder> = {
    additional(...fields: string[]): WhereBuilder<TMainBuilder>;
    raw(fragment: Fragment): WhereBuilder<TMainBuilder>;
    search(data: SearchFilter): WhereBuilder<TMainBuilder>;
    end(): TMainBuilder;
};

export type InsertBuilder = {
    into(table: TableColumns<Columns>): InsertBuilder;
    values(data: EnumType): InsertBuilder;
    build(): Fragment;
};

export type UpdateBuilder = {
    table(table: TableColumns<Columns>): UpdateBuilder;
    set(data: EnumType): UpdateBuilder;
    where(filters: EnumType, op?: string): WhereBuilder<UpdateBuilder>;
    build(): Fragment;
};