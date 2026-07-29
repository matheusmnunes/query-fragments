import { SQL, select, empty, ColumnMeta, bind, Columns, c } from 'sql-string-ts';
import type {
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
    LogicalFilters
} from './types.js';
import { WhereBuilder } from './builder-types.js'

/**
 * 
 * @param joins 
 * @returns Fragment
 */
const generateJoins = (joins: Join[]): Fragment => {
    return joins.length === 0
        ? empty
        : joins.reduce(
            (a, x) => a.concat(x.useFindInSet ? findInSetJoin(x) : defaultJoin(x)), empty
        );
};

const defaultJoin = (x: Join) => {
    return SQL`${x.join ? x.join : ' LEFT JOIN'} ${x.table} ON ${x.primaryKey ? x.primaryKey : x.table.id} ${x.operator ? x.operator : '='} ${x.foreignkey} `
}

const findInSetJoin = (x: Join) => {
    return SQL`${x.join ? x.join : ' LEFT JOIN'} ${x.table} ON FIND_IN_SET(${x.primaryKey ? x.primaryKey : x.table.id}, ${x.foreignkey}) `
}

const normalizeColumns = ( columns: Array<ColumnsInput> ): Array<ColumnInput> => {
    return columns.flat();
};

/**
 * 
 * @param columns 
 * @returns Fragment
 */
const generateColumns = (...columns: Array<ColumnsInput>): Fragment => {
    return generateColumnList( ...normalizeColumns(columns) );
};

/**
 * 
 * @param tables 
 * @param filters 
 * @param op 
 * @param config 
 * @returns Fragment
 */
const generateFilters = (tables: Tables, filters?: EnumType, op:LogicalFilters = {c:'=', l:'AND'}, config = { prefix: true, quote: true }): Fragment => {
    if (!filters) return empty;

    const fields = Object.keys(filters);

    if (fields.length === 0) return empty;
    
    const t = !Array.isArray(tables) ? [tables] : tables;

    const f = filters;

    const where = t
        .flatMap(table =>
            fields.map(field =>
                Object.prototype.hasOwnProperty.call(table, field)
                    ? SQL`${c(table[field], config)} ${op.c} ${bind(f[field])}`
                    : empty
            )
        )
        .filter(hasFragment);

    if(where.length === 0) return empty;

    const final = where.reduce( (a, x, i) => a.concat(i > 0 ? SQL` ${op.l} ${x}` : x), empty );

    return SQL` ${final}`;
};

/**
 * 
 * @param data 
 * @param array 
 * @returns Fragment
 */
const additionalFilters = (data: EnumType | undefined, ...array: Array<string> ): Fragment => {
    if (!data || array.length === 0) return empty;

    const final = array
        .map((x) => {
            const parts = x.split('.');
            const field = parts[parts.length - 1];

            if (!field) return empty;
            
            const value = data[field];
            return value !== undefined ? SQL` ${x} = ${bind(value)}` : empty
        })
        .reduce((a, x, i) => a.concat(x.strings[0] ? x : empty), empty);

    return final.strings[0] ? final : empty;
};

/**
 * 
 * @param rawFilters 
 * @returns Fragment
 */
const getRawFilters = (rawFilters = empty): Fragment => {
    return rawFilters;
};


/**
 * 
 * @param table 
 * @param json 
 * @param config 
 * @returns Fragment
 */
const searchFilter = (tables: Tables, json: SearchFilter, config = { prefix: true, quote: true }):Fragment => {
    if (Object.keys(json).length === 0) return empty

    const tableL  = Array.isArray(tables) ? tables : [tables];
    const filters = json.property.split(',').map(x => x.trim().split('.').pop()!);
    const value   = bind("%" + json.value + "%")

    const where = tableL
        .flatMap((table) => 
            filters
                .filter(x => Object.prototype.hasOwnProperty.call(table, x))
                .map(x => SQL`${c(table[x], config)} LIKE ${value}`)
        )
        .reduce((a, x) => a.concat(a.strings[0] ? SQL` OR ${x}` : x), empty)

    return where.strings[0] ? SQL`${where}` : empty;
}

