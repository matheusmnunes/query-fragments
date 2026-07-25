import type { EnumType, TableColumns } from './types.js';
import type { InsertBuilder } from './builder-types.js';
import { SQL, empty, Columns, t } from 'sql-string-ts';
import {setColumnsInsert, setBindValuesInsert} from './core.js'

export const insertBuilder = (): InsertBuilder => {
    let query = empty;
    let currentTable: TableColumns<Columns> | null = null;

    const mainBuilder: InsertBuilder = {
        into(table: TableColumns<Columns>) {
            query = query.concat(SQL`INSERT INTO ${t(table)}`);
            currentTable = table;

            return mainBuilder;
        },
        values(data: EnumType) {
            if (!currentTable) {
                throw new Error(
                    '[InsertBuilder] O método .into() deve ser chamado antes de .values().'
                );
            }

           query = query.concat(
               setColumnsInsert(data, currentTable)
           );
       
           query = query.concat(
               SQL` VALUES ${setBindValuesInsert(data, currentTable)}`
           );
       
           return mainBuilder;
        },
        build() {
            return query;
        }
    };

    return mainBuilder;
}