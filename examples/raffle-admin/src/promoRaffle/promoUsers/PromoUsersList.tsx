import * as React from 'react';
import {
    List,
    Datagrid,
    TextField,
    FunctionField,
    TopToolbar,
    ExportButton,
    FilterButton,
    TextInput,
} from 'react-admin';
import { countryHexToFlag } from '../utils/country';

const promoUsersFilters = [
    <TextInput key="player" source="_player" label="Player" alwaysOn />,
    <TextInput key="country" source="_country3" label="Country3" />,
    <TextInput key="cycle" source="cycle" label="Cycle" />,
    <TextInput key="tx" source="transactionHash" label="Tx hash" />,
];

const ListActions = () => (
    <TopToolbar>
        <FilterButton />
        <ExportButton />
    </TopToolbar>
);

const shortHex = (v?: string, n = 6) =>
    !v ? '' : v.length <= 2 + n * 2 ? v : `${v.slice(0, 2 + n)}…${v.slice(-n)}`;

const tsToLocal = (v?: any) => {
    const s = v == null ? '' : String(v);
    const num = Number(s);
    if (!Number.isFinite(num) || num <= 0) return '';
    return new Date(num * 1000).toLocaleString();
};

export const PromoUsersList = () => (
    <List
        actions={<ListActions />}
        filters={promoUsersFilters}
        sort={{ field: 'blockTimestamp', order: 'DESC' }}
        perPage={25}
    >
        <Datagrid rowClick="show">
            <FunctionField
                label="Player"
                render={(r: any) => shortHex(r?._player, 8)}
            />
            <FunctionField
                label="IP hash"
                render={(r: any) => shortHex(r?._ipHash, 8)}
            />
            <FunctionField
                label="Country"
                render={(r: any) => {
                    const { flag, a3 } = countryHexToFlag(r?._country3);
                    return `${flag} ${a3}`;
                }}
            />
            <TextField source="cycle" label="Cycle" />
            <FunctionField
                label="Entered at"
                render={(r: any) => tsToLocal(r?._lastTimestamp)}
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
