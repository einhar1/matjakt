

import { HomeView } from '../views/HomeView';
import { mockOffers } from '../mockdata';

export function HomePresenter() {

    return (
        <HomeView
        offers={mockOffers}
        onSearch={function onSearch(){}}
        onLoginClick={function onLoginClick(){}}
        onCartClick={function onCartClick(){}}
        />
    )
}