const generateColumnList = ( ...columns: Array<ColumnMeta<Columns> | Fragment> ): Fragment => {
    const validColumns = columns.filter(hasColumn);

    if(validColumns.length === 0) return empty;

    return validColumns
        .map(column => isFragment(column) ? column : select({as:false}, column) )
        .reduce( (a, column, ix) => a.concat(ix > 0 ? SQL`, ${column}` : column), empty );
};

/**
 * 
 * @param columns 
 * @returns Fragment
 */
function groupBy <Columns>( ...columns: Array<ColumnMeta<Columns> | Fragment> ): Fragment {
    return generateColumnList(...columns);
}

/**
 * 
 * @param sorts 
 * @returns Fragment
 */
const generateSort = (...sorts: SortColumn[]): Fragment => {
    const validSorts = sorts.filter(({ column }) => hasColumn(column));

    if(validSorts.length === 0) return empty;

    return validSorts
        .map(({ column, direction = 'ASC' }) => {
            const generatedColumn = isFragment(column)
                ? column
                : select({as:false}, column);

            return SQL`${generatedColumn} ${direction}`;
        })
        .reduce(
            (a, sort, index) =>
                a.concat(index > 0 ? SQL`, ${sort}` : sort),
            empty
        );
}

/**
 * 
 * @param start 
 * @param limit
 * @return Fragment
 */
const generatePagination = (start:number, limit:number = 10): Fragment => {
    if(start < 0 || limit <= 0) return empty;

    return SQL` ${start}, ${limit}`
}

const colsForInsert = (data: EnumType, table: TableColumns<Columns>): { data: EnumType; columns: ColumnMeta<Columns>[] } => {
    const sanitizedData = { ...data }

    if (sanitizedData.hasOwnProperty('erased')) delete sanitizedData.erased

    const colsForInsert = Object.keys(sanitizedData)
        .map((x) => table[x])
        .filter((x): x is ColumnMeta<Columns> => x !== undefined);

    return {
        data: sanitizedData,
        columns: colsForInsert
    };
}

/**
 * 
 * @param data 
 * @param table 
 * @returns Fragment
 */
const generateColumnsInsert = (data: EnumType, table: TableColumns<Columns>): Fragment => {
    const sanitizedData = { ...data }

    if (sanitizedData.hasOwnProperty('erased')) delete sanitizedData.erased

    const b = colsForInsert(data, table);
    const count = b.columns.length;

    const columnsForInsert = SQL`(`
        .concat(
            b.columns
                .map((x) => SQL`${x}`)
                .reduce((a, x, i) => a.concat(x).concat(i < count - 1 ? ', ' : empty),empty),
        )
        .concat(')');

    return columnsForInsert;
}

/**
 * 
 * @param data 
 * @param table 
 * @returns Fragment
 */
const generateValuesInsert = (data: EnumType, table: TableColumns<Columns>): Fragment => {
    const b = colsForInsert(data, table);
    const count = b.columns.length;

    const bindValuesForInsert = SQL`(`
        .concat(
            b.columns
                .map((x) => SQL`${bind(b.data[x.name])}`)
                .reduce((a, x, i) => a.concat(x).concat(i < count - 1 ? ', ' : empty), empty),
        )
        .concat(')');

    return bindValuesForInsert;
};

/**
 * 
 * @param data 
 * @param table 
 * @param cfg 
 * @returns Fragment
 */
const generateValuesUpdate = (data: EnumType, table: TableColumns<Columns>, cfg = { prefix: false, quote: true }): Fragment => {
    const colsForUpdate = Object.keys(data)
        .map((x) => table[x])
        .filter((x): x is ColumnMeta<Columns> => x !== undefined);

    const count = colsForUpdate.length;

    const bindValuesForUpdate = colsForUpdate
        .map((x) => {
            const value = data[x.name];

            return value !== undefined
            ? SQL`${c(x, cfg)} = ${bind(value)}`
            : empty;
        })
        .reduce((a, x, i) => a.concat(x).concat(i < count - 1 ? SQL`, ` : empty), empty);

    return bindValuesForUpdate;
};

