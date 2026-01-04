import * as React from 'react';
import {
    List,
    Datagrid,
    TextField,
    FunctionField,
    TopToolbar,
    ExportButton,
} from 'react-admin';

const shortHex = (v?: string, n = 6) =>
    !v ? '' : v.length <= 2 + n * 2 ? v : `${v.slice(0, 2 + n)}…${v.slice(-n)}`;

const tsToLocal = (v?: any) => {
    const s = v == null ? '' : String(v);
    const num = Number(s);
    if (!Number.isFinite(num) || num <= 0) return '';
    return new Date(num * 1000).toLocaleString();
};

const ListActions = () => (
    <TopToolbar>
        <ExportButton />
    </TopToolbar>
);

export const WinnersList = () => (
    <List
        actions={<ListActions />}
        sort={{ field: 'blockTimestamp', order: 'DESC' }}
        perPage={25}
    >
        <Datagrid rowClick="show">
            <TextField source="cycle" label="Cycle" />
            <TextField source="playersBeforePick" label="Players before pick" />
            <FunctionField
                label="Winner"
                render={(r: any) => shortHex(r?.winner, 10)}
            />
            <FunctionField
                label="Block time"
                render={(r: any) => tsToLocal(r?.blockTimestamp)}
            />
            <FunctionField
                label="Tx"
                render={(r: any) => shortHex(r?.transactionHash, 10)}
            />
        </Datagrid>
    </List>
);
