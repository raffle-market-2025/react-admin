import * as React from 'react';
import {
    Datagrid,
    DateField,
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
} from 'react-admin';
import { Chip, Stack } from '@mui/material';

const filters = [
    <SearchInput key="q" source="q" alwaysOn />,
    <TextInput key="winner" source="winner" label="Winner (0x…)" />,
    <TextInput
        key="transactionHash"
        source="transactionHash"
        label="Tx hash (0x…)"
    />,
];

const ListActions = () => (
    <TopToolbar>
        <FilterButton />
        <ExportButton />
    </TopToolbar>
);

function shortHex(v?: string, left = 6, right = 4) {
    if (!v) return '';
    if (v.length <= left + right + 2) return v;
    return `${v.slice(0, left + 2)}…${v.slice(-right)}`;
}

function toDateFromSeconds(sec?: string | number) {
    if (sec == null) return null;
    const n = typeof sec === 'number' ? sec : Number(sec);
    if (!Number.isFinite(n)) return null;
    return new Date(n * 1000);
}

export const PromoPickWinnersList = (props: ListProps) => (
    <List
        {...props}
        actions={<ListActions />}
        filters={filters}
        sort={{ field: 'blockTimestamp', order: 'DESC' }}
        perPage={25}
    >
        <Datagrid rowClick={false} bulkActionButtons={false}>
            <TextField source="cycle" label="Cycle" />
            <FunctionField
                label="Winner"
                render={(r: any) =>
                    r?.winner ? shortHex(String(r.winner)) : ''
                }
            />
            <FunctionField
                label="Players"
                render={(r: any) => {
                    const players = (r?.players ?? []) as string[];
                    const count = players.length;

                    const preview = players.slice(0, 3);
                    return (
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Chip size="small" label={`${count}`} />
                            {preview.map((p, idx) => (
                                <Chip
                                    key={`${p}-${idx}`}
                                    size="small"
                                    variant="outlined"
                                    label={shortHex(String(p))}
                                />
                            ))}
                            {count > 3 ? <Chip size="small" label="…" /> : null}
                        </Stack>
                    );
                }}
            />
            <TextField source="blockNumber" label="Block" />
            <FunctionField
                label="Time"
                render={(r: any) => {
                    const d = toDateFromSeconds(r?.blockTimestamp);
                    return d ? (
                        <DateField
                            source="blockTimestamp"
                            record={{ blockTimestamp: d.toISOString() }}
                            showTime
                        />
                    ) : (
                        ''
                    );
                }}
            />
            <FunctionField
                label="Tx"
                render={(r: any) =>
                    r?.transactionHash
                        ? shortHex(String(r.transactionHash), 8, 6)
                        : ''
                }
            />
            <ShowButton />
        </Datagrid>
    </List>
);
