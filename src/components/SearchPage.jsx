
import useDebounce from '../hooks/useDebounce'
import { List } from './List';
import { SearchInput } from './SearchInput';

export const SearchPage = () => {
    
    const [searchValue, setSearchValue] = useState('');

    const debouncedSearchValue = useDebounce(searchValue, 500)

    return (
        <>
            <SearchInput
                searchValue = {searchValue}
                setSearchValue = {setSearchValue}
            />
            <List searchTerm={debouncedSearchValue} />
        </>
    );
};

