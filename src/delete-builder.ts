import type { EnumType, TableColumns, Fragment } from './types.ts';
import { SQL, empty, Columns, t } from 'sql-string-ts';
import {generateFilters, whereBuilder} from './core.js'


export const deleteBuilder = (cfg = { alias: false, quote: true }) => {
    let query = empty;
    let currentTable: TableColumns<Columns> | null = null;
    const alias = cfg.alias;
    const quote = cfg.quote;
    const prefix = cfg.alias;

    const mainBuilder = {
        from(table: TableColumns<Columns>) {
            query = query.concat(SQL`DELETE FROM ${t(table, { alias, quote })}`);
            currentTable = table;

            return mainBuilder;
        },
        where<T>( filters: EnumType, op = '=' ) {
            const fragments: Fragment[] = [];

            const fields = Object.keys(filters)

            if (fields.length === 0) {
                throw new Error(
                    '[DeleteBuilder] Nenhum filtro foi informado'
                );
            }

            if (!currentTable) {
                throw new Error(
                    '[DeleteBuilder] O método .table() deve ser chamado antes do .where()'
                );
            }

            fragments.push(generateFilters(currentTable, filters, op, { prefix, quote }));

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