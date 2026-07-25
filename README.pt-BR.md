# Query Fragments

> **Componha SQL tipado usando fragmentos reutilizáveis. Builders fluentes são opcionais.**

🇺🇸 **English:** [README.md](README.md)

---

## Filosofia

SQL já é uma excelente linguagem.

Em vez de substituir SQL por outra DSL, o **Query Fragments** permite compor consultas usando fragmentos reutilizáveis e tipados, construídos sobre o `sql-string-ts`.

Você continua tendo controle sobre o SQL gerado enquanto aproveita:

- schemas tipados;
- suporte a TypeScript;
- bind automático de parâmetros;
- fragmentos SQL reutilizáveis;
- builders fluentes opcionais.

Os builders são apenas uma camada de conveniência sobre a API de fragmentos.

---

## Recursos

- Escreva SQL real
- Construído sobre `sql-string-ts`
- Tipagem com TypeScript
- Fragmentos SQL reutilizáveis
- Builders fluentes opcionais
- Geração automática de `JOIN`
- Bind seguro de parâmetros
- Leve
- Compatível com tree shaking

---

## Instalação

```bash
npm install query-fragments sql-string-ts
```

---

## Definindo os schemas

```ts
import { schema } from 'sql-string-ts';

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
    table: 'clients',
    alias: 'c',
    columns: ClientColumns
});

enum PersonTypeColumns {
    id,
    text,
    profile,
    erased
}

const personType = schema({
    table: 'person_type',
    alias: 'pt',
    columns: PersonTypeColumns
});
```

---

## API de fragmentos SQL

A API de fragmentos é o núcleo da biblioteca.

Cada função retorna um fragmento SQL que pode ser utilizado diretamente dentro de `SQL`.

```ts
import {
    SQL,
    schema,
    select,
    selectAll
} from 'sql-string-ts';

import {
    generateColumns,
    generateJoins,
    generateFilters,
    groupBy,
    generateSort,
    generatePagination
} from 'query-fragments';
```

### SELECT

```ts
const columns = [
    select(
        {
            as: false,
            prefix: true,
            quote: true
        },
        clients.name,
        clients.email
    ),
    clients.person_type_id,
    selectAll(personType)
];

const joins = [
    {
        table: personType,
        join: 'INNER JOIN',
        foreignkey: clients.person_type_id
    }
];

const filters = {
    text: 'alguma coisa',
    active: 1
};

const query = SQL`
SELECT ${generateColumns(columns)}
FROM clients c
${generateJoins(joins)}
WHERE ${generateFilters([clients, personType], filters)}
${groupBy(personType.id)}
${generateSort({
    column: personType.text,
    direction: 'DESC'
})}
${generatePagination(20, 20)}
`;
```

Os valores informados nos filtros são adicionados como parâmetros da consulta.

```ts
console.log(query.text);
console.log(query.values);
```

---

### INSERT

```ts
import {
    generateColumnsInsert,
    generateValuesInsert
} from 'query-fragments';

const data = {
    name: 'Fulano',
    email: 'fulano@gmail.com'
};

const query = SQL`
INSERT INTO clients
(
    ${generateColumnsInsert(data, clients)}
)
VALUES
(
    ${generateValuesInsert(data, clients)}
)
`;
```

---

### UPDATE

```ts
import {
    generateValuesUpdate,
    generateFilters
} from 'query-fragments';

const query = SQL`
UPDATE clients
SET ${generateValuesUpdate(
    {
        name: 'Fulano',
        email: 'fulano@gmail.com'
    },
    clients
)}
WHERE ${generateFilters(clients, {
    id: 2
})}
`;
```

---

### DELETE

```ts
const query = SQL`
DELETE FROM clients
WHERE ${generateFilters(clients, {
    id: 2,
    person_type_id: 4
})}
`;
```

---

## Geradores disponíveis

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

Essas funções podem ser combinadas livremente com `SQL` do `sql-string-ts`.

---

## Builders fluentes

Para quem prefere uma API encadeada, a biblioteca também fornece builders.

```ts
import {
    selectBuilder,
    insertBuilder,
    updateBuilder,
    deleteBuilder
} from 'query-fragments';
```

Os builders utilizam internamente os mesmos geradores de fragmentos.

---

## Select Builder

```ts
const query = selectBuilder()
    .select([
        select(
            {
                as: false,
                prefix: true,
                quote: true
            },
            clients.name,
            clients.email
        ),
        clients.person_type_id,
        selectAll(personType)
    ])
    .from(clients)
    .joins([
        {
            table: personType,
            join: 'INNER JOIN',
            foreignkey: clients.person_type_id
        }
    ])
        .end()
    .where(
        [clients, personType],
        {
            text: 'alguma coisa',
            active: 1,
            teste: 5
        }
    )
        .raw(
            SQL`
                EXISTS (
                    SELECT 1
                    FROM alguma_coisa
                    WHERE id = alguma_coisa_id
                )
            `
        )
        .end()
    .groupBy(personType.id)
    .sort({
        column: personType.text,
        direction: 'DESC'
    })
    .pagination(20, 20)
    .build();
```

---

## Insert Builder

```ts
const query = insertBuilder()
    .into(clients)
    .values({
        name: 'Fulano',
        email: 'fulano@gmail.com'
    })
    .build();
```

SQL gerado:

```sql
INSERT INTO clients (name, email)
VALUES ($1, $2)
```

---

## Update Builder

```ts
const query = updateBuilder()
    .table(clients)
    .set({
        name: 'Fulano',
        email: 'fulano@gmail.com'
    })
    .where({
        id: 2
    })
        .end()
    .build();
```

SQL gerado:

```sql
UPDATE clients
SET name = $1, email = $2
WHERE id = $3
```

---

## Delete Builder

```ts
const query = deleteBuilder()
    .from(clients)
    .where({
        id: 2,
        person_type_id: 4
    })
        .end()
    .build();
```

SQL gerado:

```sql
DELETE FROM clients
WHERE id = $1 AND person_type_id = $2
```

---

## Fragmentos ou builders?

Use fragmentos quando quiser escrever e controlar diretamente a estrutura do SQL:

```ts
const query = SQL`
SELECT ${generateColumns(columns)}
FROM clients c
WHERE ${generateFilters(clients, filters)}
`;
```

Use builders quando preferir uma API fluente:

```ts
const query = selectBuilder()
    .select(columns)
    .from(clients)
    .where(clients, filters)
        .end()
    .build();
```

As duas abordagens utilizam a mesma implementação interna.

---

## Por que usar Query Fragments?

A maioria dos query builders substitui SQL por sua própria linguagem.

O Query Fragments segue outra abordagem.

Você continua escrevendo SQL enquanto aproveita:

- colunas tipadas;
- schemas tipados;
- bind automático de parâmetros;
- fragmentos reutilizáveis;
- composição segura;
- builders opcionais.

SQL continua sendo a fonte da verdade.

---

## Licença

MIT