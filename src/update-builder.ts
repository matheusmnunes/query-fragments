import { SQL, empty, Columns, t } from 'sql-string-ts';
import type { EnumType, TableColumns, Fragment, LogicalFilters } from './types.js';
import { generateFilters, whereBuilder, generateValuesUpdate } from './core.js';

import type { UpdateBuilder, WhereBuilder, SelectBuilder } from './builder-types.js';

export const updateBuilder = (cfg = { alias: false, quote: true }): UpdateBuilder => {
    let query = empty;
    let currentTable: TableColumns<Columns> | null = null;
    const alias = cfg.alias;
    const quote = cfg.quote;
    const prefix = cfg.alias;

    const mainBuilder: UpdateBuilder = {
        table(table: TableColumns<Columns>) {
            query = query.concat(SQL`UPDATE ${t(table, { alias, quote })}`);
            currentTable = table;

            return mainBuilder;
        },
        set(data: EnumType) {
            
            if (!currentTable) {
                throw new Error(
                    '[UpdateBuilder] O método .table() deve ser chamado antes de .set().'
                );
            }

           query = query.concat(
               SQL` SET ${generateValuesUpdate(data, currentTable, { prefix, quote })}`
           );
       
           return mainBuilder;
        },
        where ( filters: EnumType, op: LogicalFilters = {c:'=', l:'AND'} ): WhereBuilder<UpdateBuilder> {
            const fragments: Fragment[] = [];

            const fields = Object.keys(filters)

            if (fields.length === 0) {
                throw new Error(
                    '[UpdateBuilder] Nenhum filtro foi informado'
                );
            }

            if (!currentTable) {
                throw new Error(
                    '[UpdateBuilder] O método .table() deve ser chamado antes do .where()'
                );
            }

            fragments.push(generateFilters(currentTable, filters, op, { prefix, quote }));

            return whereBuilder(
                mainBuilder,
                fragment => query = query.concat(fragment),
                fragments,
                filters,
                currentTable,
                { prefix, quote }
            );
        },
        build() {
            return query;
        }
    };

    return mainBuilder;
}