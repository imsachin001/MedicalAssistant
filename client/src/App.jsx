import React from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Assistant from './pages/Assistant';

import { useState } from 'react';

const App = () => {
  const [page, setPage] = useState('home');
  return (
    <>
      <Navbar setPage={setPage} />
      {page === 'home' && <Home />}
      {page === 'assistant' && <Assistant />}
      {/* Track page can be added here */}
    </>
  );
};

export default App;
