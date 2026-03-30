

import useSWR from 'swr' /* https://swr.vercel.app/ */
import { supabase } from '../utils/supabase';
import { type Product } from '../types/database'

export type ListProps = {
    searchTerm: string;
}

async function fetchProducts([_key, term]: [string, string]): Promise<Product[]> {
    const { data, error } = await supabase
        .from("products")
        .select("product_id, product_key, name, brand")
        .ilike("name", `%${term}`)
        .limit(10) /* TODO: Remove */

    if (error) {
        throw new Error(error.message);
    }

    return data as Product[];
}

export function List(props: ListProps) {

    const {
        isLoading,
        error,
        data,
    } = useSWR<Product[], Error>(
        props.searchTerm ? ['products', props.searchTerm] : null,
        fetchProducts
    );

    let content
    if (isLoading) content = <p>Loading...</p>
    else if (error) content = <p>{error.message}</p>
    else if (data) content =(
        <>
            <ul className='search-results-list'>
                {data.map((product) => (
                    <li key={product.product_key} className='search-result-item'>
                        <h4>{product.name}</h4>
                        <p>{product.brand}</p>
                    </li>
                ))}
            </ul>
        </>
    )

    return content
}