import * as React from 'react';
import { Show, SimpleShowLayout, TextField, FunctionField } from 'react-admin';

const tsToLocal = (v?: any) => {
    const s = v == null ? '' : String(v);
    const num = Number(s);
    if (!Number.isFinite(num) || num <= 0) return '';
    return new Date(num * 1000).toLocaleString();
};

export const WinnersShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" />
            <TextField source="cycle" />
            <TextField source="playersBeforePick" />
            <TextField source="winner" />

            <TextField source="blockNumber" />
            <FunctionField
                label="Block timestamp"
                render={(r: any) => tsToLocal(r?.blockTimestamp)}
            />
            <TextField source="transactionHash" />
        </SimpleShowLayout>
    </Show>
);
