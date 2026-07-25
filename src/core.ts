import { SQL, select, empty, ColumnMeta, bind, Schema, Columns, t, c } from 'sql-string-ts';
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
    AppendQuery
} from './types.js';
import { WhereBuilder, SelectBuilder } from './builder-types.js'

/**
 * Gera os joins formatados
 * @param joins Joins da tabela
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
 * Gera as colunas das tableas
 * @param columns Colunas das tabelas
 * @returns Fragmentos
 */
const generateColumns = (...columns: Array<ColumnsInput>): Fragment => {
    return generateColumnList( ...normalizeColumns(columns) );
};

/**
 * Gera os filtros de acordo com os campos presentes na tabela. Um array de tabelas pode ser passado. 
 * Obs.: Necessário existir o filters no request
 * @param tables Tabela do modelo
 * @param filters Dados do request
 * @param defaultFilters Objeto com filtros padrões. Ex: {erased:0, active:1}
 * @returns Fragmento
 */
const generateFilters = (tables: Tables, filters?: EnumType, op = '=', config = { prefix: true, quote: true }): Fragment => {
    if (!filters) return empty;

    const fields = Object.keys(filters);

    if (fields.length === 0) return empty;
    
    const t = !Array.isArray(tables) ? [tables] : tables;

    const f = filters;

    const where = t
        .flatMap(table =>
            fields.map(field =>
                Object.prototype.hasOwnProperty.call(table, field)
                    ? SQL`${c(table[field], config)} ${op} ${bind(f[field])}`
                    : empty
            )
        )
        .filter(hasFragment);

    if(where.length === 0) return empty;

    const final = where.reduce( (a, x, i) => a.concat(i > 0 ? SQL` AND ${x}` : x), empty );

    return SQL` ${final}`;
};

/**
 * Gera filtros com os campos desejados a partir de um array. Ideal para campos não presentes no modelo da tabela, mas que cheguem no request.
 * Ex.:'alias1.field1','field2','alias2.field1'
 * @param array Lista de campos desejados
 * @param data Dados do request
 * @returns Fragmento
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
 * Retorna um Fragmento passado. Ex.: SQL` AND alias1.field1 AND alias1.field2`
 * @param rawFilters Fragmento puro.
 * @returns Fragmento
 */
const getRawFilters = (rawFilters = empty): Fragment => {
    return rawFilters;
};


/**
 * 
 * @param table 
 * @param json 
 * @param config 
 * @returns 
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

    return where.strings[0] ? SQL`(${where})` : empty;
}

const generateColumnList = ( ...columns: Array<ColumnMeta<Columns> | Fragment> ): Fragment => {
    const validColumns = columns.filter(hasColumn);

    if(validColumns.length === 0) return empty;

    return validColumns
        .map(column => isFragment(column) ? column : select({as:false}, column) )
        .reduce( (a, column, ix) => a.concat(ix > 0 ? SQL`, ${column}` : column), empty );
};


function groupBy <Columns>( ...columns: Array<ColumnMeta<Columns> | Fragment> ): Fragment {
    return generateColumnList(...columns);
}

/**
 * Gera um sort
 * @param sort Direção do sort
 * @param columns Colunas utilizadas no sort
 * @return Fragment
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
 * Cria paginação para o SQL. Recebe um objeto com start e limit.
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
 * @returns 
 */
const setColumnsInsert = (data: EnumType, table: TableColumns<Columns>): Fragment => {
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
 * Gera os binds do INSERT de acordo com os campos que chegaram e se estão presentes na tabela
 * @param data Dados do request
 * @param table Tabela
 * @returns Fragment
 */
const setBindValuesInsert = (data: EnumType, table: TableColumns<Columns>): Fragment => {
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
 * Gera os binds do UPDATE de acordo com os campos que chegaram e se estão presentes na tabela
 * @param data Dados do request
 * @param table Tabela
 * @returns Fragmento
 */
const setBindValuesUpdate = (data: EnumType, table: TableColumns<Columns>, cfg = { prefix: false, quote: true }): Fragment => {
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
 * Retorna um array de tabelas usadas para compor os joins
 * @param joins Joins
 * @returns Array
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
    tables: Tables
): WhereBuilder<TMainBuilder> => {

    const filterBuilder: WhereBuilder<TMainBuilder> = {
        additional(...fields: Array<string>) {
            fragments.push(additionalFilters(filters,...fields));

            return filterBuilderProxy;
        },

        raw(fragment: Fragment) {
            fragments.push(getRawFilters(fragment));

            return filterBuilderProxy;
        },

        search(data: SearchFilter) {
            fragments.push(searchFilter(tables, data));

            return filterBuilderProxy;
        },

        end(): TMainBuilder {
            const validFragments = fragments.filter(hasFragment);

            if(validFragments.length > 0) {
                const generatedFilters = validFragments.reduce(
                    (a, fragment, index) =>
                        a.concat(index > 0 ? SQL` AND ${fragment}` : fragment),
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
    setColumnsInsert,
    setBindValuesInsert,
    setBindValuesUpdate,
    whereBuilder,
    hasFragment, 
    isFragment,
    builderError, 
    extractTableJoins
};