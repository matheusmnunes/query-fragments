import { SQL, empty, Columns, t } from 'sql-string-ts';
import type { EnumType, TableColumns, Fragment } from './types.js';
import { generateFilters, whereBuilder, setBindValuesUpdate } from './core.js'

export const updateBuilder = (cfg = { alias: false, quote: true }) => {
    let query = empty;
    let currentTable: TableColumns<Columns> | null = null;
    const alias = cfg.alias;
    const quote = cfg.quote;
    const prefix = cfg.alias;

    const mainBuilder = {
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
               SQL` SET ${setBindValuesUpdate(data, currentTable, { prefix, quote })}`
           );
       
           return mainBuilder;
        },
        where<T>( filters: EnumType, op = '=' ) {
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

            fragments.push(generateFilters(currentTable, filters, op = '=', { prefix, quote }));

            return whereBuilder(
                mainBuilder,
                fragment => query = query.concat(fragment),
                fragments,
                filters,
                currentTable
            );
        },
        build() {
            return query;
        }
    };

    return mainBuilder;
}