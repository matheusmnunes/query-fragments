import { SQL, empty, Columns, t } from 'sql-string-ts';
import type { 
    EnumType, TableColumns, Fragment, Join, ColumnsInput, Tables, ColumnMeta,
    SortColumn 
} from './types.js';
import {
    generateFilters, generateColumns, generateJoins, whereBuilder, hasFragment, isFragment,
    builderError, extractTableJoins, groupBy, generateSort, generatePagination
} from './core.js'

export const selectBuilder = (cfg = { alias: true, quote: true }) => {
    let query        = empty;
    let currentJoins: Join[] = [];
    const alias = cfg.alias;
    const quote = cfg.quote;
    const prefix = cfg.alias;

    const mainBuilder = {
        select(...columns: Array<ColumnsInput>) {
            const generatedColumns = generateColumns(...columns);

            if(!hasFragment(generatedColumns)) {
                throw new Error(
                    '[QueryBuilder] O método .select() deve receber ao menos uma coluna válida.'
                );
            }

            query = query.concat(SQL`SELECT ${generatedColumns}`);

            return mainBuilder;
        },

        from(table: TableColumns<Columns> | Fragment) {
            query = query.concat(SQL` FROM ${isFragment(table) ? table : t(table, {alias, quote})} `);

            return mainBuilder;
        },

        joins(joins: Join[] = []) {
            const rawJoins: Fragment[] = [];

            currentJoins = joins;

            const joinBuilder = {
                raw(fragment: Fragment) {
                    if(hasFragment(fragment)) {
                        rawJoins.push(fragment);
                    }
                
                    return joinBuilderProxy;
                },
            
                end() {
                    query = query.concat(generateJoins(currentJoins));
                
                    rawJoins.forEach(fragment => {
                        query = query.concat(fragment);
                    });
                
                    return mainBuilder;
                }
            };
        
            const joinBuilderProxy = new Proxy(joinBuilder, {
                get(target, property, receiver) {
                    if(Reflect.has(target, property)) {
                        return Reflect.get(target, property, receiver);
                    }
                
                    builderError('joins', String(property));
                }
            });
        
            return joinBuilderProxy;
        },

        where<T>( tables: Tables<T>, filters?: EnumType, op = '=') {
            const fragments: Fragment[] = [];
            const config = { prefix, quote }

            fragments.push(generateFilters(tables, filters, op, config));
            fragments.push(
                generateFilters(
                    extractTableJoins(currentJoins),
                    filters,
                    op,
                    config
                )
            );

            return whereBuilder(
                mainBuilder,
                fragment => query = query.concat(fragment),
                fragments,
                filters,
                tables
            );
        },

        having(f:Fragment){
            
            if(f.strings[0])
                query = query.concat(SQL` HAVING ${f}`)

            return mainBuilder;
        },

        groupBy(...columns: Array<ColumnMeta<Columns> | Fragment>) {
            const generatedGroupBy = groupBy(...columns);

            if(generatedGroupBy.strings[0]) {
                query = query.concat(SQL` GROUP BY ${generatedGroupBy}`);
            }

            return mainBuilder;
        },

        sort(...sorts: SortColumn[]) {
            const generatedSort = generateSort(...sorts);

            if(hasFragment(generatedSort)) {
                query = query.concat(SQL` ORDER BY ${generatedSort}`);
            }
        
            return mainBuilder;
        },

        pagination(start = 0, limit = 10) {
            const generatedPagination = generatePagination( start, limit );

            if(generatedPagination.strings[0]) {
                query = query.concat(SQL` LIMIT ${generatedPagination}`);
            }

            return mainBuilder;
        },

        build() {
            return query;
        }
    };

    return mainBuilder;
}