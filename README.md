# Query Fragments

> Build **typed SQL** using reusable SQL fragments or fluent builders.

**Query Fragments** is a lightweight TypeScript library built on top of **sql-string-ts**.

Unlike most query builders, it **does not replace SQL with another language**.

Instead, it generates reusable SQL fragments that can be composed directly inside template literals, while keeping full TypeScript support and automatic parameter binding.

```ts
const query = SQL`
SELECT
    ${generateColumns(columns)}
FROM
    ${t(clients)}
${generateJoins(joins)}
WHERE
    ${generateFilters(clients, filters)}
${generateSort(sort)}
${generatePagination(20, 0)}
`;
```

If you prefer, the exact same functionality is also available through fluent builders.

---

# Features

- ✅ Write real SQL
- ✅ Fully typed
- ✅ Built on top of `sql-string-ts`
- ✅ Reusable SQL fragments
- ✅ Fluent builders
- ✅ Automatic parameter binding
- ✅ Automatic JOIN generation
- ✅ Tree-shakeable
- ✅ Zero dependencies besides `sql-string-ts`

---

# Requirements

- Node.js 18+
- TypeScript 5+
- `sql-string-ts`

---

# Defining Schemas

```ts
import { schema } from "sql-string-ts";

enum ClientColumns {
    id,
    name,
    email,
    cpf_cnpj,
    person_type_id,
    birth_date,
    active,
    created_at,
    updated_at,
    erased
}

const clients = schema({
    table: "clients",
    alias: "c",
    columns: ClientColumns
});

enum PersonTypeColumns {
    id,
    text,
    profile,
    erased
}

const personType = schema({
    table: "person_type",
    alias: "pt",
    columns: PersonTypeColumns
});
```

---

# SQL Fragment API

The fragment API is the core of the library.

Each function generates a reusable SQL Fragment that can be composed freely.

```ts
import {
    SQL,
    schema,
    select,
    selectAll,
    t
} from "sql-string-ts";

import {
    generateColumns,
    generateJoins,
    generateFilters,
    groupBy,
    generateSort,
    generatePagination
} from "query-fragments";
```

## SELECT

```ts
const columns = [
    clients.name,
    clients.email,
    selectAll(personType)
];

const joins = [
    {
        table: personType,
        join: "INNER JOIN",
        foreignkey: clients.person_type_id
    }
];

const filters = {
    active: 1
};

const query = SQL`
SELECT
    ${generateColumns(columns)}
FROM
    ${t(clients)}
${generateJoins(joins)}
WHERE
    ${generateFilters(clients, filters)}
${generateSort([
    {
        column: clients.name,
        direction: "ASC"
    }
])}
${generatePagination(20, 0)}
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
WHERE
    c.active = $1
ORDER BY
    c.name ASC
LIMIT 20 OFFSET 0
```

---

## INSERT

```ts
const data = {
    name: "John",
    email: "john@email.com"
};

const query = SQL`
INSERT INTO ${t(clients)}
(
    ${generateColumnsInsert(data)}
)
VALUES
(
    ${generateValuesInsert(data)}
)
`;
```

---

## UPDATE

```ts
const query = SQL`
UPDATE ${t(clients)}
SET
    ${generateValuesUpdate(
        {
            name: "John",
            email: "john@email.com"
        },
        clients
    )}
WHERE
    ${generateFilters(clients, {
        id: 1
    })}
`;
```

---

## DELETE

```ts
const query = SQL`
DELETE FROM ${t(clients)}
WHERE
    ${generateFilters(clients, {
        id: 1
    })}
`;
```

---

# Available Fragment Generators

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

These functions can be freely composed with `SQL` from `sql-string-ts`.

---

# Zod Integration

If you already use **Zod** for validation, you can reuse your schemas to define SQL schemas without duplicating column definitions.

```ts
import { z } from "zod";
import { schema } from "sql-string-ts";

import {
    columnsFromZod,
    enumFromZod
} from "query-fragments/zod";

const clientSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    active: z.boolean()
});

const clients = schema({
    table: "clients",
    alias: "c",
    columns: enumFromZod(clientSchema)
});

const columns = columnsFromZod(clientSchema);
```

This keeps your validation schema, TypeScript types and SQL schema synchronized.

---

# Fluent Builders

If you prefer a fluent API, builders are available.

They internally use the exact same fragment generators.

```ts
import {
    selectBuilder,
    insertBuilder,
    updateBuilder,
    deleteBuilder
} from "query-fragments";
```

## Select

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
        erased: 0
    })
        .and({
            cpf_cnpj: "998766",
            email: "john@email.com"
        })
        .or({
            person_type_id: 2,
            active: 1
        })
        .search({
            property: "name, cpf_cnpj, text",
            value: "John"
        })
        .raw(SQL`
            EXISTS (
                SELECT 1
                FROM permissions p
                WHERE p.client_id = c.id
            )
        `)
        .end()
    .sort({
        column: clients.name,
        direction: "ASC"
    })
    .pagination(20, 0)
    .build();
```

---

## Insert

```ts
const query = insertBuilder()
    .into(clients)
    .values({
        name: "John",
        email: "john@email.com"
    })
    .build();
```

---

## Update

```ts
const query = updateBuilder()
    .table(clients)
    .set({
        name: "John",
        email: "john@email.com"
    })
    .where({
        id: 1
    })
        .end()
    .build();
```

---

## Delete

```ts
const query = deleteBuilder()
    .from(clients)
    .where({
        id: 1
    })
        .end()
    .build();
```

---

# Why use Query Fragments?

Most query builders replace SQL with their own language.

Query Fragments takes a different approach.

You keep writing SQL while benefiting from:

- typed columns;
- typed schemas;
- automatic parameter binding;
- reusable SQL fragments;
- safe SQL composition;
- optional fluent builders.

SQL remains the source of truth.


---

# License

MIT
