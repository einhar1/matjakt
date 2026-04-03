

import { HomeView } from '../views/HomeView';
import { mockOffers } from '../mockdata';
import type { userModelType } from '../models/userModel';

type homePresenterProps = {
    userModel: userModelType
}

export function HomePresenter(props: homePresenterProps) {

    return (
        <HomeView
        offers={mockOffers}
        userModel={props.userModel}
        />
    )
}