import * as React from 'react';
import {
    List,
    DatagridConfigurable,
    TextField,
    TextInput,
    NumberInput,
    TopToolbar,
    FilterButton,
    ExportButton,
    SelectColumnsButton,
    FunctionField,
} from 'react-admin';

import PromoPrizePaidShow from './PromoPrizePaidShow';

const filters = [
    <TextInput key="winner" source="winner" alwaysOn />,
    <NumberInput
        key="ts_gte"
        source="blockTimestamp_gte"
        label="From timestamp (>=)"
    />,
    <NumberInput
        key="ts_lte"
        source="blockTimestamp_lte"
        label="To timestamp (<=)"
    />,
    <TextInput key="tx" source="transactionHash" />,
];

const Actions = () => (
    <TopToolbar>
        <FilterButton />
        <SelectColumnsButton />
        <ExportButton />
    </TopToolbar>
);

const shortHex = (v?: string, left = 10, right = 8) => {
    if (!v) return '';
    if (v.length <= left + right + 3) return v;
    return `${v.slice(0, left)}…${v.slice(-right)}`;
};

const formatTs = (ts?: string) => {
    if (!ts) return '';
    const n = Number(ts);
    if (!Number.isFinite(n)) return ts;
    return new Date(n * 1000).toLocaleString();
};

// Avoid BigInt exponentiation to support older TS targets
const pow10 = (decimals: number) => {
    let p = 1n;
    for (let i = 0; i < decimals; i++) p *= 10n;
    return p;
};

const weiToEth = (wei?: string, decimals = 18) => {
    if (!wei) return '';
    try {
        const w = BigInt(wei);
        const base = pow10(decimals);
        const i = w / base;
        const f = (w % base)
            .toString()
            .padStart(decimals, '0')
            .replace(/0+$/, '');
        return f ? `${i}.${f}` : i.toString();
    } catch {
        return wei;
    }
};

const PromoPrizePaidList = () => (
    <List
        filters={filters}
        perPage={25}
        sort={{ field: 'blockTimestamp', order: 'DESC' }}
        actions={<Actions />}
    >
        <DatagridConfigurable
            rowClick="expand"
            expand={<PromoPrizePaidShow />}
            sx={{
                '& .column-transactionHash': {
                    display: { xs: 'none', md: 'table-cell' },
                },
                '& .column-blockNumber': {
                    display: { xs: 'none', md: 'table-cell' },
                },
            }}
        >
            <FunctionField label="id" render={(r: any) => shortHex(r?.id)} />
            <FunctionField
                source="winner"
                render={(r: any) => shortHex(r?.winner)}
            />
            <FunctionField
                label="amount (wei)"
                render={(r: any) => r?.amount ?? ''}
            />
            <FunctionField
                label="amount (eth)"
                render={(r: any) => weiToEth(r?.amount)}
            />
            <FunctionField
                label="block time"
                render={(r: any) => formatTs(r?.blockTimestamp)}
            />
            <TextField source="blockNumber" />
            <FunctionField
                source="transactionHash"
                label="tx"
                render={(r: any) => shortHex(r?.transactionHash)}
            />
        </DatagridConfigurable>
    </List>
);

export default PromoPrizePaidList;
