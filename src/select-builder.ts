import { SQL, empty, Columns, t, Schema } from 'sql-string-ts';
import type { 
    EnumType, TableColumns, Fragment, Join, ColumnsInput, Tables, ColumnMeta,
    SortColumn, LogicalFilters
} from './types.js';
import {
    generateFilters, generateColumns, generateJoins, whereBuilder, hasFragment, isFragment,
    builderError, extractTableJoins, groupBy, generateSort, generatePagination
} from './core.js'

import type { SelectBuilder, SelectJoinBuilder, WhereBuilder
} from './builder-types.js';


export const selectBuilder = (cfg = { alias: true, quote: true }):SelectBuilder => {
    let query        = empty;
    let currentJoins: Join[] = [];
    const alias = cfg.alias;
    const quote = cfg.quote;
    const prefix = cfg.alias;

    const mainBuilder: SelectBuilder = {
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

        from(table: TableColumns<Columns> | Fragment):SelectBuilder {
            query = query.concat(SQL` FROM ${isFragment(table) ? table : t(table, {alias, quote})} `);

            return mainBuilder;
        },

        joins(joins: Join[] = []): SelectJoinBuilder {
            const rawJoins: Fragment[] = [];

            currentJoins = joins;

            const joinBuilder: SelectJoinBuilder = {
                raw(fragment: Fragment) {
                    if(hasFragment(fragment)) {
                        rawJoins.push(fragment);
                    }
                
                    return joinBuilderProxy;
                },
            
                end(): SelectBuilder {
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

        where ( tables: Tables, filters?: EnumType, op:LogicalFilters = {c:'=', l:'AND'} ): WhereBuilder<SelectBuilder> {
            const fragments: Fragment[] = [];
            const config = { prefix, quote }
            const normalizedTables = Array.isArray(tables) ? tables : [tables];
            const allTables = [...new Set([ ...normalizedTables, ...extractTableJoins(currentJoins) ])];
        
            fragments.push( generateFilters(allTables, filters, op, config) );

            return whereBuilder(
                mainBuilder,
                fragment => query = query.concat(fragment),
                fragments,
                filters,
                allTables,
                config
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