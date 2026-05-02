
import { useState } from 'react'
import { postalCodeModel } from '../models/postalCodeModel'
import { userModel } from '../models/userModel';
import '../postcodeInput.css'

type PostalCodeInputProps = {
    initialValue?: string;
}

export function PostalCodeInput(props: PostalCodeInputProps) {
    const [inputValue, setInputValue] = useState(props.initialValue || '');
    const [error, setError] = useState<string | null>(null);

    function handleSubmit(e: React.SubmitEvent) {
        e.preventDefault();
        setError(null);

        const normalizedCode = inputValue.replace(/\s/g, '');
        
        if (!/^\d{5}$/.test(normalizedCode)) {
            setError('Ange ett giltigt postnummer (5 siffror).');
            return;
        }

        const results = postalCodeModel.lookup(normalizedCode);

        if (results.length === 0) {
            setError('Postnumret hittades inte.');
            return;
        }

        userModel.setLocation(results[0].longitude, results[0].latitude, normalizedCode, results[0].city, results[0].county)

        console.log('user: ',userModel.postalCode, ' | ',userModel.city, ' | ',userModel.county, ' | ', userModel.longitude, ' | ', userModel.latitude)
    }
    const savedPostal = userModel.getPostalCode();
    const postalCodePlaceholder = savedPostal ? savedPostal : ('t.ex. 114 55')

    return (
        <div className='postal-code-input'>
            <label htmlFor='postal-code-field'>Ditt postnummer</label>

            <form className='postal-code-row' onSubmit={handleSubmit}>
                <input
                    id='postal-code-field'
                    type='text'
                    inputMode='numeric'
                    maxLength={6}
                    placeholder={postalCodePlaceholder}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                />
                <button type='submit' className='btn-primary postal-code-save-btn'>
                    Spara
                </button>
            </form>

            {error && <p className='postal-code-error'>{error}</p>}
        </div>
    )
}