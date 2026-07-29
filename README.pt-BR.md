# Query Fragments

> Construa **SQL tipado** usando fragmentos SQL reutilizáveis ou builders fluentes.

**Query Fragments** é uma biblioteca leve para TypeScript construída sobre **sql-string-ts**.

Diferente da maioria dos query builders, ela **não substitui SQL por outra linguagem**.

Em vez disso, gera fragmentos SQL reutilizáveis que podem ser compostos diretamente em template literals, mantendo tipagem completa do TypeScript e bind automático de parâmetros.

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

Se preferir, a mesma funcionalidade também está disponível através de builders fluentes.

---

# Recursos

- ✅ Escreva SQL de verdade
- ✅ Totalmente tipado
- ✅ Construído sobre `sql-string-ts`
- ✅ Fragmentos SQL reutilizáveis
- ✅ Builders fluentes
- ✅ Bind automático de parâmetros
- ✅ Geração automática de JOINs
- ✅ Tree-shakeable
- ✅ Zero dependências além de `sql-string-ts`

---

# Requisitos

- Node.js 18+
- TypeScript 5+
- `sql-string-ts`

---

# Definindo Schemas

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

# API de Fragmentos SQL

A API de fragmentos é o núcleo da biblioteca.

Cada função gera um Fragmento SQL reutilizável que pode ser composto livremente.

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

SQL gerado

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

# Geradores de Fragmentos Disponíveis

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

Essas funções podem ser compostas livremente com `SQL` do `sql-string-ts`.

---

# Integração com Zod

Se você já utiliza **Zod** para validação, pode reutilizar seus schemas para definir os schemas SQL sem duplicar a definição das colunas.

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

Assim, seu schema de validação, os tipos do TypeScript e o schema SQL permanecem sincronizados.

---

# Builders Fluentes

Se preferir uma API fluente, os builders também estão disponíveis.

Internamente, eles utilizam exatamente os mesmos geradores de fragmentos.

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

# Por que usar Query Fragments?

A maioria dos query builders substitui o SQL por sua própria linguagem.

O Query Fragments segue uma abordagem diferente.

Você continua escrevendo SQL enquanto aproveita:

- colunas tipadas;
- schemas tipados;
- bind automático de parâmetros;
- fragmentos SQL reutilizáveis;
- composição segura de SQL;
- builders fluentes opcionais.

O SQL continua sendo a fonte da verdade.

---

# Licença

MIT
