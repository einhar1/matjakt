import { createHashRouter, RouterProvider } from "react-router-dom";
import { ProfileView } from "./views/ProfileView";
import { AccountView } from "./views/AccountView"
import { CheckoutView } from "./views/CheckoutView"
import { DetailsView } from "./views/DetailsView"
import { SearchView } from "./views/SearchView";
import { HomePresenter } from "./presenters/HomePresenter";
import { userModel } from "./models/userModel";
import { Layout } from "./components/Layout";



export type AppRenderProps = {

}


function App(props: AppRenderProps) {
  function makeRouter() {
    return createHashRouter([
      {element: <Layout />, children: [
        {
          path: "/",
          element: <HomePresenter/>,
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
          path: "/details/:productId",
          element: <DetailsView userModel={userModel}/>
        },
      ]},
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