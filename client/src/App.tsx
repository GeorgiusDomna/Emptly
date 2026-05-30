import { Outlet } from 'react-router-dom';
// import StartModal from './ui/StartModal/StartModal';

import './globals.css';
import './main.sass';
import { NavBar } from './layout/Header/Header';

const App = () => {

    return (
        <main className='main_container'>
            <NavBar />
            <Outlet />
        </main>
    )
}

export default App;