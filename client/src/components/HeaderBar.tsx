import React, { useState, useRef, useEffect } from 'react';
import { useAppStore, useSearchQuery, useSelectedItems, useIsLoading, useIsConnected, useConnectedClients } from '../store/store';

export const HeaderBar: React.FC = () => {
  //format of this is:
  //const [variable, setterFunction] = useState(initialValue);
  const [darkMode, setDarkMode] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  //get state from store using stable selectors
  const searchQuery = useSearchQuery();
  const selectedItems = useSelectedItems();
  const isLoading = useIsLoading();
  const isConnected = useIsConnected();
  const connectedClients = useConnectedClients();
  
  //get actions from store
  //we are taking out functions from the Zustand state and then storing it in local variables
  //this way we can more conveniently access the state functions later
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const openItemModal = useAppStore((state) => state.openItemModal);
  const openFolderModal = useAppStore((state) => state.openFolderModal);
  const clearSelection = useAppStore((state) => state.clearSelection);

  //initialize dark mode state from document
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  //toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  
  };
  //dmrq - what is this DOM state thing?
  //DOM Manipulation: Add/remove dark class on <html> element

  //handle search shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        //dmrq - what is this focus thing?
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    //cleanup
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  //clear search
  const clearSearch = () => {
    setSearchQuery('');
    //dmrq - what is this focus?
    searchInputRef.current?.focus();
  };

  //handle search input
  //dmrq - what is this e here?
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  //this is full CSS part. used heavy AI to do this
  return (
    //dmrq - why is all the styling done inside className? Why is it header div className everywhere?
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/*left section - logo and title
          dmrq - Here the logo is displayed somwhere. Check if that is right, and if it is needed
          also check how exactly the logo is generated/printed here*/}
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Adaline Full- Stack Challenge
                </h1>
                <div className="flex items-center space-x-2 text-xs">
                  {/*connection status indicator*/}
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-gray-500 dark:text-gray-400">
                      {isConnected ? `${connectedClients} connected` : 'Disconnected'}
                    </span>
                  </div>
                  
                  {/*dmrq - there is a svg spinner here in the loading indicator.
                   What exactly is that, and where */}
                  {/*in code is that implemented?*/}

                  {/*loading indicator*/}
                 

                  {isLoading && (
                    <div className="flex items-center space-x-1">
                      <svg className="w-3 h-3 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-gray-500 dark:text-gray-400">Syncing...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/*center section - search*/}
          <div className="flex-1 max-w-lg mx-8">
            <div className="relative">
              {/*search input*/}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200"
                  placeholder="Search items... (⌘K)"
                />
                
                {/*clear search button
                dmrq - what is aria-label?*/}
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    aria-label="Clear search"
                  >
                    <svg className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/*search results counter*/}
              {searchQuery && (
                <div className="absolute top-full left-0 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Searching for "{searchQuery}"
                </div>
              )}
            </div>
          </div>

          {/*right section - actions*/}
          <div className="flex items-center space-x-3">
            
            {/*selection info*/}
            {selectedItems.length > 0 && (
              <div className="flex items-center space-x-2 bg-primary-50 dark:bg-primary-900/20 px-3 py-1 rounded-lg">
                <span className="text-sm text-primary-700 dark:text-primary-300">
                  {selectedItems.length} selected
                </span>
                <button
                  onClick={clearSelection}
                  className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
                  aria-label="Clear selection"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/*add item button
            -Here we use btn primary that we defined in tailwind config
            -Hidden sm inline hides text on monile, shows on laptop*/}
            <button
              onClick={() => openItemModal()}
              className="btn-primary flex items-center space-x-2"
              aria-label="Add new item"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Add Item</span>
            </button>

            {/*add folder button*/}
            <button
              onClick={() => openFolderModal()}
              className="btn-secondary flex items-center space-x-2"
              aria-label="Add new folder"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="hidden sm:inline">Add Folder</span>
            </button>

            {/*dark mode toggle*/}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors duration-200"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                // Sun icon for light mode
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                // Moon icon for dark mode
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/*user menu (placeholder)*/}
            <div className="relative">
              <button className="p-1 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center w-8 h-8">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">U</span>
              </button>
            </div>
          </div>
        </div>
      </div>

          {/*mobile search bar (shown on small screens when search is active)*/}
      {searchQuery && (
        <div className="sm:hidden px-4 pb-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Searching for "{searchQuery}"
          </div>
        </div>
      )}
    </header>
  );
};

export default HeaderBar; 