import { createHashRouter, RouterProvider } from "react-router-dom";
import { ProfileView } from "./views/ProfileView";
import { AccountView } from "./views/AccountView"
import { CheckoutView } from "./views/CheckoutView"
import { DetailsView } from "./views/DetailsView"
import { HomeView } from "./views/HomeView"
import { SearchView } from "./views/SearchView";

import { supabase } from './utils/supabase'



export type AppRenderProps = {

}


function App(props: AppRenderProps) {
  function makeRouter() {
    return createHashRouter([
      {
        path: "/",
        element: <HomeView offers={[]}/>, /* Temporärt tills vi fixar props */
      },
      {
        path: "/search",
        element: <SearchView/>,
      },
      /* {
        path: "/map",
        element: <Map model={props.model} />
      }, */
      {
        path: "/account",
        element: <AccountView/>
      },
      {
        path: "/profile",
        element: <ProfileView/>
      },
      {
        path: "/checkout",
        element: <CheckoutView/>
      },
      {
        path: "/details",
        element: <DetailsView/>
      },
    ]);
  }
  const router = makeRouter();

  return (
    <div className="mainContent">
      <RouterProvider router={router} />
    </div>
  );
}

export default App;