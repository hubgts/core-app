import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HabitsPage from './pages/HabitsPage.jsx';
import TrainingPage from './pages/TrainingPage.jsx';
import TemplatesPage from './pages/TemplatesPage.jsx';
import ProgramsPage from './pages/ProgramsPage.jsx';
import FinancesPage from './pages/FinancesPage.jsx';
import EnvelopesPage from './pages/EnvelopesPage.jsx';
import BilanPage from './pages/BilanPage.jsx';
import BudgetPage from './pages/BudgetPage.jsx';
import CashflowPage from './pages/CashflowPage.jsx';
import ImportPage from './pages/ImportPage.jsx';
import ImportReviewPage from './pages/ImportReviewPage.jsx';
import KnowHowPage from './pages/KnowHowPage.jsx';
import AlimentationPage from './pages/AlimentationPage.jsx';
import FoodsPage from './pages/FoodsPage.jsx';
import CoursePage from './pages/CoursePage.jsx';
import ShoppingListPage from './pages/ShoppingListPage.jsx';
import BettingPage from './pages/BettingPage.jsx';
import BankrollDetailPage from './pages/BankrollDetailPage.jsx';
import HealthPage from './pages/HealthPage.jsx';
import ReferentialPage from './pages/ReferentialPage.jsx';
import { DialogHost } from './components/dialogs.jsx';
import { ToastHost } from './components/toast.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <DialogHost />
      <ToastHost />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/habitudes" element={<HabitsPage />} />
          <Route path="/entrainement" element={<TrainingPage />} />
          <Route path="/entrainement/templates" element={<TemplatesPage />} />
          <Route path="/entrainement/programmes" element={<ProgramsPage />} />
          <Route path="/entrainement/mensuration" element={<HealthPage />} />
          <Route path="/finances" element={<FinancesPage />} />
          <Route path="/finances/enveloppes" element={<EnvelopesPage />} />
          <Route path="/finances/bilan" element={<BilanPage />} />
          <Route path="/budget" element={<CashflowPage />} />
          <Route path="/budget/plan" element={<BudgetPage />} />
          <Route path="/budget/import" element={<ImportPage />} />
          <Route path="/budget/import/:id" element={<ImportReviewPage />} />
          <Route
            path="/finances/budget"
            element={<Navigate to="/budget/plan" replace />}
          />
          <Route path="/savoir-faire" element={<KnowHowPage />} />
          <Route path="/alimentation" element={<AlimentationPage />} />
          <Route path="/alimentation/aliments" element={<FoodsPage />} />
          <Route path="/course" element={<CoursePage />} />
          <Route
            path="/course/template/:id"
            element={<ShoppingListPage template />}
          />
          <Route path="/course/:id" element={<ShoppingListPage />} />
          <Route path="/paris" element={<BettingPage />} />
          <Route path="/paris/:id" element={<BankrollDetailPage />} />
          <Route
            path="/sante"
            element={<Navigate to="/entrainement/mensuration" replace />}
          />
          <Route path="/referentiel" element={<ReferentialPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
