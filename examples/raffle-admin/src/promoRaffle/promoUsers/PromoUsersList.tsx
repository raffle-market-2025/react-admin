import * as React from 'react';
import {
    Datagrid,
    FunctionField,
    List,
    SearchInput,
    ShowButton,
    TextField,
    TextInput,
    TopToolbar,
    FilterButton,
    ExportButton,
    ListProps,
    NumberInput,
} from 'react-admin';
import { Chip, Stack } from '@mui/material';

const filters = [
    <SearchInput key="q" source="q" alwaysOn />,
    <TextInput key="player" source="_player" label="Player (0x…)" />,
    <TextInput key="country3" source="_country3" label="Country3 (bytes3)" />,
    <TextInput key="ip" source="_ip" label="IP" />,
    <TextInput key="tx" source="transactionHash" label="Tx hash (0x…)" />,
    <NumberInput
        key="ts_gte"
        source="blockTimestamp_gte"
        label="From ts (>=)"
    />,
    <NumberInput key="ts_lte" source="blockTimestamp_lte" label="To ts (<=)" />,
];

const ListActions = () => (
    <TopToolbar>
        <FilterButton />
        <ExportButton />
    </TopToolbar>
);

function shortHex(v?: string, left = 8, right = 6) {
    if (!v) return '';
    if (!v.startsWith('0x')) return v;
    if (v.length <= left + right + 2) return v;
    return `${v.slice(0, left + 2)}…${v.slice(-right)}`;
}

function toDateFromSeconds(sec?: string | number) {
    if (sec == null) return null;
    const n = typeof sec === 'number' ? sec : Number(sec);
    if (!Number.isFinite(n)) return null;
    return new Date(n * 1000);
}

export const PromoUsersList = (props: ListProps) => (
    <List
        {...props}
        actions={<ListActions />}
        filters={filters}
        sort={{ field: 'blockTimestamp', order: 'DESC' }}
        perPage={25}
    >
        <Datagrid rowClick={false} bulkActionButtons={false}>
            <FunctionField
                label="Player"
                render={(r: any) =>
                    r?._player ? (
                        <Chip
                            size="small"
                            variant="outlined"
                            label={shortHex(String(r._player))}
                            title={String(r._player)}
                        />
                    ) : (
                        ''
                    )
                }
            />

            <FunctionField
                label="Country3"
                render={(r: any) =>
                    r?._country3 ? (
                        <Chip
                            size="small"
                            label={shortHex(String(r._country3), 6, 4)}
                            title={String(r._country3)}
                        />
                    ) : (
                        ''
                    )
                }
            />

            <FunctionField
                label="IP"
                render={(r: any) =>
                    r?._ip ? (
                        <Chip
                            size="small"
                            variant="outlined"
                            label={String(r._ip)}
                        />
                    ) : (
                        ''
                    )
                }
            />

            <FunctionField
                label="Last ts"
                render={(r: any) => {
                    const d = toDateFromSeconds(r?._lastTimestamp);
                    return d ? d.toLocaleString() : r?._lastTimestamp ?? '';
                }}
            />

            <TextField source="blockNumber" label="Block" />

            <FunctionField
                label="Block time"
                render={(r: any) => {
                    const d = toDateFromSeconds(r?.blockTimestamp);
                    return d ? d.toLocaleString() : r?.blockTimestamp ?? '';
                }}
            />

            <FunctionField
                label="Tx"
                render={(r: any) =>
                    r?.transactionHash ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                                size="small"
                                variant="outlined"
                                label={shortHex(
                                    String(r.transactionHash),
                                    10,
                                    8
                                )}
                                title={String(r.transactionHash)}
                            />
                        </Stack>
                    ) : (
                        ''
                    )
                }
            />

            <ShowButton />
        </Datagrid>
    </List>
);
