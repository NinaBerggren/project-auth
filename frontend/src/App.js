import './index.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Main from './components/Main';
import Register from 'components/Register';
import Login from 'components/Login';
import Content from 'components/Content';
import SpeakerDetails from 'components/SpeakerDetails';

const App = () => {
  const url = process.env.PUBLIC_URL || 'http://localhost:3000';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/register" element={<Register url={url} />} />
        <Route path="/login" element={<Login url={url} />} />
        <Route path="/top10Views" element={<Content url={url} />} />
        <Route path="/speaker/:id" element={<SpeakerDetails />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
