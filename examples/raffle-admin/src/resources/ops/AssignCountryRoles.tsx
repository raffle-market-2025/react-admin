import * as React from 'react';
import {
    Create,
    SimpleForm,
    TextInput,
    BooleanInput,
    ArrayInput,
    SimpleFormIterator,
    SelectInput,
    required,
    useNotify,
    useRedirect,
} from 'react-admin';
import { setUserCountryRolesBulk } from '../../rpc/rpcClient';

// ваш список стран ISO2 (можно держать в const)
const COUNTRY2 = [
    'UA',
    'US',
    'GB',
    'CA',
    'AU',
    'DE',
    'FR',
    'ES',
    'IT',
    'PL',
    'NL',
    'SE',
    'NO',
    'DK',
    'FI',
    'IE',
    'CH',
    'AT',
    'BE',
    'CZ',
    'SK',
    'HU',
    'RO',
    'BG',
    'GR',
    'TR',
    'IL',
    'AE',
    'SA',
    'IN',
    'CN',
    'JP',
    'KR',
    'BR',
    'MX',
    'AR',
    'CL',
    'CO',
    'PE',
    'ZA',
    'EG',
    'NG',
    'KE',
    'SG',
    'HK',
    'TW',
    'TH',
    'VN',
    'MY',
    'ID',
    'PH',
    'NZ',
].map(c => ({ id: c, name: c }));

const ROLE = [
    { id: 'viewer', name: 'viewer' },
    { id: 'operator', name: 'operator' },
    { id: 'admin', name: 'admin' },
];

export const AssignCountryRoles = () => {
    const notify = useNotify();
    const redirect = useRedirect();

    const onSubmit = async (values: any) => {
        try {
            await setUserCountryRolesBulk({
                userId: values.user_id,
                items: values.items ?? [],
                replace: !!values.replace,
            });
            notify('Roles updated', { type: 'info' });
            redirect('/app_users'); // или куда нужно
        } catch (e: any) {
            notify(e?.message ?? 'RPC failed', { type: 'warning' });
        }
    };

    return (
        <Create resource="ops" title="Assign roles by countries">
            <SimpleForm onSubmit={onSubmit}>
                <TextInput
                    source="user_id"
                    label="Target user_id (uuid)"
                    validate={required()}
                    fullWidth
                />
                <BooleanInput
                    source="replace"
                    label="Replace mode (remove missing countries)"
                />

                <ArrayInput source="items" label="Country roles">
                    <SimpleFormIterator inline>
                        <SelectInput
                            source="country2"
                            choices={COUNTRY2}
                            validate={required()}
                        />
                        <SelectInput
                            source="role"
                            choices={ROLE}
                            validate={required()}
                        />
                    </SimpleFormIterator>
                </ArrayInput>
            </SimpleForm>
        </Create>
    );
};
