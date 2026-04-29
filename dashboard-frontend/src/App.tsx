import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { HomePage } from '@/features/home';
import { PanoramaPage } from '@/features/panorama';
import { SaludAnimalPage } from '@/features/salud-animal';
import { SituacionCallejeraPage } from '@/features/situacion-callejera';
import { ServiciosMunicipalesPage } from '@/features/servicios-municipales';

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/panorama" element={<PanoramaPage />} />
          <Route path="/salud-animal" element={<SaludAnimalPage />} />
          <Route path="/situacion-callejera" element={<SituacionCallejeraPage />} />
          <Route path="/servicios-municipales" element={<ServiciosMunicipalesPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
