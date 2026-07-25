import { z } from 'zod';

const getSchemaColumns = <T extends z.ZodRawShape>( schema: z.ZodObject<T> ) => {
    return Object.keys(schema.shape) as Array<keyof z.infer<typeof schema>>;
};


const schemaToEnum = < T extends z.ZodRawShape >( schema: z.ZodObject<T> ) => {
    return Object.fromEntries(
        Object.keys(schema.shape)
            .map(key => [key, key])
    ) as {
        [K in keyof z.infer<typeof schema>]: K
    };
};

export {
    getSchemaColumns,
    schemaToEnum
};