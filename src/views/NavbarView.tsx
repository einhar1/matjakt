/* Från iprog */

import { FaUserCircle, FaShoppingCart } from "react-icons/fa";
import "../style.css"
import "../navbar.css"
// import { UserAvatar } from "../components/UserAvatar.tsx";
import { useState } from "react";

export type navbarViewProps = {
	// username: string | null;
	// userId: string;
	// sessionId: string | null;
	// onLogoClick: () => void;
	// onSignOutClick: () => void;
	// onExitSession: () => void;
	onSearch: (query: string) => void;
	onLoginClick: () => void;
	onCartClick: () => void;
	cartItemCount?: number;
}


export function NavbarView(props: navbarViewProps) {
	const [searchQuery, setSearchQuery] = useState<string>("");

	// function logoClickACB() {
	// 	props.onLogoClick();
	// }

	// function signOutClickACB() {
	// 	props.onSignOutClick();
	// }

	// function exitSessionACB() {
	// 	props.onExitSession();
	// }

	// const sessionActive = !!props.sessionId;

	// function profileClickACB() {
	// 	window.location.hash = "#/profile";
	// }

	function handleSearchClick() {
		props.onSearch(searchQuery);
	}

	function handleSearchKeyDownACB(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'Enter') {
			props.onSearch(searchQuery);
			e.currentTarget.blur();
		}
	}

	function handleLoginClick() {
		props.onLoginClick();
	}

	function handleCartClick() {
		props.onCartClick
	}

	return (
		<div className={`header`}>
			<div className="header-top-row">
				<h1 className="logo-text">
					COOP kopia
				</h1>
				<div className="navbar-search">
					<input 
						type="text" 
						placeholder="Sök på produkt, t.ex. mjölk, kaffe..." 
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onKeyDown={handleSearchKeyDownACB}
						className="navbar-search-input"
					/>
					<button className="navbar-search-btn" onClick={handleSearchClick}>Sök</button>
				</div>
				<div className="navbar-actions">
					<button className="navbar-login-btn" onClick={handleLoginClick}>
						<FaUserCircle size={18} />
						<span>Logga in</span>
					</button>
					<button className="navbar-cart-btn" onClick={handleCartClick}>
						<FaShoppingCart size={18} />
						<span>Matkasse</span>
						{props.cartItemCount !== undefined && props.cartItemCount > 0 && (
							<span className="cart-badge">{props.cartItemCount}</span>
						)}
					</button>
				</div>
			</div>
			<div className="header-search-row">
				<div className="navbar-search navbar-search-mobile">
					<input 
						type="text" 
						placeholder="Sök på produkt, t.ex. mjölk, kaffe..." 
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onKeyDown={handleSearchKeyDownACB}
						className="navbar-search-input"
					/>
					<button className="navbar-search-btn" onClick={handleSearchClick}>Sök</button>
				</div>
			</div>
			{/* User authentication section, not ready yet
			{
				props.username ? (
					<>
						<div>
							{sessionActive ?
								<button className="secondary-button" onClick={exitSessionACB}>
									Exit Session
								</button>
								: ""
							}
							<button className="secondary-button" onClick={signOutClickACB}>Log Out</button>
						</div>
						<IconButton className="profile-button" onClick={profileClickACB}>
							<p className="username">{props.username}</p>
							{props.userId ? <UserAvatar
								userId={props.userId}
								className="profile-pic navbar"
								size={60}
							/>
								:
								<FaUserCircle size={60} className="profile-pic placeholder" />
							}
						</IconButton>
					</>
				) : (
					<div>
						{sessionActive ?
							<button className="secondary-button" onClick={exitSessionACB}>
								Exit Session
							</button>
							: ""
						}
					</div>
				)
			}
			*/}
		</div>
	);
}