/* Från iprog */

import { FaUserCircle, FaShoppingCart } from "react-icons/fa";
import { CgClose } from 'react-icons/cg'
import "../style.css"
import "../navbar.css"
// import { UserAvatar } from "../components/UserAvatar.tsx";
import { useState, useEffect, useRef } from "react";
import { useDebounce } from '../hooks/useDebounce'
import { Modal } from '../components/Modal'
import { List } from '../components/List.tsx'
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

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
	user: User | null;
}


export function NavbarView(props: navbarViewProps) {
	const [searchQuery, setSearchQuery] = useState<string>("");
	const debouncedQuery = useDebounce(searchQuery, 500)
	const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);

	const modalInputRef = useRef<HTMLInputElement>(null)
	const navigate = useNavigate()

	useEffect (() => {
		if (Boolean(debouncedQuery) && !isSearchModalOpen) {
			console.log(isSearchModalOpen)
			setIsSearchModalOpen(true);
		}
	}, [debouncedQuery]);

	useEffect (() => {
		if (modalInputRef.current) {
			modalInputRef.current.focus();
		}
	}, [isSearchModalOpen])

	function logoClickACB() {
		navigate('/')
	}

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

	function handleSearchChange(evt: React.ChangeEvent<HTMLInputElement>) {
		console.log(searchQuery)
		setSearchQuery(evt.target.value)
	}

	function handleSearchKeyDownACB(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'Enter') {
			props.onSearch(searchQuery);
			e.currentTarget.blur();
		}
	}

	function handleSearchClick() {
		props.onSearch(searchQuery);
	}

	function handleCloseSearchModal() {
		setIsSearchModalOpen(false);
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
				<h1 className="logo-text" onClick={logoClickACB}>
					{'你的母親'}
				</h1>
				<div className="navbar-search">
					<input 
						id="desktop"
						type="text" 
						placeholder="Sök på produkt, t.ex. mjölk, kaffe..." 
						value={searchQuery}
						onChange={handleSearchChange}
						onKeyDown={handleSearchKeyDownACB}
						className="navbar-search-input"
					/>
					<button className="navbar-search-btn" onClick={handleSearchClick}>
						Sök
					</button>
				</div>

				<div className="navbar-actions">
					<button className="navbar-login-btn" onClick={handleLoginClick}>
						<FaUserCircle size={18} />
						<span>{props.user ? (props.user.user_metadata?.display_name || props.user.email) : "Logga in"}</span>
					</button>
					<button className="navbar-cart-btn" onClick={handleCartClick}>
						<FaShoppingCart size={18} />
						<span>Matkasse</span>
						{props.cartItemCount !== undefined && props.cartItemCount > 0 && (
							<span className="cart-badge">
								{props.cartItemCount}
							</span>
						)}
					</button>
				</div>
			</div>

			<div className="header-search-row">
				<div className="navbar-search navbar-search-mobile">
					<input 
						id="mobile"
						type="text" 
						placeholder="Sök på produkt, t.ex. mjölk, kaffe..." 
						value={searchQuery}
						onChange={handleSearchChange}
						onKeyDown={handleSearchKeyDownACB}
						className="navbar-search-input"
					/>
					<button className="navbar-search-btn" onClick={handleSearchClick}>Sök</button>
				</div>
			</div>

			<Modal isOpen={isSearchModalOpen} onClose={handleCloseSearchModal}>
				<>
					<div className="search-modal-input-wrapper">
						<input
							id="modal"
							ref={modalInputRef}
							type="text"
							value={searchQuery}
							onChange={handleSearchChange}
							onKeyDown={handleSearchKeyDownACB}
							placeholder="Sök på produkt, t.ex. mjölk, kaffe..."
							className="search-modal-input"
						/>
						<button className="modal-close-btn" onClick={handleCloseSearchModal}>
							<CgClose/>
						</button>
					</div>
				</>
				<List searchTerm={debouncedQuery} searchQuery={searchQuery} closeModal={handleCloseSearchModal} />
			</Modal>
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