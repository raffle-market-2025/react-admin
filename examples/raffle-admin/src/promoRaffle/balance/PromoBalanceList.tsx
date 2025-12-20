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

import PromoBalanceShow from './PromoBalanceShow';

const filters = [
    <TextInput key="from" source="from" alwaysOn />,
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

const shortHex = (v?: string, left = 8, right = 6) => {
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

const pow10 = (decimals: number): bigint => {
    let p = BigInt(1);
    for (let i = 0; i < decimals; i++) p *= BigInt(10);
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
        return f ? `${i.toString()}.${f}` : i.toString();
    } catch {
        return wei;
    }
};

const PromoBalanceList = () => (
    <List
        filters={filters}
        perPage={25}
        sort={{ field: 'blockTimestamp', order: 'DESC' }}
        actions={<Actions />}
    >
        <DatagridConfigurable
            rowClick="expand"
            expand={<PromoBalanceShow />}
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
                source="from"
                render={(r: any) => shortHex(r?.from)}
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
                render={(r: any) => shortHex(r?.transactionHash, 10, 8)}
            />
        </DatagridConfigurable>
    </List>
);

export default PromoBalanceList;
