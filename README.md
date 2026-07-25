# Query Fragments

> **Compose typed SQL using reusable SQL fragments. Fluent builders are optional.**

🇧🇷 **Português:** [README.pt-BR.md](README.pt-BR.md)

---

## Philosophy

SQL is already a great language.

Instead of replacing SQL with another DSL, **Query Fragments** helps you compose SQL using reusable, strongly typed fragments built on top of `sql-string-ts`.

You stay in control of the generated SQL while benefiting from:

- Type-safe schemas
- Strong TypeScript support
- Automatic parameter binding
- Reusable SQL fragments
- Optional fluent builders

Builders are simply a convenience layer over the fragment API.

---

## Features

- ✅ Write real SQL
- ✅ Built on top of `sql-string-ts`
- ✅ Fully typed
- ✅ Reusable SQL fragments
- ✅ Optional fluent builders
- ✅ Automatic JOIN generation
- ✅ Safe parameter binding
- ✅ Lightweight
- ✅ Tree-shakeable

---

## Installation

```bash
npm install query-fragments sql-string-ts
```

---

## Quick Example

```ts
import {
    SQL,
    schema,
    t,
    selectAll
} from "sql-string-ts";

import {
    generateColumns,
    generateJoins,
    generateFilters
} from "query-fragments";

enum ClientColumns {
    id,
    name,
    email,
    person_type_id,
    active
}

const clients = schema({
    table: "clients",
    alias: "c",
    columns: ClientColumns
});

enum PersonTypeColumns {
    id,
    text
}

const personType = schema({
    table: "person_type",
    alias: "pt",
    columns: PersonTypeColumns
});

const query = SQL`
SELECT
    ${generateColumns([
        clients.name,
        clients.email,
        selectAll(personType)
    ])}
FROM ${t(clients)}
${generateJoins([
    {
        table: personType,
        join: "INNER JOIN",
        foreignkey: clients.person_type_id
    }
])}
WHERE ${generateFilters(clients, {
    active: 1
})}
`;
```

Generated SQL

```sql
SELECT
    c.name,
    c.email,
    pt.*
FROM clients c
INNER JOIN person_type pt
    ON pt.id = c.person_type_id
WHERE c.active = $1
```

---

## Fluent Builders

If you prefer a fluent API, the same query can be written using builders.

```ts
const query = selectBuilder()
    .select([
        clients.name,
        clients.email,
        selectAll(personType)
    ])
    .from(clients)
    .joins([
        {
            table: personType,
            join: "INNER JOIN",
            foreignkey: clients.person_type_id
        }
    ])
        .end()
    .where(clients, {
        active: 1
    })
        .end()
    .build();
```

Both approaches generate the same SQL.

---

## SQL Fragment Generators

The library exposes reusable SQL fragment generators.

```ts
generateColumns(...)
generateJoins(...)
generateFilters(...)
additionalFilters(...)
getRawFilters(...)
groupBy(...)
generateSort(...)
generatePagination(...)

generateColumnsInsert(...)
generateValuesInsert(...)
generateValuesUpdate(...)

extractTableJoins(...)
```

These functions are designed to be composed directly with `SQL` from `sql-string-ts`.

---

## Builders

Fluent builders are available for common operations:

- `selectBuilder()`
- `insertBuilder()`
- `updateBuilder()`
- `deleteBuilder()`

---

## Documentation

Complete documentation is available in the `docs` directory.

- SQL Fragment API
- Fluent Builders
- Schema Definition
- Complete Examples

---

## License

MIT