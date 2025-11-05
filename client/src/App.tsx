import { Outlet } from 'react-router-dom';
// import StartModal from './ui/StartModal/StartModal';

import './globals.css';
import './main.sass';

const App = () => {

    return (
        <main className='main_container'>
            <Outlet/>
        </main>
    )
}

export default App;