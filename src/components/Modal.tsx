
import { useEffect, type ReactNode } from 'react';

export type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
}

export function Modal(props: ModalProps) {
    if (!props.isOpen) {
        return null;
    }

    function handleOverlayClick(evt: React.MouseEvent) {
        if (evt.target === evt.currentTarget) {
            props.onClose();
        }
    }

    return (
        <>
            <div className="modal-overlay" onClick={handleOverlayClick}>
                <div className="modal-content">
                    <div className='modal-body'>
                        {props.children}
                    </div>
                </div>
            </div>
        </>
    );
}