import * as React from 'react';
import polyglotI18nProvider from 'ra-i18n-polyglot';
import {
    Admin,
    CustomRoutes,
    Resource,
    localStorageStore,
    useStore,
    StoreContextProvider,
    combineDataProviders,
    type DataProvider,
} from 'react-admin';
import { Route } from 'react-router';

import authProvider from './authProvider';
import categories from './categories';
import { Dashboard } from './dashboard';
import dataProviderFactory from './dataProvider';
import englishMessages from './i18n/en';
import invoices from './invoices';
import { Layout, Login } from './layout';
import orders from './orders';
import products from './products';
import reviews from './reviews';
import Segments from './segments/Segments';
import visitors from './visitors';
import { themes, ThemeName } from './themes/themes';

// import promoUsers from './raffleEnter';
import promoBalance from './promoRaffle/balance';
import promoPrizePaid from './promoRaffle/prizePaid';
import { buildPromoRaffleSubgraphDataProvider } from './dataProvider/promoRaffleSubgraphProvider';

const SUBGRAPH_RESOURCES = new Set<string>([
    'PromoUsers',
    'promoBalance',
    'promoPrizePaid',
]);

const i18nProvider = polyglotI18nProvider(
    locale => {
        if (locale === 'fr') {
            return import('./i18n/fr').then(messages => messages.default);
        }
        return englishMessages;
    },
    'en',
    [
        { locale: 'en', name: 'English' },
        { locale: 'fr', name: 'Français' },
    ]
);

const store = localStorageStore(undefined, 'ECommerce');

const App = () => {
    const [themeName] = useStore<ThemeName>('themeName', 'soft');
    const singleTheme = themes.find(t => t.name === themeName)?.single;
    const lightTheme = themes.find(t => t.name === themeName)?.light;
    const darkTheme = themes.find(t => t.name === themeName)?.dark;

    const [dataProvider, setDataProvider] = React.useState<DataProvider | null>(
        null
    );

    React.useEffect(() => {
        const subgraph = buildPromoRaffleSubgraphDataProvider();

        const restOrPromise = dataProviderFactory(
            process.env.REACT_APP_DATA_PROVIDER || ''
        );

        const buildMultiplex = (rest: DataProvider) => {
            const multiplex = combineDataProviders(resource =>
                SUBGRAPH_RESOURCES.has(resource) ? subgraph : rest
            );
            // Important: use function form to avoid calling providers that might be functions
            // (react-admin warns about this for legacy providers). :contentReference[oaicite:1]{index=1}
            setDataProvider(() => multiplex);
        };

        if (restOrPromise instanceof Promise) {
            restOrPromise.then(buildMultiplex);
        } else {
            buildMultiplex(restOrPromise as DataProvider);
        }
    }, []);

    if (!dataProvider) return null;

    return (
        <Admin
            title="Posters Galore Admin"
            dataProvider={dataProvider}
            store={store}
            authProvider={authProvider}
            dashboard={Dashboard}
            loginPage={Login}
            layout={Layout}
            i18nProvider={i18nProvider}
            disableTelemetry
            theme={singleTheme}
            lightTheme={lightTheme}
            darkTheme={darkTheme}
            defaultTheme="light"
            requireAuth
        >
            <CustomRoutes>
                <Route path="/segments" element={<Segments />} />
            </CustomRoutes>

            {/* REST/demo resources */}
            <Resource name="customers" {...visitors} />
            <Resource name="orders" {...orders} />
            <Resource name="invoices" {...invoices} />
            <Resource name="products" {...products} />
            <Resource name="categories" {...categories} />
            <Resource name="reviews" {...reviews} />

            {/* Subgraph resources */}
            {/* <Resource name="PromoUsers" {...promoUsers} /> */}
            <Resource name="promoBalance" {...promoBalance} />
            <Resource name="promoPrizePaid" {...promoPrizePaid} />
        </Admin>
    );
};

const AppWrapper = () => (
    <StoreContextProvider value={store}>
        <App />
    </StoreContextProvider>
);

export default AppWrapper;