/**
 * 
 * @param joins 
 * @returns Fragment
 */
const extractTableJoins = (joins: Join[]) => {
    return joins.length != 0 ? joins.map((j) => j.table) : [];
};

const builderError = (scope: string, property: string): never => {
    throw new Error(
        `[QueryBuilder] O bloco .${scope}() ainda está aberto. ` +
        `Chame .end() antes de acessar .${property}().`
    );
};

const whereBuilder = <T, TMainBuilder>(
    mainBuilder: TMainBuilder,
    appendQuery: AppendQuery,
    fragments: Fragment[],
    filters: EnumType | undefined,
    tables: Tables,
    cfg: {prefix: boolean, quote: boolean} 
): WhereBuilder<TMainBuilder> => {

    const groups: Array<{ connector?: 'AND' | 'OR'; fragment: Fragment }> = fragments.map(
        (fragment, index) =>
            index > 0
                ? { connector: 'AND', fragment }
                : { fragment }
    );

    const filterBuilder: WhereBuilder<TMainBuilder> = {
        and(filters: EnumType, op: LogicalFilters = {c:'=', l:'OR'}){
            const filtersGenerated = generateFilters(tables, filters, op, cfg);

            if (hasFragment(filtersGenerated)) {
                groups.push({
                    connector: 'AND',
                    fragment: filtersGenerated
                });
            }

            return filterBuilderProxy;
        },

        or(filters: EnumType, op: LogicalFilters = {c:'=', l:'AND'}) {
            const filtersGenerated = generateFilters(tables, filters, op, cfg);

            if (hasFragment(filtersGenerated)) {
                groups.push({
                    connector: 'OR',
                    fragment: filtersGenerated
                });
            }

            return filterBuilderProxy;
        },

        additional(...fields: Array<string>) {
            const fragment = additionalFilters(filters,...fields);

            if (hasFragment(fragment)) {
                groups.push({
                    connector: 'AND',
                    fragment
                });
            }

            return filterBuilderProxy;
        },

        raw(fragment: Fragment) {
            const rawFilters = getRawFilters(fragment);

            if (hasFragment(rawFilters)) {
                groups.push({
                    connector: 'AND',
                    fragment: rawFilters
                });
            }

            return filterBuilderProxy;
        },

        search(data: SearchFilter) {
            const fragment = searchFilter(tables, data);

            if (hasFragment(fragment)) {
                groups.push({
                    connector: 'AND',
                    fragment
                });
            }

            return filterBuilderProxy;
        },

        end(): TMainBuilder {
            const validGroups = groups.filter(({ fragment }) => hasFragment(fragment));

            if(validGroups.length > 0) {
                const generatedFilters = validGroups.reduce(
                    (a, { connector, fragment }, index) =>
                        a.concat(
                            index > 0
                                ? SQL` ${connector ?? 'AND'} (${fragment})`
                                : SQL`(${fragment})`
                        ),
                    empty
                );

                appendQuery(SQL` WHERE ${generatedFilters}`);
            }

            return mainBuilder;
        }
    };

    const filterBuilderProxy = new Proxy(filterBuilder, {
        get(target, property, receiver) {
            if(Reflect.has(target, property)) {
                return Reflect.get(target, property, receiver);
            }

            builderError('where', String(property));
        }
    });

    return filterBuilderProxy;
};

const hasFragment = (fragment: Fragment) =>
    fragment.strings.some(x => x.length > 0);

const hasColumn = (column: ColumnMeta<Columns> | Fragment) =>
    !('strings' in column) || hasFragment(column);

const isFragment = (value: TableColumns<Columns> |ColumnMeta<Columns> | Fragment): value is Fragment => {
    return Array.isArray((value as Fragment).strings);
};

export {
    generateColumns,
    generateJoins,
    generateFilters,
    additionalFilters,
    getRawFilters,
    groupBy,
    generateSort,
    generatePagination,
    generateColumnsInsert,
    generateValuesInsert,
    generateValuesUpdate,
    whereBuilder,
    hasFragment, 
    isFragment,
    builderError, 
    extractTableJoins
};
