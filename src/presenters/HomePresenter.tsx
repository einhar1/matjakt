

import { HomeView } from '../views/HomeView';
import type { userModelType } from '../models/userModel';

type homePresenterProps = {
    userModel: userModelType
}

export function HomePresenter(props: homePresenterProps) {

    return (
        <HomeView
        userModel={props.userModel}
        />
    )
}